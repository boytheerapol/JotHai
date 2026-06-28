# CLAUDE.md

# Project: JotHai (จดให้)

> LINE Messaging Bot + LIFF web dashboard for tracking personal/family expenses in Thai, backed by Google Apps Script and Google Sheet. Zero server, zero cost.
>
> **Note:** Global rules in `~/.claude/CLAUDE.md` (privacy, communication style, code practices, testing discipline, git safety, context management) always apply. This file only adds the per-project workflow layer and project-specific facts Claude can't infer.

## Workflow Orchestration

**Tradeoff:** These guidelines bias toward caution and rigor over raw speed. Use judgment for trivial, obvious changes — don't over-process a one-line fix.

**"Trivial" means:** ≤1–2 files, no new dependency, no schema/API change, obviously correct (typo, rename, comment). Anything else is non-trivial — apply the full workflow.

### 1. Plan Mode Default

- Enter plan mode for any non-trivial task: 3+ steps, or any architectural decision.
- State assumptions explicitly before acting. If uncertain, ask — don't guess.
- Write the spec/plan in enough detail to remove ambiguity before touching code.
- If something goes sideways mid-task, STOP and re-plan immediately.

### 2. Minimum Footprint

Write the minimum code that solves the problem. Touch only what you must.

- No features beyond what was asked. No abstractions for single-use code.
- Match existing GAS style — no ES modules, no TypeScript, no build step.
- When editing: don't improve adjacent code, comments, or formatting.
- Remove unused variables/functions YOUR changes introduced. Don't silently remove pre-existing dead code — mention it instead.

### 3. Subagent Strategy

- Use subagents to keep the main context window clean: offload research, codebase exploration, and parallel analysis.
- One focused task per subagent.

### 4. Verification Before Done

There is no automated test suite — verification means **deploy to staging and test via actual LINE bot**. Define what to test before starting. Before calling anything done:

- State the expected outcome for the change (e.g., "พิมพ์ 'กาแฟ 50' → Row ใหม่ใน Entries tab, Receipt ส่งกลับ").
- Confirm actual behaviour matches via real LINE test.
- For Sheet schema changes: verify header row matches schema exactly before writing data rows.

### 5. Autonomous Bug Fixing

Given a bug report or broken flow: trace the call path (`doPost` → `Access` → `Gemini`/regex → `Sheet` → `Line`), point at the logs (GAS Execution Log), and fix it. Don't ask for step-by-step hand-holding.

### 6. Self-Improvement Loop

- After ANY correction from the user: append the pattern to `tasks/lessons.md` — what went wrong, why, and the rule that prevents it next time.
- At session start, `tasks/lessons.md` is injected automatically via the `load-lessons.sh` SessionStart hook. Skim it before working.

---

## Task Management

For multi-step work, use the `tasks/` directory:

- **`tasks/todo.md`** — current work plan as a checklist. Write steps before implementing; check off as you go; add a short **Review** section at the bottom when done.
- **`tasks/lessons.md`** — running log of correction patterns.

Workflow per task:

1. Plan first → write checkable items to `tasks/todo.md`.
2. Confirm the plan with the user before implementing.
3. Mark items complete as you progress; give a brief high-level summary at each step.
4. Add the Review section when finished.
5. If the user corrected anything, update `tasks/lessons.md`.

For small one-off tasks, an inline checklist is enough.

---

## Architecture

The entire backend runs as a single **Google Apps Script project bound to the Google Sheet**. There is no separate server, no npm, no build step.

**Webhook (LINE → bot) flow:**

```
LINE user → LINE Platform
  ↓ webhook (HTTP POST)
doPost() in Code.gs
  ↓ routes on payload type
  ├─ postback event → action dispatch:
  │    toggle_type / change_category / save_edit / delete / save_delete
  ├─ message event → handleUserAccess() (Access.gs)
  │    → getClarificationState() (State.gs)
  │    → parseEntry() / parseWithRegex() (Gemini.gs)
  │    → addEntry() (Sheet.gs)
  │    → buildReceiptFlex() → reply() (Line.gs)
  └─ LIFF write (idToken + action in body) → handleLiffApiRequest()
       → verifyLineIdToken() → Sheet mutation (edit/delete/undo)
```

**LIFF (dashboard) flow:**

```
LINE user → Rich Menu button → opens LIFF URL (GitHub Pages index.html)
  ↓ liff.init() in index.html
  ↓ GET /exec?api=overview&userId=...&month=... → Code.gs aggregates Entries inline → JSON
  ↓ GET /exec?api=list&userId=...&month=...     → Code.gs returns entries + categories → JSON
  ↓ POST /exec (edit/delete/undo) → verifyLineIdToken() in Code.gs → Sheet mutation
```

Key entry points:

- `Code.gs` — `doPost(e)` (LINE webhook + LIFF write API), `doGet(e)` (data API router: `?api=overview`, `?api=list`)
- `index.html` — LIFF frontend hosted on GitHub Pages (not served by GAS); calls GAS `/exec` for data

---

## Tech Stack

- **Runtime:** Google Apps Script (V8 engine, JavaScript-like, no npm)
- **AI:** Gemini Flash-Lite via `UrlFetchApp` (Gemini API `generateContent`)
- **Database:** Google Sheet (bound to Apps Script) — `SpreadsheetApp` native
- **Frontend:** LIFF (LINE Frontend Framework) + Chart.js + vanilla JS, served as a GAS Web App HTML page
- **Messaging:** LINE Messaging API — reply-only (no push)
- **Locale:** Thai language, THB currency, `Asia/Bangkok` timezone
- **Testing:** Manual — deploy to staging Web App, test via actual LINE bot
- **Secrets:** Google Script Properties (not `.env`, not hardcoded)

---

## Project Structure

```
JotHai/                        ← GAS project root (open in Apps Script editor)
├── Code.gs                    # doPost (webhook + LIFF write API), doGet (data API: ?api=overview, ?api=list)
├── Line.gs                    # reply(), replyText(), buildReceiptFlex(), buildConfirmEditFlex(), buildConfirmDeleteFlex(), replyWithTypeQuickReply(), replyWithCategoryQuickReply()
├── Gemini.gs                  # parseEntry(text) → Gemini Flash-Lite call; parseWithRegex(text) → regex fallback
├── Sheet.gs                   # getSheet(), addEntry(), getEntryById(), updateEntryFields(), deleteEntryStatus(), getCategoriesString(), getCategoriesArray(), getUserStatus(), addUser(), setupDatabase()
├── Access.gs                  # handleUserAccess(userId, replyToken) — status check, auto-register new users
├── State.gs                   # CacheService: setClarificationState/getClarificationState/clearClarificationState (TTL=600s); PropertiesService: isUserWelcomed/setUserWelcomed
├── Config.gs                  # CONFIG object: SHEET_ID, LINE_ACCESS_TOKEN, GEMINI_API_KEY, LIFF_ID, TIMEZONE, CLARIFICATION_TTL_SECONDS
│                              # (Overview.gs not yet implemented — ?api=overview logic is inline in Code.gs)
├── index.html                 # LIFF frontend hosted on GitHub Pages: tabs ภาพรวม / หมวดหมู่ / แฮชแท็ก / รายการ; Chart.js; edit/delete/undo via POST with idToken
│
├── docs/
│   ├── adr/                   # Architecture Decision Records (ADR-0001 through ADR-0006)
│   ├── diagrams/              # System diagrams (Mermaid)
│   ├── design-notes.md        # Design decisions below ADR level (22 items + Sheet schema)
│   ├── implementation-plan.md # High-level roadmap (phase intentions + build-order rationale)
│   ├── PRD/                   # Product Requirements (problem, user stories, scope)
│   └── superpowers/plans/     # Executable plans: code-level tasks, signatures, tests, per-task verification
│
├── tasks/
│   ├── todo.md                # Current work plan (created per task)
│   └── lessons.md             # Running correction log
│
├── CONTEXT.md                 # Domain glossary (Entry, Receipt, Clarification, Category, etc.)
└── .claude/
    ├── settings.json          # Hooks: load-lessons (SessionStart), log-tool-usage (PostToolUse)
    └── hooks/
        ├── load-lessons.sh
        └── log-tool-usage.sh
```

**Google Sheet tabs** (bound to this Apps Script):

| Tab          | Columns                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `Entries`    | entry_id, user_id, timestamp, type, amount, description, category, hashtags, status, raw_text, source |
| `Categories` | category, type, keywords                                                                              |
| `Users`      | user_id, display_name, status, joined_at                                                              |

---

## Conventions

### GAS-Specific

- All files are `.gs` (plain JavaScript, V8 engine). No `import`/`export` — everything is global scope within the project.
- All HTTP calls use `UrlFetchApp.fetch()`. Never `fetch()` (not available in GAS).
- Sheet access uses `SpreadsheetApp.getActiveSpreadsheet()` (bound script) — never hardcode the spreadsheet ID.
- Script Properties accessed via `PropertiesService.getScriptProperties()`. Read secrets at call time from Properties — never cache them in global variables.
- Shared constants are in the `CONFIG` object in `Config.gs` (`TIMEZONE`, `CLARIFICATION_TTL_SECONDS`, etc.). Reference via `CONFIG.X` — never inline literal values for timezone, TTL, or Sheet name.

### Naming

- Functions: `camelCase` (`addEntry`, `buildReceiptFlex`, `checkUser`)
- Script Property keys: `SCREAMING_SNAKE_CASE` (`LINE_CHANNEL_TOKEN`, `GEMINI_API_KEY`, `LIFF_ID`)
- Sheet tab names: Title case, English (`Entries`, `Categories`, `Users`)
- Controlled vocabulary values: lowercase English (`income`, `expense`, `active`, `deleted`, `ai`, `fallback`)

### Data Conventions

- **Soft delete only:** Set `status = 'deleted'`. Never delete a row from the Sheet.
- **Category is a snapshot:** Store the category name as a string at write time. Do not reference the `Categories` tab at query time for existing entries.
- **Hashtag normalization:** Strip leading `#`, trim whitespace, lowercase ASCII-only. Thai characters are stored as-is. Apply in `Gemini.gs` and regex fallback — never store raw `#tag`.
- **Timezone:** All timestamps and month boundaries use `Asia/Bangkok`. Use `Utilities.formatDate(new Date(), 'Asia/Bangkok', ...)` — never `Date.toISOString()` or UTC-based methods for display or filtering.
- **Amount:** Store as a plain number. Currency is always THB — never store the symbol in the Sheet.
- **source field:** `ai` when Gemini parsed successfully; `fallback` when regex was used. Entries with `source=fallback` may have inaccurate categories — that is correct and expected.

### LIFF Security

- The write endpoint (`doPost` from LIFF) must verify the caller's identity server-side. The client sends a LIFF `idToken`; the server verifies it against the LINE token verify endpoint and extracts `userId` from the verified payload.
- Never trust `userId` sent as a plain request body parameter — this allows any user to mutate another user's entries.

---

## Commands Reference

There are no npm scripts, no build step, no CLI commands. All operations are manual via the GAS editor.

| Task                | How                                                                             |
| ------------------- | ------------------------------------------------------------------------------- |
| **Open project**    | Google Apps Script editor → the script bound to the JotHai Sheet                |
| **Deploy / update** | "Deploy" → "Manage deployments" → create new version                            |
| **Staging deploy**  | Deploy a separate "Test deployment" for safe testing before promoting           |
| **View logs**       | "Executions" in Apps Script editor — shows `console.log` / `Logger.log` output  |
| **Set secrets**     | "Project Settings" → "Script Properties" — add key/value pairs                  |
| **Test**            | Send messages to the LINE bot (staging channel) and observe Sheet + bot replies |
| **Verify webhook**  | LINE Developers console → Messaging API → Webhook settings → "Verify" button    |

---

## Setup & Environment

### Script Properties (required before first use)

Set in "Project Settings" → "Script Properties":

```
SHEET_ID             — Sheet ID on Google Sheet
LINE_ACCESS_TOKEN    — Channel Access Token (long-lived); used for reply() calls
LINE_CHANNEL_SECRET  — Channel Secret (for webhook signature verification; not yet wired)
GEMINI_API_KEY       — Gemini API key from Google AI Studio
LIFF_ID              — LIFF app ID (format: 1234567890-AbCdEfGh)
```

### Initial Sheet Setup

1. Create a Google Sheet with three tabs: `Entries`, `Categories`, `Users`.
2. Add header rows exactly matching the schema in the Project Structure table above.
3. Seed the `Categories` tab with default categories (see `docs/design-notes.md` for the full seed list).
4. Verify the Apps Script project is bound to this Sheet (Tools → Apps Script).

### Verify Gemini Model String

The model string is set as `modelName` in `Gemini.gs` (currently `'gemini-3.1-flash-lite'`). Before changing it, confirm the current Flash-Lite model name in Google AI Studio — it changes frequently. Do not hardcode the model ID inline; change only the `modelName` variable in `Gemini.gs`.

---

## Critical Gotchas

### ⚠️ GAS Execution Limits

- **6-minute execution limit per request.** `doPost` must complete the full parse → save → reply cycle well within this.
- **Reply token is single-use and expires in ~1 minute.** Call `Line.reply()` exactly once per event, as fast as possible. If Gemini latency risks the TTL, the regex fallback (ADR-0006) must be ready to fire immediately.
- **No concurrent state.** GAS is single-threaded per execution. `State.gs` uses `CacheService` (TTL=600s) for Clarification state (pending-amount entries) and `PropertiesService` (persistent) for the welcome flag per user. Always rely on the TTL for clarification — never assume the user cleared state manually.

### ⚠️ LINE Webhook Behavior

- **LINE retries failed webhooks.** If `doPost` throws (HTTP 5xx), LINE retries — this causes duplicate entries. Return HTTP 200 as early as possible, even on partial failure.
- **Webhook signature verification:** Always verify the `X-Line-Signature` header using `LINE_CHANNEL_SECRET`. Skipping this allows anyone to POST fake events.
- **`source.userId` is not guaranteed** in all event types — always null-check before reading.

### ⚠️ Gemini Integration

- **Free tier quota:** ~1,500 requests/day, ~30 RPM for Flash-Lite. On quota error, fall through to regex fallback (ADR-0006) — never silently discard the entry.
- **Always request JSON output explicitly** in the prompt. Enforce with a response schema if the API version supports it. Never assume Gemini free-text output is safe to `JSON.parse()` without try/catch.
- **`source=fallback` means category may be `อื่นๆ`.** That is correct — do not re-categorize on read.

### ⚠️ Google Sheet as Database

- **Header row is row 1. Data starts at row 2.** Always use `getLastRow()` — never assume row count.
- **Batch reads/writes.** `SpreadsheetApp` calls cost ~100–300 ms each. Use `getValues()` / `setValues()` on ranges, not cell-by-cell. Cell-by-cell loops inside a webhook handler risk hitting the 6-minute limit.
- **Never hard-delete rows.** Set `status = 'deleted'`. All queries and aggregations must filter `status == 'active'`.

### ⚠️ LIFF Development

- **LIFF only works inside the LINE app** (or LINE desktop). `liff.init()` fails in a regular browser — always test via LINE.
- **Frontend is on GitHub Pages, not GAS.** `index.html` is deployed to GitHub Pages; GAS `/exec` is the data API only. `doGet` does NOT serve HTML — it returns JSON for `?api=overview` and `?api=list`. Distinguish endpoints via the `api` query parameter.
- **`liff.getIDToken()` returns a JWT.** For LIFF write calls, include `idToken` in the POST body; `verifyLineIdToken()` in `Code.gs` validates it against LINE's verify endpoint and extracts the real `userId`. Never trust a `userId` sent as a plain parameter.

### ⚠️ Thai Language / Locale

- **All user-facing text is Thai.** Bot replies, error messages, and LIFF labels must be in Thai.
- **Use `Asia/Bangkok` (UTC+7) for all date logic.** Never use `Date.toISOString()` or UTC-based methods for display or filtering.
- **Hashtag normalization:** Lowercase applies only to ASCII. Thai characters are case-invariant — store as-is.

### ⚠️ User Access Control

- **New users are `pending` by default.** Do not write any data for a `pending` or unknown user — send a rejection reply instead.
- **Admin approval happens directly in the Sheet** — change `status` from `pending` to `approved` in the `Users` tab. No admin command in LINE (MVP scope).

---

## Recovery

- **GAS has no built-in version control.** Before significant changes, create a manual snapshot via "Project Settings" → version history in the Apps Script editor.
- **If a bad deploy breaks the webhook:** redeploy a previous version. The webhook URL does not change for the same deployment ID.
- **If bad data lands in the Sheet:** use soft-delete (`status = 'deleted'`). Do not delete rows — the audit trail is the only recovery mechanism.
- **If Clarification state is stuck:** clear via `PropertiesService.getScriptProperties().deleteProperty(userId)` run as a one-off function in the GAS editor.

---

## Forbidden Actions

- **DO NOT hardcode secrets** in any `.gs` file. All secrets go in Script Properties only.
- **DO NOT delete rows from the Sheet.** Use `status = 'deleted'` (soft delete).
- **DO NOT send push messages** (LINE Push API). The system is reply-only to stay on the free tier (ADR-0004).
- **DO NOT trust `userId` from the LIFF write endpoint request body** without server-side `idToken` verification first.
- **DO NOT add npm packages, build steps, or external runtimes.** The entire stack is GAS + HTML.
- **DO NOT write data before access control passes.** `checkUser` must run at the top of every `doPost` handler.
- **DO NOT use UTC date methods** (`toISOString()`, `toUTCString()`) for any display or filtering logic. Always use `Utilities.formatDate(..., 'Asia/Bangkok', ...)`.

---

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (github.com/boytheerapol/JotHai). External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default canonical label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
