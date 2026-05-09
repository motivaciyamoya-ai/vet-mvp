import { useCallback, useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { apiFetch } from "../../lib/api";

type MailSettings = {
  smtpHost: string;
  smtpPort: string;
  smtpSecure: string;
  smtpUser: string;
  smtpFrom: string;
  alertTo: string;
  frontendUrl: string;
  verifySubject: string;
  verifyTextTemplate: string;
  verifyHtmlTemplate: string;
  smtpPasswordStoredInDatabase: boolean;
  effectiveSmtpConfigured: boolean;
  placeholdersHint: string;
  lastSmtpError: string | null;
  diagnostics: {
    hostFromDatabase: boolean;
    smtpHostEffective: string;
    secure: boolean;
    smtpUserSet: boolean;
    smtpPassSet: boolean;
    fromSet: boolean;
  };
};

type BroadcastResult =
  | { dryRun: true; recipientCount: number; audience: string }
  | { ok: true; audience: string; total: number; sent: number; failed: number; errors: { email: string; message: string }[] };

export default function AdminMail() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpSecure, setSmtpSecure] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [alertTo, setAlertTo] = useState("");
  const [frontendUrl, setFrontendUrl] = useState("");
  const [verifySubject, setVerifySubject] = useState("");
  const [verifyTextTemplate, setVerifyTextTemplate] = useState("");
  const [verifyHtmlTemplate, setVerifyHtmlTemplate] = useState("");
  const [smtpPassDraft, setSmtpPassDraft] = useState("");
  const [changeSmtpPass, setChangeSmtpPass] = useState(false);

  const [bcAudience, setBcAudience] = useState<"all" | "verified" | "unverified">("all");
  const [bcSubject, setBcSubject] = useState("");
  const [bcText, setBcText] = useState("");
  const [bcHtml, setBcHtml] = useState("");
  const [bcDryRun, setBcDryRun] = useState(true);

  const [meta, setMeta] = useState({
    effectiveSmtpConfigured: false,
    placeholdersHint: "",
    smtpPasswordStoredInDatabase: false,
    lastSmtpError: null as string | null,
    diagnostics: null as MailSettings["diagnostics"] | null,
  });

  const apply = useCallback((s: MailSettings) => {
    setSmtpHost(s.smtpHost);
    setSmtpPort(s.smtpPort);
    setSmtpSecure(s.smtpSecure);
    setSmtpUser(s.smtpUser);
    setSmtpFrom(s.smtpFrom);
    setAlertTo(s.alertTo);
    setFrontendUrl(s.frontendUrl);
    setVerifySubject(s.verifySubject);
    setVerifyTextTemplate(s.verifyTextTemplate);
    setVerifyHtmlTemplate(s.verifyHtmlTemplate);
    setSmtpPassDraft("");
    setChangeSmtpPass(false);
    setMeta({
      effectiveSmtpConfigured: s.effectiveSmtpConfigured,
      placeholdersHint: s.placeholdersHint,
      smtpPasswordStoredInDatabase: s.smtpPasswordStoredInDatabase,
      lastSmtpError: s.lastSmtpError,
      diagnostics: s.diagnostics,
    });
  }, []);

  const load = useCallback(async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const s = await apiFetch<MailSettings>("/api/admin/mail/settings");
      apply(s);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      const json: Record<string, unknown> = {
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUser,
        smtpFrom,
        alertTo,
        frontendUrl,
        verifySubject,
        verifyTextTemplate,
        verifyHtmlTemplate,
      };
      if (changeSmtpPass) {
        json.smtpPass = smtpPassDraft;
      }
      const s = await apiFetch<MailSettings>("/api/admin/mail/settings", { method: "PUT", json });
      apply(s);
      setOk("Настройки сохранены.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setErr("");
    setOk("");
    try {
      await apiFetch("/api/admin/mail/test", { method: "POST", json: {} });
      setOk("Тестовое письмо отправлено на ваш админский email.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  const sendBroadcast = async () => {
    setBroadcasting(true);
    setErr("");
    setOk("");
    try {
      const out = await apiFetch<BroadcastResult>("/api/admin/mail/broadcast", {
        method: "POST",
        json: {
          audience: bcAudience,
          subject: bcSubject.trim(),
          bodyText: bcText,
          bodyHtml: bcHtml.trim() || undefined,
          dryRun: bcDryRun,
        },
      });
      if ("dryRun" in out && out.dryRun) {
        setOk(`Пробный подсчёт: получателей ${out.recipientCount} (${out.audience}). Снимите «Только подсчёт» и отправьте снова.`);
      } else if ("sent" in out) {
        setOk(`Рассылка завершена: отправлено ${out.sent}, ошибок ${out.failed}, всего в выборке ${out.total}.`);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p className="text-slate-600">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <Mail className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Почта и рассылки</h1>
          <p className="text-slate-600 text-sm mt-1">
            SMTP можно задать здесь (в БД) или через переменные окружения backend — значения в админке имеют приоритет,
            если поле не пустое. Для Docker добавьте в корень проекта файл <code className="bg-slate-100 px-1 rounded">.env</code>{" "}
            и перезапустите backend — иначе контейнер не увидит SMTP_HOST из хоста.
          </p>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-900 px-4 py-3 text-sm">{err}</div>
      ) : null}
      {ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 px-4 py-3 text-sm">{ok}</div>
      ) : null}

      {meta.lastSmtpError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-900 px-4 py-3 text-sm space-y-1">
          <p className="font-semibold">Последняя ошибка SMTP</p>
          <p className="font-mono text-xs break-words">{meta.lastSmtpError}</p>
        </div>
      ) : null}

      {meta.diagnostics ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 space-y-1">
          <p className="font-semibold text-slate-800">Диагностика</p>
          <p>
            Эффективный сервер: <code className="bg-white px-1 rounded">{meta.diagnostics.smtpHostEffective || "—"}</code>{" "}
            (secure: {meta.diagnostics.secure ? "да" : "нет"})
          </p>
          <p>
            Host из БД: {meta.diagnostics.hostFromDatabase ? "да" : "нет"}, пользователь SMTP:{" "}
            {meta.diagnostics.smtpUserSet ? "да" : "нет"}, пароль: {meta.diagnostics.smtpPassSet ? "задан" : "нет"},{" "}
            From: {meta.diagnostics.fromSet ? "да" : "нет"}
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-lg text-slate-900">SMTP</h2>
        <p className="text-xs text-slate-500">
          Текущий резолв:{" "}
          {meta.effectiveSmtpConfigured ? (
            <span className="text-emerald-700 font-medium">хост задан (отправка возможна)</span>
          ) : (
            <span className="text-amber-700 font-medium">хост не задан — письма не уходят, ссылка только в логе</span>
          )}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">SMTP host</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.example.com"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Порт</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              placeholder="587"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Secure (true / false)</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.value)}
              placeholder="false"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Пользователь SMTP</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">From (адрес отправителя)</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder="noreply@vetconnect.online"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Алерты админу (ALERT_EMAIL_TO)</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={alertTo}
              onChange={(e) => setAlertTo(e.target.value)}
              placeholder="security@…"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Публичный URL фронта (ссылки в письмах)</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={frontendUrl}
              onChange={(e) => setFrontendUrl(e.target.value)}
              placeholder="https://vetconnect.online"
            />
          </label>
        </div>
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <p className="text-sm text-slate-600">
            Пароль SMTP:{" "}
            {meta.smtpPasswordStoredInDatabase ? (
              <span className="text-emerald-700 font-medium">хранится в БД</span>
            ) : (
              <span>в БД не задан — используется переменная окружения SMTP_PASS (если есть)</span>
            )}
          </p>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={changeSmtpPass} onChange={(e) => setChangeSmtpPass(e.target.checked)} />
            Задать или сменить пароль (сохранится в БД)
          </label>
          {changeSmtpPass ? (
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-sm max-w-md"
              value={smtpPassDraft}
              onChange={(e) => setSmtpPassDraft(e.target.value)}
              placeholder="Пусто при сохранении — удалить пароль из БД"
            />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить SMTP и шаблоны"}
          </button>
          <button
            type="button"
            disabled={testing}
            onClick={() => void sendTest()}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {testing ? "Отправка…" : "Отправить тест на мой email"}
          </button>
          <button type="button" onClick={() => void load()} className="px-4 py-2.5 rounded-lg text-sm text-slate-600 hover:underline">
            Обновить с сервера
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="font-semibold text-lg text-slate-900">Шаблон подтверждения email</h2>
        <p className="text-xs text-slate-500">{meta.placeholdersHint}</p>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Тема</span>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={verifySubject}
            onChange={(e) => setVerifySubject(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Текст (plain)</span>
          <textarea
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono min-h-[140px]"
            value={verifyTextTemplate}
            onChange={(e) => setVerifyTextTemplate(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">HTML</span>
          <textarea
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono min-h-[180px]"
            value={verifyHtmlTemplate}
            onChange={(e) => setVerifyHtmlTemplate(e.target.value)}
          />
        </label>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-lg text-slate-900">Рассылка зарегистрированным</h2>
        <p className="text-sm text-slate-600">
          Каждому пользователю уходит отдельное письмо. В тексте и HTML можно использовать{" "}
          <code className="bg-white px-1 rounded">{"{{email}}"}</code> и{" "}
          <code className="bg-white px-1 rounded">{"{{frontendUrl}}"}</code>. Сначала выполните пробный подсчёт.
        </p>
        <label className="block text-sm font-medium text-slate-700">
          Аудитория
          <select
            className="mt-1 w-full max-w-xs border rounded-lg px-3 py-2 text-sm bg-white"
            value={bcAudience}
            onChange={(e) => setBcAudience(e.target.value as typeof bcAudience)}
          >
            <option value="all">Все зарегистрированные</option>
            <option value="verified">Только с подтверждённым email</option>
            <option value="unverified">Только без подтверждения</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Тема</span>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
            value={bcSubject}
            onChange={(e) => setBcSubject(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Текст письма</span>
          <textarea
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[120px]"
            value={bcText}
            onChange={(e) => setBcText(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">HTML (необязательно)</span>
          <textarea
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white min-h-[100px]"
            value={bcHtml}
            onChange={(e) => setBcHtml(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={bcDryRun} onChange={(e) => setBcDryRun(e.target.checked)} />
          Только подсчёт получателей (без отправки)
        </label>
        <button
          type="button"
          disabled={broadcasting || !bcSubject.trim() || !bcText.trim()}
          onClick={() => void sendBroadcast()}
          className="px-4 py-2.5 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-50"
        >
          {broadcasting ? "Выполняется…" : bcDryRun ? "Подсчитать получателей" : "Отправить рассылку"}
        </button>
      </section>
    </div>
  );
}
