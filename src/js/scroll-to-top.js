  const scrollTopButton = document.getElementById('scrollTopButton');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollTopButton.classList.add('visible');
    } else {
      scrollTopButton.classList.remove('visible');
    }
  });

  scrollTopButton.addEventListener('click', (e) => {
    e.preventDefault();
    scrollTopButton.classList.add('fly-away');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      scrollTopButton.classList.remove('visible', 'fly-away');
    }, 600);
  });