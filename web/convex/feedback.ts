"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { serverEnv } from "./deploymentEnv";

const REPO = "MichielMAnalytics/lifeos";
const GITHUB_API = "https://api.github.com";

const LABEL_MAP: Record<string, string> = {
  bug: "bug",
  feature: "enhancement",
  general: "question",
};

async function ensureLabel(token: string, label: string) {
  const res = await fetch(`${GITHUB_API}/repos/${REPO}/labels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: label }),
  });
  // 422 = already exists, which is fine
  if (!res.ok && res.status !== 422) {
    console.warn(`[feedback] Failed to create label "${label}": ${res.status}`);
  }
}

export const submitFeedback = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    feedbackType: v.string(),
    description: v.string(),
    context: v.optional(v.string()),
  },
  returns: v.object({
    issueNumber: v.number(),
    issueUrl: v.string(),
  }),
  handler: async (ctx, { userId, title, feedbackType, description, context }) => {
    const token = serverEnv.GITHUB_FEEDBACK_TOKEN;
    if (!token) throw new Error("Feedback submission is not configured");

    // Get submitter info
    const user = await ctx.runQuery(internal.authHelpers._getMe, { userId });
    const submitter = user?.name && user?.email
      ? `${user.name} (${user.email})`
      : user?.email ?? "anonymous";

    // Build issue body
    const sections = [
      `## Description\n\n${description}`,
      `## Submitted by\n\n${submitter}`,
    ];
    if (context) {
      sections.push(`## Environment\n\n\`\`\`\n${context}\n\`\`\``);
    }
    const body = sections.join("\n\n");

    // Ensure labels exist
    const typeLabel = LABEL_MAP[feedbackType] ?? "question";
    await ensureLabel(token, "feedback");
    await ensureLabel(token, typeLabel);

    // Create issue
    const res = await fetch(`${GITHUB_API}/repos/${REPO}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        labels: ["feedback", typeLabel],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub API error: ${res.status} ${errText}`);
    }

    const issue = await res.json() as { number: number; html_url: string };
    return { issueNumber: issue.number, issueUrl: issue.html_url };
  },
});
