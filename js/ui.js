// DOM render helpers + rendering of every dashboard section
(function(){
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function fmtMoney(n, digits){
    digits = digits == null ? 2 : digits;
    return n.toLocaleString(undefined, { minimumFractionDigits:digits, maximumFractionDigits:digits });
  }

  function deltaChipInner(v){
    const up = v >= 0;
    const sign = up ? '+' : '';
    const arrow = up
      ? '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3-3 3 3"/></svg>'
      : '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5l3 3 3-3"/></svg>';
    return { html: `${arrow}${sign}${v.toFixed(2)}%`, cls: up ? 'chip--up' : 'chip--down' };
  }
  function deltaChip(v){
    const d = deltaChipInner(v);
    return `<span class="chip ${d.cls}">${d.html}</span>`;
  }

  const TOKEN_ASSETS = {
    BTC: 'assets/icons/btc.svg',
    ETH: 'assets/icons/eth.svg',
    SOL: 'assets/icons/sol.svg',
    BNB: 'assets/icons/bnb.svg',
    LINK: 'assets/icons/link.svg',
    ARB: 'assets/icons/arb.svg'
  };

  function tokenEl(sym, size){
    size = size || 32;
    const map = {
      BTC:'#F7931A', ETH:'#627EEA', SOL:'#9945FF', LINK:'#2A5ADA',
      AVAX:'#E84142', DOT:'#E6007A', MATIC:'#8247E5', ARB:'#28A0F0',
      USDC:'#2775CA', APT:'#11B3A3', ATOM:'#5C6BC0'
    };
    const d = document.createElement('div');
    d.className = 'token num';
    d.style.width = size + 'px';
    d.style.height = size + 'px';

    if (TOKEN_ASSETS[sym]){
      d.classList.add('token--img');
      const img = document.createElement('img');
      img.src = TOKEN_ASSETS[sym];
      img.alt = sym;
      img.width = size; img.height = size;
      img.loading = 'lazy';
      img.decoding = 'async';
      d.appendChild(img);
      return d;
    }
    const c = map[sym] || '#6B7280';
    const label = sym.slice(0, sym.length > 3 ? 3 : sym.length);
    d.textContent = label;
    d.style.fontSize = (size * 0.34) + 'px';
    d.style.background = `color-mix(in oklch, ${c} 14%, white)`;
    d.style.color = c;
    d.style.border = `1px solid color-mix(in oklch, ${c} 22%, white)`;
    return d;
  }

  // --- Market strip tiles ---
  function renderMarket(){
    const host = $('[data-market]');
    if (!host) return;
    host.innerHTML = CT.MARKET_STATS.map(m => `
      <div class="market__tile">
        <div class="market__k">${m.label}</div>
        <div class="market__v-row">
          <div class="market__v num">${m.value}</div>
          ${m.sub ? `<div class="market__sub">${m.sub}</div>` : ''}
        </div>
        <div class="market__delta">${deltaChip(m.change)}</div>
      </div>
    `).join('');
  }

  // --- Stat cards (24h P/L, BTC, ETH, Invested) ---
  function renderStatCard(host, config){
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
      <div class="stat__spark"></div>
    `;
    if (config.spark){
      host.querySelector('.stat__spark')
        .appendChild(CT.spark(config.spark, { width:240, height:36, color:config.sparkColor, fill:true }));
    }
  }

  function renderStats(){
    const btc = CT.HOLDINGS.find(h => h.sym === 'BTC');
    const eth = CT.HOLDINGS.find(h => h.sym === 'ETH');
    const pl24 = CT.HOLDINGS.reduce((s,h) => s + h.amount*h.price*(h.change/100), 0);

    renderStatCard($('[data-stat="pl"]'), {
      label:'24h profit / loss',
      value:(pl24 >= 0 ? '+$' : '-$') + Math.abs(pl24).toLocaleString(undefined,{maximumFractionDigits:0}),
      sub:'vs yesterday',
      delta:+2.27,
      spark:[120,124,122,128,131,129,134,138,140,142,139,144,148],
      sparkColor:'var(--up)'
    });
    const btcCard = $('[data-stat="btc"]');
    renderStatCard(btcCard, {
      label:'Bitcoin · BTC',
      value:'$' + btc.price.toLocaleString(undefined,{maximumFractionDigits:0}),
      sub:'USD',
      delta:btc.change,
      spark:btc.spark,
      sparkColor:'var(--up)'
    });
    btcCard.querySelector('.stat__label').textContent = 'Bitcoin - BTC';
    btcCard.querySelector('.stat__label-wrap').prepend(tokenEl('BTC', 24));
    btcCard.classList.add('stat--clickable');
    btcCard.addEventListener('click', () => selectAsset('BTC'));

    const ethCard = $('[data-stat="eth"]');
    renderStatCard(ethCard, {
      label:'Ethereum · ETH',
      value:'$' + eth.price.toLocaleString(undefined,{maximumFractionDigits:0}),
      sub:'USD',
      delta:eth.change,
      spark:eth.spark,
      sparkColor:'var(--accent)'
    });
    ethCard.querySelector('.stat__label').textContent = 'Ethereum - ETH';
    ethCard.querySelector('.stat__label-wrap').prepend(tokenEl('ETH', 24));
    ethCard.classList.add('stat--clickable');
    ethCard.addEventListener('click', () => selectAsset('ETH'));
    renderStatCard($('[data-stat="invested"]'), {
      label:'Invested capital',
      value:'$128,112',
      sub:'cost basis',
      delta:+14.72,
      spark:[40,46,50,55,62,58,66,72,78,82,86,92,98,104,108],
      sparkColor:'var(--ink)'
    });
  }

  // --- Performance chart ---
  let perfRange = '1M';
  let perfAsset = 'BTC';

  function priceFormat(v){
    if (v >= 1000) return '$' + v.toLocaleString(undefined, { maximumFractionDigits:0 });
    if (v >= 1)    return '$' + v.toFixed(2);
    return '$' + v.toFixed(4);
  }
  function axisFormat(v){
    if (v >= 10000) return '$' + (v/1000).toFixed(0) + 'k';
    if (v >= 1000)  return '$' + (v/1000).toFixed(1) + 'k';
    if (v >= 10)    return '$' + v.toFixed(0);
    if (v >= 1)     return '$' + v.toFixed(2);
    return '$' + v.toFixed(3);
  }
  const headlineFormat = priceFormat;

  function renderPerformance(){
    const asset = CT.HOLDINGS.find(h => h.sym === perfAsset) || CT.HOLDINGS[0];
    const data = CT.COIN_SERIES[asset.sym][perfRange];
    const first = data[0], last = data[data.length-1];
    const change = ((last - first) / first) * 100;

    $('[data-perf-title]').textContent = `${asset.name} · ${asset.sym}`;
    $('[data-perf-legend]').textContent = asset.name;
    $('[data-perf-swatch]').style.background = asset.color;
    const title = $('[data-perf-title]');
    title.innerHTML = '';
    const perfAssetEl = document.createElement('span');
    perfAssetEl.className = 'perf__asset';
    perfAssetEl.appendChild(tokenEl(asset.sym, 24));
    const perfAssetLabel = document.createElement('span');
    perfAssetLabel.textContent = `${asset.name} - ${asset.sym}`;
    perfAssetEl.appendChild(perfAssetLabel);
    title.appendChild(perfAssetEl);

    $('[data-perf-value]').textContent = headlineFormat(last);
    const chip = $('[data-perf-change]');
    const d = deltaChipInner(change);
    chip.className = 'chip ' + d.cls;
    chip.innerHTML = d.html;
    $('[data-perf-sub]').textContent = 'vs start of ' + perfRange;

    CT.areaChart($('[data-perf-chart]'), data, {
      color: asset.color,
      tooltipLabel: asset.sym + ' price',
      tooltipFormat: priceFormat,
      yFormat: axisFormat,
      onHover(idx){
        $('[data-perf-value]').textContent = headlineFormat(idx == null ? last : data[idx]);
      }
    });
  }

  function initPerfControls(){
    $$('[data-range] [data-r]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('[data-range] [data-r]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        perfRange = btn.dataset.r;
        renderPerformance();
      });
    });
  }

  function selectAsset(sym){
    if (!CT.COIN_SERIES[sym] || perfAsset === sym) return;
    perfAsset = sym;
    $$('.wl__row').forEach(r => r.classList.toggle('is-selected', r.dataset.sym === sym));
    renderPerformance();
  }

  // --- Allocation donut ---
  function renderAllocation(){
    const top = CT.HOLDINGS.slice(0, 5);
    const other = CT.HOLDINGS.slice(5).reduce((s,x) => s + x.alloc, 0);
    const segs = top.map(h => ({ value:h.alloc, color:h.color, label:h.sym }))
      .concat([{ value:other, color:'#C9C9C2', label:'Other' }]);

    const host = $('[data-donut]');
    host.innerHTML = '';
    host.appendChild(CT.donut(segs, { size:160, thickness:20 }));
    const center = document.createElement('div');
    center.className = 'donut-center';
    center.innerHTML = `
      <div>
        <div class="donut-center-k">${CT.HOLDINGS.length} assets</div>
        <div class="donut-center-v">100%</div>
      </div>
    `;
    host.appendChild(center);

    $('[data-alloc-list]').innerHTML = segs.map(s => `
      <div class="alloc__row">
        <span class="alloc__swatch" style="background:${s.color}"></span>
        <span class="alloc__label">${s.label}</span>
        <span class="alloc__value">${s.value.toFixed(1)}%</span>
      </div>
    `).join('');
  }

  // --- Watchlist ---
  function renderWatchlist(){
    const host = $('[data-watchlist]');
    const items = CT.HOLDINGS.filter(h => CT.WATCHLIST.indexOf(h.sym) !== -1);
    host.innerHTML = '';
    items.forEach(h => {
      const row = document.createElement('div');
      row.className = 'wl__row' + (perfAsset === h.sym ? ' is-selected' : '');
      row.dataset.sym = h.sym;
      row.innerHTML = `
        <div class="wl__asset">
          <span class="wl__token"></span>
          <div>
            <div class="wl__asset-name">${h.name}</div>
            <div class="wl__asset-sym">${h.sym}</div>
          </div>
        </div>
        <div class="wl__price">$${fmtMoney(h.price)}</div>
        <div class="wl__change">${deltaChip(h.change)}</div>
        <div class="wl__spark"></div>
      `;
      row.querySelector('.wl__token').replaceWith(tokenEl(h.sym, 30));
      row.querySelector('.wl__spark').appendChild(
        CT.spark(h.spark, { width:96, height:30, color: h.change >= 0 ? 'var(--up)' : 'var(--down)' })
      );
      row.addEventListener('click', () => selectAsset(h.sym));
      host.appendChild(row);
    });
  }

  // --- Movers ---
  let moversTab = 'gainers';
  function renderMovers(){
    const items = moversTab === 'gainers' ? CT.GAINERS : CT.LOSERS;
    const host = $('[data-movers-list]');
    host.innerHTML = '';
    items.forEach(i => {
      const row = document.createElement('div');
      row.className = 'mover';
      if (CT.COIN_SERIES[i.sym]) row.classList.add('mover--clickable');
      row.innerHTML = `
        <span class="mover__token"></span>
        <div class="mover__meta">
          <div class="mover__name">${i.name}</div>
          <div class="mover__price">$${i.price.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
        </div>
        <div class="mover__change">${deltaChip(i.change)}</div>
      `;
      row.querySelector('.mover__token').replaceWith(tokenEl(i.sym, 28));
      if (CT.COIN_SERIES[i.sym]) row.addEventListener('click', () => selectAsset(i.sym));
      host.appendChild(row);
    });
  }
  function initMovers(){
    $$('[data-movers] [data-m]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('[data-movers] [data-m]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        moversTab = btn.dataset.m;
        renderMovers();
      });
    });
  }

  // --- News ---
  function renderNews(){
    $('[data-news]').innerHTML = CT.NEWS.map(n => `
      <a href="#" class="news__item">
        <div class="news__thumb"><span></span></div>
        <div class="news__body">
          <div class="news__tag">${n.tag}</div>
          <div class="news__title">${n.title}</div>
          <div class="news__time">${n.time}</div>
        </div>
      </a>
    `).join('');
  }

  // --- Transactions ---
  let txFilter = 'All';
  function renderTx(){
    const host = $('[data-tx-body]');
    const items = CT.TRANSACTIONS.filter(t => txFilter === 'All' || t.type === txFilter);
    host.innerHTML = '';
    items.forEach(t => {
      const asset = CT.HOLDINGS.find(h => h.sym === t.asset) || { name:t.asset };
      const isNeg = t.usd < 0;
      const typeClass = 'tx__type--' + t.type.toLowerCase();
      const statusClass = t.status === 'Completed' ? 'tx__status-chip--done' : 'tx__status-chip--pending';
      const row = document.createElement('div');
      row.className = 'tx__row';
      row.innerHTML = `
        <div class="tx__asset">
          <span class="tx__token"></span>
          <div>
            <div class="tx__asset-name">${asset.name}</div>
            <div class="tx__asset-time">${t.time}</div>
          </div>
        </div>
        <div class="tx__cell tx__cell--type" data-label="Type"><span class="tx__type ${typeClass}">${t.type}</span></div>
        <div class="tx__cell tx__cell--amount tx__amount num" data-label="Amount">${t.amount} <small>${t.asset}</small></div>
        <div class="tx__cell tx__cell--value tx__value num" data-label="Value" style="color:${isNeg ? 'var(--down)' : 'var(--ink)'}">${isNeg ? '-' : '+'}$${fmtMoney(Math.abs(t.usd))}</div>
        <div class="tx__cell tx__cell--status tx__status" data-label="Status">
          <span class="tx__status-chip ${statusClass}">
            <span class="tx__status-dot"></span>${t.status}
          </span>
        </div>
      `;
      row.querySelector('.tx__token').replaceWith(tokenEl(t.asset, 30));
      host.appendChild(row);
    });
  }
  function initTxFilters(){
    $$('[data-tx-filters] [data-f]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('[data-tx-filters] [data-f]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        txFilter = btn.dataset.f;
        renderTx();
      });
    });
  }

  // --- Insights bars ---
  function renderInsights(){
    const host = $('[data-bars]');
    host.innerHTML = '';
    host.appendChild(CT.bars(CT.INSIGHT_BARS, { width:320, height:80, color:'var(--accent)' }));
  }

  // --- Toast ---
  let toastTimer = null;
  function toast(text){
    const t = $('[data-toast]');
    $('[data-toast-text]').textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 1800);
  }

  // --- Hero balance hide/show + actions ---
  function initHero(){
    const balance = $('[data-balance]');
    const realHTML = balance.innerHTML;
    const toggle = $('[data-toggle-balance]');
    let hidden = false;
    toggle.addEventListener('click', () => {
      hidden = !hidden;
      balance.innerHTML = hidden ? '$ • • • • • •' : realHTML;
      if (hidden) balance.innerHTML = '$ -- -- -- --';
      toggle.textContent = hidden ? 'Show balance' : 'Hide balance';
    });
  }

  function initActions(){
    const copy = {
      deposit:'Deposit wizard opened',
      send:'Send assets modal opened',
      receive:'Receive address ready',
      swap:'Swap preview ready',
    };
    $$('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => toast(copy[btn.dataset.action] || btn.dataset.action));
    });
  }

  function initBell(){
    const btn = $('[data-bell]');
    const badge = $('[data-bell-count]');
    btn.addEventListener('click', () => { badge.hidden = true; });
  }

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
      if (open){
        requestAnimationFrame(() => input.focus());
      }
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
      if (e.key === 'Escape' && header && header.classList.contains('header--search-open')){
        setMobileSearch(false);
      }
    });

    window.addEventListener('resize', () => {
      if (!mobileSearchMq.matches){
        setMobileSearch(false);
      }
    });

    input.addEventListener('input', e => {
      const q = e.target.value.trim().toUpperCase();
      if (!q){ txFilter = 'All'; renderTx(); return; }
      const host = $('[data-tx-body]');
      $$('.tx__row', host).forEach(r => {
        const sym = r.querySelector('.tx__amount small').textContent.toUpperCase();
        r.style.display = sym.includes(q) ? '' : 'none';
      });
    });

    input.addEventListener('focus', () => {
      if (mobileSearchMq.matches){
        setMobileSearch(true);
      }
    });
  }

  function initDate(){
    const el = $('[data-today]');
    if (!el) return;
    const d = new Date();
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    el.textContent = `· ${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  }

  window.CT = Object.assign(window.CT || {}, {
    renderMarket, renderStats, renderPerformance, renderAllocation,
    renderWatchlist, renderMovers, renderNews, renderTx, renderInsights,
    initPerfControls, initMovers, initTxFilters,
    initHero, initActions, initBell, initSearch, initDate,
    toast
  });
})();
