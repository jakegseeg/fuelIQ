import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../../lib/api';

/** Redirect authenticated users away from login/signup. */
export function GuestOnly({ children }: { children: ReactNode }) {
  if (auth.isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
