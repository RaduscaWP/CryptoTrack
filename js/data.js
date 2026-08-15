// Tracked coin universe + offline fallback data.
// Live values come from js/api.js; everything here is the safety net that keeps
// the dashboard readable when the public API is rate-limited or unreachable.
(function(){

  // CoinGecko ids drive every REST call; sym/color drive the UI.
  const UNIVERSE = [
    { id:'bitcoin',     sym:'BTC',   name:'Bitcoin',   color:'#F7931A', seed:63011.00 },
    { id:'ethereum',    sym:'ETH',   name:'Ethereum',  color:'#627EEA', seed: 1882.86 },
    { id:'binancecoin', sym:'BNB',   name:'BNB',       color:'#F3BA2F', seed:  598.40 },
    { id:'solana',      sym:'SOL',   name:'Solana',    color:'#14F195', seed:   75.55 },
    { id:'ripple',      sym:'XRP',   name:'XRP',       color:'#5E6C77', seed:    2.11 },
    { id:'cardano',     sym:'ADA',   name:'Cardano',   color:'#0033AD', seed:    0.42 },
    { id:'dogecoin',    sym:'DOGE',  name:'Dogecoin',  color:'#C2A633', seed:    0.14 },
    { id:'chainlink',   sym:'LINK',  name:'Chainlink', color:'#2A5ADA', seed:   12.90 },
    { id:'avalanche-2', sym:'AVAX',  name:'Avalanche', color:'#E84142', seed:   14.20 },
    { id:'polkadot',    sym:'DOT',   name:'Polkadot',  color:'#E6007A', seed:    2.64 },
    { id:'litecoin',    sym:'LTC',   name:'Litecoin',  color:'#345D9D', seed:   82.10 },
    { id:'uniswap',     sym:'UNI',   name:'Uniswap',   color:'#FF007A', seed:    6.05 },
    { id:'arbitrum',    sym:'ARB',   name:'Arbitrum',  color:'#28A0F0', seed:    0.28 },
    { id:'usd-coin',    sym:'USDC',  name:'USD Coin',  color:'#2775CA', seed:    1.00 },
  ];

  const UNIVERSE_BY_ID  = {};
  const UNIVERSE_BY_SYM = {};
  UNIVERSE.forEach(c => { UNIVERSE_BY_ID[c.id] = c; UNIVERSE_BY_SYM[c.sym] = c; });

  const DEFAULT_WATCHLIST = ['BTC','ETH','SOL','LINK','ARB'];

  /* ---------------- deterministic fallback generators ---------------- */

  function symSeed(sym){
    let s = 0;
    for (let i = 0; i < sym.length; i++) s = (s*31 + sym.charCodeAt(i)) % 233280;
    return s + 7;
  }

  // Random-walk that lands exactly on `endPrice` after `totalChangePct` of drift.
  function coinSeries(endPrice, totalChangePct, volPct, n, seed){
    const start = endPrice / (1 + totalChangePct/100);
    const drift = (endPrice - start) / (n - 1);
    const out = []; let r = seed;
    for (let i = 0; i < n; i++){
      r = (r*9301 + 49297) % 233280;
      const rand = r/233280;
      const noise = (rand - 0.5) * volPct * endPrice;
      out.push(Math.max(0.000001, start + drift*i + noise));
    }
    out[n-1] = endPrice;
    return out;
  }

  function pseudoChange(sym){
    // Stable per-symbol "24h" move in the -4%..+5% band, so the offline view
    // still shows a mix of gainers and losers instead of a flat wall of zeros.
    const s = symSeed(sym);
    return ((s % 900) / 100) - 4;
  }

  function fallbackMarkets(){
    return UNIVERSE.map(c => {
      const change = c.sym === 'USDC' ? 0.01 : pseudoChange(c.sym);
      const s = symSeed(c.sym);
      return {
        id: c.id,
        sym: c.sym,
        name: c.name,
        price: c.seed,
        change: change,
        change7d: change * 2.6,
        spark: coinSeries(c.seed, change * 2.6, 0.014, 24, s),
        image: null,
        mcap: null,
        vol: null,
        rank: null,
        high24: c.seed * 1.02,
        low24: c.seed * 0.98,
        color: c.color
      };
    });
  }

  const RANGE_PROFILE = {
    '1D': { mult: 1,  vol: 0.007, n: 60 },
    '1W': { mult: 2.4,vol: 0.013, n: 70 },
    '1M': { mult: 7,  vol: 0.022, n: 80 },
    '3M': { mult: 12, vol: 0.034, n: 90 },
    '1Y': { mult: 18, vol: 0.045, n: 90 },
  };

  function fallbackSeries(sym, range){
    const coin = UNIVERSE_BY_SYM[sym];
    if (!coin) return null;
    const p = RANGE_PROFILE[range] || RANGE_PROFILE['1M'];
    const change = coin.sym === 'USDC' ? 0.02 : pseudoChange(coin.sym);
    const dir = change >= 0 ? 1 : -1;
    const total = range === '1Y' ? change * p.mult + 25 * dir : change * p.mult;
    return coinSeries(coin.seed, total, p.vol, p.n, symSeed(sym) + p.n);
  }

  window.CT = Object.assign(window.CT || {}, {
    UNIVERSE, UNIVERSE_BY_ID, UNIVERSE_BY_SYM, DEFAULT_WATCHLIST,
    fallbackMarkets, fallbackSeries
  });
})();
