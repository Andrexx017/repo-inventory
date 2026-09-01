import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LoginPage from './modules/auth/pages/LoginPage';
import ForgotPasswordPage from './modules/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from './modules/auth/pages/ResetPasswordPage';
import Branches from './modules/auth/pages/Branches';
import Roles from './modules/auth/pages/Roles';
import Users from './modules/auth/pages/Users';
import Products from './modules/catalog/pages/Products';
import Inventory from './modules/inventory/pages/Inventory';
import Purchases from './modules/purchases/pages/Purchases';
import Sales from './modules/sales/pages/Sales';
import RequireAuth from './shared/components/RequireAuth';
import RequireRole from './shared/components/RequireRole';


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
        path="/inventory"
        element={
          <RequireAuth>
            <Inventory />
          </RequireAuth>
        }
      />
      <Route
        path="/purchases"
        element={
          <RequireRole roles={['general_admin', 'branch_manager', 'inventory_operator']}>
            <Purchases />
          </RequireRole>
        }
      />
      <Route
        path="/sales"
        element={
          <RequireRole roles={['general_admin', 'branch_manager', 'inventory_operator']}>
            <Sales />
          </RequireRole>
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
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>
  );
}

export default App;