import { coinChartData, coins, fmtCurrency, fmtDate } from './data.js';

let chartInstance = null;
let activeCoinId  = 'btc';
let activeRange   = '30';

// Chart LINE color per coin. For SOL we intentionally skip purple for the
// fill gradient below — purple gradients are banned by design.
const LINE_COLOR = {
  btc: '#f7931a',
  eth: '#627eea',
  sol: '#9945ff',
  bnb: '#f3ba2f'
};

// Fill gradient base per coin. SOL uses cyan to avoid purple gradients.
const FILL_RGB = {
  btc: '247, 147, 26',
  eth: '98, 126, 234',
  sol: '0, 212, 255',
  bnb: '243, 186, 47'
};

const CYAN       = '#00d4ff';
const TEXT_MUTED = 'rgba(107, 114, 128, 0.8)';
const GRID       = 'rgba(255, 255, 255, 0.04)';

function buildGradient(ctx, area, rgb) {
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0,   `rgba(${rgb}, 0.28)`);
  g.addColorStop(0.6, `rgba(${rgb}, 0.05)`);
  g.addColorStop(1,   `rgba(${rgb}, 0)`);
  return g;
}

function externalTooltip(context) {
  const { chart, tooltip } = context;
  let el = chart.canvas.parentNode.querySelector('.chart-tooltip');

  if (!el) {
    el = document.createElement('div');
    el.className = 'chart-tooltip';
    chart.canvas.parentNode.appendChild(el);
  }

  if (tooltip.opacity === 0) {
    el.classList.remove('chart-tooltip--visible');
    return;
  }

  const point = tooltip.dataPoints?.[0];
  if (!point) return;

  el.innerHTML = `
    <div class="chart-tooltip__date">${fmtDate(point.label)}</div>
    <div class="chart-tooltip__price">${fmtCurrency(point.parsed.y)}</div>
  `;

  const { offsetLeft: px, offsetTop: py } = chart.canvas;
  el.style.left = px + tooltip.caretX + 'px';
  el.style.top  = py + tooltip.caretY + 'px';
  el.classList.add('chart-tooltip--visible');
}

function buildConfig(coinId, range) {
  const { labels, prices } = coinChartData[coinId][range];
  const line = LINE_COLOR[coinId];
  const rgb  = FILL_RGB[coinId];

  return {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: coinId.toUpperCase(),
        data: prices,
        borderColor: line,
        borderWidth: 1.75,
        tension: 0.4,
        fill: true,
        backgroundColor: (context) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return `rgba(${rgb}, 0.12)`;
          return buildGradient(ctx, chartArea, rgb);
        },
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: CYAN,
        pointHoverBorderColor: '#0a0b0f',
        pointHoverBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 650, easing: 'easeOutCubic' },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false, external: externalTooltip }
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: {
            color: TEXT_MUTED,
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: range === '90' ? 6 : range === '30' ? 6 : 7,
            callback(value) {
              const iso = this.getLabelForValue(value);
              const d = new Date(iso + 'T00:00:00Z');
              return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
            }
          }
        },
        y: {
          position: 'right',
          grid: { color: GRID, drawBorder: false, tickLength: 0 },
          ticks: {
            color: TEXT_MUTED,
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            padding: 8,
            maxTicksLimit: 6,
            callback: (v) => '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: v < 10 ? 2 : 0 })
          }
        }
      }
    }
  };
}

function updateHeader() {
  const coin   = coins.find((c) => c.id === activeCoinId);
  const series = coinChartData[activeCoinId][activeRange];
  const prices = series.prices;
  const last   = prices[prices.length - 1];
  const min    = Math.min(...prices);
  const max    = Math.max(...prices);

  const titleEl   = document.querySelector('[data-chart-title]');
  const rangeLbl  = document.querySelector('[data-chart-range-label]');
  const closeEl   = document.querySelector('[data-chart-close]');
  const rangeEl   = document.querySelector('[data-chart-range]');

  if (titleEl)   titleEl.textContent  = coin?.symbol ?? activeCoinId.toUpperCase();
  if (rangeLbl)  rangeLbl.textContent = `— ${activeRange} Day Price`;
  if (closeEl)   closeEl.textContent  = fmtCurrency(last);
  if (rangeEl)   rangeEl.textContent  = `${fmtCurrency(min)} – ${fmtCurrency(max)}`;
}

function applyRangeTabsHighlight() {
  document.querySelectorAll('.chart__tab').forEach((t) => {
    const isActive = t.dataset.range === activeRange;
    t.classList.toggle('chart__tab--active', isActive);
    if (isActive) t.setAttribute('aria-selected', 'true');
    else          t.removeAttribute('aria-selected');
  });
}

export function setActiveCoin(coinId) {
  if (!coinChartData[coinId] || !chartInstance) return;
  activeCoinId = coinId;

  const { labels, prices } = coinChartData[coinId][activeRange];
  const ds = chartInstance.data.datasets[0];

  ds.label       = coinId.toUpperCase();
  ds.borderColor = LINE_COLOR[coinId];
  ds.backgroundColor = (context) => {
    const { ctx, chartArea } = context.chart;
    const rgb = FILL_RGB[coinId];
    if (!chartArea) return `rgba(${rgb}, 0.12)`;
    return buildGradient(ctx, chartArea, rgb);
  };

  chartInstance.data.labels        = labels;
  chartInstance.data.datasets[0]   = ds;
  chartInstance.data.datasets[0].data = prices;
  chartInstance.update();

  updateHeader();
}

export function initChart() {
  const canvas = document.querySelector('[data-chart]');
  if (!canvas || typeof Chart === 'undefined') return;

  chartInstance = new Chart(canvas, buildConfig(activeCoinId, activeRange));
  updateHeader();
  applyRangeTabsHighlight();

  document.querySelectorAll('.chart__tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const range = tab.dataset.range;
      if (!coinChartData[activeCoinId][range]) return;

      activeRange = range;
      applyRangeTabsHighlight();

      const { labels, prices } = coinChartData[activeCoinId][activeRange];
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = prices;
      chartInstance.update();
      updateHeader();
    });
  });
}
