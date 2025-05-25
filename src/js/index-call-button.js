const callButton = document.getElementById("callButton");
const triggerElement = document.querySelector("#about"); // смени с твоя елемент

window.addEventListener("scroll", function () {
    const triggerPosition = triggerElement.getBoundingClientRect().top + window.scrollY + 450;
    const scrollPosition = window.scrollY + window.innerHeight;

    if (scrollPosition > triggerPosition) {
        callButton.style.visibility = 'visible';
        callButton.classList.add('visible');
    } else {
        callButton.classList.remove('visible');
        setTimeout(() => {
            if (!callButton.classList.contains('visible')) {
                callButton.style.visibility = 'hidden';
            }
        }, 400);
    }
});
