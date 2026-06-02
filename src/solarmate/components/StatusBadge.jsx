export default function StatusBadge({ children, tone = 'neutral' }) {
  const toneStyles = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/50',
    neutral: 'bg-slate-50 text-slate-700 border border-slate-200/50',
    processing: 'bg-blue-50 text-blue-700 border border-blue-200/50'
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${toneStyles[tone] || toneStyles.neutral} hover:shadow-sm`}
    >
      {children}
    </span>
  );
}
