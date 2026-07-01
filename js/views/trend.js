// ============================================================
// View: เทียบเดือน — 6-month bar chart + average line (§7.14)
// Honors the type toggle (§7.12).
// ============================================================

import { state } from "../state.js";
import { buildTrendBar } from "../charts.js";
import { formatMonthShort, formatMoney } from "../format.js";
import { typeToggleHTML, wireTypeToggle, emptyStateHTML } from "../components.js";
import { COLOR_INCOME_FILL, COLOR_EXPENSE_FILL } from "../config.js";

export function render(el, actions) {
  const series = state.trend || [];
  const isExpense = state.type === "expense";
  const fill = isExpense ? COLOR_EXPENSE_FILL : COLOR_INCOME_FILL;

  const values = series.map((m) => (isExpense ? m.expenseTotal : m.incomeTotal));
  const labels = series.map((m) => formatMonthShort(m.month));
  const highlightIndex = series.findIndex((m) => m.month === state.month);
  const avg = values.length
    ? values.reduce((s, v) => s + v, 0) / values.length
    : 0;

  const hasData = values.some((v) => v > 0);

  const body = hasData
    ? `
      <div class="card">
        <div class="trend-avg">เฉลี่ย <strong>${formatMoney(avg)}</strong> / เดือน</div>
        <div class="chart-container" style="height:240px">
          <canvas id="trendChart"></canvas>
        </div>
      </div>`
    : emptyStateHTML("ยังไม่มีข้อมูลย้อนหลังให้เทียบเลยนะคะ ✨");

  el.innerHTML = typeToggleHTML() + body;
  wireTypeToggle(el, actions);

  if (hasData) {
    buildTrendBar("trendChart", labels, values, highlightIndex, fill, avg);
  }
}
