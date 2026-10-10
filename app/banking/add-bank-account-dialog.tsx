'use client';

import { useState } from 'react';
import { useSettings } from './settings-context';
import { Building2, Plus } from 'lucide-react';
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
import type { BankAccount, BankAccountType } from './types';
import { generateId } from './mock-data';

interface AddBankAccountDialogProps {
    onAdd: (account: BankAccount) => boolean | string | void;
    trigger?: React.ReactNode;
}

export function AddBankAccountDialog({ onAdd, trigger }: AddBankAccountDialogProps) {
    const { t } = useSettings();
    const [open, setOpen] = useState(false);
    const [bankName, setBankName] = useState('');
    const [holderName, setHolderName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [upiId, setUpiId] = useState('');
    const [accountType, setAccountType] = useState<BankAccountType>('Savings');
    const [openingBalance, setOpeningBalance] = useState('');
    const [branch, setBranch] = useState('');
    const [nickname, setNickname] = useState('');
    const [openingDate, setOpeningDate] = useState('');
    const [status, setStatus] = useState('Active');
    const [showOnInvoice, setShowOnInvoice] = useState(true);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    const resetForm = () => {
        setBankName('');
        setHolderName('');
        setAccountNumber('');
        setIfscCode('');
        setUpiId('');
        setAccountType('Savings');
        setOpeningBalance('');
        setBranch('');
        setNickname('');
        setOpeningDate('');
        setStatus('Active');
        setShowOnInvoice(true);
        setNotes('');
        setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const balance = parseFloat(openingBalance) || 0;

        const finalUpiId = upiId.trim() !== '' ? upiId.trim() : '*****';

        if (!bankName.trim() || !holderName.trim() || !accountNumber.trim()) {
            setError('Bank Name, Account Holder आणि Account Number अनिवार्य आहेत.');
            return;
        }
        const account: BankAccount = {
            id: generateId('ba'),
            bankName: bankName.trim(),
            accountHolderName: holderName.trim(),
            accountNumber: accountNumber.trim(),
            ifscCode: ifscCode.trim().toUpperCase(),
            accountType,
            balance,
            upiId: finalUpiId,
            branch: branch.trim(),
            nickname: nickname.trim(),
            openingDate: openingDate || null,
            status,
            showOnInvoice,
            notes: notes.trim(),
            createdAt: new Date().toISOString(),
        };

        const result = onAdd(account);
        if (typeof result === 'string') {
            setError(result);
            return;
        }
        if (result === false) {
            setError('Bank account could not be saved.');
            return;
        }
        resetForm();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {t.addBankTitle}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md mobile-entry-screen bank-entry-dialog">
                <DialogHeader className="bank-entry-header">
                    <DialogTitle className="flex items-center gap-3 text-[20px] font-semibold tracking-tight">
                        <span className="bank-entry-icon"><Building2 className="h-5 w-5" /></span>
                        <span>{t.addBankTitle}</span>
                    </DialogTitle>
                    <DialogDescription className="pl-11 text-[13px] leading-5">
                        {t.addBankDesc}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 bank-entry-form">
                    <div className="space-y-2">
                        <Label htmlFor="bank-name">{t.bankNameLabel}</Label>
                        <Input
                            id="bank-name"
                            placeholder="e.g. State Bank of India"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="holder-name">{t.holderNameLabel}</Label>
                        <Input
                            id="holder-name"
                            placeholder="e.g. Rajesh Sharma"
                            value={holderName}
                            onChange={(e) => setHolderName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="account-number">{t.accountNumberLabel}</Label>
                            <Input
                                id="account-number"
                                placeholder="Enter account no."
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ifsc-code">{t.ifscLabel}</Label>
                            <Input
                                id="ifsc-code"
                                placeholder="e.g. SBIN0001234"
                                value={ifscCode}
                                onChange={(e) => setIfscCode(e.target.value)}
                                required
                                className="uppercase"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="upi-id">{`UPI ID (${t.optionalLabel})`}</Label>
                        <Input
                            id="upi-id"
                            placeholder="e.g. name@okaxis"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="branch">Branch</Label>
                            <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch name" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nickname">Nickname</Label>
                            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Optional" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="opening-date">Opening Date</Label>
                            <Input id="opening-date" type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                        <Label htmlFor="show-on-invoice">Show on Invoice</Label>
                        <input id="show-on-invoice" type="checkbox" checked={showOnInvoice} onChange={(e) => setShowOnInvoice(e.target.checked)} className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bank-notes">Notes</Label>
                        <Input id="bank-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
                    </div>

                    {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="account-type">{t.accountTypeLabel}</Label>
                            <Select value={accountType} onValueChange={(v) => setAccountType(v as BankAccountType)}>
                                <SelectTrigger id="account-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Savings">{t.savingsLabel}</SelectItem>
                                    <SelectItem value="Current">{t.currentLabel}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="opening-balance">{t.openingBalanceLabel}</Label>
                            <Input
                                id="opening-balance"
                                type="number"
                                placeholder="0"
                                value={openingBalance}
                                onChange={(e) => setOpeningBalance(e.target.value)}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-2 mobile-entry-footer bank-entry-footer">
                        <Button type="button" variant="outline" className="bank-entry-cancel" onClick={() => setOpen(false)}>
                            {t.cancel}
                        </Button>
                        <Button type="submit" className="bank-entry-save">{t.addAccountBtn}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}