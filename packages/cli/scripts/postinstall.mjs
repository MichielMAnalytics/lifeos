import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliEntrypoint = join(__dirname, "..", "dist", "lifeos.mjs");

function printBanner() {
  process.stdout.write("\x1b[1;37m");
  process.stdout.write(`
  ██╗     ██╗███████╗███████╗ ██████╗ ███████╗
  ██║     ██║██╔════╝██╔════╝██╔═══██╗██╔════╝
  ██║     ██║█████╗  █████╗  ██║   ██║███████╗
  ██║     ██║██╔══╝  ██╔══╝  ██║   ██║╚════██║
  ███████╗██║██║     ███████╗╚██████╔╝███████║
  ╚══════╝╚═╝╚═╝     ╚══════╝ ╚═════╝ ╚══════╝

`);
  process.stdout.write("\x1b[0m");
}

function isInteractiveGlobalInstall() {
  return (
    process.env.npm_config_global === "true" &&
    process.stdin.isTTY &&
    process.stdout.isTTY &&
    !process.env.CI
  );
}

function hasSkills(agent) {
  const base = join(
    homedir(),
    agent === "claude" ? ".claude" : ".codex",
    "skills",
  );
  return existsSync(join(base, "lifeos-init"));
}

function installSkills(agent) {
  const result = spawnSync(
    process.execPath,
    [cliEntrypoint, "skills", "install", "--agent", agent],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`Skill installation failed for agent '${agent}'.`);
  }
}

async function promptForSkills() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      "Install LifeOS skills for your coding agent? (Y/n) ",
    );
    const normalized = answer.trim().toLowerCase();
    if (normalized && normalized !== "y" && normalized !== "yes") return null;

    process.stdout.write("\n");
    process.stdout.write("Choose your coding agent:\n");
    process.stdout.write("  1) Claude Code\n");
    process.stdout.write("  2) Codex\n");
    process.stdout.write("  3) Skip\n");
    const agentAnswer = await rl.question("Selection [1-3, default 1]: ");

    switch (agentAnswer.trim()) {
      case "":
      case "1":
        return "claude";
      case "2":
        return "codex";
      case "3":
        return null;
      default:
        process.stdout.write("Unrecognized selection, skipping.\n");
        return null;
    }
  } finally {
    rl.close();
  }
}

async function main() {
  if (!isInteractiveGlobalInstall()) return;

  try {
    printBanner();

    // Auto-update if skills already installed
    if (hasSkills("claude")) {
      installSkills("claude");
      return;
    }
    if (hasSkills("codex")) {
      installSkills("codex");
      return;
    }

    // First install — ask the user
    const agent = await promptForSkills();
    if (agent) {
      process.stdout.write("\n");
      installSkills(agent);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`\nSkill installation skipped: ${message}\n`);
  }
}

await main();
