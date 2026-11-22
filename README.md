# trunche-web

This is a repo that hosts the code of the trunche.com website

## Local preview

Run `python3 -m http.server 8080` from the repository and open
`http://localhost:8080`. No build step is needed. The menu requires access to its existing Google Sheets source. The gallery
uses a bundled public photo listing on localhost, because the existing Drive
API key only accepts the production origin. Photos still load from public Drive
thumbnail URLs. In production, the live API is tried first (including pagination),
with `src/data/gallery.json` as the fallback. The snapshot was exported on
2026-11-22; refresh it when the Drive album changes to keep the fallback current.

## 2026 refresh

The makeover uses locally hosted variable Nunito (Cyrillic and Latin), custom SVG
illustrations and icons, a six-category browsing interface, distinct package and
product layouts, animated network loading skeletons and image placeholders.
Animations respect reduced-motion preferences.

Shared visual styles live in `src/css/refresh.css`, loaded after the existing
styles on the four public pages. The menu supports global search across categories, direct
category links, loading/error states, and optional product images. Add `image`
and optionally `imageType` (`product` or `partner`) in a category sheet. Contact
fields retain the existing partner presentation when no explicit image type is
provided. Rows without images remain text cards.

The proposed CMS scope and migration are in [docs/CMS-PLAN.md](docs/CMS-PLAN.md).
The refresh does not create or deploy a CMS.
