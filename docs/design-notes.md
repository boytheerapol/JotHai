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
| 11 | Gemini model | Flash-Lite (verify model string ตอน build) |
| 12 | No-amount input | ถามกลับ (Clarification flow) |
| 13 | Rich Menu | 1 ปุ่ม → LIFF ที่มี tab สลับ overview ข้างใน |
| 14 | Hashtag | กรองได้ใน LIFF |
| 15 | แก้รายการย้อนหลัง | LIFF เพิ่ม tab **"รายการ"** list + แก้/ลบ inline (ADR-0005) |
| 16 | แก้จำนวน/คำอธิบาย | ทำได้ใน tab รายการ (ยกเลิก "ลบ+พิมใหม่") |
| 17 | ลบรายการ | **Soft delete + undo** (status active/deleted) |
| 18 | Gemini ล่ม/JSON พัง | **Regex fallback** ดึงตัวเลข → หมวด "อื่นๆ" (ADR-0006) |
| 19 | หลายรายการ/ข้อความ | 1 ข้อความ = 1 รายการ (MVP) |
| 20 | Hashtag เพี้ยน | Normalize ตอนเก็บ (ตัด #, trim, lowercase ASCII, ไทยคงเดิม) |
| 21 | แก้/ลบ Category | Entry เก็บ category เป็น **snapshot** |
| 22 | Onboarding | Welcome ตอน approve + พิม **"help"** |

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
