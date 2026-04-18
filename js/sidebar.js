// Sidebar tab switching + empty state for non-dashboard tabs
(function(){
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  const mobileMq = window.matchMedia('(max-width: 860px)');
  const sidebar = () => $('[data-sidebar]');
  const toggle = () => $('[data-sidebar-toggle]');
  const closeBtn = () => $('[data-sidebar-close]');
  const backdrop = () => $('[data-sidebar-backdrop]');

  function setTab(tab){
    $$('.navitem').forEach(b => b.classList.toggle('is-active', b.dataset.tab === tab));
    const content = $('[data-content]');
    const empty = $('[data-empty]');
    if (tab === 'dashboard'){
      content.hidden = false;
      empty.hidden = true;
    } else {
      content.hidden = true;
      empty.hidden = false;
      $('[data-empty-title]').textContent = cap(tab);
    }
  }

  function syncDrawer(open){
    const side = sidebar();
    const btn = toggle();
    const shade = backdrop();
    if (!side || !btn || !shade) return;
    side.classList.toggle('is-open', open);
    shade.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('has-drawer', open);
  }

  function closeDrawer(){
    syncDrawer(false);
  }

  function toggleDrawer(){
    if (!mobileMq.matches) return;
    syncDrawer(!sidebar().classList.contains('is-open'));
  }

  function initSidebar(){
    $$('.navitem').forEach(btn => {
      btn.addEventListener('click', () => {
        setTab(btn.dataset.tab);
        if (mobileMq.matches) closeDrawer();
      });
    });
    $('[data-empty-back]').addEventListener('click', () => setTab('dashboard'));

    const btn = toggle();
    const dismiss = closeBtn();
    const shade = backdrop();

    if (btn) btn.addEventListener('click', toggleDrawer);
    if (dismiss) dismiss.addEventListener('click', closeDrawer);
    if (shade) shade.addEventListener('click', closeDrawer);

    window.addEventListener('resize', () => {
      if (!mobileMq.matches) closeDrawer();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  window.CT = Object.assign(window.CT || {}, { initSidebar });
})();
