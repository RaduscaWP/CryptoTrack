document.addEventListener('DOMContentLoaded', () => {
  CT.renderMarket();
  CT.renderStats();
  CT.renderPerformance();
  CT.initPerfControls();
  CT.renderAllocation();
  CT.renderWatchlist();
  CT.renderMovers();
  CT.initMovers();
  CT.renderNews();
  CT.renderTx();
  CT.initTxFilters();
  CT.renderInsights();

  CT.initSidebar();
  CT.initHero();
  CT.initActions();
  CT.initBell();
  CT.initSearch();
  CT.initDate();
});
