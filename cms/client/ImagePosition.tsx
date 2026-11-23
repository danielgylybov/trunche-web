import { useRef } from "react";
export function ImagePosition({
  id,
  value,
  onChange,
  portrait = false,
}: {
  id: string;
  value: { x: number; y: number };
  onChange: (v: { x: number; y: number }) => void;
  portrait?: boolean;
}) {
  const image = useRef<HTMLImageElement>(null),
    drag = useRef<{
      px: number;
      py: number;
      x: number;
      y: number;
      ox: number;
      oy: number;
    } | null>(null);
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return (
    <div className="image-position-editor">
      <div
        className={"image-position-frame " + (portrait ? "portrait" : "")}
        role="group"
        aria-label="Наместване на снимката в картата"
        onPointerDown={(e) => {
          if (e.button !== 0 || !image.current) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect(),
            img = image.current,
            scale = Math.max(
              rect.width / img.naturalWidth,
              rect.height / img.naturalHeight,
            );
          drag.current = {
            px: e.clientX,
            py: e.clientY,
            x: value.x,
            y: value.y,
            ox: img.naturalWidth * scale - rect.width,
            oy: img.naturalHeight * scale - rect.height,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d && (d.ox > 1 || d.oy > 1))
            onChange({
              x:
                d.ox > 1 ? clamp(d.x - ((e.clientX - d.px) / d.ox) * 100) : d.x,
              y:
                d.oy > 1 ? clamp(d.y - ((e.clientY - d.py) / d.oy) * 100) : d.y,
            });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <img
          ref={image}
          draggable={false}
          src={"/api/admin/media/" + id}
          alt="Снимка за наместване"
          style={{ objectPosition: `${value.x}% ${value.y}%` }}
        />
      </div>
      <p>Плъзни снимката, за да избереш коя част да се вижда.</p>
      <label>
        Хоризонтално
        <input
          type="range"
          min="0"
          max="100"
          aria-label="Хоризонтална позиция на снимката"
          value={value.x}
          onChange={(e) => onChange({ ...value, x: Number(e.target.value) })}
        />
      </label>
      <label>
        Вертикално
        <input
          type="range"
          min="0"
          max="100"
          aria-label="Вертикална позиция на снимката"
          value={value.y}
          onChange={(e) => onChange({ ...value, y: Number(e.target.value) })}
        />
      </label>
      <button
        type="button"
        className="text-button"
        onClick={() => onChange({ x: 50, y: 50 })}
      >
        Центрирай
      </button>
    </div>
  );
}
