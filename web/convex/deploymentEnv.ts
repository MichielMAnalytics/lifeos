import { z } from "zod";

const serverEnvSchema = z.object({
  CONVEX_SITE_URL: z.url(),
  STRIPE_PRICE_10: z.string().optional(),
  STRIPE_PRICE_25: z.string().optional(),
  STRIPE_PRICE_50: z.string().optional(),
  STRIPE_SUB_DASHBOARD: z.string().optional(),
  STRIPE_SUB_BYOK: z.string().optional(),
  STRIPE_SUB_BASIC: z.string().optional(),
  STRIPE_SUB_STANDARD: z.string().optional(),
  STRIPE_SUB_PREMIUM: z.string().optional(),
  SITE_URL: z.url().default("http://localhost:5173"),
  K8S_API_URL: z.string().optional(),
  JWT_SIGNING_KEY: z.string().optional(),
  GCP_SA_KEY: z.string().optional(),
  K8S_CA_CERT: z.string().optional(),
  GATEWAY_SYSTEM_KEY: z.string().optional(),
  AI_GATEWAY_INTERNAL_URL: z.string().optional(),
  AI_GATEWAY_K8S_SERVICE: z.string().default("ai-gateway"),
  OPENCLAW_IMAGE_TAG: z.string().optional(),
  GCP_PROJECT_ID: z.string().optional(),
  LIFEOS_DOMAIN: z.string().default("lifeos.zone"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const serverEnv: ServerEnv = serverEnvSchema.parse(process.env);

// ── One-time credit top-up tiers ────────────────────────────────────

const TIER_DEFS = [
  { key: "STRIPE_PRICE_10" as const, cents: 1000 },
  { key: "STRIPE_PRICE_25" as const, cents: 2500 },
  { key: "STRIPE_PRICE_50" as const, cents: 5000 },
];

export function getCreditTiers(): Record<string, number> {
  const tiers: Record<string, number> = {};
  for (const { key, cents } of TIER_DEFS) {
    const priceId = serverEnv[key];
    if (priceId) tiers[priceId] = cents;
  }
  return tiers;
}

export function getCreditTiersList(): Array<{
  priceId: string;
  label: string;
  cents: number;
}> {
  return TIER_DEFS.map(({ key, cents }) => ({
    priceId: serverEnv[key] ?? "",
    label: `EUR ${(cents / 100).toFixed(0)}`,
    cents,
  })).filter((t) => t.priceId !== "");
}

// ── Subscription plan definitions ───────────────────────────────────

const PLAN_DEFS = [
  {
    key: "STRIPE_SUB_DASHBOARD" as const,
    planType: "dashboard" as const,
    priceEuroCents: 1000,
    includedCreditsCents: 0,
    apiKeyMode: "none" as const,
    label: "Dashboard",
    includesDeployment: false,
  },
  {
    key: "STRIPE_SUB_BYOK" as const,
    planType: "byok" as const,
    priceEuroCents: 3000,
    includedCreditsCents: 0,
    apiKeyMode: "byok" as const,
    label: "BYOK",
    includesDeployment: true,
  },
  {
    key: "STRIPE_SUB_BASIC" as const,
    planType: "basic" as const,
    priceEuroCents: 4000,
    includedCreditsCents: 1000,
    apiKeyMode: "ours" as const,
    label: "Basic",
    includesDeployment: true,
  },
  {
    key: "STRIPE_SUB_STANDARD" as const,
    planType: "standard" as const,
    priceEuroCents: 5500,
    includedCreditsCents: 2500,
    apiKeyMode: "ours" as const,
    label: "Standard",
    includesDeployment: true,
  },
  {
    key: "STRIPE_SUB_PREMIUM" as const,
    planType: "premium" as const,
    priceEuroCents: 10500,
    includedCreditsCents: 5000,
    apiKeyMode: "ours" as const,
    label: "Premium",
    includesDeployment: true,
  },
];

export function getSubscriptionPlans(): Record<
  string,
  (typeof PLAN_DEFS)[number]
> {
  const plans: Record<string, (typeof PLAN_DEFS)[number]> = {};
  for (const plan of PLAN_DEFS) {
    const priceId = serverEnv[plan.key];
    if (priceId) plans[priceId] = plan;
  }
  return plans;
}

export function getSubscriptionPlansList(): Array<{
  priceId: string;
  planType: "dashboard" | "byok" | "basic" | "standard" | "premium";
  priceEuroCents: number;
  includedCreditsCents: number;
  apiKeyMode: "none" | "byok" | "ours";
  label: string;
  includesDeployment: boolean;
}> {
  return PLAN_DEFS.map((plan) => ({
    priceId: serverEnv[plan.key] ?? "",
    planType: plan.planType,
    priceEuroCents: plan.priceEuroCents,
    includedCreditsCents: plan.includedCreditsCents,
    apiKeyMode: plan.apiKeyMode,
    label: plan.label,
    includesDeployment: plan.includesDeployment,
  })).filter((p) => p.priceId !== "");
}

export function getPlanByPriceId(
  priceId: string,
): (typeof PLAN_DEFS)[number] | undefined {
  const plans = getSubscriptionPlans();
  return plans[priceId];
}

/** Extract user doc ID from identity subject format "userId|sessionId" */
export function parseUserSubject(subject: string): string {
  return subject.split("|")[0];
}
