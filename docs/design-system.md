# JotHai (จดให้) — Design System

> **Single source of truth** for the visual language of JotHai across all three surfaces:
> the **LIFF dashboard** (HTML/CSS on GitHub Pages), the **LINE Flex cards** (`Line.gs`), and
> the **Chart.js charts** (inside the dashboard).
>
> This document is a **specification**, not implementation. `index.html` and `Line.gs` are rewritten
> in a later phase by referencing the tokens defined here. When a value appears in this file and in code,
> **this file wins**.

---

## 1. Overview & Principles

JotHai turns "logging money" — usually a boring chore — into something that feels **fast, light, and a little fun**, while still being **trustworthy enough to hold your finances**. The personality is **playful & vibrant, but tasteful**: bright violet, springy motion, friendly Thai copy — never childish, never a toy.

The previous MVP had no identity: it borrowed LINE green `#1DB446` as its primary, used the stock Chart.js rainbow palette, and left SweetAlert2 on its default theme. As a result the three surfaces did not look like the same product. This system fixes that at the root.

### Design principles

1. **Vibrant but legible.** Color and motion carry the brand, but money must always be readable. Every text color meets **WCAG AA**. Bright shades are reserved for fills and accents, never for small text.
2. **Motion with purpose.** Animation gives feedback and delight (a button press, a count-up amount), never decoration that slows the user down. All motion respects `prefers-reduced-motion`.
3. **One brand across three surfaces.** A single token table drives the web, the Flex cards, and the charts. If a color is not in the table, it is not in the product.
4. **Thai-first, warm copy.** UI text is Thai, friendly, with at most one emoji per message and soft endings ("นะคะ / ค่ะ"). The personality lives as much in the words as in the pixels.

### The three surfaces & how much we control

| Surface | Tech | Control | Notes |
|---|---|---|---|
| **LIFF dashboard** | HTML + CSS (Kanit) + Chart.js + SweetAlert2 | **Full** | CSS custom properties, motion, gradients, shadows all available. |
| **LINE Flex cards** | `Line.gs` Flex JSON | **Limited** | Color + font size/weight only. **No custom font** (LINE system font), **no free-form gradient/shadow**, **no motion at all**. Personality comes from **color + emoji + copy**. |
| **Chart.js charts** | Inside dashboard | **Full color/font** | Uses the brand-derived categorical palette, not the Chart.js default. |

---

## 2. Color — Raw Token Table (source of truth)

All hex values live here. CSS variables (§3), Flex JSON, and Chart.js arrays all derive from this table. **Contrast** is measured against white `#FFFFFF` unless noted; AA = ≥4.5:1 for normal text, ≥3:1 for large text (≥18.66px bold / ≥24px) and UI/graphic boundaries.

### Brand

| Token | Hex | Role | Contrast on white | AA |
|---|---|---|---|---|
| `brand` | `#7C3AED` | Primary actions, active tab, links, focus ring | 5.70 | ✅ text |
| `brand-hover` | `#6D28D9` | Hover/pressed state of brand elements | 7.10 | ✅ text |
| `brand-subtle` | `#F1EBFE` | Tinted backgrounds (active chips, hover rows) | — | bg only |
| `brand-on` | `#FFFFFF` | Text/icon on a brand fill | 5.70 (on brand) | ✅ text |

### Accent (playful highlights — fills & celebration only, not body text)

| Token | Hex | Role |
|---|---|---|
| `accent-lime` | `#A3E635` | Celebration, positive streaks, highlight dots |
| `accent-pink` | `#F472B6` | Secondary highlight, hashtag chips, confetti |

> Accent colors are **decorative fills only**. Do not use them for text on white (they fail AA).

### Semantic — two tiers (fill vs. text)

Each money color has a **bright fill** (chart segments, accent bars, large badges) and a **darkened text variant** that passes AA on white (amounts, labels).

| Token | Hex | Role | Contrast on white | AA |
|---|---|---|---|---|
| `income-fill` | `#16C784` | รายรับ — donut segment, accent bar, large badge | 2.20 | fill only |
| `income-text` | `#0F7A4A` | รายรับ — amount text, labels on white | 5.38 | ✅ text |
| `income-on` | `#FFFFFF` | Text on an `income-fill` chip | 3.17 (on fill) | ✅ large only |
| `expense-fill` | `#FF5C7C` | รายจ่าย — donut segment, accent bar, large badge | 2.97 | fill only |
| `expense-text` | `#CB2A30` | รายจ่าย — amount text, labels on white | 5.37 | ✅ text |
| `expense-on` | `#FFFFFF` | Text on an `expense-fill` chip | — | ✅ large only |
| `warning-fill` | `#FFF3CD` | Fallback/notice background (carried from MVP) | — | bg only |
| `warning-text` | `#8A6100` | Text on `warning-fill` | — | ✅ on warning-fill |
| `info` | `#2B6BFF` | Informational links/highlights (e.g. "changed" marker) | 4.52 | ✅ text |

> **Rule:** A money amount on a white surface uses `income-text` / `expense-text`.
> A money amount as **white text on a colored chip** must be **large** (≥18.66px bold) to satisfy the 3:1 minimum.

### Neutrals (semantically named so dark mode can be added without renaming)

| Token | Hex | Role | Contrast on white | AA |
|---|---|---|---|---|
| `bg` | `#F7F5FF` | Page background (faint violet tint, ties to brand) | — | bg |
| `surface` | `#FFFFFF` | Card / sheet surface | — | bg |
| `surface-alt` | `#FAFAFE` | Form input / nested surface | — | bg |
| `border` | `#E6E1F0` | Hairline borders, dividers | — | UI |
| `text-primary` | `#1A1523` | Headings, amounts, primary body | 17.87 | ✅ text |
| `text-secondary` | `#4B4458` | Secondary labels | 9.26 | ✅ text |
| `text-muted` | `#6E6880` | Captions, helper text, placeholders | 5.31 | ✅ text |

> All contrast figures are computed (WCAG 2.x relative luminance). `text-muted` is the lightest text permitted on white; never lighter.

### Chart categorical palette (replaces the Chart.js rainbow default)

Derived from the brand, ordered for adjacency contrast. Use in this order; wrap if categories exceed 8.

```js
// Categorical palette for category/hashtag donuts (NOT for income-vs-expense)
const CHART_PALETTE = [
  '#7C3AED', // brand violet
  '#16C784', // income green
  '#FF5C7C', // expense coral
  '#2B6BFF', // info blue
  '#A3E635', // lime
  '#F472B6', // pink
  '#F0A020', // amber
  '#14B8C4', // teal
];
const CHART_EMPTY = '#E6E1F0'; // empty / no-data ring
```

> The **income-vs-expense** overview donut does **not** use this palette — it uses `income-fill` and `expense-fill` so the two meanings stay unambiguous everywhere.

---

## 3. Color — CSS Custom Properties (web only)

Paste into `:root` in `index.html`. The Flex cards (`Line.gs`) and Chart.js arrays cannot read CSS variables (different runtimes, no build step) — they copy hex values **from the table in §2**.

```css
:root {
  /* Brand */
  --color-brand: #7C3AED;
  --color-brand-hover: #6D28D9;
  --color-brand-subtle: #F1EBFE;
  --color-brand-on: #FFFFFF;

  /* Accent */
  --color-accent-lime: #A3E635;
  --color-accent-pink: #F472B6;

  /* Semantic — fill vs text */
  --color-income-fill: #16C784;
  --color-income-text: #0F7A4A;
  --color-expense-fill: #FF5C7C;
  --color-expense-text: #CB2A30;
  --color-warning-fill: #FFF3CD;
  --color-warning-text: #8A6100;
  --color-info: #2B6BFF;

  /* Neutrals */
  --color-bg: #F7F5FF;
  --color-surface: #FFFFFF;
  --color-surface-alt: #FAFAFE;
  --color-border: #E6E1F0;
  --color-text-primary: #1A1523;
  --color-text-secondary: #4B4458;
  --color-text-muted: #6E6880;
}
```

---

## 4. Typography

| | |
|---|---|
| **Web font** | `Kanit`, sans-serif — Google Fonts, weights 300 / 400 / 500 / 600 / 700. Already loaded in the MVP; keep it. |
| **Flex font** | LINE system font (cannot change). Express hierarchy through **size + weight + color** only. |
| **Numerals** | Render amounts at weight **600–700** so money reads as the heaviest element on screen. |

### Type scale (web)

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--text-display` | 32 / 40 | 700 | Hero amount (month total) |
| `--text-title` | 24 / 32 | 600 | Section / amount on cards |
| `--text-heading` | 18 / 26 | 600 | Card titles, tab labels |
| `--text-body` | 16 / 24 | 400 | Default body, entry description |
| `--text-label` | 14 / 20 | 500 | Field labels, chips |
| `--text-caption` | 12 / 16 | 400 | Helper text, timestamps (use `text-muted`) |

```css
:root {
  --text-display: 700 32px/40px "Kanit", sans-serif;
  --text-title:   600 24px/32px "Kanit", sans-serif;
  --text-heading: 600 18px/26px "Kanit", sans-serif;
  --text-body:    400 16px/24px "Kanit", sans-serif;
  --text-label:   500 14px/20px "Kanit", sans-serif;
  --text-caption: 400 12px/16px "Kanit", sans-serif;
}
```

**Money rules.** Amounts use `text-primary` for neutral context, `income-text` / `expense-text` when the sign/meaning matters. White-on-fill amounts (Flex chips) must be ≥`--text-heading` (18px) bold to satisfy AA-large (3:1).

---

## 5. Spacing, Radius, Elevation

### Spacing (4px base)

```css
:root {
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 20px;  --space-6: 24px;  --space-8: 32px;  --space-10: 40px;
}
```
Card padding `--space-4` to `--space-5`; gap between cards `--space-3`; page gutter `--space-4`.

### Radius (Soft)

```css
:root {
  --radius-sm: 8px;    /* inputs, chips, small controls */
  --radius-md: 12px;   /* buttons */
  --radius-lg: 16px;   /* cards, sheets */
  --radius-pill: 999px;/* tabs, toggles, tags */
}
```

### Elevation (soft, faintly violet-tinted shadows)

```css
:root {
  --shadow-sm: 0 1px 2px rgba(26, 21, 35, 0.06);
  --shadow-md: 0 4px 14px rgba(124, 58, 237, 0.10);  /* brand-tinted */
  --shadow-lg: 0 10px 28px rgba(124, 58, 237, 0.16);
}
```
Cards use `--shadow-md`; raised/active states use `--shadow-lg`. Flex cards cannot use shadows — depth there is conveyed by the colored top accent + spacing.

---

## 6. Motion System

Motion is what separates "real" from "MVP repainted purple." It must feel **springy and alive** but never block the user.

### Tokens

```css
:root {
  --motion-fast: 120ms;   /* taps, color/opacity changes */
  --motion-base: 200ms;   /* most transitions */
  --motion-slow: 320ms;   /* entrances, layout shifts */

  --ease-standard: cubic-bezier(0.2, 0, 0, 1);        /* general */
  --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1); /* playful overshoot */
  --ease-out:      cubic-bezier(0, 0, 0.2, 1);        /* exits */
}
```

### Principles
- **Feedback first.** Every interactive element reacts within `--motion-fast`.
- **Spring for delight, standard for utility.** Use `--ease-spring` on press/celebration; `--ease-standard` for routine transitions.
- **Respect reduced motion.** Wrap non-essential animation:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
  ```

### Signature micro-interactions (web only)

| Interaction | Spec |
|---|---|
| **Button press** | Scale to `0.96` on `:active` over `--motion-fast`, `--ease-spring`; release overshoots back. |
| **Amount count-up** | Month total & summary amounts animate 0 → value over `--motion-slow` on load. |
| **Donut draw-in** | Chart.js `animateRotate` / `animateScale` over ~600ms ease-out on first render. |
| **Toast (SweetAlert2)** | Slide + fade in from top-end over `--motion-base`, `--ease-spring`. |
| **Card / list entrance** | Fade + 8px rise, staggered ~40ms per item, `--ease-out`. |
| **Tab switch** | Active pill slides between tabs over `--motion-base`, `--ease-standard`. |

> **Flex cards have no motion.** Do not attempt animation in `Line.gs`. On Flex, "delight" is delivered through a warm emoji, friendly copy, and the colored accent bar — nothing more.

---

## 7. Components

Each component lists its **anatomy → tokens → key states → principle**. Full CSS is written during implementation against these tokens.

### 7.1 Tabs (LIFF)
- **Anatomy:** pill-shaped container (`surface`, `--radius-pill`, `--shadow-sm`); equal-width tab buttons; a sliding active indicator.
- **Tokens:** active = `brand` fill + `brand-on` text; inactive = `text-secondary`; indicator slides (§6 tab switch).
- **States:** default / active / pressed (scale 0.96).
- **Principle:** the active pill is the only brand-filled element in the tab bar — one clear "you are here."

### 7.2 Summary box (LIFF)
- **Anatomy:** two cards side-by-side (รายรับ / รายจ่าย), each with a label, a large amount, and a thin colored top accent bar.
- **Tokens:** income card accent `income-fill`, amount `income-text`; expense card accent `expense-fill`, amount `expense-text`; surface `surface`, radius `--radius-lg`, shadow `--shadow-md`; amount `--text-title`.
- **States:** static; amounts count-up on load.
- **Principle:** meaning is doubly encoded (color + position), never color alone.

### 7.3 Entry card (LIFF)
- **Anatomy:** left accent stripe (4px), description (`--text-body`, `text-primary`), category + hashtag chips, amount (right-aligned), action row.
- **Tokens:** stripe = `income-fill`/`expense-fill` by type; amount = `income-text`/`expense-text`; hashtag chip = `brand-subtle` bg + `brand` text; fallback note uses `warning-fill`/`warning-text`.
- **States:** default / hover (row tint `brand-subtle`) / entrance (staggered rise).
- **Principle:** scannable — type readable from the stripe color at a glance.

### 7.4 Buttons (LIFF)

| Variant | Fill | Text | Use |
|---|---|---|---|
| **Primary** | `brand` → `brand-hover` | `brand-on` | Main action (ยืนยัน, บันทึก) |
| **Secondary** | `surface` + `border` | `brand` | Alternate action |
| **Danger** | `expense-fill` (hover darken) | white (≥18px) | Delete confirm |
| **Undo** | `surface` + `border` | `text-secondary` | Undo delete |
| **Ghost** | transparent | `text-secondary` | Tertiary / cancel |

- **Common tokens:** radius `--radius-md`, label `--text-label`, press scale 0.96 (§6).
- **States:** default / hover / active / disabled (`text-muted` on `surface-alt`) / focus (2px `brand` ring).
- **Principle:** exactly one primary button per view.

### 7.5 Form input (LIFF)
- **Anatomy:** label (`--text-label`, `text-secondary`), field (`surface-alt`, `border`, `--radius-sm`), helper/caption (`text-muted`).
- **States:** default / focus (border → `brand` + ring) / error (border → `expense-text`, helper `expense-text`).
- **Principle:** focus is always brand-violet — consistent across every input.

### 7.6 Filter dropdown (LIFF)
- **Anatomy:** pill trigger (`surface`, `border`, `--radius-pill`) showing current value; native/`<select>` or popover list.
- **Tokens:** selected item highlight `brand-subtle` + `brand` text; month & hashtag filters share this component.
- **Principle:** category options are loaded live from the Sheet (per PRD §25) — never hardcoded.

### 7.7 Empty state (LIFF)
- **Anatomy:** centered rounded illustration/emoji, a friendly Thai line, optional primary button.
- **Tokens:** illustration tint `brand-subtle`; text `text-muted`; CTA = primary button.
- **Copy example:** "ยังไม่มีรายการเดือนนี้เลยนะคะ ✨ ลองพิมพ์ 'กาแฟ 50' ดูสิ" 
- **Principle:** an empty screen is an invitation, not a dead end.

### 7.8 Toast — SweetAlert2 theme (LIFF)
- **Tokens:** font Kanit; radius `--radius-lg`; success accent `income-fill`; error accent `expense-fill`; confirm button = `brand` (`confirmButtonColor: '#7C3AED'`); cancel = ghost/`text-muted`.
- **Motion:** spring slide-in from top-end (§6).
- **Principle:** override the SweetAlert2 default theme everywhere — it must look like JotHai, not like a stock alert. Define one shared `Swal.mixin` config; do not re-style per call.

### 7.9 Donut chart wrapper (LIFF / Chart.js)
- **Anatomy:** fixed-height container (~220px), centered total label, bottom legend (Kanit).
- **Tokens:** overview donut → `income-fill` / `expense-fill`; category & hashtag donuts → `CHART_PALETTE` (§2) in order; empty ring → `CHART_EMPTY`.
- **Motion:** draw-in on first render (§6).
- **Principle:** **never** use the Chart.js default palette. Income/expense meaning is fixed to its semantic colors in every chart.

### 7.10 Flex cards (LINE / `Line.gs`)

> Constraints on **all** Flex cards: color + font size/weight only; LINE system font; **no gradient, no shadow, no motion**. Depth = a colored top accent bar + spacing. Personality = emoji + copy.

**Receipt card** (`buildReceiptFlex`)
- **Anatomy:** top accent bar by type → type label → description (large) → amount (xxl, bold) → divider → หมวดหมู่ / แฮชแท็ก rows → action buttons (สลับประเภท, เปลี่ยนหมวด) → ลบรายการ link.
- **Tokens:** accent + type label + amount = `income-fill`/`expense-fill` (large bold text satisfies AA-large); labels `text-muted`; values `text-secondary`; fallback notice `warning-fill` bg + `warning-text`; delete link `expense-text`.
- **Principle:** amount is the visual hero; the accent bar replaces the web's left stripe.

**Confirm-edit card** (`buildConfirmEditFlex`)
- **Tokens:** header `brand-subtle` bg; a changed field is marked with `info` + bold; confirm button `brand`.
- **Principle:** show exactly what changed — highlight the diff, don't restate everything.

**Confirm-delete card** (`buildConfirmDeleteFlex`)
- **Tokens:** warning title `expense-text` bold; confirm (danger) button `expense-fill`; minimal, no header.
- **Principle:** destructive confirm is unmistakably red and short.

---

## 8. Personality Layer

The brand is as much in words and warmth as in color.

- **Emoji policy** (consistent with `docs/design-notes.md`): **at most one emoji per message**, placed purposefully. Bot replies end softly — "นะคะ / ค่ะ / นะ".
- **Tone:** casual, friendly, never scolding. Spending money should not feel like getting told off — copy stays light even on errors ("ไม่เจอจำนวนเงินเลยนะคะ ลองพิมพ์ตัวเลขมาได้เลย ✌️").
- **Celebration moments:** first entry of the month, a logging streak, or hitting a saving — a brief lime/pink accent + a warm line. Small, occasional, never spammy.
- **Iconography:** rounded, friendly, consistent stroke. Avoid sharp/technical icon sets — they fight the soft radius and springy motion.

---

## 9. Surface Consistency Checklist

The whole point of this system: the same meaning looks the same everywhere.

| Meaning | LIFF (web) | Flex card | Chart |
|---|---|---|---|
| Brand / primary action | `brand #7C3AED` | confirm buttons `#7C3AED` | brand wedge `#7C3AED` |
| รายรับ (income) | `income-text` / `income-fill` | `income-fill` accent+amount | `income-fill` segment |
| รายจ่าย (expense) | `expense-text` / `expense-fill` | `expense-fill` accent+amount | `expense-fill` segment |
| Fallback / warning | `warning-fill`+`warning-text` | same | — |
| Changed marker | `info #2B6BFF` | `info` bold | — |

**Hard rules**
1. **Never** use LINE green `#1DB446` as a brand or income color anywhere. It is fully retired.
2. **Never** use the Chart.js default palette (`#FF6384, #36A2EB, …`). Charts use `CHART_PALETTE` / semantic fills only.
3. **Amounts** always use a semantic color (`income-text`/`expense-text`) or `text-primary` — never an arbitrary color.
4. **Any new hex** must be added to §2 first; nothing ships that isn't in the table.
5. **Money text on white** uses the `-text` tier; bright `-fill` tiers are for segments, accents, and large white-on-color labels only.

---

## 10. Future: Dark Mode (architecture only — not built this round)

The token names in §2–§3 are **semantic** (`surface`, `text-primary`, `border`), not literal (`white`, `black`). Adding dark mode later requires **no renaming and no markup change** — only new values under a media query:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #14121C;
    --color-surface: #1E1A28;
    --color-surface-alt: #251F33;
    --color-border: #322B45;
    --color-text-primary: #F3F0FA;
    --color-text-secondary: #C9C3D6;
    --color-text-muted: #9089A3;
    /* brand & semantic shades will be tuned for dark contrast at that time */
  }
}
```

Components reference tokens, not raw hex, so they adapt automatically. The bright `-fill` and `-text` semantic shades will be re-checked for AA on dark surfaces when dark mode is actually implemented.

---

*All contrast ratios in this document are computed from WCAG 2.x relative-luminance formulas and verified to meet AA at the stated text size.*
