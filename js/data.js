// Mock crypto market data
(function(){
  const sparkUp   = [12,14,13,15,18,17,20,22,21,24,26,25,28,30,29,32,34,33,36,38];
  const sparkDown = [30,29,31,28,27,26,24,25,22,21,23,20,19,18,19,17,15,16,14,13];
  const sparkFlat = [20,21,20,22,21,23,22,24,23,22,24,23,25,24,26,25,27,26,28,27];

  const HOLDINGS = [
    { sym:'BTC',  name:'Bitcoin',    amount:1.8421,  price:67842.11, change:+2.34, alloc:42.8, color:'#F7931A', spark:sparkUp   },
    { sym:'ETH',  name:'Ethereum',   amount:14.220,  price:3284.05,  change:+1.12, alloc:24.6, color:'#627EEA', spark:sparkUp   },
    { sym:'SOL',  name:'Solana',     amount:186.40,  price:158.22,   change:+4.81, alloc:11.3, color:'#14F195', spark:sparkUp   },
    { sym:'LINK', name:'Chainlink',  amount:412.00,  price:18.74,    change:-1.22, alloc: 6.1, color:'#2A5ADA', spark:sparkDown },
    { sym:'AVAX', name:'Avalanche',  amount:92.50,   price:36.90,    change:+0.48, alloc: 4.9, color:'#E84142', spark:sparkFlat },
    { sym:'DOT',  name:'Polkadot',   amount:240.00,  price:7.21,     change:-2.04, alloc: 3.2, color:'#E6007A', spark:sparkDown },
    { sym:'MATIC',name:'Polygon',    amount:1820.0,  price:0.72,     change:+0.16, alloc: 2.7, color:'#8247E5', spark:sparkFlat },
    { sym:'ARB',  name:'Arbitrum',   amount:850.00,  price:1.24,     change:+3.66, alloc: 2.1, color:'#28A0F0', spark:sparkUp   },
    { sym:'USDC', name:'USD Coin',   amount:1240.0,  price:1.00,     change:+0.01, alloc: 2.3, color:'#2775CA', spark:sparkFlat },
  ];

  const WATCHLIST = ['BTC','ETH','SOL','LINK','ARB'];

  const TRANSACTIONS = [
    { id:1, type:'Buy',      asset:'BTC',  amount:0.0840, usd:+5698.72, time:'Today · 09:42',    status:'Completed' },
    { id:2, type:'Sell',     asset:'ETH',  amount:2.1200, usd:-6962.19, time:'Today · 08:15',    status:'Completed' },
    { id:3, type:'Stake',    asset:'SOL',  amount:40.000, usd:-6328.80, time:'Yesterday · 21:04', status:'Completed' },
    { id:4, type:'Buy',      asset:'ARB',  amount:150.00, usd:-186.00,  time:'Yesterday · 14:22', status:'Completed' },
    { id:5, type:'Receive',  asset:'USDC', amount:500.00, usd:+500.00,  time:'Apr 17 · 11:08',   status:'Pending'   },
    { id:6, type:'Withdraw', asset:'BTC',  amount:0.0120, usd:-814.10,  time:'Apr 16 · 17:55',   status:'Completed' },
  ];

  function genSeries(base, vol, drift, n){
    n = n || 60;
    const out = []; let v = base; let r = 0.123;
    for (let i = 0; i < n; i++){
      r = (r*9301+49297)%233280; const rand = r/233280;
      v = v + (rand-0.5)*vol + drift;
      out.push(Math.max(0, v));
    }
    return out;
  }

  const PORTFOLIO_SERIES = {
    '1D':  genSeries(148000,  900,   6, 48),
    '1W':  genSeries(142000, 1800,  80, 56),
    '1M':  genSeries(128000, 3400, 280, 60),
    '1Y':  genSeries( 72000, 6200, 1400,60),
    'ALL': genSeries( 18000, 4200, 2700,60),
  };

  // Per-coin price series: each ends at the coin's current price.
  function coinSeries(endPrice, totalChangePct, volPct, n, seed){
    const start = endPrice / (1 + totalChangePct/100);
    const drift = (endPrice - start) / (n - 1);
    const out = []; let r = seed;
    for (let i = 0; i < n; i++){
      r = (r*9301+49297)%233280; const rand = r/233280;
      const noise = (rand - 0.5) * volPct * endPrice;
      out.push(Math.max(0.0001, start + drift*i + noise));
    }
    out[n-1] = endPrice;
    return out;
  }
  function symSeed(sym){
    let s = 0;
    for (let i = 0; i < sym.length; i++) s = (s*31 + sym.charCodeAt(i)) % 233280;
    return s + 7;
  }
  const COIN_SERIES = {};
  HOLDINGS.forEach(h => {
    const s = symSeed(h.sym);
    const dir = h.change >= 0 ? 1 : -1;
    COIN_SERIES[h.sym] = {
      '1D':  coinSeries(h.price, h.change,                   0.007, 48, s),
      '1W':  coinSeries(h.price, h.change * 2.4,             0.013, 56, s + 7),
      '1M':  coinSeries(h.price, h.change * 7,               0.022, 60, s + 13),
      '1Y':  coinSeries(h.price, h.change * 18 + 22 * dir,   0.045, 60, s + 19),
      'ALL': coinSeries(h.price, h.change * 35 + 70 * dir,   0.075, 60, s + 29),
    };
  });

  const GAINERS = [
    { sym:'SOL', name:'Solana',    price:158.22,   change:+4.81 },
    { sym:'ARB', name:'Arbitrum',  price:1.24,     change:+3.66 },
    { sym:'BTC', name:'Bitcoin',   price:67842.11, change:+2.34 },
    { sym:'ETH', name:'Ethereum',  price:3284.05,  change:+1.12 },
  ];
  const LOSERS = [
    { sym:'DOT',  name:'Polkadot',  price:7.21,  change:-2.04 },
    { sym:'LINK', name:'Chainlink', price:18.74, change:-1.22 },
    { sym:'APT',  name:'Aptos',     price:9.12,  change:-0.88 },
    { sym:'ATOM', name:'Cosmos',    price:8.42,  change:-0.41 },
  ];

  const MARKET_STATS = [
    { label:'Total Market Cap', value:'$2.48T', change:+1.84 },
    { label:'24h Volume',        value:'$92.1B', change:+6.20 },
    { label:'BTC Dominance',     value:'52.7%',  change:+0.12 },
    { label:'Fear & Greed',      value:'72',     change:+4.00, sub:'Greed' },
  ];

  const NEWS = [
    { tag:'MARKETS',    title:'Spot ETH ETFs see record $312M weekly inflow', time:'2h ago' },
    { tag:'NETWORK',    title:'Solana firedancer testnet hits 1.2M TPS peak',  time:'5h ago' },
    { tag:'REGULATION', title:'SEC clarifies stablecoin framework guidance',   time:'Yesterday' },
  ];

  const INSIGHT_BARS = [8,12,6,10,14,9,11,7,5,9,13,15,10,14,12,8,16,11,9,13,17,14,10,8,12,15,18,14,13,16];

  window.CT = Object.assign(window.CT || {}, {
    HOLDINGS, WATCHLIST, TRANSACTIONS, PORTFOLIO_SERIES, COIN_SERIES,
    GAINERS, LOSERS, MARKET_STATS, NEWS, INSIGHT_BARS
  });
})();
