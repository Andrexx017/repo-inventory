import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Toast.css';

const AUTO_DISMISS_MS = 15000;

// Notificación flotante — a diferencia de la campana (que hay que abrir a
// propósito), esta aparece sola para avisar de inmediato sobre un cambio de
// alto impacto (alertas de stock, transferencias, órdenes de compra
// canceladas: ver `toastable` en useNotifications.js). Se acumulan en una
// pila, cada una se cierra sola a los 15s (con una barra decremental del
// mismo color que la notificación mostrando cuánto falta) o al
// tocarla/cerrarla a mano.
export function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`toast-card toast-card-${toast.severity}`} role="status">
      <Link to={toast.to} className="toast-card-body" onClick={() => onDismiss(toast.id)}>
        <span className="toast-card-title">{toast.title}</span>
        <span className="toast-card-sub">{toast.subtitle}</span>
      </Link>
      <button
        type="button"
        className="toast-card-close"
        aria-label="Cerrar notificación"
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
      <span className="toast-card-progress" style={{ animationDuration: `${AUTO_DISMISS_MS}ms` }} />
    </div>
  );
}
