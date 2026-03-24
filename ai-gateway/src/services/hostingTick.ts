import { redis, ACTIVE_PODS_KEY } from "./redis.js";

export async function registerActivePod(podSecret: string): Promise<void> {
  await redis.sadd(ACTIVE_PODS_KEY, podSecret);
}

export async function unregisterActivePod(podSecret: string): Promise<void> {
  await redis.srem(ACTIVE_PODS_KEY, podSecret);
}
