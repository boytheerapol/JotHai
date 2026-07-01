# Task: Rebuild JotHai LIFF Dashboard

Plan: `~/.claude/plans/c-users-t878221-onedrive-true-corporati-reflective-scone.md`
Design spec additions: `docs/design-system.md` §7.11–§7.14

## Checklist

### Backend (`Code.gs`)
- [x] Extend `handleOverviewRequest` to also return `expensesByHashtag` / `incomesByHashtag`
- [x] Add `accumulateHashtags()` helper (space-split, "ไม่มีแท็ก" bucket)
- [x] Add `handleTrendRequest()` — last 6 months `{month, incomeTotal, expenseTotal}`
- [x] Route `?api=trend` in `doGet`
- [x] Include empty hashtag maps in `returnEmptyOverview`

### Design system (`docs/design-system.md`)
- [x] §7.11 Month-nav header
- [x] §7.12 Segmented type toggle
- [x] §7.13 Category / hashtag list row
- [x] §7.14 Trend bar chart (existing-tokens-only, no new hex)

### Frontend (split from single `index.html`)
- [x] `css/styles.css` — tokens (§2–§6) + component CSS
- [x] `js/config.js` — LIFF_ID, GAS_URL, palette, category icons, mascot
- [x] `js/format.js` — money/date (Asia/Bangkok via Intl), count-up
- [x] `js/state.js` — shared state + `shiftMonth`
- [x] `js/api.js` — getOverview / getTrend / getList / mutateEntry
- [x] `js/charts.js` — buildDonut / buildTrendBar (never Chart.js default palette)
- [x] `js/ui.js` — Swal2 / Toast mixins
- [x] `js/components.js` — type toggle + empty-state fragments
- [x] `js/views/overview.js` — income-vs-expense donut + balance
- [x] `js/views/categories.js` — donut + list rows, type toggle + หมวดหมู่/#แท็ก sub-tab
- [x] `js/views/trend.js` — 6-month bar + average line
- [x] `js/views/entries.js` — date-grouped list + daily subtotals + edit/delete/undo
- [x] `js/app.js` — liff.init, header, tab router, data loading, actions
- [x] `index.html` — shell (header + tab bar + 4 view sections)
- [x] Syntax check all 12 modules + `Code.gs` (node --check) → all pass

### Verification (manual — pending deploy)
- [ ] Deploy `Code.gs` new version; hit `?api=overview` (has hashtag maps) + `?api=trend` (6 items)
- [ ] Push frontend to GitHub Pages; open LIFF from Rich Menu inside LINE
- [ ] ภาพรวม donut / หมวดหมู่ toggle+subtab / เทียบเดือน bars+avg / รายการ group+edit/delete/undo
- [ ] Empty month → mascot; reduced-motion; month arrows re-fetch; Bangkok month boundaries

## Review

Rebuilt the LIFF dashboard from a single mockup `index.html` into a tabbed reporting app,
plus the backend aggregation the new reports require.

**What changed**
- **Backend:** `handleOverviewRequest` now also groups by hashtag (reusing its own row-scan loop);
  new `handleTrendRequest` returns a 6-month income/expense series; `?api=trend` routed in `doGet`.
  `handleListRequest` and the idToken-verified mutation path are unchanged.
- **Frontend:** single file → `index.html` shell + `css/styles.css` + 8 `js/` modules + 4 `js/views/`.
  Native ES modules (`<script type="module">`), **no build step** — honors the CLAUDE.md
  "GAS + HTML" forbidden-action and deploys to GitHub Pages as-is.
- **IA:** persistent month-nav + summary header; 4 tabs (ภาพรวม · หมวดหมู่ · เทียบเดือน · รายการ);
  2-way รายจ่าย/รายรับ toggle (no transfer type); หมวดหมู่/#แท็ก sub-switch.
- **Reuse (not rewritten):** edit/delete/undo flow, count-up animation, SweetAlert theme, donut builder.
- **Design system:** kept violet; added §7.11–§7.14 composing existing tokens only (no new hex).

**Decisions / notes**
- Category icons are a client-side name→emoji map in `config.js` (Categories sheet has no icon column) — no schema change.
- Hashtag donut counts a multi-tag entry under every tag; untagged → "ไม่มีแท็ก".
- Trend month keys built with integer math (no TZ drift); entry filtering uses Bangkok-formatted month.
- After a mutation the header + totals refresh silently; the entries view keeps its own optimistic DOM so the Undo affordance survives.

**Not done / follow-up**
- Manual LINE/GitHub-Pages verification is the real test — cannot run here (LIFF needs the LINE app).
- `Line.gs` Flex cards untouched; no budgets/push/dark-mode (out of scope).
