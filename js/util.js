// Shared DOM + formatting helpers used by every view.
(function(){
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function fmtMoney(n, digits){
    digits = digits == null ? 2 : digits;
    if (!isFinite(n)) return '—';
    return n.toLocaleString(undefined, { minimumFractionDigits:digits, maximumFractionDigits:digits });
  }

  // Prices span $0.0001 → $100k, so the precision has to follow the magnitude.
  function fmtPrice(v){
    if (!isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1000) return '$' + v.toLocaleString(undefined, { maximumFractionDigits:0 });
    if (a >= 1)    return '$' + v.toFixed(2);
    if (a >= 0.01) return '$' + v.toFixed(4);
    return '$' + v.toFixed(6);
  }

  function fmtUsd(v, digits){
    if (!isFinite(v)) return '—';
    const sign = v < 0 ? '-' : '';
    return sign + '$' + fmtMoney(Math.abs(v), digits == null ? 2 : digits);
  }

  function fmtSigned(v, digits){
    if (!isFinite(v)) return '—';
    return (v >= 0 ? '+' : '-') + '$' + fmtMoney(Math.abs(v), digits == null ? 2 : digits);
  }

  function fmtCompact(v){
    if (v == null || !isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e12) return '$' + (v/1e12).toFixed(2) + 'T';
    if (a >= 1e9)  return '$' + (v/1e9).toFixed(2) + 'B';
    if (a >= 1e6)  return '$' + (v/1e6).toFixed(1) + 'M';
    if (a >= 1e3)  return '$' + (v/1e3).toFixed(1) + 'K';
    return '$' + v.toFixed(2);
  }

  // Coin quantities: keep enough decimals to be meaningful, drop trailing zeros.
  function fmtQty(q){
    if (!isFinite(q)) return '—';
    const a = Math.abs(q);
    const d = a >= 1000 ? 2 : a >= 1 ? 4 : a >= 0.01 ? 6 : 8;
    return String(Number(q.toFixed(d)));
  }

  function fmtPct(v, digits){
    if (!isFinite(v)) return '—';
    return (v >= 0 ? '+' : '') + v.toFixed(digits == null ? 2 : digits) + '%';
  }

  function timeAgo(ts){
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (s < 45) return 'just now';
    if (s < 90) return '1 min ago';
    if (s < 3600) return Math.floor(s/60) + ' min ago';
    if (s < 7200) return '1h ago';
    if (s < 86400) return Math.floor(s/3600) + 'h ago';
    if (s < 172800) return 'Yesterday';
    return Math.floor(s/86400) + 'd ago';
  }

  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function fmtDate(ts){
    const d = new Date(ts);
    return MONTHS[d.getMonth()] + ' ' + d.getDate();
  }
  function fmtDateTime(ts){
    const d = new Date(ts);
    const today = new Date(); today.setHours(0,0,0,0);
    const stamp = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    if (d.getTime() >= today.getTime()) return 'Today · ' + stamp;
    if (d.getTime() >= today.getTime() - 86400000) return 'Yesterday · ' + stamp;
    return fmtDate(ts) + ' · ' + stamp;
  }

  const ARROW_UP   = '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3-3 3 3"/></svg>';
  const ARROW_DOWN = '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5l3 3 3-3"/></svg>';

  function deltaChipInner(v){
    if (!isFinite(v)) v = 0;
    const up = v >= 0;
    return {
      html: (up ? ARROW_UP : ARROW_DOWN) + (up ? '+' : '') + v.toFixed(2) + '%',
      cls: up ? 'chip--up' : 'chip--down'
    };
  }
  function deltaChip(v){
    const d = deltaChipInner(v);
    return `<span class="chip ${d.cls}">${d.html}</span>`;
  }

  const TOKEN_ASSETS = {
    BTC:'assets/icons/btc.svg', ETH:'assets/icons/eth.svg', SOL:'assets/icons/sol.svg',
    BNB:'assets/icons/bnb.svg', LINK:'assets/icons/link.svg', ARB:'assets/icons/arb.svg'
  };

  // Local SVG first (crisp, no network), then the CoinGecko logo, then initials.
  function tokenEl(sym, size){
    size = size || 32;
    const meta = CT.UNIVERSE_BY_SYM[sym];
    const live = CT.live && CT.live.bySym[sym];
    const src = TOKEN_ASSETS[sym] || (live && live.image) || null;

    const d = document.createElement('div');
    d.className = 'token num';
    d.style.width = size + 'px';
    d.style.height = size + 'px';

    if (src){
      d.classList.add('token--img');
      const img = document.createElement('img');
      img.src = src; img.alt = sym;
      img.width = size; img.height = size;
      img.loading = 'lazy'; img.decoding = 'async';
      img.addEventListener('error', () => { d.classList.remove('token--img'); d.innerHTML = ''; paintInitials(d, sym, size, meta); }, { once:true });
      d.appendChild(img);
      return d;
    }
    paintInitials(d, sym, size, meta);
    return d;
  }

  function paintInitials(d, sym, size, meta){
    const c = (meta && meta.color) || '#6B7280';
    d.textContent = sym.slice(0, Math.min(3, sym.length));
    d.style.fontSize = (size * 0.34) + 'px';
    d.style.background = `color-mix(in oklch, ${c} 14%, white)`;
    d.style.color = c;
    d.style.border = `1px solid color-mix(in oklch, ${c} 22%, white)`;
  }

  let toastTimer = null;
  function toast(text, kind){
    const t = $('[data-toast]');
    if (!t) return;
    $('[data-toast-text]').textContent = text;
    t.classList.toggle('toast--error', kind === 'error');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, kind === 'error' ? 3200 : 2000);
  }

  window.CT = Object.assign(window.CT || {}, {
    $, $$, fmtMoney, fmtPrice, fmtUsd, fmtSigned, fmtCompact, fmtQty, fmtPct,
    timeAgo, fmtDate, fmtDateTime, DAYS, MONTHS,
    deltaChip, deltaChipInner, tokenEl, toast
  });
})();
