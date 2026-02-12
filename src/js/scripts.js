document.addEventListener('DOMContentLoaded', function () {
  const menuYear = String(new Date().getFullYear());
  document.querySelectorAll('[data-menu-year]').forEach(function (el) {
    el.textContent = menuYear;
  });

  const toggler = document.getElementById('navbar-toggler');
  const collapse = document.getElementById('navbarSupportedContent');
  if (!toggler || !collapse) return;

  const navItems = collapse.querySelectorAll('.nav-item');

  toggler.addEventListener('click', function () {
    const isShown = collapse.classList.contains('show');

    if (isShown) {
      // Hide menu: remove show class and clear delays
      collapse.classList.remove('show');
      toggler.setAttribute('aria-expanded', 'false');
      navItems.forEach(item => {
        item.style.transitionDelay = '';
      });
    } else {
      // Show menu: add show class + set stagger delays
      collapse.classList.add('show');
      toggler.setAttribute('aria-expanded', 'true');
      navItems.forEach((item, index) => {
        item.style.transitionDelay = `${index * 0.1}s`;
      });
    }
  });
});
