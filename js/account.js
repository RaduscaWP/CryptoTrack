// Demo (paper-trading) account — virtual cash, positions, fills and P/L.
// Nothing here touches real money or a real exchange; state lives in localStorage.
(function(){
  const KEY   = 'ct.account.v1';
  const WKEY  = 'ct.watchlist.v1';
  const FEE   = 0.001;      // 0.10% taker fee, charged on both sides
  const DUST  = 1e-8;       // matches the 8-dp order field: less than this is dust
  const EQ_MIN_GAP = 30000; // don't append an equity point more than twice a minute
  const EQ_MAX = 720;

  const subs = [];
  let state = null;

  function emit(){ subs.forEach(fn => { try { fn(state); } catch (e){} }); }

  function load(){
    if (state) return state;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw){
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === 1) state = parsed;
      }
    } catch (e){ state = null; }
    return state;
  }

  function save(){
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e){}
    emit();
  }

  /* ---------------- lifecycle ---------------- */

  function exists(){ return !!load(); }
  function get(){ return load(); }

  function create(opts){
    opts = opts || {};
    const startingCash = Number(opts.startingCash) > 0 ? Number(opts.startingCash) : 100000;
    const now = Date.now();
    state = {
      v: 1,
      name: (opts.name || 'Demo trader').trim().slice(0, 40),
      createdAt: now,
      startingCash: startingCash,
      cash: startingCash,
      positions: {},
      trades: [],
      equity: [[now, startingCash]],
      realized: 0
    };
    save();
    return state;
  }

  function reset(){
    if (!state) return null;
    return create({ name: state.name, startingCash: state.startingCash });
  }

  function signOut(){
    try { localStorage.removeItem(KEY); } catch (e){}
    state = null;
    emit();
  }

  /* ---------------- trading ---------------- */

  function ensure(){
    const s = load();
    if (!s) throw new Error('No demo account. Create one first.');
    return s;
  }

  function quote(side, qty, price){
    const gross = qty * price;
    const fee = gross * FEE;
    return { gross, fee, total: side === 'BUY' ? gross + fee : gross - fee };
  }

  function buy(sym, qty, price){
    const s = ensure();
    qty = Number(qty); price = Number(price);
    if (!isFinite(qty) || qty <= 0) throw new Error('Enter an amount greater than zero.');
    if (!isFinite(price) || price <= 0) throw new Error('No live price for this asset yet.');

    const q = quote('BUY', qty, price);
    // Tolerate float dust so a "Max" button can actually spend the whole balance.
    if (q.total > s.cash + 0.005) throw new Error('Not enough available cash for this order.');

    const pos = s.positions[sym] || (s.positions[sym] = { qty:0, cost:0 });
    pos.qty  += qty;
    pos.cost += q.total;          // fee is part of the cost basis
    s.cash = Math.max(0, s.cash - q.total);

    const trade = {
      id: 't' + Date.now() + Math.floor(Math.random()*1000),
      ts: Date.now(), side:'BUY', sym, qty, price,
      gross: q.gross, fee: q.fee, usd: -q.total, realized: 0
    };
    s.trades.unshift(trade);
    save();
    return trade;
  }

  function sell(sym, qty, price){
    const s = ensure();
    qty = Number(qty); price = Number(price);
    if (!isFinite(qty) || qty <= 0) throw new Error('Enter an amount greater than zero.');
    if (!isFinite(price) || price <= 0) throw new Error('No live price for this asset yet.');

    const pos = s.positions[sym];
    if (!pos || pos.qty <= DUST) throw new Error('You do not hold any ' + sym + '.');
    // The amount field is rounded to 8 dp, so a "Max" sell can land a hair above
    // the real balance. Allow that rounding slack, then clamp; reject anything more.
    if (qty > pos.qty * (1 + 1e-6) + 1e-9){
      throw new Error('You only hold ' + CT.fmtQty(pos.qty) + ' ' + sym + '.');
    }
    qty = Math.min(qty, pos.qty);

    const q = quote('SELL', qty, price);
    const avgCost = pos.cost / pos.qty;
    const basisOut = avgCost * qty;
    const realized = q.total - basisOut;

    pos.qty  -= qty;
    pos.cost -= basisOut;

    let swept = 0;
    if (pos.qty <= DUST){
      // Close the position outright and book the unrecoverable dust as a loss,
      // rather than leaving a row worth a fraction of a cent on the books.
      swept = pos.cost;
      delete s.positions[sym];
    }

    s.cash += q.total;
    s.realized += realized - swept;

    const trade = {
      id: 't' + Date.now() + Math.floor(Math.random()*1000),
      ts: Date.now(), side:'SELL', sym, qty, price,
      gross: q.gross, fee: q.fee, usd: q.total, realized: realized
    };
    s.trades.unshift(trade);
    save();
    return trade;
  }

  function rename(name){
    const s = ensure();
    const v = (name || '').trim();
    if (!v) throw new Error('Name cannot be empty.');
    s.name = v.slice(0, 40);
    save();
    return s.name;
  }

  function deposit(amount){
    const s = ensure();
    amount = Number(amount);
    if (!isFinite(amount) || amount <= 0) throw new Error('Enter an amount greater than zero.');
    s.cash += amount;
    s.startingCash += amount;   // keeps total-return maths honest after a top-up
    save();
    return amount;
  }

  /* ---------------- valuation ---------------- */

  // `markets` is the live array from CT.api.fetchMarkets().
  function snapshot(markets){
    const s = load();
    if (!s) return null;
    const bySym = {};
    (markets || []).forEach(m => { bySym[m.sym] = m; });

    let marketValue = 0, basis = 0, pl24 = 0;
    const positions = Object.keys(s.positions).map(sym => {
      const pos = s.positions[sym];
      const meta = CT.UNIVERSE_BY_SYM[sym] || { name: sym, color:'#6B7280' };
      const m = bySym[sym];
      const price = m ? m.price : (pos.cost / pos.qty);
      const change = m ? m.change : 0;
      const value = pos.qty * price;
      const pl = value - pos.cost;

      marketValue += value;
      basis += pos.cost;
      pl24 += value - (value / (1 + change/100));

      return {
        sym, name: meta.name, color: meta.color, image: m ? m.image : null,
        qty: pos.qty, basis: pos.cost, avgCost: pos.cost / pos.qty,
        price, change, value, pl, plPct: pos.cost > 0 ? (pl / pos.cost) * 100 : 0,
        alloc: 0
      };
    });

    const equity = s.cash + marketValue;
    positions.forEach(p => { p.alloc = equity > 0 ? (p.value / equity) * 100 : 0; });
    positions.sort((a,b) => b.value - a.value);

    const totalPL = equity - s.startingCash;
    return {
      name: s.name,
      cash: s.cash,
      startingCash: s.startingCash,
      marketValue, basis, equity, positions,
      unrealized: marketValue - basis,
      unrealizedPct: basis > 0 ? ((marketValue - basis) / basis) * 100 : 0,
      realized: s.realized,
      pl24, pl24Pct: equity - pl24 > 0 ? (pl24 / (equity - pl24)) * 100 : 0,
      totalPL, totalPLPct: s.startingCash > 0 ? (totalPL / s.startingCash) * 100 : 0,
      cashAlloc: equity > 0 ? (s.cash / equity) * 100 : 100,
      trades: s.trades
    };
  }

  function recordEquity(value){
    const s = load();
    if (!s || !isFinite(value)) return;
    const last = s.equity[s.equity.length - 1];
    if (last && Date.now() - last[0] < EQ_MIN_GAP){
      last[1] = value;                    // same bucket — just refresh it
    } else {
      s.equity.push([Date.now(), value]);
      if (s.equity.length > EQ_MAX) s.equity.splice(0, s.equity.length - EQ_MAX);
    }
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e){}
  }

  function equitySeries(){
    const s = load();
    if (!s) return [];
    return s.equity.map(p => p[1]);
  }

  // Realised P/L grouped per calendar day, oldest first — feeds the insights bars.
  function dailyRealized(days){
    const s = load();
    if (!s) return [];
    days = days || 30;
    const buckets = {};
    s.trades.forEach(t => {
      if (t.side !== 'SELL') return;
      const d = new Date(t.ts); d.setHours(0,0,0,0);
      const k = d.getTime();
      buckets[k] = (buckets[k] || 0) + t.realized;
    });
    const out = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = days - 1; i >= 0; i--){
      const k = today.getTime() - i * 86400000;
      out.push({ ts: k, value: buckets[k] || 0 });
    }
    return out;
  }

  function stats(){
    const s = load();
    if (!s) return null;
    const sells = s.trades.filter(t => t.side === 'SELL');
    const wins = sells.filter(t => t.realized > 0);
    const days = dailyRealized(30).filter(d => d.value !== 0);
    let best = null, worst = null;
    days.forEach(d => {
      if (!best  || d.value > best.value)  best = d;
      if (!worst || d.value < worst.value) worst = d;
    });

    // Average holding time = time between a symbol's first buy and its last sell.
    const firstBuy = {}, holds = [];
    s.trades.slice().reverse().forEach(t => {
      if (t.side === 'BUY'){ if (!firstBuy[t.sym]) firstBuy[t.sym] = t.ts; }
      else if (firstBuy[t.sym]){ holds.push(t.ts - firstBuy[t.sym]); delete firstBuy[t.sym]; }
    });
    const avgHold = holds.length ? holds.reduce((a,b) => a+b, 0) / holds.length : 0;

    return {
      trades: s.trades.length,
      closed: sells.length,
      wins: wins.length,
      winRate: sells.length ? (wins.length / sells.length) * 100 : 0,
      best, worst,
      avgHoldDays: avgHold / 86400000,
      assetsTraded: Object.keys(s.trades.reduce((a,t) => (a[t.sym]=1, a), {})).length
    };
  }

  /* ---------------- watchlist ---------------- */

  function watchGet(){
    try {
      const raw = localStorage.getItem(WKEY);
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr) && arr.length) return arr.filter(s => CT.UNIVERSE_BY_SYM[s]);
    } catch (e){}
    return CT.DEFAULT_WATCHLIST.slice();
  }
  function watchSet(list){
    try { localStorage.setItem(WKEY, JSON.stringify(list)); } catch (e){}
    emit();
  }
  function watchToggle(sym){
    const list = watchGet();
    const i = list.indexOf(sym);
    if (i === -1) list.push(sym); else list.splice(i, 1);
    watchSet(list);
    return list.indexOf(sym) !== -1;
  }
  function watchHas(sym){ return watchGet().indexOf(sym) !== -1; }

  window.CT = Object.assign(window.CT || {}, {
    account: {
      FEE,
      exists, get, create, reset, signOut,
      buy, sell, deposit, rename, quote,
      snapshot, recordEquity, equitySeries, dailyRealized, stats,
      on(fn){ subs.push(fn); }
    },
    watch: { get: watchGet, set: watchSet, toggle: watchToggle, has: watchHas }
  });
})();
