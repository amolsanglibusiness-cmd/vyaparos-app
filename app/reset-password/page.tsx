'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // स्टेप १: Brevo द्वारे ईमेलवर OTP पाठवणे
  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('कृपया वैध ईमेल पत्ता प्रविष्ट करा.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP पाठवण्यात अयशस्वी.');

      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'काहीतरी तांत्रिक अडचण आली आहे.');
    } finally {
      setBusy(false);
    }
  };

  // स्टेप २: OTP व्हेरिफाय करून नवीन पासवर्ड अपडेट करणे
  const handleVerifyAndReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError('कृपया ६ अंकी वैध OTP प्रविष्ट करा.');
      return;
    }
    if (password.length < 6) {
      setError('Password किमान 6 characters असावा.');
      return;
    }
    if (password !== confirmPassword) {
      setError('दोन्ही password समान असणे आवश्यक आहे.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'पासवर्ड बदलताना एरर आली.');

      setStep('done');
    } catch (err: any) {
      setError(err.message || 'OTP प्रमाणेच एरर आली.');
    } finally {
      setBusy(false);
    }
  };

  // यश मिळाल्यावर दिसणारे स्क्रीन
  if (step === 'done') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 dark:from-slate-950 dark:to-slate-900">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
          <h1 className="text-2xl font-bold">Password updated</h1>
          <p className="mt-2 text-sm text-muted-foreground">नवीन password यशस्वीपणे सेट झाला आहे.</p>
          <Button className="mt-6 w-full" onClick={() => router.replace('/')}>Login करा</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg">
            {step === 'email' ? <Mail className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-bold">{step === 'email' ? 'पासवर्ड रिसेट (OTP)' : 'OTP आणि नवीन Password'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 'email' ? 'तुमचा रजिस्टर केलेला ईमेल टाका, त्यावर ६ अंकी OTP येईल.' : `${email} वर आलेला OTP आणि नवीन पासवर्ड टाका.`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">ईमेल पत्ता (Email)</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                disabled={busy} 
                required 
              />
            </div>
            {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              OTP पाठवा
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">६ अंकी OTP</Label>
              <Input 
                id="otp" 
                type="text" 
                maxLength={6} 
                placeholder="123456" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                disabled={busy} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">नवीन Password</Label>
              <Input 
                id="new-password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                minLength={6} 
                autoComplete="new-password" 
                disabled={busy} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Password पुन्हा टाका</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                minLength={6} 
                autoComplete="new-password" 
                disabled={busy} 
                required 
              />
            </div>
            {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Password Update करा
            </Button>
            <button 
              type="button" 
              onClick={() => setStep('email')} 
              className="w-full text-center text-xs text-muted-foreground hover:underline mt-2"
            >
              ← ईमेल बदल करा किंवा पुन्हा OTP पाठवा
            </button>
          </form>
        )}
      </div>
    </main>
  );
}