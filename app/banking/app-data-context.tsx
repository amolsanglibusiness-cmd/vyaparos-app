'use client';

import { createContext, useContext, useCallback, useMemo, useEffect, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, clearAllLocalAppData, type TableName } from '@/lib/offline-db';
import { clearStoredInventory } from '@/src/lib/storage';
import { enqueueSync, syncAll } from '@/lib/sync-service';
import { supabase } from '@/lib/supabase';
import { prepareOfflineWorkspace } from '@/lib/offline-first';
import type {
  BankAccount,
  SubSavingsAccount,
  Transaction,
  FinancialGoal,
  InventoryItem,
  Invoice,
  LedgerParty,
  LedgerEntry,
} from './types';
import { GALLA_ID as MOCK_GALLA_ID, CASH_IN_HAND_ID } from './mock-data';
import { useMultiUser } from './multi-user-context';

export { MOCK_GALLA_ID as GALLA_ID };

interface AppDataContextValue {
  bankAccounts: BankAccount[];
  subSavings: SubSavingsAccount[];
  transactions: Transaction[];
  financialGoals: FinancialGoal[];
  inventoryItems: InventoryItem[];
  invoices: Invoice[];
  ledgerParties: LedgerParty[];
  ledgerEntries: LedgerEntry[];
  gallaBalance: number;
  gallaOpeningBalance: number;
  setGallaOpeningBalance: (amount: number) => void;
  cashInHandBalance: number;
  getBankBalance: (id: string) => number;

  addBankAccount: (account: BankAccount) => boolean | string | void;
  updateBankAccount: (account: BankAccount) => boolean | string | void;
  deleteBankAccount: (id: string) => void;

  addSubSavings: (account: SubSavingsAccount) => void;
  updateSubSavings: (account: SubSavingsAccount) => void;
  deleteSubSavings: (id: string) => void;

  addTransaction: (txn: Transaction) => boolean | string;
  updateTransaction: (txn: Transaction) => boolean | string;
  deleteTransaction: (id: string) => void;

  addFinancialGoal: (goal: FinancialGoal) => void;
  updateFinancialGoal: (goal: FinancialGoal) => void;
  deleteFinancialGoal: (id: string) => void;

  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (id: string) => void;

  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;

  addLedgerParty: (party: LedgerParty) => void;
  updateLedgerParty: (party: LedgerParty) => void;
  deleteLedgerParty: (id: string) => void;

  addLedgerEntry: (entry: LedgerEntry) => void;
  updateLedgerEntry: (entry: LedgerEntry) => void;
  deleteLedgerEntry: (id: string) => void;

  getAccountLabel: (id: string) => string;
  isGalla: (id: string) => boolean;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function mapBankAccount(row: Record<string, unknown>): BankAccount {
  return {
    id: row.id as string,
    bankName: row.bank_name as string,
    accountHolderName: String(row.account_holder ?? ''),
    accountNumber: String(row.account_number ?? ''),
    ifscCode: String(row.ifsc ?? row.ifsc_code ?? ''),
    accountType: row.account_type as 'Savings' | 'Current',
    balance: Number(row.balance ?? row.opening_balance ?? 0),
    upiId: String(row.upi_id ?? ''),
    branch: String(row.branch ?? ''),
    nickname: String(row.nickname ?? ''),
    openingDate: (row.opening_date as string | null) ?? null,
    status: String(row.status ?? 'Active'),
    showOnInvoice: row.show_on_invoice !== false,
    notes: String(row.notes ?? ''),
    createdAt: row.created_at as string,
  };
}

function mapSubSavings(row: Record<string, unknown>): SubSavingsAccount {
  return {
    id: row.id as string,
    schemeType: row.scheme_type as SubSavingsAccount['schemeType'],
    schemeNumber: row.scheme_number as string,
    linkedBankAccountId: (row.linked_bank_account_id as string | null) ?? null,
    depositAmount: row.deposit_amount as number,
    maturityDate: (row.maturity_date as string | null) ?? null,
    interestRate: row.interest_rate as number,
    status: row.status as SubSavingsAccount['status'],
    createdAt: row.created_at as string,
  };
}

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    type: row.type as Transaction['type'],
    amount: row.amount as number,
    category: row.category as Transaction['category'],
    description: row.description as string,
    date: row.date as string,
    tag: (row.tag as Transaction['tag']) ?? null,
    sourceAccountId: row.source_account_id as string,
    destAccountId: (row.dest_account_id as string | null) ?? null,
    isFromGalla: row.is_from_galla as boolean,
    shopName: String(row.shop_name ?? ''),
    expenseItems: parseJsonField(row.expense_items, []),
    createdAt: row.created_at as string,
  };
}

function mapGoal(row: Record<string, unknown>): FinancialGoal {
  return {
    id: row.id as string,
    title: row.title as string,
    targetAmount: row.target_amount as number,
    savedAmount: row.saved_amount as number,
    deadline: row.deadline as string,
    color: row.color as string,
  };
}

function mapInventoryItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    name: row.name as string,
    stock: row.stock as number,
    minStock: row.min_stock as number,
    unit: row.unit as string,
    category: row.category as string,
    purchasePrice: row.purchase_price as number,
    sellingPrice: row.selling_price as number,
    taxRate: Number(row.tax_rate ?? 0),
    hsnCode: String(row.hsn_code ?? ''),
    photoUrl: (row.photo_url as string | null) ?? null,
    showOnPOS: row.show_on_pos as boolean,
    createdAt: row.created_at as string,
  };
}

function parseJsonField(value: unknown, fallback: unknown): any {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (typeof value === 'string') { try { return JSON.parse(value); } catch { return fallback; } }
  return fallback;
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    items: parseJsonField(row.items, []),
    subtotal: row.subtotal as number,
    discount: row.discount as number,
    total: row.total as number,
    paymentMethod: row.payment_method as Invoice['paymentMethod'],
    customerName: row.customer_name as string,
    upiAccountId: (row.upi_account_id as string | null) ?? null,
    transactionId: (row.transaction_id as string | null) ?? null,
    date: row.date as string,
    createdAt: (row.created_at as string | undefined),
    customerId: (row.customer_id as string | null) ?? null,
    customerPhone: String(row.customer_phone ?? ''),
    customerAddress: String(row.customer_address ?? ''),
    taxMode: (row.tax_mode as Invoice['taxMode']) ?? 'percentage',
    taxValue: Number(row.tax_value ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    discountMode: (row.discount_mode as Invoice['discountMode']) ?? 'fixed',
    discountValue: Number(row.discount_value ?? 0),
    roundOff: Boolean(row.round_off),
    roundOffAmount: Number(row.round_off_amount ?? 0),
    paymentAccountId: (row.payment_account_id as string | null) ?? null,
    paymentStatus: (row.payment_status as Invoice['paymentStatus']) ?? 'Paid',
    balanceDue: Number(row.balance_due ?? 0),
    terms: String(row.terms ?? ''),
    signatureEnabled: row.signature_enabled === undefined ? true : Boolean(row.signature_enabled),
    stateOfSupply: String(row.state_of_supply ?? ''),
    description: String(row.description ?? ''),
    attachmentName: String(row.attachment_name ?? ''),
    attachmentDataUrl: String(row.attachment_data_url ?? ''),
  };
}

function mapLedgerParty(row: Record<string, unknown>): LedgerParty {
  return {
    id: row.id as string,
    name: row.name as string,
    businessContactNumber: (row.businessContactNumber as string) || '',
    type: row.type as LedgerParty['type'],
    phone: row.phone as string,
    email: row.email as string,
    address: row.address as string,
    photoUrl: (row.photo_url as string | null) ?? null,
    upiId: row.upi_id as string,
    openingBalance: Number(row.opening_balance ?? 0),
    gstin: String(row.gstin ?? ''),
    notes: row.notes as string,
    createdAt: row.created_at as string,
  };
}

function mapLedgerEntry(row: Record<string, unknown>): LedgerEntry {
  return {
    id: row.id as string,
    partyId: row.party_id as string,
    type: row.type as LedgerEntry['type'],
    amount: row.amount as number,
    description: row.description as string,
    date: row.date as string,
    createdAt: row.created_at as string,
    transactionId: (row.transaction_id as string | null) ?? undefined,
  };
}

const now = () => Date.now();

const GALLA_OPENING_BALANCE_KEY = 'vyaparos:galla-opening-balance';

function readGallaOpeningBalance(key = GALLA_OPENING_BALANCE_KEY): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(key);
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getLocalDateKey(value: string): string {
  const raw = String(value || '').trim();
  return /^\\d{4}-\\d{2}-\\d{2}$/.test(raw) ? raw : new Date(raw).toISOString().slice(0, 10);
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [gallaOpeningBalance, setGallaOpeningBalanceState] = useState(0);
  const [gallaOpeningBalanceKey, setGallaOpeningBalanceKey] = useState(GALLA_OPENING_BALANCE_KEY);
  const { cashMode, gallaMode, businessMembers, businessId, businesses } = useMultiUser();
  const [sharedBankBalances, setSharedBankBalances] = useState<Record<string, number>>({});
  const [sharedCashNet, setSharedCashNet] = useState(0);
  const [sharedGallaNet, setSharedGallaNet] = useState(0);
  const [sharedTransactions, setSharedTransactions] = useState<Transaction[]>([]);

  const setGallaOpeningBalance = useCallback((amount: number) => {
    const safe = Number.isFinite(amount) && amount >= 0 ? amount : 0;
    setGallaOpeningBalanceState(safe);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(gallaOpeningBalanceKey, String(safe));
    }
  }, [gallaOpeningBalanceKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      const key = userId ? `${GALLA_OPENING_BALANCE_KEY}:${userId}` : GALLA_OPENING_BALANCE_KEY;
      if (cancelled) return;
      setGallaOpeningBalanceKey(key);
      setGallaOpeningBalanceState(readGallaOpeningBalance(key));
    })().catch(() => {
      if (!cancelled) setGallaOpeningBalanceState(readGallaOpeningBalance());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Production mode: never seed demo/mock records into the user's database.
  // One-time cleanup removes the old demo/stale local cache created by earlier
  // builds. The marker is scoped to the authenticated user, while Auth itself
  // is never modified. After cleanup, only that user's Supabase data is pulled.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId || cancelled || typeof window === 'undefined') return;

      const RESET_VERSION = 'vyaparos-clean-data-v2';
      const markerKey = `vyaparos:${RESET_VERSION}:${userId}`;
      const workspace = await prepareOfflineWorkspace(userId);

      // One-time cleanup for databases created by the older builds.
      if (!workspace.switchedUser && window.localStorage.getItem(markerKey) !== 'done') {
        await clearAllLocalAppData();
        clearStoredInventory();
        window.localStorage.setItem(markerKey, 'done');
      }

      // Local Dexie is the source of truth for rendering. Cloud sync is a
      // background enhancement and is deliberately skipped by sync-service
      // when the device is offline.
      if (!cancelled) await syncAll();
    })().catch((error) => {
      console.error('[VyaparOS] Offline workspace initialization/sync failed:', error);
    });

    return () => { cancelled = true; };
  }, []);

  // A business switch must never keep the previous business's Dexie rows.
  // Flush the selected workspace from cloud after isolating the local cache.
  useEffect(() => {
    if (!businessId || typeof window === 'undefined') return;
    let cancelled = false;
    const switchWorkspace = async () => {
      await clearAllLocalAppData();
      if (!cancelled) await syncAll();
    };
    void switchWorkspace().catch((error) => console.error('[VyaparOS] Business workspace sync failed:', error));
    return () => { cancelled = true; };
  }, [businessId]);

  // Live queries — automatically re-render when Dexie data changes
  const bankAccountRows = useLiveQuery(() => db.bank_accounts.toArray(), []) ?? [];
  const subSavingsRows = useLiveQuery(() => db.sub_savings.toArray(), []) ?? [];
  const transactionRows = useLiveQuery(() => db.transactions.toArray(), []) ?? [];
  const goalRows = useLiveQuery(() => db.financial_goals.toArray(), []) ?? [];
  const inventoryRows = useLiveQuery(() => db.inventory_items.toArray(), []) ?? [];
  const invoiceRows = useLiveQuery(() => db.invoices.toArray(), []) ?? [];
  const partyRows = useLiveQuery(() => db.ledger_parties.toArray(), []) ?? [];
  const entryRows = useLiveQuery(() => db.ledger_entries.toArray(), []) ?? [];

  const bankAccounts = bankAccountRows.map((r) => mapBankAccount(r as unknown as Record<string, unknown>));
  const subSavings = subSavingsRows.map((r) => mapSubSavings(r as unknown as Record<string, unknown>));
  const activeBusinessName = businesses.find((b) => b.id === businessId)?.name ?? '';
  const actualTransactions = transactionRows.map((r) => ({ ...mapTransaction(r as unknown as Record<string, unknown>), businessName: activeBusinessName }));

  const ownBankBalance = useMemo(() => {
    const result: Record<string, number> = {};
    for (const account of bankAccounts) {
      let value = Number(account.balance) || 0;
      for (const txn of actualTransactions) {
        if (txn.sourceAccountId === account.id) {
          if (txn.type === 'Income') value += Number(txn.amount) || 0;
          else if (txn.type === 'Expense' || txn.type === 'Transfer') value -= Number(txn.amount) || 0;
        }
        if (txn.destAccountId === account.id && txn.type === 'Transfer') value += Number(txn.amount) || 0;
      }
      result[account.id] = value;
    }
    return result;
  }, [bankAccounts, actualTransactions]);

  useEffect(() => {
  let cancelled = false;

  const loadShared = async () => {
    const results = await Promise.all(
      bankAccounts.map(async (account) => {
        const [balanceResult, transactionResult] = await Promise.all([
          supabase.rpc('get_shared_bank_balance', {
            p_account_number: account.accountNumber,
            p_ifsc_code: account.ifscCode,
          }),
          supabase.rpc('get_shared_bank_transactions', {
            p_account_number: account.accountNumber,
            p_ifsc_code: account.ifscCode,
          }),
        ]);
        const balance = balanceResult.error || balanceResult.data === null || balanceResult.data === undefined
          ? ownBankBalance[account.id] ?? 0
          : Number(balanceResult.data) || 0;
        return { account, balance, rows: (transactionResult.data ?? []) as Record<string, unknown>[] };
      })
    );

    if (cancelled) return;

    const newSharedBalances = Object.fromEntries(results.map((r) => [r.account.id, r.balance]));
    const ownIds = new Set(actualTransactions.map((txn) => txn.id));
    const sharedById = new Map<string, Transaction>();
    for (const result of results) {
      for (const row of result.rows) {
        const id = String(row.id ?? '');
        if (!id || ownIds.has(id)) continue;
        const source = String(row.source_account_id ?? '');
        const dest = row.dest_account_id == null ? null : String(row.dest_account_id);
        const sharedAccount = result.account.id;
        // The RPC tells us which side belongs to the matching shared bank.
        // Replace only that side with this business's local bank id.
        const sourceLocal = Boolean(row.source_is_shared_bank) ? sharedAccount : source;
        const destLocal = Boolean(row.dest_is_shared_bank) ? sharedAccount : dest;
        sharedById.set(id, {
          id,
          type: String(row.type) as Transaction['type'],
          amount: Number(row.amount) || 0,
          category: String(row.category ?? 'Other'),
          description: String(row.description ?? ''),
          date: String(row.date ?? new Date().toISOString()),
          tag: (row.tag as Transaction['tag']) ?? null,
          sourceAccountId: sourceLocal,
          destAccountId: destLocal,
          isFromGalla: Boolean(row.is_from_galla),
          shopName: String(row.shop_name ?? ''),
          expenseItems: Array.isArray(row.expense_items) ? row.expense_items as Transaction['expenseItems'] : [],
          createdAt: String(row.created_at ?? row.date ?? new Date().toISOString()),
          isShared: true,
          businessName: String(row.business_name ?? 'Other Business'),
        });
      }
    }
    setSharedTransactions(Array.from(sharedById.values()));

    // १. डेटा प्रत्यक्षात बदलला असेल तरच स्टेट अपडेट करा (Infinite Loop थांबवण्यासाठी)
    setSharedBankBalances((prev) =>
      JSON.stringify(prev) === JSON.stringify(newSharedBalances) ? prev : newSharedBalances
    );

    if (cashMode === 'shared' || gallaMode === 'shared') {
      const [cash, galla] = await Promise.all([
        cashMode === 'shared'
          ? supabase.rpc('get_shared_cash_galla_balance', { p_account_id: CASH_IN_HAND_ID })
          : Promise.resolve({ data: 0 }),
        gallaMode === 'shared'
          ? supabase.rpc('get_shared_cash_galla_balance', { p_account_id: MOCK_GALLA_ID })
          : Promise.resolve({ data: 0 }),
      ]);

      if (!cancelled) {
        const newCash = Number(cash.data ?? 0);
        const newGalla = Number(galla.data ?? 0);

        setSharedCashNet((prev) => (prev === newCash ? prev : newCash));
        setSharedGallaNet((prev) => (prev === newGalla ? prev : newGalla));
      }
    } else if (!cancelled) {
      setSharedCashNet(0);
      setSharedGallaNet(0);
    }
  };

  void loadShared();

  return () => {
    cancelled = true;
  };
  // २. Objects/Arrays ची 'Value' बदलल्यावरच useEffect रन होईल, नवीन Reference मुळे नाही
}, [
  JSON.stringify(bankAccounts),
  JSON.stringify(actualTransactions),
  cashMode,
  gallaMode,
  businessMembers.length,
  JSON.stringify(ownBankBalance),
  JSON.stringify(actualTransactions),
]);

  // AUTO-GALLA-INCOME is a real saved transaction created automatically when
  // money is spent/transferred from Galla. It is intentionally hidden only by
  // the Transactions history UI; dashboard, balances and reports can still use it.
  const autoGallaIncomeId = (txnId: string) => `auto-galla-income-${txnId}`;
  const isAutoGallaIncome = (txn: Transaction) =>
    txn.category === 'Automatic Galla Income' || txn.description.startsWith('[AUTO-GALLA-INCOME]');

  const transactions = useMemo(() => [...actualTransactions, ...sharedTransactions], [actualTransactions, sharedTransactions]);
  const transactionsWithBackgroundGalla = transactions;

  const financialGoals = goalRows.map((r) => mapGoal(r as unknown as Record<string, unknown>));
  const inventoryItems = inventoryRows.map((r) => mapInventoryItem(r as unknown as Record<string, unknown>));
  const invoices = invoiceRows.map((r) => mapInvoice(r as unknown as Record<string, unknown>));
  const ledgerParties = partyRows.map((r) => mapLedgerParty(r as unknown as Record<string, unknown>));
  const ledgerEntries = entryRows.map((r) => mapLedgerEntry(r as unknown as Record<string, unknown>));

  // Galla = opening cash + all real/derived Galla inflows - all Galla outflows.
  // Opening balance is never counted as today's business income.
  const gallaBalance = useMemo(() => {
    let ownNet = 0;
    for (const txn of transactionsWithBackgroundGalla) {
      if (txn.sourceAccountId === MOCK_GALLA_ID) {
        if (txn.type === 'Income') ownNet += txn.amount;
        else if (txn.type === 'Expense' || txn.type === 'Transfer') ownNet -= txn.amount;
      }
      if (txn.destAccountId === MOCK_GALLA_ID && txn.type === 'Transfer') ownNet += txn.amount;
    }
    return gallaMode === 'shared' ? gallaOpeningBalance + sharedGallaNet : gallaOpeningBalance + ownNet;
  }, [transactionsWithBackgroundGalla, gallaOpeningBalance, gallaMode, sharedGallaNet]);

  // Cash in Hand is a separate physical-cash account. Existing Galla remains
  // the shop cash box, so the two balances never get mixed.
  const cashInHandBalance = useMemo(() => {
    if (cashMode === 'shared') return sharedCashNet;
    let bal = 0;
    for (const txn of transactions) {
      if (txn.sourceAccountId === CASH_IN_HAND_ID) {
        if (txn.type === 'Income') bal += txn.amount;
        else if (txn.type === 'Expense' || txn.type === 'Transfer') bal -= txn.amount;
      }
      if (txn.destAccountId === CASH_IN_HAND_ID && txn.type === 'Transfer') bal += txn.amount;
    }
    return bal;
  }, [transactions, cashMode, sharedCashNet]);

  const getBankBalance = useCallback((id: string) => {
    const local = ownBankBalance[id] ?? (bankAccounts.find((a) => a.id === id)?.balance || 0);
    const shared = sharedBankBalances[id];
    // A shared RPC returning 0 must not hide a valid local balance while the
    // shared aggregation is still catching up. Bank balances cannot be negative.
    return shared === undefined ? local : Math.max(local, Number(shared) || 0);
  }, [sharedBankBalances, ownBankBalance, bankAccounts]);

  // --- Helpers to write + enqueue sync ---
  const writeAndSync = useCallback(
    async <T extends Record<string, unknown>>(
      table: TableName,
      row: T,
      operation: 'insert' | 'update' | 'delete'
    ) => {
      const tableRef = (db as unknown as Record<string, {
        put: (r: T) => Promise<unknown>;
        delete: (id: string) => Promise<unknown>;
      }>)[table];
      if (operation === 'delete') {
        await tableRef.delete(row.id as string);
      } else {
        await tableRef.put({ ...row, updated_at: now() });
      }
      await enqueueSync(table, row.id as string, operation, row);

      // Do not wait for the 60-second background interval. When the browser
      // is online, push this change immediately; if auth/network is unavailable
      // the queue remains safely stored in Dexie for the next retry.
      if (typeof navigator === 'undefined' || navigator.onLine) {
        void syncAll().catch((error) => {
          console.error('[Supabase Sync] Immediate sync failed:', error);
        });
      }
    },
    []
  );

  // --- Bank Accounts ---
  const addBankAccount = useCallback((account: BankAccount) => {
    const bankName = account.bankName.trim();
    const accountNumber = account.accountNumber.trim();
    const holder = account.accountHolderName.trim();
    if (!bankName || !holder || !accountNumber) {
      return 'बँक नेम, अकाऊंट होल्डर आणि अकाऊंट नंबर अनिवार्य आहेत.';
    }
    const duplicate = bankAccounts.some((existing) =>
      existing.bankName.trim().toLowerCase() === bankName.toLowerCase() &&
      existing.accountNumber.replace(/\\s+/g, '').toLowerCase() === accountNumber.replace(/\\s+/g, '').toLowerCase()
    );
    if (duplicate) {
      return `हे बँक खाते आधीपासून सेव्ह आहे: ${bankName} ••••${accountNumber.slice(-4)}`;
    }
    void writeAndSync('bank_accounts', {
      id: account.id,
      bank_name: bankName,
      account_holder_name: holder,
      account_number: accountNumber,
      ifsc_code: account.ifscCode.trim().toUpperCase(),
      account_type: account.accountType,
      balance: Number(account.balance) || 0,
      opening_balance: Number(account.balance) || 0,
      upi_id: account.upiId?.trim() || '',
      branch: account.branch?.trim() || '',
      nickname: account.nickname?.trim() || '',
      opening_date: account.openingDate || null,
      status: account.status || 'Active',
      show_on_invoice: account.showOnInvoice !== false,
      notes: account.notes?.trim() || '',
      created_at: account.createdAt,
      is_synced: 'pending',
    } as Record<string, unknown>, 'insert');
    return true;
  }, [writeAndSync, bankAccounts]);

  const updateBankAccount = useCallback((account: BankAccount) => {
    const bankName = account.bankName.trim();
    const accountNumber = account.accountNumber.trim();
    const holder = account.accountHolderName.trim();
    if (!bankName || !holder || !accountNumber) return 'बँक नेम, अकाऊंट होल्डर आणि अकाऊंट नंबर अनिवार्य आहेत.';
    const duplicate = bankAccounts.some((existing) =>
      existing.id !== account.id &&
      existing.bankName.trim().toLowerCase() === bankName.toLowerCase() &&
      existing.accountNumber.replace(/\\s+/g, '').toLowerCase() === accountNumber.replace(/\\s+/g, '').toLowerCase()
    );
    if (duplicate) return 'याच बँक नावाचा आणि अकाऊंट नंबरचा खाते आधीपासून आहे.';
    void writeAndSync('bank_accounts', {
      id: account.id,
      bank_name: bankName,
      account_holder_name: holder,
      account_number: accountNumber,
      ifsc_code: account.ifscCode.trim().toUpperCase(),
      account_type: account.accountType,
      balance: Number(account.balance) || 0,
      opening_balance: Number(account.balance) || 0,
      upi_id: account.upiId?.trim() || '',
      branch: account.branch?.trim() || '',
      nickname: account.nickname?.trim() || '',
      opening_date: account.openingDate || null,
      status: account.status || 'Active',
      show_on_invoice: account.showOnInvoice !== false,
      notes: account.notes?.trim() || '',
      created_at: account.createdAt,
    } as Record<string, unknown>, 'update');
    return true;
  }, [writeAndSync, bankAccounts]);

  const deleteBankAccount = useCallback((id: string) => {
    writeAndSync('bank_accounts', { id } as Record<string, unknown>, 'delete');
  }, [writeAndSync]);

  // --- Sub Savings ---
  const addSubSavings = useCallback((account: SubSavingsAccount) => {
    writeAndSync('sub_savings', {
      id: account.id,
      scheme_type: account.schemeType,
      scheme_number: account.schemeNumber,
      linked_bank_account_id: account.linkedBankAccountId,
      deposit_amount: account.depositAmount,
      maturity_date: account.maturityDate,
      interest_rate: account.interestRate,
      status: account.status,
      created_at: account.createdAt,
      is_synced: 'pending',
    } as Record<string, unknown>, 'insert');
  }, [writeAndSync]);

  const updateSubSavings = useCallback((account: SubSavingsAccount) => {
    writeAndSync('sub_savings', {
      id: account.id,
      scheme_type: account.schemeType,
      scheme_number: account.schemeNumber,
      linked_bank_account_id: account.linkedBankAccountId,
      deposit_amount: account.depositAmount,
      maturity_date: account.maturityDate,
      interest_rate: account.interestRate,
      status: account.status,
      created_at: account.createdAt,
    } as Record<string, unknown>, 'update');
  }, [writeAndSync]);

  const deleteSubSavings = useCallback((id: string) => {
    writeAndSync('sub_savings', { id } as Record<string, unknown>, 'delete');
  }, [writeAndSync]);

  // --- Transactions ---
  const adjustSavingsBalance = useCallback((id: string, delta: number) => {
    const account = subSavings.find((item) => item.id === id);
    if (!account || !Number.isFinite(delta) || delta === 0) return;
    writeAndSync('sub_savings', {
      id: account.id,
      scheme_type: account.schemeType,
      scheme_number: account.schemeNumber,
      linked_bank_account_id: account.linkedBankAccountId,
      deposit_amount: Math.max(0, account.depositAmount + delta),
      maturity_date: account.maturityDate,
      interest_rate: account.interestRate,
      status: account.status,
      created_at: account.createdAt,
    } as Record<string, unknown>, 'update');
  }, [subSavings, writeAndSync]);

  const transactionRow = (txn: Transaction) => ({
    id: txn.id,
    type: txn.type,
    amount: txn.amount,
    category: txn.category,
    description: txn.description,
    date: txn.date,
    tag: txn.tag,
    source_account_id: txn.sourceAccountId,
    dest_account_id: txn.destAccountId,
    is_from_galla: txn.isFromGalla,
    shop_name: txn.shopName ?? '',
    expense_items: JSON.stringify(txn.expenseItems ?? []),
    created_at: txn.createdAt,
    is_synced: 'pending',
  } as Record<string, unknown>);

  const shouldCreateAutoGallaIncome = (txn: Transaction) =>
    !isAutoGallaIncome(txn) &&
    txn.sourceAccountId === MOCK_GALLA_ID &&
    (txn.type === 'Expense' || txn.type === 'Transfer' || txn.type === 'Savings') &&
    txn.amount > 0;

  const buildAutoGallaIncome = (txn: Transaction): Transaction => ({
    id: autoGallaIncomeId(txn.id),
    type: 'Income',
    amount: txn.amount,
    category: 'Automatic Galla Income',
    description: `[AUTO-GALLA-INCOME] Galla income for ${txn.id}`,
    date: txn.date,
    tag: 'Shop / Business',
    sourceAccountId: MOCK_GALLA_ID,
    destAccountId: null,
    isFromGalla: false,
    createdAt: txn.createdAt,
  });

  const addTransaction = useCallback((txn: Transaction) => {
    const sourceBank = bankAccounts.find((account) => account.id === txn.sourceAccountId);
    const bankOutflow = txn.type === 'Expense' || txn.type === 'Transfer' || txn.type === 'Savings';
    if (sourceBank && bankOutflow && txn.amount > getBankBalance(sourceBank.id)) {
      const available = getBankBalance(sourceBank.id);
      return `बँक बॅलेन्स अपुरा आहे. उपलब्ध बॅलेन्स ₹${available.toLocaleString('en-IN')}, व्यवहारासाठी ₹${txn.amount.toLocaleString('en-IN')} आवश्यक आहेत.`;
    }
    if (txn.type === 'Savings' && txn.destAccountId) {
      adjustSavingsBalance(txn.destAccountId, txn.amount);
    }

    void writeAndSync('transactions', transactionRow(txn), 'insert');

    // Preserve the original Galla accounting behavior: when an expense/transfer
    // is taken from Galla, create an equal Income entry automatically. The entry
    // is stored normally so balances/reports remain correct, but the history UI
    // hides it by its AUTO-GALLA-INCOME marker.
    if (shouldCreateAutoGallaIncome(txn)) {
      const auto = buildAutoGallaIncome(txn);
      void writeAndSync('transactions', transactionRow(auto), 'insert');
    }

    return true;
  }, [adjustSavingsBalance, writeAndSync, bankAccounts, getBankBalance]);

  const updateTransaction = useCallback((txn: Transaction) => {
    const previous = actualTransactions.find((item) => item.id === txn.id);
    const sourceBank = bankAccounts.find((account) => account.id === txn.sourceAccountId);
    const bankOutflow = txn.type === 'Expense' || txn.type === 'Transfer' || txn.type === 'Savings';
    if (sourceBank && bankOutflow) {
      const available = getBankBalance(sourceBank.id);
      const oldSourceSame = previous?.sourceAccountId === txn.sourceAccountId &&
        (previous.type === 'Expense' || previous.type === 'Transfer' || previous.type === 'Savings');
      const effectiveAvailable = available + (oldSourceSame ? Number(previous.amount) || 0 : 0);
      if (txn.amount > effectiveAvailable) {
        return `बँक बॅलेन्स अपुरा आहे. उपलब्ध बॅलेन्स ₹${effectiveAvailable.toLocaleString('en-IN')}, व्यवहारासाठी ₹${txn.amount.toLocaleString('en-IN')} आवश्यक आहेत.`;
      }
    }
    if (previous?.type === 'Savings' && previous.destAccountId) {
      adjustSavingsBalance(previous.destAccountId, -previous.amount);
    }
    if (txn.type === 'Savings' && txn.destAccountId) {
      adjustSavingsBalance(txn.destAccountId, txn.amount);
    }

    void writeAndSync('transactions', transactionRow(txn), 'update');

    const previousAutoId = autoGallaIncomeId(previous?.id || txn.id);
    const previousHadAuto = !!previous && shouldCreateAutoGallaIncome(previous);
    const nextHasAuto = shouldCreateAutoGallaIncome(txn);

    if (previousHadAuto && !nextHasAuto) {
      void writeAndSync('transactions', { id: previousAutoId }, 'delete');
    } else if (previousHadAuto && nextHasAuto) {
      const auto = buildAutoGallaIncome(txn);
      void writeAndSync('transactions', transactionRow(auto), 'update');
    } else if (!previousHadAuto && nextHasAuto) {
      const auto = buildAutoGallaIncome(txn);
      void writeAndSync('transactions', transactionRow(auto), 'insert');
    }

    return true;
  }, [actualTransactions, adjustSavingsBalance, writeAndSync, bankAccounts, getBankBalance]);

  const deleteTransaction = useCallback((id: string) => {
    const previous = actualTransactions.find((item) => item.id === id);
    if (previous?.type === 'Savings' && previous.destAccountId) {
      adjustSavingsBalance(previous.destAccountId, -previous.amount);
    }
    void writeAndSync('transactions', { id } as Record<string, unknown>, 'delete');
    if (previous && shouldCreateAutoGallaIncome(previous)) {
      void writeAndSync('transactions', { id: autoGallaIncomeId(previous.id) }, 'delete');
    }
  }, [actualTransactions, adjustSavingsBalance, writeAndSync]);

  // --- Financial Goals ---
  const addFinancialGoal = useCallback((goal: FinancialGoal) => {
    writeAndSync('financial_goals', {
      id: goal.id,
      title: goal.title,
      target_amount: goal.targetAmount,
      saved_amount: goal.savedAmount,
      deadline: goal.deadline,
      color: goal.color,
      created_at: new Date().toISOString(),
      is_synced: 'pending',
    } as Record<string, unknown>, 'insert');
  }, [writeAndSync]);

  const updateFinancialGoal = useCallback((goal: FinancialGoal) => {
    writeAndSync('financial_goals', {
      id: goal.id,
      title: goal.title,
      target_amount: goal.targetAmount,
      saved_amount: goal.savedAmount,
      deadline: goal.deadline,
      color: goal.color,
      created_at: new Date().toISOString(),
    } as Record<string, unknown>, 'update');
  }, [writeAndSync]);

  const deleteFinancialGoal = useCallback((id: string) => {
    writeAndSync('financial_goals', { id } as Record<string, unknown>, 'delete');
  }, [writeAndSync]);

  // --- Inventory Items ---
  const addInventoryItem = useCallback((item: InventoryItem) => {
    writeAndSync('inventory_items', {
      id: item.id,
      name: item.name,
      stock: item.stock,
      min_stock: item.minStock,
      unit: item.unit,
      category: item.category,
      purchase_price: item.purchasePrice,
      selling_price: item.sellingPrice,
      tax_rate: item.taxRate ?? 0,
      hsn_code: item.hsnCode ?? '',
      photo_url: item.photoUrl,
      show_on_pos: item.showOnPOS,
      created_at: item.createdAt,
      is_synced: 'pending',
    } as Record<string, unknown>, 'insert');
  }, [writeAndSync]);

  const updateInventoryItem = useCallback((item: InventoryItem) => {
    writeAndSync('inventory_items', {
      id: item.id,
      name: item.name,
      stock: item.stock,
      min_stock: item.minStock,
      unit: item.unit,
      category: item.category,
      purchase_price: item.purchasePrice,
      selling_price: item.sellingPrice,
      tax_rate: item.taxRate ?? 0,
      hsn_code: item.hsnCode ?? '',
      photo_url: item.photoUrl,
      show_on_pos: item.showOnPOS,
      created_at: item.createdAt,
    } as Record<string, unknown>, 'update');
  }, [writeAndSync]);

  const deleteInventoryItem = useCallback((id: string) => {
    writeAndSync('inventory_items', { id } as Record<string, unknown>, 'delete');
  }, [writeAndSync]);

  // --- Invoices ---
  const invoiceRow = (invoice: Invoice) => ({
    id: invoice.id,
    invoice_number: invoice.invoiceNumber,
    items: JSON.stringify(invoice.items),
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    total: invoice.total,
    payment_method: invoice.paymentMethod,
    customer_name: invoice.customerName,
    upi_account_id: invoice.upiAccountId,
    transaction_id: invoice.transactionId ?? null,
    date: invoice.date,
    created_at: invoice.createdAt ?? invoice.date,
    customer_id: invoice.customerId ?? null,
    customer_phone: invoice.customerPhone ?? '',
    customer_address: invoice.customerAddress ?? '',
    tax_mode: invoice.taxMode ?? 'percentage',
    tax_value: invoice.taxValue ?? 0,
    tax_amount: invoice.taxAmount ?? 0,
    discount_mode: invoice.discountMode ?? 'fixed',
    discount_value: invoice.discountValue ?? invoice.discount,
    round_off: invoice.roundOff ?? false,
    round_off_amount: invoice.roundOffAmount ?? 0,
    payment_account_id: invoice.paymentAccountId ?? null,
    payment_status: invoice.paymentStatus ?? (invoice.paymentMethod === 'Credit/Pending' ? 'Pending' : 'Paid'),
    balance_due: invoice.balanceDue ?? 0,
    terms: invoice.terms ?? '',
    signature_enabled: invoice.signatureEnabled ?? true,
    state_of_supply: invoice.stateOfSupply ?? '',
    description: invoice.description ?? '',
    attachment_name: invoice.attachmentName ?? '',
    attachment_data_url: invoice.attachmentDataUrl ?? '',
  });

  const addInvoice = useCallback((invoice: Invoice) => {
    writeAndSync('invoices', {
      ...invoiceRow(invoice),
      is_synced: 'pending',
    } as Record<string, unknown>, 'insert');
  }, [writeAndSync]);

  const updateInvoice = useCallback((invoice: Invoice) => {
    writeAndSync('invoices', invoiceRow(invoice) as Record<string, unknown>, 'update');
  }, [writeAndSync]);

  const deleteInvoice = useCallback((id: string) => {
    writeAndSync('invoices', { id } as Record<string, unknown>, 'delete');
  }, [writeAndSync]);

  // --- Ledger Parties ---
  const addLedgerParty = useCallback((party: LedgerParty) => {
    writeAndSync('ledger_parties', {
      id: party.id,
      name: party.name,
      type: party.type,
      phone: party.phone,
      email: party.email,
      address: party.address,
      photo_url: party.photoUrl,
      upi_id: party.upiId,
      opening_balance: party.openingBalance,
      gstin: party.gstin || null,
      notes: party.notes,
      created_at: party.createdAt,
      is_synced: 'pending',
    } as Record<string, unknown>, 'insert');
  }, [writeAndSync]);

  const updateLedgerParty = useCallback((party: LedgerParty) => {
    writeAndSync('ledger_parties', {
      id: party.id,
      name: party.name,
      type: party.type,
      phone: party.phone,
      email: party.email,
      address: party.address,
      photo_url: party.photoUrl,
      upi_id: party.upiId,
      opening_balance: party.openingBalance,
      gstin: party.gstin || null,
      notes: party.notes,
      created_at: party.createdAt,
    } as Record<string, unknown>, 'update');
  }, [writeAndSync]);

  const deleteLedgerParty = useCallback((id: string) => {
    // Parties can be deleted even when they have ledger history. The database
    // uses ON DELETE CASCADE for ledger_entries.party_id, so remove the local
    // ledger entries first and enqueue their deletes as well. Invoice.customer_id
    // uses ON DELETE SET NULL, so existing invoices remain intact.
    const relatedEntries = ledgerEntries.filter((entry) => entry.partyId === id);
    relatedEntries.forEach((entry) => {
      void writeAndSync('ledger_entries', { id: entry.id } as Record<string, unknown>, 'delete');
    });
    void writeAndSync('ledger_parties', { id } as Record<string, unknown>, 'delete');
  }, [writeAndSync, ledgerEntries]);

  // --- Ledger Entries ---
  const addLedgerEntry = useCallback((entry: LedgerEntry) => {
    writeAndSync('ledger_entries', {
      id: entry.id,
      party_id: entry.partyId,
      type: entry.type,
      amount: entry.amount,
      description: entry.description,
      date: entry.date,
      created_at: entry.createdAt,
      transaction_id: entry.transactionId ?? null,
      is_synced: 'pending',
    } as Record<string, unknown>, 'insert');
  }, [writeAndSync]);

  const updateLedgerEntry = useCallback((entry: LedgerEntry) => {
    writeAndSync('ledger_entries', {
      id: entry.id,
      party_id: entry.partyId,
      type: entry.type,
      amount: entry.amount,
      description: entry.description,
      date: entry.date,
      created_at: entry.createdAt,
      transaction_id: entry.transactionId ?? null,
      is_synced: 'pending',
    } as Record<string, unknown>, 'update');
  }, [writeAndSync]);

  const deleteLedgerEntry = useCallback((id: string) => {
    const entry = ledgerEntries.find((item) => item.id === id);
    writeAndSync('ledger_entries', { id } as Record<string, unknown>, 'delete');
    if (entry?.transactionId) {
      void deleteTransaction(entry.transactionId);
    }
  }, [writeAndSync, ledgerEntries, deleteTransaction]);

  // --- Account helpers ---
  const getAccountLabel = useCallback(
    (id: string) => {
      if (id === MOCK_GALLA_ID) return 'Galla (Cash Box)';
      if (id === CASH_IN_HAND_ID) return 'Cash in Hand';
      const account = bankAccounts.find((a) => a.id === id);
      if (account) return `${account.bankName} ••••${account.accountNumber.slice(-4)}`;
      const savings = subSavings.find((a) => a.id === id);
      if (savings) return `${savings.schemeType} • ${savings.schemeNumber}`;
      return 'Unknown Account';
    },
    [bankAccounts, subSavings]
  );

  const isGalla = useCallback((id: string) => id === MOCK_GALLA_ID, []);

  const value = useMemo(
    () => ({
      bankAccounts,
      subSavings,
      transactions,
      financialGoals,
      inventoryItems,
      invoices,
      ledgerParties,
      ledgerEntries,
      gallaBalance,
      gallaOpeningBalance,
      setGallaOpeningBalance,
      cashInHandBalance,
      getBankBalance,
      addBankAccount,
      updateBankAccount,
      deleteBankAccount,
      addSubSavings,
      updateSubSavings,
      deleteSubSavings,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addFinancialGoal,
      updateFinancialGoal,
      deleteFinancialGoal,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      addLedgerParty,
      updateLedgerParty,
      deleteLedgerParty,
      addLedgerEntry,
      updateLedgerEntry,
      deleteLedgerEntry,
      getAccountLabel,
      isGalla,
    }),
    [
      bankAccounts, subSavings, transactions, financialGoals, inventoryItems, invoices,
      ledgerParties, ledgerEntries, gallaBalance, gallaOpeningBalance, cashInHandBalance, getBankBalance,
      addBankAccount, updateBankAccount, deleteBankAccount,
      addSubSavings, updateSubSavings, deleteSubSavings,
      addTransaction, updateTransaction, deleteTransaction,
      addFinancialGoal, updateFinancialGoal, deleteFinancialGoal,
      addInventoryItem, updateInventoryItem, deleteInventoryItem,
      addInvoice, updateInvoice, deleteInvoice, addLedgerParty, updateLedgerParty, deleteLedgerParty,
      addLedgerEntry, updateLedgerEntry, deleteLedgerEntry,
      getAccountLabel, isGalla, setGallaOpeningBalance,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
