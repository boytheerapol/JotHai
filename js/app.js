// ============================================================
// JotHai — app entry point: liff.init, global header, tab router,
// data loading, and the shared `actions` passed to views.
// ============================================================

import { LIFF_ID } from "./config.js";
import { state, shiftMonth } from "./state.js";
import * as api from "./api.js";
import { formatMonthLabel, animateCount } from "./format.js";
import { Swal2 } from "./ui.js";

import * as overview from "./views/overview.js";
import * as categories from "./views/categories.js";
import * as trend from "./views/trend.js";
import * as entries from "./views/entries.js";

const views = { overview, categories, trend, entries };
const TAB_ORDER = ["overview", "categories", "trend", "entries"];

const el = (id) => document.getElementById(id);

// ---- Actions handed to views (keeps views decoupled from app internals) ----
const actions = {
  setType(t) {
    state.type = t;
    renderActive();
  },
  setSubTab(s) {
    state.subTab = s;
    renderActive();
  },
  async mutate(action, payload) {
    const result = await api.mutateEntry(action, payload);
    if (result.status === "success") {
      await refreshData();
    }
    return result;
  },
};

// ---- Rendering ----
// Month label/input update on their own so the header can flip instantly on
// arrow tap, before the (async) data fetch that renderHeader() waits on.
function renderMonthLabel() {
  el("month-text").innerText = formatMonthLabel(state.month);
  el("month-input").value = state.month;
}

function renderHeader() {
  const d = state.overview || { incomeTotal: 0, expenseTotal: 0 };
  animateCount(el("sum-income"), d.incomeTotal);
  animateCount(el("sum-expense"), d.expenseTotal);

  const bal = d.incomeTotal - d.expenseTotal;
  const balEl = el("sum-balance");
  balEl.classList.toggle("income", bal >= 0);
  balEl.classList.toggle("expense", bal < 0);
  animateCount(balEl, bal);
}

function moveTabIndicator() {
  const idx = TAB_ORDER.indexOf(state.activeTab);
  el("tab-indicator").style.transform = `translateX(${idx * 100}%)`;
}

function updateTabButtons() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const isActive = btn.dataset.tab === state.activeTab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  });
}

function renderActive() {
  TAB_ORDER.forEach((k) => {
    el(`view-${k}`).hidden = k !== state.activeTab;
  });
  views[state.activeTab].render(el(`view-${state.activeTab}`), actions);
  moveTabIndicator();
}

function setLoading(on) {
  el("loading").style.display = on ? "flex" : "none";
  // Dim stale totals while fetching so last month's numbers don't read as current.
  document.querySelector(".summary-strip").classList.toggle("loading", on);
  // Block double-taps on month nav while a fetch is in flight.
  el("prev-month").disabled = on;
  el("next-month").disabled = on;
  el("month-input").disabled = on;
}

// ---- Data loading ----
async function fetchAll() {
  const [ov, tr, ls] = await Promise.all([
    api.getOverview(),
    api.getTrend(),
    api.getList(),
  ]);
  state.overview = ov;
  state.trend = tr;
  state.list = ls.entries;
  state.categories = ls.categories;
}

// Discards a response if a newer loadMonth() call started after it —
// prevents a slow month-N response from overwriting a faster month-N+1 one.
let loadToken = 0;

async function loadMonth() {
  const myToken = ++loadToken;
  renderMonthLabel(); // flip the header immediately, before the async fetch
  setLoading(true);
  TAB_ORDER.forEach((k) => (el(`view-${k}`).hidden = true));
  try {
    await fetchAll();
    if (myToken !== loadToken) return;
    renderHeader();
    renderActive();
  } catch (err) {
    if (myToken !== loadToken) return;
    console.error(err);
    // Clear stale totals so the new-month label doesn't sit above old numbers.
    state.overview = null;
    renderHeader();
    Swal2.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
    });
  } finally {
    if (myToken === loadToken) setLoading(false);
  }
}

// After a mutation: refresh totals silently. Re-render the active view unless
// it's รายการ — the entries view manages its own optimistic DOM (undo blocks).
async function refreshData() {
  try {
    await fetchAll();
    renderHeader();
    if (state.activeTab !== "entries") renderActive();
  } catch (err) {
    console.error(err);
  }
}

// ---- Event wiring ----
function setTab(tab) {
  if (tab === state.activeTab) return;
  state.activeTab = tab;
  updateTabButtons();
  renderActive();
}

function wireChrome() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });

  el("prev-month").addEventListener("click", () => {
    shiftMonth(-1);
    loadMonth();
  });
  el("next-month").addEventListener("click", () => {
    shiftMonth(1);
    loadMonth();
  });
  el("month-input").addEventListener("change", (e) => {
    if (e.target.value) {
      state.month = e.target.value;
      loadMonth();
    }
  });
}

// ---- Bootstrap ----
async function main() {
  try {
    await liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    const profile = await liff.getProfile();
    state.userId = profile.userId;
    state.idToken = liff.getIDToken();
    wireChrome();
    updateTabButtons();
    loadMonth();
  } catch (err) {
    console.error(err);
    setLoading(false);
    Swal2.fire({
      icon: "error",
      title: "เชื่อมต่อ LINE ไม่สำเร็จ",
      text: "กรุณาเปิดหน้านี้ผ่านแอป LINE นะคะ",
    });
  }
}

main();
