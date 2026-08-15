// Boot sequence: seed a first paint, wire the chrome, then go live.
(function(){
  const { $, $$ } = CT;

  function initials(name){
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'DT';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Header + sidebar bits that show account identity or counts.
  function refreshChrome(){
    const acc = CT.account.get();
    if (acc){
      $$('[data-acc-name]').forEach(el => { el.textContent = acc.name; });
      $$('[data-acc-initials]').forEach(el => { el.textContent = initials(acc.name); });
      const badge = $('[data-wl-count]');
      if (badge) badge.textContent = String(CT.watch.get().length);
    }
    CT.router.setChrome(CT.router.current());
    CT.router.repaint();
  }

  function bootAccount(){
    refreshChrome();
    CT.router.go('dashboard');
  }

  function initTopActions(){
    // Deposit / top-up add demo cash; the rest are shortcuts into a view.
    const routes = { portfolio:'portfolio', trade:'trade', history:'history' };
    $$('[data-action]').forEach(btn => btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'deposit' || action === 'topup'){
        try {
          CT.account.deposit(10000);
          CT.toast('Added $10,000 of demo cash');
          refreshChrome();
        } catch (err){ CT.toast(err.message, 'error'); }
        return;
      }
      if (routes[action]) CT.router.go(routes[action]);
    }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    CT.live.seed();            // paint immediately from bundled prices
    CT.initDashboard();
    CT.initViewActions();
    initTopActions();
    CT.initSidebar();

    if (!CT.account.exists()){
      CT.onboardShow();
    } else {
      refreshChrome();
    }

    CT.api.onStatus(() => CT.renderFoot());

    CT.live.on(() => {
      CT.router.repaint();
      CT.renderFoot();
    });

    CT.live.refresh().then(() => CT.live.start());
  });

  window.CT = Object.assign(window.CT || {}, { refreshChrome, bootAccount });
})();
