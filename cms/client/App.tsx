import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Images,
  FileText,
  CalendarDays,
  Settings,
  Plus,
  Search,
  Upload,
  Eye,
  CloudUpload,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  X,
  ImagePlus,
  Trash2,
  Check,
  LoaderCircle,
  Menu,
  Copy,
  History,
  Download,
  RotateCcw,
  LogOut,
  Camera,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { api, save, uploadPhoto, type State, type Media } from "./api";
import {
  money,
  parseEuro,
  type Entity,
  type EntityType,
} from "../worker/model";
import logo from "../../src/assets/Logo.svg";
const nav = [
  ["home", "Начало", LayoutDashboard],
  ["menu", "Меню и цени", UtensilsCrossed],
  ["gallery", "Галерия", Images],
  ["pages", "Страници и контакти", FileText],
  ["announcements", "Съобщения и отпуск", CalendarDays],
  ["history", "История и кошче", History],
  ["settings", "Настройки", Settings],
] as const;
const kindNames: Record<string, string> = {
  product: "Продукт",
  package: "Детски куверт",
  partner: "Партньор / услуга",
  info: "Важна информация",
  hours: "Работно време",
  rich: "Текст и условия",
};
const mediaURL = (id: string) => "/api/admin/media/" + id;
const order = (a: Entity, b: Entity) =>
  (a.data.sortOrder || 0) - (b.data.sortOrder || 0) ||
  a.data.title.localeCompare(b.data.title, "bg");
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"dialog " + (wide ? "dialog-wide" : "")}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="dialog-header">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Затвори" onClick={onClose}>
          <X size={22} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="error" role="alert">
      <AlertCircle size={19} />
      <span>{message}</span>
    </div>
  ) : null;
}
function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <ImagePlus size={30} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
function PhotoPicker({
  id,
  onChange,
  media,
}: {
  id: string | null;
  onChange: (id: string | null) => void;
  media: Media[];
}) {
  const [error, setError] = useState(""),
    [progress, setProgress] = useState<number | null>(null),
    [library, setLibrary] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    setProgress(0);
    try {
      const uploaded = await uploadPhoto(file, setProgress);
      onChange(uploaded.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="photo-picker">
      {id ? (
        <img className="chosen-photo" src={mediaURL(id)} alt="Избрана снимка" />
      ) : (
        <div className="photo-placeholder">
          <Camera size={34} />
          <strong>Снимка по желание</strong>
          <span>Показваме продукта добре и без нея.</span>
        </div>
      )}
      <div className="button-row">
        <button
          className="btn secondary"
          type="button"
          disabled={progress !== null}
          onClick={() => input.current?.click()}
        >
          <Upload size={17} />
          {progress === null ? "Качи снимка" : `${progress}%`}
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => setLibrary(true)}
        >
          От библиотеката
        </button>
        {id && (
          <button
            className="text-button danger"
            type="button"
            onClick={() => onChange(null)}
          >
            Премахни
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <ErrorBox message={error} />
      <small>JPEG, PNG или WebP · оптимизираме я автоматично.</small>
      {library && (
        <Modal title="Избери снимка" onClose={() => setLibrary(false)}>
          <div className="modal-body">
            <div className="media-grid">
              {media.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="media-choice"
                  onClick={() => {
                    onChange(m.id);
                    setLibrary(false);
                  }}
                >
                  <img
                    loading="lazy"
                    src={mediaURL(m.id)}
                    alt="Снимка от библиотеката"
                  />
                </button>
              ))}
            </div>
            {!media.length && (
              <p>Библиотеката е празна. Качи първата снимка.</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
function ProductForm({
  entity,
  categories,
  media,
  onClose,
  onSaved,
  duplicate = false,
  initialCategoryId,
}: {
  initialCategoryId?: string;
  entity?: Entity;
  categories: Entity[];
  media: Media[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  duplicate?: boolean;
}) {
  const initial = entity?.data || {};
  const [data, setData] = useState<Record<string, any>>({
    title: "",
    categoryId: initialCategoryId || categories[0]?.id || "",
    section: "",
    description: "",
    priceCents: null,
    portion: "",
    kind: "product",
    inclusions: [],
    variants: [],
    note: "",
    imageId: null,
    phone: "",
    website: "",
    facebook: "",
    visible: true,
    sortOrder: 0,
    ...initial,
    ...(duplicate ? { title: initial.title + " — копие" } : {}),
  });
  const [price, setPrice] = useState(
    initial.priceCents == null
      ? ""
      : (initial.priceCents / 100).toFixed(2).replace(".", ","),
  );
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [dirty, setDirty] = useState(false);
  const update = (key: string, value: any) => {
    setData((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };
  const close = () => {
    if (!dirty || confirm("Има незапазени промени. Да затворим без запазване?"))
      onClose();
  };
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await save(
        "product",
        { ...data, priceCents: price.trim() ? parseEuro(price) : null },
        duplicate ? undefined : entity,
      );
      setDirty(false);
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={
        duplicate
          ? "Дублиране на предложение"
          : entity
            ? "Редакция на предложение"
            : "Ново предложение"
      }
      onClose={close}
      wide
    >
      <form onSubmit={submit}>
        <div className="editor-layout">
          <div className="editor-fields">
            <p className="form-intro">
              Любимите вкусове започват с няколко лесни полета.
            </p>
            <ErrorBox message={error} />
            <Field label="Име на предложението">
              <input
                required
                maxLength={200}
                autoFocus
                value={data.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Например Пица Маргарита"
              />
            </Field>
            <div className="field-row">
              <Field label="Категория">
                <select
                  required
                  value={data.categoryId}
                  onChange={(e) => update("categoryId", e.target.value)}
                >
                  <option value="" disabled>
                    Избери категория
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.data.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Вид предложение">
                <select
                  value={data.kind}
                  onChange={(e) => update("kind", e.target.value)}
                >
                  {Object.entries(kindNames).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="field-row">
              <Field
                label="Цена в евро"
                hint="Остави празно за цена по запитване."
              >
                <div className="price-input">
                  <input
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="14,50"
                  />
                  <span>€</span>
                </div>
              </Field>
              <Field label="Грамаж / порция">
                <input
                  value={data.portion}
                  onChange={(e) => update("portion", e.target.value)}
                  placeholder="Например 800 г или 8 броя"
                />
              </Field>
            </div>
            <Field label="Кратко описание">
              <textarea
                rows={3}
                maxLength={4000}
                value={data.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Какво има в това вкусно предложение?"
              />
            </Field>
            <Field
              label="Какво включва"
              hint="Всяко предложение на отделен ред."
            >
              <textarea
                rows={4}
                value={data.inclusions.join("\n")}
                onChange={(e) =>
                  update("inclusions", e.target.value.split("\n"))
                }
                placeholder={"Чийзбургер\nПържени картофи\nСок или вода"}
              />
            </Field>
            <details className="advanced">
              <summary>Допълнителни подробности</summary>
              <Field label="Подзаглавие в категорията">
                <input
                  value={data.section}
                  onChange={(e) => update("section", e.target.value)}
                  placeholder="Например Студени плата"
                />
              </Field>
              <Field label="Важна бележка">
                <textarea
                  rows={3}
                  value={data.note}
                  onChange={(e) => update("note", e.target.value)}
                />
              </Field>
              <Field label="Телефон">
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </Field>
              <Field label="Facebook">
                <input
                  type="url"
                  value={data.facebook}
                  onChange={(e) => update("facebook", e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Уебсайт">
                <input
                  type="url"
                  value={data.website}
                  onChange={(e) => update("website", e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <div className="variant-header">
                <strong>Варианти и услуги</strong>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    update("variants", [
                      ...data.variants,
                      { title: "", priceCents: null, detail: "" },
                    ])
                  }
                >
                  + Добави вариант
                </button>
              </div>
              {data.variants.map((v: any, i: number) => (
                <div className="variant" key={i}>
                  <input
                    aria-label={`Име на вариант ${i + 1}`}
                    value={v.title}
                    placeholder="90 минути"
                    onChange={(e) =>
                      update(
                        "variants",
                        data.variants.map((r: any, n: number) =>
                          n === i ? { ...r, title: e.target.value } : r,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Цена на вариант ${i + 1} в евро`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="€"
                    value={v.priceCents === null ? "" : v.priceCents / 100}
                    onChange={(e) =>
                      update(
                        "variants",
                        data.variants.map((r: any, n: number) =>
                          n === i
                            ? {
                                ...r,
                                priceCents:
                                  e.target.value === ""
                                    ? null
                                    : Math.round(Number(e.target.value) * 100),
                              }
                            : r,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Премахни вариант"
                    onClick={() =>
                      update(
                        "variants",
                        data.variants.filter((_: any, n: number) => n !== i),
                      )
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </details>
            <label className="check">
              <input
                type="checkbox"
                checked={data.visible}
                onChange={(e) => update("visible", e.target.checked)}
              />
              Показвай в публичното меню
            </label>
          </div>
          <aside className="editor-preview">
            <p className="eyebrow">СНИМКА НА ПРЕДЛОЖЕНИЕТО</p>
            <PhotoPicker
              id={data.imageId}
              onChange={(id) => update("imageId", id)}
              media={media}
            />
            <div className="product-preview">
              <span className="pill">{kindNames[data.kind]}</span>
              <h3>{data.title || "Името на предложението"}</h3>
              <strong>{price ? price + " €" : "Цена по запитване"}</strong>
              <p>{data.portion}</p>
              <p>{data.description || "Описанието ще се покаже тук."}</p>
              {data.inclusions
                .filter(Boolean)
                .map((line: string, i: number) => (
                  <p className="included" key={i}>
                    <Check size={16} />
                    {line}
                  </p>
                ))}
            </div>
          </aside>
        </div>
        <footer className="dialog-footer">
          <span>
            {dirty
              ? "Има незапазени промени"
              : "Запазването не публикува на сайта."}
          </span>
          <button type="button" className="btn secondary" onClick={close}>
            Отказ
          </button>
          <button
            className="btn primary"
            disabled={saving || !categories.length}
          >
            {saving ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Check size={18} />
            )}
            Запази чернова
          </button>
        </footer>
      </form>
    </Modal>
  );
}
function SimpleForm({
  type,
  entity,
  media,
  onClose,
  onSaved,
}: {
  type: EntityType;
  entity?: Entity;
  media: Media[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const defaults: Record<string, any> = {
    category: {
      title: "",
      slug: "",
      description: "",
      icon: "cake",
      visible: true,
      sortOrder: 0,
    },
    album: {
      title: "",
      description: "",
      coverId: null,
      visible: true,
      sortOrder: 0,
    },
    photo: {
      title: "",
      albumId: "",
      imageId: "",
      alt: "",
      caption: "",
      visible: true,
      sortOrder: 0,
    },
    page: {
      title: "",
      key: "home",
      body: "",
      description: "",
      visible: true,
      sortOrder: 0,
    },
    announcement: {
      title: "",
      message: "",
      start: new Date().toISOString().slice(0, 10),
      end: new Date().toISOString().slice(0, 10),
      banner: true,
      modal: false,
      frequency: "once_per_day",
      buttonLabel: "Свържи се с нас",
      buttonUrl: "",
      visible: true,
      sortOrder: 0,
    },
    settings: {
      title: "Трънче",
      phone: "",
      address: "",
      facebook: "",
      instagram: "",
      contactEmail: "",
      workingHours: "",
    },
  };
  const [data, setData] = useState<Record<string, any>>({
      ...defaults[type],
      ...entity?.data,
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false);
  const update = (key: string, value: any) => {
    setData((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };
  const close = () => {
    if (!dirty || confirm("Има незапазени промени. Да затворим без запазване?"))
      onClose();
  };
  const field = (
    key: string,
    label: string,
    multiline = false,
    inputType = "text",
  ) => (
    <Field key={key} label={label}>
      {multiline ? (
        <textarea
          rows={5}
          value={data[key] || ""}
          onChange={(e) => update(key, e.target.value)}
        />
      ) : (
        <input
          type={inputType}
          required={key === "title" || key === "alt"}
          value={data[key] || ""}
          onChange={(e) => update(key, e.target.value)}
        />
      )}
    </Field>
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await save(type, data, entity);
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        entity
          ? "Редакция"
          : type === "album"
            ? "Нов албум"
            : type === "category"
              ? "Нова категория"
              : "Нов запис"
      }
      onClose={close}
    >
      <form onSubmit={submit}>
        <div className="modal-body">
          <ErrorBox message={error} />
          {field("title", "Име / заглавие")}
          {type === "category" && (
            <>
              {field("slug", "Адрес на категорията (с латински букви)")}
              <Field label="Икона">
                <select
                  value={data.icon}
                  onChange={(e) => update("icon", e.target.value)}
                >
                  {[
                    ["cake", "Торта"],
                    ["pizza", "Пица"],
                    ["sweet", "Десерт"],
                    ["drink", "Напитка"],
                    ["party", "Празник"],
                    ["rules", "Условия"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {["category", "album", "page"].includes(type) &&
            field("description", "Кратко описание", true)}
          {type === "album" && (
            <>
              <p>Корица на албума</p>
              <PhotoPicker
                id={data.coverId}
                onChange={(id) => update("coverId", id)}
                media={media}
              />
            </>
          )}
          {type === "photo" && (
            <>
              {field("alt", "Какво има на снимката?")}
              {field("caption", "Надпис", true)}
            </>
          )}
          {type === "page" && (
            <>
              <Field label="Страница">
                <select
                  value={data.key}
                  onChange={(e) => update("key", e.target.value)}
                >
                  {[
                    ["home", "Начало"],
                    ["about", "За нас"],
                    ["contacts", "Контакти"],
                    ["terms", "Условия"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              {field("body", "Съдържание", true)}
            </>
          )}
          {type === "announcement" && (
            <>
              {field("message", "Съобщение", true)}
              <div className="field-row">
                {field("start", "От дата", false, "date")}
                {field("end", "До дата", false, "date")}
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={data.banner}
                  onChange={(e) => update("banner", e.target.checked)}
                />
                Показвай като банер
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={data.modal}
                  onChange={(e) => update("modal", e.target.checked)}
                />
                Показвай като прозорец
              </label>
              <Field label="Колко често да се показва прозорецът">
                <select
                  value={data.frequency}
                  onChange={(e) => update("frequency", e.target.value)}
                >
                  {[
                    ["always", "Всеки път"],
                    ["once_per_session", "Веднъж на посещение"],
                    ["once_per_day", "Веднъж дневно"],
                    ["once_per_period", "Веднъж за периода"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              {field("buttonLabel", "Текст на бутона")}
              {field("buttonUrl", "Връзка на бутона", false, "url")}
            </>
          )}
          {type === "settings" && (
            <>
              {field("phone", "Телефон", false, "tel")}
              {field("address", "Адрес")}
              {field("facebook", "Facebook", false, "url")}
              {field("instagram", "Instagram", false, "url")}
              {field("contactEmail", "Публичен имейл", false, "email")}
              {field("workingHours", "Работно време", true)}
              <p className="muted">
                Всички цени са само в евро. Получателят на контактната форма се
                настройва отделно при свързването.
              </p>
            </>
          )}
          {["category", "album"].includes(type) && (
            <Field
              label="Позиция в списъка"
              hint="По-малкото число се показва първо."
            >
              <input
                type="number"
                min={0}
                max={100000}
                value={data.sortOrder}
                onChange={(e) => update("sortOrder", Number(e.target.value))}
              />
            </Field>
          )}
          {type !== "settings" && (
            <label className="check">
              <input
                type="checkbox"
                checked={data.visible}
                onChange={(e) => update("visible", e.target.checked)}
              />
              Показвай на сайта
            </label>
          )}
        </div>
        <footer className="dialog-footer">
          <button type="button" className="btn secondary" onClick={close}>
            Отказ
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <Check size={18} />
            )}
            Запази чернова
          </button>
        </footer>
      </form>
    </Modal>
  );
}
function GalleryUpload({
  album,
  startOrder,
  onClose,
  onSaved,
}: {
  startOrder: number;
  album: Entity;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [queue, setQueue] = useState<
      {
        file: File;
        status: string;
        progress: number;
        error: string;
        mediaId?: string;
      }[]
    >([]),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function run() {
    setBusy(true);
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === "done") continue;
      setQueue((q) =>
        q.map((r, n) =>
          n === i ? { ...r, status: "uploading", error: "" } : r,
        ),
      );
      try {
        let id = queue[i].mediaId;
        if (!id) {
          const uploaded = await uploadPhoto(queue[i].file, (n) =>
            setQueue((q) =>
              q.map((r, j) => (j === i ? { ...r, progress: n } : r)),
            ),
          );
          id = uploaded.id;
          setQueue((q) =>
            q.map((r, j) => (j === i ? { ...r, mediaId: id } : r)),
          );
        }
        const title = queue[i].file.name.replace(/\.[^.]+$/, "");
        await save("photo", {
          title,
          albumId: album.id,
          imageId: id,
          alt: album.data.title + " — " + title,
          caption: "",
          sortOrder: startOrder + i,
          visible: true,
        });
        setQueue((q) =>
          q.map((r, n) =>
            n === i ? { ...r, status: "done", progress: 100 } : r,
          ),
        );
      } catch (e) {
        setQueue((q) =>
          q.map((r, n) =>
            n === i
              ? { ...r, status: "failed", error: (e as Error).message }
              : r,
          ),
        );
      }
    }
    await onSaved();
    setBusy(false);
  }
  const complete = queue.length > 0 && queue.every((q) => q.status === "done");
  return (
    <Modal
      title={"Снимки за „" + album.data.title + "“"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="modal-body">
        <button
          className="upload-drop"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Upload size={32} />
          <strong>Избери снимки от устройството</strong>
          <span>Може няколко наведнъж · JPEG, PNG, WebP</span>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          multiple
          onChange={(e) => {
            setQueue((q) => [
              ...q,
              ...Array.from(e.target.files || []).map((file) => ({
                file,
                status: "waiting",
                progress: 0,
                error: "",
              })),
            ]);
            e.target.value = "";
          }}
        />
        <div className="upload-queue">
          {queue.map((q, i) => (
            <div key={i} className={"upload-item " + q.status}>
              <div>
                {q.status === "done" ? (
                  <Check size={20} />
                ) : q.status === "uploading" ? (
                  <LoaderCircle size={20} className="spin" />
                ) : (
                  <Camera size={20} />
                )}
              </div>
              <div>
                <strong>{q.file.name}</strong>
                <small>
                  {q.status === "done"
                    ? "Качена и запазена като чернова"
                    : q.error ||
                      (q.status === "uploading" && `Качване ${q.progress}%`) ||
                      "Готова за качване"}
                </small>
                {q.status === "uploading" && (
                  <progress value={q.progress} max={100} />
                )}
              </div>
              {!busy && q.status !== "done" && (
                <button
                  className="icon-btn"
                  aria-label="Премахни от списъка"
                  onClick={() =>
                    setQueue((rows) => rows.filter((_, n) => n !== i))
                  }
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <footer className="dialog-footer">
        <span>Качените снимки остават чернови.</span>
        <button className="btn secondary" disabled={busy} onClick={onClose}>
          {complete ? "Готово" : "Затвори"}
        </button>
        {!complete && (
          <button
            className="btn primary"
            disabled={busy || !queue.length}
            onClick={run}
          >
            {busy ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <Upload size={18} />
            )}
            Качи {queue.filter((q) => q.status !== "done").length || ""} снимки
          </button>
        )}
      </footer>
    </Modal>
  );
}
export default function App() {
  const [state, setState] = useState<State | null>(null),
    [fatal, setFatal] = useState(""),
    [notice, setNotice] = useState(""),
    [view, setView] = useState("home"),
    [mobileNav, setMobileNav] = useState(false),
    [category, setCategory] = useState(""),
    [album, setAlbum] = useState(""),
    [search, setSearch] = useState(""),
    [editor, setEditor] = useState<{
      type: EntityType;
      entity?: Entity;
      duplicate?: boolean;
    } | null>(null),
    [uploadAlbum, setUploadAlbum] = useState<Entity | null>(null),
    [publishing, setPublishing] = useState(false),
    [preview, setPreview] = useState<any>(null);
  const publishRequest = useRef<{ revision: number; key: string } | null>(null);
  const load = useCallback(async () => {
    const data = await api<State>("state");
    setState(data);
    setFatal("");
  }, []);
  useEffect(() => {
    load().catch((e) => setFatal(e.message));
  }, [load]);
  const all = state?.entities.filter((e) => !e.deletedAt) || [];
  const categories = all.filter((e) => e.type === "category").sort(order),
    albums = all.filter((e) => e.type === "album").sort(order),
    products = all.filter((e) => e.type === "product").sort(order);
  const chosenCategory =
      categories.find((c) => c.id === category) || categories[0],
    chosenAlbum = albums.find((a) => a.id === album) || albums[0];
  async function action(
    fn: () => Promise<any>,
    success = "Промяната е запазена като чернова.",
  ) {
    try {
      setNotice("");
      await fn();
      await load();
      setNotice(success);
    } catch (e) {
      setNotice("Грешка: " + (e as Error).message);
    }
  }
  async function remove(entity: Entity) {
    if (confirm(`Да преместим „${entity.data.title}“ в кошчето?`))
      await action(() =>
        api("entities/" + entity.type + "/" + entity.id, "DELETE", {
          version: entity.version,
        }),
      );
  }
  async function move(items: Entity[], index: number, direction: number) {
    const copy = [...items];
    const other = index + direction;
    if (other < 0 || other >= copy.length) return;
    [copy[index], copy[other]] = [copy[other], copy[index]];
    await action(() =>
      api("reorder", "POST", {
        items: copy.map((e) => ({ id: e.id, version: e.version })),
      }),
    );
  }
  async function publish() {
    if (!state) return;
    if (
      !confirm(
        "Да публикуваме всички запазени чернови?" +
          (state.user.local ? " Това е само локална публикация." : ""),
      )
    )
      return;
    setPublishing(true);
    setNotice("");
    try {
      if (publishRequest.current?.revision !== state.state.draft_revision)
        publishRequest.current = {
          revision: state.state.draft_revision,
          key: crypto.randomUUID(),
        };
      const result = await api(
        "publish",
        "POST",
        { revision: state.state.draft_revision },
        { "Idempotency-Key": publishRequest.current.key },
      );
      const response = await fetch("/api/content?verify=" + result.releaseId, {
        cache: "no-store",
      });
      const content: any = await response.json();
      if (!response.ok || content.releaseId !== result.releaseId)
        throw new Error(
          "Версията е записана, но още не е потвърдена като активна. Презареди след малко.",
        );
      await load();
      setNotice(
        state.user.local
          ? "Локалната публикация е готова. Публичният сайт не е променен."
          : "Публикацията е активна.",
      );
    } catch (e) {
      setNotice("Грешка: " + (e as Error).message);
    } finally {
      setPublishing(false);
    }
  }
  if (!state)
    return (
      <main className="startup">
        {fatal ? (
          <>
            <AlertCircle size={38} />
            <h1>Не успяхме да отворим панела</h1>
            <p>{fatal}</p>
            <button className="btn primary" onClick={() => location.reload()}>
              Опитай отново
            </button>
          </>
        ) : (
          <>
            <LoaderCircle className="spin" size={38} />
            <h1>Подготвяме работното място…</h1>
          </>
        )}
      </main>
    );
  const dirty = state.state.draft_revision !== state.state.published_revision;
  const current = nav.find((n) => n[0] === view)!;
  const filtered = products.filter((p) =>
    search
      ? p.data.title
          .toLocaleLowerCase("bg")
          .includes(search.toLocaleLowerCase("bg"))
      : p.data.categoryId === chosenCategory?.id,
  );
  const photos = all
    .filter((e) => e.type === "photo" && e.data.albumId === chosenAlbum?.id)
    .sort(order);
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobileNav ? "is-open" : "")}>
        <a className="brand" href="/" aria-label="Трънче — управление">
          <img src={logo} alt="Трънче" />
          <span>Работно място за усмивки</span>
        </a>
        <nav aria-label="Раздели на админ панела">
          {nav.map(([id, title, Icon]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              aria-current={view === id ? "page" : undefined}
              onClick={() => {
                setView(id);
                setSearch("");
                setMobileNav(false);
              }}
            >
              <Icon size={20} />
              {title}
              {id === "menu" && <span>{products.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="avatar">
            {state.user.email.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>
              {state.user.role === "owner" ? "Собственик" : "Редактор"}
            </strong>
            <small>{state.user.email}</small>
          </div>
          {!state.user.local && (
            <a href="/cdn-cgi/access/logout" aria-label="Изход">
              <LogOut size={18} />
            </a>
          )}
        </div>
      </aside>
      <div className="main-shell">
        {state.user.local && (
          <div className="local-banner">
            Локална работна версия · промените тук не променят trunche.com
          </div>
        )}
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-only"
              aria-label="Отвори разделите"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={23} />
            </button>
            <span>Трънче</span>
            <ChevronRight size={15} />
            <strong>{current[1]}</strong>
          </div>
          <div className="topbar-actions">
            <span className={"draft-state " + (dirty ? "has-changes" : "")}>
              <span />
              {dirty ? "Има непубликувани промени" : "Всичко е публикувано"}
            </span>
            <button
              className="btn secondary"
              aria-label="Преглед на съдържанието"
              onClick={() =>
                action(async () => setPreview(await api("preview")), "")
              }
            >
              <Eye size={18} />
              <span>Преглед</span>
            </button>
            <button
              className="btn primary"
              disabled={publishing || !dirty}
              onClick={publish}
            >
              {publishing ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <CloudUpload size={18} />
              )}
              <span>Публикувай</span>
            </button>
          </div>
        </header>
        <main className="workspace">
          {notice && (
            <div
              className={
                notice.startsWith("Грешка") ? "error notice" : "success notice"
              }
              role="status"
            >
              <span>{notice}</span>
              <button
                className="icon-btn"
                aria-label="Затвори съобщението"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {view === "home" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ДОБРЕ ДОШЛИ В ТРЪНЧЕ</p>
                  <h1>Да подготвим нещо хубаво.</h1>
                  <p>
                    Менюто, снимките и малките подробности за един голям
                    празник.
                  </p>
                </div>
              </div>
              <div className="quick-actions">
                <button
                  onClick={() =>
                    categories.length
                      ? setEditor({ type: "product" })
                      : setEditor({ type: "category" })
                  }
                >
                  <span className="quick-icon yellow">
                    <UtensilsCrossed size={28} />
                  </span>
                  <h2>Нещо ново в менюто?</h2>
                  <p>Добави предложение, цена и снимка.</p>
                  <strong>
                    Добави предложение <Plus size={18} />
                  </strong>
                </button>
                <button
                  onClick={() =>
                    albums.length
                      ? setUploadAlbum(albums[0])
                      : setEditor({ type: "album" })
                  }
                >
                  <span className="quick-icon pink">
                    <Images size={28} />
                  </span>
                  <h2>Още усмихнати спомени.</h2>
                  <p>Качи нови снимки в галерията.</p>
                  <strong>
                    Добави снимки <Plus size={18} />
                  </strong>
                </button>
              </div>
              <div className="stats-grid">
                {[
                  [products.length, "Предложения в менюто"],
                  [
                    all.filter((e) => e.type === "photo").length,
                    "Снимки в галерията",
                  ],
                  [albums.length, "Албума"],
                  [state.releases.length, "Последни публикации"],
                ].map(([n, label]) => (
                  <div className="stat" key={label}>
                    <strong>{n}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <section className="panel">
                <div className="section-top">
                  <h2>Последно редактирани</h2>
                  <span className="pill">Чернови</span>
                </div>
                {all.length ? (
                  [...all]
                    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                    .slice(0, 5)
                    .map((e) => (
                      <button
                        className="recent-row"
                        key={e.id}
                        onClick={() => setEditor({ type: e.type, entity: e })}
                      >
                        <span>{e.data.title}</span>
                        <small>
                          {new Date(e.updatedAt).toLocaleString("bg-BG")}
                        </small>
                        <ChevronRight size={18} />
                      </button>
                    ))
                ) : (
                  <p className="muted">
                    Започни с първата категория или албум. Всичко запазено тук
                    първо е чернова.
                  </p>
                )}
              </section>
            </>
          )}
          {view === "menu" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ВКУСНАТА ЧАСТ НА ПРАЗНИКА</p>
                  <h1>Меню и цени</h1>
                  <p>Всяко предложение на своето място. Всички цени в евро.</p>
                </div>
                <button
                  className="btn primary"
                  disabled={!categories.length}
                  onClick={() =>
                    setEditor({ type: "product", entity: undefined })
                  }
                >
                  <Plus size={18} />
                  Добави предложение
                </button>
              </div>
              <div className="category-tabs">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className={chosenCategory?.id === c.id ? "active" : ""}
                    onClick={() => {
                      setCategory(c.id);
                      setSearch("");
                    }}
                  >
                    {c.data.title}
                    <span>
                      {
                        products.filter((p) => p.data.categoryId === c.id)
                          .length
                      }
                    </span>
                  </button>
                ))}
                <button
                  className="add-category"
                  onClick={() => setEditor({ type: "category" })}
                >
                  <Plus size={17} />
                  Категория
                </button>
              </div>
              {chosenCategory && (
                <div className="list-toolbar">
                  <div className="search">
                    <Search size={19} />
                    <input
                      aria-label="Търси предложение"
                      placeholder="Търси предложение в цялото меню…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button
                    className="text-button"
                    onClick={() =>
                      setEditor({ type: "category", entity: chosenCategory })
                    }
                  >
                    Редактирай категорията
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Премахни празна категория"
                    aria-label="Премахни категория"
                    onClick={() => remove(chosenCategory)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              )}
              {!categories.length ? (
                <Empty
                  title="Първо да подредим менюто"
                  description="Добави категория, например „Детски куверти“ или „Напитки“."
                  action={
                    <button
                      className="btn primary"
                      onClick={() => setEditor({ type: "category" })}
                    >
                      <Plus size={18} />
                      Добави първа категория
                    </button>
                  }
                />
              ) : !filtered.length ? (
                <Empty
                  title={
                    search ? "Няма съвпадения" : "Тук има място за нещо вкусно"
                  }
                  description={
                    search
                      ? "Опитай с друга дума."
                      : "Добави първото предложение в тази категория."
                  }
                />
              ) : (
                <div className="products-grid">
                  {filtered.map((p) => (
                    <article
                      className={
                        "product-card " + (!p.data.visible ? "is-hidden" : "")
                      }
                      key={p.id}
                    >
                      <button
                        className="product-image"
                        onClick={() =>
                          setEditor({ type: "product", entity: p })
                        }
                        aria-label={"Редактирай " + p.data.title}
                      >
                        {p.data.imageId ? (
                          <img
                            src={mediaURL(p.data.imageId)}
                            alt={p.data.title}
                          />
                        ) : (
                          <>
                            <UtensilsCrossed size={30} />
                            <span>Добави снимка</span>
                          </>
                        )}
                      </button>
                      <div className="product-card-content">
                        <div className="card-labels">
                          <span>{kindNames[p.data.kind]}</span>
                          {!p.data.visible && (
                            <span className="pill">Скрито</span>
                          )}
                        </div>
                        <div className="product-title">
                          <h2>{p.data.title}</h2>
                          {['product','package','partner'].includes(p.data.kind) && <strong>{money(p.data.priceCents)}</strong>}
                        </div>
                        <p>
                          {p.data.portion ||
                            p.data.description || p.data.note || p.data.inclusions?.join(" · ") ||
                            "Добави описание за гостите."}
                        </p>
                        <footer>
                          <button
                            className="text-button"
                            onClick={() =>
                              setEditor({ type: "product", entity: p })
                            }
                          >
                            Редактирай
                          </button>
                          <button
                            className="icon-btn"
                            title="Дублирай"
                            aria-label={"Дублирай " + p.data.title}
                            onClick={() =>
                              setEditor({
                                type: "product",
                                entity: p,
                                duplicate: true,
                              })
                            }
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            disabled={!!search || filtered.indexOf(p) === 0}
                            aria-label={"Премести нагоре " + p.data.title}
                            onClick={() =>
                              move(filtered, filtered.indexOf(p), -1)
                            }
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            disabled={
                              !!search ||
                              filtered.indexOf(p) === filtered.length - 1
                            }
                            aria-label={"Премести надолу " + p.data.title}
                            onClick={() =>
                              move(filtered, filtered.indexOf(p), 1)
                            }
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            className="icon-btn danger"
                            aria-label={"Премахни " + p.data.title}
                            onClick={() => remove(p)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </footer>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
          {view === "gallery" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">МЯСТО ЗА ЩАСТЛИВИ СПОМЕНИ</p>
                  <h1>Галерия</h1>
                  <p>
                    Избери албум, добави снимки и разкажи историята на Трънче.
                  </p>
                </div>
                <div className="button-row">
                  <button
                    className="btn secondary"
                    onClick={() => setEditor({ type: "album" })}
                  >
                    <Plus size={18} />
                    Нов албум
                  </button>
                  <button
                    className="btn primary"
                    disabled={!chosenAlbum}
                    onClick={() => setUploadAlbum(chosenAlbum)}
                  >
                    <Upload size={18} />
                    Добави снимки
                  </button>
                </div>
              </div>
              <div className="category-tabs">
                {albums.map((a) => (
                  <button
                    key={a.id}
                    className={chosenAlbum?.id === a.id ? "active" : ""}
                    onClick={() => setAlbum(a.id)}
                  >
                    {a.data.title}
                    <span>
                      {
                        all.filter(
                          (e) => e.type === "photo" && e.data.albumId === a.id,
                        ).length
                      }
                    </span>
                  </button>
                ))}
              </div>
              {chosenAlbum && (
                <div className="list-toolbar">
                  <div>
                    <h2>{chosenAlbum.data.title}</h2>
                    <p className="muted">
                      {photos.length} снимки · подреди с бутоните под всяка
                      снимка
                    </p>
                  </div>
                  <div className="button-row">
                    <button
                      className="text-button"
                      onClick={() =>
                        setEditor({ type: "album", entity: chosenAlbum })
                      }
                    >
                      Редактирай албума
                    </button>
                    <button
                      className="icon-btn danger"
                      aria-label="Премахни албум"
                      onClick={() => remove(chosenAlbum)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              )}
              {!albums.length ? (
                <Empty
                  title="Да създадем първия албум"
                  description="Например „Място за игри“, „Декорация“ или „Кетъринг“."
                  action={
                    <button
                      className="btn primary"
                      onClick={() => setEditor({ type: "album" })}
                    >
                      <Plus size={18} />
                      Нов албум
                    </button>
                  }
                />
              ) : !photos.length ? (
                <Empty
                  title="Този албум чака своите усмивки"
                  description="Можеш да качиш няколко снимки наведнъж."
                  action={
                    <button
                      className="btn primary"
                      onClick={() => setUploadAlbum(chosenAlbum)}
                    >
                      <Upload size={18} />
                      Избери снимки
                    </button>
                  }
                />
              ) : (
                <div className="gallery-grid">
                  {photos.map((p, i) => (
                    <article key={p.id} className="gallery-card">
                      <button
                        className="gallery-picture"
                        onClick={() => setEditor({ type: "photo", entity: p })}
                      >
                        <img
                          loading="lazy"
                          src={mediaURL(p.data.imageId)}
                          alt={p.data.alt}
                        />
                        {chosenAlbum?.data.coverId === p.data.imageId && (
                          <span className="cover-label">Корица</span>
                        )}
                      </button>
                      <div className="gallery-card-caption">
                        <strong>{p.data.caption || p.data.alt}</strong>
                        <div className="button-row">
                          <button
                            className="icon-btn"
                            disabled={i === 0}
                            aria-label={"Премести нагоре " + p.data.title}
                            onClick={() => move(photos, i, -1)}
                          >
                            <ArrowUp size={17} />
                          </button>
                          <button
                            className="icon-btn"
                            disabled={i === photos.length - 1}
                            aria-label={"Премести надолу " + p.data.title}
                            onClick={() => move(photos, i, 1)}
                          >
                            <ArrowDown size={17} />
                          </button>
                          <button
                            className="text-button"
                            onClick={() =>
                              action(() =>
                                save(
                                  "album",
                                  {
                                    ...chosenAlbum.data,
                                    coverId: p.data.imageId,
                                  },
                                  chosenAlbum,
                                ),
                              )
                            }
                          >
                            Корица
                          </button>
                          <button
                            className="icon-btn danger"
                            aria-label={"Премахни " + p.data.title}
                            onClick={() => remove(p)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
          {["pages", "announcements", "settings"].includes(view) && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">МАЛКИТЕ ВАЖНИ ПОДРОБНОСТИ</p>
                  <h1>{current[1]}</h1>
                  <p>
                    Запази като чернова и публикувай, когато всичко е готово.
                  </p>
                </div>
                <button
                  className="btn primary"
                  onClick={() =>
                    setEditor({
                      type:
                        view === "pages"
                          ? "page"
                          : view === "announcements"
                            ? "announcement"
                            : "settings",
                      entity:
                        view === "settings"
                          ? all.find((e) => e.type === "settings")
                          : undefined,
                    })
                  }
                >
                  <Plus size={18} />
                  {view === "settings" ? "Редактирай настройките" : "Добави"}
                </button>
              </div>
              <div className="panel">
                {all
                  .filter(
                    (e) =>
                      e.type ===
                      (view === "pages"
                        ? "page"
                        : view === "announcements"
                          ? "announcement"
                          : "settings"),
                  )
                  .map((e) => (
                    <div className="content-row" key={e.id}>
                      <div>
                        <h2>{e.data.title}</h2>
                        <p>
                          {e.data.description ||
                            e.data.message ||
                            e.data.address ||
                            "Контакти и информация за Трънче"}
                        </p>
                      </div>
                      <button
                        className="btn secondary"
                        onClick={() => setEditor({ type: e.type, entity: e })}
                      >
                        Редактирай
                      </button>
                      <button
                        className="icon-btn danger"
                        aria-label="Премахни запис"
                        onClick={() => remove(e)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                <p className="muted">
                  Валутата е фиксирана в евро. Достъпът до профилите се
                  настройва през Cloudflare Access и списъка с одобрени
                  редактори.
                </p>
              </div>
            </>
          )}
          {view === "history" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ПРОМЕНИТЕ СА ПРОСЛЕДИМИ</p>
                  <h1>История и кошче</h1>
                  <p>Върни съдържание или предишна публикация.</p>
                </div>
                {state.user.role === "owner" && (
                  <button
                    className="btn secondary"
                    onClick={() =>
                      action(async () => {
                        const exported = await api("export");
                        const url = URL.createObjectURL(
                          new Blob([JSON.stringify(exported, null, 2)], {
                            type: "application/json",
                          }),
                        );
                        const a = document.createElement("a");
                        a.href = url;
                        a.download =
                          "trunche-content-" +
                          new Date().toISOString().slice(0, 10) +
                          ".json";
                        a.click();
                        URL.revokeObjectURL(url);
                      }, "Данните са експортирани. Снимките са отделни файлове и не са включени в JSON.")
                    }
                  >
                    <Download size={18} />
                    Експорт на данните
                  </button>
                )}
              </div>
              <section className="panel">
                <h2>Последни публикации</h2>
                {state.releases.length ? (
                  state.releases.map((r) => (
                    <div className="content-row" key={r.id}>
                      <div>
                        <strong>
                          {new Date(r.created_at).toLocaleString("bg-BG")}
                        </strong>
                        <p>
                          {r.created_by}{" "}
                          {state.state.active_release === r.id &&
                            "· активна версия"}
                        </p>
                      </div>
                      {state.user.role === "owner" &&
                        state.state.active_release !== r.id && (
                          <button
                            className="btn secondary"
                            onClick={() => {
                              if (
                                confirm(
                                  "Да върнем публичното съдържание към тази версия? Черновите остават непроменени.",
                                )
                              )
                                action(
                                  () =>
                                    api("rollback", "POST", {
                                      releaseId: r.id,
                                    }),
                                  "Предишната публикация е активна.",
                                );
                            }}
                          >
                            <RotateCcw size={17} />
                            Възстанови
                          </button>
                        )}
                    </div>
                  ))
                ) : (
                  <p>Още няма публикации.</p>
                )}
              </section>
              <section className="panel">
                <h2>Кошче</h2>
                {state.entities
                  .filter((e) => e.deletedAt)
                  .map((e) => (
                    <div className="content-row" key={e.id}>
                      <strong>{e.data.title}</strong>
                      <button
                        className="btn secondary"
                        onClick={() =>
                          action(() =>
                            api("restore", "POST", {
                              id: e.id,
                              version: e.version,
                            }),
                          )
                        }
                      >
                        <RotateCcw size={17} />
                        Върни
                      </button>
                    </div>
                  ))}
                {!state.entities.some((e) => e.deletedAt) && (
                  <p className="muted">Кошчето е празно.</p>
                )}
              </section>
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>
            Трънче ·{" "}
            {state.user.local ? "Локална среда" : "Управление на съдържанието"}
          </span>
          <span>
            {(state.media.reduce((n, m) => n + m.size, 0) / 1_000_000).toFixed(
              1,
            )}{" "}
            MB снимки
          </span>
        </footer>
      </div>
      {editor &&
        (editor.type === "product" ? (
          <ProductForm
            initialCategoryId={chosenCategory?.id}
            key={(editor.entity?.id || "new") + String(editor.duplicate)}
            entity={editor.entity}
            duplicate={editor.duplicate}
            categories={categories}
            media={state.media}
            onClose={() => setEditor(null)}
            onSaved={load}
          />
        ) : (
          <SimpleForm
            key={editor.entity?.id || editor.type}
            type={editor.type}
            entity={editor.entity}
            media={state.media}
            onClose={() => setEditor(null)}
            onSaved={load}
          />
        ))}
      {uploadAlbum && (
        <GalleryUpload
          startOrder={
            Math.max(
              -1,
              ...all
                .filter(
                  (e) =>
                    e.type === "photo" && e.data.albumId === uploadAlbum.id,
                )
                .map((e) => e.data.sortOrder),
            ) + 1
          }
          album={uploadAlbum}
          onClose={() => setUploadAlbum(null)}
          onSaved={load}
        />
      )}{" "}
      {preview && (
        <Modal
          title="Преглед на запазеното съдържание"
          onClose={() => setPreview(null)}
          wide
        >
          <div className="modal-body">
            <p className="muted">
              Чернова · този преглед не променя публичния сайт.
            </p>
            {preview.content
              .filter((e: any) => e.type === "category")
              .map((c: any) => (
                <section className="preview-section" key={c.id}>
                  <h2>{c.data.title}</h2>
                  <div className="products-grid">
                    {preview.content
                      .filter(
                        (e: any) =>
                          e.type === "product" && e.data.categoryId === c.id,
                      )
                      .map((p: any) => (
                        <article className="product-preview" key={p.id}>
                          {p.data.imageId && (
                            <img
                              className="chosen-photo"
                              src={mediaURL(p.data.imageId)}
                              alt={p.data.title}
                            />
                          )}
                          <h3>{p.data.title}</h3>
                          {['product','package','partner'].includes(p.data.kind) && <strong>{money(p.data.priceCents)}</strong>}
                          <p>{p.data.description}</p>
                          {p.data.inclusions.map((line: string, i: number) => (
                            <p className="included" key={i}>
                              <Check size={16} />
                              {line}
                            </p>
                          ))}
                        </article>
                      ))}
                  </div>
                </section>
              ))}
            {preview.content
              .filter((e: any) => e.type === "album")
              .map((a: any) => (
                <section className="preview-section" key={a.id}>
                  <h2>{a.data.title}</h2>
                  <div className="gallery-grid">
                    {preview.content
                      .filter(
                        (e: any) =>
                          e.type === "photo" && e.data.albumId === a.id,
                      )
                      .map((p: any) => (
                        <img
                          className="chosen-photo"
                          key={p.id}
                          src={mediaURL(p.data.imageId)}
                          alt={p.data.alt}
                        />
                      ))}
                  </div>
                </section>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
