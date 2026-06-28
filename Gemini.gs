function parseEntry(text) {
  // 1. ป้องกันปัญหา Copy-Paste แล้วติดช่องว่าง (สาเหตุหลักของ 404)
  let apiKey =
    PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    return {
      success: false,
      error: "ไม่พบ GEMINI_API_KEY ใน Script Properties",
    };
  }
  apiKey = apiKey.trim();

  // 2. ใช้ชื่อ Model ที่เสถียรที่สุดในตอนนี้ (อ้างอิงจาก PRD ที่ต้องการใช้ตระกูล Flash)
  const modelName = "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const categories = getCategoriesString();

  const prompt = `คุณคือ "จดให้" AI ผู้ช่วยบัญชีส่วนตัว หน้าที่ของคุณคือสกัดข้อมูลการเงินจากข้อความภาษาไทยอย่างแม่นยำ

ข้อความต้นฉบับ: "${text}"
หมวดหมู่ที่มีในระบบ: ${categories}

จงสกัดข้อมูลจากข้อความต้นฉบับ และตอบกลับมาเป็นรูปแบบ JSON เท่านั้น โดยต้องปฏิบัติตามกฎเหล็กต่อไปนี้อย่างเคร่งครัด:

[กฎการสกัดข้อมูล]
1. type (ประเภท): 
   - วิเคราะห์ว่าเป็นรายรับหรือรายจ่าย 
   - หากเป็นบริบทรับเงิน (เช่น ได้เงิน, เงินเดือนออก, รับโอน) ให้กำหนดเป็น "income" 
   - หากเป็นบริบทจ่ายเงิน ซื้อของ หรือบริบทกลางๆ ที่ไม่แน่ใจ ให้กำหนดเป็น "expense" เสมอ

2. amount (จำนวนเงิน): 
   - สกัดเฉพาะตัวเลขจำนวนเงิน (เป็นประเภท Number) 
   - ให้แปลงตัวย่อเป็นตัวเลขเต็ม (เช่น 1k = 1000, 1.5k = 1500, 2หมื่น = 20000) 
   - หากไม่พบตัวเลขเลยให้ระบุค่าเป็น 0

3. description (รายละเอียด): 
   - สรุปชื่อรายการสั้นๆ ให้ได้ใจความ 
   - **ต้องตัด** จำนวนเงิน, หน่วยเงิน (เช่น บาท, บ.), และคำที่เป็นแฮชแท็ก ออกจากข้อความนี้ให้หมด

4. category (หมวดหมู่): 
   - ต้องเลือกจาก "หมวดหมู่ที่มีในระบบ" ที่ให้ไว้เท่านั้น ให้เลือกหมวดที่ตรงที่สุด 1 หมวด
   - **ห้ามสร้างหมวดหมู่ใหม่ขึ้นมาเองเด็ดขาด** - หากไม่เข้ากับหมวดหมู่ใดเลย ให้ระบุว่า "อื่นๆ"

5. hashtags (แฮชแท็ก): 
   - ดึงมาเฉพาะคำที่มีการพิมพ์เครื่องหมาย "#" นำหน้าในข้อความต้นฉบับเท่านั้น
   - ให้คืนค่าโดยตัดเครื่องหมาย # ออก (เช่น ต้นฉบับมี "#คาเฟ่ #เที่ยว" ให้คืนค่า "คาเฟ่, เที่ยว")
   - **ห้ามคิด วิเคราะห์ สรุป หรือสร้างแฮชแท็กขึ้นมาเองโดยเด็ดขาด**
   - หากข้อความต้นฉบับไม่มีการพิมพ์ # เลย ให้คืนค่าเป็น string ว่าง ("") เสมอ

[รูปแบบ JSON ที่ต้องการ]
{
  "type": "expense" หรือ "income",
  "amount": ตัวเลขจำนวนเงิน,
  "description": "ชื่อรายการที่ลบตัวเลขและแฮชแท็กออกแล้ว",
  "category": "หมวดหมู่จากที่อนุญาต",
  "hashtags": "รายการแฮชแท็กที่ผู้ใช้พิมพ์มา หรือ ค่าว่างเปล่า"
}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    // 3. ดึง Error ของจริงจาก Google มาแสดง เพื่อให้เราแก้ปัญหาได้ถูกจุด
    if (responseCode !== 200) {
      let errorDetail = responseText;
      try {
        const errJson = JSON.parse(responseText);
        errorDetail = errJson.error.message;
      } catch (e) {}

      console.error("Gemini API Error:", responseText);
      return {
        success: false,
        error: `Google API [${responseCode}]: ${errorDetail}`,
      };
    }

    const json = JSON.parse(responseText);
    if (json.candidates && json.candidates.length > 0) {
      let textResult = json.candidates[0].content.parts[0].text;
      textResult = textResult
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return { success: true, data: JSON.parse(textResult) };
    }
  } catch (error) {
    console.error("Parse Error:", error);
    return { success: false, error: `System Failed: ${error.message}` };
  }

  return { success: false, error: "ไม่พบข้อมูลตอบกลับจาก AI" };
}

// ระบบสำรอง (Fallback) สกัดตัวเลขด้วย Regex
function parseWithRegex(text) {
  // ดึงตัวเลข รองรับลูกน้ำ, จุดทศนิยม, และตัว k/K
  const amountRegex =
    /(?:฿|บาท|บ\.)?\s*([\d,]+(?:\.\d+)?(?:k|K)?)\s*(?:฿|บาท|บ\.)?/i;
  const match = text.match(amountRegex);

  let amount = 0;
  if (match) {
    let amountStr = match[1].replace(/,/g, "");
    if (amountStr.toLowerCase().endsWith("k")) {
      amount = parseFloat(amountStr) * 1000;
    } else {
      amount = parseFloat(amountStr);
    }
  }

  // ดึง Hashtag ทั้งหมดที่เจอ
  const hashtagRegex = /#(\S+)/g;
  let hashtags = [];
  let m;
  while ((m = hashtagRegex.exec(text)) !== null) {
    hashtags.push(m[1].toLowerCase()); // ทำให้เป็นตัวพิมพ์เล็กทั้งหมด
  }

  // ตั้งค่า Default ของ Fallback ตาม PRD
  return {
    type: "expense",
    amount: amount,
    description: text.substring(0, 100), // ใช้ข้อความดิบ 100 ตัวอักษรแรกเป็นชื่อรายการ
    category: "อื่นๆ",
    hashtags: hashtags.join(" "),
  };
}
