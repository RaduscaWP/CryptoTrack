// Mock data for CryptoTrack. Prices reflect early-2026 market context.

export const coins = [
  {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    price: 67420.50,
    change24h: +2.34,
    change7d: -1.12,
    holdings: 0.485,
    valueUSD: 32678.94,
    marketCap: '1.32T',
    volume24h: '28.4B',
    high24h: 68100.00,
    low24h: 65800.00,
    color: '#f7931a'
  },
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    price: 3240.80,
    change24h: -0.87,
    change7d: +4.21,
    holdings: 4.2,
    valueUSD: 13611.36,
    marketCap: '389.2B',
    volume24h: '14.1B',
    high24h: 3310.00,
    low24h: 3180.00,
    color: '#627eea'
  },
  {
    id: 'sol',
    name: 'Solana',
    symbol: 'SOL',
    price: 182.40,
    change24h: +5.67,
    change7d: +12.30,
    holdings: 28.5,
    valueUSD: 5198.40,
    marketCap: '84.7B',
    volume24h: '3.2B',
    high24h: 186.00,
    low24h: 174.50,
    color: '#9945ff'
  },
  {
    id: 'bnb',
    name: 'BNB',
    symbol: 'BNB',
    price: 412.30,
    change24h: +1.23,
    change7d: -2.45,
    holdings: 12.8,
    valueUSD: 5277.44,
    marketCap: '60.1B',
    volume24h: '1.8B',
    high24h: 418.00,
    low24h: 405.00,
    color: '#f3ba2f'
  }
];

export const portfolio = {
  totalValue: 56766.14,
  totalChange24h: +2.14,
  totalChangeUSD: +1192.30,
  totalInvested: 48000.00,
  allTimePnL: +8766.14,
  allTimePnLPercent: +18.26
};

function generateLastNDays(n, endDate = new Date('2026-04-18T00:00:00Z')) {
  const labels = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setUTCDate(d.getUTCDate() - i);
    labels.push(d.toISOString().slice(0, 10));
  }
  return labels;
}

const btcPrices30 = [
  61200, 62400, 61800, 63100, 64500, 63800, 65200,
  66100, 65400, 64800, 63200, 62900, 64100, 65800,
  67200, 66400, 65100, 63700, 64900, 66300, 67800,
  68100, 67400, 66800, 65600, 66200, 67100, 67900,
  67420, 68200
];

const btcPrices90 = [
  54200, 55100, 54600, 55800, 56200, 57100, 56400, 57800, 58200, 57600,
  58900, 59400, 60100, 59600, 60800, 61200, 60700, 59900, 60400, 61500,
  62300, 61700, 62900, 63400, 62800, 61900, 60800, 59700, 60600, 61400,
  62100, 61800, 62800, 63500, 62700, 61600, 60900, 61700, 62400, 63100,
  63800, 63100, 62400, 61800, 60900, 61600, 62800, 63500, 64100, 63600,
  62700, 63400, 64200, 64900, 64300, 63500, 62800, 63600, 64400, 65100,
  ...btcPrices30
];

const ethPrices30 = [
  2980, 3020, 2960, 3040, 3110, 3080, 3150, 3210, 3180, 3130,
  3070, 3020, 3090, 3170, 3260, 3220, 3150, 3080, 3140, 3230,
  3300, 3310, 3270, 3220, 3180, 3210, 3250, 3290, 3240, 3280
];

const ethPrices90 = [
  2480, 2520, 2490, 2550, 2600, 2660, 2620, 2700, 2740, 2710,
  2780, 2830, 2870, 2840, 2900, 2930, 2890, 2840, 2880, 2940,
  2980, 2950, 3010, 3050, 2990, 2940, 2880, 2820, 2860, 2900,
  2940, 2910, 2970, 3020, 2960, 2900, 2850, 2900, 2950, 3000,
  3050, 2990, 2940, 2890, 2840, 2880, 2930, 2990, 3040, 3010,
  2960, 3000, 3060, 3110, 3070, 3010, 2960, 3020, 3070, 3110,
  ...ethPrices30
];

const solPrices30 = [
  158.2, 160.5, 159.1, 162.8, 165.4, 163.9, 167.2, 170.1, 168.4, 165.8,
  163.2, 161.7, 164.3, 168.6, 172.4, 170.2, 167.5, 163.9, 166.4, 171.3,
  175.8, 178.4, 176.2, 173.9, 170.6, 174.1, 177.5, 180.9, 182.4, 186.0
];

const solPrices90 = [
  118.4, 121.2, 119.8, 123.5, 126.4, 130.2, 127.8, 132.6, 135.8, 133.1,
  137.4, 140.8, 138.6, 142.3, 145.7, 143.2, 140.6, 137.9, 141.4, 145.8,
  148.9, 146.2, 150.4, 153.8, 151.2, 148.6, 145.8, 143.1, 147.5, 151.2,
  154.6, 151.8, 155.4, 158.9, 156.2, 153.4, 150.6, 154.1, 157.8, 161.3,
  164.7, 161.9, 158.6, 155.8, 152.4, 156.8, 160.4, 163.9, 167.2, 164.5,
  161.3, 164.8, 168.4, 172.1, 169.3, 166.2, 162.8, 165.4, 168.9, 172.6,
  ...solPrices30
];

const bnbPrices30 = [
  398, 402, 400, 405, 409, 407, 411, 414, 412, 408,
  404, 401, 406, 410, 415, 413, 408, 404, 407, 412,
  417, 418, 415, 411, 408, 410, 414, 416, 412, 415
];

const bnbPrices90 = [
  368, 372, 370, 376, 380, 384, 381, 388, 392, 389,
  394, 398, 395, 400, 404, 401, 397, 392, 396, 402,
  406, 403, 408, 412, 408, 404, 400, 395, 399, 404,
  408, 405, 410, 414, 410, 406, 402, 407, 412, 416,
  412, 408, 404, 400, 395, 400, 405, 410, 414, 411,
  407, 411, 415, 418, 414, 410, 406, 410, 414, 416,
  ...bnbPrices30
];

const buildSeries = (p30, p90) => ({
  '7':  { labels: generateLastNDays(7),  prices: p30.slice(-7) },
  '30': { labels: generateLastNDays(30), prices: p30 },
  '90': { labels: generateLastNDays(90), prices: p90 }
});

export const coinChartData = {
  btc: buildSeries(btcPrices30, btcPrices90),
  eth: buildSeries(ethPrices30, ethPrices90),
  sol: buildSeries(solPrices30, solPrices90),
  bnb: buildSeries(bnbPrices30, bnbPrices90)
};

export const transactions = [
  { id: 'tx001', date: '2026-04-17', coin: 'BTC', coinId: 'btc', type: 'buy',  amount: 0.0500, priceAtTx: 65800.00, totalUSD:  3290.00, pnl:   +81.02, pnlPercent:  +2.46, status: 'completed' },
  { id: 'tx002', date: '2026-04-16', coin: 'ETH', coinId: 'eth', type: 'buy',  amount: 1.2000, priceAtTx:  3180.00, totalUSD:  3816.00, pnl:   +72.96, pnlPercent:  +1.91, status: 'completed' },
  { id: 'tx003', date: '2026-04-14', coin: 'SOL', coinId: 'sol', type: 'buy',  amount: 8.5000, priceAtTx:   174.50, totalUSD:  1483.25, pnl:   +67.15, pnlPercent:  +4.53, status: 'completed' },
  { id: 'tx004', date: '2026-04-12', coin: 'BNB', coinId: 'bnb', type: 'sell', amount: 2.4000, priceAtTx:   418.00, totalUSD:  1003.20, pnl:   -13.68, pnlPercent:  -1.35, status: 'completed' },
  { id: 'tx005', date: '2026-04-10', coin: 'BTC', coinId: 'btc', type: 'sell', amount: 0.0200, priceAtTx: 68100.00, totalUSD:  1362.00, pnl:   +13.60, pnlPercent:  +1.01, status: 'completed' },
  { id: 'tx006', date: '2026-04-08', coin: 'ETH', coinId: 'eth', type: 'buy',  amount: 0.7500, priceAtTx:  3310.00, totalUSD:  2482.50, pnl:   -52.14, pnlPercent:  -2.10, status: 'completed' },
  { id: 'tx007', date: '2026-04-06', coin: 'SOL', coinId: 'sol', type: 'sell', amount: 4.0000, priceAtTx:   186.00, totalUSD:   744.00, pnl:   -14.40, pnlPercent:  -1.93, status: 'completed' },
  { id: 'tx008', date: '2026-04-03', coin: 'BNB', coinId: 'bnb', type: 'buy',  amount: 3.2000, priceAtTx:   405.00, totalUSD:  1296.00, pnl:   +23.36, pnlPercent:  +1.80, status: 'completed' },
  { id: 'tx009', date: '2026-04-01', coin: 'BTC', coinId: 'btc', type: 'buy',  amount: 0.0750, priceAtTx: 63200.00, totalUSD:  4740.00, pnl:  +316.54, pnlPercent:  +6.68, status: 'completed' },
  { id: 'tx010', date: '2026-03-28', coin: 'ETH', coinId: 'eth', type: 'sell', amount: 0.5000, priceAtTx:  3240.00, totalUSD:  1620.00, pnl:    +0.40, pnlPercent:  +0.02, status: 'completed' },
  { id: 'tx011', date: '2026-03-25', coin: 'SOL', coinId: 'sol', type: 'buy',  amount: 12.000, priceAtTx:   162.80, totalUSD:  1953.60, pnl:  +235.20, pnlPercent: +12.04, status: 'completed' },
  { id: 'tx012', date: '2026-03-22', coin: 'BNB', coinId: 'bnb', type: 'buy',  amount: 5.0000, priceAtTx:   398.40, totalUSD:  1992.00, pnl:   +69.50, pnlPercent:  +3.49, status: 'completed' },
  { id: 'tx013', date: '2026-03-20', coin: 'BTC', coinId: 'btc', type: 'buy',  amount: 0.1200, priceAtTx: 61800.00, totalUSD:  7416.00, pnl:  +674.46, pnlPercent:  +9.09, status: 'completed' },
  { id: 'tx014', date: '2026-03-18', coin: 'ETH', coinId: 'eth', type: 'buy',  amount: 2.1000, priceAtTx:  2980.00, totalUSD:  6258.00, pnl:  +547.68, pnlPercent:  +8.75, status: 'completed' },
  { id: 'tx015', date: '2026-03-15', coin: 'SOL', coinId: 'sol', type: 'sell', amount: 6.5000, priceAtTx:   158.20, totalUSD:  1028.30, pnl:   -45.50, pnlPercent:  -4.24, status: 'completed' }
];

// Formatters — used across the UI so every number looks the same.
export const fmtCurrency = (n, decimals = 2) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const fmtNumber = (n, decimals = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const fmtPercent = (n, decimals = 2) => {
  const sign = n > 0 ? '+' : n < 0 ? '' : '';
  return `${sign}${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
};

export const fmtSignedUSD = (n, decimals = 2) => {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${fmtCurrency(Math.abs(n), decimals)}`;
};

export const fmtDate = (iso) => {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' });
};
