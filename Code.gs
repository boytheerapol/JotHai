function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput("OK");
  }

  try {
    const data = JSON.parse(e.postData.contents);

    // ==========================================
    // 🚦 เส้นทางที่ 1: รับคำสั่งจากหน้าเว็บ LIFF (หน้า Dashboard)
    // ==========================================
    if (data.idToken && data.action) {
      return handleLiffApiRequest(data); // โยนไปให้ฟังก์ชันจัดการ LIFF ด้านล่าง
    }

    // ==========================================
    // 🚦 เส้นทางที่ 2: รับแชทและปุ่มกดจาก LINE (Webhook)
    // ==========================================
    if (data.events && data.events.length > 0) {
      const event = data.events[0];
      const replyToken = event.replyToken;

      // ดัก Postback Event (ปุ่มกดในแชท)
      if (event.type === "postback") {
        const postbackData = event.postback.data;
        let params = {};
        postbackData.split("&").forEach((pair) => {
          let parts = pair.split("=");
          if (parts.length === 2)
            params[parts[0]] = decodeURIComponent(parts[1]);
        });

        const action = params["action"];
        const entryId = params["id"];

        // 1. กดปุ่ม "สลับประเภท" บนใบเสร็จแรก
        if (action === "toggle_type") {
          replyWithTypeQuickReply(replyToken, entryId);
        }
        // 1.1 เลือกประเภทใหม่แล้ว -> โชว์พรีวิว
        else if (action === "select_type") {
          const entry = getEntryById(entryId);
          if (entry) {
            const flexCard = buildConfirmEditFlex(entry, params["type"], null);
            reply(replyToken, [flexCard]);
          }
        }
        // 2. กดปุ่ม "เปลี่ยนหมวด" บนใบเสร็จแรก
        else if (action === "change_category") {
          const categories = getCategoriesArray();
          replyWithCategoryQuickReply(replyToken, entryId, categories);
        }
        // 2.1 เลือกหมวดหมู่ใหม่แล้ว -> โชว์พรีวิว
        else if (action === "select_category") {
          const entry = getEntryById(entryId);
          if (entry) {
            const flexCard = buildConfirmEditFlex(entry, null, params["cat"]);
            reply(replyToken, [flexCard]);
          }
        }
        // 3. กดยืนยันการแก้ไขข้อมูล (รับมาจาก 1.1 หรือ 2.1)
        else if (action === "save_edit") {
          const success = updateEntryFields(entryId, params["t"], params["c"]);
          if (success) {
            replyText(replyToken, `อัปเดตข้อมูลเรียบร้อยแล้วค่ะ ✅`);
          } else {
            replyText(replyToken, "❌ ไม่พบรายการนี้ในระบบค่ะ");
          }
        }
        // 4. กดปุ่ม "ลบรายการ" บนใบเสร็จแรก -> โชว์พรีวิว Danger Alert
        else if (action === "delete") {
          const entry = getEntryById(entryId);
          if (entry) {
            const flexCard = buildConfirmDeleteFlex(entry);
            reply(replyToken, [flexCard]);
          }
        }
        // 4.1 กดยืนยันการลบ
        else if (action === "save_delete") {
          const success = deleteEntryStatus(entryId);
          if (success) {
            replyText(replyToken, `ลบรายการเรียบร้อยแล้วค่ะ 🗑️`);
          } else {
            replyText(replyToken, "❌ ไม่พบรายการนี้ในระบบค่ะ");
          }
        }
        return ContentService.createTextOutput("OK");
      }

      // จัดการ Message Event (พิมพ์แชท)
      if (event.type === "message" && event.message.type === "text") {
        const text = event.message.text.trim();
        const userId = event.source.userId;

        const isAuthorized = handleUserAccess(userId, replyToken);

        if (isAuthorized) {
          const lowerText = text.toLowerCase();
          let replyMessages = []; // สะสมกล่องข้อความที่จะส่งกลับ

          if (!isUserWelcomed(userId)) {
            replyMessages.push({
              type: "text",
              text: "ยินดีต้อนรับสู่ JotHai ค่ะ! 🎉\nขอบคุณที่รอการอนุมัตินะคะ ตอนนี้คุณสามารถเริ่มจดบัญชีได้เลยค่ะ\n\nถ้าอยากดูวิธีใช้เพิ่มเติม พิมพ์ 'วิธีใช้' หรือ 'help' ได้ตลอดเลยนะคะ ✌️",
            });
            setUserWelcomed(userId);
          }

          if (lowerText === "help" || lowerText === "วิธีใช้") {
            replyMessages.push({
              type: "text",
              text: "วิธีใช้งาน JotHai 📝\n1. บันทึกรายจ่าย: พิมพ์ชื่อและราคา เช่น 'กาแฟ 50'\n2. บันทึกรายรับ: พิมพ์ 'เงินเดือน 30000'\n3. ติดแท็ก: ใส่ # ต่อท้าย เช่น 'ชาบู 500 #ทริปเชียงใหม่'\n\nลองพิมพ์รายการแรกของคุณมาได้เลยค่ะ!",
            });
            reply(replyToken, replyMessages);
            return ContentService.createTextOutput("OK");
          }

          // จัดการ Clarification State ---
          const pendingText = getClarificationState(userId);
          let textToParse = text;

          if (pendingText) {
            const isJustNumberRegex =
              /^(?:฿|บาท|บ\.)?\s*([\d,]+(?:\.\d+)?(?:k|K)?)\s*(?:฿|บาท|บ\.)?$/i;
            if (isJustNumberRegex.test(text)) {
              textToParse = `${pendingText} ${text}`;
              clearClarificationState(userId);
              replyMessages.push({
                type: "text",
                text: "บันทึกยอดเงินให้เรียบร้อยค่ะ 📝",
              });
            } else {
              clearClarificationState(userId);
              replyMessages.push({
                type: "text",
                text: "ยกเลิกรายการที่ค้างไว้แล้วนะคะ ✌️",
              });
            }
          }

          const result = parseEntry(textToParse);
          let parsed;
          let sourceStr = "ai";

          if (result.success) {
            parsed = result.data;
          } else {
            parsed = parseWithRegex(textToParse);
            sourceStr = "fallback";
          }

          if (parsed.amount === 0) {
            setClarificationState(userId, textToParse);
            replyMessages.push({
              type: "text",
              text: `ดูเหมือนจะลืมใส่ยอดเงินหรือเปล่าคะ? "${textToParse}" ราคาเท่าไหร่คะ 🥺`,
            });
          } else {
            const entryId = addEntry(userId, parsed, textToParse, sourceStr);
            const flexCard = buildReceiptFlex(entryId, parsed, sourceStr);

            if (sourceStr === "fallback") {
              replyMessages.push({
                type: "text",
                text: "ขออภัยค่ะ ตอนนี้ระบบ AI ขัดข้อง จดให้เลยใช้ระบบสำรองบันทึกตัวเลขให้ก่อนนะคะ 🙏",
              });
            }

            replyMessages.push(flexCard);
          }

          reply(replyToken, replyMessages);
        }
      }
    }
  } catch (error) {
    console.error("Error in doPost:", error);
  }

  // สำหรับ LINE Webhook ต้องตอบกลับเป็น OK เสมอเพื่อบอกว่ารับข้อความแล้ว
  return ContentService.createTextOutput("OK");
}

// ฟังก์ชันหลักสำหรับรับ Request (GET) จากหน้าเว็บ
function doGet(e) {
  if (!e || !e.parameter) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: "No parameters" }),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const api = e.parameter.api;

  if (api === "overview") {
    return handleOverviewRequest(e);
  } else if (api === "list") {
    return handleListRequest(e); // เพิ่มการเรียกดูหน้ารายการ
  }

  return ContentService.createTextOutput(
    JSON.stringify({
      status: "success",
      message: "JotHai Backend API is Ready!",
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}

// ฟังก์ชันสำหรับคำนวณข้อมูลกราฟ
function handleOverviewRequest(e) {
  const userId = e.parameter.userId;

  // 1. ดักจับความปลอดภัย: ต้องมี userId เสมอ
  if (!userId) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: "Missing userId" }),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // 2. รับค่าเดือน (ถ้าไม่ส่งมา ให้ใช้เดือนปัจจุบันตามเวลาไทย)
  const targetMonth =
    e.parameter.month ||
    Utilities.formatDate(
      new Date(),
      CONFIG.TIMEZONE || "Asia/Bangkok",
      "yyyy-MM",
    );

  // 3. รับค่า Hashtag (ถ้ามี)
  const targetHashtag = e.parameter.hashtag || null;

  try {
    // 4. เปิด Google Sheets ชี้ไปที่ชีต "Entries"
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(
      "Entries",
    );
    const data = sheet.getDataRange().getValues();

    // ถ้าไม่มีข้อมูลเลย (มีแค่ Header) ส่งค่าเริ่มต้นกลับไป
    if (data.length <= 1) {
      return returnEmptyOverview(targetMonth);
    }

    const headers = data[0];

    // สร้าง Mapping สำหรับหา Index โดยบังคับเป็นพิมพ์เล็กทั้งหมดเพื่อป้องกัน Human Error
    const col = {};
    headers.forEach((h, i) => {
      if (h) col[h.toString().trim().toLowerCase()] = i;
    });

    let incomeTotal = 0;
    let expenseTotal = 0;
    const expensesByCategory = {};
    const incomesByCategory = {};

    // 5. วนลูปอ่านข้อมูลทีละบรรทัด
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // ดึงค่าตามชื่อคอลัมน์ที่คุณ Boy กำหนดไว้
      const rUserId = row[col["user_id"]];
      const rStatus = row[col["status"]];
      const rType = row[col["type"]];
      const rAmount = parseFloat(row[col["amount"]]) || 0;
      const rCategory = row[col["category"]] || "ไม่ระบุหมวดหมู่";
      const rHashtags = row[col["hashtags"]]
        ? row[col["hashtags"]].toString()
        : "";
      const rTimestamp = row[col["timestamp"]];

      if (!rTimestamp || !rUserId) continue; // ข้ามบรรทัดว่าง

      // แปลง Timestamp เป็น "yyyy-MM" เพื่อนำไปเปรียบเทียบ
      const rMonth = Utilities.formatDate(
        new Date(rTimestamp),
        CONFIG.TIMEZONE || "Asia/Bangkok",
        "yyyy-MM",
      );

      // 6. กฎการกรองข้อมูล (Filters)
      if (rUserId !== userId) continue; // ต้องเป็นของตัวเองเท่านั้น
      if (rStatus !== "active") continue; // ต้องเป็นรายการที่ Active (ไม่ได้ลบ)
      if (rMonth !== targetMonth) continue; // ต้องตรงกับเดือนที่เลือก

      // ถ้ามีการเลือก Hashtag ต้องเช็คว่าคำนั้นอยู่ในคอลัมน์ hashtags หรือไม่
      if (targetHashtag && !rHashtags.includes(targetHashtag)) continue;

      // 7. สรุปยอด
      // (รองรับคำว่า 'รายรับ' หรือ 'income' และ 'รายจ่าย' หรือ 'expense')
      if (rType === "รายรับ" || rType === "income") {
        incomeTotal += rAmount;
        incomesByCategory[rCategory] =
          (incomesByCategory[rCategory] || 0) + rAmount;
      } else if (rType === "รายจ่าย" || rType === "expense") {
        expenseTotal += rAmount;
        expensesByCategory[rCategory] =
          (expensesByCategory[rCategory] || 0) + rAmount;
      }
    }

    // 8. เตรียม JSON เพื่อส่งให้ GitHub Pages
    const response = {
      status: "success",
      data: {
        month: targetMonth,
        incomeTotal: incomeTotal,
        expenseTotal: expenseTotal,
        expensesByCategory: expensesByCategory,
        incomesByCategory: incomesByCategory,
      },
    };

    return ContentService.createTextOutput(
      JSON.stringify(response),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.message }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- 📌 ส่วนที่ 1: ดึงประวัติรายการ (API List) ---
function handleListRequest(e) {
  const userId = e.parameter.userId;
  if (!userId)
    return buildJsonResponse({ status: "error", message: "Missing userId" });

  const targetMonth =
    e.parameter.month ||
    Utilities.formatDate(
      new Date(),
      CONFIG.TIMEZONE || "Asia/Bangkok",
      "yyyy-MM",
    );

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(
      "Entries",
    );
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const col = {};
    headers.forEach((h, i) => {
      if (h) col[h.toString().trim().toLowerCase()] = i;
    });

    const entries = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rUserId = row[col["user_id"]];
      const rStatus = row[col["status"]];
      const rTimestamp = row[col["timestamp"]];

      // คัดเฉพาะรายการที่เป็น Active และเป็นของตัวเอง
      if (!rTimestamp || rUserId !== userId || rStatus !== "active") continue;

      const rMonth = Utilities.formatDate(
        new Date(rTimestamp),
        CONFIG.TIMEZONE || "Asia/Bangkok",
        "yyyy-MM",
      );
      if (rMonth !== targetMonth) continue;

      entries.push({
        row_index: i + 1,
        entry_id: row[col["entry_id"]],
        timestamp: rTimestamp,
        type: row[col["type"]],
        amount: parseFloat(row[col["amount"]]) || 0,
        description: row[col["description"]],
        category: row[col["category"]],
      });
    }

    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // --- ✨ ส่วนที่เพิ่มใหม่: ดึงข้อมูลหมวดหมู่จากชีต Categories ---
    let categoryList = [];
    try {
      const catSheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(
        "Categories",
      );
      if (catSheet) {
        const catData = catSheet.getDataRange().getValues();

        // ดึงข้อมูลจากคอลัมน์แรก (Index 0)
        categoryList = catData
          .map((row) => (row[0] ? row[0].toString().trim() : ""))
          .filter((c) => c !== "");

        // เอา Header ออก (ถ้าบรรทัดแรกเขียนว่า Category หรือ หมวดหมู่)
        if (
          categoryList.length > 0 &&
          (categoryList[0].toLowerCase() === "category" ||
            categoryList[0] === "หมวดหมู่")
        ) {
          categoryList.shift();
        }
      }
    } catch (catErr) {
      console.error("Error fetching categories:", catErr);
    }

    // Fallback: ถ้าเกิดข้อผิดพลาดในการดึงชีต ให้มีข้อมูลสำรองกันระบบพัง
    if (categoryList.length === 0) {
      categoryList = ["อาหาร", "เดินทาง", "ช้อปปิ้ง", "อื่นๆ"];
    }

    // ส่ง categories แนบกลับไปพร้อมกับ entries
    return buildJsonResponse({
      status: "success",
      data: entries,
      categories: categoryList,
    });
  } catch (error) {
    return buildJsonResponse({ status: "error", message: error.message });
  }
}

// ฟังก์ชันช่วยกรณีที่ยังไม่มีข้อมูลในเดือนนั้นๆ
function returnEmptyOverview(targetMonth) {
  const response = {
    status: "success",
    data: {
      month: targetMonth,
      incomeTotal: 0,
      expenseTotal: 0,
      expensesByCategory: {},
      incomesByCategory: {},
    },
  };
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// ==========================================
// 📌 ส่วนเสริม: ระบบ API จัดการข้อมูลจาก LIFF (แยกฟังก์ชันเพื่อความสะอาดของโค้ด)
// ==========================================
function handleLiffApiRequest(postData) {
  const idToken = postData.idToken;
  const action = postData.action;
  const payload = postData.payload;

  try {
    // 1. นำ idToken ไปตรวจสอบกับระบบของ LINE
    const lineUserId = verifyLineIdToken(idToken);
    if (!lineUserId) {
      return buildJsonResponse({
        status: "error",
        message: "Unauthorized: ตรวจสอบ Token ไม่ผ่าน",
      });
    }

    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(
      "Entries",
    );
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    const col = {};
    headers.forEach((h, i) => {
      if (h) col[h.toString().trim().toLowerCase()] = i + 1;
    });

    const rowIdx = payload.row_index;

    // 2. เช็กซ้ำอีกรอบว่าผู้ใช้มีสิทธิ์แก้บรรทัดนี้หรือไม่
    const dataUserId = sheet.getRange(rowIdx, col["user_id"]).getValue();
    if (dataUserId !== lineUserId) {
      return buildJsonResponse({
        status: "error",
        message: "Forbidden: ไม่มีสิทธิ์แก้ไขข้อมูลของผู้อื่น",
      });
    }

    // 3. ดำเนินการตามคำสั่ง
    if (action === "delete") {
      sheet.getRange(rowIdx, col["status"]).setValue("deleted"); // Soft Delete
    } else if (action === "undo") {
      sheet.getRange(rowIdx, col["status"]).setValue("active"); // กู้คืน
    } else if (action === "edit") {
      sheet.getRange(rowIdx, col["amount"]).setValue(payload.amount);
      sheet.getRange(rowIdx, col["description"]).setValue(payload.description);
      sheet.getRange(rowIdx, col["category"]).setValue(payload.category);
    }

    return buildJsonResponse({
      status: "success",
      message: "อัปเดตข้อมูลสำเร็จ",
    });
  } catch (error) {
    return buildJsonResponse({ status: "error", message: error.message });
  }
}

// 📌 ฟังก์ชันตรวจสอบความถูกต้องของคนล็อกอิน (idToken) กับระบบ LINE
function verifyLineIdToken(idToken) {
  try {
    // ⚠️ อย่าลืมใช้ Client ID จาก LIFF ID ของคุณ (ตัวเลข 10 หลักข้างหน้า)
    const clientId = "2010529543";
    const url = "https://api.line.me/oauth2/v2.1/verify";

    const options = {
      method: "post",
      payload: { id_token: idToken, client_id: clientId },
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      return json.sub; // ส่งคืน userId ของแท้กลับไป
    }
    return null;
  } catch (error) {
    console.error("Token Error:", error);
    return null;
  }
}

// 📌 ฟังก์ชันช่วยจัดรูปแบบ JSON ตอบกลับไปให้หน้าเว็บ
function buildJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
