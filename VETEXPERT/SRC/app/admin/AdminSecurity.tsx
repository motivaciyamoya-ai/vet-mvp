import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../contexts/AuthContext";

type FlagResponse = {
  registrationClosed: boolean;
  dmRequiresVerified: boolean;
  contentRequiresVerifiedEmail: boolean;
  requireAdminTotp: boolean;
};

type AuditRow = {
  id: string;
  createdAt: string;
  action: string;
  actorUserId: string | null;
  actorEmail: string | null;
  details: unknown;
  ip: string | null;
  userAgent: string | null;
};

const KEYS = {
  registrationClosed: "site.security.registration_closed",
  dmRequiresVerified: "site.security.dm_requires_verified",
  verifiedEmailRequiredToMessage: "site.security.verified_email_required_to_message",
  requireAdminTotp: "site.security.require_admin_totp",
} as const;

function truthy(v: string): boolean {
  const t = v.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes" || t === "on";
}

export default function AdminSecurity() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [flags, setFlags] = useState<FlagResponse | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);

  // 2FA setup
  const [otpauthUrl, setOtpauthUrl] = useState<string>("");
  const [totpCode, setTotpCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");

  const load = useCallback(async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const [f, a] = await Promise.all([
        apiFetch<FlagResponse>("/api/admin/security/flags"),
        apiFetch<AuditRow[]>("/api/admin/security/audit?take=120"),
      ]);
      setFlags(f);
      setAudit(a);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggles = useMemo(() => {
    return {
      registrationClosed: flags?.registrationClosed ?? false,
      dmRequiresVerified: flags?.dmRequiresVerified ?? false,
      contentRequiresVerifiedEmail: flags?.contentRequiresVerifiedEmail ?? false,
      requireAdminTotp: flags?.requireAdminTotp ?? false,
    };
  }, [flags]);

  const saveToggle = async (key: string, value: boolean) => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      await apiFetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        json: { value: value ? "true" : "false" },
      });
      setOk("Сохранено.");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const setup2fa = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      const res = await apiFetch<{ otpauthUrl: string }>("/api/auth/2fa/setup", { method: "POST", json: {} });
      setOtpauthUrl(res.otpauthUrl);
      setOk("Секрет 2FA создан. Отсканируйте QR (по otpauth://) и введите код.");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const enable2fa = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      await apiFetch("/api/auth/2fa/enable", { method: "POST", json: { code: totpCode.trim() } });
      setOk("2FA включена.");
      setTotpCode("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const disable2fa = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      await apiFetch("/api/auth/2fa/disable", { method: "POST", json: { password: disablePassword } });
      setOk("2FA отключена.");
      setDisablePassword("");
      setOtpauthUrl("");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const revokeAll = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      const res = await apiFetch<{ ok: boolean; deletedRefreshTokens: number }>(
        "/api/admin/security/revoke-all-sessions",
        { method: "POST" },
      );
      setOk(`Сессии отозваны (refresh tokens удалено: ${res.deletedRefreshTokens}).`);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Безопасность</h1>
        <p className="text-slate-600 text-sm mt-1">
          Управляемые флаги безопасности, 2FA администратора, аудит и экстренные действия.
        </p>
      </div>

      {err ? <p className="text-red-600 text-sm">{err}</p> : null}
      {ok ? <p className="text-emerald-700 text-sm">{ok}</p> : null}

      {loading ? (
        <p className="text-slate-600 text-sm">Загрузка…</p>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Флаги безопасности</h2>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={toggles.registrationClosed}
                disabled={saving}
                onChange={(e) => void saveToggle(KEYS.registrationClosed, e.target.checked)}
              />
              <span className="text-sm text-slate-800">Закрыть регистрацию</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={toggles.contentRequiresVerifiedEmail}
                disabled={saving}
                onChange={(e) => void saveToggle(KEYS.verifiedEmailRequiredToMessage, e.target.checked)}
              />
              <span className="text-sm text-slate-800">Только подтверждённые email могут писать (чат/ЛС/форум)</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={toggles.dmRequiresVerified}
                disabled={saving}
                onChange={(e) => void saveToggle(KEYS.dmRequiresVerified, e.target.checked)}
              />
              <span className="text-sm text-slate-800">Только подтверждённые email могут писать личные сообщения</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={toggles.requireAdminTotp}
                disabled={saving}
                onChange={(e) => void saveToggle(KEYS.requireAdminTotp, e.target.checked)}
              />
              <span className="text-sm text-slate-800">Требовать 2FA (TOTP) для админки</span>
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">2FA (TOTP) для ADMIN</h2>

            <p className="text-sm text-slate-600">
              Текущий аккаунт: <span className="font-mono">{user?.email}</span>. 2FA:{" "}
              <strong>{user?.totpEnabled ? "включена" : "выключена"}</strong>.
            </p>

            {!user?.totpEnabled ? (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void setup2fa()}
                  className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm hover:bg-emerald-800 disabled:opacity-50"
                >
                  Сгенерировать секрет 2FA
                </button>

                {otpauthUrl ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-600 mb-2">
                      `otpauth://` (можно вставить в генератор QR или открыть в приложении):
                    </p>
                    <pre className="text-xs whitespace-pre-wrap break-all">{otpauthUrl}</pre>
                  </div>
                ) : null}

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  <label className="w-full">
                    <span className="block text-sm font-medium text-slate-800 mb-1">Код из приложения</span>
                    <input
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      inputMode="numeric"
                      placeholder="123456"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={saving || !/^\d{6}$/.test(totpCode.trim())}
                    onClick={() => void enable2fa()}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-black disabled:opacity-50"
                  >
                    Включить 2FA
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  <label className="w-full">
                    <span className="block text-sm font-medium text-slate-800 mb-1">Пароль (для отключения 2FA)</span>
                    <input
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      type="password"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={saving || disablePassword.length < 8}
                    onClick={() => void disable2fa()}
                    className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm hover:bg-red-800 disabled:opacity-50"
                  >
                    Отключить 2FA
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Экстренные действия</h2>
            <button
              type="button"
              disabled={saving}
              onClick={() => void revokeAll()}
              className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm hover:bg-amber-800 disabled:opacity-50"
            >
              Отозвать все сессии (refresh tokens)
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-900">Audit log</h2>
            {audit.length === 0 ? (
              <p className="text-sm text-slate-600">Пока пусто.</p>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="py-2 pr-3">Время</th>
                      <th className="py-2 pr-3">Действие</th>
                      <th className="py-2 pr-3">Кто</th>
                      <th className="py-2 pr-3">IP</th>
                      <th className="py-2 pr-3">Детали</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 align-top">
                        <td className="py-2 pr-3 font-mono text-xs">{new Date(r.createdAt).toISOString()}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{r.action}</td>
                        <td className="py-2 pr-3">{r.actorEmail ?? r.actorUserId ?? "—"}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{r.ip ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <pre className="text-xs whitespace-pre-wrap break-word max-w-[520px]">
                            {r.details ? JSON.stringify(r.details) : "—"}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

