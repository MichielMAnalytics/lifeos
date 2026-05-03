#!/usr/bin/env bash
# Diff operatorai HEAD against the last checkpoint, ask Claude to extract
# portable feature/optimization ideas, and write JSON for the lifeai
# /inspiration/operatorai page to render.
#
# Designed to be run by cron every couple of days; safe to run manually.
#
# Env overrides:
#   LIFEAI=/path/to/lifeai
#   OPERATORAI=/path/to/operatorai
#   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — optional, sends a one-line ping when set

set -euo pipefail

LIFEAI="${LIFEAI:-$HOME/Code/lifeai}"
OPERATORAI="${OPERATORAI:-$HOME/Code/operatorai}"
DATA_DIR="$LIFEAI/web/inspiration"
DATA_FILE="$DATA_DIR/operatorai-data.json"
CHECKPOINT="$DATA_DIR/.operatorai-checkpoint"
LOG_FILE="$DATA_DIR/.last-run.log"

mkdir -p "$DATA_DIR"
: > "$LOG_FILE"

if [[ ! -d "$OPERATORAI/.git" ]]; then
  echo "operatorai not a git repo at $OPERATORAI" >&2
  exit 1
fi

if [[ -f "$CHECKPOINT" ]]; then
  LAST_SHA=$(<"$CHECKPOINT")
else
  # First run: look back ~14 days. rev-list returns success even with empty
  # output, so check the result and fall back to the root commit explicitly.
  LAST_SHA=$(git -C "$OPERATORAI" rev-list -1 --before="14 days ago" HEAD 2>/dev/null || true)
  if [[ -z "$LAST_SHA" ]]; then
    LAST_SHA=$(git -C "$OPERATORAI" rev-list --max-parents=0 HEAD | head -1)
  fi
fi
NEW_SHA=$(git -C "$OPERATORAI" rev-parse HEAD)

if [[ "$LAST_SHA" == "$NEW_SHA" ]]; then
  echo "No new operatorai commits since $LAST_SHA"
  exit 0
fi

COMMITS=$(git -C "$OPERATORAI" log --no-merges --pretty=format:"- %h %s" "$LAST_SHA..$NEW_SHA" 2>/dev/null || true)
if [[ -z "$COMMITS" ]]; then
  echo "No non-merge commits in $LAST_SHA..$NEW_SHA"
  exit 0
fi
DIFF_STAT=$(git -C "$OPERATORAI" diff --stat "$LAST_SHA..$NEW_SHA")
COMMIT_COUNT=$(printf "%s\n" "$COMMITS" | grep -c '^-' || echo 0)

PROMPT=$(cat <<EOF
You are auditing recent operatorai changes for patterns worth porting to lifeai.

- operatorai: B2B AI dashboard at $OPERATORAI
- lifeai: personal productivity app at $LIFEAI
- Both are Next.js (App Router) + Convex.

INPUT — commits in operatorai between $LAST_SHA..$NEW_SHA:

$COMMITS

CHANGED FILES:

$DIFF_STAT

TASK:

1. Pick 8-15 distinct features, optimizations, or patterns from these changes that could be ported or adapted to lifeai. Skip operatorai-specific business logic (clients, deals, B2B-only flows, billing, role/team plumbing).
2. For each idea, include:
   - id: kebab-case slug, unique within this batch
   - title: one short line
   - category: one of UI / Performance / Feature / Refactor / Integration / DX / AI
   - source_commits: array of relevant short SHAs from the commit list above
   - description: 1-2 sentences, concrete benefit
   - rationale: why this stood out as worth borrowing (one sentence)
   - lifeai_relevance: how this would slot into lifeai specifically (one sentence; reference the actual lifeai surface area you can see in $LIFEAI/web/src/app or $LIFEAI/convex)
3. Output STRICT JSON ONLY — no markdown fences, no preamble, no commentary. Match this shape exactly:

{
  "generated_at": "<ISO 8601 UTC timestamp>",
  "diff_period": { "from": "$LAST_SHA", "to": "$NEW_SHA" },
  "ideas": [
    { "id": "...", "title": "...", "category": "...", "source_commits": ["..."], "description": "...", "rationale": "...", "lifeai_relevance": "..." }
  ]
}
EOF
)

echo "Analysing $COMMIT_COUNT commits (${LAST_SHA:0:7}..${NEW_SHA:0:7})..."
# Pass the prompt as a positional argument; piping over stdin conflicts with
# the `</dev/null` we want for non-interactive mode.
RAW=$(claude -p --dangerously-skip-permissions --output-format json "$PROMPT" 2>>"$LOG_FILE" </dev/null)
TEXT=$(printf "%s" "$RAW" | jq -r '.result // empty')

if [[ -z "$TEXT" ]]; then
  echo "Claude returned no text. See $LOG_FILE" >&2
  printf "%s\n" "$RAW" >> "$LOG_FILE"
  exit 2
fi

# Strip optional ```json fences and trim to the first {...} block
JSON=$(printf "%s" "$TEXT" | sed -E 's/^[[:space:]]*```(json)?[[:space:]]*//; s/[[:space:]]*```[[:space:]]*$//' | awk '/^{/{f=1} f{print} /^}/{exit}')

if ! printf "%s" "$JSON" | jq empty 2>/dev/null; then
  echo "Claude output was not valid JSON; raw output saved to $LOG_FILE" >&2
  printf "%s\n" "$TEXT" >> "$LOG_FILE"
  exit 3
fi

printf "%s" "$JSON" | jq '.' > "$DATA_FILE"
echo "$NEW_SHA" > "$CHECKPOINT"

IDEA_COUNT=$(jq '.ideas | length' "$DATA_FILE")
echo "✓ Wrote $IDEA_COUNT ideas to $DATA_FILE"

if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
  VM=$(hostname)
  URL="https://${VM}.boxd.sh/inspiration/operatorai"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${IDEA_COUNT} new operatorai ideas to review: ${URL}" \
    >/dev/null && echo "✓ Telegram pinged"
fi
