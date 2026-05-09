import { useCallback, useEffect, useState, type ReactNode } from "react";
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

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-slate-500 mt-1 leading-relaxed">{children}</p>;
}

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

      <details open className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 text-sm text-slate-800 shadow-sm">
        <summary className="font-semibold text-indigo-950 cursor-pointer">
          Справка: откуда брать данные и как они применяются
        </summary>
        <div className="mt-4 space-y-4 text-slate-700 border-t border-indigo-100 pt-4">
          <div>
            <p className="font-medium text-slate-900 mb-2">Где хранится то, что вы вводите здесь</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>
                Нажатие «Сохранить» записывает значения в <strong>базу</strong> (ключи{" "}
                <code className="bg-white px-1 rounded text-xs">mail.smtp.*</code>,{" "}
                <code className="bg-white px-1 rounded text-xs">mail.alert.to</code>,{" "}
                <code className="bg-white px-1 rounded text-xs">mail.frontend_url</code>, шаблоны{" "}
                <code className="bg-white px-1 rounded text-xs">mail.template.verify.*</code>).
              </li>
              <li>
                Если поле <strong>очистить</strong> и сохранить — соответствующий ключ из БД <strong>удаляется</strong>, и
                тогда подставляется переменная из <strong>окружения контейнера</strong> (например{" "}
                <code className="bg-white px-1 rounded text-xs">SMTP_HOST</code> из файла{" "}
                <code className="bg-white px-1 rounded text-xs">.env</code> в корне проекта на сервере).
              </li>
              <li>
                Для Docker: файл <code className="bg-white px-1 rounded text-xs">/opt/vet-mvp/.env</code> (рядом с{" "}
                <code className="bg-white px-1 rounded text-xs">docker-compose.yml</code>) подхватывается сервисом{" "}
                <code className="bg-white px-1 rounded text-xs">backend</code> при старте. После правки .env выполните:{" "}
                <code className="block mt-1 bg-slate-900 text-amber-100 p-2 rounded text-xs font-mono">
                  docker compose up -d --force-recreate backend
                </code>
              </li>
              <li>
                Пароль SMTP можно <strong>не класть в БД</strong>: оставьте чекбокс смены пароля выключенным и задайте{" "}
                <code className="bg-white px-1 rounded text-xs">SMTP_PASS</code> только в <code className="bg-white px-1 rounded text-xs">.env</code> на сервере.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-slate-900 mb-2">Откуда взять значения по полям формы</p>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white text-xs">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left border-b border-slate-200">
                    <th className="p-2 font-semibold text-slate-800">Поле</th>
                    <th className="p-2 font-semibold text-slate-800">Что это</th>
                    <th className="p-2 font-semibold text-slate-800">Где взять</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2 font-mono text-[11px]">SMTP host</td>
                    <td className="p-2">Сервер исходящей почты (MX/SMTP)</td>
                    <td className="p-2">В справке почтового ящика: обычно <code className="bg-slate-100 px-1">smtp.…</code></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-[11px]">Порт / Secure</td>
                    <td className="p-2">587 + STARTTLS или 465 + SSL</td>
                    <td className="p-2">
                      У провайдера в разделе «Почтовые клиенты». Для 465 укажите <code className="bg-slate-100 px-1">secure: true</code>.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-[11px]">Пользователь</td>
                    <td className="p-2">Логин к SMTP</td>
                    <td className="p-2">Часто полный email ящика, с которого разрешён исходящий SMTP</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-[11px]">Пароль</td>
                    <td className="p-2">Секрет для SMTP</td>
                    <td className="p-2">
                      <strong>Gmail / Google Workspace:</strong> аккаунт Google → безопасность → двухэтапная аутентификация →{" "}
                      <strong>пароли приложений</strong> (не обычный пароль от почты).{" "}
                      <strong>Yandex:</strong> пароль приложения в настройках почты. <strong>Mail.ru:</strong> пароль для внешнего приложения / IMAP-SMTP.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-[11px]">From</td>
                    <td className="p-2">Адрес в поле «От»</td>
                    <td className="p-2">
                      Должен быть разрешён вашим SMTP (часто совпадает с логином). Иначе провайдер отклонит отправку.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-[11px]">Алерты админу</td>
                    <td className="p-2">Куда слать служебные письма (вход админа и т. п.)</td>
                    <td className="p-2">Любой ваш рабочий email; в .env это же — <code className="bg-slate-100 px-1">ALERT_EMAIL_TO</code></td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono text-[11px]">Публичный URL фронта</td>
                    <td className="p-2">База ссылок в письмах (подтверждение email)</td>
                    <td className="p-2">
                      Тот же URL, что в браузере у пользователей, <strong>без</strong> завершающего слэша, например{" "}
                      <code className="bg-slate-100 px-1">https://vetconnect.online</code>. В .env —{" "}
                      <code className="bg-slate-100 px-1">FRONTEND_URL</code>.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="font-medium text-slate-900 mb-2">Типовые SMTP (проверяйте актуальность в справке провайдера)</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li>
                <strong>Gmail:</strong> <code className="bg-white px-1 rounded">smtp.gmail.com</code>, порт{" "}
                <code className="bg-white px-1 rounded">587</code>, <code className="bg-white px-1 rounded">secure: false</code>, пароль — только{" "}
                <strong>пароль приложения</strong>.
              </li>
              <li>
                <strong>Yandex:</strong> <code className="bg-white px-1 rounded">smtp.yandex.ru</code>, 465 +{" "}
                <code className="bg-white px-1 rounded">secure: true</code> или 587 + <code className="bg-white px-1 rounded">false</code> — по инструкции Яндекса.
              </li>
              <li>
                <strong>Mail.ru:</strong> <code className="bg-white px-1 rounded">smtp.mail.ru</code>, порт и SSL — по их справке; нужен пароль для внешнего приложения.
              </li>
              <li>
                <strong>Microsoft 365 / Outlook:</strong> обычно <code className="bg-white px-1 rounded">smtp.office365.com</code>, порт{" "}
                <code className="bg-white px-1 rounded">587</code>; логика авторизации — по документации Microsoft.
              </li>
              <li>
                <strong>Корпоративный сервер:</strong> хост и порт выдаёт IT; при самоподписанном сертификате на тесте в .env можно{" "}
                <code className="bg-white px-1 rounded">SMTP_TLS_REJECT_UNAUTHORIZED=false</code> (только осознанно).
              </li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-slate-900 mb-1">Шаблоны писем подтверждения</p>
            <p className="text-xs">
              Плейсхолдеры <code className="bg-white px-1 rounded">{"{{verifyUrl}}"}</code> и{" "}
              <code className="bg-white px-1 rounded">{"{{email}}"}</code> подставляются при отправке. Не удаляйте{" "}
              <code className="bg-white px-1 rounded">{"{{verifyUrl}}"}</code> из текста/HTML, иначе пользователь не сможет подтвердить почту.
            </p>
          </div>
        </div>
      </details>

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
            <Hint>Имя сервера из справки «исходящая почта / SMTP» вашего провайдера (часто smtp.домен).</Hint>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Порт</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              placeholder="587"
            />
            <Hint>Чаще 587 (STARTTLS) или 465 (SSL). Точное значение — в документации SMTP.</Hint>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Secure (true / false)</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.value)}
              placeholder="false"
            />
            <Hint>
              Для порта <strong>465</strong> обычно <code className="bg-slate-100 px-0.5 rounded">true</code>, для{" "}
              <strong>587</strong> — <code className="bg-slate-100 px-0.5 rounded">false</code> (STARTTLS включается автоматически).
            </Hint>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Пользователь SMTP</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
            />
            <Hint>Как правило полный email ящика, с которого разрешена отправка через SMTP.</Hint>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">From (адрес отправителя)</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder="noreply@vetconnect.online"
            />
            <Hint>Должен совпадать с разрешённым «отправителем» у провайдера; часто тот же адрес, что и логин SMTP.</Hint>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Алерты админу (ALERT_EMAIL_TO)</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={alertTo}
              onChange={(e) => setAlertTo(e.target.value)}
              placeholder="security@…"
            />
            <Hint>Ящик для служебных писем (вход администратора, всплеск неудачных логинов). Может совпадать с вашим личным email.</Hint>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Публичный URL фронта (ссылки в письмах)</span>
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={frontendUrl}
              onChange={(e) => setFrontendUrl(e.target.value)}
              placeholder="https://vetconnect.online"
            />
            <Hint>
              Ровно тот адрес сайта, который открывают пользователи, <strong>без</strong> слэша в конце — в письме соберётся ссылка вида{" "}
              <code className="bg-slate-100 px-0.5 rounded">…/verify-email?token=…</code>.
            </Hint>
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
            <div className="max-w-md space-y-1">
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={smtpPassDraft}
                onChange={(e) => setSmtpPassDraft(e.target.value)}
                placeholder="Пусто при сохранении — удалить пароль из БД"
              />
              <Hint>
                Gmail / Google — только <strong>пароль приложения</strong>. Пустое сохранение убирает пароль из БД и тогда
                используется <code className="bg-slate-100 px-0.5 rounded">SMTP_PASS</code> из .env на сервере.
              </Hint>
            </div>
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
        <Hint>Редактируйте текст как угодно; главное — оставить плейсхолдер ссылки, иначе подтверждение регистрации сломается.</Hint>
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
