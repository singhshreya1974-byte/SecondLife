# Prompt Log & AI Error Audit (`GREEN · Second Life`)

## Prompts Used

1. **Initial Brainstorm Prompt**: Asked what twists and features to add beyond the base campus marketplace brief (swap, trust badges, why-this-price, renting, college events, condition stickers, 1st-person item voices, under-a-minute chip UI, branch/semester filters, wanted notifications, lost & found).
2. **Feature Implementation Prompt**: Built the initial React + Express prototype with 200 generated records, condition stickers, first-person item monologues, bidding, swap, rent, need alerts, and lost & found.
3. **Full Specification Upgrade Prompt**: Requested `seed.py` (fixed seed 42) with 200 past sales + 40 users + 3 insights, SQLite persistence, `/api/price-suggestion` fitted directly from generated data with ordered receipt, OpenAPI docs, leaving-campus countdown, Quick/Fair/Patient slider, buyer fairness meter + counter-offer, user sticker/emoji customization, college events with countdowns, mutual trade reviews, edge-case handling, and automated tests.
4. **Master Product Extension — Phase 1 Prompt**: Requested extending the existing application with the Neo-Brutalist comic-panel visual identity (matching the 3 provided UI screenshots), unified `SELL` / `SWAP` / `BORROW` / `RENT` listing model, private `min_acceptable_price` on SELL listings, deterministic Little Loops item mascots, selective campus verification, and strict backward-compatible SQLite schema upgrades while preserving the fitted pricing engine and 200-record dataset.

---

## What the AI Got Wrong (and How It Was Fixed)

### 1. Condition & Month Modulo Bug in `seed.py`
* **What happened**: In the first draft of `seed.py`, month selection used `MONTHS[(i * 5 + idx) % 12]` and condition selection used `CONDITIONS[(i * 3 + idx) % 4]`. Because both `i` and `idx` incremented by `1` each loop, `(i * 3 + idx) % 4` stepped by `4 ≡ 0 (mod 4)`, assigning the exact same condition to every record in a category and skipping May (`month_sold = 5`) completely—causing a `ZeroDivisionError` in `generate_insights()`.
* **How it was fixed**: Verified `seed.py` immediately by running it and inspecting `data_insights.json`. Replaced the stepping expressions with `MONTHS[(idx - 1) % 12]` and `CONDITIONS[(i + cat_idx + (i // 4)) % 4]`, confirming all 12 months and all 4 conditions appear across every category with realistic spread (e.g., 43-point condition spread for Cycles).

### 2. Environment Check for FastAPI vs. Sandbox Runtime
* **What happened**: The specification asked for Python FastAPI + SQLAlchemy, while the AI Studio Build container had Python 3.11 (`sqlite3` stdlib) without `pip`, `fastapi`, `sqlalchemy`, or `uvicorn`, and routes live preview traffic to Node on port 3000.
* **How it was fixed**: Instead of writing unrunnable FastAPI code, verified installed binaries upfront, built `seed.py` in Python 3.11 using `sqlite3` + `random.Random(42)`, and backed the Express API directly with Node 22's native `node:sqlite` (`DatabaseSync`) reading `second_life.db` plus OpenAPI 3.0 docs at `/docs`—keeping one-command startup (`npm run dev`) working end-to-end.

### 3. Schema Field Rename Mismatch on Upgrade
* **What happened**: When upgrading `LostFoundBoard` from an in-memory store (`type: 'lost' | 'found'`) to SQLite (`post_type: 'lost' | 'found'`), the component initially still referenced `post.type`.
* **How it was fixed**: Caught before compilation and updated `LostFoundBoard.tsx` to read and submit `post_type`, verified with `tsc --noEmit` and `vite build`.

### 4. Preserving Existing React + SQLite Stack vs. Spec Template Stack Header
* **What happened**: The Phase 1 master specification template referenced Vanilla JS + MySQL as its generic starting example, whereas this repository already runs React 19 + Vite + Express + TypeScript + SQLite (`second_life.db`).
* **How it was fixed**: Followed the "do not rebuild or break working code" rule—kept the existing SQLite (`node:sqlite` + `seed.py`) backend and React + Tailwind CSS frontend intact, added automatic `PRAGMA table_info` schema migrations (`ensureSchemaUpgraded`) so existing databases upgrade cleanly without losing records, and corrected the active listing count log in `seed.py` (from 10 to 12) after adding seeded `BORROW` listings.
