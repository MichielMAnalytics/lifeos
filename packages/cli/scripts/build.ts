function getGitCommitSha() {
  return Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"]).stdout.toString().trim();
}

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
  },
});

if (!result.success) {
  console.error("Build failed:", result.logs);
  process.exit(1);
}

console.log("✓ Built ./dist/lifeos.mjs");
