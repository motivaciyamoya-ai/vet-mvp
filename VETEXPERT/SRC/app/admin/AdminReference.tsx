import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Country = { id: string; code: string; nameRu: string; _count?: { profiles: number } };
type Job = { id: string; nameRu: string; _count?: { profiles: number } };

export default function AdminReference() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [newC, setNewC] = useState({ code: "", nameRu: "" });
  const [newJ, setNewJ] = useState({ nameRu: "" });
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setErr("");
    Promise.all([
      apiFetch<Country[]>("/api/admin/reference/countries"),
      apiFetch<Job[]>("/api/admin/reference/job-titles"),
    ])
      .then(([c, j]) => {
        setCountries(c);
        setJobs(j);
      })
      .catch((e) => setErr(String(e.message)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addCountry = async () => {
    try {
      await apiFetch("/api/admin/reference/countries", {
        method: "POST",
        json: newC,
      });
      setNewC({ code: "", nameRu: "" });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const delCountry = async (id: string) => {
    if (!confirm("Удалить страну?")) return;
    try {
      await apiFetch(`/api/admin/reference/countries/${id}`, { method: "DELETE" });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const addJob = async () => {
    try {
      await apiFetch("/api/admin/reference/job-titles", {
        method: "POST",
        json: newJ,
      });
      setNewJ({ nameRu: "" });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const delJob = async (id: string) => {
    if (!confirm("Удалить должность?")) return;
    try {
      await apiFetch(`/api/admin/reference/job-titles/${id}`, { method: "DELETE" });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Справочники</h1>
      {err && <p className="text-red-600">{err}</p>}

      <section>
        <h2 className="text-lg font-semibold mb-2">Страны</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            className="border rounded px-2 py-1 w-24"
            placeholder="Код"
            value={newC.code}
            onChange={(e) => setNewC((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
          />
          <input
            className="border rounded px-2 py-1 flex-1 min-w-[160px]"
            placeholder="Название"
            value={newC.nameRu}
            onChange={(e) => setNewC((c) => ({ ...c, nameRu: e.target.value }))}
          />
          <button type="button" className="bg-emerald-600 text-white px-4 py-1 rounded" onClick={addCountry}>
            Добавить
          </button>
        </div>
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Код</th>
                <th className="text-left p-3">Название</th>
                <th className="text-left p-3">Профилей</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {countries.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-mono">{c.code}</td>
                  <td className="p-3">{c.nameRu}</td>
                  <td className="p-3">{c._count?.profiles ?? "—"}</td>
                  <td className="p-3 text-right">
                    <button type="button" className="text-red-600 underline" onClick={() => delCountry(c.id)}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Должности</h2>
        <div className="flex gap-2 mb-4">
          <input
            className="border rounded px-2 py-1 flex-1 max-w-md"
            placeholder="Название должности"
            value={newJ.nameRu}
            onChange={(e) => setNewJ({ nameRu: e.target.value })}
          />
          <button type="button" className="bg-emerald-600 text-white px-4 py-1 rounded" onClick={addJob}>
            Добавить
          </button>
        </div>
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3">Название</th>
                <th className="text-left p-3">Профилей</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t">
                  <td className="p-3">{j.nameRu}</td>
                  <td className="p-3">{j._count?.profiles ?? "—"}</td>
                  <td className="p-3 text-right">
                    <button type="button" className="text-red-600 underline" onClick={() => delJob(j.id)}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
