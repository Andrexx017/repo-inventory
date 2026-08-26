import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUser } from '../apiClient';

export default function RequireRole({ roles, children }) {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    const user = getUser();

    if (!roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}