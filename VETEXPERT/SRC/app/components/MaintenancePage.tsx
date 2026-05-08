import { ShieldAlert } from "lucide-react";

export default function MaintenancePage(props: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-emerald-950 text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-6 py-8 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-emerald-200" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{props.title}</h1>
            <p className="mt-3 text-white/85 leading-relaxed">{props.message}</p>
            <p className="mt-5 text-xs text-white/60">
              Если вы администратор — откройте <span className="font-mono">/admin</span>, чтобы отключить режим техработ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

