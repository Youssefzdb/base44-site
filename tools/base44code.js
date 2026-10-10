#!/usr/bin/env node
/**
 * base44code — owner CLI for this app's sandbox.
 * - run/shell/ping: POST /__exec__ on the app's dev server (API key auth)
 * - keepalive: GET /api/apps/{app_id}/sandbox/preview-url (personal access token)
 *   keeps the sandbox warm and refreshes the dev-server base URL.
 * Node 18+.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

const CONFIG_PATH = path.join(os.homedir(), ".base44-code.json");
const DEFAULT_BASE = "https://app.base44.com";

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); } catch { return null; }
}
function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  fs.chmodSync(CONFIG_PATH, 0o600);
}

function usage() {
  console.log(`base44code — owner CLI for this app's sandbox

Usage:
  base44code config --app-id <id> --pat <personal-access-token> --api-key <exec-key> [--base <url>]
  base44code preview             Print the current dev/preview URL
  base44code ping                Test the /__exec__ endpoint
  base44code run "<cmd>" [--cwd dir] [--timeout ms]
  base44code shell               Interactive session
  base44code keepalive [--interval min]

Config: ${CONFIG_PATH}`);
}

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; }
function has(name) { return process.argv.includes(name); }
function positional(afterIdx) {
  const args = process.argv.slice(afterIdx);
  const out = [];
  for (let i = 0; i < args.length; i++) { if (args[i].startsWith("--")) { i++; continue; } out.push(args[i]); }
  return out;
}

async function getPreviewUrl(cfg) {
  const res = await fetch(`${cfg.base.replace(/\/$/, "")}/api/apps/${cfg.app_id}/sandbox/preview-url`, {
    headers: { Authorization: `Bearer ${cfg.pat}` },
  });
  if (!res.ok) throw new Error(`preview-url HTTP ${res.status}`);
  const data = await res.json();
  const node = data.result ?? data;
  const url = typeof node === "string" ? node : node.url;
  if (!url) throw new Error(`unexpected preview-url response: ${JSON.stringify(data).slice(0, 200)}`);
  return url;
}

async function execRemote(cfg, command, opts = {}) {
  const base = await getPreviewUrl(cfg); // keeps sandbox warm + fresh base
  const res = await fetch(base.replace(/\/$/, "") + "/__exec__", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": cfg.api_key },
    body: JSON.stringify({
      command,
      cwd: opts.cwd || null,
      timeout_ms: opts.timeout_ms || 120000,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("unauthorized: check --api-key / DEV_AUTOMATION_KEY on the dev server");
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

function printResult(r) {
  if (r.stdout) process.stdout.write(String(r.stdout));
  if (r.stderr) process.stderr.write(String(r.stderr));
  process.exitCode = r.exit_code || 0;
}

async function main() {
  const [cmd] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help") { usage(); process.exit(cmd ? 0 : 1); }

  if (cmd === "config") {
    const appId = arg("--app-id"), pat = arg("--pat"), apiKey = arg("--api-key");
    if (!appId || !pat || !apiKey) { console.error("Need --app-id, --pat and --api-key"); process.exit(1); }
    const existing = loadConfig() || {};
    saveConfig({ ...existing, app_id: appId, pat, api_key: apiKey, base: arg("--base") || existing.base || DEFAULT_BASE });
    console.log("Saved to", CONFIG_PATH);
    return;
  }

  const cfg = loadConfig();
  if (!cfg || !cfg.app_id || !cfg.pat || !cfg.api_key) {
    console.error("No config. Run: base44code config --app-id <id> --pat <token> --api-key <key>");
    process.exit(1);
  }

  switch (cmd) {
    case "preview": {
      console.log(await getPreviewUrl(cfg));
      return;
    }
    case "ping": {
      const r = await execRemote(cfg, "echo base44code-ok && uname -a");
      printResult(r);
      console.log("\n✓ Dev endpoint reachable");
      return;
    }
    case "run": {
      const command = positional(3).join(" ");
      if (!command) { console.error('Usage: base44code run "<cmd>"'); process.exit(1); }
      const r = await execRemote(cfg, command, { cwd: arg("--cwd"), timeout_ms: arg("--timeout") ? Number(arg("--timeout")) : undefined });
      printResult(r);
      return;
    }
    case "shell": {
      const rl = readline.createInterface({ prompt: "b44> ", input: process.stdin, output: process.stdout });
      console.log("base44code shell — type exit to quit\n");
      rl.prompt();
      rl.on("line", async (line) => {
        const c = line.trim();
        if (c === "exit" || c === "quit") return rl.close();
        if (!c) return rl.prompt();
        try { printResult(await execRemote(cfg, c)); } catch (e) { console.error("Error:", e.message); }
        rl.prompt();
      });
      rl.on("close", () => process.exit(0));
      return;
    }
    case "keepalive": {
      const minutes = Number(arg("--interval")) || 5;
      console.log(`Hitting preview-url every ${minutes} min. Ctrl+C to stop.`);
      const tick = async () => {
        try { console.log(`[${new Date().toISOString()}] ${await getPreviewUrl(cfg)}`); }
        catch (e) { console.error(`[${new Date().toISOString()}] failed: ${e.message}`); }
      };
      await tick();
      setInterval(tick, minutes * 60 * 1000);
      return;
    }
    default:
      usage();
      process.exit(1);
  }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
