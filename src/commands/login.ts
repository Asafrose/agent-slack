import type { Command } from "commander";
import { randomBytes } from "crypto";
import { saveConfig } from "../config";
import {
  SLACK_CLIENT_ID,
  OAUTH_WORKER_URL,
  OAUTH_CALLBACK_PORT,
  OAUTH_USER_SCOPES,
} from "../constants";

function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? "open" : "xdg-open";
  Bun.spawn([cmd, url], { stdio: ["ignore", "ignore", "ignore"] });
}

export function register(program: Command): void {
  program
    .command("login")
    .description("Authenticate with Slack via OAuth")
    .option("--port <port>", "Local callback server port", String(OAUTH_CALLBACK_PORT))
    .action(async (opts) => {
      const requestedPort = parseInt(opts.port, 10);
      const state = randomBytes(16).toString("hex");

      let server: ReturnType<typeof Bun.serve> | undefined;
      let actualRedirectUri: string;

      const tokenPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          server?.stop();
          reject(new Error("OAuth timed out after 120 seconds"));
        }, 120_000);

        server = Bun.serve({
          port: requestedPort,
          async fetch(req) {
            const url = new URL(req.url);

            if (url.pathname !== "/callback") {
              return new Response("Not found", { status: 404 });
            }

            const callbackState = url.searchParams.get("state");
            const code = url.searchParams.get("code");
            const error = url.searchParams.get("error");

            if (error) {
              clearTimeout(timeout);
              server?.stop();
              reject(new Error(`Slack OAuth error: ${error}`));
              return new Response(
                "<html><body><h2>Authorization failed</h2><p>You can close this window.</p></body></html>",
                { headers: { "Content-Type": "text/html" } },
              );
            }

            if (callbackState !== state) {
              clearTimeout(timeout);
              server?.stop();
              reject(new Error("OAuth state mismatch — possible CSRF attack"));
              return new Response(
                "<html><body><h2>Security error: state mismatch</h2><p>You can close this window.</p></body></html>",
                { headers: { "Content-Type": "text/html" } },
              );
            }

            if (!code) {
              clearTimeout(timeout);
              server?.stop();
              reject(new Error("No authorization code received"));
              return new Response(
                "<html><body><h2>Error: no code received</h2><p>You can close this window.</p></body></html>",
                { headers: { "Content-Type": "text/html" } },
              );
            }

            try {
              const workerResponse = await fetch(`${OAUTH_WORKER_URL}/token-exchange`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, redirect_uri: actualRedirectUri }),
              });

              interface TokenExchangeResponse {
                ok: boolean;
                access_token?: string;
                team?: string;
                user_id?: string;
                error?: string;
              }
              const data: TokenExchangeResponse = await workerResponse.json();

              if (!data.ok || !data.access_token) {
                clearTimeout(timeout);
                server?.stop();
                reject(new Error(`Token exchange failed: ${data.error || "unknown error"}`));
                return new Response(
                  "<html><body><h2>Token exchange failed</h2><p>You can close this window.</p></body></html>",
                  { headers: { "Content-Type": "text/html" } },
                );
              }

              await saveConfig({ token: data.access_token });
              clearTimeout(timeout);

              console.log(
                `Logged in to ${data.team || "Slack"} as ${data.user_id || "unknown user"}`,
              );
              console.log("Token saved to ~/.agent-slack/config.json");

              server?.stop();
              resolve();

              return new Response(
                "<html><body><h2>Success!</h2><p>You are now logged in. You can close this window.</p></body></html>",
                { headers: { "Content-Type": "text/html" } },
              );
            } catch (err) {
              clearTimeout(timeout);
              server?.stop();
              reject(err);
              return new Response(
                "<html><body><h2>Error during token exchange</h2><p>You can close this window.</p></body></html>",
                { headers: { "Content-Type": "text/html" } },
              );
            }
          },
        });

        const actualPort = server!.port;
        actualRedirectUri = `http://localhost:${actualPort}/callback`;
        const authorizeUrl =
          `https://slack.com/oauth/v2/authorize?` +
          `client_id=${SLACK_CLIENT_ID}` +
          `&user_scope=${encodeURIComponent(OAUTH_USER_SCOPES)}` +
          `&redirect_uri=${encodeURIComponent(actualRedirectUri)}` +
          `&state=${state}`;

        console.log(`Waiting for Slack authorization on port ${actualPort}...`);
        openBrowser(authorizeUrl);
      });

      try {
        await tokenPromise;
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
