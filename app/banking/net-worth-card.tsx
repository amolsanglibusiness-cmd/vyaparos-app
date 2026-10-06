'use client';

import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Eye, EyeOff, LockKeyhole, TrendingUp, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAppData } from './app-data-context';
import { useDateFilter } from './use-date-filter';
import { useSettings } from './settings-context';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatCompact = (amount: number) => {
  const value = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (value >= 10000000) return `${sign}₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${sign}₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${sign}₹${Math.round(value / 1000)}K`;
  return `${sign}₹${Math.round(value)}`;
};

const dateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDate = (value: string) => {
  const raw = value?.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    const result = new Date(year, month - 1, day);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) return null;
  result.setHours(0, 0, 0, 0);
  return result;
};

const formatChartDate = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(
    new Date(year, month - 1, day)
  );
};

interface NetWorthCardProps {
  balancesVisible: boolean;
  onRequestUnlock: () => void;
  onHideBalances: () => void;
}

export function NetWorthCard({
  balancesVisible,
  onRequestUnlock,
  onHideBalances,
}: NetWorthCardProps) {
  const { bankAccounts, subSavings, gallaBalance, cashInHandBalance, transactions, getBankBalance } = useAppData();
  const { t, appLockEnabled } = useSettings();
  const { range } = useDateFilter();

  const bankBalance = useMemo(
    () => bankAccounts.reduce((sum, account) => sum + getBankBalance(account.id), 0),
    [bankAccounts, getBankBalance]
  );
  const savingsBalance = useMemo(
    () => subSavings.reduce((sum, account) => sum + account.depositAmount, 0),
    [subSavings]
  );
  const totalNetWorth = bankBalance + savingsBalance + gallaBalance + cashInHandBalance;

  const chartData = useMemo(() => {
    const start = new Date(range.start);
    const end = new Date(range.end);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const changes = new Map<string, number>();
    let totalHistoricalChange = 0;

    for (const transaction of transactions) {
      const transactionDate = parseDate(transaction.date);
      if (!transactionDate) continue;

      let delta = 0;
      if (transaction.type === 'Income') delta = Number(transaction.amount || 0);
      if (transaction.type === 'Expense') delta = -Number(transaction.amount || 0);

      if (delta === 0) continue;
      totalHistoricalChange += delta;

      if (transactionDate >= start && transactionDate <= end) {
        const key = dateKey(transactionDate);
        changes.set(key, (changes.get(key) ?? 0) + delta);
      }
    }

    const days = Math.max(
      1,
      Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1
    );
    const step = Math.max(1, Math.ceil(days / 31));
    const keys: string[] = [];

    for (let i = 0; i < days; i += step) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      keys.push(dateKey(d));
    }

    const finalKey = dateKey(end);
    if (keys[keys.length - 1] !== finalKey) keys.push(finalKey);

    // Reconstruct a readable net-worth trend for the selected period from the
    // current net worth and the transaction history. Transfers/Savings are
    // intentionally excluded because they move money between own accounts.
    let value = totalNetWorth - totalHistoricalChange;
    const points = keys.map((key) => {
      value += changes.get(key) ?? 0;
      return { date: key, label: formatChartDate(key), value };
    });

    // If there are no income/expense changes in the selected period, still show
    // a useful flat Net Worth line rather than an empty chart.
    if (!changes.size) {
      return keys.map((key) => ({
        date: key,
        label: formatChartDate(key),
        value: totalNetWorth,
      }));
    }

    return points;
  }, [range.start, range.end, transactions, totalNetWorth]);

  const domain = useMemo(() => {
    const values = chartData.map((item) => item.value);
    if (!values.length) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      const pad = Math.max(100, Math.abs(min) * 0.08);
      return [Math.max(0, min - pad), max + pad];
    }
    const pad = Math.max(100, (max - min) * 0.12);
    return [Math.max(0, min - pad), max + pad];
  }, [chartData]);

  return (
    <section className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-sky-500/5 blur-3xl" />

      <div className="relative z-10 p-4 sm:p-5 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{t.netWorth}</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={balancesVisible ? onHideBalances : onRequestUnlock}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={balancesVisible ? 'Hide Net Worth' : 'Show Net Worth'}
                >
                  {balancesVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Your total financial position</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_2fr] lg:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Net Worth
            </p>
            <p className="mt-1 break-words text-4xl font-black leading-none tracking-tight sm:text-5xl">
              {balancesVisible ? formatCurrency(totalNetWorth) : '₹ •••••••'}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              {balancesVisible ? 'Net Worth trend' : appLockEnabled ? 'Amount protected by your App Lock PIN' : 'Set an App Lock PIN in Settings'}
            </div>
          </div>

          <div className="h-[190px] w-full sm:h-[220px] lg:h-[235px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.7} strokeDasharray="3 4" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  minTickGap={14}
                />
                <YAxis
                  domain={domain}
                  tickFormatter={formatCompact}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--primary))', strokeOpacity: 0.25, strokeDasharray: '4 4' }}
                  formatter={(value: number) => [balancesVisible ? formatCurrency(value) : '••••••', 'Net Worth']}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '10px',
                    color: 'hsl(var(--foreground))',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, fill: 'hsl(var(--card))', stroke: 'hsl(var(--primary))', strokeWidth: 3 }}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {!balancesVisible && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-4 w-4 shrink-0 text-primary" />
            {appLockEnabled ? 'Net Worth is protected by your App Lock PIN.' : 'Set an App Lock PIN in Settings to protect Net Worth.'}
          </div>
        )}
      </div>
    </section>
  );
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}
