// Portfolio / Markets / History / Watchlist views.
// Each render() paints into its own .content block; the router shows one at a time.
(function(){
  const { $, $$, fmtPrice, fmtUsd, fmtSigned, fmtCompact, fmtQty, fmtPct,
          deltaChip, tokenEl, fmtDateTime, toast } = CT;

  function host(view){ return $(`[data-view="${view}"]`); }

  function plClass(v){ return v >= 0 ? 'c-up' : 'c-down'; }

  function emptyBlock(title, copy, actionLabel, actionTab){
    return `
      <div class="blank">
        <div class="blank__icon">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16V4"/><path d="M3 16h14"/><path d="M6 13v-3M10 13V7M14 13v-5"/></svg>
        </div>
        <div class="blank__title">${title}</div>
        <div class="blank__copy">${copy}</div>
        ${actionLabel ? `<button class="btn-dark blank__cta" data-goto="${actionTab}">${actionLabel}</button>` : ''}
      </div>`;
  }

  // Renders a token badge into every .js-token placeholder inside `root`.
  function paintTokens(root){
    $$('.js-token', root).forEach(ph => {
      const size = Number(ph.dataset.size) || 30;
      ph.replaceWith(tokenEl(ph.dataset.sym, size));
    });
  }

  /* ==================== PORTFOLIO ==================== */

  function renderPortfolio(){
    const el = host('portfolio');
    if (!el) return;
    const snap = CT.account.snapshot(CT.live.markets);
    if (!snap) return;

    const eq = CT.account.equitySeries();
    const hasCurve = eq.length > 2;

    el.innerHTML = `
      <div class="grid">
        <section class="card card--span8">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">EQUITY</div>
              <div class="card__title">Demo account value</div>
            </div>
            <span class="chip ${snap.totalPL >= 0 ? 'chip--up' : 'chip--down'}">${fmtPct(snap.totalPLPct)} all-time</span>
          </div>
          <div class="perf__summary">
            <div class="perf__value num">${fmtUsd(snap.equity)}</div>
            <div class="perf__meta">
              <span class="chip ${snap.pl24 >= 0 ? 'chip--up' : 'chip--down'}">${fmtSigned(snap.pl24)}</span>
              <span class="perf__sub">unrealised move over the last 24h</span>
            </div>
          </div>
          <div class="perf__chart" data-eq-chart></div>
          ${hasCurve ? '' : '<div class="hint">The equity curve fills in as your account is valued over time — leave a position open and check back.</div>'}
        </section>

        <section class="card card--span4">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">BREAKDOWN</div>
              <div class="card__title">Where the money sits</div>
            </div>
          </div>
          <div class="alloc">
            <div class="alloc__donut" data-pf-donut></div>
            <div class="alloc__list" data-pf-alloc></div>
          </div>
          <div class="kv">
            <div class="kv__row"><span>Cash available</span><b class="num">${fmtUsd(snap.cash)}</b></div>
            <div class="kv__row"><span>Invested (cost basis)</span><b class="num">${fmtUsd(snap.basis)}</b></div>
            <div class="kv__row"><span>Unrealised P/L</span><b class="num ${plClass(snap.unrealized)}">${fmtSigned(snap.unrealized)}</b></div>
            <div class="kv__row"><span>Realised P/L</span><b class="num ${plClass(snap.realized)}">${fmtSigned(snap.realized)}</b></div>
          </div>
        </section>
      </div>

      <div class="grid">
        <section class="card card--span12">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">HOLDINGS</div>
              <div class="card__title">${snap.positions.length} open position${snap.positions.length === 1 ? '' : 's'}</div>
            </div>
            <button class="textbtn" data-goto="trade">
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M10 4.5v11M4.5 10h11"/></svg>
              New order
            </button>
          </div>
          ${snap.positions.length ? holdingsTable(snap) : emptyBlock(
            'No open positions',
            'Your demo balance is sitting in cash. Place your first paper trade to start tracking performance.',
            'Open the trade desk', 'trade')}
        </section>
      </div>`;

    if (snap.positions.length) paintTokens(el);

    // Allocation donut — positions plus the cash sleeve.
    const segs = snap.positions.map(p => ({ value:p.alloc, color:p.color, label:p.sym }));
    if (snap.cashAlloc > 0.05) segs.push({ value:snap.cashAlloc, color:'#C9C9C2', label:'Cash' });

    const donutHost = $('[data-pf-donut]', el);
    donutHost.innerHTML = '';
    donutHost.appendChild(CT.donut(segs, { size:160, thickness:20 }));
    const center = document.createElement('div');
    center.className = 'donut-center';
    center.innerHTML = `<div>
        <div class="donut-center-k">${snap.positions.length} asset${snap.positions.length === 1 ? '' : 's'}</div>
        <div class="donut-center-v">${fmtPct(snap.totalPLPct, 1)}</div>
      </div>`;
    donutHost.appendChild(center);

    $('[data-pf-alloc]', el).innerHTML = segs.map(s => `
      <div class="alloc__row">
        <span class="alloc__swatch" style="background:${s.color}"></span>
        <span class="alloc__label">${s.label}</span>
        <span class="alloc__value">${s.value.toFixed(1)}%</span>
      </div>`).join('');

    const chartHost = $('[data-eq-chart]', el);
    const curve = hasCurve ? eq : [snap.startingCash, snap.equity];
    CT.areaChart(chartHost, curve, {
      color:'var(--accent)',
      tooltipLabel:'Account value',
      tooltipFormat: v => fmtUsd(v, 0)
    });
  }

  function holdingsTable(snap){
    return `
      <div class="dt dt--holdings">
        <div class="dt__head">
          <div>ASSET</div>
          <div class="t-right">QUANTITY</div>
          <div class="t-right">AVG COST</div>
          <div class="t-right">PRICE</div>
          <div class="t-right">24H</div>
          <div class="t-right">VALUE</div>
          <div class="t-right">P/L</div>
          <div class="t-right">ACTION</div>
        </div>
        <div class="dt__body">
          ${snap.positions.map(p => `
            <div class="dt__row">
              <div class="dt__asset">
                <span class="js-token" data-sym="${p.sym}" data-size="30"></span>
                <div>
                  <div class="dt__name">${p.name}</div>
                  <div class="dt__sym">${p.sym} · ${p.alloc.toFixed(1)}% of book</div>
                </div>
              </div>
              <div class="dt__cell t-right num" data-label="Quantity">${fmtQty(p.qty)}</div>
              <div class="dt__cell t-right num" data-label="Avg cost">${fmtPrice(p.avgCost)}</div>
              <div class="dt__cell t-right num" data-label="Price">${fmtPrice(p.price)}</div>
              <div class="dt__cell t-right" data-label="24h">${deltaChip(p.change)}</div>
              <div class="dt__cell t-right num" data-label="Value">${fmtUsd(p.value)}</div>
              <div class="dt__cell t-right num ${plClass(p.pl)}" data-label="P/L">${fmtSigned(p.pl)} <small>${fmtPct(p.plPct)}</small></div>
              <div class="dt__cell t-right" data-label="">
                <button class="minibtn" data-trade="${p.sym}" data-side="BUY">Buy</button>
                <button class="minibtn minibtn--sell" data-trade="${p.sym}" data-side="SELL">Sell</button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ==================== MARKETS ==================== */

  function renderMarkets(){
    const el = host('markets');
    if (!el) return;
    const rows = CT.live.markets.slice().sort((a,b) => (b.mcap || 0) - (a.mcap || 0));
    const g = CT.live.global;

    el.innerHTML = `
      <div class="grid">
        <section class="card card--span12">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">MARKETS</div>
              <div class="card__title">${rows.length} tracked assets · live from CoinGecko</div>
            </div>
            <div class="card__meta num">${g ? 'Global cap ' + fmtCompact(g.mcap) : ''}</div>
          </div>
          <div class="dt dt--markets">
            <div class="dt__head">
              <div>ASSET</div>
              <div class="t-right">PRICE</div>
              <div class="t-right">24H</div>
              <div class="t-right">7D</div>
              <div class="t-right">MARKET CAP</div>
              <div class="t-right">VOLUME 24H</div>
              <div class="t-right">7D CHART</div>
              <div class="t-right">ACTION</div>
            </div>
            <div class="dt__body">
              ${rows.map(m => `
                <div class="dt__row">
                  <div class="dt__asset">
                    <span class="js-token" data-sym="${m.sym}" data-size="30"></span>
                    <div>
                      <div class="dt__name">${m.name}</div>
                      <div class="dt__sym">${m.sym}${m.rank ? ' · #' + m.rank : ''}</div>
                    </div>
                  </div>
                  <div class="dt__cell t-right num" data-label="Price">${fmtPrice(m.price)}</div>
                  <div class="dt__cell t-right" data-label="24h">${deltaChip(m.change)}</div>
                  <div class="dt__cell t-right" data-label="7d">${deltaChip(m.change7d)}</div>
                  <div class="dt__cell t-right num" data-label="Market cap">${fmtCompact(m.mcap)}</div>
                  <div class="dt__cell t-right num" data-label="Volume">${fmtCompact(m.vol)}</div>
                  <div class="dt__cell t-right dt__spark" data-sparkfor="${m.sym}"></div>
                  <div class="dt__cell t-right" data-label="">
                    <button class="iconstar ${CT.watch.has(m.sym) ? 'is-on' : ''}" data-star="${m.sym}" aria-label="Toggle watchlist">
                      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="m10 3 2.2 4.6 5 .5-3.7 3.4 1.1 4.9L10 13.9 5.4 16.4l1.1-4.9L2.8 8.1l5-.5L10 3Z"/></svg>
                    </button>
                    <button class="minibtn" data-trade="${m.sym}" data-side="BUY">Trade</button>
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </section>
      </div>`;

    paintTokens(el);
    rows.forEach(m => {
      const cell = $(`[data-sparkfor="${m.sym}"]`, el);
      if (cell && m.spark && m.spark.length > 1){
        cell.appendChild(CT.spark(m.spark, {
          width:96, height:30, color: m.change7d >= 0 ? 'var(--up)' : 'var(--down)'
        }));
      }
    });
  }

  /* ==================== HISTORY ==================== */

  let historyFilter = 'All';

  function renderHistory(){
    const el = host('history');
    if (!el) return;
    const acc = CT.account.get();
    if (!acc) return;
    const st = CT.account.stats();
    const trades = acc.trades.filter(t => historyFilter === 'All' || t.side === historyFilter.toUpperCase());

    el.innerHTML = `
      <div class="grid">
        <section class="card card--span3 stat">
          <div class="stat__top"><div class="stat__label-wrap"><div class="stat__label">Total fills</div></div></div>
          <div class="stat__body"><div class="stat__value num">${st.trades}</div><div class="stat__sub">${st.closed} closed out</div></div>
        </section>
        <section class="card card--span3 stat">
          <div class="stat__top"><div class="stat__label-wrap"><div class="stat__label">Win rate</div></div></div>
          <div class="stat__body"><div class="stat__value num">${st.closed ? st.winRate.toFixed(0) + '%' : '—'}</div><div class="stat__sub">${st.wins} / ${st.closed} profitable</div></div>
        </section>
        <section class="card card--span3 stat">
          <div class="stat__top"><div class="stat__label-wrap"><div class="stat__label">Realised P/L</div></div></div>
          <div class="stat__body"><div class="stat__value num ${plClass(acc.realized)}">${fmtSigned(acc.realized)}</div><div class="stat__sub">after fees</div></div>
        </section>
        <section class="card card--span3 stat">
          <div class="stat__top"><div class="stat__label-wrap"><div class="stat__label">Avg. hold</div></div></div>
          <div class="stat__body"><div class="stat__value num">${st.avgHoldDays ? st.avgHoldDays.toFixed(1) + 'd' : '—'}</div><div class="stat__sub">across ${st.assetsTraded} asset${st.assetsTraded === 1 ? '' : 's'}</div></div>
        </section>
      </div>

      <div class="grid">
        <section class="card card--span12">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">ACTIVITY</div>
              <div class="card__title">Order history</div>
            </div>
            <div class="tx__filters" data-hist-filters>
              ${['All','Buy','Sell'].map(f => `<button class="pill ${f === historyFilter ? 'is-active' : ''}" data-hf="${f}">${f}</button>`).join('')}
            </div>
          </div>
          ${trades.length ? historyTable(trades) : emptyBlock(
            historyFilter === 'All' ? 'No orders yet' : `No ${historyFilter.toLowerCase()} orders`,
            'Every paper fill you place shows up here with its price, fee and realised result.',
            'Place an order', 'trade')}
        </section>
      </div>`;

    if (trades.length) paintTokens(el);

    $$('[data-hist-filters] [data-hf]', el).forEach(btn => {
      btn.addEventListener('click', () => { historyFilter = btn.dataset.hf; renderHistory(); });
    });
  }

  function historyTable(trades){
    return `
      <div class="dt dt--history">
        <div class="dt__head">
          <div>ASSET</div>
          <div>SIDE</div>
          <div class="t-right">QUANTITY</div>
          <div class="t-right">FILL PRICE</div>
          <div class="t-right">FEE</div>
          <div class="t-right">VALUE</div>
          <div class="t-right">REALISED</div>
        </div>
        <div class="dt__body">
          ${trades.map(t => {
            const meta = CT.UNIVERSE_BY_SYM[t.sym] || { name:t.sym };
            return `
            <div class="dt__row">
              <div class="dt__asset">
                <span class="js-token" data-sym="${t.sym}" data-size="30"></span>
                <div>
                  <div class="dt__name">${meta.name}</div>
                  <div class="dt__sym">${fmtDateTime(t.ts)}</div>
                </div>
              </div>
              <div class="dt__cell" data-label="Side"><span class="tx__type tx__type--${t.side.toLowerCase()}">${t.side === 'BUY' ? 'Buy' : 'Sell'}</span></div>
              <div class="dt__cell t-right num" data-label="Quantity">${fmtQty(t.qty)} <small>${t.sym}</small></div>
              <div class="dt__cell t-right num" data-label="Fill price">${fmtPrice(t.price)}</div>
              <div class="dt__cell t-right num" data-label="Fee">${fmtUsd(t.fee)}</div>
              <div class="dt__cell t-right num" data-label="Value" style="color:${t.usd < 0 ? 'var(--down)' : 'var(--ink)'}">${fmtSigned(t.usd)}</div>
              <div class="dt__cell t-right num ${t.side === 'SELL' ? plClass(t.realized) : ''}" data-label="Realised">${t.side === 'SELL' ? fmtSigned(t.realized) : '—'}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  /* ==================== WATCHLIST ==================== */

  function renderWatchlistView(){
    const el = host('watchlist');
    if (!el) return;
    const list = CT.watch.get();
    const tracked = list.map(s => CT.live.bySym[s]).filter(Boolean);
    const rest = CT.live.markets.filter(m => list.indexOf(m.sym) === -1);

    el.innerHTML = `
      <div class="grid">
        <section class="card card--span8">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">WATCHLIST</div>
              <div class="card__title">${tracked.length} asset${tracked.length === 1 ? '' : 's'} tracked</div>
            </div>
          </div>
          ${tracked.length ? `
          <div class="dt dt--watch">
            <div class="dt__head">
              <div>ASSET</div>
              <div class="t-right">PRICE</div>
              <div class="t-right">24H</div>
              <div class="t-right">7D</div>
              <div class="t-right">7D CHART</div>
              <div class="t-right">ACTION</div>
            </div>
            <div class="dt__body">
              ${tracked.map(m => `
                <div class="dt__row">
                  <div class="dt__asset">
                    <span class="js-token" data-sym="${m.sym}" data-size="30"></span>
                    <div>
                      <div class="dt__name">${m.name}</div>
                      <div class="dt__sym">${m.sym}</div>
                    </div>
                  </div>
                  <div class="dt__cell t-right num" data-label="Price">${fmtPrice(m.price)}</div>
                  <div class="dt__cell t-right" data-label="24h">${deltaChip(m.change)}</div>
                  <div class="dt__cell t-right" data-label="7d">${deltaChip(m.change7d)}</div>
                  <div class="dt__cell t-right dt__spark" data-sparkfor="${m.sym}"></div>
                  <div class="dt__cell t-right" data-label="">
                    <button class="minibtn" data-trade="${m.sym}" data-side="BUY">Trade</button>
                    <button class="minibtn minibtn--ghost" data-unwatch="${m.sym}">Remove</button>
                  </div>
                </div>`).join('')}
            </div>
          </div>` : emptyBlock('Nothing on the list yet', 'Pick assets from the panel on the right to follow their price here.')}
        </section>

        <section class="card card--span4">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">ADD</div>
              <div class="card__title">Available assets</div>
            </div>
          </div>
          <div class="picker">
            ${rest.length ? rest.map(m => `
              <button class="picker__row" data-watch="${m.sym}">
                <span class="js-token" data-sym="${m.sym}" data-size="28"></span>
                <span class="picker__meta">
                  <span class="picker__name">${m.name}</span>
                  <span class="picker__sym">${m.sym}</span>
                </span>
                <span class="picker__price num">${fmtPrice(m.price)}</span>
                <span class="picker__plus">+</span>
              </button>`).join('') : '<div class="hint">Every tracked asset is already on your watchlist.</div>'}
          </div>
        </section>
      </div>`;

    paintTokens(el);
    tracked.forEach(m => {
      const cell = $(`[data-sparkfor="${m.sym}"]`, el);
      if (cell && m.spark && m.spark.length > 1){
        cell.appendChild(CT.spark(m.spark, { width:96, height:30, color: m.change7d >= 0 ? 'var(--up)' : 'var(--down)' }));
      }
    });

    $$('[data-watch]', el).forEach(b => b.addEventListener('click', () => {
      CT.watch.toggle(b.dataset.watch);
      toast(b.dataset.watch + ' added to watchlist');
      renderWatchlistView();
    }));
    $$('[data-unwatch]', el).forEach(b => b.addEventListener('click', () => {
      CT.watch.toggle(b.dataset.unwatch);
      toast(b.dataset.unwatch + ' removed from watchlist');
      renderWatchlistView();
    }));
  }

  /* ==================== shared delegated actions ==================== */

  function initViewActions(){
    document.addEventListener('click', e => {
      const trade = e.target.closest('[data-trade]');
      if (trade){
        CT.openTrade(trade.dataset.trade, trade.dataset.side || 'BUY');
        return;
      }
      const goto = e.target.closest('[data-goto]');
      if (goto){ CT.router.go(goto.dataset.goto); return; }

      const star = e.target.closest('[data-star]');
      if (star){
        const on = CT.watch.toggle(star.dataset.star);
        star.classList.toggle('is-on', on);
        toast(star.dataset.star + (on ? ' added to watchlist' : ' removed from watchlist'));
      }
    });
  }

  window.CT = Object.assign(window.CT || {}, {
    renderPortfolio, renderMarkets, renderHistory, renderWatchlistView,
    initViewActions, paintTokens, emptyBlock
  });
})();
