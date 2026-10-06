'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { renderToStaticMarkup } from 'react-dom/server';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, ChevronRight, FilePlus2, ImageDown, MoreVertical, Plus, Printer, ReceiptText, Search, Share2, ShoppingCart, Trash2, UserPlus, Pencil, ChevronDown, CalendarDays, Settings, X } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Printer as NativePrinter } from '@dimer47/capacitor-plugin-printer';

import { Button } from '@/components/ui/button';
import { NewItemDialog } from './sale-inline-dialogs';
import { AddPartyDialogContent, type PartyFormFields } from './party-dialog';
import { Dialog } from '@/components/ui/dialog';
import { useClickOutside } from '@/lib/use-click-outside';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { MobileFab } from './mobile-fab';
import { useSettings } from './settings-context';
import { useAppData, GALLA_ID } from './app-data-context';
import { generateId } from './mock-data';
import type { CartItem, Invoice, InventoryItem, LedgerEntry, LedgerParty, LedgerPartyType, POSProduct, Transaction } from './types';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
const Field = ({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <Input type={type} className="mt-1 h-11" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);
const today = () => new Date().toISOString().slice(0, 10);
const cleanPhone = (value: string) => value.replace(/\D/g, '').slice(0, 10);
const states = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

type Screen = 'list' | 'sale' | 'items' | 'new-item' | 'preview';
type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Credit/Pending';
type ValueMode = 'percentage' | 'fixed';
type InvoiceTheme = 'standard' | 'tally' | 'landscape';

interface InvoiceLine {
  id: string;
  product: POSProduct;
  quantity: number;
  inventoryItemId: string | null;
  taxRate: number;
  taxType: 'without' | 'with';
  discountMode: ValueMode;
  discountValue: number;
}

interface ItemDraft {
  name: string;
  category: string;
  hsnCode: string;
  unit: string;
  salePrice: string;
  purchasePrice: string;
  openingStock: string;
  minStock: string;
  taxRate: string;
  taxType: 'without' | 'with';
  quantity: string;
  discountValue: string;
}


function emptyItem(): ItemDraft {
  return { name: '', category: 'General', hsnCode: '', unit: 'pcs', salePrice: '', purchasePrice: '', openingStock: '0', minStock: '0', taxRate: '0', taxType: 'without', quantity: '1', discountValue: '0' };
}

function buildUpiLink(upiId: string, businessName: string, amount?: number) {
  if (!upiId) return '';
  const params = new URLSearchParams({ pa: upiId, pn: businessName || 'Business', cu: 'INR' });
  if (amount && amount > 0) params.set('am', amount.toFixed(2));
  return `upi://pay?${params.toString()}`;
}

function lineNumbers(line: InvoiceLine) {
  const qty = Math.max(0, Number(line.quantity) || 0);
  const rate = Math.max(0, Number(line.product.price) || 0);
  const gross = qty * rate;
  const discount = line.discountMode === 'percentage' ? gross * Math.max(0, line.discountValue) / 100 : Math.max(0, line.discountValue);
  const taxable = Math.max(0, gross - discount);
  const tax = line.taxType === 'with' ? taxable - taxable / (1 + Math.max(0, line.taxRate) / 100) : taxable * Math.max(0, line.taxRate) / 100;
  const net = line.taxType === 'with' ? taxable : taxable + tax;
  return { gross, discount, taxable, tax, net };
}

function toProduct(item: InventoryItem): POSProduct {
  return { id: item.id, name: item.name, price: item.sellingPrice, category: item.category, unit: item.unit, stock: item.stock, showOnPOS: item.showOnPOS, emoji: '📦', photoUrl: item.photoUrl };
}

function nextInvoiceNumber(invoices: Invoice[]) {
  let max = 0;
  for (const invoice of invoices) {
    const match = invoice.invoiceNumber.match(/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `INV-${String(max + 1).padStart(4, '0')}`;
}

export function InvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { businessProfile, t } = useSettings();
  const { bankAccounts, inventoryItems, ledgerParties, ledgerEntries, invoices, addInventoryItem, updateInventoryItem, addInvoice, updateInvoice, addLedgerParty, addLedgerEntry, deleteLedgerEntry, addTransaction, deleteTransaction, deleteInvoice } = useAppData();

  const [screen, setScreen] = useState<Screen>('list');
  // Prevent the old ?view=... search param from reopening the preview after Back.
  const skipNextViewParamRef = useRef(false);
  const [invoiceListSearch, setInvoiceListSearch] = useState('');
  const [invoiceListFilter, setInvoiceListFilter] = useState<'this-month' | 'this-week' | 'all'>('all');
  const [invoiceDateFilterOpen, setInvoiceDateFilterOpen] = useState(false);
  const invoiceSearchRef = useRef<HTMLInputElement | null>(null);
  const invoiceFilterRef = useRef<HTMLDivElement | null>(null);
  const closeInvoiceFilter = useCallback(() => setInvoiceDateFilterOpen(false), []);
  useClickOutside(invoiceFilterRef, closeInvoiceFilter, invoiceDateFilterOpen);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'Paid' | 'Pending' | 'Overdue'>('all');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('vyaparos:sale-screen', { detail: { open: screen !== 'list' } }));
    return () => {
      window.dispatchEvent(new CustomEvent('vyaparos:sale-screen', { detail: { open: false } }));
    };
  }, [screen]);
  const [invoiceTheme, setInvoiceTheme] = useState<InvoiceTheme>('standard');
  const [invoiceNumber, setInvoiceNumber] = useState(() => nextInvoiceNumber(invoices));
  const [date, setDate] = useState(today());
  const [creditMode, setCreditMode] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<LedgerParty | null>(null);
  const [customerError, setCustomerError] = useState<LedgerParty | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(emptyItem());
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [billDiscountMode, setBillDiscountMode] = useState<ValueMode>('fixed');
  const [billDiscountValue, setBillDiscountValue] = useState('0');
  const [billTaxMode, setBillTaxMode] = useState<ValueMode>('percentage');
  const [billTaxValue, setBillTaxValue] = useState('0');
  const [roundOff, setRoundOff] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>('Cash');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receiptTotalAmount, setReceiptTotalAmount] = useState('');
  const [supplyState, setSupplyState] = useState('');
  const [description, setDescription] = useState('');
  const [terms, setTerms] = useState('Goods once sold are not returnable unless otherwise agreed.');
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState('');
  const [savedInvoice, setSavedInvoice] = useState<Invoice | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState<LedgerPartyType>('Customer');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyEmail, setPartyEmail] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [partyUpiId, setPartyUpiId] = useState('');
  const [partyGstin, setPartyGstin] = useState('');
  const [partyNotes, setPartyNotes] = useState('');
  const [partyPhotoUrl, setPartyPhotoUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [itemQuery, setItemQuery] = useState('');
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const itemSearchRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const closeCustomerSearch = useCallback(() => setCustomerSearchOpen(false), []);
  const closeItemSearch = useCallback(() => setItemSearchOpen(false), []);
  useClickOutside(customerSearchRef, closeCustomerSearch, customerSearchOpen && !customerDialogOpen);
  useClickOutside(itemSearchRef, closeItemSearch, itemSearchOpen && screen === 'items');

  const loadInvoiceForEdit = useCallback((invoice: Invoice) => {
    // Enter a complete edit session from the saved invoice. Every persisted
    // invoice field is copied into the form so editing is not limited to the
    // customer/items only.
    setEditingInvoiceId(invoice.id);
    setInvoiceNumber(invoice.invoiceNumber);
    setDate(invoice.date);
    setCreditMode(invoice.paymentMethod === 'Credit/Pending');
    setCustomerQuery(invoice.customerName);
    setCustomerPhone(invoice.customerPhone || '');
    setCustomerAddress(invoice.customerAddress || '');
    setSelectedCustomer(invoice.customerId ? ledgerParties.find((party) => party.id === invoice.customerId) || null : null);
    setBillDiscountMode(invoice.discountMode || 'fixed');
    setBillDiscountValue(String(invoice.discountValue ?? 0));
    setBillTaxMode(invoice.taxMode || 'percentage');
    setBillTaxValue(String(invoice.taxValue ?? 0));
    setRoundOff(Boolean(invoice.roundOff));
    setPaymentMethod(invoice.paymentMethod as PaymentMode);
    setPaymentAccountId(invoice.paymentAccountId || '');
    setReceivedAmount(invoice.paymentStatus === 'Paid' ? String(invoice.total) : '');
    setReceiptTotalAmount(invoice.items.length === 0 ? String(invoice.total || 0) : '');
    setSupplyState(invoice.stateOfSupply || '');
    setDescription(invoice.description || '');
    setTerms(invoice.terms || 'Goods once sold are not returnable unless otherwise agreed.');
    setSignatureEnabled(invoice.signatureEnabled ?? true);
    setAttachmentName(invoice.attachmentName || '');
    setAttachmentDataUrl(invoice.attachmentDataUrl || '');
    setLines(invoice.items.map((raw) => {
      const item = raw as CartItem & { taxRate?: number; discountMode?: ValueMode; discountValue?: number };
      return { id: generateId('line'), product: item.product, quantity: Number(item.quantity) || 1, inventoryItemId: item.inventoryItemId || item.product.id || null, taxRate: Number(item.taxRate || 0), taxType: 'without' as const, discountMode: item.discountMode || 'percentage', discountValue: Number(item.discountValue || 0) };
    }));
  }, [ledgerParties]);

  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId) {
      if (skipNextViewParamRef.current) {
        skipNextViewParamRef.current = false;
        return;
      }
      const invoice = invoices.find((item) => item.id === viewId);
      if (invoice) { setSavedInvoice(invoice); setScreen('preview'); }
      return;
    }
    const editId = searchParams.get('edit');
    if (!editId) return;
    const invoice = invoices.find((item) => item.id === editId);
    if (!invoice) return;
    loadInvoiceForEdit(invoice);
  }, [searchParams, invoices, loadInvoiceForEdit, savedInvoice?.id]);

  const mainBank = useMemo(() => bankAccounts.find((b) => b.id === businessProfile.mainBankAccountId) ?? bankAccounts[0] ?? null, [bankAccounts, businessProfile.mainBankAccountId]);
  const paymentBank = useMemo(() => bankAccounts.find((b) => b.id === paymentAccountId) ?? null, [bankAccounts, paymentAccountId]);
  const getInvoiceBank = useCallback((invoice: Invoice) => {
    return bankAccounts.find((b) => b.id === invoice.paymentAccountId)
      ?? bankAccounts.find((b) => b.id === invoice.upiAccountId)
      ?? mainBank
      ?? bankAccounts[0]
      ?? null;
  }, [bankAccounts, mainBank]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const resetPageScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.querySelectorAll<HTMLElement>('[data-vy-scroll-container], .vy-page-invoice, .vy-page-invoice main, .transaction-mobile-screen, .transaction-mobile-screen main').forEach((el) => {
        if (el.scrollTop > 0) el.scrollTop = 0;
      });
    };
    resetPageScroll();
    const frame = requestAnimationFrame(resetPageScroll);
    return () => cancelAnimationFrame(frame);
  }, [screen]);
  const customerSuggestions = useMemo(() => {
    const rawQuery = customerQuery.trim();
    const q = rawQuery.toLowerCase();
    const selectedName = selectedCustomer?.name?.trim().toLowerCase();
    const showAll = !rawQuery || (!!selectedName && q === selectedName);

    return ledgerParties
      .filter((party) => party.type === 'Customer')
      .filter((party) => {
        if (showAll) return true;
        return party.name.toLowerCase().includes(q) || party.phone.includes(rawQuery);
      })
      .slice(0, 8);
  }, [customerQuery, ledgerParties, selectedCustomer]);
  const itemSuggestions = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    if (!q) return inventoryItems.slice(0, 8);
    return inventoryItems.filter((item) => item.name.toLowerCase().includes(q)).slice(0, 8);
  }, [inventoryItems, itemQuery]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + lineNumbers(line).taxable, 0), [lines]);
  const itemDiscount = useMemo(() => lines.reduce((sum, line) => sum + lineNumbers(line).discount, 0), [lines]);
  const itemTax = useMemo(() => lines.reduce((sum, line) => sum + lineNumbers(line).tax, 0), [lines]);
  const totalQty = useMemo(() => lines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity) || 0), 0), [lines]);
  const billTax = billTaxMode === 'percentage' ? subtotal * Math.max(0, Number(billTaxValue) || 0) / 100 : Math.max(0, Number(billTaxValue) || 0);
  const billDiscount = billDiscountMode === 'percentage' ? (subtotal + itemTax + billTax) * Math.max(0, Number(billDiscountValue) || 0) / 100 : Math.max(0, Number(billDiscountValue) || 0);
  const beforeRound = Math.max(0, subtotal + itemTax + billTax - billDiscount);
  const roundedTotal = roundOff ? Math.round(beforeRound) : beforeRound;
  const roundOffAmount = roundedTotal - beforeRound;
  const total = Math.max(0, roundedTotal);
  const customerBalance = useMemo(() => {
    if (!selectedCustomer) return 0;
    return selectedCustomer.openingBalance + ledgerEntries.filter((e) => e.partyId === selectedCustomer.id).reduce((sum, e) => sum + (e.type === 'Given' ? e.amount : -e.amount), 0);
  }, [ledgerEntries, selectedCustomer]);
  const isReceiptMode = lines.length === 0;
  const receiptTotal = Math.max(0, Number(receiptTotalAmount) || 0);
  const receiptReceived = Math.max(0, Number(receivedAmount) || 0);
  const receiptBalanceDue = Math.max(0, receiptTotal - receiptReceived);
  const received = isReceiptMode ? receiptReceived : (creditMode ? 0 : Math.min(total, Math.max(0, Number(receivedAmount) || total)));
  const balanceDue = isReceiptMode ? receiptBalanceDue : Math.max(0, total - received);
  const documentTotal = isReceiptMode ? receiptTotal : total;

  const selectCustomer = (party: LedgerParty) => {
    setSelectedCustomer(party); setCustomerQuery(party.name); setCustomerPhone(party.phone); setCustomerAddress(party.address); setCustomerError(null);
  };

  const openNewCustomer = () => {
    setPartyName(customerQuery.trim());
    setPartyType('Customer');
    setPartyPhone(customerPhone);
    setPartyEmail('');
    setPartyAddress(customerAddress);
    setPartyUpiId('');
    setPartyGstin('');
    setPartyNotes('Created from Sale / Invoice');
    setPartyPhotoUrl('');
    setCustomerSearchOpen(false);
    setCustomerDialogOpen(true);
  };

  const partyFields: PartyFormFields = {
    pName: partyName, setPName: setPartyName,
    pType: partyType, setPType: setPartyType,
    pPhone: partyPhone, setPPhone: (v) => setPartyPhone(cleanPhone(v)),
    pEmail: partyEmail, setPEmail: setPartyEmail,
    pAddress: partyAddress, setPAddress: setPartyAddress,
    pUpiId: partyUpiId, setPUpiId: setPartyUpiId,
    pGstin: partyGstin, setPGstin: setPartyGstin,
    pNotes: partyNotes, setPNotes: setPartyNotes,
    pPhotoUrl: partyPhotoUrl, setPPhotoUrl: setPartyPhotoUrl,
  };

  const saveInlineParty = () => {
    const normalizedPhone = cleanPhone(partyPhone);
    if (!partyName.trim()) { toast.error('Customer name is required.'); return; }
    if (normalizedPhone && normalizedPhone.length !== 10) { toast.error('Mobile number must contain 10 digits.'); return; }
    const duplicate = duplicatePhone(normalizedPhone);
    if (duplicate) { setCustomerError(duplicate); toast.error(`This mobile number is already registered with ${duplicate.name}.`); return; }
    const party: LedgerParty = {
      id: generateId('customer'), name: partyName.trim(), businessContactNumber: '', type: 'Customer', phone: normalizedPhone,
      email: partyEmail.trim(), address: partyAddress.trim(), photoUrl: partyPhotoUrl || null,
      upiId: partyUpiId.trim(), openingBalance: 0, gstin: partyGstin.trim(), notes: partyNotes.trim(), createdAt: new Date().toISOString(),
    };
    addLedgerParty(party);
    selectCustomer(party);
    setCustomerDialogOpen(false);
    toast.success('Customer Ledger मध्ये save झाला आणि Invoice मध्ये select झाला.');
  };

  const saveInlineItem = (item: InventoryItem, quantity: number, taxType: 'without' | 'with', discountPercent: number) => {
    addInventoryItem(item);
    const line: InvoiceLine = { id: generateId('line'), product: toProduct(item), quantity, inventoryItemId: item.id, taxRate: item.taxRate ?? 0, taxType, discountMode: 'percentage', discountValue: discountPercent };
    setLines((prev) => [...prev, line]);
    setItemQuery(item.name);
    setItemSearchOpen(false);
    toast.success('Inventory item save होऊन current Sale मध्ये add झाला.');
  };

  const duplicatePhone = (phone: string, currentId?: string) => {
    const normalized = cleanPhone(phone);
    if (normalized.length !== 10) return null;
    return ledgerParties.find((p) => p.type === 'Customer' && cleanPhone(p.phone) === normalized && p.id !== currentId) ?? null;
  };

  const handlePhone = (value: string) => {
    const phone = cleanPhone(value);
    setCustomerPhone(phone);
    setCustomerError(duplicatePhone(phone, selectedCustomer?.id));
  };

  const ensureCustomer = () => {
    const name = customerQuery.trim() || 'Walk-in Customer';
    const duplicate = duplicatePhone(customerPhone, selectedCustomer?.id);
    if (duplicate) { setCustomerError(duplicate); return null; }
    if (selectedCustomer) return selectedCustomer;
    if (name === 'Walk-in Customer') return null;
    const existing = ledgerParties.find((p) => p.type === 'Customer' && p.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const party: LedgerParty = { id: generateId('customer'), name, businessContactNumber: '', type: 'Customer', phone: cleanPhone(customerPhone), email: '', address: customerAddress.trim(), photoUrl: null, upiId: '', openingBalance: 0, notes: 'Created from Sale / Invoice', createdAt: new Date().toISOString() };
    addLedgerParty(party);
    return party;
  };

  const chooseItem = (item: InventoryItem) => {
    const target = editingLineId ? lines.find((l) => l.id === editingLineId) : null;
    if (target) {
      setLines((prev) => prev.map((line) => line.id === target.id ? { ...line, inventoryItemId: item.id, product: toProduct(item), taxRate: item.taxRate ?? 0 } : line));
    } else {
      setItemDraft((d) => ({ ...d, name: item.name, category: item.category, unit: item.unit, salePrice: String(item.sellingPrice), purchasePrice: String(item.purchasePrice), openingStock: String(item.stock), minStock: String(item.minStock), taxRate: String(item.taxRate ?? 0) }));
    }
    setItemQuery(item.name); setItemSearchOpen(false);
  };

  const addDraftLine = (returnToSale = false) => {
    const name = itemDraft.name.trim();
    const price = Number(itemDraft.salePrice) || 0;
    if (!name) { toast.error('Item name टाका.'); return; }
    if (price < 0) { toast.error('Sale price चुकीची आहे.'); return; }
    const existing = inventoryItems.find((i) => i.name.trim().toLowerCase() === name.toLowerCase());
    const product = existing ? toProduct(existing) : { id: generateId('product'), name, price, category: itemDraft.category || 'General', unit: itemDraft.unit || 'pcs', stock: Number(itemDraft.openingStock) || 0, showOnPOS: true, emoji: '📦' };
    const line: InvoiceLine = { id: generateId('line'), product, quantity: Math.max(1, Number(itemDraft.quantity) || 1), inventoryItemId: existing?.id ?? null, taxRate: Number(itemDraft.taxRate) || 0, taxType: itemDraft.taxType, discountMode: 'percentage', discountValue: Math.max(0, Number(itemDraft.discountValue) || 0) };
    setLines((prev) => [...prev, line]);
    setItemDraft(emptyItem()); setItemQuery('');
    if (returnToSale) setScreen('sale'); else toast.success('Item added. पुढील item जोडा.');
  };

  const saveNewInventoryItem = (returnToItems = true) => {
    const name = itemDraft.name.trim();
    if (!name) { toast.error('Item name टाका.'); return; }
    const existing = inventoryItems.find((i) => i.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) { toast.error('हा item Inventory मध्ये आधीच आहे.'); return; }
    const item: InventoryItem = { id: generateId('inv'), name, stock: Math.max(0, Number(itemDraft.openingStock) || 0), minStock: Math.max(0, Number(itemDraft.minStock) || 0), unit: itemDraft.unit || 'pcs', category: itemDraft.category || 'General', purchasePrice: Math.max(0, Number(itemDraft.purchasePrice) || 0), sellingPrice: Math.max(0, Number(itemDraft.salePrice) || 0), taxRate: Math.max(0, Number(itemDraft.taxRate) || 0), hsnCode: itemDraft.hsnCode, photoUrl: null, showOnPOS: true, createdAt: new Date().toISOString() };
    addInventoryItem(item);
    const line: InvoiceLine = { id: generateId('line'), product: toProduct(item), quantity: Math.max(1, Number(itemDraft.quantity) || 1), inventoryItemId: item.id, taxRate: item.taxRate ?? 0, taxType: itemDraft.taxType, discountMode: 'percentage', discountValue: Math.max(0, Number(itemDraft.discountValue) || 0) };
    setLines((prev) => [...prev, line]);
    setItemDraft(emptyItem());
    if (returnToItems) setScreen('items');
    toast.success('Inventory मध्ये item save करून Sale मध्ये जोडला.');
  };

  const updateLine = (id: string, patch: Partial<InvoiceLine>) => setLines((prev) => prev.map((line) => line.id === id ? { ...line, ...patch } : line));
  const removeLine = (id: string) => setLines((prev) => prev.filter((line) => line.id !== id));

  const startEditLine = (id: string) => {
    const line = lines.find((entry) => entry.id === id);
    if (!line) return;
    setEditingLineId(id);
    setItemQuery(line.product.name);
    setItemSearchOpen(false);
    setItemDraft({ ...emptyItem(), name: line.product.name, category: line.product.category || 'General', unit: line.product.unit || 'pcs', salePrice: String(line.product.price ?? 0), taxRate: String(line.taxRate ?? 0), taxType: line.taxType, quantity: String(line.quantity ?? 1), discountValue: String(line.discountMode === 'percentage' ? line.discountValue : 0) });
    setScreen('items');
  };

  const saveEditedLine = () => {
    if (!editingLineId) return;
    const name = itemDraft.name.trim();
    const quantity = Math.max(0, Number(itemDraft.quantity) || 0);
    if (!name) { toast.error('Item name टाका.'); return; }
    if (quantity <= 0) { toast.error('Quantity 0 पेक्षा जास्त असावी.'); return; }
    const price = Math.max(0, Number(itemDraft.salePrice) || 0);
    const taxRate = Math.max(0, Number(itemDraft.taxRate) || 0);
    const discountValue = Math.max(0, Number(itemDraft.discountValue) || 0);
    setLines((prev) => prev.map((line) => line.id === editingLineId ? { ...line, product: { ...line.product, name, category: itemDraft.category || line.product.category, unit: itemDraft.unit || line.product.unit, price }, quantity, taxRate, taxType: itemDraft.taxType, discountMode: 'percentage', discountValue } : line));
    setEditingLineId(null); setItemDraft(emptyItem()); setItemQuery(''); setScreen('sale');
    toast.success('Item updated.');
  };

  const deleteEditingLine = () => {
    if (!editingLineId) return;
    setLines((prev) => prev.filter((line) => line.id !== editingLineId));
    setEditingLineId(null); setItemDraft(emptyItem()); setItemQuery(''); setScreen('sale');
    toast.success('Item deleted.');
  };

  const buildInvoice = (party: LedgerParty | null): Invoice => ({
    id: editingInvoiceId || generateId('invoice'), invoiceNumber: invoiceNumber.trim() || nextInvoiceNumber(invoices), items: lines.map((line) => { const n = lineNumbers(line); return { ...line, product: { ...line.product, price: Number(line.product.price) || 0 }, quantity: Number(line.quantity) || 0, taxAmount: n.tax, lineAmount: n.net }; }) as CartItem[], subtotal: isReceiptMode ? 0 : subtotal, discount: isReceiptMode ? 0 : itemDiscount + billDiscount, total: documentTotal, paymentMethod: creditMode ? 'Credit/Pending' : paymentMethod, date, createdAt: editingInvoiceId ? (invoices.find((entry) => entry.id === editingInvoiceId)?.createdAt || new Date().toISOString()) : new Date().toISOString(), customerName: party?.name ?? (customerQuery.trim() || 'Walk-in Customer'), customerId: party?.id ?? null, customerPhone, customerAddress, taxMode: isReceiptMode ? 'fixed' : billTaxMode, taxValue: isReceiptMode ? 0 : (Number(billTaxValue) || 0), taxAmount: isReceiptMode ? 0 : (itemTax + billTax), discountMode: billDiscountMode, discountValue: isReceiptMode ? 0 : (Number(billDiscountValue) || 0), roundOff: isReceiptMode ? false : roundOff, roundOffAmount: isReceiptMode ? 0 : roundOffAmount, paymentAccountId: creditMode ? null : (paymentMethod === 'Cash' ? GALLA_ID : paymentAccountId || null), paymentStatus: isReceiptMode ? (balanceDue > 0 ? 'Pending' : 'Paid') : (creditMode || balanceDue > 0 ? 'Pending' : 'Paid'), balanceDue, terms, signatureEnabled, upiAccountId: mainBank?.id ?? null, transactionId: null, stateOfSupply: supplyState, description, attachmentName, attachmentDataUrl,
  });

  const reverseInvoiceEffects = (invoice: Invoice, restoreStock = true) => {
    if (restoreStock) for (const raw of invoice.items) {
      const line = raw as CartItem & { inventoryItemId?: string | null };
      const inventoryId = line.inventoryItemId || line.product.id;
      const item = inventoryItems.find((entry) => entry.id === inventoryId);
      if (item) updateInventoryItem({ ...item, stock: item.stock + Math.max(0, Number(line.quantity) || 0) });
    }
    ledgerEntries.filter((entry) => entry.description.startsWith(`${invoice.invoiceNumber} —`)).forEach((entry) => {
      // deleteLedgerEntry is supplied by AppDataContext in the latest build; guard for older contexts.
      try { (deleteLedgerEntry as (id: string) => void)(entry.id); } catch {}
    });
    if (invoice.transactionId) deleteTransaction(invoice.transactionId);
  };

  const commitInvoice = async (goPreview: boolean): Promise<Invoice | null> => {
    if (busy) return null;
    if (isReceiptMode) {
      if (receiptTotal <= 0) { toast.error('जमा पावतीसाठी Total Amount ₹0 पेक्षा जास्त असणे आवश्यक आहे.'); return null; }
      if (receiptReceived <= 0) { toast.error('जमा पावतीसाठी Received Amount टाका.'); return null; }
      if (receiptReceived > receiptTotal) { toast.error('Received Amount हा Total Amount पेक्षा जास्त असू शकत नाही.'); return null; }
      if (creditMode) { toast.error('जमा पावतीसाठी Credit/Pending निवडता येणार नाही.'); return null; }
    } else if (total <= 0) { toast.error('Bill total ₹0 पेक्षा जास्त असणे आवश्यक आहे.'); return null; }
    if (!creditMode && paymentMethod !== 'Cash' && !paymentAccountId) { toast.error('Bank / UPI / Cheque साठी account निवडा.'); return null; }
    const duplicate = duplicatePhone(customerPhone, selectedCustomer?.id);
    if (duplicate) { setCustomerError(duplicate); toast.error('हा mobile number दुसऱ्या customer कडे आहे.'); return null; }
    setBusy(true);
    try {
      const party = ensureCustomer();
      if (customerError) throw new Error('Customer mobile validation failed.');
      const previousInvoice = editingInvoiceId ? invoices.find((entry) => entry.id === editingInvoiceId) || null : null;
      if (previousInvoice) reverseInvoiceEffects(previousInvoice, false);
      const invoice = buildInvoice(party);
      const invoiceTxnId = generateId('txn');
      invoice.transactionId = creditMode || received <= 0 ? null : invoiceTxnId;
      if (previousInvoice) updateInvoice(invoice); else addInvoice(invoice);

      const stockDelta = new Map<string, number>();
      if (previousInvoice) {
        for (const raw of previousInvoice.items) {
          const line = raw as CartItem & { inventoryItemId?: string | null };
          const id = line.inventoryItemId || line.product.id;
          stockDelta.set(id, (stockDelta.get(id) || 0) + Math.max(0, Number(line.quantity) || 0));
        }
      }
      for (const line of lines) {
        if (!line.inventoryItemId) continue;
        stockDelta.set(line.inventoryItemId, (stockDelta.get(line.inventoryItemId) || 0) - Math.max(0, Number(line.quantity) || 0));
      }
      for (const [id, delta] of stockDelta) {
        const item = inventoryItems.find((entry) => entry.id === id);
        if (item && delta !== 0) updateInventoryItem({ ...item, stock: Math.max(0, item.stock + delta) });
      }

      if (party && !isReceiptMode && balanceDue > 0) {
        const entry: LedgerEntry = { id: generateId('ledger'), partyId: party.id, type: 'Given', amount: balanceDue, description: `${invoice.invoiceNumber} — Receivable`, date, createdAt: new Date().toISOString() };
        addLedgerEntry(entry);
      }
      if (party && received > 0) {
        const entry: LedgerEntry = { id: generateId('ledger'), partyId: party.id, type: 'Received', amount: received, description: `${invoice.invoiceNumber} — Payment Received`, date, createdAt: new Date().toISOString() };
        addLedgerEntry(entry);
      }
      if (!creditMode && received > 0) {
        const sourceAccountId = paymentMethod === 'Cash' ? GALLA_ID : paymentAccountId;
        const txn: Transaction = { id: invoiceTxnId, type: 'Income', amount: received, category: 'Business Revenue', description: `Invoice ${invoice.invoiceNumber} — ${invoice.customerName}`, date, tag: 'Shop / Business', sourceAccountId, destAccountId: null, isFromGalla: paymentMethod === 'Cash', createdAt: new Date().toISOString() };
        addTransaction(txn);
      }
      setSavedInvoice(invoice);
      // Keep the URL synchronized with the invoice currently being displayed.
      // This prevents a stale ?view=<old-id> from reopening the previous bill
      // after a different invoice is selected or a new sale is saved.
      if (goPreview) {
        router.replace(`/invoice?view=${encodeURIComponent(invoice.id)}`);
        setScreen('preview');
      } else {
        router.replace('/invoice');
      }
      toast.success(editingInvoiceId ? `${invoice.invoiceNumber} update झाले.` : `${invoice.invoiceNumber} save झाले.`);
      return invoice;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invoice save failed.');
      return null;
    } finally { setBusy(false); }
  };

  const saveAndShare = async () => {
    const invoice = await commitInvoice(false);
    if (invoice) await shareInvoice(invoice);
  };

  const saveAndPrint = async () => {
    const invoice = await commitInvoice(false);
    if (invoice) printInvoice(invoice);
  };

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    reset();
    setScreen('sale');
  }, [searchParams]);

  const reset = () => {
    setEditingInvoiceId(null);
    setScreen('sale'); setInvoiceNumber(nextInvoiceNumber([...invoices, ...(savedInvoice ? [savedInvoice] : [])])); setDate(today()); setCreditMode(false); setCustomerQuery(''); setCustomerPhone(''); setCustomerAddress(''); setSelectedCustomer(null); setCustomerError(null); setLines([]); setBillDiscountValue('0'); setBillTaxValue('0'); setRoundOff(false); setPaymentMethod('Cash'); setPaymentAccountId(''); setReceivedAmount(''); setReceiptTotalAmount(''); setSupplyState(''); setDescription(''); setAttachmentName(''); setAttachmentDataUrl(''); setSavedInvoice(null);
  };

  const openItems = () => { setSavedInvoice(null); setScreen('items'); };
  const back = () => {
    if (screen === 'items' || screen === 'new-item') {
      setScreen('sale');
      return;
    }
    if (screen === 'sale') {
      setScreen('list');
      return;
    }
    // The invoice header Back button is a root-level navigation action.
    // Always return to Dashboard instead of restoring an older /invoice?view=...
    // history entry.
    router.push('/');
  };
  const openCreateInvoice = () => {
    reset();
    router.replace('/invoice?create=1');
  };

  const createInvoiceImage = async (invoice: Invoice): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const isReceipt = invoice.items.length === 0;
    const landscape = !isReceipt && invoiceTheme === 'landscape';
    const imageBank = getInvoiceBank(invoice) ?? bankAccounts[0] ?? null;
    canvas.width = landscape ? 1600 : 1100;
    canvas.height = isReceipt ? 1200 : (landscape ? 1650 : Math.max(2200, 1450 + invoice.items.length * 70));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#111827';
    ctx.font = '700 30px Arial'; ctx.fillText(businessProfile.businessName || 'Business', 50, 60);
    ctx.font = '18px Arial'; ctx.fillStyle = '#4b5563'; ctx.fillText((businessProfile.businessAddress || '').slice(0, 85), 50, 90); ctx.fillText(`${businessProfile.phone || ''}${businessProfile.gstin ? ` • GSTIN ${businessProfile.gstin}` : ''}`, 50, 118);
    ctx.fillStyle = '#111827'; ctx.font = '700 28px Arial'; ctx.textAlign = 'right'; ctx.fillText(isReceipt ? 'PAYMENT RECEIPT' : 'TAX INVOICE', canvas.width - 50, 60); ctx.font = '18px Arial'; ctx.fillText(invoice.invoiceNumber, canvas.width - 50, 90); ctx.fillText(new Date(invoice.date).toLocaleDateString('en-IN'), canvas.width - 50, 118); ctx.textAlign = 'left';
    let y = 165; ctx.strokeStyle = '#d1d5db'; ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(canvas.width - 50, y); ctx.stroke(); y += 45;
    ctx.font = '700 19px Arial'; ctx.fillStyle = '#111827'; ctx.fillText(`Customer: ${invoice.customerName}`, 50, y); ctx.font = '16px Arial'; ctx.fillStyle = '#4b5563';
    if (invoice.customerPhone) { ctx.fillText(`Mobile: ${invoice.customerPhone}`, 50, y + 28); }
    y += isReceipt ? 80 : 75;
    if (isReceipt) {
      ctx.fillStyle = '#111827'; ctx.font = '17px Arial';
      ctx.fillText(`Received Amount: ${money(invoice.total)}`, 50, y);
      ctx.fillText(`Payment Type: ${invoice.paymentMethod}`, 50, y + 34);
      ctx.fillText(`Balance Due: ${money(Number(invoice.balanceDue || 0))}`, 50, y + 68);
      if (invoice.description) { ctx.fillText(`Notes: ${invoice.description.slice(0, 90)}`, 50, y + 102); }
    } else {
      ctx.fillStyle = '#f3f4f6'; ctx.fillRect(50, y - 25, canvas.width - 100, 42); ctx.fillStyle = '#111827'; ctx.font = '700 15px Arial'; ctx.fillText('Item', 65, y); ctx.fillText('Qty', canvas.width - 390, y); ctx.fillText('Rate', canvas.width - 300, y); ctx.fillText('Tax', canvas.width - 210, y); ctx.fillText('Amount', canvas.width - 120, y); y += 50;
      ctx.font = '15px Arial';
      for (const raw of invoice.items) { const line = raw as CartItem & { taxRate?: number; discountValue?: number; discountMode?: ValueMode }; const amount = Number(line.lineAmount ?? line.quantity * line.product.price); ctx.fillStyle = '#111827'; ctx.fillText(line.product.name.slice(0, 48), 65, y); ctx.fillText(String(line.quantity), canvas.width - 390, y); ctx.fillText(money(line.product.price), canvas.width - 300, y); ctx.fillText(`${Number(line.taxRate ?? 0)}%`, canvas.width - 210, y); ctx.fillText(money(amount), canvas.width - 120, y); y += 42; ctx.strokeStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(50, y - 22); ctx.lineTo(canvas.width - 50, y - 22); ctx.stroke(); }
      y += 25; ctx.textAlign = 'right'; ctx.font = '17px Arial'; ctx.fillStyle = '#374151'; ctx.fillText(`Subtotal: ${money(invoice.subtotal)}`, canvas.width - 50, y); y += 28; ctx.fillText(`Tax: ${money(invoice.taxAmount || 0)}`, canvas.width - 50, y); y += 28; ctx.fillText(`Discount: -${money(invoice.discount)}`, canvas.width - 50, y); y += 35; ctx.font = '700 25px Arial'; ctx.fillStyle = '#111827'; ctx.fillText(`TOTAL: ${money(invoice.total)}`, canvas.width - 50, y); ctx.textAlign = 'left';
      y += 60; ctx.font = '700 16px Arial'; ctx.fillText(`Payment: ${invoice.paymentMethod} • ${invoice.paymentStatus || 'Paid'}`, 50, y); if (invoice.stateOfSupply) { y += 25; ctx.font = '15px Arial'; ctx.fillText(`State of Supply: ${invoice.stateOfSupply}`, 50, y); }
    }
    // Render bank/payment details as a visible section in the PNG itself (not only in the Preview DOM).
    // Resolve the saved invoice account first, then the configured main/first bank as a safe fallback.
    const bankY = Math.max(y + 70, isReceipt ? 430 : y + 70);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(50, bankY - 35, canvas.width - 100, 210);
    ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = 2;
    ctx.strokeRect(50, bankY - 35, canvas.width - 100, 210);
    ctx.fillStyle = '#111827'; ctx.font = '700 20px Arial'; ctx.fillText('Bank Details', 75, bankY);
    ctx.font = '15px Arial'; ctx.fillStyle = '#334155';
    if (imageBank) {
      const holder = imageBank.accountHolderName || businessProfile.ownerName || '';
      const accountLast4 = imageBank.accountNumber ? String(imageBank.accountNumber).slice(-4) : '';
      ctx.fillText(`Bank: ${imageBank.bankName || 'Bank'}`, 75, bankY + 30);
      ctx.fillText(`A/C Holder: ${holder || '—'}`, 75, bankY + 56);
      ctx.fillText(`A/C: ${accountLast4 ? `••••${accountLast4}` : '—'}`, 75, bankY + 82);
      ctx.fillText(`IFSC: ${imageBank.ifscCode || '—'}`, 75, bankY + 108);
      ctx.fillText(`UPI ID: ${imageBank.upiId || '—'}`, 75, bankY + 134);
    } else {
      ctx.fillText('Bank details not configured', 75, bankY + 40);
    }
    if (invoice.terms && !isReceipt) { ctx.font = '12px Arial'; ctx.fillStyle = '#64748b'; ctx.fillText(invoice.terms.slice(0, 120), 75, bankY + 160); }
    // Generate QR independently of the Preview DOM.
    if (imageBank?.upiId) {
      try {
        const qrMarkupForImage = renderToStaticMarkup(<QRCodeSVG value={buildUpiLink(imageBank.upiId, businessProfile.businessName, invoice.total)} size={130} includeMargin />);
        const svgBlob = new Blob([qrMarkupForImage], { type: 'image/svg+xml;charset=utf-8' });
        const qrUrl = URL.createObjectURL(svgBlob);
        const qrImage = new window.Image();
        await new Promise<void>((resolve) => { qrImage.onload = () => resolve(); qrImage.onerror = () => resolve(); qrImage.src = qrUrl; });
        if (qrImage.complete && qrImage.naturalWidth > 0) {
          const qrSize = 130;
          ctx.drawImage(qrImage, canvas.width - 75 - qrSize, bankY - 15, qrSize, qrSize);
          ctx.font = '11px Arial'; ctx.fillStyle = '#64748b'; ctx.textAlign = 'center'; ctx.fillText('Scan to Pay', canvas.width - 75 - qrSize / 2, bankY + 130); ctx.textAlign = 'left';
        }
        URL.revokeObjectURL(qrUrl);
      } catch {}
    }
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Image generation failed')), 'image/png', 0.95));
  };

  const shareInvoice = async (invoice: Invoice) => {
    const shareBank = getInvoiceBank(invoice);
    const upi = shareBank?.upiId || '';
    const text = [businessProfile.businessName, `Invoice: ${invoice.invoiceNumber}`, `Customer: ${invoice.customerName}`, `Total: ${money(invoice.total)}`, `Payment: ${invoice.paymentMethod} (${invoice.paymentStatus || 'Paid'})`, upi ? `UPI: ${upi}` : ''].filter(Boolean).join('\n');
    setBusy(true);
    try {
      const blob = await createInvoiceImage(invoice);
      const file = new File([blob], `${invoice.invoiceNumber}.png`, { type: 'image/png' });
      if (Capacitor.isNativePlatform()) {
        await nativeShareFile(blob, `${invoice.invoiceNumber}.png`, 'image/png', text);
        toast.success('Invoice image share करण्यासाठी उघडले.');
      } else if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: invoice.invoiceNumber, text, files: [file] });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${invoice.invoiceNumber}.png`; a.click(); URL.revokeObjectURL(url);
        toast.success('WhatsApp text + invoice image तयार झाले.');
      }
    } catch (error) { if ((error as DOMException)?.name !== 'AbortError') toast.error(error instanceof Error ? error.message : 'Share failed.'); }
    finally { setBusy(false); }
  };

  const downloadImage = async (invoice: Invoice) => {
    try {
      const blob = await createInvoiceImage(invoice);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}.png`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1200);
      toast.success('Invoice image downloaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed.');
    }
  };

  const shareInvoiceWhatsApp = async (invoice: Invoice) => {
    const text = [businessProfile.businessName || 'Business', `Invoice: ${invoice.invoiceNumber}`, `Customer: ${invoice.customerName}`, `Total: ${money(invoice.total)}`, `Payment: ${invoice.paymentMethod} (${invoice.paymentStatus || 'Paid'})`].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const renderA4InvoiceCanvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
    // Always render from a fixed A4 CSS canvas (794 x 1123px) so mobile exports are
    // still physically A4 when saved as PNG/PDF. The visible preview remains responsive.
    const A4_W = 794;
    const A4_H = 1123;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    clone.style.width = `${A4_W}px`;
    clone.style.maxWidth = `${A4_W}px`;
    clone.style.minWidth = `${A4_W}px`;
    clone.style.minHeight = `${A4_H}px`;
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.background = '#ffffff';
    clone.style.boxShadow = 'none';
    clone.style.position = 'absolute';
    clone.style.left = '-10000px';
    clone.style.top = '0';
    clone.style.zIndex = '-1';
    const cloneInner = clone.firstElementChild as HTMLElement | null;
    if (cloneInner) {
      cloneInner.style.minHeight = `${A4_H}px`;
      cloneInner.style.padding = '30px'; // 8mm at 96 CSS px/in, kept equal on all four sides.
      cloneInner.style.boxSizing = 'border-box';
    }
    clone.querySelectorAll<HTMLElement>('*').forEach((node) => {
      node.style.animation = 'none';
      node.style.transition = 'none';
    });
    document.body.appendChild(clone);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const source = await html2canvas(clone, {
        scale: 2,
        width: A4_W,
        windowWidth: A4_W,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 20000,
        scrollX: 0,
        scrollY: 0,
      });

      // Normalize to an exact 2480 x 3508 A4 PNG canvas (300 DPI equivalent).
      const out = document.createElement('canvas');
      out.width = 2480;
      out.height = 3508;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('A4 canvas unavailable.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      const scale = Math.min(out.width / source.width, out.height / source.height);
      const drawW = Math.round(source.width * scale);
      const drawH = Math.round(source.height * scale);
      const x = Math.round((out.width - drawW) / 2);
      const y = 0;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, x, y, drawW, drawH);
      return out;
    } finally {
      clone.remove();
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('File read failed.'));
    reader.readAsDataURL(blob);
  });

  const nativeShareFile = async (blob: Blob, filename: string, mimeType: string, text: string) => {
    const base64 = await blobToBase64(blob);
    const saved = await Filesystem.writeFile({
      path: `VyaparOS/${filename}`,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: filename,
      text,
      url: saved.uri,
      dialogTitle: 'VyaparOS Export',
    });
  };

  const exportInvoiceFromDom = async (invoice: Invoice, format: 'png' | 'pdf', element: HTMLElement | null) => {
    if (!element) { toast.error('Invoice preview तयार नाही.'); return; }
    setBusy(true);
    try {
      const canvas = await renderA4InvoiceCanvas(element);
      if (format === 'png') {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
        if (!blob) throw new Error('PNG तयार झाले नाही.');
        const filename = `${invoice.invoiceNumber}-A4.png`;
        if (Capacitor.isNativePlatform()) {
          await nativeShareFile(blob, filename, 'image/png', `VyaparOS Invoice ${invoice.invoiceNumber}`);
          toast.success('Invoice PNG share/save करण्यासाठी उघडले.');
        } else {
          downloadBlob(blob, filename);
          toast.success('A4 Invoice PNG saved.');
        }
      } else {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        if (Capacitor.isNativePlatform()) {
          const pdfBlob = pdf.output('blob') as Blob;
          await nativeShareFile(pdfBlob, `${invoice.invoiceNumber}-A4.pdf`, 'application/pdf', `VyaparOS Invoice ${invoice.invoiceNumber}`);
          toast.success('Invoice PDF share/save करण्यासाठी उघडले.');
        } else {
          pdf.save(`${invoice.invoiceNumber}-A4.pdf`);
          toast.success('A4 Invoice PDF saved.');
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed.');
    } finally { setBusy(false); }
  };

  const printInvoiceFromDom = async (element: HTMLElement | null) => {
    if (!element) { toast.error('Invoice preview तयार नाही.'); return; }

    if (Capacitor.isNativePlatform()) {
      setBusy(true);
      try {
        const canvas = await renderA4InvoiceCanvas(element);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        const dataUri = pdf.output('datauristring');
        const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
        await NativePrinter.printBase64({
          name: 'VyaparOS Invoice',
          data: base64,
          mimeType: 'application/pdf',
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Print failed.');
      } finally {
        setBusy(false);
      }
      return;
    }

    const body = document.body;
    const cleanup = () => {
      body.classList.remove('printing-invoice');
      window.removeEventListener('afterprint', cleanup);
    };
    body.classList.add('printing-invoice');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(() => {
      try { window.print(); } catch (error) { cleanup(); toast.error(error instanceof Error ? error.message : 'Print failed.'); }
    }, 120);
  };

  const printInvoice = (invoice: Invoice) => {
    // Save & Print first switches to the same preview DOM used by the Print button.
    // This avoids popup blockers and works much more reliably on Android/iOS browsers.
    setSavedInvoice(invoice);
    setScreen('preview');
    window.setTimeout(() => {
      const element = document.getElementById('invoice-preview-export');
      printInvoiceFromDom(element);
    }, 450);
  };

  const deletePreviewInvoice = (invoice: Invoice) => {
    const confirmed = window.confirm(`Delete ${invoice.invoiceNumber}? This will remove the invoice and reverse its stock/accounting effects.`);
    if (!confirmed) return;
    reverseInvoiceEffects(invoice, true);
    deleteInvoice(invoice.id);
    setSavedInvoice(null);
    setEditingInvoiceId(null);
    setScreen('list');
    router.replace('/invoice');
    toast.success(`${invoice.invoiceNumber} deleted.`);
  };

  const handleAttachment = (file?: File) => { if (!file) return; setAttachmentName(file.name); const reader = new FileReader(); reader.onload = () => setAttachmentDataUrl(String(reader.result || '')); reader.readAsDataURL(file); };

  if (screen === 'list') {
    const now = new Date();
    const search = invoiceListSearch.toLowerCase();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    const mondayOffset = (todayStart.getDay() + 6) % 7;
    weekStart.setDate(todayStart.getDate() - mondayOffset);
    const isOverdue = (invoice: Invoice) => {
      const status = invoice.paymentStatus || (Number(invoice.balanceDue || 0) > 0 ? 'Pending' : 'Paid');
      return status === 'Pending' && new Date(invoice.date) < todayStart;
    };
    const listInvoices = [...invoices]
      .filter((invoice) => {
        const matchesSearch = !search || [invoice.invoiceNumber, invoice.customerName, invoice.customerPhone].some((value) => String(value || '').toLowerCase().includes(search));
        if (!matchesSearch) return false;
        const d = new Date(invoice.date);
        if (invoiceListFilter === 'this-month' && (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth())) return false;
        if (invoiceListFilter === 'this-week' && (d < weekStart || d > now)) return false;
        if (invoiceStatusFilter === 'Paid' && (invoice.paymentStatus || 'Paid') !== 'Paid') return false;
        if (invoiceStatusFilter === 'Pending' && (invoice.paymentStatus || (Number(invoice.balanceDue || 0) > 0 ? 'Pending' : 'Paid')) !== 'Pending') return false;
        if (invoiceStatusFilter === 'Overdue' && !isOverdue(invoice)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalAmount = listInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const paidAmount = listInvoices.filter((invoice) => (invoice.paymentStatus || 'Paid') === 'Paid').reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const pendingAmount = Math.max(0, totalAmount - paidAmount);
    return (
      <div className="vy-ref-invoice min-h-dvh">
        <header className="vy-ref-invoice-header">
          <div className="vy-ref-invoice-nav-title">
            <button type="button" className="vy-ref-icon-btn" onClick={() => router.push("/")} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1>Invoices</h1>
          </div>
        </header>
        <main className="vy-ref-invoice-list">
          <div className="vy-ref-title-row vy-ref-invoice-actions-row">
            <div className="vy-ref-invoice-header-actions">
              <button type="button" className="vy-ref-gradient-btn hidden lg:inline-flex" onClick={openCreateInvoice}> <Plus className="h-5 w-5" /> Create Invoice</button>
            </div>
          </div>
          <MobileFab label="Sale" onClick={openCreateInvoice} />
          <div className="vy-ref-search-row">
            <div className="vy-ref-search" role="search" onClick={() => invoiceSearchRef.current?.focus()}>
              <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
              <input ref={invoiceSearchRef} className="vy-invoice-search-input" value={invoiceListSearch} onChange={(e) => setInvoiceListSearch(e.target.value)} placeholder="Search invoices..." aria-label="Search invoices" />
            </div>
            <div ref={invoiceFilterRef} className="vy-ref-filter-wrap">
              <button type="button" className={`vy-ref-filter-btn ${invoiceDateFilterOpen ? 'open' : ''}`} onClick={() => setInvoiceDateFilterOpen((open) => !open)} aria-haspopup="menu" aria-expanded={invoiceDateFilterOpen}>
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{invoiceListFilter === 'all' ? 'All' : invoiceListFilter === 'this-month' ? 'This Month' : 'This Week'}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              </button>
              {invoiceDateFilterOpen && (
                <div className="vy-ref-filter-menu" role="menu" aria-label="Invoice date filter">
                  {([['all', 'All'], ['this-month', 'This Month'], ['this-week', 'This Week']] as const).map(([value, label]) => (
                    <button key={value} type="button" role="menuitem" className={invoiceListFilter === value ? 'active' : ''} onClick={() => { setInvoiceListFilter(value); setInvoiceDateFilterOpen(false); }}>
                      <span>{label}</span>
                      {invoiceListFilter === value && <span className="vy-ref-filter-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="vy-ref-stat-grid">
            <div className="vy-ref-stat-card blue"><ReceiptText/><span>Total Invoices</span><b>{listInvoices.length}</b><em>↑ 33%</em></div>
            <div className="vy-ref-stat-card blue"><span>₹</span><span>Total Amount</span><b>{money(totalAmount)}</b><em>↑ 18%</em></div>
            <div className="vy-ref-stat-card green"><span>✓</span><span>Paid</span><b>{money(paidAmount)}</b><em>{totalAmount ? Math.round(paidAmount / totalAmount * 100) : 0}%</em><div className="vy-ref-progress green"><i style={{width:`${totalAmount ? Math.min(100, paidAmount / totalAmount * 100) : 0}%`}}/></div></div>
            <div className="vy-ref-stat-card purple"><span>◷</span><span>Pending</span><b>{money(pendingAmount)}</b><em>{totalAmount ? Math.round(pendingAmount / totalAmount * 100) : 0}%</em><div className="vy-ref-progress purple"><i style={{width:`${totalAmount ? Math.min(100, pendingAmount / totalAmount * 100) : 0}%`}}/></div></div>
          </div>
          <div className="vy-ref-tabs"><button type="button" className={invoiceStatusFilter === 'all' ? 'active' : ''} onClick={() => setInvoiceStatusFilter('all')}>All</button><button type="button" className={invoiceStatusFilter === 'Paid' ? 'active' : ''} onClick={() => setInvoiceStatusFilter('Paid')}>Paid</button><button type="button" className={invoiceStatusFilter === 'Pending' ? 'active' : ''} onClick={() => setInvoiceStatusFilter('Pending')}>Pending</button><button type="button" className={invoiceStatusFilter === 'Overdue' ? 'active' : ''} onClick={() => setInvoiceStatusFilter('Overdue')}>Overdue</button></div>
          <div className="vy-ref-invoice-items">
            {listInvoices.length === 0 ? <div className="vy-ref-empty">No invoices yet. Create your first invoice.</div> : listInvoices.slice(0, 20).map((invoice, index) => {
              const status = invoice.paymentStatus || (Number(invoice.balanceDue || 0) > 0 ? 'Pending' : 'Paid');
              const rowStatus = isOverdue(invoice) ? 'Overdue' : status;
              const tone = rowStatus === 'Overdue' ? 'red' : rowStatus === 'Pending' ? 'blue' : index % 4 === 1 ? 'purple' : index % 4 === 3 ? 'amber' : 'cyan';
              return <button key={invoice.id} type="button" className={`vy-ref-invoice-row ${tone}`} onClick={() => { setSavedInvoice(invoice); setScreen('preview'); router.replace(`/invoice?view=${encodeURIComponent(invoice.id)}`); }}><span className="vy-ref-row-icon"><ReceiptText/></span><span className="vy-ref-row-main"><b>{invoice.invoiceNumber}</b><strong>{invoice.customerName || 'Walk-in Customer'}</strong><small>{new Date(invoice.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})} <i>•</i> Due: {new Date(invoice.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</small></span><span className="vy-ref-row-amount"><b>{money(invoice.total)}</b><em className={rowStatus.toLowerCase()}>{rowStatus}</em></span><ChevronRight/></button>;
            })}
          </div>
        </main>
      </div>
    );
  }

  if (screen === 'items') {
    return <ItemsScreen
      lines={lines}
      itemSearchRef={itemSearchRef}
      itemDraft={itemDraft}
      itemQuery={itemQuery}
      itemSearchOpen={itemSearchOpen}
      itemSuggestions={itemSuggestions}
      inventoryItems={inventoryItems}
      editingLineId={editingLineId}
      onBack={() => { setEditingLineId(null); setItemDraft(emptyItem()); setItemQuery(''); setItemSearchOpen(false); setScreen('sale'); }}
      onQuery={(value: string) => { setItemQuery(value); setItemSearchOpen(true); }}
      onChooseItem={chooseItem}
      onAddLine={addDraftLine}
      onSetDraft={setItemDraft}
      onSetSearchOpen={setItemSearchOpen}
      onEditLine={startEditLine}
      onUpdateLine={updateLine}
      onRemoveLine={removeLine}
      onSaveEdit={saveEditedLine}
      onDeleteEdit={deleteEditingLine}
      onSaveAndNew={() => addDraftLine(false)}
      onNewItemSaved={saveInlineItem}
    />;
  }

  if (screen === 'new-item') {
    return <NewItemScreen draft={itemDraft} setDraft={setItemDraft} onBack={() => setScreen('items')} onSave={() => saveNewInventoryItem(true)} />;
  }

  if (screen === 'preview' && savedInvoice) {
    return <PreviewScreen invoice={savedInvoice} profile={businessProfile} bank={getInvoiceBank(savedInvoice)} onBack={() => { skipNextViewParamRef.current = true; router.replace('/invoice'); setSavedInvoice(null); setScreen('list'); }} onWhatsApp={() => shareInvoiceWhatsApp(savedInvoice)} onShare={() => shareInvoice(savedInvoice)} onDownload={() => downloadImage(savedInvoice)} onPrint={() => printInvoice(savedInvoice)} onExportDom={(format: 'png' | 'pdf', element: HTMLElement | null) => exportInvoiceFromDom(savedInvoice, format, element)} onPrintDom={(element: HTMLElement | null) => printInvoiceFromDom(element)} onEdit={() => { loadInvoiceForEdit(savedInvoice); setSavedInvoice(null); setScreen('sale'); router.replace('/invoice'); }} onDelete={() => deletePreviewInvoice(savedInvoice)} busy={busy} qrRef={qrRef} />;
  }

  return <>
    <SaleScreen businessProfile={businessProfile} mainBank={mainBank} invoiceNumber={invoiceNumber} setInvoiceNumber={setInvoiceNumber} date={date} setDate={setDate} creditMode={creditMode} setCreditMode={setCreditMode} customerQuery={customerQuery} setCustomerQuery={setCustomerQuery} customerPhone={customerPhone} handlePhone={handlePhone} customerAddress={customerAddress} setCustomerAddress={setCustomerAddress} selectedCustomer={selectedCustomer} selectCustomer={selectCustomer} customerSuggestions={customerSuggestions} customerSearchRef={customerSearchRef} customerSearchOpen={customerSearchOpen} setCustomerSearchOpen={setCustomerSearchOpen} onNewCustomer={openNewCustomer} customerError={customerError} clearCustomer={() => { setSelectedCustomer(null); setCustomerQuery(''); setCustomerPhone(''); setCustomerAddress(''); setCustomerSearchOpen(true); }} customerBalance={customerBalance} lines={lines} itemDiscount={itemDiscount} itemTax={itemTax} totalQty={totalQty} subtotal={subtotal} billDiscountMode={billDiscountMode} setBillDiscountMode={setBillDiscountMode} billDiscountValue={billDiscountValue} setBillDiscountValue={setBillDiscountValue} billTaxMode={billTaxMode} setBillTaxMode={setBillTaxMode} billTaxValue={billTaxValue} setBillTaxValue={setBillTaxValue} roundOff={roundOff} setRoundOff={setRoundOff} total={total} documentTotal={documentTotal} isReceiptMode={isReceiptMode} roundOffAmount={roundOffAmount} received={received} receivedAmount={receivedAmount} setReceivedAmount={setReceivedAmount} receiptTotalAmount={receiptTotalAmount} setReceiptTotalAmount={setReceiptTotalAmount} balanceDue={balanceDue} paymentMethod={paymentMethod} setPaymentMethod={(m) => { setPaymentMethod(m); setPaymentAccountId(''); }} paymentAccountId={paymentAccountId} setPaymentAccountId={setPaymentAccountId} bankAccounts={bankAccounts} supplyState={supplyState} setSupplyState={setSupplyState} description={description} setDescription={setDescription} attachmentName={attachmentName} onAttachment={handleAttachment} terms={terms} setTerms={setTerms} signatureEnabled={signatureEnabled} setSignatureEnabled={setSignatureEnabled} onBack={back} onItems={openItems} onEditLine={startEditLine} onSave={() => { void commitInvoice(true); }} onSaveNew={async () => { const invoice = await commitInvoice(false); if (invoice) reset(); }} onShare={saveAndShare} onPrint={saveAndPrint} busy={busy} onLedger={() => router.push('/ledger')} />
    <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
      <AddPartyDialogContent editParty={null} fields={partyFields} onSave={saveInlineParty} onCancel={() => setCustomerDialogOpen(false)} t={t} />
    </Dialog>
  </>;
}

interface SaleProps {
  businessProfile: ReturnType<typeof useSettings>['businessProfile']; mainBank: any; invoiceNumber: string; setInvoiceNumber: (v: string) => void; date: string; setDate: (v: string) => void; creditMode: boolean; setCreditMode: (v: boolean) => void; customerQuery: string; setCustomerQuery: (v: string) => void; customerPhone: string; handlePhone: (v: string) => void; customerAddress: string; setCustomerAddress: (v: string) => void; selectedCustomer: LedgerParty | null; selectCustomer: (p: LedgerParty) => void; customerSuggestions: LedgerParty[]; customerSearchRef: React.RefObject<HTMLDivElement | null>; customerSearchOpen: boolean; setCustomerSearchOpen: (v: boolean) => void; onNewCustomer: () => void; customerError: LedgerParty | null; clearCustomer: () => void; customerBalance: number; lines: InvoiceLine[]; itemDiscount: number; itemTax: number; totalQty: number; subtotal: number; billDiscountMode: ValueMode; setBillDiscountMode: (v: ValueMode) => void; billDiscountValue: string; setBillDiscountValue: (v: string) => void; billTaxMode: ValueMode; setBillTaxMode: (v: ValueMode) => void; billTaxValue: string; setBillTaxValue: (v: string) => void; roundOff: boolean; setRoundOff: (v: boolean) => void; total: number; documentTotal: number; isReceiptMode: boolean; roundOffAmount: number; received: number; receivedAmount: string; setReceivedAmount: (v: string) => void; receiptTotalAmount: string; setReceiptTotalAmount: (v: string) => void; balanceDue: number; paymentMethod: PaymentMode; setPaymentMethod: (v: PaymentMode) => void; paymentAccountId: string; setPaymentAccountId: (v: string) => void; bankAccounts: any[]; supplyState: string; setSupplyState: (v: string) => void; description: string; setDescription: (v: string) => void; attachmentName: string; onAttachment: (f?: File) => void; terms: string; setTerms: (v: string) => void; signatureEnabled: boolean; setSignatureEnabled: (v: boolean) => void; onBack: () => void; onItems: () => void; onEditLine: (id: string) => void; onSave: () => void; onSaveNew: () => void; onShare: () => void; onPrint: () => void; busy: boolean; onLedger: () => void;
}

function CompactSelector({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideInteraction = (event: PointerEvent | MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (sheetRef.current?.contains(target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideInteraction, true);
    document.addEventListener('mousedown', closeOnOutsideInteraction, true);
    document.addEventListener('touchstart', closeOnOutsideInteraction, { capture: true, passive: true });
    document.addEventListener('keydown', closeOnEscape, true);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideInteraction, true);
      document.removeEventListener('mousedown', closeOnOutsideInteraction, true);
      document.removeEventListener('touchstart', closeOnOutsideInteraction, true);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [open]);

  return <>
    <button ref={triggerRef} type="button" onClick={() => setOpen((current) => !current)} className="relative z-[1] inline-flex min-h-9 items-center gap-1 rounded-lg px-1 text-sm font-medium hover:bg-muted" aria-haspopup="dialog" aria-expanded={open}>
      <span className="text-muted-foreground">{label}:</span><span>{value || 'Select'}</span><ChevronDown className="h-3.5 w-3.5" />
    </button>
    {open && <div
      className="fixed inset-0 z-[99999] bg-black/20"
      role="presentation"
      onPointerDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      onTouchStart={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 mx-auto max-h-[70vh] max-w-xl overflow-y-auto rounded-t-2xl border bg-background p-3 shadow-none"
        role="dialog"
        aria-modal="true"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-sm font-semibold">{label}</div>
        <div className="space-y-1">{options.map((option) => <button type="button" key={option.value} onClick={() => { onChange(option.value); setOpen(false); }} className={cn('flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm', value === option.value ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted')}><span>{option.label}</span>{value === option.value && <Check className="h-4 w-4" />}</button>)}</div>
      </div>
    </div>}
  </>;
}

function SaleScreen(p: SaleProps) {
  const { t, language } = useSettings();
  const router = useRouter();
  const [invoiceNoOpen, setInvoiceNoOpen] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const [draftInvoiceNo, setDraftInvoiceNo] = useState(p.invoiceNumber);
  useEffect(() => setDraftInvoiceNo(p.invoiceNumber), [p.invoiceNumber]);

  const isReceipt = p.isReceiptMode;
  const paymentValue = p.creditMode ? 'Credit/Pending' : p.paymentMethod;
  const bankValue = p.paymentMethod === 'Cash'
    ? 'Cash / Galla'
    : (p.bankAccounts.find((b) => b.id === p.paymentAccountId)?.bankName || 'Select bank');

  const receiptTotal = Math.max(0, Number(p.receiptTotalAmount) || 0);
  const receiptReceived = Math.max(0, Number(p.receivedAmount) || 0);
  const effectiveTotal = isReceipt ? receiptTotal : p.total;
  const effectiveBalance = isReceipt ? Math.max(0, receiptTotal - receiptReceived) : p.balanceDue;

  const openDatePicker = () => {
    const el = dateRef.current;
    if (!el) return;
    const picker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else { el.focus(); el.click(); }
  };

  return <div className="vy-page-invoice flex min-h-dvh flex-col bg-muted/30">
    <header className="sticky top-0 z-[70] shrink-0 border-b bg-background px-3 py-2 shadow-sm">
      <div className="mx-auto flex h-10 max-w-3xl items-center gap-2">
        <button type="button" onClick={p.onBack} className="rounded-full p-2 hover:bg-muted" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 text-base font-extrabold text-slate-900 dark:text-slate-100">{t.addSale}</h1>
        <div className="flex shrink-0 rounded-full border bg-muted/40 p-0.5">
          <button type="button" onClick={() => p.setCreditMode(true)} className={cn('vy-payment-mode-btn rounded-full px-3 py-1.5 text-[11px] font-semibold transition', p.creditMode ? 'is-active' : 'text-muted-foreground hover:bg-background')}>
            Credit
          </button>
          <button type="button" onClick={() => p.setCreditMode(false)} className={cn('vy-payment-mode-btn rounded-full px-3 py-1.5 text-[11px] font-semibold transition', !p.creditMode ? 'is-active' : 'text-muted-foreground hover:bg-background')}>
            Cash
          </button>
        </div>
        <button type="button" onClick={() => router.push('/settings')} className="rounded-full p-2 hover:bg-muted" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>

    {invoiceNoOpen && <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/20 p-4 pt-20" onMouseDown={() => setInvoiceNoOpen(false)}>
      <div className="w-full max-w-xs rounded-2xl border bg-background p-4 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="font-semibold">{language === 'mr' ? 'बिल / इनव्हॉइस क्रमांक' : 'Invoice / Bill Number'}</div>
        <Input autoFocus className="mt-3 h-11" value={draftInvoiceNo} onChange={(e) => setDraftInvoiceNo(e.target.value)} />
        <div className="mt-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setInvoiceNoOpen(false)}>{t.cancel}</Button>
          <Button className="flex-1" onClick={() => { if (draftInvoiceNo.trim()) p.setInvoiceNumber(draftInvoiceNo.trim()); setInvoiceNoOpen(false); }}>{t.save}</Button>
        </div>
      </div>
    </div>}

    <main className="mx-auto w-full max-w-3xl flex-1 space-y-2 overflow-y-auto pb-[calc(8rem+env(safe-area-inset-bottom))] pt-2">
      <section className="mx-2 overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="grid grid-cols-2">
          <button type="button" onClick={() => setInvoiceNoOpen(true)} className="flex min-w-0 items-center justify-between border-r px-3 py-2.5 text-left hover:bg-muted/40">
            <span><span className="block text-[10px] text-muted-foreground">{t.invoiceNo}</span><span className="inline-flex items-center gap-1 text-sm font-semibold">{p.invoiceNumber} <ChevronDown className="h-3.5 w-3.5" /></span></span>
          </button>
          <button type="button" onClick={openDatePicker} className="flex min-w-0 items-center justify-between px-3 py-2.5 text-left hover:bg-muted/40">
            <span><span className="block text-[10px] text-muted-foreground">{t.date}</span><span className="inline-flex items-center gap-1 text-sm font-semibold">{p.date ? new Date(`${p.date}T00:00:00`).toLocaleDateString('en-GB') : 'Select'} <ChevronDown className="h-3.5 w-3.5" /></span></span>
          </button>
        </div>
        <input ref={dateRef} type="date" value={p.date} onChange={(e) => p.setDate(e.target.value)} className="pointer-events-none absolute h-0 w-0 opacity-0" tabIndex={-1} aria-hidden="true" />
      </section>

      <section className="relative z-50 mx-2 rounded-xl border bg-background p-3 shadow-sm">
        <div className="mb-1 flex items-end justify-between gap-2">
          <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t.customerName} <span className="text-red-500">*</span></label>
          {p.selectedCustomer && <span className="text-[11px] text-muted-foreground">{language === 'mr' ? 'पक्ष शिल्लक: ' : 'Party Balance: '}<b className={p.customerBalance > 0 ? 'text-red-600' : 'text-emerald-600'}>{money(p.customerBalance)}</b></span>}
        </div>
        <div ref={p.customerSearchRef as React.RefObject<HTMLDivElement>} className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={p.customerQuery} onFocus={() => p.setCustomerSearchOpen(true)} onClick={() => p.setCustomerSearchOpen(true)} onChange={(e) => { p.setCustomerQuery(e.target.value); p.setCustomerSearchOpen(true); }} className="h-11 pl-9" placeholder={language === 'mr' ? 'ग्राहकाचे नाव / मोबाईल शोधा' : 'Search customer name / mobile'} />
          {p.customerSearchOpen && <div className="absolute left-0 right-0 top-12 z-[200] rounded-xl border bg-background p-1 shadow-2xl">
            {p.customerSuggestions.length > 0 ? p.customerSuggestions.map((c) => <button key={c.id} type="button" onClick={() => { p.selectCustomer(c); p.setCustomerSearchOpen(false); }} className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-muted"><span><b>{c.name}</b><small className="block text-muted-foreground">{c.phone}</small></span><ChevronRight className="h-4 w-4" /></button>) : <p className="px-3 py-2 text-xs text-muted-foreground">{language === 'mr' ? 'जुळणारा ग्राहक सापडला नाही.' : 'No matching customer found.'}</p>}
            <button type="button" onClick={p.onNewCustomer} className="flex w-full items-center gap-2 rounded-lg border-t p-3 text-left font-semibold text-primary"><UserPlus className="h-4 w-4" /> + {language === 'mr' ? 'नवीन ग्राहक जोडा' : 'Add New Customer'}</button>
          </div>}
        </div>
        <div className="mt-2">
          <Input value={p.customerPhone} onChange={(e) => p.handlePhone(e.target.value)} placeholder={t.phone} inputMode="numeric" />
        </div>
        {p.customerError && <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"><b>Mobile number already registered.</b><p className="mt-1">This mobile number is already registered with another customer <b>{p.customerError.name}</b>. Please edit in Ledger.</p><Button size="sm" variant="outline" className="mt-2" onClick={p.onLedger}>Open Ledger</Button></div>}
      </section>

      {isReceipt ? <>
        <section className="mx-2 rounded-xl border bg-background p-3 shadow-sm">
          <Button type="button" variant="outline" onClick={p.onItems} className="h-11 w-full border border-sky-200 bg-sky-50 text-sky-800 font-semibold shadow-none hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300"><Plus className="mr-1 h-4 w-4" /> Add Items (Optional)</Button>
          <div className="mt-3 flex items-center justify-between gap-3 border-b pb-3">
            <span className="text-sm font-semibold">{language === 'mr' ? 'एकूण रक्कम' : 'Total Amount'}</span>
            <div className="flex h-11 w-40 items-center rounded-lg border bg-background px-3"><span className="mr-1 text-muted-foreground">₹</span><Input className="h-9 border-0 p-0 text-right text-lg font-bold shadow-none focus-visible:ring-0" type="number" min="0" value={p.receiptTotalAmount} onChange={(e) => p.setReceiptTotalAmount(e.target.value)} placeholder="0" /></div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={receiptReceived > 0} onChange={(e) => p.setReceivedAmount(e.target.checked ? (p.receiptTotalAmount || '0') : '')} className="h-4 w-4 rounded" /> {language === 'mr' ? 'जमा' : 'Received'}</label>
            <div className="flex h-10 w-40 items-center rounded-lg border px-3"><span className="mr-1 text-muted-foreground">₹</span><Input className="h-8 border-0 p-0 text-right font-semibold shadow-none focus-visible:ring-0" type="number" min="0" value={p.receivedAmount} onChange={(e) => p.setReceivedAmount(e.target.value)} placeholder="0" /></div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/30"><span className="font-semibold">{language === 'mr' ? 'बाकी रक्कम' : 'Balance Due'}</span><b className="text-emerald-700 dark:text-emerald-400">{money(effectiveBalance)}</b></div>
        </section>
      </> : <>
        <section className="mx-2 overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="flex items-center gap-2 bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-800 dark:bg-sky-950/30 dark:text-sky-300"><Check className="h-4 w-4" /> {language === 'mr' ? 'बिल केलेल्या वस्तू' : 'Billed Items'}</div>
          <div className="space-y-2 p-2">
            {p.lines.map((line, index) => {
              const n = lineNumbers(line);
              return <button key={line.id} type="button" onClick={() => p.onEditLine(line.id)} className="w-full rounded-xl border bg-background p-3 text-left shadow-sm transition hover:border-primary/50 hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm">#{index + 1} {line.product.name}</b><p className="mt-1 text-xs text-muted-foreground">{language === 'mr' ? 'वस्तू उपएकूण: ' : 'Item Subtotal: '}{line.quantity} × {money(line.product.price)} = {money(n.gross)}</p></div><b className="shrink-0 text-base">{money(n.net)}</b></div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-orange-50 px-2 py-1.5 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">Discount (%): {line.discountMode === 'percentage' ? line.discountValue : 0} <b className="float-right">{money(n.discount)}</b></div><div className="rounded-lg bg-muted px-2 py-1.5">Tax: {line.taxRate}% <b className="float-right">{money(n.tax)}</b></div></div>
                <p className="mt-2 text-[10px] font-medium text-muted-foreground">Tap to edit item</p>
              </button>;
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 bg-muted/50 p-3 text-xs sm:grid-cols-4"><Metric label="Total Disc" value={p.itemDiscount.toFixed(2)} /><Metric label="Total Tax Amt" value={p.itemTax.toFixed(2)} /><Metric label="Total Qty" value={p.totalQty.toFixed(1)} /><Metric label="Subtotal" value={p.subtotal.toFixed(2)} /></div>
          <div className="p-2"><Button type="button" variant="outline" onClick={p.onItems} className="h-11 w-full border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300"><Plus className="mr-1 h-4 w-4" /> Add Items</Button></div>
        </section>
      </>}

      {!isReceipt && <section className="mx-2 rounded-xl border bg-background p-3 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{language === 'mr' ? 'एकूण रक्कम' : 'Total Amount'}</span><b className="text-xl">{money(effectiveTotal)}</b></div><div className="mt-2 flex items-center justify-between text-sm"><span>{language === 'mr' ? 'जमा रक्कम' : 'Received Amount'}</span><Input className="h-10 w-40 text-right" type="number" min="0" value={p.receivedAmount} onChange={(e) => p.setReceivedAmount(e.target.value)} placeholder={money(effectiveTotal)} /></div><div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/30"><span className="font-semibold">{language === 'mr' ? 'बाकी रक्कम' : 'Balance Due'}</span><b className="text-emerald-700 dark:text-emerald-400">{money(effectiveBalance)}</b></div></section>}

      <section className="mx-2 rounded-xl border bg-background p-3 shadow-none">
        <div>
          <CompactSelector label={language === 'mr' ? 'पेमेंट प्रकार' : 'Payment Type'} value={paymentValue} options={[{value:'Cash',label:'Cash / रोख'},{value:'UPI',label:'UPI'},{value:'Bank Transfer',label:'Bank Transfer'},{value:'Cheque',label:'Cheque'},{value:'Credit/Pending',label:'Credit / Pending / उधार'}]} onChange={(value) => { if (value === 'Credit/Pending') p.setCreditMode(true); else { p.setCreditMode(false); p.setPaymentMethod(value as PaymentMode); } }} />
        </div>
        <button type="button" className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">+ {language === 'mr' ? 'पेमेंट प्रकार जोडा' : 'Add Payment Type'}</button>
        {!p.creditMode && <div className="mt-3 border-t pt-3"><CompactSelector label={language === 'mr' ? 'जमा खाते' : 'Receiving Account'} value={bankValue} options={[{value:'cash',label:'Cash / Galla'}, ...p.bankAccounts.map((b) => ({value:b.id,label:`${b.bankName} ••••${b.accountNumber.slice(-4)}`}))]} onChange={p.setPaymentAccountId} /></div>}
      </section>

      <section className="mx-2 rounded-xl border bg-background p-3 shadow-sm">
        <div className="grid grid-cols-[1fr_72px] gap-2">
          <textarea value={p.description} onChange={(e) => p.setDescription(e.target.value)} className="min-h-20 w-full resize-none rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder={language === 'mr' ? 'टीप जोडा' : 'Add Note'} />
          <label className="relative flex min-h-20 cursor-pointer items-center justify-center rounded-xl border border-dashed bg-muted/20 text-muted-foreground hover:bg-muted"><Plus className="h-5 w-5" /><Input type="file" accept="image/*" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(e) => p.onAttachment(e.target.files?.[0])} /><span className="sr-only">Upload image</span></label>
        </div>
        <label className="mt-2 flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium hover:bg-muted"><FilePlus2 className="h-4 w-4" /><span className="flex-1">Add Document</span><Input type="file" className="hidden" onChange={(e) => p.onAttachment(e.target.files?.[0])} /></label>
        {p.attachmentName && <p className="mt-2 truncate text-xs text-muted-foreground">Attached: {p.attachmentName}</p>}
      </section>

      <section className="mx-2 rounded-xl border bg-background shadow-sm">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-sm font-semibold"><span>{language === 'mr' ? 'अटी व शर्ती' : 'Terms & Conditions'}</span><ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary>
          <div className="border-t p-3"><Input value={p.terms} onChange={(e) => p.setTerms(e.target.value)} placeholder={language === 'mr' ? 'अटी व शर्ती' : 'Terms and conditions'} /><label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={p.signatureEnabled} onCheckedChange={p.setSignatureEnabled} /> {language === 'mr' ? 'डिजिटल सही / शिक्का' : 'Digital Signature / Stamp'}</label></div>
        </details>
      </section>
    </main>
    <FixedActions
      busy={p.busy}
      onSave={p.onSave}
      onSaveNew={p.onSaveNew}
      onShare={p.onShare}
      onPrint={p.onPrint}
      language={language}
      saveLabel={t.save}
      saveAndNewLabel={t.saveAndNew}
      shareLabel={t.share}
      printLabel={t.print}
    />
  </div>;
}

function ItemsScreen({
  lines,
  itemDraft,
  itemQuery,
  itemSearchOpen,
  itemSuggestions,
  inventoryItems,
  itemSearchRef,
  editingLineId,
  onBack,
  onQuery,
  onChooseItem,
  onAddLine,
  onSetDraft,
  onSetSearchOpen,
  onUpdateLine,
  onRemoveLine,
  onSaveEdit,
  onDeleteEdit,
  onSaveAndNew,
  onNewItemSaved,
}: any) {
  const { t, language } = useSettings();
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // This screen owns its own scroll position. It is intentionally reset every
  // time the Add Items screen mounts, so the item search starts at the top.
  useEffect(() => {
    const resetScroll = () => {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
    };
    resetScroll();
    const frame = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(frame);
  }, []);

  const isEditMode = Boolean(editingLineId);
  const editQty = Math.max(0, Number(itemDraft.quantity) || 0);
  const editRate = Math.max(0, Number(itemDraft.salePrice) || 0);
  const editGross = editQty * editRate;
  const editDiscount = editGross * Math.max(0, Number(itemDraft.discountValue) || 0) / 100;
  const editTaxable = Math.max(0, editGross - editDiscount);
  const editTaxRate = Math.max(0, Number(itemDraft.taxRate) || 0);
  const editTax = itemDraft.taxType === 'with' ? editTaxable - editTaxable / (1 + editTaxRate / 100) : editTaxable * editTaxRate / 100;
  const editNet = itemDraft.taxType === 'with' ? editTaxable : editTaxable + editTax;

  const openNewItemDialog = () => {
    // Keep this screen mounted. Only the child dialog is opened.
    onSetSearchOpen(false);
    setItemDialogOpen(true);
  };

  if (isEditMode) {
    return (
      <div className="vy-page-invoice min-h-screen bg-muted/30 pb-24">
        <header className="sticky top-0 z-30 border-b bg-background px-3 py-3"><div className="mx-auto flex max-w-3xl items-center gap-3"><button type="button" onClick={onBack} className="rounded-full p-2 hover:bg-muted" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button><div><h1 className="text-lg font-bold">{language === 'mr' ? 'वस्तू संपादन' : 'Edit Item'}</h1><p className="text-xs text-muted-foreground">{language === 'mr' ? 'इनव्हॉइस जतन करण्यापूर्वी ही बिल केलेली वस्तू अपडेट करा.' : 'Update this billed item before saving the invoice.'}</p></div></div></header>
        <main className="mx-auto max-w-3xl space-y-2 pt-2">
          <section className="mx-2 rounded-xl border bg-background p-4 shadow-sm"><div className="space-y-3">
            <div><Label className="text-xs">{language === 'mr' ? 'वस्तूचे नाव' : 'Item Name'}</Label><Input className="mt-1 h-11" value={itemDraft.name} onChange={(e) => onSetDraft({ ...itemDraft, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3"><Field label={language === 'mr' ? 'संख्या' : 'Quantity'} type="number" value={itemDraft.quantity} onChange={(v: string) => onSetDraft({ ...itemDraft, quantity: v })} placeholder="1" /><div><Label className="text-xs">Unit</Label><Select value={itemDraft.unit || 'pcs'} onValueChange={(v) => onSetDraft({ ...itemDraft, unit: v })}><SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pcs">pcs</SelectItem><SelectItem value="kg">kg</SelectItem><SelectItem value="g">g</SelectItem><SelectItem value="ltr">ltr</SelectItem><SelectItem value="box">box</SelectItem><SelectItem value="set">set</SelectItem></SelectContent></Select></div></div>
            <div className="grid grid-cols-2 gap-3"><Field label={language === 'mr' ? 'दर (किंमत / एकक)' : 'Rate (Price / Unit)'} type="number" value={itemDraft.salePrice} onChange={(v: string) => onSetDraft({ ...itemDraft, salePrice: v })} placeholder="0" /><div><Label className="text-xs">{language === 'mr' ? 'कर' : 'Tax'}</Label><Select value={itemDraft.taxType} onValueChange={(v) => onSetDraft({ ...itemDraft, taxType: v as 'without' | 'with' })}><SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="without">{language === 'mr' ? 'कर वगळून' : 'Tax Exclusive'}</SelectItem><SelectItem value="with">{language === 'mr' ? 'करासह' : 'Tax Inclusive'}</SelectItem></SelectContent></Select></div></div>
            <div className="grid grid-cols-2 gap-3"><Field label={language === 'mr' ? 'सूट %' : 'Discount %'} type="number" value={itemDraft.discountValue} onChange={(v: string) => onSetDraft({ ...itemDraft, discountValue: v })} placeholder="0" /><Field label={language === 'mr' ? 'कर %' : 'Tax %'} type="number" value={itemDraft.taxRate} onChange={(v: string) => onSetDraft({ ...itemDraft, taxRate: v })} placeholder="0" /></div>
          </div></section>
          <section className="mx-2 rounded-xl border bg-muted/50 p-4 shadow-sm"><h2 className="mb-3 font-semibold">{language === 'mr' ? 'एकूण व कर' : 'Totals & Taxes'}</h2><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">{language === 'mr' ? 'उपएकूण' : 'Subtotal'}</span><b>{money(editGross)}</b></div><div className="flex justify-between"><span className="text-muted-foreground">Discount ({Math.max(0, Number(itemDraft.discountValue) || 0)}%)</span><b className="text-orange-600">-{money(editDiscount)}</b></div><div className="flex justify-between"><span className="text-muted-foreground">Tax ({editTaxRate}%)</span><b>{money(editTax)}</b></div><div className="flex justify-between border-t pt-3 text-lg"><span className="font-semibold">{language === 'mr' ? 'निव्वळ एकूण रक्कम' : 'Net Total Amount'}</span><b>{money(editNet)}</b></div></div></section>
        </main>
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-0 shadow-lg"><div className="mx-auto grid max-w-3xl grid-cols-2 gap-0"><Button type="button" variant="outline" className="h-16 rounded-none border-0 text-destructive hover:bg-muted hover:text-destructive" onClick={onDeleteEdit}><Trash2 className="mr-1 h-4 w-4" />Delete</Button><Button type="button" className="h-16 rounded-none border-0 bg-primary text-primary-foreground hover:opacity-95" onClick={onSaveEdit}><Check className="mr-1 h-5 w-5" />{t.save}</Button></div></div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="vy-page-invoice add-items-sale-screen min-h-dvh bg-muted/30 pb-20">
      <header className="sticky top-0 z-30 border-b bg-background px-3 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button onClick={onBack} className="rounded-full p-2 hover:bg-muted" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">{language === 'mr' ? 'विक्रीमध्ये वस्तू जोडा' : 'Add Items to Sale'}</h1>
            <p className="text-xs text-muted-foreground">{language === 'mr' ? 'स्टॉक शोधा, संख्या, दर आणि कर जोडा.' : 'Search inventory, add quantity, rate and tax.'}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-2 overflow-y-visible pt-2 pb-20">
        <section className="relative z-10 bg-background p-4">
          <div ref={itemSearchRef} className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              value={itemQuery}
              onChange={(e) => onQuery(e.target.value)}
              onFocus={() => onSetSearchOpen(true)}
              placeholder="Search item / product"
            />
            {itemSearchOpen && (
              <div className="absolute left-0 right-0 top-12 z-40 rounded-xl border bg-background p-1 shadow-xl">
                {itemSuggestions.map((item: InventoryItem) => (
                  <button key={item.id} onClick={() => onChooseItem(item)} className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-muted">
                    <span><b>{item.name}</b><small className="block text-muted-foreground">{item.unit} • ₹{item.sellingPrice} • Stock {item.stock}</small></span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={openNewItemDialog}
                  className="flex w-full items-center gap-2 rounded-lg border-t p-3 text-left font-semibold text-primary"
                >
                  <UserPlus className="h-4 w-4" /> Add New Item
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{language === 'mr' ? 'नवीन विक्री वस्तू' : 'New Sale Item'}</h2>
            <Button variant="outline" size="sm" onClick={openNewItemDialog}>
              <Plus className="mr-1 h-4 w-4" /> Add New Item
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">{language === 'mr' ? 'वस्तूचे नाव' : 'Item Name'}</Label>
              <Input className="mt-1 h-11" value={itemDraft.name} onChange={(e) => onSetDraft({ ...itemDraft, name: e.target.value })} placeholder="Item name" />
            </div>
            <Field label={language === 'mr' ? 'संख्या' : 'Quantity'} type="number" value={String(itemDraft.quantity || 1)} onChange={(v: string) => onSetDraft({ ...itemDraft, quantity: v })} placeholder="1" />
            <Field label="Rate" type="number" value={itemDraft.salePrice} onChange={(v: string) => onSetDraft({ ...itemDraft, salePrice: v })} placeholder="0" />
            <Field label={language === 'mr' ? 'कर %' : 'Tax %'} type="number" value={itemDraft.taxRate} onChange={(v: string) => onSetDraft({ ...itemDraft, taxRate: v })} placeholder="0" />
            <div>
              <Label className="text-xs">{language === 'mr' ? 'कर प्रकार' : 'Tax Type'}</Label>
              <Select value={itemDraft.taxType} onValueChange={(v) => onSetDraft({ ...itemDraft, taxType: v as 'without' | 'with' })}>
                <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="without">{language === 'mr' ? 'कराशिवाय' : 'Without Tax'}</SelectItem><SelectItem value="with">{language === 'mr' ? 'करासह' : 'With Tax'}</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">{language === 'mr' ? 'सूट %' : 'Discount %'}</Label><Input className="mt-1 h-11" type="number" value={String(itemDraft.discountValue || '')} onChange={(e) => onSetDraft({ ...itemDraft, discountValue: e.target.value } as any)} placeholder="0" /></div>
          </div>
          <div className="mt-4 rounded-xl bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">{language === 'mr' ? 'सध्याच्या वस्तूची निव्वळ रक्कम' : 'Current Item Net Total'}</p>
            <p className="mt-1 text-2xl font-bold">{money(Math.max(0, (Number(itemDraft.salePrice) || 0) * Math.max(1, Number(itemDraft.quantity) || 1) - ((Number(itemDraft.salePrice) || 0) * Math.max(1, Number(itemDraft.quantity) || 1) * Math.max(0, Number(itemDraft.discountValue) || 0) / 100)) * (itemDraft.taxType === 'with' ? 1 : 1 + Math.max(0, Number(itemDraft.taxRate) || 0) / 100))}</p>
          </div>
        </section>

        <section className="bg-background p-4">
          <h2 className="font-semibold">{language === 'mr' ? 'बिल केलेल्या वस्तू' : 'Billed Items'}</h2>
          {lines.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No items added. Search an item above or create a new one.</p> : <div className="mt-3 space-y-2">{lines.map((line: InvoiceLine) => { const n = lineNumbers(line); return <div key={line.id} className="rounded-xl border p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><b>{line.product.name}</b><p className="text-xs text-muted-foreground">{line.quantity} {line.product.unit} × {money(line.product.price)} • Tax {line.taxRate}% • {line.taxType === 'with' ? 'With' : 'Without'} Tax</p></div><b>{money(n.net)}</b><button onClick={() => onRemoveLine(line.id)} className="rounded p-1 text-destructive"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 grid grid-cols-3 gap-2"><Field label="Qty" type="number" value={String(line.quantity)} onChange={(v: string) => onUpdateLine(line.id, { quantity: Number(v) || 0 })} placeholder="1" /><Field label="Rate" type="number" value={String(line.product.price)} onChange={(v: string) => onUpdateLine(line.id, { product: { ...line.product, price: Number(v) || 0 } })} placeholder="0" /><Field label="Disc %" type="number" value={String(line.discountValue)} onChange={(v: string) => onUpdateLine(line.id, { discountMode: 'percentage', discountValue: Number(v) || 0 })} placeholder="0" /></div></div>; })}</div>}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-[100] border-t bg-background/95 shadow-[0_-6px_20px_rgba(0,0,0,0.10)] backdrop-blur supports-[backdrop-filter]:bg-background/90 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 px-2 py-2">
          <Button variant="outline" className="h-14 rounded-xl text-sm font-semibold" onClick={onSaveAndNew}>{t.saveAndNew}</Button>
          <Button className="h-14 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-95" onClick={() => onAddLine(true)}>{t.save}</Button>
        </div>
      </div>

      {/* The child dialog is mounted inside ItemsScreen, not the Sale screen. */}
      <NewItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        existingItems={inventoryItems}
        initialName={itemQuery}
        onSaved={onNewItemSaved}
      />
    </div>
  );
}

function NewItemScreen({ draft, setDraft, onBack, onSave }: { draft: ItemDraft; setDraft: (d: ItemDraft) => void; onBack: () => void; onSave: () => void }) {
  const { t, language } = useSettings();
  return <div className="vy-page-invoice min-h-screen bg-muted/30 pb-20"><header className="sticky top-0 z-30 border-b bg-background px-3 py-3"><div className="mx-auto flex max-w-3xl items-center gap-3"><button onClick={onBack} className="rounded-full p-2 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></button><div><h1 className="text-lg font-bold">{language === 'mr' ? 'वस्तू जोडा' : 'Add Item'}</h1><p className="text-xs text-muted-foreground">{language === 'mr' ? 'नवीन स्टॉक वस्तू तयार करा.' : 'Create a new inventory item.'}</p></div></div></header><main className="mx-auto max-w-3xl space-y-2 pt-2"><section className="bg-background p-4"><div className="grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><Label className="text-xs">{language === 'mr' ? 'वस्तूचे नाव *' : 'Item Name *'}</Label><Input className="mt-1 h-11" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div><Field label={language === 'mr' ? 'श्रेणी' : 'Category'} value={draft.category} onChange={(v: string) => setDraft({ ...draft, category: v })} placeholder="General" /><Field label={language === 'mr' ? 'एचएसएन कोड' : 'HSN Code'} value={draft.hsnCode} onChange={(v: string) => setDraft({ ...draft, hsnCode: v })} placeholder="HSN" /><Field label={language === 'mr' ? 'एकक' : 'Unit'} value={draft.unit} onChange={(v: string) => setDraft({ ...draft, unit: v })} placeholder="pcs" /><Field label={language === 'mr' ? 'विक्री किंमत' : 'Sale Price'} type="number" value={draft.salePrice} onChange={(v: string) => setDraft({ ...draft, salePrice: v })} placeholder="0" /><Field label={language === 'mr' ? 'खरेदी किंमत' : 'Purchase Price'} type="number" value={draft.purchasePrice} onChange={(v: string) => setDraft({ ...draft, purchasePrice: v })} placeholder="0" /><Field label={language === 'mr' ? 'प्रारंभ स्टॉक' : 'Opening Stock'} type="number" value={draft.openingStock} onChange={(v: string) => setDraft({ ...draft, openingStock: v })} placeholder="0" /><Field label={language === 'mr' ? 'किमान स्टॉक' : 'Minimum Stock'} type="number" value={draft.minStock} onChange={(v: string) => setDraft({ ...draft, minStock: v })} placeholder="0" /><Field label={language === 'mr' ? 'कर %' : 'Tax %'} type="number" value={draft.taxRate} onChange={(v: string) => setDraft({ ...draft, taxRate: v })} placeholder="0" /><div><Label className="text-xs">{language === 'mr' ? 'कर प्रकार' : 'Tax Type'}</Label><Select value={draft.taxType} onValueChange={(v) => setDraft({ ...draft, taxType: v as 'without' | 'with' })}><SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="without">{language === 'mr' ? 'कराशिवाय' : 'Without Tax'}</SelectItem><SelectItem value="with">{language === 'mr' ? 'करासह' : 'With Tax'}</SelectItem></SelectContent></Select></div></div></section></main><div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-0"><div className="mx-auto grid max-w-3xl grid-cols-2 gap-0"><Button variant="outline" className="h-16 rounded-none border-0" onClick={onBack}>{language === 'mr' ? 'रद्द करा' : 'Cancel'}</Button><Button className="h-16 rounded-none border-0 bg-primary text-primary-foreground hover:opacity-95" onClick={onSave}><Check className="mr-2 h-5 w-5" />{language === 'mr' ? 'वस्तू जतन करा' : 'Save Item'}</Button></div></div></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted/50 p-2"><p className="text-[10px] text-muted-foreground">{label}</p><b>{value}</b></div>; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><b>{value}</b></div>; }
function PreviewScreen({ invoice, profile, bank, onBack, onWhatsApp, onShare, onDownload, onPrint, onExportDom, onPrintDom, onEdit, onDelete, busy, qrRef }: any) {
  const [shareOpen, setShareOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const invoiceRef = useRef<HTMLDivElement | null>(null);
  const isReceipt = invoice.items.length === 0;
  const received = Math.max(0, Number(invoice.total || 0) - Number(invoice.balanceDue || 0));
  useEffect(() => { if (!shareOpen) return; const close = (event: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShareOpen(false); }; document.addEventListener('pointerdown', close, true); return () => document.removeEventListener('pointerdown', close, true); }, [shareOpen]);
  const exportDom = (format: 'png' | 'pdf') => onExportDom(format, invoiceRef.current);
  return <div className="vy-page-invoice min-h-screen bg-slate-100 pb-[calc(4.25rem+env(safe-area-inset-bottom))] dark:bg-slate-950">
    <header className="no-print sticky top-0 z-30 border-b bg-background/95 px-3 py-2 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center gap-2"><button type="button" onClick={onBack} className="rounded-full p-2 hover:bg-muted" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1"><h1 className="text-base font-bold">{isReceipt ? 'Payment Receipt Preview' : 'Invoice Preview'}</h1><p className="truncate text-[11px] text-muted-foreground">{invoice.invoiceNumber} • {money(invoice.total)}</p></div><div ref={menuRef} className="relative"><Button size="sm" type="button" onClick={() => setShareOpen((v) => !v)} disabled={busy}><Share2 className="mr-1 h-4 w-4" />Export<ChevronDown className="ml-1 h-3.5 w-3.5" /></Button>{shareOpen && <div role="menu" className="no-print absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border bg-background p-1 shadow-xl"><button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted" onClick={() => { setShareOpen(false); exportDom('png'); }}><ImageDown className="h-4 w-4" />Download PNG</button><button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted" onClick={() => { setShareOpen(false); exportDom('pdf'); }}><ReceiptText className="h-4 w-4" />Download PDF</button><button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted" onClick={() => { setShareOpen(false); onPrintDom(invoiceRef.current); }}><Printer className="h-4 w-4" />Print</button><button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted" onClick={() => { setShareOpen(false); void onWhatsApp(); }}><Share2 className="h-4 w-4" />WhatsApp</button></div>}</div></div></header>
    <main className="mx-auto max-w-3xl p-2 sm:p-5 print:p-0">
      <div ref={invoiceRef} id="invoice-preview-export" className="invoice-a4 mx-auto w-full max-w-[794px] bg-white text-slate-900 ring-1 ring-slate-200 print:ring-0">
        <div className="p-[8mm] sm:p-[10mm]">
          <div className="border-b-2 border-slate-900 pb-4"><div className="flex items-start justify-between gap-5"><div className="flex min-w-0 gap-3">{profile.businessLogoUrl && <Image src={profile.businessLogoUrl} alt="Business logo" width={56} height={56} unoptimized className="h-14 w-14 shrink-0 object-contain" />}<div className="min-w-0"><h2 className="text-xl font-extrabold tracking-tight">{profile.businessName || 'Business'}</h2>{profile.businessAddress && <p className="mt-1 text-[11px] leading-4 text-slate-600">{profile.businessAddress}</p>}<p className="text-[11px] leading-4 text-slate-600">{profile.phone || ''}{profile.email ? ` • ${profile.email}` : ''}</p>{profile.gstin && <p className="text-[11px] font-bold">GSTIN: {profile.gstin}</p>}</div></div><div className="shrink-0 text-right"><h3 className="text-lg font-extrabold tracking-wide">{isReceipt ? 'PAYMENT RECEIPT' : 'TAX INVOICE'}</h3><p className="mt-1 text-[11px] font-semibold">Invoice No: {invoice.invoiceNumber}</p><p className="text-[11px]">Date: {new Date(invoice.date).toLocaleDateString('en-IN')}</p></div></div></div>
          <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg border border-slate-200 p-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Customer</p><p className="mt-1 text-sm font-bold">{invoice.customerName || 'Walk-in Customer'}</p>{invoice.customerPhone && <p className="text-[11px] text-slate-600">{invoice.customerPhone}</p>}{invoice.customerAddress && <p className="text-[11px] text-slate-600">{invoice.customerAddress}</p>}</div><div className="rounded-lg border border-slate-200 p-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Payment</p><p className="mt-1 text-sm font-bold">{invoice.paymentMethod}</p><p className="text-[11px] text-slate-600">Status: {invoice.paymentStatus || 'Paid'}</p>{invoice.stateOfSupply && <p className="text-[11px] text-slate-600">State: {invoice.stateOfSupply}</p>}</div></div>
          {!isReceipt ? <><table className="mt-4 w-full border-collapse text-[10px]"><thead><tr className="border-y-2 border-slate-800 bg-slate-50"><th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Tax</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{invoice.items.map((raw: CartItem & { taxRate?: number }, i: number) => <tr key={i} className="border-b border-slate-200"><td className="p-2 font-medium">{raw.product.name}</td><td className="p-2 text-right">{raw.quantity}</td><td className="p-2 text-right">{money(raw.product.price)}</td><td className="p-2 text-right">{Number(raw.taxRate || 0)}%</td><td className="p-2 text-right font-semibold">{money(Number(raw.lineAmount || raw.quantity * raw.product.price))}</td></tr>)}</tbody></table><div className="mt-4 flex justify-end"><div className="w-72 text-[11px]"><SummaryRow label="Subtotal" value={money(invoice.subtotal)} /><SummaryRow label="Discount" value={`-${money(invoice.discount)}`} /><SummaryRow label="Tax" value={money(invoice.taxAmount || 0)} /><div className="mt-2 flex justify-between border-t-2 border-slate-900 pt-2 text-base font-extrabold"><span>Total Amount</span><span>{money(invoice.total)}</span></div><div className="mt-1 flex justify-between"><span>Received / Cash</span><span>{money(received)}</span></div><div className="flex justify-between"><span>Balance / Credit</span><span>{money(Number(invoice.balanceDue || 0))}</span></div></div></div></> : <div className="mt-4 grid grid-cols-3 gap-3 text-xs"><div className="rounded-lg border p-3"><p className="text-[9px] text-slate-500">Total Amount</p><b className="text-lg">{money(invoice.total)}</b></div><div className="rounded-lg border p-3"><p className="text-[9px] text-slate-500">Received / Cash</p><b className="text-lg">{money(received)}</b></div><div className="rounded-lg border p-3"><p className="text-[9px] text-slate-500">Balance / Credit</p><b className="text-lg">{money(Number(invoice.balanceDue || 0))}</b></div></div>}
          <div className="mt-5 grid grid-cols-[1fr_150px] gap-4 border-t-2 border-slate-800 pt-4"><div><h4 className="text-sm font-extrabold">Bank Details</h4>{bank ? <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]"><p><b>Bank:</b> {bank.bankName || '—'}</p><p><b>IFSC:</b> {bank.ifscCode || '—'}</p><p><b>A/C Holder:</b> {bank.accountHolderName || profile.ownerName || '—'}</p><p><b>A/C:</b> {bank.accountNumber ? `••••${String(bank.accountNumber).slice(-4)}` : '—'}</p><p className="col-span-2"><b>UPI ID:</b> {bank.upiId || '—'}</p></div> : <p className="mt-2 text-[10px] text-slate-500">Bank details not configured.</p>}{invoice.terms && <p className="mt-3 text-[9px] text-slate-500">{invoice.terms}</p>}</div>{bank?.upiId ? <div ref={qrRef} className="flex flex-col items-center justify-start border-l border-slate-200 pl-4"><QRCodeSVG value={buildUpiLink(bank.upiId, profile.businessName, invoice.total)} size={128} includeMargin /><p className="mt-1 text-[9px] font-bold tracking-wide">SCAN TO PAY</p></div> : <div className="border-l border-slate-200 pl-4 text-[9px] text-slate-500">UPI QR unavailable</div>}</div>
          <div className="mt-6 border-t pt-3 text-center text-[9px] text-slate-500">Thank you for your business • Computer generated invoice</div>
        </div>
      </div>
    </main>
    <div className="no-print fixed inset-x-0 bottom-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)]"><div className="mx-auto grid max-w-3xl grid-cols-2 gap-0"><Button variant="outline" className="h-14 rounded-none border-0 shadow-none" onClick={onEdit}><Pencil className="mr-1 h-4 w-4" />Edit</Button><button type="button" className="invoice-preview-delete-btn h-14 rounded-none border-0 border-l border-red-700 !bg-red-600 !text-white shadow-none hover:!bg-red-700 hover:!text-white focus-visible:!bg-red-700 focus-visible:!text-white active:!bg-red-800 disabled:opacity-50" onClick={onDelete} aria-label="Delete invoice"><Trash2 className="mr-1 inline-block h-4 w-4 text-white" />Delete</button></div></div>
    <style jsx global>{`
      @page { size: A4 portrait; margin: 0; }
      @media print {
        html, body { width:210mm !important; min-width:210mm !important; margin:0 !important; padding:0 !important; background:#fff !important; }
        .no-print { display:none !important; }
        .vy-page-invoice { min-height:0 !important; padding:0 !important; margin:0 !important; background:#fff !important; }
        .vy-page-invoice > main { width:210mm !important; max-width:210mm !important; padding:0 !important; margin:0 !important; }
        #invoice-preview-export { display:block !important; width:210mm !important; min-height:297mm !important; max-width:none !important; margin:0 !important; padding:0 !important; box-shadow:none !important; border:0 !important; ring:0 !important; }
        #invoice-preview-export > div { min-height:297mm !important; padding:8mm !important; }
      }
      body.printing-invoice > * { visibility:hidden !important; }
      body.printing-invoice #invoice-preview-export,
      body.printing-invoice #invoice-preview-export * { visibility:visible !important; }
      body.printing-invoice #invoice-preview-export {
        position:absolute !important;
        left:0 !important;
        top:0 !important;
        width:210mm !important;
        min-height:297mm !important;
        max-width:none !important;
        margin:0 !important;
        padding:0 !important;
        background:#fff !important;
        box-shadow:none !important;
        border:0 !important;
      }
      body.printing-invoice #invoice-preview-export > div { min-height:297mm !important; padding:8mm !important; }
      @media print {
        body.printing-invoice .no-print { display:none !important; }
      }
    `}</style>
  </div>;
}

function FixedActions({
  busy,
  onSave,
  onSaveNew,
  onShare,
  onPrint,
  language,
  saveLabel,
  saveAndNewLabel,
  shareLabel,
  printLabel,
}: {
  busy: boolean;
  onSave: () => void;
  onSaveNew: () => void;
  onShare: () => void;
  onPrint: () => void;
  language: string;
  saveLabel: string;
  saveAndNewLabel: string;
  shareLabel: string;
  printLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const moreOptionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (moreOptionsRef.current && target && !moreOptionsRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t bg-background/95 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/85 pb-[env(safe-area-inset-bottom)] pt-2">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-2 sm:px-3">
        <Button type="button" variant="outline" className="h-14 flex-1 text-sm font-semibold" onClick={onSaveNew} disabled={busy}>
          <FilePlus2 className="mr-1 h-4 w-4" />{saveAndNewLabel}
        </Button>
        <div ref={moreOptionsRef} className="relative flex flex-1">
          <Button type="button" className="h-14 flex-1 rounded-r-none text-sm font-semibold" onClick={onSave} disabled={busy}>
            <Check className="mr-1 h-5 w-5" />{busy ? (language === 'mr' ? 'जतन होत आहे…' : 'Saving…') : (language === 'mr' ? 'जतन व पूर्वदृश्य' : 'Save & Preview')}
          </Button>
          <button type="button" aria-label="More options" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} disabled={busy} className="inline-flex h-14 w-10 shrink-0 items-center justify-center rounded-l-none rounded-r-lg border border-border bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <MoreVertical className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </button>
          {open && <div role="menu" className="absolute bottom-full right-0 z-[60] mb-2 w-56 overflow-hidden rounded-xl border bg-background p-1.5 shadow-2xl">
              <button type="button" role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-muted" onClick={() => { setOpen(false); void onShare(); }}><Share2 className="h-4 w-4" /><span>{shareLabel}</span></button>
              <button type="button" role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-muted" onClick={() => { setOpen(false); void onPrint(); }}><Printer className="h-4 w-4" /><span>{printLabel}</span></button>
            </div>}
        </div>
      </div>
    </div>
  );
}
