function handleUserAccess(userId, replyToken) {
  const status = getUserStatus(userId);

  if (status === "approved") {
    return true; // อนุญาตให้ใช้งานต่อได้
  }

  if (status === "pending") {
    // ผู้ใช้ที่ยังไม่อนุมัติ ทักซ้ำ
    replyText(
      replyToken,
      "บัญชีของคุณยังรอการอนุมัติอยู่นะคะ รบกวนแจ้งแอดมินให้หน่อยน้า 🥺",
    );
    return false;
  }

  if (status === "unknown") {
    // ผู้ใช้ใหม่ ทักครั้งแรก[cite: 1]
    const profile = getProfile(userId);
    const displayName = profile.displayName;

    // บันทึกลง Sheet เป็น pending[cite: 1]
    addUser(userId, displayName, "pending");
    replyText(
      replyToken,
      "สวัสดีค่ะ! บัญชีของคุณถูกบันทึกเข้าสู่ระบบแล้ว แต่ต้องรอแอดมินอนุมัติก่อนถึงจะเริ่มจดบัญชีได้นะคะ 📝",
    );
    return false;
  }

  return false;
}
