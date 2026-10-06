'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  FileSpreadsheet,
  File as FilePdf,
  BookOpen,
  Receipt,
  PieChart as PieIcon,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useSettings } from './settings-context';
import { useAppData } from './app-data-context';
import { DateFilterProvider, useDateFilter, type DateFilterPreset } from './use-date-filter';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PIE_COLORS = ['#0284c7', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#4f46e5'];

const presetButtons: { preset: DateFilterPreset; labelKey: 'today' | 'thisWeek' | 'thisMonth' }[] = [
  { preset: 'today', labelKey: 'today' },
  { preset: 'thisWeek', labelKey: 'thisWeek' },
  { preset: 'thisMonth', labelKey: 'thisMonth' },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateExcelXml(rows: string[][]): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = rows.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${esc(cell)}</Data></Cell>`).join('')}</Row>`).join('');
  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table>${body}</Table></Worksheet></Workbook>`;
}

export function ReportsPage() {
  return (
    <DateFilterProvider>
      <ReportsContent />
    </DateFilterProvider>
  );
}

function ReportsContent() {
  const { t } = useSettings();
  const { transactions } = useAppData();
  const { preset, setPreset, setCustomRange, customStart, customEnd, range } = useDateFilter();
  const [activeTab, setActiveTab] = useState<'daybook' | 'pl' | 'expense' | 'analytics'>('daybook');
  const [customOpen, setCustomOpen] = useState(false);
  const [tempStart, setTempStart] = useState(customStart);
  const [tempEnd, setTempEnd] = useState(customEnd);

  const filteredTxns = useMemo(() => {
    return transactions
      .filter((txn) => {
        const d = new Date(txn.date);
        return d >= range.start && d <= range.end;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, range]);

  const summary = useMemo(() => {
    const income = filteredTxns.filter((tx) => tx.type === 'Income').reduce((s, tx) => s + tx.amount, 0);
    const expense = filteredTxns.filter((tx) => tx.type === 'Expense').reduce((s, tx) => s + tx.amount, 0);
    const net = income - expense;
    return { income, expense, net, count: filteredTxns.length };
  }, [filteredTxns]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredTxns.filter((tx) => tx.type === 'Expense').forEach((tx) => map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTxns]);

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredTxns.filter((tx) => tx.type === 'Income').forEach((tx) => map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTxns]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    filteredTxns.forEach((tx) => {
      const dayKey = new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const entry = map.get(dayKey) ?? { income: 0, expense: 0 };
      if (tx.type === 'Income') entry.income += tx.amount;
      if (tx.type === 'Expense') entry.expense += tx.amount;
      map.set(dayKey, entry);
    });
    return Array.from(map.entries()).map(([date, vals]) => ({ date, ...vals }));
  }, [filteredTxns]);

  const rangeLabel = `${range.start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — ${range.end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const exportCsv = useCallback(() => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Tag'];
    const rows = filteredTxns.map((tx) => [formatDate(tx.date), tx.type, tx.category, tx.description.replace(/"/g, '""'), String(tx.amount), tx.tag ?? '']);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `report-${preset}-${Date.now()}.csv`);
  }, [filteredTxns, preset]);

  const exportExcel = useCallback(() => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Tag'];
    const rows = filteredTxns.map((tx) => [formatDate(tx.date), tx.type, tx.category, tx.description, String(tx.amount), tx.tag ?? '']);
    const xml = generateExcelXml([headers, ...rows]);
    downloadBlob(new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' }), `report-${preset}-${Date.now()}.xls`);
  }, [filteredTxns, preset]);

  const exportPdf = useCallback(() => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = filteredTxns.map((tx, i) =>
      `<tr><td>${i + 1}</td><td>${formatDate(tx.date)}</td><td>${tx.type}</td><td>${tx.category}</td><td>${tx.description}</td><td style="text-align:right">${formatCurrency(tx.amount)}</td></tr>`
    ).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Report - ${rangeLabel}</title>
      <style>* { margin:0; padding:0; box-sizing:border-box; font-family:Arial,sans-serif; }
      body { padding:24px; color:#1e293b; }
      h1 { font-size:20px; margin-bottom:4px; }
      .meta { font-size:12px; color:#64748b; margin-bottom:16px; }
      .summary { display:flex; gap:16px; margin-bottom:20px; }
      .card { flex:1; border:1px solid #e2e8f0; border-radius:8px; padding:12px; }
      .card h3 { font-size:11px; text-transform:uppercase; color:#64748b; margin-bottom:4px; }
      .card .val { font-size:18px; font-weight:bold; }
      table { width:100%; border-collapse:collapse; font-size:12px; }
      th { background:#f1f5f9; padding:8px; text-align:left; border-bottom:2px solid #e2e8f0; }
      td { padding:6px 8px; border-bottom:1px solid #e2e8f0; }
      .profit { color:#059669; } .loss { color:#dc2626; }
      </style></head><body>
      <h1>Report &amp; Analytics</h1>
      <div class="meta">Period: ${rangeLabel} | Transactions: ${summary.count}</div>
      <div class="summary">
        <div class="card"><h3>Total Income</h3><div class="val" style="color:#059669">${formatCurrency(summary.income)}</div></div>
        <div class="card"><h3>Total Expense</h3><div class="val" style="color:#dc2626">${formatCurrency(summary.expense)}</div></div>
        <div class="card"><h3>${summary.net >= 0 ? 'Net Profit' : 'Net Loss'}</h3><div class="val ${summary.net >= 0 ? 'profit' : 'loss'}">${formatCurrency(Math.abs(summary.net))}</div></div>
      </div>
      <table><thead><tr><th>#</th><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }, [filteredTxns, summary, rangeLabel]);

  const handleApplyCustom = () => {
    if (tempStart && tempEnd) { setCustomRange(tempStart, tempEnd); setCustomOpen(false); }
  };

  const hasData = filteredTxns.length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <BarChart3 className="h-7 w-7 text-primary" />
          {t.reportsTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.reportsSubtitle}</p>
      </div>

      {/* Date Filter */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          {presetButtons.map((btn) => (
            <button key={btn.preset} onClick={() => setPreset(btn.preset)}
              className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                preset === btn.preset ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent')}>
              {t[btn.labelKey]}
            </button>
          ))}
          <Popover open={customOpen} onOpenChange={setCustomOpen}>
            <PopoverTrigger asChild>
              <button className={cn('flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                preset === 'custom' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent')}>
                {t.customRange}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="space-y-3 p-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t.startDate}</label>
                  <Input type="date" value={tempStart} onChange={(e) => setTempStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t.endDate}</label>
                  <Input type="date" value={tempEnd} onChange={(e) => setTempEnd(e.target.value)} />
                </div>
                <Button size="sm" className="w-full" onClick={handleApplyCustom} disabled={!tempStart || !tempEnd}>Apply Range</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="shrink-0 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">{rangeLabel}</div>
      </div>

      {/* Summary Cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{t.totalIncome}</p>
          </div>
          <p className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.income)}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
              <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{t.totalExpense}</p>
          </div>
          <p className="mt-2 text-xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(summary.expense)}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', summary.net >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10')}>
              {summary.net >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />}
            </div>
            <p className="text-xs font-medium text-muted-foreground">{summary.net >= 0 ? t.netProfit : t.netLoss}</p>
          </div>
          <p className={cn('mt-2 text-xl font-bold', summary.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            {formatCurrency(Math.abs(summary.net))}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{t.txnCount}</p>
          </div>
          <p className="mt-2 text-xl font-bold">{summary.count}</p>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="mb-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!hasData} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />{t.exportCsv}
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel} disabled={!hasData} className="gap-1.5">
          <FileSpreadsheet className="h-3.5 w-3.5" />{t.exportExcel}
        </Button>
        <Button variant="outline" size="sm" onClick={exportPdf} disabled={!hasData} className="gap-1.5">
          <FilePdf className="h-3.5 w-3.5" />{t.exportPdf}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'daybook' | 'pl' | 'expense' | 'analytics')}>
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="daybook" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" />{t.dayBook}</TabsTrigger>
          <TabsTrigger value="pl" className="gap-1.5"><FileText className="h-3.5 w-3.5" />{t.profitLoss}</TabsTrigger>
          <TabsTrigger value="expense" className="gap-1.5"><PieIcon className="h-3.5 w-3.5" />{t.expenseBreakup}</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />{t.analytics}</TabsTrigger>
        </TabsList>
      </Tabs>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">{t.noData}</p>
          <p className="text-xs text-muted-foreground/70">{t.noDataDesc}</p>
        </div>
      ) : (
        <>
          {/* Day Book */}
          {activeTab === 'daybook' && (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">{t.slNo}</TableHead>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.type}</TableHead>
                      <TableHead>{t.category}</TableHead>
                      <TableHead>{t.description}</TableHead>
                      <TableHead className="text-right">{t.amount}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTxns.map((tx, i) => (
                      <TableRow key={tx.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
                        <TableCell>
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                            tx.type === 'Income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : tx.type === 'Expense' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-400')}>
                            {tx.type === 'Income' ? <ArrowUpCircle className="h-3 w-3" /> : tx.type === 'Expense' ? <ArrowDownCircle className="h-3 w-3" /> : null}
                            {tx.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tx.category}</TableCell>
                        <TableCell className="text-sm">{tx.description}</TableCell>
                        <TableCell className={cn('text-right text-sm font-bold',
                          tx.type === 'Income' ? 'text-emerald-600 dark:text-emerald-400' : tx.type === 'Expense' ? 'text-rose-600 dark:text-rose-400' : '')}>
                          {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}{formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-2 p-3 lg:hidden">
                {filteredTxns.map((tx) => (
                  <div key={tx.id} className="rounded-xl border border-border/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.category} · {formatDate(tx.date)}</p>
                      </div>
                      <span className={cn('shrink-0 text-sm font-bold', tx.type === 'Income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                        {tx.type === 'Income' ? '+' : tx.type === 'Expense' ? '-' : ''}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profit & Loss */}
          {activeTab === 'pl' && (
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold">{t.profitLoss}</h2>
              <div className="space-y-3">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-4 w-4" />{t.totalIncome}
                  </div>
                  <div className="ml-6 space-y-1.5">
                    {incomeByCategory.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-emerald-500/20 pt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      <span>{t.totalIncome}</span><span>{formatCurrency(summary.income)}</span>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
                    <TrendingDown className="h-4 w-4" />{t.totalExpense}
                  </div>
                  <div className="ml-6 space-y-1.5">
                    {expenseByCategory.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-rose-500/20 pt-2 text-sm font-bold text-rose-600 dark:text-rose-400">
                      <span>{t.totalExpense}</span><span>{formatCurrency(summary.expense)}</span>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-border" />
                <div className={cn('flex items-center justify-between rounded-xl p-4', summary.net >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10')}>
                  <span className="text-sm font-bold">{summary.net >= 0 ? t.netProfit : t.netLoss}</span>
                  <span className={cn('text-xl font-bold', summary.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                    {formatCurrency(Math.abs(summary.net))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Expense Breakup */}
          {activeTab === 'expense' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold">{t.expenseByCategory}</h2>
                {expenseByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {expenseByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="py-10 text-center text-sm text-muted-foreground">{t.noData}</p>}
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold">{t.revenueByCategory}</h2>
                {incomeByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={incomeByCategory} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {incomeByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="py-10 text-center text-sm text-muted-foreground">{t.noData}</p>}
              </div>
            </div>
          )}

          {/* Analytics */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold">{t.dailyTrend}</h2>
                {dailyTrend.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="income" name={t.totalIncome} fill="#059669" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name={t.totalExpense} fill="#dc2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                  <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-4 w-4" />{t.topIncome}
                  </h2>
                  <div className="space-y-2">
                    {incomeByCategory.slice(0, 5).map((item, i) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate font-medium">{item.name}</span>
                            <span className="shrink-0 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.value)}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(item.value / (incomeByCategory[0]?.value || 1)) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {incomeByCategory.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">{t.noData}</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                  <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
                    <TrendingDown className="h-4 w-4" />{t.topExpense}
                  </h2>
                  <div className="space-y-2">
                    {expenseByCategory.slice(0, 5).map((item, i) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-xs font-bold text-rose-600 dark:text-rose-400">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate font-medium">{item.name}</span>
                            <span className="shrink-0 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(item.value)}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-rose-500" style={{ width: `${(item.value / (expenseByCategory[0]?.value || 1)) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {expenseByCategory.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">{t.noData}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
