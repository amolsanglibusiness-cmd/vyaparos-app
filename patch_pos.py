from pathlib import Path
root=Path('/mnt/data/pos_work')

# types
p=root/'app/banking/types.ts'; s=p.read_text()
s=s.replace("  upiAccountId: string | null;\n}", "  upiAccountId: string | null;\n  transactionId?: string | null;\n}")
p.write_text(s)

# db
p=root/'lib/offline-db.ts'; s=p.read_text()
s=s.replace("  upi_account_id: string | null;\n  date: string;", "  upi_account_id: string | null;\n  transaction_id: string | null;\n  date: string;")
p.write_text(s)

# sync service
p=root/'lib/sync-service.ts'; s=p.read_text()
s=s.replace("      upi_account_id: 'upi_account_id',\n      date: 'date',", "      upi_account_id: 'upi_account_id',\n      transaction_id: 'transaction_id',\n      date: 'date',")
p.write_text(s)

# context
p=root/'app/banking/app-data-context.tsx'; s=p.read_text()
s=s.replace("  addInvoice: (invoice: Invoice) => void;\n", "  addInvoice: (invoice: Invoice) => void;\n  updateInvoice: (invoice: Invoice) => void;\n  deleteInvoice: (id: string) => void;\n")
s=s.replace("    upiAccountId: (row.upi_account_id as string | null) ?? null,\n    date:", "    upiAccountId: (row.upi_account_id as string | null) ?? null,\n    transactionId: (row.transaction_id as string | null) ?? null,\n    date:")
old="""  // --- Invoices ---\n  const addInvoice = useCallback((invoice: Invoice) => {\n    writeAndSync('invoices', {\n      id: invoice.id,\n      invoice_number: invoice.invoiceNumber,\n      items: JSON.stringify(invoice.items),\n      subtotal: invoice.subtotal,\n      discount: invoice.discount,\n      total: invoice.total,\n      payment_method: invoice.paymentMethod,\n      customer_name: invoice.customerName,\n      upi_account_id: invoice.upiAccountId,\n      date: invoice.date,\n      created_at: new Date().toISOString(),\n      is_synced: 'pending',\n    } as Record<string, unknown>, 'insert');\n  }, [writeAndSync]);\n"""
new="""  // --- Invoices ---\n  const invoiceRow = (invoice: Invoice) => ({\n    id: invoice.id,\n    invoice_number: invoice.invoiceNumber,\n    items: JSON.stringify(invoice.items),\n    subtotal: invoice.subtotal,\n    discount: invoice.discount,\n    total: invoice.total,\n    payment_method: invoice.paymentMethod,\n    customer_name: invoice.customerName,\n    upi_account_id: invoice.upiAccountId,\n    transaction_id: invoice.transactionId ?? null,\n    date: invoice.date,\n    created_at: invoice.date,\n  });\n\n  const addInvoice = useCallback((invoice: Invoice) => {\n    writeAndSync('invoices', {\n      ...invoiceRow(invoice),\n      is_synced: 'pending',\n    } as Record<string, unknown>, 'insert');\n  }, [writeAndSync]);\n\n  const updateInvoice = useCallback((invoice: Invoice) => {\n    writeAndSync('invoices', invoiceRow(invoice) as Record<string, unknown>, 'update');\n  }, [writeAndSync]);\n\n  const deleteInvoice = useCallback((id: string) => {\n    writeAndSync('invoices', { id } as Record<string, unknown>, 'delete');\n  }, [writeAndSync]);\n"""
if old not in s: raise SystemExit('invoice block not found')
s=s.replace(old,new)
s=s.replace("      addInvoice,\n      addLedgerParty,", "      addInvoice,\n      updateInvoice,\n      deleteInvoice,\n      addLedgerParty,")
s=s.replace("      addInvoice, addLedgerParty, updateLedgerParty, deleteLedgerParty,", "      addInvoice, updateInvoice, deleteInvoice, addLedgerParty, updateLedgerParty, deleteLedgerParty,")
p.write_text(s)

# migration
p=root/'supabase/migrations/20260921084516_create_app_data_tables.sql'; s=p.read_text()
s=s.replace("  upi_account_id text,\n  date timestamptz", "  upi_account_id text,\n  transaction_id uuid,\n  date timestamptz")
s += """\n\n-- POS bill source transaction linkage. Safe to run on an existing database.\nALTER TABLE invoices ADD COLUMN IF NOT EXISTS transaction_id uuid;\nCREATE INDEX IF NOT EXISTS idx_invoices_transaction_id ON invoices(transaction_id);\n"""
p.write_text(s)

# POS page
p=root/'app/banking/pos-page.tsx'; s=p.read_text()
s=s.replace("    RefreshCw,\n", "    RefreshCw,\n    Pencil,\n    FileText,\n    CalendarDays,\n    UserRound,\n")
s=s.replace("    const { bankAccounts, addTransaction, addInvoice } = useAppData();", "    const { bankAccounts, transactions, invoices, addTransaction, updateTransaction, deleteTransaction, addInvoice, updateInvoice, deleteInvoice } = useAppData();")
s=s.replace("    const [receiptSize, setReceiptSize] = useState<ReceiptSize>('3inch');", "    const [receiptSize, setReceiptSize] = useState<ReceiptSize>('3inch');\n    const [billSearch, setBillSearch] = useState('');\n    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);")
start=s.index('    const handleCheckout = (size: ReceiptSize) => {')
end=s.index("\n    const paymentMethods", start)
newfn=r'''    const getInvoiceTransaction = (invoice: Invoice) => {
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

        const ids = new Set([...oldQty.keys(), ...newQty.keys()]);
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

        applyStockDelta(existingInvoice, cart);

        const invoiceNumber = existingInvoice?.invoiceNumber ?? `INV-${Date.now().toString().slice(-8)}`;
        const transactionId = existingInvoice?.transactionId ?? getInvoiceTransaction(existingInvoice ?? ({ invoiceNumber } as Invoice))?.id ?? generateId('txn');
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
            upiAccountId: paymentMethod === 'UPI' ? selectedBankAccountId : null,
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
            updateTransaction(txnData);
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
        setPaymentMethod(invoice.paymentMethod);
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
'''
s=s[:start]+newfn+s[end:]
# insert saved bills before Receipt Dialog
marker="            {/* Receipt Dialog */}"
section=r'''            {/* Saved Bills */}
            <section className="mt-5 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold">
                            <FileText className="h-5 w-5 text-primary" />
                            Saved Bills / सेव्ह केलेली बिले
                        </h2>
                        <p className="mt-1 text-xs text-muted-foreground">Bill No. किंवा Customer Name वरून बिल शोधा, Edit किंवा Delete करा.</p>
                    </div>
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={billSearch}
                            onChange={(e) => setBillSearch(e.target.value)}
                            placeholder="Bill No. / Customer Name"
                            className="pl-9"
                        />
                    </div>
                </div>

                {filteredBills.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        कोणतेही saved bill सापडले नाही.
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
                                        <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{invoice.customerName || 'Walk-in Customer'}</span>
                                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
                                        <span>{invoice.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-3 sm:justify-end">
                                    <span className="text-base font-bold text-primary">{formatCurrency(invoice.total)}</span>
                                    <div className="flex gap-1.5">
                                        <Button type="button" variant="outline" size="sm" onClick={() => startEditInvoice(invoice)}>
                                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteInvoice(invoice)}>
                                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

'''
s=s.replace(marker,section+marker)
# add editing indicator near header subtitle
s=s.replace("                    <p className=\"mt-1 text-sm text-muted-foreground\">{t.posSubtitle}</p>", "                    <p className=\"mt-1 text-sm text-muted-foreground\">{t.posSubtitle}</p>\n                    {editingInvoiceId && (\n                        <div className=\"mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary\">\n                            <Pencil className=\"h-3.5 w-3.5\" /> Bill Edit Mode — {invoices.find((i) => i.id === editingInvoiceId)?.invoiceNumber}\n                            <button type=\"button\" onClick={resetBillEditor} className=\"ml-1 rounded-full px-1 hover:bg-primary/10\"><X className=\"h-3.5 w-3.5\" /></button>\n                        </div>\n                    )}")
p.write_text(s)
