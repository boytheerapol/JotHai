# Missing Requirements Design — JotHai

**Date:** 2026-06-24  
**Scope:** Fill documentation gaps identified before implementation begins. No new features — only specifying detail that existing ADRs and design-notes left as TBD.

---

## 1. Clarification Flow Edge Cases

### When user sends a new message while bot is waiting for amount

**Behavior (Option A — Auto-cancel):**

1. Bot asks "ใส่จำนวนเงินด้วยนะคะ 🙏" and writes pending state to CacheService with TTL = 10 minutes
2. If user sends **any non-numeric message** before answering:
   - Clear pending state immediately
   - Reply: "ยกเลิกรายการที่ค้างไว้แล้วนะคะ ✌️" (prepended before processing the new message)
   - Process the new message as a fresh entry
3. If user sends a **numeric message** while pending state exists → treat as the amount answer (complete the clarification flow, do NOT parse as a new entry)
4. If TTL expires (10 minutes with no reply) → state evicted automatically by CacheService; next message from user is treated as a fresh entry with no notification

**State key:** `CLARIFICATION_{userId}` stored in CacheService  
**TTL constant:** define as `CLARIFICATION_TTL_SECONDS = 600` in Config.gs

---

## 2. Bot Tone & Error Strings

**Tone:** เป็นกันเอง สบาย ใช้ "นะคะ" / "ค่ะ" / "นะ" ปิดท้าย อนุญาต emoji ได้ 1 ตัวต่อ message

### Error string templates

| Situation | String |
|-----------|--------|
| Gemini ล้มเหลว + regex fallback สำเร็จ | "บันทึกไว้แล้วนะคะ แต่หมวดหมู่อาจไม่แม่น ลองเช็คใน 'รายการ' ได้เลยค่ะ 📋" |
| Regex fallback ก็ไม่ได้จำนวนเงิน → เข้า clarification | "อ่านตัวเลขไม่ออกเลยค่ะ 😅 ใส่จำนวนเงินให้หน่อยได้ไหม?" |
| User ไม่ผ่าน access control (pending) | "ยังไม่ได้รับอนุญาตนะคะ รอ admin approve ก่อนนะ 🙏" |
| User unknown (ไม่อยู่ใน Users tab เลย) | เหมือน pending — log userId แล้วตอบเหมือนกัน |
| Parse สำเร็จ แต่ addEntry ล้มเหลว (Sheet error) | "บันทึกไม่ได้ค่ะ ลองใหม่อีกทีได้เลยนะ 🙏" |
| ยกเลิก clarification เพราะ user ส่ง message ใหม่ | "ยกเลิกรายการที่ค้างไว้แล้วนะคะ ✌️" |

---

## 3. Rich Menu Spec

**Layout:** 1 ปุ่มเต็มความกว้าง  
**Label:** "📊 ดูสรุป"  
**Action:** `uri` → เปิด LIFF URL (`https://liff.line.me/{LIFF_ID}`)  
**Dimensions:** ใช้ขนาด compact (1686 × 520 px) ตามแนะนำของ LINE  
**Chat bar label:** "เมนู"  
**Default:** แสดงเสมอ (set as default Rich Menu)

> Rich Menu graphics: ออกแบบตอน Phase 7 — spec นี้กำหนดแค่ layout และ action

---

## 4. Gemini Prompt Template & JSON Output Schema

### JSON Output Schema

```json
{
  "type": "object",
  "properties": {
    "type":        { "type": "string", "enum": ["income", "expense"] },
    "amount":      { "type": "number" },
    "description": { "type": "string" },
    "category":    { "type": "string" },
    "hashtags":    { "type": "array", "items": { "type": "string" } }
  },
  "required": ["type", "amount", "description", "category", "hashtags"]
}
```

**Notes:**
- `amount` is a positive number, currency always THB — never include symbol
- `hashtags` are normalized: no leading `#`, trimmed, ASCII lowercased, Thai preserved
- `category` must be one of the values from the Categories tab passed in the prompt
- If type is uncertain → default to `"expense"`
- If amount cannot be determined → return `"amount": 0` (triggers clarification flow)

### Prompt Template

```
คุณเป็น AI ช่วยบันทึกรายรับ-รายจ่ายส่วนตัว

วิเคราะห์ข้อความต่อไปนี้แล้วตอบเป็น JSON ตาม schema ที่กำหนด:

ข้อความ: "{RAW_TEXT}"

หมวดหมู่ที่มีอยู่:
รายจ่าย: {EXPENSE_CATEGORIES}
รายรับ: {INCOME_CATEGORIES}

กฎ:
1. type = "income" ถ้าข้อความบ่งบอกถึงการรับเงิน (เช่น เงินเดือน, ได้รับ, รายได้) มิฉะนั้น = "expense"
2. amount = ตัวเลขจำนวนเงิน (บาท) เป็นตัวเลขล้วน ไม่มีหน่วย ถ้าไม่พบให้ใส่ 0
3. description = คำอธิบายสั้นๆ ของรายการนี้ ภาษาไทย
4. category = เลือกจากรายการหมวดหมู่ที่ให้มาเท่านั้น ถ้าไม่แน่ใจให้ใช้ "อื่นๆ"
5. hashtags = รายการ hashtag ที่พบในข้อความ (ไม่มี # นำหน้า) ถ้าไม่มีให้เป็น []

ตอบเฉพาะ JSON เท่านั้น ไม่มีข้อความอื่น
```

**Placeholder substitution (in Gemini.gs):**
- `{RAW_TEXT}` — raw user message
- `{EXPENSE_CATEGORIES}` — comma-separated list from Categories tab where type = "expense"
- `{INCOME_CATEGORIES}` — comma-separated list from Categories tab where type = "income"

**API call config:**
- Use `responseMimeType: "application/json"` and `responseSchema` (structured output) if the Flash-Lite model version supports it; otherwise rely on prompt instruction alone
- Wrap `JSON.parse()` in try/catch → on any error, fall through to regex fallback (ADR-0006)

---

## 5. Regex Fallback Patterns

**Scope:** Used in `Gemini.gs` when `parseEntry()` fails or returns unparseable JSON.

### Amount extraction regex

Supported formats (in priority order):

| Format | Example | Notes |
|--------|---------|-------|
| Number with comma | `1,500` | Remove comma before parsing |
| Number with k/K suffix | `1.5k`, `2K` | Multiply by 1000 |
| Plain integer/decimal | `1500`, `99.50` | Parse directly |
| With currency symbol/word | `฿1500`, `1500บาท`, `1500 บ.` | Strip symbol/word first |

**Regex pattern (JavaScript):**

```js
// Step 1: strip currency markers
const cleaned = text.replace(/฿|บาท|บ\./g, '');

// Step 2: match amount
const match = cleaned.match(/(\d{1,3}(?:,\d{3})*|\d+)(\.\d+)?(k|K)?/);
if (match) {
  let amount = parseFloat(match[1].replace(/,/g, '') + (match[2] || ''));
  if (match[3]) amount *= 1000; // k/K suffix
}
```

**Not supported in MVP:** Thai numerals (๑๒๓), ranges ("500-600"), approximations ("ประมาณ 100")

### Hashtag extraction regex

```js
const hashtags = [...text.matchAll(/#([^\s#]+)/g)].map(m => m[1].toLowerCase());
// Thai characters preserved; ASCII lowercased
```

### Fallback entry defaults

```js
{
  type: "expense",
  category: "อื่นๆ",
  source: "fallback",
  description: raw_text.substring(0, 100), // use raw text as description
  hashtags: /* extracted via regex above */,
  amount: /* extracted via regex above, or 0 → triggers clarification */
}
```

---

## 6. Welcome & Help Message Structure

### Welcome message (sent once on admin approval)

**Sections (in order):**
1. ทักทาย + ชื่อ bot (1 บรรทัด)
2. วิธีเริ่มใช้งาน — บอกว่าพิมพ์อะไรก็ได้เลย (1-2 บรรทัด)
3. ตัวอย่างการพิมพ์ — อย่างน้อย 3 ตัวอย่าง (expense, income, พร้อม hashtag)
4. วิธีดูสรุป — บอกว่ากด "ดูสรุป" ใน Rich Menu
5. วิธีเรียก help ซ้ำ — พิมพ์ "วิธีใช้" หรือ "help"

### Help message (ตอบสนอง "วิธีใช้" / "help")

**Sections (in order):**
1. หัวข้อ "วิธีใช้ จดให้"
2. วิธีบันทึกรายการ + ตัวอย่าง (expense, income, hashtag)
3. วิธีแก้ไขรายการ — ผ่าน Receipt ที่ได้รับ หรือเปิด "ดูสรุป"
4. คำสั่งที่รองรับ — "วิธีใช้" / "help"
5. หมายเหตุ — ถ้าต้องการความช่วยเหลือเพิ่มเติมให้ติดต่อ admin

> Copy จริง (ถ้อยคำ, emoji) เขียนตอน Phase 2 implementation — spec นี้กำหนดแค่ structure

---

## Verification

ก่อน implement แต่ละหัวข้อ ให้ verify ดังนี้:

| หัวข้อ | วิธี verify |
|--------|-------------|
| Clarification flow | ส่ง message ไม่มีจำนวนเงิน → bot ถาม → ส่ง message ใหม่แทน → bot ยกเลิก + ประมวลผล message ใหม่ |
| Bot tone | อ่าน error string ทุกตัว — ต้องไม่มีภาษาแข็งหรือ formal เกินไป |
| Rich Menu | เปิด LINE app → กด "ดูสรุป" → LIFF เปิดถูกต้อง |
| Gemini prompt | ทดสอบ input ภาษาไทยหลายรูปแบบ → JSON output ถูก schema |
| Regex fallback | Mock Gemini failure → ส่ง "กาแฟ 1,500 บาท" → บันทึกได้ amount=1500 |
| Welcome/Help | approve user ใหม่ → ได้รับ welcome; พิมพ์ "help" → ได้รับ help |
