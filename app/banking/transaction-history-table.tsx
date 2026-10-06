'use client';

import { useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Pencil,
  Trash2,
  MoreVertical,
  Printer,
  Share2,
  Tag,
  Store,
  Home,
  Inbox,
  Wallet,
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

import type {
  Transaction,
  TransactionType,
  TxnCategory,
  ExpenseTag,
  BankAccount,
  ExpenseItem,
} from './types';
import { GALLA_ID, CASH_IN_HAND_ID } from './mock-data';
import { useSettings } from './settings-context';
import { localizeBankingValue } from './i18n';
import { useAppData } from './app-data-context';

interface TransactionHistoryTableProps {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  getAccountLabel: (id: string) => string;
  onEdit: (txn: Transaction) => void;
  onDelete: (id: string) => void;
  onBillEdit?: (txn: Transaction) => void;
  mobileCardMode?: boolean;
}

const expenseCategories: TxnCategory[] = [
  'Rent',
  'Utilities',
  'Groceries',
  'Supplies',
  'Maintenance',
  'Transport',
  'Food',
  'Personal',
  'Other',
];

const incomeCategories: TxnCategory[] = ['Salary', 'Business Revenue', 'Other'];

export function TransactionHistoryTable({
  transactions,
  bankAccounts,
  getAccountLabel,
  onEdit,
  onDelete,
  onBillEdit,
  mobileCardMode = false,
}: TransactionHistoryTableProps) {
  const { t, language, transactionCategories } = useSettings();
  const { subSavings, gallaBalance, cashInHandBalance, invoices } = useAppData();
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  const formatMobileCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const typeConfig = {
    Income: { icon: ArrowDownCircle, color: 'text-success', bg: 'bg-success/10' },
    Expense: { icon: ArrowUpCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
    Savings: { icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    Transfer: { icon: ArrowLeftRight, color: 'text-primary', bg: 'bg-primary/10' },
  };

  const tagConfig = {
    'Personal / House': { icon: Home, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
    'Shop / Business': { icon: Store, color: 'text-teal-600 bg-teal-950/30 dark:bg-teal-950/30' },
  };

  const allAccounts = [
    { id: GALLA_ID, label: t.gallaCashBox },
    { id: CASH_IN_HAND_ID, label: language === 'mr' ? 'Cash in Hand' : 'Cash in Hand' },
    ...bankAccounts.map((a) => ({
      id: a.id,
      label: `${a.bankName} ••••${a.accountNumber.slice(-4)}`,
    })),
    ...subSavings.map((a) => ({ id: a.id, label: `${a.schemeType} • ${a.schemeNumber}` })),
  ];

  // Edit form state
  const [editType, setEditType] = useState<TransactionType>('Expense');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<TxnCategory>('Other');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTag, setEditTag] = useState<ExpenseTag>('Shop / Business');
  const [editSource, setEditSource] = useState(GALLA_ID);
  const [editDest, setEditDest] = useState('');
  const [editShopName, setEditShopName] = useState('');
  const [editExpenseItems, setEditExpenseItems] = useState<ExpenseItem[]>([]);

  const openEdit = (txn: Transaction) => {
    setEditTxn(txn);
    setEditType(txn.type);
    setEditAmount(String(txn.amount));
    setEditCategory(txn.category);
    setEditDescription(txn.description);
    setEditDate(txn.date);
    setEditTag(txn.tag ?? 'Shop / Business');
    setEditSource(txn.sourceAccountId);
    setEditDest(txn.destAccountId ?? '');
    setEditShopName(txn.shopName ?? '');
    setEditExpenseItems(txn.expenseItems ?? []);
  };

  const handleSaveEdit = () => {
    if (!editTxn) return;
    onEdit({
      ...editTxn,
      type: editType,
      amount: parseFloat(editAmount) || 0,
      category: editCategory,
      description: editDescription.trim(),
      date: editDate,
      tag: (editType === 'Transfer' || editType === 'Savings') ? null : editTag,
      sourceAccountId: editSource,
      destAccountId: (editType === 'Transfer' || editType === 'Savings') ? (editDest || null) : null,
      isFromGalla: editSource === GALLA_ID,
      shopName: editShopName,
      expenseItems: editExpenseItems,
    });
    setEditTxn(null);
  };

  const availableCategories = editType === 'Savings' ? ['Daily Pigmy','RD','FD','Gold Savings'] : transactionCategories;

  const getCurrentBalance = (id: string) => {
    if (id === GALLA_ID) return gallaBalance;
    if (id === CASH_IN_HAND_ID) return cashInHandBalance;
    const bank = bankAccounts.find((account) => account.id === id);
    if (bank) return bank.balance;
    const saving = subSavings.find((account) => account.id === id);
    return saving?.depositAmount || 0;
  };

  const getLinkedInvoice = (txn: Transaction) => {
    return invoices.find((invoice) => invoice.transactionId === txn.id)
      ?? invoices.find((invoice) => txn.description === `POS Sale - ${invoice.invoiceNumber}`)
      ?? invoices.find((invoice) => txn.description.startsWith(`Invoice ${invoice.invoiceNumber}`))
      ?? null;
  };

  const isBillTransaction = (txn: Transaction) =>
    txn.description.startsWith('POS Sale - ') || txn.description.startsWith('Invoice ');

  const printBill = (txn: Transaction) => {
    const invoice = getLinkedInvoice(txn);
    if (!invoice || typeof window === 'undefined') { printTransaction(txn); return; }
    const popup = window.open('', '_blank', 'width=420,height=720');
    if (!popup) return;
    const itemRows = invoice.items.length
      ? invoice.items.map((item) => `<tr><td>${String(item.product.name).replace(/[<>]/g, '')}</td><td>${item.quantity}</td><td>${formatCurrency(Number(item.product.price) || 0)}</td><td>${formatCurrency(Number(item.lineAmount ?? item.quantity * item.product.price) || 0)}</td></tr>`).join('')
      : '<tr><td colspan=4>Payment Receipt</td></tr>';
    popup.document.write(`<html><head><title>${invoice.invoiceNumber}</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#222}h2{margin:0 0 6px}.muted{color:#777;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:7px 3px;text-align:left;font-size:12px}th:last-child,td:last-child{text-align:right}.total{display:flex;justify-content:space-between;margin-top:16px;font-size:18px;font-weight:700}</style></head><body><h2>${invoice.invoiceNumber}</h2><div class=muted>${invoice.customerName || 'Walk-in Customer'} • ${new Date(invoice.date).toLocaleDateString('en-IN')}</div><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${itemRows}</tbody></table><div class=total><span>Total</span><span>${formatCurrency(invoice.total)}</span></div><div class=muted style="margin-top:8px">Payment: ${invoice.paymentMethod}</div><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const shareBill = async (txn: Transaction) => {
    const invoice = getLinkedInvoice(txn);
    if (!invoice) { await shareTransaction(txn); return; }
    const text = `${invoice.invoiceNumber}\nCustomer: ${invoice.customerName || 'Walk-in Customer'}\nTotal: ${formatCurrency(invoice.total)}\nPayment: ${invoice.paymentMethod}`;
    try {
      if (navigator.share) await navigator.share({ title: invoice.invoiceNumber, text });
      else await navigator.clipboard.writeText(text);
    } catch {}
  };

  const printTransaction = (txn: Transaction) => {
    if (typeof window === 'undefined') return;
    const popup = window.open('', '_blank', 'width=420,height=640');
    if (!popup) return;
    popup.document.write(`<html><head><title>${txn.description || txn.type}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#222}h2{margin:0 0 8px}.muted{color:#777;font-size:13px}hr{border:0;border-top:1px solid #ddd;margin:18px 0}.row{display:flex;justify-content:space-between;margin:10px 0}.amount{font-size:24px;font-weight:700}</style></head><body><h2>${txn.description || txn.type}</h2><div class="muted">${txn.type} • ${formatDate(txn.date)}</div><hr/><div class="row"><span>Total</span><strong class="amount">${formatCurrency(txn.amount)}</strong></div><div class="row"><span>Account</span><span>${getAccountLabel(txn.sourceAccountId)}</span></div><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const shareTransaction = async (txn: Transaction) => {
    const text = `${txn.description || txn.type}
${txn.type} • ${formatDate(txn.date)}
Total: ${formatCurrency(txn.amount)}`;
    try {
      if (navigator.share) await navigator.share({ title: txn.description || txn.type, text });
      else await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <>
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">{t.noTransactions}</p>
          <p className="text-xs text-muted-foreground/70">
            {t.addEntryHint}
          </p>
        </div>
      ) : (
        <>
        {mobileCardMode && (
          <div className="space-y-1.5 lg:hidden">
            {transactions.map((txn) => {
              const balance = getCurrentBalance(txn.sourceAccountId);
              return (
                <div key={txn.id} className="min-h-[82px] rounded-lg border border-border/70 bg-background px-2.5 py-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="min-w-0 truncate font-serif text-[14px] font-semibold">{txn.description || localizeBankingValue(txn.type, language)}</p>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium uppercase text-emerald-700">{localizeBankingValue(txn.type, language)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{new Date(txn.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})} · {txn.category}{txn.shopName ? ` · ${txn.shopName}` : ''}{txn.expenseItems?.length ? ` · ${txn.expenseItems.length} items` : ''}</p>
                    </div>
                    <div className="shrink-0 text-right"><p className="text-[10px] text-muted-foreground">Total</p><p className="text-[13px] font-semibold">{formatMobileCurrency(txn.amount)}</p></div>
                    <div className="hidden shrink-0 text-right min-[390px]:block"><p className="text-[10px] text-muted-foreground">Balance</p><p className="text-[13px] font-semibold">{formatMobileCurrency(balance)}</p></div>
                    <div className="flex shrink-0 items-center">
                      {isBillTransaction(txn) && (<>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => printBill(txn)} aria-label="Print bill"><Printer className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => shareBill(txn)} aria-label="Share bill"><Share2 className="h-4 w-4" /></Button>
                      </>)}
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => isBillTransaction(txn) && onBillEdit ? onBillEdit(txn) : openEdit(txn)}><Pencil className="mr-2 h-4 w-4" />{t.edit}</DropdownMenuItem><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(txn.id)}><Trash2 className="mr-2 h-4 w-4" />{t.delete}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    </div>
                  </div>
                  <div className="mt-1 flex min-[390px]:hidden items-center justify-end border-t border-border/50 pt-1"><span className="mr-2 text-[10px] text-muted-foreground">Balance {formatMobileCurrency(balance)}</span></div>
                </div>
              );
            })}
          </div>
        )}
        <div className={mobileCardMode ? 'hidden lg:block' : ''}><div className="w-full overflow-x-auto rounded-xl border border-border/60 bg-card">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-3 sm:pl-4">{t.type}</TableHead>
                <TableHead>{t.descriptionNoteLabel}</TableHead>
                <TableHead className="hidden md:table-cell">{t.bankAccountsLabel}</TableHead>
                <TableHead className="hidden lg:table-cell">{t.tagLabel}</TableHead>
                <TableHead className="hidden sm:table-cell">{t.date}</TableHead>
                <TableHead className="text-right">{t.amount}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((txn) => {
                const config = typeConfig[txn.type];
                const TypeIcon = config.icon;
                const TagIcon = txn.tag ? tagConfig[txn.tag].icon : null;

                return (
                  <TableRow key={txn.id} className="group">
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bg}`}>
                          <TypeIcon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{localizeBankingValue(txn.type, language)}</p>
                          <p className="truncate text-xs text-muted-foreground lg:hidden">
                            {formatDate(txn.date)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {localizeBankingValue(txn.category, language)}{txn.shopName ? ` • ${txn.shopName}` : ''}{txn.expenseItems?.length ? ` • ${txn.expenseItems.length} items` : ''}
                          {txn.isFromGalla && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Galla
                            </span>
          )}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {txn.type === 'Transfer' ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{getAccountLabel(txn.sourceAccountId)}</span>
                          <span className="text-foreground/40">→ {txn.destAccountId ? getAccountLabel(txn.destAccountId) : '—'}</span>
                        </div>
                      ) : (
                        getAccountLabel(txn.sourceAccountId)
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {TagIcon && txn.tag ? (
                        <Badge variant="outline" className={`gap-1 border-0 ${tagConfig[txn.tag].color}`}>
                          <TagIcon className="h-3 w-3" />
                          {txn.tag === 'Personal / House' ? 'Personal' : 'Business'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {formatDate(txn.date)}
                    </TableCell>
                    <TableCell className={`text-right text-sm font-semibold ${
                      txn.type === 'Income' ? 'text-success' : txn.type === 'Expense' ? 'text-destructive' : 'text-foreground'
                    }`}>
                      {txn.type === 'Income' ? '+' : txn.type === 'Expense' ? '-' : ''}
                      {formatCurrency(txn.amount)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-60 group-hover:opacity-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(txn)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(txn.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div></div>
        </>
      )}

      {/* Edit Transaction Dialog */}
      <Dialog open={editTxn !== null} onOpenChange={(open) => { if (!open) setEditTxn(null); }}>
        <DialogContent className="max-w-md mobile-entry-screen">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Transaction
            </DialogTitle>
            <DialogDescription>{t.updateTransactionDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.type}</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as TransactionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Expense">{t.expense}</SelectItem>
                  <SelectItem value="Income">{t.income}</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Transfer">{t.transfer}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.amountRupeeLabel}</Label>
                <Input
                  type="number"
                  value={editType === 'Expense' && editExpenseItems.length > 0 ? editExpenseItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2) : editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.date}</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
            </div>
            {editType !== 'Transfer' && editType !== 'Savings' && (
              <div className="space-y-2">
                <Label>{t.categoryLabel}</Label>
                <Select value={editCategory} onValueChange={(v) => setEditCategory(v as TxnCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editType === 'Expense' && (
              <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <Label className="flex items-center gap-1.5"><Store className="h-3.5 w-3.5 text-primary" />Shop / Store</Label>
                <Input value={editShopName} onChange={(e) => setEditShopName(e.target.value)} placeholder="दुकानाचे नाव" />
                {editExpenseItems.length > 0 && (
                  <div className="space-y-1.5 rounded-lg border bg-background p-2">
                    {editExpenseItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <div className="min-w-0 flex-1"><b>{item.name}</b><span className="ml-1 text-muted-foreground">{item.quantity} {item.unit} × ₹{item.rate.toFixed(2)}</span><div className="text-[10px] text-muted-foreground">{item.category}</div></div>
                        <b>₹{item.amount.toFixed(2)}</b>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditExpenseItems((items) => items.filter((x) => x.id !== item.id))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    ))}
                    <div className="border-t pt-1 text-right text-xs font-semibold">Items Total: ₹{editExpenseItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</div>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>{t.descriptionNoteLabel}</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            {editType !== 'Transfer' && editType !== 'Savings' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  Tag
                </Label>
                <Select value={editTag} onValueChange={(v) => setEditTag(v as ExpenseTag)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Personal / House">{localizeBankingValue('Personal / House', language)}</SelectItem>
                    <SelectItem value="Shop / Business">{localizeBankingValue('Shop / Business', language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{editType === 'Income' ? t.depositToLabel : editType === 'Expense' ? t.paidFromLabel : t.fromLabel}</Label>
              <Select value={editSource} onValueChange={setEditSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allAccounts.map((src) => (
                    <SelectItem key={src.id} value={src.id}>{src.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editType === 'Savings' && (
              <div className="space-y-2">
                <Label>Save To</Label>
                <Select value={editDest} onValueChange={setEditDest}><SelectTrigger><SelectValue placeholder="Select savings account" /></SelectTrigger><SelectContent>{subSavings.map((a) => <SelectItem key={a.id} value={a.id}>{a.schemeType} • {a.schemeNumber}</SelectItem>)}</SelectContent></Select>
              </div>
            )}
            {editType === 'Transfer' && (
              <div className="space-y-2">
                <Label>{t.toLabel}</Label>
                <Select value={editDest} onValueChange={setEditDest}>
                  <SelectTrigger><SelectValue placeholder={t.selectDestination} /></SelectTrigger>
                  <SelectContent>
                    {allAccounts.filter((s) => s.id !== editSource).map((src) => (
                      <SelectItem key={src.id} value={src.id}>{src.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editType === 'Expense' && editSource === GALLA_ID && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t.gallaExpenseHint}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2 mobile-entry-footer">
            <Button variant="outline" onClick={() => setEditTxn(null)}>{t.cancel}</Button>
            <Button onClick={handleSaveEdit}>{t.saveChangesBtn}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
