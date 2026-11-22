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
  if (!shouldShowDualCurrency(row)) return s.replace(/(\d+(?:[.,]\d+)?)\s*eur\b/gi, "$1 €");

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
  const res = await fetch(sheetUrl(INDEX_SHEET), {signal: AbortSignal.timeout(15000)});
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
// Display labels are deliberately short; source category IDs remain stable.
const CATEGORY_UI = {
  kuverti: {label:'Детско меню', title:'За малките гости', description:'Куверти и любими хапки за гладни приключенци.', icon:'cake',tone:'#ffde71'},
  soleni: {label:'Солени хапки', title:'Нещо солено', description:'Споделени плата и вкусни предложения за големите.',icon:'pizza',tone:'#b9e5ce'},
  sladki: {label:'Сладки неща', title:'Животът е по-сладък тук', description:'За онова специално място, което винаги пазим за десерт.',icon:'sweet',tone:'#ffc1d6'},
  napitki: {label:'Напитки', title:'Глътка свежест', description:'За малки глътки, големи наздравици и всичко между тях.',icon:'drink',tone:'#cce9fa'},
  animacia: {label:'За празника', title:'Още малко вълшебство', description:'Анимация, фотография и декорация за вашия празник.',icon:'party',tone:'#d9cef9'},
  uslovia: {label:'Условия', title:'Добре е да знаеш', description:'Важните подробности за един спокоен и щастлив празник.',icon:'rules',tone:'#ffe6b6'}
};
const cleanTitle = value => safeText(value).replace(/<[^>]*>/g,'').replace(/\p{Extended_Pictographic}|\uFE0F|\u200D|\u20E3/gu,'').trim();
function categoryUI(category) {
  return CATEGORY_UI[category.id] || {label:cleanTitle(category.label),title:cleanTitle(category.label),description:'Предложения за вашия празник.',icon:'party',tone:'#d9cef9'};
}
function escapeHtml(value) {
  return safeText(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function safeImageUrl(value) {
  if (!safeText(value).trim()) return '';
  try { const url = new URL(value,location.href); return ['https:','http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
function renderPrice(row) {
  const raw = safeText(row.price).trim();
  if (!raw) return null;
  const currency = detectCurrency(row.unit);
  const number = Number(raw.replace(',','.'));
  const amount = currency && Number.isFinite(number) ? number.toFixed(2) : raw;
  const price = el('div','menu-price');
  price.innerHTML = formatPriceMaybeDual(row,amount,currency || row.unit).replace(/(\d)\.(\d{2})/g,'$1,$2');
  const unit = currency ? stripCurrencyFromUnit(row.unit) : '';
  if (unit) {
    const suffix = el('span','price-unit');
    suffix.textContent = unit;
    price.appendChild(suffix);
  }
  return price;
}
function photoNode(row, partner) {
  const url = safeImageUrl(row.image);
  if (!url) return null;
  const image = document.createElement('img');
  image.src = url;
  image.alt = cleanTitle(row.title);
  image.className = partner ? 'partner-image' : 'product-image';
  image.loading = 'lazy'; image.decoding = 'async';
  image.addEventListener('load',()=>{image.classList.add('is-loaded');image.parentElement?.classList.add('is-loaded');},{once:true});
  image.addEventListener('error',()=>{const frame=image.closest('.menu-photo-frame');if(frame)frame.remove();else image.remove();},{once:true});
  return image;
}
function appendDetails(body, lines) {
  if (!lines.length) return;
  const list = el('ul','menu-details');
  lines.forEach(row=>{
    const li = el('li');
    const text = el('span');
    text.innerHTML = convertAnyCurrencyInText(row,cleanTitle(row.type === 'line' ? row.left || row.title : row.title || row.note));
    li.appendChild(text);
    if (row.type === 'line' && row.right) li.appendChild(el('span','detail-price',convertAnyCurrencyInText(row,row.right)));
    list.appendChild(li);
  });
  body.appendChild(list);
}
function renderMenuCard(record, categoryId) {
  const row = record.row;
  const type = safeText(row.type).trim().toLowerCase();
  const partner = safeText(row.imageType).toLowerCase() === 'partner' ||
    (safeText(row.imageType).toLowerCase() !== 'product' && Boolean(row.phone || row.facebook || row.website));
  const isInformation = type === 'item' && !partner && !row.price && /информаци|важно|услови|правила/i.test(cleanTitle(row.title));
  const isPackage = categoryId === 'kuverti' && type === 'item' && /куверт/i.test(row.title);
  const card = el('article','menu-card' + (isInformation ? ' menu-card--info' : type !== 'item' ? ` menu-card--${type === 'list' || type === 'line' || type === 'html' ? 'text' : type}` : partner ? ' menu-card--partner' : isPackage ? ' menu-card--package' : ' menu-card--product'));
  card.dataset.menuCard = '';
  card.dataset.kind = type;
  if (type === 'item' && !isInformation) card.dataset.product = '';
  const body = el('div','menu-card-body');
  const heading = el('div','menu-item-heading');
  const title = el('h4','menu-item-title');
  title.textContent = cleanTitle(row.title) || (type === 'info' ? 'Важно за празника' : type === 'hours' ? 'Работно време' : '');
  if (title.textContent) heading.appendChild(title);
  if (type === 'item' && !partner) {
    const price = renderPrice(row); if (price) heading.appendChild(price);
  }
  if (partner) {
    const header = el('div','partner-header');
    const photo = photoNode(row,true); if (photo) header.appendChild(photo);
    header.appendChild(heading); body.appendChild(header);
    const rates = el('div','partner-rates');
    for (let i=1;i<=6;i++) {
      const left = row[i === 1 ? 'left' : `left${i}`];
      const right = row[i === 1 ? 'right' : `right${i}`];
      if (left || right) rates.appendChild(el('div','',`${escapeHtml(left || '')}${left && right ? ' · ' : ''}<strong>${convertAnyCurrencyInText(row,right)}</strong>`));
    }
    if (rates.children.length) body.appendChild(rates);
    else { const price = renderPrice(row); if (price) body.appendChild(price); }
  } else {
    if (type === 'item') { const photo = photoNode(row,false); if (photo) {const frame=el('div','menu-photo-frame');frame.appendChild(photo);card.appendChild(frame);} }
    body.appendChild(heading);
  }
  if (type === 'hours') {
    const values = el('div','hours-values');
    [row.left,row.right].filter(Boolean).forEach(value=>values.appendChild(el('span','',value)));
    body.appendChild(values);
  }
  if (type === 'html') body.appendChild(el('div','menu-rich-text',row.note || row.subtitle || ''));
  else {
    if (row.subtitle) body.appendChild(el('p','menu-item-description',row.subtitle));
    appendDetails(body,record.lines);
    if (row.note && row.note !== row.subtitle) body.appendChild(el('p','menu-item-note',row.note));
  }
  if (row.phone || row.facebook || row.website) {
    const contacts = el('p','contact-links');
    if (row.phone) {
      const link = el('a');link.href = 'tel:' + safeText(row.phone).replace(/[^+\d]/g,'');link.textContent = safeText(row.phone);contacts.appendChild(link);
    }
    [['facebook','Facebook'],['website','Уебсайт']].forEach(([field,label])=>{
      const url = safeImageUrl(safeText(row[field])); if (!url) return;
      const link = el('a');link.href=url;link.textContent=label;link.target='_blank';link.rel='noopener';contacts.appendChild(link);
    });
    body.appendChild(contacts);
  }
  card.appendChild(body);
  return card;
}
function renderCategory(categoryId, rows) {
  const wrapper = el('div','menu-category');wrapper.id=categoryId;wrapper.hidden=true;
  wrapper.setAttribute('role','region');
  let group, grid, lastRecord;
  function newGroup(title) {
    group=el('div','menu-group');
    if (title) { const heading=el('h3','menu-group-heading');heading.textContent=cleanTitle(title);group.appendChild(heading); }
    grid=el('div','menu-card-grid');group.appendChild(grid);wrapper.appendChild(group);
  }
  // Attach subordinate lines to their item before rendering, preserving sheet order.
  const blocks=[];
  [...rows].sort((a,b)=>Number(a.sort||0)-Number(b.sort||0)).forEach(row=>{
    const type=safeText(row.type).trim().toLowerCase();
    if (type === 'section') {blocks.push({section:row.title});lastRecord=null;return;}
    if (!['item','info','hours','list','line','html'].includes(type)) return;
    if ((type === 'list' || type === 'line') && !cleanTitle(row.title || row.note || row.left) && !row.right) return;
    if ((type === 'list' || type === 'line') && lastRecord) {lastRecord.lines.push({...row,type});return;}
    const record={row:{...row,type},lines:[]};
    if (type === 'list' || type === 'line') {record.row={type:'list'};record.lines.push({...row,type});}
    blocks.push(record);lastRecord=type === 'item' ? record : null;
  });
  blocks.forEach(record=>{
    if ('section' in record) {newGroup(record.section);return;}
    if (!grid) newGroup();
    grid.appendChild(renderMenuCard(record,categoryId));
  });
  return wrapper;
}
function setupCategoryButtons(categories) {
  const root=document.getElementById('menuButtons');root.replaceChildren();
  categories.forEach(category=>{
    const ui=categoryUI(category);
    const button=el('button','category-button');button.type='button';button.dataset.category=category.id;
    button.setAttribute('aria-controls',category.id);button.setAttribute('aria-pressed','false');
    button.innerHTML=`<span class="category-icon" style="--tone:${ui.tone}" aria-hidden="true"><svg><use href="src/assets/play-icons.svg#${ui.icon}"/></svg></span><span>${escapeHtml(ui.label)}</span><span class="category-number" aria-hidden="true"></span>`;
    root.appendChild(button);
  });
}
function errorNotice(message) {
  const notice=el('div','menu-status');notice.setAttribute('role','alert');
  const text=el('p');text.textContent=message+' Опитай отново или ни се обади на 0895 415 287.';
  const retry=el('button','btn btn-outline-dark');retry.type='button';retry.textContent='Опитай отново';
  retry.addEventListener('click',()=>location.reload());notice.append(text,retry);return notice;
}
async function loadAllCategories(categories) {
  const root=document.getElementById('menuRoot');
  const results=await Promise.allSettled(categories.map(async category=>{
    const response=await fetch(sheetUrl(category.id),{signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Category request failed');
    const node=renderCategory(category.id,parseGvizResponse(await response.text()));
    node.setAttribute('aria-label',categoryUI(category).title);
    const searchHeading=el('h3','search-category-title');searchHeading.textContent=categoryUI(category).title;searchHeading.hidden=true;
    node.prepend(searchHeading);return node;
  }));
  const nodes=results.map((result,index)=>{
    if (result.status === 'fulfilled') return result.value;
    const node=el('div','menu-category');node.id=categories[index].id;node.hidden=true;node.dataset.failed='true';node.appendChild(errorNotice('Тази категория не можа да се зареди.'));return node;
  });
  root.replaceChildren(...nodes);
  categories.forEach(category=>{
    const count=document.getElementById(category.id).querySelectorAll('[data-product]').length;
    document.querySelectorAll('#menuButtons button').forEach(button=>{
      if (button.dataset.category === category.id && count) button.querySelector('.category-number').textContent=count;
    });
  });
}
function setupSwitching(categories) {
  const buttons=[...document.querySelectorAll('#menuButtons button')];
  const sections=[...document.querySelectorAll('#menuRoot .menu-category')];
  const search=document.getElementById('menuSearch');
  const clear=document.getElementById('clearSearch');
  const empty=document.getElementById('menuEmpty');
  const count=document.getElementById('menuCount');
  const title=document.getElementById('menu-title');
  const description=document.getElementById('categoryDescription');
  const normalize=value=>value.toLocaleLowerCase('bg').normalize('NFC');
  let selected=categories.find(category=>'#'+encodeURIComponent(category.id)===location.hash)?.id || categories[0].id;
  function update() {
    const query=normalize(search.value.trim());let matches=0;let failed=0;
    sections.forEach(section=>{
      if (section.dataset.failed) {section.hidden=Boolean(query) || section.id!==selected;failed++;return;}
      const cards=[...section.querySelectorAll('[data-menu-card]')];
      cards.forEach(card=>{
        card.hidden=Boolean(query) && !normalize(card.textContent).includes(query);
        if (!card.hidden && (query || section.id===selected) && (query || card.dataset.product !== undefined)) matches++;
      });
      section.querySelectorAll('.menu-group').forEach(group=>group.hidden=![...group.querySelectorAll('[data-menu-card]')].some(card=>!card.hidden));
      section.hidden=query ? !cards.some(card=>!card.hidden) : section.id!==selected;
      const heading=section.querySelector('.search-category-title');if (heading) heading.hidden=!query;
    });
    buttons.forEach(button=>{const active=!query && button.dataset.category===selected;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const ui=categoryUI(categories.find(category=>category.id===selected));
    title.textContent=query ? 'Намерихме ли любимото?' : ui.title;
    description.textContent=query ? 'Резултати от всички категории'+(failed ? ' · Някои категории не са заредени.' : '') : ui.description;
    count.textContent=matches ? `${matches} ${query ? (matches === 1 ? 'резултат' : 'резултата') : (matches === 1 ? 'предложение' : 'предложения')}` : '';
    empty.hidden=!query || matches>0;clear.hidden=!search.value;
  }
  function reset(){search.value='';update();search.focus();}
  search.addEventListener('input',update);clear.addEventListener('click',reset);document.getElementById('resetSearch').addEventListener('click',reset);
  buttons.forEach(button=>button.addEventListener('click',()=>{
    selected=button.dataset.category;search.value='';update();history.replaceState(null,'','#'+encodeURIComponent(selected));
    if (matchMedia('(max-width: 767px)').matches) document.querySelector('.menu-section').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'});
  }));
  update();
}
document.addEventListener('DOMContentLoaded',async()=>{
  const root=document.getElementById('menuRoot');
  try {
    const categories=await loadIndexCategories();if (!categories.length) throw new Error('No categories');
    setupCategoryButtons(categories);await loadAllCategories(categories);setupSwitching(categories);
  } catch(error) {
    console.error(error);root.replaceChildren(errorNotice('Вкусотиите още не са пристигнали.'));
    document.getElementById('menu-title').textContent='Ще опитаме ли отново?';
    document.getElementById('categoryDescription').textContent='В момента няма връзка с менюто.';
    document.getElementById('menuButtons').replaceChildren();
  } finally {root.setAttribute('aria-busy','false');}
});
