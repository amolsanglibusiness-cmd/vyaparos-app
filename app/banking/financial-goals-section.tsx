'use client';

import { Target, Plus, Calendar } from 'lucide-react';

import { useSettings } from './settings-context';
import type { FinancialGoal } from './types';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateId } from './mock-data';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function FinancialGoalsSection() {
  const { t } = useSettings();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleAdd = () => {
    if (!title.trim() || !target) return;
    const colors = ['from-sky-500 to-blue-600', 'from-teal-500 to-emerald-600', 'from-amber-500 to-orange-600', 'from-rose-500 to-red-600'];
    setGoals((prev) => [
      ...prev,
      {
        id: generateId('goal'),
        title: title.trim(),
        targetAmount: parseFloat(target) || 0,
        savedAmount: parseFloat(saved) || 0,
        deadline: deadline || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        color: colors[prev.length % colors.length],
      },
    ]);
    setTitle('');
    setTarget('');
    setSaved('');
    setDeadline('');
    setOpen(false);
  };

  return (
    <div className="animate-fade-in-up rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">{t.financialGoals}</h3>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              {t.addGoal}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t.addFinancialGoal}</DialogTitle>
              <DialogDescription>{t.targetAmount} / {t.savedAmount} {t.remaining}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t.goalTitle}</Label>
                <Input placeholder={t.goalTitle} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t.targetAmount} (₹)</Label>
                  <Input type="number" placeholder="0" value={target} onChange={(e) => setTarget(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t.savedSoFar}</Label>
                  <Input type="number" placeholder="0" value={saved} onChange={(e) => setSaved(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t.deadline}</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button>
              <Button onClick={handleAdd}>{t.addGoal}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {goals.map((goal) => {
          const pct = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0;
          const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
          return (
            <div key={goal.id}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{goal.title}</p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(goal.deadline)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {t.savedAmount}: <span className="font-semibold text-foreground">{formatCurrency(goal.savedAmount)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.remaining}: <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span>
                  </p>
                </div>
              </div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t.targetAmount}: {formatCurrency(goal.targetAmount)}</span>
                <span className="font-bold text-primary">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${goal.color} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
