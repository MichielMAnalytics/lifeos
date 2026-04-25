import { describe, expect, it } from "bun:test";
import {
  applyResponsesStorePolicy,
  prepareCodexRequestBody,
  stripStoredItemReferences,
} from "./proxy.js";

describe("stripStoredItemReferences", () => {
  it("is a no-op when input is missing", () => {
    const body: Record<string, unknown> = { model: "gpt-5.4" };
    stripStoredItemReferences(body);
    expect(body).toEqual({ model: "gpt-5.4" });
  });

  it("is a no-op when input is a string (turn 1, pre-normalisation)", () => {
    const body: Record<string, unknown> = { input: "hello" };
    stripStoredItemReferences(body);
    expect(body.input).toBe("hello");
  });

  it("leaves input untouched when there are no reasoning or function_call items", () => {
    const body: Record<string, unknown> = {
      input: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hey" },
        { role: "user", content: "how are you?" },
      ],
    };
    stripStoredItemReferences(body);
    expect((body.input as unknown[]).length).toBe(3);
  });

  it("removes a single reasoning item from input", () => {
    const body: Record<string, unknown> = {
      input: [
        { role: "user", content: "hi" },
        { type: "reasoning", id: "rs_abc", summary: [{ type: "summary_text", text: "thinking..." }] },
        { role: "assistant", content: "hey" },
        { role: "user", content: "test" },
      ],
    };
    stripStoredItemReferences(body);
    const items = body.input as Record<string, unknown>[];
    expect(items.length).toBe(3);
    expect(items.every((i) => i.type !== "reasoning")).toBe(true);
    expect(items.find((i) => (i as { id?: string }).id === "rs_abc")).toBeUndefined();
  });

  it("removes multiple reasoning items across a long chain", () => {
    const body: Record<string, unknown> = {
      input: [
        { role: "user", content: "msg1" },
        { type: "reasoning", id: "rs_1" },
        { role: "assistant", content: "reply1" },
        { role: "user", content: "msg2" },
        { type: "reasoning", id: "rs_2" },
        { role: "assistant", content: "reply2" },
        { role: "user", content: "msg3" },
        { type: "reasoning", id: "rs_3" },
      ],
    };
    stripStoredItemReferences(body);
    const items = body.input as Record<string, unknown>[];
    expect(items.length).toBe(5);
    expect(items.some((i) => i.type === "reasoning")).toBe(false);
  });

  it("clears `id` on function_call items where id starts with fc_ but keeps other fields", () => {
    const body: Record<string, unknown> = {
      input: [
        { role: "user", content: "use the tool" },
        { type: "function_call", id: "fc_1", call_id: "call_abc", name: "lookup", arguments: "{}" },
        { type: "function_call_output", call_id: "call_abc", output: "ok" },
        { role: "assistant", content: "done" },
      ],
    };
    stripStoredItemReferences(body);
    const items = body.input as Record<string, unknown>[];
    expect(items.length).toBe(4);
    const fcItem = items.find((i) => i.type === "function_call") as Record<string, unknown>;
    expect(fcItem).toBeDefined();
    expect("id" in fcItem).toBe(false);
    expect(fcItem.call_id).toBe("call_abc");
    expect(fcItem.name).toBe("lookup");
    expect(fcItem.arguments).toBe("{}");
  });

  it("does not clear function_call `id` if it does not start with fc_", () => {
    const body: Record<string, unknown> = {
      input: [
        { type: "function_call", id: "custom_id", call_id: "call_abc", name: "lookup", arguments: "{}" },
      ],
    };
    stripStoredItemReferences(body);
    const items = body.input as Record<string, unknown>[];
    expect(items[0].id).toBe("custom_id");
  });

  it("does not modify function_call_output items (only function_call)", () => {
    const body: Record<string, unknown> = {
      input: [
        { type: "function_call_output", id: "fco_1", call_id: "call_abc", output: "ok" },
      ],
    };
    stripStoredItemReferences(body);
    const items = body.input as Record<string, unknown>[];
    expect(items[0].id).toBe("fco_1");
    expect(items[0].call_id).toBe("call_abc");
  });

  it("handles a realistic mid-chain payload (rs_* + fc_* + messages)", () => {
    const body: Record<string, unknown> = {
      input: [
        { role: "user", content: "what's the weather?" },
        { type: "reasoning", id: "rs_1", summary: [] },
        { type: "function_call", id: "fc_1", call_id: "c1", name: "weather", arguments: "{}" },
        { type: "function_call_output", call_id: "c1", output: "sunny" },
        { type: "reasoning", id: "rs_2", summary: [] },
        { role: "assistant", content: "sunny" },
        { role: "user", content: "thanks" },
      ],
    };
    stripStoredItemReferences(body);
    const items = body.input as Record<string, unknown>[];
    // rs_1 + rs_2 dropped → 5 items remain
    expect(items.length).toBe(5);
    expect(items.some((i) => i.type === "reasoning")).toBe(false);
    // function_call had fc_1 cleared
    const fc = items.find((i) => i.type === "function_call") as Record<string, unknown>;
    expect("id" in fc).toBe(false);
    expect(fc.call_id).toBe("c1");
    // function_call_output untouched
    const fco = items.find((i) => i.type === "function_call_output") as Record<string, unknown>;
    expect(fco.call_id).toBe("c1");
    expect(fco.output).toBe("sunny");
  });

  it("currently preserves `type: 'message'` items with msg_* ids (documented behavior)", () => {
    // Pi-ai may emit assistant `message` items with `id: 'msg_*'`. We do NOT
    // strip them today: there's no evidence Codex's store:false endpoint does
    // server-side lookup on msg_* the way it does for rs_*/fc_*. If a 404
    // surfaces with "Item with id 'msg_...' not found", extend
    // stripStoredItemReferences to clear those too.
    const body: Record<string, unknown> = {
      input: [
        { type: "message", id: "msg_abc", role: "assistant", content: [{ type: "output_text", text: "hi" }] },
        { role: "user", content: "ok" },
      ],
    };
    stripStoredItemReferences(body);
    const items = body.input as Record<string, unknown>[];
    expect(items.length).toBe(2);
    expect(items[0].id).toBe("msg_abc");
    expect(items[0].type).toBe("message");
  });

  it("handles an empty input array", () => {
    const body: Record<string, unknown> = { input: [] };
    stripStoredItemReferences(body);
    expect(body.input).toEqual([]);
  });

  it("does not mutate other fields on the body", () => {
    const body: Record<string, unknown> = {
      model: "gpt-5.4",
      store: false,
      stream: true,
      instructions: "be concise",
      input: [
        { role: "user", content: "hi" },
        { type: "reasoning", id: "rs_1" },
      ],
    };
    stripStoredItemReferences(body);
    expect(body.model).toBe("gpt-5.4");
    expect(body.store).toBe(false);
    expect(body.stream).toBe(true);
    expect(body.instructions).toBe("be concise");
  });
});

describe("prepareCodexRequestBody", () => {
  it("forces store:false even if caller set store:true", () => {
    const body: Record<string, unknown> = { store: true, input: "hi" };
    prepareCodexRequestBody(body);
    expect(body.store).toBe(false);
  });

  it("forces stream:true", () => {
    const body: Record<string, unknown> = { input: "hi" };
    prepareCodexRequestBody(body);
    expect(body.stream).toBe(true);
  });

  it("injects default instructions when missing", () => {
    const body: Record<string, unknown> = { input: "hi" };
    prepareCodexRequestBody(body);
    expect(body.instructions).toBe("You are a helpful assistant.");
  });

  it("preserves caller-provided instructions", () => {
    const body: Record<string, unknown> = { input: "hi", instructions: "custom" };
    prepareCodexRequestBody(body);
    expect(body.instructions).toBe("custom");
  });

  it("normalises string input to an array of one user message", () => {
    const body: Record<string, unknown> = { input: "hello" };
    prepareCodexRequestBody(body);
    expect(body.input).toEqual([{ role: "user", content: "hello" }]);
  });

  it("strips rs_* and clears fc_* before model remap (full chain)", () => {
    const body: Record<string, unknown> = {
      model: "gpt-5.4-2026-03-05",
      input: [
        { role: "user", content: "hi" },
        { type: "reasoning", id: "rs_1" },
        { type: "function_call", id: "fc_1", call_id: "c1", name: "x", arguments: "{}" },
        { role: "user", content: "ok" },
      ],
    };
    prepareCodexRequestBody(body);
    expect(body.model).toBe("gpt-5.4");
    const items = body.input as Record<string, unknown>[];
    expect(items.length).toBe(3);
    expect(items.some((i) => i.type === "reasoning")).toBe(false);
    const fc = items.find((i) => i.type === "function_call") as Record<string, unknown>;
    expect("id" in fc).toBe(false);
  });

  it("remaps dated model IDs to base names", () => {
    for (const [input, expected] of [
      ["gpt-5.4-2026-03-05", "gpt-5.4"],
      ["gpt-5-mini-2025-08-07", "gpt-5-mini"],
      ["gpt-5-nano-2025-08-07", "gpt-5-nano"],
    ] as const) {
      const body: Record<string, unknown> = { model: input, input: "hi" };
      prepareCodexRequestBody(body);
      expect(body.model).toBe(expected);
    }
  });

  it("leaves unknown / already-base model IDs alone", () => {
    const body: Record<string, unknown> = { model: "gpt-5.4", input: "hi" };
    prepareCodexRequestBody(body);
    expect(body.model).toBe("gpt-5.4");
  });

  it("strips fields the Codex endpoint does not accept", () => {
    const body: Record<string, unknown> = {
      input: "hi",
      max_output_tokens: 1000,
      max_tokens: 1000,
      service_tier: "default",
      prompt_cache_key: "abc",
      prompt_cache_retention: 3600,
      keep_this: "yes",
    };
    prepareCodexRequestBody(body);
    expect("max_output_tokens" in body).toBe(false);
    expect("max_tokens" in body).toBe(false);
    expect("service_tier" in body).toBe(false);
    expect("prompt_cache_key" in body).toBe(false);
    expect("prompt_cache_retention" in body).toBe(false);
    expect(body.keep_this).toBe("yes");
  });

  it("end-to-end: realistic turn-2 payload from pi-ai becomes Codex-safe", () => {
    const body: Record<string, unknown> = {
      model: "gpt-5.4-2026-03-05",
      store: true, // caller might forget — we override
      stream: false, // caller might forget — we override
      previous_response_id: "resp_old", // pi-ai never sends this, but defensive
      max_output_tokens: 8192,
      input: [
        { role: "user", content: "what's 2+2?" },
        { type: "reasoning", id: "rs_a", summary: [{ type: "summary_text", text: "..." }] },
        { type: "function_call", id: "fc_a", call_id: "c1", name: "calc", arguments: "{}" },
        { type: "function_call_output", call_id: "c1", output: "4" },
        { role: "assistant", content: "4" },
        { role: "user", content: "thanks" },
      ],
    };
    prepareCodexRequestBody(body);
    expect(body.store).toBe(false);
    expect(body.stream).toBe(true);
    expect(body.model).toBe("gpt-5.4");
    expect(body.instructions).toBe("You are a helpful assistant.");
    expect("max_output_tokens" in body).toBe(false);
    const items = body.input as Record<string, unknown>[];
    // 6 → 5 (rs_a stripped)
    expect(items.length).toBe(5);
    expect(items.some((i) => i.type === "reasoning")).toBe(false);
    const fc = items.find((i) => i.type === "function_call") as Record<string, unknown>;
    expect("id" in fc).toBe(false);
    expect(fc.call_id).toBe("c1");
  });
});

describe("applyResponsesStorePolicy", () => {
  it("sets store:true on standard OpenAI /v1/responses (managed)", () => {
    const body: Record<string, unknown> = { store: false, input: "hi" };
    const applied = applyResponsesStorePolicy(body, {
      provider: "openai",
      isCodexOAuth: false,
      path: "/v1/openai/responses",
    });
    expect(applied).toBe(true);
    expect(body.store).toBe(true);
  });

  it("sets store:true on standard OpenAI /v1/responses (BYOK sk-key)", () => {
    const body: Record<string, unknown> = { input: "hi" };
    applyResponsesStorePolicy(body, {
      provider: "openai",
      isCodexOAuth: false,
      path: "/v1/openai/responses",
    });
    expect(body.store).toBe(true);
  });

  it("does NOT touch the body for Codex OAuth path (handled separately)", () => {
    const body: Record<string, unknown> = { store: false, input: "hi" };
    const applied = applyResponsesStorePolicy(body, {
      provider: "openai",
      isCodexOAuth: true,
      path: "/v1/openai/responses",
    });
    expect(applied).toBe(false);
    expect(body.store).toBe(false);
  });

  it("does NOT touch non-/responses OpenAI paths (audio, embeddings, files)", () => {
    const cases = [
      "/v1/openai/audio/transcriptions",
      "/v1/openai/embeddings",
      "/v1/openai/files",
      "/v1/openai/chat/completions",
    ];
    for (const path of cases) {
      const body: Record<string, unknown> = { input: "hi" };
      const applied = applyResponsesStorePolicy(body, {
        provider: "openai",
        isCodexOAuth: false,
        path,
      });
      expect(applied).toBe(false);
      expect("store" in body).toBe(false);
    }
  });

  it("does NOT touch non-OpenAI providers", () => {
    for (const provider of ["anthropic", "kimi", "gemini", "minimax", "qwen"]) {
      const body: Record<string, unknown> = { input: "hi" };
      const applied = applyResponsesStorePolicy(body, {
        provider,
        isCodexOAuth: false,
        path: "/v1/" + provider + "/responses",
      });
      expect(applied).toBe(false);
      expect("store" in body).toBe(false);
    }
  });
});
