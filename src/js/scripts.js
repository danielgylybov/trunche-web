document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-menu-year]').forEach(el => el.textContent = new Date().getFullYear());
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav .nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
  });
  const toggler = document.getElementById('navbar-toggler');
  const collapse = document.getElementById('navbarSupportedContent');
  if (!toggler || !collapse) return;
  const mobile = matchMedia('(max-width: 991px)');
  function syncInert() { collapse.inert = mobile.matches && !collapse.classList.contains('show'); }
  mobile.addEventListener('change', syncInert);
  syncInert();
  function closeNav() {
    collapse.classList.remove('show');
    toggler.setAttribute('aria-expanded', 'false');
    toggler.setAttribute('aria-label', 'Отвори навигацията');
    syncInert();
  }
  toggler.addEventListener('click', () => {
    const open = collapse.classList.toggle('show');
    toggler.setAttribute('aria-expanded', String(open));
    toggler.setAttribute('aria-label', open ? 'Затвори навигацията' : 'Отвори навигацията');
    syncInert();
  });
  collapse.addEventListener('click', event => { if (event.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && collapse.classList.contains('show')) { closeNav(); toggler.focus(); }
  });
});
