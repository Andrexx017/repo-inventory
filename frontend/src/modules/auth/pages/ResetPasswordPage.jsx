import { Link } from 'react-router-dom';
import { useResetPassword } from '../hooks/useResetPassword';
import { useTheme } from '../../../shared/hooks/useTheme';
import ThemeToggle from '../../../shared/components/ThemeToggle';
import './LoginPage.css';

export default function ResetPasswordPage() {
    const {
        token,
        newPassword, setNewPassword,
        confirmPassword, setConfirmPassword,
        loading, error,
        handleSubmit,
    } = useResetPassword();

    const { theme, toggleTheme } = useTheme();

    return (
        <div className="login-page">

            <div className="login-theme-toggle">
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>

            <div className="login-form-side">
                <form onSubmit={handleSubmit} className="login-form">

                    <div>
                        <div className="login-form-eyebrow">RECUPERAR ACCESO</div>
                        <h1 className="login-form-title">Restablecer contraseña</h1>
                        <p className="login-form-subtitle">
                            Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
                        </p>
                    </div>

                    {!token && (
                        <div className="login-error">
                            El enlace no incluye un token válido. Solicita uno nuevo.
                        </div>
                    )}

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    {token && (
                        <>
                            <div className="form-group">
                                <label htmlFor="newPassword">NUEVA CONTRASEÑA</label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    minLength={8}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">CONFIRMAR CONTRASEÑA</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    minLength={8}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="login-button"
                                disabled={loading}
                            >
                                {loading ? 'GUARDANDO...' : 'RESTABLECER CONTRASEÑA'}
                            </button>
                        </>
                    )}

                    <p className="login-back-link">
                        <Link to="/forgot-password">Solicitar un nuevo enlace</Link>
                    </p>
                </form>
            </div>

        </div>
    );
}
