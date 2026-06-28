const CONFIG = {
  // Spreadsheet ID ของโปรเจกต์
  SHEET_ID: PropertiesService.getScriptProperties().getProperty("SHEET_ID"),

  // ดึงค่า Token จาก Project Settings > Script Properties
  LINE_ACCESS_TOKEN:
    PropertiesService.getScriptProperties().getProperty("LINE_ACCESS_TOKEN"),
  GEMINI_API_KEY:
    PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY"),
  LIFF_ID: PropertiesService.getScriptProperties().getProperty("LIFF_ID"),

  TIMEZONE: "Asia/Bangkok",
  CLARIFICATION_TTL_SECONDS: 600,
};
