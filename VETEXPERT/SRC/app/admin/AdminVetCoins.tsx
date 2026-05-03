import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

const PRESET_KEYS = [
  { key: "vetcoin.display_name", label: "Отображаемое название валюты", hint: "Например VetCoin" },
  { key: "vetcoin.registration_bonus", label: "Бонус за регистрацию", hint: "Целое число" },
  { key: "vetcoin.forum_new_thread_bonus", label: "Бонус за новую тему форума", hint: "Целое число" },
  { key: "vetcoin.forum_reply_bonus", label: "Бонус за ответ в теме", hint: "Целое число" },
  {
    key: "vetcoin.hot_topic_solution_bonus",
    label: "Бонус за ответ, отмеченный автором решением (горячая тема)",
    hint: "Целое число",
  },
  { key: "vetcoin.hot_topic_cost", label: "Стоимость «горячей темы» (UI-демо)", hint: "Целое число" },
  { key: "vetcoin.urgent_help_reward_high", label: "Награда SOS: срочность high", hint: "Целое число" },
  { key: "vetcoin.urgent_help_reward_critical", label: "Награда SOS: critical", hint: "Целое число" },
  { key: "vetcoin.daily_login_bonus", label: "Бонус за ежедневный вход", hint: "Пока не автоматизирован" },
  { key: "vetcoin.article_publish_bonus", label: "Бонус за публикацию статьи", hint: "Пока не автоматизирован" },
  { key: "registration.require_email_verify", label: "Требовать подтверждение почты", hint: "true / false — флаг для клиента" },
] as const;

type Row = { id: string; key: string; value: string };

export default function AdminVetCoins() {
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [adjustEmail, setAdjustEmail] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("0");
  const [adjustReason, setAdjustReason] = useState("Коррекция администратором");

  const load = useCallback(() => {
    setErr("");
    setLoading(true);
    apiFetch<Row[]>("/api/admin/settings")
      .then((r) => {
        const v = r.filter((x) => x.key.startsWith("vetcoin.") || x.key.startsWith("registration.require"));
        setRows(v);
        const m: Record<string, string> = {};
        v.forEach((x) => {
          m[x.key] = x.value;
        });
        PRESET_KEYS.forEach((p) => {
          if (m[p.key] === undefined) m[p.key] = "";
        });
        setEdits(m);
      })
      .catch((e: unknown) => setErr(String(e instanceof Error ? e.message : e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveKey = async (key: string) => {
    try {
      await apiFetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        json: { value: edits[key] ?? "" },
      });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const saveAllPreset = async () => {
    for (const p of PRESET_KEYS) {
      const v = edits[p.key]?.trim() ?? "";
      if (v === "" && !(rows.some((x) => x.key === p.key))) continue;
      await apiFetch(`/api/admin/settings/${encodeURIComponent(p.key)}`, {
        method: "PUT",
        json: { value: v },
      });
    }
    load();
    alert("Сохранено");
  };

  const doAdjust = async () => {
    const delta = parseInt(adjustDelta, 10);
    if (!adjustEmail.trim() || !adjustReason.trim() || !Number.isFinite(delta) || delta === 0) {
      alert("Укажите email, ненулевое целое delta и причину");
      return;
    }
    try {
      await apiFetch("/api/admin/vetcoin/adjust", {
        method: "POST",
        json: {
          email: adjustEmail.trim().toLowerCase(),
          delta,
          reason: adjustReason.trim(),
        },
      });
      setAdjustDelta("0");
      alert("Готово");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const presetsWithValues = useMemo(() => PRESET_KEYS, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">VetCoin и геймификация</h1>
        <p className="text-slate-600 text-sm mt-1 max-w-3xl">
          Настройки хранятся в таблице <code className="bg-slate-100 px-1 rounded">SiteSetting</code> с префиксом{" "}
          <code className="bg-slate-100 px-1 rounded">vetcoin.</code>. Реальные начисления сейчас выполняются при регистрации и
          активности на форуме (создание темы и ответ). Остальные поля зарезервированы под развитие.
        </p>
      </div>

      {err && <p className="text-red-600">{err}</p>}

      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">Корректировка баланса пользователя</h2>
        <div className="grid gap-2 sm:grid-cols-2 max-w-2xl">
          <input
            className="border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="email пользователя"
            value={adjustEmail}
            onChange={(e) => setAdjustEmail(e.target.value)}
          />
          <input
            type="number"
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="delta (+/-)"
            value={adjustDelta}
            onChange={(e) => setAdjustDelta(e.target.value)}
          />
        </div>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm max-w-2xl"
          rows={2}
          value={adjustReason}
          onChange={(e) => setAdjustReason(e.target.value)}
        />
        <button type="button" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm" onClick={doAdjust}>
          Применить
        </button>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-2">
          <h2 className="font-semibold text-slate-800">Ключи параметров</h2>
          <button type="button" className="bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg" onClick={saveAllPreset}>
            Сохранить все поля ниже
          </button>
        </div>

        {loading ? (
          <p>Загрузка…</p>
        ) : (
          <div className="space-y-4">
            {presetsWithValues.map((p) => (
              <div key={p.key} className="border-b border-slate-100 pb-4 last:border-0">
                <label className="block text-xs text-slate-500 font-semibold">{p.label}</label>
                <p className="text-xs text-slate-400 mb-1">{p.hint}</p>
                <code className="text-xs bg-slate-100 px-1 rounded">{p.key}</code>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <input
                    className="border rounded-lg px-3 py-2 flex-1 min-w-[200px] text-sm font-mono"
                    value={edits[p.key] ?? ""}
                    onChange={(e) => setEdits((m) => ({ ...m, [p.key]: e.target.value }))}
                  />
                  <button type="button" className="text-emerald-700 underline text-sm" onClick={() => saveKey(p.key)}>
                    Сохранить ключ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
