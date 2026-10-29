# BellaChow — an AI food concierge concept for Chowdeck

> **An unofficial product concept by Temitope Samuel Akinmoladun. Not affiliated with Chowdeck.**
> Portfolio prototype only: simulated ordering, no real payments, no live restaurant or rider integrations.

**Planned URL:** https://bellachow.vercel.app

BellaChow is a mobile-first food-ordering prototype with **Bella**, a concierge that turns a Lagos-style craving —
*"Something spicy under ₦6k, I'm in Yaba, 30 mins max 🌶"* — into a ranked shortlist with the **all-in estimated
price** and an **honest ETA**, then carries the user through cart, simulated checkout and tracking. On desktop a
**Product Lead view** sits beside the phone: problem, bet, metrics and rollout.

---

## The problem and the bet

Hungry, undecided users scroll through dozens of menus, then meet fees and delivery times late in checkout.

| | |
|---|---|
| **Hypothesis 1** | Intent-based ordering lifts conversion among users who don't know what to eat. |
| **Hypothesis 2** | All-in pricing reduces checkout abandonment and fee-related support tickets. |
| **North star** | Orders placed via Bella per week |

Both are **hypotheses to test**, not results. All targets in the app are labelled *Hypothesis*.

### Evidence — validation pending
The brief supplied a review analysis: 600 recent Google Play reviews (Dec 2025–Oct 2026); 24% one-star; among 1–2★
reviews ~38% mention delays, ~21% crashes/lag, ~13% fees. **These figures come from the portfolio brief and were not
collected, audited or verified by this app.** The sample frame, classification method and percentages need validating
before they inform a business decision. Themes overlap and are not additive.

---

## Why intent-based discovery
Users already describe food with budget, area, time and mood. Bella parses that once, shows what it understood as
**editable pills** (correctable, trust-building), and returns three ranked picks — *Best match*, *Cheapest*, *Fastest* —
each one tap from the cart. "Swap" and "Show me 3 more" never silently change the constraints.

## How the Bella engine works (offline, deterministic)
`src/bella/`
- **`parse.ts`** — regex/lexicon parser: budgets (`₦6,000`, `6k`, `under 5` → ₦5,000, `₦25k total`, `8 thousand`,
  per-person vs total), 13 Lagos areas + aliases (VI, Lekki Phase 1, Ikeja GRA), `near me` → selected area, time
  (`30 mins`, `fast`/`starving` → 30), meal time, people (`for five`, `me and my babe` → 2), cravings and diet.
  A missing budget is `undefined`, never zero.
- **`rank.ts`** — builds every (item × orderable branch) candidate, applies **hard filters** (closed, empty menu,
  invalid price, known diet violation, over all-in budget, ETA lower bound > limit), then a transparent weighted score
  (craving .35, budget fit .15, rating .10, speed .15, value .15, distance .10). One card per menu item (best branch).
  Tags are derived from the visible set and only applied when literally true.
- **`group.ts`** — one-vendor group basket: enumerates item multisets (one meal per person — shown to the user as an
  assumption), keeps total ≤ budget with order-level fees charged once, scores variety + budget use + craving.
  If nothing fits, explains the binding constraint and offers fewer people / higher budget / pickup.
- **`respond.ts`** — combines both, diagnoses no-match states (budget, time, closed, diet), and names listed vendors
  whose menus are *coming soon* rather than inventing items.

### Optional Claude layer — `api/bella.ts`
A Vercel function that is **off unless `ANTHROPIC_API_KEY` is set server-side**. The browser checks `GET /api/bella`
once; with no key it never calls the model. When on, the model may only fill intent gaps and re-order **item IDs the
local engine already deemed eligible**. Responses are schema-constrained, re-validated in the browser
(`src/bella/ai.ts`), and every price, fee, ETA and eligibility check is recomputed locally. Any failure or timeout
silently falls back to the rules engine. Uses `claude-opus-5-5` at low effort with server-side refusal fallbacks.

---

## Pricing and ETA (illustrative assumptions — not Chowdeck tariffs)
All in `src/lib/config.ts`; computed only in `src/lib/pricing.ts` and `src/lib/quote.ts`, so cards, breakdown sheet,
cart, checkout and the frozen order snapshot always reconcile to the naira.

| Component | Demo rule |
|---|---|
| Packaging | ₦300 + ₦100 per extra unit, clamped ₦200–₦500, **per order** |
| Delivery | ₦500 + ₦150/km straight-line, rounded to ₦50, capped ₦2,500 |
| Service fee | 6% of food subtotal, capped ₦750 |
| Chowpass | Demo toggle: delivery → ₦0 (no membership is bought) |
| Pickup | Removes delivery only |
| ETA | prep range + ~3 min/km + 5 min buffer (pickup = prep only) |

Distances use the Haversine formula between approximate area centres (`data/areas.json`) and approximate branch
coordinates — a **straight-line prototype approximation, not road distance**, and not live GPS. Opening hours are
**illustrative demo configuration**; a demo clock (Account → Demo clock) defaults to Lagos lunchtime so the
presentation is deterministic, with *Late night* and *Real Lagos time* options. At checkout the order is frozen into a
snapshot; tracking uses that promised window even if the area changes later (accelerated demo: 1 s = 1 min).

---

## Data integrity
`data/vendors.json` is the source of truth.
- **Chicken Republic** — 17 supplied menu items with approximate prices, shared across five demo branches (Yaba, Lekki,
  Ikeja, Surulere, Victoria Island); rating 4.2 (6.9K+), prep 24–34 min, promos *Citizens BOGOF* / *BigWhizz deal*.
  Previous prices for Big Whizz Meal / Bigwhizz Reloaded are shown only as *historical reference, not verified*.
- **Placeholders (`menuId: null`, `items: []`)** — Bukka Hut (Alagomeji Yaba; Lekki Phase 1), Item 7 Go (Allen
  Ikeja; 4.5, 39.3K+, supplied promo), Firewood Smokey Party Jollof HUB (Opebi), Amala Ibadan (Ikotun), University of
  Suya (Oregun), FruityLife (GRA/LASUTH Ikeja), Domino's Pizza, Cold Stone Creamery. They show **"Menu data coming soon"**
  and never enter purchasable recommendations.
- Item tags come only from item names. No ingredient data was supplied, so Bella never asserts pork-free, vegetarian
  or healthy — it flags those requests as *not verified*.

### TODO — adding verified vendor/menu data
1. Add a menu under `menus` in `data/vendors.json` (`slug`, `name`, `section`, integer `price`, `tags`, `diet`,
   `emoji`) with a `source` and date.
2. Point the vendor's `menuId` at it; add `prepMins`, `hours`, `lat`/`lng` only from a real source.
3. Use `diet` values `pork-free` / `contains-pork` / `vegetarian` / `contains-meat` only when verified.
4. `npm test` — the data layer drops invalid records rather than patching them.

---

## Run it
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: parser, pricing, ETA, hours, ranking, group orders, AI validation
npm run build      # type-check + production build to dist/
```

## Deploy to Vercel
1. Push to GitHub, then **Import Project** in Vercel (framework: Vite, build `npm run build`, output `dist`) — or
   `npx vercel --prod` from the repo.
2. Name the project `bellachow` so the default domain is `bellachow.vercel.app` (subject to availability).
3. *(Optional)* add `ANTHROPIC_API_KEY` under Project → Settings → Environment Variables. Never prefix it with `VITE_`.
4. `vercel.json` rewrites client routes to `index.html` and leaves `/api/*` to the function.

## Architecture
```
data/             vendors.json, areas.json (source of truth)
api/bella.ts      optional Claude re-ranker (server-only)
src/bella/        parse, rank, group, respond, ai (client validation), fixtures
src/lib/          config, pricing, delivery (haversine/ETA/hours), quote, tracking, analytics, storage, formatting
src/app/          AppProvider (state, cart, orders, chat), routes, App (phone + panel layout)
src/screens/      Home, Search, Bella, Vendor, Cart, Checkout, Tracking, Orders, Account, ProductLead
src/components/   cards, sheets, pills, nav, phone frame
src/tour/         8-step guided tour that drives real app state
src/product-lead/ Product Lead panel + metric definitions
tests/            Vitest suites
```
Analytics are simulated local events (in the browser only) used to demonstrate the funnel; no raw chat text is logged.

## Known limitations / next steps
- Only Chicken Republic has menu data; other listed vendors await verified menus.
- Straight-line distance, illustrative fees and hours; no live availability, courier quotes or GPS.
- Serving sizes unknown — group baskets assume one meal per person.
- Review-analysis figures need independent validation.
- Next: verified multi-vendor menus, road-distance ETAs, ETA-accuracy instrumentation, A/B test design.
