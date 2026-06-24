# ADR-0001: ใช้ Google Apps Script เป็น backend

Status: Accepted — 2026-06-24

## Context
ระบบต้องรับ LINE webhook, เรียก Gemini API จัดหมวด, และเขียน/อ่าน Google Sheet
เป็นระบบใช้งานส่วนตัว/ครอบครัว ไม่ใช่ commercial scale priority สูงสุดคือ cost ต่ำและไม่มี server ดูแล

## Decision
ใช้ **Google Apps Script (GAS)** เป็น runtime เดียวของระบบ
- รับ webhook ผ่าน `doPost`
- เรียก LINE Messaging API + Gemini API ผ่าน `UrlFetchApp`
- เข้าถึง Google Sheet ผ่าน native `SpreadsheetApp` (ไม่ต้อง Service Account/OAuth แยก)
- host หน้า LIFF เป็น GAS web app ได้ในตัว (ดู ADR-0002)

## Alternatives considered
| ทางเลือก | ข้อดี | ข้อเสีย |
|---|---|---|
| **GAS** (เลือก) | ฟรี 100%, ไม่มี server, bind Sheet native, deploy ในคลิกเดียว | execution 6 นาที/ครั้ง, quota รายวัน, dev experience จำกัด |
| Cloud Run / Vercel / Render | ยืดหยุ่น, dev/test ดี | ต้อง deploy เอง, อาจมีค่าใช้จ่าย, ต่อ Sheet ต้อง Service Account, setup ซับซ้อนกว่า |
| n8n / Make.com | low-code, ต่อ service เร็ว | Make free จำกัด operations, n8n ต้อง self-host, ปรับ edge case ยาก |

## Consequences
- (+) ต้นทุนรวม = 0 บาท สำหรับ scale ระดับครอบครัว
- (+) ไม่มี infra ต้องดูแล
- (−) ผูกกับ GAS execution limits — ต้องระวังงานหนัก เช่น render chart ฝั่ง server (จึง offload ไป QuickChart/LIFF)
- (−) ย้ายออกจาก GAS ภายหลังต้องเขียน webhook handler + Sheet access ใหม่ (กระทบทั้ง codebase) → ถือว่า hard to reverse
