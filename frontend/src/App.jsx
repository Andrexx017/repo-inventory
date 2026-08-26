import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import Branches from './pages/Branches';
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
        path="/branches"
        element={
          <RequireRole roles={['general_admin']}>
            <Branches />
          </RequireRole>
        }
      />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

export default App;