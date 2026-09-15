import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IsoInsiteLogo } from '../components/IsoInsiteLogo';
import { api, ApiError, isStaticPagesBuildWithoutApi } from '../lib/api';

export function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await api.register(username.trim(), password);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      if (isStaticPagesBuildWithoutApi()) {
        setError('This GitHub Pages link is only hosting the frontend. Connect it to the backend before account creation will work.');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Signup failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md animate-page-in">
        <div className="mb-8 flex justify-center bg-transparent">
          <IsoInsiteLogo size={64} />
        </div>
        <div className="card">
          <h1 className="page-title">Create your account</h1>
          <p className="mt-1 text-sm text-ink-600">
            Start with a free account — we&apos;ll personalize your targets in onboarding.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="field-label" htmlFor="signup-username">
                Username
              </label>
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                required
                className="field-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="signup-confirm">
                Confirm password
              </label>
              <input
                id="signup-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="field-input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-xl bg-coral-400/10 px-3 py-2 text-sm font-medium text-coral-300">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Creating account…' : 'Sign up'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-accent-300 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
