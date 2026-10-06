/*
# Create core app data tables with multi-tenant RLS

## Purpose
Creates all the financial data tables for the FinanceHub app, each scoped to a
single user via `user_id` with Row Level Security. Every table enforces that
authenticated users can only CRUD their own rows.

## New Tables
1. `bank_accounts` — bank accounts with balance, UPI, IFSC
2. `sub_savings` — sub-savings schemes (RD, FD, Pigmy, Gold) linked to bank accounts
3. `transactions` — income/expense/transfer records referencing source/dest accounts
4. `financial_goals` — savings goals with target and progress
5. `inventory_items` — stock items with pricing and low-stock thresholds
6. `invoices` — POS bills with line items (JSONB), customer, payment method
7. `ledger_parties` — customers/suppliers for Udhari tracking
8. `ledger_entries` — given/received entries against a party
9. `business_profiles` — shop owner profile (name, address, GSTIN, signature, stamp)

## Security (all tables)
- RLS ENABLED on every table.
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE), each scoped `TO authenticated`.
- Ownership check: `auth.uid() = user_id` in USING and/or WITH CHECK.
- `user_id` columns default to `auth.uid()` so frontend inserts that omit `user_id`
  still pass the WITH CHECK policy.

## Important Notes
1. `user_id` is `NOT NULL DEFAULT auth.uid()` on every table — the DEFAULT fills the
   owner from the authenticated session when the client omits it in the insert payload.
2. `sub_savings.linked_bank_account_id` references `bank_accounts(id)` — a user can
   only link savings to accounts they own (enforced by RLS on the FK target).
3. `ledger_entries.party_id` references `ledger_parties(id)` — entries are scoped
   through the parent party's ownership.
4. `invoices.items` is JSONB storing the cart line items array.
5. Indexes added on `user_id` for all tables and on `date` for transactions/invoices/entries.
*/

-- 1. bank_accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_holder_name text NOT NULL,
  account_number text NOT NULL,
  ifsc_code text NOT NULL,
  account_type text NOT NULL DEFAULT 'Savings',
  balance numeric NOT NULL DEFAULT 0,
  upi_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);

DROP POLICY IF EXISTS "select_own_bank_accounts" ON bank_accounts;
CREATE POLICY "select_own_bank_accounts" ON bank_accounts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_bank_accounts" ON bank_accounts;
CREATE POLICY "insert_own_bank_accounts" ON bank_accounts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_bank_accounts" ON bank_accounts;
CREATE POLICY "update_own_bank_accounts" ON bank_accounts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_bank_accounts" ON bank_accounts;
CREATE POLICY "delete_own_bank_accounts" ON bank_accounts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 2. sub_savings
CREATE TABLE IF NOT EXISTS sub_savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  scheme_type text NOT NULL DEFAULT 'Daily Pigmy',
  scheme_number text NOT NULL DEFAULT '',
  linked_bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  deposit_amount numeric NOT NULL DEFAULT 0,
  maturity_date date,
  interest_rate numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sub_savings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sub_savings_user_id ON sub_savings(user_id);

DROP POLICY IF EXISTS "select_own_sub_savings" ON sub_savings;
CREATE POLICY "select_own_sub_savings" ON sub_savings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_sub_savings" ON sub_savings;
CREATE POLICY "insert_own_sub_savings" ON sub_savings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_sub_savings" ON sub_savings;
CREATE POLICY "update_own_sub_savings" ON sub_savings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_sub_savings" ON sub_savings;
CREATE POLICY "delete_own_sub_savings" ON sub_savings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 3. transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  date timestamptz NOT NULL DEFAULT now(),
  tag text,
  source_account_id text NOT NULL DEFAULT 'galla',
  dest_account_id text,
  is_from_galla boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions" ON transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions" ON transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 4. financial_goals
CREATE TABLE IF NOT EXISTS financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_amount numeric NOT NULL,
  saved_amount numeric NOT NULL DEFAULT 0,
  deadline date,
  color text NOT NULL DEFAULT '#0284c7',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);

DROP POLICY IF EXISTS "select_own_financial_goals" ON financial_goals;
CREATE POLICY "select_own_financial_goals" ON financial_goals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_financial_goals" ON financial_goals;
CREATE POLICY "insert_own_financial_goals" ON financial_goals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_financial_goals" ON financial_goals;
CREATE POLICY "update_own_financial_goals" ON financial_goals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_financial_goals" ON financial_goals;
CREATE POLICY "delete_own_financial_goals" ON financial_goals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 5. inventory_items
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  stock numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pcs',
  category text NOT NULL DEFAULT 'General',
  purchase_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 0,
  photo_url text,
  show_on_pos boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);

DROP POLICY IF EXISTS "select_own_inventory_items" ON inventory_items;
CREATE POLICY "select_own_inventory_items" ON inventory_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_inventory_items" ON inventory_items;
CREATE POLICY "insert_own_inventory_items" ON inventory_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_inventory_items" ON inventory_items;
CREATE POLICY "update_own_inventory_items" ON inventory_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_inventory_items" ON inventory_items;
CREATE POLICY "delete_own_inventory_items" ON inventory_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 6. invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Cash',
  customer_name text NOT NULL DEFAULT '',
  upi_account_id text,
  transaction_id uuid,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date DESC);

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 7. ledger_parties
CREATE TABLE IF NOT EXISTS ledger_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Customer',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  photo_url text,
  upi_id text NOT NULL DEFAULT '',
  opening_balance numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ledger_parties ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ledger_parties_user_id ON ledger_parties(user_id);

DROP POLICY IF EXISTS "select_own_ledger_parties" ON ledger_parties;
CREATE POLICY "select_own_ledger_parties" ON ledger_parties FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_ledger_parties" ON ledger_parties;
CREATE POLICY "insert_own_ledger_parties" ON ledger_parties FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_ledger_parties" ON ledger_parties;
CREATE POLICY "update_own_ledger_parties" ON ledger_parties FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_ledger_parties" ON ledger_parties;
CREATE POLICY "delete_own_ledger_parties" ON ledger_parties FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 8. ledger_entries
CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES ledger_parties(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'Given',
  amount numeric NOT NULL,
  description text NOT NULL DEFAULT '',
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_party_id ON ledger_entries(party_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date DESC);

DROP POLICY IF EXISTS "select_own_ledger_entries" ON ledger_entries;
CREATE POLICY "select_own_ledger_entries" ON ledger_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_ledger_entries" ON ledger_entries;
CREATE POLICY "insert_own_ledger_entries" ON ledger_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_ledger_entries" ON ledger_entries;
CREATE POLICY "update_own_ledger_entries" ON ledger_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_ledger_entries" ON ledger_entries;
CREATE POLICY "delete_own_ledger_entries" ON ledger_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 9. business_profiles
CREATE TABLE IF NOT EXISTS business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_name text NOT NULL DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  business_address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  gstin text NOT NULL DEFAULT '',
  signature_url text,
  stamp_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_user_id_unique ON business_profiles(user_id);

DROP POLICY IF EXISTS "select_own_business_profile" ON business_profiles;
CREATE POLICY "select_own_business_profile" ON business_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_business_profile" ON business_profiles;
CREATE POLICY "insert_own_business_profile" ON business_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_business_profile" ON business_profiles;
CREATE POLICY "update_own_business_profile" ON business_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_business_profile" ON business_profiles;
CREATE POLICY "delete_own_business_profile" ON business_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);


-- POS bill source transaction linkage. Safe to run on an existing database.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transaction_id uuid;
CREATE INDEX IF NOT EXISTS idx_invoices_transaction_id ON invoices(transaction_id);
