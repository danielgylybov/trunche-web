async function loadDriveImages() {
    const folderId = "1WRLsMVOc23EF397B2CI5CEoVG9eNbiWg"; // Your Google Drive folder ID
    const apiKey = "AIzaSyCsRaSAqTpHtz-KZf35qDpBro9jn-VQ5zM"; // Your Google API key

    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name)`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.files || data.files.length === 0) {
            console.error("No images found in the Google Drive folder.");
            return;
        }

        // Sort files by name to ensure order
        data.files.sort((a, b) => a.name.localeCompare(b.name));

        const section = document.querySelector("#first-section"); // Select existing sections
        const section2 = document.querySelector("#second-section");

        section.innerHTML = ""; // Clear existing content

        // Loop through images and create elements dynamically
        data.files.forEach((file, index) => {
            const col = document.createElement("div");
            col.className = "col-12 col-sm-6 col-md-4 col-lg-3 justify-content-center"; // Adjust columns per screen size

            const card = document.createElement("div");
            card.className = "card shadow border-0 rounded-4";
            card.innerHTML = `
                <div class="card-body">
                    <div class="text-center">
                        <div class="bg-light rounded-4">
                            <img src="https://drive.google.com/thumbnail?id=${file.id}&sz=w1400"
                                 alt="Страница ${index + 1}" class="img-fluid menu-item"/>
                        </div>
                    </div>
                </div>
            `;

            // Add image click-to-expand behavior
            const img = card.querySelector("img");
            img.style.cursor = "pointer";
            img.addEventListener("click", () => {
                const overlay = document.createElement("div");
                overlay.style.position = "fixed";
                overlay.style.top = 0;
                overlay.style.left = 0;
                overlay.style.width = "100vw";
                overlay.style.height = "100vh";
                overlay.style.backgroundColor = "rgba(0,0,0,0.8)";
                overlay.style.display = "flex";
                overlay.style.alignItems = "center";
                overlay.style.justifyContent = "center";
                overlay.style.zIndex = 1000;

                const fullImg = document.createElement("img");
                fullImg.src = `https://drive.google.com/thumbnail?id=${file.id}&sz=w1400`;
                fullImg.style.maxWidth = "90%";
                fullImg.style.maxHeight = "90%";
                fullImg.style.borderRadius = "12px";
                fullImg.alt = img.alt;

                overlay.appendChild(fullImg);
                document.body.appendChild(overlay);

                overlay.addEventListener("click", () => {
                    document.body.removeChild(overlay);
                });
            });

            if (file.name[0] === '1') {
               col.appendChild(card);
               section.appendChild(col);
            }
            if (file.name[0] === '2') {
               col.appendChild(card);
               section2.appendChild(col);
            }


        });

    } catch (error) {
        console.error("Error fetching Google Drive images:", error);
    }
}

window.onload = loadDriveImages;
