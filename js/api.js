// ============================================================
// JotHai — GAS Web App API wrappers
// GET endpoints: overview, trend, list. POST: entry mutations (idToken-verified).
// ============================================================

import { GAS_URL, TREND_MONTHS } from "./config.js";
import { state } from "./state.js";

const REQUEST_TIMEOUT_MS = 15000;

function qs(params) {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

// Aborts the request after REQUEST_TIMEOUT_MS so a slow/hung GAS response
// never leaves the loading spinner running indefinitely.
function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

async function getJson(params) {
  const res = await fetchWithTimeout(`${GAS_URL}?${qs(params)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.status !== "success") {
    throw new Error(json.message || "API error");
  }
  return json;
}

export async function getOverview() {
  const json = await getJson({
    api: "overview",
    idToken: liff.getIDToken(),
    month: state.month,
  });
  return json.data;
}

export async function getTrend() {
  const json = await getJson({
    api: "trend",
    idToken: liff.getIDToken(),
    month: state.month,
    months: TREND_MONTHS,
  });
  return json.data; // array oldest→newest
}

export async function getList() {
  const json = await getJson({
    api: "list",
    idToken: liff.getIDToken(),
    month: state.month,
  });
  return { entries: json.data, categories: json.categories || [] };
}

// action: 'edit' | 'delete' | 'undo'
// Never throws — normalizes any failure (network, timeout, non-OK, bad JSON)
// into the same { status: "error", message } shape the caller already
// expects from a structured server rejection.
export async function mutateEntry(action, payload) {
  try {
    // Refresh the idToken on every mutation rather than relying on the one
    // captured at boot (main() in app.js), in case the LIFF session is long-lived.
    state.idToken = liff.getIDToken();
    const res = await fetchWithTimeout(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ idToken: state.idToken, action, payload }),
    });
    if (!res.ok) {
      return { status: "error", message: `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (err) {
    const message =
      err.name === "AbortError"
        ? "การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง"
        : "ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
    return { status: "error", message };
  }
}
