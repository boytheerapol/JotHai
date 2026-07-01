// ============================================================
// View: รายการ — date-grouped list + daily subtotals (§7.3)
// Ports the edit / delete / undo mutation flow (idToken-verified server-side).
// ============================================================

import { state } from "../state.js";
import { formatMoney, dayKey, formatDayHeader } from "../format.js";
import { emptyStateHTML } from "../components.js";
import { Swal2, Toast } from "../ui.js";

function isExpenseType(t) {
  return t === "รายจ่าย" || t === "expense";
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function categoryOptions(entry) {
  let opts = state.categories
    .map(
      (c) =>
        `<option value="${esc(c)}" ${c === entry.category ? "selected" : ""}>${esc(c)}</option>`,
    )
    .join("");
  if (!state.categories.includes(entry.category)) {
    opts += `<option value="${esc(entry.category)}" selected>${esc(entry.category)}</option>`;
  }
  return opts;
}

function entryCardHTML(entry, i) {
  const isExpense = isExpenseType(entry.type);
  const colorClass = isExpense ? "expense" : "income";
  const amtColor = isExpense
    ? "var(--color-expense-text)"
    : "var(--color-income-text)";
  const r = entry.row_index;

  return `
    <div class="entry-card ${colorClass}" id="card-${r}" style="animation-delay: calc(40ms * ${i})">
      <div id="view-${r}">
        <div class="entry-header">
          <span><span id="lbl-cat-${r}">${esc(entry.category)}</span></span>
          <span style="color:${amtColor}">฿<span id="lbl-amt-${r}">${entry.amount.toLocaleString()}</span></span>
        </div>
        <div class="entry-desc" id="lbl-desc-${r}">${esc(entry.description)}</div>
        <div class="entry-actions">
          <button class="btn-small btn-edit" data-act="toggle-edit" data-row="${r}">แก้ไข</button>
          <button class="btn-small btn-delete" data-act="delete" data-row="${r}">ลบ</button>
        </div>
      </div>

      <div class="edit-form" id="edit-${r}">
        <div class="form-group">
          <label>จำนวนเงิน (บาท)</label>
          <input type="number" id="inp-amt-${r}" value="${esc(entry.amount)}">
        </div>
        <div class="form-group">
          <label>รายละเอียด</label>
          <input type="text" id="inp-desc-${r}" value="${esc(entry.description)}">
        </div>
        <div class="form-group">
          <label>หมวดหมู่</label>
          <select id="inp-cat-${r}">${categoryOptions(entry)}</select>
        </div>
        <div class="entry-actions" style="margin-top: var(--space-3);">
          <button class="btn-small btn-ghost" data-act="toggle-edit" data-row="${r}">ยกเลิก</button>
          <button class="btn-small btn" data-act="save" data-row="${r}">บันทึก</button>
        </div>
      </div>

      <div id="undo-${r}" style="display:none; text-align:center;">
        <div style="color:var(--color-expense-text); margin-bottom:var(--space-3); font:var(--text-label);">ลบรายการนี้แล้ว</div>
        <button class="btn-small btn-undo" data-act="undo" data-row="${r}">↩️ กดเพื่อเลิกทำ (Undo)</button>
      </div>
    </div>`;
}

function dayGroupHTML(entries, startIndex) {
  const first = entries[0];
  let expenseSum = 0;
  let incomeSum = 0;
  entries.forEach((e) => {
    if (isExpenseType(e.type)) expenseSum += e.amount;
    else incomeSum += e.amount;
  });

  const subtotal = [];
  if (expenseSum > 0)
    subtotal.push(`<span class="day-subtotal">▲ ${formatMoney(expenseSum)}</span>`);
  if (incomeSum > 0)
    subtotal.push(`<span class="day-subtotal income">▼ ${formatMoney(incomeSum)}</span>`);

  const cards = entries
    .map((e, i) => entryCardHTML(e, startIndex + i))
    .join("");

  return `
    <div class="day-group">
      <div class="day-header">
        <span class="day-date">${formatDayHeader(first.timestamp)}</span>
        <span>${subtotal.join(" &nbsp; ")}</span>
      </div>
      ${cards}
    </div>`;
}

function toggleEdit(r) {
  const viewEl = document.getElementById(`view-${r}`);
  const editEl = document.getElementById(`edit-${r}`);
  if (editEl.style.display === "flex") {
    viewEl.style.display = "block";
    editEl.style.display = "none";
  } else {
    viewEl.style.display = "none";
    editEl.style.display = "flex";
  }
}

async function handleClick(e, actions) {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const act = btn.dataset.act;
  const r = Number(btn.dataset.row);

  if (act === "toggle-edit") {
    toggleEdit(r);
    return;
  }

  if (act === "save") {
    const amount = parseFloat(document.getElementById(`inp-amt-${r}`).value);
    const description = document.getElementById(`inp-desc-${r}`).value;
    const category = document.getElementById(`inp-cat-${r}`).value;
    const result = await actions.mutate("edit", {
      row_index: r,
      amount,
      description,
      category,
    });
    if (result.status === "success") {
      document.getElementById(`lbl-amt-${r}`).innerText = amount.toLocaleString();
      document.getElementById(`lbl-desc-${r}`).innerText = description;
      document.getElementById(`lbl-cat-${r}`).innerText = category;
      toggleEdit(r);
      Toast.fire({ icon: "success", title: "บันทึกสำเร็จ" });
    } else {
      Swal2.fire({ icon: "error", title: "ผิดพลาด", text: result.message });
    }
    return;
  }

  if (act === "delete") {
    const confirmed = await Swal2.fire({
      title: "ยืนยันการลบ?",
      text: "คุณสามารถกดเลิกทำ (Undo) ได้ภายหลัง",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FF5C7C", // Danger override — destructive ≠ primary (§7.4)
      confirmButtonText: "ใช่, ลบรายการ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    if (!confirmed.isConfirmed) return;
    const result = await actions.mutate("delete", { row_index: r });
    if (result.status === "success") {
      document.getElementById(`view-${r}`).style.display = "none";
      document.getElementById(`edit-${r}`).style.display = "none";
      document.getElementById(`undo-${r}`).style.display = "block";
    } else {
      Swal2.fire({ icon: "error", title: "ผิดพลาด", text: result.message });
    }
    return;
  }

  if (act === "undo") {
    const result = await actions.mutate("undo", { row_index: r });
    if (result.status === "success") {
      document.getElementById(`undo-${r}`).style.display = "none";
      document.getElementById(`view-${r}`).style.display = "block";
    } else {
      Swal2.fire({ icon: "error", title: "ผิดพลาด", text: result.message });
    }
  }
}

export function render(el, actions) {
  const entries = state.list || [];

  if (entries.length === 0) {
    el.innerHTML = emptyStateHTML(
      "ยังไม่มีรายการเดือนนี้เลยนะคะ ✨ ลองพิมพ์ 'กาแฟ 50' ดูสิ",
    );
    el.onclick = null;
    return;
  }

  // Group by Bangkok day; backend already sorts entries newest→oldest.
  const groups = [];
  const indexByDay = new Map();
  entries.forEach((entry) => {
    const key = dayKey(entry.timestamp);
    if (!indexByDay.has(key)) {
      indexByDay.set(key, groups.length);
      groups.push([]);
    }
    groups[indexByDay.get(key)].push(entry);
  });

  let runningIndex = 0;
  el.innerHTML = groups
    .map((g) => {
      const html = dayGroupHTML(g, runningIndex);
      runningIndex += g.length;
      return html;
    })
    .join("");

  // Single delegated handler (assignment replaces any prior one — no stacking).
  el.onclick = (e) => handleClick(e, actions);
}
