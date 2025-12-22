import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  widthClass?: string;
}

const Modal = ({ open, title, children, footer, onClose, widthClass = 'max-w-xl' }: ModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-8 overflow-y-auto">
      <div className={`w-full ${widthClass} rounded-2xl bg-white shadow-xl dark:bg-slate-900 my-8`}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="space-y-4">{children}</div>
        </div>
        {footer && <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
