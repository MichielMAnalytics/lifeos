import { Command } from 'commander';
import { getConfig, saveConfig } from '../config.js';
import { isJsonMode, printJson, printSuccess, printError } from '../output.js';

export const configCommand = new Command('config')
  .description('Manage CLI configuration');

configCommand
  .command('set-url <url>')
  .description('Set the API server URL')
  .action((url: string) => {
    try {
      const config = getConfig();
      config.api_url = url;
      saveConfig(config);
      printSuccess(`API URL set to ${url}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

configCommand
  .command('set-key <key>')
  .description('Set the API key')
  .action((key: string) => {
    try {
      const config = getConfig();
      config.api_key = key;
      saveConfig(config);
      printSuccess('API key saved.');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

configCommand
  .command('show')
  .description('Display current configuration')
  .action(() => {
    try {
      const config = getConfig();
      const masked: Record<string, string> = {
        api_url: config.api_url || '(not set)',
        api_key: config.api_key
          ? config.api_key.slice(0, 14) + '...'
          : '(not set)',
      };

      if (isJsonMode()) {
        printJson(masked);
      } else {
        console.log(`API URL:  ${masked.api_url}`);
        console.log(`API Key:  ${masked.api_key}`);
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
