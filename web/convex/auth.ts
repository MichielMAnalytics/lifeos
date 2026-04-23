import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Workspace scopes we request alongside basic profile/email so a single
// Google sign-in covers the whole integration. Keep this list authoritative —
// downstream actions (googleCalendar, googleGmail, …) rely on these being
// granted. If we add a new service later, add the scope here AND tell the
// user to "Reconnect Google" in Settings → Integrations so they get a fresh
// consent screen with the new scope.
const GOOGLE_WORKSPACE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/contacts.readonly",
] as const;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: GOOGLE_WORKSPACE_SCOPES.join(" "),
          // `offline` returns a refresh_token — needed to refresh expired
          // access tokens without forcing the user to re-authorise.
          access_type: "offline",
          // `consent` (instead of `select_account`) forces Google to show
          // the consent screen every sign-in. We need this so existing users
          // get prompted to grant the new Workspace scopes the first time
          // they sign in after this ships. Without `consent`, Google
          // silently re-uses the previously-granted (smaller) scope set.
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    // Schedules a token-capture action after each successful sign-in.
    // Runs in mutation context (no fetch / no Secret Manager from here),
    // so we hand off to a Node action via the scheduler. Failure to
    // schedule must not block sign-in — log and move on. The provider
    // type is the @auth/core config object, not a plain string, so we
    // probe `.id` to detect Google.
    async afterUserCreatedOrUpdated(ctx, args) {
      try {
        const providerId =
          typeof args.provider === "string"
            ? args.provider
            : ((args.provider as { id?: string } | undefined)?.id ?? "");
        if (providerId !== "google" || !args.profile) return;
        await ctx.scheduler.runAfter(0, internal.googleAuth._captureTokens, {
          userId: args.userId as Id<"users">,
          profile: args.profile as Record<string, unknown>,
        });
      } catch (err) {
        console.error("[auth] schedule capture tokens failed", err);
      }
    },
  },
});
