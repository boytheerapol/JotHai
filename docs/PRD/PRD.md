# PRD: JotHai (จดให้)

**Version:** 1.0  
**Date:** 2026-06-24  
**Status:** Draft

---

## Problem Statement

ผู้ใช้ต้องการบันทึกรายรับ-รายจ่ายในชีวิตประจำวัน แต่แอปบันทึกค่าใช้จ่ายทั่วไปต้องการให้ออกจาก LINE แล้วเปิดแอปอื่น ซึ่งทำให้ขาดความต่อเนื่องและลืมบันทึกได้ง่าย การพิมพ์รายการใน spreadsheet โดยตรงก็ยุ่งยากบนมือถือ ผู้ใช้ต้องการวิธีที่เร็วและง่ายที่สุดในการบันทึกค่าใช้จ่ายโดยไม่ต้องเปิดแอปอื่น

---

## Solution

JotHai เป็น LINE Bot ที่รับข้อความภาษาไทยและแปลงเป็นรายการค่าใช้จ่ายโดยอัตโนมัติด้วย AI (Gemini Flash-Lite) พร้อม regex fallback เพื่อความทนทาน ผู้ใช้พิมพ์ในแชทตามปกติ เช่น "กาแฟ 50 #cafe" แล้วได้รับ Receipt card ทันที พร้อม LIFF dashboard สำหรับดูสรุปรายเดือน แก้ไข และลบรายการ ระบบทำงานบน Google Apps Script + Google Sheet โดยไม่มีค่าใช้จ่าย server

---

## User Stories

### ผู้ใช้ที่ได้รับอนุมัติแล้ว (Approved User)

**การบันทึกรายการ**

1. As an approved user, I want to send a Thai text message with an amount to the LINE bot, so that the expense is automatically recorded without opening another app.
2. As an approved user, I want the bot to understand various Thai number formats (e.g., "50", "1,500", "1.5k", "฿200", "200 บาท", "200บ."), so that I can type naturally without worrying about format.
3. As an approved user, I want the bot to automatically categorize my expense using AI, so that I don't have to manually select a category every time.
4. As an approved user, I want to use hashtags (e.g., "#cafe", "#วันเกิด") in my message, so that I can group entries by custom tags beyond categories.
5. As an approved user, I want hashtags to be normalized automatically (strip `#`, lowercase ASCII, keep Thai as-is), so that "#Cafe" and "#cafe" are treated as the same tag.
6. As an approved user, I want the bot to distinguish between income and expense from my message context, so that I don't need to specify a type explicitly for most entries.
7. As an approved user, I want to receive a Receipt Flex Message card immediately after recording, so that I can confirm what was saved.
8. As an approved user, I want the Receipt card to show: type (income/expense), amount (THB), description, category, and hashtags, so that I can verify the AI parsed my message correctly.

**เมื่อ AI ไม่สามารถแยกจำนวนเงินได้ (Clarification Flow)**

9. As an approved user, when I send a message without a recognizable amount, I want the bot to ask me for the amount in a friendly Thai tone, so that the entry is not lost.
10. As an approved user, when the bot asks for an amount, I want to reply with just the number (e.g., "150") and have it complete the entry, so that the flow is smooth.
11. As an approved user, if I send a non-numeric reply after the bot asks for an amount, I want the pending entry to be cancelled and my new message to be processed as a fresh entry, so that I'm not stuck in a loop.
12. As an approved user, if I don't reply to the clarification within 10 minutes, I want the pending state to automatically clear, so that old context doesn't affect new entries.

**การแก้ไขรายการผ่าน Receipt Buttons**

13. As an approved user, I want to tap a "เปลี่ยนหมวด" button on the Receipt card to change the category via a quick-reply picker, so that I can fix AI categorization errors immediately.
14. As an approved user, I want to tap a "สลับประเภท" button on the Receipt card to toggle between income and expense, so that I can fix misclassified entries.
15. As an approved user, I want to tap a "ลบ" button on the Receipt card to soft-delete the entry, so that I can remove accidental entries.
16. As an approved user, when I change the category via quick-reply, I want to receive a confirmation reply in Thai, so that I know the change was applied.

**LIFF Dashboard — ดูภาพรวม**

17. As an approved user, I want to tap the "📊 ดูสรุป" Rich Menu button to open the LIFF dashboard inside LINE, so that I can see my spending summary without leaving the app.
18. As an approved user, I want to see a monthly income vs. expense donut chart, so that I can understand my overall financial balance at a glance.
19. As an approved user, I want to see an income-by-category donut chart for the selected month, so that I can understand my income sources.
20. As an approved user, I want to see an expense-by-category donut chart for the selected month, so that I can understand where I spend the most.
21. As an approved user, I want to switch between months using a month picker in the LIFF dashboard, so that I can review past months.
22. As an approved user, I want to filter all charts and the entry list by a hashtag, so that I can analyze a specific project or occasion's spending.

**LIFF Dashboard — รายการ (Entry List)**

23. As an approved user, I want to see a list of all active entries for the selected month in the LIFF "รายการ" tab, so that I can review individual transactions.
24. As an approved user, I want to edit an entry's description, amount, category, type, or hashtags from the LIFF entry list, so that I can fix mistakes made during bot recording.
25. As an approved user, I want to delete an entry from the LIFF entry list, so that I can remove incorrect entries discovered later.
26. As an approved user, I want to undo a recently deleted entry from the LIFF entry list, so that I can recover accidental deletions.
27. As an approved user, I want entries marked with `source=fallback` to be visually distinguishable in the list, so that I know which ones may have inaccurate categories.

**ความปลอดภัยและความถูกต้อง**

28. As an approved user, I want to be certain that only my own entries are visible in my LIFF dashboard, so that my financial data remains private.
29. As an approved user, I want to be certain that I cannot edit or delete another user's entries even if I know their entry ID, so that cross-user data isolation is enforced.

### ผู้ใช้ใหม่ (New / Pending User)

30. As a new user sending a message to the bot for the first time, I want to receive a friendly Thai message explaining that my account is pending admin approval, so that I understand why the bot doesn't record my entry.
31. As a new user, I want my LINE display name and userId to be logged automatically when I first contact the bot, so that the admin can identify and approve me.

### ผู้ดูแลระบบ (Admin)

32. As an admin, I want to approve a pending user by changing their status to `approved` directly in the Users tab of the Google Sheet, so that I can control who can use the system.
33. As an admin, I want new user registrations to appear in the Users tab with `status=pending` immediately after their first message, so that I know who to review.
34. As an admin, I want all data in the Sheet to use soft deletes (status field), so that I have a full audit trail and can recover any entry.

### ระบบโดยรวม (System-level)

35. As the system, I want to return HTTP 200 to LINE's webhook as quickly as possible, so that LINE does not retry the webhook and create duplicate entries.
36. As the system, I want to fall back to regex parsing when Gemini fails or exceeds quota, so that no entry is lost due to AI unavailability.
37. As the system, I want to verify the LINE webhook `X-Line-Signature` header on every `doPost` call, so that fake/spoofed webhook events are rejected.
38. As the system, I want to verify the LIFF `idToken` server-side on every write request from the LIFF dashboard, so that users cannot forge another user's identity.
39. As the system, I want all timestamps and month boundaries to use the `Asia/Bangkok` timezone, so that entries appear in the correct date for Thai users.

---

## Implementation Decisions

### Modules

- **Code.gs** — Entry points: `doPost(e)` for LINE webhook routing, `doGet(e)` for LIFF HTML + data API routing (`?api=overview`, `?api=list`)
- **Line.gs** — `reply(replyToken, messages)` and `buildReceiptFlex(entry)` for LINE Messaging API calls
- **Gemini.gs** — `parseEntry(text, categories)` calling Gemini Flash-Lite; inline regex fallback returning `{type, amount, description, category, hashtags, source}`
- **Sheet.gs** — `addEntry()`, `editEntry(entryId, updates)`, `deleteEntry(entryId)`, `getCategories(type)`, user lookup functions
- **Access.gs** — `checkUser(userId)` returns status; `logPending(userId, displayName)` creates pending row
- **State.gs** — `setPending(userId, data)` / `getPending(userId)` / `clearPending(userId)` via `CacheService` with 10-minute TTL
- **Overview.gs** — `aggregateMonth(userId, month, hashtag?)` returns JSON `{totalIncome, totalExpense, byCategory, entries}`
- **Config.gs** — Script Property key constants, Gemini model string, timezone constant, clarification TTL

### Interfaces

- **Webhook event shape:** `doPost` extracts `events[0]` from LINE payload; handles `message` (text) and `postback` (button actions) event types
- **Postback data format:** `action=toggle&entryId=xxx`, `action=chgcat&entryId=xxx`, `action=del&entryId=xxx`
- **LIFF API responses:** `GET ?api=overview` → `{month, totalIncome, totalExpense, byCategory:{...}, byHashtag:{...}}`; `GET ?api=list` → `{entries:[...]}`
- **LIFF write payload:** `POST /exec` body `{action, entryId, updates, idToken}` — `idToken` is verified server-side before any mutation
- **Gemini parse output:** JSON `{type: "income"|"expense", amount: number, description: string, category: string, hashtags: string[]}`

### Schema

**Entries tab** (row 1 = headers, data from row 2):

| Column | Values |
|--------|--------|
| entry_id | unique string (UUID or timestamp-based) |
| user_id | LINE userId |
| timestamp | formatted date string (Asia/Bangkok) |
| type | `income` \| `expense` |
| amount | positive number (THB, no symbol) |
| description | string |
| category | snapshot string (not a foreign key) |
| hashtags | normalized, comma-separated |
| status | `active` \| `deleted` |
| raw_text | original user message |
| source | `ai` \| `fallback` |

**Categories tab:** `category`, `type` (`income`\|`expense`), `keywords`

**Users tab:** `user_id`, `display_name`, `status` (`pending`\|`approved`), `joined_at`

### Architectural Decisions

- **GAS as sole runtime** (ADR-0001): Zero cost, native Sheet binding; trade-off is 6-min execution limit and daily quota caps
- **Optimistic save + editable receipt** (ADR-0003): Save immediately, send Receipt card with edit buttons; reduces friction for frequent logging
- **Reply-only, no push** (ADR-0004): All messages are webhook replies; no unsolicited push messages; keeps system fully on free tier
- **LIFF for dashboard + CRUD** (ADR-0002, ADR-0005): Interactive dashboard inside LINE; write endpoint secured with server-side `idToken` verification
- **Regex fallback resilience** (ADR-0006): `source=fallback` entries always saved with `category=อื่นๆ`; user fixes in LIFF
- **Soft delete only**: Never delete Sheet rows; `status='deleted'` is the only removal mechanism
- **Category as snapshot**: Category name stored at write time; changes to Categories tab don't alter existing entries
- **Hashtag normalization at write time**: Strip `#`, trim, lowercase ASCII-only; applied in Gemini.gs and regex path

### Bot Tone

All bot replies are in Thai, friendly, casual, with LINE-style particles ("นะคะ", "ค่ะ"). Max 1 emoji per message. Error messages must not feel like system errors.

---

## Testing Decisions

### What Makes a Good Test

Since this project has no automated test suite (GAS environment does not support jest/vitest), all testing is **end-to-end via the staging LINE bot channel**. A good test:

- Tests observable output (Sheet row written, LINE reply received, LIFF chart updated) — not internal function calls
- Uses the same channel and Sheet as production-staging (not mocks)
- Covers the happy path AND at least one failure/fallback path per feature

### Test Gates Per Phase

| Phase | Gate |
|-------|------|
| Phase 1 (Webhook skeleton) | Bot echoes back any text message |
| Phase 2 (Access control) | New userId rejected; approved user sees welcome |
| Phase 3 (Parse + Save + Receipt) | "กาแฟ 50 #cafe" → Sheet row + Receipt card; Gemini down → regex fallback still saves |
| Phase 4 (Receipt buttons) | Category change, type toggle, delete all apply correctly to Sheet |
| Phase 5 (Clarification) | No-amount message → ask; numeric reply → complete entry; non-numeric → fresh entry |
| Phase 6 (LIFF) | Charts show correct totals; entry list shows active entries; edit/delete mutate Sheet; cross-user isolation verified |
| Phase 7 (Rich Menu) | Rich Menu button opens LIFF in LINE |
| Phase 8 (Polish) | Multi-user data isolation; duplicate-entry guard (LINE retry simulation) |

### Seams to Test

- **`doPost` entry point** — single seam for all webhook events; test by sending real LINE messages to staging bot
- **`doGet` entry point** — single seam for LIFF; test by opening LIFF URL in LINE app, observing chart data and mutations
- **Google Sheet** — observable state; verify rows directly in Sheet after each test action

---

## Out of Scope

- **Image/receipt scanning** — Gemini Vision OCR for photo receipts is deferred to Phase 2 (post-MVP)
- **Multiple items per message** — "กาแฟ 50 ข้าว 80" as two separate entries; MVP is 1 message = 1 entry
- **Push notifications** — No end-of-month summaries, budget alerts, or proactive messages; reply-only (ADR-0004)
- **Admin LINE commands** — User approval is done directly in the Sheet, not via bot commands
- **Web/desktop browser support** — LIFF only works inside LINE app (by design); no separate web dashboard
- **Multi-currency** — THB only; no conversion
- **Recurring entries** — No scheduled/automatic entries
- **Budget limits / alerts** — No spending threshold tracking
- **Export to CSV/PDF** — Data is in the Sheet; users can export manually if needed
- **External database** — Postgres, Firebase, etc. are explicitly excluded (ADR-0001)
- **npm / build step / TypeScript** — GAS only, plain JavaScript

---

## Further Notes

### GAS Constraints

- **6-minute execution limit**: `doPost` must complete the full parse → save → reply cycle within this window. Gemini API calls typically take 1-3 seconds; the 6-min limit is not a practical concern for single-entry flows.
- **Reply token TTL ~1 minute**: `Line.reply()` must be called within ~1 minute of receiving the webhook or the token expires. Always call `reply()` before any non-essential processing.
- **No concurrent state**: GAS is single-threaded per execution; `CacheService` and `PropertiesService` are the only cross-execution state mechanisms.
- **Batch Sheet access**: `getValues()` / `setValues()` on ranges; never cell-by-cell in a hot path.

### Free Tier Limits

- **Gemini Flash-Lite**: ~1,500 requests/day, ~30 RPM (shared across all users). Regex fallback is the safety net, not an edge case.
- **LINE Messaging API**: Reply API is free; Push API has quota limits (reason for reply-only architecture).
- **GAS quotas**: URL fetch quota ~20,000/day; Script Properties read/write ~50,000/day.

### Thai Locale Conventions

- All user-facing text (bot replies, LIFF labels, error messages) must be in Thai.
- All date/time operations use `Utilities.formatDate(..., 'Asia/Bangkok', ...)` — never `Date.toISOString()` or UTC methods.
- Hashtag normalization: lowercase applies to ASCII only; Thai characters stored as-is.
- Category names are Thai strings (e.g., "อาหาร", "เดินทาง/รถ") — store exactly as defined in Categories tab.

### Security Checklist

- Verify `X-Line-Signature` on every `doPost` call
- Verify LIFF `idToken` with LINE token endpoint on every LIFF write request
- All secrets in Script Properties — never hardcoded in `.gs` files
- No `userId` trusted from request body without `idToken` verification
