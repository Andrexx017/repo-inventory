import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postJson, setToken, setUser } from '../apiClient';
import './LoginPage.css';

export default function LoginPage() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError('');
        setLoading(true);

        try {
            const data = await postJson('/api/auth/login', { email, password });

            setToken(data.token);
            setUser({ name: data.name, role: data.role, branchId: data.branchId });

            navigate('/');
        } catch (error) {
            setError(error.message || 'Credenciales incorrectas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">

                <div className="login-header">
                    <div className="logo">
                        📦
                    </div>

                    <h1>Inventario</h1>

                    <p>
                        Inicia sesión para administrar tu inventario
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">
                            Correo electrónico
                        </label>

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
                        <label htmlFor="password">
                            Contraseña
                        </label>

                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="login-options">
                        <label className="remember-me">
                            <input type="checkbox" />
                            <span>Recordarme</span>
                        </label>

                        <a href="#" onClick={(e) => e.preventDefault()}>
                            ¿Olvidaste tu contraseña?
                        </a>
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </button>

                </form>

                <div className="login-footer">
                    <p>
                        Sistema de gestión de inventario
                    </p>
                </div>

            </div>
        </div>
    );
}