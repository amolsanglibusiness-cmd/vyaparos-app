'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeft,
  ArrowLeftRight,
  Banknote,
  CalendarDays,
  Edit3,
  LockKeyhole,
  Plus,
  ReceiptText,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAppData } from '@/app/banking/app-data-context';
import { AddTransactionDialog } from '@/app/banking/add-transaction-dialog';
import { useSettings } from '@/app/banking/settings-context';
import { CASH_IN_HAND_ID, GALLA_ID, generateId } from '@/app/banking/mock-data';
import type { Transaction } from '@/app/banking/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MobileFab } from '@/app/banking/mobile-fab';

type CashAccountId = typeof GALLA_ID | typeof CASH_IN_HAND_ID;
type CashOperation = 'Increase' | 'Decrease' | 'Transfer';

const isDirectCashEntry = (id: string) => id.startsWith('cash-');

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';

  // Accept both YYYY-MM-DD and full ISO date strings.
  const raw = String(value).trim();
  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00`)
    : new Date(raw);

  if (Number.isNaN(dateValue.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(dateValue);
};

function CashEntryDialog({
  open,
  onOpenChange,
  editTransaction,
  defaultAccount,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTransaction: Transaction | null;
  defaultAccount: CashAccountId;
  onSave: (txn: Transaction) => void;
}) {
  const { language, t } = useSettings();
  const [account, setAccount] = useState<CashAccountId>(defaultAccount);
  const [operation, setOperation] = useState<CashOperation>('Increase');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Re-initialize whenever the same window is opened for a new/edit entry.
  useEffect(() => {
    if (!open) return;
    if (editTransaction) {
      setAccount(
        editTransaction.sourceAccountId === CASH_IN_HAND_ID
          ? CASH_IN_HAND_ID
          : GALLA_ID,
      );
      setOperation(editTransaction.type === 'Transfer' ? 'Transfer' : editTransaction.type === 'Income' ? 'Increase' : 'Decrease');
      setAmount(String(editTransaction.amount));
      setDescription(editTransaction.description);
      setDate(editTransaction.date);
    } else {
      setAccount(defaultAccount);
      setOperation('Increase');
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, editTransaction, defaultAccount]);

  const mr = language === 'mr';

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(mr ? 'कृपया योग्य रक्कम भरा.' : 'Please enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      toast.error(mr ? 'कृपया कारण / नोंद भरा.' : 'Please enter a reason / note.');
      return;
    }

    const isTransfer = operation === 'Transfer';
    const destination = isTransfer
      ? account === GALLA_ID ? CASH_IN_HAND_ID : GALLA_ID
      : null;

    const txn: Transaction = {
      id: editTransaction?.id ?? `cash-${generateId('cash')}`,
      type: isTransfer ? 'Transfer' : operation === 'Increase' ? 'Income' : 'Expense',
      amount: parsed,
      category: isTransfer ? 'Cash Transfer' : 'Other',
      description: description.trim(),
      date,
      tag: isTransfer ? null : 'Shop / Business',
      sourceAccountId: account,
      destAccountId: destination,
      isFromGalla: account === GALLA_ID,
      createdAt: editTransaction?.createdAt ?? new Date().toISOString(),
    };

    onSave(txn);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl mobile-entry-screen">
        <DialogHeader>
          <DialogTitle>
            {editTransaction
              ? t.editCashEntry : t.addCashEntry}
          </DialogTitle>
          <DialogDescription>
            {t.cashEntryDesc}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAccount(GALLA_ID)}
              className={`rounded-xl border p-3 text-left transition ${
                account === GALLA_ID
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background hover:bg-accent'
              }`}
            >
              <Banknote className="mb-1 h-5 w-5 text-amber-500" />
              <p className="text-sm font-semibold">{t.dukanGalla}</p>
              <p className="text-xs text-muted-foreground">{t.cashBox}</p>
            </button>
            <button
              type="button"
              onClick={() => setAccount(CASH_IN_HAND_ID)}
              className={`rounded-xl border p-3 text-left transition ${
                account === CASH_IN_HAND_ID
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-background hover:bg-accent'
              }`}
            >
              <Wallet className="mb-1 h-5 w-5 text-slate-500" />
              <p className="text-sm font-semibold">{t.cashInHand}</p>
              <p className="text-xs text-muted-foreground">{t.physicalCash}</p>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setOperation('Increase')}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${
                operation === 'Increase'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                  : 'border-border'
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" />
              {t.increase}
            </button>
            <button
              type="button"
              onClick={() => setOperation('Decrease')}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${
                operation === 'Decrease'
                  ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                  : 'border-border'
              }`}
            >
              <ArrowUpCircle className="h-4 w-4" />
              {t.decrease}
            </button>
            <button
              type="button"
              onClick={() => setOperation('Transfer')}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${
                operation === 'Transfer'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                  : 'border-border'
              }`}
            >
              <ArrowUpCircle className="h-4 w-4 rotate-90" />
              {mr ? 'Transfer' : 'Transfer'}
            </button>
          </div>

          {operation === 'Transfer' && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
              {mr
                ? `${account === GALLA_ID ? 'गल्ला' : 'Cash in Hand'} मधून ${account === GALLA_ID ? 'Cash in Hand' : 'गल्ला'} मध्ये रक्कम Transfer होईल.`
                : `Transfer from ${account === GALLA_ID ? 'Galla' : 'Cash in Hand'} to ${account === GALLA_ID ? 'Cash in Hand' : 'Galla'}.`}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t.amount}</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ 0"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t.date}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.reasonNote}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.openingCashPlaceholder}
              required
            />
          </div>

          <DialogFooter className="mobile-entry-footer">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit">
              {editTransaction ? t.saveChangesBtn : t.saveEntry}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CashPage() {
  const { language, t } = useSettings();
  const {
    transactions,
    bankAccounts,
    gallaBalance,
    gallaOpeningBalance,
    setGallaOpeningBalance,
    cashInHandBalance,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useAppData();

  const mr = language === 'mr';
  const [selectedAccount, setSelectedAccount] = useState<CashAccountId>(GALLA_ID);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [openingInput, setOpeningInput] = useState(String(gallaOpeningBalance));
  const [openingEditing, setOpeningEditing] = useState(false);
  const [cashSearch, setCashSearch] = useState('');
  const [cashType, setCashType] = useState('all');

  useEffect(() => {
    if (!openingEditing) setOpeningInput(String(gallaOpeningBalance));
  }, [gallaOpeningBalance, openingEditing]);

  const cashTransactions = useMemo(
    () =>
      transactions
        .filter(
          (txn) =>
            txn.sourceAccountId === GALLA_ID ||
            txn.sourceAccountId === CASH_IN_HAND_ID ||
            txn.destAccountId === GALLA_ID ||
            txn.destAccountId === CASH_IN_HAND_ID,
        )
        .filter((txn) => {
          const q = cashSearch.trim().toLowerCase();
          return (!q || [txn.description, txn.category, txn.date].join(' ').toLowerCase().includes(q)) && (cashType === 'all' || txn.type === cashType);
        })
        .sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          return dateCompare || b.createdAt.localeCompare(a.createdAt);
        }),
    [transactions, cashSearch, cashType],
  );

  const openNew = (account: CashAccountId = selectedAccount) => {
    setEditing(null);
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  const openEdit = (txn: Transaction) => {
    if (!isDirectCashEntry(txn.id)) {
      toast.info(
        mr
          ? 'ही एंट्री दुसऱ्या पेजवरून तयार झाली आहे. ती त्याच Transactions/POS पेजवरून एडिट करा.'
          : 'This entry was created by another module. Edit it from its original Transactions/POS page.',
      );
      return;
    }
    setEditing(txn);
    setSelectedAccount(
      txn.sourceAccountId === CASH_IN_HAND_ID ? CASH_IN_HAND_ID : GALLA_ID,
    );
    setDialogOpen(true);
  };

  const handleDelete = (txn: Transaction) => {
    if (!isDirectCashEntry(txn.id)) {
      toast.info(
        mr
          ? 'ही एंट्री Cash पेजवरून delete करता येणार नाही. मूळ Transactions/POS पेजवरूनच delete करा.'
          : 'This entry cannot be deleted from Cash. Delete it from the original Transactions/POS page.',
      );
      return;
    }

    const ok = window.confirm(
      mr
        ? `₹${txn.amount.toLocaleString('en-IN')} ची एंट्री delete करायची आहे का?`
        : `Delete this ${formatMoney(txn.amount)} cash entry?`,
    );
    if (!ok) return;

    deleteTransaction(txn.id);
    toast.success(mr ? 'रोख एंट्री delete झाली.' : 'Cash entry deleted.');
  };

  const handleSave = (txn: Transaction) => {
    if (editing) {
      const ok = updateTransaction(txn);
      if (ok === false) {
        toast.error(mr ? 'रोख एंट्री जतन करता आली नाही.' : 'Cash entry could not be saved.');
        return;
      }
      toast.success(mr ? 'रोख एंट्री अपडेट झाली.' : 'Cash entry updated.');
    } else {
      const ok = addTransaction(txn);
      if (ok === false) {
        toast.error(mr ? 'रोख एंट्री जतन करता आली नाही.' : 'Cash entry could not be saved.');
        return;
      }
      toast.success(mr ? 'रोख एंट्री जतन झाली.' : 'Cash entry saved.');
    }
  };

  const accountName = (id: CashAccountId) =>
    id === GALLA_ID ? (mr ? 'दुकान गल्ला' : 'Dukan Galla') : 'Cash in Hand';

  return (
    <main className="vy-reference-page vy-page-cash min-h-dvh bg-gradient-to-b from-slate-50 to-slate-100/50 px-4 pb-24 dark:from-slate-950 dark:to-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="sticky top-0 z-50 shrink-0 -mx-4 w-[calc(100%+2rem)] border-b bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:mx-0 lg:w-full">
          <div className="flex min-h-10 items-center gap-2">
            <button type="button" onClick={() => window.history.back()} className="rounded-full p-2 hover:bg-muted" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="min-w-0 flex-1 text-base font-bold">{mr ? 'रोख' : 'Cash'}</h1>
            <div className="hidden flex-wrap gap-2 lg:flex">
            <Button onClick={() => openNew()}>
              <Plus className="mr-2 h-4 w-4" />
              {t.cashPageAddEntry}
            </Button>
            <AddTransactionDialog
              bankAccounts={bankAccounts}
              onAdd={addTransaction}
              trigger={
                <Button type="button" variant="outline">
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  {mr ? 'Bank ↔ Cash in Hand' : 'Bank ↔ Cash in Hand'}
                </Button>
              }
            />
          </div>
          </div>
        </header>

        <section className="rounded-2xl border border-amber-500/20 bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400">
                {mr ? 'गल्ला सुरुवातीची शिल्लक' : 'Galla Opening Balance'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {mr
                  ? 'ही रक्कम आजच्या व्यवसायाच्या Income/Turnover मध्ये मोजली जाणार नाही. ती फक्त गल्ल्याची सुरुवातीची रोख शिल्लक आहे.'
                  : 'This amount is not counted as today’s business income/turnover. It is only the opening cash balance.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {openingEditing ? (
                <>
                  <div className="relative w-40">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                    <Input
                      inputMode="decimal"
                      value={openingInput}
                      onChange={(e) => setOpeningInput(e.target.value)}
                      className="pl-7"
                      aria-label={mr ? 'गल्ला सुरुवातीची शिल्लक' : 'Galla opening balance'}
                    />
                  </div>
                  <Button type="button" size="sm" onClick={() => {
                    const value = Number(openingInput);
                    if (!Number.isFinite(value) || value < 0) {
                      toast.error(mr ? 'कृपया योग्य सुरुवातीची शिल्लक भरा.' : 'Enter a valid opening balance.');
                      return;
                    }
                    setGallaOpeningBalance(value);
                    setOpeningEditing(false);
                    toast.success(mr ? 'गल्ल्याची सुरुवातीची शिल्लक जतन झाली.' : 'Galla opening balance saved.');
                  }}>
                    {mr ? 'जतन' : 'Save'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    setOpeningInput(String(gallaOpeningBalance));
                    setOpeningEditing(false);
                  }}>
                    {mr ? 'रद्द' : 'Cancel'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-amber-500/10 px-4 py-2 text-right">
                    <p className="text-xs text-muted-foreground">{mr ? 'सुरुवातीला' : 'Opening'}</p>
                    <p className="text-lg font-bold">{formatMoney(gallaOpeningBalance)}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpeningEditing(true)}>
                    {mr ? 'बदला' : 'Edit'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setSelectedAccount(GALLA_ID)}
            className={`rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:shadow-md ${
              selectedAccount === GALLA_ID ? 'border-primary ring-1 ring-primary/20' : 'border-border'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t.dukanGalla}
                </p>
                <p className="mt-1 text-3xl font-bold">{formatMoney(gallaBalance)}</p>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600">
                <Banknote className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t.mainShopCashBox} · {mr ? 'सुरुवात' : 'Opening'} {formatMoney(gallaOpeningBalance)}
            </p>
          </button>

          <button
            onClick={() => setSelectedAccount(CASH_IN_HAND_ID)}
            className={`rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:shadow-md ${
              selectedAccount === CASH_IN_HAND_ID ? 'border-primary ring-1 ring-primary/20' : 'border-border'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t.cashInHand}</p>
                <p className="mt-1 text-3xl font-bold">{formatMoney(cashInHandBalance)}</p>
              </div>
              <div className="rounded-xl bg-slate-500/10 p-3 text-slate-600 dark:text-slate-300">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t.separatePhysicalCash}
            </p>
          </button>
        </div>

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">{t.cashTransactions}</h2>
              <p className="text-xs text-muted-foreground">
                {t.cashPageEntriesDesc}
              </p>
            </div>
            <div className="flex rounded-xl border border-border bg-background p-1">
              <button
                onClick={() => setSelectedAccount(GALLA_ID)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  selectedAccount === GALLA_ID ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                {mr ? 'गल्ला' : 'Galla'}
              </button>
              <button
                onClick={() => setSelectedAccount(CASH_IN_HAND_ID)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  selectedAccount === CASH_IN_HAND_ID ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                Cash in Hand
              </button>
            </div>
          </div>

          <div className="divide-y divide-border">
            {cashTransactions.filter(
              (txn) =>
                txn.sourceAccountId === selectedAccount ||
                txn.destAccountId === selectedAccount,
            ).length === 0 ? (
              <div className="px-5 py-14 text-center">
                <ReceiptText className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 font-medium">{t.noCashEntries}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mr ? 'खालील Add Cash Entry बटणाने पहिली entry जोडा.' : 'Add your first entry using Add Cash Entry.'}
                </p>
                <Button className="mt-4" onClick={() => openNew(selectedAccount)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {mr ? 'एंट्री जोडा' : 'Add Entry'}
                </Button>
              </div>
            ) : (
              cashTransactions
                .filter(
                  (txn) =>
                    txn.sourceAccountId === selectedAccount ||
                    txn.destAccountId === selectedAccount,
                )
                .map((txn) => {
                  const direct = isDirectCashEntry(txn.id);
                  const increase =
                    txn.type === 'Income'
                      ? txn.sourceAccountId === selectedAccount
                      : txn.destAccountId === selectedAccount;

                  return (
                    <div key={txn.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            increase
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}
                        >
                          {increase ? (
                            <ArrowDownCircle className="h-5 w-5" />
                          ) : (
                            <ArrowUpCircle className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{txn.description || (mr ? 'रोख व्यवहार' : 'Cash transaction')}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(txn.date)}
                            </span>
                            <span>•</span>
                            <span>{accountName(selectedAccount)}</span>
                            {!direct && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-amber-600">
                                  <LockKeyhole className="h-3 w-3" />
                                  {t.manageFromSource}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <p className={`text-base font-bold ${increase ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {increase ? '+' : '-'}{formatMoney(txn.amount)}
                        </p>

                        <div className="flex items-center gap-1">
                          {direct ? (
                            <>
                              <button
                                onClick={() => openEdit(txn)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                                title={mr ? 'एडिट' : 'Edit'}
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(txn)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                                title={mr ? 'Delete' : 'Delete'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <Link
                              href="/transactions"
                              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-accent"
                            >
                              {t.openTransactions}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </section>
      </div>

      <CashEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTransaction={editing}
        defaultAccount={selectedAccount}
        onSave={handleSave}
      />
      <MobileFab label={t.addCashEntry} onClick={() => { setEditing(null); setDialogOpen(true); }} />
    </main>
  );
}
