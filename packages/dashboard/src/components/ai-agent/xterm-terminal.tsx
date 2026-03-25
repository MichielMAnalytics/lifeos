'use client';

import { useEffect, useRef, useCallback } from "react";
import type { ReactElement } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

interface XtermTerminalProps {
  subdomain: string;
  gatewayToken: string;
  pendingCommand?: string | null;
  onCommandConsumed?: () => void;
}

export function XtermTerminal({
  subdomain,
  gatewayToken,
  pendingCommand,
  onCommandConsumed,
}: XtermTerminalProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Send a message over the WebSocket if open
  const wsSend = useCallback((msg: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  // Mount terminal + connect WebSocket
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono Variable', 'IBM Plex Mono', monospace",
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#39d353",
        selectionBackground: "#264f78",
      },
      convertEol: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(el);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    // WebSocket connection
    const domain = process.env.NEXT_PUBLIC_LIFEOS_DOMAIN || "lifeos.zone";
    const wsUrl = `wss://${subdomain}.${domain}/_/api/terminal?token=${encodeURIComponent(gatewayToken)}`;
    term.write(`\x1b[90mConnecting to ${subdomain}.${domain}...\x1b[0m\r\n`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      term.write(`\x1b[90mConnected.\x1b[0m\r\n`);
      // Send initial size
      ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "output") term.write(msg.data);
        if (msg.type === "exit") {
          term.write(`\r\n\x1b[90m[shell exited with code ${msg.code}]\x1b[0m\r\n`);
        }
      } catch {}
    };

    ws.onclose = (e) => {
      term.write(`\r\n\x1b[90m[disconnected: code=${e.code} reason=${e.reason || "none"}]\x1b[0m\r\n`);
    };

    ws.onerror = () => {
      term.write(`\r\n\x1b[31m[connection error — check browser console]\x1b[0m\r\n`);
    };

    // Forward keystrokes to server
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    // Heartbeat
    pingRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30_000);

    // Resize observer
    const ro = new ResizeObserver(() => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      if (pingRef.current) clearInterval(pingRef.current);
      ws.close();
      term.dispose();
      termRef.current = null;
      wsRef.current = null;
      fitRef.current = null;
    };
  }, [subdomain, gatewayToken]);

  // Handle cheatsheet commands
  useEffect(() => {
    if (!pendingCommand) return;
    wsSend({ type: "input", data: pendingCommand + "\r" });
    onCommandConsumed?.();
  }, [pendingCommand, onCommandConsumed, wsSend]);

  return (
    <div className="border-t border-border">
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: "300px", padding: "8px", background: "#0d1117" }}
      />
    </div>
  );
}
