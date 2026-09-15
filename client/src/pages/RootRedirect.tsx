import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, auth } from '../lib/api';
import { Spinner } from '../components/Spinner';

/** Public home: login for visitors, dashboard for returning users with a saved profile. */
export function RootRedirect() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setTarget('/login');
      return;
    }
    if (auth.isGuest) {
      setTarget('/dashboard');
      return;
    }
    api
      .getProfile()
      .then((p) => {
        if (p) {
          setTarget('/dashboard');
          return;
        }
        auth.set(null);
        setTarget('/login');
      })
      .catch(() => {
        auth.set(null);
        setTarget('/login');
      });
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
