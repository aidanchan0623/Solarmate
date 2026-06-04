import { AlertTriangle, CheckCircle2, Lightbulb, TrendingUp, Info } from 'lucide-react';

const insightThemes = {
  tip: {
    shell: 'border-amber-200/60 bg-gradient-to-br from-amber-50/90 via-white to-yellow-50/60',
    icon: 'bg-amber-100 text-amber-600',
    glow: 'bg-amber-200/50',
    title: 'text-amber-900',
    body: 'text-amber-800/90',
    badge: 'bg-amber-100/80 text-amber-700 border-amber-200/60',
    IconComponent: Lightbulb
  },
  warning: {
    shell: 'border-rose-200/60 bg-gradient-to-br from-rose-50/90 via-white to-orange-50/60',
    icon: 'bg-rose-100 text-rose-600',
    glow: 'bg-rose-200/50',
    title: 'text-rose-900',
    body: 'text-rose-800/90',
    badge: 'bg-rose-100/80 text-rose-700 border-rose-200/60',
    IconComponent: AlertTriangle
  },
  success: {
    shell: 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60',
    icon: 'bg-emerald-100 text-emerald-600',
    glow: 'bg-emerald-200/50',
    title: 'text-emerald-900',
    body: 'text-emerald-800/90',
    badge: 'bg-emerald-100/80 text-emerald-700 border-emerald-200/60',
    IconComponent: CheckCircle2
  },
  trend: {
    shell: 'border-sky-200/60 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/60',
    icon: 'bg-sky-100 text-sky-600',
    glow: 'bg-sky-200/50',
    title: 'text-sky-900',
    body: 'text-sky-800/90',
    badge: 'bg-sky-100/80 text-sky-700 border-sky-200/60',
    IconComponent: TrendingUp
  },
  info: {
    shell: 'border-slate-200/60 bg-gradient-to-br from-slate-50/90 via-white to-slate-50/60',
    icon: 'bg-slate-100 text-slate-600',
    glow: 'bg-slate-200/50',
    title: 'text-slate-900',
    body: 'text-slate-700',
    badge: 'bg-slate-100/80 text-slate-600 border-slate-200/60',
    IconComponent: Info
  }
};

export default function InsightCard({ type = 'tip', title, message, metric, className = '' }) {
  const theme = insightThemes[type] || insightThemes.tip;
  const { IconComponent } = theme;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${theme.shell} ${className}`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-60 ${theme.glow}`} />
      <div className="relative flex items-start gap-3">
        <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${theme.icon}`}>
          <IconComponent size={16} strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-bold leading-snug ${theme.title}`}>{title}</h4>
            {metric && (
              <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${theme.badge}`}>
                {metric}
              </span>
            )}
          </div>
          <p className={`mt-1 text-xs font-medium leading-relaxed ${theme.body}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}

export function InsightStack({ insights = [], className = '' }) {
  if (!insights.length) return null;
  return (
    <div className={`grid gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-200/60 to-transparent" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">AI-Powered Insights</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-teal-200/60 to-transparent" />
      </div>
      {insights.map((insight, index) => (
        <InsightCard key={index} {...insight} />
      ))}
    </div>
  );
}
