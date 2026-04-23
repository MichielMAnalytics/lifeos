// Temporary diagnostic action: hit the Granola list endpoint and log the
// raw response so we can see actual field shapes. Delete once we've nailed
// down the parser. Auth-gated like the public actions.

"use node";

import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readByokSecret } from "./k8s";

const GRANOLA_API = "https://public-api.granola.ai";

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
