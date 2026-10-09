import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '../contract/types';
import { useAuthStore } from '../core/authStore';
import { isSupabaseConfigured } from '../core/supabaseClient';
import { homePathFor } from './paths';

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: 'adult', label: 'Adult', hint: "Travel alerts, expenses, and your children's live trips" },
  { value: 'child', label: 'Child', hint: 'Your parent sees your live trip' },
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const loading = useAuthStore((s) => s.loading);
  const authError = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [chosenRole, setChosenRole] = useState<UserRole>('adult');
  const [parentEmail, setParentEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  if (loading) return <p className="p-6 text-center text-sm text-gray-600">Loading...</p>;
  if (user) return <Navigate to={homePathFor(role)} replace />;

  async function submit() {
    setInfo(null);
    setLocalError(null);
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return setLocalError('Enter a valid email');
    if (!password) return setLocalError('Enter your password');

    if (mode === 'signup') {
      if (password.length < 6) return setLocalError('Password must be at least 6 characters');
      const pe = parentEmail.trim().toLowerCase();
      if (chosenRole === 'child') {
        if (!EMAIL_RE.test(pe)) return setLocalError("Enter your parent's email");
        if (pe === e) return setLocalError("Your parent's email must be different from yours");
      }
      setBusy(true);
      const ok = await signUp(e, password, chosenRole, name.trim() || undefined, chosenRole === 'child' ? pe : undefined);
      setBusy(false);
      if (ok) {
        setInfo('Account created. If you are not logged in automatically, check your email, then sign in.');
      }
      return;
    }

    setBusy(true);
    await signIn(e, password);
    setBusy(false);
  }

  const error = localError ?? authError;

  return (
    <div className="mx-auto max-w-md space-y-4 p-6">
      <div>
        <div className="flex items-center gap-2">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#15264a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
            <path d="M12 9v5" />
          </svg>
          <h1 className="font-board text-4xl font-bold tracking-tight text-black">TransitGuard</h1>
        </div>
        <span className="mt-2 block h-1 w-12 bg-board-400" />
        <p className="mt-2 text-gray-600">Never miss your stop. Keep your child's trip in sight.</p>
      </div>

      {!isSupabaseConfigured && (
        <p className="rounded bg-amber-100 p-2 text-sm text-amber-800">
          Supabase is not configured. Check .env.local and restart the dev server.
        </p>
      )}

      <div className="flex gap-2">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setLocalError(null);
              setInfo(null);
            }}
            className={`flex-1 rounded border px-3 py-2 text-sm ${
              mode === m ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            {m === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      {error && <p className="rounded bg-red-100 p-2 text-sm text-red-800">{error}</p>}
      {info && <p className="rounded bg-green-100 p-2 text-sm text-green-800">{info}</p>}

      <div className="space-y-3">
        {mode === 'signup' && (
          <label className="block text-sm">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded border p-2"
            />
          </label>
        )}

        <label className="block text-sm">
          {mode === 'signup' && chosenRole === 'child' ? 'Your email' : 'Email'}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1 w-full rounded border p-2"
          />
        </label>

        <label className="block text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
            className="mt-1 w-full rounded border p-2"
          />
        </label>

        {mode === 'signup' && (
          <fieldset className="space-y-2 text-sm">
            <legend className="mb-1">I am a</legend>
            {ROLE_OPTIONS.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-start gap-2 rounded border p-2">
                <input
                  type="radio"
                  name="role"
                  checked={chosenRole === o.value}
                  onChange={() => setChosenRole(o.value)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{o.label}</span>
                  <span className="block text-xs text-gray-600">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {mode === 'signup' && chosenRole === 'child' && (
          <label className="block text-sm">
            Parent's email
            <input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
            <span className="mt-1 block text-xs text-gray-600">
              Your parent will see your trips once they sign up as an Adult with this email.
            </span>
          </label>
        )}

        <button
          onClick={() => void submit()}
          disabled={busy}
          className="w-full rounded bg-black p-3 text-white disabled:opacity-50"
        >
          {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </div>
    </div>
  );
}