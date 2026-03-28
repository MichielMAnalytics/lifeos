#!/usr/bin/env bash
# SessionStart hook — background check for lifeos CLI updates.
# Writes result to ~/.claude/cache/lifeos-update-check.json.
# Runs detached so it never blocks Claude Code startup.

set -euo pipefail

CACHE_DIR="$HOME/.claude/cache"
CACHE_FILE="$CACHE_DIR/lifeos-update-check.json"
STALE_SECONDS=3600  # re-check at most once per hour

# --- Skip if checked recently ---
if [ -f "$CACHE_FILE" ]; then
  if command -v stat >/dev/null 2>&1; then
    if [ "$(uname)" = "Darwin" ]; then
      last=$(stat -f %m "$CACHE_FILE" 2>/dev/null || echo 0)
    else
      last=$(stat -c %Y "$CACHE_FILE" 2>/dev/null || echo 0)
    fi
    now=$(date +%s)
    age=$(( now - last ))
    if [ "$age" -lt "$STALE_SECONDS" ]; then
      exit 0
    fi
  fi
fi

# --- Run the actual check in a detached background process ---
(
  # Get installed version
  installed=$(lifeos --version 2>/dev/null | awk '{print $1}') || exit 0
  [ -z "$installed" ] && exit 0

  # Check npm registry (10s timeout)
  latest=$(npm view lifeos-cli version 2>/dev/null) || latest=""

  [ -z "$latest" ] && exit 0

  # Compare versions (strip leading v if present)
  installed="${installed#v}"
  latest="${latest#v}"

  if [ "$installed" = "$latest" ]; then
    update_available=false
  else
    # Simple semver comparison: split and compare numerically
    IFS='.' read -r i1 i2 i3 <<< "$installed"
    IFS='.' read -r l1 l2 l3 <<< "$latest"
    i1=${i1:-0}; i2=${i2:-0}; i3=${i3:-0}
    l1=${l1:-0}; l2=${l2:-0}; l3=${l3:-0}

    if [ "$l1" -gt "$i1" ] 2>/dev/null || \
       { [ "$l1" -eq "$i1" ] && [ "$l2" -gt "$i2" ]; } 2>/dev/null || \
       { [ "$l1" -eq "$i1" ] && [ "$l2" -eq "$i2" ] && [ "$l3" -gt "$i3" ]; } 2>/dev/null; then
      update_available=true
    else
      update_available=false
    fi
  fi

  # Write cache
  mkdir -p "$CACHE_DIR"
  cat > "$CACHE_FILE" <<JSONEOF
{
  "update_available": $update_available,
  "installed": "$installed",
  "latest": "$latest",
  "checked": $(date +%s)
}
JSONEOF
) &
disown
exit 0
