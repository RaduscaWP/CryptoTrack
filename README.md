# CryptoTrack

CryptoTrack is a crypto **paper-trading dashboard** built with plain HTML, CSS and vanilla JavaScript — no framework, no build step, no backend. It pulls live market data from public REST APIs and lets you run a demo account against it: you start with virtual cash, place market orders at real prices, and watch your P/L move with the market.

Live: https://crypto-track-rho.vercel.app

## What it does

**Live market data.** Prices, 24h/7d change, sparklines, market caps, volume, global capitalisation, BTC dominance and the Fear & Greed index all come from public REST endpoints. Nothing on the dashboard is hard-coded.

**A demo account.** On first visit you pick a display name and a starting balance ($10k / $100k / $1M). That funds a virtual account held in `localStorage`.

**Real order mechanics.** Market buys and sells fill instantly at the live price with a 0.10% fee on both sides. The app tracks average cost per position, unrealised P/L, realised P/L, cash, equity and allocation. Overselling and overspending are rejected; "Max" spends or sells the balance exactly.

**Views.** Dashboard, Portfolio, Markets, Trade desk, Order history, Watchlist and Settings.

## REST APIs used

Everything is called straight from the browser — every endpoint below returns `Access-Control-Allow-Origin: *`, so no proxy or server is needed. No API key, no sign-up.

| Data | Endpoint |
| --- | --- |
| Prices, 24h/7d change, sparkline, cap, volume | `GET api.coingecko.com/api/v3/coins/markets` |
| Price history for the charts | `GET api.coingecko.com/api/v3/coins/{id}/market_chart` |
| Global market cap and BTC dominance | `GET api.coingecko.com/api/v3/global` |
| Fear & Greed index | `GET api.alternative.me/fng/` |

### Rate limits and degradation

CoinGecko's free tier is aggressively rate-limited, so `js/api.js` is built to survive it:

- **Serial request queue** with a 260 ms gap between calls and a 12 s timeout.
- **`localStorage` cache with per-endpoint TTLs** — 60 s for prices, 5 min for global stats, 30 min for Fear & Greed, 2 min to 6 h for chart history depending on the range.
- **In-flight de-duplication**, so two views asking for the same series share one request.
- **Three-state degradation**: `live` → `cached` (API refused, serving the last good response) → `offline` (no cache either, falling back to the bundled prices in `js/data.js`). The current state is always shown in the footer.

Because the free tier caps historical data at 365 days, the chart ranges are `1D / 1W / 1M / 3M / 1Y` — there is no `ALL`.

## Run locally

No install step. Open `index.html` directly, or serve it:

```bash
python -m http.server 4173
```

Then open http://127.0.0.1:4173

## Project structure

```text
.
|-- index.html
|-- css/
|   |-- main.css          design system, dashboard layout
|   `-- views.css         account views, order ticket, modal
`-- js/
    |-- data.js           tracked coin universe + offline fallback generators
    |-- util.js           DOM and formatting helpers, token badges, toasts
    |-- api.js            REST layer: queue, cache, TTLs, degradation
    |-- account.js        demo account: cash, positions, fills, P/L, watchlist
    |-- live.js           central live-data store and polling loop
    |-- chart.js          inline SVG charts (spark, area, donut, bars)
    |-- views.js          Portfolio / Markets / History / Watchlist
    |-- trade.js          trade desk and order ticket
    |-- onboard.js        first-run account modal + Settings
    |-- ui.js             dashboard rendering
    |-- sidebar.js        router + mobile drawer
    `-- main.js           boot sequence
```

## How the account works

State lives under `ct.account.v1` in `localStorage`:

- `cash` — virtual USD available
- `positions` — `{ SYM: { qty, cost } }`, where `cost` is the remaining basis **including fees**
- `trades` — every fill, with price, fee, USD value and realised result
- `equity` — a rolling equity curve, sampled at most twice a minute

A sell realises `proceeds − (average cost × quantity)`. Positions left below 1e-8 units after a sell are closed out and the residual basis is booked as a loss, so no dust rows accumulate.

Prices refresh every 60 seconds and whenever the tab regains focus. Background refreshes repaint in place without replaying card animations, and never rebuild a chart you're hovering or an input you're typing in.

## Notes

This is paper trading. There is no exchange connection, no real funds, no order book and no slippage — fills are instant at the live mid price. Everything is stored in your browser; clearing site data resets the account.
