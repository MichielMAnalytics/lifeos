export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
}

const ZERO_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0 };

export function parseAnthropicUsage(body: string, isStreaming: boolean): TokenUsage {
  try {
    if (!isStreaming) {
      const json = JSON.parse(body);
      return {
        inputTokens: json.usage?.input_tokens ?? 0,
        outputTokens: json.usage?.output_tokens ?? 0,
        cacheWriteTokens: json.usage?.cache_creation_input_tokens ?? 0,
        cacheReadTokens: json.usage?.cache_read_input_tokens ?? 0,
      };
    }

    // Streaming: scan SSE events for message_start (input + cache) and message_delta (output)
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheWriteTokens = 0;
    let cacheReadTokens = 0;

    for (const line of body.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const event = JSON.parse(data);
        if (event.type === "message_start" && event.message?.usage) {
          inputTokens = event.message.usage.input_tokens ?? 0;
          cacheWriteTokens = event.message.usage.cache_creation_input_tokens ?? 0;
          cacheReadTokens = event.message.usage.cache_read_input_tokens ?? 0;
        } else if (event.type === "message_delta" && event.usage) {
          outputTokens = event.usage.output_tokens ?? 0;
        }
      } catch {
        // skip malformed SSE lines
      }
    }

    return { inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens };
  } catch (err) {
    console.warn("[usage] Failed to parse Anthropic usage:", err);
    return ZERO_USAGE;
  }
}

export function parseOpenAIUsage(body: string, isStreaming: boolean): TokenUsage {
  try {
    if (!isStreaming) {
      const json = JSON.parse(body);
      const promptTokens = json.usage?.prompt_tokens ?? 0;
      const cachedTokens = json.usage?.prompt_tokens_details?.cached_tokens ?? 0;
      return {
        inputTokens: promptTokens - cachedTokens,
        outputTokens: json.usage?.completion_tokens ?? 0,
        cacheWriteTokens: 0,
        cacheReadTokens: cachedTokens,
      };
    }

    // Streaming: final chunk contains usage object (requires stream_options.include_usage)
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;

    for (const line of body.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") break;
      try {
        const event = JSON.parse(data);
        if (event.usage) {
          const promptTokens = event.usage.prompt_tokens ?? 0;
          const cachedTokens = event.usage.prompt_tokens_details?.cached_tokens ?? 0;
          inputTokens = promptTokens - cachedTokens;
          outputTokens = event.usage.completion_tokens ?? 0;
          cacheReadTokens = cachedTokens;
        }
      } catch {
        // skip malformed SSE lines
      }
    }

    return { inputTokens, outputTokens, cacheWriteTokens: 0, cacheReadTokens };
  } catch (err) {
    console.warn("[usage] Failed to parse OpenAI usage:", err);
    return ZERO_USAGE;
  }
}

export function parseUsage(provider: string, body: string, isStreaming: boolean): TokenUsage {
  switch (provider) {
    case "anthropic":
      return parseAnthropicUsage(body, isStreaming);
    case "openai":
    case "kimi":
    case "gemini":
    case "minimax":
    case "qwen":
      return parseOpenAIUsage(body, isStreaming);
    default:
      console.warn(`[usage] Unknown provider "${provider}"`);
      return ZERO_USAGE;
  }
}
