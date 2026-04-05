import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal, components } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { auth } from "./auth";
import { registerRoutes } from "@convex-dev/stripe";
import type Stripe from "stripe";
import { getCreditTiers, getSubscriptionPlans, serverEnv } from "./deploymentEnv";

// ── Helpers ──────────────────────────────────────────

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function err(error: string, status = 400): Response {
  return json({ error }, status);
}

/** Extract API key from Authorization header and validate it. Returns userId or null. */
async function authenticate(
  ctx: { runAction: (ref: typeof internal.apiKeyAuth.validateKey, args: { key: string }) => Promise<{ userId: string } | null> },
  request: Request,
): Promise<Id<"users"> | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer lifeos_sk_")) return null;
  const key = authHeader.slice(7); // remove "Bearer "
  const result = await ctx.runAction(internal.apiKeyAuth.validateKey, { key });
  if (!result) return null;
  return result.userId as Id<"users">;
}

/** Parse a URL path to extract the last segment as an ID-like string. */
function extractId(url: URL, prefix: string): string | null {
  const path = url.pathname;
  const rest = path.slice(prefix.length);
  if (!rest || rest === "/") return null;
  // rest starts with "/" e.g. "/abc123" or "/abc123/complete"
  const segments = rest.split("/").filter(Boolean);
  return segments[0] ?? null;
}

/** Parse a URL path segment after the id. E.g. /api/v1/tasks/:id/complete -> "complete" */
function extractAction(url: URL, prefix: string): string | null {
  const path = url.pathname;
  const rest = path.slice(prefix.length);
  const segments = rest.split("/").filter(Boolean);
  return segments[1] ?? null;
}

/** Convert a value to epoch milliseconds. Accepts epoch numbers or ISO date strings. */
function toEpoch(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    if (!isNaN(ms)) return ms;
  }
  throw new Error("Invalid date/time value");
}

/** Safe JSON body parse with type assertion */
async function parseBody<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    return {} as T;
  }
}

/**
 * Resolve a potentially-truncated entity ID to its full Convex ID.
 * Full Convex IDs are 32 chars; anything shorter is treated as a prefix
 * and matched against the user's records in the given table.
 */
type ResolvableTable =
  | "tasks" | "goals" | "projects" | "reminders"
  | "reviews" | "resources" | "ideas" | "thoughts" | "wins" | "apiKeys"
  | "visionBoard" | "workouts" | "programmes" | "foodLog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RESOLVER_MAP: Record<ResolvableTable, any> = {
  tasks: internal.resolveId.resolveTask,
  goals: internal.resolveId.resolveGoal,
  projects: internal.resolveId.resolveProject,
  reminders: internal.resolveId.resolveReminder,
  reviews: internal.resolveId.resolveReview,
  resources: internal.resolveId.resolveResource,
  ideas: internal.resolveId.resolveIdea,
  thoughts: internal.resolveId.resolveThought,
  wins: internal.resolveId.resolveWin,
  apiKeys: internal.resolveId.resolveApiKey,
  visionBoard: internal.resolveId.resolveVisionBoard,
  workouts: internal.resolveId.resolveWorkout,
  programmes: internal.resolveId.resolveProgramme,
  foodLog: internal.resolveId.resolveFoodLog,
};

async function resolveEntityId<T extends ResolvableTable>(
  ctx: { runQuery: (...args: [ref: any, args: any]) => Promise<any> },
  userId: Id<"users">,
  table: T,
  rawId: string,
): Promise<Id<T> | null> {
  // Full Convex IDs are 32 characters; treat shorter strings as prefixes
  if (rawId.length >= 32) {
    return rawId as Id<T>;
  }
  const resolver = RESOLVER_MAP[table];
  const result = await ctx.runQuery(resolver, { userId, prefix: rawId });
  return result as Id<T> | null;
}

// ── HTTP Router ──────────────────────────────────────

const http = httpRouter();

// ── CORS preflight for all routes ────────────────────

http.route({
  path: "/api/v1/health",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

// ── Health ───────────────────────────────────────────

http.route({
  path: "/api/v1/health",
  method: "GET",
  handler: httpAction(async () => {
    return json({ status: "ok", timestamp: new Date().toISOString() });
  }),
});

// ════════════════════════════════════════════════════════
// AUTH routes (Google OAuth handles sign-in/sign-up)
// CLI uses API key auth for all other endpoints
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/auth/me",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/auth/me",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const user = await ctx.runQuery(internal.authHelpers._getMe, { userId });
    return json({ data: user });
  }),
});

http.route({
  path: "/api/v1/auth/me",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    try {
      const user = await ctx.runMutation(internal.authHelpers._updateMe, {
        userId,
        name: body.name as string | undefined,
        timezone: body.timezone as string | undefined,
      });
      return json({ data: user });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 400);
    }
  }),
});

http.route({
  path: "/api/v1/auth/api-keys",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/auth/api-keys",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const keys = await ctx.runQuery(internal.authHelpers._listApiKeys, { userId });
    return json({ data: keys });
  }),
});

http.route({
  path: "/api/v1/auth/api-keys",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody<{ name?: string }>(request);
    const result = await ctx.runAction(api.apiKeyAuth.createApiKey, {
      userId,
      name: body.name,
    });
    return json({ data: result }, 201);
  }),
});

// ════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/tasks",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/tasks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const projectIdParam = url.searchParams.get("projectId");
    const goalIdParam = url.searchParams.get("goalId");

    let resolvedProjectId: Id<"projects"> | undefined;
    if (projectIdParam) {
      const pid = await resolveEntityId(ctx, userId, "projects", projectIdParam);
      if (!pid) return err("Project not found", 404);
      resolvedProjectId = pid;
    }
    let resolvedGoalId: Id<"goals"> | undefined;
    if (goalIdParam) {
      const gid = await resolveEntityId(ctx, userId, "goals", goalIdParam);
      if (!gid) return err("Goal not found", 404);
      resolvedGoalId = gid;
    }

    const result = await ctx.runQuery(internal.tasks._list, {
      userId,
      status: url.searchParams.get("status") ?? undefined,
      due: url.searchParams.get("due") ?? undefined,
      ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
      ...(resolvedGoalId ? { goalId: resolvedGoalId } : {}),
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/tasks",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);

    // Resolve goalId and projectId if present (may be truncated)
    let resolvedGoalId: Id<"goals"> | undefined;
    const rawGoalId = (body.goalId ?? body.goal_id) as string | undefined;
    if (rawGoalId) {
      const gid = await resolveEntityId(ctx, userId, "goals", rawGoalId);
      if (!gid) return err("Goal not found", 404);
      resolvedGoalId = gid;
    }
    let resolvedProjectId: Id<"projects"> | undefined;
    const rawProjectId = (body.projectId ?? body.project_id) as string | undefined;
    if (rawProjectId) {
      const pid = await resolveEntityId(ctx, userId, "projects", rawProjectId);
      if (!pid) return err("Project not found", 404);
      resolvedProjectId = pid;
    }

    const task = await ctx.runMutation(internal.tasks._create, {
      userId,
      title: body.title as string,
      notes: (body.notes ?? undefined) as string | undefined,
      dueDate: ((body.dueDate ?? body.due_date) ?? undefined) as string | undefined,
      projectId: resolvedProjectId,
      goalId: resolvedGoalId,
    });
    return json({ data: task }, 201);
  }),
});

// ── Tasks with ID ────────────────────────────────────

http.route({
  pathPrefix: "/api/v1/tasks/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/tasks/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/tasks");
    if (!rawId) return err("Missing task id", 400);
    const id = await resolveEntityId(ctx, userId, "tasks", rawId);
    if (!id) return err("Task not found", 404);
    const task = await ctx.runQuery(internal.tasks._get, { userId, id });
    if (!task) return err("Task not found", 404);
    return json({ data: task });
  }),
});

http.route({
  pathPrefix: "/api/v1/tasks/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/tasks");
    if (!rawId) return err("Missing task id", 400);
    const id = await resolveEntityId(ctx, userId, "tasks", rawId);
    if (!id) return err("Task not found", 404);
    const body = await parseBody(request);

    // Resolve goalId and projectId if present (may be truncated)
    let resolvedGoalId: Id<"goals"> | undefined;
    const rawGoalId = (body.goalId ?? body.goal_id) as string | undefined;
    if (rawGoalId) {
      const gid = await resolveEntityId(ctx, userId, "goals", rawGoalId);
      if (!gid) return err("Goal not found", 404);
      resolvedGoalId = gid;
    }
    let resolvedProjectId: Id<"projects"> | undefined;
    const rawProjectId = (body.projectId ?? body.project_id) as string | undefined;
    if (rawProjectId) {
      const pid = await resolveEntityId(ctx, userId, "projects", rawProjectId);
      if (!pid) return err("Project not found", 404);
      resolvedProjectId = pid;
    }

    try {
      const task = await ctx.runMutation(internal.tasks._update, {
        userId,
        id,
        title: (body.title ?? undefined) as string | undefined,
        notes: (body.notes ?? undefined) as string | undefined,
        dueDate: ((body.dueDate ?? body.due_date) ?? undefined) as string | undefined,
        status: (body.status ?? undefined) as string | undefined,
        projectId: resolvedProjectId,
        goalId: resolvedGoalId,
        position: (body.position ?? undefined) as number | undefined,
      });
      return json({ data: task });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/tasks/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/tasks");
    if (!rawId) return err("Missing task id", 400);
    const id = await resolveEntityId(ctx, userId, "tasks", rawId);
    if (!id) return err("Task not found", 404);
    try {
      const result = await ctx.runMutation(internal.tasks._remove, {
        userId,
        id,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/tasks/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/tasks");

    // POST /api/v1/tasks/bulk-complete
    if (rawId === "bulk-complete") {
      const body = await parseBody(request);
      const rawIds = body.ids as string[];
      const resolvedIds: Id<"tasks">[] = [];
      for (const rid of rawIds) {
        const resolved = await resolveEntityId(ctx, userId, "tasks", rid);
        if (!resolved) return err(`Task not found: ${rid}`, 404);
        resolvedIds.push(resolved);
      }
      const result = await ctx.runMutation(internal.tasks._bulkComplete, {
        userId,
        ids: resolvedIds,
      });
      return json({ data: result });
    }

    // POST /api/v1/tasks/:id/complete
    const action = extractAction(url, "/api/v1/tasks");
    if (action === "complete" && rawId) {
      const id = await resolveEntityId(ctx, userId, "tasks", rawId);
      if (!id) return err("Task not found", 404);
      try {
        const task = await ctx.runMutation(internal.tasks._complete, {
          userId,
          id,
        });
        return json({ data: task });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Complete failed";
        return err(message, 404);
      }
    }

    return err("Unknown tasks action", 400);
  }),
});

// ════════════════════════════════════════════════════════
// PROJECTS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/projects",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/projects",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.projects._list, {
      userId,
      status: url.searchParams.get("status") ?? undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/projects",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    const project = await ctx.runMutation(internal.projects._create, {
      userId,
      title: body.title as string,
      description: (body.description ?? undefined) as string | undefined,
      status: (body.status ?? undefined) as string | undefined,
    });
    return json({ data: project }, 201);
  }),
});

http.route({
  pathPrefix: "/api/v1/projects/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/projects/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/projects");
    if (!rawId) return err("Missing project id", 400);
    const id = await resolveEntityId(ctx, userId, "projects", rawId);
    if (!id) return err("Project not found", 404);
    const project = await ctx.runQuery(internal.projects._get, { userId, id });
    if (!project) return err("Project not found", 404);
    return json({ data: project });
  }),
});

http.route({
  pathPrefix: "/api/v1/projects/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/projects");
    if (!rawId) return err("Missing project id", 400);
    const id = await resolveEntityId(ctx, userId, "projects", rawId);
    if (!id) return err("Project not found", 404);
    const body = await parseBody(request);
    try {
      const project = await ctx.runMutation(internal.projects._update, {
        userId,
        id,
        title: (body.title ?? undefined) as string | undefined,
        description: (body.description ?? undefined) as string | undefined,
        status: (body.status ?? undefined) as string | undefined,
      });
      return json({ data: project });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/projects/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/projects");
    if (!rawId) return err("Missing project id", 400);
    const id = await resolveEntityId(ctx, userId, "projects", rawId);
    if (!id) return err("Project not found", 404);
    try {
      const result = await ctx.runMutation(internal.projects._remove, {
        userId,
        id,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// GOALS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/goals",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/goals",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.goals._list, {
      userId,
      status: url.searchParams.get("status") ?? undefined,
      quarter: url.searchParams.get("quarter") ?? undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/goals",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    const goal = await ctx.runMutation(internal.goals._create, {
      userId,
      title: body.title as string,
      description: (body.description ?? undefined) as string | undefined,
      status: (body.status ?? undefined) as string | undefined,
      targetDate: ((body.targetDate ?? body.target_date) ?? undefined) as string | undefined,
      quarter: (body.quarter ?? undefined) as string | undefined,
    });
    return json({ data: goal }, 201);
  }),
});

http.route({
  pathPrefix: "/api/v1/goals/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/goals/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/goals");
    if (!rawId) return err("Missing goal id", 400);
    const id = await resolveEntityId(ctx, userId, "goals", rawId);
    if (!id) return err("Goal not found", 404);

    // Check for /goals/:id/health
    const action = extractAction(url, "/api/v1/goals");
    if (action === "health") {
      const health = await ctx.runQuery(internal.goals._health, {
        userId,
        id,
      });
      if (!health) return err("Goal not found", 404);
      return json({ data: health });
    }

    const goal = await ctx.runQuery(internal.goals._get, { userId, id });
    if (!goal) return err("Goal not found", 404);
    return json({ data: goal });
  }),
});

http.route({
  pathPrefix: "/api/v1/goals/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/goals");
    if (!rawId) return err("Missing goal id", 400);
    const id = await resolveEntityId(ctx, userId, "goals", rawId);
    if (!id) return err("Goal not found", 404);
    const body = await parseBody(request);
    try {
      const goal = await ctx.runMutation(internal.goals._update, {
        userId,
        id,
        title: (body.title ?? undefined) as string | undefined,
        description: (body.description ?? undefined) as string | undefined,
        status: (body.status ?? undefined) as string | undefined,
        targetDate: ((body.targetDate ?? body.target_date) ?? undefined) as string | undefined,
        quarter: (body.quarter ?? undefined) as string | undefined,
      });
      return json({ data: goal });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/goals/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/goals");
    if (!rawId) return err("Missing goal id", 400);
    const id = await resolveEntityId(ctx, userId, "goals", rawId);
    if (!id) return err("Goal not found", 404);
    try {
      const result = await ctx.runMutation(internal.goals._remove, {
        userId,
        id,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// JOURNAL
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/journal",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/journal",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);

    const allJournals = await ctx.runQuery(internal.journals._list, { userId });
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    let results = allJournals as Array<{ entryDate: string }>;
    if (from) results = results.filter((j) => j.entryDate >= from);
    if (to) results = results.filter((j) => j.entryDate <= to);

    return json({ data: results, count: results.length });
  }),
});

// Journal entries by date use pathPrefix
http.route({
  pathPrefix: "/api/v1/journal/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/journal/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const date = extractId(url, "/api/v1/journal");
    if (!date) return err("Missing date", 400);
    const entry = await ctx.runQuery(internal.journals._getByDate, { userId, entryDate: date });
    if (!entry) return err("Journal entry not found", 404);
    return json({ data: entry });
  }),
});

http.route({
  pathPrefix: "/api/v1/journal/",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const date = extractId(url, "/api/v1/journal");
    if (!date) return err("Missing date", 400);
    const body = await parseBody(request);
    const result = await ctx.runMutation(internal.journals._upsert, {
      userId,
      entryDate: date,
      mit: (body.mit ?? undefined) as string | undefined,
      p1: (body.p1 ?? undefined) as string | undefined,
      p2: (body.p2 ?? undefined) as string | undefined,
      notes: (body.notes ?? undefined) as string | undefined,
      wins: (body.wins ?? []) as string[],
    });
    const typedResult = result as { _wasCreated?: boolean };
    return json({ data: result }, typedResult._wasCreated ? 201 : 200);
  }),
});

http.route({
  pathPrefix: "/api/v1/journal/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const date = extractId(url, "/api/v1/journal");
    if (!date) return err("Missing date", 400);
    try {
      const result = await ctx.runMutation(internal.journals._remove, { userId, entryDate: date });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// DAY PLANS
// ════════════════════════════════════════════════════════

http.route({
  pathPrefix: "/api/v1/day-plans/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/day-plans/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const date = extractId(url, "/api/v1/day-plans");
    if (!date) return err("Missing date", 400);
    const plan = await ctx.runQuery(internal.dayPlans._getByDate, { userId, planDate: date });
    if (!plan) return err("Day plan not found", 404);
    return json({ data: plan });
  }),
});

http.route({
  pathPrefix: "/api/v1/day-plans/",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const date = extractId(url, "/api/v1/day-plans");
    if (!date) return err("Missing date", 400);
    const body = await parseBody(request);

    // Resolve task IDs if present (may be truncated)
    const resolved: Record<string, unknown> = { ...body };
    const rawMit = (body.mitTaskId ?? body.mit_task_id) as string | undefined;
    if (rawMit) {
      const tid = await resolveEntityId(ctx, userId, "tasks", rawMit);
      if (!tid) return err("MIT task not found", 404);
      resolved.mitTaskId = tid;
      delete resolved.mit_task_id;
    }
    const rawP1 = (body.p1TaskId ?? body.p1_task_id) as string | undefined;
    if (rawP1) {
      const tid = await resolveEntityId(ctx, userId, "tasks", rawP1);
      if (!tid) return err("P1 task not found", 404);
      resolved.p1TaskId = tid;
      delete resolved.p1_task_id;
    }
    const rawP2 = (body.p2TaskId ?? body.p2_task_id) as string | undefined;
    if (rawP2) {
      const tid = await resolveEntityId(ctx, userId, "tasks", rawP2);
      if (!tid) return err("P2 task not found", 404);
      resolved.p2TaskId = tid;
      delete resolved.p2_task_id;
    }

    const result = await ctx.runMutation(internal.dayPlans._upsert, {
      userId,
      planDate: date,
      ...resolved,
    });
    return json({ data: result });
  }),
});

http.route({
  pathPrefix: "/api/v1/day-plans/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const date = extractId(url, "/api/v1/day-plans");
    if (!date) return err("Missing date", 400);
    const body = await parseBody(request);
    try {
      const result = await ctx.runMutation(internal.dayPlans._patch, {
        userId,
        planDate: date,
        ...body,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Patch failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/day-plans/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const date = extractId(url, "/api/v1/day-plans");
    if (!date) return err("Missing date", 400);
    try {
      const result = await ctx.runMutation(internal.dayPlans._remove, {
        userId,
        planDate: date,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// WEEKLY PLANS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/weekly-plans",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/weekly-plans",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const current = url.searchParams.get("current");
    const result = await ctx.runQuery(internal.weeklyPlans._list, {
      userId,
      current: current === "true",
    });
    return json(result);
  }),
});

http.route({
  pathPrefix: "/api/v1/weekly-plans/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/weekly-plans/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const weekStart = extractId(url, "/api/v1/weekly-plans");
    if (!weekStart) return err("Missing week_start", 400);
    const plan = await ctx.runQuery(internal.weeklyPlans._getByWeekStart, {
      userId,
      weekStart,
    });
    if (!plan) return err("Weekly plan not found", 404);
    return json({ data: plan });
  }),
});

http.route({
  pathPrefix: "/api/v1/weekly-plans/",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const weekStart = extractId(url, "/api/v1/weekly-plans");
    if (!weekStart) return err("Missing week_start", 400);
    const body = await parseBody(request);
    const result = await ctx.runMutation(internal.weeklyPlans._upsert, {
      userId,
      weekStart,
      ...body,
    });
    return json({ data: result });
  }),
});

http.route({
  pathPrefix: "/api/v1/weekly-plans/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const weekStart = extractId(url, "/api/v1/weekly-plans");
    if (!weekStart) return err("Missing week_start", 400);
    const body = await parseBody(request);
    try {
      const result = await ctx.runMutation(internal.weeklyPlans._upsert, {
        userId,
        weekStart,
        theme: (body.theme ?? undefined) as string | undefined,
        goals: (body.goals ?? undefined) as Array<{ title: string; status?: string; goalId?: string }> | undefined,
        reviewScore: (body.reviewScore ?? body.review_score ?? undefined) as number | undefined,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/weekly-plans/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const weekStart = extractId(url, "/api/v1/weekly-plans");
    if (!weekStart) return err("Missing week_start", 400);
    try {
      const result = await ctx.runMutation(internal.weeklyPlans._remove, {
        userId,
        weekStart,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// IDEAS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/ideas",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/ideas",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.ideas._list, {
      userId,
      actionability: url.searchParams.get("actionability") ?? undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/ideas",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    const idea = await ctx.runMutation(internal.ideas._create, {
      userId,
      content: body.content as string,
      actionability: ((body.actionability) ?? undefined) as string | undefined,
      nextStep: ((body.nextStep ?? body.next_step) ?? undefined) as string | undefined,
    });
    return json({ data: idea }, 201);
  }),
});

http.route({
  pathPrefix: "/api/v1/ideas/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/ideas/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/ideas");
    if (!rawId) return err("Missing idea id", 400);
    const id = await resolveEntityId(ctx, userId, "ideas", rawId);
    if (!id) return err("Idea not found", 404);
    const idea = await ctx.runQuery(internal.ideas._get, { userId, id });
    if (!idea) return err("Idea not found", 404);
    return json({ data: idea });
  }),
});

http.route({
  pathPrefix: "/api/v1/ideas/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/ideas");
    if (!rawId) return err("Missing idea id", 400);
    const id = await resolveEntityId(ctx, userId, "ideas", rawId);
    if (!id) return err("Idea not found", 404);
    const body = await parseBody(request);
    try {
      const idea = await ctx.runMutation(internal.ideas._update, {
        userId,
        id,
        content: (body.content ?? undefined) as string | undefined,
        actionability: (body.actionability ?? undefined) as string | undefined,
        nextStep: ((body.nextStep ?? body.next_step) ?? undefined) as string | undefined,
      });
      return json({ data: idea });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/ideas/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/ideas");
    if (!rawId) return err("Missing idea id", 400);
    const id = await resolveEntityId(ctx, userId, "ideas", rawId);
    if (!id) return err("Idea not found", 404);
    try {
      const result = await ctx.runMutation(internal.ideas._remove, {
        userId,
        id,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/ideas/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/ideas");
    const action = extractAction(url, "/api/v1/ideas");

    if (action === "promote" && rawId) {
      const id = await resolveEntityId(ctx, userId, "ideas", rawId);
      if (!id) return err("Idea not found", 404);
      const body = await parseBody(request);
      try {
        const result = await ctx.runMutation(internal.ideas._promote, {
          userId,
          id,
          projectTitle: ((body.projectTitle ?? body.project_title) as string),
        });
        return json({ data: result }, 201);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Promote failed";
        return err(message, 404);
      }
    }

    return err("Unknown ideas action", 400);
  }),
});

// ════════════════════════════════════════════════════════
// THOUGHTS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/thoughts",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/thoughts",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const result = await ctx.runQuery(internal.thoughts._list, { userId });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/thoughts",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    const thought = await ctx.runMutation(internal.thoughts._create, {
      userId,
      content: body.content as string,
      title: (body.title ?? undefined) as string | undefined,
    });
    return json({ data: thought }, 201);
  }),
});

http.route({
  pathPrefix: "/api/v1/thoughts/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/thoughts/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/thoughts");
    if (!rawId) return err("Missing thought id", 400);
    const id = await resolveEntityId(ctx, userId, "thoughts", rawId);
    if (!id) return err("Thought not found", 404);
    const thought = await ctx.runQuery(internal.thoughts._get, { userId, id });
    if (!thought) return err("Thought not found", 404);
    return json({ data: thought });
  }),
});

http.route({
  pathPrefix: "/api/v1/thoughts/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/thoughts");
    if (!rawId) return err("Missing thought id", 400);
    const id = await resolveEntityId(ctx, userId, "thoughts", rawId);
    if (!id) return err("Thought not found", 404);
    try {
      const result = await ctx.runMutation(internal.thoughts._remove, {
        userId,
        id,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/thoughts/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/thoughts");
    if (!rawId) return err("Missing thought id", 400);
    const id = await resolveEntityId(ctx, userId, "thoughts", rawId);
    if (!id) return err("Thought not found", 404);
    const body = await parseBody(request);
    try {
      const result = await ctx.runMutation(internal.thoughts._update, {
        userId, id,
        content: (body.content ?? undefined) as string | undefined,
        title: (body.title ?? undefined) as string | undefined,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// WINS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/wins",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/wins",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.wins._list, {
      userId,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/wins",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    const win = await ctx.runMutation(internal.wins._create, {
      userId,
      content: body.content as string,
      entryDate: ((body.entryDate ?? body.entry_date) ?? undefined) as string | undefined,
    });
    return json({ data: win }, 201);
  }),
});

http.route({
  pathPrefix: "/api/v1/wins/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/wins/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/wins");
    if (!rawId) return err("Missing win id", 400);
    const id = await resolveEntityId(ctx, userId, "wins", rawId);
    if (!id) return err("Win not found", 404);
    const win = await ctx.runQuery(internal.wins._get, { userId, id });
    if (!win) return err("Win not found", 404);
    return json({ data: win });
  }),
});

http.route({
  pathPrefix: "/api/v1/wins/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/wins");
    if (!rawId) return err("Missing win id", 400);
    const id = await resolveEntityId(ctx, userId, "wins", rawId);
    if (!id) return err("Win not found", 404);
    const body = await parseBody(request);
    try {
      const win = await ctx.runMutation(internal.wins._update, {
        userId,
        id,
        content: (body.content ?? undefined) as string | undefined,
      });
      return json({ data: win });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/wins/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/wins");
    if (!rawId) return err("Missing win id", 400);
    const id = await resolveEntityId(ctx, userId, "wins", rawId);
    if (!id) return err("Win not found", 404);
    try {
      const result = await ctx.runMutation(internal.wins._remove, { userId, id });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// RESOURCES
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/resources",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/resources",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.resources._list, {
      userId,
      type: url.searchParams.get("type") ?? undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/resources",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    const resource = await ctx.runMutation(internal.resources._create, {
      userId,
      title: body.title as string,
      url: (body.url ?? undefined) as string | undefined,
      content: (body.content ?? undefined) as string | undefined,
      type: (body.type ?? undefined) as string | undefined,
    });
    return json({ data: resource }, 201);
  }),
});

http.route({
  pathPrefix: "/api/v1/resources/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/resources/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/resources");
    if (!rawId) return err("Missing resource id", 400);
    const id = await resolveEntityId(ctx, userId, "resources", rawId);
    if (!id) return err("Resource not found", 404);
    const resource = await ctx.runQuery(internal.resources._get, { userId, id });
    if (!resource) return err("Resource not found", 404);
    return json({ data: resource });
  }),
});

http.route({
  pathPrefix: "/api/v1/resources/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/resources");
    if (!rawId) return err("Missing resource id", 400);
    const id = await resolveEntityId(ctx, userId, "resources", rawId);
    if (!id) return err("Resource not found", 404);
    const body = await parseBody(request);
    try {
      const resource = await ctx.runMutation(internal.resources._update, {
        userId,
        id,
        title: (body.title ?? undefined) as string | undefined,
        url: (body.url ?? undefined) as string | undefined,
        content: (body.content ?? undefined) as string | undefined,
        type: (body.type ?? undefined) as string | undefined,
      });
      return json({ data: resource });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/resources/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/resources");
    if (!rawId) return err("Missing resource id", 400);
    const id = await resolveEntityId(ctx, userId, "resources", rawId);
    if (!id) return err("Resource not found", 404);
    try {
      const result = await ctx.runMutation(internal.resources._remove, {
        userId,
        id,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/reviews",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/reviews",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.reviews._list, {
      userId,
      reviewType: url.searchParams.get("type") ?? undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/reviews",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    const review = await ctx.runMutation(internal.reviews._create, {
      userId,
      reviewType: (body.reviewType ?? body.review_type) as string,
      periodStart: (body.periodStart ?? body.period_start) as string,
      periodEnd: (body.periodEnd ?? body.period_end) as string,
      content: body.content,
      score: (body.score ?? undefined) as number | undefined,
    });
    return json({ data: review }, 201);
  }),
});

http.route({
  pathPrefix: "/api/v1/reviews/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/reviews/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/reviews");
    if (!rawId) return err("Missing review id", 400);
    const id = await resolveEntityId(ctx, userId, "reviews", rawId);
    if (!id) return err("Review not found", 404);
    const review = await ctx.runQuery(internal.reviews._get, { userId, id });
    if (!review) return err("Review not found", 404);
    return json({ data: review });
  }),
});

http.route({
  pathPrefix: "/api/v1/reviews/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/reviews");
    if (!rawId) return err("Missing review id", 400);
    const id = await resolveEntityId(ctx, userId, "reviews", rawId);
    if (!id) return err("Review not found", 404);
    try {
      const result = await ctx.runMutation(internal.reviews._remove, { userId, id });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// REMINDERS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/reminders",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/reminders",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.reminders._list, {
      userId,
      status: url.searchParams.get("status") ?? undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/reminders",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    const reminder = await ctx.runMutation(internal.reminders._create, {
      userId,
      title: body.title as string,
      body: (body.body ?? undefined) as string | undefined,
      scheduledAt: toEpoch(body.scheduledAt ?? body.scheduled_at),
    });
    return json({ data: reminder }, 201);
  }),
});

http.route({
  pathPrefix: "/api/v1/reminders/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/reminders/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/reminders");
    if (!rawId) return err("Missing reminder id", 400);
    const id = await resolveEntityId(ctx, userId, "reminders", rawId);
    if (!id) return err("Reminder not found", 404);
    const reminder = await ctx.runQuery(internal.reminders._get, { userId, id });
    if (!reminder) return err("Reminder not found", 404);
    return json({ data: reminder });
  }),
});

http.route({
  pathPrefix: "/api/v1/reminders/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/reminders");
    if (!rawId) return err("Missing reminder id", 400);
    const id = await resolveEntityId(ctx, userId, "reminders", rawId);
    if (!id) return err("Reminder not found", 404);
    const body = await parseBody(request);
    try {
      const reminder = await ctx.runMutation(internal.reminders._update, {
        userId,
        id,
        title: (body.title ?? undefined) as string | undefined,
        body: (body.body ?? undefined) as string | undefined,
        scheduledAt: (body.scheduledAt ?? body.scheduled_at) != null ? toEpoch(body.scheduledAt ?? body.scheduled_at) : undefined,
        status: (body.status ?? undefined) as string | undefined,
      });
      return json({ data: reminder });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/reminders/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/reminders");
    if (!rawId) return err("Missing reminder id", 400);
    const id = await resolveEntityId(ctx, userId, "reminders", rawId);
    if (!id) return err("Reminder not found", 404);
    try {
      const result = await ctx.runMutation(internal.reminders._remove, {
        userId,
        id,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/reminders/",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/reminders");
    const action = extractAction(url, "/api/v1/reminders");

    if (action === "snooze" && rawId) {
      const id = await resolveEntityId(ctx, userId, "reminders", rawId);
      if (!id) return err("Reminder not found", 404);
      const body = await parseBody(request);
      try {
        const result = await ctx.runMutation(internal.reminders._snooze, {
          userId,
          id,
          minutes: body.minutes as number,
        });
        return json({ data: result });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Snooze failed";
        return err(message, 404);
      }
    }

    if (action === "done" && rawId) {
      const id = await resolveEntityId(ctx, userId, "reminders", rawId);
      if (!id) return err("Reminder not found", 404);
      try {
        const result = await ctx.runMutation(internal.reminders._markDone, {
          userId,
          id,
        });
        return json({ data: result });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Mark done failed";
        return err(message, 404);
      }
    }

    return err("Unknown reminders action", 400);
  }),
});

// ════════════════════════════════════════════════════════
// DASHBOARD CONFIG
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/dashboard/config",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/dashboard/config",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const result = await ctx.runQuery(internal.dashboardConfig._get, { userId });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/dashboard/config",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody<{
      navMode?: string;
      navOrder?: string[];
      navHidden?: string[];
      pagePresets?: Record<string, string>;
      customTheme?: unknown;
    }>(request);
    try {
      const result = await ctx.runMutation(internal.dashboardConfig._update, {
        userId,
        navMode: (body.navMode ?? undefined) as string | undefined,
        navOrder: (body.navOrder ?? undefined) as string[] | undefined,
        navHidden: (body.navHidden ?? undefined) as string[] | undefined,
        pagePresets: body.pagePresets ?? undefined,
        customTheme: body.customTheme ?? undefined,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 400);
    }
  }),
});

http.route({
  path: "/api/v1/dashboard/nav-mode",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/dashboard/nav-mode",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody<{ mode: string }>(request);
    if (!body.mode) return err("mode is required", 400);
    try {
      const result = await ctx.runMutation(internal.dashboardConfig._setNavMode, {
        userId,
        mode: body.mode,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 400);
    }
  }),
});

http.route({
  path: "/api/v1/dashboard/nav-order",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/dashboard/nav-order",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody<{ order: string[] }>(request);
    if (!body.order || !Array.isArray(body.order)) return err("order is required (array of strings)", 400);
    try {
      const result = await ctx.runMutation(internal.dashboardConfig._setNavOrder, {
        userId,
        order: body.order,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 400);
    }
  }),
});

http.route({
  path: "/api/v1/dashboard/preset",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/dashboard/preset",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody<{ page: string; preset: string }>(request);
    if (!body.page || !body.preset) return err("page and preset are required", 400);
    try {
      const result = await ctx.runMutation(internal.dashboardConfig._setPagePreset, {
        userId,
        page: body.page,
        preset: body.preset,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 400);
    }
  }),
});

http.route({
  path: "/api/v1/dashboard/visibility",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/dashboard/visibility",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody<{ page: string; visible: boolean }>(request);
    if (!body.page || body.visible === undefined) return err("page and visible are required", 400);
    try {
      const result = await ctx.runMutation(internal.dashboardConfig._toggleVisibility, {
        userId,
        page: body.page,
        visible: body.visible,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 400);
    }
  }),
});

http.route({
  path: "/api/v1/dashboard/reset",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/dashboard/reset",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    try {
      const result = await ctx.runMutation(internal.dashboardConfig._reset, { userId });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Reset failed";
      return err(message, 400);
    }
  }),
});

// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// SEARCH
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/search",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/search",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    if (!q || q.trim().length === 0) {
      return err("Query parameter q is required", 400);
    }
    try {
      const result = await ctx.runQuery(internal.search._search, {
        userId,
        q,
        types: url.searchParams.get("type") ?? url.searchParams.get("types") ?? undefined,
      });
      return json(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Search failed";
      return err(message, 400);
    }
  }),
});

// ════════════════════════════════════════════════════════
// MUTATIONS (log + undo)
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/mutations",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/mutations",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseFloat(limitParam) : undefined;
    const result = await ctx.runQuery(internal.mutationLog._list, { userId, limit });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/mutations/undo",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/mutations/undo",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    try {
      const result = await ctx.runMutation(internal.mutationLog._undo, { userId });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Undo failed";
      if (message.includes("No mutations")) return err(message, 404);
      return err(message, 400);
    }
  }),
});

// ════════════════════════════════════════════════════════
// TRIGGERS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/triggers/morning-briefing",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/triggers/morning-briefing",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const result = await ctx.runQuery(internal.triggers._morningBriefing, { userId });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/triggers/daily-review",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/triggers/daily-review",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const result = await ctx.runQuery(internal.triggers._dailyReview, { userId });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/triggers/weekly-review",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/triggers/weekly-review",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const result = await ctx.runQuery(internal.triggers._weeklyReview, { userId });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/triggers/overdue-triage",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/triggers/overdue-triage",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const result = await ctx.runQuery(internal.triggers._overdueTriage, { userId });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/triggers/reminder-check",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/triggers/reminder-check",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const result = await ctx.runQuery(internal.triggers._reminderCheck, { userId });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/triggers/goal-health",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/triggers/goal-health",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const result = await ctx.runQuery(internal.triggers._goalHealth, { userId });
    return json(result);
  }),
});

// ════════════════════════════════════════════════════════
// AUTH - API Key delete (dynamic path)
// ════════════════════════════════════════════════════════

http.route({
  pathPrefix: "/api/v1/auth/api-keys/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/auth/api-keys/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawKeyId = extractId(url, "/api/v1/auth/api-keys");
    if (!rawKeyId) return err("Missing key id", 400);
    const keyId = await resolveEntityId(ctx, userId, "apiKeys", rawKeyId);
    if (!keyId) return err("API key not found", 404);
    try {
      const result = await ctx.runMutation(internal.authHelpers._deleteApiKey, {
        userId,
        keyId,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ── Convex Auth routes ───────────────────────────────
auth.addHttpRoutes(http);

// ═══════════════════════════════════════════════════════════
// Hosted deployment routes (ported from ClawNow)
// ═══════════════════════════════════════════════════════════


// ── Stripe Webhook ───────────────────────────────────
registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    "payment_intent.succeeded": async (ctx, event) => {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata;
      const userSubject = metadata?.userId;
      const priceId = metadata?.priceId;
      if (!userSubject || !priceId) return;
      const docId = userSubject.split("|")[0] as Id<"users">;
      const tiers = getCreditTiers();
      const creditAmount = tiers[priceId];
      if (!creditAmount) {
        const amount = paymentIntent.amount_received;
        if (amount > 0) {
          await ctx.runMutation(internal.stripe.creditBalance, { userId: docId, amount });
        }
        return;
      }
      await ctx.runMutation(internal.stripe.creditBalance, { userId: docId, amount: creditAmount });
      const euros = (creditAmount / 100).toFixed(0);
      const email = await ctx.runQuery(internal.deploymentQueries.getUserEmail, { userId: docId });
    },

    "customer.subscription.created": async (ctx, event) => {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;
      const userSubject = metadata?.userId;
      const planType = metadata?.planType as "dashboard" | "byok" | "basic" | "standard" | "premium" | undefined;
      if (!userSubject || !planType) return;
      const docId = userSubject.split("|")[0] as Id<"users">;
      const priceId = subscription.items.data[0]?.price?.id ?? "";
      const allPlans = getSubscriptionPlans();
      const plan = allPlans[priceId];
      const componentSub = await ctx.runQuery(components.stripe.public.getSubscription, { stripeSubscriptionId: subscription.id });
      const currentPeriodEnd = componentSub?.currentPeriodEnd ? componentSub.currentPeriodEnd * 1000 : Date.now();
      await ctx.runMutation(internal.stripe.upsertSubscription, {
        userId: docId, stripeSubscriptionId: subscription.id, stripePriceId: priceId,
        planType, status: "active", currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        includedCreditsCents: plan?.includedCreditsCents ?? 0,
      });
      const credits = plan?.includedCreditsCents ?? 0;
      if (credits > 0) {
        await ctx.runMutation(internal.stripe.creditBalance, { userId: docId, amount: credits });
      }
      const planLabel = plan?.label ?? planType ?? "unknown";
      const priceEur = plan ? (plan.priceEuroCents / 100).toFixed(0) : "?";
      const email = await ctx.runQuery(internal.deploymentQueries.getUserEmail, { userId: docId });
    },

    "customer.subscription.updated": async (ctx, event) => {
      const subscription = event.data.object as Stripe.Subscription;
      const existing = await ctx.runQuery(internal.stripe.getSubscriptionByStripeId, { stripeSubscriptionId: subscription.id });
      if (!existing) return;
      const statusMap: Record<string, "active" | "past_due" | "canceled" | "unpaid"> = {
        active: "active", past_due: "past_due", canceled: "canceled", unpaid: "unpaid",
      };
      const componentSub = await ctx.runQuery(components.stripe.public.getSubscription, { stripeSubscriptionId: subscription.id });
      const currentPeriodEnd = componentSub?.currentPeriodEnd ? componentSub.currentPeriodEnd * 1000 : Date.now();
      await ctx.runMutation(internal.stripe.upsertSubscription, {
        userId: existing.userId, stripeSubscriptionId: subscription.id,
        stripePriceId: existing.stripePriceId, planType: existing.planType,
        status: statusMap[subscription.status] ?? "active", currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        includedCreditsCents: existing.includedCreditsCents,
      });
    },

    "customer.subscription.deleted": async (ctx, event) => {
      const subscription = event.data.object as Stripe.Subscription;
      const userSubject = subscription.metadata?.userId;
      const planType = subscription.metadata?.planType ?? "unknown";
      await ctx.runMutation(internal.stripe.handleSubscriptionDeleted, { stripeSubscriptionId: subscription.id });
      let email: string | null = null;
      if (userSubject) {
        const uid = userSubject.split("|")[0] as Id<"users">;
        email = await ctx.runQuery(internal.deploymentQueries.getUserEmail, { userId: uid });
      }
    },

    "invoice.paid": async (ctx, event) => {
      const invoice = event.data.object as Stripe.Invoice;
      const billingReason = (invoice as unknown as Record<string, unknown>).billing_reason as string | undefined;
      if (billingReason === "subscription_create") return;
      const subRef = invoice.parent?.subscription_details?.subscription;
      if (!subRef) return;
      const stripeSubId = typeof subRef === "string" ? subRef : subRef.id;
      const sub = await ctx.runQuery(internal.stripe.getSubscriptionByStripeId, { stripeSubscriptionId: stripeSubId });
      if (!sub || sub.includedCreditsCents <= 0) return;
      await ctx.runMutation(internal.stripe.creditBalance, { userId: sub.userId, amount: sub.includedCreditsCents });
    },

    "invoice.payment_failed": async (_ctx, event) => {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn(`[stripe] Invoice payment failed: ${invoice.id}`);
    },
  },
});

// ════════════════════════════════════════════════════════
// IDENTITY
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/identity",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/identity",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const result = await ctx.runQuery(internal.identity._get, { userId });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/identity",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    if (!body.statement || typeof body.statement !== "string") {
      return err("statement is required");
    }
    try {
      const result = await ctx.runMutation(internal.identity._upsert, {
        userId,
        statement: body.statement as string,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upsert failed";
      return err(message, 400);
    }
  }),
});

// ════════════════════════════════════════════════════════
// VISION BOARD
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/vision-board",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/vision-board",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const result = await ctx.runQuery(internal.visionBoard._list, { userId });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/vision-board",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    if (!body.imageUrl || typeof body.imageUrl !== "string") {
      return err("imageUrl is required");
    }
    try {
      const item = await ctx.runMutation(internal.visionBoard._add, {
        userId,
        imageUrl: body.imageUrl as string,
        caption: (body.caption ?? undefined) as string | undefined,
      });
      return json({ data: item }, 201);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Create failed";
      return err(message, 400);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/vision-board/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/vision-board/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/vision-board");
    if (!rawId) return err("Missing vision board item id", 400);
    const id = await resolveEntityId(ctx, userId, "visionBoard", rawId);
    if (!id) return err("Vision board item not found", 404);
    const body = await parseBody(request);
    try {
      const result = await ctx.runMutation(internal.visionBoard._update, {
        userId, id,
        imageUrl: (body.imageUrl ?? undefined) as string | undefined,
        caption: (body.caption ?? undefined) as string | undefined,
        position: (body.position ?? undefined) as number | undefined,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/vision-board/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/vision-board");
    if (!rawId) return err("Missing vision board item id", 400);
    const id = await resolveEntityId(ctx, userId, "visionBoard", rawId);
    if (!id) return err("Vision board item not found", 404);
    try {
      const result = await ctx.runMutation(internal.visionBoard._remove, {
        userId,
        id,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ── Feedback ────────────────────────────────────────

http.route({
  path: "/api/v1/feedback",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/feedback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody<{ title?: string; type?: string; description?: string; context?: string }>(request);
    if (!body.title) return err("title is required");
    if (!body.description) return err("description is required");
    const feedbackType = ["bug", "feature", "general"].includes(body.type ?? "") ? body.type! : "general";
    const result = await ctx.runAction(internal.feedback.submitFeedback, {
      userId,
      title: body.title,
      feedbackType,
      description: body.description,
      context: body.context,
    });
    return json({ data: result });
  }),
});

// ── Pod Registration (init container callback) ───────
http.route({
  path: "/api/registerPod",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
    const token = authHeader.slice(7);
    const jwtSecret = serverEnv.JWT_SIGNING_KEY;
    if (!jwtSecret) return new Response("JWT not configured", { status: 500 });
    const parts = token.split(".");
    if (parts.length !== 3) return new Response("Invalid JWT", { status: 401 });
    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(jwtSecret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigStr = signatureB64.replace(/-/g, "+").replace(/_/g, "/");
    const sigBuf = Uint8Array.from(atob(sigStr), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBuf, encoder.encode(data));
    if (!valid) return new Response("Invalid JWT signature", { status: 401 });
    const payloadStr = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadStr) as { sub: string; sid: string };
    const body = (await request.json()) as { podIp: string };
    const dep = await ctx.runQuery(internal.deploymentQueries.getDeploymentBySubdomain, { subdomain: payload.sid });
    if (!dep) return new Response("Deployment not found", { status: 404 });
    await ctx.runMutation(internal.deploymentQueries.updateDeploymentStatus, { deploymentId: dep._id, status: "starting", podIp: body.podIp });
    await ctx.scheduler.runAfter(0, internal.deploymentHealthCheck.checkDeploymentHealth, { deploymentId: dep._id, subdomain: dep.subdomain, attempt: 0 });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

// ── Balance Sync (AI Gateway -> Convex) ──────────────
http.route({
  path: "/api/syncBalances",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const systemKey = request.headers.get("X-System-Key");
    if (!systemKey || systemKey !== serverEnv.GATEWAY_SYSTEM_KEY) return new Response("Unauthorized", { status: 401 });
    const entries = (await request.json()) as Array<{ podSecret: string; currentBalance: number }>;
    for (const { podSecret, currentBalance } of entries) {
      const dep = await ctx.runQuery(internal.deploymentQueries.getDeploymentByPodSecret, { podSecret });
      if (dep) await ctx.runMutation(internal.stripe.setBalance, { userId: dep.userId, amount: currentBalance });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

// ── Suspend Deployment (AI Gateway -> Convex) ────────
http.route({
  path: "/api/suspendDeployment",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const systemKey = request.headers.get("X-System-Key");
    if (!systemKey || systemKey !== serverEnv.GATEWAY_SYSTEM_KEY) return new Response("Unauthorized", { status: 401 });
    const { podSecret } = (await request.json()) as { podSecret: string };
    if (!podSecret) return new Response("Missing podSecret", { status: 400 });
    const dep = await ctx.runQuery(internal.deploymentQueries.getDeploymentByPodSecret, { podSecret });
    if (!dep) return new Response("Deployment not found", { status: 404 });
    if (["deactivated", "deactivating", "suspended"].includes(dep.status)) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    await ctx.scheduler.runAfter(0, internal.deploymentActions.suspendForInsufficientBalance, { deploymentId: dep._id });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

// ── Desired State (Reconciler) ───────────────────────
http.route({
  path: "/api/getDesiredState",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const systemKey = req.headers.get("X-System-Key");
    if (!systemKey || systemKey !== serverEnv.GATEWAY_SYSTEM_KEY) return new Response("Unauthorized", { status: 401 });
    const state = await ctx.runQuery(internal.deploymentQueries.getDesiredState, {});
    return new Response(JSON.stringify(state), { status: 200, headers: { "Content-Type": "application/json" } });
  }),
});

// ════════════════════════════════════════════════════════
// WORKOUTS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/workouts",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/workouts/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/workouts",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.workouts._list, {
      userId,
      type: url.searchParams.get("type") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      programmeId: url.searchParams.get("programmeId") ?? url.searchParams.get("programme_id") ?? undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/workouts",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    try {
      const workout = await ctx.runMutation(internal.workouts._create, {
        userId,
        workoutDate: (body.workoutDate ?? body.workout_date ?? body.date) as string,
        type: body.type as string,
        title: body.title as string,
        durationMinutes: (body.durationMinutes ?? body.duration_minutes ?? body.duration ?? undefined) as number | undefined,
        exercises: (body.exercises ?? undefined) as any,
        notes: (body.notes ?? undefined) as string | undefined,
        programmeId: (body.programmeId ?? body.programme_id ?? undefined) as string | undefined,
      });
      return json({ data: workout }, 201);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Create failed";
      return err(message, 400);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/workouts/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/workouts");
    if (!rawId) return err("Missing workout id", 400);
    const id = await resolveEntityId(ctx, userId, "workouts", rawId);
    if (!id) return err("Workout not found", 404);
    const workout = await ctx.runQuery(internal.workouts._get, { userId, id });
    if (!workout) return err("Workout not found", 404);
    return json({ data: workout });
  }),
});

http.route({
  pathPrefix: "/api/v1/workouts/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/workouts");
    if (!rawId) return err("Missing workout id", 400);
    const id = await resolveEntityId(ctx, userId, "workouts", rawId);
    if (!id) return err("Workout not found", 404);
    const body = await parseBody(request);
    try {
      const workout = await ctx.runMutation(internal.workouts._update, {
        userId,
        id,
        workoutDate: (body.workoutDate ?? body.workout_date ?? undefined) as string | undefined,
        type: (body.type ?? undefined) as string | undefined,
        title: (body.title ?? undefined) as string | undefined,
        durationMinutes: (body.durationMinutes ?? body.duration_minutes ?? undefined) as number | undefined,
        exercises: (body.exercises ?? undefined) as any,
        notes: (body.notes ?? undefined) as string | undefined,
        programmeId: (body.programmeId ?? body.programme_id ?? undefined) as string | undefined,
      });
      return json({ data: workout });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/workouts/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/workouts");
    if (!rawId) return err("Missing workout id", 400);
    const id = await resolveEntityId(ctx, userId, "workouts", rawId);
    if (!id) return err("Workout not found", 404);
    try {
      const result = await ctx.runMutation(internal.workouts._remove, { userId, id });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// PROGRAMMES
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/programmes",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/programmes/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/programmes",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.programmes._list, {
      userId,
      status: url.searchParams.get("status") ?? undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/programmes",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    try {
      const programme = await ctx.runMutation(internal.programmes._create, {
        userId,
        title: body.title as string,
        description: (body.description ?? undefined) as string | undefined,
        status: (body.status ?? undefined) as string | undefined,
        startDate: (body.startDate ?? body.start_date) as string,
        endDate: (body.endDate ?? body.end_date ?? undefined) as string | undefined,
        notes: (body.notes ?? undefined) as string | undefined,
      });
      return json({ data: programme }, 201);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Create failed";
      return err(message, 400);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/programmes/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/programmes");
    if (!rawId) return err("Missing programme id", 400);
    const id = await resolveEntityId(ctx, userId, "programmes", rawId);
    if (!id) return err("Programme not found", 404);
    const programme = await ctx.runQuery(internal.programmes._get, { userId, id });
    if (!programme) return err("Programme not found", 404);
    return json({ data: programme });
  }),
});

http.route({
  pathPrefix: "/api/v1/programmes/",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/programmes");
    if (!rawId) return err("Missing programme id", 400);
    const id = await resolveEntityId(ctx, userId, "programmes", rawId);
    if (!id) return err("Programme not found", 404);
    const body = await parseBody(request);
    try {
      const programme = await ctx.runMutation(internal.programmes._update, {
        userId,
        id,
        title: (body.title ?? undefined) as string | undefined,
        description: (body.description ?? undefined) as string | undefined,
        status: (body.status ?? undefined) as string | undefined,
        startDate: (body.startDate ?? body.start_date ?? undefined) as string | undefined,
        endDate: (body.endDate ?? body.end_date ?? undefined) as string | undefined,
        notes: (body.notes ?? undefined) as string | undefined,
      });
      return json({ data: programme });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 404);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/programmes/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/programmes");
    if (!rawId) return err("Missing programme id", 400);
    const id = await resolveEntityId(ctx, userId, "programmes", rawId);
    if (!id) return err("Programme not found", 404);
    try {
      const result = await ctx.runMutation(internal.programmes._remove, { userId, id });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// FOOD LOG
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/food-log",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  pathPrefix: "/api/v1/food-log/",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/food-log",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.foodLog._list, {
      userId,
      entryDate: url.searchParams.get("date") ?? url.searchParams.get("entryDate") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/food-log",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    try {
      const entry = await ctx.runMutation(internal.foodLog._create, {
        userId,
        entryDate: (body.entryDate ?? body.entry_date ?? body.date) as string,
        name: body.name as string,
        mealType: (body.mealType ?? body.meal_type ?? undefined) as string | undefined,
        calories: (body.calories ?? undefined) as number | undefined,
        protein: (body.protein ?? undefined) as number | undefined,
        carbs: (body.carbs ?? undefined) as number | undefined,
        fat: (body.fat ?? undefined) as number | undefined,
        quantity: (body.quantity ?? undefined) as string | undefined,
      });
      return json({ data: entry }, 201);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Create failed";
      return err(message, 400);
    }
  }),
});

http.route({
  pathPrefix: "/api/v1/food-log/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/food-log");

    // GET /api/v1/food-log/totals?date=YYYY-MM-DD
    if (rawId === "totals") {
      const date = url.searchParams.get("date") ?? new Date().toISOString().split("T")[0];
      const totals = await ctx.runQuery(internal.foodLog._dailyTotals, { userId, entryDate: date });
      return json({ data: totals });
    }

    return err("Not found", 404);
  }),
});

http.route({
  pathPrefix: "/api/v1/food-log/",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const rawId = extractId(url, "/api/v1/food-log");
    if (!rawId) return err("Missing food log id", 400);
    const id = await resolveEntityId(ctx, userId, "foodLog", rawId);
    if (!id) return err("Food log entry not found", 404);
    try {
      const result = await ctx.runMutation(internal.foodLog._remove, { userId, id });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
      return err(message, 404);
    }
  }),
});

// ════════════════════════════════════════════════════════
// HEALTH SUMMARY
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/health/summary",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/health/summary",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    let weekStart = url.searchParams.get("week") ?? undefined;
    if (!weekStart) {
      // Default to current week's Monday
      const now = new Date();
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      weekStart = monday.toISOString().split("T")[0];
    }
    const result = await ctx.runQuery(internal.workouts._summary, {
      userId,
      weekStart,
    });
    return json({ data: result });
  }),
});

// ════════════════════════════════════════════════════════
// MACRO GOALS
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/macro-goals",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/macro-goals",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const goals = await ctx.runQuery(internal.macroGoals._get, { userId });
    return json({ data: goals });
  }),
});

http.route({
  path: "/api/v1/macro-goals",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    try {
      const body = await request.json();
      const toNum = (v: unknown): number | undefined => {
        if (v == null) return undefined;
        const n = Number(v);
        if (!isFinite(n) || n <= 0) return undefined;
        return n;
      };
      const result = await ctx.runMutation(internal.macroGoals._upsert, {
        userId,
        calories: toNum(body.calories),
        protein: toNum(body.protein),
        carbs: toNum(body.carbs),
        fat: toNum(body.fat),
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Update failed";
      return err(message, 400);
    }
  }),
});

export default http;
