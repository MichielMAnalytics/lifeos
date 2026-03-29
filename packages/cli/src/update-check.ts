import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import chalk from 'chalk';

const PACKAGE_NAME = 'lifeos-cli';
const CURRENT_VERSION = '0.5.2';
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

interface UpdateCache {
  update_available: boolean;
  installed: string;
  latest: string;
  checked: number; // epoch seconds
}

function getCacheDir(): string {
  return join(homedir(), '.lifeos', 'cache');
}

function getCachePath(): string {
  return join(getCacheDir(), 'update-check.json');
}

function readCache(): UpdateCache | null {
  try {
    const raw = readFileSync(getCachePath(), 'utf-8');
    return JSON.parse(raw) as UpdateCache;
  } catch {
    return null;
  }
}

function writeCache(cache: UpdateCache): void {
  try {
    const dir = getCacheDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(getCachePath(), JSON.stringify(cache, null, 2) + '\n', 'utf-8');
  } catch { /* best-effort */ }
}

function fetchLatestVersion(): string | null {
  try {
    return execSync(`npm view ${PACKAGE_NAME} version 2>/dev/null`, {
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString().trim();
  } catch {
    return null;
  }
}

function isNewer(latest: string, current: string): boolean {
  const [l1, l2, l3] = latest.split('.').map(Number);
  const [c1, c2, c3] = current.split('.').map(Number);
  if (l1! > c1!) return true;
  if (l1 === c1 && l2! > c2!) return true;
  if (l1 === c1 && l2 === c2 && l3! > c3!) return true;
  return false;
}

/**
 * Check for updates and print a notice to stderr if one is available.
 * Uses a cache file so npm is only queried at most once per hour.
 * Never throws — all errors are silently swallowed.
 */
export function printUpdateNotice(): void {
  try {
    const cache = readCache();
    const now = Math.floor(Date.now() / 1000);

    // Use cache if fresh enough
    if (cache && (now - cache.checked) < CHECK_INTERVAL_MS / 1000) {
      if (cache.update_available) {
        printNotice(cache.installed, cache.latest);
      }
      return;
    }

    // Check npm
    const latest = fetchLatestVersion();
    if (!latest) return;

    const updateAvailable = isNewer(latest, CURRENT_VERSION);
    writeCache({
      update_available: updateAvailable,
      installed: CURRENT_VERSION,
      latest,
      checked: now,
    });

    if (updateAvailable) {
      printNotice(CURRENT_VERSION, latest);
    }
  } catch { /* never fail */ }
}

function printNotice(installed: string, latest: string) {
  // Print to stderr so --json output stays clean
  process.stderr.write(
    '\n' +
    chalk.yellow(`  Update available: ${installed} → ${latest}`) + '\n' +
    chalk.dim(`  Run: npm install -g lifeos-cli@latest`) + '\n' +
    '\n',
  );
}
