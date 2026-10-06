'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { prepareOfflineWorkspace, clearOfflineWorkspace } from '@/lib/offline-first';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: (email?: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user?.id) {
        await prepareOfflineWorkspace(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) await prepareOfflineWorkspace(data.user.id);
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message };

    if (data.user && data.session) {
      const { error: profileError } = await supabase
        .from('users')
        .upsert({ id: data.user.id, display_name: displayName }, { onConflict: 'id' });
      if (profileError) return { error: profileError.message };
    }

    return { error: null };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (typeof window === 'undefined') {
      return { error: 'Password reset browser मधूनच सुरू करा.' };
    }

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  }, []);

  const signInWithGoogle = useCallback(async (email?: string) => {
    if (typeof window === 'undefined') return { error: 'Browser required.' };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/`, queryParams: { access_type: 'offline', prompt: 'select_account', ...(email ? { login_hint: email } : {}) } },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    // Logout is different from app-lock: logout removes the local offline
    // workspace so another person cannot open cached financial data.
    await supabase.auth.signOut();
    await clearOfflineWorkspace();
  }, []);

  const value = useMemo(
    () => ({ user, session, loading, signIn, signUp, resetPassword, updatePassword, signOut, signInWithGoogle }),
    [user, session, loading, signIn, signUp, resetPassword, updatePassword, signOut, signInWithGoogle]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
