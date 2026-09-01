import { Link } from 'react-router-dom';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { useTheme } from '../../../shared/hooks/useTheme';
import ThemeToggle from '../../../shared/components/ThemeToggle';
import './LoginPage.css';

export default function ForgotPasswordPage() {
    const { email, setEmail, loading, error, sent, handleSubmit } = useForgotPassword();
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
                        <h1 className="login-form-title">¿Olvidaste tu contraseña?</h1>
                        <p className="login-form-subtitle">
                            Ingresa tu correo y te enviamos un enlace para restablecerla.
                        </p>
                    </div>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    {sent ? (
                        <div className="login-success">
                            Si el correo está registrado, vas a recibir un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.
                        </div>
                    ) : (
                        <>
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

                            <button
                                type="submit"
                                className="login-button"
                                disabled={loading}
                            >
                                {loading ? 'ENVIANDO...' : 'ENVIAR ENLACE'}
                            </button>
                        </>
                    )}

                    <p className="login-back-link">
                        <Link to="/login">Volver al inicio de sesión</Link>
                    </p>
                </form>
            </div>

        </div>
    );
}
