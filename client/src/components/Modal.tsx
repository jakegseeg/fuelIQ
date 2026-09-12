import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Max width class, e.g. 'max-w-lg'. */
  maxWidth?: string;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg', footer }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        className={`relative flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-[20px] bg-surface shadow-2xl ring-1 ring-ink-200 animate-page-in sm:rounded-2xl`}
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-ink-300 sm:hidden" aria-hidden />
        {title && (
          <div className="flex min-h-12 items-center justify-between border-b border-ink-200 px-5 py-2">
            <h2 className="text-[17px] font-semibold text-ink-900">{title}</h2>
            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full text-accent-500 hover:bg-accent-100"
              aria-label="Close"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                <path d="M6.3 6.3a1 1 0 0 1 1.4 0L10 8.6l2.3-2.3a1 1 0 1 1 1.4 1.4L11.4 10l2.3 2.3a1 1 0 0 1-1.4 1.4L10 11.4l-2.3 2.3a1 1 0 0 1-1.4-1.4L8.6 10 6.3 7.7a1 1 0 0 1 0-1.4z" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-ink-200 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
