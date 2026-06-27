# PRD — JotHai (จดให้): LINE Expense Tracker MVP

## Problem Statement

ผู้ใช้ต้องการบันทึกรายรับ-รายจ่ายส่วนตัวและครอบครัวแบบเร็ว เรียบง่าย ไม่ต้องเปิดแอปพิเศษ
ปัจจุบันการจดบัญชีส่วนใหญ่ทำในสมุด, Excel, หรือแอป standalone ที่ต้องเปิดแยก
ทำให้เกิด friction สูง — พอรายการเล็กๆ เช่น "ซื้อกาแฟ 50 บาท" ก็ขี้เกียจจด
ผลคือข้อมูลขาดหาย ไม่ครบ และไม่สามารถดูภาพรวมการเงินที่แม่นยำได้

## Solution

JotHai เป็น LINE bot ที่ผู้ใช้พิมภาษาไทยตามธรรมชาติเพื่อบันทึกรายการ
AI (Gemini Flash-Lite) แปลข้อความ → จัดหมวด → บันทึกลง Google Sheet ทันที
บอทส่ง Receipt card กลับพร้อมปุ่มแก้ไขทันที ไม่ต้องยืนยันก่อนบันทึก
LIFF dashboard (เปิดในตัว LINE) แสดงภาพรวม 3 มิติพร้อม chart + รายการแก้ไขได้
ทุกอย่างรันบน Google Apps Script — ไม่มี server ไม่มีค่าใช้จ่าย

## User Stories

### การบันทึกรายการ

1. As a user, I want to type a natural Thai expense message (e.g. "กาแฟ 50"), so that it gets saved as an Entry without any extra steps.
2. As a user, I want to type an income message (e.g. "เงินเดือน 30000"), so that it's classified as income automatically.
3. As a user, I want to include hashtags in my message (e.g. "ข้าวผัด 80 #ทริปเชียงใหม่"), so that I can group entries across categories later.
4. As a user, I want the bot to ask me for the amount if I forgot to include one (e.g. "ซื้อของ"), so that no entry is lost due to incomplete input.
5. As a user, I want the clarification state to be cancelled if I send a new unrelated message, so that I'm not stuck waiting for a response.
6. As a user, I want entries to be saved immediately (optimistic save), so that recording feels fast and habitual.
7. As a user, I want the bot to still save my entry using a regex fallback even if Gemini fails, so that I never lose data due to AI downtime.
8. As a user, I want the receipt to show the category as "อื่นๆ" with a note when the fallback was used, so that I know I should review it.

### Receipt และแก้ไขทันที

9. As a user, I want to receive a Receipt card after every saved entry, so that I can immediately verify what was recorded.
10. As a user, I want the Receipt to show type, amount, description, category, and hashtags, so that I can spot errors quickly.
11. As a user, I want to toggle income/expense type directly from the Receipt, so that I can fix AI misclassification without retyping.
12. As a user, I want to change the category directly from the Receipt via quick reply buttons, so that I can correct wrong categories immediately.
13. As a user, I want to delete an entry directly from the Receipt, so that accidental or duplicate entries can be removed.

### LIFF Dashboard — ภาพรวม

14. As a user, I want to open a dashboard from the LINE Rich Menu, so that I can view my monthly financial overview without leaving LINE.
15. As a user, I want to see a donut chart of income vs. expense for the current month, so that I understand my overall balance at a glance.
16. As a user, I want to see a donut chart of expenses broken down by category, so that I know where I'm spending most.
17. As a user, I want to see a donut chart of income broken down by category, so that I can track my income sources.
18. As a user, I want to switch between months in the dashboard, so that I can review past months.
19. As a user, I want to filter the dashboard by hashtag, so that I can see totals for a specific trip or project.

### LIFF Dashboard — จัดการรายการ

20. As a user, I want to see a list of all active entries for the current month in the dashboard, so that I can review them after receipts have scrolled away in chat.
21. As a user, I want to edit the amount of an entry from the entry list, so that I can correct typos without deleting and re-entering.
22. As a user, I want to edit the description of an entry from the entry list, so that I can add context to entries recorded in shorthand.
23. As a user, I want to delete an entry from the entry list with a soft delete, so that the data isn't permanently lost.
24. As a user, I want to undo a deleted entry from the entry list, so that I can recover accidental deletions.
25. As a user, I want to change the category of an entry from the entry list, so that I can reclassify entries recorded with Gemini fallback.

### การเข้าถึงและ Onboarding

26. As a new user who messages the bot for the first time, I want to be logged as pending and receive a polite rejection message, so that I know I need admin approval.
27. As a user who has just been approved by admin, I want to automatically receive a Welcome message explaining how to use the bot, so that I can start immediately without asking.
28. As a user, I want to type "help" or "วิธีใช้" to see usage instructions at any time, so that I don't have to remember the syntax.
29. As an admin, I want to approve users by changing their status in the Google Sheet, so that I have control over who can use the system without needing a bot command.

### Rich Menu

30. As a user, I want to see a persistent "📊 ดูสรุป" button at the bottom of the LINE chat, so that I can open the dashboard with one tap anytime.

## Implementation Decisions

### Modules to build/modify

- **`Config.gs`** — constants: Script Properties keys, Gemini model string, timezone (`Asia/Bangkok`), TTL values
- **`Code.gs`** — `doPost(e)` webhook router; `doGet(e)` LIFF page + data API router (`?api=overview`, `?api=list`, write POST)
- **`Line.gs`** — `reply(replyToken, messages)`, `buildReceiptFlex(entry)`, quick reply for category selection
- **`Gemini.gs`** — `parseEntry(text, categories)` calling Gemini Flash-Lite + regex fallback path
- **`Sheet.gs`** — `addEntry()`, `editEntry()`, `deleteEntry()` (soft), `undoDelete()`, `getCategories()`, user lookup
- **`Access.gs`** — `checkUser(userId)` returning status; `logPending(userId, displayName)`
- **`State.gs`** — clarification state via `CacheService` with TTL; `PropertiesService` for welcome flag
- **`Overview.gs`** — aggregation by month/category/hashtag → JSON for LIFF API
- **`liff.html`** — 4-tab LIFF page: 3 donut charts + "รายการ" tab with inline edit/delete/undo

### Key interfaces

- `parseEntry(text, categories)` → `{ type, amount, description, category, hashtags, source }` where `source` is `"ai"` or `"fallback"`; `amount = 0` signals need for clarification
- `addEntry(userId, parsed, rawText)` → `entry_id`
- `editEntry(entryId, userId, fields)` → verifies ownership before mutating
- `deleteEntry(entryId, userId)` → soft delete (status = `"deleted"`)
- `checkUser(userId)` → `"approved"` | `"pending"` | `"unknown"`

### Gemini integration

- Model: Gemini Flash-Lite (verify current model string in AI Studio before coding)
- Force JSON output via `responseMimeType: "application/json"` + `responseSchema` if supported; otherwise prompt-only instruction
- JSON schema: `{ type, amount, description, category, hashtags }` — see design-notes for full schema
- `amount = 0` means "no amount found" → enters clarification flow
- Wrap all `JSON.parse()` in try/catch → any exception falls through to regex fallback

### Regex fallback (ADR-0006)

Supports: `1500`, `1,500`, `1.5k/K`, `฿`, `บาท`, `บ.` — see design-notes for exact regex.
Fallback entry defaults: `type=expense`, `category=อื่นๆ`, `source=fallback`, description = first 100 chars of raw text.
If regex also finds no amount → enters clarification flow.

### Clarification state

- State key: `CLARIFICATION_{userId}` in `CacheService`
- TTL: `CLARIFICATION_TTL_SECONDS = 600` (10 min) defined in Config.gs
- Next message that is a number → completes the pending entry
- Next message that is not a number → cancel state, reply "ยกเลิกรายการที่ค้างไว้แล้วนะคะ ✌️", process new message normally

### Sheet schema

**Entries:** `entry_id | user_id | timestamp | type | amount | description | category | hashtags | status | raw_text | source`

- `hashtags`: multiple tags stored in one cell, space-separated, normalized (no `#`, ASCII lowercase)
- `status`: `active` | `deleted` (never hard-delete rows)
- `category`: snapshot value at write time — not a foreign key

**Categories:** `category | type | keywords` — config tab, 13 expense + 5 income seed values
**Users:** `user_id | display_name | status | joined_at`

### LIFF security (ADR-0005)

The write endpoint (`doPost` from LIFF) must verify the caller's LIFF `idToken` against LINE's token introspection endpoint server-side. The verified `userId` is then checked against the entry's `user_id` before any mutation. Never trust a plain `userId` from the request body.

### Bot tone

Friendly, casual, close. End messages with "นะคะ/ค่ะ/นะ". Max 1 emoji per message.
Error strings are defined in design-notes.md.

## Testing Decisions

### What makes a good test

Test external behavior visible through the two top-level seams — not internal function calls. A test should describe what a user or LINE sends in, and what comes out (Sheet state + bot reply). Do not mock the Sheet or Gemini in integration tests; test against the real bound Sheet in a staging deployment.

### Seams to test

**Seam 1 — `doPost(e)`** (LINE webhook): covers the full bot pipeline

- Access control: unknown user → pending log + rejection reply; pending user → rejection; approved user → pass
- Happy path: "กาแฟ 50 #cafe" → new active row in Entries + Receipt reply with correct fields
- Income detection: "เงินเดือน 30000" → type=income, correct category
- Hashtag normalization: "#Cafe" stored as "cafe"; "#ทริป" stored as "ทริป"
- Clarification: "กินข้าว" → bot asks amount → "80" → Entry completed
- Clarification cancel: "กินข้าว" → bot asks → "กาแฟ 50" → cancel reply + new entry saved
- Regex fallback: simulate Gemini failure → Entry saved with source=fallback, category=อื่นๆ
- Postback: toggle type, change category, delete → Sheet reflects change
- Welcome: admin changes status to approved → Welcome message sent once only
- Help: "help" or "วิธีใช้" → help message returned

**Seam 2 — `doGet(e)` + write endpoint** (LIFF data API): covers the dashboard pipeline

- `?api=overview` → returns correct monthly totals matching Sheet
- `?api=list` → returns only active entries for the requesting user's month
- Write endpoint with valid idToken → edit/delete/undo mutates Sheet
- Write endpoint with idToken belonging to user A trying to mutate user B's entry → rejected
- Month filter: entries from other months excluded
- Hashtag filter: only entries with matching hashtag returned

### Prior art

No existing test files in the codebase. Manual verification is the primary test method: deploy to staging Web App, send messages via real LINE staging channel, and observe Sheet state + bot replies. All verification is manual per the project's testing approach.

## Out of Scope

- Receiving images or receipts (Gemini Vision) — deferred to Phase 2
- Push messages (end-of-month summaries) — reply-only in MVP (ADR-0004)
- Per-user category lists — shared Categories tab for MVP
- Admin commands in LINE chat — admin uses Sheet directly
- Multiple entries per message — 1 message = 1 Entry in MVP
- Budget alerts or over-budget notifications
- Thai numeral support (๑๕๐๐) in regex fallback
- Range amounts ("500-600") or approximate amounts ("ประมาณ 100")

## Further Notes

- **Build order:** Echo webhook first (Phase 1), access control second (Phase 2), then AI parse + save (Phase 3) — this isolates "is the pipeline connected?" from "is the AI correct?"
- **LIFF is the highest risk area:** `liff.init()` in LINE's in-app browser, viewport on mobile, idToken verification, and GAS CORS behavior all require extra debugging time (Phase 6 estimated 3–4 days)
- **Gemini model string:** Must be verified in Google AI Studio immediately before coding Phase 3 — the string changes frequently and training-data knowledge is unreliable
- **LINE webhook retries:** `doPost` must return HTTP 200 as early as possible to prevent duplicate entries from LINE's retry mechanism
- **Execution time budget:** The full parse → save → reply cycle must complete well under GAS's 6-minute limit; the reply token expires in ~1 minute, so Gemini latency is the critical path
- **Categories tab is config, not code:** Adding or renaming categories requires only a Sheet edit — no code deployment needed
