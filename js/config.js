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
// Dark-theme set sourced from the design mockup; also tints the emoji icon chips.
export const CHART_PALETTE = [
  "#6D8BFF", "#34D399", "#F59E0B", "#FB7185",
  "#C084FC", "#F472B6", "#818CF8", "#2DD4BF",
];
export const CHART_EMPTY = "rgba(255, 255, 255, 0.08)";
export const COLOR_INCOME_FILL = "#2DD4BF";
export const COLOR_EXPENSE_FILL = "#FB7185";
// Axis/grid/legend text on the dark surface (mirror design-system.md text tiers)
export const COLOR_TEXT_SECONDARY = "rgba(235, 230, 255, 0.82)";
export const COLOR_TEXT_MUTED = "rgba(235, 230, 255, 0.62)";
export const COLOR_BORDER = "rgba(255, 255, 255, 0.12)";

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
