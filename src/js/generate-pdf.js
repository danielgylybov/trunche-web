(() => {
  'use strict';

  const form = document.getElementById('invitation-form');
  const dateInput = document.getElementById('date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    form.classList.add('was-validated');

    const age = parseInt(document.getElementById('occasion').value.trim(), 10);
    const occasion = formatAgeOccasion(age);
    const dateInputValue = document.getElementById('date').value;
    const date = new Date(dateInputValue);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const formattedDate = `${day}.${month}.${year}`;
    const time = document.getElementById('time').value;
    const from = document.getElementById('from').value.trim();
    const to = document.getElementById('to').value.trim();
    const imageUrl = 'https://i.imgur.com/Yh0ggNz.png';

    try {
      const fontResponse = await fetch('src/js/Adigiana2-Regular.ttf');
      const fontData = await fontResponse.arrayBuffer();
      const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontData)));

      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      pdf.addFileToVFS("Adigiana2-Regular.ttf", fontBase64);
      pdf.addFont("Adigiana2-Regular.ttf", "Adigiana2", "normal");
      pdf.setFont("Adigiana2");

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load invitation image'));
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight);

      pdf.setFontSize(20);
      pdf.setTextColor('#be321b');
      const maxWidth = pdfWidth - 200;
      pdf.text(`${occasion}`, 250, 277, { maxWidth });
      pdf.text(`${formattedDate}`, 190, 300, { maxWidth });
      pdf.setTextColor('#497b35');
      pdf.text(`${time}`, 316.3, 333, { maxWidth });

      pdf.setFontSize(34);
      pdf.setTextColor(103, 193, 72);
      pdf.text(`${from}`, 155, 545, { maxWidth });
      pdf.setTextColor('#ff3017');
      pdf.text(`${to}`, 170, 584, { maxWidth });

      pdf.save(`покана-за-${to}.pdf`);

      modal.style.display = 'none';
      overlay.style.display = 'none';
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Грешка при генериране на PDF: ${error.message}`);
    }
  });

  // Modal open/close logic
  const openBtn = document.getElementById('openModalBtn');
  const modal = document.getElementById('modal');
  const overlay = document.getElementById('overlay');
  const closeBtn = document.getElementById('closeModalBtn');

  openBtn.onclick = () => {
    modal.style.display = 'block';
    overlay.style.display = 'block';
  };

  closeBtn.onclick = () => {
    modal.style.display = 'none';
    overlay.style.display = 'none';
  };

  overlay.onclick = () => {
    modal.style.display = 'none';
    overlay.style.display = 'none';
  };

function formatAgeOccasion(age) {
  const lastTwoDigits = age % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return `${age}-ти`;
  }

  switch (age % 10) {
    case 1: return `${age}-ви`;
    case 2: return `${age}-ри`;
    case 7:
    case 8: return `${age}-ми`;
    default: return `${age}-ти`;
  }
}
})();