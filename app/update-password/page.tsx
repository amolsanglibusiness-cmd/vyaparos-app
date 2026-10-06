'use client';

import { FormEvent, useState, useEffect } from 'react';
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

export default function UpdatePasswordPage() {
  const router = useRouter();
    
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Supabase ऑथेंटिकेशन सेशन हँडल करणे
  useEffect(() => {
    // जेव्हा युजर ईमेलमधील लिंकवर क्लिक करून येतो, तेव्हा Supabase स्वतः सेशन सेट करते
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // जर सेशन नसेल तर युजरला परत लॉगिन किंवा फॉरगेट पेजवर पाठवू शकता
      }
    };
    checkSession();
  }, [supabase]);

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

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
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'पासवर्ड अपडेट करताना एरर आली.');
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 dark:from-slate-950 dark:to-slate-900">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
          <h1 className="text-2xl font-bold">पासवर्ड यशस्वीरीत्या बदलला!</h1>
          <p className="mt-2 text-sm text-muted-foreground">आता तुम्ही नवीन पासवर्ड वापरून लॉगिन करू शकता.</p>
          <Button className="mt-6 w-full" onClick={() => router.replace('/')}>लॉगिन करा</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">नवीन पासवर्ड सेट करा</h1>
          <p className="mt-1 text-sm text-muted-foreground">कृपया तुमचा नवीन पासवर्ड खाली प्रविष्ट करा.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
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
            पासवर्ड सेव्ह करा
          </Button>
        </form>
      </div>
    </main>
  );
}