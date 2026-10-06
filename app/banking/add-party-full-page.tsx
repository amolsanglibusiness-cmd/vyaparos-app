'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ContactRound, Info, Search, Settings, UserPlus, User } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSettings } from './settings-context';
import type { LedgerParty, LedgerPartyType } from './types';
import { generateId } from './mock-data';
import { readImageFile } from '@/src/lib/image-upload';
import { cn } from '@/lib/utils';

type ContactRow = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
};

type WebContact = { name?: string[]; tel?: string[]; email?: string[]; address?: string[] };

export function AddPartyFullPage({ onBack, onSaved, onSaveAndNew }: { onBack: () => void; onSaved: (party: LedgerParty) => void; onSaveAndNew: (party: LedgerParty) => void }) {
  const { t, language } = useSettings();
  const [pName, setPName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [balanceType, setBalanceType] = useState<'To Receive' | 'To Pay'>('To Pay');
  const [pAddress, setPAddress] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pType, setPType] = useState<LedgerPartyType>('Customer');
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [showContacts, setShowContacts] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactError, setContactError] = useState('');
  const [gstTab, setGstTab] = useState<'address' | 'gst'>('address');

  const [pPhotoUrl, setPPhotoUrl] = useState('');
  const [partyPhotoError, setPartyPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const showTimer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('vyaparos:sale-screen', { detail: { open: true } }));
    }, 0);
    return () => {
      window.clearTimeout(showTimer);
      window.dispatchEvent(new CustomEvent('vyaparos:sale-screen', { detail: { open: false } }));
    };
  }, []);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts.slice(0, 50);
    return contacts.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q)).slice(0, 50);
  }, [contacts, search]);

  const selectContact = (contact: ContactRow) => {
    setPName(contact.name);
    setPPhone(contact.phone);
    setPEmail(contact.email);
    setPAddress(contact.address);
    setShowContacts(false);
  };

  const importContacts = async () => {
    setContactError('');
    setLoadingContacts(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const permission = await Contacts.requestPermissions();
        if (permission.contacts !== 'granted' && permission.contacts !== 'limited') {
          setContactError(t.contactsPermissionDenied);
          return;
        }
        const result = await Contacts.getContacts({
          projection: {
            name: true,
            organization: true,
            phones: true,
            emails: true,
            postalAddresses: true,
          },
        });
        const rows: ContactRow[] = result.contacts.map((c) => {
          const name = [c.name?.given, c.name?.middle, c.name?.family]
            .filter(Boolean)
            .join(' ') || c.name?.display || c.organization?.company || '';
          const phone = c.phones?.find((p) => p.number)?.number || '';
          const email = c.emails?.find((e) => e.address)?.address || '';
          const postal = c.postalAddresses?.find((a) => a.street || a.city || a.region || a.postcode);
          const address = [postal?.street, postal?.city, postal?.region, postal?.postcode]
            .filter(Boolean)
            .join(', ');
          return { id: c.contactId, name, phone, email, address };
        }).filter((c) => c.name || c.phone);
        setContacts(rows);
        setShowContacts(true);
        return;
      }

      const picker = (navigator as Navigator & { contacts?: { select: (properties: string[], options?: { multiple?: boolean }) => Promise<WebContact[]> } }).contacts;
      if (picker?.select) {
        const picked = await picker.select(['name', 'tel', 'email', 'address'], { multiple: false });
        const rows = (picked || []).map((c) => ({ name: c.name?.[0] || '', phone: c.tel?.[0] || '', email: c.email?.[0] || '', address: c.address?.[0] || '' }));
        setContacts(rows);
        if (rows[0]) selectContact(rows[0]);
        return;
      }
      setContactError(language === 'mr' ? 'वेबवर Contacts Picker उपलब्ध नाही. Android app मधून संपर्क आयात करा.' : 'Contacts Picker is not available in this browser. Use the Android app to import contacts.');
    } catch (error) {
      setContactError(error instanceof Error ? error.message : t.contactsPermissionDenied);
    } finally {
      setLoadingContacts(false);
    }
  };

  const save = () => {
    if (!pName.trim()) { toast.error(language === 'mr' ? 'पक्षाचे नाव टाका.' : 'Party name is required.'); return; }
    const normalizedPhone = pPhone.replace(/\D/g, '');
    if (normalizedPhone && normalizedPhone.length !== 10) { toast.error(language === 'mr' ? 'मोबाईल क्रमांक 10 अंकांचा असावा.' : 'Mobile number must contain 10 digits.'); return; }
    const amount = Math.max(0, Number(openingBalance) || 0);
    const signedBalance = balanceType === 'To Receive' ? amount : -amount;
    const party: LedgerParty = {
      id: generateId('lp'),
      name: pName.trim(),
      businessContactNumber: '', // <--- इथे जोडले
      type: pType,
      phone: normalizedPhone,
      email: pEmail.trim(),
      address: pAddress.trim(),
      photoUrl: pPhotoUrl || null,
      upiId: '',
      openingBalance: signedBalance,
      gstin: gstin.trim(),
      notes: '',
      createdAt: new Date(`${asOfDate}T00:00:00`).toISOString(),
    };
    onSaved(party);
  };

  return (
    <div className="vy-page-add-party fixed inset-0 z-[70] flex min-h-screen flex-col bg-background lg:relative lg:inset-auto lg:z-auto lg:min-h-0">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4">
        <button type="button" onClick={onBack} className="rounded-full p-2 hover:bg-muted" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-lg font-semibold">{t.addNewParty}</h1>
        <button type="button" className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Settings"><Settings className="h-5 w-5" /></button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 pb-32 pt-6">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="relative">
            <Label className="absolute -top-2 left-3 z-10 bg-background px-1 text-xs text-primary">{t.partyName}*</Label>
            <div className="flex items-center gap-2">
              <Input
                className={cn("h-14 w-full bg-background text-base", contacts.length === 0 ? "pr-32" : "pr-3")}
                value={pName}
                onChange={(e) => { setPName(e.target.value); if (contacts.length) { setSearch(e.target.value); setShowContacts(true); } }}
                onFocus={() => { if (contacts.length) setShowContacts(true); }}
                placeholder={language === 'mr' ? 'उदा. राम प्रसाद' : 'e.g. Ram Prasad'}
                autoFocus
              />
              {contacts.length === 0 && (
                <button
                  type="button"
                  onClick={() => void importContacts()}
                  disabled={loadingContacts}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-sky-200 bg-gradient-to-r from-sky-100 via-blue-100 to-violet-100 px-3 py-1.5 text-[13px] font-semibold text-blue-700 disabled:opacity-60 dark:border-sky-800 dark:from-sky-950/60 dark:via-blue-950/60 dark:to-violet-950/60 dark:text-sky-200"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <ContactRound className="h-4 w-4" />
                    {loadingContacts ? (language === 'mr' ? 'लोड...' : 'Loading...') : 'Import contacts'}
                  </span>
                </button>
              )}
            </div>

            {showContacts && contacts.length > 0 && (
              <section className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border bg-card shadow-lg">
                <div className="border-b px-3 py-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="h-9 pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t.searchContacts}
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {filteredContacts.length ? filteredContacts.map((c, i) => (
                    <button
                      key={c.id || `${c.phone}-${i}`}
                      type="button"
                      onClick={() => selectContact(c)}
                      className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <UserPlus className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.name || '—'}</span>
                        <span className="block text-xs text-muted-foreground">{c.phone || c.email || '—'}</span>
                      </span>
                    </button>
                  )) : (
                    <p className="p-4 text-center text-sm text-muted-foreground">{t.noContactsFound}</p>
                  )}
                </div>
              </section>
            )}

            {contactError && (
              <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {contactError}
              </div>
            )}
          </div>
          <Input className="h-14" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder={t.partyGstin} />
          {gstin && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5" /> {language === 'mr' ? 'GSTIN तपासणीसाठी पुढील तपशील भरले जातील.' : 'GSTIN can be used to verify party details.'}</p>}
          <Input className="h-14" inputMode="numeric" value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder={t.phone} />

          <div className="rounded-xl border bg-card p-3">
            <Label className="mb-2 block">{t.profilePhoto}</Label>
            <div className="flex items-center gap-4">
              {pPhotoUrl ? (
                <img src={pPhotoUrl} alt="Party preview" className="h-20 w-20 shrink-0 rounded-xl border object-cover" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed bg-muted">
                  <User className="h-7 w-7 text-muted-foreground/50" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90">
                    <UserPlus className="mr-2 h-4 w-4" />
                    {pPhotoUrl ? (language === 'mr' ? 'फोटो बदला' : 'Change Photo') : t.addPhoto}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.currentTarget.value = '';
                        if (!file) return;
                        try {
                          setPartyPhotoError(null);
                          setPPhotoUrl(await readImageFile(file));
                        } catch (error) {
                          setPartyPhotoError(error instanceof Error ? error.message : 'Unable to upload photo.');
                        }
                      }}
                    />
                  </label>
                  {pPhotoUrl && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setPartyPhotoError(null); setPPhotoUrl(''); }}>
                      {t.remove}
                    </Button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG, WEBP • Maximum 2MB</p>
                {partyPhotoError && <p className="mt-1 text-xs text-destructive">{partyPhotoError}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3"><div><Label className="sr-only">{t.openingBalance}</Label><Input className="h-14" type="number" min="0" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder={language === 'mr' ? 'प्रारंभ शिल्लक' : 'Opening Bal.'} /></div><div className="relative"><Label className="sr-only">Date</Label><CalendarDays className="pointer-events-none absolute right-3 top-4 h-5 w-5 text-primary" /><Input className="h-14 pr-10" type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} /></div></div>

          <div className="flex items-center gap-6 border-b pb-4 text-sm"><button type="button" onClick={() => setBalanceType('To Receive')} className="flex items-center gap-2"><span className={`h-5 w-5 rounded-full border-2 ${balanceType === 'To Receive' ? 'border-primary' : 'border-muted-foreground/40'}`}>{balanceType === 'To Receive' && <span className="m-0.5 block h-3 w-3 rounded-full bg-primary" />}</span>{language === 'mr' ? 'घेणे' : 'To Receive'}</button><button type="button" onClick={() => setBalanceType('To Pay')} className="flex items-center gap-2"><span className={`h-5 w-5 rounded-full border-2 ${balanceType === 'To Pay' ? 'border-primary' : 'border-muted-foreground/40'}`}>{balanceType === 'To Pay' && <span className="m-0.5 block h-3 w-3 rounded-full bg-primary" />}</span>{language === 'mr' ? 'देणे' : 'To Pay'}</button></div>

          <div className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-1"><button type="button" onClick={() => setPType('Customer')} className={`rounded-lg px-3 py-2 text-sm font-medium ${pType === 'Customer' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t.customer}</button><button type="button" onClick={() => setPType('Supplier')} className={`rounded-lg px-3 py-2 text-sm font-medium ${pType === 'Supplier' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{t.supplier}</button></div>

          <div className="border-b pt-2"><div className="grid grid-cols-2">
            <button type="button" onClick={() => setGstTab('address')} className={`border-b-2 px-3 py-3 text-center text-sm font-medium ${gstTab === 'address' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>{t.address}</button>
            <button type="button" onClick={() => setGstTab('gst')} className={`border-b-2 px-3 py-3 text-center text-sm font-medium ${gstTab === 'gst' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>GST Details</button>
          </div></div>
          {gstTab === 'address' ? (
            <>
              <Input className="h-14" value={pAddress} onChange={(e) => setPAddress(e.target.value)} placeholder={t.address} />
              <Input className="h-14" type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder={t.email} />
            </>
          ) : (
            <div className="space-y-3 rounded-xl border bg-card p-3">
              <div><Label className="text-xs">{t.partyGstin}</Label><Input className="mt-1 h-12 uppercase" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" /></div>
              <p className="text-xs text-muted-foreground">{language === 'mr' ? 'पक्षाचा GSTIN येथे भरा. हा तपशील पार्टीसोबत सेव्ह होईल.' : 'Enter the party GSTIN here. This detail will be saved with the party.'}</p>
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-[80] grid grid-cols-2 gap-0 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:absolute">
        <Button variant="ghost" className="h-16 rounded-none border-0" onClick={() => { 
          const normalizedPhone = pPhone.replace(/\D/g, '');
          if (!pName.trim()) { toast.error(language === 'mr' ? 'पक्षाचे नाव टाका.' : 'Party name is required.'); return; }
          const amount = Math.max(0, Number(openingBalance) || 0);
          onSaveAndNew({ 
            id: generateId('lp'), 
            name: pName.trim(), 
            businessContactNumber: '', // <--- इथे जोडले
            type: pType, 
            phone: normalizedPhone, 
            email: pEmail.trim(), 
            address: pAddress.trim(), 
            photoUrl: pPhotoUrl || null, 
            upiId: '', 
            openingBalance: balanceType === 'To Receive' ? amount : -amount, 
            gstin: gstin.trim(), 
            notes: '', 
            createdAt: new Date(`${asOfDate}T00:00:00`).toISOString() 
          });
          setPName(''); setGstin(''); setPPhone(''); setOpeningBalance(''); setPAddress(''); setPEmail(''); setPPhotoUrl(''); setPartyPhotoError(null); setContacts([]); setShowContacts(false); 
        }}>{t.saveAndNew}</Button>
        <Button className="mobile-entry-save h-16 rounded-none border-0" onClick={save}>{t.saveParty}</Button>
      </div>
    </div>
  );
}