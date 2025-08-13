document.addEventListener("DOMContentLoaded", () => {
    const rate = 1.95583;

    // Взимаме всички елементи, където има цени
    const priceElements = document.querySelectorAll(".price-tag, .price-tag-alt, .price");

    priceElements.forEach(el => {
        let text = el.textContent;

        // Търсим число (може да има запетая или точка) преди "лв"
        let match = text.match(/(\d+(?:[.,]\d+)?)(?=\s*лв)/);
        if (match) {
            let leva = parseFloat(match[1].replace(",", "."));
            let euro = leva / rate;

            // Закръгляме до 2 знака
            euro = euro.toFixed(2);

            // Добавяме евро в скоби
            el.textContent = `${text} (${euro}€)`;
        }
    });
});