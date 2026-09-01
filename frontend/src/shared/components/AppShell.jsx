import { NavLink, useNavigate } from 'react-router-dom';
import { getUser, logout } from '../apiClient';
import { useTheme } from '../hooks/useTheme';
import ThemeToggle from './ThemeToggle';
import './AppShell.css';

const ROLE_LABELS = {
    general_admin: 'Administrador general',
    branch_manager: 'Gerente de sucursal',
    inventory_operator: 'Operador de inventario',
};

function initialsOf(name) {
    if (!name) return '';
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function navLinkClass({ isActive }) {
    return isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link';
}

// Shell persistente (barra lateral + topbar) que envuelve toda pantalla ya
// autenticada — Home, Catálogo, Sucursales, Roles, Usuarios. Antes vivía
// duplicado dentro de Home.jsx; se extrajo acá para no repetirlo por pantalla,
// mismo motivo por el que el mockup usaba Sidebar.dc.html/Topbar.dc.html como
// componentes compartidos (ver RUTA.md).
export default function AppShell({ title, children }) {
    const navigate = useNavigate();
    const user = getUser();
    const { theme, toggleTheme } = useTheme();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isGeneralAdmin = user?.role === 'general_admin';

    return (
        <div className="app-shell">

            <aside className="sidebar">
                <div className="sidebar-brand">
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2 3 7v10l9 5 9-5V7z" />
                        <path d="M3 7l9 5 9-5" />
                        <path d="M12 12v10" />
                    </svg>
                    <span className="sidebar-brand-name">INVENTARIO</span>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/" end className={navLinkClass}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 10.5 12 3l9 7.5" />
                            <path d="M5 9.5V21h14V9.5" />
                        </svg>
                        Inicio
                    </NavLink>

                    <NavLink to="/products" className={navLinkClass}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="16" rx="2" />
                            <path d="M3 9h18M8 4v5" />
                        </svg>
                        Catálogo
                    </NavLink>

                    <NavLink to="/inventory" className={navLinkClass}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2 3 7v10l9 5 9-5V7z" />
                            <path d="M3 7l9 5 9-5" />
                            <path d="M12 12v10" />
                        </svg>
                        Inventario
                    </NavLink>

                    <NavLink to="/purchases" className={navLinkClass}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" />
                            <path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H6" />
                        </svg>
                        Compras
                    </NavLink>

                    <NavLink to="/sales" className={navLinkClass}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
                            <path d="M9 8h6M9 12h6" />
                        </svg>
                        Ventas
                    </NavLink>

                    <NavLink to="/transfers" className={navLinkClass}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 7h11v9H2z" />
                            <path d="M13 10h4l4 3.5V16h-8z" />
                            <circle cx="6.5" cy="18" r="1.7" /><circle cx="16.5" cy="18" r="1.7" />
                        </svg>
                        Transferencias
                    </NavLink>

                    {/* Logística no tiene pantalla propia — sus campos (transportista,
                        fechas, retraso) viven dentro de Transferencias (ver detalle de
                        cada transferencia), no como módulo separado. */}
                    <span className="sidebar-link sidebar-link-disabled">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" />
                            <path d="M8 19h7a4 4 0 0 0 4-4v-1a4 4 0 0 0-4-4H9a4 4 0 0 1-4-4V5" />
                        </svg>
                        Logística
                    </span>

                    {isGeneralAdmin && (
                        <>
                            <div className="sidebar-section-label">ADMINISTRACIÓN</div>

                            <NavLink to="/branches" className={navLinkClass}>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 21V9l8-5 8 5v12" />
                                    <path d="M9 21v-6h6v6" />
                                    <path d="M4 9h16" />
                                </svg>
                                Sucursales
                            </NavLink>

                            <NavLink to="/roles" className={navLinkClass}>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="8" r="3.2" />
                                    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                                    <circle cx="17" cy="9" r="2.4" />
                                    <path d="M15.5 14.2c2.6.3 4.5 2.3 4.5 5.3" />
                                </svg>
                                Roles
                            </NavLink>

                            <NavLink to="/users" className={navLinkClass}>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="9" cy="8" r="3.2" />
                                    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
                                </svg>
                                Usuarios
                            </NavLink>
                        </>
                    )}
                </nav>

                <div className="sidebar-user">
                    <div className="sidebar-divider" />
                    <div className="sidebar-user-row">
                        <div className="sidebar-avatar">{initialsOf(user?.name)}</div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user?.name}</div>
                            <div className="sidebar-user-role">{ROLE_LABELS[user?.role] ?? user?.role}</div>
                        </div>
                        <button
                            type="button"
                            className="sidebar-logout"
                            onClick={handleLogout}
                            aria-label="Cerrar sesión"
                            title="Cerrar sesión"
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <path d="M16 17l5-5-5-5" />
                                <path d="M21 12H9" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            <div className="app-main">

                <header className="app-topbar">
                    <span className="app-page-title">{title}</span>
                    <div className="app-topbar-spacer" />

                    <ThemeToggle theme={theme} onToggle={toggleTheme} />

                    <div className="app-topbar-divider" />

                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="app-icon-muted">
                        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                    </svg>

                    <div className="app-topbar-divider" />

                    <div className="app-bell">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="app-icon-muted">
                            <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
                            <path d="M10 20a2 2 0 0 0 4 0" />
                        </svg>
                        <span className="app-bell-badge">4</span>
                    </div>
                </header>

                <main className="app-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
