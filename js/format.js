// ============================================================
// JotHai — formatting & money-count animation helpers
// All date logic uses Asia/Bangkok via Intl (NEVER toISOString / UTC).
// ============================================================

import { TIMEZONE, REDUCED_MOTION } from "./config.js";

const TH_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const TH_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

// "฿1,234"
export function formatMoney(v) {
  return "฿" + Math.round(v || 0).toLocaleString("th-TH");
}

// "yyyy-MM" → "กรกฎาคม 2569" (Buddhist-era year)
export function formatMonthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return `${TH_MONTHS_FULL[m - 1]} ${y + 543}`;
}

// "yyyy-MM" → "ก.ค." (short, for trend bar axis)
export function formatMonthShort(ym) {
  const [, m] = ym.split("-").map(Number);
  return TH_MONTHS_SHORT[m - 1];
}

// "yyyy-MM" for the current month in Bangkok
export function currentMonthBangkok() {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: TIMEZONE })
    .slice(0, 7);
}

// "yyyy-MM-dd" (Bangkok) for grouping entries by day
export function dayKey(timestamp) {
  return new Date(timestamp).toLocaleDateString("en-CA", {
    timeZone: TIMEZONE,
  });
}

// Human day header, e.g. "อา. 28 ก.ค."
export function formatDayHeader(timestamp) {
  const d = new Date(timestamp);
  const weekday = d.toLocaleDateString("th-TH", {
    weekday: "short",
    timeZone: TIMEZONE,
  });
  const day = d.toLocaleDateString("th-TH", {
    day: "numeric",
    timeZone: TIMEZONE,
  });
  const month = TH_MONTHS_SHORT[
    Number(dayKey(timestamp).split("-")[1]) - 1
  ];
  return `${weekday} ${day} ${month}`;
}

// Count-up animation for money amounts (§6); animates from the shown value.
export function animateCount(el, target) {
  const start = Number(String(el.innerText).replace(/[^\d.-]/g, "")) || 0;
  if (REDUCED_MOTION || start === target) {
    el.innerText = formatMoney(target);
    return;
  }
  const duration = 320; // --motion-slow
  const t0 = performance.now();
  function step(now) {
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out
    el.innerText = formatMoney(start + (target - start) * eased);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
