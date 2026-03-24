import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { auth } from "./auth";

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

/** Safe JSON body parse with type assertion */
async function parseBody<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    return {} as T;
  }
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
// AUTH routes (no API key needed for register/login)
// ════════════════════════════════════════════════════════

http.route({
  path: "/api/v1/auth/register",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/auth/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await parseBody<{ email: string; password: string; name?: string; timezone?: string }>(request);
      const user = await ctx.runAction(api.apiKeyAuth.register, {
        email: body.email,
        password: body.password,
        name: body.name,
        timezone: body.timezone,
      });
      return json({ data: user }, 201);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Registration failed";
      if (message.includes("already registered")) return err(message, 409);
      return err(message, 400);
    }
  }),
});

http.route({
  path: "/api/v1/auth/login",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/auth/login",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await parseBody<{ email: string; password: string }>(request);
      const user = await ctx.runAction(api.apiKeyAuth.login, {
        email: body.email,
        password: body.password,
      });
      return json({ data: user });
    } catch {
      return err("Invalid email or password", 401);
    }
  }),
});

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
    const result = await ctx.runQuery(internal.tasks._list, {
      userId,
      status: url.searchParams.get("status") ?? undefined,
      due: url.searchParams.get("due") ?? undefined,
      ...(projectIdParam ? { projectId: projectIdParam as Id<"projects"> } : {}),
      ...(goalIdParam ? { goalId: goalIdParam as Id<"goals"> } : {}),
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
    const task = await ctx.runMutation(internal.tasks._create, {
      userId,
      title: body.title as string,
      notes: (body.notes ?? undefined) as string | undefined,
      dueDate: ((body.dueDate ?? body.due_date) ?? undefined) as string | undefined,
      projectId: ((body.projectId ?? body.project_id) ?? undefined) as Id<"projects"> | undefined,
      goalId: ((body.goalId ?? body.goal_id) ?? undefined) as Id<"goals"> | undefined,
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
    const id = extractId(url, "/api/v1/tasks");
    if (!id) return err("Missing task id", 400);
    const task = await ctx.runQuery(internal.tasks._get, { userId, id: id as Id<"tasks"> });
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
    const id = extractId(url, "/api/v1/tasks");
    if (!id) return err("Missing task id", 400);
    const body = await parseBody(request);
    try {
      const task = await ctx.runMutation(internal.tasks._update, {
        userId,
        id: id as Id<"tasks">,
        title: (body.title ?? undefined) as string | undefined,
        notes: (body.notes ?? undefined) as string | undefined,
        dueDate: ((body.dueDate ?? body.due_date) ?? undefined) as string | undefined,
        status: (body.status ?? undefined) as string | undefined,
        projectId: ((body.projectId ?? body.project_id) ?? undefined) as Id<"projects"> | undefined,
        goalId: ((body.goalId ?? body.goal_id) ?? undefined) as Id<"goals"> | undefined,
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
    const id = extractId(url, "/api/v1/tasks");
    if (!id) return err("Missing task id", 400);
    try {
      const result = await ctx.runMutation(internal.tasks._remove, {
        userId,
        id: id as Id<"tasks">,
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
    const id = extractId(url, "/api/v1/tasks");

    // POST /api/v1/tasks/bulk-complete
    if (id === "bulk-complete") {
      const body = await parseBody(request);
      const result = await ctx.runMutation(internal.tasks._bulkComplete, {
        userId,
        ids: body.ids as Id<"tasks">[],
      });
      return json({ data: result });
    }

    // POST /api/v1/tasks/:id/complete
    const action = extractAction(url, "/api/v1/tasks");
    if (action === "complete" && id) {
      try {
        const task = await ctx.runMutation(internal.tasks._complete, {
          userId,
          id: id as Id<"tasks">,
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
    const id = extractId(url, "/api/v1/projects");
    if (!id) return err("Missing project id", 400);
    const project = await ctx.runQuery(internal.projects._get, { userId, id: id as Id<"projects"> });
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
    const id = extractId(url, "/api/v1/projects");
    if (!id) return err("Missing project id", 400);
    const body = await parseBody(request);
    try {
      const project = await ctx.runMutation(internal.projects._update, {
        userId,
        id: id as Id<"projects">,
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
    const id = extractId(url, "/api/v1/projects");
    if (!id) return err("Missing project id", 400);
    try {
      const result = await ctx.runMutation(internal.projects._remove, {
        userId,
        id: id as Id<"projects">,
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
    const id = extractId(url, "/api/v1/goals");
    if (!id) return err("Missing goal id", 400);

    // Check for /goals/:id/health
    const action = extractAction(url, "/api/v1/goals");
    if (action === "health") {
      const health = await ctx.runQuery(internal.goals._health, {
        userId,
        id: id as Id<"goals">,
      });
      if (!health) return err("Goal not found", 404);
      return json({ data: health });
    }

    const goal = await ctx.runQuery(internal.goals._get, { userId, id: id as Id<"goals"> });
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
    const id = extractId(url, "/api/v1/goals");
    if (!id) return err("Missing goal id", 400);
    const body = await parseBody(request);
    try {
      const goal = await ctx.runMutation(internal.goals._update, {
        userId,
        id: id as Id<"goals">,
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
    const id = extractId(url, "/api/v1/goals");
    if (!id) return err("Missing goal id", 400);
    try {
      const result = await ctx.runMutation(internal.goals._remove, {
        userId,
        id: id as Id<"goals">,
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
    const result = await ctx.runMutation(internal.dayPlans._upsert, {
      userId,
      planDate: date,
      ...body,
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
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const id = extractId(url, "/api/v1/ideas");
    if (!id) return err("Missing idea id", 400);
    const body = await parseBody(request);
    try {
      const idea = await ctx.runMutation(internal.ideas._update, {
        userId,
        id: id as Id<"ideas">,
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
    const id = extractId(url, "/api/v1/ideas");
    if (!id) return err("Missing idea id", 400);
    try {
      const result = await ctx.runMutation(internal.ideas._remove, {
        userId,
        id: id as Id<"ideas">,
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
    const id = extractId(url, "/api/v1/ideas");
    const action = extractAction(url, "/api/v1/ideas");

    if (action === "promote" && id) {
      const body = await parseBody(request);
      try {
        const result = await ctx.runMutation(internal.ideas._promote, {
          userId,
          id: id as Id<"ideas">,
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
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const id = extractId(url, "/api/v1/thoughts");
    if (!id) return err("Missing thought id", 400);
    try {
      const result = await ctx.runMutation(internal.thoughts._remove, {
        userId,
        id: id as Id<"thoughts">,
      });
      return json({ data: result });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Delete failed";
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
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const id = extractId(url, "/api/v1/resources");
    if (!id) return err("Missing resource id", 400);
    const body = await parseBody(request);
    try {
      const resource = await ctx.runMutation(internal.resources._update, {
        userId,
        id: id as Id<"resources">,
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
    const id = extractId(url, "/api/v1/resources");
    if (!id) return err("Missing resource id", 400);
    try {
      const result = await ctx.runMutation(internal.resources._remove, {
        userId,
        id: id as Id<"resources">,
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
    const id = extractId(url, "/api/v1/reviews");
    if (!id) return err("Missing review id", 400);
    const review = await ctx.runQuery(internal.reviews._get, { userId, id: id as Id<"reviews"> });
    if (!review) return err("Review not found", 404);
    return json({ data: review });
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
      scheduledAt: (body.scheduledAt ?? body.scheduled_at) as number,
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
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const id = extractId(url, "/api/v1/reminders");
    if (!id) return err("Missing reminder id", 400);
    const body = await parseBody(request);
    try {
      const reminder = await ctx.runMutation(internal.reminders._update, {
        userId,
        id: id as Id<"reminders">,
        title: (body.title ?? undefined) as string | undefined,
        body: (body.body ?? undefined) as string | undefined,
        scheduledAt: ((body.scheduledAt ?? body.scheduled_at) ?? undefined) as number | undefined,
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
    const id = extractId(url, "/api/v1/reminders");
    if (!id) return err("Missing reminder id", 400);
    try {
      const result = await ctx.runMutation(internal.reminders._remove, {
        userId,
        id: id as Id<"reminders">,
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
    const id = extractId(url, "/api/v1/reminders");
    const action = extractAction(url, "/api/v1/reminders");

    if (action === "snooze" && id) {
      const body = await parseBody(request);
      try {
        const result = await ctx.runMutation(internal.reminders._snooze, {
          userId,
          id: id as Id<"reminders">,
          minutes: body.minutes as number,
        });
        return json({ data: result });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Snooze failed";
        return err(message, 404);
      }
    }

    if (action === "done" && id) {
      try {
        const result = await ctx.runMutation(internal.reminders._markDone, {
          userId,
          id: id as Id<"reminders">,
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
// FINANCE
// ════════════════════════════════════════════════════════

// ── Transactions ─────────────────────────────────────

http.route({
  path: "/api/v1/finance/transactions",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/finance/transactions",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.finance._listTransactions, {
      userId,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      categoryId: (url.searchParams.get("category_id") ??
        url.searchParams.get("categoryId") ?? undefined) as Id<"financeCategories"> | undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/finance/transactions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    const tx = await ctx.runMutation(internal.finance._createTransaction, {
      userId,
      date: body.date as string,
      amount: body.amount as number,
      currency: (body.currency ?? undefined) as string | undefined,
      categoryId: ((body.categoryId ?? body.category_id) ?? undefined) as Id<"financeCategories"> | undefined,
      merchant: (body.merchant ?? undefined) as string | undefined,
      notes: (body.notes ?? undefined) as string | undefined,
      source: (body.source ?? undefined) as string | undefined,
      externalId: ((body.externalId ?? body.external_id) ?? undefined) as string | undefined,
    });
    return json({ data: tx }, 201);
  }),
});

// ── Categories ───────────────────────────────────────

http.route({
  path: "/api/v1/finance/categories",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/finance/categories",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const result = await ctx.runQuery(internal.finance._listCategories, { userId });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/finance/categories",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    const category = await ctx.runMutation(internal.finance._createCategory, {
      userId,
      name: body.name as string,
      parentId: ((body.parentId ?? body.parent_id) ?? undefined) as Id<"financeCategories"> | undefined,
    });
    return json({ data: category }, 201);
  }),
});

// ── Net Worth ────────────────────────────────────────

http.route({
  path: "/api/v1/finance/net-worth",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
});

http.route({
  path: "/api/v1/finance/net-worth",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const url = new URL(request.url);
    const result = await ctx.runQuery(internal.finance._listNetWorth, {
      userId,
      latest: url.searchParams.get("latest") === "true" ? true : undefined,
    });
    return json(result);
  }),
});

http.route({
  path: "/api/v1/finance/net-worth",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const userId = await authenticate(ctx, request);
    if (!userId) return err("Unauthorized", 401);
    const body = await parseBody(request);
    const snapshot = await ctx.runMutation(internal.finance._createNetWorthSnapshot, {
      userId,
      date: body.date as string,
      breakdown: body.breakdown,
      total: body.total as number,
      notes: (body.notes ?? undefined) as string | undefined,
    });
    return json({ data: snapshot }, 201);
  }),
});

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
    const keyId = extractId(url, "/api/v1/auth/api-keys");
    if (!keyId) return err("Missing key id", 400);
    try {
      const result = await ctx.runMutation(internal.authHelpers._deleteApiKey, {
        userId,
        keyId: keyId as Id<"apiKeys">,
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

export default http;
