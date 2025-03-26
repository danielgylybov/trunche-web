window.addEventListener('load', () => {
  // Set a timeout for 5 seconds after the page loads
  setTimeout(() => {
    // Switch to the static logo after 5 seconds
    document.querySelector('.header-logo').style.opacity = '1';
    document.querySelector('.header-logo-animated').style.opacity = '0';
  }, 4000); // 5000 milliseconds = 5 seconds
});