import { useMemo, useState } from "react";
import { Sparkles, Send, Loader } from "lucide-react";
import { apiFetch } from "../../lib/api";

type ChatRow = { role: "user" | "assistant"; text: string };

export default function RoleAssistant() {
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const canSend = useMemo(() => message.trim().length > 0 && !busy, [message, busy]);

  const send = async () => {
    const text = message.trim();
    if (!text || busy) return;
    setErr("");
    setBusy(true);
    setMessage("");
    setRows((prev) => [...prev, { role: "user", text }]);
    try {
      const res = await apiFetch<{ answer: string }>("/api/ai/role-assistant", {
        method: "POST",
        json: { message: text },
      });
      setRows((prev) => [...prev, { role: "assistant", text: res.answer }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-fuchsia-100 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-fuchsia-700" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-base lg:text-lg">AI помощник Администратора / Руководителя</h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Бесплатно, без VetCoin. Доступно для категорий «Администратор» и «Владелец бизнеса».
          </p>
        </div>
      </div>

      {err ? (
        <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">{err}</div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 max-h-[360px] overflow-auto space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-gray-600">
            Примеры:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Сделай шаблон ответа клиенту на жалобу.</li>
              <li>Составь регламент обработки SOS обращений.</li>
              <li>Предложи KPI и план роста выручки на 30 дней.</li>
            </ul>
          </div>
        ) : null}

        {rows.map((r, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg border text-sm whitespace-pre-wrap ${
              r.role === "user"
                ? "border-emerald-200 bg-white"
                : "border-fuchsia-200 bg-white"
            }`}
          >
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
              {r.role === "user" ? "Вы" : "AI"}
            </div>
            {r.text}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Напишите запрос…"
          className="flex-1 resize-none px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-200"
        />
        <button
          type="button"
          disabled={!canSend}
          onClick={() => void send()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-fuchsia-700 text-white text-sm font-semibold hover:bg-fuchsia-800 disabled:opacity-60"
        >
          {busy ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Отправить
        </button>
      </div>
    </div>
  );
}

