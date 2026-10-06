'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    ShoppingCart,
    ScanLine,
    X,
    CheckCircle2,
    Receipt as ReceiptIcon,
    Printer,
    Store,
    CreditCard,
    Wallet,
    Smartphone,
    Wifi,
    WifiOff,
    RefreshCw,
    Pencil,
    FileText,
    CalendarDays,
    UserRound,
    ArrowLeft,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { useAppData } from './app-data-context';
import { useSettings } from './settings-context';
import { generateId, GALLA_ID } from './mock-data';
import type { CartItem, Invoice, POSProduct, BankAccount } from './types';
import { useInventory } from '@/src/context/InventoryContext';
import { ReceiptDialog } from './receipt-dialog';
import { syncAll } from '@/lib/sync-service';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);

type PaymentMethod = 'Cash' | 'UPI' | 'Card';
type ReceiptSize = '2inch' | '3inch';

export function POSPage() {
    const { t, businessProfile } = useSettings();
    const { bankAccounts, transactions, invoices, addTransaction, updateTransaction, deleteTransaction, addInvoice, updateInvoice, deleteInvoice } = useAppData();
    const { inventory, onlineState, updateItem } = useInventory();
    const searchParams = useSearchParams();

    const products = useMemo<POSProduct[]>(
        () => inventory
            .filter((item) => item.showOnPOS)
            .map((item) => ({
                id: item.id,
                name: item.name,
                price: item.sellingPrice,
                category: item.category,
                unit: item.unit,
                stock: item.stock,
                showOnPOS: item.showOnPOS,
                emoji: '📦',
                photoUrl: item.photoUrl ?? null,
            })),
        [inventory]
    );
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [posOnly, setPosOnly] = useState(true);
    const [discount, setDiscount] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
    const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(
        businessProfile.mainBankAccountId || bankAccounts[0]?.id || ''
    );
    const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);
    const [receiptSize, setReceiptSize] = useState<ReceiptSize>('3inch');
    const [billSearch, setBillSearch] = useState('');
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

    useEffect(() => {
        const editId = searchParams.get('edit');
        if (!editId || editingInvoiceId === editId) return;
        const invoice = invoices.find((item) => item.id === editId);
        if (!invoice) return;
        setEditingInvoiceId(invoice.id);
        setCart(invoice.items.map((item) => ({ ...item, quantity: Number(item.quantity) || 1 })));
        setDiscount(String(invoice.discount || ''));
        setCustomerName(invoice.customerName || '');
        setPaymentMethod(invoice.paymentMethod === 'Credit/Pending' ? 'Cash' : invoice.paymentMethod as PaymentMethod);
        setSelectedBankAccountId(invoice.upiAccountId || businessProfile.mainBankAccountId || bankAccounts[0]?.id || '');
    }, [searchParams, invoices, editingInvoiceId, businessProfile.mainBankAccountId, bankAccounts]);

    useEffect(() => {
        if (businessProfile.mainBankAccountId && bankAccounts.some((a) => a.id === businessProfile.mainBankAccountId)) setSelectedBankAccountId(businessProfile.mainBankAccountId);
        else if (!selectedBankAccountId && bankAccounts[0]) setSelectedBankAccountId(bankAccounts[0].id);
    }, [businessProfile.mainBankAccountId, bankAccounts, selectedBankAccountId]);

    const isOnline = onlineState;

    const categories = useMemo(() => {
        const cats = new Set(products.map((p) => p.category));
        return ['all', ...Array.from(cats)];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            if (posOnly && !p.showOnPOS) return false;
            if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
            if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [products, posOnly, categoryFilter, searchQuery]);

    const addToCart = (product: POSProduct) => {
        const editingInvoice = editingInvoiceId
            ? invoices.find((invoice) => invoice.id === editingInvoiceId)
            : null;
        const oldQty = editingInvoice?.items
            .filter((item) => item.product.id === product.id)
            .reduce((sum, item) => sum + item.quantity, 0) ?? 0;
        const availableStock = product.stock + oldQty;

        if (availableStock <= 0) return;
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= availableStock) return prev;
                return prev.map((item) =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const decrementItem = (productId: string) => {
        setCart((prev) =>
            prev
                .map((item) =>
                    item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setDiscount('');
        setCustomerName('');
    };

    const subtotal = useMemo(
        () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
        [cart]
    );

    const discountAmount = parseFloat(discount) || 0;
    const total = Math.max(subtotal - discountAmount, 0);

    const selectedBankAccount = useMemo(
        () => bankAccounts.find((a) => a.id === selectedBankAccountId) ?? null,
        [bankAccounts, selectedBankAccountId]
    );

    const getInvoiceTransaction = (invoice: Invoice) => {
        if (invoice.transactionId) {
            return transactions.find((txn) => txn.id === invoice.transactionId) ?? null;
        }
        return transactions.find(
            (txn) => txn.description === `POS Sale - ${invoice.invoiceNumber}`,
        ) ?? null;
    };

    const applyStockDelta = (oldInvoice: Invoice | null, nextCart: CartItem[]) => {
        const oldQty = new Map<string, number>();
        const newQty = new Map<string, number>();

        oldInvoice?.items.forEach((item) => oldQty.set(item.product.id, (oldQty.get(item.product.id) ?? 0) + item.quantity));
        nextCart.forEach((item) => newQty.set(item.product.id, (newQty.get(item.product.id) ?? 0) + item.quantity));

        const ids = new Set<string>();
        oldQty.forEach((_quantity, id) => ids.add(id));
        newQty.forEach((_quantity, id) => ids.add(id));
        ids.forEach((id) => {
            const current = inventory.find((item) => item.id === id);
            if (!current) return;
            const delta = (oldQty.get(id) ?? 0) - (newQty.get(id) ?? 0);
            if (delta === 0) return;
            updateItem({ ...current, stock: Math.max(0, current.stock + delta) });
        });
    };

    const resetBillEditor = () => {
        setCart([]);
        setDiscount('');
        setCustomerName('');
        setPaymentMethod('Cash');
        setEditingInvoiceId(null);
    };

    const handleCheckout = (size: ReceiptSize) => {
        if (cart.length === 0) return;

        const nowIso = new Date().toISOString();
        const existingInvoice = editingInvoiceId
            ? invoices.find((invoice) => invoice.id === editingInvoiceId) ?? null
            : null;

        // During edit, the quantity already sold by the old bill becomes available again.
        for (const item of cart) {
            const current = inventory.find((product) => product.id === item.product.id);
            const oldQty = existingInvoice?.items
                .filter((oldItem) => oldItem.product.id === item.product.id)
                .reduce((sum, oldItem) => sum + oldItem.quantity, 0) ?? 0;
            if (current && current.stock + oldQty < item.quantity) {
                window.alert(`${current.name} साठी उपलब्ध stock पुरेसा नाही.`);
                return;
            }
        }

        applyStockDelta(existingInvoice, cart);

        const invoiceNumber = existingInvoice?.invoiceNumber ?? `INV-${Date.now().toString().slice(-8)}`;
        const existingTxn = existingInvoice ? getInvoiceTransaction(existingInvoice) : null;
        const transactionId = existingTxn?.id ?? existingInvoice?.transactionId ?? generateId('txn');
        const invoice: Invoice = {
            id: existingInvoice?.id ?? generateId('inv'),
            invoiceNumber,
            items: cart,
            subtotal,
            discount: discountAmount,
            total,
            paymentMethod,
            date: existingInvoice?.date ?? nowIso,
            customerName: customerName.trim(),
            upiAccountId: selectedBankAccountId || null,
            transactionId,
        };

        const destAccountId = paymentMethod === 'Cash' ? GALLA_ID : selectedBankAccountId;
        const txnData = {
            id: transactionId,
            type: 'Income' as const,
            amount: total,
            category: 'Business Revenue' as const,
            description: `POS Sale - ${invoiceNumber}`,
            date: nowIso.slice(0, 10),
            tag: 'Shop / Business' as const,
            sourceAccountId: destAccountId,
            destAccountId: null,
            isFromGalla: destAccountId === GALLA_ID,
            createdAt: existingInvoice
                ? (getInvoiceTransaction(existingInvoice)?.createdAt ?? nowIso)
                : nowIso,
        };

        if (existingInvoice) {
            if (existingTxn) updateTransaction(txnData);
            else addTransaction(txnData);
            updateInvoice(invoice);
        } else {
            addTransaction(txnData);
            addInvoice(invoice);
        }

        setReceiptSize(size);
        setReceiptInvoice(invoice);
        resetBillEditor();
    };

    const startEditInvoice = (invoice: Invoice) => {
        setEditingInvoiceId(invoice.id);
        setCart(invoice.items);
        setDiscount(invoice.discount ? String(invoice.discount) : '');
        setCustomerName(invoice.customerName);
        setPaymentMethod(invoice.paymentMethod as PaymentMethod);
        if (invoice.upiAccountId) setSelectedBankAccountId(invoice.upiAccountId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteInvoice = (invoice: Invoice) => {
        const confirmed = window.confirm(`बिल ${invoice.invoiceNumber} delete करायचे आहे का?\nStock आणि POS transaction देखील पूर्ववत केली जाईल.`);
        if (!confirmed) return;

        const oldQty = new Map<string, number>();
        invoice.items.forEach((item) => oldQty.set(item.product.id, (oldQty.get(item.product.id) ?? 0) + item.quantity));
        oldQty.forEach((qty, id) => {
            const current = inventory.find((item) => item.id === id);
            if (current) updateItem({ ...current, stock: current.stock + qty });
        });

        const txn = getInvoiceTransaction(invoice);
        if (txn) deleteTransaction(txn.id);
        deleteInvoice(invoice.id);

        if (editingInvoiceId === invoice.id) resetBillEditor();
    };

    const filteredBills = useMemo(() => {
        const q = billSearch.trim().toLowerCase();
        return [...invoices]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .filter((invoice) => {
                if (!q) return true;
                return invoice.invoiceNumber.toLowerCase().includes(q) || invoice.customerName.toLowerCase().includes(q);
            });
    }, [invoices, billSearch]);

    const paymentMethods: { value: PaymentMethod; label: string; icon: typeof Wallet }[] = [
        { value: 'Cash', label: t.cash, icon: Wallet },
        { value: 'UPI', label: t.upi, icon: Smartphone },
        { value: 'Card', label: t.card, icon: CreditCard },
    ];

    return (
        <div className="mx-auto max-w-6xl">
            {/* Sticky Header */}
            <header className="sticky top-0 z-50 shrink-0 -mx-4 w-[calc(100%+2rem)] border-b bg-background/95 px-4 py-2.5 shadow-sm backdrop-blur sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:mx-0 lg:w-full">
                <div className="flex min-h-10 items-center gap-2">
                    <button type="button" onClick={() => window.history.back()} className="rounded-full p-2 hover:bg-muted" aria-label="Back">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="min-w-0 flex-1 text-base font-bold">POS</h1>
                    {editingInvoiceId && (
                        <span className="max-w-[42%] truncate rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                            {invoices.find((i) => i.id === editingInvoiceId)?.invoiceNumber}
                        </span>
                    )}
                    {isOnline ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Wifi className="h-3 w-3" /> ऑनलाइन
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <WifiOff className="h-3 w-3" /> ऑफलाइन
                        </span>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                {/* Product Grid - Left/Top */}
                <div className="lg:col-span-3">
                    {/* Search & Filters */}
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={t.searchProducts}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full sm:w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat === 'all' ? t.allCategories : cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <button
                            onClick={() => setPosOnly(!posOnly)}
                            className={cn(
                                'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                                posOnly
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border text-muted-foreground hover:bg-accent'
                            )}
                        >
                            <Store className="h-3.5 w-3.5" />
                            {t.showPOSOnly}
                        </button>
                    </div>

                    {/* Product Grid */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                        {filteredProducts.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
                                <Search className="mb-2 h-8 w-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">{t.noProductsFound}</p>
                            </div>
                        ) : (
                            filteredProducts.map((product) => {
                                const outOfStock = product.stock <= 0;
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        disabled={outOfStock}
                                        className={cn(
                                            'group relative flex flex-col items-center rounded-xl border bg-card p-3 text-center transition-all duration-200',
                                            outOfStock
                                                ? 'cursor-not-allowed border-border/40 opacity-50'
                                                : 'border-border hover:border-primary/40 hover:shadow-md active:scale-95'
                                        )}
                                    >
                                        <div className="relative mb-3 h-28 w-full overflow-hidden rounded-xl bg-muted sm:h-32">
                                            {product.photoUrl ? (
                                                <img
                                                    src={product.photoUrl}
                                                    alt={product.name}
                                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                    loading="lazy"
                                                    onError={(event) => {
                                                        event.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-4xl">
                                                    {product.emoji}
                                                </div>
                                            )}
                                            {outOfStock && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                                                    <span className="rounded-full bg-destructive/90 px-2 py-1 text-[10px] font-bold text-destructive-foreground">
                                                        {t.outOfStock}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="line-clamp-2 w-full text-xs font-semibold leading-tight">{product.name}</p>
                                        <p className="mt-1 text-sm font-bold text-primary">{formatCurrency(product.price)}</p>
                                        <p className={cn('mt-0.5 text-[10px]', outOfStock ? 'text-destructive' : 'text-muted-foreground')}>
                                            {outOfStock ? t.outOfStock : `${product.stock} ${t.inStock}`}
                                        </p>
                                        {cart.some((item) => item.product.id === product.id) && (
                                            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                                {cart.find((item) => item.product.id === product.id)?.quantity}
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Cart - Right/Bottom */}
                <div className="lg:col-span-2">
                    <div className="sticky top-20 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                        {/* Cart header */}
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                                <h3 className="text-sm font-bold">{t.cart}</h3>
                                {cart.length > 0 && (
                                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                                        {cart.length} {t.itemsInCart}
                                    </span>
                                )}
                            </div>
                            {cart.length > 0 && (
                                <button
                                    onClick={clearCart}
                                    className="flex items-center gap-1 text-xs font-medium text-destructive transition-colors hover:text-destructive/80"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {t.clearCart}
                                </button>
                            )}
                        </div>

                        {/* Cart items */}
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <ShoppingCart className="mb-2 h-10 w-10 text-muted-foreground/30" />
                                <p className="text-sm font-medium text-muted-foreground">{t.cartEmpty}</p>
                                <p className="mt-1 text-xs text-muted-foreground/70">{t.cartEmptyDesc}</p>
                            </div>
                        ) : (
                            <div className="mb-3 max-h-[240px] space-y-2 overflow-y-auto pr-1 lg:max-h-[280px]">
                                {cart.map((item) => (
                                    <div
                                        key={item.product.id}
                                        className="flex items-center gap-2 rounded-lg border border-border/40 p-2"
                                    >
                                        <span className="text-lg">{item.product.emoji}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-medium">{item.product.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatCurrency(item.product.price)} × {item.quantity}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => decrementItem(item.product.id)}
                                                className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                                            <button
                                                onClick={() => addToCart(item.product)}
                                                disabled={(() => {
                                                    const stock = products.find((p) => p.id === item.product.id)?.stock ?? 0;
                                                    const oldQty = editingInvoiceId
                                                        ? invoices.find((inv) => inv.id === editingInvoiceId)?.items
                                                            .filter((oldItem) => oldItem.product.id === item.product.id)
                                                            .reduce((sum, oldItem) => sum + oldItem.quantity, 0) ?? 0
                                                        : 0;
                                                    return item.quantity >= stock + oldQty;
                                                })()}
                                                className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Checkout section */}
                        {cart.length > 0 && (
                            <div className="space-y-3 border-t border-border pt-3">
                                {/* Customer name */}
                                <Input
                                    placeholder={t.customerNamePlaceholder}
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="text-sm"
                                />

                                {/* Payment method */}
                                <div>
                                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t.paymentMethod}</p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {paymentMethods.map((method) => {
                                            const Icon = method.icon;
                                            const isSelected = paymentMethod === method.value;
                                            return (
                                                <button
                                                    key={method.value}
                                                    onClick={() => setPaymentMethod(method.value)}
                                                    className={cn(
                                                        'flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium transition-all',
                                                        isSelected
                                                            ? 'border-primary bg-primary/10 text-primary'
                                                            : 'border-border text-muted-foreground hover:bg-accent'
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    {method.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Bank account for UPI/Card */}
                                {paymentMethod !== 'Cash' && bankAccounts.length > 0 && (
                                    <Select value={selectedBankAccountId} onValueChange={setSelectedBankAccountId}>
                                        <SelectTrigger className="text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankAccounts.map((acc) => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.bankName} ••••{acc.accountNumber.slice(-4)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {/* Discount */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">{t.discount} (₹):</span>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                        min="0"
                                        className="h-8 text-sm"
                                    />
                                </div>

                                {/* Totals */}
                                <div className="space-y-1 rounded-lg bg-muted/50 p-3">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">{t.subtotal}</span>
                                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{t.discount}</span>
                                            <span className="font-medium text-destructive">-{formatCurrency(discountAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t border-border pt-1 text-sm font-bold">
                                        <span>{t.total}</span>
                                        <span className="text-primary">{formatCurrency(total)}</span>
                                    </div>
                                </div>

                                {/* Checkout buttons */}
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        onClick={() => handleCheckout('2inch')}
                                        className="flex items-center justify-center gap-1.5 text-xs"
                                        size="sm"
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        {t.print2inch}
                                    </Button>
                                    <Button
                                        onClick={() => handleCheckout('3inch')}
                                        className="flex items-center justify-center gap-1.5 text-xs"
                                        size="sm"
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        {t.print3inch}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Saved Bills */}
            <section className="mt-5 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold">
                            <FileText className="h-5 w-5 text-primary" />
                            {t.savedBills}
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">{t.savedBillsDesc}</p>
                    </div>
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={billSearch}
                            onChange={(e) => setBillSearch(e.target.value)}
                            placeholder={t.billSearchPlaceholder}
                            className="pl-9"
                        />
                    </div>
                </div>

                {filteredBills.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        {t.noSavedBills}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredBills.map((invoice) => (
                            <div key={invoice.id} className="flex flex-col gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold">{invoice.invoiceNumber}</span>
                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{invoice.paymentMethod}</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{invoice.customerName || t.walkInCustomer}</span>
                                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
                                        <span>{invoice.items.reduce((sum, item) => sum + item.quantity, 0)} {t.itemsLabel}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-3 sm:justify-end">
                                    <span className="text-base font-bold text-primary">{formatCurrency(invoice.total)}</span>
                                    <div className="flex gap-1.5">
                                        <Button type="button" variant="outline" size="sm" className="pos-edit-action" onClick={() => startEditInvoice(invoice)}>
                                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t.edit}
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" className="pos-delete-action" onClick={() => handleDeleteInvoice(invoice)}>
                                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t.delete}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Receipt Dialog */}
            {receiptInvoice && (
                <ReceiptDialog
                    invoice={receiptInvoice}
                    bankAccount={receiptInvoice.upiAccountId ? bankAccounts.find((a) => a.id === receiptInvoice.upiAccountId) ?? null : (businessProfile.mainBankAccountId ? bankAccounts.find((a) => a.id === businessProfile.mainBankAccountId) ?? null : null)}
                    size={receiptSize}
                    onClose={() => setReceiptInvoice(null)}
                />
            )}
        </div>
    );
}