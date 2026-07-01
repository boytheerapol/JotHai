// ============================================================
// View: ภาพรวม — income-vs-expense donut + balance (§7.9)
// ============================================================

import { state } from "../state.js";
import { buildDonut } from "../charts.js";
import { formatMoney } from "../format.js";
import { COLOR_INCOME_FILL, COLOR_EXPENSE_FILL } from "../config.js";

export function render(el) {
  const d = state.overview || { incomeTotal: 0, expenseTotal: 0 };
  const balance = d.incomeTotal - d.expenseTotal;
  const balColor =
    balance >= 0 ? "var(--color-income-text)" : "var(--color-expense-text)";

  el.innerHTML = `
    <div class="card">
      <h2 class="section-title">สัดส่วน รายรับ–รายจ่าย</h2>
      <div class="chart-container">
        <canvas id="overviewChart"></canvas>
        <div class="chart-center">
          <div class="chart-center-label">คงเหลือ</div>
          <div class="chart-center-value" style="color:${balColor}">${formatMoney(balance)}</div>
        </div>
      </div>
    </div>
  `;

  // Overview donut keeps fixed income/expense semantic fills (§7.9)
  buildDonut(
    "overviewChart",
    ["รายรับ", "รายจ่าย"],
    [d.incomeTotal, d.expenseTotal],
    [COLOR_INCOME_FILL, COLOR_EXPENSE_FILL],
  );
}
