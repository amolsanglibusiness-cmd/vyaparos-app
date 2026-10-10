-- VyaparOS persistence/schema compatibility repair.
-- This migration reconciles the production Supabase schema with the CSV
-- schema used by the application and prevents PostgREST 400/column errors.
-- Safe to run on databases created by either the old or new migrations.

-- ---------------------------------------------------------------------------
-- 1. bank_accounts: canonical CSV column names
-- ---------------------------------------------------------------------------
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS account_holder text,
  ADD COLUMN IF NOT EXISTS ifsc text,
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS opening_balance numeric,
  ADD COLUMN IF NOT EXISTS opening_date date,
  ADD COLUMN IF NOT EXISTS is_default boolean,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS show_on_invoice boolean,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Normalize defaults using only the canonical CSV schema. Do not reference
-- legacy account_holder_name/ifsc_code columns because production databases
-- created from the CSV schema do not contain them.
UPDATE public.bank_accounts
SET opening_balance = COALESCE(opening_balance, balance, 0),
    status = COALESCE(status, 'Active'),
    is_default = COALESCE(is_default, false),
    show_on_invoice = COALESCE(show_on_invoice, true),
    updated_at = COALESCE(updated_at, now())
WHERE opening_balance IS NULL
   OR status IS NULL
   OR is_default IS NULL
   OR show_on_invoice IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.bank_accounts
  ALTER COLUMN updated_at SET DEFAULT now();

-- ---------------------------------------------------------------------------
-- 2. Application fields used by current transaction/inventory/invoice pages
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS shop_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expense_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS hsn_code text NOT NULL DEFAULT '';

ALTER TABLE public.ledger_parties
  ADD COLUMN IF NOT EXISTS gstin text NOT NULL DEFAULT '';

-- Invoice compatibility: all fields written by app-data-context must exist.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.ledger_parties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tax_mode text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS tax_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_mode text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_off boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS round_off_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_account_id text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Paid',
  ADD COLUMN IF NOT EXISTS balance_due numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terms text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS signature_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS state_of_supply text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attachment_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attachment_data_url text NOT NULL DEFAULT '';

-- ---------------------------------------------------------------------------
-- 3. Business-scoped defaults and RLS repair for app data
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bank_accounts','sub_savings','transactions','financial_goals',
    'inventory_items','invoices','ledger_parties','ledger_entries',
    'business_profiles'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(business_id)',
      'idx_' || t || '_business_id',
      t
    );
  END LOOP;
END $$;

-- Backfill business_id for old rows before applying the default.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bank_accounts','sub_savings','transactions','financial_goals',
    'inventory_items','invoices','ledger_parties','ledger_entries',
    'business_profiles'
  ] LOOP
    EXECUTE format($q$
      UPDATE public.%I x
      SET business_id = m.business_id
      FROM (
        SELECT DISTINCT ON (user_id) user_id, business_id
        FROM public.business_members
        ORDER BY user_id, created_at ASC
      ) m
      WHERE x.user_id = m.user_id
        AND x.business_id IS NULL
    $q$, t);
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regprocedure('public.my_business_id()') IS NOT NULL THEN
    ALTER TABLE public.bank_accounts ALTER COLUMN business_id SET DEFAULT public.my_business_id();
    ALTER TABLE public.sub_savings ALTER COLUMN business_id SET DEFAULT public.my_business_id();
    ALTER TABLE public.transactions ALTER COLUMN business_id SET DEFAULT public.my_business_id();
    ALTER TABLE public.financial_goals ALTER COLUMN business_id SET DEFAULT public.my_business_id();
    ALTER TABLE public.inventory_items ALTER COLUMN business_id SET DEFAULT public.my_business_id();
    ALTER TABLE public.invoices ALTER COLUMN business_id SET DEFAULT public.my_business_id();
    ALTER TABLE public.ledger_parties ALTER COLUMN business_id SET DEFAULT public.my_business_id();
    ALTER TABLE public.ledger_entries ALTER COLUMN business_id SET DEFAULT public.my_business_id();
    ALTER TABLE public.business_profiles ALTER COLUMN business_id SET DEFAULT public.my_business_id();
  END IF;
END $$;

-- Recreate business-scoped CRUD policies consistently. Existing policy names
-- from older migrations are removed first.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bank_accounts','sub_savings','transactions','financial_goals',
    'inventory_items','invoices','ledger_parties','ledger_entries',
    'business_profiles'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "select_business_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "insert_business_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "update_business_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "delete_business_%s" ON public.%I', t, t);

    EXECUTE format(
      'CREATE POLICY "select_business_%s" ON public.%I FOR SELECT TO authenticated USING (public.is_business_member(business_id))',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "insert_business_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_business_member(business_id))',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "update_business_%s" ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_business_member(business_id)) WITH CHECK (user_id = auth.uid() AND public.is_business_member(business_id))',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "delete_business_%s" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.is_business_member(business_id))',
      t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Data integrity indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_number_ifsc
  ON public.bank_accounts(account_number, ifsc);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id
  ON public.invoices(customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_transaction_id
  ON public.invoices(transaction_id);

-- ---------------------------------------------------------------------------
-- 5. Schema verification view for diagnostics (read-only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vyaparos_persistence_schema_check AS
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'bank_accounts','business_account_settings','business_members',
    'business_profiles','business_public_ledger_ads','businesses',
    'categories','customers','expenses','financial_goals','goals',
    'inventory_items','invoices','ledger_entries','ledger_parties',
    'ledger_share_links','products','profiles','purchase_items',
    'sub_savings','transaction_type_summary','transactions','users'
  )
ORDER BY table_name, ordinal_position;

GRANT SELECT ON public.vyaparos_persistence_schema_check TO authenticated;
