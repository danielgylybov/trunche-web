# Трънче CMS — Cloudflare

Работеща локална и отделна dev реализация на React админ панел, Worker API, D1 база и частно R2 хранилище. Няма създадени production ресурси и няма промяна на DNS или текущия сайт.

## Какво работи

- Категории, предложения, порции, включени продукти, варианти, партньори, правила и цени само в евро (цели евроцентове).
- Снимка към предложение: качване, автоматична WebP оптимизация в браузъра, избор от библиотеката.
- Албуми, много снимки наведнъж, прогрес и повторен опит за неуспешните файлове, описания, корица и подреждане.
- Основни текстове за начална страница, „За нас“, контакти и меню; контакти/социални връзки; съобщения с период, банер и модален прозорец. Това не е визуален редактор на всяка секция на сайта.
- Запазване на чернова, преглед на съдържанието, отделно публикуване, непроменяеми версии, връщане на предишна версия, кошче и JSON експорт на данните.
- Версии на записите предотвратяват тихо презаписване при едновременна редакция. Атомарна проверка на ревизията при публикуване.
- Production вход: валидиран Cloudflare Access JWT (подпис, issuer, audience, expiry) + разрешен активен член в D1. Няма пароли в приложението. Достъпът и членовете се настройват от разработчик; няма екран за управление на потребители.

## Локално стартиране

Нужни са Node 22.12+ или 24+ и pnpm. Данните остават в `cms/.wrangler/` и не влизат в Git.

```sh
pnpm --dir cms install --frozen-lockfile
pnpm --dir cms db:local
node cms/scripts/seed-local.mjs
# Терминал 1:
pnpm --dir cms dev:api
# Терминал 2:
pnpm --dir cms dev
```

Панел: http://127.0.0.1:5173 . Използвай точно този origin за формите. Локалният вход е разрешен само с `--env local`, `DEV_AUTH=local-only`, `ENVIRONMENT=development` и loopback URL. Production конфигурацията отхвърля `DEV_AUTH`.

`legacy-export.json` е еднократен публичен експорт на 6 категории, 55 предложения и списък на 87 снимки от стария сайт. Скриптът `export-legacy.py` чете старите Sheets; не пише в Google.

След стартиране на API:

```sh
node cms/scripts/import-media-local.mjs
node cms/scripts/import-partners-local.mjs
```

Импортът е повторяем и пише единствено локално. 87 снимки са проверени в локално R2. Четири партньорски снимки се вземат от репото; за три временни Facebook URL адреса са нужни нови оригинални файлове. Production импортът и пълният бинарен backup/restore още не са реализирани. JSON експортът включва метаданни, но не файловете.

## Публичен сайт без Sheets/Drive

`src/js/cms-source.js` се включва изрично. При активен CMS менюто, галерията и съобщенията четат публикуваната версия от Worker; няма резервно обръщане към Google. Неуспешен CMS отговор показва грешка за меню/галерия. Статичните основни текстове остават налични.

За локална проверка стартирай статичния сайт от корена (`python3 -m http.server 8080`) и отвори:

- http://localhost:8080/terms.html?cms=http://127.0.0.1:8787
- http://localhost:8080/gallery.html?cms=http://127.0.0.1:8787

Първо публикувай от локалния панел. Query override работи само на loopback; на production се използва единствено зададеният в HTML meta tag:

```html
<meta name="trunche-content-api" content="https://content.trunche.com">
```

Този tag **не е включен** в production страниците преди реалната миграция. Сегашният сайт продължава да чете старите източници до завършването ѝ. Google Maps и EmailJS са отделни услуги за карта/контактна форма; тази миграция премахва Google като CMS.

## Cloudflare setup преди deployment

1. Влез в правилния Cloudflare акаунт (`pnpm --dir cms exec wrangler login`). `trunche.com` още не е добавен. Добавянето на зоната и смяната на nameservers се правят след преглед на съществуващите DNS записи (включително поща).
2. Създай D1 `trunche-cms` и частен R2 bucket `trunche-cms-media`. Не включвай публичен `r2.dev` достъп. Въведи реалния D1 UUID в production bindings на `wrangler.jsonc`. Локалният binding остава отделен. R2 изисква активиране на услугата в акаунта; безплатните квоти не са глобален лимит за таксуване.
3. Добави два Worker Custom Domains в production конфигурацията:
   ```json
   "routes": [
     {"pattern":"admin.trunche.com","custom_domain":true},
     {"pattern":"content.trunche.com","custom_domain":true}
   ]
   ```
   Admin и публичните данни са различни hostnames. Публичният `content.trunche.com` обслужва само `/api/content` и `/media/*` без вход; всички admin endpoints и assets минават през проверка за JWT и членство независимо от hostname.
4. Създай Cloudflare Access self-hosted application за **целия `admin.trunche.com`**, OTP вход с изрично разрешени email адреси. Не защитавай публичния `content.trunche.com` с интерактивен Access login, защото посетителите трябва да могат да четат менюто и снимките. Задай `ACCESS_TEAM_DOMAIN` (https URL) и application AUD в Worker vars.
5. Приложи D1 migrations remote и добави собственика в `members` с неговия действителен email и role `owner`. Другите редактори са role `editor`. Няма разрешен production email по подразбиране. Използвай параметризирана SQL заявка/SQL файл; не записвай лични адреси в Git. Провери вход, отказ за неразрешен потребител, истекла сесия и Origin проверките в реалната среда.
6. Импортирай и сравни production съдържанието и снимките; публикувай първа версия; провери `/api/content` и публичните media URLs. Добави meta tag към публичните HTML страници и провери сайта. Едва тогава премахни старите Google loader-и/ключове. Активният сайт не бива да се превключва към празна база.

`pnpm --dir cms check:deploy` отказва незавършена конфигурация, dev auth, workers.dev и preview URLs. Това е предпазна проверка на файла, не доказателство, че Access политиката или акаунтът са настроени.

## Лимити и оставаща работа

Приложението ограничава 2000 записа (включително кошчето), 2000 снимки / 8 GB, 500 нови качвания дневно, 5000 мутиращи заявки дневно, 20 публикации дневно / 100 запазени версии. Файловете след оптимизация са до 2 MB и 2500 px. Няма автоматично преминаване на платен план, но лимитите на приложението **не гарантират нулева сметка в Cloudflare**: R2 операции и общият трафик се таксуват според акаунта. Нужни са account usage alerts и следене на употребата.

Public JSON uses a 30-second cache; media uses 60 seconds. Production edge caching applies only to public GET routes. Draft previews are no-store. Final deletion and cleanup are documented below.

Преди production са нужни: изпитан production импорт; пълен backup и възстановяване на R2; управление/почистване на стари версии и неизползвани/неуспешни файлове; наблюдение на квоти; тест на реален Access OTP вход и CORS от production домейните. При достигнат лимит записването спира с обяснение; няма скрито изтриване на версии.

## Проверки

```sh
pnpm --dir cms build
pnpm --dir cms test
# Със стартиран локален Worker; тестът създава QA записи и локална публикация:
pnpm --dir cms test:integration
```

Unit тестове: евроцентове, схема/дати/URL, публичен snapshot, скрити родители, JWT подписи и членство, Origin и dev изолация. Integration: реални локални D1/R2, конфликтни версии, upload, непублична чернова-снимка, публикация, повторена публикация с един ключ, soft delete и restore.

Документация на платформата: [Access за Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [защита преди static assets](https://developers.cloudflare.com/workers/static-assets/binding/), [R2 setup](https://developers.cloudflare.com/r2/get-started/).

## Отделна dev среда без промяна на домейна

`build:staging` подготвя един отделен Worker `trunche-cms-dev` на `workers.dev`: `/` е панелът, `/site/index.html` е редизайнът. HTML копията включват CMS адаптера към същия origin, dev надпис и `noindex`; контактната форма не изпраща истински писма. Първоначалните публични HTML файлове не се променят от пакетирането.

Dev използва собствена база `trunche-cms-dev` и частен bucket `trunche-cms-dev-media`. Копирай `wrangler.staging.example.jsonc` в игнорирания `wrangler.staging.jsonc`, въведи действителните bindings, workers.dev origin, Access team URL и отделен application AUD. Защити **целия** dev Worker / hostname с Access allowlist на одобрените тестери, включително публичния преглед. В staging Worker-ът изисква валиден JWT и членство и за `/api/content` и `/media/*`; изключването на Access на edge не отваря скрито данните.

```sh
pnpm --dir cms build:staging
node cms/scripts/export-staging.mjs
# След потвърдени отделни Cloudflare dev ресурси и реален Access:
pnpm --dir cms exec wrangler d1 migrations apply trunche-cms-dev --remote --config wrangler.staging.jsonc
node cms/scripts/import-staging.mjs APPROVED_OWNER_EMAIL
pnpm --dir cms deploy:staging
```

Експортът чете само локалния CMS и копира активните записи и използваните снимки с проверка на SHA-256 в игнорирания `.wrangler/staging-import/`. Членове и credentials не се копират. Импортът записва само в изрично именуваните dev ресурси, добавя одобрения owner и не презаписва съществуващи записи. След импорта публикувай от dev панела. `check-staging.mjs` отказва production bindings/routes и локален auth bypass. Реалната Access политика се проверява отделно в акаунта.


### Публикувана dev среда — 23 ноември 2026

- Панел: https://trunche-cms-dev.detskikuttrunche.workers.dev/
- Редизайн: https://trunche-cms-dev.detskikuttrunche.workers.dev/site/index.html
- Меню: `/site/terms.html`; галерия: `/site/gallery.html`.
- Отделни D1 и частен R2: 152 активни записа, 91 снимки (67,9 MB), първа публикувана версия. Няма production/DNS промени.
- Access е настроен чрез Cloudflare identity provider; в момента входът е с одобрения Cloudflare профил, а не с имейл OTP. Същият одобрен профил е owner в dev D1.
- Проверени са пренасочванията към Access за панела, публичния преглед, admin API, content API и снимките без сесия. Допълнителните preview URLs и публичният R2 dev URL са изключени. Пълната проверка на екраните в онлайн средата след интерактивен вход остава за първата потребителска сесия.
- Действителният акаунт, bindings и Access audience са в игнорирания `wrangler.staging.jsonc`; OAuth credentials не са в репото. Текущата версия на Worker е `fa3a6aa2-cd17-4756-89fe-a4614f8478f3`.


### Offer editing and publication review

Offer forms now expose applicable fields for products, child packages, partners, information, hours and terms. The same normalization runs on API writes and public snapshots. Empty prices produce no automatic price label. Information/hours/terms have no commercial fields. Legacy information blocks and partner inclusions are preserved.

The public CMS menu and admin previews share `src/js/menu-view.mjs`. The preview uses public CSS in an isolated shadow root. Long category labels wrap within the sidebar instead of overlapping menu cards.

Record badges compare drafts with the active publication, ignoring metadata/property order. Forms distinguish unsaved edits from saved drafts and show old/new field values. The publish dialog lists added, changed and removed visible records, including children of hidden categories/albums. A code deployment does not publish user drafts.

Validation: 27 unit/integration tests passed; browser checks covered information without prices, edit/save/publish status transitions and layout at 1280 and 390 px. Local test prices and records were restored after validation. The deployed dev Worker version above includes these changes.

## Structured editing and final deletion

Gallery supports dragging photos within an album and accessible arrow controls. Card images store a focal position shared by preview and public rendering. Hours use day/time rows; portions use quantity/unit fields. Category sections are defined once and selected in offers. Success notices dismiss after 5.5 seconds. Messenger is the default contact destination.

Apply migration 0002 before deploying. Owner-only final deletion requires a trashed record absent from the active publication and exact title confirmation. Historical releases containing that record are removed, preventing rollback to deleted content. Shared images remain; unused media can be deleted from the library. Failed object deletions are queued and retried from History. Media cache is 60 seconds; this supersedes the earlier immutable-cache note.

## Concrete page sections

The Texts editor now uses seven fixed sections in `src/js/page-fields.mjs`: home hero, about, invitation, contacts intro, menu intro, gallery intro, and shared footer. Every field has a concrete selector in the real HTML. Defaults are extracted from the existing redesign and are shown before any record is created. Existing saved edits override those defaults. Page diffs compare the first edit against visible defaults rather than reporting all fields as new.

Contacts and working hours update existing marked links, contact rows and the map via `src/js/page-content.mjs`. Partner contact links are intentionally not marked and remain independent. Unknown public email and opening hours are left empty until supplied. A missing optional map query uses the address. There is no longer a second appended contact block or detached page body. The page-binding tests exercise every editable slot using the actual four HTML files.

## Optional row prices

Commercial offer rows support either plain text or `{title, priceCents, portionSpec}`. Both quantity and price are optional; null means no amount is shown, while zero remains an explicit price. Legacy rows ending in an exact EUR amount (for example `Cream — 8бр / 19 EUR`) are parsed conservatively by `offer-lines.mjs` during normalization. Narrative information, minimum prices and ambiguous expressions remain unchanged. The editor, preview, public renderer and diff use the same values. Opening or saving the converted representation does not report a price change when the amount is unchanged.

## Web brand assets

The original `src/assets/Logo.svg` remains unchanged. `logo-web.webp` is a lossless 2x export with the transparent outer canvas reduced to viewBox `7 3 686 378`; it keeps the complete frame, cactus, lettering and colors. The export is 85,322 bytes, compared with the 1,528,440-byte original. Visible pixels were compared against a source SVG render with zero differences. Headers use the cropped asset at 180px desktop, 160px tablet and 148px mobile widths.

`logo-loading.svg` uses the six original colored letter outlines (source paths 12–22), with a sequential hop and a reduced-motion fallback. Keep the coordinate transforms on child groups: moving them to the animated groups lets CSS override the SVG transforms and hides the letters. It is used in menu/gallery initial loading, gallery image placeholders and the admin startup screen.
