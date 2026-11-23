// Concrete editable text slots shared by admin and public renderer.
export const pageSections = {
  "home": {
    "label": "Начало · първият екран",
    "file": "index.html",
    "location": "Горе на началната страница, до илюстрацията",
    "fields": [
      {
        "key": "eyebrow",
        "label": "Малък текст над заглавието",
        "selector": ".hero-copy .eyebrow",
        "multiline": false,
        "value": "ЕДНО ЩАСТЛИВО МЯСТО В ГОРНА БАНЯ"
      },
      {
        "key": "title",
        "label": "Голямо заглавие",
        "selector": ".hero-copy h1",
        "multiline": true,
        "value": "Тук растат\nусмивки."
      },
      {
        "key": "description",
        "label": "Текст под заглавието",
        "selector": ".hero-description",
        "multiline": true,
        "value": "Малки приключенци. Големи рождени дни.\nЦяла градина, пълна с игри и вкусотии!"
      },
      {
        "key": "body",
        "label": "Допълнителен абзац (по желание)",
        "selector": ".hero-copy [data-cms-body=\"home\"]",
        "multiline": true,
        "value": ""
      },
      {
        "key": "primaryLabel",
        "label": "Бутон към Контакти",
        "selector": ".hero-actions .btn",
        "multiline": false,
        "value": "Хайде да празнуваме!"
      },
      {
        "key": "secondaryLabel",
        "label": "Връзка към Меню и цени",
        "selector": ".hero-menu-link",
        "multiline": false,
        "value": "Какво ще хапваме?"
      },
      {
        "key": "note",
        "label": "Бележка под бутоните",
        "selector": ".hero-note",
        "multiline": false,
        "value": "Само за организирани мероприятия · София"
      },
      {
        "key": "artLabel",
        "label": "Надпис над илюстрацията",
        "selector": ".art-label",
        "multiline": false,
        "value": "Играта е навън!"
      }
    ]
  },
  "about": {
    "label": "За Трънче · представяне",
    "file": "index.html",
    "location": "Блокът За Трънче на началната страница",
    "fields": [
      {
        "key": "description",
        "label": "Малък текст над заглавието",
        "selector": "#about .eyebrow",
        "multiline": false,
        "value": "ЗДРАВЕЙ, НИЕ СМЕ ТРЪНЧЕ!"
      },
      {
        "key": "title",
        "label": "Заглавие на представянето",
        "selector": "#about h2",
        "multiline": true,
        "value": "Повече природа.\nПовече детство."
      },
      {
        "key": "body",
        "label": "Основен текст",
        "selector": "#about .about-grid > div > p:not(.eyebrow)",
        "multiline": true,
        "value": "От 2016 г. създаваме празници с любов и лично отношение. В нашата градина децата тичат, играят и се чувстват свободни — а родителите си отдъхват."
      },
      {
        "key": "buttonLabel",
        "label": "Бутон към Контакти",
        "selector": "#about .btn",
        "multiline": false,
        "value": "Къде да ни намериш"
      },
      {
        "key": "feature0Title",
        "label": "Каре 1 · заглавие",
        "selector": "#about .about-notes > div:nth-child(1) strong",
        "multiline": false,
        "value": "Цяла градина за игри"
      },
      {
        "key": "feature0Text",
        "label": "Каре 1 · текст",
        "selector": "#about .about-notes > div:nth-child(1) p",
        "multiline": true,
        "value": "На открито, в спокойната и зелена Горна баня."
      },
      {
        "key": "feature1Title",
        "label": "Каре 2 · заглавие",
        "selector": "#about .about-notes > div:nth-child(2) strong",
        "multiline": false,
        "value": "Домашно приготвена храна"
      },
      {
        "key": "feature1Text",
        "label": "Каре 2 · текст",
        "selector": "#about .about-notes > div:nth-child(2) p",
        "multiline": true,
        "value": "Любими вкусове за малки и големи гости."
      },
      {
        "key": "feature2Title",
        "label": "Каре 3 · заглавие",
        "selector": "#about .about-notes > div:nth-child(3) strong",
        "multiline": false,
        "value": "Празник с лично отношение"
      },
      {
        "key": "feature2Text",
        "label": "Каре 3 · текст",
        "selector": "#about .about-notes > div:nth-child(3) p",
        "multiline": true,
        "value": "Любезен екип, тематична декорация и много усмивки."
      }
    ]
  },
  "invitation": {
    "label": "Покана · блок на началната",
    "file": "index.html",
    "location": "Лентата Направи покана под първия екран",
    "fields": [
      {
        "key": "description",
        "label": "Малък текст над заглавието",
        "selector": ".invitation-strip .eyebrow",
        "multiline": false,
        "value": "ПЪРВО ИДВА ПОКАНАТА"
      },
      {
        "key": "title",
        "label": "Заглавие",
        "selector": ".invitation-strip h2",
        "multiline": false,
        "value": "„Идваш ли на моя рожден ден?“"
      },
      {
        "key": "body",
        "label": "Описание",
        "selector": ".invitation-strip div > p:not(.eyebrow)",
        "multiline": true,
        "value": "Име, дата и щипка вълнение. Твоята покана е готова!"
      },
      {
        "key": "buttonLabel",
        "label": "Бутон за отваряне на поканата",
        "selector": "#openModalBtn",
        "multiline": false,
        "value": "Направи покана"
      }
    ]
  },
  "contacts": {
    "label": "Контакти · заглавие и текстове",
    "file": "contact.html",
    "location": "Заглавната част на страницата Контакти; адресът и телефонът са в Контакти и работно време",
    "fields": [
      {
        "key": "title",
        "label": "Заглавие",
        "selector": "#title",
        "multiline": false,
        "value": "Да спретнем един празник!"
      },
      {
        "key": "description",
        "label": "Текст под заглавието",
        "selector": "#subtitle",
        "multiline": true,
        "value": "Разкажи ни за малкия рожденик. Ще измислим останалото заедно."
      },
      {
        "key": "body",
        "label": "Допълнителен абзац (по желание)",
        "selector": "[data-cms-body=\"contacts\"]",
        "multiline": true,
        "value": ""
      },
      {
        "key": "buttonLabel",
        "label": "Текст на бутона за Messenger",
        "selector": "[data-messenger-link]",
        "multiline": false,
        "value": "Пиши ни в Messenger"
      }
    ]
  },
  "terms": {
    "label": "Меню и цени · въвеждащи текстове",
    "file": "terms.html",
    "location": "Над категориите и предложенията; самите продукти се редактират в Меню и цени",
    "fields": [
      {
        "key": "eyebrow",
        "label": "Малък текст над заглавието",
        "selector": ".menu-intro .eyebrow",
        "multiline": false,
        "value": "ЗА ГЛАДНИ ПРИКЛЮЧЕНЦИ И ТЕХНИТЕ РОДИТЕЛИ"
      },
      {
        "key": "title",
        "label": "Заглавие над менюто",
        "selector": ".menu-intro h1",
        "multiline": false,
        "value": "М-м-м… празник!"
      },
      {
        "key": "description",
        "label": "Текст под заглавието",
        "selector": ".menu-intro h1 + p",
        "multiline": true,
        "value": "Избери нещо вкусно. Ние добавяме щипка вълшебство."
      },
      {
        "key": "body",
        "label": "Допълнителен абзац (по желание)",
        "selector": "[data-cms-body=\"terms\"]",
        "multiline": true,
        "value": ""
      },
      {
        "key": "helpTitle",
        "label": "Каре за връзка · заглавие",
        "selector": ".menu-help strong",
        "multiline": false,
        "value": "Да измислим празника заедно?"
      },
      {
        "key": "helpText",
        "label": "Каре за връзка · текст",
        "selector": ".menu-help span",
        "multiline": false,
        "value": "Пиши ни, ще помогнем."
      }
    ]
  },
  "gallery": {
    "label": "Галерия · заглавие и описание",
    "file": "gallery.html",
    "location": "Над албумите; снимките се управляват в Галерия",
    "fields": [
      {
        "key": "title",
        "label": "Заглавие на галерията",
        "selector": ".gallery-heading h1 span",
        "multiline": false,
        "value": "Ето къде растат усмивките."
      },
      {
        "key": "description",
        "label": "Текст над албумите",
        "selector": ".gallery-description",
        "multiline": true,
        "value": "Място за игри. Поводи за усмивки."
      },
      {
        "key": "body",
        "label": "Допълнителен абзац (по желание)",
        "selector": "[data-cms-body=\"gallery\"]",
        "multiline": true,
        "value": ""
      }
    ]
  },
  "footer": {
    "label": "Долна част · всички страници",
    "file": "index.html",
    "location": "Текстовете в края на всяка страница; телефонът и социалните връзки са в Контакти и работно време",
    "fields": [
      {
        "key": "title",
        "label": "Кратко послание",
        "selector": ".site-footer strong",
        "multiline": false,
        "value": "Малки хора. Големи спомени."
      },
      {
        "key": "description",
        "label": "Текст под посланието",
        "selector": ".site-footer .footer-shell > div > p",
        "multiline": true,
        "value": "Детски кът „Трънче“ · Горна баня, София"
      }
    ]
  }
};
export function pageDefaults(key){const section=pageSections[key];return section?{key,visible:true,sortOrder:0,body:"",description:"",...Object.fromEntries(section.fields.map(f=>[f.key,f.value]))}:{};}
