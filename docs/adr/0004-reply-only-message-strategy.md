# ADR-0004: ส่งข้อความแบบ Reply เท่านั้น (ไม่ใช้ Push / ไม่มีสรุปอัตโนมัติ)

Status: Accepted — 2026-06-24

## Context
LINE Messaging API คิดราคาต่างกันตามชนิดข้อความ (ตรวจสอบ 2026-06-24):
- **Reply message** (ตอบกลับ webhook event) = **ฟรีไม่จำกัด**
- **Push message** (ส่งเอง ไม่รอ event) = ฟรีจำกัด ~200–500/เดือน/region นับเป็นรายหัวผู้รับ

ระบบเป็น multi-user จำนวนผู้รับโตได้ ถ้าใช้ push สำหรับสรุปสิ้นเดือน quota จะถูกหารกันเร็ว

## Decision
ทุกการตอบของบอทเป็น **Reply** ต่อ event ที่ผู้ใช้ทักหรือกดเมนูเข้ามา
**ไม่มี** การ push สรุปสิ้นเดือนอัตโนมัติใน MVP — ผู้ใช้เปิดดู Overview เองผ่านเมนู

## Alternatives considered
- Push สรุปสิ้นเดือนอัตโนมัติ: สะดวกกว่า แต่กิน push quota และหลายคนยิ่งเปลืองเร็ว
- ไว้ Phase 2: เปิด scheduled summary ทีหลังถ้า push quota จริงยังพอ

## Consequences
- (+) ระบบฟรี 100% ไม่ว่าผู้ใช้จะกี่คน (ตราบใดที่ทุกอย่าง reply-triggered)
- (−) ไม่มี proactive reminder/summary — ผู้ใช้ต้องเข้ามาดูเอง
- (ข้อจำกัดออกแบบ) ฟีเจอร์ใดก็ตามที่ต้อง "บอทเริ่มส่งเอง" จะชน ADR นี้ ต้องทบทวน push quota ก่อน

## Source
- LINE Messaging API pricing — https://developers.line.biz/en/docs/messaging-api/pricing/
- Gemini API free tier (1,500 RPD / 10-15 RPM) — https://ai.google.dev/gemini-api/docs/rate-limits
