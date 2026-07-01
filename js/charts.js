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

// Donut. Center total is drawn as HTML by the view.
// `showLegend` off when the view already lists rows (avoids duplication).
export function buildDonut(canvasId, labels, values, colors, showLegend = true) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  destroyIfExists(canvasId);

  let l = labels;
  let d = values;
  let c = colors;
  if (d.length === 0 || d.every((v) => v === 0)) {
    l = ["ไม่มีข้อมูล"];
    d = [1];
    c = [CHART_EMPTY];
  }

  registry[canvasId] = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: { labels: l, datasets: [{ data: d, backgroundColor: c, borderWidth: 0 }] },
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
      plugins: { legend: { display: false } },
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
