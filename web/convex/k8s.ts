"use node";

import * as crypto from "crypto";
import * as https from "https";
import { serverEnv } from "./deploymentEnv";

const USERS_NAMESPACE = "lifeos-users";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

function getSaKey(): ServiceAccountKey {
  const raw = serverEnv.GCP_SA_KEY;
  if (!raw) throw new Error("GCP_SA_KEY not configured");
  return JSON.parse(raw) as ServiceAccountKey;
}

async function getGcpAccessToken(): Promise<string> {
  const sa = getSaKey();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const unsigned = `${enc(header)}.${enc(payload)}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(sa.private_key, "base64url");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function k8sUrl(path: string): string {
  const base = serverEnv.K8S_API_URL;
  if (!base) throw new Error("K8S_API_URL not configured");
  return `${base}${path}`;
}

async function k8sFetch(
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
  const token = await getGcpAccessToken();
  const url = new URL(k8sUrl(path));

  const caCertB64 = serverEnv.K8S_CA_CERT;
  if (!caCertB64) throw new Error("K8S_CA_CERT not configured");
  const ca = Buffer.from(caCertB64, "base64").toString("utf-8");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: options.method ?? "GET",
        headers,
        ca,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          resolve({
            ok: res.statusCode! >= 200 && res.statusCode! < 300,
            status: res.statusCode!,
            text: async () => body,
          });
        });
      },
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

export async function createSecret(
  name: string,
  data: Record<string, string>,
): Promise<void> {
  const encoded: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    encoded[k] = Buffer.from(v).toString("base64");
  }

  const body = JSON.stringify({
    apiVersion: "v1",
    kind: "Secret",
    metadata: { name, namespace: USERS_NAMESPACE },
    type: "Opaque",
    data: encoded,
  });

  const res = await k8sFetch(
    `/api/v1/namespaces/${USERS_NAMESPACE}/secrets`,
    { method: "POST", body },
  );

  if (res.status === 409) {
    // Secret already exists — replace it with the new values
    const replaceRes = await k8sFetch(
      `/api/v1/namespaces/${USERS_NAMESPACE}/secrets/${name}`,
      { method: "PUT", body },
    );
    if (!replaceRes.ok) {
      const err = await replaceRes.text();
      throw new Error(`Failed to replace secret ${name}: ${err}`);
    }
    return;
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create secret ${name}: ${err}`);
  }
}

export async function deleteSecret(name: string): Promise<void> {
  const res = await k8sFetch(
    `/api/v1/namespaces/${USERS_NAMESPACE}/secrets/${name}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Failed to delete secret ${name}: ${err}`);
  }
}

export const MODEL_REF_MAP: Record<string, string> = {
  claude: "anthropic/claude-opus-4-6",
  "claude-sonnet": "anthropic/claude-sonnet-4-6",
  "claude-haiku": "anthropic/claude-haiku-4-5-20251001",
  "gpt-5.5": "openai/gpt-5.5",
  "gpt-5.5-pro": "openai/gpt-5.5-pro",
  gpt: "openai/gpt-5.4-2026-03-05",
  "gpt-5.2": "openai/gpt-5.2",
  "gpt-mini": "openai/gpt-5-mini-2025-08-07",
  "gpt-nano": "openai/gpt-5-nano-2025-08-07",
  "kimi-k2": "kimi/moonshotai/kimi-k2-thinking-maas",
  "kimi-k2.5": "kimi/moonshotai/kimi-k2.5",
  "kimi-k2-thinking-turbo": "kimi/moonshotai/kimi-k2-thinking-turbo",
  "kimi-k2-turbo": "kimi/moonshotai/kimi-k2-turbo-preview",
  "gemini-pro": "gemini/google/gemini-3.1-pro-preview",
  "gemini-flash": "gemini/google/gemini-3-flash-preview",
  "minimax-m2.1": "minimax/MiniMax-M2.1",
  "minimax-m2.5": "minimax/MiniMax-M2.5",
  "qwen-coder": "qwen-vertex/qwen/qwen3-coder-480b-a35b-instruct-maas",
  "qwen-235b": "qwen-vertex/qwen/qwen3-235b-a22b-instruct-2507-maas",
};

function buildOpenClawConfig(
  gatewayUrl: string,
  podSecretEnvRef: string,
  selectedModel: string,
  enabledChannels?: { telegram?: boolean; discord?: boolean; whatsapp?: boolean },
): object {
  const selectedModelRef = MODEL_REF_MAP[selectedModel] ?? MODEL_REF_MAP["claude"];
  const ch = enabledChannels ?? {};
  const hasTelegram = ch.telegram ?? false;
  const hasDiscord = ch.discord ?? false;

  return {
    gateway: {
      auth: { token: "__GATEWAY_TOKEN__", mode: "token" },
      controlUi: {
        dangerouslyDisableDeviceAuth: true,  // Token auth is used instead of device identity
        allowedOrigins: ["http://localhost:4101", "https://lifeos.zone", "https://www.lifeos.zone", "https://app.lifeos.zone"],
      },
      trustedProxies: ["10.0.0.0/8"],
    },
    browser: {
      enabled: true,
      headless: true,
      noSandbox: true,
      defaultProfile: "openclaw",
    },
    models: {
      mode: "replace",
      providers: {
        anthropic: {
          baseUrl: `${gatewayUrl}/v1/anthropic`,
          apiKey: "gateway-managed",
          api: "anthropic-messages",
          headers: { "X-Pod-Secret": podSecretEnvRef },
          // Required for OpenClaw v2026.4.10+ SSRF guard — the in-cluster
          // ai-gateway URL resolves to a private 10.x address which is
          // blocked by default.
          request: { allowPrivateNetwork: true },
          models: [
            { id: "claude-opus-4-6", name: "Claude Opus 4.6", contextWindow: 1000000, maxTokens: 32000, input: ["text", "image"] },
            { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", contextWindow: 200000, maxTokens: 16000, input: ["text", "image"] },
            { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", contextWindow: 200000, maxTokens: 8192, input: ["text", "image"] },
          ],
        },
        openai: {
          baseUrl: `${gatewayUrl}/v1/openai`,
          apiKey: "gateway-managed",
          api: "openai-responses",
          headers: { "X-Pod-Secret": podSecretEnvRef },
          request: { allowPrivateNetwork: true },
          models: [
            { id: "gpt-5.5", name: "GPT 5.5", contextWindow: 1048576, maxTokens: 32000, input: ["text", "image"] },
            { id: "gpt-5.5-pro", name: "GPT 5.5 Pro", contextWindow: 1048576, maxTokens: 32000, input: ["text", "image"] },
            { id: "gpt-5.4-2026-03-05", name: "GPT 5.4", contextWindow: 1048576, maxTokens: 32000, input: ["text", "image"] },
            { id: "gpt-5.2", name: "GPT 5.2", contextWindow: 1000000, maxTokens: 32000, input: ["text", "image"] },
            { id: "gpt-5-mini-2025-08-07", name: "GPT-5 Mini", contextWindow: 400000, maxTokens: 16384, input: ["text", "image"] },
            { id: "gpt-5-nano-2025-08-07", name: "GPT-5 Nano", contextWindow: 128000, maxTokens: 16384, input: ["text", "image"] },
          ],
        },
        kimi: {
          baseUrl: `${gatewayUrl}/v1/kimi`,
          apiKey: "gateway-managed",
          api: "openai-completions",
          headers: { "X-Pod-Secret": podSecretEnvRef },
          request: { allowPrivateNetwork: true },
          models: [
            { id: "moonshotai/kimi-k2-thinking-maas", name: "Kimi K2 Thinking", reasoning: true, contextWindow: 262144, maxTokens: 65536, compat: { supportsDeveloperRole: false } },
            { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5", reasoning: false, contextWindow: 262144, maxTokens: 8192, input: ["text", "image"], compat: { supportsDeveloperRole: false } },
            { id: "moonshotai/kimi-k2-thinking-turbo", name: "Kimi K2 Thinking Turbo", reasoning: true, contextWindow: 262144, maxTokens: 65536, compat: { supportsDeveloperRole: false } },
            { id: "moonshotai/kimi-k2-turbo-preview", name: "Kimi K2 Turbo", reasoning: false, contextWindow: 262144, maxTokens: 8192, compat: { supportsDeveloperRole: false } },
          ],
        },
        gemini: {
          baseUrl: `${gatewayUrl}/v1/gemini`,
          apiKey: "gateway-managed",
          api: "openai-completions",
          headers: { "X-Pod-Secret": podSecretEnvRef },
          request: { allowPrivateNetwork: true },
          models: [
            { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", reasoning: false, contextWindow: 1000000, maxTokens: 65536, input: ["text", "image"] },
            { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash", reasoning: false, contextWindow: 1000000, maxTokens: 65536, input: ["text", "image"] },
          ],
        },
        minimax: {
          baseUrl: `${gatewayUrl}/v1/minimax`,
          apiKey: "gateway-managed",
          api: "openai-completions",
          headers: { "X-Pod-Secret": podSecretEnvRef },
          request: { allowPrivateNetwork: true },
          models: [
            { id: "MiniMax-M2.1", name: "MiniMax M2.1", contextWindow: 200000, maxTokens: 8192, input: ["text"] },
            { id: "MiniMax-M2.5", name: "MiniMax M2.5", reasoning: true, contextWindow: 200000, maxTokens: 8192, input: ["text"] },
          ],
        },
        "qwen-vertex": {
          baseUrl: `${gatewayUrl}/v1/qwen`,
          apiKey: "gateway-managed",
          api: "openai-completions",
          headers: { "X-Pod-Secret": podSecretEnvRef },
          request: { allowPrivateNetwork: true },
          models: [
            { id: "qwen/qwen3-coder-480b-a35b-instruct-maas", name: "Qwen3 Coder 480B", contextWindow: 262144, maxTokens: 65536, input: ["text"] },
            { id: "qwen/qwen3-235b-a22b-instruct-2507-maas", name: "Qwen3 235B", contextWindow: 262144, maxTokens: 8192, input: ["text"] },
          ],
        },
      },
    },
    agents: {
      defaults: {
        model: { primary: selectedModelRef },
      },
    },
    tools: {
      media: {
        audio: {
          enabled: true,
          echoTranscript: true,
          echoFormat: "🎤 \"{transcript}\"",
          models: [
            { provider: "openai", model: "gpt-4o-mini-transcribe" },
          ],
        },
      },
    },
    skills: {
      load: {
        extraDirs: ["/home/node/.openclaw/skills"],
      },
    },
    channels: {
      ...(hasTelegram ? { telegram: { enabled: true, dmPolicy: "open", allowFrom: ["*"] } } : {}),
      ...(hasDiscord ? { discord: { enabled: true, dmPolicy: "open", allowFrom: ["*"], groupPolicy: "open" } } : {}),
    },
    plugins: {
      // Deny v4.15 auto-loaded plugins we don't use. Every denied plugin skips
      // its module graph at boot, shrinking the JIT/import work on cold starts.
      // Keep `browser` and `telegram` (implicit auto-enable defaults).
      deny: [
        "whatsapp",
        "discord",
        "googlechat",
        "acpx",
        "device-pair",
        "phone-control",
        "talk-voice",
        "memory-core",
        "active-memory",
      ],
      entries: {
        ...(hasTelegram ? { telegram: { enabled: true } } : {}),
        ...(hasDiscord ? { discord: { enabled: true } } : {}),
      },
    },
  };
}

export async function createStatefulSet(opts: {
  name: string;
  subdomain: string;
  imageTag: string;
  secretName: string;
  initSecretName: string;
  configHash: string;
  selectedModel: string;
  enabledChannels?: { telegram?: boolean; discord?: boolean; whatsapp?: boolean };
}): Promise<void> {
  const { name, subdomain, imageTag, secretName, initSecretName, configHash, selectedModel, enabledChannels } = opts;
  const spec = {
    apiVersion: "apps/v1",
    kind: "StatefulSet",
    metadata: {
      name,
      namespace: USERS_NAMESPACE,
      labels: { app: name, subdomain },
    },
    spec: {
      replicas: 1,
      serviceName: name,
      updateStrategy: { type: "OnDelete" },
      selector: { matchLabels: { app: name } },
      template: {
        metadata: {
          labels: { app: name, subdomain, "lifeos.app/role": "user-instance" },
          annotations: { "lifeos/config-hash": configHash },
        },
        spec: {
          terminationGracePeriodSeconds: 10,
          securityContext: {
            fsGroup: 1000,
          },
          initContainers: [
            {
              name: "persist-setup",
              image: imageTag,
              command: [
                "sh",
                "-c",
                [
                  "mkdir -p /mnt/data/.persist /mnt/data/.npm-global /mnt/data/.local/bin",
                  'if [ ! -d "/mnt/data/.persist/linuxbrew/bin" ]; then cp -a /home/linuxbrew/.linuxbrew /mnt/data/.persist/linuxbrew; fi',
                  "chown -R 1000:1000 /mnt/data/.persist /mnt/data/.npm-global /mnt/data/.local",
                ].join(" && "),
              ],
              volumeMounts: [
                { name: "data", mountPath: "/mnt/data" },
              ],
              securityContext: { runAsUser: 0 },
            },
            {
              name: "register",
              image: "curlimages/curl:latest",
              command: [
                "sh",
                "-c",
                `curl -sf -X POST http://${serverEnv.AI_GATEWAY_K8S_SERVICE}.lifeos-system.svc.cluster.local/register \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer $CALLBACK_JWT" \
                  -d '{"podSecret":"'$POD_SECRET'","subdomain":"'$SUBDOMAIN'","userId":"'$USER_ID'","apiKeySource":"'$API_KEY_SOURCE'","ownerEmail":"'$OWNER_EMAIL'","gatewayToken":"'$GATEWAY_TOKEN'"}'`,
              ],
              envFrom: [{ secretRef: { name: initSecretName } }],
              env: [
                { name: "SUBDOMAIN", value: subdomain },
              ],
            },
            {
              name: "lifeos-setup",
              image: imageTag,
              command: ["sh", "-c", [
                'export HOME=/mnt/data',
                'export PATH="/mnt/data/.npm-global/bin:/usr/local/bin:$PATH"',
                '',
                '# Configure LifeOS CLI (write config directly, no CLI dependency)',
                'if [ -n "$LIFEOS_API_URL" ] && [ -n "$LIFEOS_API_KEY" ]; then',
                '  mkdir -p /mnt/data/.lifeos',
                '  node -e "process.stdout.write(JSON.stringify({api_url:process.env.LIFEOS_API_URL,api_key:process.env.LIFEOS_API_KEY})+\\"\\\\n\\")" > /mnt/data/.lifeos/config.json',
                'fi',
                '',
                '# Sync skills (always update to latest version from image)',
                'mkdir -p /mnt/data/.openclaw/skills',
                'if [ -d /app/lifeos-skills ]; then',
                '  for skill_dir in /app/lifeos-skills/*/; do',
                '    [ -d "$skill_dir" ] || continue',
                '    skill_name=$(basename "$skill_dir")',
                '    mkdir -p "/mnt/data/.openclaw/skills/$skill_name"',
                '    cp -r "$skill_dir"* "/mnt/data/.openclaw/skills/$skill_name/"',
                '  done',
                'fi',
              ].join('\n')],
              env: [
                { name: "LIFEOS_API_URL", valueFrom: { secretKeyRef: { name: initSecretName, key: "LIFEOS_API_URL" } } },
                { name: "LIFEOS_API_KEY", valueFrom: { secretKeyRef: { name: initSecretName, key: "LIFEOS_API_KEY" } } },
              ],
              volumeMounts: [{ name: "data", mountPath: "/mnt/data" }],
              securityContext: { runAsUser: 1000, runAsGroup: 1000 },
            },
          ],
          containers: [
            {
              name: "openclaw",
              image: imageTag,
              command: [
                "sh", "-c",
                (() => {
                  // Use __POD_SECRET__ placeholder, replaced at runtime via sed
                  // Use in-cluster gateway URL for speed/stability; SSRF bypass via gateway.security config
                  const inClusterGatewayUrl = `http://${serverEnv.AI_GATEWAY_K8S_SERVICE}.lifeos-system.svc.cluster.local`;
                  const configTemplate = JSON.stringify(buildOpenClawConfig(inClusterGatewayUrl, "__POD_SECRET__", selectedModel, enabledChannels));
                  // Merge platform config into existing openclaw.json to preserve user channel settings.
                  // On first boot, creates openclaw.json from template. On restart, merges only
                  // gateway/models/agents keys while keeping user-configured channels etc.
                  const mergeScript = `node -e "
const fs = require('fs');
const h = require('os').homedir();
const pf = h + '/.openclaw/lifeos-platform.json';
const cf = h + '/.openclaw/openclaw.json';
const p = JSON.parse(fs.readFileSync(pf, 'utf8'));
if (!fs.existsSync(cf)) { fs.writeFileSync(cf, JSON.stringify(p)); process.exit(0); }
const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
// Deep merge gateway — preserve nested objects like controlUi
const gw = c.gateway || {};
const pgw = p.gateway || {};
Object.keys(pgw).forEach(k => {
  if (typeof pgw[k] === 'object' && pgw[k] && !Array.isArray(pgw[k])) {
    gw[k] = Object.assign(gw[k] || {}, pgw[k]);
  } else {
    gw[k] = pgw[k];
  }
});
c.gateway = gw;
// Clean up stale keys that OpenClaw rejects
delete c.gateway.security; delete c.security;
// Always force allowedOrigins (critical for dashboard access)
if (!c.gateway.controlUi) c.gateway.controlUi = {};
c.gateway.controlUi.allowedOrigins = (p.gateway && p.gateway.controlUi && p.gateway.controlUi.allowedOrigins) || ['http://localhost:4101','https://lifeos.zone','https://www.lifeos.zone','https://app.lifeos.zone'];
c.gateway.controlUi.dangerouslyDisableDeviceAuth = true;
c.models = p.models;
c.agents = p.agents;
c.tools = p.tools;
c.skills = p.skills;
if (!c.browser) c.browser = p.browser;
c.channels = Object.assign(c.channels || {}, p.channels || {});
c.plugins = Object.assign(p.plugins || {}, c.plugins || {});
fs.writeFileSync(cf, JSON.stringify(c));
"`;
                  return [
                    `export PATH="/home/node/.npm-global/bin:/home/node/.local/bin:$PATH"`,
                    `find ~/.openclaw -name '*.lock' -delete 2>/dev/null || true`,
                    `mkdir -p ~/.openclaw/devices`,
                    `rm -f ~/.openclaw/identity/device-auth.json`,
                    `echo '${configTemplate}' | sed "s/__POD_SECRET__/$POD_SECRET/g; s/__GATEWAY_TOKEN__/$OPENCLAW_GATEWAY_TOKEN/g; s/__OPENAI_API_KEY__/$OPENAI_API_KEY/g" > ~/.openclaw/lifeos-platform.json`,
                    mergeScript,
                    `test -f ~/.openclaw/devices/pending.json || echo '${JSON.stringify({ silent: true })}' > ~/.openclaw/devices/pending.json`,
                  ].join(" && ")
                  + ` && node --disable-warning=ExperimentalWarning openclaw.mjs gateway --allow-unconfigured --bind lan &`
                  + ` until curl -sf http://127.0.0.1:18789 >/dev/null 2>&1; do sleep 0.5; done`
                  + ` && exec node /app/file-server.mjs`;
                })(),
              ],
              ports: [
                { containerPort: 18789, name: "http" },
                { containerPort: 3001, name: "file-api" },
              ],
              envFrom: [{ secretRef: { name: secretName } }],
              env: [
                { name: "GATEWAY_URL", value: `http://${serverEnv.AI_GATEWAY_K8S_SERVICE}.lifeos-system.svc.cluster.local` },
                { name: "SUBDOMAIN", value: subdomain },
                { name: "OPENCLAW_GATEWAY_PORT", value: "18789" },
                { name: "OPENCLAW_GATEWAY_BIND", value: "0.0.0.0" },
                { name: "OPENCLAW_GATEWAY_TOKEN", valueFrom: { secretKeyRef: { name: secretName, key: "GATEWAY_TOKEN" } } },
                { name: "NPM_CONFIG_PREFIX", value: "/home/node/.npm-global" },
                { name: "PIP_USER", value: "1" },
                { name: "LIFEOS_API_URL", valueFrom: { secretKeyRef: { name: initSecretName, key: "LIFEOS_API_URL" } } },
                { name: "LIFEOS_API_KEY", valueFrom: { secretKeyRef: { name: initSecretName, key: "LIFEOS_API_KEY" } } },
              ],
              volumeMounts: [
                { name: "data", mountPath: "/home/node" },
                { name: "data", mountPath: "/home/linuxbrew/.linuxbrew", subPath: ".persist/linuxbrew" },
              ],
              resources: {
                requests: { cpu: "250m", memory: "1Gi" },
                limits: { cpu: "1000m", memory: "2Gi" },
              },
              startupProbe: {
                httpGet: { path: "/", port: 18789 },
                initialDelaySeconds: 10,
                periodSeconds: 10,
                timeoutSeconds: 5,
                failureThreshold: 120, // 10 + 120×10 = 1210s max startup (20min — accommodates slow disk first-boot after image change)
              },
              readinessProbe: {
                httpGet: { path: "/", port: 18789 },
                periodSeconds: 10,
                timeoutSeconds: 15,
              },
              livenessProbe: {
                httpGet: { path: "/", port: 18789 },
                periodSeconds: 30,
                timeoutSeconds: 15,
                failureThreshold: 10,
              },
            },
          ],
        },
      },
      volumeClaimTemplates: [
        {
          metadata: { name: "data" },
          spec: {
            accessModes: ["ReadWriteOnce"],
            resources: { requests: { storage: "5Gi" } },
          },
        },
      ],
    },
  };

  const res = await k8sFetch(
    `/apis/apps/v1/namespaces/${USERS_NAMESPACE}/statefulsets`,
    { method: "POST", body: JSON.stringify(spec) },
  );

  if (!res.ok && res.status !== 409) {
    const err = await res.text();
    throw new Error(`Failed to create StatefulSet ${name}: ${err}`);
  }
}

export async function deletePod(name: string): Promise<void> {
  const res = await k8sFetch(
    `/api/v1/namespaces/${USERS_NAMESPACE}/pods/${name}-0`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Failed to delete Pod ${name}-0: ${err}`);
  }
}

export async function deleteStatefulSet(name: string): Promise<void> {
  const res = await k8sFetch(
    `/apis/apps/v1/namespaces/${USERS_NAMESPACE}/statefulsets/${name}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Failed to delete StatefulSet ${name}: ${err}`);
  }
}

export async function patchStatefulSet(
  name: string,
  configHash: string,
  selectedModel?: string,
  initSecretName?: string,
  enabledChannels?: { telegram?: boolean; discord?: boolean; whatsapp?: boolean },
): Promise<void> {
  const imageTag = serverEnv.OPENCLAW_IMAGE_TAG ?? "latest";

  // Always include persist-setup init container for package persistence
  const initContainers: unknown[] = [
    {
      name: "persist-setup",
      image: imageTag,
      command: [
        "sh",
        "-c",
        [
          "mkdir -p /mnt/data/.persist /mnt/data/.npm-global /mnt/data/.local/bin",
          'if [ ! -d "/mnt/data/.persist/linuxbrew/bin" ]; then cp -a /home/linuxbrew/.linuxbrew /mnt/data/.persist/linuxbrew; fi',
          "chown -R 1000:1000 /mnt/data/.persist /mnt/data/.npm-global /mnt/data/.local",
        ].join(" && "),
      ],
      volumeMounts: [
        { name: "data", mountPath: "/mnt/data" },
      ],
      securityContext: { runAsUser: 0 },
    },
  ];

  // If initSecretName provided, include register init container
  if (initSecretName) {
    initContainers.push({
      name: "register",
      image: "curlimages/curl:latest",
      command: [
        "sh",
        "-c",
        `curl -sf -X POST http://${serverEnv.AI_GATEWAY_K8S_SERVICE}.lifeos-system.svc.cluster.local/register \
                  -H "Content-Type: application/json" \
                  -H "Authorization: Bearer $CALLBACK_JWT" \
                  -d '{"podSecret":"'$POD_SECRET'","subdomain":"'$SUBDOMAIN'","userId":"'$USER_ID'","apiKeySource":"'$API_KEY_SOURCE'","ownerEmail":"'$OWNER_EMAIL'","gatewayToken":"'$GATEWAY_TOKEN'"}'`,
      ],
      envFrom: [{ secretRef: { name: initSecretName } }],
    });

    initContainers.push({
      name: "lifeos-setup",
      image: imageTag,
      command: ["sh", "-c", [
        'export HOME=/mnt/data',
        'export PATH="/mnt/data/.npm-global/bin:/usr/local/bin:$PATH"',
        '',
        '# Configure LifeOS CLI (write config directly, no CLI dependency)',
        'if [ -n "$LIFEOS_API_URL" ] && [ -n "$LIFEOS_API_KEY" ]; then',
        '  mkdir -p /mnt/data/.lifeos',
        '  node -e "process.stdout.write(JSON.stringify({api_url:process.env.LIFEOS_API_URL,api_key:process.env.LIFEOS_API_KEY})+\\"\\\\n\\")" > /mnt/data/.lifeos/config.json',
        'fi',
        '',
        '# Sync skills (always update to latest version from image)',
        'mkdir -p /mnt/data/.openclaw/skills',
        'for skill_dir in /app/lifeos-skills/*/; do',
        '  skill_name=$(basename "$skill_dir")',
        '  mkdir -p "/mnt/data/.openclaw/skills/$skill_name"',
        '  cp -r "$skill_dir"* "/mnt/data/.openclaw/skills/$skill_name/"',
        'done',
      ].join('\n')],
      env: [
        { name: "LIFEOS_API_URL", valueFrom: { secretKeyRef: { name: initSecretName, key: "LIFEOS_API_URL", optional: true } } },
        { name: "LIFEOS_API_KEY", valueFrom: { secretKeyRef: { name: initSecretName, key: "LIFEOS_API_KEY", optional: true } } },
        { name: "OPENAI_API_KEY", valueFrom: { secretKeyRef: { name: initSecretName, key: "OPENAI_API_KEY", optional: true } } },
      ],
      volumeMounts: [{ name: "data", mountPath: "/mnt/data" }],
      securityContext: { runAsUser: 1000, runAsGroup: 1000 },
    });
  }

  // Build openclaw container patch — always includes persistence specs + probes
  const openclawContainer: Record<string, unknown> = {
    name: "openclaw",
    image: imageTag,
    volumeMounts: [
      { name: "data", mountPath: "/home/node" },
      { name: "data", mountPath: "/home/linuxbrew/.linuxbrew", subPath: ".persist/linuxbrew" },
    ],
    env: [
      { name: "NPM_CONFIG_PREFIX", value: "/home/node/.npm-global" },
      { name: "PIP_USER", value: "1" },
      ...(initSecretName ? [
        { name: "LIFEOS_API_URL", valueFrom: { secretKeyRef: { name: initSecretName, key: "LIFEOS_API_URL" } } },
        { name: "LIFEOS_API_KEY", valueFrom: { secretKeyRef: { name: initSecretName, key: "LIFEOS_API_KEY" } } },
        { name: "OPENAI_API_KEY", valueFrom: { secretKeyRef: { name: initSecretName, key: "OPENAI_API_KEY", optional: true } } },
      ] : []),
    ],
    startupProbe: {
      httpGet: { path: "/", port: 18789 },
      initialDelaySeconds: 10,
      periodSeconds: 10,
      timeoutSeconds: 5,
      failureThreshold: 120, // 10 + 120×10 = 1210s max startup (20min — accommodates slow disk first-boot after image change)
    },
    readinessProbe: {
      httpGet: { path: "/", port: 18789 },
      periodSeconds: 10,
      timeoutSeconds: 15,
    },
    livenessProbe: {
      httpGet: { path: "/", port: 18789 },
      periodSeconds: 30,
      timeoutSeconds: 15,
      failureThreshold: 10,
    },
  };

  // If model provided, update the container command with new OpenClaw config + PATH export
  if (selectedModel) {
    // Use in-cluster gateway URL for speed/stability; SSRF bypass via gateway.security config
    const inClusterGatewayUrl = `http://${serverEnv.AI_GATEWAY_K8S_SERVICE}.lifeos-system.svc.cluster.local`;
    const configTemplate = JSON.stringify(buildOpenClawConfig(inClusterGatewayUrl, "__POD_SECRET__", selectedModel, enabledChannels));
    const mergeScript = `node -e "
const fs = require('fs');
const h = require('os').homedir();
const pf = h + '/.openclaw/lifeos-platform.json';
const cf = h + '/.openclaw/openclaw.json';
const p = JSON.parse(fs.readFileSync(pf, 'utf8'));
if (!fs.existsSync(cf)) { fs.writeFileSync(cf, JSON.stringify(p)); process.exit(0); }
const c = JSON.parse(fs.readFileSync(cf, 'utf8'));
const gw = c.gateway || {};
const pgw = p.gateway || {};
Object.keys(pgw).forEach(k => {
  if (typeof pgw[k] === 'object' && pgw[k] && !Array.isArray(pgw[k])) {
    gw[k] = Object.assign(gw[k] || {}, pgw[k]);
  } else {
    gw[k] = pgw[k];
  }
});
c.gateway = gw;
if (!c.gateway.controlUi) c.gateway.controlUi = {};
c.gateway.controlUi.allowedOrigins = (p.gateway && p.gateway.controlUi && p.gateway.controlUi.allowedOrigins) || ['http://localhost:4101','https://lifeos.zone','https://www.lifeos.zone','https://app.lifeos.zone'];
c.gateway.controlUi.dangerouslyDisableDeviceAuth = true;
c.models = p.models;
c.agents = p.agents;
c.tools = p.tools;
c.skills = p.skills;
if (!c.browser) c.browser = p.browser;
c.channels = Object.assign(c.channels || {}, p.channels || {});
c.plugins = Object.assign(p.plugins || {}, c.plugins || {});
fs.writeFileSync(cf, JSON.stringify(c));
"`;
    const command = [
      `export PATH="/home/node/.npm-global/bin:/home/node/.local/bin:$PATH"`,
      `find ~/.openclaw -name '*.lock' -delete 2>/dev/null || true`,
      `mkdir -p ~/.openclaw/devices`,
      `rm -f ~/.openclaw/identity/device-auth.json`,
      `echo '${configTemplate}' | sed "s/__POD_SECRET__/$POD_SECRET/g; s/__GATEWAY_TOKEN__/$OPENCLAW_GATEWAY_TOKEN/g; s/__OPENAI_API_KEY__/$OPENAI_API_KEY/g" > ~/.openclaw/lifeos-platform.json`,
      mergeScript,
      `test -f ~/.openclaw/devices/pending.json || echo '${JSON.stringify({ silent: true })}' > ~/.openclaw/devices/pending.json`,
    ].join(" && ")
    + ` && node openclaw.mjs gateway --allow-unconfigured --bind lan &`
    + ` until curl -sf http://127.0.0.1:18789 >/dev/null 2>&1; do sleep 0.5; done`
    + ` && exec node /app/file-server.mjs`;

    openclawContainer.command = ["sh", "-c", command];
  }

  const patch = {
    spec: {
      updateStrategy: { type: "OnDelete", rollingUpdate: null },
      template: {
        metadata: {
          annotations: { "lifeos/config-hash": configHash },
        },
        spec: {
          terminationGracePeriodSeconds: 10,
          initContainers,
          containers: [openclawContainer],
        },
      },
    },
  };

  const res = await k8sFetch(
    `/apis/apps/v1/namespaces/${USERS_NAMESPACE}/statefulsets/${name}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/strategic-merge-patch+json" },
      body: JSON.stringify(patch),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to patch StatefulSet ${name}: ${err}`);
  }
}

export async function createService(
  name: string,
  subdomain: string,
): Promise<void> {
  const spec = {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name,
      namespace: USERS_NAMESPACE,
      labels: { app: name, subdomain },
    },
    spec: {
      type: "ClusterIP",
      selector: { app: name },
      ports: [
        { port: 80, targetPort: 18789, protocol: "TCP", name: "http" },
        { port: 3001, targetPort: 3001, protocol: "TCP", name: "file-api" },
      ],
    },
  };

  const res = await k8sFetch(
    `/api/v1/namespaces/${USERS_NAMESPACE}/services`,
    { method: "POST", body: JSON.stringify(spec) },
  );

  if (res.status === 409) {
    // Service already exists — fetch current version and PUT to update ports
    const getRes = await k8sFetch(
      `/api/v1/namespaces/${USERS_NAMESPACE}/services/${name}`,
    );
    if (!getRes.ok) {
      const err = await getRes.text();
      throw new Error(`Failed to get existing Service ${name}: ${err}`);
    }
    const existing = JSON.parse(await getRes.text()) as {
      metadata: { resourceVersion: string };
      spec: { clusterIP: string };
    };
    (spec.metadata as Record<string, unknown>).resourceVersion =
      existing.metadata.resourceVersion;
    (spec.spec as Record<string, unknown>).clusterIP =
      existing.spec.clusterIP;
    const putRes = await k8sFetch(
      `/api/v1/namespaces/${USERS_NAMESPACE}/services/${name}`,
      { method: "PUT", body: JSON.stringify(spec) },
    );
    if (!putRes.ok) {
      const err = await putRes.text();
      throw new Error(`Failed to update Service ${name}: ${err}`);
    }
    return;
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create Service ${name}: ${err}`);
  }
}

export async function deleteService(name: string): Promise<void> {
  const res = await k8sFetch(
    `/api/v1/namespaces/${USERS_NAMESPACE}/services/${name}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Failed to delete Service ${name}: ${err}`);
  }
}

// Ensures the shared ExternalName service exists in the users namespace,
// allowing ingresses to route /_/setup to the AI Gateway across namespaces.
export async function ensureSetupProxyService(): Promise<void> {
  const spec = {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: "ai-gateway-proxy",
      namespace: USERS_NAMESPACE,
    },
    spec: {
      type: "ExternalName",
      externalName: `${serverEnv.AI_GATEWAY_K8S_SERVICE}.lifeos-system.svc.cluster.local`,
    },
  };

  const res = await k8sFetch(
    `/api/v1/namespaces/${USERS_NAMESPACE}/services`,
    { method: "POST", body: JSON.stringify(spec) },
  );

  if (res.status === 409) {
    // Already exists — update it
    await k8sFetch(
      `/api/v1/namespaces/${USERS_NAMESPACE}/services/ai-gateway-proxy`,
      { method: "PUT", body: JSON.stringify(spec) },
    );
    return;
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create setup proxy service: ${err}`);
  }
}

export async function createIngress(
  name: string,
  subdomain: string,
  domain: string,
): Promise<void> {
  const host = `${subdomain}.${domain}`;

  const spec = {
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name,
      namespace: USERS_NAMESPACE,
      labels: { app: name, subdomain },
      annotations: {
        "kubernetes.io/ingress.class": "nginx",
        "nginx.ingress.kubernetes.io/proxy-read-timeout": "3600",
        "nginx.ingress.kubernetes.io/proxy-send-timeout": "3600",
        // Auth handled by OpenClaw gateway token — no nginx auth layer needed
        // Inject a script that restores the gateway token from localStorage into
        // the URL hash on every page load. OpenClaw reads the token from the hash
        // on startup but then strips it via history.replaceState, so without this
        // script a page refresh loses the token and shows "device identity required".
        "nginx.ingress.kubernetes.io/configuration-snippet": [
          `sub_filter_once on;`,
          `sub_filter '</head>' '<script>(function(){var t=localStorage.getItem("__lifeos_gw_token");if(t&&!location.hash.includes("token=")){location.hash="token="+encodeURIComponent(t)}})()</script></head>';`,
          `proxy_set_header Accept-Encoding "";`,
          // OpenClaw sets script-src 'self' which blocks inline scripts.
          // Override to allow our injected token-restore script.
          `proxy_hide_header Content-Security-Policy;`,
          `add_header Content-Security-Policy "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss:" always;`,
        ].join("\n"),
      },
    },
    spec: {
      rules: [
        {
          host,
          http: {
            paths: [
              {
                path: "/_/setup",
                pathType: "Exact" as const,
                backend: {
                  service: { name: "ai-gateway-proxy", port: { number: 80 } },
                },
              },
              {
                path: "/",
                pathType: "Prefix" as const,
                backend: {
                  service: { name, port: { number: 80 } },
                },
              },
            ],
          },
        },
      ],
    },
  };

  const res = await k8sFetch(
    `/apis/networking.k8s.io/v1/namespaces/${USERS_NAMESPACE}/ingresses`,
    { method: "POST", body: JSON.stringify(spec) },
  );

  if (res.status === 409) {
    // Ingress already exists — update it with PUT so existing deployments get the setup route
    const putRes = await k8sFetch(
      `/apis/networking.k8s.io/v1/namespaces/${USERS_NAMESPACE}/ingresses/${name}`,
      { method: "PUT", body: JSON.stringify(spec) },
    );
    if (!putRes.ok) {
      const err = await putRes.text();
      throw new Error(`Failed to update Ingress ${name}: ${err}`);
    }
    return;
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create Ingress ${name}: ${err}`);
  }
}

export async function deleteIngress(name: string): Promise<void> {
  const res = await k8sFetch(
    `/apis/networking.k8s.io/v1/namespaces/${USERS_NAMESPACE}/ingresses/${name}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Failed to delete Ingress ${name}: ${err}`);
  }
}

export async function labelPvc(
  name: string,
  labels: Record<string, string>,
): Promise<void> {
  const res = await k8sFetch(
    `/api/v1/namespaces/${USERS_NAMESPACE}/persistentvolumeclaims/${name}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/strategic-merge-patch+json" },
      body: JSON.stringify({ metadata: { labels } }),
    },
  );

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Failed to label PVC ${name}: ${err}`);
  }
}

export async function createFileApiIngress(
  name: string,
  subdomain: string,
  domain: string,
): Promise<void> {
  const host = `${subdomain}.${domain}`;
  const ingressName = `${name}-file-api`;

  const spec = {
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name: ingressName,
      namespace: USERS_NAMESPACE,
      labels: { app: name, subdomain },
      annotations: {
        "kubernetes.io/ingress.class": "nginx",
        "nginx.ingress.kubernetes.io/proxy-read-timeout": "3600",
        "nginx.ingress.kubernetes.io/proxy-send-timeout": "3600",
      },
    },
    spec: {
      rules: [
        {
          host,
          http: {
            paths: [
              {
                path: "/_/api",
                pathType: "Prefix" as const,
                backend: {
                  service: { name, port: { number: 3001 } },
                },
              },
            ],
          },
        },
      ],
    },
  };

  const res = await k8sFetch(
    `/apis/networking.k8s.io/v1/namespaces/${USERS_NAMESPACE}/ingresses`,
    { method: "POST", body: JSON.stringify(spec) },
  );

  if (res.status === 409) {
    const putRes = await k8sFetch(
      `/apis/networking.k8s.io/v1/namespaces/${USERS_NAMESPACE}/ingresses/${ingressName}`,
      { method: "PUT", body: JSON.stringify(spec) },
    );
    if (!putRes.ok) {
      const err = await putRes.text();
      throw new Error(`Failed to update file-api Ingress ${ingressName}: ${err}`);
    }
    return;
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create file-api Ingress ${ingressName}: ${err}`);
  }
}

export async function deleteFileApiIngress(name: string): Promise<void> {
  const ingressName = `${name}-file-api`;
  const res = await k8sFetch(
    `/apis/networking.k8s.io/v1/namespaces/${USERS_NAMESPACE}/ingresses/${ingressName}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Failed to delete file-api Ingress ${ingressName}: ${err}`);
  }
}

export async function readByokSecret(
  userId: string,
  provider: string,
): Promise<string | null> {
  const gcpProjectId = serverEnv.GCP_PROJECT_ID;
  if (!gcpProjectId) throw new Error("GCP_PROJECT_ID not configured");

  const token = await getGcpAccessToken();
  const secretId = `byok-${userId}-${provider}`;
  const baseUrl = `https://secretmanager.googleapis.com/v1/projects/${gcpProjectId}/secrets`;

  // Access the latest version
  const res = await fetch(`${baseUrl}/${secretId}/versions/latest:access`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    console.error(`[readByokSecret] Failed to read ${secretId}: ${res.status} ${await res.text().catch(() => "")}`);
    return null;
  }

  const data = (await res.json()) as { payload?: { data?: string } };
  if (!data.payload?.data) return null;
  const value = Buffer.from(data.payload.data, "base64").toString("utf-8");
  if (value === "DELETED") return null;
  return value;
}

export async function writeByokSecret(
  userId: string,
  provider: string,
  key: string,
): Promise<void> {
  const gcpProjectId = serverEnv.GCP_PROJECT_ID;
  if (!gcpProjectId) throw new Error("GCP_PROJECT_ID not configured");

  const token = await getGcpAccessToken();
  const secretId = `byok-${userId}-${provider}`;
  const baseUrl = `https://secretmanager.googleapis.com/v1/projects/${gcpProjectId}/secrets`;
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Create secret (ignore 409 = already exists)
  await fetch(`${baseUrl}?secretId=${secretId}`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ replication: { automatic: {} } }),
  }).catch(() => { });

  // Add version
  const res = await fetch(`${baseUrl}/${secretId}:addVersion`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      payload: { data: Buffer.from(key).toString("base64") },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to write ${provider} BYOK secret: ${res.status} ${text}`);
  }
}
