import { useEffect, useMemo, useState } from "react";
import { Loader, History, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import type { MedicalAnalyzerHistoryRowDto } from "../../lib/api";
import { apiMedicalAnalyzerHistory } from "../../lib/api";

function kindLabel(kind: MedicalAnalyzerHistoryRowDto["kind"]) {
  return kind === "anamnesis" ? "Анамнез" : "УЗИ / Рентген";
}

function statusPill(row: MedicalAnalyzerHistoryRowDto) {
  if (row.status === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Успешно
      </span>
    );
  }
  if (row.status === "EMPTY") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
        <MinusCircle className="w-3.5 h-3.5" />
        Пусто
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200 text-xs font-semibold">
      <AlertTriangle className="w-3.5 h-3.5" />
      Ошибка
    </span>
  );
}

export default function MedicalAnalyzerHistory() {
  const [rows, setRows] = useState<MedicalAnalyzerHistoryRowDto[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setErr("");
      try {
        const r = await apiMedicalAnalyzerHistory();
        if (!cancelled) setRows(r);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasAny = (rows?.length ?? 0) > 0;
  const sorted = useMemo(() => {
    const xs = rows ?? [];
    return [...xs].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [rows]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <History className="w-5 h-5 text-slate-700" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-base lg:text-lg">История AI‑анализов</h3>
          <p className="text-xs text-gray-600 mt-0.5">Сохраняем результаты (успех/пусто/ошибка) для прозрачности.</p>
        </div>
      </div>

      {err ? <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">{err}</div> : null}

      {busy && rows == null ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader className="w-4 h-4 animate-spin" />
          Загружаем историю…
        </div>
      ) : !hasAny ? (
        <div className="text-sm text-gray-600">Пока нет сохранённых анализов.</div>
      ) : (
        <div className="space-y-2">
          {sorted.slice(0, 30).map((r) => {
            const opened = openId === r.id;
            const dt = new Date(r.createdAt);
            const when = Number.isNaN(dt.getTime()) ? r.createdAt : dt.toLocaleString("ru-RU");
            return (
              <div key={r.id} className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(opened ? null : r.id)}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{kindLabel(r.kind)}</span>
                      {statusPill(r)}
                      <span className="text-xs text-gray-500">• {when}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {r.provider} / {r.model} • изображений: {r.imagesCount} •{" "}
                      {r.charged ? `списано: ${r.cost}` : "без списания"}
                    </div>
                  </div>
                  <div className="shrink-0 text-gray-500">{opened ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
                </button>

                {opened ? (
                  <div className="px-4 py-3 bg-white">
                    {r.status === "ERROR" ? (
                      <div className="text-sm text-red-700 whitespace-pre-wrap">{r.errorMessage || "Ошибка без сообщения"}</div>
                    ) : r.result ? (
                      <div className="space-y-3">
                        {r.result.diagnosis?.length ? (
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Предварительный диагноз</div>
                            <ul className="list-disc pl-5 text-sm text-gray-900 space-y-1">
                              {r.result.diagnosis.map((x, i) => (
                                <li key={i}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {r.result.recommendations?.length ? (
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Рекомендации</div>
                            <ul className="list-disc pl-5 text-sm text-gray-900 space-y-1">
                              {r.result.recommendations.map((x, i) => (
                                <li key={i}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {r.result.additionalTests?.length ? (
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Доп. исследования</div>
                            <ul className="list-disc pl-5 text-sm text-gray-900 space-y-1">
                              {r.result.additionalTests.map((x, i) => (
                                <li key={i}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {r.result.notesForDoctor?.length ? (
                          <div>
                            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Заметки для врача</div>
                            <ul className="list-disc pl-5 text-sm text-gray-900 space-y-1">
                              {r.result.notesForDoctor.map((x, i) => (
                                <li key={i}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {r.result.disclaimer ? (
                          <div className="text-xs text-gray-500 whitespace-pre-wrap">{r.result.disclaimer}</div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">Результат не сохранён.</div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
          <div className="text-xs text-gray-500">Показываем последние 30 запусков.</div>
        </div>
      )}
    </div>
  );
}

