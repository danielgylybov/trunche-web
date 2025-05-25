const callButton = document.getElementById("callButton");

window.addEventListener("scroll", function () {
    if (window.scrollY > 200) {
        callButton.style.visibility = 'visible';
        callButton.classList.add('visible');
    } else {
        callButton.classList.remove('visible');
        // Изчакваме прехода да приключи, преди да скрием напълно
        setTimeout(() => {
            if (!callButton.classList.contains('visible')) {
                callButton.style.visibility = 'hidden';
            }
        }, 400);
    }
});