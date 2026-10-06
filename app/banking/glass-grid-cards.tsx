'use client';

import { TrendingUp, TrendingDown, CalendarDays, Receipt } from 'lucide-react';

import { useAppData } from './app-data-context';
import { useSettings } from './settings-context';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatCompact = (amount: number) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

interface GlassGridProps {
  todaySale: number;
  todayExpenses: number;
  monthSale: number;
  netProfit: number;
}

export function GlassGridCards({ todaySale, todayExpenses, monthSale, netProfit }: GlassGridProps) {
  const { t } = useSettings();

  const cards = [
    {
      title: t.todaySale,
      value: todaySale,
      icon: TrendingUp,
      accent: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      delay: '0ms',
      sublabel: 'Revenue',
    },
    {
      title: t.todayExpenses,
      value: todayExpenses,
      icon: TrendingDown,
      accent: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10',
      delay: '80ms',
      sublabel: 'Spending',
    },
    {
      title: t.monthSale,
      value: monthSale,
      icon: CalendarDays,
      accent: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-500/10',
      delay: '160ms',
      sublabel: 'Monthly revenue',
    },
    {
      title: t.netProfitMonth,
      value: netProfit,
      icon: Receipt,
      accent: netProfit >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400',
      bg: netProfit >= 0 ? 'bg-teal-500/10' : 'bg-orange-500/10',
      delay: '240ms',
      sublabel: netProfit >= 0 ? 'Profit' : 'Loss',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="glass-card animate-fade-in-up group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg sm:p-5"
            style={{ animationDelay: card.delay }}
          >
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${card.bg} transition-transform duration-300 group-hover:scale-110`}>
              <Icon className={card.accent} style={{ width: '1.125rem', height: '1.125rem' }} />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
            <p className={`mt-1 text-lg font-bold tracking-tight sm:text-xl ${card.accent}`} title={formatCurrency(card.value)}>
              {formatCompact(card.value)}
            </p>
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{card.sublabel}</p>
          </div>
        );
      })}
    </div>
  );
}
