-- VyaparOS Bank Accounts validation / balance safety
-- 2026-10-08

-- Canonical bank fields used by the application.
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS account_holder text,
  ADD COLUMN IF NOT EXISTS ifsc text,
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS opening_date date,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS show_on_invoice boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS opening_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill legacy names where present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bank_accounts' AND column_name='account_holder_name') THEN
    EXECUTE $q$UPDATE public.bank_accounts
      SET account_holder = COALESCE(NULLIF(trim(account_holder), ''), account_holder_name)
      WHERE COALESCE(trim(account_holder), '') = ''$q$;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bank_accounts' AND column_name='ifsc_code') THEN
    EXECUTE $q$UPDATE public.bank_accounts
      SET ifsc = COALESCE(NULLIF(trim(ifsc), ''), upper(trim(ifsc_code)))
      WHERE COALESCE(trim(ifsc), '') = ''$q$;
  END IF;
END $$;

UPDATE public.bank_accounts
SET account_holder = trim(COALESCE(account_holder, '')),
    ifsc = upper(trim(COALESCE(ifsc, ''))),
    opening_balance = COALESCE(opening_balance, balance, 0),
    status = COALESCE(NULLIF(status, ''), 'Active'),
    show_on_invoice = COALESCE(show_on_invoice, true),
    updated_at = COALESCE(updated_at, now());

-- Reject duplicate bank name + account number (case/space insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS uq_vyaparos_bank_name_account_number
ON public.bank_accounts (
  lower(trim(bank_name)),
  regexp_replace(lower(trim(account_number)), '\s+', '', 'g')
)
WHERE trim(COALESCE(bank_name, '')) <> ''
  AND trim(COALESCE(account_number, '')) <> '';

-- Application-level duplicate/required-field validation is backed by this
-- trigger so direct API inserts cannot bypass it.
CREATE OR REPLACE FUNCTION public.vyaparos_validate_bank_account()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF trim(COALESCE(NEW.bank_name, '')) = '' THEN
    RAISE EXCEPTION 'Bank Name is required';
  END IF;
  IF trim(COALESCE(NEW.account_holder, '')) = '' THEN
    RAISE EXCEPTION 'Account Holder is required';
  END IF;
  IF trim(COALESCE(NEW.account_number, '')) = '' THEN
    RAISE EXCEPTION 'Account Number is required';
  END IF;

  NEW.bank_name := trim(NEW.bank_name);
  NEW.account_holder := trim(NEW.account_holder);
  NEW.account_number := trim(NEW.account_number);

  IF EXISTS (
    SELECT 1 FROM public.bank_accounts b
    WHERE b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND lower(trim(b.bank_name)) = lower(NEW.bank_name)
      AND regexp_replace(lower(trim(b.account_number)), '\\s+', '', 'g') =
          regexp_replace(lower(NEW.account_number), '\\s+', '', 'g')
  ) THEN
    RAISE EXCEPTION 'Duplicate bank account: bank name and account number already exist';
  END IF;
  NEW.ifsc := upper(trim(COALESCE(NEW.ifsc, '')));
  NEW.opening_balance := COALESCE(NEW.opening_balance, NEW.balance, 0);
  NEW.balance := COALESCE(NEW.balance, NEW.opening_balance, 0);
  NEW.status := COALESCE(NULLIF(trim(NEW.status), ''), 'Active');
  NEW.show_on_invoice := COALESCE(NEW.show_on_invoice, true);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vyaparos_validate_bank_account ON public.bank_accounts;
CREATE TRIGGER trg_vyaparos_validate_bank_account
BEFORE INSERT OR UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.vyaparos_validate_bank_account();

-- Prevent a bank Expense / Transfer / Savings from taking the balance below 0.
-- The check uses the opening/base balance plus all already-recorded transaction
-- effects and excludes the row being updated when applicable.
CREATE OR REPLACE FUNCTION public.vyaparos_validate_bank_transaction_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance numeric;
  v_available numeric;
  v_source uuid;
  v_amount numeric := COALESCE(NEW.amount, 0);
BEGIN
  IF NEW.type NOT IN ('Expense', 'Transfer', 'Savings') THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_source := NEW.source_account_id::uuid;
  EXCEPTION WHEN others THEN
    RETURN NEW;
  END;

  IF NOT EXISTS (SELECT 1 FROM public.bank_accounts b WHERE b.id = v_source) THEN
    RETURN NEW;
  END IF;

  -- Lock source account to make concurrent spends serialize.
  SELECT COALESCE(b.balance, b.opening_balance, 0)
  INTO v_balance
  FROM public.bank_accounts b
  WHERE b.id = v_source
  FOR UPDATE;

  SELECT v_balance + COALESCE(SUM(
    CASE
      WHEN t.source_account_id = v_source::text AND t.type = 'Income' THEN t.amount
      WHEN t.source_account_id = v_source::text AND t.type IN ('Expense','Transfer','Savings') THEN -t.amount
      WHEN t.dest_account_id = v_source::text AND t.type = 'Transfer' THEN t.amount
      ELSE 0
    END
  ), 0)
  INTO v_available
  FROM public.transactions t
  WHERE (t.source_account_id = v_source::text OR t.dest_account_id = v_source::text)
    AND (TG_OP <> 'UPDATE' OR t.id <> NEW.id);

  IF v_amount > GREATEST(v_available, 0) THEN
    RAISE EXCEPTION 'Insufficient bank balance. Available balance: ₹%, required: ₹%', 
      to_char(GREATEST(v_available, 0), 'FM999999999999990.00'),
      to_char(v_amount, 'FM999999999999990.00');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vyaparos_validate_bank_transaction_balance ON public.transactions;
CREATE TRIGGER trg_vyaparos_validate_bank_transaction_balance
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.vyaparos_validate_bank_transaction_balance();

GRANT EXECUTE ON FUNCTION public.vyaparos_validate_bank_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.vyaparos_validate_bank_transaction_balance() TO authenticated;

NOTIFY pgrst, 'reload schema';
