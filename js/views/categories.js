// ============================================================
// View: หมวดหมู่ — donut + ranked list rows (§7.9 / §7.13)
// Honors the type toggle (§7.12) and a หมวดหมู่ / #แท็ก sub-switch.
// ============================================================

import { state } from "../state.js";
import { buildDonut } from "../charts.js";
import { formatMoney } from "../format.js";
import { typeToggleHTML, wireTypeToggle, emptyStateHTML } from "../components.js";
import {
  CHART_PALETTE,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
  HASHTAG_ICON,
  NO_HASHTAG_LABEL,
} from "../config.js";

function pickMap() {
  const d = state.overview || {};
  if (state.subTab === "hashtag") {
    return state.type === "expense"
      ? d.expensesByHashtag || {}
      : d.incomesByHashtag || {};
  }
  return state.type === "expense"
    ? d.expensesByCategory || {}
    : d.incomesByCategory || {};
}

function iconFor(name) {
  if (state.subTab === "hashtag") {
    return name === NO_HASHTAG_LABEL ? "—" : HASHTAG_ICON;
  }
  return CATEGORY_ICONS[name] || DEFAULT_CATEGORY_ICON;
}

export function render(el, actions) {
  const map = pickMap();
  const rows = Object.entries(map)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((s, [, v]) => s + v, 0);
  const amtClass = state.type === "expense" ? "expense" : "income";

  const subtabsHTML = `
    <div class="subtabs">
      <button class="subtab-btn ${state.subTab === "category" ? "active" : ""}" data-subtab="category">หมวดหมู่</button>
      <button class="subtab-btn ${state.subTab === "hashtag" ? "active" : ""}" data-subtab="hashtag">#แท็ก</button>
    </div>`;

  let body;
  if (rows.length === 0) {
    body = emptyStateHTML("ยังไม่มีรายการในมุมมองนี้เลยนะคะ ✨");
  } else {
    const rowsHTML = rows
      .map(([name, amount], i) => {
        const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
        return `
          <div class="breakdown-row" style="animation-delay: calc(40ms * ${i})">
            <div class="row-icon">${iconFor(name)}</div>
            <div class="row-main"><div class="row-name">${name}</div></div>
            <div class="row-right">
              <div class="row-amount ${amtClass}">${formatMoney(amount)}</div>
              <div class="row-pct">${pct}%</div>
            </div>
          </div>`;
      })
      .join("");

    body = `
      <div class="card">
        <div class="chart-container">
          <canvas id="categoriesChart"></canvas>
          <div class="chart-center">
            <div class="chart-center-label">${state.type === "expense" ? "รายจ่าย" : "รายรับ"}รวม</div>
            <div class="chart-center-value">${formatMoney(total)}</div>
          </div>
        </div>
        <div class="breakdown-list">${rowsHTML}</div>
      </div>`;
  }

  el.innerHTML = typeToggleHTML() + subtabsHTML + body;

  // Wire interactions
  wireTypeToggle(el, actions);
  el.querySelectorAll(".subtab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.dataset.subtab;
      if (s !== state.subTab) actions.setSubTab(s);
    });
  });

  if (rows.length > 0) {
    // Category & hashtag donuts use the categorical palette (§7.9).
    // Legend off — the list rows below already name every slice.
    buildDonut(
      "categoriesChart",
      rows.map(([n]) => n),
      rows.map(([, v]) => v),
      CHART_PALETTE,
      false,
    );
  }
}
