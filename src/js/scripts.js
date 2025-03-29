document.addEventListener('scroll', function() {
    const background = document.querySelector('.background');
    const content = document.querySelector('.content');
    const scrollPosition = window.scrollY;
    const contentTop = content.offsetTop;

    if (scrollPosition >= contentTop) {
        background.style.position = 'fixed';
        background.style.top = '0';
    } else {
        background.style.position = 'absolute';
        background.style.top = '0';
    }
});