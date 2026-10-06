'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft, BarChart3, Banknote, BookOpen, Bot, FileText, Landmark, Languages,
  LayoutDashboard, LogOut, Package, Receipt, ScanLine, Settings as SettingsIcon,
  Sun, ChevronRight, Globe2, ShieldCheck, Building2, Plus, X, Check,

} from 'lucide-react';
import { useSettings } from '../banking/settings-context';
import { useAuth } from '@/hooks/use-auth';
import { useMultiUser } from '../banking/multi-user-context';

const menuItems = [
  { href: '/', labelKey: 'navDashboard', icon: LayoutDashboard, tone: 'cyan', desc: 'Overview & quick stats' },
  { href: '/banking', labelKey: 'navBanking', icon: Landmark, tone: 'blue', desc: 'Manage your bank accounts' },
  { href: '/transactions', labelKey: 'navTransactions', icon: Receipt, tone: 'violet', desc: 'View & manage all transactions' },
  { href: '/pos', labelKey: 'navPos', icon: ScanLine, tone: 'blue', desc: 'Point of Sale & billing' },
  { href: '/invoice', labelKey: 'navInvoice', icon: FileText, tone: 'cyan', desc: 'Create & manage invoices' },
  { href: '/sales-history', labelKey: 'navSalesHistory', icon: BarChart3, tone: 'indigo', desc: 'View sales reports' },
  { href: '/ledger', labelKey: 'navLedger', icon: BookOpen, tone: 'purple', desc: 'Party ledger & accounts' },
  { href: '/cash', labelKey: 'navCash', icon: Banknote, tone: 'green', desc: 'Cash in hand & petty cash' },
  { href: '/inventory', labelKey: 'navInventory', icon: Package, tone: 'amber', desc: 'Stock & product management' },
  { href: '/reports', labelKey: 'navReports', icon: BarChart3, tone: 'purple', desc: 'Business insights & analytics' },
  { href: '/settings', labelKey: 'navSettings', icon: SettingsIcon, tone: 'cyan', desc: 'App settings & preferences' },
  { href: '/assistant', labelKey: 'navAssistant', icon: Bot, tone: 'violet', desc: 'AI Assistant & smart commands' },
] as const;

const toneClass: Record<string, string> = {
  cyan: 'menu-icon-cyan', blue: 'menu-icon-blue', violet: 'menu-icon-violet', indigo: 'menu-icon-indigo',
  purple: 'menu-icon-purple', green: 'menu-icon-green', amber: 'menu-icon-amber',
};

export default function MenuPage() {
  const router = useRouter();
  const { t, isDarkMode, toggleDarkMode, toggleLanguage, language, businessProfile } = useSettings();
  const { signOut, user, signInWithGoogle } = useAuth();
  const { businesses, currentBusiness, createBusiness, switchBusiness, businessMembers, currentRole } = useMultiUser();
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [userBusy, setUserBusy] = useState('');
  const owner = businessProfile.ownerName || user?.user_metadata?.name || 'Business Owner';
  const initials = owner.split(/\s+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const ownerAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || businessMembers.find((m) => m.id === user?.id)?.avatarUrl || null;

  return (
    <div className="vy-menu-page mx-auto w-full max-w-3xl">
      <header className="vy-menu-header">
        <button type="button" onClick={() => router.back()} className="vy-menu-back" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
        <div className="vy-menu-title-icon"><LayoutDashboard className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1"><h1>Menu</h1><p>Manage your app settings & more</p></div>
        <button type="button" onClick={() => setUserPanelOpen(true)} className="vy-menu-profile" aria-label="Change business">
          <div className="vy-menu-avatar">{ownerAvatar ? <img src={ownerAvatar} alt="" className="h-full w-full object-cover" /> : initials}</div>
          <div className="hidden sm:block"><b>{owner}</b><span>{businessProfile.businessName || 'Admin'}</span></div><ChevronRight className="h-5 w-5 rotate-90" />
        </button>
      </header>

      <main className="vy-menu-content">
        <section className="vy-menu-list">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`vy-menu-row ${index === 0 ? 'active' : ''}`}>
                <span className={`vy-menu-icon ${toneClass[item.tone]}`}><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><b>{t[item.labelKey]}</b><small>{item.desc}</small></span>
                <ChevronRight className="h-5 w-5 shrink-0" />
              </Link>
            );
          })}
        </section>

        <section className="vy-menu-preferences">
          <button type="button" onClick={toggleLanguage} className="vy-menu-setting-row">
            <span className="vy-menu-setting-icon"><Languages className="h-5 w-5" /></span>
            <span><b>Language</b><small>Switch between English & मराठी</small></span>
            <span className="vy-menu-value"><Globe2 className="h-4 w-4" />{language === 'en' ? 'English' : 'मराठी'}<ChevronRight className="h-4 w-4 rotate-90" /></span>
          </button>
          <button type="button" onClick={toggleDarkMode} className="vy-menu-setting-row">
            <span className="vy-menu-setting-icon"><Sun className="h-5 w-5" /></span>
            <span><b>Dark Mode</b><small>Change app appearance</small></span>
            <span className={`vy-menu-switch ${isDarkMode ? 'on' : ''}`}><i /></span>
          </button>
          <button type="button" onClick={() => void signOut()} className="vy-menu-setting-row danger">
            <span className="vy-menu-setting-icon"><LogOut className="h-5 w-5" /></span>
            <span><b>Logout</b><small>Sign out from your account</small></span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </section>

        {userPanelOpen && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="w-full max-w-lg rounded-t-3xl border border-sky-200 bg-background p-4 dark:border-sky-900 sm:rounded-3xl">
              <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-extrabold">My Businesses</h2><p className="text-xs text-muted-foreground">Business निवडा किंवा नवीन business तयार करा.</p></div><button type="button" onClick={() => setUserPanelOpen(false)} className="rounded-full border p-2"><X className="h-4 w-4" /></button></div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {businesses.map((b) => <button key={b.id} type="button" onClick={async()=>{const r=await switchBusiness(b.id);if(r.error)alert(r.error);else setUserPanelOpen(false);}} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${b.id===currentBusiness?.id?'border-sky-400 bg-sky-50 dark:bg-sky-950/20':''}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 text-white"><Building2 className="h-5 w-5"/></span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{b.name}</b><small className="text-xs text-muted-foreground">{b.role}</small></span>{b.id===currentBusiness?.id&&<span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Current</span>}</button>)}
              </div>
              {currentRole !== 'member' && <div className="mt-4 border-t pt-4"><p className="mb-2 text-sm font-bold">Add New Business</p><input value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Business / Shop name" className="mb-2 h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-sky-400"/><button type="button" disabled={!businessName.trim()} onClick={async()=>{const r=await createBusiness(businessName);if(r.error)alert(r.error);else{setBusinessName('');setUserPanelOpen(false);}}} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4"/>Add Business</button></div>}
            </div>
          </div>
        )}

        <div className="vy-menu-footer-note"><ShieldCheck className="h-4 w-4" /> Your business data stays secure and synced.</div>
      </main>
    </div>
  );
}
