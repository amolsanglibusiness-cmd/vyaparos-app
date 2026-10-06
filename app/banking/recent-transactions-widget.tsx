'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  PiggyBank,
  ChevronRight,
  Inbox,
} from 'lucide-react';

import { useAppData } from './app-data-context';
import { useSettings } from './settings-context';
import { useDateFilter } from './use-date-filter';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function RecentTransactionsWidget() {
  const { transactions, getAccountLabel } = useAppData();
  const { t } = useSettings();
  const { isDateInRange } = useDateFilter();

  const recent = useMemo(() => {
    return transactions
      .filter((transaction) => isDateInRange(transaction.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [transactions, isDateInRange]);

  const typeConfig = {
    Income: { icon: ArrowDownCircle, color: 'text-success', bg: 'bg-success/10' },
    Expense: { icon: ArrowUpCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
    Savings: { icon: PiggyBank, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    Transfer: { icon: ArrowLeftRight, color: 'text-primary', bg: 'bg-primary/10' },
  };

  return (
    <div className="animate-fade-in-up rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t.recentTransactions}</h3>
        <Link
          href="/transactions"
          className="flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          {t.viewAll}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Inbox className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">{t.noTransactions}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {recent.map((txn) => {
            const config = typeConfig[txn.type];
            const Icon = config.icon;
            return (
              <div
                key={txn.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{txn.description}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {txn.category} · {getAccountLabel(txn.sourceAccountId)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`text-sm font-semibold ${
                      txn.type === 'Income'
                        ? 'text-success'
                        : txn.type === 'Expense'
                          ? 'text-destructive'
                          : 'text-foreground'
                    }`}
                  >
                    {txn.type === 'Income' ? '+' : txn.type === 'Expense' ? '-' : ''}
                    {formatCurrency(txn.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(txn.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
