// ============================================================
// JotHai — shared app state (single source of truth for the UI)
// ============================================================

import { currentMonthBangkok } from "./format.js";

export const state = {
  userId: "",
  idToken: "",

  month: currentMonthBangkok(), // "yyyy-MM"
  activeTab: "overview", // overview | categories | trend | entries
  type: "expense", // expense | income  (segmented toggle)
  subTab: "category", // category | hashtag  (categories view)

  // Cached API payloads for the current month
  overview: null, // { incomeTotal, expenseTotal, expensesByCategory, ... }
  trend: null, // [ { month, incomeTotal, expenseTotal } ]
  list: null, // [ entry, ... ]
  categories: [], // string[] for the edit dropdown
};

// Step the current month by delta (±N) using pure integer math (no TZ drift).
export function shiftMonth(delta) {
  let [y, m] = state.month.split("-").map(Number);
  m += delta;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  state.month = `${y}-${String(m).padStart(2, "0")}`;
}
