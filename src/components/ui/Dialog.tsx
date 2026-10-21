import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Card } from './Card';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

let openDialogCount = 0;
let originalHtmlOverflow = '';
let originalBodyOverflow = '';

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg'
}) => {
  const [mounted, setMounted] = React.useState(false);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const bodyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      if (bodyRef.current) {
        bodyRef.current.scrollTop = 0;
      }

      if (openDialogCount === 0) {
        originalHtmlOverflow = document.documentElement.style.overflow;
        originalBodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      }
      openDialogCount++;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCloseRef.current();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        openDialogCount = Math.max(0, openDialogCount - 1);
        if (openDialogCount === 0) {
          document.documentElement.style.overflow = originalHtmlOverflow;
          document.body.style.overflow = originalBodyOverflow;
        }
      };
    }
  }, [isOpen]);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overscroll-contain">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#060e20]/60 backdrop-blur-md overscroll-contain touch-none"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={`relative w-full ${maxWidth} z-10 overscroll-contain my-auto`}
          >
            {/* Close Cross Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shadow-xs border border-slate-200/60"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <Card heavy={true} className="flex flex-col max-h-[88vh] overflow-hidden overscroll-contain shadow-2xl bg-white border border-slate-200 text-slate-900 rounded-3xl p-0">
              {/* Header with Title if provided */}
              {title && (
                <div className="flex justify-between items-center border-b border-slate-100 p-6 md:px-8 pb-3 pr-14 shrink-0">
                  <h3 className="text-xl md:text-2xl font-semibold font-serif text-[#111c2e]">
                    {title}
                  </h3>
                </div>
              )}

              {/* Body */}
              <div ref={bodyRef} className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-6 md:p-8 text-slate-700">
                {children}
              </div>

              {/* Footer if provided */}
              {footer && (
                <div className="shrink-0 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs p-4 md:px-8 rounded-b-3xl z-10">
                  {footer}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
