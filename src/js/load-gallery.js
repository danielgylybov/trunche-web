async function loadDriveImages() {
    const folderId = "1WRLsMVOc23EF397B2CI5CEoVG9eNbiWg";
    const apiKey = "AIzaSyCsRaSAqTpHtz-KZf35qDpBro9jn-VQ5zM";
    const viewer = document.querySelector("#section-viewer");
    const buttonContainer = document.querySelector("#section-buttons");

    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name)`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.files || data.files.length === 0) {
            viewer.innerHTML = "<p>Няма налични снимки.</p>";
            return;
        }

        const sections = {};

        data.files.forEach(file => {
            const match = file.name.match(/^(\d+)?_?([^_]+)_/); // [номер]_име_
            if (!match) return;

            const order = match[1] ? parseInt(match[1], 10) : null;
            const rawTitle = match[2].toLowerCase();

            if (!sections[rawTitle]) {
                sections[rawTitle] = {
                    title: rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1),
                    order: order !== null ? order : 9999,
                    files: []
                };
            }

            sections[rawTitle].files.push(file);
            if (order !== null && order < sections[rawTitle].order) {
                sections[rawTitle].order = order;
            }
        });

        const sortedSections = Object.values(sections).sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.title.localeCompare(b.title, 'bg');
        });

        const sectionHTML = {};
        const buttons = {};
        let firstTitle = null;

        sortedSections.forEach(sectionData => {
            const { title, files } = sectionData;

            let html = `<h2 class="display-10 fw-bolder mb-3 mt-5 mx-auto text-center">
                            <span class="text-gradient d-inline">${title}</span>
                        </h2>
                        <section class="row g-4 align-items-center justify-content-center mb-4">`;

            files.forEach((file, index) => {
                html += `
                    <div class="col-12 col-sm-6 col-md-4 col-lg-3 justify-content-center">
                        <div class="card shadow border-0 rounded-4">
                            <div class="card-body">
                                <div class="text-center">
                                    <div class="bg-light rounded-4">
                                        <img loading="lazy" src="https://drive.google.com/thumbnail?id=${file.id}&sz=w1400"
                                            alt="Изображение ${index + 1}" class="img-fluid menu-item" style="cursor:pointer;"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
            });

            html += "</section>";
            sectionHTML[title] = html;
            if (!firstTitle) firstTitle = title;

            const button = document.createElement("button");
            button.className = "btn btn-outline-primary m-1";
            button.innerText = title;
            button.onclick = () => {
                viewer.innerHTML = sectionHTML[title];
                updateActiveButton(title);
                viewer.scrollIntoView({ behavior: "smooth", block: "start" });
            };

            buttonContainer.appendChild(button);
            buttons[title] = button;
        });

        function updateActiveButton(activeTitle) {
            for (const [title, btn] of Object.entries(buttons)) {
                btn.classList.toggle("active", title === activeTitle);
            }
        }

        if (firstTitle) {
            viewer.innerHTML = sectionHTML[firstTitle];
            updateActiveButton(firstTitle);
        }

    } catch (error) {
        console.error("Error loading images:", error);
    }
}

window.onload = loadDriveImages;
