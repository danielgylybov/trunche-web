// send-message.js — EmailJS интеграция + JS валидация на телефон + honeypot + cooldown

(() => {
  const FORM_ID = 'contactForm';
  const form = document.getElementById(FORM_ID);
  const submitBtn = document.getElementById('submitButton');
  const errorBox = document.getElementById('submitErrorMessage');
  const titleEl = document.getElementById('title');
  const subtitleEl = document.getElementById('subtitle');

  const EMAILJS_PUBLIC_KEY  = 'Bqd9ACe4MeT6fWlQ8';
  const EMAILJS_SERVICE_ID  = 'service_c5tsrlf';
  const EMAILJS_TEMPLATE_ID = 'template_pfzgbxf';

  try {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  } catch (e) {
    console.error('EmailJS SDK init error:', e);
  }

  // Полета
  const pageUrlInput = document.getElementById('page_url');
  const phoneEl = document.getElementById('phone');

  // Запиши текущия URL за контекст в имейла
  if (pageUrlInput) pageUrlInput.value = window.location.href;

  // --- Анти-спам (honeypot) ---
  const isBot = () => {
    const hp = document.getElementById('website');
    return hp && hp.value && hp.value.trim().length > 0;
  };

  // --- Cooldown: 30s между изпращания ---
  const COOLDOWN_MS = 30_000;
  const canSend  = () => Date.now() - (Number(localStorage.getItem('contact_last_send_ts')) || 0) > COOLDOWN_MS;
  const markSent = () => localStorage.setItem('contact_last_send_ts', String(Date.now()));

  // --- Помощници за UI ---
  const setLoading = (loading) => {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    if (loading) {
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Изпращане...';
    } else if (submitBtn.dataset.originalText) {
      submitBtn.textContent = submitBtn.dataset.originalText;
      delete submitBtn.dataset.originalText;
    }
  };

  const showError = (msg) => {
    if (!errorBox) return;
    errorBox.textContent = msg || 'Възникна грешка при изпращане. Моля, опитайте отново!';
    errorBox.classList.remove('d-none');
  };
  const hideError = () => errorBox && errorBox.classList.add('d-none');

  // --- JS валидация на телефон ---
  // Разрешени символи: цифри, +, (, ), -, интервал
  // Условие: общ брой цифри между 7 и 15
  const isPhoneValid = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return false;
    // 1) само позволени символи
    const allowed = /^[0-9()+\- ]+$/;
    if (!allowed.test(value)) return false;
    // 2) брой цифри
    const digits = (value.match(/\d/g) || []).length;
    return digits >= 7 && digits <= 15;
  };

  if (phoneEl) {
    phoneEl.removeAttribute('pattern');
    // При писане, чистим customValidity
    phoneEl.addEventListener('input', () => phoneEl.setCustomValidity(''));
  }

  // --- Финална валидация на формата ---
  const validateForm = () => {
    // Базова HTML5 валидация (required, type="email", и т.н.)
    if (form.checkValidity() === false) {
      form.classList.add('was-validated');
      return false;
    }
    // Доп. валидация на телефон
    if (phoneEl && !isPhoneValid(phoneEl.value)) {
      phoneEl.setCustomValidity('Моля, въведете валиден телефонен номер (7–15 цифри).');
      form.classList.add('was-validated');
      // Показваме балончето до полето
      phoneEl.reportValidity();
      return false;
    } else if (phoneEl) {
      phoneEl.setCustomValidity('');
    }
    return true;
  };

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      // Тихо блокиране на ботове
      if (isBot()) {
        titleEl && (titleEl.innerText = 'Благодарим Ви за проявения интерес!');
        subtitleEl && (subtitleEl.innerText = 'Получихме вашето съобщение и ще се свържем с вас възможно най-скоро!');
        form.classList.add('d-none');
        return;
      }

      if (!canSend()) {
        showError('Моля, изчакайте малко преди да изпратите отново (30 секунди).');
        return;
      }

      if (!validateForm()) return;

      try {
        setLoading(true);

        // Изпращане на съдържанието на формата към EmailJS
        await emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, `#${FORM_ID}`);

        // Успех — показваме благодарствено съобщение
        titleEl && (titleEl.innerText = 'Благодарим Ви за проявения интерес!');
        subtitleEl && (subtitleEl.innerText = 'Получихме вашето съобщение и ще се свържем с вас възможно най-скоро!');
        form.classList.add('d-none');
        markSent();
      } catch (err) {
        console.error('EmailJS error:', err);
        const msg = (err && (err.text || err.message)) ? `Грешка при изпращане: ${err.text || err.message}` : null;
        showError(msg);
      } finally {
        setLoading(false);
      }
    });
  }
})();
