import { Command } from 'commander';
import { createClient } from '../api-client.js';
import { isJsonMode, printError, printJson, printSuccess } from '../output.js';
import { createInterface } from 'readline';
import { execSync } from 'child_process';
import os from 'os';

interface FeedbackResult {
  data: {
    issueNumber: number;
    issueUrl: string;
  };
}

const VALID_TYPES = ['bug', 'feature', 'general'] as const;

// ── Interactive prompts (readline, no extra deps) ────────

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── Best-effort environment capture ──────────────────────

function gatherContext(): string {
  const info: Record<string, string> = {};

  try { info.platform = `${os.platform()} ${os.arch()}`; } catch { /* skip */ }
  try { info.node = process.version; } catch { /* skip */ }
  try { info.cliVersion = '0.5.1'; } catch { /* skip */ }
  try { info.cwd = process.cwd(); } catch { /* skip */ }

  // Detect coding agent
  const agentEnvs: [string, string][] = [
    ['OPENCLAW_GATEWAY_TOKEN', 'OpenClaw'],
    ['CLAUDE_CODE', 'Claude Code'],
    ['CURSOR_SESSION_ID', 'Cursor'],
    ['CODEX_SESSION', 'Codex'],
    ['VSCODE_PID', 'VS Code'],
    ['WINDSURF_SESSION', 'Windsurf'],
  ];
  for (const [envVar, name] of agentEnvs) {
    if (process.env[envVar]) {
      info.agent = name;
      break;
    }
  }

  // Git info (best-effort)
  try {
    info.gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
  } catch { /* skip */ }
  try {
    info.gitRemote = execSync('git remote get-url origin', { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
  } catch { /* skip */ }

  return Object.entries(info)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

// ── Command ──────────────────────────────────────────────

export const feedbackCommand = new Command('feedback')
  .description('Submit feedback — creates a GitHub issue')
  .argument('[title]', 'Feedback title')
  .option('-t, --type <type>', 'Feedback type: bug, feature, or general')
  .option('-d, --description <text>', 'Description of the feedback')
  .action(async (titleArg: string | undefined, opts: { type?: string; description?: string }) => {
    try {
      // Collect title
      let title = titleArg;
      if (!title) {
        title = await prompt('Title: ');
        if (!title) { printError('Title is required'); process.exitCode = 1; return; }
      }

      // Collect type
      let feedbackType = opts.type;
      if (!feedbackType || !VALID_TYPES.includes(feedbackType as typeof VALID_TYPES[number])) {
        feedbackType = await prompt('Type (bug / feature / general): ');
        if (!VALID_TYPES.includes(feedbackType as typeof VALID_TYPES[number])) {
          feedbackType = 'general';
        }
      }

      // Collect description
      let description = opts.description;
      if (!description) {
        description = await prompt('Description: ');
        if (!description) { printError('Description is required'); process.exitCode = 1; return; }
      }

      // Gather environment context (best-effort, never fails)
      let context: string | undefined;
      try { context = gatherContext(); } catch { /* skip */ }

      const client = createClient();
      const res = await client.post<FeedbackResult>('/api/v1/feedback', {
        title,
        type: feedbackType,
        description,
        context,
      });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Feedback submitted — ${res.data.issueUrl}`);
    } catch (e) {
      printError(e instanceof Error ? e.message : String(e));
      process.exitCode = 1;
    }
  });
