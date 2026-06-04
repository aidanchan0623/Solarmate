import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

let activeModalCount = 0;

export function clearModalBodyState({ removeBackdrops = false } = {}) {
  activeModalCount = 0;
  document.body.classList.remove('sm-modal-open');
  document.body.style.overflow = '';
  document.body.style.pointerEvents = '';
  if (removeBackdrops) {
    document.querySelectorAll('.sm-modal-backdrop').forEach((backdrop) => backdrop.remove());
  }
}

export default function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  tone = 'teal',
  icon: Icon,
  children,
  primaryAction,
  secondaryAction,
  position = 'center'
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    activeModalCount += 1;
    document.body.classList.add('sm-modal-open');
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      activeModalCount = Math.max(activeModalCount - 1, 0);
      if (activeModalCount === 0) {
        document.body.classList.remove('sm-modal-open');
        document.body.style.overflow = '';
        document.body.style.pointerEvents = '';
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={`sm-modal-backdrop position-${position}`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="sm-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`sm-modal-head tone-${tone}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {Icon && (
                <div className="sm-icon-bubble">
                  <Icon size={20} />
                </div>
              )}
              <div>
                {eyebrow && (
                  <p style={{ margin: 0, fontSize: '.74rem', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.85 }}>
                    {eyebrow}
                  </p>
                )}
                <h2>{title}</h2>
                {description && <p>{description}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                border: 0, background: 'rgba(255,255,255,0.18)',
                width: 32, height: 32, borderRadius: 10, color: 'inherit',
                display: 'grid', placeItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {children && <div className="sm-modal-body">{children}</div>}
        {(primaryAction || secondaryAction) && (
          <div className="sm-modal-foot">
            {secondaryAction && (
              <button type="button" className="secondary-button" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button type="button" className="primary-button" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
