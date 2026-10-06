'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
    Settings,
    User,
    Store,
    Stamp,
    PenTool,
    Upload,
    Trash2,
    Save,
    RotateCcw,
    Check,
    Phone,
    Mail,
    MapPin,
    Hash,
    ImageIcon,
    ShieldCheck,
    KeyRound,
    Fingerprint,
    Building2,
    Link2,
    Megaphone,
    ChevronLeft,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useSettings } from './settings-context';
import { useMultiUser } from './multi-user-context';
import { useAppData } from './app-data-context';
import {
    setAppPin,
    isBiometricSupported,
} from '@/lib/app-lock';
import { readImageFile } from '@/src/lib/image-upload';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

type ImageField =
    | 'signatureUrl'
    | 'stampUrl'
    | 'businessLogoUrl';

const fileToDataUrl = readImageFile;

export function SettingsPage() {
    const {
        t,
        businessProfile,
        updateBusinessProfile,
        resetBusinessProfile,

        appLockEnabled,
        biometricLockEnabled,
        setAppLockEnabled,
        setBiometricLockEnabled,
        removeAppSecurity,

    } = useSettings();

    const { bankAccounts } = useAppData();
    const { businesses, currentBusiness, cashMode, gallaMode, setCashMode, setGallaMode, currentRole, businessId, switchBusiness } = useMultiUser();

    const sigInputRef = useRef<HTMLInputElement>(null);
    const stampInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const [showSaved, setShowSaved] = useState(false);
    const [activeScreen, setActiveScreen] = useState<'business' | 'personal' | 'bottom' | 'security' | null>(null);
    const [resetOpen, setResetOpen] = useState(false);

    const [imageError, setImageError] =
        useState<string | null>(null);

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const [securityMessage, setSecurityMessage] =
        useState<string | null>(null);

    const [securityError, setSecurityError] =
        useState<string | null>(null);

    const [securityBusy, setSecurityBusy] =
        useState(false);

    const [publicAdImage, setPublicAdImage] = useState<string | null>(null);
    const [publicAdUrl, setPublicAdUrl] = useState('');
    const [publicAdLoading, setPublicAdLoading] = useState(false);
    const [publicAdSaving, setPublicAdSaving] = useState(false);
    const [publicAdMessage, setPublicAdMessage] = useState<string | null>(null);
    const publicAdInputRef = useRef<HTMLInputElement>(null);

    // Local form state
    const [form, setForm] =
        useState(businessProfile);

    // Keep form synchronized with settings context
    useEffect(() => {
        setForm(businessProfile);
    }, [businessProfile]);

    // Automatically hide mobile bottom navigation bar when settings page / sub-screen is active
    useEffect(() => {
        const navBar = document.querySelector('nav.fixed.bottom-0, .mobile-bottom-nav, [data-mobile-nav]');
        if (navBar instanceof HTMLElement) {
            navBar.style.display = 'none';
        }
        return () => {
            if (navBar instanceof HTMLElement) {
                navBar.style.display = '';
            }
        };
    }, []);

    const updateField = useCallback(
        (
            key: keyof typeof form,
            value: string
        ) => {
            setForm((prev) => ({
                ...prev,
                [key]: value,
            }));
        },
        []
    );

    useEffect(() => {
        if (!businessId || (currentRole !== 'owner' && currentRole !== 'admin')) {
            setPublicAdImage(null);
            setPublicAdUrl('');
            return;
        }
        let active = true;
        setPublicAdLoading(true);
        void supabase
            .from('business_public_ledger_ads')
            .select('image_data_url,destination_url')
            .eq('business_id', businessId)
            .maybeSingle()
            .then(({ data }) => {
                if (!active) return;
                setPublicAdImage((data?.image_data_url as string | null) || null);
                setPublicAdUrl((data?.destination_url as string | null) || '');
                setPublicAdLoading(false);
            }, () => {
                if (active) setPublicAdLoading(false);
            });
        return () => { active = false; };
    }, [businessId, currentRole]);

    const handlePublicAdImage = async (file: File) => {
        setImageError(null);
        if (!file.type.startsWith('image/')) { setImageError('Please select an advertisement image.'); return; }
        if (file.size > 800 * 1024) { setImageError('Advertisement image should be under 800KB.'); return; }
        try {
            setPublicAdImage(await fileToDataUrl(file));
            setPublicAdMessage(null);
        } catch {
            setImageError('Failed to read advertisement image. Please try again.');
        }
    };

    const handleSavePublicAd = async () => {
        if (!businessId || (currentRole !== 'owner' && currentRole !== 'admin')) return;
        const destination = publicAdUrl.trim();
        if (destination && !/^https?:\/\//i.test(destination)) {
            setPublicAdMessage('Destination URL must start with http:// or https://');
            return;
        }
        setPublicAdSaving(true);
        setPublicAdMessage(null);
        const { error } = await supabase.from('business_public_ledger_ads').upsert({
            business_id: businessId,
            image_data_url: publicAdImage,
            destination_url: destination || null,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'business_id' });
        setPublicAdSaving(false);
        setPublicAdMessage(error ? error.message : 'Public Ledger advertisement saved.');
    };

    // ---------------------------------------------------------
    // IMAGE UPLOAD
    // ---------------------------------------------------------

    const handleImageUpload = async (
        file: File,
        field: ImageField
    ) => {
        setImageError(null);

        if (!file.type.startsWith('image/')) {
            setImageError(
                'Please select an image file.'
            );
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            setImageError(
                'Image too large. Please use an image under 2MB.'
            );
            return;
        }

        try {
            const dataUrl =
                await fileToDataUrl(file);

            setForm((prev) => ({
                ...prev,
                [field]: dataUrl,
            }));
        } catch {
            setImageError(
                'Failed to read image. Please try again.'
            );
        }
    };

    // ---------------------------------------------------------
    // APP PIN
    // ---------------------------------------------------------

    const handleSavePin = async () => {
        setSecurityMessage(null);
        setSecurityError(null);

        if (!/^\d{4,6}$/.test(pin)) {
            setSecurityError(
                'PIN 4 ते 6 अंकांचा असावा.'
            );
            return;
        }

        if (pin !== confirmPin) {
            setSecurityError(
                'PIN आणि Confirm PIN समान असणे आवश्यक आहे.'
            );
            return;
        }

        try {
            await setAppPin(pin);

            setAppLockEnabled(true);

            setPin('');
            setConfirmPin('');

            setSecurityMessage(
                'App Lock PIN सेव्ह झाला.'
            );
        } catch (error) {
            setSecurityError(
                error instanceof Error
                    ? error.message
                    : 'PIN सेव्ह करता आला नाही.'
            );
        }
    };

    // ---------------------------------------------------------
    // BIOMETRIC / FINGERPRINT
    // ---------------------------------------------------------

    const handleBiometric = async () => {
        setSecurityError(null);
        setSecurityMessage(null);

        if (!isBiometricSupported()) {
            setSecurityError('या डिव्हाइसवर Fingerprint/biometric lock उपलब्ध नाही.');
            return;
        }

        setSecurityBusy(true);

        try {
            const nextValue =
                !biometricLockEnabled;

            await setBiometricLockEnabled(
                nextValue
            );

            setSecurityMessage(
                nextValue
                    ? 'Fingerprint lock सुरू झाला.'
                    : 'Fingerprint lock बंद झाला.'
            );
        } catch (error) {
            setSecurityError(
                error instanceof Error
                    ? error.message
                    : 'Fingerprint lock सुरू करता आला नाही.'
            );
        } finally {
            setSecurityBusy(false);
        }
    };

    // ---------------------------------------------------------
    // REMOVE SECURITY
    // ---------------------------------------------------------

    const handleRemoveSecurity = () => {
        removeAppSecurity();

        setPin('');
        setConfirmPin('');

        setSecurityMessage(
            'App Lock आणि Fingerprint lock बंद केले.'
        );

        setSecurityError(null);
    };

    // ---------------------------------------------------------
    // SAVE SETTINGS
    // ---------------------------------------------------------

    const handleSave = () => {
        updateBusinessProfile(form);

        setShowSaved(true);

        setTimeout(() => {
            setShowSaved(false);
        }, 3000);
    };

    // ---------------------------------------------------------
    // RESET SETTINGS
    // ---------------------------------------------------------

    const handleReset = () => {
        resetBusinessProfile();

        setForm(DEFAULT_PROFILE_FALLBACK);

        setResetOpen(false);
    };

    // ---------------------------------------------------------
    // REMOVE IMAGE
    // ---------------------------------------------------------

    const removeImage = (
        field: ImageField
    ) => {
        setForm((prev) => ({
            ...prev,
            [field]: null,
        }));
    };

    // ---------------------------------------------------------
    return (
        <div data-settings-root className="mx-auto max-w-4xl pb-32 text-foreground [&_*]:shadow-none [&_button]:shadow-none [&_div]:shadow-none bg-transparent">

            {/* =====================================================
          TRANSPARENT STICKY HEADER WITH BACK ARROW & TITLE
      ====================================================== */}
            <div className="sticky top-0 z-30 mb-4 flex items-center justify-between border-b border-border/40 bg-transparent px-2 py-3 backdrop-blur-none">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            if (activeScreen !== null) {
                                setActiveScreen(null);
                            }
                        }}
                        className="h-9 w-9 rounded-xl hover:bg-muted text-black dark:text-white bg-transparent"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-black dark:text-white sm:text-xl">
                            {activeScreen === 'business' ? 'Business Information' :
                                activeScreen === 'personal' ? 'Personal Information' :
                                    activeScreen === 'bottom' ? 'Mobile Bottom Bar' :
                                        activeScreen === 'security' ? 'App Security' :
                                            'Settings & Customization'}
                        </h1>
                    </div>
                </div>
                {activeScreen !== null && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveScreen(null)}
                        className="text-xs font-semibold text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white bg-transparent"
                    >
                        All Settings
                    </Button>
                )}
            </div>

            {/* =====================================================
          ACTIVE BUSINESS SELECTOR
      ====================================================== */}
            <section className="mb-4 overflow-hidden rounded-2xl border border-border/65 bg-transparent p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">Active Business</p>
                            <h2 className="truncate text-base font-bold text-black dark:text-white">{currentBusiness?.name || businessProfile.businessName || 'My Business'}</h2>
                        </div>
                    </div>
                    <select
                        value={businessId || ''}
                        onChange={e => void switchBusiness(e.target.value)}
                        className="h-10 w-full rounded-xl border border-border bg-transparent px-3 text-sm font-semibold text-black dark:text-white outline-none focus:border-primary sm:w-56"
                    >
                        {businesses.map(b => (
                            <option key={b.id} value={b.id} className="bg-background text-foreground">{b.name}</option>
                        ))}
                    </select>
                </div>
            </section>

            <style jsx>{`
                [data-settings-root] button,
                [data-settings-root] a,
                [data-settings-root] div,
                [data-settings-root] section { box-shadow: none !important; background-color: transparent !important; }
                [data-settings-root] input, [data-settings-root] select { color: inherit; background: transparent; }
            `}</style>

            {/* =====================================================
          MAIN DASHBOARD CARDS (BUTTON-LESS NAVIGATION)
      ====================================================== */}
            {activeScreen === null && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                        ['business', 'Business Information', Store, 'Shop name, GSTIN, address, logo, signature, stamp & POS bank', 'text-teal-600 bg-teal-500/10'],
                        ['personal', 'Personal Information', User, 'Owner name, contact phone numbers & email address', 'text-primary bg-primary/10'],
                        ['bottom', 'Mobile Bottom Bar', Settings, 'Customize quick navigation items for mobile view', 'text-amber-600 bg-amber-500/10'],
                        ['security', 'App Security', ShieldCheck, 'App lock PIN, biometric & fingerprint settings', 'text-violet-600 bg-violet-500/10'],
                    ].map(([key, label, Icon, desc, colorClass]) => (
                        <div
                            key={key as string}
                            onClick={() => setActiveScreen(key as any)}
                            className="group flex cursor-pointer items-start gap-3.5 rounded-2xl border border-border/60 bg-transparent p-4 transition-all hover:border-primary/50 hover:bg-muted/10"
                        >
                            <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', colorClass as string)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-bold text-black dark:text-white group-hover:text-primary">{label as string}</h3>
                                <p className="mt-0.5 text-xs text-black/70 dark:text-white/70 line-clamp-2">{desc as string}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* =====================================================
          INDIVIDUAL SETTINGS SCREENS
      ====================================================== */}

            {/* BUSINESS INFORMATION SCREEN */}
            {activeScreen === 'business' && (
                <div className="space-y-4 animate-fade-in">
                    <section className="rounded-2xl border border-border/60 bg-transparent p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                                <Store className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-black dark:text-white">{t.businessInfo}</h2>
                                <p className="text-[11px] text-black/70 dark:text-white/70">{t.businessInfoDesc}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label className="text-xs text-black dark:text-white">{t.businessName}</Label>
                                <Input value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} placeholder="Shop / business name" className="h-10 text-sm text-black dark:text-white border-border bg-transparent" />
                            </div>
                            <div className="space-y-1">
                                <Label className="flex items-center gap-1 text-xs text-black dark:text-white"><Hash className="h-3 w-3" />{t.gstin}</Label>
                                <Input value={form.gstin} onChange={(e) => updateField('gstin', e.target.value)} placeholder="27ABCDE1234F1Z5" className="h-10 text-sm text-black dark:text-white border-border bg-transparent" />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <Label className="flex items-center gap-1 text-xs text-black dark:text-white"><MapPin className="h-3 w-3" />{t.businessAddress}</Label>
                                <Input value={form.businessAddress} onChange={(e) => updateField('businessAddress', e.target.value)} placeholder="Full business address" className="h-10 text-sm text-black dark:text-white border-border bg-transparent" />
                            </div>
                        </div>
                    </section>

                    {/* BUSINESS LOGO */}
                    <section className="rounded-2xl border border-border/60 bg-transparent p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                                <ImageIcon className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-black dark:text-white">{t.businessLogo}</h2>
                                <p className="text-[11px] text-black/70 dark:text-white/70">{t.businessLogoDesc}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-transparent">
                                {form.businessLogoUrl ? (
                                    <img src={form.businessLogoUrl} alt="Business logo" className="h-full w-full object-contain" />
                                ) : (
                                    <ImageIcon className="h-6 w-6 text-black/30 dark:text-white/30" />
                                )}
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImageUpload(file, 'businessLogoUrl'); e.target.value = ''; }} />
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" className="h-9 gap-1 text-xs text-black dark:text-white border-border bg-transparent" onClick={() => logoInputRef.current?.click()}>
                                        <Upload className="h-3.5 w-3.5" /> {t.uploadBusinessLogo}
                                    </Button>
                                    {form.businessLogoUrl && (
                                        <Button type="button" variant="ghost" size="sm" className="h-9 text-xs text-destructive hover:bg-destructive/10 bg-transparent" onClick={() => removeImage('businessLogoUrl')}>
                                            <Trash2 className="mr-1 h-3.5 w-3.5" /> {t.removeBusinessLogo}
                                        </Button>
                                    )}
                                </div>
                                <p className="text-[10px] text-black/60 dark:text-white/60">PNG, JPG, up to 500KB</p>
                            </div>
                        </div>
                    </section>

                    {/* RECEIPT BRANDING (SIGNATURE & STAMP) */}
                    <section className="rounded-2xl border border-border/60 bg-transparent p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                                <Stamp className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-black dark:text-white">{t.receiptBranding}</h2>
                                <p className="text-[11px] text-black/70 dark:text-white/70">{t.receiptBrandingDesc}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {/* SIGNATURE */}
                            <div className="space-y-2 rounded-xl border border-border/60 p-3 bg-transparent">
                                <Label className="flex items-center gap-1 text-xs text-black dark:text-white"><PenTool className="h-3.5 w-3.5" />{t.signatureUrl}</Label>
                                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border/60 bg-transparent">
                                    {form.signatureUrl ? (
                                        <div className="relative h-full w-full p-1">
                                            <img src={form.signatureUrl} alt={t.signaturePreview} className="mx-auto h-full object-contain" />
                                            <button type="button" onClick={() => removeImage('signatureUrl')} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <ImageIcon className="h-6 w-6 text-black/30 dark:text-white/30" />
                                    )}
                                </div>
                                <input ref={sigInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImageUpload(file, 'signatureUrl'); e.target.value = ''; }} />
                                <Button type="button" variant="outline" size="sm" className="h-8 w-full gap-1 text-xs text-black dark:text-white border-border bg-transparent" onClick={() => sigInputRef.current?.click()}>
                                    <Upload className="h-3 w-3" /> {t.uploadSignature}
                                </Button>
                            </div>

                            {/* STAMP */}
                            <div className="space-y-2 rounded-xl border border-border/60 p-3 bg-transparent">
                                <Label className="flex items-center gap-1 text-xs text-black dark:text-white"><Stamp className="h-3.5 w-3.5" />{t.stampUrl}</Label>
                                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border/60 bg-transparent">
                                    {form.stampUrl ? (
                                        <div className="relative h-full w-full p-1">
                                            <img src={form.stampUrl} alt={t.stampPreview} className="mx-auto h-full object-contain" />
                                            <button type="button" onClick={() => removeImage('stampUrl')} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <Stamp className="h-6 w-6 text-black/30 dark:text-white/30" />
                                    )}
                                </div>
                                <input ref={stampInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImageUpload(file, 'stampUrl'); e.target.value = ''; }} />
                                <Button type="button" variant="outline" size="sm" className="h-8 w-full gap-1 text-xs text-black dark:text-white border-border bg-transparent" onClick={() => stampInputRef.current?.click()}>
                                    <Upload className="h-3 w-3" /> {t.uploadStamp}
                                </Button>
                            </div>
                        </div>
                    </section>

                    {/* MAIN BANK FOR POS & CASH/GALLA MODES */}
                    <section className="rounded-2xl border border-border/60 bg-transparent p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-black dark:text-white">Main Bank & Shared Accounts</h2>
                                <p className="text-[11px] text-black/70 dark:text-white/70">POS bank details, Cash in Hand & Galla configuration</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs text-black dark:text-white">Main Bank for POS</Label>
                                <select className="mt-1 h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm text-black dark:text-white" value={form.mainBankAccountId ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, mainBankAccountId: e.target.value || null }))}>
                                    <option value="" className="bg-background text-foreground">No main bank selected</option>
                                    {bankAccounts.map((account) => (
                                        <option key={account.id} value={account.id} className="bg-background text-foreground">{account.bankName} ••••{account.accountNumber.slice(-4)} — {account.upiId || 'No UPI ID'}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="rounded-xl border border-border p-2.5 bg-transparent">
                                    <p className="text-xs font-bold mb-1.5 flex items-center gap-1 text-black dark:text-white"><Link2 className="h-3 w-3 text-sky-600" /> Cash in Hand</p>
                                    <div className="grid grid-cols-2 gap-1">
                                        <button type="button" onClick={() => void setCashMode('separate')} className={`h-8 rounded-lg border text-[11px] font-bold ${cashMode === 'separate' ? 'border-primary bg-primary/10 text-primary' : 'bg-transparent text-black dark:text-white border-border'}`}>Separate</button>
                                        <button type="button" onClick={() => void setCashMode('shared')} className={`h-8 rounded-lg border text-[11px] font-bold ${cashMode === 'shared' ? 'border-primary bg-primary text-primary-foreground' : 'bg-transparent text-black dark:text-white border-border'}`}>Shared</button>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-border p-2.5 bg-transparent">
                                    <p className="text-xs font-bold mb-1.5 flex items-center gap-1 text-black dark:text-white"><Link2 className="h-3 w-3 text-violet-600" /> Galla Mode</p>
                                    <div className="grid grid-cols-2 gap-1">
                                        <button type="button" onClick={() => void setGallaMode('separate')} className={`h-8 rounded-lg border text-[11px] font-bold ${gallaMode === 'separate' ? 'border-primary bg-primary/10 text-primary' : 'bg-transparent text-black dark:text-white border-border'}`}>Separate</button>
                                        <button type="button" onClick={() => void setGallaMode('shared')} className={`h-8 rounded-lg border text-[11px] font-bold ${gallaMode === 'shared' ? 'border-primary bg-primary text-primary-foreground' : 'bg-transparent text-black dark:text-white border-border'}`}>Shared</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* PUBLIC LEDGER ADVERTISEMENT (OWNER/ADMIN) */}
                    {(currentRole === 'owner' || currentRole === 'admin') && (
                        <section className="rounded-2xl border border-border/60 bg-transparent p-4 sm:p-5">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                                    <Megaphone className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-black dark:text-white">Public Ledger Advertisement</h2>
                                    <p className="text-[11px] text-black/70 dark:text-white/70">Manage advertisement on Customer Public Ledger</p>
                                </div>
                            </div>
                            {publicAdLoading ? (
                                <p className="text-xs text-black/70 dark:text-white/70">Loading...</p>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-transparent">
                                            {publicAdImage ? <img src={publicAdImage} alt="Ad" className="h-full w-full object-cover" /> : <Megaphone className="h-5 w-5 text-black/30 dark:text-white/30" />}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <input ref={publicAdInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handlePublicAdImage(file); e.target.value = ''; }} />
                                            <div className="flex gap-2">
                                                <Button type="button" size="sm" className="h-8 text-xs gap-1 text-black dark:text-white border-border bg-transparent" onClick={() => publicAdInputRef.current?.click()}><Upload className="h-3 w-3" />{publicAdImage ? 'Change' : 'Upload'}</Button>
                                                {publicAdImage && <Button type="button" size="sm" variant="outline" className="h-8 text-xs text-destructive border-border bg-transparent" onClick={() => setPublicAdImage(null)}><Trash2 className="h-3 w-3" /></Button>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-black dark:text-white">Destination URL</Label>
                                        <Input value={publicAdUrl} onChange={(e) => setPublicAdUrl(e.target.value)} placeholder="https://..." className="h-9 text-xs text-black dark:text-white border-border bg-transparent" />
                                    </div>
                                    <Button type="button" size="sm" onClick={() => void handleSavePublicAd()} disabled={publicAdSaving || !businessId} className="h-8 text-xs gap-1"><Save className="h-3.5 w-3.5" />{publicAdSaving ? 'Saving...' : 'Save Ad'}</Button>
                                    {publicAdMessage && <p className="text-xs text-emerald-600">{publicAdMessage}</p>}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            )}

            {/* PERSONAL INFORMATION SCREEN */}
            {activeScreen === 'personal' && (
                <div className="space-y-4 animate-fade-in">
                    <section className="rounded-2xl border border-border/60 bg-transparent p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <User className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-black dark:text-white">{t.ownerInfo}</h2>
                                <p className="text-[11px] text-black/70 dark:text-white/70">{t.ownerInfoDesc}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label className="text-xs text-black dark:text-white">{t.ownerName}</Label>
                                <Input value={form.ownerName} onChange={(e) => updateField('ownerName', e.target.value)} placeholder="Full name" className="h-10 text-sm text-black dark:text-white border-border bg-transparent" />
                            </div>
                            <div className="space-y-1">
                                <Label className="flex items-center gap-1 text-xs text-black dark:text-white"><Phone className="h-3 w-3" />{t.phone}</Label>
                                <Input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="9876543210" type="tel" className="h-10 text-sm text-black dark:text-white border-border bg-transparent" />
                            </div>
                            <div className="space-y-1">
                                <Label className="flex items-center gap-1 text-xs text-black dark:text-white"><Phone className="h-3 w-3" />Business Contact Number</Label>
                                <Input value={form.businessContactNumber} onChange={(e) => updateField('businessContactNumber', e.target.value)} placeholder="9876543210" type="tel" className="h-10 text-sm text-black dark:text-white border-border bg-transparent" />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <Label className="flex items-center gap-1 text-xs text-black dark:text-white"><Mail className="h-3 w-3" />{t.email}</Label>
                                <Input value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="email@example.com" type="email" className="h-10 text-sm text-black dark:text-white border-border bg-transparent" />
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* MOBILE BOTTOM BAR SCREEN */}
            {activeScreen === 'bottom' && (
                <div className="space-y-4 animate-fade-in">
                    <section className="rounded-2xl border border-border/60 bg-transparent p-4 sm:p-5">
                        <div className="mb-4">
                            <h2 className="text-sm font-bold text-black dark:text-white">{t.mobileBottomBar}</h2>
                            <p className="mt-0.5 text-[11px] text-black/70 dark:text-white/70">{t.mobileBottomBarDesc}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-black dark:text-white">{t.button1}</Label>
                                <select value={form.bottomButton1} onChange={(e) => updateField('bottomButton1', e.target.value)} className="h-10 w-full rounded-xl border border-border bg-transparent px-3 text-sm text-black dark:text-white">
                                    <option value="/transactions" className="bg-background text-foreground">{t.navTransactions}</option>
                                    <option value="/invoice" className="bg-background text-foreground">{t.navInvoice}</option>
                                    <option value="/banking" className="bg-background text-foreground">{t.navBanking}</option>
                                    <option value="/ledger" className="bg-background text-foreground">{t.navLedger}</option>
                                    <option value="/cash" className="bg-background text-foreground">{t.navCash}</option>
                                    <option value="/inventory" className="bg-background text-foreground">{t.navInventory}</option>
                                    <option value="/reports" className="bg-background text-foreground">{t.navReports}</option>
                                    <option value="/settings" className="bg-background text-foreground">{t.navSettings}</option>
                                    <option value="/assistant" className="bg-background text-foreground">{t.navAssistant}</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-black dark:text-white">{t.button2}</Label>
                                <select value={form.bottomButton2} onChange={(e) => updateField('bottomButton2', e.target.value)} className="h-10 w-full rounded-xl border border-border bg-transparent px-3 text-sm text-black dark:text-white">
                                    <option value="/transactions" className="bg-background text-foreground">{t.navTransactions}</option>
                                    <option value="/invoice" className="bg-background text-foreground">{t.navInvoice}</option>
                                    <option value="/banking" className="bg-background text-foreground">{t.navBanking}</option>
                                    <option value="/ledger" className="bg-background text-foreground">{t.navLedger}</option>
                                    <option value="/cash" className="bg-background text-foreground">{t.navCash}</option>
                                    <option value="/inventory" className="bg-background text-foreground">{t.navInventory}</option>
                                    <option value="/reports" className="bg-background text-foreground">{t.navReports}</option>
                                    <option value="/settings" className="bg-background text-foreground">{t.navSettings}</option>
                                    <option value="/assistant" className="bg-background text-foreground">{t.navAssistant}</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-black dark:text-white">{t.button4}</Label>
                                <select value={form.bottomButton4} onChange={(e) => updateField('bottomButton4', e.target.value)} className="h-10 w-full rounded-xl border border-border bg-transparent px-3 text-sm text-black dark:text-white">
                                    <option value="/pos" className="bg-background text-foreground">{t.navPos}</option>
                                    <option value="/transactions" className="bg-background text-foreground">{t.navTransactions}</option>
                                    <option value="/invoice" className="bg-background text-foreground">{t.navInvoice}</option>
                                    <option value="/banking" className="bg-background text-foreground">{t.navBanking}</option>
                                    <option value="/ledger" className="bg-background text-foreground">{t.navLedger}</option>
                                    <option value="/cash" className="bg-background text-foreground">{t.navCash}</option>
                                    <option value="/inventory" className="bg-background text-foreground">{t.navInventory}</option>
                                    <option value="/reports" className="bg-background text-foreground">{t.navReports}</option>
                                    <option value="/settings" className="bg-background text-foreground">{t.navSettings}</option>
                                    <option value="/assistant" className="bg-background text-foreground">{t.navAssistant}</option>
                                </select>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* APP SECURITY SCREEN */}
            {activeScreen === 'security' && (
                <div className="space-y-4 animate-fade-in">
                    <section className="rounded-2xl border border-border/60 bg-transparent p-4 sm:p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-black dark:text-white">{t.appSecurity}</h2>
                                <p className="text-[11px] text-black/70 dark:text-white/70">{t.appSecurityDesc}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {/* PIN LOCK */}
                            <div className="rounded-xl border border-border/60 bg-transparent p-3">
                                <div className="flex items-center gap-2.5">
                                    <KeyRound className="h-4 w-4 text-primary" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-black dark:text-white">{t.appLockPin}</p>
                                        <p className="text-[10px] text-black/70 dark:text-white/70">{t.pinDigitsDesc}</p>
                                    </div>
                                    <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-semibold', appLockEnabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-transparent text-black/70 dark:text-white/70 border border-border')}>
                                        {appLockEnabled ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <Input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" type="password" maxLength={6} placeholder="नवीन PIN" className="h-9 text-xs text-black dark:text-white border-border bg-transparent" />
                                    <Input value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" type="password" maxLength={6} placeholder="Confirm PIN" className="h-9 text-xs text-black dark:text-white border-border bg-transparent" />
                                </div>
                                <Button type="button" size="sm" onClick={() => void handleSavePin()} className="mt-2.5 h-8 text-xs w-full sm:w-auto">
                                    <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                                    {appLockEnabled ? 'Change PIN' : 'Set App Lock PIN'}
                                </Button>
                            </div>

                            {/* FINGERPRINT LOCK */}
                            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-transparent p-3">
                                <Fingerprint className="h-5 w-5 text-primary" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-black dark:text-white">{t.fingerprintLock}</p>
                                    <p className="text-[10px] text-black/70 dark:text-white/70">{t.biometricDesc}</p>
                                </div>
                                <Button type="button" size="sm" variant={biometricLockEnabled ? 'destructive' : 'outline'} className="h-8 text-xs border-border bg-transparent text-black dark:text-white" disabled={securityBusy} onClick={() => void handleBiometric()}>
                                    {biometricLockEnabled ? 'Turn Off' : 'Enable'}
                                </Button>
                            </div>

                            {(securityMessage || securityError) && (
                                <div className={cn('rounded-xl border px-3 py-2 text-xs', securityError ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700')}>
                                    {securityError || securityMessage}
                                </div>
                            )}

                            {(appLockEnabled || biometricLockEnabled) && (
                                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveSecurity} className="text-xs text-destructive hover:bg-destructive/10 bg-transparent">
                                    Disable all app locks
                                </Button>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {/* =====================================================
          TRANSPARENT STICKY BOTTOM BAR (SAVE & RESET)
      ====================================================== */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-transparent px-4 py-3 backdrop-blur-none">
                <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-h-5 min-w-0">
                        {showSaved && (
                            <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fade-in-up">
                                <Check className="h-4 w-4" /> {t.settingsSavedDesc}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <Button type="button" onClick={handleSave} size="sm" className="h-10 flex-1 sm:flex-none gap-1.5 px-5 font-bold">
                            <Save className="h-4 w-4" /> {t.saveChanges}
                        </Button>
                        {/* Reset to Default Button with Border Added */}
                        <Button type="button" variant="outline" onClick={() => setResetOpen(true)} size="sm" className="h-10 flex-1 sm:flex-none gap-1.5 px-4 font-bold border border-border bg-white text-black hover:bg-white/90 dark:bg-background dark:text-white dark:hover:bg-muted">
                            <RotateCcw className="h-4 w-4" /> {t.resetToDefault}
                        </Button>
                    </div>
                </div>
            </div>

            {/* =====================================================
          RESET CONFIRMATION DIALOG
      ====================================================== */}
            <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.resetConfirm}</AlertDialogTitle>
                        <AlertDialogDescription>{t.resetConfirmDesc}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t.resetToDefault}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}

const DEFAULT_PROFILE_FALLBACK = {
    ownerName: 'User',
    businessName: 'My Business',
    businessAddress: '',
    phone: '',
    businessContactNumber: '', // नवीन प्रॉपर्टी जोडली
    email: '',
    gstin: '',
    signatureUrl: null as string | null,
    stampUrl: null as string | null,
    businessLogoUrl: null as string | null,
    bottomButton1: '/invoice',
    bottomButton2: '/transactions',
    bottomButton4: '/pos',
    mainBankAccountId: null,
};