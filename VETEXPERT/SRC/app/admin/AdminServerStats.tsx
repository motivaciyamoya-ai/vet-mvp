import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Gauge, RefreshCw } from "lucide-react";
import { apiFetch } from "../../lib/api";

type Dash = { id: string; label: string; url: string };

export default function AdminServerStats() {
  const dashes: Dash[] = useMemo(
    () => [
      {
        id: "host",
        label: "Host + Containers (VetConnect)",
        // Grafana за subpath часто делает редирект без завершающего «/»; для iframe это лишние запросы + auth_request.
        url: "/grafana/d/vetconnect-host/vetconnect-host-containers/?orgId=1&kiosk",
      },
    ],
    [],
  );
  const [dashId, setDashId] = useState(dashes[0]!.id);
  const dash = dashes.find((d) => d.id === dashId) ?? dashes[0]!;

  const [reloadKey, setReloadKey] = useState(0);
  const [authErr, setAuthErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await apiFetch("/api/admin/monitoring/session", { method: "POST" });
        if (!cancelled) setReloadKey((x) => x + 1); // ensure iframe reload after cookie is set
      } catch (e: unknown) {
        if (!cancelled) setAuthErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Статистика сервера</h1>
            <p className="text-sm text-slate-600 mt-1">
              Grafana (Prometheus) — загрузка хоста, контейнеров и сеть/диск. Доступ идёт через /grafana (внутренние сервисы).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/grafana/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800"
          >
            <ExternalLink className="w-4 h-4" />
            Открыть Grafana
          </a>
          <a
            href="/prometheus/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50"
          >
            <ExternalLink className="w-4 h-4" />
            Prometheus
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1">
          <label className="text-sm font-semibold text-slate-800">Дашборд</label>
          <select
            value={dashId}
            onChange={(e) => setDashId(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          >
            {dashes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((x) => x + 1)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить
          </button>
          <a
            href={dash.url.replace("&kiosk", "")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            <ExternalLink className="w-4 h-4" />
            Во весь экран
          </a>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        {authErr ? (
          <div className="p-4 border-b border-red-200 bg-red-50 text-sm text-red-800">
            Не удалось авторизовать доступ к мониторингу. {authErr}
          </div>
        ) : null}
        <iframe
          key={`${dash.id}:${reloadKey}`}
          title="Grafana"
          src={dash.url}
          className="w-full h-[78vh] bg-white"
        />
      </div>

      <div className="text-xs text-slate-600">
        Если графики не загружаются: проверьте доступ к `/grafana` и `/prometheus` на edge (NPM) и что сервисы Prometheus/Grafana запущены.
      </div>
    </div>
  );
}

