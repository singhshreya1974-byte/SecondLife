# GREEN · Second Life (Campus Thrift) — Circular Campus Marketplace

Give seniors' books, calculators, cycles, lab gear, electronics, and hostel items a second life with juniors at a transparent, data-backed price.

## Quick Start (One Command)

```bash
npm install
npm run dev
```

* Opens on `http://localhost:3000` (interactive OpenAPI documentation at `/docs` and `/api/openapi.json`).
* On first run, `second_life.db` is automatically seeded via `python3 seed.py` using fixed random seed `42` (200 past sales, 40 pseudonymous users with selective campus verification, 5 college events, 12 active unified listings across `SELL`/`SWAP`/`BORROW`/`RENT`, swaps, rentals, needs, and `data_insights.json`).
* Safe backward-compatible schema migration runs automatically on startup via `ensureSchemaUpgraded(db)`.

### Run Automated Tests

```bash
node --test tests/price_engine.test.mjs
```

---

## Phase 1 Additions (Foundation, Neo-Brutalist Redesign & Unified 4-Type Listings)

1. **Unified 4-Mode Listing System (`sale` / `swap` / `borrow` / `rent`)**:
   * **SELL (`sale`)**: Suggested fair price from SQLite regression, seller asking price, `negotiable` toggle, and **private `min_acceptable_price`** (stored in SQLite, enforced `<= asking_price`, and **strictly omitted** from all public listing/marketplace API responses and buyer UI).
   * **SWAP (`swap`)**: Exchange target description, accepted swap category chips (`swap_categories`), and multi-item flexibility flag (`swap_multi_ok`).
   * **BORROW (`borrow`)**: Free temporary campus lending (`asking_price = 0`, `rent_per_week = 0`) with `borrow_min_days`, `borrow_max_days`, `collection_location`, `borrow_conditions`, and availability window (`available_from` / `available_until`).
   * **RENT (`rent`)**: Paid temporary rentals with weekly rate, optional refundable deposit, duration bounds, and pickup location.
2. **Little Loops Deterministic Mascots (`server/mascot.ts`)**:
   * Category-specific first-person characters (`PageBuddy`, `CalcBot`, `Spokey`, `BeakerPal`, `VoltLoop`, `KettlePal`) driven by predefined templates using category, age, condition, and transaction type—no external LLM API calls.
3. **Pseudonymous Profiles & Selective Campus Verification**:
   * All profiles remain pseudonymous (handle + emoji avatar + sticker wall); only a subset of accounts start `campus_verified`, with interactive verification via `POST /api/users/:id/verify`.
4. **Neo-Brutalist Comic-Panel UI**:
   * Warm cream canvas (`#FFFBF0`), `#161816` ink borders, offset hard shadows, `#FFE047` hero banner, 3-panel pastel showcase (`#DBEAFE` / `#FEF08A` / `#D1FAE5`), tilted condition stickers, and comic-cover listing cards.

---

## API Contract Summary

| Method & Endpoint | Purpose |
|---|---|
| `GET /api/price-suggestion` | Returns `fair_price`, `quick_sale_price`, `patient_price`, `rent_price_per_week`, `suggested_deposit`, `swap_value`, `confidence`, `similar_count`, and ordered `why_this_price` receipt fitted from SQLite `past_sales`. |
| `GET /api/listings` | Search & filter by `category`, `min_price`, `max_price`, `condition`, `type` (`sale\|swap\|borrow\|rent`), `branch`, `semester`, `event_id`, `q`, and `sort`. Never exposes `min_acceptable_price`. |
| `POST /api/listings` | Creates a unified `sale`/`swap`/`borrow`/`rent` listing with server validation (non-negative prices/ages, `min_acceptable_price <= asking_price`, `borrow_max_days >= borrow_min_days`), duplicate guard (`409`), mascot generation, and Need-Alert matching. |
| `GET /api/listings/:id` | Returns public item detail with `fairness_tag` (`Steal` / `Fair` / `Overpriced`), mascot, availability/pickup metadata, bids, and counter-offers (never leaks `min_acceptable_price`). |
| `GET /api/mascot-preview` | Deterministic Little Loops mascot preview for category, age, condition, and transaction type. |
| `POST /api/swaps` & `PATCH /api/swaps/:id` | Propose swap with automatic `value_balance_diff` and accept/decline. |
| `POST /api/rentals` & `PATCH /api/rentals/:id` | Book rental (enforces `end_date`) and mark `on_time` / `late` return to update renter trust score. |
| `GET / POST /api/needs` | Junior Wanted Board showing `"N seniors have this"` and triggering notifications when future listings match. |
| `GET / POST /api/events` & `GET /api/events/:id/listings` | College events with live countdowns and event-tagged gear bundles. |
| `GET /api/users/:id`, `PATCH /api/users/:id/profile`, `POST /api/users/:id/verify` | Computed Trust Badge (`New here` → `Campus Legend`), sticker/emoji customization, and campus roll-code verification. |
| `POST /api/trades/:id/review` | Buyer and seller mutual rating updating completed trades and condition accuracy. |
| `GET /api/impact` | Live campus `total_rupees_saved`, `total_kg_waste_avoided`, per-category impact, and 3 pitch findings. |
