'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactElement } from "react";
import { Terminal, BookOpen, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui-clawnow/button";
import { Card } from "@/components/ui-clawnow/card";
import { FileBrowserContent } from "@/components/ai-agent/file-browser";
import { XtermTerminal } from "@/components/ai-agent/xterm-terminal";

type Panel = "files" | "terminal" | null;

interface InstanceToolsProps {
  subdomain: string;
  gatewayToken: string;
}

interface CheatsheetPopoverProps {
  open: boolean;
  onClose: () => void;
  onSelect: (cmd: string) => void;
}

const CHEATSHEET: { label: string; items: { cmd: string; desc: string }[] }[] = [
  {
    label: "Status & Health",
    items: [
      { cmd: "agent health", desc: "Instance health check" },
      { cmd: "agent status", desc: "Current status" },
      { cmd: "agent channels status", desc: "Channel status" },
    ],
  },
  {
    label: "Models",
    items: [
      { cmd: "agent models list", desc: "Available models" },
      { cmd: "agent config get", desc: "Full config (includes model)" },
    ],
  },
  {
    label: "Sessions & Chat",
    items: [
      { cmd: "agent sessions list", desc: "Active sessions" },
      { cmd: "agent tts status", desc: "Text-to-speech status" },
    ],
  },
  {
    label: "Config",
    items: [
      { cmd: "agent config get", desc: "View config" },
      { cmd: "agent config schema", desc: "Config schema" },
    ],
  },
  {
    label: "Skills & Cron",
    items: [
      { cmd: "agent skills status", desc: "Installed skills" },
      { cmd: "agent cron list", desc: "Scheduled jobs" },
    ],
  },
  {
    label: "Logs & Debug",
    items: [
      { cmd: "agent logs tail", desc: "Tail logs" },
      { cmd: "agent usage status", desc: "Usage stats" },
      { cmd: "agent usage cost", desc: "Cost breakdown" },
    ],
  },
];

function CheatsheetPopover({
  open,
  onClose,
  onSelect,
}: CheatsheetPopoverProps): ReactElement | null {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute left-full top-0 ml-2 z-[100] w-64 max-h-[17rem] overflow-auto rounded-md border border-border bg-surface p-2 shadow-lg"
    >
      <p className="text-[10px] text-text-muted px-2 pb-1.5">Click to insert into terminal</p>
      {CHEATSHEET.map((group) => (
        <div key={group.label} className="mb-1.5">
          <p className="text-[10px] font-medium text-text-muted px-2 py-1">{group.label}</p>
          {group.items.map((item) => (
            <button
              key={item.cmd}
              onClick={() => {
                onSelect(item.cmd);
                onClose();
              }}
              className="flex items-baseline gap-2 w-full text-left px-2 py-1 rounded hover:bg-surface-hover/50 transition-colors group"
            >
              <code className="text-[11px] font-mono text-text shrink-0 group-hover:text-accent transition-colors">
                {item.cmd.replace("agent ", "")}
              </code>
              <span className="text-[10px] text-text-muted/80 truncate">{item.desc}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export function InstanceTools({
  subdomain,
  gatewayToken,
}: InstanceToolsProps): ReactElement {
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);

  const toggle = (panel: "files" | "terminal") =>
    setActivePanel((cur) => (cur === panel ? null : panel));

  const handleCheatsheetSelect = (cmd: string) => {
    if (activePanel !== "terminal") setActivePanel("terminal");
    setPendingCommand(cmd);
  };

  const handleCommandConsumed = useCallback(() => setPendingCommand(null), []);

  return (
    <details className="group">
      <summary className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-text-muted hover:text-text-muted uppercase tracking-wider select-none list-none [&::-webkit-details-marker]:hidden transition-colors">
        <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
        Instance Tools
        <span className="text-[9px] normal-case tracking-normal text-text-muted/70">
          — File Browser, Terminal
        </span>
      </summary>
      <Card className="mt-3 relative">
        {/* Two-column header */}
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="flex items-center justify-between px-6 py-4">
            <h3 className="text-sm font-semibold leading-none tracking-tight">File Browser</h3>
            <Button variant="ghost" size="sm" onClick={() => toggle("files")} className="text-xs">
              {activePanel === "files" ? "Close" : "Browse"}
            </Button>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <h3 className="text-sm font-semibold leading-none tracking-tight flex items-center gap-1.5">
              <Terminal className="size-3.5" />
              Terminal
            </h3>
            <div className="relative flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCheatsheetOpen((v) => !v)}
                className="h-7 w-7 p-0"
                title="Command cheatsheet"
              >
                <BookOpen className="size-3.5" />
              </Button>
              <CheatsheetPopover
                open={cheatsheetOpen}
                onClose={() => setCheatsheetOpen(false)}
                onSelect={handleCheatsheetSelect}
              />
              <Button variant="ghost" size="sm" onClick={() => toggle("terminal")} className="text-xs">
                {activePanel === "terminal" ? "Close" : "Open"}
              </Button>
            </div>
          </div>
        </div>

        {/* Full-width content area */}
        {activePanel === "files" && (
          <FileBrowserContent subdomain={subdomain} gatewayToken={gatewayToken} />
        )}
        {activePanel === "terminal" && (
          <XtermTerminal
            subdomain={subdomain}
            gatewayToken={gatewayToken}
            pendingCommand={pendingCommand}
            onCommandConsumed={handleCommandConsumed}
          />
        )}
      </Card>
    </details>
  );
}
