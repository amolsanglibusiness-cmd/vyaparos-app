-- VyaparOS bank account field persistence fix
-- Ensures all values entered in the Bank Account form are persisted in Supabase.

ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS account_holder text,
  ADD COLUMN IF NOT EXISTS ifsc text,
  ADD COLUMN IF NOT EXISTS upi_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS opening_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opening_date date,
  ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS show_on_invoice boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Keep NULL optional values safe while preserving the exact entered values.
UPDATE public.bank_accounts
SET upi_id = COALESCE(upi_id, ''),
    opening_balance = COALESCE(opening_balance, balance, 0),
    status = COALESCE(status, 'Active'),
    is_default = COALESCE(is_default, false),
    show_on_invoice = COALESCE(show_on_invoice, true),
    updated_at = COALESCE(updated_at, now())
WHERE upi_id IS NULL
   OR opening_balance IS NULL
   OR status IS NULL
   OR is_default IS NULL
   OR show_on_invoice IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.bank_accounts
  ALTER COLUMN upi_id SET DEFAULT '',
  ALTER COLUMN opening_balance SET DEFAULT 0,
  ALTER COLUMN status SET DEFAULT 'Active',
  ALTER COLUMN is_default SET DEFAULT false,
  ALTER COLUMN show_on_invoice SET DEFAULT true,
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.vyaparos_touch_bank_account_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vyaparos_bank_account_updated_at ON public.bank_accounts;
CREATE TRIGGER trg_vyaparos_bank_account_updated_at
BEFORE INSERT OR UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.vyaparos_touch_bank_account_updated_at();

NOTIFY pgrst, 'reload schema';
