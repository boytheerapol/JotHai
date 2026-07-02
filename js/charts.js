// ============================================================
// JotHai — Chart.js builders (donut + trend bar)
// `Chart` is a global from the CDN <script> in index.html.
// Never use the Chart.js default palette (design-system §9 rule 2).
// ============================================================

import {
  CHART_EMPTY,
  REDUCED_MOTION,
  COLOR_TEXT_SECONDARY,
  COLOR_TEXT_MUTED,
  COLOR_BORDER,
} from "./config.js";

// Kanit everywhere (§7.9)
Chart.defaults.font.family = "Kanit";

// On-slice % labels (donut only). ChartDataLabels is a CDN global; register once,
// then opt in/out per chart via each chart's `plugins.datalabels`.
Chart.register(ChartDataLabels);

const registry = {};

function destroyIfExists(canvasId) {
  if (registry[canvasId]) {
    registry[canvasId].destroy();
    delete registry[canvasId];
  }
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Readable label color per slice: dark text on light fills (lime/orange),
// white on dark fills — via perceived luminance.
function contrastText(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1A1523" : "#fff";
}

// Donut. Center total is drawn as HTML by the view.
// `showLegend` off when the view already lists rows (avoids duplication).
export function buildDonut(canvasId, labels, values, colors, showLegend = true) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  destroyIfExists(canvasId);

  let l = labels;
  let d = values;
  let c = colors;
  const isEmpty = d.length === 0 || d.every((v) => v === 0);
  if (isEmpty) {
    l = ["ไม่มีข้อมูล"];
    d = [1];
    c = [CHART_EMPTY];
  }

  // On-slice %: show only the 5 largest slices so many near-equal categories
  // don't clutter the ring (deviation from §7.9 "centered total + legend" only).
  const total = d.reduce((a, b) => a + b, 0);
  const topIdx = new Set(
    d
      .map((v, i) => [v, i])
      .sort((a, b) => b[0] - a[0])
      .slice(0, 5)
      .map(([, i]) => i),
  );

  const cycledColors = d.map((_, i) => c[i % c.length]);

  registry[canvasId] = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: { labels: l, datasets: [{ data: d, backgroundColor: cycledColors, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      animation: REDUCED_MOTION
        ? false
        : { animateRotate: true, animateScale: true, duration: 600, easing: "easeOutQuart" },
      plugins: {
        legend: {
          display: showLegend,
          position: "bottom",
          labels: { font: { family: "Kanit" }, boxWidth: 12 },
        },
        datalabels: {
          color: (ctx) => contrastText(ctx.dataset.backgroundColor[ctx.dataIndex]),
          font: { family: "Kanit", weight: 600, size: 12 },
          formatter: (v, ctx) => {
            if (isEmpty || !topIdx.has(ctx.dataIndex)) return "";
            const pct = Math.round((v / total) * 100);
            return pct >= 1 ? pct + "%" : "";
          },
        },
      },
    },
  });
}

// Trend bar: current/target month at full opacity, prior months dimmed.
// A dashed average line rides over the bars as a second (line) dataset.
export function buildTrendBar(canvasId, labels, values, highlightIndex, fillHex, avg) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  destroyIfExists(canvasId);

  const barColors = values.map((_, i) =>
    i === highlightIndex ? fillHex : hexToRgba(fillHex, 0.45),
  );

  registry[canvasId] = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          data: values,
          backgroundColor: barColors,
          borderRadius: 6,
          maxBarThickness: 36,
          order: 2,
        },
        {
          type: "line",
          data: labels.map(() => avg),
          borderColor: COLOR_TEXT_SECONDARY,
          borderDash: [6, 6],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: REDUCED_MOTION ? false : { duration: 600, easing: "easeOutQuart" },
      plugins: { legend: { display: false }, datalabels: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "Kanit" }, color: COLOR_TEXT_MUTED },
        },
        y: {
          beginAtZero: true,
          grid: { color: COLOR_BORDER },
          ticks: {
            font: { family: "Kanit" },
            color: COLOR_TEXT_MUTED,
            callback: (v) => Number(v).toLocaleString("th-TH"),
          },
        },
      },
    },
  });
}
