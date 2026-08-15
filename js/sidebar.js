// Sidebar drawer + client-side routing between the dashboard and account views.
(function(){
  const { $, $$ } = CT;

  // `repaint` is the cheaper variant used on a 60s price tick: it must not
  // rebuild anything the user is interacting with (charts, focused inputs).
  const VIEWS = {
    dashboard: { crumb:'Overview', title:null,            render:() => CT.renderDashboard(),
                 repaint:() => CT.renderDashboard({ chart:false }) },
    portfolio: { crumb:'Account',  title:'Portfolio',     render:() => CT.renderPortfolio() },
    markets:   { crumb:'Overview', title:'Markets',       render:() => CT.renderMarkets() },
    trade:     { crumb:'Account',  title:'Trade desk',    render:() => CT.renderTrade(),
                 repaint:() => CT.tradeOnLive() },
    history:   { crumb:'Account',  title:'Order history', render:() => CT.renderHistory() },
    watchlist: { crumb:'Overview', title:'Watchlist',     render:() => CT.renderWatchlistView() },
    settings:  { crumb:'Account',  title:'Settings',      render:() => CT.renderSettings() }
  };

  const mobileMq = window.matchMedia('(max-width: 860px)');
  let current = 'dashboard';

  function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  function greeting(){
    const h = new Date().getHours();
    const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
    const acc = CT.account.get();
    return `Good ${part}, ${acc ? acc.name.split(' ')[0] : 'trader'}`;
  }

  function setChrome(view){
    const cfg = VIEWS[view];
    const crumb = $('[data-crumb]');
    const crumbCur = $('[data-crumb-current]');
    const title = $('.header__title');
    if (crumb) crumb.textContent = cfg ? cfg.crumb : 'Account';
    if (crumbCur) crumbCur.textContent = cap(view);
    if (title) title.textContent = cfg && cfg.title ? cfg.title : greeting();
  }

  // `animate:false` is used for background refreshes so cards don't re-play
  // their entrance animation every time prices tick.
  function show(view, animate){
    const known = !!VIEWS[view];
    current = view;

    $$('.navitem').forEach(b => b.classList.toggle('is-active', b.dataset.tab === view));
    $$('[data-view]').forEach(el => {
      const on = el.dataset.view === view;
      el.hidden = !on;
      el.classList.toggle('no-anim', on && animate === false);
    });

    const empty = $('[data-empty]');
    if (empty){
      empty.hidden = known;
      if (!known) $('[data-empty-title]').textContent = cap(view);
    }

    setChrome(view);
    if (known && VIEWS[view].render) VIEWS[view].render();
  }

  function go(view){
    if (!VIEWS[view] && !$(`.navitem[data-tab="${view}"]`)) return;
    show(view, true);
    if (VIEWS[view]) {
      try { history.replaceState(null, '', '#' + view); } catch (e){}
    }
    const content = $('.main');
    if (content) content.scrollTop = 0;
    window.scrollTo({ top:0, behavior:'smooth' });
    if (mobileMq.matches) closeDrawer();
  }

  // Re-render the active view in place, without the entrance animation.
  function repaint(){
    const cfg = VIEWS[current];
    if (!cfg) return;
    const el = $(`[data-view="${current}"]`);
    if (el) el.classList.add('no-anim');
    (cfg.repaint || cfg.render)();
  }

  /* ---------------- mobile drawer ---------------- */

  function syncDrawer(open){
    const side = $('[data-sidebar]');
    const btn = $('[data-sidebar-toggle]');
    const shade = $('[data-sidebar-backdrop]');
    if (!side || !btn || !shade) return;
    side.classList.toggle('is-open', open);
    shade.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('has-drawer', open);
  }
  function closeDrawer(){ syncDrawer(false); }
  function toggleDrawer(){
    if (!mobileMq.matches) return;
    syncDrawer(!$('[data-sidebar]').classList.contains('is-open'));
  }

  function initSidebar(){
    $$('.navitem').forEach(btn => btn.addEventListener('click', () => go(btn.dataset.tab)));
    const back = $('[data-empty-back]');
    if (back) back.addEventListener('click', () => go('dashboard'));

    const btn = $('[data-sidebar-toggle]');
    const dismiss = $('[data-sidebar-close]');
    const shade = $('[data-sidebar-backdrop]');
    if (btn) btn.addEventListener('click', toggleDrawer);
    if (dismiss) dismiss.addEventListener('click', closeDrawer);
    if (shade) shade.addEventListener('click', closeDrawer);

    window.addEventListener('resize', () => { if (!mobileMq.matches) closeDrawer(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

    const logout = $('[data-logout]');
    if (logout) logout.addEventListener('click', () => go('settings'));

    const start = (location.hash || '').replace('#','');
    show(VIEWS[start] ? start : 'dashboard', true);
  }

  window.CT = Object.assign(window.CT || {}, {
    initSidebar,
    router: { go, repaint, current: () => current, setChrome }
  });
})();
