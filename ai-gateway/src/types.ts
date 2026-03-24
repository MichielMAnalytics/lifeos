import type { Env } from "hono";

export interface AppEnv extends Env {
  Variables: {
    sourceIp: string;
  };
}
