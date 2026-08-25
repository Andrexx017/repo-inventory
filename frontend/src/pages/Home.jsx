import { useNavigate } from 'react-router-dom';
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
      <button onClick={handleLogout}>Cerrar sesión</button>
    </div>
  );
}
