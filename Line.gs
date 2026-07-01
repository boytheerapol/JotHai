// Design-system colors for Flex cards — copied from docs/design-system.md §2
// (Flex JSON cannot read CSS variables; hex is mirrored from the token table.)
const FLEX = {
  incomeFill: "#16C784",
  expenseFill: "#FF5C7C",
  incomeText: "#0F7A4A",
  expenseText: "#CB2A30",
  brand: "#7C3AED",
  brandSubtle: "#F1EBFE",
  info: "#2B6BFF",
  warningFill: "#FFF3CD",
  warningText: "#8A6100",
  textSecondary: "#4B4458",
  textMuted: "#6E6880",
};

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

// ชื่อย่อเดือนภาษาไทย (index 0 = ม.ค.)
const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

// ชื่อย่อวันในสัปดาห์ภาษาไทย เรียงแบบ ISO (index 0 = จันทร์ ... 6 = อาทิตย์)
const THAI_WEEKDAYS_SHORT = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

// แปลงวันที่เป็นรูปแบบไทยสั้น เช่น "จ. 30 มิ.ย. 2026" (เฉพาะวันที่ ไม่มีเวลา) ตาม Asia/Bangkok
function formatThaiDate(date) {
  const weekdayIdx = parseInt(Utilities.formatDate(date, CONFIG.TIMEZONE, "u"), 10) - 1;
  const d = Utilities.formatDate(date, CONFIG.TIMEZONE, "d");
  const monthIdx = parseInt(Utilities.formatDate(date, CONFIG.TIMEZONE, "M"), 10) - 1;
  const year = Utilities.formatDate(date, CONFIG.TIMEZONE, "yyyy");
  return `${THAI_WEEKDAYS_SHORT[weekdayIdx]} ${d} ${THAI_MONTHS_SHORT[monthIdx]} ${year}`;
}

// อีโมจิประจำหมวดหมู่ (ใช้เป็นลูกเล่นบนการ์ด) — คีย์ตรงกับ seed categories ใน Categories tab
// หมวดที่ไม่ได้แม็พจะใช้ default ใน getCategoryEmoji
const CATEGORY_EMOJI = {
  // รายจ่าย (seed)
  อาหาร: "🍜",
  "เดินทาง/รถ": "🚗",
  ของใช้จำเป็น: "🧺",
  ช้อปปิ้ง: "🛍",
  สาธารณูปโภค: "💡",
  ผ่อนบ้าน: "🏠",
  สุขภาพ: "💊",
  บันเทิง: "🎮",
  การศึกษา: "📚",
  ครอบครัว: "👪",
  "ออมเงิน/ลงทุน": "📈",
  "งาน/ธุรกิจ": "💼",
  อื่นๆ: "🧾",
  // รายรับ (seed)
  เงินเดือน: "💰",
  โบนัส: "🎁",
  "ค้าขาย/ธุรกิจ": "🏪",
  "ดอกเบี้ย/ปันผล": "🏦",
  // custom ที่พบบ่อย
  ท่องเที่ยว: "✈️",
};

function getCategoryEmoji(category, type) {
  if (category && CATEGORY_EMOJI[category]) return CATEGORY_EMOJI[category];
  return type === "income" ? "💰" : "🧾";
}

// ฟังก์ชันวาดสลิปใบเสร็จ (Receipt Flex Card)
// หมายเหตุ divergence จาก design-system (จดในโค้ดเท่านั้น ไม่แก้ design-system.md):
//  1) ใช้อีโมจิ ~2 จุด (หัวการ์ด + chip หมวด) เกินกติกา §8 (1 อีโมจิ/ข้อความ)
//  2) หัวการ์ดใช้ linearGradient ซึ่ง §1 ห้าม gradient บน Flex — จงใจเพื่อดู production-grade
//     (สีทั้งคู่มาจาก FLEX token อยู่แล้ว + มี backgroundColor เป็น fallback ให้ client เก่า)
function buildReceiptFlex(entryId, parsed, source, timestamp) {
  const isExpense = parsed.type === "expense";
  const typeColor = isExpense ? FLEX.expenseFill : FLEX.incomeFill; // coral (รายจ่าย) / green (รายรับ)
  const bandStart = isExpense ? FLEX.expenseText : FLEX.incomeText; // ปลายเข้มของ gradient
  const typeText = isExpense ? "รายจ่าย" : "รายรับ";
  const emoji = getCategoryEmoji(parsed.category, parsed.type);

  // จำนวนเงินใส่ comma คั่นหลักพัน เช่น 30000 -> 30,000
  const amountText = Number(parsed.amount).toLocaleString("en-US");

  // chip สำหรับหมวดหมู่ และ แฮชแท็ก (ถ้ามี)
  const chips = [
    {
      type: "box",
      layout: "vertical",
      flex: 0,
      backgroundColor: FLEX.brandSubtle,
      cornerRadius: "md",
      paddingAll: "sm",
      paddingStart: "md",
      paddingEnd: "md",
      contents: [
        {
          type: "text",
          text: `${emoji} ${parsed.category || "อื่นๆ"}`,
          size: "sm",
          color: FLEX.textSecondary,
        },
      ],
    },
  ];
  if (parsed.hashtags && parsed.hashtags.trim() !== "") {
    const hashtagText = "#" + parsed.hashtags.trim().replace(/\s+/g, " #");
    chips.push({
      type: "box",
      layout: "vertical",
      flex: 0,
      backgroundColor: FLEX.brandSubtle,
      cornerRadius: "md",
      paddingAll: "sm",
      paddingStart: "md",
      paddingEnd: "md",
      contents: [
        {
          type: "text",
          text: hashtagText,
          size: "sm",
          color: FLEX.textSecondary,
        },
      ],
    });
  }
  chips.push({ type: "filler" });

  const dateStr = Utilities.formatDate(timestamp, CONFIG.TIMEZONE, "yyyy-MM-dd");
  const todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");

  return {
    type: "flex",
    altText: `บันทึก${typeText}: ${amountText} บาท (${parsed.description})`,
    contents: {
      type: "bubble",
      size: "kilo",
      // แถบหัวการ์ดเต็มความกว้างตามประเภท — ตัวอักษรขาวตัวใหญ่ผ่าน AA-large (§2)
      // gradient เข้ม->สด (backgroundColor เป็น fallback เมื่อ client ไม่รองรับ background)
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: typeColor,
        background: {
          type: "linearGradient",
          angle: "135deg",
          startColor: bandStart,
          endColor: typeColor,
        },
        paddingAll: "md",
        paddingStart: "lg",
        contents: [
          {
            type: "text",
            text: typeText,
            weight: "bold",
            color: "#FFFFFF",
            size: "lg",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `${emoji} ${parsed.description || "ไม่มีชื่อรายการ"}`,
            weight: "bold",
            size: "xl",
            wrap: true,
          },
          {
            // ลำดับชั้นจำนวนเงิน: ฿ ตัวเล็ก + ตัวเลขตัวใหญ่เด่น (baseline ให้ชิดเส้นฐานเดียวกัน)
            type: "box",
            layout: "baseline",
            margin: "sm",
            contents: [
              {
                type: "text",
                text: "฿",
                size: "md",
                color: typeColor,
                weight: "bold",
                flex: 0,
              },
              {
                type: "text",
                text: ` ${amountText}`,
                size: "xxl",
                color: typeColor,
                weight: "bold",
                flex: 0,
              },
            ],
          },
          {
            type: "text",
            text: formatThaiDate(timestamp),
            size: "sm",
            color: FLEX.textMuted,
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
                  backgroundColor: FLEX.warningFill,
                  paddingAll: "sm",
                  cornerRadius: "md",
                  contents: [
                    {
                      type: "text",
                      text: "⚠️ บันทึกด้วยระบบสำรอง (AI ขัดข้อง) หมวดหมู่อาจไม่ถูกต้อง กรุณาตรวจสอบ",
                      size: "xs",
                      color: FLEX.warningText,
                      wrap: true,
                    },
                  ],
                },
              ]
            : []),
          {
            type: "box",
            layout: "horizontal",
            margin: "xl",
            spacing: "sm",
            contents: chips,
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
                  label: "🏷 เปลี่ยนหมวด",
                  data: `action=change_category&id=${entryId}`,
                },
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                action: {
                  type: "datetimepicker",
                  label: "📅 แก้วันที่",
                  data: `action=set_date&id=${entryId}`,
                  mode: "date",
                  initial: dateStr,
                  max: todayStr,
                },
              },
            ],
          },
          {
            type: "button",
            style: "link", // แถวล่างทำเป็น Text Link สีแดง
            color: FLEX.expenseText,
            height: "sm",
            action: {
              type: "postback",
              label: "🗑 ลบรายการ",
              data: `action=delete&id=${entryId}`,
            },
          },
        ],
      },
    },
  };
}

// ดึงรายการล่าสุดจาก Sheet แล้วส่ง Receipt การ์ดใหม่ (ใช้หลังแก้หมวด/วันที่)
// source = "edited" เพื่อไม่โชว์กล่องเตือน fallback (ผู้ใช้ตรวจรายการแล้ว)
function sendUpdatedReceipt(replyToken, entryId) {
  const entry = getEntryById(entryId);
  if (!entry) {
    replyText(replyToken, "❌ ไม่พบรายการนี้ในระบบค่ะ");
    return;
  }
  const parsedLike = {
    type: entry.type,
    amount: entry.amount,
    description: entry.description,
    category: entry.category,
    hashtags: entry.hashtags,
  };
  reply(replyToken, [
    buildReceiptFlex(entry.id, parsedLike, "edited", entry.timestamp),
  ]);
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
            color: FLEX.expenseText,
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
            color: FLEX.expenseFill,
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
