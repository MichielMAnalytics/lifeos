---
name: lifeos-update
description: |
  Check for LifeOS CLI updates, display changelog, obtain user confirmation, and execute the update.
  Use when: user says "update", "upgrade", "check for updates", "is there a new version?",
  "update lifeos", "update cli", or wants to update the LifeOS CLI to the latest version.
  Also triggers proactively when ~/.claude/cache/lifeos-update-check.json indicates an update is
  available (written by the SessionStart hook).
user-invocable: true
metadata: { "openclaw": { "emoji": "\u2b06\ufe0f", "requires": { "bins": ["lifeos"] }, "install": [{ "id": "npm-lifeos", "kind": "node", "package": "lifeos-cli", "bins": ["lifeos"], "label": "Install LifeOS CLI (npm)" }] } }
---

# LifeOS CLI Update

Check for updates to the `lifeos` CLI, show what's new, and install the latest version.

## Proactive update notification

The LifeOS CLI prints an update notice to stderr after every command when a newer version is
available on npm. The notice looks like:

```
  Update available: 0.5.1 → 0.5.2
  Run: npm install -g lifeos-cli@latest
```

**When you see this notice in CLI output, you should proactively update the CLI** by running
`npm install -g lifeos-cli@latest` followed by `lifeos skills install` to refresh skills.
Do not wait for the user to ask — the notice is your signal to act.

Additionally, a SessionStart hook checks for updates in the background and writes the result to
`~/.claude/cache/lifeos-update-check.json`. When the statusline shows a LifeOS update indicator,
or the cache file contains `"update_available": true`, suggest running `/lifeos-update`.

## Step 1: Detect installed version and install method

Run the following to determine the current version and how `lifeos` was installed:

```bash
# Get installed version
lifeos --version

# Detect install method by checking where the binary lives
which lifeos
```

**Interpreting the path:**
- Contains `node_modules` or npm/pnpm/yarn/bun global dir → **npm/bun install**
- If `which lifeos` fails → CLI is not installed, tell the user to install it first

**If version check fails:**
```
## LifeOS CLI Update

The `lifeos` CLI doesn't appear to be installed.

Install it with:
  npm install -g lifeos-cli
```
Exit.

## Step 2: Check latest version

```bash
# npm registry
npm view lifeos-cli version 2>/dev/null
```

If this fails, report offline and exit.

## Step 3: Compare versions

**If installed >= latest:**
```
## LifeOS CLI Update

Installed: X.Y.Z
Latest:    X.Y.Z

You're already on the latest version.
```
Exit.

## Step 4: Show update info and ask for confirmation

Present the update to the user:

```
## LifeOS CLI Update Available

Installed: 0.3.1
Latest:    0.4.0
```

Use AskUserQuestion:
- Question: "Update lifeos to vX.Y.Z?"
- Options:
  - "Yes, update now"
  - "No, cancel"

**If user cancels:** Exit.

## Step 5: Run the update

```bash
npm install -g lifeos-cli@latest
```

Capture output. If it fails, show the error and suggest `sudo npm install -g lifeos-cli@latest`.

## Step 6: Clear update cache

Remove the cache file so the statusline indicator disappears:

```bash
rm -f ~/.claude/cache/lifeos-update-check.json
```

## Step 7: Update skills

Skills are bundled in the CLI, so a new version may include updated skills. Always update them after upgrading:

```bash
lifeos skills install
```

## Step 8: Verify and report

```bash
lifeos --version
```

Confirm the new version is active:

```
Updated lifeos: v0.3.1 -> v0.4.0
Skills updated.
```

## Troubleshooting

| Issue | Fix |
|---|---|
| `npm install` permission error | Try `sudo npm install -g lifeos-cli@latest` |
| Version unchanged after update | Shell may have cached the old binary path — run `hash -r` (bash) or `rehash` (zsh) |
