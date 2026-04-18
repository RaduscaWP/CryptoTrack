import { renderCards, renderHeader, renderTable, initTableEvents } from './ui.js';
import { initChart } from './chart.js';
import { initAnimations, initClock } from './animations.js';
import { initSidebar } from './sidebar.js';

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderCards();
  renderTable();
  initTableEvents();
  initChart();
  initSidebar();
  initClock();
  initAnimations();
});
