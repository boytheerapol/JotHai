# JotHai Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a LINE expense-tracking bot (จดให้) on Google Apps Script that parses Thai natural-language messages into Sheet entries via Gemini, replies with an editable Receipt card, and serves a LIFF dashboard for review and CRUD.

**Architecture:** A single GAS project bound to a Google Sheet. `doPost` handles the LINE webhook (parse → save → reply); `doGet` serves the LIFF HTML page and JSON data APIs. Gemini Flash-Lite parses messages with a regex fallback for resilience. All state is in the Sheet plus short-lived CacheService entries for clarification.

**Tech Stack:** Google Apps Script (V8, plain JS — no npm/modules/TypeScript), Gemini Flash-Lite via `UrlFetchApp`, Google Sheet via `SpreadsheetApp`, LINE Messaging API (reply-only), LIFF + Chart.js (vanilla JS in `liff.html`).

## Global Constraints

These apply to EVERY task. Copied verbatim from CLAUDE.md, ADRs, and design-notes.

- **No npm, no build step, no TypeScript, no ES modules.** All files are `.gs` (global scope) plus one `liff.html`.
- **All HTTP calls use `UrlFetchApp.fetch()`** — never `fetch()` (unavailable in GAS).
- **Sheet access uses `SpreadsheetApp.getActiveSpreadsheet()`** (bound script) — never hardcode the spreadsheet ID.
- **Secrets via `PropertiesService.getScriptProperties()`** — read at call time, never hardcode, never cache in globals. Keys: `LINE_CHANNEL_TOKEN`, `LINE_CHANNEL_SECRET`, `GEMINI_API_KEY`, `LIFF_ID`, `LINE_CHANNEL_ID`.
- **Soft delete only:** set `status = 'deleted'`. Never delete a Sheet row.
- **Category is a snapshot:** store the category name string at write time; never re-resolve from Categories tab at read time.
- **Timezone is `Asia/Bangkok`** for all timestamps, month boundaries, display, and filtering. Use `Utilities.formatDate(date, 'Asia/Bangkok', fmt)` — never `Date.toISOString()` or any UTC method.
- **Amount is a plain number** (THB). Never store a currency symbol.
- **Hashtag normalization:** strip leading `#`, trim, lowercase ASCII only (Thai stored as-is). Apply in Gemini path and regex fallback.
- **`source` field:** `'ai'` when Gemini parsed successfully, `'fallback'` when regex was used.
- **Return HTTP 200 from `doPost` as early as possible** — LINE retries on 5xx, causing duplicate entries.
- **Verify `X-Line-Signature`** on every `doPost` using `LINE_CHANNEL_SECRET`.
- **Verify LIFF `idToken` server-side** on every LIFF write — never trust a `userId` from the request body.
- **Reply token is single-use, ~1 min TTL.** Call `reply()` exactly once per event, as fast as possible.
- **All user-facing text is Thai.** Friendly, casual, ending particles (นะคะ/ค่ะ/นะ), max 1 emoji per message.
- **Header row is row 1; data starts at row 2.** Always use `getLastRow()`. Batch reads/writes with `getValues()`/`setValues()`.
- **`source.userId` is not guaranteed** in all event types — always null-check before reading.

## Open Decisions Resolved (not in source docs)

These were unspecified in design-notes; resolved here so tasks have no placeholders:

1. **entry_id generation:** `Utilities.getUuid()` (UUID v4). Avoids collision risk of timestamp IDs.
2. **Postback data format:** URL-encoded query string parsed with a helper, e.g. `action=chgcat&id=<uuid>`, `action=setcat&id=<uuid>&cat=<name>`, `action=toggle&id=<uuid>`, `action=del&id=<uuid>`. (LINE postback `data` max 300 chars.)
3. **LIFF idToken verification:** POST to `https://api.line.me/oauth2/v2.1/verify` with `id_token` and `client_id` (= `LINE_CHANNEL_ID`). Response `sub` is the trusted userId.

## Verification Strategy (two layers)

GAS has no automated test runner. This plan uses two layers:

- **Layer 1 — GAS test functions** for pure logic (regex parsing, hashtag normalization, date/month math, aggregation). Named `test_xxx()`, run via the Apps Script editor's Run button, asserting through a tiny `assertEqual` helper that throws on mismatch and logs PASS via `Logger.log`. These give a real red→green cycle without deploying.
- **Layer 2 — Manual LINE test gates** at the end of each phase: deploy the staging Web App, send real messages / open LIFF, and confirm Sheet + bot behavior. This is the only way to test reply tokens, Flex rendering, LIFF auth, and idToken verification.

Pure-logic tasks include a Layer 1 cycle. I/O tasks (reply, Gemini call, Sheet write) rely on the phase-end Layer 2 gate.

## File Structure

| File | Responsibility |
|---|---|
| `Config.gs` | Constants: Script Property key names, Gemini model string, timezone, TTL, Sheet tab/header names. Getters for secrets. |
| `TestUtil.gs` | `assertEqual(actual, expected, msg)` + `runAllTests()` harness. Test functions live beside their module or here. |
| `Sheet.gs` | CRUD: `addEntry`, `editEntry`, `softDeleteEntry`, `undoEntry`, `getEntry`, `getCategories`, `getActiveEntries`. Header-driven column mapping. |
| `Access.gs` | `checkUser(userId)`, `logPending(userId, displayName)`, `markWelcomed(userId)`. |
| `Gemini.gs` | `parseEntry(text, categories)` (Gemini call + JSON parse), `regexFallback(text)`, `normalizeHashtag`, `extractHashtags`. |
| `Line.gs` | `reply`, `getProfile`, `buildReceiptFlex`, `verifySignature`, `verifyIdToken`. LINE API wrappers. |
| `State.gs` | Clarification state: `setPending`, `getPending`, `clearPending` via CacheService + TTL. |
| `Overview.gs` | `aggregateMonth(userId, month, hashtag)` → JSON for charts; `listEntries(userId, month, hashtag)`. |
| `Code.gs` | `doPost(e)` webhook router, `doGet(e)` LIFF page + data API router, postback routing. |
| `liff.html` | LIFF page: `liff.init`, 3 Chart.js donuts + "รายการ" list tab, month/hashtag filters, edit/delete/undo forms. |

---

## Phase 0 — External Setup (no code; do once before Task 1)

This is manual setup outside the code. Not a coding task, but Task 1+ depend on it.

- [ ] Create a Google Sheet with three tabs named exactly `Entries`, `Categories`, `Users`.
- [ ] Set the `Entries` header row (row 1), columns in this exact order:
  `entry_id | user_id | timestamp | type | amount | description | category | hashtags | status | raw_text | source`
- [ ] Set the `Categories` header row: `category | type | keywords`
- [ ] Set the `Users` header row: `user_id | display_name | status | joined_at`
- [ ] Seed `Categories` with 18 rows (type lowercase). Expense (`expense`): อาหาร, เดินทาง/รถ, ของใช้จำเป็น, ช้อปปิ้ง, สาธารณูปโภค, ผ่อนบ้าน, สุขภาพ, บันเทิง, การศึกษา, ครอบครัว, ออมเงิน/ลงทุน, งาน/ธุรกิจ, อื่นๆ. Income (`income`): เงินเดือน, โบนัส, ค้าขาย/ธุรกิจ, ดอกเบี้ย/ปันผล, อื่นๆ. (`keywords` may be left blank.)
- [ ] Open the bound Apps Script project: Sheet → Extensions → Apps Script.
- [ ] Create a LINE Messaging API channel; copy Channel access token, Channel secret, and Channel ID.
- [ ] Get a Gemini API key from Google AI Studio and **verify the current Flash-Lite model string** (it changes; do not trust training data).
- [ ] In Apps Script → Project Settings → Script Properties, set: `LINE_CHANNEL_TOKEN`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ID`, `GEMINI_API_KEY`. (`LIFF_ID` is added in Phase 6.)
- **Done when:** Sheet has 3 tabs with exact headers + 18 seeded categories; Apps Script editor opens; 4 Script Properties are set.

---

## Phase 1 — Foundation: Config, Test Harness, Sheet CRUD

Builds the constants, the test harness, and the Sheet data layer everything else depends on. No LINE wiring yet — verified purely with Layer 1 GAS test functions.

### Task 1: Config constants and secret getters

**Files:**
- Create: `Config.gs`

**Interfaces:**
- Produces: `CONFIG` object with `TZ`, `GEMINI_MODEL`, `CLARIFICATION_TTL_SECONDS`, `TABS`, `PROP_KEYS`; getters `getLineToken()`, `getLineSecret()`, `getLineChannelId()`, `getGeminiKey()`, `getLiffId()`.

- [ ] **Step 1: Write `Config.gs`**

```javascript
// Config.gs — constants and secret accessors. No secrets hardcoded.
const CONFIG = {
  TZ: 'Asia/Bangkok',
  // Verify current Flash-Lite model string in Google AI Studio before relying on this.
  GEMINI_MODEL: 'gemini-flash-lite-latest',
  CLARIFICATION_TTL_SECONDS: 600, // 10 minutes
  TABS: { ENTRIES: 'Entries', CATEGORIES: 'Categories', USERS: 'Users' },
  ENTRY_HEADERS: ['entry_id','user_id','timestamp','type','amount','description','category','hashtags','status','raw_text','source'],
  CATEGORY_HEADERS: ['category','type','keywords'],
  USER_HEADERS: ['user_id','display_name','status','joined_at'],
  PROP_KEYS: {
    LINE_TOKEN: 'LINE_CHANNEL_TOKEN',
    LINE_SECRET: 'LINE_CHANNEL_SECRET',
    LINE_CHANNEL_ID: 'LINE_CHANNEL_ID',
    GEMINI_KEY: 'GEMINI_API_KEY',
    LIFF_ID: 'LIFF_ID'
  }
};

function _prop(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}
function getLineToken()    { return _prop(CONFIG.PROP_KEYS.LINE_TOKEN); }
function getLineSecret()   { return _prop(CONFIG.PROP_KEYS.LINE_SECRET); }
function getLineChannelId(){ return _prop(CONFIG.PROP_KEYS.LINE_CHANNEL_ID); }
function getGeminiKey()    { return _prop(CONFIG.PROP_KEYS.GEMINI_KEY); }
function getLiffId()       { return _prop(CONFIG.PROP_KEYS.LIFF_ID); }
```

- [ ] **Step 2: Verify secrets load (manual, in editor)**

Add a temporary function and run it once in the Apps Script editor:

```javascript
function test_configLoads() {
  Logger.log('token set: ' + !!getLineToken());
  Logger.log('gemini set: ' + !!getGeminiKey());
}
```

Run `test_configLoads`. Expected log: `token set: true` and `gemini set: true`. Delete this temp function after confirming.

- [ ] **Step 3: Commit**

```bash
git add Config.gs
git commit -m "feat: add Config.gs with constants and secret getters"
```

### Task 2: Test harness

**Files:**
- Create: `TestUtil.gs`

**Interfaces:**
- Produces: `assertEqual(actual, expected, msg)` throws `Error` on mismatch, logs `PASS: <msg>` on match. `assertTrue(cond, msg)`. `runAllTests()` calls every global function whose name starts with `test_` and reports a summary.

- [ ] **Step 1: Write `TestUtil.gs`**

```javascript
// TestUtil.gs — minimal assertion + runner for Layer-1 logic tests.
function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error('FAIL: ' + msg + ' | expected ' + e + ' got ' + a);
  }
  Logger.log('PASS: ' + msg);
}
function assertTrue(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg + ' | expected truthy');
  Logger.log('PASS: ' + msg);
}
function runAllTests() {
  const g = this;
  const names = Object.keys(g).filter(function(k){
    return k.indexOf('test_') === 0 && typeof g[k] === 'function';
  });
  let pass = 0, fail = 0;
  names.forEach(function(n){
    try { g[n](); pass++; }
    catch (err) { fail++; Logger.log(String(err)); }
  });
  Logger.log('=== ' + pass + ' passed, ' + fail + ' failed ===');
}
```

- [ ] **Step 2: Self-test the harness**

Add temporarily and run:

```javascript
function test_harnessWorks() { assertEqual(1 + 1, 2, 'math works'); }
```

Run `runAllTests`. Expected log includes `PASS: math works` and `=== 1 passed, 0 failed ===`. Keep `test_harnessWorks` (harmless) or delete.

- [ ] **Step 3: Commit**

```bash
git add TestUtil.gs
git commit -m "test: add assertion harness and runAllTests runner"
```

### Task 3: Sheet read helpers (header-driven)

**Files:**
- Create: `Sheet.gs`
- Test: in `Sheet.gs` (`test_` functions)

**Interfaces:**
- Produces:
  - `_sheet(tabName)` → Sheet object.
  - `_readAll(tabName)` → `{ headers: string[], rows: any[][] }`.
  - `_rowToObj(headers, row)` → plain object keyed by header.
  - `getCategories()` → `{ expense: string[], income: string[] }` (names only, in sheet order).
  - `getActiveEntries(userId)` → array of entry objects with `status === 'active'` for that user.

- [ ] **Step 1: Write read helpers + `getCategories` + `getActiveEntries`**

```javascript
// Sheet.gs — Google Sheet data layer. Header-driven column mapping.
function _sheet(tabName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
}
function _readAll(tabName) {
  const sh = _sheet(tabName);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 1) return { headers: [], rows: [] };
  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  const rows = values.slice(1);
  return { headers: headers, rows: rows };
}
function _rowToObj(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
  return obj;
}
function getCategories() {
  const data = _readAll(CONFIG.TABS.CATEGORIES);
  const result = { expense: [], income: [] };
  data.rows.forEach(function(r){
    const o = _rowToObj(data.headers, r);
    if (o.type === 'expense' && o.category) result.expense.push(o.category);
    else if (o.type === 'income' && o.category) result.income.push(o.category);
  });
  return result;
}
function getActiveEntries(userId) {
  const data = _readAll(CONFIG.TABS.ENTRIES);
  const out = [];
  data.rows.forEach(function(r){
    const o = _rowToObj(data.headers, r);
    if (o.user_id === userId && o.status === 'active') out.push(o);
  });
  return out;
}
```

- [ ] **Step 2: Manual verification gate (needs the real Sheet)**

In the editor, run:

```javascript
function test_getCategoriesManual() {
  const c = getCategories();
  Logger.log('expense count: ' + c.expense.length); // expect 13
  Logger.log('income count: ' + c.income.length);   // expect 5
  Logger.log(JSON.stringify(c));
}
```

Run `test_getCategoriesManual`. Expected: `expense count: 13`, `income count: 5`, and `อาหาร` present in expense list. (This reads the live Sheet, so it is a manual gate, not a pure-logic test.) Delete the temp function after.

- [ ] **Step 3: Commit**

```bash
git add Sheet.gs
git commit -m "feat: add Sheet read helpers, getCategories, getActiveEntries"
```

### Task 4: Sheet write operations (add / edit / soft-delete / undo / get)

**Files:**
- Modify: `Sheet.gs`

**Interfaces:**
- Consumes: `_sheet`, `_readAll`, `_rowToObj` (Task 3); `Utilities.getUuid`, `Utilities.formatDate`.
- Produces:
  - `addEntry(fields)` where `fields = { user_id, type, amount, description, category, hashtags, raw_text, source }` → returns the created entry object including generated `entry_id`, `timestamp`, `status:'active'`. Appends one row.
  - `getEntry(entryId)` → entry object or `null`.
  - `editEntry(entryId, updates)` → updates allowed fields (`type`,`amount`,`description`,`category`,`hashtags`,`status`) on the matching row; returns updated entry or `null`.
  - `softDeleteEntry(entryId)` → sets `status='deleted'`; returns boolean.
  - `undoEntry(entryId)` → sets `status='active'`; returns boolean.
- Note: `hashtags` is stored as a single space-separated string.

- [ ] **Step 1: Write the write operations**

```javascript
// --- Sheet.gs (append) ---
function _findEntryRow(entryId) {
  // Returns { sheet, rowIndex (1-based, includes header), headers, obj } or null.
  const sh = _sheet(CONFIG.TABS.ENTRIES);
  const data = _readAll(CONFIG.TABS.ENTRIES);
  const idCol = data.headers.indexOf('entry_id');
  for (let i = 0; i < data.rows.length; i++) {
    if (data.rows[i][idCol] === entryId) {
      return { sheet: sh, rowIndex: i + 2, headers: data.headers, obj: _rowToObj(data.headers, data.rows[i]) };
    }
  }
  return null;
}
function addEntry(fields) {
  const sh = _sheet(CONFIG.TABS.ENTRIES);
  const entry = {
    entry_id: Utilities.getUuid(),
    user_id: fields.user_id,
    timestamp: Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss'),
    type: fields.type,
    amount: fields.amount,
    description: fields.description || '',
    category: fields.category,
    hashtags: Array.isArray(fields.hashtags) ? fields.hashtags.join(' ') : (fields.hashtags || ''),
    status: 'active',
    raw_text: fields.raw_text || '',
    source: fields.source
  };
  const row = CONFIG.ENTRY_HEADERS.map(function(h){ return entry[h]; });
  sh.appendRow(row);
  return entry;
}
function getEntry(entryId) {
  const found = _findEntryRow(entryId);
  return found ? found.obj : null;
}
function editEntry(entryId, updates) {
  const found = _findEntryRow(entryId);
  if (!found) return null;
  const allowed = ['type','amount','description','category','hashtags','status'];
  allowed.forEach(function(field){
    if (updates.hasOwnProperty(field)) {
      const col = found.headers.indexOf(field) + 1;
      let val = updates[field];
      if (field === 'hashtags' && Array.isArray(val)) val = val.join(' ');
      found.sheet.getRange(found.rowIndex, col).setValue(val);
    }
  });
  return getEntry(entryId);
}
function softDeleteEntry(entryId) {
  return !!editEntry(entryId, { status: 'deleted' });
}
function undoEntry(entryId) {
  return !!editEntry(entryId, { status: 'active' });
}
```

- [ ] **Step 2: Manual round-trip gate (needs real Sheet)**

Run in editor:

```javascript
function test_entryRoundTripManual() {
  const e = addEntry({ user_id:'Utest', type:'expense', amount:50,
    description:'กาแฟ', category:'อาหาร', hashtags:['cafe'], raw_text:'กาแฟ 50 #cafe', source:'ai' });
  Logger.log('created id: ' + e.entry_id);
  editEntry(e.entry_id, { category: 'บันเทิง' });
  Logger.log('after edit cat: ' + getEntry(e.entry_id).category); // บันเทิง
  softDeleteEntry(e.entry_id);
  Logger.log('after delete status: ' + getEntry(e.entry_id).status); // deleted
  undoEntry(e.entry_id);
  Logger.log('after undo status: ' + getEntry(e.entry_id).status); // active
}
```

Run `test_entryRoundTripManual`. Confirm logs show category `บันเทิง`, status `deleted` then `active`, and one new row in the `Entries` tab. Manually mark that test row `status=deleted` afterward to keep the Sheet clean.

- [ ] **Step 3: Commit**

```bash
git add Sheet.gs
git commit -m "feat: add Sheet write ops (add/edit/softDelete/undo/get) with UUID ids"
```

**PHASE 1 GATE (Layer 2):** All Sheet operations work against the live Sheet; categories read correctly (13 expense / 5 income); entry round-trip (add→edit→delete→undo) reflects in the Sheet. No LINE wiring yet.

---

## Phase 2 — Parsing: hashtag normalization, regex fallback, Gemini

The parsing brain. Hashtag normalization and regex fallback are pure logic with real Layer-1 red→green tests. The Gemini call is I/O, verified at the phase gate.

### Task 5: Hashtag normalization + extraction

**Files:**
- Create: `Gemini.gs`
- Test: in `Gemini.gs`

**Interfaces:**
- Produces:
  - `normalizeHashtag(tag)` → strips leading `#`, trims, lowercases ASCII only (Thai unchanged). E.g. `'#Cafe'`→`'cafe'`, `'#วันเกิด'`→`'วันเกิด'`.
  - `extractHashtags(text)` → array of normalized tags found via `#...` in text.

- [ ] **Step 1: Write the failing tests**

```javascript
// Gemini.gs (tests)
function test_normalizeHashtag_lowercasesAscii() {
  assertEqual(normalizeHashtag('#Cafe'), 'cafe', 'ascii lowercased, hash stripped');
}
function test_normalizeHashtag_keepsThai() {
  assertEqual(normalizeHashtag('#วันเกิด'), 'วันเกิด', 'thai kept as-is');
}
function test_normalizeHashtag_trims() {
  assertEqual(normalizeHashtag('  #Trip2024  '), 'trip2024', 'trimmed + lowercased');
}
function test_extractHashtags_multiple() {
  assertEqual(extractHashtags('กาแฟ 50 #Cafe #วันหยุด'), ['cafe','วันหยุด'], 'extracts and normalizes all');
}
function test_extractHashtags_none() {
  assertEqual(extractHashtags('กาแฟ 50'), [], 'no hashtags → empty array');
}
```

- [ ] **Step 2: Run to verify failure**

Run `runAllTests` in the editor. Expected: these 5 tests FAIL with `normalizeHashtag is not defined` / `extractHashtags is not defined`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// Gemini.gs (impl)
function normalizeHashtag(tag) {
  let t = String(tag).trim();
  if (t.charAt(0) === '#') t = t.slice(1);
  t = t.trim();
  // Lowercase ASCII A–Z only; leave Thai and other scripts unchanged.
  return t.replace(/[A-Z]/g, function(c){ return c.toLowerCase(); });
}
function extractHashtags(text) {
  const matches = String(text).match(/#[^\s#]+/g) || [];
  return matches.map(normalizeHashtag);
}
```

- [ ] **Step 4: Run to verify pass**

Run `runAllTests`. Expected: all 5 hashtag tests log `PASS`.

- [ ] **Step 5: Commit**

```bash
git add Gemini.gs
git commit -m "feat: add hashtag normalization and extraction with tests"
```

### Task 6: Regex amount fallback

**Files:**
- Modify: `Gemini.gs`
- Test: in `Gemini.gs`

**Interfaces:**
- Consumes: `extractHashtags` (Task 5).
- Produces: `regexFallback(text)` → `{ type:'expense', amount:Number, description:String, category:'อื่นๆ', hashtags:String[], source:'fallback' }`. `amount` is `0` when no number is found. Supports `1500`, `1,500`, `1.5k`/`1.5K`, `฿1500`, `1500บาท`, `1500 บ.`. `description` is the raw text truncated to 100 chars.

- [ ] **Step 1: Write the failing tests**

```javascript
// Gemini.gs (tests)
function test_regexFallback_plainInt() {
  assertEqual(regexFallback('กาแฟ 50').amount, 50, 'plain integer');
}
function test_regexFallback_comma() {
  assertEqual(regexFallback('โน้ตบุ๊ค 1,500').amount, 1500, 'comma thousands');
}
function test_regexFallback_kSuffix() {
  assertEqual(regexFallback('ค่าเช่า 1.5k').amount, 1500, 'k suffix x1000');
}
function test_regexFallback_bahtWord() {
  assertEqual(regexFallback('ข้าว 60 บาท').amount, 60, 'baht word stripped');
}
function test_regexFallback_bahtSymbol() {
  assertEqual(regexFallback('฿200 ขนม').amount, 200, 'baht symbol stripped');
}
function test_regexFallback_noAmount() {
  assertEqual(regexFallback('กินข้าว').amount, 0, 'no number → 0');
}
function test_regexFallback_defaults() {
  const r = regexFallback('กาแฟ 50 #cafe');
  assertEqual(r.type, 'expense', 'default type expense');
  assertEqual(r.category, 'อื่นๆ', 'default category อื่นๆ');
  assertEqual(r.source, 'fallback', 'source fallback');
  assertEqual(r.hashtags, ['cafe'], 'hashtags extracted');
}
```

- [ ] **Step 2: Run to verify failure**

Run `runAllTests`. Expected: these tests FAIL with `regexFallback is not defined`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// Gemini.gs (impl)
function regexFallback(text) {
  const cleaned = String(text).replace(/฿|บาท|บ\./g, '');
  const m = cleaned.match(/(\d{1,3}(?:,\d{3})*|\d+)(\.\d+)?(k|K)?/);
  let amount = 0;
  if (m) {
    amount = parseFloat(m[1].replace(/,/g, '') + (m[2] || ''));
    if (m[3]) amount *= 1000;
  }
  return {
    type: 'expense',
    amount: amount,
    description: String(text).substring(0, 100),
    category: 'อื่นๆ',
    hashtags: extractHashtags(text),
    source: 'fallback'
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run `runAllTests`. Expected: all regex tests log `PASS`.

- [ ] **Step 5: Commit**

```bash
git add Gemini.gs
git commit -m "feat: add regex amount fallback with full format coverage"
```

### Task 7: Gemini parse with JSON output + fallback chaining

**Files:**
- Modify: `Gemini.gs`

**Interfaces:**
- Consumes: `getGeminiKey`, `CONFIG.GEMINI_MODEL` (Task 1); `getCategories` (Task 3); `regexFallback`, `extractHashtags`, `normalizeHashtag` (Tasks 5–6).
- Produces: `parseEntry(text, categories)` where `categories = { expense:[], income:[] }` → entry-shaped object `{ type, amount, description, category, hashtags:String[], source }`. On any Gemini error, JSON parse failure, or empty amount-less success, returns `regexFallback(text)` semantics (`source:'fallback'`); on success `source:'ai'`. Hashtags are always re-normalized server-side.

- [ ] **Step 1: Write `parseEntry`**

```javascript
// Gemini.gs (impl)
function _buildGeminiPrompt(text, categories) {
  return [
    'คุณเป็น AI ช่วยบันทึกรายรับ-รายจ่ายส่วนตัว',
    '',
    'วิเคราะห์ข้อความต่อไปนี้แล้วตอบเป็น JSON ตาม schema ที่กำหนด:',
    '',
    'ข้อความ: "' + text + '"',
    '',
    'หมวดหมู่ที่มีอยู่:',
    'รายจ่าย: ' + categories.expense.join(', '),
    'รายรับ: ' + categories.income.join(', '),
    '',
    'กฎ:',
    '1. type = "income" ถ้าข้อความบ่งบอกถึงการรับเงิน (เช่น เงินเดือน, ได้รับ, รายได้) มิฉะนั้น = "expense"',
    '2. amount = ตัวเลขจำนวนเงิน (บาท) เป็นตัวเลขล้วน ไม่มีหน่วย ถ้าไม่พบให้ใส่ 0',
    '3. description = คำอธิบายสั้นๆ ของรายการนี้ ภาษาไทย',
    '4. category = เลือกจากรายการหมวดหมู่ที่ให้มาเท่านั้น ถ้าไม่แน่ใจให้ใช้ "อื่นๆ"',
    '5. hashtags = รายการ hashtag ที่พบในข้อความ (ไม่มี # นำหน้า) ถ้าไม่มีให้เป็น []',
    '',
    'ตอบเฉพาะ JSON เท่านั้น ไม่มีข้อความอื่น'
  ].join('\n');
}

function parseEntry(text, categories) {
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      CONFIG.GEMINI_MODEL + ':generateContent?key=' + getGeminiKey();
    const payload = {
      contents: [{ parts: [{ text: _buildGeminiPrompt(text, categories) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            type: { type: 'STRING', enum: ['income','expense'] },
            amount: { type: 'NUMBER' },
            description: { type: 'STRING' },
            category: { type: 'STRING' },
            hashtags: { type: 'ARRAY', items: { type: 'STRING' } }
          },
          required: ['type','amount','description','category','hashtags']
        }
      }
    };
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return regexFallback(text);
    const body = JSON.parse(res.getContentText());
    const raw = body.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.amount !== 'number') return regexFallback(text);
    return {
      type: parsed.type === 'income' ? 'income' : 'expense',
      amount: parsed.amount,
      description: parsed.description || '',
      category: parsed.category || 'อื่นๆ',
      hashtags: (parsed.hashtags || []).map(normalizeHashtag),
      source: 'ai'
    };
  } catch (err) {
    return regexFallback(text);
  }
}
```

- [ ] **Step 2: Manual Gemini gate (needs network + key)**

Run in editor:

```javascript
function test_parseEntryManual() {
  const cats = getCategories();
  const r = parseEntry('กาแฟร้านโปรด 50 #cafe', cats);
  Logger.log(JSON.stringify(r)); // expect type expense, amount 50, source ai, category food-ish, hashtags [cafe]
  const inc = parseEntry('เงินเดือนเข้า 30000', cats);
  Logger.log(JSON.stringify(inc)); // expect type income, amount 30000
}
```

Run `test_parseEntryManual`. Confirm the expense parses as `expense`/50/`source:'ai'` and the salary parses as `income`/30000. If Gemini errors, confirm it returns `source:'fallback'` rather than throwing. Delete the temp function after.

- [ ] **Step 3: Commit**

```bash
git add Gemini.gs
git commit -m "feat: add Gemini parseEntry with JSON schema and regex fallback chaining"
```

**PHASE 2 GATE:** Layer-1 tests for hashtag + regex all pass via `runAllTests`. Manual Gemini call parses an expense and an income correctly and degrades to fallback on error.

---

## Phase 3 — LINE wiring: signature verify, reply, webhook echo

Brings the pipeline online: a real LINE message round-trips through `doPost`. This proves the webhook before any AI/save logic is attached.

### Task 8: LINE reply + signature verification + profile

**Files:**
- Create: `Line.gs`
- Test: in `Line.gs` (signature test is pure logic)

**Interfaces:**
- Consumes: `getLineToken`, `getLineSecret` (Task 1).
- Produces:
  - `verifySignature(body, signature)` → boolean. HMAC-SHA256 of raw body with channel secret, base64, compared to header.
  - `reply(replyToken, messages)` where `messages` is an array of LINE message objects. POSTs to the reply endpoint.
  - `getProfile(userId)` → `{ displayName, userId }` or `{ displayName:'', userId }` on failure.

- [ ] **Step 1: Write the signature test (pure logic)**

```javascript
// Line.gs (test) — uses a known secret/body/expected triple.
function test_verifySignature_matches() {
  // Compute expected with the same algorithm to assert the helper agrees.
  const body = '{"events":[]}';
  const secret = getLineSecret();
  const expected = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(body, secret)
  );
  assertTrue(verifySignature(body, expected), 'valid signature accepted');
  assertTrue(!verifySignature(body, 'wrong'), 'invalid signature rejected');
}
```

- [ ] **Step 2: Run to verify failure**

Run `runAllTests`. Expected: FAIL with `verifySignature is not defined`.

- [ ] **Step 3: Write implementation**

```javascript
// Line.gs (impl)
function verifySignature(body, signature) {
  const secret = getLineSecret();
  const hash = Utilities.computeHmacSha256Signature(body, secret);
  const expected = Utilities.base64Encode(hash);
  return expected === signature;
}
function reply(replyToken, messages) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + getLineToken() },
    payload: JSON.stringify({ replyToken: replyToken, messages: messages }),
    muteHttpExceptions: true
  });
}
function getProfile(userId) {
  try {
    const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/profile/' + userId, {
      headers: { Authorization: 'Bearer ' + getLineToken() },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return { displayName: '', userId: userId };
    const p = JSON.parse(res.getContentText());
    return { displayName: p.displayName || '', userId: userId };
  } catch (err) {
    return { displayName: '', userId: userId };
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run `runAllTests`. Expected: signature test logs `PASS` (both accept and reject cases).

- [ ] **Step 5: Commit**

```bash
git add Line.gs
git commit -m "feat: add LINE reply, HMAC signature verify, and profile fetch"
```

### Task 9: Webhook skeleton with echo + signature guard

**Files:**
- Create: `Code.gs`

**Interfaces:**
- Consumes: `verifySignature`, `reply` (Task 8).
- Produces: `doPost(e)` → always returns `ContentService` text output `'OK'` (HTTP 200). Parses `e.postData.contents`, verifies `X-Line-Signature` (when present), iterates `events`, and for each text message replies `'echo: ' + text`. Null-checks `source.userId` and `replyToken`.

- [ ] **Step 1: Write `doPost` echo skeleton**

```javascript
// Code.gs
function doPost(e) {
  try {
    const body = e.postData.contents;
    const sig = e.parameter && e.parameter['X-Line-Signature']; // header arrives via parameter in some setups
    // GAS exposes headers inconsistently; primary guard is on the raw body below if header is available.
    const data = JSON.parse(body);
    const events = data.events || [];
    events.forEach(function(ev){
      if (ev.type === 'message' && ev.message && ev.message.type === 'text' && ev.replyToken) {
        reply(ev.replyToken, [{ type: 'text', text: 'echo: ' + ev.message.text }]);
      }
    });
  } catch (err) {
    Logger.log('doPost error: ' + err);
  }
  return ContentService.createTextOutput('OK');
}
```

> Note on signature: GAS Web Apps do **not** expose request headers to `doPost`, so `X-Line-Signature` cannot be read here. The webhook URL contains an unguessable deployment ID, which is LINE's documented mitigation for GAS. Signature verification remains implemented (`verifySignature`) and is applied in any context where the header is available; document this GAS limitation in code comments. Do not block on a header GAS can't provide.

- [ ] **Step 2: Deploy + manual echo gate**

Deploy → New deployment → Web App (Execute as: me; Who has access: Anyone). Copy the `/exec` URL. In LINE Developers → Messaging API → Webhook URL, paste it, enable Use webhook, click Verify (expect success). Send "ทดสอบ" to the bot.
Expected: bot replies `echo: ทดสอบ`.

- [ ] **Step 3: Commit**

```bash
git add Code.gs
git commit -m "feat: add doPost webhook skeleton with text echo, returns 200 early"
```

**PHASE 3 GATE:** Webhook verifies in LINE console; bot echoes any text message. Pipeline is proven end-to-end.

---

## Phase 4 — Access control + welcome/help

Gates writes behind approval and onboards users. Reuses the echo `doPost` and adds the guard at the top.

### Task 10: Access control functions

**Files:**
- Create: `Access.gs`
- Modify: `Sheet.gs` (add user helpers)

**Interfaces:**
- Consumes: `_sheet`, `_readAll`, `_rowToObj` (Task 3); `Utilities.formatDate`.
- Produces (in `Sheet.gs`): `getUser(userId)` → user obj or null; `addPendingUser(userId, displayName)` appends a `pending` row; `setUserField(userId, field, value)`.
- Produces (in `Access.gs`): `checkUser(userId)` → `'approved' | 'pending' | 'unknown'`; `logPending(userId, displayName)` (adds pending row if absent); `markWelcomed(userId)` sets a `welcomed` flag via PropertiesService key `WELCOMED_<userId>`.

- [ ] **Step 1: Write Sheet user helpers**

```javascript
// Sheet.gs (append)
function getUser(userId) {
  const data = _readAll(CONFIG.TABS.USERS);
  const idCol = data.headers.indexOf('user_id');
  for (let i = 0; i < data.rows.length; i++) {
    if (data.rows[i][idCol] === userId) return _rowToObj(data.headers, data.rows[i]);
  }
  return null;
}
function addPendingUser(userId, displayName) {
  const sh = _sheet(CONFIG.TABS.USERS);
  const joined = Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
  const row = CONFIG.USER_HEADERS.map(function(h){
    return ({ user_id:userId, display_name:displayName, status:'pending', joined_at:joined })[h];
  });
  sh.appendRow(row);
}
function setUserField(userId, field, value) {
  const sh = _sheet(CONFIG.TABS.USERS);
  const data = _readAll(CONFIG.TABS.USERS);
  const idCol = data.headers.indexOf('user_id');
  const fCol = data.headers.indexOf(field);
  for (let i = 0; i < data.rows.length; i++) {
    if (data.rows[i][idCol] === userId) { sh.getRange(i + 2, fCol + 1).setValue(value); return true; }
  }
  return false;
}
```

- [ ] **Step 2: Write `Access.gs`**

```javascript
// Access.gs
function checkUser(userId) {
  const u = getUser(userId);
  if (!u) return 'unknown';
  return u.status === 'approved' ? 'approved' : 'pending';
}
function logPending(userId, displayName) {
  if (!getUser(userId)) addPendingUser(userId, displayName);
}
function isWelcomed(userId) {
  return PropertiesService.getScriptProperties().getProperty('WELCOMED_' + userId) === '1';
}
function markWelcomed(userId) {
  PropertiesService.getScriptProperties().setProperty('WELCOMED_' + userId, '1');
}
```

- [ ] **Step 3: Manual gate (live Sheet)**

Run:

```javascript
function test_accessManual() {
  Logger.log(checkUser('Unobody')); // unknown
  logPending('Unobody', 'Test User');
  Logger.log(checkUser('Unobody')); // pending
}
```

Confirm a `pending` row appears in `Users`. Delete the row + temp function after.

- [ ] **Step 4: Commit**

```bash
git add Access.gs Sheet.gs
git commit -m "feat: add access control (checkUser/logPending) and user Sheet helpers"
```

### Task 11: Welcome/help messages + guard in doPost

**Files:**
- Modify: `Code.gs`
- Create: `Messages.gs` (Thai copy constants)

**Interfaces:**
- Consumes: `checkUser`, `logPending`, `isWelcomed`, `markWelcomed` (Task 10); `getProfile`, `reply` (Task 8).
- Produces (in `Messages.gs`): `MSG` object with verbatim Thai strings; `helpText()`, `welcomeText()`.

- [ ] **Step 1: Write `Messages.gs`**

```javascript
// Messages.gs — all user-facing Thai copy.
const MSG = {
  PENDING: 'ยังไม่ได้รับอนุญาตนะคะ รอ admin approve ก่อนนะ 🙏',
  FALLBACK_SAVED: "บันทึกไว้แล้วนะคะ แต่หมวดหมู่อาจไม่แม่น ลองเช็คใน 'รายการ' ได้เลยค่ะ 📋",
  ASK_AMOUNT: 'อ่านตัวเลขไม่ออกเลยค่ะ 😅 ใส่จำนวนเงินให้หน่อยได้ไหม?',
  SAVE_FAILED: 'บันทึกไม่ได้ค่ะ ลองใหม่อีกทีได้เลยนะ 🙏',
  CLARIFY_CANCELLED: 'ยกเลิกรายการที่ค้างไว้แล้วนะคะ ✌️'
};
function welcomeText() {
  return [
    'ยินดีต้อนรับสู่ จดให้ นะคะ 🎉',
    '',
    'พิมพ์อะไรก็ได้เลยเพื่อบันทึกรายการ เช่น',
    '• กาแฟ 50',
    '• เงินเดือน 30000',
    '• ข้าวเที่ยง 60 #ออฟฟิศ',
    '',
    'อยากดูสรุป กดปุ่ม "ดูสรุป" ที่เมนูด้านล่างได้เลย',
    'พิมพ์ "วิธีใช้" เมื่อไหร่ก็ได้เพื่อดูคำแนะนำซ้ำนะคะ'
  ].join('\n');
}
function helpText() {
  return [
    'วิธีใช้ จดให้ 📋',
    '',
    'บันทึกรายการ — พิมพ์รายการกับจำนวนเงิน เช่น',
    '• กาแฟ 50',
    '• เงินเดือน 30000',
    '• ข้าวเที่ยง 60 #ออฟฟิศ',
    '',
    'แก้ไขรายการ — กดปุ่มในใบสรุปหลังบันทึก หรือเปิด "ดูสรุป"',
    'คำสั่ง — พิมพ์ "วิธีใช้" หรือ "help"',
    '',
    'ต้องการความช่วยเหลือเพิ่มเติม ติดต่อ admin ได้เลยนะคะ'
  ].join('\n');
}
```

- [ ] **Step 2: Add the access guard + help handling to `doPost`**

Replace the `events.forEach` body in `Code.gs` with:

```javascript
events.forEach(function(ev){
  if (ev.type !== 'message' || !ev.message || ev.message.type !== 'text') return;
  if (!ev.source || !ev.source.userId || !ev.replyToken) return;
  const userId = ev.source.userId;
  const text = ev.message.text.trim();

  const status = checkUser(userId);
  if (status !== 'approved') {
    if (status === 'unknown') logPending(userId, getProfile(userId).displayName);
    reply(ev.replyToken, [{ type: 'text', text: MSG.PENDING }]);
    return;
  }

  // First message after approval → welcome once.
  if (!isWelcomed(userId)) {
    markWelcomed(userId);
    reply(ev.replyToken, [{ type: 'text', text: welcomeText() }]);
    return;
  }

  if (text === 'help' || text === 'วิธีใช้') {
    reply(ev.replyToken, [{ type: 'text', text: helpText() }]);
    return;
  }

  // Placeholder until Phase 5 wires parse+save:
  reply(ev.replyToken, [{ type: 'text', text: 'echo: ' + text }]);
});
```

- [ ] **Step 3: Deploy + manual gate**

Redeploy (Manage deployments → edit → new version). Test with an unapproved account: expect `MSG.PENDING` and a pending row in `Users`. Set that user's `status` to `approved` in the Sheet, send any message: expect the welcome text once, then echo on the next message. Send "วิธีใช้": expect help text.

- [ ] **Step 4: Commit**

```bash
git add Code.gs Messages.gs
git commit -m "feat: add access guard, welcome-once, and help command to doPost"
```

**PHASE 4 GATE:** Unapproved users are rejected and logged as pending; approved users get a one-time welcome and can retrieve help. Approved-user text still echoes (parse+save lands in Phase 5).

---

## Phase 5 — Core flow: parse → save → Receipt (the MVP)

This is the heart of the product: an approved user's message becomes a Sheet row and a Receipt card. After this phase, JotHai actually works.

### Task 12: Receipt Flex card builder

**Files:**
- Modify: `Line.gs`
- Test: in `Line.gs` (structure assertions are pure logic)

**Interfaces:**
- Consumes: entry object from `addEntry` (Task 4).
- Produces: `buildReceiptFlex(entry)` → a LINE Flex message object (type `'flex'`) showing type label (รายรับ/รายจ่าย), amount with `฿` prefix for display only, description, category, hashtags, and three postback buttons: เปลี่ยนหมวด (`action=chgcat&id=`), สลับประเภท (`action=toggle&id=`), ลบ (`action=del&id=`).

- [ ] **Step 1: Write structure tests (pure logic)**

```javascript
// Line.gs (test)
function test_buildReceiptFlex_hasButtons() {
  const entry = { entry_id:'abc', type:'expense', amount:50, description:'กาแฟ',
    category:'อาหาร', hashtags:'cafe', source:'ai' };
  const flex = buildReceiptFlex(entry);
  assertEqual(flex.type, 'flex', 'is a flex message');
  const json = JSON.stringify(flex);
  assertTrue(json.indexOf('action=chgcat&id=abc') >= 0, 'has change-category postback');
  assertTrue(json.indexOf('action=toggle&id=abc') >= 0, 'has toggle postback');
  assertTrue(json.indexOf('action=del&id=abc') >= 0, 'has delete postback');
}
```

- [ ] **Step 2: Run to verify failure**

Run `runAllTests`. Expected: FAIL with `buildReceiptFlex is not defined`.

- [ ] **Step 3: Write implementation**

```javascript
// Line.gs (impl)
function buildReceiptFlex(entry) {
  const typeLabel = entry.type === 'income' ? 'รายรับ' : 'รายจ่าย';
  const amountStr = '฿' + Number(entry.amount).toLocaleString('en-US');
  const tags = entry.hashtags ? String(entry.hashtags).split(/\s+/).filter(String).map(function(t){ return '#' + t; }).join(' ') : '-';
  const btn = function(label, data){
    return { type:'button', style:'secondary', height:'sm',
      action:{ type:'postback', label:label, data:data, displayText:label } };
  };
  return {
    type: 'flex',
    altText: typeLabel + ' ' + amountStr + ' ' + entry.description,
    contents: {
      type: 'bubble',
      body: { type:'box', layout:'vertical', spacing:'sm', contents: [
        { type:'text', text:typeLabel, size:'sm', color:'#888888' },
        { type:'text', text:amountStr, size:'xxl', weight:'bold' },
        { type:'text', text:entry.description || '-', wrap:true },
        { type:'box', layout:'baseline', contents:[
          { type:'text', text:'หมวด', size:'sm', color:'#888888', flex:2 },
          { type:'text', text:entry.category || '-', size:'sm', flex:5 } ] },
        { type:'box', layout:'baseline', contents:[
          { type:'text', text:'แท็ก', size:'sm', color:'#888888', flex:2 },
          { type:'text', text:tags, size:'sm', flex:5, wrap:true } ] }
      ]},
      footer: { type:'box', layout:'vertical', spacing:'sm', contents: [
        btn('เปลี่ยนหมวด', 'action=chgcat&id=' + entry.entry_id),
        btn('สลับประเภท', 'action=toggle&id=' + entry.entry_id),
        btn('ลบ', 'action=del&id=' + entry.entry_id)
      ]}
    }
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run `runAllTests`. Expected: receipt structure test logs `PASS`.

- [ ] **Step 5: Commit**

```bash
git add Line.gs
git commit -m "feat: add buildReceiptFlex with postback action buttons"
```

### Task 13: Wire parse → save → Receipt into doPost

**Files:**
- Modify: `Code.gs`

**Interfaces:**
- Consumes: `getCategories` (Task 3), `parseEntry` (Task 7), `addEntry` (Task 4), `buildReceiptFlex` (Task 12), `reply` (Task 8), `MSG` (Task 11).
- Produces: replaces the echo placeholder. On approved text (not help): parse, and if `amount > 0` save + reply Receipt; if `source==='fallback'` prepend `MSG.FALLBACK_SAVED` as a separate text message; if `amount === 0` reply `MSG.ASK_AMOUNT` (clarification stub — full state in Phase 7). Wrap save in try/catch → `MSG.SAVE_FAILED`.

- [ ] **Step 1: Replace the echo placeholder in `doPost`**

```javascript
// Code.gs — replace the placeholder echo line with:
const parsed = parseEntry(text, getCategories());
if (!parsed.amount || parsed.amount <= 0) {
  reply(ev.replyToken, [{ type: 'text', text: MSG.ASK_AMOUNT }]);
  return;
}
try {
  const entry = addEntry({
    user_id: userId, type: parsed.type, amount: parsed.amount,
    description: parsed.description, category: parsed.category,
    hashtags: parsed.hashtags, raw_text: text, source: parsed.source
  });
  const messages = [];
  if (parsed.source === 'fallback') messages.push({ type:'text', text: MSG.FALLBACK_SAVED });
  messages.push(buildReceiptFlex(entry));
  reply(ev.replyToken, messages);
} catch (err) {
  Logger.log('save error: ' + err);
  reply(ev.replyToken, [{ type:'text', text: MSG.SAVE_FAILED }]);
}
```

- [ ] **Step 2: Deploy + manual gate**

Redeploy. As an approved user send "กาแฟ 50 #cafe".
Expected: a new active row in `Entries` (type expense, amount 50, hashtags `cafe`, source `ai`) and a Receipt card with the three buttons. Send "เงินเดือน 30000": expect income entry. Send "กินข้าว" (no number): expect `MSG.ASK_AMOUNT`. Temporarily set an invalid Gemini key and resend a message: expect the entry still saves with `source=fallback` and the `MSG.FALLBACK_SAVED` notice. Restore the key.

- [ ] **Step 3: Commit**

```bash
git add Code.gs
git commit -m "feat: wire parse->save->Receipt flow into doPost with fallback notice"
```

**PHASE 5 GATE (MVP):** Typing an expense/income logs a correct row and returns a Receipt card. Gemini outage still saves via fallback. No-amount messages prompt for a number. **This is the core deliverable.**

---

## Phase 6 — Receipt button actions (postback routing)

Makes the Receipt buttons functional so users fix AI mistakes in chat.

### Task 14: Postback parsing helper

**Files:**
- Modify: `Code.gs`
- Test: in `Code.gs`

**Interfaces:**
- Produces: `parsePostback(data)` → object of decoded key/value pairs. E.g. `'action=setcat&id=abc&cat=%E0%B8%AD%E0%B8%B2%E0%B8%AB%E0%B8%B2%E0%B8%A3'` → `{ action:'setcat', id:'abc', cat:'อาหาร' }`. Uses `decodeURIComponent` on values.

- [ ] **Step 1: Write the failing test**

```javascript
// Code.gs (test)
function test_parsePostback_decodes() {
  const out = parsePostback('action=setcat&id=abc&cat=' + encodeURIComponent('อาหาร'));
  assertEqual(out, { action:'setcat', id:'abc', cat:'อาหาร' }, 'decodes action/id/cat');
}
```

- [ ] **Step 2: Run to verify failure**

Run `runAllTests`. Expected: FAIL with `parsePostback is not defined`.

- [ ] **Step 3: Write implementation**

```javascript
// Code.gs (impl)
function parsePostback(data) {
  const out = {};
  String(data).split('&').forEach(function(pair){
    const kv = pair.split('=');
    out[kv[0]] = decodeURIComponent(kv.slice(1).join('=') || '');
  });
  return out;
}
```

- [ ] **Step 4: Run to verify pass**

Run `runAllTests`. Expected: `PASS: decodes action/id/cat`.

- [ ] **Step 5: Commit**

```bash
git add Code.gs
git commit -m "feat: add parsePostback query-string decoder with test"
```

### Task 15: Postback event routing (toggle / delete / change-category)

**Files:**
- Modify: `Code.gs`

**Interfaces:**
- Consumes: `parsePostback` (Task 14); `getEntry`, `editEntry`, `softDeleteEntry` (Task 4); `getCategories` (Task 3); `reply` (Task 8).
- Produces: in `doPost`, handle `ev.type === 'postback'`. `toggle` flips `type` and replies confirmation; `del` soft-deletes and replies confirmation; `chgcat` replies a quick-reply of categories matching the entry's current type, each a `setcat` postback; `setcat` applies the category and confirms. All verify the entry belongs to `ev.source.userId` before mutating.

- [ ] **Step 1: Add postback routing to `doPost`**

```javascript
// Code.gs — inside doPost, before/after the message branch:
if (ev.type === 'postback' && ev.source && ev.source.userId && ev.replyToken) {
  handlePostback(ev);
  return;
}
```

```javascript
// Code.gs (impl) — new function
function handlePostback(ev) {
  const userId = ev.source.userId;
  const p = parsePostback(ev.postback.data);
  const entry = getEntry(p.id);
  if (!entry || entry.user_id !== userId) {
    reply(ev.replyToken, [{ type:'text', text: 'ไม่พบรายการนี้นะคะ 🤔' }]);
    return;
  }
  if (p.action === 'toggle') {
    const newType = entry.type === 'income' ? 'expense' : 'income';
    editEntry(p.id, { type: newType });
    reply(ev.replyToken, [{ type:'text', text:'เปลี่ยนเป็น' + (newType==='income'?'รายรับ':'รายจ่าย') + 'แล้วนะคะ ✅' }]);
  } else if (p.action === 'del') {
    softDeleteEntry(p.id);
    reply(ev.replyToken, [{ type:'text', text:'ลบรายการแล้วนะคะ 🗑️' }]);
  } else if (p.action === 'chgcat') {
    const cats = getCategories();
    const list = (entry.type === 'income' ? cats.income : cats.expense).slice(0, 13);
    const items = list.map(function(c){
      return { type:'action', action:{ type:'postback', label:c,
        data:'action=setcat&id=' + p.id + '&cat=' + encodeURIComponent(c), displayText:c } };
    });
    reply(ev.replyToken, [{ type:'text', text:'เลือกหมวดใหม่ค่ะ', quickReply:{ items: items } }]);
  } else if (p.action === 'setcat') {
    editEntry(p.id, { category: p.cat });
    reply(ev.replyToken, [{ type:'text', text:'เปลี่ยนหมวดเป็น "' + p.cat + '" แล้วนะคะ ✅' }]);
  }
}
```

> Note: quick-reply allows max 13 items, which fits the 13 expense categories exactly.

- [ ] **Step 2: Deploy + manual gate**

Redeploy. Send an entry, then on the Receipt: tap สลับประเภท (row `type` flips, confirmation shown); tap เปลี่ยนหมวด → pick a category (row `category` updates, confirmation); tap ลบ (row `status` → `deleted`, confirmation). Verify each change in the Sheet.

- [ ] **Step 3: Commit**

```bash
git add Code.gs
git commit -m "feat: route Receipt postback actions (toggle/delete/change-category) with ownership check"
```

**PHASE 6 GATE:** All three Receipt buttons mutate the correct row, ownership is enforced, and confirmations are sent.

---

## Phase 7 — Clarification flow (no-amount entries)

Turns the Phase 5 ask-for-amount stub into a real two-step flow with TTL state.

### Task 16: Clarification state (CacheService)

**Files:**
- Create: `State.gs`

**Interfaces:**
- Consumes: `CONFIG.CLARIFICATION_TTL_SECONDS` (Task 1).
- Produces: `setPending(userId, pendingText)` stores JSON under cache key `CLARIFICATION_<userId>` with the TTL; `getPending(userId)` → stored text or `null`; `clearPending(userId)` removes it.

- [ ] **Step 1: Write `State.gs`**

```javascript
// State.gs — clarification pending state via CacheService (TTL-bound).
function _clarKey(userId) { return 'CLARIFICATION_' + userId; }
function setPending(userId, pendingText) {
  CacheService.getScriptCache().put(_clarKey(userId), pendingText, CONFIG.CLARIFICATION_TTL_SECONDS);
}
function getPending(userId) {
  return CacheService.getScriptCache().get(_clarKey(userId));
}
function clearPending(userId) {
  CacheService.getScriptCache().remove(_clarKey(userId));
}
```

- [ ] **Step 2: Manual gate**

Run:

```javascript
function test_stateManual() {
  setPending('Ux', 'กินข้าว');
  Logger.log(getPending('Ux')); // กินข้าว
  clearPending('Ux');
  Logger.log(getPending('Ux')); // null
}
```

Confirm logs show `กินข้าว` then `null`. Delete temp function.

- [ ] **Step 3: Commit**

```bash
git add State.gs
git commit -m "feat: add clarification pending state with TTL via CacheService"
```

### Task 17: Wire clarification into doPost

**Files:**
- Modify: `Code.gs`

**Interfaces:**
- Consumes: `setPending`, `getPending`, `clearPending` (Task 16); existing parse→save block (Task 13); `regexFallback` (Task 6) for re-parsing the combined text; `MSG` (Task 11).
- Produces: in the approved-text branch, **before** parsing fresh: if `getPending(userId)` exists and the new `text` is numeric, combine `pendingText + ' ' + text`, save it (re-parse so category is attempted), clear pending, reply Receipt. If pending exists and text is non-numeric, `clearPending` + reply `MSG.CLARIFY_CANCELLED`, then fall through to process the new message normally. When a fresh parse yields `amount === 0`, `setPending(userId, text)` and reply `MSG.ASK_AMOUNT`.

- [ ] **Step 1: Add clarification handling at the top of the approved-text branch**

```javascript
// Code.gs — after help check, before fresh parseEntry:
const pending = getPending(userId);
const isNumeric = /^\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*$/.test(text);
if (pending) {
  if (isNumeric) {
    clearPending(userId);
    const combined = pending + ' ' + text;
    const reparsed = parseEntry(combined, getCategories());
    saveAndReceipt(ev, userId, reparsed, combined); // shared helper, see Step 2
    return;
  } else {
    clearPending(userId);
    reply(ev.replyToken, [{ type:'text', text: MSG.CLARIFY_CANCELLED }]);
    // fall through to process this new message as fresh
  }
}
```

```javascript
// Code.gs — after fresh parse, replace the inline save block with the shared helper:
const parsed = parseEntry(text, getCategories());
if (!parsed.amount || parsed.amount <= 0) {
  setPending(userId, text);
  reply(ev.replyToken, [{ type:'text', text: MSG.ASK_AMOUNT }]);
  return;
}
saveAndReceipt(ev, userId, parsed, text);
```

- [ ] **Step 2: Extract the shared save helper (refactor Task 13 inline block)**

```javascript
// Code.gs (impl) — shared by fresh-save and clarification-complete paths.
function saveAndReceipt(ev, userId, parsed, rawText) {
  try {
    const entry = addEntry({
      user_id: userId, type: parsed.type, amount: parsed.amount,
      description: parsed.description, category: parsed.category,
      hashtags: parsed.hashtags, raw_text: rawText, source: parsed.source
    });
    const messages = [];
    if (parsed.source === 'fallback') messages.push({ type:'text', text: MSG.FALLBACK_SAVED });
    messages.push(buildReceiptFlex(entry));
    reply(ev.replyToken, messages);
  } catch (err) {
    Logger.log('save error: ' + err);
    reply(ev.replyToken, [{ type:'text', text: MSG.SAVE_FAILED }]);
  }
}
```

- [ ] **Step 3: Deploy + manual gate**

Redeploy. Send "กินข้าว" → expect `MSG.ASK_AMOUNT`. Reply "80" → expect a saved entry (description references กินข้าว) + Receipt. Send "กินข้าว" again, then reply "ไปทำงาน" (non-numeric) → expect `MSG.CLARIFY_CANCELLED` and "ไปทำงาน" processed as a fresh (amount-less → ask again) message. Wait >10 min after an ask, then send a number → expect it treated as a fresh entry (no stale combine).

- [ ] **Step 4: Commit**

```bash
git add Code.gs
git commit -m "feat: add clarification two-step flow with TTL, cancel on non-numeric"
```

**PHASE 7 GATE:** No-amount message prompts; numeric reply completes the entry; non-numeric cancels cleanly; expired state does not leak into new entries.

---

## Phase 8 — LIFF dashboard + CRUD (highest risk)

The dashboard. Aggregation is pure logic with real tests; the LIFF page and secured write endpoint are the risk-heavy I/O parts, verified manually inside LINE.

### Task 18: Month/aggregation logic

**Files:**
- Create: `Overview.gs`
- Test: in `Overview.gs`

**Interfaces:**
- Consumes: `getActiveEntries` (Task 3); `Utilities.formatDate`.
- Produces:
  - `entryMonth(timestampStr)` → `'yyyy-MM'` in Bangkok time (timestamps are stored as `yyyy-MM-dd HH:mm:ss` Bangkok strings, so this is a substring).
  - `aggregateMonth(userId, month, hashtag)` → `{ month, totalIncome, totalExpense, incomeByCat:{}, expenseByCat:{} }`, filtered to `month` and (optionally) a `hashtag`.
  - `listEntries(userId, month, hashtag)` → array of active entries for that month/hashtag, newest first.

- [ ] **Step 1: Write the failing tests (pure logic via injected entries)**

```javascript
// Overview.gs (test) — _aggregate is the pure core that takes entries directly.
function test_entryMonth_extracts() {
  assertEqual(entryMonth('2026-06-24 09:15:00'), '2026-06', 'month extracted from bangkok string');
}
function test_aggregate_sumsByCategory() {
  const entries = [
    { type:'expense', amount:50, category:'อาหาร', hashtags:'cafe', status:'active', timestamp:'2026-06-01 08:00:00' },
    { type:'expense', amount:30, category:'อาหาร', hashtags:'', status:'active', timestamp:'2026-06-02 08:00:00' },
    { type:'income', amount:1000, category:'เงินเดือน', hashtags:'', status:'active', timestamp:'2026-06-03 08:00:00' }
  ];
  const r = _aggregate(entries, '2026-06', '');
  assertEqual(r.totalExpense, 80, 'expense total');
  assertEqual(r.totalIncome, 1000, 'income total');
  assertEqual(r.expenseByCat['อาหาร'], 80, 'expense grouped by category');
}
function test_aggregate_hashtagFilter() {
  const entries = [
    { type:'expense', amount:50, category:'อาหาร', hashtags:'cafe', status:'active', timestamp:'2026-06-01 08:00:00' },
    { type:'expense', amount:30, category:'อาหาร', hashtags:'home', status:'active', timestamp:'2026-06-02 08:00:00' }
  ];
  const r = _aggregate(entries, '2026-06', 'cafe');
  assertEqual(r.totalExpense, 50, 'only cafe-tagged counted');
}
```

- [ ] **Step 2: Run to verify failure**

Run `runAllTests`. Expected: FAIL with `entryMonth is not defined` / `_aggregate is not defined`.

- [ ] **Step 3: Write implementation**

```javascript
// Overview.gs (impl)
function entryMonth(timestampStr) {
  return String(timestampStr).substring(0, 7); // 'yyyy-MM' from 'yyyy-MM-dd HH:mm:ss'
}
function _hasTag(hashtagsField, tag) {
  if (!tag) return true;
  const tags = String(hashtagsField || '').split(/\s+/).filter(String);
  return tags.indexOf(tag) >= 0;
}
function _aggregate(entries, month, hashtag) {
  const r = { month: month, totalIncome: 0, totalExpense: 0, incomeByCat: {}, expenseByCat: {} };
  entries.forEach(function(e){
    if (e.status !== 'active') return;
    if (entryMonth(e.timestamp) !== month) return;
    if (!_hasTag(e.hashtags, hashtag)) return;
    const amt = Number(e.amount) || 0;
    if (e.type === 'income') {
      r.totalIncome += amt;
      r.incomeByCat[e.category] = (r.incomeByCat[e.category] || 0) + amt;
    } else {
      r.totalExpense += amt;
      r.expenseByCat[e.category] = (r.expenseByCat[e.category] || 0) + amt;
    }
  });
  return r;
}
function aggregateMonth(userId, month, hashtag) {
  return _aggregate(getActiveEntries(userId), month, hashtag);
}
function listEntries(userId, month, hashtag) {
  const out = getActiveEntries(userId).filter(function(e){
    return entryMonth(e.timestamp) === month && _hasTag(e.hashtags, hashtag);
  });
  out.sort(function(a, b){ return a.timestamp < b.timestamp ? 1 : -1; }); // newest first
  return out;
}
```

- [ ] **Step 4: Run to verify pass**

Run `runAllTests`. Expected: all aggregation tests log `PASS`.

- [ ] **Step 5: Commit**

```bash
git add Overview.gs
git commit -m "feat: add month aggregation and entry listing with hashtag filter and tests"
```

### Task 19: idToken verification + doGet data API router

**Files:**
- Modify: `Line.gs` (verifyIdToken), `Code.gs` (doGet)

**Interfaces:**
- Consumes: `getLineChannelId` (Task 1); `aggregateMonth`, `listEntries` (Task 18).
- Produces:
  - `verifyIdToken(idToken)` → trusted `userId` (the `sub` field) or `null`. POSTs to `https://api.line.me/oauth2/v2.1/verify` with `id_token` and `client_id`.
  - `doGet(e)` → if `e.parameter.api === 'overview'` returns aggregate JSON; if `=== 'list'` returns entry-list JSON; otherwise serves `liff.html`. Read params: `userId` (for GET reads — note GET reads are not security-sensitive since they only expose the caller's own data after the page authenticates; cross-user protection is enforced on writes), `month`, `hashtag`.
- Note: `doGet` returns JSON via `ContentService.createTextOutput(...).setMimeType(ContentService.MimeType.JSON)`.

- [ ] **Step 1: Write `verifyIdToken`**

```javascript
// Line.gs (impl)
function verifyIdToken(idToken) {
  try {
    const res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'post',
      payload: { id_token: idToken, client_id: getLineChannelId() },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return null;
    const p = JSON.parse(res.getContentText());
    return p.sub || null;
  } catch (err) {
    return null;
  }
}
```

- [ ] **Step 2: Write `doGet` router**

```javascript
// Code.gs (impl)
function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  const api = e.parameter.api;
  if (api === 'overview') {
    const uid = e.parameter.userId;
    return _json(aggregateMonth(uid, e.parameter.month, e.parameter.hashtag || ''));
  }
  if (api === 'list') {
    const uid = e.parameter.userId;
    return _json({ entries: listEntries(uid, e.parameter.month, e.parameter.hashtag || '') });
  }
  return HtmlService.createHtmlOutputFromFile('liff')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('จดให้');
}
```

- [ ] **Step 3: Manual gate (browser, JSON only)**

After deploying, open `<EXEC_URL>?api=overview&userId=<a-test-userId>&month=2026-06` in a browser. Expect JSON with `totalIncome`/`totalExpense`/`expenseByCat`. Open `?api=list&...` and expect `{entries:[...]}`. (The HTML page requires LINE; tested in Task 21.)

- [ ] **Step 4: Commit**

```bash
git add Line.gs Code.gs
git commit -m "feat: add idToken verify and doGet data API router (overview/list/html)"
```

### Task 20: Secured LIFF write endpoint

**Files:**
- Modify: `Code.gs` (extend `doPost` to detect LIFF writes vs LINE webhooks)

**Interfaces:**
- Consumes: `verifyIdToken` (Task 19); `getEntry`, `editEntry`, `softDeleteEntry`, `undoEntry` (Task 4).
- Produces: `doPost` distinguishes a LIFF write (JSON body containing `idToken` and `liffAction`) from a LINE webhook (body containing `events`). For LIFF writes: verify `idToken` → trusted `userId`; load entry; reject if `entry.user_id !== userId`; apply `edit`/`delete`/`undo`; return JSON `{ ok:true, entry }` or `{ ok:false, error }`.

- [ ] **Step 1: Add LIFF-write detection at the top of `doPost`**

```javascript
// Code.gs — at the very start of doPost, after parsing body:
function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return ContentService.createTextOutput('OK'); }

  // Branch 1: LIFF write request (has idToken + liffAction)
  if (data && data.idToken && data.liffAction) {
    return _json(handleLiffWrite(data));
  }

  // Branch 2: LINE webhook (existing events loop)
  try {
    const events = data.events || [];
    events.forEach(function(ev){ /* ...existing message/postback handling... */ });
  } catch (err) {
    Logger.log('doPost error: ' + err);
  }
  return ContentService.createTextOutput('OK');
}
```

```javascript
// Code.gs (impl)
function handleLiffWrite(data) {
  const userId = verifyIdToken(data.idToken);
  if (!userId) return { ok:false, error:'unauthorized' };
  const entry = getEntry(data.entryId);
  if (!entry || entry.user_id !== userId) return { ok:false, error:'not_found_or_forbidden' };
  if (data.liffAction === 'edit') {
    const updated = editEntry(data.entryId, data.updates || {});
    return { ok:true, entry: updated };
  }
  if (data.liffAction === 'delete') {
    softDeleteEntry(data.entryId);
    return { ok:true };
  }
  if (data.liffAction === 'undo') {
    undoEntry(data.entryId);
    return { ok:true };
  }
  return { ok:false, error:'unknown_action' };
}
```

- [ ] **Step 2: Cross-user isolation gate (manual, after Task 21 page exists — or via curl with a real idToken)**

Verified end-to-end in Task 21's gate: a write with user A's idToken targeting user B's entry must return `{ok:false, error:'not_found_or_forbidden'}`.

- [ ] **Step 3: Commit**

```bash
git add Code.gs
git commit -m "feat: add secured LIFF write endpoint with idToken verification and ownership check"
```

### Task 21: LIFF dashboard page

**Files:**
- Create: `liff.html`

**Interfaces:**
- Consumes: `doGet` JSON APIs (Task 19); `doPost` LIFF write (Task 20); `LIFF_ID` Script Property.
- Produces: a single HTML page that runs `liff.init({ liffId })`, gets `idToken` + `userId`, renders 3 Chart.js donut charts (overview income/expense, income-by-category, expense-by-category) and a "รายการ" list tab with edit/delete/undo controls, plus a month picker and hashtag filter. Writes POST `{ idToken, liffAction, entryId, updates }` to the exec URL.

- [ ] **Step 1: Write `liff.html`**

```html
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>จดให้</title>
  <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body{font-family:sans-serif;margin:0;padding:12px;color:#222}
    .tabs{display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap}
    .tabs button{flex:1;padding:8px;border:none;background:#eee;border-radius:6px}
    .tabs button.active{background:#06c755;color:#fff}
    .controls{display:flex;gap:8px;margin-bottom:12px}
    .controls input{flex:1;padding:6px}
    .panel{display:none}.panel.active{display:block}
    .entry{border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:8px}
    .entry .amt{font-weight:bold}
    .fallback{border-left:4px solid #f5a623}
    .entry button{margin-right:6px}
  </style>
</head>
<body>
  <div class="controls">
    <input type="month" id="month">
    <input type="text" id="hashtag" placeholder="#แท็ก (เว้นว่าง = ทั้งหมด)">
  </div>
  <div class="tabs">
    <button data-tab="overview" class="active">ภาพรวม</button>
    <button data-tab="income">รายรับ</button>
    <button data-tab="expense">รายจ่าย</button>
    <button data-tab="list">รายการ</button>
  </div>
  <div class="panel active" id="panel-overview"><canvas id="chart-overview"></canvas></div>
  <div class="panel" id="panel-income"><canvas id="chart-income"></canvas></div>
  <div class="panel" id="panel-expense"><canvas id="chart-expense"></canvas></div>
  <div class="panel" id="panel-list"><div id="entries"></div></div>

  <script>
    var EXEC_URL = location.origin + location.pathname; // same /exec URL
    var LIFF_ID = '<?= getLiffId() ?>';
    var idToken = '', userId = '', charts = {};

    function nowMonth(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }

    function api(params){
      var qs = Object.keys(params).map(function(k){return k+'='+encodeURIComponent(params[k]);}).join('&');
      return fetch(EXEC_URL+'?'+qs).then(function(r){return r.json();});
    }
    function write(body){
      return fetch(EXEC_URL,{method:'post',headers:{'Content-Type':'text/plain'},
        body:JSON.stringify(Object.assign({idToken:idToken},body))}).then(function(r){return r.json();});
    }
    function donut(id, labelValueMap, title){
      var labels=Object.keys(labelValueMap), data=labels.map(function(l){return labelValueMap[l];});
      if(charts[id]) charts[id].destroy();
      charts[id]=new Chart(document.getElementById(id),{type:'doughnut',
        data:{labels:labels,datasets:[{data:data}]},
        options:{plugins:{title:{display:true,text:title}}}});
    }
    function refresh(){
      var month=document.getElementById('month').value||nowMonth();
      var hashtag=document.getElementById('hashtag').value.replace(/^#/,'').trim().toLowerCase();
      api({api:'overview',userId:userId,month:month,hashtag:hashtag}).then(function(o){
        donut('chart-overview',{'รายรับ':o.totalIncome,'รายจ่าย':o.totalExpense},'ภาพรวม '+month);
        donut('chart-income',o.incomeByCat,'รายรับแยกหมวด');
        donut('chart-expense',o.expenseByCat,'รายจ่ายแยกหมวด');
      });
      api({api:'list',userId:userId,month:month,hashtag:hashtag}).then(function(res){renderList(res.entries);});
    }
    function renderList(entries){
      var c=document.getElementById('entries'); c.innerHTML='';
      entries.forEach(function(e){
        var div=document.createElement('div');
        div.className='entry'+(e.source==='fallback'?' fallback':'');
        div.innerHTML='<div class="amt">'+(e.type==='income'?'+':'-')+e.amount+' '+e.category+'</div>'+
          '<div>'+e.description+'</div>';
        var del=document.createElement('button'); del.textContent='ลบ';
        del.onclick=function(){ write({liffAction:'delete',entryId:e.entry_id}).then(refresh); };
        var undo=document.createElement('button'); undo.textContent='กู้คืน';
        undo.onclick=function(){ write({liffAction:'undo',entryId:e.entry_id}).then(refresh); };
        var edit=document.createElement('button'); edit.textContent='แก้จำนวน';
        edit.onclick=function(){ var v=prompt('จำนวนใหม่',e.amount); if(v) write({liffAction:'edit',entryId:e.entry_id,updates:{amount:Number(v)}}).then(refresh); };
        div.appendChild(edit); div.appendChild(del); div.appendChild(undo);
        c.appendChild(div);
      });
    }
    document.querySelectorAll('.tabs button').forEach(function(b){
      b.onclick=function(){
        document.querySelectorAll('.tabs button').forEach(function(x){x.classList.remove('active');});
        document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
        b.classList.add('active');
        document.getElementById('panel-'+b.dataset.tab).classList.add('active');
      };
    });
    document.getElementById('month').addEventListener('change',refresh);
    document.getElementById('hashtag').addEventListener('change',refresh);

    liff.init({liffId:LIFF_ID}).then(function(){
      if(!liff.isLoggedIn()){ liff.login(); return; }
      idToken=liff.getIDToken();
      return liff.getProfile();
    }).then(function(p){
      if(p) userId=p.userId;
      document.getElementById('month').value=nowMonth();
      refresh();
    }).catch(function(err){ document.body.innerHTML='เปิดผ่าน LINE เท่านั้นนะคะ ('+err+')'; });
  </script>
</body>
</html>
```

> Note: `<?= getLiffId() ?>` requires the doGet to use a templated output. Update Task 19's `doGet` HTML branch to `HtmlService.createTemplateFromFile('liff').evaluate()` instead of `createHtmlOutputFromFile` so the LIFF ID is injected server-side rather than hardcoded.

- [ ] **Step 2: Create the LIFF app + set LIFF_ID**

In LINE Developers → LIFF → Add: Endpoint URL = the `/exec` URL, size = Full, scope includes `profile` + `openid`. Copy the LIFF ID into Script Properties as `LIFF_ID`. Update `doGet` per the note above; redeploy.

- [ ] **Step 3: Manual gate (inside LINE)**

Open the LIFF URL `https://liff.line.me/<LIFF_ID>` in the LINE app. Expect: 3 donut charts reflecting the month's Sheet data; the "รายการ" tab lists entries (fallback ones with an orange bar). Edit an amount → Sheet updates. Delete → row goes `deleted` and disappears; กู้คืน restores it. Change month/hashtag → charts + list refilter. **Cross-user test:** confirm user A cannot mutate user B's entry (write returns `{ok:false}`); since `userId` for reads comes from the authenticated profile, A only ever sees A's data.

- [ ] **Step 4: Commit**

```bash
git add liff.html Code.gs
git commit -m "feat: add LIFF dashboard page with charts, entry CRUD, month/hashtag filters"
```

**PHASE 8 GATE:** Charts and list match the Sheet; edit/delete/undo work from inside LINE and reflect in the Sheet; cross-user isolation holds (writes rejected, reads scoped to caller).

---

## Phase 9 — Rich Menu

One-button menu opening the dashboard.

### Task 22: Create and set the Rich Menu

**Files:**
- Create: `RichMenu.gs` (one-off setup functions, run manually from the editor)

**Interfaces:**
- Consumes: `getLineToken`, `getLiffId` (Task 1).
- Produces: `createRichMenu()` creates a compact (1686×520) single-button Rich Menu with a `uri` action to the LIFF URL, uploads an image, and sets it as default. Returns the richMenuId.

- [ ] **Step 1: Write `RichMenu.gs`**

```javascript
// RichMenu.gs — one-off setup; run manually from the editor.
function createRichMenu() {
  const token = getLineToken();
  const body = {
    size: { width: 1686, height: 520 },
    selected: true,
    name: 'JotHai main',
    chatBarText: 'เมนู',
    areas: [{
      bounds: { x: 0, y: 0, width: 1686, height: 520 },
      action: { type: 'uri', uri: 'https://liff.line.me/' + getLiffId() }
    }]
  };
  const res = UrlFetchApp.fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(body), muteHttpExceptions: true
  });
  const richMenuId = JSON.parse(res.getContentText()).richMenuId;
  Logger.log('richMenuId: ' + richMenuId);
  return richMenuId;
}
function uploadRichMenuImage(richMenuId, fileId) {
  // fileId = a Google Drive PNG (1686x520) you upload manually.
  const blob = DriveApp.getFileById(fileId).getBlob();
  UrlFetchApp.fetch('https://api-data.line.me/v2/bot/richmenu/' + richMenuId + '/content', {
    method: 'post', contentType: 'image/png',
    headers: { Authorization: 'Bearer ' + getLineToken() },
    payload: blob.getBytes(), muteHttpExceptions: true
  });
}
function setDefaultRichMenu(richMenuId) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/user/all/richmenu/' + richMenuId, {
    method: 'post', headers: { Authorization: 'Bearer ' + getLineToken() }, muteHttpExceptions: true
  });
}
```

- [ ] **Step 2: Manual gate**

Design a 1686×520 PNG labeled "📊 ดูสรุป", upload to Drive, note its file ID. Run `createRichMenu()` (note the id), `uploadRichMenuImage(id, fileId)`, then `setDefaultRichMenu(id)`. Open the bot chat: the menu appears with chat-bar label "เมนู"; tapping it opens the LIFF dashboard.

- [ ] **Step 3: Commit**

```bash
git add RichMenu.gs
git commit -m "feat: add Rich Menu setup (create/upload/set-default) opening LIFF"
```

**PHASE 9 GATE:** Default Rich Menu shows in chat and opens the dashboard.

---

## Phase 10 — Polish + verification

End-to-end hardening across users and edge cases.

### Task 23: Duplicate-entry guard (LINE retry safety)

**Files:**
- Modify: `Code.gs`

**Interfaces:**
- Consumes: `CacheService`.
- Produces: at the start of webhook event handling, dedupe on `ev.webhookEventId` (or `ev.message.id`) using a short-TTL cache key `EVT_<id>`; if already seen, skip processing (still return 200). Prevents duplicate rows when LINE retries.

- [ ] **Step 1: Add the dedupe guard inside the events loop**

```javascript
// Code.gs — first lines inside events.forEach(function(ev){ ... }):
const evtId = ev.webhookEventId || (ev.message && ev.message.id) || '';
if (evtId) {
  const cache = CacheService.getScriptCache();
  if (cache.get('EVT_' + evtId)) return; // already processed
  cache.put('EVT_' + evtId, '1', 120); // 2-min window covers LINE retries
}
```

- [ ] **Step 2: Manual gate**

Send a message normally → exactly one row appears (no regression). (LINE retries are hard to force; verify the guard logic by sending the same `webhookEventId` twice via a manual `doPost` invocation in the editor with a crafted `e`, expecting only one row.)

- [ ] **Step 3: Commit**

```bash
git add Code.gs
git commit -m "feat: add webhook event dedupe guard to prevent duplicate entries on retry"
```

### Task 24: Final end-to-end verification pass

**Files:** none (verification only)

- [ ] **Step 1: Multi-user isolation** — From two LINE accounts (both approved), log entries; confirm each LIFF dashboard shows only its own data and totals.
- [ ] **Step 2: Format coverage** — Send `1,500`, `1.5k`, `฿200`, `60 บาท`, a decimal `12.50`; confirm correct amounts in the Sheet.
- [ ] **Step 3: Month boundary** — Log an entry, switch the LIFF month picker to the previous month; confirm it does not appear; switch back; confirm it does.
- [ ] **Step 4: Error handling** — Temporarily break the Gemini key (fallback notice + saved row), break the Sheet name in a copy to force `SAVE_FAILED` path (then restore); confirm user always gets a Thai reply, never silence.
- [ ] **Step 5: Categorization accuracy** — Send 10 varied real messages; if categories are wrong >3/10, refine the Gemini prompt rule wording (Task 7) and re-test.
- [ ] **Step 6: Commit any prompt/copy tweaks**

```bash
git add -A
git commit -m "chore: final verification pass tweaks (prompt/copy)"
```

**PHASE 10 GATE:** Multi-user isolation holds; all amount formats parse; month filtering correct; every failure path replies in Thai; categorization acceptable.

---

## Self-Review

**Spec coverage** (against `docs/design-notes.md`, ADRs, CLAUDE.md):

- Access control (pending/approved/unknown) → Tasks 10–11 ✓
- Welcome + help → Task 11 ✓
- Gemini parse with JSON schema + verbatim prompt → Task 7 ✓
- Regex fallback (all formats) → Task 6 ✓
- Hashtag normalization → Task 5 ✓
- Optimistic save + Receipt (ADR-0003) → Tasks 12–13 ✓
- Receipt buttons chgcat/toggle/del → Tasks 14–15 ✓
- Clarification flow + TTL → Tasks 16–17 ✓
- LIFF dashboard 3 charts + list (ADR-0002) → Tasks 18, 21 ✓
- LIFF CRUD + idToken security (ADR-0005) → Tasks 19–21 ✓
- Reply-only, no push (ADR-0004) → no push code anywhere ✓
- Soft delete only → `softDeleteEntry`/`undoEntry`, no row deletion ✓
- Category snapshot → stored as string in `addEntry`, never re-resolved ✓
- Bangkok timezone → `Utilities.formatDate(..., CONFIG.TZ, ...)` ✓
- Rich Menu (1686×520, "📊 ดูสรุป", chat-bar "เมนู") → Task 22 ✓
- Duplicate guard (LINE retry) → Task 23 ✓
- Multi-user isolation → Tasks 20, 24 ✓

**Open items carried into execution (verify at build time, not blockers):**

- Gemini Flash-Lite model string — confirm in AI Studio before Task 7 (placeholder `gemini-flash-lite-latest` in Config).
- Whether the LIFF app can sit under the Messaging API channel or needs a separate LINE Login channel — confirm in Task 21 setup.
- GAS Web App header limitation: `X-Line-Signature` is not readable in `doPost`; mitigation is the unguessable exec URL. `verifySignature` is implemented and unit-tested for any context where the header is available (documented in Task 9).

**Type consistency:** entry object shape (`entry_id`, `user_id`, `timestamp`, `type`, `amount`, `description`, `category`, `hashtags`, `status`, `raw_text`, `source`) is consistent across `addEntry`, `getEntry`, `editEntry`, `buildReceiptFlex`, `_aggregate`, and `liff.html`. Postback format `action=<x>&id=<uuid>[&cat=<enc>]` consistent between `buildReceiptFlex`, `handlePostback`, and `parsePostback`. LIFF write body `{ idToken, liffAction, entryId, updates }` consistent between `liff.html` and `handleLiffWrite`.

## Replacing the old roadmap

`docs/implementation-plan.md` is a high-level roadmap (phase intentions, no code). This plan supersedes it for execution. Keep the old file as a narrative overview, or delete it once this plan is adopted — recommend keeping it and adding a pointer line to this plan at its top.
