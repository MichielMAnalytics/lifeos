'use client';

import { useState, useCallback, useRef, useEffect } from "react";
import type { ReactElement } from "react";
import { Loader2 } from "lucide-react";

interface ExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  source?: "rpc" | "shell";
}

interface HistoryEntry {
  command: string;
  result: ExecResult;
}

interface CommandRunnerProps {
  subdomain: string;
  gatewayToken: string;
  pendingCommand?: string | null;
  onCommandConsumed?: () => void;
}

function errorResult(stderr: string): ExecResult {
  return { ok: false, stdout: "", stderr, exitCode: -1 };
}

export function CommandRunnerContent({
  subdomain,
  gatewayToken,
  pendingCommand,
  onCommandConsumed,
}: CommandRunnerProps): ReactElement {
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const domain = process.env.NEXT_PUBLIC_LIFEOS_DOMAIN ?? "lifeos.app";
  const base = `https://${subdomain}.${domain}`;

  // Pick up command injected from cheatsheet
  useEffect(() => {
    if (pendingCommand) {
      setCommand(pendingCommand);
      setHistoryIndex(-1);
      onCommandConsumed?.();
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [pendingCommand, onCommandConsumed]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [loading]);

  const runCommand = useCallback(async () => {
    const cmd = command.trim();
    if (!cmd) return;

    setLoading(true);
    setCommand("");
    setCommandHistory((prev) => [...prev.filter((c) => c !== cmd), cmd]);
    setHistoryIndex(-1);

    try {
      const res = await fetch(`${base}/_/api/exec`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gatewayToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command: cmd }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message = (body as { error?: string }).error || `HTTP ${res.status}`;
        setHistory((prev) => [...prev, { command: cmd, result: errorResult(message) }]);
        return;
      }
      const data = (await res.json()) as ExecResult;
      setHistory((prev) => [...prev, { command: cmd, result: data }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setHistory((prev) => [...prev, { command: cmd, result: errorResult(message) }]);
    } finally {
      setLoading(false);
    }
  }, [command, base, gatewayToken]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      runCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      if (historyIndex >= commandHistory.length - 1) {
        setHistoryIndex(-1);
        setCommand("");
      } else {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    }
  };

  const handleTerminalClick = () => {
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="px-4 pb-4">
      <div
        ref={scrollRef}
        onClick={handleTerminalClick}
        className="bg-[#0d1117] rounded-md overflow-auto max-h-72 p-3 font-mono text-[11px] leading-relaxed cursor-text"
      >
        {history.map((entry, i) => (
          <div key={i} className="mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400/80">$</span>
              <span className="text-gray-300">{entry.command}</span>
              {entry.result.source === "rpc" && (
                <span className="text-[9px] text-emerald-500/40 ml-1">rpc</span>
              )}
            </div>
            {entry.result.stdout && (
              (() => {
                // Detect QR code data URL in JSON response (from web.login.start RPC)
                try {
                  const parsed = JSON.parse(entry.result.stdout);
                  if (parsed?.qrDataUrl) {
                    return (
                      <div className="mt-1 ml-[18px] space-y-1.5">
                        <img src={parsed.qrDataUrl} alt="QR Code" className="w-48 h-48 rounded bg-white p-1" />
                        {parsed.message && <p className="text-gray-400 text-[10px]">{parsed.message}</p>}
                        <p className="text-gray-500 text-[10px]">Scan with WhatsApp, then run: <span className="text-emerald-400/70">openclaw channels login wait</span></p>
                      </div>
                    );
                  }
                } catch { /* not JSON, render as text */ }
                return <pre className="whitespace-pre-wrap break-all text-gray-400 mt-0.5 ml-[18px]">{entry.result.stdout}</pre>;
              })()
            )}
            {entry.result.stderr && (
              <pre className="whitespace-pre-wrap break-all text-red-400/70 mt-0.5 ml-[18px]">{entry.result.stderr}</pre>
            )}
          </div>
        ))}

        <div ref={bottomRef} className="flex items-center gap-1.5">
          <span className="text-emerald-400/80 shrink-0">$</span>
          {loading && <Loader2 className="size-3 animate-spin text-gray-500 shrink-0" />}
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => {
              setCommand(e.target.value);
              setHistoryIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={loading ? "" : "Type a command..."}
            disabled={loading}
            className="flex-1 bg-transparent border-none outline-none text-gray-300 placeholder:text-gray-600 caret-emerald-400 disabled:opacity-0 disabled:w-0"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
