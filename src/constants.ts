export const SLACK_CLIENT_ID = "YOUR_CLIENT_ID"; // Replace after creating Slack app
export const OAUTH_WORKER_URL = "https://agent-slack-oauth.YOUR_SUBDOMAIN.workers.dev"; // Replace after deploying worker
export const OAUTH_CALLBACK_PORT = 9876;
export const OAUTH_USER_SCOPES =
  "search:read,chat:write,channels:history,groups:history,im:history,mpim:history,channels:read,groups:read,users:read,users:read.email,canvases:write,canvases:read";
