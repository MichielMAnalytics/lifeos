import Redis from "ioredis";
import { gatewayEnv } from "../env.js";

export const redis = new Redis(gatewayEnv.REDIS_URL);

export const INSTANCE_ID = gatewayEnv.GATEWAY_INSTANCE_ID;
const prefix = (key: string) => `${INSTANCE_ID}:${key}`;

export const balanceKey = (podSecret: string) => prefix(`balance:${podSecret}`);
export const userKey = (podSecret: string) => prefix(`user:${podSecret}`);
export const rateLimitKey = (podSecret: string) => prefix(`ratelimit:${podSecret}`);
export const ownerKey = (subdomain: string) => prefix(`owner:${subdomain}`);
export const setupTokenKey = (subdomain: string) => prefix(`setup-token:${subdomain}`);
export const ACTIVE_PODS_KEY = prefix("active-pods");

// Lua script: atomic balance check + deduct
// KEYS[1] = balance key, ARGV[1] = cost
// Returns new balance or -1 if insufficient
export const ATOMIC_DEDUCT_SCRIPT = `
local balance = tonumber(redis.call('GET', KEYS[1]) or '0')
local cost = tonumber(ARGV[1])
if balance < cost then
  return -1
end
local newBalance = balance - cost
redis.call('SET', KEYS[1], tostring(newBalance))
return newBalance
`;

// Lua script: deduct cost but floor balance at 0 (for hosting tick)
// KEYS[1] = balance key, ARGV[1] = cost
// Returns new balance (always >= 0)
export const ATOMIC_DEDUCT_FLOOR_SCRIPT = `
local balance = tonumber(redis.call('GET', KEYS[1]) or '0')
local cost = tonumber(ARGV[1])
local newBalance = balance - cost
if newBalance < 0 then
  newBalance = 0
end
redis.call('SET', KEYS[1], tostring(newBalance))
return newBalance
`;

// Lua script: check if balance is above a reserve threshold (no deduction)
// KEYS[1] = balance key, ARGV[1] = min reserve
// Returns balance if above reserve, -1 if below
export const BALANCE_CHECK_SCRIPT = `
local balance = tonumber(redis.call('GET', KEYS[1]) or '0')
local reserve = tonumber(ARGV[1])
if balance < reserve then
  return -1
end
return balance
`;

// Lua script: rate limit check
// KEYS[1] = rate limit key, ARGV[1] = max requests, ARGV[2] = window seconds
// Returns 1 if allowed, 0 if rate limited
export const RATE_LIMIT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
end
if current > tonumber(ARGV[1]) then
  return 0
end
return 1
`;
