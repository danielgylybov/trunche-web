async function loadDriveImages() {
    const folderId = "1d0EOV6f4Lmnn0ni0RPEUAW9jpFgT0P3U";
    const apiKey = "AIzaSyD_PBO70tO0uA2HFo0wHGS-IWyHwFfVZxA";
    const viewer = document.querySelector("#section-viewer");
    const buttonContainer = document.querySelector("#section-buttons");

    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name)`;

    let currentSectionImages = [];
    let currentImageIndex = 0;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.files || data.files.length === 0) {
            viewer.innerHTML = "<p>Няма налични снимки.</p>";
            return;
        }

        const sections = {};

        data.files.forEach(file => {
            const match = file.name.match(/^(\d+)?_?(.+?)_/);
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

            files
                .sort((a, b) => a.name.localeCompare(b.name, 'bg', { numeric: true }))
                .forEach((file, index) => {
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
                currentSectionImages = sections[title.toLowerCase()].files;
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
            currentSectionImages = sections[firstTitle.toLowerCase()].files;
        }

        // Overlay
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

const prevBtn = document.createElement("div");
prevBtn.innerHTML = "&lt;";
prevBtn.style.cssText = `
    position: absolute;
    left: 0px;
    top: 50%;
    transform: translateY(-50%) scaleY(1.5);
    height: 200px;
    width: 60px;
    font-size: 48px;
    color: white;
    background: rgba(0, 0, 0, 0.3);  /* slightly dark translucent bg */
    cursor: pointer;
    z-index: 100001;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;   /* optional, soften edges */
    box-shadow: 0 0 15px 16px rgba(0, 0, 0, 0.3); /* soft blurry shadow */
`;

const nextBtn = document.createElement("div");
nextBtn.innerHTML = "&gt;";
nextBtn.style.cssText = `
    position: absolute;
    right: 0px;
    top: 50%;
    transform: translateY(-50%) scaleY(1.5);
    height: 200px;
    width: 60px;
    font-size: 48px;
    color: white;
    background: rgba(0, 0, 0, 0.3);
    cursor: pointer;
    z-index: 100001;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    box-shadow: 0 0 15px 16px rgba(0, 0, 0, 0.3);
`;


        overlay.appendChild(overlayImg);
        overlay.appendChild(closeButton);
        overlay.appendChild(prevBtn);
        overlay.appendChild(nextBtn);
        document.body.appendChild(overlay);

        function showImageAt(index) {
            if (index < 0 || index >= currentSectionImages.length) return;
            const fileId = currentSectionImages[index].id;
            overlayImg.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
            currentImageIndex = index;
        }

        document.addEventListener("click", function (event) {
            if (event.target.classList.contains("menu-item")) {
                const src = event.target.src;
                const fullImgUrl = src.replace("w500", "w2000");
                const match = src.match(/id=([^&]+)/);
                if (match) {
                    const id = match[1];
                    currentImageIndex = currentSectionImages.findIndex(img => img.id === id);
                }
                overlayImg.src = fullImgUrl;
                overlay.style.display = "flex";
            }
        });



        closeButton.addEventListener("click", () => {
            overlay.style.display = "none";
        });

        prevBtn.onclick = () => showImageAt(currentImageIndex - 1);
        nextBtn.onclick = () => showImageAt(currentImageIndex + 1);

        document.addEventListener("keydown", function (event) {
            if (overlay.style.display !== "flex") return;
            if (event.key === "ArrowLeft") {
                showImageAt(currentImageIndex - 1);
            } else if (event.key === "ArrowRight") {
                showImageAt(currentImageIndex + 1);
            } else if (event.key === "Escape") {
                overlay.style.display = "none";
            }
        });

    } catch (error) {
        console.error("Error loading images:", error);
    }
}

window.onload = loadDriveImages;
