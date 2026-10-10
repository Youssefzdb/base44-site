# Simple Base44 site + owner dev-automation tooling

A minimal Vite + React site with a documented development-only automation
endpoint, plus a small CLI (`tools/base44code`) the app owner uses to:

1. Keep the app sandbox warm (`keepalive`, via the official
   `GET /api/apps/{app_id}/sandbox/preview-url` endpoint and a personal
   access token).
2. Run commands in their own sandbox from their terminal
   (`run` / `shell`, via the documented `POST /__exec__` dev endpoint with an
   API key).

## Site
- `src/App.jsx` — landing page (edit freely)
- Standard Vite + React + Base44 plugin setup

## Dev automation endpoint
See [docs/dev-automation-endpoint.md](docs/dev-automation-endpoint.md).

It exists **only in the dev server** (vite `configureServer` — it is not part
of production builds), requires an API key, and is documented here on
purpose. This is the app owner's own tooling for their own sandbox.

## CLI (tools/base44code.js)
```bash
node tools/base44code.js config --app-id <ID> --pat <personal-access-token> --api-key <exec-key> [--base https://app.base44.com]
node tools/base44code.js ping
node tools/base44code.js run "ls -la"
node tools/base44code.js shell
node tools/base44code.js keepalive --interval 5
```

- `ping`/`run`/`shell` go to the dev server's `/__exec__` (uses the preview URL
  from the official API as the base).
- `keepalive` calls `GET /api/apps/{app_id}/sandbox/preview-url` every N
  minutes with the owner's personal access token to keep the sandbox alive,
  and refreshes the cached base URL.

## Security
- API key and personal access token are secrets: keep them in env vars /
  the local config file (`~/.base44-code.json`, chmod 600), never in the repo.
- Rotate keys if they leak.
