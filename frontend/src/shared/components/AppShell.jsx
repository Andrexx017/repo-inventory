import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getUser, logout } from '../apiClient';
import { useTheme } from '../hooks/useTheme';
import ThemeToggle from './ThemeToggle';
import TopSearch from './TopSearch';
import NotificationBell from './NotificationBell';
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
// autenticada — Home, Catálogo, Sucursales, Usuarios. Antes vivía
// duplicado dentro de Home.jsx; se extrajo acá para no repetirlo por pantalla,
// mismo motivo por el que el mockup usaba Sidebar.dc.html/Topbar.dc.html como
// componentes compartidos (ver RUTA.md).
export default function AppShell({ title, children }) {
    const navigate = useNavigate();
    const user = getUser();
    const { theme, toggleTheme } = useTheme();
    const [navOpen, setNavOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isGeneralAdmin = user?.role === 'general_admin';
    // UC12/UC05 del diagrama de casos de uso: Dashboard es de Gerente y Admin,
    // el Operador de inventario no lo tiene.
    const canViewDashboard = user?.role === 'general_admin' || user?.role === 'branch_manager';

    return (
        <div className="app-shell">

            {navOpen && (
                <div className="sidebar-backdrop-open" onClick={() => setNavOpen(false)} />
            )}

            <aside className={navOpen ? 'sidebar sidebar-open' : 'sidebar'}>
                <div className="sidebar-brand">
                    <img src="/logo-icon.png" width="22" height="22" alt="Sucursalia" className="sidebar-brand-mark" />
                    <span className="sidebar-brand-name">SUCURSALIA</span>

                    <button
                        type="button"
                        className="sidebar-close"
                        onClick={() => setNavOpen(false)}
                        aria-label="Cerrar menú"
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>

                <nav className="sidebar-nav" onClick={() => setNavOpen(false)}>
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

                    <NavLink to="/reports" className={navLinkClass}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                            <path d="M9 13h6M9 17h6" />
                        </svg>
                        Reportes
                    </NavLink>

                    {canViewDashboard && (
                        <NavLink to="/dashboard" className={navLinkClass}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 20V10" /><path d="M12 20V4" /><path d="M20 20v-7" />
                            </svg>
                            Dashboard
                        </NavLink>
                    )}

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
                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={() => setNavOpen((open) => !open)}
                        aria-label="Abrir menú"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M3 12h18M3 18h18" />
                        </svg>
                    </button>

                    <span className="app-page-title">{title}</span>
                    <div className="app-topbar-spacer" />

                    <TopSearch />

                    <div className="app-topbar-divider" />

                    <ThemeToggle theme={theme} onToggle={toggleTheme} />

                    <div className="app-topbar-divider" />

                    <NotificationBell />
                </header>

                <main className="app-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
