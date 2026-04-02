import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const transcribeAudio = action({
  args: {
    audioBase64: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, { audioBase64, mimeType }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("Transcription not configured");

    // Convert base64 to binary
    const binaryStr = atob(audioBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Build multipart form for OpenAI Whisper
    const blob = new Blob([bytes], { type: mimeType });
    const form = new FormData();
    form.append("file", blob, "voice.webm");
    form.append("model", "gpt-4o-mini-transcribe");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[transcribe] OpenAI error:", res.status, errText);
      throw new Error("Transcription failed");
    }

    const data = (await res.json()) as { text?: string };
    return data.text ?? "";
  },
});
