import { exec } from "node:child_process";
import { timingSafeEqual } from "node:crypto";

/**
 * Dev automation endpoint (development-only vite plugin).
 * See docs/dev-automation-endpoint.md for full documentation.
 * Lets the app owner run commands in their own sandbox from their terminal.
 */
const API_KEY = process.env.DEV_AUTOMATION_KEY || process.env.TERM_TOKEN || "";
const MAX_TIMEOUT_MS = 120_000;

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export default function devAutomationEndpoint() {
  return {
    name: "dev-automation-endpoint",
    configureServer(server) {
      server.middlewares.use("/__exec__", (req, res) => {
        if (req.method !== "POST") {
          res.writeHead(405, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "method not allowed" }));
        }
        if (!API_KEY) {
          res.writeHead(503, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "endpoint disabled: DEV_AUTOMATION_KEY not set" }));
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          let parsed = {};
          try { parsed = JSON.parse(body || "{}"); } catch { /* invalid json handled below */ }
          const key = req.headers["x-api-key"] || parsed.api_key;
          if (!safeEqual(key, API_KEY)) {
            res.writeHead(401, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "unauthorized" }));
          }
          const command = (parsed.command || "").trim();
          if (!command) {
            res.writeHead(400, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: "missing command" }));
          }
          const timeout = Math.min(parsed.timeout_ms || 60_000, MAX_TIMEOUT_MS);
          exec(command, {
            timeout,
            maxBuffer: 10 * 1024 * 1024,
            cwd: parsed.cwd || undefined,
            env: { ...process.env, FORCE_COLOR: "0" },
          }, (err, stdout, stderr) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              stdout,
              stderr,
              exit_code: err ? (err.code ?? 1) : 0,
              error: err ? String(err.message || err) : null,
            }));
          });
        });
      });
    },
  };
}
