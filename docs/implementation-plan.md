# Implementation Plan — JotHai (จดให้)

> LINE expense tracker · Google Apps Script backend · Gemini Flash-Lite · Google Sheet store · LIFF dashboard
> อ้างอิง: `CONTEXT.md`, `docs/adr/*`, `docs/design-notes.md`, `docs/diagrams/*`

## TL;DR
สร้างแบบ **incremental 8 phase** เริ่มจาก webhook ที่ echo ได้ก่อน แล้วค่อยเสียบ AI, save,
Receipt, LIFF, Rich Menu ทีละชั้น — แต่ละ phase ต้อง **deploy แล้วทดสอบจริงบน LINE** ก่อนไปต่อ
จุดเสี่ยงสุด 2 จุด: (1) LIFF auth/viewport, (2) latency Gemini ต้องจบในอายุ reply token
ของจริงเริ่มเห็นผล (พิมแล้วลง Sheet ได้) ตั้งแต่จบ **Phase 3**

---

## Prerequisites (บัญชี + ของที่ต้องมี)

| ของ | ใช้ทำอะไร | หมายเหตุ |
|---|---|---|
| LINE Developers account | สร้าง Messaging API channel + LIFF app | ฟรี |
| Channel access token + secret | บอท reply + verify webhook | จาก Messaging API channel |
| Google account | Apps Script + Sheet | ใช้ตัวเดียวกับที่จะเก็บข้อมูล |
| Gemini API key | parse/จัดหมวด | จาก Google AI Studio, free tier |
| Google Sheet | data store | 3 tab: Entries / Categories / Users |

> ⚠️ ก่อนเริ่ม Phase ที่อ้าง API spec (LINE/Gemini/LIFF) ให้เปิด official docs เช็ค endpoint/field
> ล่าสุดทุกครั้ง — โครงสร้าง request เปลี่ยนได้ และ Gemini model string เปลี่ยนบ่อย

---

## โครงสร้างโปรเจกต์ GAS

```
JotHai (Apps Script project, bound to the Sheet)
├── Code.gs            // doPost (webhook), doGet (LIFF + data API), routing
├── Line.gs            // reply(), buildReceiptFlex(), pushIfNeeded() — wrappers LINE API
├── Gemini.gs          // parseEntry(text, categories) → {type, amount, category, hashtags}
├── Sheet.gs           // CRUD: addEntry/editEntry/deleteEntry, getCategories, user status
├── Access.gs          // checkUser(userId), logPending()
├── State.gs           // clarification state (PropertiesService/CacheService)
├── Overview.gs        // aggregate ต่อ month/category/hashtag → JSON
├── liff.html          // LIFF page (Chart.js, 3 tabs, month + hashtag filter)
└── Config.gs          // constants: tokens (ผ่าน Script Properties), model string, TZ
```

> Secrets (channel token, Gemini key) เก็บใน **Script Properties** ไม่ hardcode ในโค้ด

---

## Phases

### Phase 0 — Setup โครง (ครึ่งวัน)
1. สร้าง Google Sheet + 3 tab พร้อม header ตาม schema (ดู design-notes)
2. seed tab `Categories` ด้วยชุด default 13 รายจ่าย / 5 รายรับ
3. Tools → Apps Script เปิด project ที่ bind กับ Sheet
4. สร้าง Messaging API channel ใน LINE Developers, เก็บ token/secret ลง Script Properties
5. ขอ Gemini API key จาก AI Studio เก็บลง Script Properties
- **เสร็จเมื่อ:** Sheet พร้อม, Apps Script เปิดได้, secrets อยู่ใน Properties

### Phase 1 — Webhook skeleton + echo (ครึ่งวัน)
1. เขียน `doPost(e)` parse event, ดึง `replyToken` + `text` + `source.userId`
2. `Line.reply(replyToken, "echo: " + text)`
3. Deploy as **Web App** (execute as me, access: anyone) → ได้ `/exec` URL
4. เอา URL ไปตั้งเป็น Webhook URL ใน LINE, เปิด Use webhook, กด Verify
- **ทดสอบ:** ทักบอท → บอท echo กลับ
- **เสร็จเมื่อ:** loop รับ-ตอบ ทำงานครบ (นี่คือ proof ว่า pipeline ติด)

### Phase 2 — Access control + welcome/help (ครึ่งวัน)
1. `Access.checkUser(userId)` อ่าน tab Users → คืน status
2. ถ้าไม่พบ → `logPending(userId, displayName)` (ดึงชื่อจาก LINE profile API) + reply ปฏิเสธ
3. ถ้า pending → reply ปฏิเสธ; ถ้า approved → ผ่าน
4. ใส่ guard ไว้ต้น `doPost`
5. **Welcome:** ตรวจจับการเปลี่ยนเป็น approved (เช่น flag `welcomed`) → ส่งข้อความสอนใช้ครั้งแรก
6. **Help:** ถ้า text == "help"/"วิธีใช้" → reply วิธีใช้ (รูปแบบพิม, #hashtag, ดูภาพรวม)
- **ทดสอบ:** บัญชีใหม่ → ถูกปฏิเสธ + โผล่ pending → แก้เป็น approved → ได้ Welcome → พิม "help" ได้คำแนะนำ
- **เสร็จเมื่อ:** เฉพาะคน approved ใช้งานได้ + ผู้ใช้ใหม่รู้วิธีพิม

### Phase 3 — AI parse + optimistic save + Receipt ⭐ (1–2 วัน)
1. `Gemini.parseEntry(text, categories)` — เรียก `generateContent` ด้วย Flash-Lite
   - prompt: ส่ง category list + กติกา (default expense, ดึง hashtags ที่ขึ้นด้วย `#`, คืน JSON)
   - บังคับ output เป็น JSON (response schema / "ตอบ JSON เท่านั้น")
   - **normalize hashtags** (ตัด #, trim, lowercase ASCII, ไทยคงเดิม)
2. **Regex fallback (ADR-0006):** ถ้า Gemini error/JSON พัง → ดึงจำนวน+hashtag ด้วย regex,
   ตั้ง type=expense, category=อื่นๆ, `source=fallback`; ถ้า regex ก็ไม่เจอเลข → ไป Clarification (Phase 5)
3. ถ้า `amount` มีค่า → `Sheet.addEntry(...)` (status=active, category=snapshot) คืน `entry_id`
4. `Line.buildReceiptFlex(entry)` → reply Flex แสดง type/จำนวน/หมวด/hashtag
5. (ปุ่มยังไม่ต้องทำงานใน phase นี้ก็ได้ — แค่แสดงผล)
- **ทดสอบ:** พิม "กาแฟ 50 #cafe" → ลง Sheet + ได้ Receipt ที่ค่าถูก; ลองหลายแบบ (รายรับ, ไม่มี #, คำกำกวม); จำลอง Gemini ล่ม → ต้องยัง fallback ลงได้
- **เสร็จเมื่อ:** ลงรายการจริงได้ + จัดหมวดแม่นพอใช้ + ไม่ล้มเมื่อ AI ล่ม → **นี่คือ MVP แกนกลาง**

### Phase 4 — Receipt ปุ่มแก้/ลบ (1 วัน)
1. เปลี่ยนปุ่มเป็น **postback action** แนบ `entry_id` + action (`chgcat`/`toggle`/`del`)
2. ใน `doPost` route event ชนิด `postback`:
   - `toggle` → สลับ type, `Sheet.editEntry`
   - `del` → `Sheet.deleteEntry`
   - `chgcat` → ส่ง quick reply รายชื่อหมวด → กดแล้ว editEntry
3. reply ยืนยันผลการแก้
- **ทดสอบ:** กดสลับ Type/ลบ/เปลี่ยนหมวด → Sheet เปลี่ยนตาม
- **เสร็จเมื่อ:** แก้ AI ที่เดาผิดได้ครบจากในแชต

### Phase 5 — Clarification flow (ครึ่งวัน)
1. ถ้า `amount` ว่าง → reply ถามจำนวน + `State.set(userId, pendingText)`
2. event ถัดไป: ถ้ามี pending state และ text เป็นตัวเลข → ประกอบ entry ให้ครบแล้ว save
3. ใส่ TTL ให้ state (เช่น 10 นาที) กัน state ค้าง
- **ทดสอบ:** พิม "กินข้าว" → บอทถาม → ตอบ "80" → ลงรายการครบ
- **เสร็จเมื่อ:** เคสไม่มีจำนวนจัดการได้ลื่น

### Phase 6 — LIFF dashboard + จัดการรายการ ⭐ (3–4 วัน, จุดเสี่ยงสุด)
1. `Overview.gs`: aggregate Entries (status=active) ของ userId → สรุป 3 ชุด (รายรับ-จ่าย, รายรับ by cat, รายจ่าย by cat) + filter month/hashtag
2. `doGet(e)`: ถ้า `?api=overview` → JSON; `?api=list` → รายการรายตัวของเดือน; ไม่งั้นเสิร์ฟ `liff.html`
3. **Write endpoint (ADR-0005):** รับ POST แก้/ลบ(soft)/undo by entry_id
   - ⚠ security: client ส่ง LIFF **idToken** มาด้วย → server verify กับ LINE → ดึง userId จากผลลัพธ์
     แล้วเช็คว่า entry นั้นเป็นของ userId นี้จริง ก่อนแก้ (กันแก้ของคนอื่น) — ห้ามเชื่อ userId ดิบจาก client
4. `liff.html`: `liff.init()` → 4 tab (3 chart + **"รายการ"**), ตัวเลือกเดือน, กรอง hashtag, ฟอร์มแก้/ปุ่มลบ-undo
5. สร้าง LIFF app ใน LINE Developers (endpoint = `/exec` URL), ได้ LIFF ID ใส่ใน `liff.html`
- **ทดสอบ:** เห็น 3 chart + list ตรงกับ Sheet; แก้/ลบ/undo รายการได้และสะท้อนใน Sheet; ลองใช้ user A แก้ของ user B → ต้องถูกปฏิเสธ
- **เสี่ยง:** liff.init ใน in-app browser, viewport มือถือ, idToken verify, CORS/redirect ของ GAS web app — เผื่อเวลา debug
- **เสร็จเมื่อ:** ดู Overview + จัดการรายการย้อนหลังได้จริง และ isolation ข้าม user แน่น

### Phase 7 — Rich Menu (ครึ่งวัน)
1. ออกแบบรูป Rich Menu (ปุ่ม "ภาพรวม")
2. สร้าง Rich Menu ผ่าน LINE API, set เป็น default, ผูก action เปิด LIFF
- **ทดสอบ:** เปิดแชต เห็นเมนู กดแล้วเข้า LIFF
- **เสร็จเมื่อ:** เข้าถึงทุกอย่างจากเมนูล่างจอ

### Phase 8 — Polish + verification (1 วัน)
- ทดสอบ end-to-end หลายผู้ใช้ (ข้อมูลแยกกันจริง), เดือนข้าม, จำนวนมีทศนิยม/คอมมา
- เช็ค error handling: Gemini timeout, JSON พัง, quota เต็ม → ตอบ user ดีๆ ไม่เงียบ
- ตรวจ accuracy การจัดหมวด ถ้าหลุดบ่อย → ปรับ prompt หรือ upgrade เป็น Flash
- กันพลาด: ลอง `doPost` ซ้ำ (LINE retry) ไม่ให้ save ซ้ำ

---

## Build order rationale
- **Echo ก่อน AI:** แยกปัญหา "pipeline ติดไหม" ออกจาก "AI ถูกไหม" — debug ง่ายกว่ามาก
- **Access control เร็ว:** กัน abuse + quota ตั้งแต่ต้น ก่อนเปิดให้คนอื่น
- **LIFF ไว้ท้ายๆ:** ต้องมีข้อมูลใน Sheet ก่อน (จาก Phase 3) ถึงจะทดสอบ chart ได้จริง

## Estimated effort
~9–13 วันทำงาน (รวม) สำหรับคนเขียน GAS/JS ได้ — LIFF (Phase 6: chart + list + write endpoint + idToken verify) กินเวลามากสุด

## Open items ก่อนลงมือ
- ยืนยัน model string ของ Flash-Lite ปัจจุบัน (เช็ค AI Studio)
- ยืนยันว่า LIFF app เพิ่มใต้ Messaging API channel ได้ หรือต้องมี LINE Login channel แยก (เช็ค LINE Developers)
- รูป Rich Menu / โลโก้ JotHai (ออกแบบหรือใช้ placeholder ก่อน)

## Sources
- LINE Messaging API — https://developers.line.biz/en/docs/messaging-api/
- LIFF — https://developers.line.biz/en/docs/liff/
- Gemini API generateContent — https://ai.google.dev/gemini-api/docs
- Apps Script Web Apps — https://developers.google.com/apps-script/guides/web
