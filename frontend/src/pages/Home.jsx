import { Link, useNavigate } from 'react-router-dom';
import { getUser, logout } from '../shared/apiClient';

export default function Home() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <h1>Home Page</h1>
      <p>Bienvenido, {user?.name} ({user?.role})</p>

      <nav style={{ display: 'flex', gap: '1rem' }}>
        <Link to="/products">Catálogo</Link>
      </nav>

      {user?.role === 'general_admin' && (
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/branches">Sucursales</Link>
          <Link to="/roles">Roles</Link>
          <Link to="/users">Usuarios</Link>
        </nav>
      )}

      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}
