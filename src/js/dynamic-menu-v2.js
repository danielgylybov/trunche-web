// src/js/dynamic-menu.js

const SPREADSHEET_ID = "1v8CxgcCR7lyuacXrUYs5vNb-cUDFu835";
const INDEX_SHEET = "_index";

// -------------------- Dual-currency settings (loaded from _index first row if present) --------------------
let MENU_SETTINGS = {
  dualCurrencyEnabled: false,  // column: dualCurrencyEnabled (1/0)
  dualCurrencyUntil: null,     // column: dualCurrencyUntil (YYYY-MM-DD)
  primaryCurrency: "EUR",      // column: primaryCurrency (EUR/BGN)
  eurRate: 1.95583             // column: eurRate
};

// -------------------- Helpers --------------------
function sheetUrl(sheetName) {
  const encoded = encodeURIComponent(sheetName);
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encoded}`;
}

function parseGvizResponse(text) {
  // GViz: google.visualization.Query.setResponse({...});
  const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const data = JSON.parse(jsonStr);

  const cols = data.table.cols.map(c => (c.label || "").trim());
  return data.table.rows.map(r => {
    const obj = {};
    r.c.forEach((cell, i) => {
      obj[cols[i] || `col${i}`] = cell ? (cell.v ?? "") : "";
    });
    return obj;
  });
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function parseDateMaybe(v) {
  const s = safeText(v).trim();
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

// -------------------- Currency helpers --------------------
function detectCurrency(unit) {
  const u = safeText(unit).trim().toLowerCase();
  if (u.includes("€") || u.includes("eur")) return "EUR";
  if (u.includes("лв") || u.includes("bgn")) return "BGN";
  return "";
}

function stripCurrencyFromUnit(unit) {
  // Keep suffix like "/ литър", "/ 800гр" etc.
  return safeText(unit)
    .replace(/лв\.?/gi, "")
    .replace(/bgn/gi, "")
    .replace(/€|eur/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUnitCurrencySymbols(unit) {
  // When dualCurrency is OFF:
  // if unit contains EUR -> ensure it uses "€" (not "EUR")
  const u = safeText(unit);
  const cur = detectCurrency(u);
  if (cur !== "EUR") return safeText(unit).trim();

  const suffix = stripCurrencyFromUnit(u); // e.g. "/ литър"
  return `€${suffix ? ` ${suffix}` : ""}`.trim();
}

function money(amount, currency) {
  const n = Number(amount);
  if (!isFinite(n)) return "";
  const v = n.toFixed(2);
  return currency === "EUR" ? `${v} €` : `${v} лв`;
}

function convert(amount, from, to) {
  const n = Number(amount);
  if (!isFinite(n)) return null;
  const rate = MENU_SETTINGS.eurRate;

  if (from === to) return n;
  if (from === "EUR" && to === "BGN") return n * rate;
  if (from === "BGN" && to === "EUR") return n / rate;
  return null;
}

function shouldShowDualCurrency(row) {
  if (!MENU_SETTINGS.dualCurrencyEnabled) return false;

  // per-row override: dual=0 (optional column in category sheets)
  if (row && safeText(row.dual).trim() === "0") return false;

  if (MENU_SETTINGS.dualCurrencyUntil) {
    const now = new Date();
    const until = new Date(MENU_SETTINGS.dualCurrencyUntil);
    until.setHours(23, 59, 59, 999);
    if (now > until) return false;
  }
  return true;
}

// Convert ANY "number + currency" occurrences inside free text (right/left/list/etc.)
function convertAnyCurrencyInText(row, text) {
  const s = safeText(text).trim();
  if (!s) return s;
  if (!shouldShowDualCurrency(row)) return s;

  // IMPORTANT: no \b, so it matches "32лв", "32лв.", "32лв/бр.", "32лв)"
  const re = /(\d+(?:[.,]\d+)?)\s*(лв\.?|bgn|€|eur)/gi;

  let changed = false;
  const out = s.replace(re, (m, numStr, curStr) => {
    const num = Number(String(numStr).replace(",", "."));
    if (!isFinite(num)) return m;

    const curLower = String(curStr).toLowerCase();
    const cur = curLower.includes("€") || curLower.includes("eur") ? "EUR" : "BGN";

    const primary = (safeText(MENU_SETTINGS.primaryCurrency).trim().toUpperCase() === "BGN") ? "BGN" : "EUR";
    const secondary = primary === "EUR" ? "BGN" : "EUR";

    const primaryAmount = convert(num, cur, primary);
    const secondaryAmount = convert(primaryAmount, primary, secondary);
    if (primaryAmount === null || secondaryAmount === null) return m;

    changed = true;
    const main = money(primaryAmount, primary);
    const sec = money(secondaryAmount, secondary);

    return `${main} <span class="small">(${sec})</span>`;
  });

  return changed ? out : s;
}

function formatPrice(price, unit) {
  const p = safeText(price).trim();
  if (!p) return "";

  const uRaw = safeText(unit).trim();
  if (!uRaw) return p;

  // If dual currency is OFF, and unit is EUR, always show "€" (not "EUR")
  if (!MENU_SETTINGS.dualCurrencyEnabled && detectCurrency(uRaw) === "EUR") {
    const normalizedUnit = normalizeUnitCurrencySymbols(uRaw);
    return `${p} ${normalizedUnit}`.trim();
  }

  return `${p} ${uRaw}`.trim();
}

function formatPriceMaybeDual(row, price, unit) {
  // If dual is OFF -> original (but with EUR normalized to € via formatPrice())
  if (!shouldShowDualCurrency(row)) return formatPrice(price, unit);

  const pRaw = safeText(price).trim();
  const p = Number(pRaw);
  const baseCurrency = detectCurrency(unit);

  // If cannot parse -> original
  if (!pRaw || !isFinite(p) || !baseCurrency) return formatPrice(price, unit);

  const suffix = stripCurrencyFromUnit(unit); // e.g. "/ литър"
  const primary = (safeText(MENU_SETTINGS.primaryCurrency).trim().toUpperCase() === "BGN") ? "BGN" : "EUR";
  const secondary = primary === "EUR" ? "BGN" : "EUR";

  const primaryAmount = convert(p, baseCurrency, primary);
  const secondaryAmount = convert(primaryAmount, primary, secondary);

  if (primaryAmount === null || secondaryAmount === null) return formatPrice(price, unit);

  const main = money(primaryAmount, primary);
  const sec = money(secondaryAmount, secondary);

  return `${main} <span class="small">(${sec})</span>${suffix ? ` ${suffix}` : ""}`;
}

function toColClass(col) {
  const n = Number(col || 6);
  const allowed = new Set([12, 8, 6, 4]);
  const c = allowed.has(n) ? n : 6;
  return `col-12 col-md-${c} col-lg-${c}`;
}

// -------------------- Load categories (+ settings) from _index --------------------
async function loadIndexCategories() {
  const res = await fetch(sheetUrl(INDEX_SHEET));
  if (!res.ok) throw new Error("Failed to load _index sheet");
  const text = await res.text();
  const rows = parseGvizResponse(text);

  // Load dual-currency settings from FIRST row if columns exist
  const first = rows[0] || {};
  if ("dualCurrencyEnabled" in first) {
    MENU_SETTINGS.dualCurrencyEnabled = safeText(first.dualCurrencyEnabled).trim() === "1";
  }
  if ("dualCurrencyUntil" in first) {
    MENU_SETTINGS.dualCurrencyUntil = parseDateMaybe(first.dualCurrencyUntil);
  }
  if ("primaryCurrency" in first) {
    const pc = safeText(first.primaryCurrency).trim().toUpperCase();
    MENU_SETTINGS.primaryCurrency = pc === "BGN" ? "BGN" : "EUR";
  }
  if ("eurRate" in first) {
    const r = Number(first.eurRate);
    MENU_SETTINGS.eurRate = isFinite(r) && r > 0 ? r : 1.95583;
  }

  // categories: id | label | order
  return rows
    .map(r => ({
      id: String(r.id || "").trim(),
      label: String(r.label || "").trim() || String(r.id || "").trim(),
      order: Number(r.order || 0),
    }))
    .filter(c => c.id.length > 0)
    .sort((a, b) => a.order - b.order);
}

// -------------------- Rendering --------------------
function renderCategory(categoryId, rows) {
  rows.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));

  const wrapper = el("div", "menu-category d-none");
  wrapper.setAttribute("role", "region");
  wrapper.id = categoryId;

  let currentRowContainer = null;
  let lastItemBody = null;

  const startNewRow = () => {
    currentRowContainer = el("div", "row g-4 justify-content-center");
    wrapper.appendChild(currentRowContainer);
  };

  const addCardCol = (colClass, cardEl) => {
    if (!currentRowContainer) startNewRow();
    const col = el("div", colClass);
    col.dataset.menuCard = "";
    col.appendChild(cardEl);
    currentRowContainer.appendChild(col);
  };

  const ensureList = (body, className) => {
    let ul = body.querySelector("ul." + className.split(" ").join("."));
    if (!ul) {
      ul = el("ul", className);
      body.appendChild(ul);
    }
    return ul;
  };

  const readField = (row, base, idx) => {
    // supports: left2/right2, left3/right3, ... up to 6 (change if you want)
    const key = idx === 1 ? base : `${base}${idx}`;
    return safeText(row[key]).trim();
  };

  rows.forEach(r => {
    const type = safeText(r.type).trim().toLowerCase();
    const title = safeText(r.title);
    const subtitle = safeText(r.subtitle);
    const price = safeText(r.price);
    const unit = safeText(r.unit);
    const note = safeText(r.note);
    const badge = safeText(r.badge);
    const image = safeText(r.image);
    const col = r.col;

    if (type === "section") {
      const section = el("div", "mb-5");
      const h3Class = `fw-bold mb-4 mt-4 text-center ${badge || "bg-warning"} p-2 rounded`;
      section.appendChild(el("h3", h3Class, title || ""));
      wrapper.appendChild(section);
      currentRowContainer = null;
      lastItemBody = null;
      return;
    }

    if (type === "info") {
      const card = el("div", "card shadow h-100");
      const body = el("div", "card-body");
      body.appendChild(el("h5", "card-title fw-bold", title || "🚨 Важно"));
      if (note || subtitle) body.appendChild(el("p", "fst-italic small", note || subtitle));
      card.appendChild(body);
      addCardCol(toColClass(col || 12), card);
      lastItemBody = null;
      return;
    }

    if (type === "hours") {
      const left = safeText(r.left);
      const right = safeText(r.right);

      const card = el("div", "card shadow h-100");
      const body = el("div", "card-body");

      body.appendChild(el("h6", "fw-bold mx-auto text-center", title || "🕙 Работно време"));

      const row = el("div", "mx-auto my-auto d-flex justify-content-center flex-wrap");
      if (left) row.appendChild(el("span", "price-tag-alt m-2", left));
      if (right) row.appendChild(el("span", "price-tag-alt m-2", right));
      body.appendChild(row);

      card.appendChild(body);
      addCardCol(toColClass(col || 12), card);
      lastItemBody = null;
      return;
    }

    if (type === "item") {
      const card = el("div", "card shadow h-100");
      const body = el("div", "card-body d-flex flex-column");

      const phone = safeText(r.phone).trim();
      const facebook = safeText(r.facebook).trim();
      const website = safeText(r.website).trim();

      // Explicit imageType wins; contact fields preserve existing partner entries.
      const isPartner = safeText(r.imageType).trim().toLowerCase() === "partner" ||
        (safeText(r.imageType).trim().toLowerCase() !== "product" && Boolean(phone || facebook || website));
      const imageUrl = safeImageUrl(image);
      if (imageUrl && !isPartner) {
        const photo = document.createElement("img");
        photo.src = imageUrl;
        photo.alt = title;
        photo.loading = "lazy";
        photo.decoding = "async";
        photo.className = "product-image";
        photo.addEventListener("error", () => photo.remove(), { once: true });
        card.appendChild(photo);
      }
      if (imageUrl && isPartner) {
        const header = el("div", "partner-header mb-4");

        const img = document.createElement("img");
        img.src = imageUrl;
        img.loading = "lazy";
        img.addEventListener("error", () => img.remove(), { once: true });
        img.alt = title || "";
        img.className = "partner-image";
        img.style.width = "80px";
        img.style.height = "80px";
        img.style.objectFit = "cover";

        const rightBox = el("div", "");
        rightBox.appendChild(el("h5", "card-title fw-bold", title || ""));

        // ✅ Multiple prices for partners:
        // left/right + left2/right2 + left3/right3 ... (up to 6)
        const lines = [];
        for (let i = 1; i <= 6; i++) {
          const l = readField(r, "left", i);
          const rr = convertAnyCurrencyInText(r, readField(r, "right", i));
          if (l || rr) lines.push({ l, r: rr });
        }

        if (lines.length > 0) {
          lines.forEach((ln, idx) => {
            rightBox.appendChild(
              el(
                "p",
                idx === 0 ? "mb-1" : "mb-1",
                `<span class="price-tag">${ln.l ? ln.l + " – " : ""}${ln.r}</span>`
              )
            );
          });
        } else {
          // fallback to structured price/unit if no left/right lines
          const pr = formatPriceMaybeDual(r, price, unit);
          if (pr) rightBox.appendChild(el("p", "mb-1", `<span class="price-tag">${pr}</span>`));
        }

        if (subtitle) rightBox.appendChild(el("p", "small mb-1", subtitle));

        header.appendChild(img);
        header.appendChild(rightBox);
        body.appendChild(header);
      } else {
        // Standard item layout
        body.appendChild(el("h5", "card-title fw-bold", title || ""));
        const pr = formatPriceMaybeDual(r, price, unit);
        if (pr) body.appendChild(el("span", "price-tag mx-auto", pr));
        if (subtitle) body.appendChild(el("p", "small mt-2", subtitle));
      }

      if (note) body.appendChild(el("p", "small text-muted mt-2", note));

      // Contacts
      if (phone || facebook || website) {
        const p = el("p", "small text-muted mt-auto contact-links");
        if (facebook) {
          p.insertAdjacentHTML(
            "beforeend",
            `<a class="text-gradient contact-social-link contact-social-link--facebook" href="${facebook}" target="_blank" rel="noopener" aria-label="Facebook"><i class="bi bi-facebook" aria-hidden="true"></i><span class="contact-social-label">Facebook</span></a><br>`
          );
        }
        if (phone) p.insertAdjacentHTML("beforeend", `Тел: <a href="tel:${phone}">${phone}</a><br>`);
        if (website) {
          const label = website.replace(/^https?:\/\//, "");
          p.insertAdjacentHTML("beforeend", `<a href="${website}" target="_blank" rel="noopener">${label}</a>`);
        }
        body.appendChild(p);
      }

      card.appendChild(body);
      addCardCol(toColClass(col || 6), card);
      lastItemBody = body;
      return;
    }

    // list: also converts currency inside list text (e.g. "8бр / 32лв")
    if (type === "list") {
      const text = title || note || "";
      if (!text) return;

      const html = convertAnyCurrencyInText(r, text);

      if (lastItemBody) {
        const ul = ensureList(lastItemBody, "small mb-3");
        ul.appendChild(el("li", "", `<span class="list-text">${html}</span>`));
      } else {
        const card = el("div", "card shadow h-100");
        const body = el("div", "card-body");
        const ul = el("ul", "small mb-0");
        ul.appendChild(el("li", "", `<span class="list-text">${html}</span>`));
        body.appendChild(ul);
        card.appendChild(body);
        addCardCol(toColClass(col || 12), card);
      }
      return;
    }

    if (type === "line") {
      const left = safeText(r.left || r.title).trim();
      const right = convertAnyCurrencyInText(r, r.right);

      if (!left && !right) return;

      const liHtml = `
        <li class="d-flex align-items-start">
          <p class="m-0">${left}</p>
          ${right ? `<span class="price-tag-alt ms-auto">${right}</span>` : ""}
        </li>
      `;

      if (lastItemBody) {
        const ul = ensureList(lastItemBody, "small mb-3");
        ul.insertAdjacentHTML("beforeend", liHtml);
      } else {
        const card = el("div", "card shadow h-100");
        const body = el("div", "card-body");
        const ul = el("ul", "small mb-0");
        ul.insertAdjacentHTML("beforeend", liHtml);
        body.appendChild(ul);
        card.appendChild(body);
        addCardCol(toColClass(col || 12), card);
      }
      return;
    }

    if (type === "html") {
      const card = el("div", "card shadow h-100");
      const body = el("div", "card-body", note || subtitle || "");
      card.appendChild(body);
      addCardCol(toColClass(col || 12), card);
      lastItemBody = null;
      return;
    }
  });

  return wrapper;
}

// -------------------- UI --------------------
function safeImageUrl(value) {
  if (!value.trim()) return "";
  try {
    const url = new URL(value, location.href);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function setupCategoryButtons(categories) {
  const root = document.getElementById("menuButtons");
  root.replaceChildren();
  categories.forEach(c => {
    const button = el("button", "btn btn-outline-primary", "");
    button.type = "button";
    button.textContent = c.label;
    button.dataset.category = c.id;
    button.setAttribute("aria-controls", c.id);
    button.setAttribute("aria-pressed", "false");
    root.appendChild(button);
  });
}

async function loadAllCategories(categories) {
  const root = document.getElementById("menuRoot");
  const rendered = await Promise.allSettled(categories.map(async c => {
    const res = await fetch(sheetUrl(c.id));
    if (!res.ok) throw new Error(`Failed to load sheet tab: ${c.id}`);
    const rows = parseGvizResponse(await res.text());
    const node = renderCategory(c.id, rows);
    node.setAttribute("aria-label", c.label);
    return node;
  }));
  root.replaceChildren();
  rendered.forEach((result, index) => {
    if (result.status === "fulfilled") {
      root.appendChild(result.value);
    } else {
      const node = el("div", "menu-category d-none");
      node.id = categories[index].id;
      node.appendChild(errorNotice("Тази категория не можа да се зареди."));
      root.appendChild(node);
    }
  });
}

function errorNotice(message) {
  const notice = el("div", "menu-status");
  notice.setAttribute("role", "alert");
  const text = el("p");
  text.textContent = message + " Можеш да опиташ отново или да ни се обадиш на 0895 415 287.";
  const retry = el("button", "btn btn-outline-dark");
  retry.type = "button";
  retry.textContent = "Опитай отново";
  retry.addEventListener("click", () => location.reload());
  notice.append(text, retry);
  return notice;
}

function setupSwitching(categories) {
  const buttons = document.querySelectorAll("#menuButtons button");
  const sections = document.querySelectorAll("#menuRoot .menu-category");
  const search = document.getElementById("menuSearch");
  const empty = document.getElementById("menuEmpty");
  const normalize = value => value.toLocaleLowerCase("bg").normalize("NFC");
  function filter() {
    const active = document.querySelector("#menuRoot .menu-category:not(.d-none)");
    const query = normalize(search.value.trim());
    const cards = [...(active?.querySelectorAll("[data-menu-card]") || [])];
    cards.forEach(card => card.hidden = Boolean(query) && !normalize(card.textContent).includes(query));
    // Section headings don't describe a filtered set reliably.
    active?.querySelectorAll(":scope > div:not(.row)").forEach(node => {
      if (node.querySelector("h3")) node.hidden = Boolean(query);
    });
    empty.hidden = !cards.length || cards.some(card => !card.hidden);
  }
  function showSection(category, userAction = false) {
    sections.forEach(section => section.classList.toggle("d-none", section.id !== category));
    buttons.forEach(button => {
      const selected = button.dataset.category === category;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const label = categories.find(c => c.id === category)?.label || "Меню";
    document.getElementById("menu-title").textContent = label;
    search.value = "";
    filter();
    if (userAction) {
      history.replaceState(null, "", "#" + encodeURIComponent(category));
      document.querySelector(".menu-section").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }
  }
  search.addEventListener("input", filter);
  buttons.forEach(button => button.addEventListener("click", () => showSection(button.dataset.category, true)));
  const initial = categories.find(c => "#" + encodeURIComponent(c.id) === location.hash);
  showSection(initial?.id || categories[0]?.id || "");
}

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("menuRoot");
  try {
    const categories = await loadIndexCategories();
    if (!categories.length) throw new Error("No menu categories");
    setupCategoryButtons(categories);
    await loadAllCategories(categories);
    setupSwitching(categories);
  } catch (error) {
    console.error(error);
    root.replaceChildren(errorNotice("Менюто не можа да се зареди."));
  } finally {
    root.setAttribute("aria-busy", "false");
  }
});
