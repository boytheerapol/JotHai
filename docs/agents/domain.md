# Domain Docs

**Layout:** Single-context

## Where to look

- **Domain glossary:** `CONTEXT.md` at the repo root
- **Architecture decisions:** `docs/adr/` at the repo root (ADR-0001 through ADR-0006)

## Consumer rules

- Read `CONTEXT.md` before any task that touches domain terminology (Entry, Receipt, Clarification, Category, Hashtag, etc.)
- Read the relevant ADR(s) before changing anything in the affected area (e.g. ADR-0006 before touching Gemini fallback logic)
- If a term is ambiguous, `CONTEXT.md` is authoritative over code comments
