import { redis, balanceKey, ATOMIC_DEDUCT_SCRIPT, ATOMIC_DEDUCT_FLOOR_SCRIPT, BALANCE_CHECK_SCRIPT, INSTANCE_ID } from "./redis.js";

const DIRTY_SET_KEY = `${INSTANCE_ID}:dirty-balances`;

export async function seedBalance(podSecret: string, amount: number): Promise<void> {
  console.log(`[balance] seedBalance podSecret=${podSecret.substring(0, 8)}... amount=${amount}`);
  await redis.set(balanceKey(podSecret), amount.toString());
  console.log(`[balance] seedBalance done, key=${balanceKey(podSecret)}`);
}

export async function addCredits(podSecret: string, amount: number): Promise<number> {
  const key = balanceKey(podSecret);
  const before = await redis.get(key);
  console.log(`[balance] addCredits podSecret=${podSecret.substring(0, 8)}... amount=${amount} currentBalance=${before ?? "null (key missing)"}`);
  const result = await redis.incrbyfloat(key, amount);
  const newBalance = parseFloat(result);
  console.log(`[balance] addCredits result: newBalance=${newBalance}`);
  return newBalance;
}

export async function deductBalance(podSecret: string, cost: number): Promise<number> {
  console.log(`[balance] deductBalance podSecret=${podSecret.substring(0, 8)}... cost=${cost.toFixed(4)}`);
  // Redis EVAL for atomic Lua script - not JS eval
  const result = await redis.eval(ATOMIC_DEDUCT_SCRIPT, 1, balanceKey(podSecret), cost.toString()) as number;

  if (result === -1) {
    console.warn(`[balance] deductBalance INSUFFICIENT for podSecret=${podSecret.substring(0, 8)}... cost=${cost.toFixed(4)}`);
    throw new InsufficientBalanceError(podSecret);
  }

  console.log(`[balance] deductBalance success, remainingBalance=${result}`);
  return result;
}

export async function checkBalance(podSecret: string, minReserve: number): Promise<number> {
  console.log(`[balance] checkBalance podSecret=${podSecret.substring(0, 8)}... minReserve=${minReserve}`);
  // Redis EVAL for atomic Lua script - not JS eval
  const result = await redis.eval(BALANCE_CHECK_SCRIPT, 1, balanceKey(podSecret), minReserve.toString()) as number;

  if (result === -1) {
    console.warn(`[balance] checkBalance FAILED (below reserve) for podSecret=${podSecret.substring(0, 8)}... minReserve=${minReserve}`);
    throw new InsufficientBalanceError(podSecret);
  }

  console.log(`[balance] checkBalance OK, balance=${result}`);
  return result;
}

export async function deductBalanceFloor(podSecret: string, cost: number): Promise<number> {
  const result = await redis.eval(
    ATOMIC_DEDUCT_FLOOR_SCRIPT,
    1,
    balanceKey(podSecret),
    cost.toString()
  ) as number;

  return result;
}

export async function getBalance(podSecret: string): Promise<number> {
  const key = balanceKey(podSecret);
  const raw = await redis.get(key);
  console.log(`[balance] getBalance podSecret=${podSecret.substring(0, 8)}... key=${key} raw=${raw ?? "null"}`);
  return raw ? parseFloat(raw) : 0;
}

export async function markDirty(podSecret: string): Promise<void> {
  await redis.sadd(DIRTY_SET_KEY, podSecret);
}

export async function getDirtyAndClear(): Promise<string[]> {
  const members = await redis.smembers(DIRTY_SET_KEY);
  if (members.length > 0) {
    await redis.del(DIRTY_SET_KEY);
  }
  return members;
}

export class InsufficientBalanceError extends Error {
  public statusCode = 402;

  constructor(podSecret: string) {
    super(`Insufficient balance for pod ${podSecret}`);
    this.name = "InsufficientBalanceError";
  }
}
