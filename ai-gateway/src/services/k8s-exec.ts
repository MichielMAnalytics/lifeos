import fs from "node:fs";
import WebSocket from "ws";

const SA_TOKEN_PATH = "/var/run/secrets/kubernetes.io/serviceaccount/token";
const SA_CA_PATH = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt";
const NAMESPACE = "clawnow-users";

interface ExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

export async function k8sExec(
  podName: string,
  command: string[],
  timeoutMs = 15_000,
): Promise<ExecResult> {
  const token = fs.readFileSync(SA_TOKEN_PATH, "utf-8").trim();
  const ca = fs.readFileSync(SA_CA_PATH);

  const params = new URLSearchParams();
  for (const arg of command) {
    params.append("command", arg);
  }
  params.set("stdout", "true");
  params.set("stderr", "true");

  const url =
    `wss://kubernetes.default.svc/api/v1/namespaces/${NAMESPACE}/pods/${podName}/exec?${params.toString()}`;

  return new Promise<ExecResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close();
        resolve({ ok: false, stdout, stderr: stderr || "exec timed out" });
      }
    }, timeoutMs);

    const ws = new WebSocket(url, ["v4.channel.k8s.io"], {
      headers: { Authorization: `Bearer ${token}` },
      ca,
      rejectUnauthorized: true,
    });

    ws.on("message", (data: Buffer) => {
      if (data.length === 0) return;
      const channel = data[0];
      const payload = data.subarray(1).toString("utf-8");
      if (channel === 1) stdout += payload;
      else if (channel === 2) stderr += payload;
      else if (channel === 3) {
        // Status channel — JSON with status info
        try {
          const status = JSON.parse(payload);
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            ws.close();
            resolve({
              ok: status.status === "Success",
              stdout,
              stderr,
            });
          }
        } catch {
          // Ignore parse errors on status channel
        }
      }
    });

    ws.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ ok: false, stdout, stderr: stderr || String(err) });
      }
    });

    ws.on("close", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ ok: stdout !== "" && !stderr, stdout, stderr });
      }
    });
  });
}
