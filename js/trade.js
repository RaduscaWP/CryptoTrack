// Trade desk — order ticket wired to live prices and the demo account.
(function(){
  const { $, $$, fmtPrice, fmtUsd, fmtSigned, fmtQty, fmtPct, deltaChip, tokenEl, toast, fmtDateTime } = CT;

  const RANGES = ['1D','1W','1M','3M','1Y'];

  let sym   = 'BTC';
  let side  = 'BUY';
  let unit  = 'USD';    // amount field is denominated in USD or in the coin
  let range = '1M';
  let seriesToken = 0;  // guards against a slow fetch overwriting a newer one

  function market(){ return CT.live.bySym[sym] || null; }
  function meta(){ return CT.UNIVERSE_BY_SYM[sym] || { name:sym, color:'#6B7280' }; }

  function held(){
    const acc = CT.account.get();
    const pos = acc && acc.positions[sym];
    return pos ? pos.qty : 0;
  }

  // What the user typed, converted to a coin quantity.
  function qtyFromInput(){
    const raw = parseFloat(($('[data-amt]') || {}).value);
    if (!isFinite(raw) || raw <= 0) return 0;
    const m = market();
    if (unit === 'COIN') return raw;
    if (!m || !m.price) return 0;
    // In USD mode a BUY figure is the all-in debit, so back the fee out first.
    return side === 'BUY' ? (raw / (1 + CT.account.FEE)) / m.price : raw / m.price;
  }

  function render(){
    const el = $('[data-view="trade"]');
    if (!el) return;
    const acc = CT.account.get();
    if (!acc) return;
    const m = market();
    const price = m ? m.price : null;

    el.innerHTML = `
      <div class="grid">
        <section class="card card--span8">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">CHART</div>
              <div class="card__title" data-tr-title></div>
            </div>
            <div class="segmented" data-tr-range>
              ${RANGES.map(r => `<button class="segmented__btn ${r === range ? 'is-active' : ''}" data-tr="${r}">${r}</button>`).join('')}
            </div>
          </div>
          <div class="perf__summary">
            <div class="perf__value num" data-tr-price>${fmtPrice(price)}</div>
            <div class="perf__meta">
              ${m ? deltaChip(m.change) : ''}
              <span class="perf__sub">${m ? '24h range ' + fmtPrice(m.low24) + ' – ' + fmtPrice(m.high24) : 'waiting for live price…'}</span>
            </div>
          </div>
          <div class="perf__chart" data-tr-chart><div class="skeleton skeleton--chart"></div></div>
        </section>

        <section class="card card--span4 ticket">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">ORDER TICKET</div>
              <div class="card__title">Market order · demo</div>
            </div>
          </div>

          <div class="ticket__assets" data-tr-assets>
            ${CT.live.markets.map(x => `
              <button class="assetchip ${x.sym === sym ? 'is-active' : ''}" data-pick="${x.sym}">
                <span class="js-token" data-sym="${x.sym}" data-size="20"></span>
                <span>${x.sym}</span>
              </button>`).join('')}
          </div>

          <div class="segmented segmented--side" data-tr-side>
            <button class="segmented__btn ${side === 'BUY' ? 'is-active' : ''}" data-side="BUY">Buy</button>
            <button class="segmented__btn ${side === 'SELL' ? 'is-active' : ''}" data-side="SELL">Sell</button>
          </div>

          <label class="field">
            <span class="field__label">Amount</span>
            <span class="field__box">
              <input class="field__input num" type="number" inputmode="decimal" min="0" step="any" placeholder="0.00" data-amt />
              <span class="field__units" data-tr-unit>
                <button class="field__unit ${unit === 'USD' ? 'is-active' : ''}" data-unit="USD">USD</button>
                <button class="field__unit ${unit === 'COIN' ? 'is-active' : ''}" data-unit="COIN">${sym}</button>
              </span>
            </span>
          </label>

          <div class="quickpct" data-tr-pct>
            ${[25,50,75,100].map(p => `<button class="pill" data-pct="${p}">${p === 100 ? 'Max' : p + '%'}</button>`).join('')}
          </div>

          <div class="kv kv--ticket">
            <div class="kv__row"><span>Available</span><b class="num" data-tr-avail></b></div>
            <div class="kv__row"><span>You ${side === 'BUY' ? 'receive' : 'sell'}</span><b class="num" data-tr-qty>—</b></div>
            <div class="kv__row"><span>Fee (${(CT.account.FEE*100).toFixed(2)}%)</span><b class="num" data-tr-fee>—</b></div>
            <div class="kv__row kv__row--total"><span>${side === 'BUY' ? 'Total cost' : 'Net proceeds'}</span><b class="num" data-tr-total>—</b></div>
          </div>

          <button class="btn-submit ${side === 'SELL' ? 'btn-submit--sell' : ''}" data-tr-submit>
            ${side === 'BUY' ? 'Buy' : 'Sell'} ${sym}
          </button>
          <div class="ticket__note">Paper trading only — no real funds, no exchange connection. Fills happen instantly at the live mid price.</div>
        </section>
      </div>

      <div class="grid">
        <section class="card card--span6">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">POSITION</div>
              <div class="card__title">Your ${sym} exposure</div>
            </div>
          </div>
          <div data-tr-position></div>
        </section>
        <section class="card card--span6">
          <div class="card__head">
            <div class="card__title-group">
              <div class="card__eyebrow">FILLS</div>
              <div class="card__title">Recent ${sym} orders</div>
            </div>
            <button class="textbtn textbtn--muted" data-goto="history">View all ↗</button>
          </div>
          <div data-tr-fills></div>
        </section>
      </div>`;

    // Title with the token badge, mirroring the dashboard performance card.
    const title = $('[data-tr-title]', el);
    const wrap = document.createElement('span');
    wrap.className = 'perf__asset';
    wrap.appendChild(tokenEl(sym, 24));
    const label = document.createElement('span');
    label.textContent = `${meta().name} - ${sym}`;
    wrap.appendChild(label);
    title.appendChild(wrap);

    CT.paintTokens(el);
    bind(el);
    updateSummary();
    renderPosition();
    renderFills();
    loadChart();
  }

  function bind(el){
    $$('[data-pick]', el).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.pick === sym) return;
      sym = b.dataset.pick;
      render();
    }));
    $$('[data-tr-side] [data-side]', el).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.side === side) return;
      side = b.dataset.side;
      render();
    }));
    $$('[data-tr-unit] [data-unit]', el).forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      if (b.dataset.unit === unit) return;
      unit = b.dataset.unit;
      $$('[data-tr-unit] [data-unit]', el).forEach(x => x.classList.toggle('is-active', x.dataset.unit === unit));
      $('[data-amt]', el).value = '';
      updateSummary();
    }));
    $$('[data-tr-range] [data-tr]', el).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.tr === range) return;
      range = b.dataset.tr;
      $$('[data-tr-range] [data-tr]', el).forEach(x => x.classList.toggle('is-active', x.dataset.tr === range));
      loadChart();
    }));
    $$('[data-tr-pct] [data-pct]', el).forEach(b => b.addEventListener('click', () => {
      applyPercent(Number(b.dataset.pct));
    }));

    const amt = $('[data-amt]', el);
    amt.addEventListener('input', updateSummary);
    amt.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    $('[data-tr-submit]', el).addEventListener('click', submit);
  }

  function applyPercent(pct){
    const m = market();
    if (!m || !m.price) return;
    const acc = CT.account.get();
    const input = $('[data-amt]');
    // At 100% keep full precision so "Max" empties the balance exactly; the
    // intermediate steps are rounded to something a human would actually type.
    const coin = v => pct === 100 ? String(v) : String(Number(v.toFixed(8)));

    if (side === 'BUY'){
      const usd = acc.cash * (pct/100);
      input.value = unit === 'USD'
        ? String(Number(usd.toFixed(2)))
        : coin((usd / (1 + CT.account.FEE)) / m.price);
    } else {
      const qty = held() * (pct/100);
      input.value = unit === 'USD'
        ? String(Number((qty * m.price).toFixed(2)))
        : coin(qty);
    }
    updateSummary();
  }

  function updateSummary(){
    const el = $('[data-view="trade"]');
    if (!el) return;
    const m = market();
    const acc = CT.account.get();
    if (!acc) return;

    const availEl = $('[data-tr-avail]', el);
    if (availEl){
      availEl.textContent = side === 'BUY'
        ? fmtUsd(acc.cash)
        : fmtQty(held()) + ' ' + sym;
    }

    const qty = qtyFromInput();
    const price = m ? m.price : 0;
    const q = qty > 0 && price > 0 ? CT.account.quote(side, qty, price) : null;

    $('[data-tr-qty]', el).textContent   = q ? fmtQty(qty) + ' ' + sym : '—';
    $('[data-tr-fee]', el).textContent   = q ? fmtUsd(q.fee) : '—';
    $('[data-tr-total]', el).textContent = q ? fmtUsd(q.total) : '—';

    const btn = $('[data-tr-submit]', el);
    const affordable = !q || (side === 'BUY' ? q.total <= acc.cash + 0.005 : qty <= held() + 1e-9);
    btn.disabled = !q || !affordable;
    btn.textContent = !q
      ? `${side === 'BUY' ? 'Buy' : 'Sell'} ${sym}`
      : !affordable
        ? (side === 'BUY' ? 'Not enough cash' : 'Not enough ' + sym)
        : `${side === 'BUY' ? 'Buy' : 'Sell'} ${fmtQty(qty)} ${sym}`;
  }

  function submit(){
    const m = market();
    if (!m || !m.price){ toast('No live price for ' + sym + ' yet.', 'error'); return; }
    const qty = qtyFromInput();
    if (qty <= 0){ toast('Enter an amount greater than zero.', 'error'); return; }
    try {
      const t = side === 'BUY' ? CT.account.buy(sym, qty, m.price) : CT.account.sell(sym, qty, m.price);
      toast(`${side === 'BUY' ? 'Bought' : 'Sold'} ${fmtQty(t.qty)} ${sym} at ${fmtPrice(t.price)}`);
      $('[data-amt]').value = '';
      renderPosition();
      renderFills();
      updateSummary();
      CT.refreshChrome();
    } catch (err){
      toast(err.message || 'Order rejected.', 'error');
    }
  }

  function renderPosition(){
    const box = $('[data-tr-position]');
    if (!box) return;
    const snap = CT.account.snapshot(CT.live.markets);
    const pos = snap && snap.positions.find(p => p.sym === sym);
    if (!pos){
      box.innerHTML = `<div class="hint hint--pad">No open ${sym} position. A buy order opens one and starts tracking your average cost.</div>`;
      return;
    }
    box.innerHTML = `
      <div class="kv">
        <div class="kv__row"><span>Quantity</span><b class="num">${fmtQty(pos.qty)} ${sym}</b></div>
        <div class="kv__row"><span>Average cost</span><b class="num">${fmtPrice(pos.avgCost)}</b></div>
        <div class="kv__row"><span>Market price</span><b class="num">${fmtPrice(pos.price)}</b></div>
        <div class="kv__row"><span>Market value</span><b class="num">${fmtUsd(pos.value)}</b></div>
        <div class="kv__row kv__row--total"><span>Unrealised P/L</span><b class="num ${pos.pl >= 0 ? 'c-up' : 'c-down'}">${fmtSigned(pos.pl)} · ${fmtPct(pos.plPct)}</b></div>
      </div>`;
  }

  function renderFills(){
    const box = $('[data-tr-fills]');
    if (!box) return;
    const acc = CT.account.get();
    const fills = acc.trades.filter(t => t.sym === sym).slice(0, 5);
    if (!fills.length){
      box.innerHTML = `<div class="hint hint--pad">No ${sym} orders yet.</div>`;
      return;
    }
    box.innerHTML = `<div class="filllist">${fills.map(t => `
      <div class="fill">
        <span class="tx__type tx__type--${t.side.toLowerCase()}">${t.side === 'BUY' ? 'Buy' : 'Sell'}</span>
        <span class="fill__qty num">${fmtQty(t.qty)} ${t.sym}</span>
        <span class="fill__price num">@ ${fmtPrice(t.price)}</span>
        <span class="fill__time">${fmtDateTime(t.ts)}</span>
        <span class="fill__usd num" style="color:${t.usd < 0 ? 'var(--down)' : 'var(--up)'}">${fmtSigned(t.usd)}</span>
      </div>`).join('')}</div>`;
  }

  function loadChart(){
    const box = $('[data-tr-chart]');
    if (!box) return;
    const token = ++seriesToken;
    box.innerHTML = '<div class="skeleton skeleton--chart"></div>';
    const target = sym;
    CT.live.series(sym, range).then(data => {
      if (token !== seriesToken) return;         // user moved on — drop this result
      if (!data || data.length < 2){
        box.innerHTML = '<div class="hint hint--pad">Price history is unavailable right now.</div>';
        return;
      }
      const last = data[data.length-1];
      CT.areaChart(box, data, {
        color: meta().color,
        tooltipLabel: target + ' price',
        tooltipFormat: fmtPrice,
        onHover(idx){
          const el = $('[data-tr-price]');
          if (el) el.textContent = fmtPrice(idx == null ? last : data[idx]);
        }
      });
    });
  }

  // Called by the router / other views to jump straight into an order.
  function openTrade(nextSym, nextSide){
    if (nextSym && CT.UNIVERSE_BY_SYM[nextSym]) sym = nextSym;
    if (nextSide) side = nextSide;
    CT.router.go('trade');
  }

  // Live tick: refresh prices without stomping on what the user is typing.
  function onLive(){
    if (!CT.router || CT.router.current() !== 'trade') return;
    const m = market();
    const priceEl = $('[data-tr-price]');
    if (priceEl && m) priceEl.textContent = fmtPrice(m.price);
    updateSummary();
    renderPosition();
  }

  window.CT = Object.assign(window.CT || {}, {
    renderTrade: render, openTrade, tradeOnLive: onLive
  });
})();
