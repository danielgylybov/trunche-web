# trunche-web

This is a repo that hosts the code of the trunche.com website

## Local preview

Run `python3 -m http.server 8080` from the repository and open
`http://localhost:8080`. No build step is needed. The menu and gallery still
require access to their existing Google services.

## 2026 refresh

Shared visual styles live in `src/css/refresh.css`, loaded after the existing
styles on the four public pages. The menu supports category search, direct
category links, loading/error states, and optional product images. Add `image`
and optionally `imageType` (`product` or `partner`) in a category sheet. Contact
fields retain the existing partner presentation when no explicit image type is
provided. Rows without images remain text cards.

The proposed CMS scope and migration are in [docs/CMS-PLAN.md](docs/CMS-PLAN.md).
The refresh does not create or deploy a CMS.
