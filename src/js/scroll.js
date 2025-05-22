window.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash) {
    const hash = window.location.hash;

    history.replaceState(null, '', window.location.pathname + window.location.search);

    setTimeout(() => {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
      history.replaceState(null, '', hash);
    }, 100);
  }
});

document.querySelectorAll('a[href*="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    const url = new URL(href, window.location.href);

    if (url.pathname === window.location.pathname && url.hash) {
      e.preventDefault();
      const target = document.querySelector(url.hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        history.pushState(null, '', url.hash);
      }
    }
  });
});