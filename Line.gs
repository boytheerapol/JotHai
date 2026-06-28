// ฟังก์ชันส่งข้อความหลัก รองรับ Message Object ทุกรูปแบบ (Text, Flex)
function reply(replyToken, messagesArray) {
  const url = "https://api.line.me/v2/bot/message/reply";
  const payload = {
    replyToken: replyToken,
    messages: messagesArray,
  };

  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + CONFIG.LINE_ACCESS_TOKEN,
    },
    payload: JSON.stringify(payload),
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    console.error("Error sending LINE reply:", error);
  }
}

// ฟังก์ชันเดิมที่ใช้ส่งแค่ข้อความ Text ธรรมดา (เรียกใช้จาก Access.gs)
function replyText(replyToken, text) {
  reply(replyToken, [{ type: "text", text: text }]);
}

// ฟังก์ชันวาดสลิปใบเสร็จ (Receipt Flex Card)
function buildReceiptFlex(entryId, parsed, source) {
  const isExpense = parsed.type === "expense";
  const typeColor = isExpense ? "#FF4B4B" : "#1DB446"; // แดง (รายจ่าย) / เขียว (รายรับ)
  const typeText = isExpense ? "รายจ่าย" : "รายรับ";

  // จัด Format Hashtag ให้แสดงผลสวยงาม (เติม # ข้างหน้า)
  let hashtagText = "-";
  if (parsed.hashtags && parsed.hashtags.trim() !== "") {
    hashtagText = "#" + parsed.hashtags.trim().replace(/\s+/g, " #");
  }

  return {
    type: "flex",
    altText: `บันทึก${typeText}: ${parsed.amount} บาท (${parsed.description})`,
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: typeText,
            weight: "bold",
            color: typeColor,
            size: "sm",
          },
          {
            type: "text",
            text: parsed.description || "ไม่มีชื่อรายการ",
            weight: "bold",
            size: "xl",
            margin: "md",
            wrap: true,
          },
          {
            type: "text",
            text: `฿ ${parsed.amount}`,
            size: "xxl",
            color: typeColor,
            weight: "bold",
            margin: "sm",
          },
          {
            type: "separator",
            margin: "xl",
          },
          ...(source === "fallback"
            ? [
                {
                  type: "box",
                  layout: "vertical",
                  margin: "md",
                  backgroundColor: "#fff3cd",
                  paddingAll: "sm",
                  cornerRadius: "md",
                  contents: [
                    {
                      type: "text",
                      text: "⚠️ บันทึกด้วยระบบสำรอง (AI ขัดข้อง) หมวดหมู่อาจไม่ถูกต้อง กรุณาตรวจสอบ",
                      size: "xs",
                      color: "#856404",
                      wrap: true,
                    },
                  ],
                },
              ]
            : []),
          {
            type: "box",
            layout: "vertical",
            margin: "xl",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "หมวดหมู่",
                    size: "sm",
                    color: "#aaaaaa",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: parsed.category || "อื่นๆ",
                    size: "sm",
                    color: "#666666",
                    flex: 2,
                    wrap: true,
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "แฮชแท็ก",
                    size: "sm",
                    color: "#aaaaaa",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: hashtagText,
                    size: "sm",
                    color: "#666666",
                    flex: 2,
                    wrap: true,
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical", // เปลี่ยนกรอบนอกเป็นแนวตั้ง
        spacing: "sm",
        contents: [
          {
            type: "box",
            layout: "horizontal", // แถวบนให้วางแนวนอน 2 ปุ่ม
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "secondary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "สลับประเภท",
                  data: `action=toggle_type&id=${entryId}`,
                },
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "เปลี่ยนหมวด",
                  data: `action=change_category&id=${entryId}`,
                },
              },
            ],
          },
          {
            type: "button",
            style: "link", // แถวล่างทำเป็น Text Link สีแดง
            color: "#FF4B4B",
            height: "sm",
            action: {
              type: "postback",
              label: "ลบรายการ",
              data: `action=delete&id=${entryId}`,
            },
          },
        ],
      },
    },
  };
}

// ส่ง Quick Reply สำหรับเลือกประเภท (รายรับ/รายจ่าย)
function replyWithTypeQuickReply(replyToken, entryId) {
  const message = {
    type: "text",
    text: "เลือกประเภทที่ต้องการเปลี่ยนได้เลยค่ะ 👇",
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "postback",
            label: "🔴 รายจ่าย",
            data: `action=select_type&id=${entryId}&type=expense`,
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "🟢 รายรับ",
            data: `action=select_type&id=${entryId}&type=income`,
          },
        },
      ],
    },
  };
  reply(replyToken, [message]);
}

// อัปเดต Quick Reply ของหมวดหมู่ (เปลี่ยนชื่อ action เป็น select_category เพื่อรอการยืนยัน)
function replyWithCategoryQuickReply(replyToken, entryId, categories) {
  const quickReplyItems = categories.slice(0, 13).map((cat) => ({
    type: "action",
    action: {
      type: "postback",
      label: cat.substring(0, 20),
      data: `action=select_category&id=${entryId}&cat=${encodeURIComponent(cat)}`,
    },
  }));

  reply(replyToken, [
    {
      type: "text",
      text: "เลือกหมวดหมู่ใหม่ที่ต้องการได้เลยค่ะ 👇",
      quickReply: { items: quickReplyItems },
    },
  ]);
}

// สร้าง Flex Message พรีวิวเพื่อยืนยันการแก้ไขข้อมูล
function buildConfirmEditFlex(entry, previewType, previewCategory) {
  const displayType = previewType || entry.type;
  const displayCat = previewCategory || entry.category;

  const isExpense = displayType === "expense";
  const typeColor = isExpense ? "#FF4B4B" : "#1DB446";
  const typeText = isExpense ? "รายจ่าย" : "รายรับ";

  let hashtagText = "-";
  if (entry.hashtags && entry.hashtags.trim() !== "") {
    hashtagText = "#" + entry.hashtags.trim().replace(/\s+/g, " #");
  }

  // หยอดตัวแปรใหม่เข้าไปในปุ่ม "ยืนยันการแก้ไข" (t = type, c = category)
  let postbackData = `action=save_edit&id=${entry.id}`;
  if (previewType) postbackData += `&t=${previewType}`;
  if (previewCategory)
    postbackData += `&c=${encodeURIComponent(previewCategory)}`;

  return {
    type: "flex",
    altText: "พรีวิวการแก้ไขข้อมูล",
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#f8f9fa",
        contents: [
          {
            type: "text",
            text: "ตรวจสอบก่อนบันทึก",
            weight: "bold",
            size: "sm",
            color: "#555555",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: typeText,
            weight: "bold",
            color: typeColor,
            size: "sm",
          },
          {
            type: "text",
            text: entry.description,
            weight: "bold",
            size: "xl",
            margin: "md",
            wrap: true,
          },
          {
            type: "text",
            text: `฿ ${entry.amount}`,
            size: "xxl",
            color: typeColor,
            weight: "bold",
            margin: "sm",
          },
          { type: "separator", margin: "xl" },
          {
            type: "box",
            layout: "vertical",
            margin: "xl",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "หมวดหมู่",
                    size: "sm",
                    color: "#aaaaaa",
                    flex: 1,
                  },
                  // เน้นสีฟ้าถ้ามีการเปลี่ยนแปลงหมวดหมู่
                  {
                    type: "text",
                    text: displayCat,
                    size: "sm",
                    color: previewCategory ? "#007BFF" : "#666666",
                    weight: previewCategory ? "bold" : "regular",
                    flex: 2,
                    wrap: true,
                  },
                ],
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "แฮชแท็ก",
                    size: "sm",
                    color: "#aaaaaa",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: hashtagText,
                    size: "sm",
                    color: "#666666",
                    flex: 2,
                    wrap: true,
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#007BFF",
            height: "sm",
            action: {
              type: "postback",
              label: "ยืนยันการแก้ไข",
              data: postbackData,
            },
          },
        ],
      },
    },
  };
}

// สร้าง Flex Message เพื่อยืนยันการลบ (Danger Alert)
function buildConfirmDeleteFlex(entry) {
  return {
    type: "flex",
    altText: "ยืนยันการลบรายการ",
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "⚠️ ยืนยันการลบ",
            weight: "bold",
            color: "#FF4B4B",
            size: "lg",
          },
          {
            type: "text",
            text: `คุณต้องการลบรายการ\n"${entry.description}" (฿${entry.amount})\nใช่หรือไม่?`,
            wrap: true,
            margin: "md",
            size: "sm",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#FF4B4B",
            height: "sm",
            action: {
              type: "postback",
              label: "ใช่, ลบรายการ",
              data: `action=save_delete&id=${entry.id}`,
            },
          },
        ],
      },
    },
  };
}
