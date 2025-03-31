    async function loadDriveImages() {
        const folderId = "1MBmXh2hcp-VdEXaT2E4PBypS1bs_YuG_"; // Your Google Drive folder ID
        const apiKey = "AIzaSyCsRaSAqTpHtz-KZf35qDpBro9jn-VQ5zM"; // Replace with your Google API key

        const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name)`;
        try {
            const response = await fetch(url);
            const data = await response.json();

            if (!data.files) {
                console.error("No images found in the Google Drive folder.");
                return;
            }

            const images = document.querySelectorAll('section img'); // Selects existing images

            // Sort files by name to ensure order
            data.files.sort((a, b) => a.name.localeCompare(b.name));

            images.forEach((img, index) => {
                if (index < data.files.length) {
                    img.src = `https://drive.google.com/uc?id=${data.files[index].id}`;
                    img.alt = data.files[index].name;
                }
            });

        } catch (error) {
            console.error("Error fetching Google Drive images:", error);
        }
    }

    window.onload = loadDriveImages;