'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSettings } from './settings-context';
import { useAppData } from './app-data-context';
import { localizeBankingValue } from './i18n';
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Plus, Tag, Pencil, Trash2, Store, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Transaction, TransactionType, TxnCategory, ExpenseTag, BankAccount, ExpenseItem, ExpenseUnit } from './types';
import { generateId, GALLA_ID, CASH_IN_HAND_ID } from './mock-data';

interface Props { bankAccounts: BankAccount[]; onAdd: (txn: Transaction) => boolean | void; trigger?: React.ReactNode; }

const builtInExpense = ['Rent','Utilities','Groceries','Supplies','Maintenance','Transport','Food','Personal','Other'];
const builtInIncome = ['Salary','Business Revenue','Other'];
const expenseUnits: { value: ExpenseUnit; label: string }[] = [
  { value: 'pcs', label: 'नग' }, { value: 'kg', label: 'किलो' }, { value: 'g', label: 'ग्रॅम' },
  { value: 'ltr', label: 'लिटर' }, { value: 'ml', label: 'मिली' }, { value: 'box', label: 'बॉक्स' },
  { value: 'packet', label: 'पॅकेट' }, { value: 'dozen', label: 'डझन' }, { value: 'meter', label: 'मीटर' }, { value: 'other', label: 'इतर' },
];

const localDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function AddTransactionDialog({ bankAccounts, onAdd, trigger }: Props) {
  const { t, language, transactionCategories, addTransactionCategory, updateTransactionCategory, deleteTransactionCategory } = useSettings();
  const { transactions, subSavings } = useAppData();
  const [open,setOpen]=useState(false), [txnType,setTxnType]=useState<TransactionType>('Expense'), [amount,setAmount]=useState(''), [category,setCategory]=useState<TxnCategory>('Supplies'), [description,setDescription]=useState(''), [date,setDate]=useState(localDateKey()), [tag,setTag]=useState<ExpenseTag>('Shop / Business'), [sourceAccount,setSourceAccount]=useState(GALLA_ID), [destAccount,setDestAccount]=useState(''), [error,setError]=useState(''), [categoryDialog,setCategoryDialog]=useState(false), [newCategory,setNewCategory]=useState(''), [editingCategory,setEditingCategory]=useState<string|null>(null), [editingValue,setEditingValue]=useState(''), [shopName,setShopName]=useState(''), [expenseItems,setExpenseItems]=useState<ExpenseItem[]>([]), [itemName,setItemName]=useState(''), [itemCategory,setItemCategory]=useState<TxnCategory>('Supplies'), [itemQty,setItemQty]=useState('1'), [itemUnit,setItemUnit]=useState<ExpenseUnit>('pcs'), [itemRate,setItemRate]=useState(''), [editingItemId,setEditingItemId]=useState<string|null>(null), [itemCardOpen,setItemCardOpen]=useState(false), [expenseEntryMode,setExpenseEntryMode]=useState<'simple'|'items'>('simple');

  const availableCategories = useMemo(() => {
    if (txnType === 'Savings') return ['Daily Pigmy','RD','FD','Gold Savings'];
    return transactionCategories;
  }, [txnType, transactionCategories]);

  useEffect(()=>{ setCategory(txnType==='Income'?'Business Revenue':txnType==='Expense'?'Supplies':txnType==='Savings'?'Daily Pigmy':'Other'); setError(''); },[txnType]);
  const reset=()=>{setTxnType('Expense');setAmount('');setCategory('Supplies');setDescription('');setDate(localDateKey());setTag('Shop / Business');setSourceAccount(GALLA_ID);setDestAccount('');setError('');setShopName('');setExpenseItems([]);setItemName('');setItemCategory('Supplies');setItemQty('1');setItemUnit('pcs');setItemRate('');setEditingItemId(null);setItemCardOpen(false);setExpenseEntryMode('simple');};
  const expenseItemsTotal = useMemo(() => expenseItems.reduce((sum, item) => sum + Number(item.amount || 0), 0), [expenseItems]);
  const saveExpenseItem = () => {
    const name = itemName.trim(); const qty = Number(itemQty); const rate = Number(itemRate);
    if (!name || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(rate) || rate < 0) { setError(language === 'mr' ? 'वस्तूचे नाव, प्रमाण आणि किंमत भरा.' : 'Enter item name, quantity and rate.'); return; }
    const item: ExpenseItem = { id: editingItemId ?? generateId('expitem'), name, category: itemCategory, quantity: qty, unit: itemUnit, rate, amount: Math.round(qty * rate * 100) / 100 };
    setExpenseItems(prev => editingItemId ? prev.map(x => x.id === editingItemId ? item : x) : [...prev, item]);
    setItemName(''); setItemQty('1'); setItemUnit('pcs'); setItemRate(''); setEditingItemId(null); setItemCardOpen(false);
    setError('');
  };
  const openNewExpenseItem = () => { setEditingItemId(null); setItemName(''); setItemCategory(category); setItemQty('1'); setItemUnit('pcs'); setItemRate(''); setItemCardOpen(true); setError(''); };
  const editExpenseItem = (item: ExpenseItem) => { setEditingItemId(item.id); setItemCardOpen(true); setItemName(item.name); setItemCategory(item.category); setItemQty(String(item.quantity)); setItemUnit(item.unit); setItemRate(String(item.rate)); };
  const removeExpenseItem = (id: string) => setExpenseItems(prev => prev.filter(x => x.id !== id));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onAppBack = (event: Event) => {
      if (!open) return;
      event.preventDefault();
      setCategoryDialog(false);
      reset();
      setOpen(false);
    };
    window.addEventListener('vyaparos:back', onAppBack);
    return () => window.removeEventListener('vyaparos:back', onAppBack);
  }, [open]);
  const allSources=[
    {id:GALLA_ID,label:language==='mr'?'Galla (Cash Box)':'Galla (Cash Box)'},
    {id:CASH_IN_HAND_ID,label:language==='mr'?'Cash in Hand':'Cash in Hand'},
    ...bankAccounts.map(a=>({id:a.id,label:`${a.bankName} ••••${a.accountNumber.slice(-4)}`})),
  ];

  const submit=(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    setError('');
    const submitter=(e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const saveAndNew=submitter?.value==='save-new';
    const itemTotal = txnType === 'Expense' ? expenseItemsTotal : 0;
    const amt=parseFloat(amount)||0;
    const finalAmount = txnType === 'Expense' && expenseEntryMode === 'items' ? itemTotal : amt;
    if(finalAmount<=0){ setError(language === 'mr' ? (txnType==='Expense' && expenseEntryMode==='items' ? 'किमान एक Item भरा आणि Save करा.' : 'Amount भरा.') : (txnType==='Expense' && expenseEntryMode==='items' ? 'Add at least one item and save it.' : 'Enter the amount.')); return; }
    if(txnType === 'Expense' && expenseEntryMode === 'items' && expenseItems.length===0) { setError(language === 'mr' ? 'किमान एक Item Add करा.' : 'Add at least one item.'); return; }
    const txn:Transaction={id:generateId('txn'),type:txnType,amount:finalAmount,category,description:description.trim(),date,tag:(txnType==='Transfer'||txnType==='Savings')?null:tag,sourceAccountId:sourceAccount,destAccountId:(txnType==='Transfer'||txnType==='Savings')?(destAccount||null):null,isFromGalla:sourceAccount===GALLA_ID,shopName:txnType==='Expense'?shopName.trim():'',expenseItems:txnType==='Expense' && expenseEntryMode==='items'?expenseItems:[],createdAt:new Date().toISOString()};
    const ok=onAdd(txn);
    if(ok===false){setError(language==='mr'?'व्यवहार जतन करता आला नाही.':'The transaction could not be saved.');return;}
    reset();
    if(!saveAndNew) setOpen(false);
  };
  const addCat=()=>{ const value=newCategory.trim(); if(!value)return; addTransactionCategory(value); setCategory(value); setNewCategory(''); };
  const saveEdit=()=>{ if(!editingCategory)return; const value=editingValue.trim(); if(!value)return; updateTransactionCategory(editingCategory,value); if(category===editingCategory)setCategory(value); setEditingCategory(null); setEditingValue(''); };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{trigger ?? <Button><Plus className="mr-2 h-4 w-4"/>Add Transaction</Button>}</DialogTrigger>
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl mobile-entry-screen transaction-mobile-screen p-0 lg:p-6">
      {/* Desktop: unchanged */}
      <div className="hidden lg:block">
        <DialogHeader><DialogTitle>{t.addTransaction}</DialogTitle><DialogDescription>Record income, expense or transfer.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Tabs value={txnType} onValueChange={v=>setTxnType(v as TransactionType)}><TabsList className="grid w-full grid-cols-4"><TabsTrigger value="Expense"><ArrowUpCircle className="mr-1 h-3.5 w-3.5"/>Expense</TabsTrigger><TabsTrigger value="Income"><ArrowDownCircle className="mr-1 h-3.5 w-3.5"/>Income</TabsTrigger><TabsTrigger value="Savings"><span className="text-xs">Savings</span></TabsTrigger><TabsTrigger value="Transfer"><ArrowLeftRight className="mr-1 h-3.5 w-3.5"/>Transfer</TabsTrigger></TabsList></Tabs>
          <div className="grid grid-cols-[1.7fr_1fr] gap-3"><div className="space-y-1.5"><Label htmlFor="txn-amount">{txnType==='Expense' && expenseEntryMode==='items' ? 'Bill Total' : t.amountRupeeLabel}</Label><Input id="txn-amount" className="h-14 text-2xl font-bold" type="number" inputMode="decimal" placeholder="₹ 0" value={txnType==='Expense' && expenseEntryMode==='items' ? (expenseItemsTotal ? expenseItemsTotal.toFixed(2) : '') : amount} onChange={e=>txnType==='Expense' && expenseEntryMode==='items' ? null : setAmount(e.target.value)} min="0" step="0.01" readOnly={txnType==='Expense' && expenseEntryMode==='items'} required={!(txnType==='Expense' && expenseEntryMode==='items')} autoFocus/></div><div className="space-y-1.5"><Label htmlFor="txn-date" className="text-xs">{t.date}</Label><Input id="txn-date" className="h-10 px-2 text-xs" type="date" value={date} onChange={e=>setDate(e.target.value)} required/></div></div>
          {txnType!=='Transfer' && <div className="space-y-2"><div className="flex items-center justify-between"><Label><Tag className="mr-1 inline h-3.5 w-3.5"/>{t.categoryLabel}</Label><Button type="button" variant="outline" size="sm" onClick={()=>setCategoryDialog(true)}><Plus className="mr-1 h-3.5 w-3.5"/>Manage</Button></div><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableCategories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>}
          {txnType==='Expense' && <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/20 p-2"><Button type="button" variant={expenseEntryMode==='simple'?'default':'outline'} onClick={()=>{setExpenseEntryMode('simple');setExpenseItems([]);setItemCardOpen(false);}}>Simple Expense</Button><Button type="button" variant={expenseEntryMode==='items'?'default':'outline'} onClick={()=>{setExpenseEntryMode('items');setAmount('');}}>Itemized Bill</Button></div>}
          {txnType==='Expense' && expenseEntryMode==='items' && <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
             <div className="flex items-center gap-2"><Store className="h-4 w-4 text-primary"/><Label className="text-sm font-semibold">Shop / Store</Label></div>
             <Input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="उदा. ABC Kirana Store" />
             <div className="rounded-lg border bg-background p-3">
               <div className="mb-2 flex items-center justify-between"><Label className="text-sm">Expense Items</Label><span className="text-xs text-muted-foreground">{expenseItems.length ? `${expenseItems.length} items • ₹${expenseItemsTotal.toFixed(2)}` : 'एकाच खर्चासाठी थेट Amount भरा'}</span></div>
               {expenseItems.length>0 && <div className="mb-3 space-y-1.5">{expenseItems.map(item=><div key={item.id} className="flex items-center gap-2 rounded-lg border p-2 text-xs"><div className="min-w-0 flex-1"><b>{item.name}</b><span className="ml-1 text-muted-foreground">{item.quantity} {expenseUnits.find(u=>u.value===item.unit)?.label} × ₹{item.rate.toFixed(2)}</span><div className="text-[10px] text-muted-foreground">{item.category}</div></div><b>₹{item.amount.toFixed(2)}</b><Button type="button" variant="ghost" size="icon" onClick={()=>editExpenseItem(item)}><Pencil className="h-3.5 w-3.5"/></Button><Button type="button" variant="ghost" size="icon" onClick={()=>removeExpenseItem(item.id)}><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button></div>)}</div>}
               {itemCardOpen && <div className="rounded-xl border-2 border-primary/20 bg-muted/20 p-3">
                 <div className="mb-2 flex items-center justify-between"><Label className="text-sm font-semibold">{editingItemId?'Edit Item':'New Item'}</Label><Button type="button" variant="ghost" size="icon" onClick={()=>{setItemCardOpen(false);setEditingItemId(null);}}><X className="h-4 w-4"/></Button></div>
                 <div className="grid grid-cols-2 gap-2"><Input value={itemName} onChange={e=>setItemName(e.target.value)} placeholder="वस्तूचे नाव"/><Select value={itemCategory} onValueChange={setItemCategory}><SelectTrigger><SelectValue placeholder="Category"/></SelectTrigger><SelectContent>{availableCategories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                 <div className="mt-2 grid grid-cols-3 gap-2"><Input type="number" min="0" step="0.001" value={itemQty} onChange={e=>setItemQty(e.target.value)} placeholder="Qty"/><Select value={itemUnit} onValueChange={v=>setItemUnit(v as ExpenseUnit)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{expenseUnits.map(u=><SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent></Select><Input type="number" min="0" step="0.01" value={itemRate} onChange={e=>setItemRate(e.target.value)} placeholder="Rate ₹"/></div>
                 <Button type="button" variant="outline" className="mt-2 w-full" onClick={saveExpenseItem}><Plus className="mr-1 h-4 w-4"/>{editingItemId?'Update Item':'Save Item'}</Button>
               </div>}
               {!itemCardOpen && <Button type="button" variant="outline" className="w-full" onClick={openNewExpenseItem}><Plus className="mr-1 h-4 w-4"/>Add Item</Button>}
             </div>
           </div>}
          <div className="space-y-2"><Label>{txnType==='Transfer'?'Description':'Description / Note'}</Label><Input value={description} onChange={e=>setDescription(e.target.value)} placeholder="e.g. Milk for shop" required/></div>
          {txnType!=='Transfer' && txnType!=='Savings' && <div className="space-y-2"><Label>Personal vs Business</Label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setTag('Personal / House')} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${tag==='Personal / House'?'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300':'border-border'}`}>{localizeBankingValue('Personal / House',language)}</button><button type="button" onClick={()=>setTag('Shop / Business')} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${tag==='Shop / Business'?'border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300':'border-border'}`}>{localizeBankingValue('Shop / Business',language)}</button></div></div>}
          <div className="space-y-2"><Label>{txnType==='Income'?'Deposit To':txnType==='Expense'?'Paid From':txnType==='Savings'?'Save From':'From'}</Label><Select value={sourceAccount} onValueChange={setSourceAccount}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allSources.map(s=><SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select></div>
          {txnType==='Savings' && <div className="space-y-2"><Label>Save To</Label><Select value={destAccount} onValueChange={setDestAccount}><SelectTrigger><SelectValue placeholder="Select Pigmy / RD / FD / Gold account"/></SelectTrigger><SelectContent>{subSavings.map(s=><SelectItem key={s.id} value={s.id}>{s.schemeType} • {s.schemeNumber}</SelectItem>)}</SelectContent></Select></div>}
          {txnType==='Transfer' && <div className="space-y-2"><Label>To</Label><Select value={destAccount} onValueChange={setDestAccount}><SelectTrigger><SelectValue placeholder="Select destination account"/></SelectTrigger><SelectContent>{allSources.filter(s=>s.id!==sourceAccount).map(s=><SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select></div>}
          {txnType==='Expense'&&sourceAccount===GALLA_ID&&<div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">गल्ल्यात सध्या रक्कम कमी असली तरी खर्च जतन होईल. आवश्यक असल्यास उर्वरित रक्कम Automatic Galla Income म्हणून नोंदवली जाईल.</div>}
          {error&&<p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
          <DialogFooter><Button type="submit" value="save-new" variant="outline">Save &amp; New</Button><Button type="submit" value="save">{txnType==='Transfer'?t.transfer:txnType==='Savings'?'Add Savings':`${t.addTransaction}: ${txnType==='Income'?t.income:t.expense}`}</Button></DialogFooter>
        </form>
      </div>

      {/* Mobile: full-screen Add Transaction in the same compact style as Add Item */}
      <div className="flex min-h-[100dvh] flex-col lg:hidden">
        <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b bg-background px-4">
          <button type="button" className="mr-4 rounded-full p-1" onClick={()=>{reset();setOpen(false)}} aria-label="Back"><ArrowLeftRight className="h-5 w-5"/></button>
          <h2 className="flex-1 text-[18px] font-medium">{t.addTransaction}</h2>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto pb-24">
          <div className="border-b-[6px] border-sky-100 bg-background px-4 py-2.5">
            <div className="grid grid-cols-4 rounded-lg bg-muted/40 p-1">
              <button type="button" onClick={()=>setTxnType('Expense')} className={`h-9 rounded-md text-[12px] font-medium ${txnType==='Expense'?'bg-background text-primary shadow-sm':'text-muted-foreground'}`}>Expense</button>
              <button type="button" onClick={()=>setTxnType('Income')} className={`h-9 rounded-md text-[12px] font-medium ${txnType==='Income'?'bg-background text-primary shadow-sm':'text-muted-foreground'}`}>Income</button>
              <button type="button" onClick={()=>setTxnType('Savings')} className={`h-9 rounded-md text-[12px] font-medium ${txnType==='Savings'?'bg-background text-primary shadow-sm':'text-muted-foreground'}`}>Savings</button>
              <button type="button" onClick={()=>setTxnType('Transfer')} className={`h-9 rounded-md text-[12px] font-medium ${txnType==='Transfer'?'bg-background text-primary shadow-sm':'text-muted-foreground'}`}>Transfer</button>
            </div>
          </div>
          <div className="space-y-3 px-4 py-3">
            <div className="grid grid-cols-[1.55fr_1fr] gap-2">
              <div className="relative"><label className="absolute -top-1.5 left-2 z-10 bg-background px-1 text-[11px] text-primary">{t.amountRupeeLabel}</label><Input id="txn-mobile-amount" className="h-14 rounded-lg border-2 border-primary px-3 text-[18px] font-semibold" type="number" inputMode="decimal" placeholder="₹ 0" value={txnType==='Expense' && expenseEntryMode==='items' ? (expenseItemsTotal ? expenseItemsTotal.toFixed(2) : '') : amount} onChange={e=>txnType==='Expense' && expenseEntryMode==='items' ? null : setAmount(e.target.value)} min="0" step="0.01" readOnly={txnType==='Expense' && expenseEntryMode==='items'} required={!(txnType==='Expense' && expenseEntryMode==='items')} autoFocus/></div>
              <div className="relative"><label className="absolute -top-1.5 left-2 z-10 bg-background px-1 text-[11px] text-muted-foreground">{t.date}</label><Input className="h-14 rounded-lg px-2 text-[13px]" type="date" value={date} onChange={e=>setDate(e.target.value)} required/></div>
            </div>
          </div>

          {txnType!=='Transfer' && <section className="border-y-[6px] border-sky-100 bg-background">
            <div className="flex items-center justify-between px-4 py-2.5"><h3 className="text-[15px] font-semibold">{t.categoryLabel}</h3><button type="button" onClick={()=>setCategoryDialog(true)} className="text-[12px] font-medium text-primary">＋ Manage</button></div>
            <div className="px-4 pb-3"><Select value={category} onValueChange={setCategory}><SelectTrigger className="h-12 rounded-lg text-[14px]"><SelectValue/></SelectTrigger><SelectContent>{availableCategories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </section>}

          {txnType==='Expense' && <section className="border-y-[6px] border-sky-100 bg-background px-4 py-3"><div className="grid grid-cols-2 gap-2"><Button type="button" className="h-11" variant={expenseEntryMode==='simple'?'default':'outline'} onClick={()=>{setExpenseEntryMode('simple');setExpenseItems([]);setItemCardOpen(false);}}>Simple Expense</Button><Button type="button" className="h-11" variant={expenseEntryMode==='items'?'default':'outline'} onClick={()=>{setExpenseEntryMode('items');setAmount('');}}>Itemized Bill</Button></div></section>}
          {txnType==='Expense' && expenseEntryMode==='items' && <section className="border-y-[6px] border-sky-100 bg-background px-4 py-3">
             <div className="flex items-center gap-2 mb-2"><Store className="h-4 w-4 text-primary"/><h3 className="text-[15px] font-semibold">Shop / Store</h3></div>
             <Input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="दुकानाचे नाव" className="h-12 rounded-lg"/>
             <div className="mt-3 rounded-xl border p-3">
               <div className="flex items-center justify-between"><h4 className="text-[14px] font-semibold">Expense Items</h4><span className="text-[11px] text-muted-foreground">{expenseItems.length ? `₹${expenseItemsTotal.toFixed(2)} • ${expenseItems.length} items` : 'एकाच खर्चासाठी थेट Amount भरा'}</span></div>
               {expenseItems.length>0 && <div className="mt-2 space-y-1">{expenseItems.map(item=><div key={item.id} className="flex items-center gap-1.5 rounded-lg bg-muted/40 p-2 text-[11px]"><div className="min-w-0 flex-1"><b>{item.name}</b><span className="ml-1 text-muted-foreground">{item.quantity} {expenseUnits.find(u=>u.value===item.unit)?.label} × ₹{item.rate.toFixed(2)}</span></div><b>₹{item.amount.toFixed(2)}</b><button type="button" onClick={()=>editExpenseItem(item)}><Pencil className="h-3.5 w-3.5"/></button><button type="button" onClick={()=>removeExpenseItem(item.id)}><Trash2 className="h-3.5 w-3.5 text-destructive"/></button></div>)}</div>}
               {itemCardOpen && <div className="mt-2 rounded-xl border-2 border-primary/20 bg-muted/20 p-3">
                 <div className="flex items-center justify-between"><h4 className="text-[14px] font-semibold">{editingItemId?'Edit Item':'New Item'}</h4><button type="button" onClick={()=>{setItemCardOpen(false);setEditingItemId(null);}} aria-label="Close item card"><X className="h-4 w-4"/></button></div>
                 <Input className="mt-2 h-11" value={itemName} onChange={e=>setItemName(e.target.value)} placeholder="वस्तूचे नाव"/>
                 <Select value={itemCategory} onValueChange={setItemCategory}><SelectTrigger className="mt-2 h-11"><SelectValue placeholder="Category"/></SelectTrigger><SelectContent>{availableCategories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                 <div className="mt-2 grid grid-cols-3 gap-2"><Input type="number" min="0" step="0.001" value={itemQty} onChange={e=>setItemQty(e.target.value)} placeholder="प्रमाण"/><Select value={itemUnit} onValueChange={v=>setItemUnit(v as ExpenseUnit)}><SelectTrigger className="h-11"><SelectValue/></SelectTrigger><SelectContent>{expenseUnits.map(u=><SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent></Select><Input type="number" min="0" step="0.01" value={itemRate} onChange={e=>setItemRate(e.target.value)} placeholder="किंमत"/></div>
                 <Button type="button" variant="outline" className="mt-2 w-full" onClick={saveExpenseItem}><Plus className="mr-1 h-4 w-4"/>{editingItemId?'Update Item':'Save Item'}</Button>
               </div>}
               {!itemCardOpen && <Button type="button" variant="outline" className="mt-2 w-full" onClick={openNewExpenseItem}><Plus className="mr-1 h-4 w-4"/>Add Item</Button>}
             </div>
           </section>}
          <section className="bg-background px-4 py-3">
            <div className="space-y-3">
              <div className="relative"><label className="absolute -top-1.5 left-2 z-10 bg-background px-1 text-[11px] text-muted-foreground">{txnType==='Transfer'?'Description':'Description / Note'}</label><Input value={description} onChange={e=>setDescription(e.target.value)} placeholder="e.g. Milk for shop" className="h-12 rounded-lg text-[14px]" required/></div>
              {txnType!=='Transfer' && txnType!=='Savings' && <div><label className="mb-1.5 block text-[12px] font-medium">Personal vs Business</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setTag('Personal / House')} className={`h-11 rounded-lg border text-[13px] font-medium ${tag==='Personal / House'?'border-primary bg-primary/10 text-primary':'border-border'}`}>{localizeBankingValue('Personal / House',language)}</button><button type="button" onClick={()=>setTag('Shop / Business')} className={`h-11 rounded-lg border text-[13px] font-medium ${tag==='Shop / Business'?'border-primary bg-primary/10 text-primary':'border-border'}`}>{localizeBankingValue('Shop / Business',language)}</button></div></div>}
            </div>
          </section>

          <section className="border-y-[6px] border-sky-100 bg-background px-4 py-3">
            <h3 className="mb-2 text-[15px] font-semibold">{txnType==='Income'?'Deposit To':txnType==='Expense'?'Paid From':txnType==='Savings'?'Save From':'From'}</h3>
            <Select value={sourceAccount} onValueChange={setSourceAccount}><SelectTrigger className="h-12 rounded-lg text-[14px]"><SelectValue/></SelectTrigger><SelectContent>{allSources.map(s=><SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
            {txnType==='Savings' && <div className="mt-3"><label className="mb-1.5 block text-[12px] font-medium">Save To</label><Select value={destAccount} onValueChange={setDestAccount}><SelectTrigger className="h-12 rounded-lg text-[14px]"><SelectValue placeholder="Select Pigmy / RD / FD / Gold"/></SelectTrigger><SelectContent>{subSavings.map(s=><SelectItem key={s.id} value={s.id}>{s.schemeType} • {s.schemeNumber}</SelectItem>)}</SelectContent></Select></div>}
            {txnType==='Transfer' && <div className="mt-3"><label className="mb-1.5 block text-[12px] font-medium">To</label><Select value={destAccount} onValueChange={setDestAccount}><SelectTrigger className="h-12 rounded-lg text-[14px]"><SelectValue placeholder="Select destination account"/></SelectTrigger><SelectContent>{allSources.filter(s=>s.id!==sourceAccount).map(s=><SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select></div>}
          </section>

          {txnType==='Expense'&&sourceAccount===GALLA_ID&&<div className="mx-4 my-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-700 dark:text-emerald-400">गल्ल्यात सध्या रक्कम कमी असली तरी खर्च जतन होईल. आवश्यक असल्यास उर्वरित रक्कम Automatic Galla Income म्हणून नोंदवली जाईल.</div>}
          {error&&<p className="mx-4 my-3 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] font-medium text-destructive">{error}</p>}
        </form>
        <div className="mobile-entry-footer">
          <Button type="button" value="save-new" variant="outline" onClick={()=>{const form=document.getElementById('txn-mobile-amount')?.closest('form') as HTMLFormElement|null; if(form?.requestSubmit){const button=document.createElement('button'); button.type='submit'; button.value='save-new'; button.hidden=true; form.appendChild(button); form.requestSubmit(button); button.remove();}}}>Save &amp; New</Button>
          <Button type="button" value="save" className="mobile-entry-save" onClick={()=>{const form=document.getElementById('txn-mobile-amount')?.closest('form') as HTMLFormElement|null; if(form?.requestSubmit){const button=document.createElement('button'); button.type='submit'; button.value='save'; button.hidden=true; form.appendChild(button); form.requestSubmit(button); button.remove();}}}>{txnType==='Transfer'?t.transfer:txnType==='Savings'?'Add Savings':`${t.addTransaction}: ${txnType==='Income'?t.income:t.expense}`}</Button>
        </div>
      </div>
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Transaction Categories</DialogTitle><DialogDescription>Add, edit or delete your categories.</DialogDescription></DialogHeader><div className="space-y-3"><div className="flex gap-2"><Input value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="New category"/><Button type="button" onClick={addCat}><Plus className="h-4 w-4"/></Button></div><div className="max-h-64 space-y-2 overflow-y-auto">{transactionCategories.map(c=><div key={c} className="flex items-center gap-2 rounded-lg border p-2"><div className="min-w-0 flex-1">{editingCategory===c?<Input value={editingValue} onChange={e=>setEditingValue(e.target.value)}/>:<span className="text-sm">{c}</span>}</div>{editingCategory===c?<Button type="button" size="sm" onClick={saveEdit}>Save</Button>:<Button type="button" variant="ghost" size="icon" onClick={()=>{setEditingCategory(c);setEditingValue(c)}}><Pencil className="h-4 w-4"/></Button>}<Button type="button" variant="ghost" size="icon" disabled={transactions.some(t => t.category === c)} title={transactions.some(t => t.category === c) ? 'Category is used by a transaction' : 'Delete'} onClick={()=>{ if (!transactions.some(t => t.category === c)) deleteTransactionCategory(c); }}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>)}</div></div></DialogContent></Dialog>
    </DialogContent>
  </Dialog>;
}
