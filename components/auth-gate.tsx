'use client';

import { FormEvent, useState } from 'react';
import { Loader2, LockKeyhole, Mail, UserPlus, ArrowLeft, KeyRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Public customer ledger routes are bearer-token pages and must never require app login.
  if (pathname === '/reset-password' || pathname.startsWith('/t/')) return <>{children}</>;

  if (loading) {
    return (
      <div className="vyaparos-auth flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <>{children}</>;

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    clearFeedback();

    try {
      if (mode === 'forgot') {
        const result = await resetPassword(email.trim());
        if (result.error) {
          setError(result.error);
          return;
        }
        setMessage('Password reset link तुमच्या email वर पाठवला आहे. Email मधील link उघडून नवीन password सेट करा.');
        return;
      }

      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('नाव भरा.');
          return;
        }

        const result = await signUp(email.trim(), password, displayName.trim());
        if (result.error) {
          setError(result.error);
          return;
        }

        setMessage('नोंदणी यशस्वी झाली. Email confirmation चालू असल्यास email verify करून पुन्हा login करा.');
        setMode('login');
      } else {
        const result = await signIn(email.trim(), password);
        if (result.error) {
          setError(result.error);
          return;
        }
        setMessage('Login यशस्वी. तुमचा local pending data आता Supabase ला sync होईल.');
      }
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'login' ? 'Login' : mode === 'signup' ? 'Create account' : 'Forgot password';

  return (
    <main className="vyaparos-auth flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg">
            {mode === 'login' ? <LockKeyhole className="h-6 w-6" /> : mode === 'signup' ? <UserPlus className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'forgot'
              ? 'तुमच्या account चा email द्या. आम्ही password reset link पाठवू.'
              : 'Supabase cloud sync साठी authenticated account आवश्यक आहे.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="auth-name">नाव</Label>
              <Input id="auth-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="तुमचे नाव" autoComplete="name" disabled={busy} required />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="pl-9" autoComplete="email" disabled={busy} required />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="किमान 6 characters" minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} disabled={busy} required />
            </div>
          )}

          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">{message}</div>}

          <Button type="submit" className="h-11 w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Login' : mode === 'signup' ? 'Create account' : 'Send reset link'}
          </Button>
        </form>

        {mode === 'login' && (
          <>
            <button type="button" className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 text-sm font-bold text-slate-800 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/30 dark:text-slate-100" onClick={async () => { setBusy(true); clearFeedback(); const result = await signInWithGoogle(); if (result.error) setError(result.error); setBusy(false); }} disabled={busy}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black">G</span> Continue with Gmail / Google
            </button>
            <button type="button" className="mt-4 flex w-full items-center justify-center gap-1 text-sm font-medium text-primary hover:underline" onClick={() => { setMode('forgot'); clearFeedback(); }} disabled={busy}>
            Forgot password?
            </button>
          </>
        )}

        {mode === 'forgot' ? (
          <button type="button" className="mt-4 flex w-full items-center justify-center gap-1 text-sm font-medium text-primary hover:underline" onClick={() => { setMode('login'); clearFeedback(); }} disabled={busy}>
            <ArrowLeft className="h-4 w-4" /> Login कडे परत जा
          </button>
        ) : (
          <button type="button" className="mt-5 w-full text-center text-sm font-medium text-primary hover:underline" onClick={() => { setMode((current) => (current === 'login' ? 'signup' : 'login')); clearFeedback(); }} disabled={busy}>
            {mode === 'login' ? 'नवीन account तयार करा' : 'आधीच account आहे? Login करा'}
          </button>
        )}
      </div>
    </main>
  );
}
