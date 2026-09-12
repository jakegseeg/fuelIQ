import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, auth } from '../lib/api';
import { Spinner } from '../components/Spinner';

/** Authenticated home: dashboard if onboarded, otherwise onboarding wizard. */
export function RootRedirect() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setTarget('/login');
      return;
    }
    api
      .getProfile()
      .then((p) => setTarget(p ? '/dashboard' : '/onboarding'))
      .catch(() => setTarget('/onboarding'));
  }, []);

  if (!target) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-bg">
        <Spinner />
      </div>
    );
  }
  return <Navigate to={target} replace />;
}
