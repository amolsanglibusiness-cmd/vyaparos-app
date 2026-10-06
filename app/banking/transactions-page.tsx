'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  ArrowLeftRight,
  Receipt,
  Store,
  Home,
  Inbox,
  RotateCcw,
  Plus,
  Bell,
  Edit2,
  Trash2,
  Settings2,
  Search as SearchIcon,
  SlidersHorizontal,
} from 'lucide-react';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { useAppData } from './app-data-context';
import { useSettings } from './settings-context';
import { AddTransactionDialog } from './add-transaction-dialog';
import { MobileFab } from './mobile-fab';
import { TransactionHistoryTable } from './transaction-history-table';
import type { Transaction } from './types';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

type FilterTab = 'all' | 'Income' | 'Expense' | 'Savings' | 'Transfer';

export function TransactionsPage() {
  const { t } = useSettings();
  const router = useRouter();

  const {
    transactions,
    bankAccounts,
    invoices,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteLedgerParty,
    getAccountLabel,
    gallaBalance,
    ledgerParties,
    ledgerEntries,
  } = useAppData();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [mobileSection, setMobileSection] = useState<'transactions' | 'parties'>('transactions');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const stats = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const transfers = transactions
      .filter((t) => t.type === 'Transfer')
      .reduce((sum, t) => sum + t.amount, 0);
    const netProfit = income - expense;

    const personalExpense = transactions
      .filter((t) => t.type === 'Expense' && t.tag === 'Personal / House')
      .reduce((sum, t) => sum + t.amount, 0);
    const businessExpense = transactions
      .filter((t) => t.type === 'Expense' && t.tag === 'Shop / Business')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      transfers,
      netProfit,
      personalExpense,
      businessExpense,
    };
  }, [transactions]);

  const localDateKey = (value: string | Date) => {
    const raw = value instanceof Date ? value : String(value || '').trim();
    if (raw instanceof Date) {
      const y = raw.getFullYear();
      const m = String(raw.getMonth() + 1).padStart(2, '0');
      const d = String(raw.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw.slice(0, 10);
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const filteredTxns = useMemo(() => {
    const today = localDateKey(new Date());
    const q = search.trim().toLowerCase();

    return transactions
      .filter((txn) => txn.category !== 'Automatic Galla Income' && !txn.description.startsWith('[AUTO-GALLA-INCOME]'))
      .filter((txn) => {
        const tabOk = activeTab === 'all' || txn.type === activeTab;
        const textOk = !q || [
          txn.description,
          txn.category,
          txn.shopName || '',
          ...(txn.expenseItems || []).flatMap((item) => [item.name, item.category, item.unit, String(item.quantity), String(item.rate)]),
          txn.date,
          txn.createdAt || '',
          getAccountLabel(txn.sourceAccountId),
          txn.destAccountId ? getAccountLabel(txn.destAccountId) : '',
        ].join(' ').toLowerCase().includes(q);
        const txnDate = localDateKey(txn.createdAt || txn.date);
        const dateOk = dateFilter === 'all' || (dateFilter === 'today' && txnDate === today);
        const categoryOk = categoryFilter === 'all' || txn.category === categoryFilter;
        const accountOk =
          accountFilter === 'all' ||
          txn.sourceAccountId === accountFilter ||
          txn.destAccountId === accountFilter;
        return tabOk && textOk && dateOk && categoryOk && accountOk;
      })
      .sort((a, b) => {
        const at = new Date(a.createdAt || `${a.date}T00:00:00`).getTime();
        const bt = new Date(b.createdAt || `${b.date}T00:00:00`).getTime();
        return bt - at;
      });
  }, [transactions, activeTab, search, dateFilter, categoryFilter, accountFilter, getAccountLabel]);

  const filteredParties = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ledgerParties
      .filter((party) => {
        if (!q) return true;
        return [party.name, party.phone || '', party.type].join(' ').toLowerCase().includes(q);
      })
      .map((party) => {
        const entries = ledgerEntries.filter((entry) => entry.partyId === party.id);
        const given = entries.filter((entry) => entry.type === 'Given').reduce((sum, entry) => sum + entry.amount, 0);
        const received = entries.filter((entry) => entry.type === 'Received').reduce((sum, entry) => sum + entry.amount, 0);
        return { ...party, balance: given - received };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [ledgerParties, ledgerEntries, search]);


  const summaryCards = [
    {
      title: t.totalIncome,
      value: formatCurrency(stats.income),
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      subtitle: `${transactions.filter((t) => t.type === 'Income').length} ${t.entries}`,
    },
    {
      title: t.totalExpense,
      value: formatCurrency(stats.expense),
      icon: TrendingDown,
      gradient: 'bg-gradient-to-br from-rose-500 to-red-600',
      subtitle: `${transactions.filter((t) => t.type === 'Expense').length} ${t.entries}`,
    },
    {
      title: t.netPL,
      value: formatCurrency(stats.netProfit),
      icon: Receipt,
      gradient:
        stats.netProfit >= 0
          ? 'bg-gradient-to-br from-sky-500 to-blue-600'
          : 'bg-gradient-to-br from-orange-500 to-amber-600',
      subtitle: stats.netProfit >= 0 ? t.profit : t.loss,
    },
  ];

  const tagBreakdown = [
    {
      label: t.personalLabel,
      icon: Home,
      amount: stats.personalExpense,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
      barColor: 'bg-blue-500',
      pct: stats.expense > 0 ? (stats.personalExpense / stats.expense) * 100 : 0,
    },
    {
      label: t.businessLabel,
      icon: Store,
      amount: stats.businessExpense,
      color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30',
      barColor: 'bg-teal-500',
      pct: stats.expense > 0 ? (stats.businessExpense / stats.expense) * 100 : 0,
    },
  ];

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(transactions
        .filter((txn) => txn.category !== 'Automatic Galla Income' && !txn.description.startsWith('[AUTO-GALLA-INCOME]'))
        .map((txn) => txn.category)
        .filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const accountOptions = useMemo(() => {
    const ids = new Set<string>();
    transactions.forEach((txn) => {
      if (txn.sourceAccountId) ids.add(txn.sourceAccountId);
      if (txn.destAccountId) ids.add(txn.destAccountId);
    });

    return Array.from(ids).map((id) => ({
      id,
      label: getAccountLabel(id),
    }));
  }, [transactions, getAccountLabel]);

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setAccountFilter('all');
    setDateFilter('all');
  };

  const tabCounts = {
    all: transactions.length,
    Income: transactions.filter((t) => t.type === 'Income').length,
    Expense: transactions.filter((t) => t.type === 'Expense').length,
    Savings: transactions.filter((t) => t.type === 'Savings').length,
    Transfer: transactions.filter((t) => t.type === 'Transfer').length,
  };

  const openTransactionEdit = (txn: Transaction) => {
    if (txn.description.startsWith('POS Sale - ')) {
      const invoice = invoices.find((item) => item.transactionId === txn.id)
        ?? invoices.find((item) => txn.description === `POS Sale - ${item.invoiceNumber}`);
      if (invoice) { router.push(`/pos?edit=${encodeURIComponent(invoice.id)}`); return; }
    }
    if (txn.description.startsWith('Invoice ')) {
      const invoice = invoices.find((item) => item.transactionId === txn.id)
        ?? invoices.find((item) => txn.description.startsWith(`Invoice ${item.invoiceNumber}`));
      if (invoice) { router.push(`/invoice?edit=${encodeURIComponent(invoice.id)}`); return; }
    }
    // Income / Expense / Savings / Transfer continue to the normal transaction editor.
  };

  return (
    <div className="vy-page-transactions min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-6xl px-0 pb-24 sm:px-6 sm:pb-8 lg:px-8">
        {/* Mobile Transactions UI - intentionally separate from desktop UI */}
        <div className="lg:hidden">
          <header className="sticky top-0 z-50 border-b bg-background px-3 py-2.5 shadow-sm">
            <div className="flex min-h-10 items-center gap-2">
              <button type="button" onClick={() => window.history.back()} className="rounded-full p-2 hover:bg-muted" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="min-w-0 flex-1 text-base font-bold">Transaction</h1>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMobileSection('transactions')} className={cn('vy-transaction-section-toggle h-10 rounded-full border text-[13px] font-medium transition', mobileSection === 'transactions' ? 'border-primary/50 bg-primary/10 text-primary shadow-sm' : 'border-border bg-background text-muted-foreground')}>Transaction Details</button>
              <button type="button" onClick={() => setMobileSection('parties')} className={cn('vy-transaction-section-toggle h-10 rounded-full border text-[13px] font-medium transition', mobileSection === 'parties' ? 'border-primary/50 bg-primary/10 text-primary shadow-sm' : 'border-border bg-background text-muted-foreground')}>Party Details</button>
            </div>
          </header>

          <div className="bg-sky-50/70 px-3 pb-4 pt-3 dark:bg-slate-900">
            <div className="flex h-11 items-center rounded-xl border border-sky-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
              <SearchIcon className="ml-3 h-5 w-5 shrink-0 text-primary" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={mobileSection === 'transactions' ? 'Search for a transaction' : 'Search for a party'} className="h-10 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0" />
              <button type="button" onClick={() => setMobileFilterOpen((v) => !v)} className={cn('mr-1 flex h-9 w-10 items-center justify-center border-l border-border', mobileFilterOpen || dateFilter !== 'all' || categoryFilter !== 'all' || accountFilter !== 'all' ? 'text-primary' : 'text-muted-foreground')} aria-label="Filters"><SlidersHorizontal className="h-5 w-5" /></button>
            </div>
          </div>

          {mobileFilterOpen && mobileSection === 'transactions' && (
            <div className="border-b border-sky-100 bg-white px-3 pb-3 dark:border-slate-700 dark:bg-slate-950">
              <div className="rounded-xl border bg-background p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold">Filter Transactions</p><button type="button" onClick={clearFilters} className="text-[11px] text-primary">Clear</button></div>
                <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                  {(['all','Income','Expense','Savings','Transfer'] as FilterTab[]).map((tab) => (
                    <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[11px]', activeTab === tab ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground')}>{tab === 'all' ? 'All' : tab}</button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={dateFilter} onValueChange={setDateFilter}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Date" /></SelectTrigger><SelectContent><SelectItem value="all">All dates</SelectItem><SelectItem value="today">Today</SelectItem></SelectContent></Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                  <Select value={accountFilter} onValueChange={setAccountFilter}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Account" /></SelectTrigger><SelectContent><SelectItem value="all">All accounts</SelectItem>{accountOptions.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
            </div>
          )}

          {mobileSection === 'transactions' ? (
            <div className="space-y-2 bg-sky-50/70 px-3 pb-4 dark:bg-slate-900">
              {filteredTxns.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-background px-5 py-12 text-center"><Inbox className="mx-auto mb-2 h-9 w-9 text-muted-foreground/40" /><p className="text-sm font-medium text-muted-foreground">{t.noFilteredTransactions}</p></div>
              ) : (
                <TransactionHistoryTable transactions={filteredTxns} bankAccounts={bankAccounts} getAccountLabel={getAccountLabel} onEdit={updateTransaction} onDelete={deleteTransaction} onBillEdit={openTransactionEdit} mobileCardMode />
              )}
            </div>
          ) : (
            <div className="space-y-2 bg-sky-50/70 px-3 pb-4 dark:bg-slate-900">
              {filteredParties.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-background px-5 py-12 text-center"><Inbox className="mx-auto mb-2 h-9 w-9 text-muted-foreground/40" /><p className="text-sm font-medium text-muted-foreground">No parties found.</p></div>
              ) : filteredParties.map((party) => {
                const partyUsed = ledgerEntries.some((entry) => entry.partyId === party.id) || invoices.some((invoice) => invoice.customerId === party.id);
                return (
                  <div key={party.id} className="rounded-xl border border-border/70 bg-background px-3 py-2.5 shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[14px] font-semibold">{party.name}</p>
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-emerald-700">{party.type}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{party.phone || 'No phone'}{party.gstin ? ` • GST ${party.gstin}` : ''}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn('text-[13px] font-semibold', party.balance >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{formatCurrency(Math.abs(party.balance))}</p>
                        <p className="text-[9px] text-muted-foreground">{party.balance >= 0 ? 'Receivable' : 'Payable'}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted" aria-label="Edit party" onClick={() => router.push(`/ledger?edit=${encodeURIComponent(party.id)}`)}><Edit2 className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={partyUsed} title={partyUsed ? 'Party is used and cannot be deleted' : 'Delete party'} className={cn('flex h-8 w-8 items-center justify-center rounded-full', partyUsed ? 'cursor-not-allowed text-muted-foreground/30' : 'text-destructive hover:bg-destructive/10')} aria-label="Delete party" onClick={() => { if (partyUsed) return; if (window.confirm(`Delete ${party.name}?`)) deleteLedgerParty(party.id); }}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden lg:block">
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 shrink-0 -mx-4 w-[calc(100%+2rem)] border-b bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:mx-0 lg:w-full">
          <div className="flex min-h-10 items-center gap-2">
            <button type="button" onClick={() => window.history.back()} className="rounded-full p-2 hover:bg-muted" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="min-w-0 flex-1 text-base font-bold">Transactions</h1>
            <AddTransactionDialog bankAccounts={bankAccounts} onAdd={addTransaction} trigger={<Button className="hidden lg:inline-flex"><Plus className="mr-2 h-4 w-4" />Add</Button>} />
          </div>
        </header>

        {/* Summary Cards */}
        <div className="vy-compact-summary-cards mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className={`relative overflow-hidden border-0 text-white shadow-none transition-transform duration-300 hover:scale-[1.01] ${card.gradient}`}
              >
                <CardContent className="relative z-10 flex items-center justify-between p-3 sm:p-3.5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-white/80">
                      {card.title}
                    </p>
                    <p className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">
                      {card.value}
                    </p>
                    <p className="mt-0.5 text-xs text-white/70">{card.subtitle}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Galla + Tag Breakdown Section */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Galla Card */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t.gallaCashBox}</h3>
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/40" >{t.cash}</Badge>
              </div>
              <p className="text-2xl font-bold tracking-tight">{formatCurrency(gallaBalance)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.currentCashOnHand}
              </p>
            </CardContent>
          </Card>

          {/* Expense Tag Breakdown */}
          <Card className="border-border/60 shadow-sm lg:col-span-2">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold" >{t.expenseBreakdownTitle}</h3>
                <span className="text-xs text-muted-foreground" >{t.personalVsBusiness}</span>
              </div>
              <div className="space-y-4">
                {tagBreakdown.map((tag) => {
                  const Icon = tag.icon;
                  return (
                    <div key={tag.label}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${tag.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-medium">{tag.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold">{formatCurrency(tag.amount)}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{tag.pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${tag.barColor}`}
                          style={{ width: `${tag.pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs + Transaction Table */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
          <div className="mb-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_minmax(150px,0.8fr)_minmax(170px,0.9fr)_auto]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions, category, account..."
                className="h-10 min-w-0"
              />

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 min-w-0 w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="h-10 min-w-0 w-full">
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accountOptions.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex min-w-0 gap-2">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-10 min-w-0 flex-1">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={clearFilters}
                  title="Clear filters"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mb-4 w-full overflow-x-auto pb-1 scrollbar-hide">
            <TabsList className="flex h-10 w-max min-w-full justify-start sm:w-auto sm:min-w-0">
              <TabsTrigger value="all" className="flex-1 sm:flex-none">
                {t.allLabel}
                <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 text-[10px] font-medium">
                  {tabCounts.all}
                </span>
              </TabsTrigger>
              <TabsTrigger value="Income" className="flex-1 sm:flex-none">
                {t.income}
                <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 text-[10px] font-medium">
                  {tabCounts.Income}
                </span>
              </TabsTrigger>
              <TabsTrigger value="Expense" className="flex-1 sm:flex-none">
                {t.expense}
                <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 text-[10px] font-medium">
                  {tabCounts.Expense}
                </span>
              </TabsTrigger>
              <TabsTrigger value="Savings" className="flex-1 sm:flex-none">
                Savings
                <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 text-[10px] font-medium">{tabCounts.Savings}</span>
              </TabsTrigger>
              <TabsTrigger value="Transfer" className="flex-1 sm:flex-none">
                {t.transfer}
                <span className="ml-1.5 rounded-full bg-muted-foreground/15 px-1.5 text-[10px] font-medium">
                  {tabCounts.Transfer}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {(['all', 'Income', 'Expense', 'Savings', 'Transfer'] as FilterTab[]).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              {tab === activeTab && (
                <>
                  {filteredTxns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
                      <Inbox className="mb-3 h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-muted-foreground">{t.noFilteredTransactions}</p>
                      <p className="text-xs text-muted-foreground/70">
                        {t.useAddTransaction}
                      </p>
                    </div>
                  ) : (
                    <TransactionHistoryTable
                      transactions={filteredTxns}
                      bankAccounts={bankAccounts}
                      getAccountLabel={getAccountLabel}
                      onEdit={updateTransaction}
                      onDelete={deleteTransaction}
                      onBillEdit={openTransactionEdit}
                    />
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
        </div>
      </div>
    <AddTransactionDialog bankAccounts={bankAccounts} onAdd={addTransaction} trigger={<MobileFab label={t.addTransaction} />} />
    </div>
  );
}
