import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import Branches from './pages/Branches';
import Roles from './pages/Roles';
import Users from './pages/Users';
import Products from './pages/Products';
import RequireAuth from './components/RequireAuth';
import RequireRole from './components/RequireRole';


function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/products"
        element={
          <RequireAuth>
            <Products />
          </RequireAuth>
        }
      />
      <Route
        path="/branches"
        element={
          <RequireRole roles={['general_admin']}>
            <Branches />
          </RequireRole>
        }
      />
      
      <Route
        path="/roles"
        element={
          <RequireRole roles={['general_admin']}>
            <Roles />
          </RequireRole>
        }
      />
      <Route
        path="/users"
        element={
          <RequireRole roles={['general_admin']}>
            <Users />
          </RequireRole>
        }
      />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

export default App;