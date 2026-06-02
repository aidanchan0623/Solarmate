import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * A beautifully styled custom dropdown to replace native <select>.
 *
 * Props:
 *  - options: [{ value: string, label: string }]
 *  - value: string (currently selected value)
 *  - onChange: (value: string) => void
 *  - className: optional extra classes on the trigger button
 *  - variant: 'dark' | 'light' (default: 'light')
 *  - placeholder: string (shown when no value is selected)
 */
export default function StyledSelect({
  options = [],
  value,
  onChange,
  className = '',
  variant = 'light',
  placeholder = 'Select...',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [open]);

  const selectedOption = options.find((o) => o.value === value);
  const label = selectedOption?.label || placeholder;

  const isDark = variant === 'dark';

  const triggerClasses = isDark
    ? 'bg-slate-800/80 border-slate-600/40 text-slate-200 hover:border-teal-400/60 focus:border-teal-400 focus:ring-teal-400/30 shadow-[0_2px_8px_rgba(0,0,0,0.25)]'
    : 'bg-white border-slate-200 text-slate-700 hover:border-teal-400 focus:border-teal-500 focus:ring-teal-500/20 shadow-sm';

  const menuClasses = isDark
    ? 'bg-slate-800 border-slate-600/50 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)]'
    : 'bg-white border-slate-200 shadow-[0_16px_48px_-8px_rgba(15,23,42,0.18),0_0_0_1px_rgba(0,0,0,0.04)]';

  const optionBaseClasses = isDark
    ? 'text-slate-300 hover:bg-teal-500/15 hover:text-teal-200'
    : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700';

  const optionActiveClasses = isDark
    ? 'bg-teal-500/20 text-teal-300 font-semibold'
    : 'bg-teal-50 text-teal-700 font-semibold';

  return (
    <div className={`relative ${className}`} ref={ref}>
      {/* Trigger button */}
      <button
        className={`
          flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5
          text-sm font-medium outline-none
          transition-all duration-200
          focus:ring-2
          ${triggerClasses}
        `}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-slate-400'}`}
          size={16}
        />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className={`
            absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border
            backdrop-blur-xl
            animate-in fade-in slide-in-from-top-1
            ${menuClasses}
          `}
          style={{
            animation: 'selectDropIn 0.15s ease-out',
          }}
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <button
                  className={`
                    flex w-full items-center justify-between gap-3 px-4 py-2.5
                    text-left text-sm transition-colors duration-100
                    ${isActive ? optionActiveClasses : optionBaseClasses}
                  `}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  type="button"
                >
                  <span>{option.label}</span>
                  {isActive && (
                    <Check className="shrink-0 text-teal-500" size={15} strokeWidth={2.5} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
