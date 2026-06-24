# ADR-0005: LIFF เป็น surface จัดการรายการ + เพิ่ม write endpoint

Status: Accepted — 2026-06-24 (จาก brainstorm รอบ 2)

## Context
ADR-0003 เลือก optimistic save + Receipt ในแชต แต่ Receipt เลื่อนหายไปตามแชต
ถ้า AI จัดหมวดผิดแล้ว User เพิ่งมาเห็นทีหลัง จะ **ไม่มีทางหา/แก้** รายการนั้นจากใน LINE
เหลือทางเดียวคือเข้าไปแก้ Google Sheet เอง — พัง UX สำหรับ multi-user (คนทั่วไปไม่ควรแตะ Sheet)

เดิม LIFF (ADR-0002) เป็น read-only dashboard (chart) ผ่าน `doGet`

## Decision
ขยาย LIFF ให้เป็น **surface จัดการรายการเต็มรูปแบบ**:
- เพิ่ม tab **"รายการ"** แสดง Entry รายตัวของเดือน (เฉพาะ status=active)
- แก้ได้ทุก field / soft delete / undo ในหน้านั้น
- GAS ต้องมี **write endpoint** (เดิม `doGet` อ่านอย่างเดียว) — รับ mutation ผ่าน POST
  ไป web app เดียวกัน (edit/delete/undo by entry_id)

## Consequences
- (+) แก้รายการย้อนหลังได้ครบจากใน LINE ไม่ต้องแตะ Sheet
- (+) รวมการแก้จำนวน/คำอธิบาย/หมวด ไว้ที่เดียว (เลิกแนวคิด "ลบ+พิมใหม่")
- (−) Phase LIFF ใหญ่ขึ้น: list view + edit form + write path
- (⚠ security) write endpoint ต้อง **verify ตัวตนฝั่ง server**: ส่ง LIFF `idToken`
  ไป verify กับ LINE แล้วดึง userId จากผลลัพธ์ ห้ามเชื่อ userId ที่ client ส่งมาดิบๆ
  ไม่งั้น User แก้/ลบรายการของคนอื่นได้
- Receipt ในแชต (ADR-0003) ยังอยู่ ใช้สำหรับแก้ "ทันทีหลังบันทึก" — LIFF list ใช้แก้ "ย้อนหลัง"
