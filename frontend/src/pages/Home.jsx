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

const SEVERITY_LABELS = { critico: 'CRÍTICO', bajo: 'BAJO' };

function formatMoney(value) {
    return `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

export default function Home() {
    const user = getUser();
    const {
        loading, branches, branchId, pendingAlerts, activeOrdersCount,
        monthTotal, monthSalesCount, unitsToday,
        topProductName, topProductQuantity,
    } = useHomeDashboard();

    // Sucursal real del usuario (código/nombre/ciudad), no un "Sucursal #id"
    // genérico — mismo dato que ya muestran Inventario/Reportes/Dashboard en
    // su topline, buscado en la misma lista de sucursales que ya carga el hook.
    // OJO: el hook le asigna un branchId "de trabajo" a general_admin (para
    // poder pedirle KPIs a alguna sucursal, ver useHomeDashboard.js) aunque no
    // tenga sucursal propia — por eso el guard sigue siendo user?.branchId
    // (el claim real del JWT), no currentBranch.
    const currentBranch = branches.find((b) => String(b.id) === branchId);

    return (
        <AppShell title="Inicio">

            <div>
                <h1 className="home-greeting">Hola, {user?.name?.split(' ')[0] ?? ''}</h1>
                <p className="home-greeting-sub">
                    {ROLE_LABELS[user?.role] ?? user?.role}
                    {user?.branchId && currentBranch ? ` · ${currentBranch.code} · ${currentBranch.name} · ${currentBranch.city}` : ''}
                </p>
            </div>

            {/* KPIs y alertas con datos reales de Inventario/Compras/Ventas
                (RF-06/RF-12/RF-16), no de ejemplo — "Mayor rotación" y "Ventas
                del mes" quedan en $0/"—" hasta que existan ventas reales en la
                sucursal, en vez de mostrar un número inventado. Sigue sin
                existir "Transferencias activas" (RF-20+, sin backend todavía),
                reemplazado acá por "Órdenes de compra activas" (real). */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <span className="kpi-label">VENTAS DEL MES</span>
                    <span className="kpi-value">{loading ? '—' : formatMoney(monthTotal)}</span>
                    <span className="kpi-sub">{loading ? 'Cargando...' : `${monthSalesCount} ventas este mes · ${unitsToday} unidades hoy`}</span>
                </div>

                <div className="kpi-card">
                    <span className="kpi-label">MAYOR ROTACIÓN</span>
                    <span className="kpi-value kpi-value-text">{loading ? '—' : (topProductName ?? 'Sin ventas este mes')}</span>
                    <span className="kpi-sub">{loading ? 'Cargando...' : (topProductName ? `${topProductQuantity} unidades vendidas este mes` : '—')}</span>
                </div>

                <div className="kpi-card">
                    <span className="kpi-label">ÓRDENES DE COMPRA ACTIVAS</span>
                    <span className="kpi-value">{loading ? '—' : activeOrdersCount}</span>
                    <span className="kpi-sub">No canceladas ni completas</span>
                </div>

                <div className="kpi-card">
                    <span className="kpi-label">ALERTAS DE STOCK BAJO</span>
                    <span className="kpi-value kpi-value-warning">{loading ? '—' : pendingAlerts.length}</span>
                    <span className="kpi-sub">Productos por debajo del mínimo</span>
                </div>
            </div>

            <div className="home-columns">

                <div>
                    <h2 className="section-title">Accesos rápidos</h2>
                    <div className="quick-grid">

                        <Link to="/products" className="quick-card">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" />
                            </svg>
                            <span className="quick-card-title">Catálogo</span>
                            <span className="quick-card-sub">Productos y categorías</span>
                        </Link>

                        <Link to="/inventory" className="quick-card">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2 3 7v10l9 5 9-5V7z" /><path d="M3 7l9 5 9-5" /><path d="M12 12v10" />
                            </svg>
                            <span className="quick-card-title">Inventario</span>
                            <span className="quick-card-sub">Ingresos, retiros y existencias</span>
                        </Link>

                        <Link to="/purchases" className="quick-card">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" />
                                <path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6" />
                            </svg>
                            <span className="quick-card-title">Compras</span>
                            <span className="quick-card-sub">Órdenes a proveedores</span>
                        </Link>

                        <Link to="/sales" className="quick-card">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" />
                            </svg>
                            <span className="quick-card-title">Ventas</span>
                            <span className="quick-card-sub">Registro y comprobantes</span>
                        </Link>

                        <Link to="/transfers" className="quick-card">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 7h11v9H2z" /><path d="M13 10h4l4 3.5V16h-8z" />
                                <circle cx="6.5" cy="18" r="1.7" /><circle cx="16.5" cy="18" r="1.7" />
                            </svg>
                            <span className="quick-card-title">Transferencias</span>
                            <span className="quick-card-sub">Solicitudes entre sucursales</span>
                        </Link>

                        <Link to="/reports" className="quick-card">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6" /><path d="M9 13h6M9 17h6" />
                            </svg>
                            <span className="quick-card-title">Reportes</span>
                            <span className="quick-card-sub">Exportar a PDF o Excel</span>
                        </Link>

                        {/* UC12/UC05 del diagrama de casos de uso: Dashboard es de Gerente y Admin. */}
                        {(user?.role === 'general_admin' || user?.role === 'branch_manager') && (
                            <Link to="/dashboard" className="quick-card">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 20V10" /><path d="M12 20V4" /><path d="M20 20v-7" />
                                </svg>
                                <span className="quick-card-title">Dashboard</span>
                                <span className="quick-card-sub">Indicadores de la operación</span>
                            </Link>
                        )}

                    </div>
                </div>

                <div className="alerts-card">
                    <h2 className="section-title">Alertas de stock</h2>

                    <div className="alerts-list">
                        {loading && <p className="alert-sub">Cargando...</p>}

                        {!loading && pendingAlerts.length === 0 && (
                            <p className="alert-sub">Sin alertas activas en tu sucursal.</p>
                        )}

                        {!loading && pendingAlerts.map((alert) => (
                            <div key={alert.id} className={`alert-row alert-row-${alert.severity === 'critico' ? 'danger' : 'warning'}`}>
                                <div>
                                    <div className="alert-name">{alert.productName}</div>
                                    <div className="alert-sub">Stock: {alert.quantityAtTrigger} · Mínimo: {alert.thresholdValue}</div>
                                </div>
                                <span className={`alert-tag alert-tag-${alert.severity === 'critico' ? 'danger' : 'warning'}`}>
                                    {SEVERITY_LABELS[alert.severity]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </AppShell>
    );
}
