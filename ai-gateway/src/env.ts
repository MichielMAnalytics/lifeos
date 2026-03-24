import { z } from "zod";

const gatewayEnvSchema = z.object({
  PORT: z.coerce.number().default(8080),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GATEWAY_INSTANCE_ID: z.string().default("default"),
  GATEWAY_SYSTEM_KEY: z.string().optional(),
  CONVEX_SITE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  MOONSHOT_API_KEY: z.string().optional(),
  MINIMAX_API_KEY: z.string().optional(),
  GCP_PROJECT_ID: z.string().default("claw-now-dev"),
  VERTEX_AI_LOCATION: z.string().default("global"),
});

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;

export const gatewayEnv: GatewayEnv = gatewayEnvSchema.parse(process.env);
