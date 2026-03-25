import { Command } from 'commander';
import type { ApiResponse, DashboardConfig } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import { isJsonMode, printError, printJson, printSuccess, printTable } from '../output.js';

// All 7 personas available on every page — must match web/src/lib/presets.ts
const ALL_PRESETS = ['default', 'solopreneur', 'content-creator', 'developer', 'executive', 'minimalist', 'journaler'];
const PAGE_PRESETS: Record<string, string[]> = {
  today: ALL_PRESETS,
  tasks: ALL_PRESETS,
  projects: ALL_PRESETS,
  goals: ALL_PRESETS,
  journal: ALL_PRESETS,
  ideas: ALL_PRESETS,
  plan: ALL_PRESETS,
  reviews: ALL_PRESETS,
};

export const dashboardCommand = new Command('dashboard')
  .description('Configure dashboard layout and presets');

// lifeos dashboard config -- show current config
dashboardCommand
  .command('config')
  .description('Show current dashboard configuration')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<DashboardConfig>>('/api/v1/dashboard/config');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const config = res.data;
      console.log(`Nav Mode:     ${config.navMode}`);
      console.log(`Nav Order:    ${config.navOrder.join(', ')}`);
      console.log(`Hidden Pages: ${config.navHidden.length > 0 ? config.navHidden.join(', ') : '(none)'}`);

      const presetEntries = Object.entries(config.pagePresets);
      if (presetEntries.length > 0) {
        console.log(`Page Presets:`);
        for (const [page, preset] of presetEntries) {
          console.log(`  ${page}: ${preset}`);
        }
      } else {
        console.log(`Page Presets: (none)`);
      }

      console.log(`Custom Theme: ${config.customTheme ? 'yes' : '(none)'}`);
      console.log(`Persisted:    ${config._id ? 'yes' : 'no (using defaults)'}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// lifeos dashboard nav-mode <mode>
dashboardCommand
  .command('nav-mode <mode>')
  .description('Set navigation mode (sidebar or header)')
  .action(async (mode: string) => {
    try {
      if (mode !== 'sidebar' && mode !== 'header') {
        printError('Mode must be "sidebar" or "header"');
        process.exitCode = 1;
        return;
      }

      const client = createClient();
      const res = await client.post<ApiResponse<DashboardConfig>>('/api/v1/dashboard/nav-mode', { mode });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Navigation mode set to "${mode}"`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// lifeos dashboard nav-order <pages...>
dashboardCommand
  .command('nav-order <pages...>')
  .description('Set sidebar page order')
  .action(async (pages: string[]) => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<DashboardConfig>>('/api/v1/dashboard/nav-order', { order: pages });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Navigation order set to: ${pages.join(', ')}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// lifeos dashboard hide <page>
dashboardCommand
  .command('hide <page>')
  .description('Hide a page from navigation')
  .action(async (page: string) => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<DashboardConfig>>('/api/v1/dashboard/visibility', {
        page,
        visible: false,
      });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Page "${page}" is now hidden`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// lifeos dashboard show <page>
dashboardCommand
  .command('show <page>')
  .description('Show a hidden page in navigation')
  .action(async (page: string) => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<DashboardConfig>>('/api/v1/dashboard/visibility', {
        page,
        visible: true,
      });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Page "${page}" is now visible`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// lifeos dashboard preset <page> <preset>
dashboardCommand
  .command('preset <page> <preset>')
  .description('Set page preset (e.g., today solopreneur)')
  .action(async (page: string, preset: string) => {
    try {
      const known = PAGE_PRESETS[page];
      if (known && !known.includes(preset)) {
        printError(`Unknown preset "${preset}" for page "${page}". Known presets: ${known.join(', ')}`);
        process.exitCode = 1;
        return;
      }

      const client = createClient();
      const res = await client.post<ApiResponse<DashboardConfig>>('/api/v1/dashboard/preset', { page, preset });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Preset for "${page}" set to "${preset}"`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// lifeos dashboard presets <page>
dashboardCommand
  .command('presets <page>')
  .description('List available presets for a page')
  .action(async (page: string) => {
    try {
      const presets = PAGE_PRESETS[page];

      if (isJsonMode()) {
        printJson({ page, presets: presets ?? [] });
        return;
      }

      if (!presets || presets.length === 0) {
        console.log(`No known presets for page "${page}".`);
        return;
      }

      // Fetch current config to show which is active
      const client = createClient();
      const res = await client.get<ApiResponse<DashboardConfig>>('/api/v1/dashboard/config');
      const activePreset = res.data.pagePresets[page];

      const rows = presets.map((p) => [
        p,
        p === activePreset ? 'active' : '',
      ]);
      printTable(['Preset', 'Status'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// lifeos dashboard reset
dashboardCommand
  .command('reset')
  .description('Reset dashboard to defaults')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<{ success: boolean }>>('/api/v1/dashboard/reset');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess('Dashboard configuration reset to defaults');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
