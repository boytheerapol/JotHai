function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(sheetName);

  // สร้าง Sheet อัตโนมัติหากยังไม่มี (ช่วยตอน Setup ครั้งแรก)
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === "Entries") {
      sheet.appendRow([
        "entry_id",
        "user_id",
        "timestamp",
        "type",
        "amount",
        "description",
        "category",
        "hashtags",
        "status",
        "raw_text",
        "source",
      ]);
    } else if (sheetName === "Users") {
      sheet.appendRow(["user_id", "display_name", "status", "joined_at"]);
    } else if (sheetName === "Categories") {
      sheet.appendRow(["category", "type", "keywords"]);
    }
  }
  return sheet;
}

// ทดสอบรันฟังก์ชันนี้เพื่อสร้าง Header ใน Sheet อัตโนมัติ
function setupDatabase() {
  getSheet("Entries");
  getSheet("Users");
  getSheet("Categories");
}

function getUserStatus(userId) {
  const sheet = getSheet("Users");
  const data = sheet.getDataRange().getValues();

  // เริ่มที่ i=1 เพื่อข้าม Header Row
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      return data[i][2]; // คืนค่าสถานะ เช่น "approved" หรือ "pending"
    }
  }
  return "unknown"; // ถ้าไม่เจอในระบบ
}

function addUser(userId, displayName, status) {
  const sheet = getSheet("Users");
  // ใส่ข้อมูล: user_id | display_name | status | joined_at ตาม PRD
  sheet.appendRow([userId, displayName, status, new Date()]);
}

function getCategoriesString() {
  const sheet = getSheet("Categories");
  const data = sheet.getDataRange().getValues();
  let categories = [];

  // ข้าม Header แถวแรก
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) categories.push(data[i][0]);
  }

  // หากยังไม่มีข้อมูลหมวดหมู่ใน Sheet ให้ใช้ค่าตั้งต้น
  if (categories.length === 0) {
    return "อาหาร, เดินทาง, ช้อปปิ้ง, ค่าอยู่ค่ากิน, เงินเดือน";
  }
  return categories.join(", ");
}

function addEntry(userId, parsed, rawText, source) {
  const sheet = getSheet("Entries");
  const entryId = Utilities.getUuid();
  const timestamp = new Date();
  const status = "active";

  let normalizedHashtags = (parsed.hashtags || "")
    .toString()
    .replace(/#/g, "")
    .toLowerCase();

  const newRow = [
    entryId,
    userId,
    timestamp,
    parsed.type,
    parsed.amount,
    parsed.description,
    parsed.category,
    normalizedHashtags,
    status,
    rawText,
    source,
  ];

  // ใช้ getRange().setValues() แทนการใช้ appendRow() เพื่อประสิทธิภาพที่ดีขึ้น
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);

  return entryId;
}

// สลับประเภท รายรับ <-> รายจ่าย
function toggleEntryType(entryId) {
  const sheet = getSheet("Entries");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === entryId) {
      const currentType = data[i][3];
      const newType = currentType === "expense" ? "income" : "expense";
      sheet.getRange(i + 1, 4).setValue(newType); // คอลัมน์ D (index 4) คือ type
      return newType;
    }
  }
  return null;
}

// อัปเดตหมวดหมู่
function updateEntryCategory(entryId, newCategory) {
  const sheet = getSheet("Entries");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === entryId) {
      sheet.getRange(i + 1, 7).setValue(newCategory); // คอลัมน์ G (index 7) คือ category
      return true;
    }
  }
  return false;
}

// ลบรายการแบบ Soft Delete
function deleteEntryStatus(entryId) {
  const sheet = getSheet("Entries");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === entryId) {
      sheet.getRange(i + 1, 9).setValue("deleted"); // คอลัมน์ I (index 9) คือ status
      return true;
    }
  }
  return false;
}

// ดึงหมวดหมู่ทั้งหมดเป็น Array (สำหรับทำเมนู Quick Reply)
function getCategoriesArray() {
  const sheet = getSheet("Categories");
  const data = sheet.getDataRange().getValues();
  let categories = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) categories.push(data[i][0].toString().trim());
  }
  return categories.length > 0
    ? categories
    : ["อาหาร", "เดินทาง", "ช้อปปิ้ง", "ค่าอยู่ค่ากิน", "เงินเดือน"];
}

// ดึงข้อมูล 1 แถวจาก Sheet ตาม ID เพื่อเอามาสร้างใบเสร็จพรีวิว
function getEntryById(entryId) {
  const sheet = getSheet("Entries");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === entryId) {
      return {
        id: data[i][0],
        userId: data[i][1],
        timestamp: data[i][2],
        type: data[i][3],
        amount: data[i][4],
        description: data[i][5],
        category: data[i][6],
        hashtags: data[i][7],
        status: data[i][8],
      };
    }
  }
  return null;
}

// อัปเดตข้อมูล (รองรับทั้งการเปลี่ยนประเภท และ เปลี่ยนหมวดหมู่)
function updateEntryFields(entryId, newType, newCategory) {
  const sheet = getSheet("Entries");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === entryId) {
      if (newType) sheet.getRange(i + 1, 4).setValue(newType);
      if (newCategory) sheet.getRange(i + 1, 7).setValue(newCategory);
      return true;
    }
  }
  return false;
}
