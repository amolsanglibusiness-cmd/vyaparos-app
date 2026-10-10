-- VyaparOS full persistence runtime repair.
-- This migration is intentionally newer than all previous repair migrations.
-- It fixes the generic trigger bug that referenced NEW.linked_bank_account_id
-- while firing on invoices, and reconciles the columns used by the offline sync.

-- 1) Columns required by the current invoice/ledger sync payload.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_id uuid,
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
  ADD COLUMN IF NOT EXISTS attachment_data_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS transaction_id uuid,
  ADD COLUMN IF NOT EXISTS upi_account_id text;

-- Add the foreign key only if it is not already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.invoices'::regclass
      AND conname = 'invoices_customer_id_fkey'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.ledger_parties(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS transaction_id uuid;

ALTER TABLE public.ledger_parties
  ADD COLUMN IF NOT EXISTS gstin text NOT NULL DEFAULT '';

-- 2) Replace the old generic trigger function. PostgreSQL record fields are
-- resolved against the trigger table; referencing NEW.linked_bank_account_id
-- from an invoices trigger therefore causes 42703. Use table-specific
-- functions instead so every trigger only touches fields that actually exist.

CREATE OR REPLACE FUNCTION public.vyaparos_validate_sub_savings_bank_link()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.linked_bank_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.bank_accounts b
    WHERE b.id = NEW.linked_bank_account_id
      AND b.business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'Linked bank account belongs to another business.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vyaparos_validate_invoice_customer_link()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.ledger_parties p
    WHERE p.id = NEW.customer_id
      AND p.business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'Customer belongs to another business.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vyaparos_validate_ledger_entry_party_link()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.party_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.ledger_parties p
    WHERE p.id = NEW.party_id
      AND p.business_id = NEW.business_id
  ) THEN
    RAISE EXCEPTION 'Ledger party belongs to another business.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vyaparos_sub_savings_business_link ON public.sub_savings;
CREATE TRIGGER trg_vyaparos_sub_savings_business_link
BEFORE INSERT OR UPDATE ON public.sub_savings
FOR EACH ROW EXECUTE FUNCTION public.vyaparos_validate_sub_savings_bank_link();

DROP TRIGGER IF EXISTS trg_vyaparos_invoice_business_link ON public.invoices;
CREATE TRIGGER trg_vyaparos_invoice_business_link
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.vyaparos_validate_invoice_customer_link();

DROP TRIGGER IF EXISTS trg_vyaparos_ledger_entry_business_link ON public.ledger_entries;
CREATE TRIGGER trg_vyaparos_ledger_entry_business_link
BEFORE INSERT OR UPDATE ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.vyaparos_validate_ledger_entry_party_link();

-- 3) Make the invoice/ledger indexes safe and useful for sync.
CREATE INDEX IF NOT EXISTS idx_invoices_business_user_date
  ON public.invoices(business_id, user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_business_user_date
  ON public.ledger_entries(business_id, user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id
  ON public.ledger_entries(transaction_id);

-- 4) Refresh PostgREST schema cache after the DDL changes.
NOTIFY pgrst, 'reload schema';
