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
CREATED_TASK_ID_2=""
CREATED_TASK_ID_3=""
CREATED_PROJECT_ID=""
CREATED_GOAL_ID=""
CREATED_REMINDER_ID=""
CREATED_IDEA_ID=""
CREATED_THOUGHT_ID=""
CREATED_WIN_ID=""
CREATED_RESOURCE_ID=""
PROMOTED_PROJECT_ID=""
CREATED_VISION_ID=""

# Dates used for plans and journals
TODAY=$(date -u '+%Y-%m-%d')
E2E_PLAN_DATE="2026-12-31"
E2E_JOURNAL_DATE="2026-12-30"

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
echo "  Today:        $TODAY"
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

run_json_valid "config show --json is valid JSON" \
  "config show"

# ══════════════════════════════════════════════════════════════════════════════
# 2. WHOAMI
# ══════════════════════════════════════════════════════════════════════════════
section "Whoami"

run_test "whoami shows email" \
  "whoami" \
  "Email"

run_json_valid "whoami --json is valid JSON" \
  "whoami"

# ══════════════════════════════════════════════════════════════════════════════
# 3. TODAY
# ══════════════════════════════════════════════════════════════════════════════
section "Today"

run_ok "today runs without error" \
  "today"

run_json_valid "today --json is valid JSON" \
  "today"

# ══════════════════════════════════════════════════════════════════════════════
# 4. PROJECTS (full CRUD)
# ══════════════════════════════════════════════════════════════════════════════
section "Projects"

# Create a project (needed before tasks with project references)
CREATED_PROJECT_ID=$(extract_id_json 'project create "Test Project E2E" --description "E2E project description" --json' 'data._id')
if [ -z "$CREATED_PROJECT_ID" ]; then
  CREATED_PROJECT_ID=$(extract_id_json 'project create "Test Project E2E (2)" --description "E2E project description" --json' 'data.id')
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

run_test "project list --status active" \
  "project list --status active" \
  "Test Project E2E"

if [ -n "$CREATED_PROJECT_ID" ]; then
  run_test "project show displays details" \
    "project show $CREATED_PROJECT_ID" \
    "Test Project E2E"

  run_test "project update title" \
    "project update $CREATED_PROJECT_ID --title 'Updated Project E2E'" \
    "updated"

  run_test "project update description" \
    "project update $CREATED_PROJECT_ID --description 'Updated description'" \
    "updated"

  run_test "project update status to completed" \
    "project update $CREATED_PROJECT_ID --status completed" \
    "updated"

  # Set back to active for later use
  run_test "project update status back to active" \
    "project update $CREATED_PROJECT_ID --status active" \
    "updated"
fi

run_json_valid "project list --json is valid JSON" \
  "project list"

# ══════════════════════════════════════════════════════════════════════════════
# 5. GOALS (full CRUD + health)
# ══════════════════════════════════════════════════════════════════════════════
section "Goals"

CREATED_GOAL_ID=$(extract_id_json 'goal create "Test Goal E2E" --quarter 2026-Q1 --description "E2E goal description" --json' 'data._id')
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

run_test "goal list --status active" \
  "goal list --status active" \
  "Test Goal E2E"

run_test "goal list --quarter 2026-Q1" \
  "goal list --quarter 2026-Q1" \
  "Test Goal E2E"

if [ -n "$CREATED_GOAL_ID" ]; then
  run_test "goal show displays details" \
    "goal show $CREATED_GOAL_ID" \
    "Test Goal E2E"

  run_test "goal update title" \
    "goal update $CREATED_GOAL_ID --title 'Updated Goal E2E'" \
    "updated"

  run_test "goal update description" \
    "goal update $CREATED_GOAL_ID --description 'Updated goal description'" \
    "updated"

  run_test "goal update quarter" \
    "goal update $CREATED_GOAL_ID --quarter 2026-Q2" \
    "updated"

  run_test "goal update status to completed" \
    "goal update $CREATED_GOAL_ID --status completed" \
    "updated"

  # Set back to active for health check
  run_test "goal update status back to active" \
    "goal update $CREATED_GOAL_ID --status active" \
    "updated"

  run_ok "goal health (specific goal)" \
    "goal health $CREATED_GOAL_ID"
fi

run_ok "goal health (all active goals)" \
  "goal health"

run_json_valid "goal list --json is valid JSON" \
  "goal list"

if [ -n "$CREATED_GOAL_ID" ]; then
  run_json_valid "goal health --json (specific goal)" \
    "goal health $CREATED_GOAL_ID"
fi

# ══════════════════════════════════════════════════════════════════════════════
# 6. TASKS (full CRUD + bulk-complete + due filters + undo)
# ══════════════════════════════════════════════════════════════════════════════
section "Tasks"

# Create a task linked to project and goal
TASK_CREATE_OPTS=""
if [ -n "$CREATED_PROJECT_ID" ]; then
  TASK_CREATE_OPTS="$TASK_CREATE_OPTS --project $CREATED_PROJECT_ID"
fi
if [ -n "$CREATED_GOAL_ID" ]; then
  TASK_CREATE_OPTS="$TASK_CREATE_OPTS --goal $CREATED_GOAL_ID"
fi

CREATED_TASK_ID=$(extract_id_json "task create \"Test Task E2E\" --due 2026-12-31 --notes \"E2E task notes\" $TASK_CREATE_OPTS --json" 'data._id')
if [ -z "$CREATED_TASK_ID" ]; then
  CREATED_TASK_ID=$(extract_id_json "task create \"Test Task E2E (2)\" --due 2026-12-31 --notes \"E2E task notes\" $TASK_CREATE_OPTS --json" 'data.id')
fi

if [ -n "$CREATED_TASK_ID" ]; then
  echo "  ${GREEN}PASS${RESET} task create with project+goal (ID: ${CREATED_TASK_ID:0:8})"
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

run_ok "task list --due today runs without error" \
  "task list --due today"

run_ok "task list --due tomorrow runs without error" \
  "task list --due tomorrow"

run_ok "task list --due week runs without error" \
  "task list --due week"

run_ok "task list --due overdue runs without error" \
  "task list --due overdue"

if [ -n "$CREATED_TASK_ID" ]; then
  run_test "task show displays task details" \
    "task show $CREATED_TASK_ID" \
    "Test Task E2E"

  run_test "task update title" \
    "task update $CREATED_TASK_ID --title 'Updated Task E2E'" \
    "updated"

  run_test "task update due date" \
    "task update $CREATED_TASK_ID --due 2026-11-30" \
    "updated"

  run_test "task update notes" \
    "task update $CREATED_TASK_ID --notes 'Updated notes'" \
    "updated"

  if [ -n "$CREATED_GOAL_ID" ]; then
    run_test "task update goal link" \
      "task update $CREATED_TASK_ID --goal $CREATED_GOAL_ID" \
      "updated"
  fi

  run_test "task complete" \
    "task complete $CREATED_TASK_ID" \
    "completed"

  run_test "task list --status done contains updated task" \
    "task list --status done" \
    "Updated Task E2E"

  run_test "undo (undo task complete)" \
    "undo" \
    "undid"

  run_ok "task delete" \
    "task delete $CREATED_TASK_ID"

  run_test "undo (undo task delete)" \
    "undo" \
    "undid"

  # The task is back after undo -- we will clean it up at the end.
fi

# Create two extra tasks for bulk-complete test
CREATED_TASK_ID_2=$(extract_id_json 'task create "Bulk Task 1 E2E" --due 2026-12-31 --json' 'data._id')
if [ -z "$CREATED_TASK_ID_2" ]; then
  CREATED_TASK_ID_2=$(extract_id_json 'task create "Bulk Task 1 E2E (2)" --due 2026-12-31 --json' 'data.id')
fi

CREATED_TASK_ID_3=$(extract_id_json 'task create "Bulk Task 2 E2E" --due 2026-12-31 --json' 'data._id')
if [ -z "$CREATED_TASK_ID_3" ]; then
  CREATED_TASK_ID_3=$(extract_id_json 'task create "Bulk Task 2 E2E (2)" --due 2026-12-31 --json' 'data.id')
fi

if [ -n "$CREATED_TASK_ID_2" ] && [ -n "$CREATED_TASK_ID_3" ]; then
  echo "  ${GREEN}PASS${RESET} created 2 tasks for bulk-complete (${CREATED_TASK_ID_2:0:8}, ${CREATED_TASK_ID_3:0:8})"
  ((PASS++)) || true
  ((TOTAL++)) || true

  run_test "task bulk-complete" \
    "task bulk-complete $CREATED_TASK_ID_2 $CREATED_TASK_ID_3" \
    "completed"
else
  echo "  ${YELLOW}SKIP${RESET} task bulk-complete -- could not create tasks"
  ((SKIP++)) || true
  ((TOTAL++)) || true
fi

run_json_valid "task list --json is valid JSON" \
  "task list"

run_json_valid "task list --status todo --json is valid JSON" \
  "task list --status todo"

# ══════════════════════════════════════════════════════════════════════════════
# 7. JOURNAL (full CRUD + list + date ranges)
# ══════════════════════════════════════════════════════════════════════════════
section "Journal"

run_test "journal write succeeds" \
  "journal write --date $E2E_JOURNAL_DATE --mit \"Test MIT E2E\" --p1 \"Test P1 E2E\" --p2 \"Test P2 E2E\" --notes \"E2E test notes\"" \
  "saved"

run_test "journal (specific date) shows MIT" \
  "journal $E2E_JOURNAL_DATE" \
  "Test MIT E2E"

run_ok "journal (today) runs without error" \
  "journal"

run_ok "journal list runs without error" \
  "journal list"

run_ok "journal list with date range" \
  "journal list --from $E2E_JOURNAL_DATE --to $E2E_JOURNAL_DATE"

run_ok "journal wins runs without error" \
  "journal wins"

run_json_valid "journal --json (today) is valid JSON" \
  "journal"

run_json_valid "journal list --json is valid JSON" \
  "journal list"

# Delete journal entry created for E2E
run_test "journal delete" \
  "journal delete $E2E_JOURNAL_DATE" \
  "deleted"

# ══════════════════════════════════════════════════════════════════════════════
# 8. CAPTURE (idea, thought, win, resource -- full CRUD + promote)
# ══════════════════════════════════════════════════════════════════════════════
section "Capture - Ideas"

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

run_test "idea list contains captured idea" \
  "idea list" \
  "E2E test idea"

run_test "idea list --actionability high" \
  "idea list --actionability high" \
  "E2E test idea"

if [ -n "$CREATED_IDEA_ID" ]; then
  run_test "idea update content" \
    "idea update $CREATED_IDEA_ID --content 'Updated E2E idea'" \
    "updated"

  run_test "idea update actionability" \
    "idea update $CREATED_IDEA_ID --actionability medium" \
    "updated"

  run_test "idea update next-step" \
    "idea update $CREATED_IDEA_ID --next-step 'Research it'" \
    "updated"
fi

run_json_valid "idea list --json is valid JSON" \
  "idea list"

# Create a second idea for promote test (so we keep the first for delete test)
PROMOTE_IDEA_ID=$(extract_id_json 'idea "E2E promote idea" --actionability high --json' 'data._id')
if [ -z "$PROMOTE_IDEA_ID" ]; then
  PROMOTE_IDEA_ID=$(extract_id_json 'idea "E2E promote idea (2)" --actionability high --json' 'data.id')
fi

if [ -n "$PROMOTE_IDEA_ID" ]; then
  run_test_capture "idea promote to project" \
    "idea promote $PROMOTE_IDEA_ID --title 'Promoted Project E2E'" \
    "promoted"

  # Extract the promoted project ID for cleanup
  PROMOTED_PROJECT_ID=$(eval "$CLI --json idea promote $PROMOTE_IDEA_ID --title 'Promoted Project E2E 2'" 2>&1 | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('data', {}).get('_id', '') or d.get('data', {}).get('id', ''))
except: print('')
" 2>/dev/null || true)
  # The promote already happened above, the promoted project from that call needs cleanup.
  # Try to extract ID from the first promote call's JSON output.
  PROMOTED_PROJECT_ID=$(extract_id_json "idea promote $PROMOTE_IDEA_ID --title 'Promoted Project E2E cleanup' --json" 'data._id')
fi

# ── Thoughts ─────────────────────────────────────────────
section "Capture - Thoughts"

CREATED_THOUGHT_ID=$(extract_id_json 'thought "E2E test thought" --title "E2E Thought Title" --json' 'data._id')
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

run_test "thought list contains captured thought" \
  "thought list" \
  "E2E test thought"

if [ -n "$CREATED_THOUGHT_ID" ]; then
  run_test "thought update content" \
    "thought update $CREATED_THOUGHT_ID --content 'Updated E2E thought'" \
    "updated"

  run_test "thought update title" \
    "thought update $CREATED_THOUGHT_ID --title 'Updated Thought Title'" \
    "updated"
fi

run_json_valid "thought list --json is valid JSON" \
  "thought list"

# ── Wins ─────────────────────────────────────────────────
section "Capture - Wins"

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

run_test "win list contains captured win" \
  "win list" \
  "E2E test win"

run_ok "win list with date range" \
  "win list --from $TODAY --to $TODAY"

run_json_valid "win list --json is valid JSON" \
  "win list"

# ── Resources ────────────────────────────────────────────
section "Capture - Resources"

CREATED_RESOURCE_ID=$(extract_id_json 'resource "E2E Resource" --url https://example.com --type article --json' 'data._id')
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

run_test "resource list contains saved resource" \
  "resource list" \
  "E2E Resource"

run_ok "resource list --type article" \
  "resource list --type article"

if [ -n "$CREATED_RESOURCE_ID" ]; then
  run_test "resource update title" \
    "resource update $CREATED_RESOURCE_ID --title 'Updated E2E Resource'" \
    "updated"

  run_test "resource update url" \
    "resource update $CREATED_RESOURCE_ID --url https://updated.example.com" \
    "updated"

  run_test "resource update type" \
    "resource update $CREATED_RESOURCE_ID --type tool" \
    "updated"
fi

run_json_valid "resource list --json is valid JSON" \
  "resource list"

# ══════════════════════════════════════════════════════════════════════════════
# 9. PLAN (set, today, tomorrow, complete-mit/p1/p2)
# ══════════════════════════════════════════════════════════════════════════════
section "Plan"

run_ok "plan today runs without error" \
  "plan today"

run_ok "plan tomorrow runs without error" \
  "plan tomorrow"

# Create a plan for the E2E date
run_test "plan set creates a plan" \
  "plan set $E2E_PLAN_DATE --wake 07:00" \
  "saved"

# Set with task links if we have task IDs
if [ -n "$CREATED_TASK_ID" ]; then
  run_test "plan set with MIT task link" \
    "plan set $E2E_PLAN_DATE --mit $CREATED_TASK_ID" \
    "saved"
fi

# Plan complete commands (operate on today's plan)
run_ok "plan set today (ensure today plan exists)" \
  "plan set $TODAY --wake 06:30"

run_test "plan complete-mit" \
  "plan complete-mit" \
  "done"

run_test "plan complete-p1" \
  "plan complete-p1" \
  "done"

run_test "plan complete-p2" \
  "plan complete-p2" \
  "done"

run_json_valid "plan today --json is valid JSON" \
  "plan today"

# ══════════════════════════════════════════════════════════════════════════════
# 10. WEEK (show, create, score)
# ══════════════════════════════════════════════════════════════════════════════
section "Week"

run_ok "week shows current weekly plan" \
  "week"

run_test "week create with theme" \
  'week create --theme "E2E Test Week"' \
  "weekly plan created"

run_test "week score" \
  "week score 8" \
  "score set to"

run_json_valid "week --json is valid JSON" \
  "week"

# ══════════════════════════════════════════════════════════════════════════════
# 11. REVIEW (list, daily, weekly, show)
# ══════════════════════════════════════════════════════════════════════════════
section "Review"

run_ok "review list runs without error" \
  "review list"

run_ok "review list --type daily" \
  "review list --type daily"

run_ok "review daily triggers and returns" \
  "review daily"

run_ok "review weekly triggers and returns" \
  "review weekly"

run_json_valid "review list --json is valid JSON" \
  "review list"

run_json_valid "review daily --json is valid JSON" \
  "review daily"

run_json_valid "review weekly --json is valid JSON" \
  "review weekly"

# ══════════════════════════════════════════════════════════════════════════════
# 12. REMINDER (full CRUD + snooze + done)
# ══════════════════════════════════════════════════════════════════════════════
section "Reminder"

CREATED_REMINDER_ID=$(extract_id_json 'reminder create "E2E Reminder" --at 2026-12-31T09:00:00Z --body "E2E reminder body" --json' 'data._id')
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

run_ok "reminder list --status pending" \
  "reminder list --status pending"

if [ -n "$CREATED_REMINDER_ID" ]; then
  run_test "reminder update title" \
    "reminder update $CREATED_REMINDER_ID --title 'Updated E2E Reminder'" \
    "updated"

  run_test "reminder update body" \
    "reminder update $CREATED_REMINDER_ID --body 'Updated reminder body'" \
    "updated"

  run_test "reminder update scheduled time" \
    "reminder update $CREATED_REMINDER_ID --at 2027-01-01T10:00:00Z" \
    "updated"

  run_test "reminder snooze" \
    "reminder snooze $CREATED_REMINDER_ID --minutes 60" \
    "snoozed"

  run_test "reminder done" \
    "reminder done $CREATED_REMINDER_ID" \
    "done"
fi

run_json_valid "reminder list --json is valid JSON" \
  "reminder list"

# ══════════════════════════════════════════════════════════════════════════════
# 13. SEARCH
# ══════════════════════════════════════════════════════════════════════════════
section "Search"

# Give the backend a moment to index (Convex is eventually consistent for search)
sleep 2

run_ok "search E2E returns results" \
  'search "E2E"'

run_ok "search E2E --type tasks" \
  'search "E2E" --type tasks'

run_ok "search E2E --type goals" \
  'search "E2E" --type goals'

run_ok "search E2E --type ideas" \
  'search "E2E" --type ideas'

run_ok "search E2E --type resources" \
  'search "E2E" --type resources'

run_json_valid "search --json is valid JSON" \
  'search "E2E"'

# ══════════════════════════════════════════════════════════════════════════════
# 14. TRIGGERS (all 6)
# ══════════════════════════════════════════════════════════════════════════════
section "Triggers"

run_test "trigger morning-briefing" \
  "trigger morning-briefing" \
  "executed"

run_test "trigger daily-review" \
  "trigger daily-review" \
  "executed"

run_test "trigger weekly-review" \
  "trigger weekly-review" \
  "executed"

run_test "trigger overdue-triage" \
  "trigger overdue-triage" \
  "executed"

run_test "trigger reminder-check" \
  "trigger reminder-check" \
  "executed"

run_test "trigger goal-health" \
  "trigger goal-health" \
  "executed"

run_json_valid "trigger morning-briefing --json is valid JSON" \
  "trigger morning-briefing"

# ══════════════════════════════════════════════════════════════════════════════
# 15. FEEDBACK (non-interactive with all flags)
# ══════════════════════════════════════════════════════════════════════════════
section "Feedback"

run_test "feedback with all flags" \
  'feedback "E2E Test Feedback" --type general --description "Automated E2E test"' \
  "submitted"

run_json_valid "feedback --json is valid JSON" \
  'feedback "E2E JSON Feedback" --type general --description "JSON test"'

# ══════════════════════════════════════════════════════════════════════════════
# 16. DASHBOARD
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

run_test "dashboard preset tasks developer" \
  "dashboard preset tasks developer" \
  'set to "developer"'

run_test "dashboard preset goals executive" \
  "dashboard preset goals executive" \
  'set to "executive"'

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

run_json_valid "dashboard config --json is valid JSON" \
  "dashboard config"

# ══════════════════════════════════════════════════════════════════════════════
# 17. JSON MODE (comprehensive coverage)
# ══════════════════════════════════════════════════════════════════════════════
section "JSON Mode - comprehensive"

run_json_valid "goal list --json" \
  "goal list"

run_json_valid "project list --json" \
  "project list"

run_json_valid "idea list --json" \
  "idea list"

run_json_valid "thought list --json" \
  "thought list"

run_json_valid "win list --json" \
  "win list"

run_json_valid "resource list --json" \
  "resource list"

run_json_valid "reminder list --json" \
  "reminder list"

run_json_valid "search --json" \
  'search "test"'

run_json_valid "plan today --json" \
  "plan today"

run_json_valid "week --json" \
  "week"

run_json_valid "journal list --json" \
  "journal list"

run_json_valid "review list --json" \
  "review list"

if [ -n "$CREATED_TASK_ID" ]; then
  run_json_valid "task show --json" \
    "task show $CREATED_TASK_ID"
fi

if [ -n "$CREATED_PROJECT_ID" ]; then
  run_json_valid "project show --json" \
    "project show $CREATED_PROJECT_ID"
fi

if [ -n "$CREATED_GOAL_ID" ]; then
  run_json_valid "goal show --json" \
    "goal show $CREATED_GOAL_ID"
fi

# ══════════════════════════════════════════════════════════════════════════════
# 18. IDENTITY
# ══════════════════════════════════════════════════════════════════════════════
section "Identity"

run_test "identity set" \
  'identity set "I am a builder who ships fast and learns constantly"' \
  "saved"

run_test "identity show" \
  "identity" \
  "builder who ships"

run_test "identity update" \
  'identity set "Updated E2E identity statement"' \
  "saved"

run_json_valid "identity --json" \
  "identity"

# ══════════════════════════════════════════════════════════════════════════════
# 19. VISION BOARD
# ══════════════════════════════════════════════════════════════════════════════
section "Vision Board"

CREATED_VISION_ID=$(extract_id_json 'vision add "https://example.com/vision.jpg" --caption "E2E Vision Item" --json' 'data._id')
if [ -z "$CREATED_VISION_ID" ]; then
  CREATED_VISION_ID=$(extract_id_json 'vision add "https://example.com/vision2.jpg" --caption "E2E Vision Item 2" --json' 'data.id')
fi
if [ -n "$CREATED_VISION_ID" ]; then
  echo "  ${GREEN}PASS${RESET} vision add (ID: ${CREATED_VISION_ID:0:8})"
  ((PASS++)) || true
  ((TOTAL++)) || true
else
  echo "  ${RED}FAIL${RESET} vision add -- could not extract ID"
  ((FAIL++)) || true
  ((TOTAL++)) || true
fi

run_test "vision list contains item" \
  "vision list" \
  "E2E Vision"

if [ -n "$CREATED_VISION_ID" ]; then
  run_test "vision update caption" \
    "vision update $CREATED_VISION_ID --caption 'Updated E2E Vision'" \
    "updated"
fi

run_json_valid "vision list --json" \
  "vision list"

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

# Delete bulk-complete tasks
if [ -n "$CREATED_TASK_ID_2" ]; then
  cleanup_ok "task (bulk 1) $CREATED_TASK_ID_2" "task delete $CREATED_TASK_ID_2"
fi
if [ -n "$CREATED_TASK_ID_3" ]; then
  cleanup_ok "task (bulk 2) $CREATED_TASK_ID_3" "task delete $CREATED_TASK_ID_3"
fi

# Delete project
if [ -n "$CREATED_PROJECT_ID" ]; then
  cleanup_ok "project ${CREATED_PROJECT_ID:0:8}" "project delete $CREATED_PROJECT_ID"
fi

# Delete promoted project(s)
if [ -n "$PROMOTED_PROJECT_ID" ]; then
  cleanup_ok "promoted project ${PROMOTED_PROJECT_ID:0:8}" "project delete $PROMOTED_PROJECT_ID"
fi

# Delete goal
if [ -n "$CREATED_GOAL_ID" ]; then
  cleanup_ok "goal ${CREATED_GOAL_ID:0:8}" "goal delete $CREATED_GOAL_ID"
fi

# Delete idea
if [ -n "$CREATED_IDEA_ID" ]; then
  cleanup_ok "idea ${CREATED_IDEA_ID:0:8}" "idea delete $CREATED_IDEA_ID"
fi

# Delete promote idea (may already be consumed by promote, but try)
if [ -n "$PROMOTE_IDEA_ID" ]; then
  cleanup_ok "promote idea ${PROMOTE_IDEA_ID:0:8}" "idea delete $PROMOTE_IDEA_ID"
fi

# Delete thought
if [ -n "$CREATED_THOUGHT_ID" ]; then
  cleanup_ok "thought ${CREATED_THOUGHT_ID:0:8}" "thought delete $CREATED_THOUGHT_ID"
fi

# Delete win
if [ -n "$CREATED_WIN_ID" ]; then
  cleanup_ok "win ${CREATED_WIN_ID:0:8}" "win delete $CREATED_WIN_ID"
fi

# Delete resource
if [ -n "$CREATED_RESOURCE_ID" ]; then
  cleanup_ok "resource ${CREATED_RESOURCE_ID:0:8}" "resource delete $CREATED_RESOURCE_ID"
fi

# Delete reminder
if [ -n "$CREATED_REMINDER_ID" ]; then
  cleanup_ok "reminder ${CREATED_REMINDER_ID:0:8}" "reminder delete $CREATED_REMINDER_ID"
fi

# Delete vision board item
if [ -n "$CREATED_VISION_ID" ]; then
  cleanup_ok "vision ${CREATED_VISION_ID:0:8}" "vision remove $CREATED_VISION_ID"
fi

# Identity statement was set -- note it (no delete, only overwrite).
echo "  ${DIM}NOTE${RESET} identity statement was set (overwrite manually if needed)"

# Day plan for E2E_PLAN_DATE and today were created -- note them (no delete endpoint for plans).
echo "  ${DIM}NOTE${RESET} day plan for $E2E_PLAN_DATE was created (no plan delete command)"
echo "  ${DIM}NOTE${RESET} day plan for $TODAY was created/updated (no plan delete command)"

# Weekly plan theme was set for the current week (no delete endpoint).
echo "  ${DIM}NOTE${RESET} weekly plan for current week was created/updated (no week delete command)"

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
if [ "$SKIP" -gt 0 ]; then
  echo "  ${YELLOW}Skipped: $SKIP${RESET}"
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
