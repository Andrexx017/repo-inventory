import { Link } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import { useTheme } from '../../../shared/hooks/useTheme';
import ThemeToggle from '../../../shared/components/ThemeToggle';
import './LoginPage.css';

export default function LoginPage() {
    const {
        email, setEmail,
        password, setPassword,
        showPassword, toggleShowPassword,
        loading, error,
        handleSubmit,
    } = useLogin();

    const { theme, toggleTheme } = useTheme();

    return (
        <div className="login-page">

            <div className="login-theme-toggle">
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>

            <div className="login-panel">
                <div className="login-brand">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2 3 7v10l9 5 9-5V7z" />
                        <path d="M3 7l9 5 9-5" />
                        <path d="M12 12v10" />
                    </svg>
                    <span className="login-brand-name">Inventario</span>
                </div>

                <div className="login-network">
                    <svg width="380" height="280" viewBox="0 0 380 280">
                        <line x1="190" y1="140" x2="70" y2="50" className="login-network-line" />
                        <line x1="190" y1="140" x2="310" y2="50" className="login-network-line" />
                        <line x1="190" y1="140" x2="50" y2="200" className="login-network-line" />
                        <line x1="190" y1="140" x2="330" y2="210" className="login-network-line" />
                        <line x1="190" y1="140" x2="190" y2="250" className="login-network-line" />
                        <circle cx="190" cy="140" r="14" className="login-network-hub" />
                        <circle cx="190" cy="140" r="4" className="login-network-hub-dot" />
                        <circle cx="70" cy="50" r="7" className="login-network-node" />
                        <circle cx="310" cy="50" r="7" className="login-network-node" />
                        <circle cx="50" cy="200" r="7" className="login-network-node" />
                        <circle cx="330" cy="210" r="7" className="login-network-node" />
                        <circle cx="190" cy="250" r="7" className="login-network-node" />
                    </svg>

                    <p className="login-network-caption">
                        Control de inventario, compras y transferencias en tiempo real entre todas las sucursales de la red.
                    </p>
                </div>

                <div className="login-network-status">
                    <span className="login-status-dot" />
                    Sistema de Inventario Multi-Sucursal
                </div>
            </div>

            <div className="login-form-side">
                <form onSubmit={handleSubmit} className="login-form">

                    <div>
                        <div className="login-form-eyebrow">AUTENTICACIÓN</div>
                        <h1 className="login-form-title">Acceso al sistema</h1>
                        <p className="login-form-subtitle">
                            Ingresa con las credenciales asignadas por tu Administrador general.
                        </p>
                    </div>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">CORREO</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="correo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">CONTRASEÑA</label>
                        <div className="password-field">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={toggleShowPassword}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                aria-pressed={showPassword}
                            >
                                {showPassword ? (
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.6 18.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="login-options">
                        <label className="remember-me">
                            <input type="checkbox" />
                            <span>Mantener sesión</span>
                        </label>

                        <Link to="/forgot-password">
                            Recuperar acceso
                        </Link>
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? 'INICIANDO SESIÓN...' : 'INICIAR SESIÓN'}
                    </button>

                    <p className="login-footer-tag">v1.0 · build interno</p>
                </form>
            </div>

        </div>
    );
}
