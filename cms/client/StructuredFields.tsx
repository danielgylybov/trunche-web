import {useState} from "react";
import {
  DAY_LABELS,
  PORTION_UNITS,
  type TimeSlot,
} from "../../src/js/content-fields.mjs";
export function RowList({
  value,
  onChange,
  placeholder,
  label = "Редове",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  label?: string;
}) {
  return (
    <div className="row-list" role="group" aria-label={label}>
      {value.map((line, i) => (
        <div className="structured-row" key={i}>
          <input
            aria-label={`${label} ${i + 1}`}
            value={line}
            placeholder={placeholder}
            maxLength={2000}
            onChange={(e) =>
              onChange(value.map((v, n) => (n === i ? e.target.value : v)))
            }
          />
          <button
            type="button"
            className="icon-btn danger"
            aria-label={`Премахни ред ${i + 1}`}
            onClick={() => onChange(value.filter((_, n) => n !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-button"
        onClick={() => onChange([...value, ""])}
      >
        + Добави ред
      </button>
    </div>
  );
}
export function TimeSlotsEditor({
  value,
  onChange,
}: {
  value: TimeSlot[];
  onChange: (v: TimeSlot[]) => void;
}) {
  const set = (i: number, key: string, v: string) =>
    onChange(value.map((s, n) => (n === i ? { ...s, [key]: v } : s)));
  return (
    <fieldset className="offer-fieldset time-slots">
      <legend>Часове и дни</legend>
      {value.map((s, i) => (
        <div className="time-slot" key={i}>
          <label>
            <span>Дни</span>
            <select
              aria-label={`Дни за интервал ${i + 1}`}
              value={s.days || "all"}
              onChange={(e) => set(i, "days", e.target.value)}
            >
              {Object.entries(DAY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>От</span>
            <input
              required
              type="time"
              aria-label={`Начален час ${i + 1}`}
              value={s.start}
              onChange={(e) => set(i, "start", e.target.value)}
            />
          </label>
          <label>
            <span>До</span>
            <input
              required
              type="time"
              aria-label={`Краен час ${i + 1}`}
              value={s.end}
              onChange={(e) => set(i, "end", e.target.value)}
            />
          </label>
          <button
            type="button"
            className="icon-btn danger"
            aria-label={`Премахни часови интервал ${i + 1}`}
            onClick={() => onChange(value.filter((_, n) => n !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-button"
        onClick={() =>
          onChange([...value, { days: "all", start: "10:00", end: "14:00" }])
        }
      >
        + Добави часови интервал
      </button>
    </fieldset>
  );
}
export function PortionEditor({
  value,
  onChange,
}: {
  value: { quantity: number; unit: string } | null;
  onChange: (v: { quantity: number; unit: string } | null) => void;
}) {
  const [unit,setUnit]=useState(value?.unit||'g');
  return (
    <div className="portion-editor">
      <input
        aria-label="Количество в порцията"
        type="number"
        min="0.001"
        max="100000"
        step="any"
        value={value?.quantity ?? ""}
        placeholder="Например 800"
        onChange={(e) =>
          onChange(
            e.target.value
              ? { quantity: Number(e.target.value), unit: value?.unit || unit }
              : null,
          )
        }
      />
      <select
        aria-label="Мерна единица"
        value={value?.unit || unit}
        onChange={(e) =>
          (setUnit(e.target.value),onChange(value ? { ...value, unit: e.target.value } : null))
        }
      >
        {Object.entries(PORTION_UNITS).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
