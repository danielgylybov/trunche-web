async function loadDriveImages() {
    const folderId = "1d0EOV6f4Lmnn0ni0RPEUAW9jpFgT0P3U";
    const apiKey = "AIzaSyD_PBO70tO0uA2HFo0wHGS-IWyHwFfVZxA";
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

            let html = `<h2 class="display-10 fw-bolder mb-3 mt-1 mx-auto text-center">
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
                                        <img loading="lazy" src="https://drive.google.com/thumbnail?id=${file.id}&sz=w500"
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
            button.className = "btn btn-outline-primary btn-lg px-5 py-3 me-sm-3 fs-6 mb-3 fw-bolder";
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

        // Overlay feature
        const overlay = document.createElement("div");
        overlay.id = "image-overlay";
        overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85);
            justify-content: center;
            align-items: center;
            z-index: 100000;
        `;

        const overlayImg = document.createElement("img");
        overlayImg.id = "overlay-image";
        overlayImg.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            border-radius: 12px;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
            cursor: pointer;
        `;

        overlay.appendChild(overlayImg);
        document.body.appendChild(overlay);

        document.addEventListener("click", function (event) {
            if (event.target.classList.contains("menu-item")) {
                const fullImgUrl = event.target.src.replace("w500", "w2000");
                overlayImg.src = fullImgUrl;
                overlay.style.display = "flex";
            }
        });

        overlay.addEventListener("click", () => {
         const isDesktop = window.innerWidth >= 990;
         if (!isDesktop) return;
         overlay.style.display = "none";
        });

        const closeButton = document.createElement("div");
        closeButton.innerHTML = "×";
        closeButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 30px;
            font-size: 40px;
            color: white;
            cursor: pointer;
            z-index: 100001;
            user-select: none;
        `;
        overlay.appendChild(closeButton);

        closeButton.addEventListener("click", () => {
            overlay.style.display = "none";
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                overlay.style.display = "none";
            }
        });

    } catch (error) {
        console.error("Error loading images:", error);
    }
}

window.onload = loadDriveImages;
