'use client';

import { useEffect, useState } from 'react';
import { useSettings } from './settings-context';
import { localizeBankingValue } from './i18n';
import { PiggyBank, Plus, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { BankAccount, SubSavingsAccount, SubSavingsType } from './types';
import { BUILTIN_SUB_SAVINGS_TYPES, loadCustomSubSavingsTypes, saveCustomSubSavingsTypes } from './sub-savings-types';
import { generateId } from './mock-data';

interface AddSubSavingsDialogProps {
  bankAccounts: BankAccount[];
  onAdd: (account: SubSavingsAccount) => void;
  trigger?: React.ReactNode;
}

export function AddSubSavingsDialog({ bankAccounts, onAdd, trigger }: AddSubSavingsDialogProps) {
  const { t, language } = useSettings();
  const [open, setOpen] = useState(false);
  const [schemeType, setSchemeType] = useState<SubSavingsType>('Daily Pigmy');
  const [schemeNumber, setSchemeNumber] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState<string>('none');
  const [initialAmount, setInitialAmount] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);
  const [newType, setNewType] = useState('');
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editingTypeValue, setEditingTypeValue] = useState('');

  useEffect(() => { setCustomTypes(loadCustomSubSavingsTypes()); }, [open]);
  const schemeTypes = [...BUILTIN_SUB_SAVINGS_TYPES, ...customTypes];

  const showMaturity = schemeType === 'RD' || schemeType === 'FD';

  const resetForm = () => {
    setSchemeType('Daily Pigmy');
    setSchemeNumber('');
    setLinkedAccountId('none');
    setInitialAmount('');
    setMaturityDate('');
    setInterestRate('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const account: SubSavingsAccount = {
      id: generateId('ss'),
      schemeType,
      schemeNumber: schemeNumber.trim(),
      linkedBankAccountId: linkedAccountId === 'none' ? null : linkedAccountId,
      depositAmount: parseFloat(initialAmount) || 0,
      maturityDate: showMaturity && maturityDate ? maturityDate : null,
      interestRate: parseFloat(interestRate) || 0,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    onAdd(account);
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t.bankAddSub}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md mobile-entry-screen bank-entry-dialog">
        <DialogHeader className="bank-entry-header">
          <DialogTitle className="flex items-center gap-3 text-[20px] font-semibold tracking-tight">
            <span className="bank-entry-icon"><PiggyBank className="h-5 w-5" /></span>
            <span>{t.bankAddSub} Account</span>
          </DialogTitle>
          <DialogDescription className="pl-11 text-[13px] leading-5">
            {t.addSubDesc}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 bank-entry-form">
          <div className="space-y-2">
            <Label htmlFor="scheme-type">{t.schemeTypeLabel}</Label>
            <Select value={schemeType} onValueChange={(v) => { if (v === '__add_more__') { setTypeManagerOpen(true); return; } setSchemeType(v as SubSavingsType); }}>
              <SelectTrigger id="scheme-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {schemeTypes.map((type) => (
                  <SelectItem key={type} value={type}>{localizeBankingValue(type, language)}</SelectItem>
                ))}
                <SelectItem value="__add_more__" className="font-semibold text-blue-600 focus:bg-blue-50 focus:text-blue-700">
                  <Plus className="mr-1.5 inline h-4 w-4" /> Add more
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheme-number">{t.schemeNumberLabel}</Label>
            <Input
              id="scheme-number"
              placeholder="e.g. RD-2025-0123"
              value={schemeNumber}
              onChange={(e) => setSchemeNumber(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linked-account">{t.linkedMainAccountLabel}</Label>
            <Select value={linkedAccountId} onValueChange={setLinkedAccountId}>
              <SelectTrigger id="linked-account">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.noLinkedAccountLabel}</SelectItem>
                {bankAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.bankName} — ••••{acc.accountNumber.slice(-4)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initial-amount">
                {schemeType === 'Daily Pigmy' ? t.dailyAmountLabel : t.initialDepositLabel}
              </Label>
              <Input
                id="initial-amount"
                type="number"
                placeholder="0"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest-rate">{t.interestRateLabel}</Label>
              <Input
                id="interest-rate"
                type="number"
                placeholder="0.0"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          {showMaturity && (
            <div className="space-y-2">
              <Label htmlFor="maturity-date">{t.maturityDateLabel}</Label>
              <Input
                id="maturity-date"
                type="date"
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
              />
            </div>
          )}
          <DialogFooter className="pt-2 mobile-entry-footer bank-entry-footer">
            <Button type="button" variant="outline" className="bank-entry-cancel" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" className="bank-entry-save">{t.addSchemeBtn}</Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={typeManagerOpen} onOpenChange={setTypeManagerOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-blue-200/60 p-0">
          <DialogHeader className="border-b border-sky-100 px-5 py-4">
            <DialogTitle className="text-[18px] font-semibold">Manage Scheme Types</DialogTitle>
            <DialogDescription>Add your own savings scheme type. You can edit or delete custom types anytime.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-4">
            <div className="flex gap-2">
              <Input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="e.g. Monthly Saving" />
              <Button type="button" onClick={() => { const v=newType.trim(); if(!v || schemeTypes.some(t=>t.toLowerCase()===v.toLowerCase())) return; const next=[...customTypes,v]; setCustomTypes(next); saveCustomSubSavingsTypes(next); setSchemeType(v); setNewType(''); setTypeManagerOpen(false); }} className="bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 text-white"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {customTypes.length === 0 ? <p className="rounded-xl border border-dashed border-sky-200 bg-sky-50/60 px-3 py-4 text-center text-xs text-muted-foreground">No custom scheme types yet.</p> : customTypes.map((type) => (
                <div key={type} className="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2">
                  {editingType === type ? <Input autoFocus value={editingTypeValue} onChange={(e)=>setEditingTypeValue(e.target.value)} className="h-9" /> : <span className="min-w-0 flex-1 text-sm font-medium">{type}</span>}
                  {editingType === type ? (
                    <Button type="button" size="sm" onClick={()=>{ const v=editingTypeValue.trim(); if(!v || customTypes.some(t=>t!==type && t.toLowerCase()===v.toLowerCase())) return; const next=customTypes.map(t=>t===type?v:t); setCustomTypes(next); saveCustomSubSavingsTypes(next); if(schemeType===type) setSchemeType(v); setEditingType(null); setEditingTypeValue(''); }}>Save</Button>
                  ) : (
                    <Button type="button" variant="ghost" size="icon" onClick={()=>{setEditingType(type);setEditingTypeValue(type)}}><Pencil className="h-4 w-4" /></Button>
                  )}
                  <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={()=>{ const next=customTypes.filter(t=>t!==type); setCustomTypes(next); saveCustomSubSavingsTypes(next); if(schemeType===type) setSchemeType('Daily Pigmy'); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="border-t border-sky-100 px-5 py-4"><Button type="button" variant="outline" onClick={()=>setTypeManagerOpen(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
