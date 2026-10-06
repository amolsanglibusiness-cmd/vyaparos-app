'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { type Language, type Translations, translations } from './i18n';
import type { BusinessProfile } from './types';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { hasAppPin, hasBiometricLock, registerBiometric, removeAppPin, removeBiometric, setAppPin } from '@/lib/app-lock';
import { useMultiUser } from './multi-user-context';

interface SettingsContextValue {
  language: Language;
  isDarkMode: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  toggleDarkMode: () => void;
  t: Translations;
  businessProfile: BusinessProfile;
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => void;
  resetBusinessProfile: () => void;
  appLockEnabled: boolean;
  biometricLockEnabled: boolean;
  setAppLockEnabled: (enabled: boolean) => void;
  setBiometricLockEnabled: (enabled: boolean) => Promise<void>;
  removeAppSecurity: () => void;
  transactionCategories: string[];
  addTransactionCategory: (name: string) => boolean;
  updateTransactionCategory: (oldName: string, newName: string) => boolean;
  deleteTransactionCategory: (name: string) => void;
}

const DEFAULT_TRANSACTION_CATEGORIES = ['Salary','Business Revenue','Rent','Utilities','Groceries','Supplies','Maintenance','Transport','Food','Personal','Other'];

const DEFAULT_PROFILE: BusinessProfile = {
  ownerName: 'User',
  businessName: 'My Business',
  businessAddress: '',
  phone: '',
  businessContactNumber: '',
  email: '',
  gstin: '',
  signatureUrl: null,
  stampUrl: null,
  businessLogoUrl: null,
  bottomButton1: '/invoice',
  bottomButton2: '/transactions',
  bottomButton4: '/pos',
  mainBankAccountId: null,
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(DEFAULT_PROFILE);
  const [appLockEnabled, setAppLockEnabledState] = useState(false);
  const [biometricLockEnabled, setBiometricLockEnabledState] = useState(false);
  const [transactionCategories, setTransactionCategories] = useState<string[]>(DEFAULT_TRANSACTION_CATEGORIES);
  const { user } = useAuth();
  const { businessId } = useMultiUser();

  const profileStorageKey = user?.id && businessId ? `fh-business-profile-${user.id}-${businessId}` : null;
  const languageStorageKey = user?.id ? `fh-lang-${user.id}` : 'fh-lang';
  const darkStorageKey = user?.id ? `fh-dark-${user.id}` : 'fh-dark';
  const categoryStorageKey = user?.id ? `fh-txn-categories-${user.id}` : 'fh-txn-categories';

  useEffect(() => {
    if (typeof window === 'undefined' || !user || !businessId) return;
    let cancelled = false;
    const loadProfile = async () => {
      const [{ data }, local] = await Promise.all([
        supabase.from('business_profiles').select('*').eq('business_id', businessId).eq('user_id', user.id).maybeSingle(),
        Promise.resolve(localStorage.getItem(profileStorageKey || '')),
      ]);
      if (cancelled) return;
      const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || '';
      const base = { ...DEFAULT_PROFILE, ...(displayName ? { ownerName: displayName } : {}), ...(user.email ? { email: user.email } : {}) };
      if (data) {
        setBusinessProfile({ ...base, ownerName: data.owner_name || base.ownerName, businessName: data.business_name || base.businessName, businessAddress: data.business_address || '', phone: data.phone || '', businessContactNumber: data.business_contact_number || data.phone || '', email: data.email || base.email, gstin: data.gstin || '', signatureUrl: data.signature_url || null, stampUrl: data.stamp_url || null, businessLogoUrl: data.business_logo_url || null, bottomButton1: data.bottom_button_1 || base.bottomButton1, bottomButton2: data.bottom_button_2 || base.bottomButton2, bottomButton4: data.bottom_button_4 || base.bottomButton4, mainBankAccountId: data.main_bank_account_id || null });
      } else if (local) {
        try { setBusinessProfile({ ...base, ...JSON.parse(local) }); } catch { setBusinessProfile(base); }
      } else setBusinessProfile(base);
    };
    void loadProfile();
    return () => { cancelled = true; };
  }, [user?.id, businessId, profileStorageKey]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(languageStorageKey, lang);
  }, [languageStorageKey]);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'en' ? 'mr' : 'en';
      localStorage.setItem(languageStorageKey, next);
      return next;
    });
  }, [languageStorageKey]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem(darkStorageKey, String(next));
      return next;
    });
  }, [darkStorageKey]);

  const updateBusinessProfile = useCallback((updates: Partial<BusinessProfile>) => {
    setBusinessProfile((prev) => {
      const next = { ...prev, ...updates };
      if (profileStorageKey) localStorage.setItem(profileStorageKey, JSON.stringify(next));
      if (user?.id && businessId) {
        void supabase.from('business_profiles').upsert({ user_id:user.id, business_id:businessId, owner_name:next.ownerName, business_name:next.businessName, business_address:next.businessAddress, phone:next.phone, business_contact_number:next.businessContactNumber, email:next.email, gstin:next.gstin, signature_url:next.signatureUrl, stamp_url:next.stampUrl, business_logo_url:next.businessLogoUrl, bottom_button_1:next.bottomButton1, bottom_button_2:next.bottomButton2, bottom_button_4:next.bottomButton4, main_bank_account_id:next.mainBankAccountId, updated_at:new Date().toISOString() }, { onConflict:'business_id,user_id' });
      }
      return next;
    });
  }, [profileStorageKey,user?.id,businessId]);

  const resetBusinessProfile = useCallback(() => {
    setBusinessProfile(DEFAULT_PROFILE);
    if (profileStorageKey) localStorage.setItem(profileStorageKey, JSON.stringify(DEFAULT_PROFILE));
    if (user?.id && businessId) void supabase.from('business_profiles').upsert({ user_id:user.id, business_id:businessId, owner_name:DEFAULT_PROFILE.ownerName, business_name:DEFAULT_PROFILE.businessName, business_address:'', phone:'', business_contact_number:'', email:user.email || '', gstin:'', signature_url:null, stamp_url:null, business_logo_url:null, bottom_button_1:DEFAULT_PROFILE.bottomButton1, bottom_button_2:DEFAULT_PROFILE.bottomButton2, bottom_button_4:DEFAULT_PROFILE.bottomButton4, main_bank_account_id:null, updated_at:new Date().toISOString() }, { onConflict:'business_id,user_id' });
  }, [profileStorageKey,user?.id,user?.email,businessId]);


  const setAppLockEnabled = useCallback((enabled: boolean) => {
    if (!enabled) {
      removeAppPin();
      setAppLockEnabledState(false);
      return;
    }
    setAppLockEnabledState(true);
  }, []);

  const setBiometricLockEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      await registerBiometric();
      setBiometricLockEnabledState(true);
      return;
    }
    removeBiometric();
    setBiometricLockEnabledState(false);
  }, []);


  const addTransactionCategory = useCallback((name: string) => {
    const value = name.trim();
    if (!value) return false;
    let added = false;
    setTransactionCategories((prev) => {
      if (prev.some((item) => item.toLowerCase() === value.toLowerCase())) return prev;
      const next = [...prev, value];
      localStorage.setItem(categoryStorageKey, JSON.stringify(next));
      added = true;
      return next;
    });
    return added;
  }, [categoryStorageKey]);

  const updateTransactionCategory = useCallback((oldName: string, newName: string) => {
    const value = newName.trim();
    if (!value) return false;
    let updated = false;
    setTransactionCategories((prev) => {
      if (prev.some((item) => item !== oldName && item.toLowerCase() === value.toLowerCase())) return prev;
      const next = prev.map((item) => item === oldName ? value : item);
      localStorage.setItem(categoryStorageKey, JSON.stringify(next));
      updated = true;
      return next;
    });
    return updated;
  }, [categoryStorageKey]);

  const deleteTransactionCategory = useCallback((name: string) => {
    setTransactionCategories((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((item) => item !== name);
      localStorage.setItem(categoryStorageKey, JSON.stringify(next));
      return next;
    });
  }, [categoryStorageKey]);

  const removeAppSecurity = useCallback(() => {
    removeAppPin();
    removeBiometric();
    setAppLockEnabledState(false);
    setBiometricLockEnabledState(false);
  }, []);

  const value = useMemo(
    () => ({
      language,
      isDarkMode,
      setLanguage,
      toggleLanguage,
      toggleDarkMode,
      t: translations[language],
      businessProfile,
      updateBusinessProfile,
      resetBusinessProfile,
      appLockEnabled,
      biometricLockEnabled,
      setAppLockEnabled,
      setBiometricLockEnabled,
      removeAppSecurity,
      transactionCategories,
      addTransactionCategory,
      updateTransactionCategory,
      deleteTransactionCategory,
    }),
    [language, isDarkMode, setLanguage, toggleLanguage, toggleDarkMode, businessProfile, updateBusinessProfile, resetBusinessProfile, appLockEnabled, biometricLockEnabled, setAppLockEnabled, setBiometricLockEnabled, removeAppSecurity, transactionCategories, addTransactionCategory, updateTransactionCategory, deleteTransactionCategory]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
