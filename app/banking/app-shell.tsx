'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    Home,
    Receipt,
    FileText,
    Landmark,
    ScanLine,
    Menu,
    Bell,
    Wallet,
    Banknote,
    Sun,
    Moon,
    Languages,
    Mic,
    Bot,
    LayoutDashboard,
    BookOpen,
    Package,
    Settings as SettingsIcon,
    BarChart3,
    Wifi,
    WifiOff,
    RefreshCw,
    CheckCircle2,
    LogOut,
    Fingerprint,
    KeyRound,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useSettings } from './settings-context';
import { useAuth } from '@/hooks/use-auth';
import { hasAppPin, hasBiometricLock, verifyAppPin, verifyBiometric } from '@/lib/app-lock';
import { useOnlineSync } from '@/hooks/use-online-sync';
import { App as CapacitorApp } from '@capacitor/app';

const navLinks = [
    { href: '/', labelKey: 'navDashboard', icon: Home },
    { href: '/banking', labelKey: 'navBanking', icon: Landmark },
    { href: '/transactions', labelKey: 'navTransactions', icon: Receipt },
    { href: '/pos', labelKey: 'navPos', icon: ScanLine },
    { href: '/invoice', labelKey: 'navInvoice', icon: FileText },
    { href: '/sales-history', labelKey: 'navSalesHistory', icon: FileText },
    { href: '/ledger', labelKey: 'navLedger', icon: BookOpen },
    { href: '/cash', labelKey: 'navCash', icon: Banknote },
    { href: '/inventory', labelKey: 'navInventory', icon: Package },
    { href: '/reports', labelKey: 'navReports', icon: BarChart3 },
    { href: '/settings', labelKey: 'navSettings', icon: SettingsIcon },
] as const;

const menuLinks = [
    { href: '/', labelKey: 'navDashboard', icon: LayoutDashboard },
    { href: '/banking', labelKey: 'navBanking', icon: Landmark },
    { href: '/transactions', labelKey: 'navTransactions', icon: Receipt },
    { href: '/pos', labelKey: 'navPos', icon: ScanLine },
    { href: '/invoice', labelKey: 'navInvoice', icon: FileText },
    { href: '/sales-history', labelKey: 'navSalesHistory', icon: FileText },
    { href: '/ledger', labelKey: 'navLedger', icon: BookOpen },
    { href: '/cash', labelKey: 'navCash', icon: Banknote },
    { href: '/inventory', labelKey: 'navInventory', icon: Package },
    { href: '/reports', labelKey: 'navReports', icon: BarChart3 },
    { href: '/settings', labelKey: 'navSettings', icon: SettingsIcon },
] as const;

function MobileNavLink({ href, pathname, t }: { href: string; pathname: string; t: any }) {
    const items: Record<string, { label: string; icon: typeof Home }> = {
        '/banking': { label: t.navBanking, icon: Landmark },
        '/transactions': { label: t.navTransactions, icon: Receipt },
        '/pos': { label: t.navPos, icon: ScanLine },
        '/invoice': { label: t.navInvoice, icon: FileText },
        '/sales-history': { label: t.navSalesHistory, icon: FileText },
        '/ledger': { label: t.navLedger, icon: BookOpen },
        '/cash': { label: t.navCash, icon: Banknote },
        '/inventory': { label: t.navInventory, icon: Package },
        '/reports': { label: t.navReports, icon: BarChart3 },
        '/settings': { label: t.navSettings, icon: SettingsIcon },
        '/assistant': { label: t.navAssistant, icon: Bot },
    };
    const item = items[href] || items['/transactions'];
    const Icon = item.icon;
    return <Link href={href || '/transactions'} className={cn('flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium', pathname === href ? 'text-primary' : 'text-muted-foreground')}>
        <Icon className="h-5 w-5" />
        <span className="max-w-[58px] truncate">{item.label}</span>
    </Link>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [hideSaleMobileBottomBar, setHideSaleMobileBottomBar] = useState(false);
    const hideMobileBottomBar = pathname === '/assistant' || pathname.startsWith('/assistant/') || hideSaleMobileBottomBar;
    const hideGlobalHeader = ['/banking', '/transactions', '/pos', '/sales-history', '/ledger', '/cash', '/inventory', '/invoice'].includes(pathname);
    const router = useRouter();
    const { t, isDarkMode, toggleDarkMode, toggleLanguage, language, businessProfile } = useSettings();
    const { signOut, user } = useAuth();
    const { isOnline, syncState, pendingCount } = useOnlineSync();
    const isSyncing = syncState === 'syncing';
    const [appLocked, setAppLocked] = useState(false);
    const [unlockPin, setUnlockPin] = useState('');
    const [unlockError, setUnlockError] = useState('');
    const [unlockBusy, setUnlockBusy] = useState(false);
    const biometricAttemptedRef = useRef(false);

    // 1. Hydration Mismatch टाळण्यासाठी Mounted State जोडली आहे
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleSaleScreen = (event: Event) => {
            const custom = event as CustomEvent<{ open?: boolean }>;
            setHideSaleMobileBottomBar(Boolean(custom.detail?.open));
        };
        window.addEventListener('vyaparos:sale-screen', handleSaleScreen);
        return () => window.removeEventListener('vyaparos:sale-screen', handleSaleScreen);
    }, []);

    useEffect(() => {
        setMounted(true);
        const unlockedThisSession = sessionStorage.getItem('vyaparos-app-unlocked') === '1';
        setAppLocked(!unlockedThisSession && (hasAppPin() || hasBiometricLock()));
    }, []);

    // App-lock is local-device security, not cloud authentication. Once the
    // user has enabled PIN/biometric lock, moving the Android app to the
    // background locks it again. Unlock therefore works fully offline.
    useEffect(() => {
        if (!mounted || pathname.startsWith('/t/')) return;
        let nativeListener: { remove: () => Promise<void> } | null = null;
        let disposed = false;
        let hidden = false;

        const lock = () => {
            if (hasAppPin() || hasBiometricLock()) {
                sessionStorage.removeItem('vyaparos-app-unlocked');
                setAppLocked(true);
                setUnlockPin('');
                setUnlockError('');
                biometricAttemptedRef.current = false;
            }
        };

        const onVisibility = () => {
            if (document.hidden) hidden = true;
            else if (hidden) { hidden = false; lock(); }
        };
        document.addEventListener('visibilitychange', onVisibility);

        void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
            if (!isActive) hidden = true;
            else if (hidden) { hidden = false; lock(); }
        }).then((handle) => {
            if (disposed) void handle.remove();
            else nativeListener = handle;
        });

        return () => {
            disposed = true;
            document.removeEventListener('visibilitychange', onVisibility);
            if (nativeListener) void nativeListener.remove();
        };
    }, [mounted, pathname]);


    // Android Capacitor back: navigate through app history; only exit when Home is active.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const capacitor = (window as any).Capacitor;
        const appPlugin = capacitor?.Plugins?.App;
        let listener: any;
        let active = true;
        const setup = async () => {
            if (!appPlugin?.addListener) return;
            listener = await appPlugin.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
                if (!active) return;
                const backEvent = new CustomEvent('vyaparos:back', { cancelable: true });
                const handled = !window.dispatchEvent(backEvent);
                if (handled) return;
                if (pathname !== '/' && canGoBack) { router.back(); return; }
                if (pathname !== '/') { router.push('/'); return; }
                if (appPlugin?.exitApp) void appPlugin.exitApp();
            });
        };
        void setup();
        return () => { active = false; if (listener?.remove) void listener.remove(); };
    }, [pathname, router]);

    const unlockWithPin = async () => {
        setUnlockBusy(true);
        setUnlockError('');
        const ok = await verifyAppPin(unlockPin);
        if (ok) {
            setAppLocked(false);
            sessionStorage.setItem('vyaparos-app-unlocked', '1');
            setUnlockPin('');
        } else {
            setUnlockError('PIN चुकीचा आहे.');
        }
        setUnlockBusy(false);
    };

    const unlockWithBiometric = async () => {
        setUnlockBusy(true);
        setUnlockError('');
        const ok = await verifyBiometric();
        if (ok) {
            setAppLocked(false);
            sessionStorage.setItem('vyaparos-app-unlocked', '1');
        }
        else setUnlockError('Fingerprint/biometric verification अयशस्वी झाली.');
        setUnlockBusy(false);
    };

    // When biometric lock is enabled, launch the device biometric prompt immediately.
    // A mismatch/failure keeps the PIN fallback on screen.
    useEffect(() => {
        if (!mounted || !appLocked || !hasBiometricLock() || biometricAttemptedRef.current) return;
        biometricAttemptedRef.current = true;
        const timer = window.setTimeout(() => { void unlockWithBiometric(); }, 180);
        return () => window.clearTimeout(timer);
    }, [mounted, appLocked]);

    const handleLogout = async () => {
        await signOut();
    };

    // Public customer ledger pages must never render the main VyaparOS app shell.
    // They are standalone, tokenized, login-free pages shared with customers.
    if (pathname.startsWith('/t/')) {
        return (
            <div className="min-h-screen bg-slate-100 text-slate-900">
                <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
                    <div className="mx-auto flex h-12 max-w-3xl items-center px-3">
                        <span className="text-base font-extrabold tracking-tight text-slate-900">VyaparOS</span>
                    </div>
                </header>
                <main>{children}</main>
            </div>
        );
    }

    // टोस्ट नोटिफिकेशन्स
    useEffect(() => {
        const handleOnline = () => {
            toast.success('परत ऑनलाईन कनेक्ट झाले!', {
                description: 'तुमचा ऑफलाइन डेटा क्लाऊडवर सेव्ह होत आहे...',
                icon: <Wifi className="h-4 w-4 text-emerald-500" />,
            });
        };

        const handleOffline = () => {
            toast.warning('इंटरनेट बंद आहे (Offline)', {
                description: 'सर्व बदल तुमच्या डिव्हाइसवर सुरक्षितपणे सेव्ह होतील.',
                icon: <WifiOff className="h-4 w-4 text-amber-500" />,
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const userName = businessProfile.ownerName || 'User';
    const initials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="vyaparos-app vy-ref-shell min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900">
            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-border bg-card lg:flex">
                <div className="flex items-center gap-2.5 px-5 py-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
                        <Wallet className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">{t.appName}</span>
                </div>

                <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
                    {navLinks.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                )}
                            >
                                <Icon className="h-4.5 w-4.5" style={{ width: '1.125rem', height: '1.125rem' }} />
                                {t[item.labelKey]}
                            </Link>
                        );
                    })}
                </nav>

                {/* User card at bottom */}
                <div className="border-t border-border p-3">
                    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-sm font-bold text-white">
                            {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? <img src={user.user_metadata.avatar_url || user.user_metadata.picture} alt="" className="h-full w-full object-cover" /> : initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{userName}</p>
                            <p className="truncate text-xs text-muted-foreground">{t.shopOwner}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content wrapper */}
            <div className="lg:pl-64">
                {/* Global Header: desktop stays unchanged; mobile header is shown only on Home. */}
                {!hideGlobalHeader && <header className={cn("sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md", pathname !== '/' && 'hidden lg:block')}>
                    <div className="hidden items-center justify-between px-4 py-3 sm:px-6 lg:flex">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-sm font-bold text-white">{user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? <img src={user.user_metadata.avatar_url || user.user_metadata.picture} alt="" className="h-full w-full object-cover" /> : initials}</div>
                            <div>
                                <p className="text-sm font-semibold">{userName}</p>
                                <p className="text-xs text-muted-foreground">{t.welcome}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Sync Status Badge - फक्त क्लायंटवर Mount झाल्यावरच दाखवले जाईल */}
                            {mounted && (
                                <>
                                    {!isOnline ? (
                                        <div
                                            title={`ऑफलाइन (${pendingCount} पेंडिंग)`}
                                            className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 border border-amber-500/20 dark:text-amber-400"
                                        >
                                            <WifiOff className="h-3.5 w-3.5" />
                                            <span>{pendingCount}</span>
                                        </div>
                                    ) : isSyncing ? (
                                        <div
                                            title="सिंक होत आहे..."
                                            className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                        </div>
                                    ) : (
                                        <div
                                            title="ऑनलाइन"
                                            className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Language Switcher Button */}
                            <button
                                onClick={toggleLanguage}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background shadow-xs transition-all hover:bg-accent active:scale-95"
                                aria-label="Toggle language"
                                title="भाषा बदला"
                            >
                                <Languages className="h-4 w-4 text-muted-foreground" />
                            </button>

                            {/* Dark Mode / Light Mode Toggle */}
                            <button
                                onClick={toggleDarkMode}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background shadow-xs transition-all hover:bg-accent active:scale-95"
                                aria-label="Toggle dark mode"
                                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                            >
                                {mounted ? (
                                    isDarkMode ? (
                                        <Sun className="h-4.5 w-4.5 text-amber-500 transition-transform hover:rotate-45" />
                                    ) : (
                                        <Moon className="h-4.5 w-4.5 text-slate-700 dark:text-slate-200 transition-transform hover:-rotate-12" />
                                    )
                                ) : (
                                    <div className="h-4.5 w-4.5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Home header: user identity on the left; notification, dark mode and language on the right. */}
                    {pathname === '/' && (
                        <div className="vy-ref-home-header flex items-center justify-between gap-3 px-3 py-2.5 lg:hidden">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <div className="vy-ref-avatar vy-ref-user-avatar">{(user?.user_metadata?.avatar_url || businessProfile.businessLogoUrl) ? <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${user?.user_metadata?.avatar_url || businessProfile.businessLogoUrl})` }} /> : initials}</div>
                                <div className="min-w-0">
                                    <p className="vy-ref-mobile-user-name">{userName}</p>
                                    <p className="vy-ref-mobile-user-role">{t.shopOwner}</p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <button type="button" className="vy-ref-bell" aria-label="Notifications"><Bell className="h-5 w-5" /><i /></button>
                                <button type="button" onClick={toggleDarkMode} className="vy-ref-header-icon" aria-label="Toggle dark mode" title={isDarkMode ? 'Light Mode' : 'Dark Mode'}>
                                    {mounted ? (isDarkMode ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4" />) : <Moon className="h-4 w-4" />}
                                </button>
                                <button type="button" onClick={toggleLanguage} className="vy-ref-header-language" aria-label="Toggle language" title="भाषा बदला">
                                    <Languages className="h-4 w-4" />
                                    <span>{language === 'en' ? 'मराठी' : 'EN'}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </header>}

                {/* Page content */}
                <main className={cn('px-4 sm:px-6 lg:pb-8 lg:pl-6 lg:pr-8', hideGlobalHeader ? 'py-0' : 'py-5 sm:py-6', hideMobileBottomBar ? 'pb-0' : 'pb-28')}>
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Bar: Home / Custom 2 / + / Custom 4 / Menu */}
            {!hideMobileBottomBar && (
            <nav aria-hidden={false} className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden">
                <div className="grid h-[72px] grid-cols-5 items-center px-1 pb-[env(safe-area-inset-bottom)]">
                    <MobileNavLink href={businessProfile.bottomButton1} pathname={pathname} t={t} />
                    <MobileNavLink href={businessProfile.bottomButton2} pathname={pathname} t={t} />
                    <div className="flex justify-center">
                        <button
                            type="button"
                            aria-label="Home"
                            onClick={() => router.push('/')}
                            className="group relative -mt-7 flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform active:scale-95 vy-home-center-button"
                        >
                            <span className="absolute inset-0 rounded-full border-2 border-blue-300/40 group-hover:animate-ping" />
                            <Home className="relative h-6 w-6" />
                        </button>
                    </div>
                    <MobileNavLink href={businessProfile.bottomButton4} pathname={pathname} t={t} />
                    <Link href="/menu" className={cn('flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium', pathname === '/menu' ? 'text-primary' : 'text-muted-foreground')}>
                        <Menu className="h-5 w-5" />
                        {t.navMenu}
                    </Link>
                </div>
            </nav>
            )}

            {mounted && appLocked && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-md">
                    <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <KeyRound className="h-7 w-7" />
                        </div>
                        <h2 className="text-xl font-bold">{t.appSecurity}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{t.appSecurityDesc}</p>
                        <div className="mt-5 space-y-3">
                            {hasAppPin() && (
                                <>
                                    <input
                                        value={unlockPin}
                                        onChange={(e) => { setUnlockPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setUnlockError(''); }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') void unlockWithPin(); }}
                                        inputMode="numeric"
                                        type="password"
                                        maxLength={6}
                                        placeholder="6 digit PIN"
                                        className="h-12 w-full rounded-xl border border-border bg-background px-4 text-center text-lg tracking-[0.35em] outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <button onClick={unlockWithPin} disabled={unlockBusy || unlockPin.length < 4} className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">{t.unlockWithPin}</button>
                                </>
                            )}
                            {hasBiometricLock() && (
                                <button onClick={() => void unlockWithBiometric()} disabled={unlockBusy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background font-semibold hover:bg-accent disabled:opacity-50">
                                    <Fingerprint className="h-5 w-5" />
                                    Unlock with Fingerprint
                                </button>
                            )}
                            {unlockError && <p className="text-sm text-destructive">{unlockError}</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}