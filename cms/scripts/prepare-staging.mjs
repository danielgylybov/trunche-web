import fs from "node:fs";
import path from "node:path";
const cms = path.resolve(import.meta.dirname, ".."),
  repo = path.dirname(cms);
const target = path.join(cms, ".wrangler", "staging-dist");
if (!fs.existsSync(path.join(cms, "dist", "index.html")))
  throw new Error("Run pnpm --dir cms build first.");
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.cpSync(path.join(cms, "dist"), target, { recursive: true });
const site = path.join(target, "site");
fs.mkdirSync(site, { recursive: true });
fs.cpSync(path.join(repo, "src"), path.join(site, "src"), { recursive: true });
for (const name of [
  "index.html",
  "terms.html",
  "gallery.html",
  "contact.html",
]) {
  let html = fs.readFileSync(path.join(repo, name), "utf8");
  html = html.replace(
    "</head>",
    '<meta name="robots" content="noindex,nofollow">\n<meta name="trunche-content-api" content="/">\n</head>',
  );
  // CMS loader is synchronous in the head: its configuration must precede it.
  html = html
    .replace('<script src="src/js/cms-source.js"></script>', "")
    .replace(
      "</head>",
      '<script src="src/js/cms-source.js"></script>\n</head>',
    );
  if (name === "contact.html") {
    html = html.replace(
      '<script src="src/js/send-message.js"></script>',
      '<script>document.getElementById("contactForm")?.addEventListener("submit",event=>event.preventDefault());const send=document.getElementById("submitButton");if(send){send.disabled=true;send.textContent="Dev преглед — изпращането е изключено";}</script>',
    );
  }
  html = html.replace(
    /(<body\b[^>]*>)/i,
    '$1<div style="background:#ffde71;color:#302447;padding:8px;text-align:center;font:700 14px sans-serif">DEV ПРЕГЛЕД · отделно тестово съдържание · <a href="/">Към админ панела</a></div>',
  );
  fs.writeFileSync(path.join(site, name), html);
}
fs.writeFileSync(
  path.join(target, "robots.txt"),
  "User-agent: *\nDisallow: /\n",
);
console.log(
  "Staging bundle ready: admin / and public redesign /site/index.html. Production HTML was not changed.",
);
