import { ArrowLeft, CalendarDays, ExternalLink, MapPin, Users, Target, LayoutGrid } from "lucide-react";
import { Link, useParams } from "react-router";
import { useEffect, useState } from "react";
import { apiVetEventById, type VetEventDto } from "../../lib/api";
import EventCommentsSection from "../components/EventCommentsSection";

function sourceBadge(s: VetEventDto) {
  if (s.source === "ics") return "ICS";
  if (s.source === "rss") return "RSS";
  if (s.source === "seed") return "демо";
  if (s.source === "manual") return "вручную";
  return s.source;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ev, setEv] = useState<VetEventDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id?.trim()) {
      setErr("Некорректная ссылка");
      setLoading(false);
      setEv(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr("");
    apiVetEventById(id)
      .then((row) => {
        if (!cancelled) setEv(row);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setEv(null);
          setErr(e instanceof Error ? e.message : "Мероприятие не найдено");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-600">
        Загрузка…
      </div>
    );
  }

  if (err || !ev) {
    return (
      <div className="max-w-lg mx-auto space-y-6 text-center py-12">
        <h1 className="text-xl font-bold text-gray-900">Мероприятие недоступно</h1>
        <p className="text-gray-600 text-sm">{err || "Не удалось открыть карточку."}</p>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-emerald-700 font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          К календарю
        </Link>
      </div>
    );
  }

  const start = new Date(ev.startsAt);
  const end = ev.endsAt ? new Date(ev.endsAt) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-emerald-700 font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Календарь
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 truncate max-w-[14rem] sm:max-w-none">{ev.title}</span>
      </div>

      <header className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/40 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wide text-emerald-800 bg-white/80 border border-emerald-100 px-2 py-0.5 rounded font-bold">
            {sourceBadge(ev)}
          </span>
          <span className="inline-flex items-center gap-1 text-sm text-gray-600">
            <CalendarDays className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
            {start.toLocaleString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {end ? (
              <>
                {" "}
                —{" "}
                {end.toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            ) : null}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{ev.title}</h1>

        {(ev.organizers || ev.audience || ev.eventFormat || ev.location || ev.description) && (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
            {ev.organizers ? (
              <div className="rounded-2xl bg-white/70 border border-white/80 p-4">
                <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
                  <Users className="w-3.5 h-3.5" aria-hidden />
                  Организаторы
                </dt>
                <dd className="text-gray-800 whitespace-pre-wrap">{ev.organizers}</dd>
              </div>
            ) : null}
            {ev.audience ? (
              <div className="rounded-2xl bg-white/70 border border-white/80 p-4">
                <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
                  <Target className="w-3.5 h-3.5" aria-hidden />
                  Для кого
                </dt>
                <dd className="text-gray-800 whitespace-pre-wrap">{ev.audience}</dd>
              </div>
            ) : null}
            {ev.eventFormat ? (
              <div className="rounded-2xl bg-white/70 border border-white/80 p-4">
                <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
                  <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
                  Формат
                </dt>
                <dd className="text-gray-800 whitespace-pre-wrap">{ev.eventFormat}</dd>
              </div>
            ) : null}
            {ev.location ? (
              <div className="rounded-2xl bg-white/70 border border-white/80 p-4">
                <dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
                  <MapPin className="w-3.5 h-3.5" aria-hidden />
                  Локация
                </dt>
                <dd className="text-gray-800 whitespace-pre-wrap">{ev.location}</dd>
              </div>
            ) : null}
          </dl>
        )}

        {ev.description ? (
          <div className="mt-6 pt-6 border-t border-emerald-100/80">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Описание</h2>
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{ev.description}</p>
          </div>
        ) : null}

        {ev.url ? (
          <div className="mt-6">
            <a
              href={ev.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
            >
              Внешняя страница мероприятия
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : null}
      </header>

      {id ? <EventCommentsSection eventId={id} /> : null}
    </div>
  );
}
