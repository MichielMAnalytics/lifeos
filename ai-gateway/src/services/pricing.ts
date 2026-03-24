// Model pricing in dollars per 1M tokens
export const MODEL_PRICING: Record<string, {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheWritePerMillion: number;
  cacheReadPerMillion: number;
}> = {
  // Anthropic: cache write = 1.25x input, cache read = 0.1x input
  "claude-opus-4-6": { inputPerMillion: 5.0, outputPerMillion: 25.0, cacheWritePerMillion: 6.25, cacheReadPerMillion: 0.50 },
  "claude-sonnet-4-6": { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheWritePerMillion: 3.75, cacheReadPerMillion: 0.30 },
  "claude-haiku-4-5-20251001": { inputPerMillion: 1.0, outputPerMillion: 5.0, cacheWritePerMillion: 1.25, cacheReadPerMillion: 0.10 },
  // OpenAI: no cache write cost, cache read = 0.1x input (90% discount)
  "gpt-5.2": { inputPerMillion: 1.75, outputPerMillion: 14.0, cacheWritePerMillion: 0, cacheReadPerMillion: 0.175 },
  "gpt-5-mini-2025-08-07": { inputPerMillion: 0.25, outputPerMillion: 2.0, cacheWritePerMillion: 0, cacheReadPerMillion: 0.025 },
  "gpt-5-nano-2025-08-07": { inputPerMillion: 0.05, outputPerMillion: 0.4, cacheWritePerMillion: 0, cacheReadPerMillion: 0.005 },
  "gpt-5.4-2026-03-05": { inputPerMillion: 2.50, outputPerMillion: 15.0, cacheWritePerMillion: 0, cacheReadPerMillion: 0.25 },
  // Kimi (Vertex AI MaaS): no cache support
  "moonshotai/kimi-k2-thinking-maas": { inputPerMillion: 0.60, outputPerMillion: 2.50, cacheWritePerMillion: 0, cacheReadPerMillion: 0 },
  // Gemini (Vertex AI): no cache support via gateway
  "google/gemini-3.1-pro-preview": { inputPerMillion: 2.0, outputPerMillion: 12.0, cacheWritePerMillion: 0, cacheReadPerMillion: 0 },
  "google/gemini-3-flash-preview": { inputPerMillion: 0.50, outputPerMillion: 3.0, cacheWritePerMillion: 0, cacheReadPerMillion: 0 },
  // MiniMax (Vertex AI MaaS): only minimax-m2-maas available as managed service
  "minimaxai/minimax-m2-maas": { inputPerMillion: 0.27, outputPerMillion: 0.95, cacheWritePerMillion: 0, cacheReadPerMillion: 0 },
  // MiniMax (BYOK / direct API): no cache support via gateway
  "MiniMax-M2.1": { inputPerMillion: 0.27, outputPerMillion: 0.95, cacheWritePerMillion: 0, cacheReadPerMillion: 0 },
  "MiniMax-M2.5": { inputPerMillion: 0.30, outputPerMillion: 2.40, cacheWritePerMillion: 0, cacheReadPerMillion: 0 },
  // Qwen (Vertex AI MaaS): no cache support
  "qwen/qwen3-coder-480b-a35b-instruct-maas": { inputPerMillion: 1.00, outputPerMillion: 4.00, cacheWritePerMillion: 0, cacheReadPerMillion: 0 },
  "qwen/qwen3-235b-a22b-instruct-2507-maas": { inputPerMillion: 0.25, outputPerMillion: 1.00, cacheWritePerMillion: 0, cacheReadPerMillion: 0 },
};

/** Returns cost in fractional cents */
export function calculateCostCents(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cacheWriteTokens: number,
  cacheReadTokens: number,
): number {
  const pricing = MODEL_PRICING[modelId];
  if (!pricing) {
    console.warn(`[pricing] Unknown model "${modelId}", charging 0`);
    return 0;
  }
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion * 100; // dollars -> cents
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion * 100;
  const cacheWriteCost = (cacheWriteTokens / 1_000_000) * pricing.cacheWritePerMillion * 100;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.cacheReadPerMillion * 100;
  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}

/** Minimum balance (cents) for platform-key pre-flight check */
export const MINIMUM_RESERVE_CENTS = 50;
