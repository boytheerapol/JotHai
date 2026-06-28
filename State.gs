// ตรวจสอบว่าผู้ใช้เคยได้รับ Welcome Message หรือยัง
function isUserWelcomed(userId) {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty(`WELCOMED_${userId}`) === "true";
}

// บันทึกว่าผู้ใช้ได้รับ Welcome Message แล้ว
function setUserWelcomed(userId) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(`WELCOMED_${userId}`, "true");
}

// บันทึกข้อความเดิมที่ยังไม่มีราคาลงใน Cache (10 นาที)
function setClarificationState(userId, originalText) {
  const cache = CacheService.getScriptCache();
  cache.put(
    `CLARIFICATION_${userId}`,
    originalText,
    CONFIG.CLARIFICATION_TTL_SECONDS,
  );
}

// อ่านข้อความเดิมที่ค้างอยู่
function getClarificationState(userId) {
  const cache = CacheService.getScriptCache();
  return cache.get(`CLARIFICATION_${userId}`);
}

// ลบสถานะทิ้ง (เมื่อบันทึกสำเร็จ หรือเมื่อผู้ใช้พิมพ์ข้อความใหม่ที่ไม่ใช่ตัวเลข)
function clearClarificationState(userId) {
  const cache = CacheService.getScriptCache();
  cache.remove(`CLARIFICATION_${userId}`);
}
