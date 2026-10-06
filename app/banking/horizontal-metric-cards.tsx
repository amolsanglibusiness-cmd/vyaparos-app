'use client';

import {
  Store,
  Wallet,
  Landmark,
  TrendingDown,
  PiggyBank,
  Banknote,
} from 'lucide-react';

import { useAppData } from './app-data-context';
import { useSettings } from './settings-context';

const formatCompact = (amount: number) => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

interface MetricCardsProps {
  filteredExpenses: number;
  balancesVisible: boolean;
}

export function HorizontalMetricCards({ filteredExpenses, balancesVisible }: MetricCardsProps) {
  const { bankAccounts, subSavings, gallaBalance, cashInHandBalance, getBankBalance } = useAppData();
  const { t } = useSettings();

  const bankBalance = bankAccounts.reduce((s, a) => s + getBankBalance(a.id), 0);
  const totalSavings = subSavings.reduce((s, a) => s + a.depositAmount, 0);
  const totalBalance = bankBalance + totalSavings + gallaBalance + cashInHandBalance;

  const cards = [
    {
      title: t.cashGalla,
      value: balancesVisible ? formatCompact(gallaBalance) : '••••',
      icon: Store,
      gradient: 'from-amber-400 to-orange-500',
    },
    {
      title: t.cashInHand,
      value: balancesVisible ? formatCompact(cashInHandBalance) : '••••',
      icon: Wallet,
      gradient: 'from-slate-600 to-slate-800',
    },
    {
      title: t.totalBalance,
      value: balancesVisible ? formatCompact(totalBalance) : '••••',
      icon: Banknote,
      gradient: 'from-sky-500 to-blue-600',
    },
    {
      title: t.totalExpenses,
      value: formatCompact(filteredExpenses),
      icon: TrendingDown,
      gradient: 'from-rose-500 to-red-600',
    },
    {
      title: t.totalSavings,
      value: balancesVisible ? formatCompact(totalSavings) : '••••',
      icon: PiggyBank,
      gradient: 'from-teal-500 to-emerald-600',
    },
    {
      title: t.bankBalance,
      value: balancesVisible ? formatCompact(bankBalance) : '••••',
      icon: Landmark,
      gradient: 'from-violet-500 to-purple-600',
    },
  ];

  return (
    <div className="animate-fade-in-up -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 sm:gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`relative flex h-28 w-44 shrink-0 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-md transition-transform duration-300 hover:scale-[1.03] sm:w-52 ${card.gradient}`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full bg-white/10 blur-xl" />
              <div className="relative z-10 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-white/80">
                  {card.title}
                </p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-lg font-bold tracking-tight sm:text-xl">
                  {card.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
