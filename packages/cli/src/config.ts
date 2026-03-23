import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface CliConfig {
  api_url: string;
  api_key: string;
}

const CONFIG_DIR_NAME = '.lifeos';
const CONFIG_FILE_NAME = 'config.json';

export function getConfigDir(): string {
  const dir = join(homedir(), CONFIG_DIR_NAME);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getConfig(): CliConfig {
  const configPath = join(getConfigDir(), CONFIG_FILE_NAME);
  if (!existsSync(configPath)) {
    return { api_url: '', api_key: '' };
  }
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CliConfig>;
    return {
      api_url: parsed.api_url ?? '',
      api_key: parsed.api_key ?? '',
    };
  } catch {
    return { api_url: '', api_key: '' };
  }
}

export function saveConfig(config: CliConfig): void {
  const configPath = join(getConfigDir(), CONFIG_FILE_NAME);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export function getApiUrl(): string {
  const { api_url } = getConfig();
  if (!api_url) {
    throw new Error("API URL not configured. Run 'lifeos config set-url <url>' first.");
  }
  return api_url;
}

export function getApiKey(): string {
  const { api_key } = getConfig();
  if (!api_key) {
    throw new Error("API key not configured. Run 'lifeos config set-key <key>' first.");
  }
  return api_key;
}
