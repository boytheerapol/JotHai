# ADR-0002: ใช้ LIFF web dashboard สำหรับ Overview/Chart

Status: Accepted — 2026-06-24

## Context
LINE chat **วาด donut chart ในแชตไม่ได้** ต้อง render เป็นรูปหรือหน้าเว็บ
ผู้ใช้ต้องการดู Overview 3 แบบ (รายรับ-รายจ่ายเดือน, รายรับ by category, รายจ่าย by category)
และอยากให้ "กดเมนูดูได้เลย"

## Decision
ใช้ **LIFF (LINE Front-end Framework)** — หน้าเว็บ Chart.js เปิดภายใน LINE app
ผูกเข้ากับปุ่มใน Rich Menu host หน้าเว็บเป็น GAS web app, ดึงข้อมูล Entry ของ User
ตาม LINE userId ที่ LIFF ส่งให้ แล้ว render donut chart แบบ interactive (สลับเดือน/แตะ category ดู detail)

## Alternatives considered
| ทางเลือก | ผลลัพธ์ | Effort | Interactive |
|---|---|---|---|
| QuickChart (รูป PNG) | donut นิ่งๆ ในแชต | ต่ำมาก (ต่อ URL เดียว) | ❌ |
| **LIFF** (เลือก) | dashboard เต็มจอใน LINE | สูง (เขียนหน้าเว็บ + host + ลงทะเบียน LIFF ID) | ✅ |
| Google Sheets chart export | รูปจาก Sheet | กลาง | ❌ |

## Consequences
- (+) UX ดีที่สุด: สลับเดือน, drill category, scroll ได้จริง
- (+) ฟรี (host บน GAS web app)
- (−) build เยอะกว่ามาก: ต้องจัดการ LIFF auth flow, viewport มือถือ, ดึง userId ให้ถูก
- (−) debug ยากกว่ารูปภาพ
- หมายเหตุ: ผู้ใช้พิจารณา QuickChart-first แล้วเลือก LIFF เต็มรูปแบบโดยรับ effort ที่เพิ่ม
  → schema/architecture ออกแบบเผื่อ LIFF ตั้งแต่ต้น
