interface Env {
  SLACK_CLIENT_ID: string;
  SLACK_CLIENT_SECRET: string;
}

interface TokenExchangeRequest {
  code: string;
  redirect_uri: string;
}

interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  authed_user?: { id?: string; access_token?: string };
  team?: { id?: string; name?: string };
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "http://localhost",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function isTokenExchangeRequest(value: unknown): value is TokenExchangeRequest {
  if (typeof value !== "object" || value === null) return false;
  return (
    "code" in value &&
    typeof value.code === "string" &&
    "redirect_uri" in value &&
    typeof value.redirect_uri === "string"
  );
}

// State format: "nonce:port" — extract port from the state param
function extractPort(state: string): string | null {
  const parts = state.split(":");
  if (parts.length !== 2) return null;
  const port = parts[1];
  if (!/^\d+$/.test(port)) return null;
  return port;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // GET /callback — Slack redirects here after user authorizes.
    // We extract the port from the state param and redirect to localhost.
    if (url.pathname === "/callback" && request.method === "GET") {
      const state = url.searchParams.get("state") || "";
      const port = extractPort(state);

      if (!port) {
        return new Response(
          "<html><body><h2>Error: invalid state parameter</h2>" +
            "<p>Could not determine local port. Please try again.</p></body></html>",
          { status: 400, headers: { "Content-Type": "text/html" } },
        );
      }

      // Build localhost redirect, forwarding code, state, and error params
      const localUrl = new URL(`http://localhost:${port}/callback`);
      for (const [key, value] of url.searchParams.entries()) {
        localUrl.searchParams.set(key, value);
      }

      return Response.redirect(localUrl.toString(), 302);
    }

    // POST /token-exchange — CLI sends the auth code, we exchange it for a token.
    if (url.pathname === "/token-exchange") {
      if (request.method !== "POST") {
        return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ ok: false, error: "invalid_json" }, 400);
      }

      if (!isTokenExchangeRequest(body)) {
        return jsonResponse({ ok: false, error: "missing_code_or_redirect_uri" }, 400);
      }

      const params = new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code: body.code,
        redirect_uri: body.redirect_uri,
      });

      const slackResponse = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const slackData: SlackOAuthResponse = await slackResponse.json();

      if (!slackData.ok) {
        return jsonResponse({
          ok: false,
          error: slackData.error || "slack_oauth_failed",
        });
      }

      return jsonResponse({
        ok: true,
        access_token: slackData.authed_user?.access_token,
        user_id: slackData.authed_user?.id,
        team: slackData.team?.name,
        team_id: slackData.team?.id,
      });
    }

    return jsonResponse({ ok: false, error: "not_found" }, 404);
  },
};
