import { useEffect, useRef } from "react";
import { renderOffer, renderOfferCategory } from "../../src/js/menu-view.mjs";
import menuCSS from "../../src/css/refresh.css?raw";
const css =
  menuCSS.replace(/@font-face\s*\{[^}]*\}/g, "").replace(":root{", ":host{") +
  `\n:host{display:block;font-family:Nunito,sans-serif;color:var(--ink);line-height:1.65}*{box-sizing:border-box}h4{margin:0}.menu-category[hidden]{display:block!important}.menu-category{animation:none}.menu-card{width:100%}.menu-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.menu-details{padding:0}.single .menu-card{grid-column:auto}@media(max-width:767px){.menu-card-grid{grid-template-columns:1fr}}`;
export function MenuPreview({
  data,
  categoryId,
  entities,
}: {
  data?: Record<string, any>;
  categoryId?: string;
  entities?: { data: Record<string, any> }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root =
      ref.current!.shadowRoot || ref.current!.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = css;
    const options = { mediaURL: (id: string) => "/api/admin/media/" + id };
    const card = data
      ? renderOffer(data, options)
      : renderOfferCategory(categoryId!, entities || [], options);
    root.replaceChildren(style, card);
  }, [data, categoryId, entities]);
  return (
    <div
      ref={ref}
      className="public-menu-preview"
      aria-label="Как ще изглежда в сайта"
    />
  );
}
