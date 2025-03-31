async function loadDriveImages() {
    const folderId = "1MBmXh2hcp-VdEXaT2E4PBypS1bs_YuG_"; // Your Google Drive folder ID
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

        const section = document.querySelector("section"); // Select existing section
        section.innerHTML = ""; // Clear existing content

        // Loop through images and create elements dynamically
        data.files.forEach((file, index) => {
            const card = document.createElement("div");
            card.className = "card shadow border-0 rounded-4 mb-5";
            card.innerHTML = `
                <div class="card-body">
                    <div class="row align-items-center gx-5">
                        <div class="col text-center text-lg-start mb-lg-0">
                            <div class="bg-light rounded-4">
                                <img src="https://drive.google.com/thumbnail?id=${file.id}&sz=w1400"
                                     alt="Страница ${index + 1}" class="img-fluid menu-item"/>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            section.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching Google Drive images:", error);
    }
}

window.onload = loadDriveImages;