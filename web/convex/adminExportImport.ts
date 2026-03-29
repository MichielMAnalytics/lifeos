/**
 * User data export/import for seeding dev from prod.
 * DELETE THIS FILE after use.
 *
 * Usage:
 *   # 1. Deploy to prod (read-only query, safe)
 *   cd web && npx convex deploy --yes
 *
 *   # 2. Export from prod
 *   cd web && npx convex run --prod 'adminExportImport:exportUserData' '{"email":"zumpollekemp@gmail.com"}' > ../user-export.json
 *
 *   # 3. Import into dev (make sure dev is running)
 *   cd web && npx convex run 'adminExportImport:importUserData' "$(cat ../user-export.json)"
 *
 *   # 4. Delete this file and re-deploy
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// ── Export: fetch all LifeOS data for a user by email ─────────────

export const exportUserData = internalQuery({
  args: { email: v.string() },
  returns: v.any(),
  handler: async (ctx, { email }) => {
    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!user) throw new Error(`User not found: ${email}`);

    const uid = user._id;

    // Query all LifeOS tables (skip apiKeys — secrets shouldn't be exported)
    const [
      tasks,
      projects,
      goals,
      identity,
      visionBoard,
      journals,
      dayPlans,
      weeklyPlans,
      ideas,
      thoughts,
      wins,
      resources,
      reviews,
      reminders,
      dashboardConfig,
    ] = await Promise.all([
      ctx.db.query("tasks").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("projects").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("goals").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("identity").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("visionBoard").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("journals").withIndex("by_userId_entryDate", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("dayPlans").withIndex("by_userId_planDate", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("weeklyPlans").withIndex("by_userId_weekStart", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("ideas").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("thoughts").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("wins").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("resources").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("reviews").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("reminders").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
      ctx.db.query("dashboardConfig").withIndex("by_userId", (q) => q.eq("userId", uid)).collect(),
    ]);

    return {
      user: { email: user.email, name: user.name, timezone: user.timezone },
      tasks,
      projects,
      goals,
      identity,
      visionBoard,
      journals,
      dayPlans,
      weeklyPlans,
      ideas,
      thoughts,
      wins,
      resources,
      reviews,
      reminders,
      dashboardConfig,
    };
  },
});

// ── Import: insert exported data into the current (dev) database ──
// Handles ID remapping so foreign keys (projectId, goalId, taskId) stay consistent.

export const importUserData = internalMutation({
  args: { data: v.any() },
  returns: v.any(),
  handler: async (ctx, { data }) => {
    // Find or create the target user in dev
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", data.user.email))
      .unique();

    let userId;
    if (existingUser) {
      userId = existingUser._id;
    } else {
      userId = await ctx.db.insert("users", {
        email: data.user.email,
        name: data.user.name,
        timezone: data.user.timezone,
      });
    }

    // ID remapping: old prod ID -> new dev ID
    const idMap = new Map<string, any>();

    // Helper: strip Convex system fields and old userId
    const clean = (doc: any) => {
      const { _id, _creationTime, userId: _uid, ...rest } = doc;
      return rest;
    };

    // 1. Projects (no foreign keys)
    for (const doc of data.projects ?? []) {
      const newId = await ctx.db.insert("projects", { ...clean(doc), userId });
      idMap.set(doc._id, newId);
    }

    // 2. Goals (no foreign keys)
    for (const doc of data.goals ?? []) {
      const newId = await ctx.db.insert("goals", { ...clean(doc), userId });
      idMap.set(doc._id, newId);
    }

    // 3. Tasks (references projectId, goalId)
    for (const doc of data.tasks ?? []) {
      const fields = clean(doc);
      if (fields.projectId) fields.projectId = idMap.get(fields.projectId) ?? fields.projectId;
      if (fields.goalId) fields.goalId = idMap.get(fields.goalId) ?? fields.goalId;
      const newId = await ctx.db.insert("tasks", { ...fields, userId });
      idMap.set(doc._id, newId);
    }

    // 4. Day plans (references mitTaskId, p1TaskId, p2TaskId)
    for (const doc of data.dayPlans ?? []) {
      const fields = clean(doc);
      if (fields.mitTaskId) fields.mitTaskId = idMap.get(fields.mitTaskId) ?? fields.mitTaskId;
      if (fields.p1TaskId) fields.p1TaskId = idMap.get(fields.p1TaskId) ?? fields.p1TaskId;
      if (fields.p2TaskId) fields.p2TaskId = idMap.get(fields.p2TaskId) ?? fields.p2TaskId;
      await ctx.db.insert("dayPlans", { ...fields, userId });
    }

    // 5. Ideas (references projectId)
    for (const doc of data.ideas ?? []) {
      const fields = clean(doc);
      if (fields.projectId) fields.projectId = idMap.get(fields.projectId) ?? fields.projectId;
      await ctx.db.insert("ideas", { ...fields, userId });
    }

    // 6. Tables with no foreign keys — bulk insert
    const simpleTables = [
      "identity", "visionBoard", "journals", "weeklyPlans",
      "thoughts", "wins", "resources", "reviews", "reminders",
    ] as const;

    const counts: Record<string, number> = {
      projects: data.projects?.length ?? 0,
      goals: data.goals?.length ?? 0,
      tasks: data.tasks?.length ?? 0,
      dayPlans: data.dayPlans?.length ?? 0,
      ideas: data.ideas?.length ?? 0,
    };

    for (const table of simpleTables) {
      const docs = data[table] ?? [];
      for (const doc of docs) {
        await ctx.db.insert(table, { ...clean(doc), userId });
      }
      counts[table] = docs.length;
    }

    // 7. Dashboard config
    if (data.dashboardConfig?.length) {
      const existing = await ctx.db
        .query("dashboardConfig")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();
      if (existing) {
        await ctx.db.replace(existing._id, { ...clean(data.dashboardConfig[0]), userId });
      } else {
        await ctx.db.insert("dashboardConfig", { ...clean(data.dashboardConfig[0]), userId });
      }
      counts.dashboardConfig = 1;
    }

    return { userId, counts };
  },
});
