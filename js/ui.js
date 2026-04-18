import {
  coins,
  transactions,
  fmtCurrency,
  fmtNumber,
  fmtPercent,
  fmtSignedUSD,
  fmtDate
} from './data.js';
import { setActiveCoin } from './chart.js';

const PAGE_SIZE = 8;

const tableState = {
  query: '',
  sortBy: 'date',
  sortDir: 'desc',
  page: 1
};

// === CARDS ===========================================================

export function renderCards() {
  const host = document.querySelector('[data-cards]');
  if (!host) return;

  host.innerHTML = coins.map((c, i) => {
    const dir = c.change24h >= 0 ? 'up' : 'down';
    const changeClass = `badge--${dir}`;
    const activeMod = i === 0 ? ' card--active' : '';

    return `
      <article class="card card--${c.id}${activeMod}" data-coin="${c.id}" role="button" tabindex="0" aria-pressed="${i === 0 ? 'true' : 'false'}">
        <div class="card__head">
          <div class="card__identity">
            <img class="card__mark" src="assets/icons/${c.id}.svg" alt="" width="24" height="24" />
            <span class="card__symbol">${c.symbol}</span>
            <span class="card__name">${c.name}</span>
          </div>
          <span class="badge ${changeClass}">
            <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="M12 4l8 10H4z"/></svg>
            <span>${fmtPercent(c.change24h)}</span>
          </span>
        </div>

        <div class="card__price" data-counter data-target="${c.price}" data-decimals="2" data-prefix="$">$0.00</div>

        <div class="card__rows">
          <div class="card__row">
            <span class="card__row-key">Holdings</span>
            <span class="card__row-val">${fmtNumber(c.holdings, c.holdings < 1 ? 4 : 2)} ${c.symbol}</span>
          </div>
          <div class="card__row">
            <span class="card__row-key">Value</span>
            <span class="card__row-val">${fmtCurrency(c.valueUSD)}</span>
          </div>
          <div class="card__row">
            <span class="card__row-key">7D</span>
            <span class="card__row-val card__row-val--${c.change7d >= 0 ? 'up' : 'down'}">${fmtPercent(c.change7d)}</span>
          </div>
        </div>

        <div class="card__range">
          <span>H <b>${fmtCurrency(c.high24h)}</b></span>
          <span>L <b>${fmtCurrency(c.low24h)}</b></span>
        </div>
      </article>
    `;
  }).join('');

  // Clicking a coin card switches the chart to that coin
  const cards = host.querySelectorAll('.card');
  const activate = (cardEl) => {
    const coinId = cardEl.dataset.coin;
    if (!coinId) return;

    cards.forEach((c) => {
      c.classList.remove('card--active');
      c.setAttribute('aria-pressed', 'false');
    });
    cardEl.classList.add('card--active');
    cardEl.setAttribute('aria-pressed', 'true');

    setActiveCoin(coinId);
  };

  cards.forEach((card) => {
    card.addEventListener('click', () => activate(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(card);
      }
    });
  });
}

// === HEADER ==========================================================

export function renderHeader() {
  // Data-counter values are already in the HTML — kept here as a hook so
  // future signals (refresh, new fill) can re-trigger a render/animation.
}

// === TABLE ===========================================================

function filteredSortedRows() {
  const q = tableState.query.trim().toLowerCase();

  let rows = transactions.filter((tx) => {
    if (!q) return true;
    return (
      tx.coin.toLowerCase().includes(q) ||
      tx.coinId.toLowerCase().includes(q) ||
      tx.type.toLowerCase().includes(q)
    );
  });

  const { sortBy, sortDir } = tableState;
  const dir = sortDir === 'asc' ? 1 : -1;

  rows = [...rows].sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];

    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

  return rows;
}

function rowHtml(tx) {
  const pnlClass = tx.pnl >= 0 ? 'table__pnl--up' : 'table__pnl--down';
  return `
    <tr class="table__row">
      <td class="table__td table__td--date">${fmtDate(tx.date)}</td>
      <td class="table__td table__td--coin">
        <img class="table__coin-mark" src="assets/icons/${tx.coinId}.svg" alt="" width="20" height="20" />
        <span class="table__coin-name">${tx.coin}</span>
      </td>
      <td class="table__td">
        <span class="table__tag table__tag--${tx.type}">${tx.type}</span>
      </td>
      <td class="table__td table__td--num">${fmtNumber(tx.amount, tx.amount < 1 ? 4 : 2)}</td>
      <td class="table__td table__td--num">${fmtCurrency(tx.priceAtTx)}</td>
      <td class="table__td table__td--num">${fmtCurrency(tx.totalUSD)}</td>
      <td class="table__td table__td--num">
        <span class="table__pnl ${pnlClass}">${fmtSignedUSD(tx.pnl)}</span>
      </td>
    </tr>
  `;
}

export function renderTable() {
  const body   = document.querySelector('[data-table-body]');
  const status = document.querySelector('[data-table-status]');
  const prev   = document.querySelector('[data-page-prev]');
  const next   = document.querySelector('[data-page-next]');

  if (!body) return;

  const rows = filteredSortedRows();
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (tableState.page > pages) tableState.page = pages;
  if (tableState.page < 1)     tableState.page = 1;

  const startIdx = (tableState.page - 1) * PAGE_SIZE;
  const endIdx   = Math.min(startIdx + PAGE_SIZE, total);
  const slice    = rows.slice(startIdx, endIdx);

  body.innerHTML = slice.length
    ? slice.map(rowHtml).join('')
    : `<tr><td colspan="7" class="table__empty">No transactions match "${tableState.query}"</td></tr>`;

  if (status) {
    status.textContent = total === 0
      ? 'Showing 0 of 0'
      : `Showing ${startIdx + 1}–${endIdx} of ${total}`;
  }

  if (prev) prev.disabled = tableState.page <= 1;
  if (next) next.disabled = tableState.page >= pages;

  // Update sort indicators
  document.querySelectorAll('.table__th--sortable').forEach((th) => {
    th.classList.remove('table__th--sort-asc', 'table__th--sort-desc');
    if (th.dataset.sort === tableState.sortBy) {
      th.classList.add(tableState.sortDir === 'asc' ? 'table__th--sort-asc' : 'table__th--sort-desc');
    }
  });
}

export function initTableEvents() {
  const search = document.querySelector('[data-search]');
  if (search) {
    search.addEventListener('input', (e) => {
      tableState.query = e.target.value;
      tableState.page  = 1;
      renderTable();
    });
  }

  document.querySelectorAll('.table__th--sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (tableState.sortBy === key) {
        tableState.sortDir = tableState.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        tableState.sortBy  = key;
        tableState.sortDir = 'desc';
      }
      renderTable();
    });
  });

  const prev = document.querySelector('[data-page-prev]');
  const next = document.querySelector('[data-page-next]');

  if (prev) prev.addEventListener('click', () => { tableState.page--; renderTable(); });
  if (next) next.addEventListener('click', () => { tableState.page++; renderTable(); });
}
