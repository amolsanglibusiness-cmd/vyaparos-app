'use client';

import { useMemo } from 'react';
import { AlertTriangle, Package, CheckCircle2 } from 'lucide-react';

import { useSettings } from './settings-context';
import { useInventory } from '@/src/context/InventoryContext';

export function LowStockAlertsWidget() {
  const { t } = useSettings();
  const { inventory } = useInventory();

  const lowStockItems = useMemo(
    () => inventory.filter((item) => item.stock <= item.minStock),
    [inventory]
  );

  const sorted = useMemo(
    () => [...lowStockItems].sort((a, b) => a.stock - b.stock),
    [lowStockItems]
  );

  const severity = (stock: number, min: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', bar: 'bg-rose-500' };
    if (stock <= min / 2) return { label: 'Critical', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10', bar: 'bg-orange-500' };
    return { label: 'Low', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', bar: 'bg-amber-500' };
  };

  return (
    <div className="animate-fade-in-up rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">{t.lowStockAlerts}</h3>
        </div>
        {sorted.length > 0 && (
          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            {sorted.length}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="mb-2 h-8 w-8 text-success/60" />
          <p className="text-xs text-muted-foreground">{t.noAlerts}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((item) => {
            const sev = severity(item.stock, item.minStock);
            const stockPct = item.minStock > 0 ? Math.min((item.stock / item.minStock) * 100, 100) : 0;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border/40 p-3 transition-colors hover:bg-muted/30"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${sev.bg}`}>
                  <Package className={`h-4 w-4 ${sev.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <span className={`shrink-0 text-xs font-bold ${sev.color}`}>{sev.label}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${sev.bar}`}
                        style={{ width: `${stockPct}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                      {item.stock}/{item.minStock} {item.unit}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
