# Design Notes — JotHai (จดให้)

บันทึก detail decisions ที่ตกผลึกจาก grilling (2026-06-24) ที่ไม่ถึงระดับ ADR
สำหรับ decision เชิงสถาปัตยกรรม ดู `docs/adr/` สำหรับภาษากลาง ดู `CONTEXT.md`

## Decision summary

| # | หัวข้อ | ข้อสรุป |
|---|---|---|
| 1 | Backend | Google Apps Script (ADR-0001) |
| 2 | Chart/Overview | LIFF web dashboard, interactive (ADR-0002) |
| 3 | Category | Fixed list, ขยายได้ผ่าน tab `Categories` |
| 4 | Income/Expense | AI เดา, default = Expense |
| 5 | Save flow | Optimistic save + Receipt แก้ได้ (ADR-0003) |
| 6 | Users | Multi-user แยกบัญชี |
| 7 | Access | log `pending` → admin approve ใน Sheet |
| 8 | Image input | ข้อความอย่างเดียว (MVP) |
| 9 | Monthly summary | ดูเองผ่านเมนู, reply-only (ADR-0004) |
| 10 | Receipt buttons | แก้หมวด · สลับ Type · ลบ (แก้จำนวน/คำอธิบาย = ลบแล้วพิมใหม่) |
| 11 | Gemini model | Flash-Lite (verify model string ตอน build) · detect type เอง · default expense ถ้าไม่แน่ใจ |
| 12 | No-amount input | ถามกลับ (Clarification flow) · auto-cancel ถ้า user ส่ง message ใหม่ก่อนตอบ |
| 13 | Rich Menu | 1 ปุ่ม "📊 ดูสรุป" → LIFF (compact 1686×520 px) |
| 14 | Hashtag | กรองได้ใน LIFF |
| 15 | แก้รายการย้อนหลัง | LIFF เพิ่ม tab **"รายการ"** list + แก้/ลบ inline (ADR-0005) |
| 16 | แก้จำนวน/คำอธิบาย | ทำได้ใน tab รายการ (ยกเลิก "ลบ+พิมใหม่") |
| 17 | ลบรายการ | **Soft delete + undo** (status active/deleted) |
| 18 | Gemini ล่ม/JSON พัง | **Regex fallback** ดึงตัวเลข → หมวด "อื่นๆ" (ADR-0006) · รูปแบบที่รองรับ: `1500`, `1,500`, `1.5k/K`, `฿`, `บาท`, `บ.` |
| 19 | หลายรายการ/ข้อความ | 1 ข้อความ = 1 รายการ (MVP) |
| 20 | Hashtag เพี้ยน | Normalize ตอนเก็บ (ตัด #, trim, lowercase ASCII, ไทยคงเดิม) |
| 21 | แก้/ลบ Category | Entry เก็บ category เป็น **snapshot** |
| 22 | Onboarding | Welcome ตอน approve + พิม **"help"** |

## Bot Tone & Error Strings

**Tone policy:** เป็นกันเอง สบาย ปิดท้ายด้วย "นะคะ/ค่ะ/นะ" อนุญาต emoji ได้ 1 ตัวต่อ message

| Situation | String |
| --------- | ------ |
| Gemini ล้มเหลว + regex fallback สำเร็จ | "บันทึกไว้แล้วนะคะ แต่หมวดหมู่อาจไม่แม่น ลองเช็คใน 'รายการ' ได้เลยค่ะ 📋" |
| Regex fallback ไม่ได้จำนวนเงิน → clarification | "อ่านตัวเลขไม่ออกเลยค่ะ 😅 ใส่จำนวนเงินให้หน่อยได้ไหม?" |
| User pending (ไม่ผ่าน access control) | "ยังไม่ได้รับอนุญาตนะคะ รอ admin approve ก่อนนะ 🙏" |
| User unknown (ไม่อยู่ใน Users tab) | เหมือน pending — log userId แล้วตอบเหมือนกัน |
| addEntry ล้มเหลว (Sheet error) | "บันทึกไม่ได้ค่ะ ลองใหม่อีกทีได้เลยนะ 🙏" |
| ยกเลิก clarification (user ส่ง message ใหม่) | "ยกเลิกรายการที่ค้างไว้แล้วนะคะ ✌️" |

## Gemini Prompt & JSON Schema

### JSON output schema

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

- `amount` เป็น positive number (THB) — ไม่มีสัญลักษณ์สกุลเงิน
- `category` ต้องเป็นค่าจาก Categories tab ที่ pass เข้า prompt เท่านั้น
- `hashtags` normalize แล้ว: ไม่มี `#`, ASCII lowercase, ไทยคงเดิม
- ถ้าไม่แน่ใจ type → default `"expense"` / ถ้าไม่พบ amount → return `"amount": 0` (เข้า clarification)

### Prompt template

```text
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

**Placeholders:** `{RAW_TEXT}` = raw user message, `{EXPENSE_CATEGORIES}` / `{INCOME_CATEGORIES}` = comma-separated list จาก Categories tab  
**API config:** ใช้ `responseMimeType: "application/json"` + `responseSchema` ถ้า model version รองรับ — ถ้าไม่รองรับใช้ prompt instruction อย่างเดียว  
**Error handling:** `JSON.parse()` ใน try/catch — exception ใดๆ → fall through ไป regex fallback

## Regex Fallback Patterns

ใช้ใน `Gemini.gs` เมื่อ `parseEntry()` ล้มเหลวหรือ JSON พัง

### Amount extraction

รูปแบบที่รองรับ (MVP): `1500`, `1,500`, `1.5k`, `1.5K`, `฿1500`, `1500บาท`, `1500 บ.`  
ไม่รองรับ: เลขไทย (๑๕๐๐), ช่วง ("500-600"), ประมาณ ("ประมาณ 100")

```js
// Step 1: strip currency markers
const cleaned = text.replace(/฿|บาท|บ\./g, '');
// Step 2: match amount
const match = cleaned.match(/(\d{1,3}(?:,\d{3})*|\d+)(\.\d+)?(k|K)?/);
if (match) {
  let amount = parseFloat(match[1].replace(/,/g, '') + (match[2] || ''));
  if (match[3]) amount *= 1000;
}
```

### Hashtag extraction

```js
const hashtags = [...text.matchAll(/#([^\s#]+)/g)].map(m => m[1].toLowerCase());
```

### Fallback entry defaults

```js
{ type: "expense", category: "อื่นๆ", source: "fallback",
  description: raw_text.substring(0, 100), hashtags, amount }
// amount = 0 → เข้า clarification flow
```

## Welcome & Help Message Structure

### Welcome (ส่งครั้งเดียวเมื่อ admin approve)

1. ทักทาย + ชื่อ bot
2. วิธีเริ่มใช้งาน — "พิมพ์อะไรก็ได้เลย"
3. ตัวอย่างการพิมพ์ — อย่างน้อย 3 ตัวอย่าง (expense, income, พร้อม hashtag)
4. วิธีดูสรุป — กด "ดูสรุป" ใน Rich Menu
5. วิธีเรียก help ซ้ำ — พิมพ์ "วิธีใช้" หรือ "help"

### Help (ตอบสนอง "วิธีใช้" / "help")

1. หัวข้อ "วิธีใช้ จดให้"
2. วิธีบันทึกรายการ + ตัวอย่าง (expense, income, hashtag)
3. วิธีแก้ไขรายการ — ผ่าน Receipt ในแชต หรือเปิด "ดูสรุป"
4. คำสั่งที่รองรับ — "วิธีใช้" / "help"
5. หมายเหตุ — ติดต่อ admin ถ้าต้องการความช่วยเหลือเพิ่มเติม

> Copy จริง (ถ้อยคำ, emoji) เขียนตอน Phase 2 implementation

## Clarification Flow Detail

**State key:** `CLARIFICATION_{userId}` ใน CacheService  
**TTL constant:** `CLARIFICATION_TTL_SECONDS = 600` (10 นาที) กำหนดใน Config.gs

**พฤติกรรมเมื่อ user ส่ง message ขณะรอ:**

1. ถ้า message ถัดไป **เป็นตัวเลข** → ถือว่าตอบ clarification → complete Entry นั้น (ไม่ parse เป็น entry ใหม่)
2. ถ้า message ถัดไป **ไม่ใช่ตัวเลข** → ล้าง pending state → reply "ยกเลิกรายการที่ค้างไว้แล้วนะคะ ✌️" → แล้วประมวลผล message ใหม่ปกติ
3. ถ้า TTL หมด (10 นาที ไม่มีการตอบ) → CacheService evict เอง → message ถัดไป = fresh entry ไม่มีการแจ้งเตือน

## Rich Menu Spec

- **Layout:** 1 ปุ่มเต็มความกว้าง (compact size)
- **Label:** "📊 ดูสรุป"
- **Action:** `uri` → `https://liff.line.me/{LIFF_ID}`
- **Dimensions:** 1686 × 520 px (LINE compact Rich Menu)
- **Chat bar label:** "เมนู"
- **Default:** set as default Rich Menu (แสดงเสมอ)

> Rich Menu graphics: ออกแบบตอน Phase 7

## Proposed Google Sheet schema

**`Entries`**
`entry_id │ user_id │ timestamp │ type │ amount │ description │ category │ hashtags │ status │ raw_text │ source`
- `entry_id`: unique, ใช้อ้างอิงตอนแก้/ลบ
- `type`: `income` | `expense`
- `hashtags`: เก็บหลาย tag ในช่องเดียว (คั่นด้วย space หรือ comma) — normalize แล้ว
- `status`: `active` | `deleted` (soft delete; Overview/list นับเฉพาะ active)
- `category`: snapshot (ไม่ผูกกับ config ปัจจุบัน)
- `source`: `ai` | `fallback` — ติดธงไว้ดูว่ารายการไหนมาจาก regex fallback (จัดหมวดอาจไม่แม่น)

**`Categories`** (config, ขยายได้)
`category │ type │ keywords`
- seed รายจ่าย: อาหาร · เดินทาง/รถ · ของใช้จำเป็น · ช้อปปิ้ง · สาธารณูปโภค · ผ่อนบ้าน · สุขภาพ · บันเทิง · การศึกษา · ครอบครัว · ออมเงิน/ลงทุน · งาน/ธุรกิจ · อื่นๆ
- seed รายรับ: เงินเดือน · โบนัส · ค้าขาย/ธุรกิจ · ดอกเบี้ย/ปันผล · อื่นๆ
- `keywords`: คำใบ้ให้ AI map (optional, เพิ่มความแม่น)

**`Users`** (access control)
`user_id │ display_name │ status │ joined_at`
- `status`: `pending` | `approved`

## Assumptions (ค่า default — ปรับได้)
- สกุลเงิน: THB
- Timezone / ขอบเขตเดือน: Asia/Bangkok, เดือนปฏิทิน (1–สิ้นเดือน)
- Categories แชร์ชุดเดียวกันทุก User (ยังไม่แยก list ต่อคน)
- Admin อนุมัติผ่าน Sheet โดยตรง ไม่มี admin command ใน LINE

## Deferred → Phase 2
- รับรูปสลิป/ใบเสร็จ (Gemini Vision)
- Push สรุปสิ้นเดือนอัตโนมัติ (ต้องทบทวน push quota)
- Category list แยกต่อ User
- Admin command ใน LINE
- หลายรายการในข้อความเดียว
- งบประมาณ/แจ้งเตือนเกินงบ

## Known risks
- Multi-user ใช้ Gemini key เดียวร่วม quota: 1,500 req/วัน พอสำหรับวงครอบครัว
  แต่ถ้า burst หลายคนพร้อมกันอาจชน RPM ~30/นาที (Flash-Lite) — เฝ้าดูถ้าผู้ใช้โต
- LIFF auth flow + viewport มือถือ เป็นจุดที่ debug ยากสุดของ MVP
- LIFF มี write endpoint (แก้/ลบ): ต้อง verify userId ฝั่ง server กัน user แก้ของคนอื่น
  (ส่ง LIFF idToken ไป verify ไม่ใช่เชื่อ userId ที่ client ส่งมาดิบๆ)
