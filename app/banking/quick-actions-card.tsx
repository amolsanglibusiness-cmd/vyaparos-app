'use client';

import { Zap, ArrowUpCircle, ShoppingCart, ArrowLeftRight } from 'lucide-react';

import { useSettings } from './settings-context';
import { AddTransactionDialog } from './add-transaction-dialog';
import { useAppData } from './app-data-context';

export function QuickActionsCard() {
  const { t } = useSettings();
  const { bankAccounts, addTransaction } = useAppData();

  const actions = [
    {
      label: t.quickExpense,
      icon: ArrowUpCircle,
      gradient: 'from-rose-500 to-red-600',
      hoverGradient: 'hover:from-rose-600 hover:to-red-700',
    },
    {
      label: t.addSale,
      icon: ShoppingCart,
      gradient: 'from-emerald-500 to-teal-600',
      hoverGradient: 'hover:from-emerald-600 hover:to-teal-700',
    },
    {
      label: t.quickTransfer,
      icon: ArrowLeftRight,
      gradient: 'from-sky-500 to-blue-600',
      hoverGradient: 'hover:from-sky-600 hover:to-blue-700',
    },
  ];

  return (
    <div className="animate-fade-in-up rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Zap className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold">{t.quickActions}</h3>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <AddTransactionDialog
              key={action.label}
              bankAccounts={bankAccounts}
              onAdd={addTransaction}
              trigger={
                <button
                  className={`flex flex-col items-center gap-2 rounded-xl bg-gradient-to-br p-3 text-white shadow-sm transition-all duration-300 hover:scale-[1.05] hover:shadow-md active:scale-95 ${action.gradient} ${action.hoverGradient}`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-center text-[10px] font-semibold leading-tight sm:text-xs">
                    {action.label}
                  </span>
                </button>
              }
            />
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Tap any action to instantly record a transaction
      </p>
    </div>
  );
}
