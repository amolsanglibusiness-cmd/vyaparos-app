'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Pencil, Plus, Search, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAppData } from '../banking/app-data-context';
import type { CartItem, Invoice } from '../banking/types';
import { MobileFab } from '../banking/mobile-fab';
import { useSettings } from '../banking/settings-context';

const money = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v) || 0);

export default function SalesHistoryPage() {
  const router = useRouter();
  const { t } = useSettings();
  const { invoices, inventoryItems, ledgerEntries, deleteInvoice, updateInventoryItem, deleteLedgerEntry, deleteTransaction } = useAppData();
  const [query, setQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...invoices].sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date))).filter((invoice) => !q || invoice.invoiceNumber.toLowerCase().includes(q) || invoice.customerName.toLowerCase().includes(q) || (invoice.customerPhone || '').includes(q));
  }, [invoices, query]);

  const removeInvoice = () => {
    const invoice = invoices.find((entry) => entry.id === deleteId);
    if (!invoice) return;
    for (const raw of invoice.items) {
      const line = raw as CartItem & { inventoryItemId?: string | null };
      const id = line.inventoryItemId || line.product.id;
      const item = inventoryItems.find((entry) => entry.id === id);
      if (item) updateInventoryItem({ ...item, stock: item.stock + Math.max(0, Number(line.quantity) || 0) });
    }
    ledgerEntries.filter((entry) => entry.description.startsWith(`${invoice.invoiceNumber} —`)).forEach((entry) => deleteLedgerEntry(entry.id));
    if (invoice.transactionId) deleteTransaction(invoice.transactionId);
    deleteInvoice(invoice.id);
    setDeleteId(null);
    toast.success(`${invoice.invoiceNumber} deleted and linked accounting entries reversed.`);
  };

  return <div className="vy-reference-page vy-page-sales-history mx-auto max-w-5xl space-y-4 pb-24">
    <header className="sticky top-0 z-50 shrink-0 -mx-4 w-[calc(100%+2rem)] border-b bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:mx-0 lg:w-full">
      <div className="flex min-h-10 items-center gap-2">
        <button type="button" onClick={() => router.back()} className="rounded-full p-2 hover:bg-muted" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 text-base font-bold">Sales</h1>
        <Button size="sm" className="hidden lg:inline-flex" onClick={() => router.push('/invoice')}><Plus className="mr-1 h-4 w-4" /> New</Button>
      </div>
    </header>
    <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="h-11 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice no., customer or mobile" /></div>
    <div className="space-y-2">{filtered.length === 0 ? <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">No invoices found.</div> : filtered.map((invoice) => <InvoiceHistoryRow key={invoice.id} invoice={invoice} onView={() => router.push(`/invoice?view=${encodeURIComponent(invoice.id)}`)} onEdit={() => router.push(`/invoice?edit=${encodeURIComponent(invoice.id)}`)} onDelete={() => setDeleteId(invoice.id)} />)}</div>
    <MobileFab label={t.createInvoiceSale} onClick={() => router.push('/invoice')} />
    <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete invoice?</AlertDialogTitle><AlertDialogDescription>This removes the bill and reverses its stock, customer ledger and linked cash/bank income transaction. The Customer master itself will not be deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={removeInvoice}>Delete & Reverse</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

function InvoiceHistoryRow({ invoice, onView, onEdit, onDelete }: { invoice: Invoice; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  return <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b>{invoice.invoiceNumber}</b><Badge variant={invoice.paymentStatus === 'Paid' ? 'default' : 'secondary'}>{invoice.paymentStatus || 'Paid'}</Badge></div><p className="mt-1 font-medium">{invoice.customerName}</p><p className="text-xs text-muted-foreground">{invoice.customerPhone || 'No mobile'} • {new Date(invoice.date).toLocaleDateString('en-IN')}</p></div><div className="text-left sm:text-right"><b className="text-lg">{money(invoice.total)}</b><p className="text-xs text-muted-foreground">{invoice.paymentMethod}</p></div><div className="flex gap-1"><Button size="icon" variant="outline" title="View" onClick={onView}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="outline" title="Edit" onClick={onEdit}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="outline" title="Share" onClick={onView}><Share2 className="h-4 w-4" /></Button><Button size="icon" variant="outline" className="text-destructive" title="Delete" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></div></div></div>;
}
