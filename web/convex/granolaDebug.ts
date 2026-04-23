// Temporary diagnostic action: hit the Granola list endpoint and log the
// raw response so we can see actual field shapes. Delete once we've nailed
// down the parser. Auth-gated like the public actions.

"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readByokSecret } from "./k8s";

const GRANOLA_API = "https://public-api.granola.ai";

// Lists meetings the sync says still need a detail fetch. Lets us verify
// the detail-pass query is returning what we expect.
export const inspectDetailQueue = action({
  args: {},
  handler: async (ctx): Promise<unknown> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const candidates = await ctx.runQuery(internal.meetings._listNeedingDetail, {
      userId,
      limit: 100,
    });
    return { count: (candidates as unknown[]).length, sample: (candidates as unknown[]).slice(0, 5) };
  },
});

// Forces a single detail fetch for the FIRST candidate so we can confirm
// the action wiring works end to end without waiting for the cron.
export const fetchOneDetail = action({
  args: {},
  handler: async (ctx): Promise<unknown> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const apiKey = await readByokSecret(userId, "granola");
    if (!apiKey) return { ok: false, reason: "no-key" };
    const candidates = (await ctx.runQuery(internal.meetings._listNeedingDetail, {
      userId,
      limit: 1,
    })) as Array<{ granolaId: string }>;
    if (!candidates.length) return { ok: false, reason: "queue-empty" };
    const first = candidates[0];
    const url = `${GRANOLA_API}/v1/notes/${encodeURIComponent(first.granolaId)}?include=transcript`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    return {
      ok: res.ok,
      status: res.status,
      granolaId: first.granolaId,
      bodyHead: (await res.text()).slice(0, 300),
    };
  },
});

export const dumpFirstNote = action({
  args: {},
  handler: async (ctx): Promise<unknown> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const apiKey = await readByokSecret(userId, "granola");
    if (!apiKey) return { ok: false, reason: "no-key" };

    const listRes = await fetch(`${GRANOLA_API}/v1/notes?limit=1`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const listBody = await listRes.text();
    let listJson: unknown;
    try { listJson = JSON.parse(listBody); } catch { listJson = null; }

    // Try to fetch the first note in detail with `?include=transcript`.
    let detailJson: unknown = null;
    if (listJson && typeof listJson === "object" && "notes" in listJson) {
      const notes = (listJson as { notes?: Array<{ id?: string }> }).notes;
      if (notes && notes[0]?.id) {
        const detailRes = await fetch(
          `${GRANOLA_API}/v1/notes/${notes[0].id}?include=transcript`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        const detailBody = await detailRes.text();
        try { detailJson = JSON.parse(detailBody); } catch { detailJson = null; }
      }
    }

    return {
      listStatus: listRes.status,
      listKeys: listJson && typeof listJson === "object" ? Object.keys(listJson) : null,
      firstNote: listJson && typeof listJson === "object" && "notes" in listJson
        ? ((listJson as { notes?: unknown[] }).notes?.[0] ?? null)
        : null,
      detailKeys: detailJson && typeof detailJson === "object" ? Object.keys(detailJson) : null,
      detailSample: detailJson,
    };
  },
});
