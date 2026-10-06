'use client';

import { FileText, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppData } from './app-data-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const money = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v) || 0);

export function RecentInvoicesWidget() {
  const router = useRouter();
  const { invoices } = useAppData();
  const recent = [...invoices].sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date))).slice(0, 5);
  return <section className="rounded-2xl border bg-card p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">Recent Invoices</h2><p className="text-xs text-muted-foreground">Latest sale bills</p></div><Button variant="ghost" size="sm" onClick={() => router.push('/sales-history')}>View All<ChevronRight className="ml-1 h-4 w-4" /></Button></div>{recent.length === 0 ? <div className="rounded-xl bg-muted/40 p-6 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-2 h-5 w-5" />No invoices yet</div> : <div className="divide-y">{recent.map((invoice) => <button key={invoice.id} onClick={() => router.push(`/invoice?view=${encodeURIComponent(invoice.id)}`)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-muted/30"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><b className="truncate text-sm">{invoice.customerName}</b><Badge variant={invoice.paymentStatus === 'Paid' ? 'default' : 'secondary'} className="text-[9px]">{invoice.paymentStatus || 'Paid'}</Badge></div><p className="text-[11px] text-muted-foreground">{invoice.invoiceNumber} • {new Date(invoice.date).toLocaleDateString('en-IN')}</p></div><b className="text-sm">{money(invoice.total)}</b></button>)}</div>}</section>;
}
