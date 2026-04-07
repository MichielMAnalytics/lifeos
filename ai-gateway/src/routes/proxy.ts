import { Hono } from "hono";
import { redis, userKey, rateLimitKey, RATE_LIMIT_SCRIPT } from "../services/redis.js";
import { checkBalance, deductBalance, markDirty, InsufficientBalanceError } from "../services/balance.js";
import { resolveKey, getAccessToken } from "../services/keys.js";
import { getValidAccessToken, parseCodexTokens } from "../services/openai-codex-refresh.js";
import { calculateCostCents, MINIMUM_RESERVE_CENTS } from "../services/pricing.js";
import { parseUsage } from "../services/usage.js";
import { gatewayEnv } from "../env.js";
import type { AppEnv } from "../types.js";

const proxy = new Hono<AppEnv>();

/**
 * Gemini 3 models require a `thought_signature` on every functionCall part.
 * OpenClaw (and most OpenAI-compatible clients) don't preserve the
 * `extra_content.google.thought_signature` field across turns, which causes
 * Gemini to reject the request with HTTP 400.
 *
 * This function walks the messages array and injects the Gemini-sanctioned
 * skip-validator sentinel on any assistant tool_calls that are missing it.
 * See: https://ai.google.dev/gemini-api/docs/thought-signatures
 */
function patchGeminiThoughtSignatures(body: Record<string, unknown>): void {
  if (!Array.isArray(body.messages)) return;
  for (const msg of body.messages as Record<string, unknown>[]) {
    if (msg.role !== "assistant" || !Array.isArray(msg.tool_calls)) continue;
    for (const tc of msg.tool_calls as Record<string, unknown>[]) {
      // If the tool_call already has a thought_signature via extra_content, skip it
      const extra = tc.extra_content as Record<string, unknown> | undefined;
      const google = extra?.google as Record<string, unknown> | undefined;
      if (google?.thought_signature) continue;
      // Inject the skip-validator sentinel
      if (!tc.extra_content || typeof tc.extra_content !== "object") {
        tc.extra_content = { google: { thought_signature: "skip_thought_signature_validator" } };
      } else {
        const ec = tc.extra_content as Record<string, unknown>;
        if (!ec.google || typeof ec.google !== "object") {
          ec.google = { thought_signature: "skip_thought_signature_validator" };
        } else {
          (ec.google as Record<string, unknown>).thought_signature = "skip_thought_signature_validator";
        }
      }
    }
  }
}

const UPSTREAM_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
};

// Claude Code canonical tool names — OAT tokens require these exact casings
// Source: pi-ai SDK (https://github.com/badlogic/cchistory)
const CLAUDE_CODE_TOOLS = [
  "Read", "Write", "Edit", "Bash", "Grep", "Glob",
  "AskUserQuestion", "EnterPlanMode", "ExitPlanMode", "KillShell",
  "NotebookEdit", "Skill", "Task", "TaskOutput", "TodoWrite",
  "WebFetch", "WebSearch",
];
const CC_TOOL_LOOKUP = new Map(CLAUDE_CODE_TOOLS.map((t) => [t.toLowerCase(), t]));
const toClaudeCodeName = (name: string): string => CC_TOOL_LOOKUP.get(name.toLowerCase()) ?? name;

const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

proxy.all("/:provider/*", async (c) => {
  const provider = c.req.param("provider");
  const podSecret = c.req.header("X-Pod-Secret");

  if (!podSecret) {
    return c.json({ error: "Missing X-Pod-Secret header" }, 401);
  }

  if (!UPSTREAM_URLS[provider] && provider !== "kimi" && provider !== "gemini" && provider !== "minimax" && provider !== "qwen") {
    return c.json({ error: `Unknown provider: ${provider}` }, 400);
  }

  // Source IP validation
  const requestIp = c.get("sourceIp") as string;

  if (!requestIp || requestIp === "unknown") {
    console.warn(`[proxy] Unknown source IP for pod ${podSecret.slice(0, 8)}...`);
    return c.json({ error: "Unable to determine source IP" }, 403);
  }

  const registeredIp = await redis.hget(userKey(podSecret), "sourceIp");

  if (!registeredIp || registeredIp === "unknown") {
    console.warn(`[proxy] No registered IP for pod ${podSecret.slice(0, 8)}...`);
    return c.json({ error: "Pod not registered with IP" }, 403);
  }

  if (requestIp !== registeredIp) {
    console.warn(
      `[proxy] IP validation failed for pod ${podSecret.slice(0, 8)}...: request=${requestIp} registered=${registeredIp}`
    );
    return c.json({ error: "Source IP mismatch" }, 403);
  }

  // Rate limit check
  const rateLimitResult = await redis.eval(
    RATE_LIMIT_SCRIPT,
    1,
    rateLimitKey(podSecret),
    RATE_LIMIT_MAX.toString(),
    RATE_LIMIT_WINDOW_SECONDS.toString()
  ) as number;

  if (rateLimitResult === 0) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  // Resolve API key
  let apiKey: string;
  let isBYOK: boolean;
  let resolvedUserId: string | undefined;
  try {
    if (provider === "kimi" || provider === "gemini" || provider === "minimax" || provider === "qwen") {
      // Vertex AI providers: BYOK uses direct API key, platform uses GCP SA token.
      // We must check apiKeySource before calling resolveKey because platform users
      // don't have env-var keys for these providers (they use Vertex AI SA tokens).
      // Qwen: no direct API for BYOK, always use platform (Vertex AI SA) keys
      const userInfo = await redis.hgetall(userKey(podSecret));
      isBYOK = provider !== "qwen" && (userInfo?.apiKeySource === "byok");
      if (isBYOK) {
        const providerKeyMap: Record<string, string> = { kimi: "moonshot", gemini: "google", minimax: "minimax" };
        const resolved = await resolveKey(podSecret, providerKeyMap[provider] ?? provider);
        apiKey = resolved.key;
      } else {
        apiKey = await getAccessToken();
      }
    } else {
      const resolved = await resolveKey(podSecret, provider);
      apiKey = resolved.key;
      isBYOK = resolved.isBYOK;
      resolvedUserId = resolved.userId;
    }
  } catch (err) {
    console.error(`[proxy] Key resolution error for ${provider}:`, err);
    return c.json({ error: "Failed to resolve API key" }, 500);
  }

  // Pre-flight balance check
  if (!isBYOK) {
    try {
      await checkBalance(podSecret, MINIMUM_RESERVE_CENTS);
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        return c.json({ error: "Credit balance exhausted. Your deployment remains active. Please top up credits.", code: "CREDITS_EXHAUSTED" }, 402);
      }
      throw err;
    }
  }

  // Detect OpenAI Codex OAuth (stored as JSON with access_token + refresh_token)
  let isOpenAICodexOAuth = false;
  let codexAccessToken: string | undefined;
  if (provider === "openai" && isBYOK && apiKey.startsWith("{")) {
    const parsed = parseCodexTokens(apiKey);
    if (parsed) {
      isOpenAICodexOAuth = true;
      try {
        codexAccessToken = await getValidAccessToken(resolvedUserId ?? "unknown", apiKey);
      } catch (err) {
        console.error(`[proxy] Codex OAuth token refresh failed:`, err);
        return c.json({ error: "ChatGPT OAuth token expired. Please re-authenticate in LifeOS settings." }, 401);
      }
    }
  }

  // Parse request body (need it to extract model and potentially modify for OpenAI streaming)
  let requestBodyStr: string | undefined;
  let requestBodyRaw: ArrayBuffer | undefined;
  let requestBody: Record<string, unknown> | undefined;
  let modelId: string | undefined;
  const contentType = c.req.header("Content-Type") ?? "";
  const isMultipart = contentType.includes("multipart/");

  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    const rawBody = await c.req.arrayBuffer();
    if (rawBody.byteLength > MAX_BODY_SIZE) {
      return c.json({ error: "Request body too large" }, 413);
    }

    if (isMultipart) {
      // Binary multipart data (e.g. audio/transcriptions) — keep raw to avoid corruption
      requestBodyRaw = rawBody;
    } else {
      requestBodyStr = new TextDecoder().decode(rawBody);
      try {
        requestBody = JSON.parse(requestBodyStr);
      } catch {
        // Not JSON, pass through as-is
      }
    }
  }

  // Extract model ID
  if (requestBody) {
    modelId = requestBody.model as string | undefined;
  }

  // OpenAI-compatible streaming: inject stream_options.include_usage for platform keys
  if ((provider === "openai" || provider === "kimi" || provider === "gemini" || provider === "minimax" || provider === "qwen") && !isBYOK && requestBody && requestBody.stream === true) {
    if (!requestBody.stream_options || typeof requestBody.stream_options !== "object") {
      requestBody.stream_options = { include_usage: true };
    } else {
      (requestBody.stream_options as Record<string, unknown>).include_usage = true;
    }
    requestBodyStr = JSON.stringify(requestBody);
  }

  // Anthropic OAT: transform request body to match Claude Code conventions
  // pi-ai SDK does this when it detects an OAT token — we replicate it in the gateway
  const isAnthropicOAuth = provider === "anthropic" && apiKey.startsWith("sk-ant-oat");
  if (isAnthropicOAuth && requestBody) {
    // 1. Prepend Claude Code identity system prompt
    const ccSystemBlock = { type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." };
    const existing = requestBody.system;
    if (Array.isArray(existing)) {
      requestBody.system = [ccSystemBlock, ...existing];
    } else if (typeof existing === "string") {
      requestBody.system = [ccSystemBlock, { type: "text", text: existing }];
    } else {
      requestBody.system = [ccSystemBlock];
    }

    // 2. Remap tool names to Claude Code canonical casing
    if (Array.isArray(requestBody.tools)) {
      for (const tool of requestBody.tools as Record<string, unknown>[]) {
        if (typeof tool.name === "string") {
          tool.name = toClaudeCodeName(tool.name);
        }
      }
    }

    // 3. Remap tool_use names in assistant messages
    if (Array.isArray(requestBody.messages)) {
      for (const msg of requestBody.messages as Record<string, unknown>[]) {
        if (msg.role === "assistant" && Array.isArray(msg.content)) {
          for (const block of msg.content as Record<string, unknown>[]) {
            if (block.type === "tool_use" && typeof block.name === "string") {
              block.name = toClaudeCodeName(block.name);
            }
          }
        }
      }
    }

    requestBodyStr = JSON.stringify(requestBody);
  }

  // Build upstream URL
  const subPath = c.req.path.replace(`/v1/${provider}`, "");
  const queryString = new URL(c.req.url).search;
  let fullUpstreamUrl: string;
  if (provider === "kimi" && isBYOK) {
    // BYOK Kimi: Moonshot OpenAI-compatible endpoint
    fullUpstreamUrl = `https://api.moonshot.ai/v1${subPath}${queryString}`;
    // Remap Vertex AI MaaS model ID to Moonshot model ID
    if (requestBody && typeof requestBody.model === "string") {
      const KIMI_MODEL_MAP: Record<string, string> = {
        "moonshotai/kimi-k2-thinking-maas": "kimi-k2-thinking",
        "moonshotai/kimi-k2.5": "kimi-k2.5",
        "moonshotai/kimi-k2-thinking-turbo": "kimi-k2-thinking-turbo",
        "moonshotai/kimi-k2-turbo-preview": "kimi-k2-turbo-preview",
      };
      const mapped = KIMI_MODEL_MAP[requestBody.model as string];
      if (mapped) {
        requestBody.model = mapped;
        modelId = mapped;
      }
      // Strip fields unsupported by Moonshot's OpenAI-compatible endpoint
      delete requestBody.store;
      requestBodyStr = JSON.stringify(requestBody);
    }
  } else if (provider === "gemini" && isBYOK) {
    // BYOK Gemini: Google AI Studio OpenAI-compatible endpoint
    fullUpstreamUrl = `https://generativelanguage.googleapis.com/v1beta/openai${subPath}${queryString}`;
    if (requestBody) {
      // Strip google/ prefix from model ID — Google AI Studio uses unprefixed IDs
      if (typeof requestBody.model === "string" && requestBody.model.startsWith("google/")) {
        requestBody.model = (requestBody.model as string).replace("google/", "");
        modelId = requestBody.model as string;
      }
      // Strip fields and remap roles unsupported by Gemini's OpenAI-compatible endpoint
      delete requestBody.store;
      if (Array.isArray(requestBody.messages)) {
        for (const msg of requestBody.messages as Record<string, unknown>[]) {
          if (msg.role === "developer") {
            msg.role = "system";
          }
        }
      }
      // Gemini 3 requires thought_signature on function call parts; OpenClaw doesn't
      // preserve them, so inject the skip-validator sentinel to avoid 400 errors.
      patchGeminiThoughtSignatures(requestBody);
      requestBodyStr = JSON.stringify(requestBody);
    }
  } else if (provider === "minimax" && isBYOK) {
    // BYOK MiniMax: OpenAI-compatible endpoint
    fullUpstreamUrl = `https://api.minimax.io/v1${subPath}${queryString}`;
    // Strip fields and remap roles unsupported by MiniMax's OpenAI-compatible endpoint
    if (requestBody) {
      delete requestBody.store;
      if (Array.isArray(requestBody.messages)) {
        for (const msg of requestBody.messages as Record<string, unknown>[]) {
          if (msg.role === "developer") {
            msg.role = "system";
          }
        }
      }
      requestBodyStr = JSON.stringify(requestBody);
    }
  } else if (provider === "kimi" || provider === "gemini" || provider === "minimax" || provider === "qwen") {
    // Vertex AI MaaS OpenAI-compatible endpoint (platform keys)
    // Qwen models are only reliably available in us-south1 (global endpoint is frequently overloaded)
    const loc = provider === "qwen" ? "us-south1" : gatewayEnv.VERTEX_AI_LOCATION;
    const host = loc === "global" ? "aiplatform.googleapis.com" : `${loc}-aiplatform.googleapis.com`;
    const vertexBase = `https://${host}/v1/projects/${gatewayEnv.GCP_PROJECT_ID}/locations/${loc}/endpoints/openapi`;
    fullUpstreamUrl = `${vertexBase}${subPath}${queryString}`;
    // Strip fields and remap roles unsupported by Vertex AI's OpenAI-compatible endpoint
    if (requestBody) {
      delete requestBody.store;
      // Vertex AI doesn't support the "developer" role — remap to "system"
      if (Array.isArray(requestBody.messages)) {
        for (const msg of requestBody.messages as Record<string, unknown>[]) {
          if (msg.role === "developer") {
            msg.role = "system";
          }
        }
      }
      // MiniMax: Vertex MaaS only offers minimax-m2-maas; remap our model IDs
      if (provider === "minimax" && typeof requestBody.model === "string") {
        requestBody.model = "minimaxai/minimax-m2-maas";
        modelId = "minimaxai/minimax-m2-maas";
      }
      // Gemini 3 requires thought_signature on function call parts via Vertex AI too
      if (provider === "gemini") {
        patchGeminiThoughtSignatures(requestBody);
      }
      requestBodyStr = JSON.stringify(requestBody);
    }
  } else if (isOpenAICodexOAuth) {
    // Codex OAuth: route to chatgpt.com/backend-api/codex (Responses API)
    // subPath is e.g. "/v1/responses" or "/v1/chat/completions"
    const codexBase = "https://chatgpt.com/backend-api/codex";
    fullUpstreamUrl = `${codexBase}${subPath}${queryString}`;
    if (requestBody) {
      // Codex requires store=false
      requestBody.store = false;
      requestBodyStr = JSON.stringify(requestBody);
    }
  } else {
    const upstreamBase = UPSTREAM_URLS[provider];
    fullUpstreamUrl = `${upstreamBase}${subPath}${queryString}`;
  }

  // Build upstream headers
  const upstreamHeaders = new Headers();
  // Preserve original Content-Type (critical for multipart boundary tokens)
  if (isMultipart) {
    upstreamHeaders.set("Content-Type", contentType);
  } else {
    upstreamHeaders.set("Content-Type", c.req.header("Content-Type") ?? "application/json");
  }

  if (provider === "anthropic") {
    if (isAnthropicOAuth) {
      // OAT (setup token): mimic Claude Code's OAuth flow exactly
      upstreamHeaders.set("Authorization", `Bearer ${apiKey}`);
      upstreamHeaders.set("anthropic-beta", "claude-code-20250219,oauth-2025-04-20,fine-grained-tool-streaming-2025-05-14");
      upstreamHeaders.set("anthropic-dangerous-direct-browser-access", "true");
      upstreamHeaders.set("user-agent", "claude-cli/2.1.2 (external, cli)");
      upstreamHeaders.set("x-app", "cli");
      console.log(`[proxy] OAT auth path for anthropic, key prefix: ${apiKey.slice(0, 14)}...`);
    } else {
      // Regular API key
      upstreamHeaders.set("x-api-key", apiKey);
    }
    upstreamHeaders.set("anthropic-version", c.req.header("anthropic-version") ?? "2023-06-01");
  } else if (isOpenAICodexOAuth && codexAccessToken) {
    upstreamHeaders.set("Authorization", `Bearer ${codexAccessToken}`);
    console.log(`[proxy] Codex OAuth path for openai, userId: ${resolvedUserId?.slice(0, 8)}...`);
  } else {
    upstreamHeaders.set("Authorization", `Bearer ${apiKey}`);
  }

  // Proxy the request
  try {
    const upstreamResponse = await fetch(fullUpstreamUrl, {
      method: c.req.method,
      headers: upstreamHeaders,
      body: isMultipart ? requestBodyRaw : requestBodyStr,
    });

    // Forward response headers
    const responseHeaders = new Headers();
    upstreamResponse.headers.forEach((value, key) => {
      if (!["transfer-encoding", "content-encoding", "connection"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    // BYOK: return response directly (no usage parsing, no per-request deduction)
    if (isBYOK) {
      if (upstreamResponse.status >= 400) {
        const errBody = await upstreamResponse.text();
        console.error(`[proxy] BYOK upstream error for ${provider}: ${upstreamResponse.status} ${errBody.slice(0, 500)}`);
        return c.json({ error: errBody }, upstreamResponse.status as 400);
      }
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // Platform keys: tee stream and parse usage in background
    if (upstreamResponse.status >= 400 || !upstreamResponse.body) {
      const errBody = await upstreamResponse.text();
      console.error(`[proxy] Platform upstream error for ${provider}: ${upstreamResponse.status} ${errBody.slice(0, 500)}`);
      return new Response(errBody, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // Multipart requests (e.g. audio transcription) don't return token usage.
    // Deduct a flat cost and pass response through without tee/usage parsing.
    if (isMultipart) {
      const AUDIO_TRANSCRIPTION_COST_CENTS = 1.0; // ~$0.01 per request
      try {
        await deductBalance(podSecret, AUDIO_TRANSCRIPTION_COST_CENTS);
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          console.warn(`[proxy] Post-deduct insufficient balance for audio transcription pod ${podSecret.slice(0, 8)}...`);
        } else {
          throw err;
        }
      }
      await markDirty(podSecret);
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    const isStreaming = upstreamResponse.headers.get("content-type")?.includes("text/event-stream") ?? false;
    const respContentType = upstreamResponse.headers.get("content-type") ?? "";

    // Vertex AI sometimes returns 200 with plain text errors (e.g. "unconditional drop overload")
    // in both JSON and SSE modes. Detect and convert to 503 so clients get a proper error.
    if (!isStreaming && !respContentType.includes("application/json") && upstreamResponse.status === 200) {
      const body = await upstreamResponse.text();
      console.warn(`[proxy] Unexpected non-JSON 200 from ${provider}: ${body.slice(0, 200)}`);
      return c.json({ error: "Model temporarily unavailable, please retry", detail: body.slice(0, 200) }, 503);
    }
    if (isStreaming) {
      // Peek at the first chunk to detect broken SSE streams (e.g. "data: unconditional drop overload")
      const reader = upstreamResponse.body.getReader();
      const firstRead = await reader.read();
      if (firstRead.done) {
        reader.releaseLock();
        return c.json({ error: "Empty response from model" }, 502);
      }
      const firstChunk = new TextDecoder().decode(firstRead.value);
      // Valid SSE data chunks contain JSON after "data: "; if parsing the first data line fails, it's broken
      const firstDataLine = firstChunk.split("\n").find(l => l.startsWith("data: ") && l.slice(6).trim() !== "[DONE]");
      if (firstDataLine) {
        try {
          JSON.parse(firstDataLine.slice(6));
        } catch {
          // Not valid JSON SSE — consume and return error
          reader.releaseLock();
          console.warn(`[proxy] Broken SSE from ${provider}: ${firstChunk.slice(0, 200)}`);
          return c.json({ error: "Model temporarily unavailable, please retry", detail: firstChunk.slice(0, 200) }, 503);
        }
      }
      // Re-assemble stream: prepend the first chunk back
      const passthrough = new ReadableStream({
        async start(controller) {
          controller.enqueue(firstRead.value);
          while (true) {
            const { done, value } = await reader.read();
            if (done) { controller.close(); break; }
            controller.enqueue(value);
          }
        },
      });
      // Tee the re-assembled stream
      const [clientStream, accumulatorStream] = passthrough.tee();

      // Background: accumulate response and deduct based on usage
      (async () => {
        try {
          const accReader = accumulatorStream.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await accReader.read();
            if (done) break;
            chunks.push(value);
          }

          const accumulated = new TextDecoder().decode(
            chunks.reduce((acc, chunk) => {
              const combined = new Uint8Array(acc.length + chunk.length);
              combined.set(acc);
              combined.set(chunk, acc.length);
              return combined;
            }, new Uint8Array(0))
          );

          const usage = parseUsage(provider, accumulated, true);
          if (modelId && (usage.inputTokens > 0 || usage.outputTokens > 0 || usage.cacheWriteTokens > 0 || usage.cacheReadTokens > 0)) {
            const cost = calculateCostCents(modelId, usage.inputTokens, usage.outputTokens, usage.cacheWriteTokens, usage.cacheReadTokens);
            if (cost > 0) {
              try {
                await deductBalance(podSecret, cost);
              } catch (err) {
                if (err instanceof InsufficientBalanceError) {
                  console.warn(`[proxy] Post-deduct insufficient balance for pod ${podSecret.slice(0, 8)}... (cost: ${cost.toFixed(4)}c)`);
                } else {
                  throw err;
                }
              }
              await markDirty(podSecret);
            }
          }
        } catch (err) {
          console.error("[proxy] Background usage parsing error:", err);
        }
      })();

      return new Response(clientStream, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // Tee the response body: one for client, one for usage parsing
    const [clientStream, accumulatorStream] = upstreamResponse.body.tee();

    // Background: accumulate response and deduct based on usage
    (async () => {
      try {
        const reader = accumulatorStream.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const accumulated = new TextDecoder().decode(
          chunks.reduce((acc, chunk) => {
            const combined = new Uint8Array(acc.length + chunk.length);
            combined.set(acc);
            combined.set(chunk, acc.length);
            return combined;
          }, new Uint8Array(0))
        );

        const usage = parseUsage(provider, accumulated, isStreaming);
        if (modelId && (usage.inputTokens > 0 || usage.outputTokens > 0 || usage.cacheWriteTokens > 0 || usage.cacheReadTokens > 0)) {
          const cost = calculateCostCents(modelId, usage.inputTokens, usage.outputTokens, usage.cacheWriteTokens, usage.cacheReadTokens);
          if (cost > 0) {
            try {
              await deductBalance(podSecret, cost);
            } catch (err) {
              if (err instanceof InsufficientBalanceError) {
                console.warn(`[proxy] Post-deduct insufficient balance for pod ${podSecret.slice(0, 8)}... (cost: ${cost.toFixed(4)}c)`);
              } else {
                throw err;
              }
            }
            await markDirty(podSecret);
          }
        }
      } catch (err) {
        console.error("[proxy] Background usage parsing error:", err);
      }
    })();

    return new Response(clientStream, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[proxy] Upstream request failed for ${provider}:`, err);
    return c.json({ error: "Upstream request failed" }, 502);
  }
});

export { proxy };
