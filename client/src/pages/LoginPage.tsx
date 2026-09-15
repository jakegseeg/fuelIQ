import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IsoInsiteLogo } from '../components/IsoInsiteLogo';
import { api, ApiError, isStaticPagesBuildWithoutApi } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (isStaticPagesBuildWithoutApi()) {
        setError('This GitHub Pages link is only hosting the frontend. Connect it to the backend before sign in will work.');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const viewAsGuest = async () => {
    setError(null);
    setGuestBusy(true);
    try {
      await api.viewAsGuest();
      navigate('/dashboard', { replace: true });
    } finally {
      setGuestBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue tracking your nutrition and training."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="field-label" htmlFor="login-username">
            Username
          </label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            required
            className="field-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-xl bg-coral-400/10 px-3 py-2 text-sm font-medium text-error">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-600">
        No account?{' '}
        <Link to="/signup" className="font-semibold text-accent-500 hover:underline">
          Create one
        </Link>
      </p>
      <div className="mt-4 border-t border-ink-200 pt-4">
        <button
          type="button"
          onClick={viewAsGuest}
          disabled={guestBusy || busy}
          className="btn-ghost w-full disabled:opacity-50"
        >
          {guestBusy ? 'Opening demo…' : 'View as guest'}
        </button>
      </div>
    </AuthShell>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md animate-page-in">
        <div className="mb-8 flex justify-center bg-transparent">
          <IsoInsiteLogo size={64} />
        </div>
        <div className="card">
          <h1 className="page-title">{title}</h1>
          <p className="mt-1 text-sm text-ink-600">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
