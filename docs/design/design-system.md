# JotHai (จดให้) — Design System

> **Single source of truth** for the visual language of JotHai across all three surfaces:
> the **LIFF dashboard** (HTML/CSS on GitHub Pages), the **LINE Flex cards** (`Line.gs`), and
> the **Chart.js charts** (inside the dashboard).
>
> This document is a **specification**, not implementation. `index.html` is a shell with split
> `css/styles.css` and `js/` modules referencing the tokens defined here. When a value appears in
> this file and in code, **this file wins**.
>
> **Theme (v3 — Dark Glassmorphic).** This system replaces the earlier light-violet theme. The visual
> direction was designed in `docs/design/JotHai.dc.html` (Claude Design) and adopted wholesale: a
> deep-violet page under ambient gradient orbs, frosted-glass cards, teal/coral money colors, and Sora
> numerals. All contrast ratios below are computed against the page background `#181031` (WCAG 2.x
> relative luminance) and verified to meet AA at the stated text size.

---

## 1. Overview & Principles

JotHai turns "logging money" — usually a boring chore — into something that feels **fast, light, and a little premium**, while still being **trustworthy enough to hold your finances**. The personality is **calm, modern, glassy**: a dark violet field, soft glowing ambient color, teal/coral money, friendly Thai copy — never childish, never a toy.

### Design principles

1. **Vibrant but legible.** Color and glow carry the brand, but money must always be readable. Every text color meets **WCAG AA** on the dark surface. Bright shades are used for money and accents; muted text tiers keep a minimum AA contrast (never fainter than `text-muted`).
2. **Depth through glass, not motion.** Frosted-glass surfaces and ambient orbs create depth. The background orbs are **static** (no float animation) — a deliberate performance choice for mobile LIFF webviews. Motion is reserved for feedback (button press, count-up, chart draw-in) and respects `prefers-reduced-motion`.
3. **One brand across three surfaces.** A single token table drives the web, the Flex cards, and the charts. If a color is not in the table, it is not in the product.
4. **Thai-first, warm copy.** UI text is Thai, friendly, with at most one emoji per message and soft endings ("นะคะ / ค่ะ"). The personality lives as much in the words as in the pixels.

### The three surfaces & how much we control

| Surface | Tech | Control | Notes |
|---|---|---|---|
| **LIFF dashboard** | HTML + CSS (Kanit + Sora) + Chart.js + SweetAlert2 | **Full** | CSS custom properties, glass, gradients, shadows, motion all available. Renders on the **dark** `#181031` field. |
| **LINE Flex cards** | `Line.gs` Flex JSON | **Limited** | Color + font size/weight only. Renders on LINE's **white** chat background — so money uses a **darker text tier** for AA on white. No custom font, no gradient/shadow, no motion. |
| **Chart.js charts** | Inside dashboard | **Full color/font** | Brand-derived categorical palette + semantic teal/coral. Text/legend/axis tuned for the dark surface. |

> **Two backgrounds, two treatments.** The dashboard is dark, so the bright teal/coral money colors read directly as text. Flex cards sit on white, so they use a darker teal/coral text tier. Meaning (income = teal family, expense = coral family) stays consistent; only the exact shade differs by surface.

---

## 2. Color — Raw Token Table (source of truth)

All hex values live here. CSS variables (§3), Flex JSON, and Chart.js arrays all derive from this table. Contrast is measured against the page background `#181031` unless noted; AA = ≥4.5:1 for normal text, ≥3:1 for large text (≥18.66px bold / ≥24px) and UI/graphic boundaries.

### Base & brand

| Token | Hex | Role | Contrast on `#181031` | AA |
|---|---|---|---|---|
| `bg` | `#181031` | Page background (deep violet) | — | bg |
| `brand` | `#7C3AED` | Brand fills (gradient stop), links base | — | fill |
| `brand-hover` | `#6D28D9` | Gradient stop / pressed | — | fill |
| `brand-light` | `#B79BFF` | Brand on dark: focus ring, active underline, accents | 7.90 | ✅ text |
| `brand-subtle` | `rgba(183,155,255,0.14)` | Hover/active row tint on dark | — | bg only |
| `brand-on` | `#FFFFFF` | Text/icon on a brand-gradient fill | — | ✅ |

**Brand gradient** (active tab/segment, primary button): `linear-gradient(140deg, #B79BFF, #7C3AED)` with glow `0 8px 20px -10px rgba(183,155,255,0.9)`.

### Ambient orbs (decorative background, `aria-hidden`)

Static radial-gradient blobs behind the app, blurred 90–110px, opacity ~0.5. Not for text.

| Orb | Color |
|---|---|
| orb-1 (top-left) | `#FF7A3D` (orange) |
| orb-2 (mid-right) | `#E0409A` (pink) |
| orb-3 (bottom) | `#6D28D9` (violet) |

### Glass surfaces

| Token | Value | Role |
|---|---|---|
| `surface` | `linear-gradient(155deg, rgba(255,255,255,.10), rgba(255,255,255,.03) 55%)` | Card / sheet fill (with `backdrop-filter: blur(28px)`) |
| `surface-alt` | `rgba(255,255,255,.05)` | Inputs, pill tracks (tabs/toggle background) |
| `glass-border` | `rgba(255,255,255,.13)` | Card border |
| `border` | `rgba(255,255,255,.10)` | Hairline dividers |
| `glass-shadow` | `0 24px 60px -30px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.15)` | Card elevation |

### Semantic — money (teal / coral)

On the **dark dashboard**, the bright fill also serves as the amount text (AA-large or better on `#181031`). On **white Flex cards**, use the `-flex-text` tier.

| Token | Hex | Role | Contrast on `#181031` | AA |
|---|---|---|---|---|
| `income-fill` | `#2DD4BF` | รายรับ — donut segment, accent, amount text (dark surface) | 9.75 | ✅ text |
| `expense-fill` | `#FB7185` | รายจ่าย — donut segment, accent, entry stripe | 6.74 | ✅ text |
| `expense-text` | `#FB8FA3` | รายจ่าย — amount text on dark (softer coral) | 8.26 | ✅ text |
| `income-flex-text` | `#0D9488` | รายรับ text on **white** Flex cards | — | ✅ on white |
| `expense-flex-text` | `#E11D48` | รายจ่าย text on **white** Flex cards | — | ✅ on white |
| `warning-fill` | `rgba(240,160,32,0.14)` | Fallback/notice background (dark) | — | bg only |
| `warning-text` | `#F0C060` | Text on `warning-fill` (dark) | — | ✅ |
| `info` | `#6D8BFF` | Informational / "changed" marker (dark) | — | ✅ large |

> **Rule:** income = teal family, expense = coral family, on **every** surface. Only the exact shade shifts (dashboard vs white Flex card).

### Text tiers (dark)

Opacity was raised above the source mockup's `.45/.5/.55` so the muted tier still passes AA.

| Token | Value | Role | Contrast on `#181031` | AA |
|---|---|---|---|---|
| `text-primary` | `#EFEAFF` | Headings, amounts, primary body | 15.45 | ✅ text |
| `text-secondary` | `rgba(235,230,255,.82)` | Secondary labels, body | 10.23 | ✅ text |
| `text-muted` | `rgba(235,230,255,.62)` | Captions, helper text, %-labels | 6.33 (5.83 on glass) | ✅ text |

> `text-muted` at `.62` is the lightest text permitted; never fainter. (The mockup's `.45` would fail AA for body text — hence the bump.)

### Chart categorical palette (category/hashtag donuts — NOT income-vs-expense)

Dark-theme set from the mockup, ordered for adjacency contrast. Also used to **tint the emoji icon chips** (§7.13). Wrap if categories exceed 8.

```js
const CHART_PALETTE = [
  '#6D8BFF', // blue
  '#34D399', // green
  '#F59E0B', // amber
  '#FB7185', // coral
  '#C084FC', // purple
  '#F472B6', // pink
  '#818CF8', // indigo
  '#2DD4BF', // teal
];
const CHART_EMPTY = 'rgba(255,255,255,0.08)'; // empty / no-data ring
```

> The **income-vs-expense** overview donut does **not** use this palette — it uses `income-fill` (teal) and `expense-fill` (coral) so the two meanings stay unambiguous everywhere.

---

## 3. Color — CSS Custom Properties (web only)

Defined in `:root` in `css/styles.css`. Flex cards (`Line.gs`) and Chart.js arrays copy hex from §2 (different runtimes, no build step).

```css
:root {
  /* Base / brand */
  --color-bg: #181031;
  --color-brand: #7C3AED;
  --color-brand-hover: #6D28D9;
  --color-brand-light: #B79BFF;
  --color-brand-subtle: rgba(183, 155, 255, 0.14);
  --color-brand-on: #FFFFFF;
  --brand-gradient: linear-gradient(140deg, #B79BFF, #7C3AED);
  --brand-glow: 0 8px 20px -10px rgba(183, 155, 255, 0.9);

  /* Glass */
  --color-surface: linear-gradient(155deg, rgba(255,255,255,.10), rgba(255,255,255,.03) 55%);
  --color-surface-alt: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.13);
  --glass-shadow: 0 24px 60px -30px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.15);
  --color-border: rgba(255, 255, 255, 0.10);

  /* Money */
  --color-income-fill: #2DD4BF;
  --color-income-text: #2DD4BF;
  --color-expense-fill: #FB7185;
  --color-expense-text: #FB8FA3;
  --color-warning-fill: rgba(240, 160, 32, 0.14);
  --color-warning-text: #F0C060;
  --color-info: #6D8BFF;

  /* Text */
  --color-text-primary: #EFEAFF;
  --color-text-secondary: rgba(235, 230, 255, 0.82);
  --color-text-muted: rgba(235, 230, 255, 0.62);
}
```

---

## 4. Typography

| | |
|---|---|
| **Number/amount font** | `Sora` (Google Fonts, weights 400–800) — tabular numerals for money, month label, section titles. |
| **Thai / general font** | `Kanit` (weights 300–700) — all Thai text, labels, body. |
| **Flex font** | LINE system font (cannot change). Hierarchy through size + weight + color only. |
| **Numerals** | Amounts render in **Sora** at weight 600–700 so money reads as the heaviest, most distinct element. |

`--font-num: "Sora", "Kanit", sans-serif;` (Sora for Latin digits, Kanit fallback for any Thai in the same run.)

### Type scale (web)

| Token | Size / line-height | Weight | Font | Use |
|---|---|---|---|---|
| `--text-display` | 32 / 40 | 700 | Kanit | (reserved) |
| `--text-title` | 24 / 32 | 600 | Sora | Amount on cards |
| `--text-heading` | 18 / 26 | 600 | Kanit | Card titles |
| `--text-body` | 16 / 24 | 400 | Kanit | Default body, entry description |
| `--text-label` | 14 / 20 | 500 | Kanit | Field labels, chips |
| `--text-caption` | 12 / 16 | 400 | Kanit | Helper text, timestamps (`text-muted`) |

Specific number treatments: summary strip amount `700 20px Sora`; month label `700 18px Sora`; donut center value `700 22px Sora`; section title `700 16px Sora`.

---

## 5. Spacing, Radius, Elevation

### Spacing (4px base)

```css
--space-1: 4px;  --space-2: 8px;  --space-3: 12px;  --space-4: 16px;
--space-5: 20px; --space-6: 24px; --space-8: 32px;  --space-10: 40px;
```
Card padding `--space-5`; gap between cards `--space-3`–`--space-4`; page gutter `--space-4`.

### Radius (soft, larger than v2)

```css
--radius-sm: 8px;     /* inputs, chips */
--radius-md: 12px;    /* buttons, month arrows */
--radius-chip: 11px;  /* category icon chips */
--radius-lg: 24px;    /* cards, sheets (mockup) */
--radius-pill: 999px; /* tabs, toggles */
```
Entry cards use `20px`. 

### Elevation

Glass cards use `--glass-shadow` (deep drop + inner top highlight). Entry cards use a slightly lighter `--glass-shadow-sm`. Brand-filled controls carry `--brand-glow`. Flex cards convey depth via a colored top accent bar + spacing (no shadow available).

---

## 6. Motion System

Motion delivers feedback and delight; it never blocks the user. **Background orbs are static** — the only ambient element, and it does not animate (perf on mobile webview).

### Tokens

```css
--motion-fast: 120ms;  --motion-base: 200ms;  --motion-slow: 320ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-out:      cubic-bezier(0, 0, 0.2, 1);
```

### Signature micro-interactions (web only)

| Interaction | Spec |
|---|---|
| **Button / tab press** | Scale to `0.96` on `:active`, `--motion-fast`, `--ease-spring`. |
| **Amount count-up** | Summary amounts animate 0 → value over `--motion-slow` on load/change. |
| **Donut draw-in** | Chart.js `animateRotate` / `animateScale` ~600ms ease-out on first render. |
| **Toast (SweetAlert2)** | Slide + fade in from top-end over `--motion-base`, `--ease-spring`. |
| **Card / list entrance** | Fade + 8px rise, staggered ~40ms per item, `--ease-out`. |
| **Tab / segment switch** | Active gradient pill slides between positions over `--motion-base`. |

Reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```
Orbs need no reduced-motion guard — they are already static.

> **Flex cards have no motion.** "Delight" there is a warm emoji, friendly copy, and the colored accent bar — nothing more.

---

## 7. Components

Each component lists **anatomy → tokens → key states → principle**.

### 7.0 Ambient background + brand header (LIFF)
- **Orbs:** three static blurred radial gradients in a `position:fixed` `aria-hidden` layer (`z-index:0`) behind `.app` (`z-index:1`).
- **Brand header:** circular logo `images/profile3.png` (40px) + "JotHai" (Sora 700) + subtitle "สรุปการเงิน" (`text-muted`). No window controls — LINE provides its own ✕ in the LIFF chrome.

### 7.1 Tabs (LIFF)
- **Anatomy:** pill-shaped glass container (`surface-alt` + `border`, blur); four equal-width buttons; a sliding **gradient** indicator.
- **Tokens:** active indicator = `--brand-gradient` + `--brand-glow` + `brand-on` text; inactive = `text-secondary`. Indicator width hard-coded `/4`; slides via `translateX(idx*100%)`.
- **Principle:** the gradient pill is the only brand-filled element — one clear "you are here."

### 7.2 Summary strip (LIFF, inside month-nav header)
- Three cells (รายรับ / รายจ่าย / คงเหลือ) in a `grid`, dividers `rgba(255,255,255,.1)`. Amounts `700 20px Sora`: รายรับ `income-fill`, รายจ่าย `expense-text`, คงเหลือ `income-fill` when ≥0 else `expense-text`.
- Amounts count-up on load; strip dims to opacity 0.4 while a fetch is in flight.

### 7.3 Entry card + day-group header (LIFF)
- **Anatomy:** glass card, radius 20px, `overflow:hidden`; a **4px left accent stripe via `::before`** (border-left would clip the radius) colored `income-fill`/`expense-fill` by type; description (`text-body`, primary), category label, amount (Sora, right-aligned), action row.
- **Day-group header:** date label `700 13.5px Kanit` (`text-secondary`); daily subtotal (▲ รายจ่าย / ▼ รายรับ) `700 14px Sora`, `expense-text`/`income-text`.
- **Principle:** type is readable from the stripe color at a glance; day total anchors each group.

### 7.4 Buttons (LIFF)

| Variant | Fill | Text | Use |
|---|---|---|---|
| **Primary** (`.btn`) | `--brand-gradient` + glow | `brand-on` | Main action (บันทึก) |
| **Secondary** (`.btn-edit`) | `rgba(255,255,255,.05)` + `glass-border` | `text-primary` | Edit |
| **Danger** (`.btn-delete`) | `rgba(251,113,133,.14)` + coral border | `expense-text` | Delete |
| **Undo** (`.btn-undo`) | glass + border | `text-secondary` | Undo delete |
| **Ghost** (`.btn-ghost`) | transparent | `text-secondary` | Cancel |

- Radius `--radius-md`; press scale 0.96; `.btn-small` enforces `min-height: 44px` (a11y touch target, superseding padding-implied size).

### 7.5 Form input (LIFF)
- Field `rgba(255,255,255,.05)` + `glass-border`, text `text-primary`; `<select>` options set `background:#241a3d` so the native menu is dark. Focus → `brand-light` border + 2px `brand-subtle` ring.

### 7.6 Filter dropdown (LIFF)
- Category options loaded **live** from the Sheet (PRD §25) — never hardcoded. Native `<select>` styled per 7.5.

### 7.7 Empty state (LIFF)
- Centered mascot image + a friendly Thai line (`text-muted`). Copy example: "ยังไม่มีรายการในมุมมองนี้เลยนะคะ ✨". An empty screen is an invitation, not a dead end.

### 7.8 Toast — SweetAlert2 theme (LIFF)
- `.jothai-swal`: font Kanit, radius `--radius-lg`, **dark popup** `#201835` + `glass-border`, title/text `text-primary`; success accent `income-fill`, error accent `expense-fill`; confirm button `brand` (`#7C3AED`). Spring slide-in.
- **Principle:** one shared `Swal.mixin`; never the stock white theme; never re-style per call.

### 7.9 Donut chart wrapper (LIFF / Chart.js)
- Fixed-height container (240px), HTML `.chart-center` overlay, optional bottom legend (Kanit, `text-secondary`).
- Overview donut → `income-fill`/`expense-fill`; category/hashtag donuts → `CHART_PALETTE`; empty ring → `CHART_EMPTY`.
- **On-slice % labels:** top 10 slices by value show `%` in Sora/Kanit 600 12px. Label color auto-contrasts per slice via perceived luminance (`lum > 0.6` → dark ink `#1A1523`, else white). Plugin `chartjs-plugin-datalabels@2`, registered once in `charts.js`. Trend bars opt out.
- **Center-text alignment:** `.chart-center` tracks the doughnut's real center via `--chart-center-top`, set by an `afterLayout` plugin — stays centered whether or not a legend reserves bottom space.
- Chart defaults: `Chart.defaults.color = text-secondary` so all chart text reads on dark.

### 7.10 Flex cards (LINE / `Line.gs`)

> Constraints: color + font size/weight only; LINE system font; no gradient/shadow/motion. **Renders on white** — money uses the darker `-flex-text` tier. Depth = colored top accent bar + spacing. Personality = emoji + copy.

- **Receipt card:** top accent bar + type label + amount = `income-fill`/`expense-fill` (large bold satisfies AA-large on white); normal money text `income-flex-text`/`expense-flex-text`; labels `text-muted`; fallback notice `warning`; delete link coral-dark.
- **Confirm-delete card:** destructive confirm unmistakably coral, short.
- **Principle:** amount is the visual hero; the accent bar replaces the web's left stripe.

### 7.11 Month-nav header (LIFF)
- Row: `‹`/`›` glass arrow buttons (glass fill + border, radius `--radius-md`, `min 44px` touch target, disabled during fetch) flanking a centered tappable month label (Sora 700, Thai month + Buddhist-era year); below it the summary strip (§7.2). A visually-hidden `<input type="month">` sits behind the label for direct jumps.
- Month label updates **immediately** on tap (before the async fetch); spinner + dimmed strip during load; on error totals reset to ฿0 (never show stale month data). A `loadToken` guard discards out-of-order responses.

### 7.12 Segmented type toggle (LIFF)
- Two-way รายจ่าย / รายรับ pill, same mechanic as Tabs but two options, scoped to หมวดหมู่ & เทียบเดือน. Active segment = `--brand-gradient`; inactive `text-secondary`. Switching re-renders that view (no re-fetch).

### 7.13 Category / hashtag list row (LIFF)
- **Anatomy:** leading **emoji icon chip** → name → trailing amount + `%` caption.
- **Icon chip:** 40px, radius `--radius-chip`. **Keeps the category emoji** (`CATEGORY_ICONS`, `config.js`). The chip glass is tinted per-category: `categories.js` sets an inline `--row-tint` = `CHART_PALETTE[i]`, and the CSS fills the chip with `color-mix()` of that tint (30%→12% gradient + 28% border). Hashtag rows use `#`; the "ไม่มีแท็ก" bucket uses a neutral `—`.
- **Tokens:** name `text-primary` `--text-body`; amount `income-text`/`expense-text` (Sora) by the active type; percent `text-muted`; hover row tint `brand-subtle`.
- **Principle:** rows sorted high→low; the emoji is preserved (user-loved, category-legible) while absorbing the theme's per-category color coding.

### 7.14 Trend bar chart (LIFF / Chart.js)
- Six-month comparison honoring the type toggle. Bars use the active type's semantic fill (`expense-fill`/`income-fill`); the selected month at full opacity, prior months at ~0.45; dashed average line (`text-secondary`); axis/grid tuned for dark (`border` + `text-muted`).
- Bars grow on first render (~600ms); skipped under reduced motion. Never the Chart.js default palette.

---

## 8. Personality Layer

- **Emoji policy:** at most one emoji per message, placed purposefully. Bot replies end softly ("นะคะ / ค่ะ / นะ").
- **Tone:** casual, friendly, never scolding. Copy stays light even on errors ("ไม่เจอจำนวนเงินเลยนะคะ ลองพิมพ์ตัวเลขมาได้เลย ✌️").
- **Iconography:** the category emoji set is intentional brand vocabulary — keep it consistent across surfaces.

---

## 9. Surface Consistency Checklist

| Meaning | LIFF (dark web) | Flex card (white) | Chart |
|---|---|---|---|
| Brand / primary action | `--brand-gradient` | confirm `#7C3AED` | brand wedge `#7C3AED` (as palette) |
| รายรับ (income) | `income-fill #2DD4BF` | `income-fill` accent + `income-flex-text #0D9488` | `income-fill` segment |
| รายจ่าย (expense) | `expense-fill #FB7185` / `expense-text #FB8FA3` | `expense-fill` accent + `expense-flex-text #E11D48` | `expense-fill` segment |
| Fallback / warning | `warning-fill`+`warning-text` | white-card equivalent | — |
| Changed marker | `info #6D8BFF` | `info` bold | — |

**Hard rules**
1. **Never** use LINE green `#1DB446` anywhere. Fully retired. Income is **teal**, not green.
2. **Never** use the Chart.js default palette. Charts use `CHART_PALETTE` / semantic fills only.
3. **Amounts** always use a semantic color (`income`/`expense` family) or `text-primary` — never an arbitrary color. Amounts render in **Sora**.
4. **Any new hex** must be added to §2 first; nothing ships that isn't in the table.
5. **Money by surface:** dashboard (dark) uses the bright fill as text; Flex cards (white) use the `-flex-text` tier. Same meaning, surface-correct shade.
6. **Keyboard focus** is one global rule: every interactive element gets a 2px `brand-light` `:focus-visible` outline (2px offset). Defined once in `styles.css`.
7. **Muted text** never fainter than `text-muted` (`rgba(235,230,255,.62)`, ≥5.8:1). The source mockup's `.45–.55` tiers were raised to keep AA.

---

*All contrast ratios are computed from WCAG 2.x relative-luminance formulas against `#181031` and verified to meet AA at the stated text size.*
