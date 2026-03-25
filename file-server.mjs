import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let pty, WebSocketServer;
try {
  pty = require("/opt/file-server-deps/node_modules/node-pty");
  ({ WebSocketServer } = require("/opt/file-server-deps/node_modules/ws"));
} catch {
  console.log("[file-server] node-pty/ws not available — terminal disabled");
}

const PORT = 3001;
const BASE_DIR = "/home/node";
const MAX_READ_BYTES = 100 * 1024; // 100 KB
const TOKEN = process.env.GATEWAY_TOKEN;
const GW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || TOKEN;
const GW_URL = "ws://127.0.0.1:18789";

// ── CORS / JSON / Auth helpers ──────────────────────────────────────

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function safePath(raw) {
  const resolved = path.resolve(raw || BASE_DIR);
  if (!resolved.startsWith(BASE_DIR)) return null;
  return resolved;
}

function auth(req) {
  if (!TOKEN) return false;
  const h = req.headers.authorization || "";
  if (h === `Bearer ${TOKEN}`) return true;
  // WebSocket upgrade requests can't set headers — check query param
  const url = new URL(req.url, `http://localhost:${PORT}`);
  return url.searchParams.get("token") === TOKEN;
}

// ── Gateway WebSocket RPC client ────────────────────────────────────

let gwConnected = false;
let gwMethods = new Set();
const gwPending = new Map(); // id → { resolve, timer }
let gwWs = null;
let gwConnectSent = false;

const METHOD_ALIASES = {
  doctor: "health",
  "channels.login": "web.login.start",
  "channels.login.wait": "web.login.wait",
};

function gwSendConnect() {
  if (!gwWs || gwConnectSent) return;
  gwConnectSent = true;
  gwWs.send(JSON.stringify({
    type: "req",
    id: randomUUID(),
    method: "connect",
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: { id: "openclaw-control-ui", version: "1.0.0", platform: "linux", mode: "cli" },
      auth: { token: GW_TOKEN },
      role: "operator",
      scopes: ["operator.admin"],
    },
  }));
}

function gwConnect() {
  gwWs = new WebSocket(GW_URL, { headers: { Origin: "http://localhost:18789" } });
  gwConnectSent = false;

  gwWs.addEventListener("open", () => {
    // Wait up to 750ms for connect.challenge, then send connect anyway.
    setTimeout(() => gwSendConnect(), 750);
  });

  gwWs.addEventListener("message", (evt) => {
    let msg;
    try {
      msg = JSON.parse(typeof evt.data === "string" ? evt.data : evt.data.toString());
    } catch { return; }

    if (msg.type === "event" && msg.event === "connect.challenge") {
      gwSendConnect();
      return;
    }

    if (msg.type === "res" && msg.ok && msg.payload?.type === "hello-ok") {
      gwConnected = true;
      const methods = msg.payload.features?.methods || [];
      gwMethods = new Set(methods);
      console.log(`[file-server] gateway connected (${methods.length} methods)`);
      return;
    }

    if (msg.type === "res" && msg.id && gwPending.has(msg.id)) {
      const { resolve, timer } = gwPending.get(msg.id);
      clearTimeout(timer);
      gwPending.delete(msg.id);
      resolve(msg);
    }
  });

  gwWs.addEventListener("close", () => {
    console.log(`[file-server] gateway disconnected, reconnecting...`);
    gwConnected = false;
    gwConnectSent = false;
    gwWs = null;
    for (const [, { resolve, timer }] of gwPending) {
      clearTimeout(timer);
      resolve({ ok: false, error: { message: "Gateway disconnected" } });
    }
    gwPending.clear();
    // Gateway should always be up (started before us), so reconnect immediately
    setTimeout(() => gwConnect(), 1000);
  });

  gwWs.addEventListener("error", () => {});
}

function gwRpc(method, params = {}) {
  return new Promise((resolve) => {
    if (!gwConnected || !gwWs) {
      resolve(null); // null = not available, caller should fall back
      return;
    }
    const id = randomUUID();
    const timer = setTimeout(() => {
      gwPending.delete(id);
      resolve(null); // timeout = fall back
    }, 60000);
    gwPending.set(id, { resolve, timer });
    try {
      gwWs.send(JSON.stringify({ type: "req", id, method, params }));
    } catch {
      clearTimeout(timer);
      gwPending.delete(id);
      resolve(null);
    }
  });
}

// Parse "openclaw models list --all --format json" into { method, params }
function parseOpenClawCommand(command) {
  const trimmed = command.trim();
  if (!trimmed.startsWith("openclaw ") && trimmed !== "openclaw") return null;

  const args = trimmed.slice("openclaw ".length).trim().split(/\s+/);
  if (args.length === 0 || args[0] === "") return null;

  // Collect positional words and flags
  const positional = [];
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      if (!key) continue;
      // Check if next arg is a value (not a flag)
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        params[key] = args[i + 1];
        i++;
      } else {
        params[key] = true;
      }
    } else if (args[i].startsWith("-") && args[i].length === 2) {
      // Short flags like -V, -h
      const key = args[i].slice(1);
      params[key] = true;
    } else {
      positional.push(args[i]);
    }
  }

  // Handle special cases — no RPC methods for these, generate locally
  if (params.V || params.version) return { method: "_version", params: {} };
  if (params.h || params.help || positional.length === 0) return { method: "_help", params: {} };

  let method = positional.join(".");
  if (!method) return null;

  // Apply aliases on the full method name (e.g. "channels.login" -> "web.login.start")
  if (METHOD_ALIASES[method]) {
    method = METHOD_ALIASES[method];
    // Translate CLI flags to RPC params
    if (params.relink) { params.force = true; delete params.relink; }
    // Strip CLI-level flags that the target RPC doesn't accept
    delete params.channel;
  }

  return { method, params };
}

// Generate help/version locally from gateway method list (no shell cold-start)
function localResponse(method) {
  if (!gwConnected) return null;
  if (method === "_help") {
    const groups = {};
    for (const m of [...gwMethods].sort()) {
      const [top, ...rest] = m.split(".");
      if (!groups[top]) groups[top] = [];
      if (rest.length) groups[top].push(rest.join("."));
    }
    const lines = ["Usage: openclaw <command> [options]\n\nCommands:\n"];
    for (const [g, subs] of Object.entries(groups).sort()) {
      lines.push(subs.length ? `  ${g}  ${subs.join(", ")}` : `  ${g}`);
    }
    lines.push("\nDocs: https://docs.openclaw.ai/cli");
    return { ok: true, stdout: lines.join("\n"), stderr: "", exitCode: 0, source: "rpc" };
  }
  if (method === "_version") {
    return { ok: true, stdout: "openclaw (gateway)", stderr: "", exitCode: 0, source: "rpc" };
  }
  return null;
}

// Execute a command: openclaw commands go via RPC, everything else via shell
async function execViaGateway(command, res) {
  const parsed = parseOpenClawCommand(command);

  if (parsed) {
    // Local help/version
    const local = localResponse(parsed.method);
    if (local) return json(res, 200, local);

    // RPC — forward all commands to the gateway (it validates method names)
    if (!gwConnected) {
      return json(res, 200, { ok: false, stdout: "", stderr: "Gateway not connected yet. Try again in a few seconds.", exitCode: 1, source: "rpc" });
    }
    const result = await gwRpc(parsed.method, parsed.params);
    if (result && result.ok) {
      const stdout = typeof result.payload === "string"
        ? result.payload
        : JSON.stringify(result.payload, null, 2);
      return json(res, 200, { ok: true, stdout, stderr: "", exitCode: 0, source: "rpc" });
    }
    if (result && !result.ok && result.error) {
      return json(res, 200, { ok: false, stdout: "", stderr: result.error.message || "RPC error", exitCode: 1, source: "rpc" });
    }
    return json(res, 200, { ok: false, stdout: "", stderr: "RPC call failed (timeout or disconnected)", exitCode: 1, source: "rpc" });
  }

  // Non-openclaw commands are not supported — RPC only
  return json(res, 200, {
    ok: false,
    stdout: "",
    stderr: `Unknown command. Use "openclaw help" to see available commands.`,
    exitCode: 1,
    source: "rpc",
  });
}

// Start gateway connection
gwConnect();

// ── HTTP Server ─────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (!auth(req)) return json(res, 401, { error: "Unauthorized" });

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/_/api/list") {
    const target = safePath(url.searchParams.get("path") || BASE_DIR);
    if (!target) return json(res, 403, { error: "Path outside allowed directory" });

    try {
      const entries = fs.readdirSync(target, { withFileTypes: true });
      const result = entries.map((e) => {
        const fullPath = path.join(target, e.name);
        try {
          const stat = fs.statSync(fullPath);
          return {
            name: e.name,
            type: e.isDirectory() ? "directory" : "file",
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          };
        } catch {
          return { name: e.name, type: e.isDirectory() ? "directory" : "file", size: 0, modifiedAt: null };
        }
      });
      // Sort: directories first, then alphabetical
      result.sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return json(res, 200, result);
    } catch (err) {
      return json(res, 404, { error: err.code === "ENOENT" ? "Directory not found" : err.message });
    }
  }

  if (req.method === "GET" && pathname === "/_/api/download") {
    const target = safePath(url.searchParams.get("path"));
    if (!target) return json(res, 403, { error: "Path outside allowed directory" });

    try {
      const stat = fs.statSync(target);
      if (stat.isDirectory()) return json(res, 400, { error: "Cannot download a directory" });

      const truncated = stat.size > MAX_READ_BYTES;
      const fd = fs.openSync(target, "r");
      const buf = Buffer.alloc(Math.min(stat.size, MAX_READ_BYTES));
      fs.readSync(fd, buf, 0, buf.length, 0);
      fs.closeSync(fd);

      return json(res, 200, {
        content: buf.toString("utf-8"),
        size: stat.size,
        truncated,
      });
    } catch (err) {
      return json(res, 404, { error: err.code === "ENOENT" ? "File not found" : err.message });
    }
  }

  if (req.method === "POST" && pathname === "/_/api/exec") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        return json(res, 400, { error: "Invalid JSON" });
      }
      const { command } = parsed;
      if (!command || typeof command !== "string") {
        return json(res, 400, { error: "command is required" });
      }
      if (command.length > 2000) {
        return json(res, 400, { error: "Command too long (max 2000 chars)" });
      }
      execViaGateway(command, res);
    });
    return;
  }

  return json(res, 404, { error: "Not found" });
});

// ── WebSocket Terminal (PTY) ────────────────────────────────────────

if (pty && WebSocketServer) {
  const wss = new WebSocketServer({ noServer: true });
  const activeSessions = new Map();
  const MAX_SESSIONS = 3;

  server.on("upgrade", (req, socket, head) => {
    if (!auth(req)) { socket.destroy(); return; }
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname !== "/_/api/terminal") { socket.destroy(); return; }
    if (activeSessions.size >= MAX_SESSIONS) { socket.destroy(); return; }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const shell = pty.spawn("/bin/bash", [], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: BASE_DIR,
        env: { ...process.env, TERM: "xterm-256color" },
      });

      activeSessions.set(ws, shell);

      shell.onData((data) => {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: "output", data }));
      });

      shell.onExit(({ exitCode }) => {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: "exit", code: exitCode }));
        ws.close();
        activeSessions.delete(ws);
      });

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw);
          if (msg.type === "input") shell.write(msg.data);
          if (msg.type === "resize") shell.resize(msg.cols, msg.rows);
          if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
        } catch {}
      });

      ws.on("close", () => {
        shell.kill();
        activeSessions.delete(ws);
      });
    });
  });

  console.log("[file-server] terminal WebSocket enabled on /_/api/terminal");
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[file-server] listening on :${PORT}`);
});
