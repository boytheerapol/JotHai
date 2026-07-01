// ============================================================
// JotHai — shared UI fragments (type toggle §7.12, empty state §7.7)
// ============================================================

import { state } from "./state.js";
import { MASCOT_SRC } from "./config.js";

// Two-way รายจ่าย / รายรับ segmented toggle (§7.12)
export function typeToggleHTML() {
  const expActive = state.type === "expense";
  return `
    <div class="type-toggle" data-type-toggle>
      <div class="seg-indicator" style="transform: translateX(${expActive ? 0 : 100}%)"></div>
      <button class="seg-btn ${expActive ? "active" : ""}" data-type="expense">รายจ่าย</button>
      <button class="seg-btn ${!expActive ? "active" : ""}" data-type="income">รายรับ</button>
    </div>`;
}

export function wireTypeToggle(container, actions) {
  const tt = container.querySelector("[data-type-toggle]");
  if (!tt) return;
  tt.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.type;
      if (t !== state.type) actions.setType(t);
    });
  });
}

// Empty state with the JotHai mascot (§7.7)
export function emptyStateHTML(message) {
  return `
    <div class="empty-state">
      <img src="${MASCOT_SRC}" alt="JotHai" />
      <p>${message}</p>
    </div>`;
}
