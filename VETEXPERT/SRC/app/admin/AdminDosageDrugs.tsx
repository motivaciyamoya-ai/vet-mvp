import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import {
  DOSAGE_ANIMAL_KEYS,
  type AnimalKey,
  type DosageDrugApiRow,
} from "../../lib/dosageKinds";

type AnimalLineForm = {
  mgPerKg: string;
  freq: string;
  duration: string;
  note: string;
};

type DosageDrugAdminRow = DosageDrugApiRow & {
  active: boolean;
  sortOrder: number;
};

const ANIMAL_LABELS: Record<AnimalKey, string> = {
  dog: "Собака",
  cat: "Кошка",
  rabbit: "Кролик",
  bird: "Птица",
  reptile: "Рептилия",
  horse: "Лошадь",
};

function emptyLines(): Record<AnimalKey, AnimalLineForm> {
  const o = {} as Record<AnimalKey, AnimalLineForm>;
  for (const k of DOSAGE_ANIMAL_KEYS) {
    o[k] = { mgPerKg: "", freq: "", duration: "", note: "" };
  }
  return o;
}

function dosingToLines(dosing: Record<string, unknown>): Record<AnimalKey, AnimalLineForm> {
  const base = emptyLines();
  for (const k of DOSAGE_ANIMAL_KEYS) {
    const v = dosing[k];
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const o = v as Record<string, unknown>;
    base[k] = {
      mgPerKg: o.mgPerKg != null ? String(o.mgPerKg) : "",
      freq: String(o.freq ?? ""),
      duration: String(o.duration ?? ""),
      note: String(o.note ?? ""),
    };
  }
  return base;
}

function linesToDosing(lines: Record<AnimalKey, AnimalLineForm>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of DOSAGE_ANIMAL_KEYS) {
    const row = lines[k];
    const mg = parseFloat(String(row.mgPerKg).replace(",", "."));
    if (!(Number.isFinite(mg) && mg > 0)) continue;
    const entry: Record<string, unknown> = {
      mgPerKg: mg,
      freq: row.freq.trim(),
      duration: row.duration.trim(),
    };
    const note = row.note.trim();
    if (note) entry.note = note;
    out[k] = entry;
  }
  return out;
}

const emptyForm = (): {
  id: string;
  nameRu: string;
  category: string;
  summary: string;
  instruction: string;
  warnings: string;
  active: boolean;
  sortOrder: number;
  lines: Record<AnimalKey, AnimalLineForm>;
} => ({
  id: "",
  nameRu: "",
  category: "",
  summary: "",
  instruction: "",
  warnings: "",
  active: true,
  sortOrder: 0,
  lines: emptyLines(),
});

export default function AdminDosageDrugs() {
  const [rows, setRows] = useState<DosageDrugAdminRow[]>([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [importingBuiltin, setImportingBuiltin] = useState(false);
  /** null — режим только списка; 'new' — создание; иначе id редактируемой строки из БД */
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setErr("");
    try {
      const list = await apiFetch<DosageDrugAdminRow[]>("/api/admin/dosage-drugs");
      setRows(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка загрузки";
      const hint =
        /dosagedrug|DosageDrug|relation|does not exist|table|500|internal server/i.test(msg)
          ? " В backend из каталога проекта выполните: npx prisma migrate deploy && npx prisma generate, затем перезапустите API."
          : "";
      setErr(msg + hint);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startCreate = () => {
    setEditingTarget("new");
    setForm(emptyForm());
  };

  const startEdit = (row: DosageDrugAdminRow) => {
    const dosingRaw =
      row.dosing && typeof row.dosing === "object" && !Array.isArray(row.dosing)
        ? (row.dosing as Record<string, unknown>)
        : {};
    setEditingTarget(row.id);
    setForm({
      id: row.id,
      nameRu: row.nameRu,
      category: row.category,
      summary: row.summary,
      instruction: row.instruction,
      warnings: row.warnings ?? "",
      active: row.active,
      sortOrder: row.sortOrder,
      lines: dosingToLines(dosingRaw),
    });
  };

  const cancelEditor = () => {
    setEditingTarget(null);
    setForm(emptyForm());
  };

  const submitCreate = async () => {
    const nid = form.id.trim();
    if (!nid) {
      alert("Заполните id (латиница, snake_case): например new_drug.");
      return;
    }
    setSaving(true);
    try {
      const dosing = linesToDosing(form.lines);
      await apiFetch("/api/admin/dosage-drugs", {
        method: "POST",
        json: {
          id: nid,
          nameRu: form.nameRu.trim(),
          category: form.category.trim(),
          summary: form.summary.trim(),
          instruction: form.instruction.trim(),
          warnings: form.warnings.trim() || null,
          dosing,
          active: form.active,
          sortOrder: Math.floor(form.sortOrder) || 0,
        },
      });
      cancelEditor();
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const submitPatch = async (id: string) => {
    setSaving(true);
    try {
      const dosing = linesToDosing(form.lines);
      await apiFetch(`/api/admin/dosage-drugs/${encodeURIComponent(id)}`, {
        method: "PATCH",
        json: {
          nameRu: form.nameRu.trim(),
          category: form.category.trim(),
          summary: form.summary.trim(),
          instruction: form.instruction.trim(),
          warnings: form.warnings.trim() ? form.warnings.trim() : null,
          dosing,
          active: form.active,
          sortOrder: Math.floor(form.sortOrder) || 0,
        },
      });
      cancelEditor();
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm(`Удалить препарат «${id}» из базы?`)) return;
    try {
      await apiFetch(`/api/admin/dosage-drugs/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (editingTarget === id) cancelEditor();
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const importBuiltin = async () => {
    setImportingBuiltin(true);
    setErr("");
    try {
      const res = await apiFetch<{ created: number; catalogSize: number }>("/api/admin/dosage-drugs/import-builtin", {
        method: "POST",
      });
      alert(
        `Импорт завершён. Добавлено записей: ${res.created ?? 0} (в каталоге ${res.catalogSize ?? "—"} позиций). Существующие id не изменялись.`,
      );
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      setErr(msg);
      alert(msg);
    } finally {
      setImportingBuiltin(false);
    }
  };

  const updateLine = (key: AnimalKey, field: keyof AnimalLineForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      lines: {
        ...prev.lines,
        [key]: { ...prev.lines[key], [field]: value },
      },
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Калькулятор: справочник препаратов</h1>
          <p className="text-slate-600 text-sm mt-1 max-w-2xl">
            Записи в базе переопределяют встроенный справочник по совпадающим id; новые id добавляются к калькулятору.
            Дозировка по видам: укажите мг/кг &gt; 0 только для нужных животных.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          Новый препарат
        </button>
      </div>

      {err && <p className="text-red-600 text-sm">{err}</p>}

      {(editingTarget === "new" || (editingTarget && editingTarget !== "new")) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">
            {editingTarget === "new" ? "Создание" : `Редактирование «${form.id}»`}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editingTarget === "new" && (
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Id (латиница, например cephalexin_custom)</span>
                <input
                  value={form.id}
                  onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                  placeholder="my_drug_id"
                  autoComplete="off"
                />
              </label>
            )}
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Название (RU)</span>
              <input
                value={form.nameRu}
                onChange={(e) => setForm((p) => ({ ...p, nameRu: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Категория</span>
              <input
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>
            <div className="flex gap-4 items-end flex-wrap">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                />
                Активен (публичный калькулятор)
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sm text-slate-700 whitespace-nowrap">Порядок</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                  className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-sm"
                />
              </label>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Кратко / показания</span>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Инструкция / памятка</span>
            <textarea
              value={form.instruction}
              onChange={(e) => setForm((p) => ({ ...p, instruction: e.target.value }))}
              rows={4}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Предупреждения (необязательно)</span>
            <textarea
              value={form.warnings}
              onChange={(e) => setForm((p) => ({ ...p, warnings: e.target.value }))}
              rows={2}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </label>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Дозировки mg/кг по видам животных</h3>
            <div className="space-y-4">
              {DOSAGE_ANIMAL_KEYS.map((k) => (
                <div
                  key={k}
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50/80 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-start"
                >
                  <div className="sm:col-span-2 font-medium text-sm text-slate-800 pt-2">{ANIMAL_LABELS[k]}</div>
                  <label className="sm:col-span-2">
                    <span className="text-[11px] uppercase text-slate-500">мг/кг</span>
                    <input
                      value={form.lines[k].mgPerKg}
                      onChange={(e) => updateLine(k, "mgPerKg", e.target.value)}
                      placeholder="оставьте пустым, если нет данных"
                      className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                    />
                  </label>
                  <label className="sm:col-span-3">
                    <span className="text-[11px] uppercase text-slate-500">Частота</span>
                    <input
                      value={form.lines[k].freq}
                      onChange={(e) => updateLine(k, "freq", e.target.value)}
                      className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                    />
                  </label>
                  <label className="sm:col-span-3">
                    <span className="text-[11px] uppercase text-slate-500">Длительность</span>
                    <input
                      value={form.lines[k].duration}
                      onChange={(e) => updateLine(k, "duration", e.target.value)}
                      className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-[11px] uppercase text-slate-500">Примечание</span>
                    <input
                      value={form.lines[k].note}
                      onChange={(e) => updateLine(k, "note", e.target.value)}
                      className="mt-0.5 w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (editingTarget === "new") void submitCreate();
                else if (editingTarget) void submitPatch(editingTarget);
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
            <button
              type="button"
              onClick={cancelEditor}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
          <h2 className="font-semibold text-slate-900">Записи в базе ({rows.length})</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              disabled={importingBuiltin}
              onClick={() => void importBuiltin()}
              className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {importingBuiltin ? "Импорт…" : "Подтянуть встроенный справочник"}
            </button>
            <button type="button" onClick={() => void load()} className="text-sm text-emerald-700 hover:underline">
              Обновить
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">№</th>
                <th className="text-left px-4 py-2 font-medium">id</th>
                <th className="text-left px-4 py-2 font-medium">Название</th>
                <th className="text-left px-4 py-2 font-medium">Категория</th>
                <th className="text-left px-4 py-2 font-medium">Активен</th>
                <th className="text-right px-4 py-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    В справочнике пока нет препаратов. Нажмите «Подтянуть встроенный справочник» или добавьте запись
                    через «Новый препарат».
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-2 tabular-nums text-slate-500">{r.sortOrder}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-800">{r.id}</td>
                    <td className="px-4 py-2 font-medium">{r.nameRu}</td>
                    <td className="px-4 py-2 text-slate-600">{r.category}</td>
                    <td className="px-4 py-2">{r.active ? "да" : "нет"}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        className="text-emerald-700 hover:underline"
                        onClick={() => startEdit(r)}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => void del(r.id)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
