# ADR-0006: Regex fallback เมื่อ AI parse ไม่สำเร็จ

Status: Accepted — 2026-06-24 (จาก brainstorm รอบ 2)

## Context
การลงรายการพึ่ง Gemini เป็น path หลักที่ใช้ทุกวัน ถ้า Gemini ล่ม / timeout / คืน JSON พัง
แล้วระบบ "บันทึกไม่ได้เลย" = เครื่องมือที่ต้องเชื่อถือได้รายวันกลับล้มทั้งดุ้นเพราะ dependency ภายนอก
ขัดกับเจตนา optimistic save ที่ต้องการให้ "ลงได้ไว เสมอ"

## Decision
ถ้า `parseEntry()` ของ Gemini ล้มเหลว (error หรือ JSON ใช้ไม่ได้) → ใช้ **regex fallback**:
- ดึง **จำนวนเงิน** ด้วย regex (รองรับ `1,500` / `1.5k` / มีหน่วยบาท ฯลฯ)
- ดึง **hashtags** ที่ขึ้นต้นด้วย `#`
- ตั้ง `type=expense`, `category=อื่นๆ`, `source=fallback`
- **บันทึก Entry ตามปกติ** + ส่ง Receipt → User ค่อยแก้หมวดทีหลังได้

ถ้า regex ก็หาเลขไม่เจอ → เข้า Clarification flow (ถามจำนวนกลับ)

## Consequences
- (+) ลงรายการได้แม้ AI ล่ม — จำนวนเงินไม่หาย (ข้อมูลที่กู้คืนยากสุด)
- (+) แยก field `source=fallback` ไว้รู้ว่ารายการไหนยังไม่ผ่าน AI จัดหมวด (อาจ review)
- (−) รายการ fallback หมวดอาจไม่แม่น (เป็น "อื่นๆ" หมด) — ยอมรับได้ แก้ภายหลังใน LIFF list
- ทางเลือกที่ตัดทิ้ง: retry อย่างเดียวแล้วแจ้ง error — เสี่ยงรายการหลุดถ้า AI ล่มยาว
