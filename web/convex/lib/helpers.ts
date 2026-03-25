// ── Date helpers ──────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function weekFromNowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

/**
 * Get the Monday of the current week as "YYYY-MM-DD".
 */
export function mondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Return start-of-day epoch ms for a "YYYY-MM-DD" string (UTC).
 */
export function dateToEpoch(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getTime();
}

// ── CORS headers ─────────────────────────────────────

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

// ── JSON response helper ─────────────────────────────

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

export function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status);
}
