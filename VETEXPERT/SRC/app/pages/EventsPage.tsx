import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiVetEvents, type VetEventDto } from "../../lib/api";

function monthRangeLocal(y: number, m0: number): { from: string; to: string } {
  const from = new Date(y, m0, 1, 0, 0, 0, 0);
  const to = new Date(y, m0 + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function dayKeyRu(d: Date): string {
  return d.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Понедельник = 0 … воскресенье = 6 */
function weekdayMon0(jsDay: number) {
  return (jsDay + 6) % 7;
}

function buildMonthGrid(year: number, month0: number): (number | null)[] {
  const first = new Date(year, month0, 1);
  const blanks = weekdayMon0(first.getDay());
  const daysIn = new Date(year, month0 + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < blanks; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function ymPrefix(y: number, m0: number) {
  return `${y}-${String(m0 + 1).padStart(2, "0")}`;
}

function countEventsByDom(year: number, month0: number, items: VetEventDto[]): Map<number, number> {
  const map = new Map<number, number>();
  const pref = ymPrefix(year, month0);
  for (const ev of items) {
    const dt = new Date(ev.startsAt);
    if (`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}` !== pref) continue;
    const dom = dt.getDate();
    map.set(dom, (map.get(dom) ?? 0) + 1);
  }
  return map;
}

function eventsOnDom(year: number, month0: number, dom: number, items: VetEventDto[]): VetEventDto[] {
  const out: VetEventDto[] = [];
  for (const ev of items) {
    const dt = new Date(ev.startsAt);
    if (dt.getFullYear() !== year || dt.getMonth() !== month0 || dt.getDate() !== dom) continue;
    out.push(ev);
  }
  return out.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

function firstInterestingDom(year: number, month0: number, items: VetEventDto[], today: Date): number {
  if (today.getFullYear() === year && today.getMonth() === month0) return today.getDate();
  let best: number | null = null;
  for (const ev of items) {
    const dt = new Date(ev.startsAt);
    if (dt.getFullYear() !== year || dt.getMonth() !== month0) continue;
    const dom = dt.getDate();
    if (best === null || dom < best) best = dom;
  }
  return best ?? 1;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function EventsPage() {
  const today = useMemo(() => new Date(), []);
  const initialY = today.getFullYear();
  const initialM = today.getMonth();
  const [cursor, setCursor] = useState({ y: initialY, m0: initialM });
  const [items, setItems] = useState<VetEventDto[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDom, setSelectedDom] = useState(1);

  const { from, to } = monthRangeLocal(cursor.y, cursor.m0);

  useEffect(() => {
    setSelectedDom(1);
  }, [cursor.y, cursor.m0]);

  useEffect(() => {
    let cancelled = false;
    setErr("");
    setLoading(true);
    setItems([]);
    apiVetEvents({ from, to })
      .then((r) => {
        if (!cancelled) setItems(r.items);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Не удалось загрузить мероприятия");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  useEffect(() => {
    if (loading) return;
    setSelectedDom(firstInterestingDom(cursor.y, cursor.m0, items, today));
  }, [cursor.y, cursor.m0, items, loading, today]);

  const grid = useMemo(() => buildMonthGrid(cursor.y, cursor.m0), [cursor.y, cursor.m0]);
  const counts = useMemo(() => countEventsByDom(cursor.y, cursor.m0, items), [cursor.y, cursor.m0, items]);

  const titleLabel = useMemo(() => {
    return new Date(cursor.y, cursor.m0, 1).toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });
  }, [cursor.y, cursor.m0]);

  const shiftMonth = (delta: number) => {
    setCursor(({ y, m0 }) => {
      const dt = new Date(y, m0 + delta, 1);
      return { y: dt.getFullYear(), m0: dt.getMonth() };
    });
  };

  const sourceBadge = (s: VetEventDto) => {
    if (s.source === "ics") return "ICS";
    if (s.source === "rss") return "RSS";
    if (s.source === "seed") return "демо";
    if (s.source === "manual") return "вручную";
    return s.source;
  };

  const selectedDate = new Date(cursor.y, cursor.m0, selectedDom);
  const dayEvents = eventsOnDom(cursor.y, cursor.m0, selectedDom, items);
  const isToday =
    today.getFullYear() === cursor.y && today.getMonth() === cursor.m0 && today.getDate() === selectedDom;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <style>{`
        @keyframes ev-cal-pop {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ev-cal-shimmer {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        @keyframes ev-panel-in {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .ev-cal-cell {
          animation: ev-cal-pop 0.42s cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        .ev-panel-sweep {
          animation: ev-panel-in 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <span className="relative inline-flex">
              <CalendarDays className="w-8 h-8 text-emerald-600 shrink-0" aria-hidden />
              <Sparkles
                className="w-4 h-4 text-amber-400 absolute -right-1 -top-1 motion-safe:animate-pulse"
                aria-hidden
              />
            </span>
            Мероприятия для ветспециалистов
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base max-w-2xl">
            Интерактивный календарь: выберите день. События подтягиваются из ICS/RSS и ручных записей в админ-панели.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 bg-white/80 backdrop-blur rounded-2xl border border-emerald-100 px-2 py-1 shadow-sm">
          <button
            type="button"
            aria-label="Предыдущий месяц"
            className="p-2 rounded-xl border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="min-w-[11rem] text-center font-bold text-gray-900 capitalize tracking-tight">{titleLabel}</span>
          <button
            type="button"
            aria-label="Следующий месяц"
            className="p-2 rounded-xl border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 text-sm">{err}</div>
      )}
      {loading && <p className="text-gray-600 text-sm">Загрузка…</p>}

      {!loading && !err && (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] gap-6 lg:gap-8 items-start">
          <div
            key={`${cursor.y}-${cursor.m0}`}
            className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/50 p-4 sm:p-6 shadow-[0_20px_60px_-24px_rgba(16,185,129,0.35)] ring-1 ring-emerald-100/80"
          >
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800/70 py-1"
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {grid.map((cell, idx) => {
                if (cell === null) {
                  return <div key={`e-${idx}`} className="aspect-square sm:min-h-[3.25rem]" aria-hidden />;
                }
                const n = counts.get(cell) ?? 0;
                const isSel = cell === selectedDom;
                const isDayToday =
                  today.getFullYear() === cursor.y && today.getMonth() === cursor.m0 && today.getDate() === cell;
                return (
                  <button
                    key={`d-${cell}`}
                    type="button"
                    onClick={() => setSelectedDom(cell)}
                    style={{ animationDelay: `${idx * 18}ms` }}
                    className={[
                      "ev-cal-cell aspect-square sm:min-h-[3.25rem] rounded-2xl border text-sm font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 relative overflow-hidden",
                      isSel
                        ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-transparent shadow-lg scale-[1.03] z-10 ring-2 ring-white/80"
                        : "bg-white/90 border-emerald-100/80 text-gray-800 hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5",
                      isDayToday && !isSel ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-emerald-50/30" : "",
                    ].join(" ")}
                  >
                    {!isSel && n > 0 ? (
                      <span
                        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-90"
                        style={{ animation: "ev-cal-shimmer 2.4s ease-in-out infinite" }}
                        aria-hidden
                      />
                    ) : null}
                    <span className="tabular-nums relative z-[1]">{cell}</span>
                    {n > 0 ? (
                      <span
                        className={`text-[10px] font-bold tabular-nums relative z-[1] ${
                          isSel ? "text-emerald-100" : "text-emerald-700"
                        }`}
                      >
                        {n} {n === 1 ? "событие" : n < 5 ? "события" : "событий"}
                      </span>
                    ) : (
                      <span className="text-[9px] text-gray-300 relative z-[1]">—</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div
              key={`panel-${selectedDom}-${cursor.y}-${cursor.m0}`}
              className="ev-panel-sweep rounded-3xl border border-gray-200 bg-white p-5 shadow-lg shadow-emerald-900/5"
            >
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {dayKeyRu(selectedDate)}
                {isToday ? (
                  <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    сегодня
                  </span>
                ) : null}
              </h2>
              <p className="text-xs text-gray-500 mt-1">Выбрано в календаре · нажмите другой день слева</p>

              {dayEvents.length === 0 ? (
                <p className="mt-6 text-gray-600 text-sm leading-relaxed">
                  В этот день событий нет. Попробуйте другую дату или другой месяц.
                </p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {dayEvents.map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50/80 to-white p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-wrap gap-2 items-start justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wide text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                              {sourceBadge(ev)}
                            </span>
                            <span className="text-xs text-gray-500 tabular-nums">
                              {new Date(ev.startsAt).toLocaleTimeString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {ev.endsAt ? (
                                <>
                                  {" "}
                                  —{" "}
                                  {new Date(ev.endsAt).toLocaleTimeString("ru-RU", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </>
                              ) : null}
                            </span>
                          </div>
                          <p className="font-semibold text-gray-900 leading-snug">{ev.title}</p>
                          {ev.location ? (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" aria-hidden />
                              {ev.location}
                            </p>
                          ) : null}
                          {ev.description ? (
                            <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-4">{ev.description}</p>
                          ) : null}
                        </div>
                        {ev.url ? (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
                          >
                            Подробнее
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-gray-500 leading-relaxed px-1">
              Даты из RSS часто приблизительны. Повторяющиеся события из ICS (RRULE) пока не разворачиваются — только
              разовые VEVENT.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
