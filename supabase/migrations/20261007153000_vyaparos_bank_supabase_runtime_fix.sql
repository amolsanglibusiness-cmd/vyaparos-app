-- VyaparOS runtime Supabase repair (2026-10-07)
-- Fixes the two errors observed in production: bank_accounts.upi_id PGRST204
-- and missing/mismatched get_shared_bank_balance RPC.
-- This is a NEW migration version so it runs even if earlier repair migrations
-- have already been recorded as applied.

-- 1) Keep the database schema aligned with the supplied CSV.
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

-- 2) Runtime RPC used by the Banking page.
-- IMPORTANT: the parameter name is p_ifsc_code because PostgREST RPC calls
-- require an exact argument-name match. The client now uses this same name.
CREATE OR REPLACE FUNCTION public.get_shared_bank_balance(
  p_account_number text,
  p_ifsc_code text
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_key text := regexp_replace(lower(coalesce(trim(p_account_number), '')), '[^a-z0-9]', '', 'g');
  v_ifsc_key text := regexp_replace(lower(coalesce(trim(p_ifsc_code), '')), '[^a-z0-9]', '', 'g');
  v_has_access boolean;
  v_base_balance numeric := 0;
  v_transaction_net numeric := 0;
BEGIN
  IF v_account_key = '' OR v_ifsc_key = '' THEN
    RETURN 0;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.bank_accounts b
    WHERE public.is_business_member(b.business_id)
      AND regexp_replace(lower(coalesce(b.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key
      AND regexp_replace(lower(coalesce(b.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(b.balance), 0)
  INTO v_base_balance
  FROM public.bank_accounts b
  WHERE regexp_replace(lower(coalesce(b.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key
    AND regexp_replace(lower(coalesce(b.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key
    AND public.is_business_member(b.business_id);

  SELECT COALESCE(SUM(CASE
    WHEN t.source_account_id = b.id::text AND t.type = 'Income' THEN t.amount
    WHEN t.source_account_id = b.id::text AND t.type IN ('Expense','Transfer') THEN -t.amount
    WHEN t.dest_account_id = b.id::text AND t.type = 'Transfer' THEN t.amount
    ELSE 0
  END), 0)
  INTO v_transaction_net
  FROM public.transactions t
  JOIN public.bank_accounts b
    ON t.source_account_id = b.id::text OR t.dest_account_id = b.id::text
  WHERE regexp_replace(lower(coalesce(b.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key
    AND regexp_replace(lower(coalesce(b.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key
    AND public.is_business_member(b.business_id)
    AND public.is_business_member(t.business_id);

  RETURN v_base_balance + v_transaction_net;
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_bank_balance(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_bank_balance(text, text) TO authenticated;

-- 3) Make PostgREST refresh its schema/function cache.
NOTIFY pgrst, 'reload schema';
