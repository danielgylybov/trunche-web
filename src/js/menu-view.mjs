import {parsePricedLine,lineData} from "./offer-lines.mjs";
import {
  formatPortion,
  parsePortion,
  timeSlotsFor,
  formatTimeSlot,
} from "./content-fields.mjs";
// Shared content rules and card renderer for the public menu and admin previews.
export const offerKinds = {
  product: {
    label: "Продукт",
    price: true,
    portion: true,
    image: true,
    contacts: false,
    variants: true,
    listLabel: "Състав / допълнения",
    bodyLabel: "Кратко описание",
  },
  package: {
    label: "Детски куверт",
    price: true,
    portion: false,
    image: true,
    contacts: false,
    variants: true,
    listLabel: "Какво включва кувертът",
    bodyLabel: "Описание на куверта",
  },
  partner: {
    label: "Партньор / услуга",
    price: true,
    portion: false,
    image: true,
    contacts: true,
    variants: true,
    listLabel: "Какво включва услугата",
    bodyLabel: "Описание на услугата",
  },
  info: {
    label: "Важна информация",
    price: false,
    portion: false,
    image: false,
    contacts: false,
    variants: false,
    listLabel: "Допълнителни точки",
    bodyLabel: "Текст на съобщението",
  },
  hours: {
    label: "Работно време / часове",
    price: false,
    portion: false,
    image: false,
    contacts: false,
    variants: false,
    listLabel: "Часове / интервали",
    bodyLabel: "Пояснение към часовете",
  },
  rich: {
    label: "Текст и условия",
    price: false,
    portion: false,
    image: false,
    contacts: false,
    variants: false,
    listLabel: "Условия на отделни редове",
    bodyLabel: "Съдържание",
  },
};
export const cleanMenuTitle = (value) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D|\u20E3/gu, "")
    .trim();
export function offerKind(data = {}) {
  // Legacy information blocks were stored as unpriced products. Recognize the
  // two explicit information titles without changing unpriced food variants.
  if (
    data.kind === "product" &&
    data.priceCents == null &&
    !data.variants?.length &&
    /^(допълнителна информация|общи условия и правила)$/i.test(
      cleanMenuTitle(data.title),
    )
  )
    return "info";
  return data.kind in offerKinds ? data.kind : "product";
}
export function normalizeOffer(data = {}) {
  const kind = offerKind(data),
    rules = offerKinds[kind];
  const textOnly = !rules.price;
  const promoted = textOnly && !data.description && data.note;
  return {
    ...data,
    kind,
    description: promoted ? data.note : data.description || "",
    note: promoted ? "" : data.note || "",
    priceCents: rules.price ? (data.priceCents ?? null) : null,
    portionSpec: rules.portion
      ? data.portionSpec || parsePortion(data.portion)
      : null,
    portion: rules.portion
      ? formatPortion(data.portionSpec || parsePortion(data.portion)) ||
        data.portion ||
        ""
      : "",
    timeSlots: kind === "hours" ? timeSlotsFor(data) : [],
    imagePosition: rules.image
      ? data.imagePosition || { x: 50, y: 50 }
      : { x: 50, y: 50 },
    imageId: rules.image ? data.imageId || null : null,
    phone: rules.contacts ? data.phone || "" : "",
    facebook: rules.contacts ? data.facebook || "" : "",
    website: rules.contacts ? data.website || "" : "",
    galleryAlbumId: rules.contacts && /^[a-zA-Z0-9-]{1,80}$/.test(data.galleryAlbumId||"") ? data.galleryAlbumId : null,
    variants: rules.variants ? data.variants || [] : [],
    inclusions:
      kind === "hours" && timeSlotsFor(data).length
        ? []
        : (data.inclusions || []).filter((line) => typeof line==='string'?line.trim():line?.title?.trim()).map(line=>rules.price?(parsePricedLine(line)||line):(typeof line==='string'?line:line.title)),
  };
}
export const offerMoney = (cents) =>
  cents == null
    ? ""
    : new Intl.NumberFormat("bg-BG", {
        style: "currency",
        currency: "EUR",
      }).format(cents / 100);
function node(tag, className, text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text != null) result.textContent = String(text);
  return result;
}
function safeLink(value) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}
export function renderOffer(input, options = {}) {
  const d = normalizeOffer(input),
    kind = d.kind,
    rules = offerKinds[kind];
  const card = node(
    "article",
    "menu-card menu-card--" + ({ rich: "text" }[kind] || kind),
  );
  card.dataset.menuCard = "";
  card.dataset.kind = kind;
  if (rules.price) card.dataset.product = "";
  const body = node("div", "menu-card-body"),
    heading = node("div", "menu-item-heading");
  heading.append(
    node("h4", "menu-item-title", cleanMenuTitle(d.title) || rules.label),
  );
  const price = offerMoney(d.priceCents);
  if (price && kind !== "partner")
    heading.append(node("div", "menu-price", price));
  function photo(partner) {
    if (!d.imageId || !options.mediaURL) return null;
    const img = node("img", partner ? "partner-image" : "product-image");
    img.src = options.mediaURL(d.imageId);
    img.alt = cleanMenuTitle(d.title);
    img.style.objectPosition = `${d.imagePosition.x}% ${d.imagePosition.y}%`;
    img.loading = "lazy";
    img.decoding = "async";
    if (!partner) {
      img.addEventListener("load", () =>
        img.parentElement?.classList.add("is-loaded"),
      );
      img.addEventListener("error", () => img.parentElement?.remove());
    }
    return img;
  }
  if (kind === "partner") {
    const header = node("div", "partner-header"),
      image = photo(true);
    if (image) header.append(image);
    header.append(heading);
    body.append(header);
    if (price) body.append(node("div", "menu-price", price));
  } else {
    const image = photo(false);
    if (image) {
      const frame = node("div", "menu-photo-frame");
      image.classList.add("is-loaded");
      frame.append(image);
      card.append(frame);
    }
    body.append(heading);
  }
  for (const [value, cls] of [
    [d.portion, "menu-item-description"],
    [d.description, "menu-item-description"],
  ])
    if (value) body.append(node("p", cls, value));
  if (kind === "hours" && d.timeSlots.length) {
    const hours = node("div", "hours-values");
    d.timeSlots.forEach((slot) =>
      hours.append(node("span", "", formatTimeSlot(slot))),
    );
    body.append(hours);
  } else if (d.inclusions.length) {
    if (kind === "hours") {
      const hours = node("div", "hours-values");
      d.inclusions.forEach((line) => hours.append(node("span", "", line)));
      body.append(hours);
    } else {
      const list = node("ul", "menu-details");
      d.inclusions.forEach((line) => {
        const item = node("li");
        const value=lineData(line);
        const text=node('span','',cleanMenuTitle(value.title));
        const quantity=formatPortion(value.portionSpec);
        if(quantity)text.append(node('small','menu-line-portion',' · '+quantity));
        item.append(text);
        const amount=offerMoney(value.priceCents);
        if(amount){item.classList.add('menu-priced-line');item.append(node('span','detail-price',amount));}
        list.append(item);
      });
      body.append(list);
    }
  }
  if (d.variants.length) {
    const list = node("ul", "menu-details partner-rates");
    for (const variant of d.variants) {
      const item = node("li");
      item.append(
        node(
          "span",
          "",
          [variant.title, variant.detail].filter(Boolean).join(" · "),
        ),
      );
      const amount = offerMoney(variant.priceCents);
      if (amount) item.append(node("span", "detail-price", amount));
      list.append(item);
    }
    body.append(list);
  }
  if (d.note) body.append(node("p", "menu-item-note", d.note));
  if (rules.contacts) {
    const contacts = node("p", "contact-links");
    if (d.phone) {
      const link = node("a", "", d.phone);
      link.href = "tel:" + d.phone.replace(/[^+\d]/g, "");
      contacts.append(link);
    }
    for (const [key, label] of [
      ["facebook", "Facebook"],
      ["website", "Уебсайт"],
    ]) {
      const href = safeLink(d[key]);
      if (href) {
        const link = node("a", "", label);
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener";
        if (key === "facebook") {
          const icon = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
          );
          icon.classList.add("social-icon");
          icon.setAttribute("aria-hidden", "true");
          const use = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "use",
          );
          use.setAttribute(
            "href",
            new URL("../assets/social-icons.svg", import.meta.url).href +
              "#facebook",
          );
          icon.append(use);
          link.prepend(icon);
        }
        contacts.append(link);
      }
    }
    if (contacts.childNodes.length) body.append(contacts);
  }
  if(d.galleryAlbumId){
    const link=node('a','btn menu-gallery-link','Виж снимки в галерията');
    let base=options.galleryURL||'gallery.html';
    if(!options.galleryURL && typeof location!=='undefined' && ['localhost','127.0.0.1'].includes(location.hostname)){const cms=new URLSearchParams(location.search).get('cms');if(cms)base+='?cms='+encodeURIComponent(cms);}
    link.href=base+'#album='+encodeURIComponent(d.galleryAlbumId);
    body.append(link);
  }
  card.append(body);
  return card;
}
export function renderOfferCategory(categoryId, entities, options = {}) {
  const wrapper = node("div", "menu-category");
  wrapper.id = categoryId;
  wrapper.hidden = true;
  wrapper.setAttribute("role", "region");
  let previous, grid;
  for (const entity of [...entities].sort(
    (a, b) => (a.data.sortOrder || 0) - (b.data.sortOrder || 0),
  )) {
    const d = entity.data;
    if (d.categoryId !== categoryId || d.visible === false) continue;
    if (!grid || d.section !== previous) {
      const group = node("div", "menu-group");
      if (d.section)
        group.append(
          node("h3", "menu-group-heading", cleanMenuTitle(d.section)),
        );
      grid = node("div", "menu-card-grid");
      group.append(grid);
      wrapper.append(group);
      previous = d.section;
    }
    grid.append(renderOffer(d, options));
  }
  return wrapper;
}
