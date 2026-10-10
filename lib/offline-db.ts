import Dexie, { type Table } from 'dexie';

export type SyncStatus = 'pending' | 'synced' | 'error';
export type Operation = 'insert' | 'update' | 'delete';

export interface OfflineRecord {
  id: string;
  is_synced: SyncStatus;
  sync_error?: string | null;
  updated_at: number;
}

export interface BankAccountRow extends OfflineRecord {
  id: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: string;
  balance: number;
  upi_id: string;
  branch?: string;
  nickname?: string;
  opening_balance?: number;
  opening_date?: string | null;
  is_default?: boolean;
  status?: string;
  show_on_invoice?: boolean;
  notes?: string;
  created_at: string;
}

export interface SubSavingsRow extends OfflineRecord {
  id: string;
  scheme_type: string;
  scheme_number: string;
  linked_bank_account_id: string | null;
  deposit_amount: number;
  maturity_date: string | null;
  interest_rate: number;
  status: string;
  created_at: string;
}

export interface TransactionRow extends OfflineRecord {
  id: string;
  type: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  tag: string | null;
  source_account_id: string;
  dest_account_id: string | null;
  is_from_galla: boolean;
  shop_name: string;
  expense_items: string;
  created_at: string;
}

export interface FinancialGoalRow extends OfflineRecord {
  id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  deadline: string;
  color: string;
  created_at: string;
}

export interface InventoryItemRow extends OfflineRecord {
  id: string;
  name: string;
  stock: number;
  min_stock: number;
  unit: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  tax_rate: number;
  hsn_code: string;
  photo_url: string | null;
  show_on_pos: boolean;
  created_at: string;
}

export interface InvoiceRow extends OfflineRecord {
  id: string;
  invoice_number: string;
  items: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  customer_name: string;
  upi_account_id: string | null;
  transaction_id: string | null;
  date: string;
  created_at: string;
  customer_id: string | null;
  customer_phone: string;
  customer_address: string;
  tax_mode: string;
  tax_value: number;
  tax_amount: number;
  discount_mode: string;
  discount_value: number;
  round_off: boolean;
  round_off_amount: number;
  payment_account_id: string | null;
  payment_status: string;
  balance_due: number;
  terms: string;
  signature_enabled: boolean;
  state_of_supply: string;
  description: string;
  attachment_name: string;
  attachment_data_url: string;
}

export interface LedgerPartyRow extends OfflineRecord {
  id: string;
  name: string;
  type: string;
  phone: string;
  email: string;
  address: string;
  photo_url: string | null;
  upi_id: string;
  opening_balance: number;
  notes: string;
  created_at: string;
}

export interface LedgerEntryRow extends OfflineRecord {
  id: string;
  party_id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
  transaction_id?: string | null;
}

export interface BusinessProfileRow extends OfflineRecord {
  id: string;
  owner_name: string;
  business_name: string;
  business_address: string;
  phone: string;
  email: string;
  gstin: string;
  signature_url: string | null;
  stamp_url: string | null;
}

export interface SyncQueueEntry {
  id?: number;
  table_name: string;
  record_id: string;
  operation: Operation;
  payload: string;
  created_at: number;
  retries: number;
}

class FinanceHubDB extends Dexie {
  bank_accounts!: Table<BankAccountRow, string>;
  sub_savings!: Table<SubSavingsRow, string>;
  transactions!: Table<TransactionRow, string>;
  financial_goals!: Table<FinancialGoalRow, string>;
  inventory_items!: Table<InventoryItemRow, string>;
  invoices!: Table<InvoiceRow, string>;
  ledger_parties!: Table<LedgerPartyRow, string>;
  ledger_entries!: Table<LedgerEntryRow, string>;
  business_profiles!: Table<BusinessProfileRow, string>;
  sync_queue!: Table<SyncQueueEntry, number>;

  constructor() {
    super('FinanceHubDB');
    this.version(1).stores({
      bank_accounts: 'id, is_synced, updated_at',
      sub_savings: 'id, is_synced, linked_bank_account_id, updated_at',
      transactions: 'id, is_synced, date, source_account_id, updated_at',
      financial_goals: 'id, is_synced, updated_at',
      inventory_items: 'id, is_synced, name, category, updated_at',
      invoices: 'id, is_synced, date, updated_at',
      ledger_parties: 'id, is_synced, type, updated_at',
      ledger_entries: 'id, is_synced, party_id, date, updated_at',
      business_profiles: 'id, is_synced, updated_at',
      sync_queue: '++id, table_name, record_id, operation, created_at',
    });
    this.version(2).stores({
      inventory_items: 'id, is_synced, name, category, updated_at',
      invoices: 'id, is_synced, date, customer_id, payment_status, updated_at',
    });
    this.version(3).stores({
      invoices: 'id, is_synced, date, customer_id, payment_status, updated_at',
    });
    this.version(4).stores({
      transactions: 'id, is_synced, date, source_account_id, category, shop_name, updated_at',
    });
  }
}

export const db = new FinanceHubDB();

export const TABLE_NAMES = [
  'bank_accounts',
  'sub_savings',
  'transactions',
  'financial_goals',
  'inventory_items',
  'invoices',
  'ledger_parties',
  'ledger_entries',
  'business_profiles',
] as const;

export type TableName = (typeof TABLE_NAMES)[number];

export async function clearAllLocalAppData(): Promise<void> {
  await db.transaction('rw', [
    db.bank_accounts,
    db.sub_savings,
    db.transactions,
    db.financial_goals,
    db.inventory_items,
    db.invoices,
    db.ledger_parties,
    db.ledger_entries,
    db.business_profiles,
    db.sync_queue,
  ], async () => {
    await Promise.all([
      db.bank_accounts.clear(),
      db.sub_savings.clear(),
      db.transactions.clear(),
      db.financial_goals.clear(),
      db.inventory_items.clear(),
      db.invoices.clear(),
      db.ledger_parties.clear(),
      db.ledger_entries.clear(),
      db.business_profiles.clear(),
      db.sync_queue.clear(),
    ]);
  });
}

export const GALLA_ID = 'galla-cashbox';
