import React from 'react';
import { useApp } from '../context/AppContext';
import { Icons } from './Icons';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case 'success':
              return <Icons.CheckCircle size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />;
            case 'warning':
              return <Icons.AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />;
            case 'danger':
              return <Icons.AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />;
            default:
              return <Icons.Info size={18} style={{ color: 'var(--color-info)', flexShrink: 0 }} />;
          }
        };

        return (
          <div
            key={toast.id}
            className={`toast toast-${toast.type === 'danger' ? 'error' : toast.type}`}
            role="status"
          >
            {getIcon()}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="toast-title">{toast.title}</div>
              {toast.description && <div className="toast-message">{toast.description}</div>}
            </div>
            <button
              type="button"
              className="icon-button"
              style={{ padding: '2px', marginLeft: '4px' }}
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <Icons.Close size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
