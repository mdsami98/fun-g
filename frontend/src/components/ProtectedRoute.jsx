import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginPathForPrefix, roleHomePath } from '../lib/roles';

export function ProtectedRoute({ roles, children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to={loginPathForPrefix(location.pathname)} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }

  return children;
}
