// Meetings table — synced from Granola via the Personal API.
//
// Public surface:
//   list / get   — read-only views for the dashboard and CLI.
//   remove       — manual removal (does NOT propagate to Granola).
//
// Sync surface (internal only): the Granola sync action calls
// `_upsertFromGranola` for each note it pulls down. We dedupe by
// `(userId, granolaId)` so re-syncing the same note updates instead
// of duplicating.

import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

// ── list ──────────────────────────────────────────────
//
// Returns lightweight previews (no transcript). The peek lazy-loads the
// full doc via `meetings.get`. Optional filters narrow the list:
//   `attendee` — case-insensitive substring match against any attendee
//   `folder`   — case-insensitive exact match against any folder
//   `tag`      — case-insensitive exact match against any user tag
//   `search`   — case-insensitive substring match across title + summary
//   `from/to`  — epoch ms bounds on startedAt
//
// Filters are applied in JS after the index-narrowed read because Convex
// doesn't have a multi-attribute filter operator that handles arrays.

export const list = query({
  args: {
    limit: v.optional(v.float64()),
    attendee: v.optional(v.string()),
    folder: v.optional(v.string()),
    tag: v.optional(v.string()),
    search: v.optional(v.string()),
    from: v.optional(v.float64()),
    to: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const fetchSize = args.attendee || args.folder || args.tag || args.search || args.from || args.to
      ? Math.min(limit * 5, 500)
      : limit;

    const rows = await ctx.db
      .query("meetings")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(fetchSize);

    const attendeeNeedle = args.attendee?.toLowerCase().trim();
    const folderNeedle = args.folder?.toLowerCase().trim();
    const tagNeedle = args.tag?.toLowerCase().trim();
    const searchNeedle = args.search?.toLowerCase().trim();

    const filtered = rows.filter((m) => {
      if (args.from !== undefined && (m.startedAt ?? 0) < args.from) return false;
      if (args.to !== undefined && (m.startedAt ?? 0) > args.to) return false;
      if (attendeeNeedle && !m.attendees?.some((a) => a.toLowerCase().includes(attendeeNeedle))) {
        return false;
      }
      if (folderNeedle && !m.folders?.some((f) => f.toLowerCase() === folderNeedle)) {
        return false;
      }
      if (tagNeedle && !m.tags?.some((t) => t.toLowerCase() === tagNeedle)) {
        return false;
      }
      if (searchNeedle) {
        // Search across title + both summary variants + attendee names +
        // folder names so the user can find a meeting by any of those.
        const haystack = [
          m.title,
          m.summary ?? "",
          m.summaryMarkdown ?? "",
          (m.attendees ?? []).join(" "),
          (m.folders ?? []).join(" "),
        ].join(" ").toLowerCase();
        if (!haystack.includes(searchNeedle)) return false;
      }
      return true;
    });

    return filtered.slice(0, limit).map((meeting) => ({
      _id: meeting._id,
      _creationTime: meeting._creationTime,
      userId: meeting.userId,
      granolaId: meeting.granolaId,
      title: meeting.title,
      summary: meeting.summary,
      transcriptTruncated: meeting.transcriptTruncated,
      attendees: meeting.attendees,
      folders: meeting.folders,
      tags: meeting.tags,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      granolaUrl: meeting.granolaUrl,
      detailFetchedAt: meeting.detailFetchedAt,
      syncedAt: meeting.syncedAt,
    }));
  },
});

// ── setTags (public) ─────────────────────────────────
// User-managed tags on a meeting. Granola sync never touches these.

export const setTags = mutation({
  args: {
    id: v.id("meetings"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Meeting not found");

    const cleaned = args.tags
      .map((t) => t.trim().slice(0, 60))
      .filter((t) => t.length > 0);
    const dedup = Array.from(new Set(cleaned)).slice(0, 30);

    await ctx.db.patch(args.id, { tags: dedup });
    const after = await ctx.db.get(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "update", tableName: "meetings",
      recordId: args.id, beforeData: existing, afterData: after,
    });
    return after;
  },
});

// ── listFolders + listTags (public) ──────────────────
// Faceted picker support — UIs and the CLI use these to populate filter
// dropdowns without scanning the user's full meeting history client-side.

export const listFolders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const rows = await ctx.db
      .query("meetings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(2000);
    const counts = new Map<string, number>();
    for (const m of rows) {
      for (const f of m.folders ?? []) {
        counts.set(f, (counts.get(f) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  },
});

export const listTags = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const rows = await ctx.db
      .query("meetings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(2000);
    const counts = new Map<string, number>();
    for (const m of rows) {
      for (const t of m.tags ?? []) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  },
});

// ── get ───────────────────────────────────────────────

export const get = query({
  args: {
    id: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const meeting = await ctx.db.get(args.id);
    if (!meeting || meeting.userId !== userId) return null;
    return meeting;
  },
});

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("meetings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Meeting not found");
    }

    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "meetings",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });
    return { id: args.id };
  },
});

// ══════════════════════════════════════════════════════
// Internal — used by HTTP layer and Granola sync action
// ══════════════════════════════════════════════════════

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.float64()),
    attendee: v.optional(v.string()),
    folder: v.optional(v.string()),
    tag: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const fetchSize = args.attendee || args.folder || args.tag || args.search
      ? Math.min(limit * 5, 500)
      : limit;
    const rows = await ctx.db
      .query("meetings")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(fetchSize);
    const attendeeNeedle = args.attendee?.toLowerCase().trim();
    const folderNeedle = args.folder?.toLowerCase().trim();
    const tagNeedle = args.tag?.toLowerCase().trim();
    const searchNeedle = args.search?.toLowerCase().trim();
    const filtered = rows.filter((m) => {
      if (attendeeNeedle && !m.attendees?.some((a) => a.toLowerCase().includes(attendeeNeedle))) return false;
      if (folderNeedle && !m.folders?.some((f) => f.toLowerCase() === folderNeedle)) return false;
      if (tagNeedle && !m.tags?.some((t) => t.toLowerCase() === tagNeedle)) return false;
      if (searchNeedle) {
        // Search across title + both summary variants + attendee names +
        // folder names so the user can find a meeting by any of those.
        const haystack = [
          m.title,
          m.summary ?? "",
          m.summaryMarkdown ?? "",
          (m.attendees ?? []).join(" "),
          (m.folders ?? []).join(" "),
        ].join(" ").toLowerCase();
        if (!haystack.includes(searchNeedle)) return false;
      }
      return true;
    });
    const data = filtered.slice(0, limit);
    return { data, count: data.length };
  },
});

export const _get = internalQuery({
  args: {
    userId: v.id("users"),
    id: v.id("meetings"),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db.get(args.id);
    if (!meeting || meeting.userId !== args.userId) return null;
    return meeting;
  },
});

// Returns meetings that still need a detail fetch from Granola — either
// they've never had one (`detailFetchedAt` missing), or Granola updated
// them after our last fetch. Newest-first so a fresh sync prioritises
// recent meetings the user is most likely to look at.
export const _listNeedingDetail = internalQuery({
  args: { userId: v.id("users"), limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);
    const all = await ctx.db
      .query("meetings")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(500);
    const out: Array<{ granolaId: string; granolaUpdatedAt?: number }> = [];
    for (const m of all) {
      const fetched = m.detailFetchedAt ?? 0;
      const upstream = m.granolaUpdatedAt ?? 0;
      // Backfill case: row was detail-fetched before we started capturing
      // `summaryMarkdown`, so re-fetch even if upstream hasn't changed.
      const missingMarkdown = m.summary && !m.summaryMarkdown;
      if (fetched === 0 || upstream > fetched || missingMarkdown) {
        out.push({ granolaId: m.granolaId, granolaUpdatedAt: m.granolaUpdatedAt });
      }
      if (out.length >= limit) break;
    }
    return out;
  },
});

export const _findByGranolaId = internalQuery({
  args: {
    userId: v.id("users"),
    granolaId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"meetings"> | null> => {
    const existing = await ctx.db
      .query("meetings")
      .withIndex("by_userId_granolaId", (q) =>
        q.eq("userId", args.userId).eq("granolaId", args.granolaId),
      )
      .unique();
    return existing;
  },
});

// Idempotent upsert keyed on (userId, granolaId). Re-running a sync of the
// same note updates the row in place — never duplicates.
export const _upsertFromGranola = internalMutation({
  args: {
    userId: v.id("users"),
    granolaId: v.string(),
    title: v.string(),
    summary: v.optional(v.string()),
    summaryMarkdown: v.optional(v.string()),
    transcript: v.optional(v.string()),
    transcriptTruncated: v.optional(v.boolean()),
    attendees: v.optional(v.array(v.string())),
    folders: v.optional(v.array(v.string())),
    startedAt: v.optional(v.float64()),
    endedAt: v.optional(v.float64()),
    granolaUrl: v.optional(v.string()),
    granolaUpdatedAt: v.optional(v.float64()),
    detailFetched: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ id: Id<"meetings">; created: boolean }> => {
    const existing = await ctx.db
      .query("meetings")
      .withIndex("by_userId_granolaId", (q) =>
        q.eq("userId", args.userId).eq("granolaId", args.granolaId),
      )
      .unique();

    const now = Date.now();
    // From a LIST pass we only have metadata. Preserve any summary /
    // transcript / attendees / folders we already pulled in a prior detail
    // fetch so a re-sync doesn't blank them. From a DETAIL pass we trust
    // the new values as authoritative and overwrite.
    const isDetail = args.detailFetched === true;
    const summary = isDetail ? args.summary : (args.summary ?? existing?.summary);
    const summaryMarkdown = isDetail
      ? args.summaryMarkdown
      : (args.summaryMarkdown ?? existing?.summaryMarkdown);
    const transcript = isDetail ? args.transcript : (args.transcript ?? existing?.transcript);
    const transcriptTruncated = isDetail
      ? args.transcriptTruncated
      : (args.transcriptTruncated ?? existing?.transcriptTruncated);
    const attendees = isDetail ? args.attendees : (args.attendees ?? existing?.attendees);
    const folders = isDetail ? args.folders : (args.folders ?? existing?.folders);

    const payload = {
      userId: args.userId,
      granolaId: args.granolaId,
      title: args.title,
      summary,
      summaryMarkdown,
      transcript,
      transcriptTruncated,
      attendees,
      folders,
      tags: existing?.tags, // user-managed; never overwritten by Granola
      startedAt: args.startedAt,
      endedAt: args.endedAt,
      granolaUrl: args.granolaUrl,
      granolaUpdatedAt: args.granolaUpdatedAt ?? existing?.granolaUpdatedAt,
      detailFetchedAt: isDetail ? now : existing?.detailFetchedAt,
      syncedAt: now,
    };

    if (existing) {
      await ctx.db.replace(existing._id, payload);
      return { id: existing._id, created: false };
    }

    // Sync upserts intentionally don't write to mutationLog — `lifeos undo`
    // only handles create/update/complete/delete actions, and the recovery
    // story for "I undid a Granola sync" is "wait an hour for the next
    // sync", which is not what the user wants. Manual `meetings.remove`
    // still logs and remains undoable.
    const id = await ctx.db.insert("meetings", payload);
    return { id, created: true };
  },
});

export const _remove = internalMutation({
  args: { userId: v.id("users"), id: v.id("meetings") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Meeting not found");
    }
    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "meetings",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });
    return { id: args.id };
  },
});
