'use client';

import {
  PiggyBank,
  TrendingUp,
  Lock,
  Coins,
  Pencil,
  Trash2,
  MoreVertical,
  Link2,
} from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useEffect, useState } from 'react';
import { useSettings } from './settings-context';
import { localizeBankingValue } from './i18n';
import { BUILTIN_SUB_SAVINGS_TYPES, loadCustomSubSavingsTypes } from './sub-savings-types';

interface SubSavingsTableProps {
  accounts: SubSavingsAccount[];
  bankAccounts: BankAccount[];
  onEdit: (account: SubSavingsAccount) => void;
  onDelete: (id: string) => void;
}

const schemeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Daily Pigmy': PiggyBank,
  RD: TrendingUp,
  FD: Lock,
  'Gold Savings': Coins,
};

export function SubSavingsTable({ accounts, bankAccounts, onEdit, onDelete }: SubSavingsTableProps) {
  const { t, language } = useSettings();
  const [editId, setEditId] = useState<string | null>(null);
  const [editScheme, setEditScheme] = useState<SubSavingsAccount | null>(null);

  const [editType, setEditType] = useState<SubSavingsType>('Daily Pigmy');
  const [editNumber, setEditNumber] = useState('');
  const [editLinked, setEditLinked] = useState('none');
  const [editAmount, setEditAmount] = useState('');
  const [editMaturity, setEditMaturity] = useState('');
  const [editInterest, setEditInterest] = useState('');
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  useEffect(() => { setCustomTypes(loadCustomSubSavingsTypes()); }, []);
  const schemeTypes = [...BUILTIN_SUB_SAVINGS_TYPES, ...customTypes];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getLinkedBankName = (id: string | null) => {
    if (!id) return 'Unlinked';
    const bank = bankAccounts.find((b) => b.id === id);
    return bank ? bank.bankName : localizeBankingValue(id ? 'Unknown' : 'Unlinked', language);
  };

  const openEdit = (account: SubSavingsAccount) => {
    setEditId(account.id);
    setEditScheme(account);
    setEditType(account.schemeType);
    setEditNumber(account.schemeNumber);
    setEditLinked(account.linkedBankAccountId ?? 'none');
    setEditAmount(String(account.depositAmount));
    setEditMaturity(account.maturityDate ?? '');
    setEditInterest(String(account.interestRate));
  };

  const handleSaveEdit = () => {
    if (!editScheme) return;
    onEdit({
      ...editScheme,
      schemeType: editType,
      schemeNumber: editNumber.trim(),
      linkedBankAccountId: editLinked === 'none' ? null : editLinked,
      depositAmount: parseFloat(editAmount) || 0,
      maturityDate: editType === 'RD' || editType === 'FD' ? (editMaturity || null) : editScheme.maturityDate,
      interestRate: parseFloat(editInterest) || 0,
    });
    setEditId(null);
    setEditScheme(null);
  };

  const statusVariant = (status: string) => {
    if (status === 'Active') return 'default';
    if (status === 'Matured') return 'secondary';
    return 'destructive';
  };

  return (
    <>
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <PiggyBank className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">{t.bankNoSubSavings}</p>
          <p className="text-xs text-muted-foreground/70">{t.bankAddSubDesc}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">{t.schemeLabel}</TableHead>
                <TableHead className="hidden sm:table-cell">{t.schemeNumberLabel}</TableHead>
                <TableHead className="hidden md:table-cell">{t.linkedBankLabel}</TableHead>
                <TableHead className="text-right">{t.depositLabel}</TableHead>
                <TableHead className="hidden sm:table-cell text-right">{t.interestLabel}</TableHead>
                <TableHead className="hidden lg:table-cell">{t.maturityDateLabel}</TableHead>
                <TableHead>{t.statusLabel}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => {
                const Icon = schemeIcons[account.schemeType] ?? PiggyBank;
                return (
                  <TableRow key={account.id} className="group">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{localizeBankingValue(account.schemeType, language)}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{account.schemeNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">
                      {account.schemeNumber}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Link2 className="h-3 w-3" />
                        {getLinkedBankName(account.linkedBankAccountId)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      {formatCurrency(account.depositAmount)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-sm">
                      {account.interestRate > 0 ? `${account.interestRate}%` : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDate(account.maturityDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(account.status)}>{localizeBankingValue(account.status, language)}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(account)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(account.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editId !== null} onOpenChange={(open) => { if (!open) { setEditId(null); setEditScheme(null); } }}>
        <DialogContent className="max-w-md mobile-entry-screen">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              {t.editBankTitle}
            </DialogTitle>
            <DialogDescription>{t.addSubDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.schemeTypeLabel}</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as SubSavingsType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {schemeTypes.map((type) => <SelectItem key={type} value={type}>{localizeBankingValue(type, language)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.schemeNumberLabel}</Label>
              <Input value={editNumber} onChange={(e) => setEditNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.linkedMainAccountLabel}</Label>
              <Select value={editLinked} onValueChange={setEditLinked}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>{t.initialDepositLabel}</Label>
                <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.interestRateLabel}</Label>
                <Input type="number" value={editInterest} onChange={(e) => setEditInterest(e.target.value)} />
              </div>
            </div>
            {(editType === 'RD' || editType === 'FD') && (
              <div className="space-y-2">
                <Label>{t.maturityDateLabel}</Label>
                <Input type="date" value={editMaturity} onChange={(e) => setEditMaturity(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter className="pt-2 mobile-entry-footer">
            <Button variant="outline" onClick={() => { setEditId(null); setEditScheme(null); }}>{t.cancel}</Button>
            <Button onClick={handleSaveEdit}>{t.saveChangesBtn}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
