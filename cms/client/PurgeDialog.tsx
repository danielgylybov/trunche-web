import { useEffect, useState } from "react";
import { api } from "./api";
import type { Entity } from "../worker/model";
export async function finishFileCleanup() {
  for (let i = 0; i < 30; i++) {
    const result = await api("cleanup", "POST", {});
    if (!result.pending) return;
  }
  throw new Error(
    "Остават файлове за почистване. Опитай отново от История и кошче.",
  );
}
export function PurgeDialog({
  entity,
  onClose,
  onSaved,
}: {
  entity: Entity;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [plan, setPlan] = useState<any>(null),
    [error, setError] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [includeImages, setIncludeImages] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        for (let i = 0; i < 30; i++) {
          const p = await api("purge-plan", "POST", {
            id: entity.id,
            version: entity.version,
          });
          if (cancelled) return;
          if (!p.indexing) {
            setPlan(p);
            return;
          }
        }
        throw new Error("Историята още се подготвя. Опитай отново.");
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [entity.id, entity.version]);
  async function remove() {
    setBusy(true);
    setError("");
    try {
      const result = await api("purge", "POST", {
        ...plan,
        confirmation,
        includeImages,
      });
      let message = "Записът е изтрит окончателно.";
      if (result.cleanupPending) {
        try {
          await finishFileCleanup();
        } catch {
          message =
            "Грешка при почистване на файловете. Записът е изтрит. Довърши почистването от История и кошче.";
        }
      }
      await onSaved(message);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-body">
      <p>
        <strong>Това действие не може да се върне.</strong>
      </p>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {!plan && !error && (
        <p role="status">Проверяваме записите и историята…</p>
      )}
      {plan && (
        <>
          <p>
            Ще се изтрие „{plan.title}“ и {plan.releaseIds.length} стари
            публикации, в които присъства. Активната публикация се запазва.
          </p>
          {plan.imageIds.length > 0 && (
            <label className="check">
              <input
                type="checkbox"
                checked={includeImages}
                onChange={(e) => setIncludeImages(e.target.checked)}
              />
              Изтрий и снимките, ако не се използват никъде другаде
            </label>
          )}
          <label className="field">
            <span>Напиши заглавието за потвърждение: {plan.title}</span>
            <input
              autoComplete="off"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={onClose}
            >
              Отказ
            </button>
            <button
              type="button"
              className="btn danger-solid"
              disabled={busy || confirmation !== plan.title}
              onClick={remove}
            >
              {busy ? "Изтриване…" : "Изтрий окончателно"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
export function DeleteMedia({
  id,
  onClose,
  onDeleted,
}: {
  id: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      const r = await api("media/" + id, "DELETE", { confirmation });
      if (r.cleanupPending) await finishFileCleanup();
      onDeleted();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-body">
      <p>
        Файлът ще бъде изтрит завинаги. Използвани снимки са защитени,
        включително в кошчето и историята.
      </p>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <label className="field">
        <span>Напиши ИЗТРИЙ за потвърждение</span>
        <input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </label>
      <div className="button-row">
        <button
          type="button"
          className="btn secondary"
          onClick={onClose}
          disabled={busy}
        >
          Отказ
        </button>
        <button
          type="button"
          className="btn danger-solid"
          disabled={busy || confirmation !== "ИЗТРИЙ"}
          onClick={remove}
        >
          Изтрий файла окончателно
        </button>
      </div>
    </div>
  );
}
