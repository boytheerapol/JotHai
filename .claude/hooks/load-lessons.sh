#!/bin/bash
# SessionStart hook: inject tasks/lessons.md into Claude's context at session start.
#
# Pairs with "CLAUDE Template (Project).md" -> section 7 "Self-Improvement Loop",
# which tells Claude to skim tasks/lessons.md before working. Claude Code does NOT read
# that file on its own, so this hook surfaces it.
#
# Behavior:
#   - No tasks/lessons.md (or empty)        -> print {} (no-op)
#   - jq not available                      -> print {} (fail open)
#   - Otherwise                             -> emit the file as additionalContext,
#                                              capped to MAX_LINES / MAX_BYTES so a
#                                              long log never blows the context budget.
#
# Never exits non-zero and never blocks: a broken hook must not break session start.

set -u

LESSONS_FILE="tasks/lessons.md"
MAX_LINES=200
MAX_BYTES=8192

# Drain stdin (SessionStart payload) so we don't leave the pipe dangling. Unused.
cat >/dev/null 2>&1 || true

emit_noop() { printf '{}\n'; exit 0; }

command -v jq >/dev/null 2>&1 || emit_noop
[ -s "$LESSONS_FILE" ] || emit_noop

body="$(head -n "$MAX_LINES" "$LESSONS_FILE")"
truncated=0
[ "$(wc -l < "$LESSONS_FILE")" -gt "$MAX_LINES" ] && truncated=1

# Byte cap (handles a single huge line that slips past the line cap).
if [ "${#body}" -gt "$MAX_BYTES" ]; then
  body="${body:0:$MAX_BYTES}"
  truncated=1
fi

header="Project lessons learned (from $LESSONS_FILE) — review before working; do not repeat these mistakes:"
context="$header"$'\n\n'"$body"
[ "$truncated" -eq 1 ] && context="$context"$'\n\n'"...(truncated — open $LESSONS_FILE for the full log)"

jq -n --arg ctx "$context" \
  '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}' \
  2>/dev/null || emit_noop
