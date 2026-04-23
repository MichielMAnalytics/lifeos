// Public read surface for the Granola integration. Lives in the V8 runtime
// (queries can't go in `granolaSync.ts` because that file is `"use node";`).
//
// The actual API key never leaves Secret Manager — this query only returns
// the connection + sync timestamps so the dashboard can render status
// without round-tripping through GCP on every render.

import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      connected: user.granolaConnectedAt !== undefined,
      connectedAt: user.granolaConnectedAt ?? null,
      syncedAt: user.granolaSyncedAt ?? null,
      lastError: user.granolaSyncError ?? null,
    };
  },
});
