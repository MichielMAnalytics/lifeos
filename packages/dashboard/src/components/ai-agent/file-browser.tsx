'use client';

import { useState, useCallback, useEffect } from "react";
import { Folder, FileText, ChevronRight, Home, Loader2, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui-clawnow/button";

interface FileEntry {
  name: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: string | null;
}

interface FileContent {
  content: string;
  size: number;
  truncated: boolean;
}

const BASE_DIR = "/home/node";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileBrowserContent({
  subdomain,
  gatewayToken,
}: {
  subdomain: string;
  gatewayToken: string;
}) {
  const [currentPath, setCurrentPath] = useState(BASE_DIR);
  const [entries, setEntries] = useState<FileEntry[] | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const domain = process.env.NEXT_PUBLIC_LIFEOS_DOMAIN ?? "lifeos.app";
  const base = `https://${subdomain}.${domain}`;

  const fetchDir = useCallback(
    async (dirPath: string) => {
      setLoading(true);
      setError(null);
      setFileContent(null);
      setViewingFile(null);
      try {
        const res = await fetch(
          `${base}/_/api/list?path=${encodeURIComponent(dirPath)}`,
          { headers: { Authorization: `Bearer ${gatewayToken}` } },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as FileEntry[];
        setEntries(data);
        setCurrentPath(dirPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [base, gatewayToken],
  );

  // Auto-fetch on mount
  useEffect(() => {
    fetchDir(currentPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFile = useCallback(
    async (filePath: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${base}/_/api/download?path=${encodeURIComponent(filePath)}`,
          { headers: { Authorization: `Bearer ${gatewayToken}` } },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as FileContent;
        setFileContent(data);
        setViewingFile(filePath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read file");
      } finally {
        setLoading(false);
      }
    },
    [base, gatewayToken],
  );

  const handleEntry = (entry: FileEntry) => {
    const fullPath = `${currentPath === "/" ? "" : currentPath}/${entry.name}`;
    if (entry.type === "directory") {
      fetchDir(fullPath);
    } else {
      fetchFile(fullPath);
    }
  };

  const navigateUp = () => {
    if (currentPath === BASE_DIR) return;
    const parent = currentPath.substring(0, currentPath.lastIndexOf("/")) || BASE_DIR;
    if (!parent.startsWith(BASE_DIR)) {
      fetchDir(BASE_DIR);
    } else {
      fetchDir(parent);
    }
  };

  const segments = currentPath.replace(BASE_DIR, "").split("/").filter(Boolean);

  const handleDownloadFile = () => {
    if (!fileContent || !viewingFile) return;
    const blob = new Blob([fileContent.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = viewingFile.split("/").pop() || "file";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-6 pb-6 space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-text-muted overflow-x-auto">
        <button
          onClick={() => fetchDir(BASE_DIR)}
          className="hover:text-text transition-colors shrink-0 flex items-center gap-0.5"
        >
          <Home className="size-3" />
          <span>~</span>
        </button>
        {segments.map((seg, i) => {
          const segPath = `${BASE_DIR}/${segments.slice(0, i + 1).join("/")}`;
          return (
            <span key={segPath} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="size-3 text-text-muted/40" />
              <button
                onClick={() => fetchDir(segPath)}
                className="hover:text-text transition-colors"
              >
                {seg}
              </button>
            </span>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-text-muted" />
        </div>
      )}

      {/* File content preview */}
      {!loading && viewingFile && fileContent && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setViewingFile(null); setFileContent(null); }}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors"
            >
              <ArrowLeft className="size-3" />
              Back to listing
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted/60">
                {formatSize(fileContent.size)}
                {fileContent.truncated && " (truncated to 100 KB)"}
              </span>
              <Button variant="ghost" size="sm" onClick={handleDownloadFile} className="h-6 px-2">
                <Download className="size-3" />
              </Button>
            </div>
          </div>
          <pre className="text-[11px] font-mono bg-bg ring-1 ring-text/10 rounded p-3 overflow-auto max-h-80 whitespace-pre-wrap break-all">
            {fileContent.content}
          </pre>
        </div>
      )}

      {/* Directory listing */}
      {!loading && !viewingFile && entries && (
        <div className="space-y-0.5">
          {currentPath !== BASE_DIR && (
            <button
              onClick={navigateUp}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-text-muted hover:bg-surface-hover/50 transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              ..
            </button>
          )}
          {entries.length === 0 && (
            <p className="text-xs text-text-muted/60 py-2 text-center">Empty directory</p>
          )}
          {entries.map((entry) => (
            <button
              key={entry.name}
              onClick={() => handleEntry(entry)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-surface-hover/50 transition-colors group"
            >
              {entry.type === "directory" ? (
                <Folder className="size-3.5 text-text-muted" />
              ) : (
                <FileText className="size-3.5 text-text-muted" />
              )}
              <span className="text-xs text-text truncate flex-1 text-left">
                {entry.name}
              </span>
              {entry.type === "file" && (
                <span className="text-[10px] text-text-muted/50">
                  {formatSize(entry.size)}
                </span>
              )}
              {entry.type === "directory" && (
                <ChevronRight className="size-3 text-text-muted/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
