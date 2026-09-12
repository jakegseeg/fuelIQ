import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { auth } from '../../lib/api';

/** Redirect to /login when no JWT is stored; otherwise render child routes. */
export function RequireAuth() {
  const location = useLocation();
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}
