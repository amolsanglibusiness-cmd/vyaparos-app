'use client';

import { useMemo, useState } from 'react';
import {
    Wallet,
    Landmark,
    PiggyBank,
    Building2,
    Plus,
    ArrowLeft,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData } from './app-data-context';
import { useSettings } from './settings-context';
import { AddBankAccountDialog } from './add-bank-account-dialog';
import { BankAccountCard } from './bank-account-card';
import { AddSubSavingsDialog } from './add-sub-savings-dialog';
import { SubSavingsTable } from './sub-savings-table';
import { TransactionHistoryTable } from './transaction-history-table';
import { MobileFab } from './mobile-fab';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);

export function BankingPage() {
    const {
        bankAccounts,
        transactions,
        subSavings,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        getBankBalance,
        addSubSavings,
        updateSubSavings,
        deleteSubSavings,
        getAccountLabel,
        updateTransaction,
        deleteTransaction,
    } = useAppData();

    const { t } = useSettings();
    const [selectedBankId, setSelectedBankId] = useState('');
    const [historySearch, setHistorySearch] = useState('');
    const [historyType, setHistoryType] = useState('all');
    const [mobileBankSearch, setMobileBankSearch] = useState('');
    const [mobileBankFilter, setMobileBankFilter] = useState<'all' | 'Savings' | 'Current'>('all');
    const [mobileBankFilterOpen, setMobileBankFilterOpen] = useState(false);

    const totals = useMemo(() => {
        const totalMain = bankAccounts.reduce((sum, acc) => sum + getBankBalance(acc.id), 0);
        const totalSavings = subSavings.reduce((sum, acc) => sum + acc.depositAmount, 0);
        return {
            totalMain,
            totalSavings,
            total: totalMain + totalSavings,
        };
    }, [bankAccounts, subSavings, getBankBalance]);

    const summaryCards = [
        {
            title: t.totalBalance,
            value: formatCurrency(totals.total),
            icon: Wallet,
            gradient: 'bg-gradient-to-br from-sky-500 to-blue-600',
        },
        {
            title: t.bankMainAccounts,
            value: formatCurrency(totals.totalMain),
            icon: Landmark,
            gradient: 'bg-gradient-to-br from-teal-500 to-emerald-600',
        },
        {
            title: t.bankSavingsInvestments,
            value: formatCurrency(totals.totalSavings),
            icon: PiggyBank,
            gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
        },
    ];

    return (
        <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900">
            <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8">
                <div className="lg:hidden">
                    <header className="sticky top-0 z-50 -mx-4 border-b bg-background/95 px-3 py-2.5 shadow-sm backdrop-blur">
                        <div className="flex h-10 items-center gap-2"><button type="button" onClick={() => window.history.back()} className="rounded-full p-2 hover:bg-muted" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button><h1 className="flex-1 text-base font-bold">Bank</h1></div>
                    </header>
                    <div className="space-y-3 py-3">
                        <div className="flex h-11 items-center rounded-xl border bg-background shadow-sm">
                            <Search className="ml-3 h-5 w-5 text-primary" />
                            <Input value={mobileBankSearch} onChange={(e) => setMobileBankSearch(e.target.value)} placeholder="Search bank accounts" className="h-10 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0" />
                            <button type="button" onClick={() => setMobileBankFilterOpen((v) => !v)} className={cn('mr-1 flex h-9 w-10 items-center justify-center border-l', mobileBankFilterOpen || mobileBankFilter !== 'all' ? 'text-primary' : 'text-muted-foreground')} aria-label="Filters"><SlidersHorizontal className="h-5 w-5" /></button>
                        </div>
                        <div className="vy-total-bank-balance-card rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-blue-50 to-violet-50 px-4 py-4 dark:border-sky-400/30 dark:from-sky-950/40 dark:via-blue-950/30 dark:to-violet-950/30">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-violet-600 text-white">
                                    <Landmark className="h-6 w-6" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-blue-700 dark:text-sky-300">Total Bank Balance</p>
                                    <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{formatCurrency(totals.totalMain)}</p>
                                </div>
                            </div>
                        </div>
                        {mobileBankFilterOpen && (
                            <div className="rounded-xl border bg-background p-3 shadow-sm">
                                <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold">Filter Bank Accounts</p><button type="button" onClick={() => setMobileBankFilter('all')} className="text-[11px] text-primary">Clear</button></div>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['all','Savings','Current'] as const).map((v) => <button key={v} type="button" onClick={() => setMobileBankFilter(v)} className={cn('h-9 rounded-lg border text-xs', mobileBankFilter === v ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground')}>{v === 'all' ? 'All' : v}</button>)}
                                </div>
                            </div>
                        )}
                        <Tabs defaultValue="main" className="w-full">
                            <TabsList className="grid h-10 w-full grid-cols-2"><TabsTrigger value="main" className="text-xs">{t.bankMainTab}</TabsTrigger><TabsTrigger value="savings" className="text-xs">{t.bankSubTab}</TabsTrigger></TabsList>
                            <TabsContent value="main" className="mt-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <div><h2 className="text-sm font-semibold">{t.bankAccountsLabel}</h2><p className="text-xs text-muted-foreground">{bankAccounts.length} {bankAccounts.length === 1 ? t.bankAccountConnected : t.bankAccountsConnected}</p></div>
                                    <div className="w-[170px]"><Select value={selectedBankId || bankAccounts[0]?.id || ''} onValueChange={setSelectedBankId}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Bank" /></SelectTrigger><SelectContent>{bankAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.bankName} ••••{a.accountNumber.slice(-4)}</SelectItem>)}</SelectContent></Select></div>
                                </div>
                                {(() => {
                                    const selected = bankAccounts.find((a) => a.id === (selectedBankId || bankAccounts[0]?.id));
                                    if (!selected) return <div className="rounded-xl border border-dashed py-10 text-center text-xs text-muted-foreground">Select a bank account.</div>;
                                    const q = mobileBankSearch.trim().toLowerCase();
                                    const matchesSearch = !q || [selected.bankName, selected.accountHolderName, selected.accountNumber, selected.ifscCode, selected.upiId].join(' ').toLowerCase().includes(q);
                                    const bankHistory = transactions.filter((txn) => txn.sourceAccountId === selected.id || txn.destAccountId === selected.id).filter((txn) => !q || [txn.description, txn.category, txn.date].join(' ').toLowerCase().includes(q));
                                    return <div className="space-y-2">
                                      {matchesSearch && <BankAccountCard account={selected} displayBalance={getBankBalance(selected.id)} onEdit={updateBankAccount} onDelete={deleteBankAccount} compact />}
                                      <div className="rounded-xl border bg-background p-2">
                                        <div className="mb-1.5 flex items-center justify-between px-1"><p className="text-xs font-semibold">Transactions</p><span className="text-[10px] text-muted-foreground">{bankHistory.length}</span></div>
                                        <TransactionHistoryTable transactions={bankHistory} bankAccounts={bankAccounts} getAccountLabel={getAccountLabel} onEdit={updateTransaction} onDelete={deleteTransaction} mobileCardMode />
                                      </div>
                                    </div>;
                                })()}
                            </TabsContent>
                            <TabsContent value="savings" className="mt-3">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-semibold">{t.bankSubAccountsLabel}</h2>
                                        <p className="text-xs text-muted-foreground">
                                            {subSavings.length}{' '}
                                            {subSavings.length === 1 ? t.bankSchemeTracked : t.bankSchemesTracked}
                                        </p>
                                    </div>
                                    <AddSubSavingsDialog
                                        bankAccounts={bankAccounts}
                                        onAdd={addSubSavings}
                                        trigger={
                                            <Button type="button" size="sm" className="shrink-0 bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 text-white hover:from-sky-600 hover:via-blue-700 hover:to-violet-700">
                                                <Plus className="mr-1.5 h-4 w-4" />
                                                {t.bankAddSub}
                                            </Button>
                                        }
                                    />
                                </div>
                                {subSavings.length === 0 ? (
                                    <div className="rounded-xl border border-dashed py-10 text-center text-xs text-muted-foreground">
                                        <PiggyBank className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                                        <p>{t.bankNoSubSavings}</p>
                                        <p className="mt-1 text-[11px] text-muted-foreground/70">{t.bankAddSubDesc}</p>
                                    </div>
                                ) : (
                                    <SubSavingsTable accounts={subSavings} bankAccounts={bankAccounts} onEdit={updateSubSavings} onDelete={deleteSubSavings} />
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <div className="hidden lg:block">
                {/* Sticky Header */}
                <header className="sticky top-0 z-50 shrink-0 -mx-4 w-[calc(100%+2rem)] border-b bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:mx-0 lg:w-full">
                    <div className="flex h-10 items-center gap-2">
                        <button type="button" onClick={() => window.history.back()} className="rounded-full p-2 hover:bg-muted" aria-label="Back">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <h1 className="min-w-0 flex-1 text-base font-bold">Bank</h1>
                    </div>
                </header>

                {/* Summary Cards */}
                <div className="vy-compact-summary-cards mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 lg:grid-cols-3">
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
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="main" className="w-full">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <TabsList className="w-full sm:w-auto">
                            <TabsTrigger value="main" className="flex-1 sm:flex-none">
                                <Landmark className="mr-2 h-4 w-4" />
                                {t.bankMainTab}
                            </TabsTrigger>
                            <TabsTrigger value="savings" className="flex-1 sm:flex-none">
                                <PiggyBank className="mr-2 h-4 w-4" />
                                {t.bankSubTab}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Main Bank Accounts Tab */}
                    <TabsContent value="main" className="mt-0">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">{t.bankAccountsLabel}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {bankAccounts.length}{' '}
                                    {bankAccounts.length === 1 ? t.bankAccountConnected : t.bankAccountsConnected}
                                </p>
                            </div>
                            <AddBankAccountDialog onAdd={addBankAccount} />
                        </div>

                        {bankAccounts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
                                <Building2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t.bankNoAccounts}
                                </p>
                                <p className="mb-4 text-xs text-muted-foreground/70">
                                    {t.bankAddFirst}
                                </p>
                                <AddBankAccountDialog
                                    onAdd={addBankAccount}
                                    trigger={
                                        <Button variant="outline">
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t.bankAddAccount}
                                        </Button>
                                    }
                                />
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Select Bank</label>
                                    <Select value={selectedBankId || bankAccounts[0]?.id || ''} onValueChange={setSelectedBankId}>
                                        <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                                        <SelectContent>{bankAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.bankName} ••••{a.accountNumber.slice(-4)}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                {(() => {
                                    const selected = bankAccounts.find((a) => a.id === (selectedBankId || bankAccounts[0]?.id));
                                    if (!selected) return null;
                                    const bankHistory = transactions.filter((txn) => txn.sourceAccountId === selected.id || txn.destAccountId === selected.id).filter((txn) => {
                                        const q = historySearch.trim().toLowerCase();
                                        return (!q || [txn.description, txn.category, txn.date].join(' ').toLowerCase().includes(q)) && (historyType === 'all' || txn.type === historyType);
                                    });
                                    return <div className="space-y-4">
                                        <BankAccountCard account={selected} displayBalance={getBankBalance(selected.id)} onEdit={updateBankAccount} onDelete={deleteBankAccount} />
                                        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                                            <div className="mb-3 flex flex-col gap-2 sm:flex-row"><Input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search bank history..." /><Select value={historyType} onValueChange={setHistoryType}><SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Income">Income</SelectItem><SelectItem value="Expense">Expense</SelectItem><SelectItem value="Savings">Savings</SelectItem><SelectItem value="Transfer">Transfer</SelectItem></SelectContent></Select></div>
                                            <TransactionHistoryTable transactions={bankHistory} bankAccounts={bankAccounts} getAccountLabel={getAccountLabel} onEdit={updateTransaction} onDelete={deleteTransaction} />
                                        </div>
                                    </div>;
                                })()}
                            </>
                        )}
                    </TabsContent>

                    {/* Sub-Savings Tab */}
                    <TabsContent value="savings" className="mt-0">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">{t.bankSubAccountsLabel}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {subSavings.length}{' '}
                                    {subSavings.length === 1 ? t.bankSchemeTracked : t.bankSchemesTracked}
                                </p>
                            </div>
                            <AddSubSavingsDialog bankAccounts={bankAccounts} onAdd={addSubSavings} />
                        </div>

                        {subSavings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
                                <PiggyBank className="mb-4 h-12 w-12 text-muted-foreground/40" />
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t.bankNoSubSavings}
                                </p>
                                <p className="mb-4 text-xs text-muted-foreground/70">
                                    {t.bankAddSubDesc}
                                </p>
                                <AddSubSavingsDialog
                                    bankAccounts={bankAccounts}
                                    onAdd={addSubSavings}
                                    trigger={
                                        <Button variant="outline">
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t.bankAddSub}
                                        </Button>
                                    }
                                />
                            </div>
                        ) : (
                            <SubSavingsTable
                                accounts={subSavings}
                                bankAccounts={bankAccounts}
                                onEdit={updateSubSavings}
                                onDelete={deleteSubSavings}
                            />
                        )}
                    </TabsContent>
                </Tabs>
                </div>
            </div>
            <AddBankAccountDialog onAdd={addBankAccount} trigger={<MobileFab label={t.addBankAccount} />} />
        </div>
    );
}