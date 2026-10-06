'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';

import { useAppData } from './app-data-context';
import { useDateFilter, DateFilterProvider } from './use-date-filter';
import { RecentTransactionsWidget } from './recent-transactions-widget';
import { LowStockAlertsWidget } from './low-stock-alerts-widget';
import { RecentInvoicesWidget } from './recent-invoices-widget';
import { Mic, ShoppingCart, ReceiptText, FilePlus2, ArrowLeftRight, BarChart3, TrendingDown, Sparkles, ChevronRight, Calendar, ChevronDown } from 'lucide-react';
import { AddTransactionDialog } from './add-transaction-dialog';
import { useSettings } from './settings-context';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DashboardPage() {
  return (
    <DateFilterProvider>
      <DashboardContent />
    </DateFilterProvider>
  );
}

function DashboardContent() {
  const { transactions, bankAccounts, addTransaction, invoices } = useAppData();
  const { businessProfile } = useSettings();
  const { preset, setPreset, setCustomRange, customStart, customEnd, range, isDateInRange } = useDateFilter();
  const [overviewFilterOpen, setOverviewFilterOpen] = useState(false);
  const [tempStart, setTempStart] = useState(customStart);
  const [tempEnd, setTempEnd] = useState(customEnd);
  const [fabVisible, setFabVisible] = useState(true);

  // १. दोन्ही कार्ड्स वेगवेगळे करण्यासाठी cardOrder मधील 'widgetsGrid' ऐवजी दोन स्वतंत्र की जोडल्या आहेत
  const [cardOrder, setCardOrder] = useState<string[]>([
    'hero',
    'overview',
    'quickActions',
    'insights',
    'salesChart',
    'recentTransactions', // स्वतंत्र कार्ड १
    'lowStockAlerts',     // स्वतंत्र कार्ड २
    'recentInvoices'
  ]);

  // localStorage मधून युजरने सेव्ह केलेली क्रमवारी लोड करणे
  useEffect(() => {
    const savedOrder = localStorage.getItem('vyaparos_dashboard_order');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        // जर जुना widgetsGrid कोड सेव्ह असेल तर अपडेट करणे
        if (parsed.includes('widgetsGrid')) {
          const index = parsed.indexOf('widgetsGrid');
          parsed.splice(index, 1, 'recentTransactions', 'lowStockAlerts');
        }
        setCardOrder(parsed);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const moveCard = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...cardOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    setCardOrder(newOrder);
    localStorage.setItem('vyaparos_dashboard_order', JSON.stringify(newOrder));
  };

  const filteredTxns = useMemo(
    () => transactions.filter((transaction) => isDateInRange(transaction.date)),
    [transactions, isDateInRange]
  );

  const filteredExpenses = useMemo(
    () => filteredTxns
      .filter((transaction) => transaction.type === 'Expense')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    [filteredTxns]
  );

  const selectedSales = useMemo(
    () => filteredTxns
      .filter(
        (transaction) =>
          transaction.type === 'Income' && transaction.tag === 'Shop / Business'
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    [filteredTxns]
  );

  const selectedExpenses = filteredExpenses;
  const selectedProfit = selectedSales - selectedExpenses;
  const selectedInvoices = useMemo(() => invoices.filter((invoice) => isDateInRange(invoice.date)), [invoices, isDateInRange]);

  // २. टक्केवारी (Growth Percentage) काढण्यासाठी कॅल्क्युलेशन
  // सध्याच्या कालावधीच्या आधीच्या कालावधीशी (Previous Period) तुलना करणे
  const previousPeriodRange = useMemo(() => {
    const duration = range.end.getTime() - range.start.getTime();
    const prevStart = new Date(range.start.getTime() - duration - 86400000);
    const prevEnd = new Date(range.start.getTime() - 86400000);
    return { prevStart, prevEnd };
  }, [range]);

  const prevTxns = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= previousPeriodRange.prevStart && d <= previousPeriodRange.prevEnd;
    });
  }, [transactions, previousPeriodRange]);

  const prevSales = useMemo(() => prevTxns.filter(t => t.type === 'Income' && t.tag === 'Shop / Business').reduce((sum, t) => sum + Number(t.amount || 0), 0), [prevTxns]);
  const prevExpenses = useMemo(() => prevTxns.filter(t => t.type === 'Expense').reduce((sum, t) => sum + Number(t.amount || 0), 0), [prevTxns]);
  const prevProfit = prevSales - prevExpenses;
  const prevInvoicesCount = useMemo(() => invoices.filter(i => {
    const d = new Date(i.date);
    return d >= previousPeriodRange.prevStart && d <= previousPeriodRange.prevEnd;
  }).length, [invoices, previousPeriodRange]);

  // % ची वाढ/घट मोजण्यासाठी हेल्पिंग फंक्शन
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return { pct: 0, text: '0%' };
      return { pct: 100, text: '↑ 100%' };
    }
    const diff = ((current - previous) / previous) * 100;
    const rounded = Math.abs(Math.round(diff));
    if (diff > 0) return { pct: rounded, text: `↑ ${rounded}%` };
    if (diff < 0) return { pct: rounded, text: `↓ ${rounded}%` };
    return { pct: 0, text: '0%' };
  };

  const salesChange = calculateChange(selectedSales, prevSales);
  const expensesChange = calculateChange(selectedExpenses, prevExpenses);
  const profitChange = calculateChange(selectedProfit, prevProfit);
  const invoicesChange = calculateChange(selectedInvoices.length, prevInvoicesCount);

  useEffect(() => { setTempStart(customStart); setTempEnd(customEnd); }, [customStart, customEnd]);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastTop = window.scrollY;
    const onScroll = () => {
      const top = Math.max(0, window.scrollY || 0);
      const delta = top - lastTop;
      if (Math.abs(delta) < 3) return;
      setFabVisible(delta < 0 || top <= 4);
      lastTop = top;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const renderCardContent = (id: string, index: number) => {
    switch (id) {
      case 'hero':
        return (
          <section className="vy-ref-dashboard-hero relative group">
            <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-background/80 backdrop-blur rounded-md p-1 shadow-sm z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'up')} disabled={index === 0}>⬆️</Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'down')} disabled={index === cardOrder.length - 1}>⬇️</Button>
            </div>
            <div className="vy-ref-greeting-copy"><h1>Hello, {(businessProfile.ownerName || 'User').split(/\s+/)[0]}! <span>👋</span></h1><p>Your business is growing! Keep it up.</p></div>
            <Link href="/assistant" className="vy-ref-ai-card"><span className="vy-ref-mic-orb"><Mic /></span><span><b>AI Assistant</b><small>How can I help you today?</small></span><ChevronRight /></Link>
          </section>
        );

      case 'overview':
        return (
          <section className="vy-ref-overview-card relative group">
            <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-background/80 backdrop-blur rounded-md p-1 shadow-sm z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'up')} disabled={index === 0}>⬆️</Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'down')} disabled={index === cardOrder.length - 1}>⬇️</Button>
            </div>
            <div className="vy-ref-section-heading">
              <div><h2>Today's Overview</h2><p>{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</p></div>
              <Popover open={overviewFilterOpen} onOpenChange={setOverviewFilterOpen}>
                <PopoverTrigger asChild><button type="button" className="vy-ref-overview-filter" aria-label="Select overview date range"><Calendar className="h-4 w-4" /><span>{preset === 'today' ? 'Today' : preset === 'yesterday' ? 'Yesterday' : preset === 'thisWeek' ? 'This Week' : preset === 'thisMonth' ? 'This Month' : 'Custom Range'}</span><ChevronDown className="h-4 w-4" /></button></PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="vy-overview-filter-popover w-[250px] p-2"><div className="vy-overview-filter-list" role="menu" aria-label="Overview date filters">{([['today','Today'],['yesterday','Yesterday'],['thisWeek','This Week'],['thisMonth','This Month'],['custom','Custom Range']] as const).map(([value,label]) => <button key={value} type="button" role="menuitem" onClick={() => { setPreset(value); if (value !== 'custom') setOverviewFilterOpen(false); }} className={cn('vy-overview-filter-option', preset === value && 'active')}>{label}<span>{preset === value ? '✓' : ''}</span></button>)}</div>{preset === 'custom' && <div className="vy-overview-custom-range"><div><label>Start date</label><Input type="date" value={tempStart} onChange={(e) => setTempStart(e.target.value)} /></div><div><label>End date</label><Input type="date" value={tempEnd} onChange={(e) => setTempEnd(e.target.value)} /></div><Button size="sm" className="w-full" disabled={!tempStart || !tempEnd || tempStart > tempEnd} onClick={() => { setCustomRange(tempStart,tempEnd); setOverviewFilterOpen(false); }}>Apply Range</Button></div>}<div className="vy-overview-current-range">{range.start.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} — {range.end.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></PopoverContent>
              </Popover>
            </div>
            {/* dynamic % दाखवण्यासाठी बदल केले आहेत */}
            <div className="vy-ref-overview-grid">
              <div className="vy-ref-overview-stat cyan"><span>Total Sales</span><b>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(selectedSales)}</b><em>{salesChange.text}</em></div>
              <div className="vy-ref-overview-stat pink"><span>Total Expenses</span><b>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(selectedExpenses)}</b><em>{expensesChange.text}</em></div>
              <div className="vy-ref-overview-stat blue"><span>Net Profit</span><b>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(selectedProfit)}</b><em>{profitChange.text}</em></div>
              <div className="vy-ref-overview-stat purple"><span>Total Invoices</span><b>{selectedInvoices.length}</b><em>{invoicesChange.text}</em></div>
            </div>
          </section>
        );

      case 'quickActions':
        return (
          <section className="vy-ref-quick-card relative group">
            <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-background/80 backdrop-blur rounded-md p-1 shadow-sm z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'up')} disabled={index === 0}>⬆️</Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'down')} disabled={index === cardOrder.length - 1}>⬇️</Button>
            </div>
            <div className="vy-ref-section-title"><h2>Quick Actions</h2></div>
            <div className="vy-ref-quick-grid">
              <AddTransactionDialog bankAccounts={bankAccounts} onAdd={addTransaction} trigger={<button className="vy-ref-action-card green"><span><ShoppingCart /></span><b>Record Sale</b><small>Add a new sale</small></button>} />
              <Link href="/invoice" className="vy-ref-action-card purple"><span><ReceiptText /></span><b>Create Invoice</b><small>Generate invoice</small></Link>
              <AddTransactionDialog bankAccounts={bankAccounts} onAdd={addTransaction} trigger={<button className="vy-ref-action-card amber"><span><TrendingDown /></span><b>Add Expense</b><small>Track expenses</small></button>} />
              <Link href="/reports" className="vy-ref-action-card blue"><span><BarChart3 /></span><b>View Reports</b><small>Check business performance</small></Link>
            </div>
          </section>
        );

      case 'insights':
        return (
          <div className="relative group">
            <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-background/80 backdrop-blur rounded-md p-1 shadow-sm z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'up')} disabled={index === 0}>⬆️</Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'down')} disabled={index === cardOrder.length - 1}>⬇️</Button>
            </div>
            <Link href="/reports" className="vy-ref-insight-card"><span><Sparkles /></span><div><b>Smart Insights</b><small>Your sales increased compared to last month!</small></div><ChevronRight /></Link>
          </div>
        );

      case 'salesChart':
        return (
          <section className="vy-ref-sales-card relative group">
            <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-background/80 backdrop-blur rounded-md p-1 shadow-sm z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'up')} disabled={index === 0}>⬆️</Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'down')} disabled={index === cardOrder.length - 1}>⬇️</Button>
            </div>
            <div className="vy-ref-section-heading"><div><h2>Sales Overview</h2><p>Last 7 Days</p></div><ChevronRight /></div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(6-i)); const key=d.toISOString().slice(0,10); const value=transactions.filter(t=>t.type==='Income'&&t.date.slice(0,10)===key).reduce((a,t)=>a+Number(t.amount||0),0); return {label:d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}), value}; })}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:10,fill:'hsl(var(--muted-foreground))'}}/>
                  <Tooltip/>
                  <Line type="monotone" dataKey="value" stroke="#18bfff" strokeWidth={3} dot={{r:3,fill:'#18bfff'}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        );

      // ३. Recent Transactions चे वेगळे कार्ड
      case 'recentTransactions':
        return (
          <div className="relative group">
            <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-background/80 backdrop-blur rounded-md p-1 shadow-sm z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'up')} disabled={index === 0}>⬆️</Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'down')} disabled={index === cardOrder.length - 1}>⬇️</Button>
            </div>
            <RecentTransactionsWidget />
          </div>
        );

      // ४. Low Stock Alerts चे वेगळे कार्ड
      case 'lowStockAlerts':
        return (
          <div className="relative group">
            <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-background/80 backdrop-blur rounded-md p-1 shadow-sm z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'up')} disabled={index === 0}>⬆️</Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'down')} disabled={index === cardOrder.length - 1}>⬇️</Button>
            </div>
            <LowStockAlertsWidget />
          </div>
        );

      case 'recentInvoices':
        return (
          <div className="relative group">
            <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-background/80 backdrop-blur rounded-md p-1 shadow-sm z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'up')} disabled={index === 0}>⬆️</Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(index, 'down')} disabled={index === cardOrder.length - 1}>⬇️</Button>
            </div>
            <RecentInvoicesWidget />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="vy-ref-dashboard vy-page-dashboard mx-auto max-w-6xl space-y-5">
        
        <div className="text-xs text-muted-foreground px-1 flex items-center justify-between">
          <span>💡 डॅशबोर्डवरील कार्ड्स आवडीनुसार वर-खाली करू शकता.</span>
        </div>

        {cardOrder.map((cardId, index) => (
          <div key={cardId} className="transition-all duration-200">
            {renderCardContent(cardId, index)}
          </div>
        ))}

        <div className={cn(
          'pointer-events-none fixed left-1/2 bottom-[calc(5.15rem+env(safe-area-inset-bottom))] z-[60] flex -translate-x-1/2 items-center justify-center gap-2.5 lg:hidden transition-all duration-200 vy-dashboard-fab-actions',
          fabVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[5.5rem] opacity-0'
        )} aria-label="Sales and transactions">
          <Link
            href="/invoice?create=1"
            className="pointer-events-auto inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 px-6 py-3 text-sm font-semibold leading-none !text-white shadow-xl shadow-blue-500/30 hover:from-sky-600 hover:via-blue-700 hover:to-violet-700 border border-sky-300/70 transition-all duration-200 active:scale-95 vy-mobile-fab"
          >
            <FilePlus2 className="h-6 w-6 shrink-0 !text-white" strokeWidth={2.1} aria-hidden="true" />
            <span className="whitespace-nowrap">Sale</span>
          </Link>
          <AddTransactionDialog
            bankAccounts={bankAccounts}
            onAdd={addTransaction}
            trigger={
              <button
                type="button"
                className="pointer-events-auto inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-violet-600 px-6 py-3 text-sm font-semibold leading-none !text-white shadow-xl shadow-blue-500/30 hover:from-sky-600 hover:via-blue-700 hover:to-violet-700 border border-sky-300/70 transition-all duration-200 active:scale-95 vy-mobile-fab"
              >
                <ArrowLeftRight className="h-6 w-6 shrink-0 !text-white" strokeWidth={2.1} aria-hidden="true" />
                <span className="whitespace-nowrap">Transaction</span>
              </button>
            }
          />
        </div>

      </div>
    </>
  );
}