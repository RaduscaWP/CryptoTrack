// Central live-data store. Owns the polling loop and hands every view the same
// snapshot of market data so nothing renders against two different prices.
(function(){
  const POLL = 60000;

  const live = {
    markets: [],
    bySym: {},
    global: null,
    fng: null,
    loaded: false,
    lastError: null
  };

  const subs = [];
  let timer = null;
  let pending = null;

  function emit(){ subs.forEach(fn => { try { fn(live); } catch (e){} }); }

  function apply(markets){
    live.markets = markets;
    live.bySym = {};
    markets.forEach(m => { live.bySym[m.sym] = m; });
    live.loaded = true;
  }

  function refresh(){
    if (pending) return pending;
    pending = Promise.all([
      CT.api.fetchMarkets(),
      CT.api.fetchGlobal(),
      CT.api.fetchFearGreed()
    ]).then(([markets, glob, fng]) => {
      apply(markets && markets.length ? markets : CT.fallbackMarkets());
      if (glob) live.global = glob;
      if (fng)  live.fng = fng;
      live.lastError = null;
      emit();
      return live;
    }).catch(err => {
      live.lastError = err;
      if (!live.loaded){ apply(CT.fallbackMarkets()); emit(); }
      return live;
    }).finally(() => { pending = null; });
    return pending;
  }

  // Synchronous first paint: bundled prices go up instantly, the REST response
  // overwrites them a moment later.
  function seed(){
    if (!live.loaded) apply(CT.fallbackMarkets());
  }

  function start(){
    if (timer) return;
    timer = setInterval(refresh, POLL);
    // A tab that was in the background for a while is showing stale numbers.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh();
    });
  }

  function price(sym){
    const m = live.bySym[sym];
    return m ? m.price : null;
  }

  // Historical series for the perf chart, with the offline generator as backup.
  function series(sym, range){
    const meta = CT.UNIVERSE_BY_SYM[sym];
    if (!meta) return Promise.resolve(null);
    return CT.api.fetchSeries(meta.id, range)
      .then(data => data && data.length > 1 ? data : CT.fallbackSeries(sym, range));
  }

  // Top movers straight off the live list — no second API call needed.
  function movers(kind, n){
    const list = live.markets.filter(m => m.sym !== 'USDC').slice();
    list.sort((a,b) => kind === 'losers' ? a.change - b.change : b.change - a.change);
    return list.slice(0, n || 4);
  }

  window.CT = Object.assign(window.CT || {}, {
    live: Object.assign(live, {
      refresh, start, seed, price, series, movers,
      on(fn){ subs.push(fn); if (live.loaded) fn(live); }
    })
  });
})();
