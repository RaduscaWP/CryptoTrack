// REST layer — live market data from public endpoints (CoinGecko + Alternative.me).
// No API key required. Everything is cached in localStorage and degrades to the
// bundled demo data when the network or the free-tier rate limit says no.
(function(){
  const CG  = 'https://api.coingecko.com/api/v3';
  const FNG = 'https://api.alternative.me/fng/?limit=1';

  const CACHE_PREFIX = 'ct.cache.';
  const REQ_GAP  = 260;    // ms between outbound calls — free tier is ~10-30/min
  const REQ_TIME = 12000;  // per-request timeout

  const TTL = {
    markets: 60 * 1000,
    global:  5 * 60 * 1000,
    fng:     30 * 60 * 1000,
    series:  { '1D': 2*60*1000, '1W': 10*60*1000, '1M': 30*60*1000, '3M': 60*60*1000, '1Y': 6*60*60*1000 }
  };

  // Free tier caps historical data at 365 days, so "ALL" is not offered.
  const RANGE_DAYS = { '1D':1, '1W':7, '1M':30, '3M':90, '1Y':365 };

  /* ---------------- cache ---------------- */

  function readCache(key){
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const box = JSON.parse(raw);
      if (!box || typeof box.t !== 'number') return null;
      return box;
    } catch (e){ return null; }
  }

  function writeCache(key, value){
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
    } catch (e){ /* quota or private mode — cache is optional */ }
  }

  /* ---------------- status ---------------- */

  // 'live'    — last call hit the network
  // 'cached'  — network refused, we are serving a stale but real response
  // 'offline' — no network and no cache, running on bundled demo data
  let status = 'cached';
  let lastSync = 0;
  const statusSubs = [];

  function setStatus(next){
    if (next === 'live') lastSync = Date.now();
    if (next === status) return;
    status = next;
    statusSubs.forEach(fn => { try { fn(status); } catch (e){} });
  }

  /* ---------------- request queue ---------------- */

  let chain = Promise.resolve();
  let lastCall = 0;
  const inflight = {};

  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

  function rawFetch(url){
    chain = chain.then(async () => {
      const gap = REQ_GAP - (Date.now() - lastCall);
      if (gap > 0) await wait(gap);
      lastCall = Date.now();
    });
    return chain.then(() => {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), REQ_TIME) : null;
      return fetch(url, { signal: ctrl ? ctrl.signal : undefined, headers:{ accept:'application/json' } })
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .finally(() => { if (timer) clearTimeout(timer); });
    });
  }

  // Returns the parsed body, or throws only when there is no usable cache either.
  function getJSON(url, key, ttl){
    const hit = readCache(key);
    if (hit && Date.now() - hit.t < ttl){
      // Fresh enough that we never touch the network; keep the banner honest.
      if (status === 'offline') setStatus('cached');
      return Promise.resolve(hit.v);
    }
    if (inflight[key]) return inflight[key];

    inflight[key] = rawFetch(url)
      .then(data => {
        writeCache(key, data);
        setStatus('live');
        return data;
      })
      .catch(err => {
        if (hit){ setStatus('cached'); return hit.v; }
        setStatus('offline');
        throw err;
      })
      .finally(() => { delete inflight[key]; });

    return inflight[key];
  }

  /* ---------------- normalisation ---------------- */

  function downsample(arr, n){
    if (!arr || arr.length <= n) return (arr || []).slice();
    const out = [];
    const step = (arr.length - 1) / (n - 1);
    for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]);
    return out;
  }

  function normaliseMarket(row){
    const meta = CT.UNIVERSE_BY_ID[row.id] || {};
    return {
      id: row.id,
      sym: (meta.sym || row.symbol || '').toUpperCase(),
      name: row.name,
      price: row.current_price,
      change: row.price_change_percentage_24h == null ? 0 : row.price_change_percentage_24h,
      change7d: row.price_change_percentage_7d_in_currency == null ? 0 : row.price_change_percentage_7d_in_currency,
      spark: downsample(row.sparkline_in_7d && row.sparkline_in_7d.price, 24),
      image: row.image,
      mcap: row.market_cap,
      vol: row.total_volume,
      rank: row.market_cap_rank,
      high24: row.high_24h,
      low24: row.low_24h,
      color: meta.color || '#6B7280'
    };
  }

  /* ---------------- public calls ---------------- */

  function fetchMarkets(){
    const ids = CT.UNIVERSE.map(c => c.id).join(',');
    const url = CG + '/coins/markets?vs_currency=usd&ids=' + encodeURIComponent(ids) +
                '&order=market_cap_desc&per_page=' + CT.UNIVERSE.length +
                '&page=1&sparkline=true&price_change_percentage=24h,7d';
    return getJSON(url, 'markets', TTL.markets)
      .then(rows => {
        if (!Array.isArray(rows) || !rows.length) throw new Error('empty markets payload');
        return rows.map(normaliseMarket).filter(m => m.sym && m.price != null);
      })
      .catch(() => CT.fallbackMarkets());
  }

  function fetchGlobal(){
    return getJSON(CG + '/global', 'global', TTL.global)
      .then(res => {
        const d = res && res.data;
        if (!d) throw new Error('empty global payload');
        return {
          mcap: d.total_market_cap && d.total_market_cap.usd,
          vol: d.total_volume && d.total_volume.usd,
          btcDom: d.market_cap_percentage && d.market_cap_percentage.btc,
          mcapChange: d.market_cap_change_percentage_24h_usd
        };
      })
      .catch(() => null);
  }

  function fetchFearGreed(){
    return getJSON(FNG, 'fng', TTL.fng)
      .then(res => {
        const row = res && res.data && res.data[0];
        if (!row) throw new Error('empty fng payload');
        return { value: Number(row.value), label: row.value_classification };
      })
      .catch(() => null);
  }

  // Historical close prices for one coin, as a plain number array.
  function fetchSeries(id, range){
    const days = RANGE_DAYS[range] || 30;
    const url = CG + '/coins/' + encodeURIComponent(id) + '/market_chart?vs_currency=usd&days=' + days;
    const ttl = TTL.series[range] || TTL.series['1M'];
    return getJSON(url, 'series.' + id + '.' + range, ttl)
      .then(res => {
        const prices = res && res.prices;
        if (!Array.isArray(prices) || prices.length < 2) throw new Error('empty series payload');
        return downsample(prices.map(p => p[1]), 90);
      })
      .catch(() => null);
  }

  const api = {
    RANGE_DAYS,
    fetchMarkets, fetchGlobal, fetchFearGreed, fetchSeries,
    get status(){ return status; },
    get lastSync(){ return lastSync; },
    onStatus(fn){ statusSubs.push(fn); fn(status); }
  };

  window.CT = Object.assign(window.CT || {}, { api });
})();
