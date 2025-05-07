async function loadDriveImages() {
    const folderId = "1WRLsMVOc23EF397B2CI5CEoVG9eNbiWg";
    const apiKey = "AIzaSyCsRaSAqTpHtz-KZf35qDpBro9jn-VQ5zM";
    const container = document.querySelector("#dynamic-sections-container");

    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name)`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.files || data.files.length === 0) {
            container.innerHTML = "<p>Няма налични снимки.</p>";
            return;
        }

        const sections = {};

        // Групиране на изображения по "чисто" име (без номер)
        data.files.forEach(file => {
            const match = file.name.match(/^(\d+)?_?([^_]+)_/); // хваща [номер]_заглавие_
            if (!match) return;

            const order = match[1] ? parseInt(match[1], 10) : null;
            const rawTitle = match[2].toLowerCase(); // напр. декорация

            if (!sections[rawTitle]) {
                sections[rawTitle] = {
                    title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
                    order: order !== null ? order : 9999, // висока стойност ако няма номер
                    files: []
                };
            }

            sections[rawTitle].files.push(file);

            // Ако съществува по-малък номер, го взимаме за сортиране
            if (order !== null && order < sections[rawTitle].order) {
                sections[rawTitle].order = order;
            }
        });

        // Сортиране по order или азбучно ако няма номер
        const sortedSections = Object.values(sections).sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.title.localeCompare(b.title, 'bg'); // сортиране по български
        });

        // Рендиране на секциите
        sortedSections.forEach(sectionData => {
            const { title, files } = sectionData;

            const h2 = document.createElement("h2");
            h2.className = "display-10 fw-bolder mb-3 mt-5 mx-auto text-center";
            h2.innerHTML = `<span class="text-gradient d-inline">${title}</span>`;
            container.appendChild(h2);

            const section = document.createElement("section");
            section.className = "row g-4 align-items-center justify-content-center mb-4";

            files.forEach((file, index) => {
                const col = document.createElement("div");
                col.className = "col-12 col-sm-6 col-md-4 col-lg-3 justify-content-center";

                const card = document.createElement("div");
                card.className = "card shadow border-0 rounded-4";
                card.innerHTML = `
                    <div class="card-body">
                        <div class="text-center">
                            <div class="bg-light rounded-4">
                                <img loading="lazy" src="https://drive.google.com/thumbnail?id=${file.id}&sz=w1400"
                                     alt="Изображение ${index + 1}" class="img-fluid menu-item" style="cursor:pointer;"/>
                            </div>
                        </div>
                    </div>
                `;

                const img = card.querySelector("img");
                img.addEventListener("click", () => {
                    const overlay = document.createElement("div");
                    overlay.style.cssText = `
                        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                        background-color: rgba(0,0,0,0.8); display: flex;
                        align-items: center; justify-content: center; z-index: 1000;
                    `;
                    const fullImg = document.createElement("img");
                    fullImg.src = `https://drive.google.com/thumbnail?id=${file.id}&sz=w1400`;
                    fullImg.style.maxWidth = "90%";
                    fullImg.style.maxHeight = "90%";
                    fullImg.style.borderRadius = "12px";
                    fullImg.alt = img.alt;

                    overlay.appendChild(fullImg);
                    document.body.appendChild(overlay);
                    overlay.addEventListener("click", () => overlay.remove());
                });

                col.appendChild(card);
                section.appendChild(col);
            });

            container.appendChild(section);
        });

    } catch (error) {
        console.error("Error loading images:", error);
    }
}

window.onload = loadDriveImages;
