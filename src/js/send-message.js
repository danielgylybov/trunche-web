document.getElementById("contactForm").addEventListener("submit", function(event) {
    event.preventDefault();  // Предотвратява изпращането на формата по подразбиране

     // Проверяваме дали формата е валидна
        if (this.checkValidity() === false) {
          // Ако не е валидна, показваме грешка и спираме изпращането
          event.stopPropagation();
          this.classList.add('was-validated');
          return;
        }

    var formData = new FormData(this);
    var submitButton = document.getElementById("submitButton");

    submitButton.disabled = true;  // Деактивира бутон за изпращане, докато чакаме отговор

    fetch("https://formspree.io/f/xldbbkzp", {
      method: 'POST',
      body: formData,
      mode: 'no-cors'
    })
    .then(() => {
        // This part will run no matter what, assuming the form submission is successful
        document.getElementById("contactForm").classList.add('d-none');
        document.getElementById("title").innerText = 'Благодарим Ви за проявеният интерес!'
        document.getElementById("subtitle").innerText = 'Получихме вашето съобщение и ще се свържем с вас възможно най-скоро!'

    })
    .catch(error => {
        // If there's a network error or any other issue, show the error message
        document.getElementById("submitErrorMessage").classList.remove('d-none');
    })
    .finally(() => {
        submitButton.disabled = false;  // Активира отново бутона за изпращане
    });
  });