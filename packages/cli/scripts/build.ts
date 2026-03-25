import { readdir, readFile } from "node:fs/promises";
import { join, relative, dirname } from "node:path";

function getGitCommitSha() {
  return Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"]).stdout.toString().trim();
}

async function collectSkillFiles(dir: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      else {
        const relPath = relative(dir, fullPath);
        files[relPath] = await readFile(fullPath, "utf-8");
      }
    }
  }
  await walk(dir);
  return files;
}

async function collectEmbeddedSkills(): Promise<Record<string, Record<string, string>>> {
  const skillsRoot = join(import.meta.dir, "..", "skills");
  const skills: Record<string, Record<string, string>> = {};
  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch {
    console.warn("No skills/ directory found, embedding empty skills");
    return skills;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = join(skillsRoot, entry.name);
    const skillFiles = await collectSkillFiles(skillDir);
    if (!skillFiles["SKILL.md"]) {
      console.warn(`Skipping ${entry.name}/ — missing SKILL.md`);
      continue;
    }
    skills[entry.name] = skillFiles;
  }
  return skills;
}

const skills = await collectEmbeddedSkills();
console.log(`Collected ${Object.keys(skills).length} skills for embedding`);

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  format: "esm",
  target: "node",
  outdir: "./dist",
  naming: "lifeos.mjs",
  minify: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.BUILD_VERSION": JSON.stringify((await Bun.file("./package.json").json()).version),
    "process.env.BUILD_COMMIT": JSON.stringify(getGitCommitSha()),
    "__EMBEDDED_SKILLS__": JSON.stringify(skills),
  },
});

if (!result.success) {
  console.error("Build failed:", result.logs);
  process.exit(1);
}

console.log("Built ./dist/lifeos.mjs");
