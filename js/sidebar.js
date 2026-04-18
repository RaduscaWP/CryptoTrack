export function initSidebar() {
  const sidebar    = document.querySelector('[data-sidebar]');
  const shell      = document.querySelector('.app__shell');
  const toggle     = document.querySelector('[data-sidebar-toggle]');
  const menuBtn    = document.querySelector('[data-menu-toggle]');
  const backdrop   = document.querySelector('[data-sidebar-backdrop]');

  if (!sidebar || !shell) return;

  const STORAGE_KEY = 'cryptotrack:sidebar-collapsed';
  const stored = localStorage.getItem(STORAGE_KEY);
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  // Desktop collapse state
  const setCollapsed = (collapsed) => {
    sidebar.classList.toggle('sidebar--collapsed', collapsed);
    shell.classList.toggle('app__shell--collapsed', collapsed);
    if (toggle) toggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  };

  setCollapsed(stored === '1');

  if (toggle) {
    toggle.addEventListener('click', () => {
      if (isMobile()) {
        closeDrawer();
        return;
      }
      setCollapsed(!sidebar.classList.contains('sidebar--collapsed'));
    });
  }

  // Mobile drawer state
  const openDrawer = () => {
    sidebar.classList.add('sidebar--open');
    backdrop?.classList.add('sidebar-backdrop--visible');
    document.body.style.overflow = 'hidden';
    menuBtn?.setAttribute('aria-expanded', 'true');
  };

  const closeDrawer = () => {
    sidebar.classList.remove('sidebar--open');
    backdrop?.classList.remove('sidebar-backdrop--visible');
    document.body.style.overflow = '';
    menuBtn?.setAttribute('aria-expanded', 'false');
  };

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      if (sidebar.classList.contains('sidebar--open')) closeDrawer();
      else openDrawer();
    });
  }

  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // Close the drawer if the viewport grows past mobile
  window.addEventListener('resize', () => {
    if (!isMobile() && sidebar.classList.contains('sidebar--open')) closeDrawer();
  });

  // Let nav items act like a router without breaking the page
  const items = document.querySelectorAll('.sidebar__item');
  items.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      items.forEach((i) => i.classList.remove('sidebar__item--active'));
      item.classList.add('sidebar__item--active');
      if (isMobile()) closeDrawer();
    });
  });
}
