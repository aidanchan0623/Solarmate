import { useEffect, useRef, useState } from 'react';

const gradientMap = {
  teal: 'bg-gradient-to-r from-teal-600 to-emerald-400 shadow-[0_0_15px_rgba(45,212,191,0.4)]',
  gold: 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
  green: 'bg-gradient-to-r from-green-600 to-lime-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
  grey: 'bg-gradient-to-r from-slate-400 to-slate-300 shadow-[0_0_15px_rgba(100,116,139,0.2)]',
  blueGrey: 'bg-gradient-to-r from-blue-400 to-cyan-300 shadow-[0_0_15px_rgba(14,165,233,0.25)]',
  mutedBlue: 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
};

const colorMap = {
  teal: '#0d9488',
  gold: '#d97706',
  green: '#16a34a',
  grey: '#6b7280',
  blueGrey: '#3b82f6',
  mutedBlue: '#0ea5e9'
};

const hoverGlowMap = {
  teal: 'focus-visible:shadow-[inset_0_0_0_1px_rgba(45,212,191,0.3)]',
  gold: 'focus-visible:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.3)]',
  green: 'focus-visible:shadow-[inset_0_0_0_1px_rgba(52,211,153,0.3)]',
  grey: 'focus-visible:shadow-[inset_0_0_0_1px_rgba(203,213,225,0.28)]',
  blueGrey: 'focus-visible:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.3)]',
  mutedBlue: 'focus-visible:shadow-[inset_0_0_0_1px_rgba(96,165,250,0.3)]'
};

const trackGlowMap = {
  teal: 'group-hover:ring-teal-300/45 group-hover:shadow-[0_0_26px_rgba(45,212,191,0.24)]',
  gold: 'group-hover:ring-amber-300/45 group-hover:shadow-[0_0_26px_rgba(251,191,36,0.22)]',
  green: 'group-hover:ring-emerald-300/45 group-hover:shadow-[0_0_26px_rgba(52,211,153,0.24)]',
  grey: 'group-hover:ring-slate-300/45 group-hover:shadow-[0_0_22px_rgba(203,213,225,0.16)]',
  blueGrey: 'group-hover:ring-cyan-300/45 group-hover:shadow-[0_0_24px_rgba(56,189,248,0.2)]',
  mutedBlue: 'group-hover:ring-blue-300/45 group-hover:shadow-[0_0_24px_rgba(96,165,250,0.2)]'
};

export default function HorizontalBarChart({ items, valuePrefix = '', valueSuffix = '' }) {
  const wrapperRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const max = Math.max(...items.map((item) => item.value), 1);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, [items]);

  function pointFromEvent(event) {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    
    const clientX = 'clientX' in event ? event.clientX : 0;
    const clientY = 'clientY' in event ? event.clientY : 0;
    
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      return {
        x: clientX - bounds.left,
        y: clientY - bounds.top
      };
    }
    
    const target = event.currentTarget?.getBoundingClientRect();
    return {
      x: target ? target.left - bounds.left + target.width / 2 : bounds.width / 2,
      y: target ? target.top - bounds.top : bounds.height / 2
    };
  }

  function showTooltip(event, item) {
    setTooltip({
      ...pointFromEvent(event),
      item
    });
  }

  function moveTooltip(event) {
    setTooltip((current) => (current ? { ...current, ...pointFromEvent(event) } : current));
  }

  return (
    <div 
      ref={wrapperRef}
      className="relative h-auto min-h-fit space-y-4 overflow-visible rounded-2xl"
    >
      <div className="space-y-6 overflow-visible">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={`group cursor-pointer rounded-2xl outline-none transition-shadow duration-300 ease-out focus-visible:ring-2 focus-visible:ring-teal-400/40 ${index === 0 ? 'mt-4' : ''} ${index === items.length - 1 ? 'mb-4' : ''} ${hoverGlowMap[item.color] || hoverGlowMap.grey}`}
            onMouseEnter={(event) => showTooltip(event, item)}
            onMouseMove={moveTooltip}
            onMouseLeave={() => setTooltip(null)}
            onPointerEnter={(event) => showTooltip(event, item)}
            onPointerMove={moveTooltip}
            onPointerLeave={() => setTooltip(null)}
            onClick={(event) => showTooltip(event, item)}
            onFocus={(event) => showTooltip(event, item)}
            onBlur={() => setTooltip(null)}
            tabIndex={0}
            role="button"
          >
            <div className="mb-2.5 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium tracking-normal text-slate-700">
                  {item.label}
                </div>
                {item.note && (
                  <div className="mt-0.5 text-xs text-slate-500">
                    {item.note}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold tabular-nums text-slate-900">
                  {valuePrefix}
                  {formatValue(item.value, valuePrefix)}
                  {valueSuffix}
                </div>
              </div>
            </div>

            <div className={`h-3 w-full overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-white/5 transition-all duration-300 group-hover:ring-2 ${trackGlowMap[item.color] || trackGlowMap.grey}`}>
              <div
                className={`h-full rounded-full ${gradientMap[item.color] || gradientMap.grey} transition-all duration-500 ease-out group-hover:brightness-125 group-hover:saturate-150`}
                style={{
                  width: mounted ? `${Math.max((item.value / max) * 100, 3)}%` : '0%'
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-[999]"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, calc(-100% - 16px))'
          }}
        >
          <div className="min-w-max rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="mb-2 text-sm font-semibold text-slate-100">
              {tooltip.item.tooltipTitle || tooltip.item.label}
            </div>
            <div className="space-y-1.5">
              {(tooltip.item.tooltipRows || [
                {
                  label: tooltip.item.label,
                  value: `${valuePrefix}${formatValue(tooltip.item.value, valuePrefix)}${valueSuffix}`,
                  color: tooltip.item.color,
                  active: true
                }
              ]).map((row) => (
                <div
                  key={`${row.label}-${row.value}`}
                  className={`flex items-center gap-2 text-xs ${row.active ? 'font-semibold text-slate-100' : 'text-slate-400'}`}
                >
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{
                      background: colorMap[row.color] || colorMap.grey
                    }}
                  />
                  <span>{row.label}</span>
                  <span className="ml-auto font-semibold tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>
            {tooltip.item.tooltipNote && (
              <p className="mt-2 border-t border-white/10 pt-2 text-xs text-slate-400">
                {tooltip.item.tooltipNote}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatValue(value, valuePrefix) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: valuePrefix === 'RM' ? 2 : 0,
    maximumFractionDigits: valuePrefix === 'RM' ? 2 : 0
  });
}
