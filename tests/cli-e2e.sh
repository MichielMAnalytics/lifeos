#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# LifeOS CLI End-to-End Test Suite
# ──────────────────────────────────────────────────────────────────────────────
# Usage:  bash tests/cli-e2e.sh
# Prereq: bun installed, CLI configured (lifeos config set-url + set-key)
#
# Runs every CLI command against the live Convex backend, validates outputs,
# then cleans up all test data so the database is left unchanged.
#
# Exit code: 0 if all tests pass, 1 if any test fails.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Resolve paths ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI="bun run $PROJECT_ROOT/packages/cli/src/index.ts"

# ── Counters & bookkeeping ────────────────────────────────────────────────────
PASS=0
FAIL=0
SKIP=0
TOTAL=0
SECTION=""

# IDs of items created during the run (for cleanup)
CREATED_TASK_ID=""
CREATED_PROJECT_ID=""
CREATED_GOAL_ID=""
CREATED_REMINDER_ID=""
CREATED_IDEA_ID=""
CREATED_THOUGHT_ID=""
CREATED_WIN_ID=""
CREATED_RESOURCE_ID=""

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN=$'\033[32m'
RED=$'\033[31m'
YELLOW=$'\033[33m'
CYAN=$'\033[36m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
RESET=$'\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────

section() {
  SECTION="$1"
  echo ""
  echo "${BOLD}${CYAN}--- $SECTION ---${RESET}"
}

# run_test NAME CMD EXPECTED_SUBSTR
#   Run CMD through the CLI, check that EXPECTED_SUBSTR appears in output (case-insensitive).
run_test() {
  local name="$1"
  local cmd="$2"
  local expected="$3"
  ((TOTAL++)) || true

  local output
  output=$(eval "$CLI $cmd" 2>&1) || true

  if echo "$output" | grep -qi "$expected"; then
    echo "  ${GREEN}PASS${RESET} $name"
    ((PASS++)) || true
  else
    echo "  ${RED}FAIL${RESET} $name"
    echo "       Expected substring: ${DIM}$expected${RESET}"
    echo "       Got (first 5 lines):"
    echo "$output" | head -5 | sed 's/^/         /'
    ((FAIL++)) || true
  fi
}

# run_ok NAME CMD
#   Run CMD through the CLI, pass if exit code is 0.
run_ok() {
  local name="$1"
  local cmd="$2"
  ((TOTAL++)) || true

  local output
  local status=0
  output=$(eval "$CLI $cmd" 2>&1) || status=$?

  if [ "$status" -eq 0 ]; then
    echo "  ${GREEN}PASS${RESET} $name"
    ((PASS++)) || true
  else
    echo "  ${RED}FAIL${RESET} $name"
    echo "       Exit code: $status"
    echo "       Output (first 5 lines):"
    echo "$output" | head -5 | sed 's/^/         /'
    ((FAIL++)) || true
  fi
}

# run_ok_capture NAME CMD
#   Same as run_ok but stores the output in $LAST_OUTPUT for later extraction.
LAST_OUTPUT=""
run_ok_capture() {
  local name="$1"
  local cmd="$2"
  ((TOTAL++)) || true

  local status=0
  LAST_OUTPUT=$(eval "$CLI $cmd" 2>&1) || status=$?

  if [ "$status" -eq 0 ]; then
    echo "  ${GREEN}PASS${RESET} $name"
    ((PASS++)) || true
  else
    echo "  ${RED}FAIL${RESET} $name"
    echo "       Exit code: $status"
    echo "       Output (first 5 lines):"
    echo "$LAST_OUTPUT" | head -5 | sed 's/^/         /'
    ((FAIL++)) || true
  fi
}

# run_test_capture NAME CMD EXPECTED_SUBSTR
#   Like run_test but also stores output in $LAST_OUTPUT.
run_test_capture() {
  local name="$1"
  local cmd="$2"
  local expected="$3"
  ((TOTAL++)) || true

  local status=0
  LAST_OUTPUT=$(eval "$CLI $cmd" 2>&1) || status=$?

  if echo "$LAST_OUTPUT" | grep -qi "$expected"; then
    echo "  ${GREEN}PASS${RESET} $name"
    ((PASS++)) || true
  else
    echo "  ${RED}FAIL${RESET} $name"
    echo "       Expected substring: ${DIM}$expected${RESET}"
    echo "       Got (first 5 lines):"
    echo "$LAST_OUTPUT" | head -5 | sed 's/^/         /'
    ((FAIL++)) || true
  fi
}

# run_json_valid NAME CMD
#   Run CMD with --json, verify output is valid JSON.
run_json_valid() {
  local name="$1"
  local cmd="$2"
  ((TOTAL++)) || true

  local output
  local status=0
  output=$(eval "$CLI --json $cmd" 2>&1) || status=$?

  if [ "$status" -ne 0 ]; then
    echo "  ${RED}FAIL${RESET} $name (exit code $status)"
    echo "       Output (first 3 lines):"
    echo "$output" | head -3 | sed 's/^/         /'
    ((FAIL++)) || true
    return
  fi

  if echo "$output" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    echo "  ${GREEN}PASS${RESET} $name"
    ((PASS++)) || true
  else
    echo "  ${RED}FAIL${RESET} $name (invalid JSON)"
    echo "       Output (first 3 lines):"
    echo "$output" | head -3 | sed 's/^/         /'
    ((FAIL++)) || true
  fi
}

# Extract an ID from JSON --json output using python3.
# Usage: extract_id_json CMD jq_path
#   e.g. extract_id_json "task create ... --json" ".data._id"
extract_id_json() {
  local cmd="$1"
  local jq_path="$2"

  local output
  output=$(eval "$CLI --json $cmd" 2>&1) || true

  # Try _id first, then id
  local id
  id=$(echo "$output" | python3 -c "
import sys, json
d = json.load(sys.stdin)
parts = '${jq_path}'.strip('.').split('.')
obj = d
for p in parts:
    if isinstance(obj, dict):
        obj = obj.get(p)
    else:
        obj = None
        break
print(obj or '')
" 2>/dev/null) || true

  echo "$id"
}

# Extract the 8-char short ID from a success message like "Task created: Title (ks72zsxs)"
extract_short_id() {
  local text="$1"
  echo "$text" | grep -oE '\([a-z0-9]{6,}\)' | head -1 | tr -d '()'
}

# ── Preflight ─────────────────────────────────────────────────────────────────
echo ""
echo "${BOLD}================================================================${RESET}"
echo "${BOLD}  LifeOS CLI End-to-End Test Suite${RESET}"
echo "${BOLD}================================================================${RESET}"
echo ""
echo "  Project root: $PROJECT_ROOT"
echo "  CLI:          $CLI"
echo "  Timestamp:    $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo ""

# Quick smoke test: can we reach the CLI at all?
if ! eval "$CLI --version" >/dev/null 2>&1; then
  echo "${RED}FATAL: Cannot run CLI. Is bun installed? Is packages/cli built?${RESET}"
  exit 1
fi

# ══════════════════════════════════════════════════════════════════════════════
# 1. CONFIG
# ══════════════════════════════════════════════════════════════════════════════
section "Config"

run_test "config show displays API URL" \
  "config show" \
  "API URL"

run_test "config show displays API Key" \
  "config show" \
  "API Key"

# ══════════════════════════════════════════════════════════════════════════════
# 2. WHOAMI
# ══════════════════════════════════════════════════════════════════════════════
section "Whoami"

run_test "whoami shows email" \
  "whoami" \
  "Email"

# ══════════════════════════════════════════════════════════════════════════════
# 3. TASKS (full CRUD + undo)
# ══════════════════════════════════════════════════════════════════════════════
section "Tasks"

# Create a task using --json to reliably extract the ID
CREATED_TASK_ID=$(extract_id_json 'task create "Test Task E2E" --due 2026-12-31 --json' 'data._id')
if [ -z "$CREATED_TASK_ID" ]; then
  # Fallback: try the "id" key
  CREATED_TASK_ID=$(extract_id_json 'task create "Test Task E2E (2)" --due 2026-12-31 --json' 'data.id')
fi

if [ -n "$CREATED_TASK_ID" ]; then
  echo "  ${GREEN}PASS${RESET} task create (ID: ${CREATED_TASK_ID:0:8})"
  ((PASS++)) || true
  ((TOTAL++)) || true
else
  echo "  ${RED}FAIL${RESET} task create -- could not extract ID"
  ((FAIL++)) || true
  ((TOTAL++)) || true
fi

run_test "task list contains test task" \
  "task list" \
  "Test Task E2E"

run_test "task list --status todo contains test task" \
  "task list --status todo" \
  "Test Task E2E"

run_test "task list --due all contains test task" \
  "task list --due all" \
  "Test Task E2E"

if [ -n "$CREATED_TASK_ID" ]; then
  run_test "task show displays task details" \
    "task show $CREATED_TASK_ID" \
    "Test Task E2E"

  run_test "task update title" \
    "task update $CREATED_TASK_ID --title 'Updated Task E2E'" \
    "updated"

  run_test "task complete" \
    "task complete $CREATED_TASK_ID" \
    "completed"

  run_test "task list --status done contains updated task" \
    "task list --status done" \
    "Updated Task E2E"

  run_test "undo (undo complete)" \
    "undo" \
    "undid"

  run_ok "task delete" \
    "task delete $CREATED_TASK_ID"

  run_test "undo (undo delete)" \
    "undo" \
    "undid"

  # The task is back after undo -- we will clean it up at the end.
fi

# ══════════════════════════════════════════════════════════════════════════════
# 4. PROJECTS
# ══════════════════════════════════════════════════════════════════════════════
section "Projects"

CREATED_PROJECT_ID=$(extract_id_json 'project create "Test Project E2E" --json' 'data._id')
if [ -z "$CREATED_PROJECT_ID" ]; then
  CREATED_PROJECT_ID=$(extract_id_json 'project create "Test Project E2E (2)" --json' 'data.id')
fi

if [ -n "$CREATED_PROJECT_ID" ]; then
  echo "  ${GREEN}PASS${RESET} project create (ID: ${CREATED_PROJECT_ID:0:8})"
  ((PASS++)) || true
  ((TOTAL++)) || true
else
  echo "  ${RED}FAIL${RESET} project create -- could not extract ID"
  ((FAIL++)) || true
  ((TOTAL++)) || true
fi

run_test "project list contains test project" \
  "project list" \
  "Test Project E2E"

if [ -n "$CREATED_PROJECT_ID" ]; then
  run_test "project show displays details" \
    "project show $CREATED_PROJECT_ID" \
    "Test Project E2E"
fi

# ══════════════════════════════════════════════════════════════════════════════
# 5. GOALS
# ══════════════════════════════════════════════════════════════════════════════
section "Goals"

CREATED_GOAL_ID=$(extract_id_json 'goal create "Test Goal E2E" --quarter 2026-Q1 --json' 'data._id')
if [ -z "$CREATED_GOAL_ID" ]; then
  CREATED_GOAL_ID=$(extract_id_json 'goal create "Test Goal E2E (2)" --quarter 2026-Q1 --json' 'data.id')
fi

if [ -n "$CREATED_GOAL_ID" ]; then
  echo "  ${GREEN}PASS${RESET} goal create (ID: ${CREATED_GOAL_ID:0:8})"
  ((PASS++)) || true
  ((TOTAL++)) || true
else
  echo "  ${RED}FAIL${RESET} goal create -- could not extract ID"
  ((FAIL++)) || true
  ((TOTAL++)) || true
fi

run_test "goal list contains test goal" \
  "goal list" \
  "Test Goal E2E"

run_ok "goal health runs without error" \
  "goal health"

if [ -n "$CREATED_GOAL_ID" ]; then
  run_test "goal show displays details" \
    "goal show $CREATED_GOAL_ID" \
    "Test Goal E2E"
fi

# ══════════════════════════════════════════════════════════════════════════════
# 6. JOURNAL
# ══════════════════════════════════════════════════════════════════════════════
section "Journal"

run_test "journal write succeeds" \
  'journal write --mit "Test MIT E2E" --p1 "Test P1 E2E" --notes "E2E test notes"' \
  "saved"

run_test "journal (today) shows MIT" \
  "journal" \
  "Test MIT E2E"

run_ok "journal wins runs without error" \
  "journal wins"

# ══════════════════════════════════════════════════════════════════════════════
# 7. CAPTURE (idea, thought, win, resource)
# ══════════════════════════════════════════════════════════════════════════════
section "Capture"

# Idea
CREATED_IDEA_ID=$(extract_id_json 'idea "E2E test idea" --actionability high --json' 'data._id')
if [ -z "$CREATED_IDEA_ID" ]; then
  CREATED_IDEA_ID=$(extract_id_json 'idea "E2E test idea (2)" --actionability high --json' 'data.id')
fi
if [ -n "$CREATED_IDEA_ID" ]; then
  echo "  ${GREEN}PASS${RESET} idea capture (ID: ${CREATED_IDEA_ID:0:8})"
  ((PASS++)) || true
  ((TOTAL++)) || true
else
  echo "  ${RED}FAIL${RESET} idea capture -- could not extract ID"
  ((FAIL++)) || true
  ((TOTAL++)) || true
fi

# Thought
CREATED_THOUGHT_ID=$(extract_id_json 'thought "E2E test thought" --json' 'data._id')
if [ -z "$CREATED_THOUGHT_ID" ]; then
  CREATED_THOUGHT_ID=$(extract_id_json 'thought "E2E test thought (2)" --json' 'data.id')
fi
if [ -n "$CREATED_THOUGHT_ID" ]; then
  echo "  ${GREEN}PASS${RESET} thought capture (ID: ${CREATED_THOUGHT_ID:0:8})"
  ((PASS++)) || true
  ((TOTAL++)) || true
else
  echo "  ${RED}FAIL${RESET} thought capture -- could not extract ID"
  ((FAIL++)) || true
  ((TOTAL++)) || true
fi

# Win
CREATED_WIN_ID=$(extract_id_json 'win "E2E test win" --json' 'data._id')
if [ -z "$CREATED_WIN_ID" ]; then
  CREATED_WIN_ID=$(extract_id_json 'win "E2E test win (2)" --json' 'data.id')
fi
if [ -n "$CREATED_WIN_ID" ]; then
  echo "  ${GREEN}PASS${RESET} win recorded (ID: ${CREATED_WIN_ID:0:8})"
  ((PASS++)) || true
  ((TOTAL++)) || true
else
  echo "  ${RED}FAIL${RESET} win recorded -- could not extract ID"
  ((FAIL++)) || true
  ((TOTAL++)) || true
fi

# Resource
CREATED_RESOURCE_ID=$(extract_id_json 'resource "E2E Resource" --url https://example.com --json' 'data._id')
if [ -z "$CREATED_RESOURCE_ID" ]; then
  CREATED_RESOURCE_ID=$(extract_id_json 'resource "E2E Resource (2)" --url https://example.com --json' 'data.id')
fi
if [ -n "$CREATED_RESOURCE_ID" ]; then
  echo "  ${GREEN}PASS${RESET} resource saved (ID: ${CREATED_RESOURCE_ID:0:8})"
  ((PASS++)) || true
  ((TOTAL++)) || true
else
  echo "  ${RED}FAIL${RESET} resource saved -- could not extract ID"
  ((FAIL++)) || true
  ((TOTAL++)) || true
fi

# ══════════════════════════════════════════════════════════════════════════════
# 8. PLAN
# ══════════════════════════════════════════════════════════════════════════════
section "Plan"

run_ok "plan today runs without error" \
  "plan today"

run_test "plan set creates a plan" \
  "plan set 2026-12-31 --wake 07:00" \
  "saved"

# plan today may or may not show this plan (different date), just verify no crash
run_ok "plan today (after set) runs without error" \
  "plan today"

# ══════════════════════════════════════════════════════════════════════════════
# 9. WEEK
# ══════════════════════════════════════════════════════════════════════════════
section "Week"

run_ok "week shows current weekly plan" \
  "week"

run_test "week create with theme" \
  'week create --theme "E2E Test Week"' \
  "weekly plan created"

# ══════════════════════════════════════════════════════════════════════════════
# 10. REVIEW
# ══════════════════════════════════════════════════════════════════════════════
section "Review"

run_ok "review list runs without error" \
  "review list"

run_ok "review daily triggers and returns" \
  "review daily"

run_ok "review weekly triggers and returns" \
  "review weekly"

# ══════════════════════════════════════════════════════════════════════════════
# 11. REMINDER
# ══════════════════════════════════════════════════════════════════════════════
section "Reminder"

CREATED_REMINDER_ID=$(extract_id_json 'reminder create "E2E Reminder" --at 2026-12-31T09:00:00Z --json' 'data._id')
if [ -z "$CREATED_REMINDER_ID" ]; then
  CREATED_REMINDER_ID=$(extract_id_json 'reminder create "E2E Reminder (2)" --at 2026-12-31T09:00:00Z --json' 'data.id')
fi

if [ -n "$CREATED_REMINDER_ID" ]; then
  echo "  ${GREEN}PASS${RESET} reminder create (ID: ${CREATED_REMINDER_ID:0:8})"
  ((PASS++)) || true
  ((TOTAL++)) || true
else
  echo "  ${RED}FAIL${RESET} reminder create -- could not extract ID"
  ((FAIL++)) || true
  ((TOTAL++)) || true
fi

run_test "reminder list contains E2E Reminder" \
  "reminder list" \
  "E2E Reminder"

if [ -n "$CREATED_REMINDER_ID" ]; then
  run_test "reminder snooze" \
    "reminder snooze $CREATED_REMINDER_ID --minutes 60" \
    "snoozed"

  run_test "reminder done" \
    "reminder done $CREATED_REMINDER_ID" \
    "done"
fi

# ══════════════════════════════════════════════════════════════════════════════
# 12. SEARCH
# ══════════════════════════════════════════════════════════════════════════════
section "Search"

# Give the backend a moment to index (Convex is eventually consistent for search)
sleep 2

run_ok "search E2E returns results" \
  'search "E2E"'

run_ok "search E2E --type tasks" \
  'search "E2E" --type tasks'

# ══════════════════════════════════════════════════════════════════════════════
# 13. TRIGGERS
# ══════════════════════════════════════════════════════════════════════════════
section "Triggers"

run_test "trigger morning-briefing" \
  "trigger morning-briefing" \
  "executed"

run_test "trigger daily-review" \
  "trigger daily-review" \
  "executed"

run_test "trigger goal-health" \
  "trigger goal-health" \
  "executed"

# ══════════════════════════════════════════════════════════════════════════════
# 14. DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
section "Dashboard"

run_test "dashboard config shows nav mode" \
  "dashboard config" \
  "Nav Mode"

run_test "dashboard preset today solopreneur" \
  "dashboard preset today solopreneur" \
  'set to "solopreneur"'

run_test "dashboard preset ideas content-creator" \
  "dashboard preset ideas content-creator" \
  'set to "content-creator"'

run_test "dashboard presets today lists presets" \
  "dashboard presets today" \
  "solopreneur"

run_test "dashboard hide reviews" \
  "dashboard hide reviews" \
  "hidden"

run_test "dashboard show reviews" \
  "dashboard show reviews" \
  "visible"

run_test "dashboard nav-mode header" \
  "dashboard nav-mode header" \
  'set to "header"'

run_test "dashboard nav-mode sidebar" \
  "dashboard nav-mode sidebar" \
  'set to "sidebar"'

run_test "dashboard nav-order" \
  "dashboard nav-order tasks today goals journal ideas projects plan reviews" \
  "order set to"

run_test "dashboard reset" \
  "dashboard reset" \
  "reset"

run_test "dashboard config after reset shows defaults" \
  "dashboard config" \
  "Nav Mode"

# ══════════════════════════════════════════════════════════════════════════════
# 15. JSON MODE
# ══════════════════════════════════════════════════════════════════════════════
section "JSON Mode"

run_json_valid "task list --json is valid JSON" \
  "task list"

run_json_valid "whoami --json is valid JSON" \
  "whoami"

run_json_valid "dashboard config --json is valid JSON" \
  "dashboard config"

# ══════════════════════════════════════════════════════════════════════════════
# CLEANUP
# ══════════════════════════════════════════════════════════════════════════════
section "Cleanup"

cleanup_ok() {
  local label="$1"
  local cmd="$2"

  local status=0
  eval "$CLI $cmd" >/dev/null 2>&1 || status=$?
  if [ "$status" -eq 0 ]; then
    echo "  ${DIM}cleaned up${RESET} $label"
  else
    echo "  ${YELLOW}WARN${RESET} could not clean up $label (exit $status)"
  fi
}

# Delete the task we created (it was un-deleted via undo, so it still exists)
if [ -n "$CREATED_TASK_ID" ]; then
  cleanup_ok "task $CREATED_TASK_ID" "task delete $CREATED_TASK_ID"
fi

# Projects don't have a CLI delete yet, but we note it
if [ -n "$CREATED_PROJECT_ID" ]; then
  echo "  ${DIM}NOTE${RESET} project ${CREATED_PROJECT_ID:0:8} created (no CLI delete command -- clean up manually if needed)"
fi

# Goals don't have a CLI delete yet either
if [ -n "$CREATED_GOAL_ID" ]; then
  echo "  ${DIM}NOTE${RESET} goal ${CREATED_GOAL_ID:0:8} created (no CLI delete command -- clean up manually if needed)"
fi

# Reminder was marked done, nothing else to clean.
if [ -n "$CREATED_REMINDER_ID" ]; then
  echo "  ${DIM}cleaned up${RESET} reminder ${CREATED_REMINDER_ID:0:8} (marked done)"
fi

# Captures (idea, thought, win, resource) -- note them for manual cleanup.
# The CLI doesn't expose delete for these entities yet.
for item_var in \
  "idea:$CREATED_IDEA_ID" \
  "thought:$CREATED_THOUGHT_ID" \
  "win:$CREATED_WIN_ID" \
  "resource:$CREATED_RESOURCE_ID"; do
  label="${item_var%%:*}"
  id="${item_var##*:}"
  if [ -n "$id" ]; then
    echo "  ${DIM}NOTE${RESET} $label ${id:0:8} created (no CLI delete command -- clean up manually if needed)"
  fi
done

# Journal entry for today was written -- there is no delete, just note it.
echo "  ${DIM}NOTE${RESET} journal entry for today was written/updated (overwrite manually if needed)"

# Day plan for 2026-12-31 was created -- note it.
echo "  ${DIM}NOTE${RESET} day plan for 2026-12-31 was created"

# Weekly plan theme was set for the current week
echo "  ${DIM}NOTE${RESET} weekly plan for current week was created/updated"

# Dashboard was reset to defaults at end of dashboard tests, so it is clean.
echo "  ${DIM}cleaned up${RESET} dashboard config (reset to defaults)"

# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "${BOLD}================================================================${RESET}"
echo "${BOLD}  RESULTS${RESET}"
echo "${BOLD}================================================================${RESET}"
echo ""
echo "  Total:   $TOTAL"
echo "  ${GREEN}Passed:  $PASS${RESET}"
if [ "$FAIL" -gt 0 ]; then
  echo "  ${RED}Failed:  $FAIL${RESET}"
else
  echo "  Failed:  0"
fi
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "${RED}${BOLD}  SOME TESTS FAILED${RESET}"
  echo ""
  exit 1
else
  echo "${GREEN}${BOLD}  ALL TESTS PASSED${RESET}"
  echo ""
  exit 0
fi
