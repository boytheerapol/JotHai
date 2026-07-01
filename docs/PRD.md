# PRD — JotHai (จดให้): LINE Expense Tracker MVP (v2.0 - Decoupled Architecture)
<!-- markdownlint-disable MD029 -->

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
**[อัปเดตสถาปัตยกรรมล่าสุด]**: แยกระบบ Frontend (หน้า Dashboard) ไปโฮสต์บน GitHub Pages เพื่อทะลวงข้อจำกัด Iframe Sandbox ของ LIFF ทำให้โหลดเร็วและปรับแต่ง UI ได้เต็มที่ ในขณะที่ Backend ทั้งหมดยังคงรันบน Google Apps Script แบบ 100% API (ไม่มี server ไม่มีค่าใช้จ่าย)

## User Stories

### การบันทึกรายการ

1. As a user, I want to type a natural Thai expense message (e.g. "กาแฟ 50"), so that it gets saved as an Entry without any extra steps.
2. As a user, I want to type an income message (e.g. "เงินเดือน 30000"), so that it's classified as income automatically.
3. As a user, I want to include hashtags in my message (e.g. "ข้าวผัด 80 #ทริปเชียงใหม่"), so that I can group entries across categories later. _(อัปเดต: AI จะถูกบังคับดึงเฉพาะคำที่มีเครื่องหมาย `#` เท่านั้น ห้ามคิดแฮชแท็กเองเด็ดขาดเพื่อป้องกันข้อมูลกระจัดกระจาย)_
4. As a user, I want the bot to ask me for the amount if I forgot to include one (e.g. "ซื้อของ"), so that no entry is lost due to incomplete input.
5. As a user, I want the clarification state to be cancelled if I send a new unrelated message, so that I'm not stuck waiting for a response.
6. As a user, I want entries to be saved immediately (optimistic save), so that recording feels fast and habitual.
7. As a user, I want the bot to still save my entry using a regex fallback even if Gemini fails, so that I never lose data due to AI downtime.
8. As a user, I want the receipt to show the category as "อื่นๆ" with a note when the fallback was used, so that I know I should review it.

### Receipt และแก้ไขทันที

9. As a user, I want to receive a Receipt card after every saved entry, so that I can immediately verify what was recorded.
10. As a user, I want the Receipt to show type, amount, description, category, and hashtags, so that I can spot errors quickly.
11. ~~As a user, I want to toggle income/expense type directly from the Receipt, so that I can fix AI misclassification without retyping.~~ _(ตัดออก: ความถี่น้อยมาก — ผู้ใช้ยอมรับให้ลบแล้วพิมใหม่หากประเภทผิด ADR-0003)_
12. As a user, I want to change the category directly from the Receipt via quick reply buttons, so that I can correct wrong categories immediately.
13. As a user, I want to delete an entry directly from the Receipt, so that accidental or duplicate entries can be removed.
14. As a user, I want to back-date an entry directly from the Receipt using a date picker, so that entries recorded after the fact are filed under the correct date. _(ใช้ LINE datetimepicker action — ดู ADR-0007)_

### LIFF Dashboard — ภาพรวม (บน GitHub Pages)

14. As a user, I want to open a dashboard from the LINE Rich Menu, so that I can view my monthly financial overview without leaving LINE.
15. As a user, I want to see a donut chart of income vs. expense for the current month, so that I understand my overall balance at a glance.
16. As a user, I want to see a donut chart of expenses broken down by category, so that I know where I'm spending most.
17. As a user, I want to see a donut chart of income broken down by category, so that I can track my income sources.
18. As a user, I want to switch between months in the dashboard, so that I can review past months.
19. As a user, I want to filter the dashboard by hashtag, so that I can see totals for a specific trip or project.

### LIFF Dashboard — จัดการรายการ (บน GitHub Pages)

20. As a user, I want to see a list of all active entries for the current month in the dashboard, so that I can review them after receipts have scrolled away in chat.
21. As a user, I want to edit the amount of an entry from the entry list, so that I can correct typos without deleting and re-entering.
22. As a user, I want to edit the description of an entry from the entry list, so that I can add context to entries recorded in shorthand.
23. As a user, I want to delete an entry from the entry list with a soft delete, so that the data isn't permanently lost. _(อัปเดต: ใช้ SweetAlert2 ในการทำ Popup ยืนยันการลบแบบ Native-like ไม่มี URL กวนใจ)_
24. As a user, I want to undo a deleted entry from the entry list, so that I can recover accidental deletions.
25. As a user, I want to change the category of an entry from the entry list, so that I can reclassify entries recorded with Gemini fallback. _(อัปเดต: ใช้ Dynamic Dropdown ที่ดึงข้อมูลหมวดหมู่แบบ Real-time มาจาก Sheet Categories)_

### การเข้าถึงและ Onboarding

26. As a new user who messages the bot for the first time, I want to be logged as pending and receive a polite rejection message, so that I know I need admin approval.
27. As a user who has just been approved by admin, I want to automatically receive a Welcome message explaining how to use the bot, so that I can start immediately without asking.
28. As a user, I want to type "help" or "วิธีใช้" to see usage instructions at any time, so that I don't have to remember the syntax.
29. As an admin, I want to approve users by changing their status in the Google Sheet, so that I have control over who can use the system without needing a bot command.

### Rich Menu

30. As a user, I want to see a persistent "📊 ดูสรุป" button at the bottom of the LINE chat, so that I can open the dashboard with one tap anytime. _(อัปเดต: ตั้งค่าผ่าน LINE OA Manager ชี้ URL ไปที่ LIFF)_

## Implementation Decisions

### Modules to build/modify

- **`Config.gs`** — constants: Script Properties keys, Gemini model string, timezone (`Asia/Bangkok`), TTL values
- **`Code.gs`** (Backend Router) — ฟังก์ชัน `doGet(e)` ทำหน้าที่เป็น Data API ส่ง JSON กลับไปให้ Frontend (`?api=overview`, `?api=list`), และฟังก์ชัน `doPost(e)` ทำหน้าที่รับแขก 2 ทางคือ (1) LINE Webhook และ (2) รับคำสั่ง Write POST จาก LIFF
- **`index.html`** (Frontend บน GitHub Pages) — โค้ด HTML/JS ประกอบด้วยแท็บ Dashboard และ รายการ, ใช้ Fetch API ติดต่อกับ GAS, ใช้ Chart.js วาดกราฟ และ SweetAlert2 สำหรับแจ้งเตือน
- **`Line.gs`** — `reply(replyToken, messages)`, `buildReceiptFlex(entry)`, quick reply for category selection
- **`Gemini.gs`** — `parseEntry(text, categories)` calling Gemini Flash-Lite + regex fallback path
- **`Sheet.gs`** — `addEntry()`, `editEntry()`, `deleteEntry()` (soft), `undoDelete()`, `getCategories()`, user lookup
- **`Access.gs`** — `checkUser(userId)` returning status; `logPending(userId, displayName)`
- **`State.gs`** — clarification state via `CacheService` with TTL; `PropertiesService` for welcome flag
- **`Overview.gs`** — aggregation by month/category/hashtag → JSON for LIFF API

### Gemini integration

- Model: Gemini Flash-Lite (verify current model string in AI Studio before coding)
- Force JSON output via `responseMimeType: "application/json"`
- **Strict Prompting Rules (อัปเดต):**
  1. หากบริบทกำกวม ให้บังคับ type เป็น "expense" ไว้ก่อน
  2. Description ต้องตัดจำนวนเงิน, หน่วยเงิน และ แฮชแท็กออก
  3. Hashtag ต้องสกัดเฉพาะคำที่มีเครื่องหมาย `#` นำหน้า ห้ามคิดเองเด็ดขาด
  4. ห้ามสร้างหมวดหมู่ใหม่ที่นอกเหนือจาก Categories ที่ส่งไปให้
- `amount = 0` means "no amount found" → enters clarification flow

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

### LIFF security (ADR-0005) & CORS Bypass

The write endpoint (`doPost` from LIFF) must verify the caller's LIFF `idToken` against LINE's token introspection endpoint server-side. The verified `userId` is then checked against the entry's `user_id` before any mutation. Never trust a plain `userId` from the request body.
_(อัปเดต: ใช้เทคนิคการส่ง Fetch API ด้วย Headers `Content-Type: text/plain` เพื่อข้ามการตรวจจับ CORS ของ Google Apps Script ทำให้สามารถทำ POST request จาก GitHub Pages ได้อย่างสมบูรณ์)_

## Testing Decisions

### Seams to test

**Seam 1 — `doPost(e)`** (LINE webhook): covers the full bot pipeline
(ทดสอบการทำงานของบอท, การตรวจจับผู้ใช้, Clarification, Regex fallback และการจัดการ Receipt ตามเอกสารต้นฉบับ)

**Seam 2 — `doGet(e)` + `doPost(e)`** (LIFF data API & Mutations): covers the dashboard pipeline

- `?api=overview` → ส่งคืนผลรวมรายเดือนสำหรับวาดกราฟ (รวมการกรองด้วยเดือน/Hashtag)
- `?api=list` → ส่งคืนรายการ active ในเดือนนั้น พร้อมแนบ `categories` จาก Sheet กลับมาสร้าง Dropdown
- Write endpoint (POST) ด้วย `idToken` → ตรวจสอบสำเร็จ และสามารถ Edit, Delete, Undo บรรทัดของตัวเองได้
- Cross-user mutation → ต้องถูกปฏิเสธโดยเซิร์ฟเวอร์ทันทีหากนำ Token ของ User A ไปแก้ข้อมูล User B

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

- **Decoupled Architecture Win:** การย้าย LIFF page ออกไปอยู่บน GitHub Pages ถือเป็นการปลดล็อกความยุ่งยากของ Iframe Sandbox และ Performance ของระบบได้ 100% ทำให้ต่อยอดด้วยไลบรารีใหม่ๆ (เช่น Tailwind, React) ในอนาคตได้ง่ายมาก
- **Execution time budget:** The full parse → save → reply cycle must complete well under GAS's 6-minute limit; the reply token expires in ~1 minute, so Gemini latency is the critical path
- **Categories tab is config, not code:** Adding or renaming categories requires only a Sheet edit — no code deployment needed
