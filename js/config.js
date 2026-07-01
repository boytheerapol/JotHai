// ============================================================
// JotHai — config & constants
// Color values mirror docs/design-system.md §2 (that file wins).
// ============================================================

export const LIFF_ID = "2010529543-LkVEFzhx";

// ⚠️ Web App URL ของ Google Apps Script
export const GAS_URL =
  "https://script.google.com/macros/s/AKfycbyfh7wTfcOue6G7xStHmBTzTFrVlyeNepjj193x089dWE3GII7lWquV101SRoQITqDw/exec";

// จำนวนเดือนย้อนหลังในกราฟเทียบเดือน (§ plan: 6)
export const TREND_MONTHS = 6;

export const TIMEZONE = "Asia/Bangkok";

// Categorical palette for category/hashtag donuts (NOT income-vs-expense) — §2
export const CHART_PALETTE = [
  "#7C3AED", "#16C784", "#FF5C7C", "#2B6BFF",
  "#A3E635", "#F472B6", "#F0A020", "#14B8C4",
];
export const CHART_EMPTY = "#E6E1F0";
export const COLOR_INCOME_FILL = "#16C784";
export const COLOR_EXPENSE_FILL = "#FF5C7C";
export const COLOR_TEXT_SECONDARY = "#4B4458";
export const COLOR_TEXT_MUTED = "#6E6880";
export const COLOR_BORDER = "#E6E1F0";

export const REDUCED_MOTION = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// Empty-state mascot (JotHai brand character, transparent bg)
export const MASCOT_SRC =
  "images/Gemini_Generated_Image_un4by1un4by1un4b-removebg-preview.png";

// Category name → emoji (client-side nicety; Categories sheet has no icon column).
// Unknown categories fall back to DEFAULT_CATEGORY_ICON.
export const CATEGORY_ICONS = {
  "อาหาร": "🍜",
  "เดินทาง": "🚗",
  "เดินทาง, รถ": "🚗",
  "ช้อปปิ้ง": "🛍️",
  "ของใช้จำเป็น": "🧴",
  "บ้าน": "🏠",
  "บ้าน, สาธารณูปโภค": "🏠",
  "ครอบครัว": "👨‍👩‍👧",
  "ครอบครัว, สัตว์เลี้ยง": "🐾",
  "สุขภาพ": "🏥",
  "บันเทิง": "🎮",
  "การศึกษา": "📚",
  "งาน, ธุรกิจ": "💼",
  "เงินเดือน": "💰",
  "โบนัส": "🎁",
  "ลงทุน": "📈",
  "อื่นๆ": "📦",
};
export const DEFAULT_CATEGORY_ICON = "📌";
export const HASHTAG_ICON = "#";
export const NO_HASHTAG_LABEL = "ไม่มีแท็ก";
