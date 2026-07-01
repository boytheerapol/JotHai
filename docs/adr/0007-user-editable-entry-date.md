# ADR-0007: ผู้ใช้แก้วันที่ของ Entry ได้จาก Receipt card

Status: Accepted — 2026-07-01 (จาก grilling รอบ Receipt Flex redesign)

## Context
เดิม Receipt card มีแค่ปุ่มเปลี่ยนหมวดและลบ ทำให้ผู้ใช้ที่ลืมจดในวันนั้นแล้วมาจดทีหลัง
ไม่มีทางแก้วันที่ได้เลย — ทางเดียวคือลบแล้วพิมใหม่ ซึ่งเสียเวลา

use case หลัก: ซื้อของเมื่อวาน แล้วมาจดวันนี้ → timestamp บันทึกเป็นวันนี้ แต่รายการจริงเกิดเมื่อวาน
ข้อมูลผิดทำให้ภาพรวมรายเดือนใน LIFF dashboard คลาดเคลื่อน

## Decision
เพิ่ม**ปุ่มแก้วันที่** (`📅 แก้วันที่`) บน Receipt card โดยใช้ **LINE datetimepicker action**
(`mode: "date"`) ซึ่งเปิด native date picker ใน LINE app โดยตรง
ไม่ต้องพิมวันที่เป็น text ไม่ต้องตรวจ format เอง

เมื่อผู้ใช้เลือกวันที่:
- `event.postback.data` = `action=set_date&id=<entryId>`
- `event.postback.params.date` = `"YYYY-MM-DD"` (format คงที่จาก LINE)
- `updateEntryDate()` ใน Sheet.gs ดึงเวลาเดิม (ชั่วโมง/นาที) ตาม Asia/Bangkok
  แล้วประกอบกับวันที่ใหม่ → เขียนทับ column C (timestamp)
- ส่ง Receipt ใหม่กลับทันทีผ่าน `sendUpdatedReceipt()` (source="edited")

จำกัด `max` ของ picker เป็นวันปัจจุบัน (ห้ามตั้งวันอนาคต)
เวลาที่ซ่อนไว้ใน timestamp ยังคงอยู่ — ไม่เปิดให้แก้เวลา (date-only)

## Consequences
- (+) แก้ back-date ได้ทันทีจาก Receipt โดยไม่ต้องลบแล้วพิมใหม่
- (+) native picker ของ LINE — ไม่มี text parsing error, UX ดีกว่าให้พิมวันที่เอง
- (+) เวลา (ชั่วโมง/นาที) ยังคงอยู่ใน timestamp — audit trail ไม่สูญ
- (−) แก้ได้เฉพาะวันที่ ไม่รองรับแก้เวลา → ยอมรับได้สำหรับ use case บันทึกค่าใช้จ่าย
- (−) ถ้าผู้ใช้แก้วันที่แล้ว summary ของเดือนก่อนเปลี่ยน — พฤติกรรมตั้งใจ (แก้ข้อมูลจริง)
- (จำเป็น) timestamp ต้องเก็บเป็น Date object ใน Sheet ไม่ใช่ string ถึงจะดึงเวลาเดิมได้
- ทางเลือกที่ตัดทิ้ง: ให้พิมวันที่เป็น text → ต้องตรวจ format + error-prone
