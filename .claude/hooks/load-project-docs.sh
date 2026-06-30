#!/bin/bash
# SessionStart hook: inject key sections of docs/PRD.md and docs/design-system.md
# into Claude's context at session start.
#
# Injects:
#   - docs/PRD.md           : Problem Statement + User Stories (~60 lines)
#   - docs/design-system.md : §2 Color token table + §9 Surface consistency checklist (~80 lines)
#
# Both files are scoped to this project only (JotHai). This hook lives in
# .claude/hooks/ alongside load-lessons.sh and is registered in .claude/settings.json.
#
# Never exits non-zero and never blocks: a broken hook must not break session start.

set -u

PRD_FILE="docs/PRD.md"
DESIGN_FILE="docs/design-system.md"
MAX_BYTES=12288

cat >/dev/null 2>&1 || true

emit_noop() { printf '{}\n'; exit 0; }

command -v jq >/dev/null 2>&1 || emit_noop
command -v awk >/dev/null 2>&1 || emit_noop

# --- Extract PRD sections: Problem Statement through end of User Stories ---
extract_prd() {
  [ -f "$PRD_FILE" ] || return
  # Print from start up to (not including) "## Implementation Decisions"
  awk '/^## Implementation Decisions/{exit} {print}' "$PRD_FILE"
}

# --- Extract design-system sections: §2 and §9 only ---
extract_design() {
  [ -f "$DESIGN_FILE" ] || return
  # §2: from "## 2. Color" up to (not including) "## 3."
  awk '/^## 2\. Color/{p=1} /^## 3\./{p=0} p{print}' "$DESIGN_FILE"
  printf '\n---\n\n'
  # §9: from "## 9. Surface" to end of file (§10 starts a future section)
  awk '/^## 9\. Surface/{p=1} /^## 10\./{p=0} p{print}' "$DESIGN_FILE"
}

prd_content="$(extract_prd)"
design_content="$(extract_design)"

# Skip if both are empty
if [ -z "$prd_content" ] && [ -z "$design_content" ]; then
  emit_noop
fi

context="Project reference docs (auto-injected at session start — read before working):"$'\n\n'

if [ -n "$prd_content" ]; then
  context="${context}=== docs/PRD.md — Problem Statement + User Stories ==="$'\n'"${prd_content}"$'\n\n'
fi

if [ -n "$design_content" ]; then
  context="${context}=== docs/design-system.md — §2 Color Tokens + §9 Surface Consistency Checklist ==="$'\n'"${design_content}"$'\n'
fi

# Byte cap
if [ "${#context}" -gt "$MAX_BYTES" ]; then
  context="${context:0:$MAX_BYTES}"
  context="${context}"$'\n\n'"...(truncated — open the source files for full content)"
fi

jq -n --arg ctx "$context" \
  '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}' \
  2>/dev/null || emit_noop
