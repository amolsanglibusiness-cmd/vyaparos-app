-- VyaparOS: two-way realtime sync + bank legacy field compatibility.
-- Apply after the existing 20261007180000 bank persistence migration.

-- 1) Preserve IFSC/account-holder values created by older schema versions.
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS account_holder text,
  ADD COLUMN IF NOT EXISTS ifsc text,
  ADD COLUMN IF NOT EXISTS upi_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bank_accounts' AND column_name='account_holder_name'
  ) THEN
    EXECUTE $q$
      UPDATE public.bank_accounts
      SET account_holder = COALESCE(NULLIF(account_holder, ''), account_holder_name)
      WHERE COALESCE(account_holder, '') = ''
        AND account_holder_name IS NOT NULL
    $q$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bank_accounts' AND column_name='ifsc_code'
  ) THEN
    EXECUTE $q$
      UPDATE public.bank_accounts
      SET ifsc = COALESCE(NULLIF(ifsc, ''), upper(trim(ifsc_code)))
      WHERE COALESCE(ifsc, '') = ''
        AND ifsc_code IS NOT NULL
    $q$;
  END IF;
END $$;

UPDATE public.bank_accounts
SET ifsc = upper(trim(ifsc))
WHERE ifsc IS NOT NULL;

ALTER TABLE public.bank_accounts
  ALTER COLUMN upi_id SET DEFAULT '',
  ALTER COLUMN updated_at SET DEFAULT now();

-- 2) Make Realtime available for every Dexie-backed app table.
-- PostgreSQL raises an error if a table is added twice, so check first.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bank_accounts','sub_savings','transactions','financial_goals',
    'inventory_items','invoices','ledger_parties','ledger_entries',
    'business_profiles'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
