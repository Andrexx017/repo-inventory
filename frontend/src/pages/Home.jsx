import { Link, useNavigate } from 'react-router-dom';
import { getUser, logout } from '../apiClient';

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

      {user?.role === 'general_admin' && (
        <nav>
          <Link to="/branches">Sucursales</Link>
        </nav>
      )}

      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}
