import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import './NotificationBell.css';

export default function NotificationBell() {
    const { notifications, loading, hasBranch } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        function onClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    return (
        <div className="notif-bell-wrap" ref={ref}>
            <button
                type="button"
                className="app-bell"
                onClick={() => setOpen((o) => !o)}
                aria-label="Notificaciones"
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="app-icon-muted">
                    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
                    <path d="M10 20a2 2 0 0 0 4 0" />
                </svg>
                {notifications.length > 0 && (
                    <span className="app-bell-badge">{notifications.length > 9 ? '9+' : notifications.length}</span>
                )}
            </button>

            {open && (
                <div className="notif-dropdown">
                    <div className="notif-dropdown-header">Notificaciones</div>

                    {!hasBranch && (
                        <p className="notif-empty">No aplica para tu rol — el Admin general no tiene una sucursal propia.</p>
                    )}

                    {hasBranch && loading && <p className="notif-empty">Cargando...</p>}

                    {hasBranch && !loading && notifications.length === 0 && (
                        <p className="notif-empty">Sin notificaciones activas en tu sucursal.</p>
                    )}

                    {hasBranch && !loading && notifications.map((n) => (
                        <Link
                            key={n.id}
                            to={n.to}
                            state={n.state}
                            className={`notif-item notif-item-${n.severity}`}
                            onClick={() => setOpen(false)}
                        >
                            <span className="notif-item-title">{n.title}</span>
                            <span className="notif-item-sub">{n.subtitle}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
