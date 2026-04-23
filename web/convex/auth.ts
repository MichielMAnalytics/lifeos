import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Sign-in scopes — kept to the non-sensitive set so Google doesn't gate
// the consent screen behind verification or test-user allow-listing.
//
// We *would* like Calendar / Gmail / Drive / Tasks / Docs / Sheets /
// Contacts here, but those are "sensitive" or "restricted" scopes that
// trigger Google's verification flow. While the OAuth app sits in
// "Testing" mode (managed in Google Cloud Console — Michiel-only), only
// allow-listed test users can sign in if those scopes are requested. We
// can't reach Console from LifeOS, so the only code-only fix is to keep
// sign-in lean.
//
// Workspace features (Calendar, etc.) live behind a separate "Connect"
// flow we can ship later once the app is verified or the user is added
// as a test user. The integration code (googleCalendar.ts, googleAuth.ts,
// googleAuthHelpers.ts) stays — it just isn't reachable from sign-in
// until the consent gate opens up.
const GOOGLE_SIGNIN_SCOPES = [
  "openid",
  "email",
  "profile",
] as const;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: GOOGLE_SIGNIN_SCOPES.join(" "),
          // `select_account` lets users pick which Google account to use
          // without forcing a consent screen on every sign-in.
          prompt: "select_account",
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
