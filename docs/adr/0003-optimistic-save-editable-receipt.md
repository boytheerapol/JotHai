# ADR-0003: Optimistic save พร้อม Receipt ที่แก้ได้ (ไม่มีขั้น confirm ก่อนบันทึก)

Status: Accepted — 2026-06-24 (กลับคำตัดสินจาก "confirm ก่อน save" ระหว่าง grilling)

## Context
หลัง AI parse ข้อความเป็น Entry มี 2 แนวทาง:
- **Confirm ก่อน save**: แสดงผล parse → ผู้ใช้กดยืนยัน → ค่อยเขียน Sheet
- **Optimistic save**: เขียน Sheet ทันที → ส่ง Receipt ที่กดแก้/ลบทีหลังได้

การลงรายรับ-รายจ่ายต้องทำบ่อยและเร็วถึงจะทำสม่ำเสมอ ทุก tap ที่เพิ่ม = friction
ที่อาจทำให้เลิกใช้

## Decision
ใช้ **Optimistic save**: บันทึก Entry ลง Sheet ทันทีที่ parse เสร็จ แล้วส่ง **Receipt**
(ดู CONTEXT.md) ที่มีปุ่มแก้หมวด / สลับรายรับ-รายจ่าย / ลบ โดยอ้างผ่าน **Entry ID**

## Consequences
- (+) ลงรายการเร็ว ไม่มี tap ยืนยันส่วนเกิน → ใช้สม่ำเสมอกว่า
- (+) ยังแก้ AI ที่เดาผิดได้ครบ (แค่แก้ทีหลังแทนก่อน)
- (−) Sheet อาจมี row ที่ผิดชั่วคราวจนกว่าจะแก้ → ยอมรับได้สำหรับ use case นี้
- (จำเป็น) ทุก Entry ต้องมี **Entry ID** เพื่ออ้างอิงตอนแก้/ลบ → ใส่ใน schema
- หมายเหตุ: เดิมเลือก confirm-ก่อน-save แล้วเปลี่ยนเป็น optimistic หลังชั่งน้ำหนัก friction
