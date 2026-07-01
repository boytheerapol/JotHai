// ============================================================
// JotHai — GAS Web App API wrappers
// GET endpoints: overview, trend, list. POST: entry mutations (idToken-verified).
// ============================================================

import { GAS_URL, TREND_MONTHS } from "./config.js";
import { state } from "./state.js";

function qs(params) {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

async function getJson(params) {
  const res = await fetch(`${GAS_URL}?${qs(params)}`);
  const json = await res.json();
  if (json.status !== "success") {
    throw new Error(json.message || "API error");
  }
  return json;
}

export async function getOverview() {
  const json = await getJson({
    api: "overview",
    userId: state.userId,
    month: state.month,
  });
  return json.data;
}

export async function getTrend() {
  const json = await getJson({
    api: "trend",
    userId: state.userId,
    month: state.month,
    months: TREND_MONTHS,
  });
  return json.data; // array oldest→newest
}

export async function getList() {
  const json = await getJson({
    api: "list",
    userId: state.userId,
    month: state.month,
  });
  return { entries: json.data, categories: json.categories || [] };
}

// action: 'edit' | 'delete' | 'undo'
export async function mutateEntry(action, payload) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ idToken: state.idToken, action, payload }),
  });
  return res.json();
}
