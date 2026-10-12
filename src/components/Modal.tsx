import React, { useEffect, useId, useRef } from 'react';
import { Icons } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '520px',
}) => {
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]') || []);
    (focusables()[0] || dialog)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if(e.key === 'Escape') closeRef.current();
      if(e.key === 'Tab') {
        const items=focusables(), first=items[0], last=items[items.length-1];
        if(!first) { e.preventDefault(); dialog?.focus(); }
        else if(e.shiftKey && (document.activeElement===first || document.activeElement===dialog)) {e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last) {e.preventDefault();first.focus();}
      }
    };
    document.body.style.overflow='hidden'; window.addEventListener('keydown',onKey);
    return () => {document.body.style.overflow=overflow;window.removeEventListener('keydown',onKey);previous?.focus();};
  },[isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={headingId}>
      <div
        className="modal-dialog" ref={dialogRef} tabIndex={-1}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 id={headingId} className="modal-title">{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
            <Icons.Close size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">{children}</div>

        {/* Footer */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
