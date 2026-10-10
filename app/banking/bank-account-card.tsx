'use client';

import { useEffect, useState } from 'react';
import {
    Copy,
    Check,
    QrCode,
    Pencil,
    Trash2,
    Wallet,
    MoreVertical,
    Share2,
    Landmark,
    AlertCircle,
} from 'lucide-react';

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { QRCodeDisplay } from './qr-code-display';
import { SharedBankAccountDialog } from './shared-bank-account-dialog';
import { useAppData } from './app-data-context';
import { cn } from '@/lib/utils';
import { useSettings } from './settings-context';
import { localizeBankingValue } from './i18n';

interface BankAccountCardProps {
    account: BankAccount;
    onEdit: (account: BankAccount) => boolean | string | void;
    onDelete: (id: string) => void;
    compact?: boolean;
    displayBalance?: number;
}

export function BankAccountCard({ account, onEdit, onDelete, compact = false, displayBalance }: BankAccountCardProps) {
    const { transactions = [], subSavings = [] } = useAppData();
    const { t, language } = useSettings();

    const [qrOpen, setQrOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [warningAlertOpen, setWarningAlertOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const [editBankName, setEditBankName] = useState(account.bankName);
    const [editHolderName, setEditHolderName] = useState(account.accountHolderName);
    const [editAccountNumber, setEditAccountNumber] = useState(account.accountNumber);
    const [editIfsc, setEditIfsc] = useState(account.ifscCode);
    const [editUpiId, setEditUpiId] = useState(account.upiId || '');
    const [editType, setEditType] = useState<BankAccountType>(account.accountType);
    const [editBalance, setEditBalance] = useState(String(account.balance));
    const [editBranch, setEditBranch] = useState(account.branch || '');
    const [editNickname, setEditNickname] = useState(account.nickname || '');
    const [editOpeningDate, setEditOpeningDate] = useState(account.openingDate || '');
    const [editStatus, setEditStatus] = useState(account.status || 'Active');
    const [editShowOnInvoice, setEditShowOnInvoice] = useState(account.showOnInvoice !== false);
    const [editNotes, setEditNotes] = useState(account.notes || '');
    const [editError, setEditError] = useState('');

    useEffect(() => {
        setEditBankName(account.bankName);
        setEditHolderName(account.accountHolderName);
        setEditAccountNumber(account.accountNumber);
        setEditIfsc(account.ifscCode);
        setEditUpiId(account.upiId || '');
        setEditType(account.accountType);
        setEditBalance(String(account.balance));
        setEditBranch(account.branch || '');
        setEditNickname(account.nickname || '');
        setEditOpeningDate(account.openingDate || '');
        setEditStatus(account.status || 'Active');
        setEditShowOnInvoice(account.showOnInvoice !== false);
        setEditNotes(account.notes || '');
    }, [account]);

    const maskedAccount = `••••${account.accountNumber ? account.accountNumber.slice(-4) : '****'}`;
    const upiString = `upi://pay?pa=${account.upiId}&pn=${encodeURIComponent(account.accountHolderName)}&am=&cu=INR`;

    const handleCopyUpi = () => {
        if (account.upiId) {
            navigator.clipboard.writeText(account.upiId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSaveEdit = () => {
        if (!editBankName.trim() || !editHolderName.trim() || !editAccountNumber.trim()) {
            setEditError('Bank Name, Account Holder आणि Account Number अनिवार्य आहेत.');
            return;
        }
        const result = onEdit({
            ...account,
            bankName: editBankName.trim(),
            accountHolderName: editHolderName.trim(),
            accountNumber: editAccountNumber.trim(),
            ifscCode: editIfsc.trim().toUpperCase(),
            upiId: editUpiId.trim(),
            accountType: editType,
            balance: parseFloat(editBalance) || 0,
            branch: editBranch.trim(),
            nickname: editNickname.trim(),
            openingDate: editOpeningDate || null,
            status: editStatus,
            showOnInvoice: editShowOnInvoice,
            notes: editNotes.trim(),
        });
        if (typeof result === 'string') {
            setEditError(result);
            return;
        }
        if (result === false) {
            setEditError('Bank account could not be updated.');
            return;
        }
        setEditError('');
        setEditOpen(false);
    };

    const handleDeleteCheck = () => {
        const hasTransactions = transactions.some(
            (t: any) => t.sourceAccountId === account.id || t.destAccountId === account.id
        );

        const hasSubSavings = subSavings.some(
            (s: any) => s.linkedAccountId === account.id
        );

        if (hasTransactions || hasSubSavings) {
            setWarningAlertOpen(true);
        } else {
            setDeleteConfirmOpen(true);
        }
    };

    const handleConfirmDelete = () => {
        onDelete(account.id);
        setDeleteConfirmOpen(false);
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

    return (
        <>
            <Card className={compact ? "group relative overflow-hidden rounded-xl border border-border/60 shadow-sm" : "group relative overflow-hidden rounded-2xl border border-border/60 transition-all duration-300 hover:shadow-lg hover:border-primary/30"}>
                <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-sky-50 dark:bg-sky-950/30 transition-transform duration-500 group-hover:scale-125 pointer-events-none" />

                <CardHeader className={cn("relative z-10 flex flex-row items-start justify-between space-y-0", compact ? "px-3 pb-1 pt-3" : "pb-2")}>
                    <div className={cn("flex items-center", compact ? "gap-2" : "gap-3")}>
                        <div className={cn("flex items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400", compact ? "h-8 w-8" : "h-11 w-11")}>
                            <Landmark className={compact ? "h-4 w-4" : "h-5 w-5"} />
                        </div>
                        <div>
                            <CardTitle className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-base")}>{account.bankName}</CardTitle>
                            <p className={cn("text-xs text-muted-foreground", compact && "text-[10px]")}>{account.accountHolderName}</p>
                        </div>
                    </div>

                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className={cn("text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800", compact ? "h-7 w-7" : "h-8 w-8")}>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 z-50 shadow-md">
                            <DropdownMenuItem onClick={() => setEditOpen(true)} className="cursor-pointer">
                                <Pencil className="mr-2 h-4 w-4 text-blue-500" />
                                <span>{t.edit}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setShareOpen(true)} className="cursor-pointer">
                                <Share2 className="mr-2 h-4 w-4 text-sky-600" />
                                <span>Bank Share</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={handleDeleteCheck}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>{t.delete}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <SharedBankAccountDialog account={account} showTrigger={false} open={shareOpen} onOpenChange={setShareOpen} />
                </CardHeader>

                <CardContent className={cn("relative z-10", compact ? "space-y-2 px-3 pb-3 pt-1" : "space-y-4 pt-2")}>
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">{t.totalBalance}</p>
                            <p className={cn("font-bold tracking-tight text-foreground", compact ? "text-lg" : "text-2xl")}>
                                {formatCurrency(displayBalance ?? account.balance)}
                            </p>
                        </div>
                        <Badge variant={account.accountType === 'Savings' ? 'default' : 'secondary'}>
                            {localizeBankingValue(account.accountType, language)}
                        </Badge>
                    </div>

                    <div className={cn("grid grid-cols-2 text-sm", compact ? "gap-2" : "gap-3")}>
                        <div>
                            <p className="text-xs text-muted-foreground">{t.accountNumberLabel}</p>
                            <p className="font-mono text-xs font-medium">{maskedAccount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">{t.ifscLabel}</p>
                            <p className="font-mono text-xs font-medium">{account.ifscCode}</p>
                        </div>
                    </div>

                    <div className={cn("flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50/50 dark:border-sky-900/30 dark:bg-sky-950/20", compact ? "p-1.5" : "p-2.5")}>
                        <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">UPI ID</p>
                                <p className="font-mono text-xs font-semibold text-sky-700 dark:text-sky-400">{account.upiId}</p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-sky-700 hover:bg-sky-100 dark:text-sky-400"
                                onClick={handleCopyUpi}
                                title="{t.copyUpi}"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-sky-700 hover:bg-sky-100 dark:text-sky-400"
                                onClick={() => setQrOpen(true)}
                                title={t.showQr}
                            >
                                <QrCode className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* QR Code Dialog */}
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5 text-primary" />
                            {t.showQr}
                        </DialogTitle>
                        <DialogDescription>
                            {t.scanQrHint}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-2">
                        <QRCodeDisplay value={upiString} size={220} />
                        <div className="w-full rounded-lg border border-primary/10 bg-primary/5 px-4 py-3 text-center">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">UPI ID</p>
                            <p className="font-mono text-sm font-semibold text-primary">{account.upiId}</p>
                        </div>
                        <div className="w-full text-center text-sm">
                            <p className="font-medium">{account.accountHolderName}</p>
                            <p className="text-xs text-muted-foreground">{account.bankName}</p>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleCopyUpi}
                        >
                            {copied ? <Check className="mr-2 h-4 w-4 text-emerald-600" /> : <Copy className="mr-2 h-4 w-4" />}
                            {copied ? t.copied : t.copyUpi}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-md mobile-entry-screen">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            {t.editBankTitle}
                        </DialogTitle>
                        <DialogDescription>{t.updateBankDesc}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-bank-name">{t.bankNameLabel}</Label>
                            <Input
                                id="edit-bank-name"
                                value={editBankName}
                                onChange={(e) => setEditBankName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-holder-name">{t.holderNameLabel}</Label>
                            <Input
                                id="edit-holder-name"
                                value={editHolderName}
                                onChange={(e) => setEditHolderName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-account-number">{t.accountNumberLabel}</Label>
                                <Input
                                    id="edit-account-number"
                                    value={editAccountNumber}
                                    onChange={(e) => setEditAccountNumber(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-ifsc">{t.ifscLabel}</Label>
                                <Input
                                    id="edit-ifsc"
                                    value={editIfsc}
                                    onChange={(e) => setEditIfsc(e.target.value)}
                                    className="uppercase"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-upi-id">UPI ID</Label>
                            <Input
                                id="edit-upi-id"
                                placeholder="example@upi"
                                value={editUpiId}
                                onChange={(e) => setEditUpiId(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-type">{t.accountTypeLabel}</Label>
                                <Select value={editType} onValueChange={(v) => setEditType(v as BankAccountType)}>
                                    <SelectTrigger id="edit-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Savings">{t.savingsLabel}</SelectItem>
                                        <SelectItem value="Current">{t.currentLabel}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-balance">Balance (₹)</Label>
                                <Input
                                    id="edit-balance"
                                    type="number"
                                    value={editBalance}
                                    onChange={(e) => setEditBalance(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="edit-branch">Branch</Label><Input id="edit-branch" value={editBranch} onChange={(e) => setEditBranch(e.target.value)} /></div>
                            <div className="space-y-2"><Label htmlFor="edit-nickname">Nickname</Label><Input id="edit-nickname" value={editNickname} onChange={(e) => setEditNickname(e.target.value)} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="edit-opening-date">Opening Date</Label><Input id="edit-opening-date" type="date" value={editOpeningDate} onChange={(e) => setEditOpeningDate(e.target.value)} /></div>
                            <div className="space-y-2"><Label htmlFor="edit-status">Status</Label><Select value={editStatus} onValueChange={setEditStatus}><SelectTrigger id="edit-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent></Select></div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-3 py-2"><Label htmlFor="edit-show-invoice">Show on Invoice</Label><input id="edit-show-invoice" type="checkbox" checked={editShowOnInvoice} onChange={(e) => setEditShowOnInvoice(e.target.checked)} className="h-4 w-4" /></div>
                        <div className="space-y-2"><Label htmlFor="edit-notes">Notes</Label><Input id="edit-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} /></div>
                        {editError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{editError}</p>}
                    </div>
                    <DialogFooter className="pt-2 mobile-entry-footer">
                        <Button variant="outline" onClick={() => setEditOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleSaveEdit}>{t.saveChangesBtn}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Safe Delete Confirmation Dialog */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>बँक खाते डिलीट करायचे आहे का?</AlertDialogTitle>
                        <AlertDialogDescription>
                            तुम्ही नक्की <b>{account.bankName}</b> हे बँक खाते डिलीट करू इच्छिता? ही कृती पूर्ववत केली जाऊ शकत नाही.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>रद्द करा</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            होय, डिलीट करा
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Validation Warning Dialog */}
            <AlertDialog open={warningAlertOpen} onOpenChange={setWarningAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="h-5 w-5" />
                            <AlertDialogTitle>बँक डिलीट करता येणार नाही!</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="pt-2 text-sm">
                            या बँक खात्याशी (<b>{account.bankName}</b>) जोडलेले ट्रान्झॅक्शन्स किंवा बचत योजना (उप-बचत) सिस्टीममध्ये उपलब्ध आहेत. ही बँक डिलीट करण्यासाठी आधी संबंधित सर्व व्यवहार किंवा योजना डिलीट करा.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setWarningAlertOpen(false)}>
                            समझले
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}