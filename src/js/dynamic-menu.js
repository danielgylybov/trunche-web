document.querySelectorAll(".menu-buttons button").forEach(btn => {
  btn.addEventListener("click", () => {
    const category = btn.getAttribute("data-category");

    document.querySelectorAll(".menu-category").forEach(cat => {
      cat.classList.add("d-none");
    });

    document.getElementById(category).classList.remove("d-none");
  });
});

document.addEventListener("DOMContentLoaded", function () {
    const buttons = document.querySelectorAll(".menu-buttons button");
    const sections = document.querySelectorAll(".menu-category");

    function showSection(category) {
        // Скриваме всички секции
        sections.forEach(section => {
            section.classList.add("d-none");
        });

        // Показваме избраната
        const activeSection = document.getElementById(category);
        if (activeSection) {
            activeSection.classList.remove("d-none");
        }

        // Маркираме активния бутон
        buttons.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.category === category);
        });

        document.querySelector('.menu-section').scrollIntoView({
            behavior: 'smooth'
        });
    }

    // Слушаме за кликове по бутоните
    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const category = button.dataset.category;
            showSection(category);
        });
    });

    // При зареждане по подразбиране
    showSection("kuverti");
});