# CryptoTrack

A dark, data-dense crypto portfolio dashboard. Built with **HTML5, SCSS, and vanilla JavaScript ES6+** — no frameworks, no build step, no dependencies beyond Chart.js and a pair of Google Fonts.

Designed to feel like a Bloomberg terminal crossed with a DeFi interface, not a generic SaaS product.

---

## What's in it

- **Portfolio header** with animated counters (count-up from zero on load)
- **Coin cards** for BTC / ETH / SOL / BNB — current price, 24h change, 7-day change, holdings, USD value, 24h high/low
- **Interactive price chart** (Chart.js) — click a coin card to swap the dataset; switch between 7 / 30 / 90 day windows
- **Transactions table** — live search by coin, sortable columns (click a header to toggle asc/desc), 8-row pagination
- **Collapsible sidebar** — remembers state via `localStorage`; on mobile, becomes a slide-in drawer
- **Live UTC clock** and a pulsing "live feed" indicator
- **Responsive layout** — 4-up cards on desktop, 2x2 on tablet, stacked on phone
- **Keyboard accessible** — tab through cards, Enter/Space to activate

---

## Stack

| Layer | Choice |
|---|---|
| Markup | HTML5 |
| Styles | SCSS (BEM), compiled manually |
| Scripts | Vanilla JS ES6+ modules (`type="module"`) |
| Chart | [Chart.js 4.x](https://www.chartjs.org/) via CDN |
| Fonts | JetBrains Mono (numbers), Syne (labels) — Google Fonts CDN |
| Icons | Inline SVG + [cryptocurrency-icons](https://github.com/spothq/cryptocurrency-icons) for coin marks |

No bundler. No transpiler. No npm `dependencies` in `package.json` (none at all, actually — the repo has no `package.json`).

---

## Running it locally

```bash
# 1. Clone
git clone <this-repo> cryptotrack && cd cryptotrack

# 2. Compile the SCSS (one-off)
npx sass scss/main.scss css/main.css --style=expanded

#    …or keep it watching on edits
npx sass --watch scss/main.scss css/main.css

# 3. Serve the folder
npx serve -l 3000 .
#    then open http://localhost:3000
```

Opening `index.html` directly via `file://` also works, but ES module imports need an HTTP origin — so use a static server.

### View it on your phone (same Wi-Fi)

```bash
# Get your LAN IP (Windows)
ipconfig | findstr IPv4

# Start the server, then open http://<your-ip>:3000 on the phone
npx serve -l 3000 .
```

If the phone can't reach it, your OS firewall is blocking port 3000. On Windows, allow it with:

```powershell
New-NetFirewallRule -DisplayName "CryptoTrack dev 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
```

---

## Project structure

```
.
├── index.html               # Single page, no templating
├── assets/
│   ├── favicon.svg
│   └── icons/               # btc.svg, eth.svg, sol.svg, bnb.svg
├── scss/
│   ├── main.scss            # Imports every partial, nothing else
│   ├── _variables.scss      # Design tokens
│   ├── _reset.scss
│   ├── _typography.scss
│   ├── _layout.scss
│   ├── _sidebar.scss
│   ├── _header.scss
│   ├── _cards.scss
│   ├── _chart.scss
│   ├── _table.scss
│   └── _animations.scss
├── css/
│   └── main.css             # Compiled output
└── js/
    ├── main.js              # Entry point — wires modules together
    ├── data.js              # Mock coins, transactions, price series, formatters
    ├── ui.js                # Card + table rendering, sort/filter/pagination
    ├── chart.js             # Chart.js config, per-coin data + tab switching
    ├── animations.js        # Number count-up, UTC clock, IntersectionObserver
    └── sidebar.js           # Desktop collapse + mobile drawer
```

BEM naming throughout. Every number in the UI renders in JetBrains Mono with tabular figures so columns line up.

---

## Data

All data is mocked and defined in [`js/data.js`](js/data.js):

- **4 coins** with realistic early-2026 prices and holdings
- **15 transactions** over the last 30 days, mixed buy/sell, mixed profit/loss
- **Price series** for each coin at 7 / 30 / 90 day windows

Swapping in a live API (CoinGecko, CoinMarketCap, etc.) is a matter of replacing those exports and adjusting `fmtCurrency` / `fmtPercent` if you need different locales. The rendering layer never talks to anything but `data.js`.

---

## Design rules this project follows

A few constraints that keep it from looking like every other dashboard template:

- No purple gradients anywhere (SOL is purple, but only as a line stroke — its chart fill uses cyan)
- No backdrop-filter blur above 4px — restrained glass, not frosted bloat
- No border-radius above 12px on cards — sharp, not bubbly
- No Inter / Roboto / system-ui — JetBrains Mono + Syne only
- Coin brand colors appear only on card hover glow and as tiny chart strokes, not as decorative backgrounds
- Five palette colors total: two backgrounds, green (positive), red (negative), cyan (interactive)

---

## Browser support

Modern evergreen browsers (Chromium, Firefox, Safari 14+). Uses ES modules, `IntersectionObserver`, `matchMedia`, CSS custom properties, `100dvh`. No polyfills.

---

## Deployment

The folder is static and self-contained. Drop it on anything:

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir=.

# GitHub Pages — just push to a Pages-enabled branch
```

No `build` step, no output directory to configure — `index.html` is the entry point and everything it references is a relative path.

---

## Known limitations

- Transactions are read-only. There's no "add transaction" form.
- The sidebar's `Portfolio` / `Markets` / `Settings` links are visual only — they don't route anywhere.
- Data is static: prices, holdings, and the clock's date don't change until you edit the source.

These are fine for a portfolio piece. If you fork this for real use, hook `data.js` up to an API and add a state layer.

---

## License

MIT. Use it, fork it, rip the styles out, whatever you need.
