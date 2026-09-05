import { Link } from 'react-router-dom';
import { getUser } from '../shared/apiClient';
import AppShell from '../shared/components/AppShell';
import { useHomeDashboard } from './useHomeDashboard';
import './Home.css';

const ROLE_LABELS = {
    general_admin: 'Administrador general',
    branch_manager: 'Gerente de sucursal',
    inventory_operator: 'Operador de inventario',
};

const EVENT_TYPE_OPTIONS = [
    { value: '', label: 'Todos los eventos' },
    { value: 'venta', label: 'Ventas' },
    { value: 'movimiento', label: 'Movimientos de inventario' },
    { value: 'transferencia', label: 'Transferencias' },
    { value: 'compra', label: 'Compras' },
];

function EventIcon({ type }) {
    if (type === 'venta') {
        return (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" />
            </svg>
        );
    }
    if (type === 'transferencia') {
        return (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7h11v9H2z" /><path d="M13 10h4l4 3.5V16h-8z" /><circle cx="6.5" cy="18" r="1.7" /><circle cx="16.5" cy="18" r="1.7" />
            </svg>
        );
    }
    if (type === 'compra') {
        return (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" />
            </svg>
        );
    }
    // movimiento: la flecha cambia de sentido según el ícono elegido en el hook
    // (success = ingreso, warning = ajuste/retiro).
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21V9" /><path d="M7 14l5-5 5 5" /><path d="M4 5h16" />
        </svg>
    );
}

export default function Home() {
    const user = getUser();
    const {
        loading, isGeneralAdmin, branches,
        groupedFeed, eventTypeFilter, setEventTypeFilter, branchFilter, setBranchFilter,
        eventsToday, branchActivity,
        monthTotal, unitsToday, activeOrders,
    } = useHomeDashboard();

    const currentBranch = branches.find((b) => String(b.id) === String(user?.branchId));
    const maxBranchActivity = Math.max(1, ...branchActivity.map((b) => b.count));

    return (
        <AppShell title="Inicio">

            <div>
                <h1 className="home-greeting">Hola, {user?.name?.split(' ')[0] ?? ''}</h1>
                <p className="home-greeting-sub">
                    {ROLE_LABELS[user?.role] ?? user?.role}
                    {isGeneralAdmin
                        ? ' · Vista de todas las sucursales'
                        : (currentBranch ? ` · ${currentBranch.code} · ${currentBranch.name} · ${currentBranch.city}` : '')}
                </p>
            </div>

            <div className="kpi-strip">
                <div className="kpi-strip-item">
                    <span className="kpi-strip-label">VENTAS DEL MES</span>
                    <span className="kpi-strip-value">{loading ? '—' : monthTotal}</span>
                </div>
                <div className="kpi-strip-item">
                    <span className="kpi-strip-label">UNIDADES HOY</span>
                    <span className="kpi-strip-value">{loading ? '—' : unitsToday}</span>
                </div>
                <div className="kpi-strip-item">
                    <span className="kpi-strip-label">ÓRDENES ACTIVAS</span>
                    <span className="kpi-strip-value">{loading ? '—' : activeOrders}</span>
                </div>
                <div className="kpi-strip-item">
                    <span className="kpi-strip-label">EVENTOS HOY</span>
                    <span className="kpi-strip-value kpi-strip-value-accent">{loading ? '—' : eventsToday}</span>
                </div>
            </div>

            <div className="home-columns">
                <div className="card">
                    <div className="feed-head">
                        <h2 className="section-title">Actividad reciente</h2>
                        <div className="feed-filter-row">
                            <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)}>
                                {EVENT_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {isGeneralAdmin && (
                                <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                                    <option value="">Todas las sucursales</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={String(b.id)}>{b.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="feed-scroll">
                        {loading && <p className="text-muted">Cargando...</p>}

                        {!loading && groupedFeed.length === 0 && (
                            <p className="text-muted">Sin actividad reciente para mostrar.</p>
                        )}

                        {!loading && groupedFeed.map((group) => (
                            <div key={group.bucket}>
                                <span className="day-label">{group.label}</span>
                                <div className="timeline-list">
                                    {group.items.map((event) => (
                                        <div key={event.id} className="timeline-row">
                                            <span className={`timeline-icon ti-${event.icon}`}>
                                                <EventIcon type={event.type} />
                                            </span>
                                            <div className="timeline-body">
                                                <div className="timeline-title">{event.title}</div>
                                                <div className="timeline-meta">{event.meta} · {event.timeLabel}</div>
                                            </div>
                                            {event.amount != null && (
                                                <span className="timeline-amount">
                                                    ${Number(event.amount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <Link className="view-all-link" to="/reports">Ver historial completo en Reportes →</Link>
                </div>

                <div className="home-side">
                    {isGeneralAdmin && (
                        <div className="card">
                            <h2 className="section-title">Actividad por sucursal — hoy</h2>
                            <div className="branch-activity-list">
                                {branchActivity.map((b) => (
                                    <div key={b.branchId} className="branch-activity-row">
                                        <span className="branch-activity-name">{b.branchName}</span>
                                        <div className="branch-activity-bar-track">
                                            <div
                                                className="branch-activity-bar-fill"
                                                style={{ width: `${(b.count / maxBranchActivity) * 100}%` }}
                                            />
                                        </div>
                                        <span className="branch-activity-count">{b.count} eventos</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!isGeneralAdmin && (
                        <div className="scope-note">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 21V9l8-5 8 5v12" /><path d="M9 21v-6h6v6" /><path d="M4 9h16" />
                            </svg>
                            Estás viendo solo la actividad de tu sucursal asignada.
                        </div>
                    )}

                    <div className="card">
                        <h2 className="section-title">Accesos rápidos</h2>
                        <div className="quick-icon-row">
                            <Link className="quick-icon-btn" to="/products" title="Catálogo" aria-label="Catálogo">
                                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></svg>
                            </Link>
                            <Link className="quick-icon-btn" to="/inventory" title="Inventario" aria-label="Inventario">
                                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7z" /><path d="M3 7l9 5 9-5" /><path d="M12 12v10" /></svg>
                            </Link>
                            <Link className="quick-icon-btn" to="/purchases" title="Compras" aria-label="Compras">
                                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" /><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6" /></svg>
                            </Link>
                            <Link className="quick-icon-btn" to="/sales" title="Ventas" aria-label="Ventas">
                                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></svg>
                            </Link>
                            <Link className="quick-icon-btn" to="/transfers" title="Transferencias" aria-label="Transferencias">
                                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7h11v9H2z" /><path d="M13 10h4l4 3.5V16h-8z" /><circle cx="6.5" cy="18" r="1.7" /><circle cx="16.5" cy="18" r="1.7" /></svg>
                            </Link>
                            <Link className="quick-icon-btn" to="/reports" title="Reportes" aria-label="Reportes">
                                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" /></svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
