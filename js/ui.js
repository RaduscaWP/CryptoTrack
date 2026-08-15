// Dashboard rendering. Everything below reads from CT.live (REST) and
// CT.account (demo portfolio) — there is no hard-coded market data left.
(function(){
  const { $, $$, fmtPrice, fmtUsd, fmtSigned, fmtCompact, fmtQty, fmtPct,
          deltaChip, deltaChipInner, tokenEl, timeAgo, fmtDateTime, toast } = CT;

  let perfRange = '1M';
  let perfAsset = 'BTC';
  let perfToken = 0;
  let moversTab = 'gainers';
  let txFilter = 'All';
  let balanceHidden = false;

  function axisFormat(v){
    if (v >= 10000) return '$' + (v/1000).toFixed(0) + 'k';
    if (v >= 1000)  return '$' + (v/1000).toFixed(1) + 'k';
    if (v >= 10)    return '$' + v.toFixed(0);
    if (v >= 1)     return '$' + v.toFixed(2);
    return '$' + v.toFixed(3);
  }

  /* ==================== HERO ==================== */

  function renderHero(){
    const snap = CT.account.snapshot(CT.live.markets);
    if (!snap) return;

    const amount = $('[data-balance]');
    if (amount){
      if (balanceHidden){
        amount.textContent = '$ -- -- -- --';
      } else {
        const whole = Math.floor(snap.equity);
        const cents = Math.abs(snap.equity - whole).toFixed(2).slice(1);
        amount.innerHTML = '$' + whole.toLocaleString() + '<span class="hero__decimals">' + cents + '</span>';
      }
    }

    const chip = $('[data-hero-delta]');
    if (chip){
      const up = snap.pl24 >= 0;
      const arrow = deltaChipInner(up ? 1 : -1).html.replace(/[+-][\d.]+%$/, '');
      chip.className = 'chip ' + (up ? 'chip--up-on-dark' : 'chip--down-on-dark');
      chip.innerHTML = arrow + fmtSigned(snap.pl24) + ' · ' + fmtPct(snap.pl24Pct);
    }

    setText('[data-hero-cash]', fmtUsd(snap.cash));
    setText('[data-hero-invested]', fmtUsd(snap.marketValue));
    const realized = $('[data-hero-realized]');
    if (realized){
      realized.textContent = fmtSigned(snap.realized);
      realized.classList.toggle('hero__stat-v--accent', snap.realized >= 0);
    }
    CT.account.recordEquity(snap.equity);
  }

  function setText(sel, text){
    const el = $(sel);
    if (el) el.textContent = text;
  }

  /* ==================== MARKET STRIP ==================== */

  function renderMarket(){
    const host = $('[data-market]');
    if (!host) return;
    const g = CT.live.global;
    const f = CT.live.fng;

    const tiles = [
      { label:'Total market cap', value: g ? fmtCompact(g.mcap) : '—',
        change: g && g.mcapChange != null ? g.mcapChange : null, note:'across all assets' },
      { label:'24h volume',       value: g ? fmtCompact(g.vol) : '—',  note:'all tracked venues' },
      { label:'BTC dominance',    value: g && g.btcDom != null ? g.btcDom.toFixed(1) + '%' : '—', note:'share of total cap' },
      { label:'Fear & Greed',     value: f ? String(f.value) : '—',    note: f ? f.label : 'sentiment index' }
    ];

    host.innerHTML = tiles.map(m => `
      <div class="market__tile">
        <div class="market__k">${m.label}</div>
        <div class="market__v-row">
          <div class="market__v num">${m.value}</div>
        </div>
        <div class="market__delta">${
          m.change != null ? deltaChip(m.change) : `<span class="market__note">${m.note}</span>`
        }</div>
      </div>`).join('');
  }

  /* ==================== STAT CARDS ==================== */

  function renderStatCard(host, config){
    if (!host) return;
    host.innerHTML = `
      <div class="stat__top">
        <div class="stat__label-wrap">
          <div class="stat__label">${config.label}</div>
        </div>
        ${config.delta != null ? deltaChip(config.delta) : ''}
      </div>
      <div class="stat__body">
        <div class="stat__value num">${config.value}</div>
        ${config.sub ? `<div class="stat__sub">${config.sub}</div>` : ''}
      </div>
      <div class="stat__spark"></div>`;
    if (config.spark && config.spark.length > 1){
      host.querySelector('.stat__spark')
        .appendChild(CT.spark(config.spark, { width:240, height:36, color:config.sparkColor, fill:true }));
    }
  }

  function renderStats(){
    const snap = CT.account.snapshot(CT.live.markets);
    if (!snap) return;
    const btc = CT.live.bySym['BTC'];
    const eth = CT.live.bySym['ETH'];
    const eq = CT.account.equitySeries();

    renderStatCard($('[data-stat="pl"]'), {
      label:'24h profit / loss',
      value: fmtSigned(snap.pl24, 0),
      sub:'unrealised, across open positions',
      delta: snap.pl24Pct,
      spark: eq.length > 2 ? eq : null,
      sparkColor: snap.pl24 >= 0 ? 'var(--up)' : 'var(--down)'
    });

    [['btc', btc], ['eth', eth]].forEach(([key, m]) => {
      const card = $(`[data-stat="${key}"]`);
      if (!card || !m) return;
      renderStatCard(card, {
        label: `${m.name} · ${m.sym}`,
        value: fmtPrice(m.price),
        sub:'USD · live',
        delta: m.change,
        spark: m.spark,
        sparkColor: m.change >= 0 ? 'var(--up)' : 'var(--down)'
      });
      card.querySelector('.stat__label').textContent = `${m.name} - ${m.sym}`;
      card.querySelector('.stat__label-wrap').prepend(tokenEl(m.sym, 24));
      card.classList.add('stat--clickable');
      card.onclick = () => selectAsset(m.sym);
    });

    renderStatCard($('[data-stat="invested"]'), {
      label:'Invested capital',
      value: fmtUsd(snap.basis, 0),
      sub:'cost basis of open positions',
      delta: snap.basis > 0 ? snap.unrealizedPct : null,
      spark: null
    });
  }

  /* ==================== PERFORMANCE ==================== */

  function renderPerformance(){
    const m = CT.live.bySym[perfAsset] || CT.live.markets[0];
    if (!m) return;
    perfAsset = m.sym;

    const title = $('[data-perf-title]');
    if (title){
      title.innerHTML = '';
      const wrap = document.createElement('span');
      wrap.className = 'perf__asset';
      wrap.appendChild(tokenEl(m.sym, 24));
      const label = document.createElement('span');
      label.textContent = `${m.name} - ${m.sym}`;
      wrap.appendChild(label);
      title.appendChild(wrap);
    }
    setText('[data-perf-legend]', m.name);
    const swatch = $('[data-perf-swatch]');
    if (swatch) swatch.style.background = m.color;

    setText('[data-perf-value]', fmtPrice(m.price));
    setText('[data-perf-sub]', 'vs start of ' + perfRange);

    const box = $('[data-perf-chart]');
    const token = ++perfToken;
    box.innerHTML = '<div class="skeleton skeleton--chart"></div>';

    CT.live.series(m.sym, perfRange).then(data => {
      if (token !== perfToken) return;
      if (!data || data.length < 2){
        box.innerHTML = '<div class="hint hint--pad">Price history is unavailable right now.</div>';
        return;
      }
      const first = data[0], last = data[data.length-1];
      const change = ((last - first) / first) * 100;
      const chip = $('[data-perf-change]');
      if (chip){
        const d = deltaChipInner(change);
        chip.className = 'chip ' + d.cls;
        chip.innerHTML = d.html;
      }
      setText('[data-perf-value]', fmtPrice(last));

      CT.areaChart(box, data, {
        color: m.color,
        tooltipLabel: m.sym + ' price',
        tooltipFormat: fmtPrice,
        yFormat: axisFormat,
        onHover(idx){ setText('[data-perf-value]', fmtPrice(idx == null ? last : data[idx])); }
      });
    });
  }

  function selectAsset(sym){
    if (!CT.UNIVERSE_BY_SYM[sym] || perfAsset === sym) return;
    perfAsset = sym;
    $$('.wl__row').forEach(r => r.classList.toggle('is-selected', r.dataset.sym === sym));
    renderPerformance();
  }

  /* ==================== ALLOCATION ==================== */

  function renderAllocation(){
    const snap = CT.account.snapshot(CT.live.markets);
    const host = $('[data-donut]');
    const list = $('[data-alloc-list]');
    if (!snap || !host || !list) return;

    const segs = snap.positions.slice(0, 6).map(p => ({ value:p.alloc, color:p.color, label:p.sym }));
    const shown = segs.reduce((s,x) => s + x.value, 0);
    const rest = Math.max(0, 100 - shown);
    if (rest > 0.05) segs.push({ value:rest, color:'#C9C9C2', label: snap.positions.length > 6 ? 'Other + cash' : 'Cash' });

    host.innerHTML = '';
    host.appendChild(CT.donut(segs, { size:160, thickness:20 }));
    const center = document.createElement('div');
    center.className = 'donut-center';
    center.innerHTML = `<div>
        <div class="donut-center-k">${snap.positions.length} asset${snap.positions.length === 1 ? '' : 's'}</div>
        <div class="donut-center-v">${snap.positions.length ? fmtPct(snap.unrealizedPct, 1) : '100%'}</div>
      </div>`;
    host.appendChild(center);

    list.innerHTML = segs.map(s => `
      <div class="alloc__row">
        <span class="alloc__swatch" style="background:${s.color}"></span>
        <span class="alloc__label">${s.label}</span>
        <span class="alloc__value">${s.value.toFixed(1)}%</span>
      </div>`).join('');
  }

  /* ==================== WATCHLIST ==================== */

  function renderWatchlist(){
    const host = $('[data-watchlist]');
    if (!host) return;
    const list = CT.watch.get();
    const items = list.map(s => CT.live.bySym[s]).filter(Boolean);
    host.innerHTML = '';

    if (!items.length){
      host.innerHTML = '<div class="hint hint--pad">Your watchlist is empty. Add assets from the Watchlist tab.</div>';
      return;
    }

    items.forEach(m => {
      const row = document.createElement('div');
      row.className = 'wl__row' + (perfAsset === m.sym ? ' is-selected' : '');
      row.dataset.sym = m.sym;
      row.innerHTML = `
        <div class="wl__asset">
          <span class="wl__token"></span>
          <div>
            <div class="wl__asset-name">${m.name}</div>
            <div class="wl__asset-sym">${m.sym}</div>
          </div>
        </div>
        <div class="wl__price num">${fmtPrice(m.price)}</div>
        <div class="wl__change">${deltaChip(m.change)}</div>
        <div class="wl__spark"></div>`;
      row.querySelector('.wl__token').replaceWith(tokenEl(m.sym, 30));
      if (m.spark && m.spark.length > 1){
        row.querySelector('.wl__spark').appendChild(
          CT.spark(m.spark, { width:96, height:30, color: m.change7d >= 0 ? 'var(--up)' : 'var(--down)' })
        );
      }
      row.addEventListener('click', () => selectAsset(m.sym));
      host.appendChild(row);
    });

    const count = $('[data-wl-count]');
    if (count) count.textContent = String(items.length);
  }

  /* ==================== MOVERS ==================== */

  function renderMovers(){
    const host = $('[data-movers-list]');
    if (!host) return;
    host.innerHTML = '';
    CT.live.movers(moversTab, 4).forEach(m => {
      const row = document.createElement('div');
      row.className = 'mover mover--clickable';
      row.innerHTML = `
        <span class="mover__token"></span>
        <div class="mover__meta">
          <div class="mover__name">${m.name}</div>
          <div class="mover__price num">${fmtPrice(m.price)}</div>
        </div>
        <div class="mover__change">${deltaChip(m.change)}</div>`;
      row.querySelector('.mover__token').replaceWith(tokenEl(m.sym, 28));
      row.addEventListener('click', () => selectAsset(m.sym));
      host.appendChild(row);
    });
  }

  /* ==================== BRIEFING ==================== */

  // Derived from the same live payload rather than a static headline list.
  function renderBriefing(){
    const host = $('[data-news]');
    if (!host) return;
    const g = CT.live.global;
    const f = CT.live.fng;
    const up = CT.live.movers('gainers', 1)[0];
    const down = CT.live.movers('losers', 1)[0];
    const stamp = CT.api.lastSync ? timeAgo(CT.api.lastSync) : 'demo data';

    const items = [];
    if (up) items.push({ tag:'MOVERS', title:`${up.name} leads the board at ${fmtPct(up.change)} over 24h, trading at ${fmtPrice(up.price)}.`, time:stamp });
    if (g) items.push({ tag:'MARKET', title:`Total capitalisation sits at ${fmtCompact(g.mcap)} with Bitcoin holding ${g.btcDom != null ? g.btcDom.toFixed(1) + '%' : '—'} dominance.`, time:stamp });
    if (f) items.push({ tag:'SENTIMENT', title:`The Fear &amp; Greed index reads ${f.value} — ${f.label}.`, time:stamp });
    if (down) items.push({ tag:'PRESSURE', title:`${down.name} is the weakest tracked asset, ${fmtPct(down.change)} on the day.`, time:stamp });

    // Breadth needs nothing but the markets list, so the card stays full offline.
    const total = CT.live.markets.filter(m => m.sym !== 'USDC').length;
    const advancing = CT.live.markets.filter(m => m.sym !== 'USDC' && m.change > 0).length;
    if (total) items.push({ tag:'BREADTH', title:`${advancing} of ${total} tracked assets are trading higher than they were 24 hours ago.`, time:stamp });

    host.innerHTML = items.slice(0, 3).map(n => `
      <div class="news__item">
        <div class="news__thumb"><span></span></div>
        <div class="news__body">
          <div class="news__tag">${n.tag}</div>
          <div class="news__title">${n.title}</div>
          <div class="news__time">${n.time}</div>
        </div>
      </div>`).join('');
  }

  /* ==================== TRANSACTIONS ==================== */

  function renderTx(){
    const host = $('[data-tx-body]');
    if (!host) return;
    const acc = CT.account.get();
    if (!acc) return;
    const items = acc.trades
      .filter(t => txFilter === 'All' || t.side === txFilter.toUpperCase())
      .slice(0, 6);

    if (!items.length){
      host.innerHTML = CT.emptyBlock(
        acc.trades.length ? 'No ' + txFilter.toLowerCase() + ' orders' : 'No orders yet',
        'Your paper fills will appear here the moment you place one.',
        'Open the trade desk', 'trade');
      return;
    }

    host.innerHTML = '';
    items.forEach(t => {
      const meta = CT.UNIVERSE_BY_SYM[t.sym] || { name:t.sym };
      const isNeg = t.usd < 0;
      const row = document.createElement('div');
      row.className = 'tx__row';
      row.innerHTML = `
        <div class="tx__asset">
          <span class="tx__token"></span>
          <div>
            <div class="tx__asset-name">${meta.name}</div>
            <div class="tx__asset-time">${fmtDateTime(t.ts)}</div>
          </div>
        </div>
        <div class="tx__cell tx__cell--type" data-label="Type"><span class="tx__type tx__type--${t.side.toLowerCase()}">${t.side === 'BUY' ? 'Buy' : 'Sell'}</span></div>
        <div class="tx__cell tx__cell--amount tx__amount num" data-label="Amount">${fmtQty(t.qty)} <small>${t.sym}</small></div>
        <div class="tx__cell tx__cell--value tx__value num" data-label="Value" style="color:${isNeg ? 'var(--down)' : 'var(--ink)'}">${fmtSigned(t.usd)}</div>
        <div class="tx__cell tx__cell--status tx__status" data-label="Status">
          <span class="tx__status-chip tx__status-chip--done"><span class="tx__status-dot"></span>Filled</span>
        </div>`;
      row.querySelector('.tx__token').replaceWith(tokenEl(t.sym, 30));
      host.appendChild(row);
    });
  }

  /* ==================== INSIGHTS ==================== */

  function renderInsights(){
    const st = CT.account.stats();
    const host = $('[data-insights]');
    if (!st || !host) return;

    host.innerHTML = `
      <div class="mini">
        <div class="mini__k">Best day</div>
        <div class="mini__v num c-up">${st.best ? fmtSigned(st.best.value, 0) : '—'}</div>
        <div class="mini__sub">${st.best ? CT.fmtDate(st.best.ts) : 'no closed trades'}</div>
      </div>
      <div class="mini">
        <div class="mini__k">Worst day</div>
        <div class="mini__v num c-down">${st.worst ? fmtSigned(st.worst.value, 0) : '—'}</div>
        <div class="mini__sub">${st.worst ? CT.fmtDate(st.worst.ts) : 'no closed trades'}</div>
      </div>
      <div class="mini">
        <div class="mini__k">Win rate</div>
        <div class="mini__v num">${st.closed ? st.winRate.toFixed(0) + '%' : '—'}</div>
        <div class="mini__sub">${st.wins} / ${st.closed} trades</div>
      </div>
      <div class="mini">
        <div class="mini__k">Avg. hold</div>
        <div class="mini__v num">${st.avgHoldDays ? st.avgHoldDays.toFixed(1) + 'd' : '—'}</div>
        <div class="mini__sub">across ${st.assetsTraded} asset${st.assetsTraded === 1 ? '' : 's'}</div>
      </div>`;

    const bars = $('[data-bars]');
    if (!bars) return;
    bars.innerHTML = '';
    const daily = CT.account.dailyRealized(30).map(d => d.value);
    bars.appendChild(CT.barsSigned(daily, { width:320, height:80 }));
  }

  /* ==================== FOOTER / FEED STATUS ==================== */

  function renderFoot(){
    const el = $('[data-foot-status]');
    if (!el) return;
    const status = CT.api.status;
    const when = CT.api.lastSync ? timeAgo(CT.api.lastSync) : 'never';
    const copy = {
      live: 'Live · CoinGecko REST · synced ' + when,
      cached: 'Cached · API rate-limited · last sync ' + when,
      offline: 'Offline · showing bundled demo prices'
    };
    el.textContent = copy[status];
    el.className = 'foot__status foot__status--' + status;
  }

  /* ==================== ORCHESTRATION ==================== */

  function renderDashboard(opts){
    renderHero();
    renderMarket();
    renderStats();
    renderAllocation();
    renderWatchlist();
    renderMovers();
    renderBriefing();
    renderTx();
    renderInsights();
    renderFoot();
    // Skipped on background ticks so a hovered chart doesn't get yanked away.
    if (!opts || opts.chart !== false) renderPerformance();
  }

  // Static controls that live in index.html — bound once at boot.
  function initDashboard(){
    $$('[data-range] [data-r]').forEach(btn => btn.addEventListener('click', () => {
      $$('[data-range] [data-r]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      perfRange = btn.dataset.r;
      renderPerformance();
    }));

    $$('[data-movers] [data-m]').forEach(btn => btn.addEventListener('click', () => {
      $$('[data-movers] [data-m]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      moversTab = btn.dataset.m;
      renderMovers();
    }));

    $$('[data-tx-filters] [data-f]').forEach(btn => btn.addEventListener('click', () => {
      $$('[data-tx-filters] [data-f]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      txFilter = btn.dataset.f;
      renderTx();
    }));

    const toggle = $('[data-toggle-balance]');
    if (toggle) toggle.addEventListener('click', () => {
      balanceHidden = !balanceHidden;
      toggle.textContent = balanceHidden ? 'Show balance' : 'Hide balance';
      renderHero();
    });

    const bell = $('[data-bell]');
    if (bell) bell.addEventListener('click', () => {
      const badge = $('[data-bell-count]');
      if (badge) badge.hidden = true;
    });

    initSearch();
    initDate();
  }

  /* ---------------- search ---------------- */

  function initSearch(){
    const input = $('[data-search]');
    if (!input) return;
    const header = document.querySelector('.header');
    const mobileToggle = $('[data-mobile-search-toggle]');
    const mobileSearchMq = window.matchMedia('(max-width: 640px)');

    function setMobileSearch(open){
      if (!header || !mobileToggle) return;
      header.classList.toggle('header--search-open', open);
      mobileToggle.setAttribute('aria-expanded', String(open));
      if (open) requestAnimationFrame(() => input.focus());
    }

    if (mobileToggle){
      mobileToggle.addEventListener('click', () => {
        if (!mobileSearchMq.matches) return;
        setMobileSearch(!header.classList.contains('header--search-open'));
      });
    }
    document.addEventListener('click', e => {
      if (!mobileSearchMq.matches || !header || !header.classList.contains('header--search-open')) return;
      if (header.contains(e.target)) return;
      setMobileSearch(false);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && header && header.classList.contains('header--search-open')) setMobileSearch(false);
    });
    window.addEventListener('resize', () => { if (!mobileSearchMq.matches) setMobileSearch(false); });
    input.addEventListener('focus', () => { if (mobileSearchMq.matches) setMobileSearch(true); });

    // Typing a symbol jumps to that asset's chart; Enter opens the trade desk.
    input.addEventListener('input', e => {
      const q = e.target.value.trim().toUpperCase();
      if (!q) return;
      const hit = CT.live.markets.find(m => m.sym.startsWith(q) || m.name.toUpperCase().startsWith(q));
      if (hit) selectAsset(hit.sym);
    });
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const q = input.value.trim().toUpperCase();
      const hit = CT.live.markets.find(m => m.sym.startsWith(q) || m.name.toUpperCase().startsWith(q));
      if (hit){ input.value = ''; CT.openTrade(hit.sym, 'BUY'); }
    });
  }

  function initDate(){
    const el = $('[data-today]');
    if (!el) return;
    const d = new Date();
    el.textContent = `· ${CT.DAYS[d.getDay()]}, ${CT.MONTHS[d.getMonth()]} ${d.getDate()}`;
  }

  window.CT = Object.assign(window.CT || {}, {
    renderDashboard, initDashboard, renderFoot, selectAsset
  });
})();
