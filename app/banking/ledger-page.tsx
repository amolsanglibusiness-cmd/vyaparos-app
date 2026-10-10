'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  BookOpen,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  User,
  Truck,
  ArrowUpCircle,
  ArrowDownCircle,
  MessageCircle,
  Trash2,
  Edit2,
  ChevronLeft,
  CheckCircle2,
  Wallet,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from './settings-context';
import { useMultiUser } from './multi-user-context';
import { generateId } from './mock-data';
import type { LedgerParty, LedgerEntry, LedgerPartyType, LedgerEntryType } from './types';
import { useAppData, GALLA_ID } from './app-data-context';
import { AddPartyDialog, AddPartyDialogContent } from './party-dialog';
import { AddPartyFullPage } from './add-party-full-page';
import { MobileFab } from './mobile-fab';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getPartyColor(party: LedgerParty) {
  const colors = [
    'from-sky-400 to-blue-500',
    'from-teal-400 to-emerald-500',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-red-500',
    'from-violet-400 to-purple-500',
  ];
  const hash = party.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function LedgerPage() {
  const { t, businessProfile } = useSettings();
  const { businessId } = useMultiUser();
  const { bankAccounts, addTransaction, updateTransaction, ledgerParties: parties, ledgerEntries: entries, addLedgerParty, updateLedgerParty, deleteLedgerParty, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'Customer' | 'Supplier'>('all');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [addPartyOpen, setAddPartyOpen] = useState(false);
  const [fullAddPartyOpen, setFullAddPartyOpen] = useState(false);
  const [editParty, setEditParty] = useState<LedgerParty | null>(null);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);

  // Add party form state
  const [pName, setPName] = useState('');
  const [pType, setPType] = useState<LedgerPartyType>('Customer');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [pUpiId, setPUpiId] = useState('');
  const [pGstin, setPGstin] = useState('');
  const [pNotes, setPNotes] = useState('');
  const [pPhotoUrl, setPPhotoUrl] = useState('');

  // Add entry form state
  const [eType, setEType] = useState<LedgerEntryType>('Given');
  const [eAmount, setEAmount] = useState('');
  const [eDescription, setEDescription] = useState('');
  const [eDate, setEDate] = useState(new Date().toISOString().slice(0, 10));

  // स्क्रोल नेहमी पेजच्या वरच्या टोकाला नेण्यासाठी
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedPartyId]);

  const saveFullParty = (party: LedgerParty) => {
    addLedgerParty(party);
    setFullAddPartyOpen(false);
    setSelectedPartyId(party.id);
  };

  const saveFullPartyAndNew = (party: LedgerParty) => {
    addLedgerParty(party);
    setSelectedPartyId(party.id);
    toast.success(t.saveParty);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (!editId) return;
    const party = parties.find((item) => item.id === editId);
    if (party) {
      setEditParty(party);
      setPName(party.name); setPType(party.type); setPPhone(party.phone); setPEmail(party.email);
      setPAddress(party.address); setPUpiId(party.upiId); setPGstin(party.gstin ?? ''); setPNotes(party.notes); setPPhotoUrl(party.photoUrl ?? '');
      setAddPartyOpen(true); setSelectedPartyId(party.id);
    }
  }, [parties]);

  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      if (activeTab !== 'all' && p.type !== activeTab) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.phone.includes(searchQuery);
      }
      return true;
    });
  }, [parties, activeTab, searchQuery]);

  const selectedParty = useMemo(
    () => parties.find((p) => p.id === selectedPartyId) ?? null,
    [parties, selectedPartyId]
  );

  const partyEntries = useMemo(
    () =>
      entries
        .filter((e) => e.partyId === selectedPartyId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries, selectedPartyId]
  );

  const getPartyBalance = useCallback(
    (partyId: string): number => {
      const partyEntries = entries.filter((e) => e.partyId === partyId);
      const given = partyEntries.filter((e) => e.type === 'Given').reduce((s, e) => s + e.amount, 0);
      const received = partyEntries.filter((e) => e.type === 'Received').reduce((s, e) => s + e.amount, 0);
      return given - received;
    },
    [entries]
  );

  const totals = useMemo(() => {
    let receivable = 0;
    let payable = 0;
    parties.forEach((p) => {
      const bal = getPartyBalance(p.id);
      if (bal > 0) receivable += bal;
      else if (bal < 0) payable += Math.abs(bal);
    });
    return { receivable, payable };
  }, [parties, getPartyBalance]);

  if (fullAddPartyOpen) {
    return <AddPartyFullPage onBack={() => setFullAddPartyOpen(false)} onSaved={saveFullParty} onSaveAndNew={saveFullPartyAndNew} />;
  }

  const resetPartyForm = () => {
    setPName('');
    setPType('Customer');
    setPPhone('');
    setPEmail('');
    setPAddress('');
    setPUpiId('');
    setPGstin('');
    setPNotes('');
    setPPhotoUrl('');
    setEditParty(null);
  };

  const handleSaveParty = () => {
    if (!pName.trim() || !pPhone.trim()) return;
    if (editParty) {
      updateLedgerParty({
        ...editParty,
        name: pName.trim(), type: pType, phone: pPhone.trim(), email: pEmail.trim(),
        address: pAddress.trim(), upiId: pUpiId.trim(), gstin: pGstin.trim(), photoUrl: pPhotoUrl || null, notes: pNotes.trim(),
      });
    } else {
      const newParty: LedgerParty = {
        id: generateId('lp'), name: pName.trim(), type: pType, phone: pPhone.trim(), email: pEmail.trim(),
        address: pAddress.trim(), upiId: pUpiId.trim(), photoUrl: pPhotoUrl || null, openingBalance: 0,
        notes: pNotes.trim(), createdAt: new Date().toISOString(),
      };
      addLedgerParty(newParty);
    }
    resetPartyForm();
    setAddPartyOpen(false);
  };

  const handleEditParty = (party: LedgerParty) => {
    setEditParty(party);
    setPName(party.name);
    setPType(party.type);
    setPPhone(party.phone);
    setPEmail(party.email);
    setPAddress(party.address);
    setPUpiId(party.upiId);
    setPGstin(party.gstin ?? '');
    setPNotes(party.notes);
    setPPhotoUrl(party.photoUrl ?? '');
    setAddPartyOpen(true);
  };

  const handleDeleteParty = (id: string) => {
    const party = parties.find((p) => p.id === id);
    if (!party) return;
    if (!window.confirm(`${t.deleteParty}: ${party.name}?`)) return;
    deleteLedgerParty(id);
    if (selectedPartyId === id) setSelectedPartyId(null);
  };

  const resetEntryForm = () => {
    setEType('Given');
    setEAmount('');
    setEDescription('');
    setEDate(new Date().toISOString().slice(0, 10));
    setEditingEntry(null);
  };

  const openEditEntry = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setEType(entry.type);
    setEAmount(String(entry.amount));
    setEDescription(entry.description);
    setEDate(entry.date.slice(0, 10));
    setAddEntryOpen(true);
  };

  const handleSaveEntry = () => {
    if (!selectedPartyId || !eAmount) return;
    const amt = parseFloat(eAmount) || 0;
    if (amt <= 0) return;

    if (editingEntry) {
      const updated: LedgerEntry = {
        ...editingEntry,
        partyId: selectedPartyId,
        type: eType,
        amount: amt,
        description: eDescription.trim() || (eType === 'Given' ? t.given : t.received),
        date: eDate,
      };
      updateLedgerEntry(updated);

      if (updated.transactionId) {
        const party = parties.find((p) => p.id === selectedPartyId);
        updateTransaction({
          id: updated.transactionId,
          type: eType === 'Given' ? 'Expense' : 'Income',
          amount: amt,
          category: 'Other',
          description: `${eType === 'Given' ? 'Udhari given to' : 'Udhari received from'} ${party?.name ?? ''}`,
          date: eDate,
          tag: 'Shop / Business',
          sourceAccountId: GALLA_ID,
          destAccountId: null,
          isFromGalla: true,
          createdAt: updated.createdAt,
        });
      }
      toast.success('Ledger entry updated');
    } else {
      const transactionId = generateId('txn');
      const entry: LedgerEntry = {
        id: generateId('le'),
        partyId: selectedPartyId,
        type: eType,
        amount: amt,
        description: eDescription.trim() || (eType === 'Given' ? t.given : t.received),
        date: eDate,
        createdAt: new Date().toISOString(),
        transactionId,
      };
      addLedgerEntry(entry);

      const party = parties.find((p) => p.id === selectedPartyId);
      addTransaction({
        id: transactionId,
        type: eType === 'Given' ? 'Expense' : 'Income',
        amount: amt,
        category: 'Other',
        description: `${eType === 'Given' ? 'Udhari given to' : 'Udhari received from'} ${party?.name ?? ''}`,
        date: eDate,
        tag: 'Shop / Business',
        sourceAccountId: GALLA_ID,
        destAccountId: null,
        isFromGalla: true,
        createdAt: new Date().toISOString(),
      });
      toast.success('Ledger entry added');
    }

    resetEntryForm();
    setAddEntryOpen(false);
  };

  const handleDeleteEntry = (entry: LedgerEntry) => {
    if (!window.confirm(`Delete this ${entry.type.toLowerCase()} entry of ${formatCurrency(entry.amount)}?`)) return;
    deleteLedgerEntry(entry.id);
    toast.success('Ledger entry deleted');
  };

  const handleShareLedgerWhatsApp = async (party: LedgerParty) => {
    if (typeof window === 'undefined') return;

    const waTab = window.open('about:blank', '_blank');

    try {
      const paymentAccount =
        bankAccounts.find((account) => account.id === businessProfile.mainBankAccountId) ||
        bankAccounts.find((account) => Boolean(account.upiId)) ||
        bankAccounts[0] ||
        null;

      const businessSnapshot = {
        ownerName: businessProfile.ownerName || '',
        businessName: businessProfile.businessName || '',
        businessAddress: businessProfile.businessAddress || '',
        phone: businessProfile.phone || '',
        email: businessProfile.email || '',
        gstin: businessProfile.gstin || '',
        businessLogoUrl: businessProfile.businessLogoUrl || null,
      };

      const paymentSnapshot = paymentAccount
        ? {
            bankName: paymentAccount.bankName || '',
            accountHolderName: paymentAccount.accountHolderName || '',
            accountNumber: paymentAccount.accountNumber || '',
            ifscCode: paymentAccount.ifscCode || '',
            upiId: paymentAccount.upiId || '',
          }
        : null;

      let token = '';
      const existing = await supabase
        .from('ledger_share_links')
        .select('token')
        .eq('business_id', businessId)
        .eq('party_id', party.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing.data?.token) {
        token = existing.data.token;
      } else {
        const { data, error } = await supabase
          .from('ledger_share_links')
          .insert({
            business_id: businessId,
            party_id: party.id,
            business_snapshot: businessSnapshot,
            payment_snapshot: paymentSnapshot,
          })
          .select('token')
          .single();
        if (error) throw error;
        token = data.token;
      }

      const shareUrl = `https://vyaparos-app.vercel.app/t/${encodeURIComponent(token)}?s=pr`;
      const balance = getPartyBalance(party.id);
      const message = `Dear ${party.name},\n\nYour complete account/ledger history is available here:\n${shareUrl}\n\nCurrent balance: ${formatCurrency(Math.abs(balance))}\n\nYou can view all bills, receipts, payments, pending amounts and complete history without logging in.`;
      const phone = party.phone.replace(/[^0-9]/g, '');
      const countryPhone = phone.length === 10 ? `91${phone}` : phone;
      const waUrl = `https://wa.me/${countryPhone}?text=${encodeURIComponent(message)}`;

      if (waTab && !waTab.closed) {
        waTab.location.href = waUrl;
      } else {
        window.location.href = waUrl;
      }
      toast.success('WhatsApp ledger link ready');
    } catch (error) {
      if (waTab && !waTab.closed) waTab.close();
      console.error(error);
      toast.error('Could not create public ledger link.');
    }
  };

  const handleCall = (phone: string) => {
    if (typeof window !== 'undefined') {
      window.open(`tel:${phone}`, '_blank');
    }
  };

  if (selectedParty) {
    const balance = getPartyBalance(selectedParty.id);
    const isCustomer = selectedParty.type === 'Customer';
    const balanceColor = balance > 0 ? 'text-rose-600 dark:text-rose-400' : balance < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground';
    const balanceLabel = balance > 0 ? t.balanceGiven : balance < 0 ? t.balanceReceived : t.settled;
    const initials = getInitials(selectedParty.name);
    const colorGrad = getPartyColor(selectedParty);

    return (
      <div className="mx-auto max-w-4xl animate-fade-in-up">
        <button
          onClick={() => setSelectedPartyId(null)}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Ledger
        </button>

        <div className="vy-customer-ledger-profile mb-5">
          <div className="vy-customer-ledger-photo-wrap">
            {selectedParty.photoUrl ? (
              <img
                src={selectedParty.photoUrl}
                alt={selectedParty.name}
                className="vy-customer-ledger-photo"
              />
            ) : (
              <div className={cn(
                'vy-customer-ledger-photo vy-customer-ledger-photo-placeholder flex items-center justify-center bg-gradient-to-br text-4xl font-bold text-white',
                colorGrad
              )}>
                {initials}
              </div>
            )}
          </div>

          <div className="vy-customer-ledger-identity">
            <h2 className="text-xl font-bold tracking-tight">{selectedParty.name}</h2>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                isCustomer ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
              )}>
                {isCustomer ? <User className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                {selectedParty.type}
              </span>
              <span className={cn('text-sm font-bold', balanceColor)}>
                {balanceLabel}: {formatCurrency(Math.abs(balance))}
              </span>
            </div>
          </div>

          {/* अपडेटेड डार्क व्हॉट्सॲप ग्रीन बटण + मध्यम साईझ */}
          <div className="vy-customer-ledger-actions flex flex-wrap items-center gap-2">
  {/* Call Button */}
  <Button
    variant="outline"
    size="sm"
    type="button"
    onClick={() => handleCall(selectedParty.phone)}
    className="h-10 w-10 shrink-0 p-0"
    aria-label={t.callNow}
    title={t.callNow}
  >
    <Phone className="h-4 w-4" />
  </Button>

  {/* WhatsApp Button (फक्त आयकॉन आणि डार्क व्हॉट्सॲप ग्रीन रंग) */}
  <Button
    variant="ghost"
    size="sm"
    type="button"
    onClick={() => void handleShareLedgerWhatsApp(selectedParty)}
    style={{ backgroundColor: '#075e54', color: '#ffffff' }}
    className="h-10 w-12 shrink-0 items-center justify-center p-0 !bg-[#075e54] !text-white hover:!bg-[#054c44] active:scale-[0.98] border-none shadow-md rounded-lg"
    aria-label="Share Ledger"
    title="Share Ledger"
  >
    <MessageCircle className="h-5 w-5 fill-white text-white" />
  </Button>

  {/* Edit Button */}
  <Button
    variant="outline"
    size="sm"
    type="button"
    onClick={() => handleEditParty(selectedParty)}
    className="h-10 w-10 shrink-0 p-0"
    aria-label={t.editParty}
    title={t.editParty}
  >
    <Edit2 className="h-4 w-4" />
  </Button>

  {/* Delete Button */}
  <Button
    variant="outline"
    size="sm"
    type="button"
    onClick={() => handleDeleteParty(selectedParty.id)}
    className="h-10 w-10 shrink-0 p-0 text-destructive hover:text-destructive"
    aria-label={t.deleteParty}
    title={t.deleteParty}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card p-3">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.phone}</p>
              <p className="truncate text-sm font-medium">{selectedParty.phone}</p>
            </div>
          </div>
          {selectedParty.email && (
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card p-3">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.email}</p>
                <p className="truncate text-sm font-medium">{selectedParty.email}</p>
              </div>
            </div>
          )}
          {selectedParty.upiId && (
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card p-3">
              <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.upiId}</p>
                <p className="truncate text-sm font-medium">{selectedParty.upiId}</p>
              </div>
            </div>
          )}
          {selectedParty.address && (
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card p-3 sm:col-span-3">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.address}</p>
                <p className="truncate text-sm font-medium">{selectedParty.address}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/40 bg-card p-4 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.balanceGiven}</p>
            <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(partyEntries.filter((e) => e.type === 'Given').reduce((s, e) => s + e.amount, 0))}
            </p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card p-4 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.balanceReceived}</p>
            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(partyEntries.filter((e) => e.type === 'Received').reduce((s, e) => s + e.amount, 0))}
            </p>
          </div>
          <div className={cn('rounded-xl border border-border/40 bg-card p-4 text-center', balance === 0 && 'opacity-50')}>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.udhariBalance}</p>
            <p className={cn('mt-1 text-lg font-bold', balanceColor)}>
              {formatCurrency(Math.abs(balance))}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t.ledgerHistory}</h3>
            <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5" onClick={() => resetEntryForm()}>
                  <Plus className="h-3.5 w-3.5" />
                  {t.addEntry}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm mobile-entry-screen">
                <DialogHeader>
                  <DialogTitle>{editingEntry ? 'Edit Entry' : t.addEntry} — {selectedParty.name}</DialogTitle>
                  <DialogDescription>{editingEntry ? 'Update this customer ledger entry.' : 'Record a Udhari given or received entry.'}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t.entryType}</Label>
                    <Tabs value={eType} onValueChange={(v) => setEType(v as LedgerEntryType)}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="Given" className="gap-1">
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          {t.given}
                        </TabsTrigger>
                        <TabsTrigger value="Received" className="gap-1">
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                          {t.received}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t.entryAmount} (₹)</Label>
                      <Input type="number" placeholder="0" value={eAmount} onChange={(e) => setEAmount(e.target.value)} min="0" autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t.entryDate}</Label>
                      <Input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t.entryDescription}</Label>
                    <Input placeholder="e.g. Monthly grocery credit" value={eDescription} onChange={(e) => setEDescription(e.target.value)} />
                  </div>
                </div>
                <DialogFooter className="mobile-entry-footer">
                  <Button variant="outline" onClick={() => setAddEntryOpen(false)}>{t.cancel}</Button>
                  <Button onClick={handleSaveEntry}>{editingEntry ? 'Update' : t.save}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {partyEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BookOpen className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t.noEntries}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {partyEntries.map((entry) => {
              const isGiven = entry.type === 'Given';
              const Icon = isGiven ? ArrowUpCircle : ArrowDownCircle;
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl border border-border/40 p-3 transition-colors hover:bg-muted/30"
                >
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    isGiven ? 'bg-rose-500/10' : 'bg-emerald-500/10'
                  )}>
                    <Icon className={cn('h-4 w-4', isGiven ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400')} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn(
                      'text-sm font-bold',
                      isGiven ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    )}>
                      {isGiven ? '+' : '-'}{formatCurrency(entry.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{isGiven ? t.given : t.received}</p>
                    <div className="mt-1 flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit entry" title="Edit entry" onClick={() => openEditEntry(entry)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="Delete entry" title="Delete entry" onClick={() => handleDeleteEntry(entry)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>

        <AddPartyDialog
          open={addPartyOpen}
          onOpenChange={(open) => {
            if (!open) resetPartyForm();
            setAddPartyOpen(open);
          }}
          editParty={editParty}
          fields={{
            pName, setPName, pType, setPType, pPhone, setPPhone,
            pEmail, setPEmail, pAddress, setPAddress, pUpiId, setPUpiId, pGstin, setPGstin, pNotes, setPNotes, pPhotoUrl, setPPhotoUrl,
          }}
          onSave={handleSaveParty}
          t={t}
        />
      </div>
    );
  }

  return (
    <div className="vy-ref-ledger mx-auto max-w-4xl">
      <header className="sticky top-0 z-50 shrink-0 -mx-4 w-[calc(100%+2rem)] border-b bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:mx-0 lg:w-full">
        <div className="flex min-h-10 items-center gap-2">
          <button type="button" onClick={() => window.history.back()} className="rounded-full p-2 hover:bg-muted" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 text-base font-bold">{t.ledgerTitle}</h1>
          <Dialog open={addPartyOpen} onOpenChange={(open) => {
            if (!open) resetPartyForm();
            setAddPartyOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="hidden gap-1.5 lg:inline-flex">
                <Plus className="h-4 w-4" />
                {t.addParty}
              </Button>
            </DialogTrigger>
          <AddPartyDialogContent
            editParty={null}
            fields={{
              pName, setPName, pType, setPType, pPhone, setPPhone,
              pEmail, setPEmail, pAddress, setPAddress, pUpiId, setPUpiId, pGstin, setPGstin, pNotes, setPNotes, pPhotoUrl, setPPhotoUrl,
            }}
            onSave={handleSaveParty}
            onCancel={() => { resetPartyForm(); setAddPartyOpen(false); }}
            t={t}
          />
        </Dialog>
        </div>
      </header>

      <div className="vy-ref-ledger-balance">
        <div><span>▣</span><div><small>Total Balance</small><b>{formatCurrency(totals.receivable + totals.payable)}</b><em>↑ 12% <i>(vs last month)</i></em></div></div>
      </div>
      <div className="vy-ref-ledger-stat-grid mb-5">
        <div><span>♙</span><small>Total Parties</small><b>{parties.length}</b><em>↑ 8%</em></div>
        <div><span>↓</span><small>Total Payable</small><b>{formatCurrency(totals.payable)}</b><em className="down">↓ 5%</em></div>
        <div><span>↔</span><small>Total Receivable</small><b>{formatCurrency(totals.receivable)}</b><em>↑ 14%</em></div>
        <div><span>▣</span><small>Active Parties</small><b>{filteredParties.length}</b><em>↑ 6%</em></div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.searchParties}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'Customer' | 'Supplier')}>
          <TabsList>
            <TabsTrigger value="all">{t.allParties}</TabsTrigger>
            <TabsTrigger value="Customer">{t.customers}</TabsTrigger>
            <TabsTrigger value="Supplier">{t.suppliers}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredParties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">{t.noParties}</p>
          <p className="text-xs text-muted-foreground/70">{t.noPartiesDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredParties.map((party) => {
          const balance = getPartyBalance(party.id);
          const initials = getInitials(party.name);
          const colorGrad = getPartyColor(party);
          const isCustomer = party.type === 'Customer';
          return (
            <div
              key={party.id}
              onClick={() => setSelectedPartyId(party.id)}
              className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md active:scale-[0.99]"
            >
              {party.photoUrl ? (
                <img src={party.photoUrl} alt={party.name} className="h-12 w-12 rounded-xl object-cover shadow-sm" />
              ) : (
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm', colorGrad)}>
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{party.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={cn(
                    'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    isCustomer ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                  )}>
                    {isCustomer ? <User className="h-2.5 w-2.5" /> : <Truck className="h-2.5 w-2.5" />}
                    {party.type}
                  </span>
                  <span className="text-xs text-muted-foreground">{party.phone}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                {balance === 0 ? (
                  <span className="flex items-center justify-end gap-0.5 text-xs font-medium text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    {t.settled}
                  </span>
                ) : (
                  <p className={cn(
                    'text-sm font-bold',
                    balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {formatCurrency(Math.abs(balance))}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {balance > 0 ? t.balanceGiven : balance < 0 ? t.balanceReceived : ''}
                </p>
                <div className="mt-2 flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={t.editParty}
                    aria-label={t.editParty}
                    onClick={(e) => { e.stopPropagation(); handleEditParty(party); }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title={t.deleteParty}
                    aria-label={t.deleteParty}
                    onClick={(e) => { e.stopPropagation(); handleDeleteParty(party.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      <AddPartyDialog
        open={addPartyOpen}
        onOpenChange={(open) => {
          if (!open) resetPartyForm();
          setAddPartyOpen(open);
        }}
        editParty={editParty}
        fields={{
          pName, setPName, pType, setPType, pPhone, setPPhone,
          pEmail, setPEmail, pAddress, setPAddress, pUpiId, setPUpiId, pGstin, setPGstin, pNotes, setPNotes, pPhotoUrl, setPPhotoUrl,
        }}
        onSave={handleSaveParty}
        t={t}
      />
      <MobileFab label={t.addNewParty} onClick={() => { resetPartyForm(); setFullAddPartyOpen(true); }} />
    </div>
  );
}