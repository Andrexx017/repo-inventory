import { Link } from 'react-router-dom';
import { getUser } from '../shared/apiClient';
import AppShell from '../shared/components/AppShell';
import './Home.css';

const ROLE_LABELS = {
    general_admin: 'Administrador general',
    branch_manager: 'Gerente de sucursal',
    inventory_operator: 'Operador de inventario',
};

export default function Home() {
    const user = getUser();

    return (
        <AppShell title="Inicio">

            <div>
                <h1 className="home-greeting">Hola, {user?.name?.split(' ')[0] ?? ''}</h1>
                <p className="home-greeting-sub">
                    {ROLE_LABELS[user?.role] ?? user?.role}
                    {user?.branchId ? ` · Sucursal #${user.branchId}` : ''}
                </p>
            </div>

            {/* Los 4 KPI y la lista de alertas de abajo son datos de ejemplo:
                los endpoints de Dashboard (RF-29 a RF-32) y de alertas de
                stock (RF-09/RF-34) todavía no existen en el backend — ver
                RUTA.md, sección "Lo que falta". Esta pantalla queda lista
                para reemplazarlos por datos reales sin tocar el layout. */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <span className="kpi-label">VENTAS DEL MES</span>
                    <span className="kpi-value">$48.2M</span>
                    <span className="kpi-trend kpi-trend-up">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 17 17 7" /><path d="M8 7h9v9" />
                        </svg>
                        12% vs. mes anterior
                    </span>
                </div>

                <div className="kpi-card">
                    <span className="kpi-label">MAYOR ROTACIÓN</span>
                    <span className="kpi-value kpi-value-text">Detergente 5L</span>
                    <span className="kpi-sub">312 unidades vendidas este mes</span>
                </div>

                <div className="kpi-card">
                    <span className="kpi-label">TRANSFERENCIAS ACTIVAS</span>
                    <span className="kpi-value">6</span>
                    <span className="kpi-sub">3 en tránsito · 2 en preparación · 1 con faltante</span>
                </div>

                <div className="kpi-card">
                    <span className="kpi-label">ALERTAS DE STOCK BAJO</span>
                    <span className="kpi-value kpi-value-warning">4</span>
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

                        <div className="quick-card quick-card-disabled">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2 3 7v10l9 5 9-5V7z" /><path d="M3 7l9 5 9-5" /><path d="M12 12v10" />
                            </svg>
                            <span className="quick-card-title">Inventario</span>
                            <span className="quick-card-sub">Ingresos, retiros y existencias</span>
                        </div>

                        <div className="quick-card quick-card-disabled">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" />
                                <path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6" />
                            </svg>
                            <span className="quick-card-title">Compras</span>
                            <span className="quick-card-sub">Órdenes a proveedores</span>
                        </div>

                        <div className="quick-card quick-card-disabled">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" />
                            </svg>
                            <span className="quick-card-title">Ventas</span>
                            <span className="quick-card-sub">Registro y comprobantes</span>
                        </div>

                        <div className="quick-card quick-card-disabled">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 7h11v9H2z" /><path d="M13 10h4l4 3.5V16h-8z" />
                                <circle cx="6.5" cy="18" r="1.7" /><circle cx="16.5" cy="18" r="1.7" />
                            </svg>
                            <span className="quick-card-title">Transferencias</span>
                            <span className="quick-card-sub">Solicitudes entre sucursales</span>
                        </div>

                        <div className="quick-card quick-card-disabled">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" />
                                <path d="M8 19h7a4 4 0 0 0 4-4v-1a4 4 0 0 0-4-4H9a4 4 0 0 1-4-4V5" />
                            </svg>
                            <span className="quick-card-title">Logística</span>
                            <span className="quick-card-sub">Rutas y cumplimiento</span>
                        </div>

                    </div>
                </div>

                <div className="alerts-card">
                    <h2 className="section-title">Alertas de stock</h2>

                    <div className="alerts-list">
                        <div className="alert-row alert-row-danger">
                            <div>
                                <div className="alert-name">Aceite vegetal 1L</div>
                                <div className="alert-sub">Stock: 3 · Mínimo: 15</div>
                            </div>
                            <span className="alert-tag alert-tag-danger">CRÍTICO</span>
                        </div>

                        <div className="alert-row alert-row-warning">
                            <div>
                                <div className="alert-name">Guantes de nitrilo M</div>
                                <div className="alert-sub">Stock: 18 · Mínimo: 20</div>
                            </div>
                            <span className="alert-tag alert-tag-warning">BAJO</span>
                        </div>

                        <div className="alert-row alert-row-warning">
                            <div>
                                <div className="alert-name">Caja de tornillos 1/4&#34;</div>
                                <div className="alert-sub">Stock: 9 · Mínimo: 10</div>
                            </div>
                            <span className="alert-tag alert-tag-warning">BAJO</span>
                        </div>

                        <div className="alert-row alert-row-danger">
                            <div>
                                <div className="alert-name">Detergente 5L</div>
                                <div className="alert-sub">Stock: 6 · Mínimo: 25</div>
                            </div>
                            <span className="alert-tag alert-tag-danger">CRÍTICO</span>
                        </div>
                    </div>
                </div>

            </div>
        </AppShell>
    );
}
