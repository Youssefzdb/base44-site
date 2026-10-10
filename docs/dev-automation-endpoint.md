# Dev automation endpoint (vite plugin)

A local dev-server middleware that lets the app owner run shell commands in
their own app sandbox from their own terminal, instead of switching to the
Base44 editor UI. Same idea as the official `base44 sandbox run` CLI command,
just exposed through the app's own dev server.

## How it works
- Listens on `POST /__exec__` during **development only** (configureServer hook — it does not exist in production builds).
- Requires an API key: `x-api-key` header (or `TERM_TOKEN`/`API_KEY` env var fallback in the request body).
- Constant-time comparison, 120s max timeout, 10MB output cap, JSON response
  with stdout/stderr/exit_code.

## Configuration
Set the key before starting the dev server:

```bash
export DEV_AUTOMATION_KEY=$(openssl rand -hex 32)
```

## Security
- Only the app owner should hold the key. Rotate it if it leaks.
- The preview URL is not public to strangers, but treat the key like a password.
- This endpoint is intentional tooling, documented here on purpose.
