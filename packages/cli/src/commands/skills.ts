import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { mkdir, writeFile } from "node:fs/promises";
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

  if (json) {
    console.log(JSON.stringify({ agent, installed, path: baseDir }));
  } else {
    for (const skill of installed) {
      console.log(`  ${chalk.green("+")} ${skill.name} ${chalk.dim(`(${skill.files.length} files)`)}`);
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
