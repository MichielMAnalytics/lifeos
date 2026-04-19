#!/usr/bin/env node

import { Command } from 'commander';
import type { ApiResponse, User } from '@lifeos/shared';
import { createClient } from './api-client.js';
import { isJsonMode, printError, printJson, printSuccess } from './output.js';
import { configCommand } from './commands/config.js';
import { taskCommand } from './commands/task.js';
import { projectCommand } from './commands/project.js';
import { goalCommand } from './commands/goal.js';
import { journalCommand } from './commands/journal.js';
import { planCommand } from './commands/plan.js';
import { weekCommand } from './commands/week.js';
import { ideaCommand, thoughtCommand, winCommand, resourceCommand } from './commands/capture.js';
import { reviewCommand } from './commands/review.js';
import { reminderCommand } from './commands/reminder.js';
import { searchCommand } from './commands/search.js';
import { undoCommand } from './commands/undo.js';
import { triggerCommand } from './commands/trigger.js';
import { dashboardCommand } from './commands/dashboard.js';
import { todayCommand } from './commands/today.js';
import { feedbackCommand } from './commands/feedback.js';
import { identityCommand } from './commands/identity.js';
import { visionCommand } from './commands/vision.js';
import { workoutCommand } from './commands/workout.js';
import { programmeCommand } from './commands/programme.js';
import { healthCommand } from './commands/health.js';
import { foodCommand } from './commands/food.js';
import { registerSkillsCommands } from './commands/skills.js';
import { printUpdateNotice } from './update-check.js';

const program = new Command();

program
  .name('lifeos')
  .description('Personal Life Operating System')
  .version('0.5.2')
  .option('--json', 'Output results as JSON');

// ── whoami ────────────────────────────────────────────────
program
  .command('whoami')
  .description('Show current authenticated user')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<User>>('/api/v1/auth/me');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const u = res.data;
      console.log(`ID:        ${u._id ?? u.id}`);
      console.log(`Email:     ${u.email}`);
      console.log(`Name:      ${u.name ?? '-'}`);
      console.log(`Timezone:  ${u.timezone}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── profile ──────────────────────────────────────────────
const profileCommand = new Command('profile')
  .description('Manage user profile');

profileCommand
  .command('set-timezone <timezone>')
  .description('Set your timezone (e.g., Asia/Makassar)')
  .action(async (timezone: string) => {
    try {
      const client = createClient();
      await client.patch('/api/v1/auth/me', { timezone });
      printSuccess(`Timezone set to ${timezone}.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

profileCommand
  .command('set-telegram-chat-id <chatId>')
  .description('Link this LifeOS account to a Telegram chat (so reminders fire there). Pass an empty string to clear.')
  .action(async (chatId: string) => {
    try {
      const client = createClient();
      await client.patch('/api/v1/auth/me', { telegramChatId: chatId });
      if (chatId.trim()) {
        printSuccess(`Telegram chat ID set to ${chatId}. Reminders will fire to this chat via your bot.`);
      } else {
        printSuccess('Telegram chat ID cleared.');
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── Register subcommands ─────────────────────────────────
program.addCommand(profileCommand);
program.addCommand(configCommand);
program.addCommand(taskCommand);
program.addCommand(projectCommand);
program.addCommand(goalCommand);
program.addCommand(journalCommand);
program.addCommand(planCommand);
program.addCommand(weekCommand);
program.addCommand(ideaCommand);
program.addCommand(thoughtCommand);
program.addCommand(winCommand);
program.addCommand(resourceCommand);
program.addCommand(reviewCommand);
program.addCommand(reminderCommand);
program.addCommand(searchCommand);
program.addCommand(undoCommand);
program.addCommand(triggerCommand);
program.addCommand(dashboardCommand);
program.addCommand(todayCommand);
program.addCommand(feedbackCommand);
program.addCommand(identityCommand);
program.addCommand(visionCommand);
program.addCommand(workoutCommand);
program.addCommand(programmeCommand);
program.addCommand(healthCommand);
program.addCommand(foodCommand);
registerSkillsCommands(program);

// Print update notice after command completes
program.hook('postAction', () => {
  printUpdateNotice();
});

program.parseAsync(process.argv);
