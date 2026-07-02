// ============================================================
// JotHai — HTML-escaping helper (shared by any view that interpolates
// user-controlled strings into innerHTML)
// ============================================================

export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
