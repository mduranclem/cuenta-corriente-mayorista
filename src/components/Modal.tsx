import { ReactNode, useEffect } from 'react';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, open, onClose, children }: ModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 py-6">
      <div className="flex w-full max-w-2xl flex-col max-h-[90vh] rounded-3xl bg-white shadow-panel">
        <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-6 pb-5">
          <div>
            <p className="text-sm uppercase text-textSecondary">Modal</p>
            <h2 className="text-2xl font-semibold text-textPrimary">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-textSecondary transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
