import { getDirtyAndClear, getBalance } from "./balance.js";
import { gatewayEnv } from "../env.js";

const SYNC_INTERVAL_MS = 30_000; // 30 seconds

let syncTimer: ReturnType<typeof setInterval> | null = null;

export function startSync(): void {
  if (syncTimer) {
    return;
  }

  console.log("[sync] Starting balance sync (every 30s)");

  syncTimer = setInterval(async () => {
    try {
      await syncDirtyBalances();
    } catch (err) {
      console.error("[sync] Error during balance sync:", err);
    }
  }, SYNC_INTERVAL_MS);
}

export function stopSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    console.log("[sync] Stopped balance sync");
  }
}

async function syncDirtyBalances(): Promise<void> {
  const dirtyPods = await getDirtyAndClear();
  if (dirtyPods.length === 0) {
    return;
  }

  console.log(`[sync] Syncing ${dirtyPods.length} dirty balances to Convex`);

  const balances: Array<{ podSecret: string; balance: number }> = [];
  for (const podSecret of dirtyPods) {
    const balance = await getBalance(podSecret);
    console.log(`[sync] dirty pod ${podSecret.substring(0, 8)}... balance=${balance}`);
    balances.push({ podSecret, balance });
  }

  const convexSiteUrl = gatewayEnv.CONVEX_SITE_URL;
  const systemKey = gatewayEnv.GATEWAY_SYSTEM_KEY;

  if (!convexSiteUrl || !systemKey) {
    console.warn("[sync] Missing CONVEX_SITE_URL or GATEWAY_SYSTEM_KEY, skipping sync");
    return;
  }

  const payload = balances.map(b => ({ podSecret: b.podSecret, currentBalance: b.balance }));
  console.log(`[sync] POST ${convexSiteUrl}/api/syncBalances with ${payload.length} entries`);

  const response = await fetch(`${convexSiteUrl}/api/syncBalances`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-System-Key": systemKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[sync] Convex sync failed: ${response.status} ${response.statusText} body=${body}`);
  } else {
    console.log(`[sync] Successfully synced ${balances.length} balances`);
  }
}
