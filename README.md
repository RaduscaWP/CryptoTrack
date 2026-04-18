# CryptoTrack Dashboard

CryptoTrack is a static crypto portfolio dashboard prototype built with plain HTML, CSS, and vanilla JavaScript. It focuses on a polished operator-style interface: a large portfolio hero, market snapshots, asset performance, allocation, watchlists, movers, news, transactions, and monthly insights.

## Highlights

- Premium light-surface dashboard layout with a bold portfolio hero
- Inline SVG charts for sparks, area charts, donuts, and bar summaries
- Clickable BTC and ETH stat cards, watchlist rows, and movers that update the main performance chart
- Coin SVG branding wired into supported assets such as Bitcoin, Ethereum, Solana, and BNB
- Prototype sidebar navigation with empty states for non-dashboard sections
- Mobile drawer menu for navigation
- Stacked card layout on small screens
- Watchlist rows collapsed into readable mobile cards
- Transaction table converted into a mobile list layout

## Tech

- HTML5
- CSS in a single compiled stylesheet: `css/main.css`
- Vanilla JavaScript split across small files in `js/`
- Google Fonts for Inter and JetBrains Mono

There is no framework, build step, or package manifest required to run the app.

## Run locally

You can open `index.html` directly, but using a small static server is the most reliable option.

```bash
python -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```

## What the dashboard includes

- Portfolio balance hero with quick actions for receive, send, and swap
- Global market trend tiles
- Four summary cards for P/L, Bitcoin, Ethereum, and invested capital
- Interactive performance chart with `1D`, `1W`, `1M`, `1Y`, and `ALL` ranges
- Portfolio allocation donut
- Watchlist, top movers, and market briefing panels
- Recent transactions with quick filters
- Monthly insight cards and realized P/L bars

## Project structure

```text
.
|-- index.html
|-- README.md
|-- assets/
|   |-- favicon.svg
|   `-- icons/
|       |-- bnb.svg
|       |-- btc.svg
|       |-- eth.svg
|       `-- sol.svg
|-- css/
|   `-- main.css
`-- js/
    |-- chart.js
    |-- data.js
    |-- main.js
    |-- sidebar.js
    `-- ui.js
```

## Data and behavior

All portfolio data is mocked in `js/data.js`. UI rendering lives in `js/ui.js`, chart helpers live in `js/chart.js`, sidebar and mobile drawer behavior live in `js/sidebar.js`, and `js/main.js` wires everything together on load.

## Mobile status

The current layout has been checked at a phone-sized viewport and now holds up well on small screens. Navigation remains accessible through a drawer, the hero stays readable, and the dense desktop table sections are converted into stacked mobile-friendly layouts.
