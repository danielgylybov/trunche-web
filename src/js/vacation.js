(function () {
  const CONFIG_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSppC_Nkovv-vqUZ3cVp08oRcT8QVe7Stl25jIxH-f4vQ-xwWxfEb6XeAS7q5uNwUR7VhUHlTUcLKc3/pub?output=csv";

  // ==== CSV парсър ====
  function parseCsv(text) {
    const rows = [];
    let row = [], cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i], next = text[i+1];
      if (inQuotes) {
        if (ch === '"' && next === '"') { cell += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { cell += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { row.push(cell); cell = ''; }
        else if (ch === '\n' || ch === '\r') {
          if (ch === '\r' && next === '\n') i++;
          row.push(cell); cell = '';
          if (row.length && row.some(v => v !== '')) rows.push(row);
          row = [];
        } else { cell += ch; }
      }
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  // ==== Утилити ====
  const toBool = v => /^true$/i.test(String(v||'').trim());
  const toInt  = v => parseInt(String(v||'').trim() || '0', 10);

  function parseYmd(s) {
    const [y,m,d] = String(s||'').trim().split('-').map(Number);
    return new Date(y, (m||1)-1, d||1, 0, 0, 0);
  }
  function isWithinInclusive(now, start, end) {
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
    return now >= start && now <= endDay;
  }
  function fmtBgDate(ymd) {
    const [y,m,d] = ymd.split('-').map(Number);
    return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`;
  }

  function getCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { savedAt, ttl, data } = JSON.parse(raw);
      if (!savedAt || !ttl) return null;
      if ((Date.now() - savedAt) > ttl) return null;
      return data;
    } catch { return null; }
  }
  function setCache(key, data, ttlMinutes) {
    try {
      localStorage.setItem(key, JSON.stringify({
        savedAt: Date.now(),
        ttl: (ttlMinutes||60) * 60 * 1000,
        data
      }));
    } catch {}
  }

  // честоти
  function shouldShowByFrequency(freq, storageKey, periodKey) {
    if (freq === "always") return true;
    if (freq === "once_per_session") {
      if (sessionStorage.getItem(storageKey)) return false;
      sessionStorage.setItem(storageKey, "1");
      return true;
    }
    const last = localStorage.getItem(storageKey);
    const today = new Date().toDateString();
    if (freq === "once_per_day") {
      if (last && new Date(last).toDateString() === today) return false;
      return true;
    }
    if (freq === "once_per_period") {
      if (localStorage.getItem(storageKey + ":" + periodKey)) return false;
      return true;
    }
    return true;
  }
  function markShown(freq, storageKey, periodKey) {
    const nowIso = new Date().toISOString();
    if (freq === "once_per_session") {
      sessionStorage.setItem(storageKey, "1");
    } else if (freq === "once_per_day") {
      localStorage.setItem(storageKey, nowIso);
    } else if (freq === "once_per_period") {
      localStorage.setItem(storageKey + ":" + periodKey, nowIso);
    }
  }

  // ==== Модел (schema) + избор на активен ред ====
  function rowsToRecords(rows) {
    if (!rows.length) return [];
    const header = rows[0].map(h => h.trim());
    const list = [];
    for (let r = 1; r < rows.length; r++) {
      const raw = rows[r];
      if (!raw || !raw.length) continue;
      const rec = {};
      header.forEach((h, idx) => rec[h] = (raw[idx] ?? '').trim());
      if (Object.values(rec).some(v => v !== '')) list.push(rec);
    }
    return list.map(rec => ({
      start: rec.start,
      end: rec.end,
      frequency: rec.frequency || "once_per_day",
      bannerEnabled: toBool(rec.bannerEnabled ?? "true"),
      messengerUrl: rec.messengerUrl || "https://m.me/100033687105031",
      title: rec.title || "🌴 В отпуск сме",
      message: rec.message || "Връзка само през Facebook Messenger.",
      cacheTtlMinutes: toInt(rec.cacheTtlMinutes || "60"),
      showCloseButton: toBool(rec.showCloseButton || "false")
    }));
  }

  function pickActiveRecord(records) {
    const now = new Date();
    const active = records.find(r => isWithinInclusive(now, parseYmd(r.start), parseYmd(r.end)));
    if (active) return active;
    // ако няма активен, вземи най-близкия предстоящ
    const upcoming = records
      .filter(r => parseYmd(r.start) > now)
      .sort((a,b) => parseYmd(a.start) - parseYmd(b.start))[0];
    return upcoming || null;
  }

  // ==== Рендер ====
  function ensureBanner(rec) {
    if (!rec || !rec.bannerEnabled) return;
    if (document.getElementById("vacationBanner")) return;
    const div = document.createElement("div");
    div.id = "vacationBanner";
    div.className = "text-center text-white bg-danger py-2 fw-bold";
    div.innerHTML = `
      🌴 В отпуск сме от ${fmtBgDate(rec.start)} до ${fmtBgDate(rec.end)} – връзка само чрез
      <a href="${rec.messengerUrl}" target="_blank" rel="noopener" class="text-white text-decoration-underline">Facebook Messenger</a>
    `;
    document.body.prepend(div);
  }

  function ensureModal(rec) {
    if (document.getElementById("vacationModal")) return;
    const modalHtml = `
      <div class="modal fade" id="vacationModal" tabindex="-1" aria-labelledby="vacationModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content text-center p-3">
            <div class="modal-header border-0">
              <h5 class="modal-title w-100" id="vacationModalLabel">${rec.title}</h5>
              ${rec.showCloseButton ? '<button type="button" class="btn-close mb-5" data-bs-dismiss="modal" aria-label="Затвори"></button>' : ''}
            </div>
            <div class="modal-body">${rec.message}</div>
            <div class="modal-footer border-0 justify-content-center">
              <a class="btn btn-primary btn-lg px-5 py-3 fs-6 fw-bolder d-flex align-items-center justify-content-center gap-2"
                 href="${rec.messengerUrl}" target="_blank" rel="noopener">
                <span style="font-size:1.6em;line-height:1;">💬</span>
                <span>Пиши ни във Facebook</span>
              </a>
              <button type="button" class="btn btn-outline-dark btn-lg px-5 py-3 fs-6 fw-bolder mt-3" data-bs-dismiss="modal">Разбрах</button>
            </div>
          </div>
        </div>
      </div>`;
    const wrap = document.createElement("div");
    wrap.innerHTML = modalHtml;
    document.body.appendChild(wrap.firstElementChild);
  }

  const CACHE_KEY = "trunche_vacation_sheet_cache_multi";
  const SHOW_KEY  = "trunche_vacation_modal_last_shown";

  async function loadRecords() {
    const cached = getCache(CACHE_KEY);
    if (cached) return cached;
    try {
      const res = await fetch(CONFIG_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("CSV fetch failed");
      const text = await res.text();
      const rows = parseCsv(text);
      const records = rowsToRecords(rows);
      const ttl = (records[0]?.cacheTtlMinutes) || 60;
      setCache(CACHE_KEY, records, ttl);
      return records;
    } catch (e) {
      return []; // фолбек: нищо не правим
    }
  }

  function showModalIfNeeded(rec) {
    if (!rec) return;
    const now = new Date();
    const start = parseYmd(rec.start);
    const end   = parseYmd(rec.end);
    // показвай модал само когато периодът е активен
    if (!isWithinInclusive(now, start, end)) return;

    const periodKey = `${rec.start}..${rec.end}`;
    if (!shouldShowByFrequency(rec.frequency, SHOW_KEY, periodKey)) return;

    ensureModal(rec);
    const el = document.getElementById('vacationModal');
    if (!el || typeof bootstrap === 'undefined' || !bootstrap.Modal) return;
    new bootstrap.Modal(el).show();
    markShown(rec.frequency, SHOW_KEY, periodKey);
  }

  (async function init() {
    const records = await loadRecords();
    const rec = pickActiveRecord(records);

    // Банерът може да се показва и за предстоящия (ако желаеш само за активния – обвий със check isWithinInclusive)
    if (rec) ensureBanner(rec);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => showModalIfNeeded(rec));
    } else {
      showModalIfNeeded(rec);
    }
  })();
})();
