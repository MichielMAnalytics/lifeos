import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import chalk from "chalk";
import type { Command } from "commander";

declare const __EMBEDDED_SKILLS__: Record<string, Record<string, string>>;
declare global {
  var __EMBEDDED_SKILLS__: Record<string, Record<string, string>> | undefined;
}

type SupportedAgent = "claude" | "codex";

function getHomeDir(): string {
  return process.env.HOME ?? homedir();
}

function getAgentBaseDir(agent: SupportedAgent): string {
  return join(getHomeDir(), agent === "claude" ? ".claude" : ".codex", "skills");
}

function getEmbeddedSkills(): Record<string, Record<string, string>> {
  if (typeof __EMBEDDED_SKILLS__ !== "undefined") return __EMBEDDED_SKILLS__;
  return globalThis.__EMBEDDED_SKILLS__ ?? {};
}

export function registerSkillsCommands(program: Command): void {
  const skills = program.command("skills").description("Manage LifeOS coding-agent skills");

  skills
    .command("install")
    .description("Install LifeOS skills for a supported coding agent")
    .option("--agent <agent>", "Target agent: claude or codex", "claude")
    .option("--json", "JSON output")
    .action(installSkills);
}

export async function installSkills(options: { agent?: string; json?: boolean }): Promise<void> {
  const json = !!options.json;
  const agent = parseAgent(options.agent);
  const skills = getEmbeddedSkills();
  const skillNames = Object.keys(skills);

  if (skillNames.length === 0) {
    if (json) {
      console.log(JSON.stringify({ error: "No skills bundled" }));
    } else {
      console.error(chalk.red("No skills bundled in this build."));
    }
    process.exitCode = 1;
    return;
  }

  const baseDir = getAgentBaseDir(agent);
  const installed: Array<{ name: string; files: string[] }> = [];
  const agentName = agent === "claude" ? "Claude Code" : "Codex";

  for (const [skillName, files] of Object.entries(skills)) {
    const skillDir = join(baseDir, skillName);
    const writtenFiles: string[] = [];

    for (const [relativePath, content] of Object.entries(files)) {
      const fullPath = join(skillDir, relativePath);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, "utf-8");
      writtenFiles.push(relativePath);
    }

    installed.push({ name: skillName, files: writtenFiles });
  }

  // Register update hook and statusline for Claude Code
  const hookRegistered = agent === "claude" ? await registerUpdateHook(json) : false;

  if (json) {
    console.log(JSON.stringify({ agent, installed, path: baseDir }));
  } else {
    for (const skill of installed) {
      console.log(`  ${chalk.green("+")} ${skill.name} ${chalk.dim(`(${skill.files.length} files)`)}`);
    }
    if (hookRegistered) {
      console.log(`  ${chalk.green("+")} SessionStart hook ${chalk.dim("(update checker)")}`);
      console.log(`  ${chalk.green("+")} statusline ${chalk.dim("(update indicator)")}`);
    }
    console.log();
    console.log(chalk.green(`Installed ${installed.length} skills to ${baseDir} for ${agentName}`));
    console.log();
    console.log(chalk.dim("Run /lifeos-init in your agent to get started."));
  }
}

function parseAgent(agent: string | undefined): SupportedAgent {
  if (!agent || agent === "claude") return "claude";
  if (agent === "codex") return "codex";
  console.error(chalk.red(`Unsupported agent '${agent}'. Expected 'claude' or 'codex'.`));
  process.exitCode = 1;
  return "claude";
}

// ---------------------------------------------------------------------------
// Claude SessionStart hook + statusline patch
// ---------------------------------------------------------------------------

const HOOK_SCRIPT_PATH = join(
  getHomeDir(),
  ".claude",
  "skills",
  "lifeos-update",
  "scripts",
  "check-update.sh",
);
const HOOK_MARKER = "lifeos-update-check";

async function registerUpdateHook(json: boolean): Promise<boolean> {
  const settingsPath = join(getHomeDir(), ".claude", "settings.json");

  try {
    let settings: Record<string, unknown> = {};
    try {
      const raw = await readFile(settingsPath, "utf-8");
      settings = JSON.parse(raw);
    } catch {
      // No settings file yet — start fresh
    }

    // --- SessionStart hook ---
    const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
    const sessionStartEntries = (hooks.SessionStart ?? []) as Array<{
      matcher: string;
      hooks: Array<{ type: string; command: string }>;
    }>;

    const alreadyRegistered = sessionStartEntries.some((entry) =>
      entry.hooks?.some(
        (h) => h.command?.includes(HOOK_MARKER) || h.command?.includes("check-update.sh"),
      ),
    );

    if (!alreadyRegistered) {
      sessionStartEntries.push({
        matcher: "",
        hooks: [
          {
            type: "command",
            command: `bash "${HOOK_SCRIPT_PATH}" # ${HOOK_MARKER}`,
          },
        ],
      });
      hooks.SessionStart = sessionStartEntries;
      settings.hooks = hooks;
    }

    // --- Statusline: prepend update indicator ---
    const statusLine = settings.statusLine as { type: string; command: string } | undefined;

    if (statusLine?.command && !statusLine.command.includes("lifeos-update-check")) {
      const cacheFile = "$HOME/.claude/cache/lifeos-update-check.json";
      const updateSnippet = `lifeos_update=""; if [ -f "${cacheFile}" ]; then _ua=$(cat "${cacheFile}" | jq -r '.update_available // false' 2>/dev/null); if [ "$_ua" = "true" ]; then lifeos_update=$(printf '\\033[33m\\xe2\\xac\\x86 /lifeos-update\\033[0m | '); fi; fi`;

      const original = statusLine.command;
      statusLine.command = `${updateSnippet}; _orig=$(${original}); printf '%s%s' "$lifeos_update" "$_orig"`;
      settings.statusLine = statusLine;
    }

    await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
    return true;
  } catch (error) {
    if (!json) {
      console.error(chalk.yellow("  ! Could not register update hook:"), (error as Error).message);
    }
    return false;
  }
}
