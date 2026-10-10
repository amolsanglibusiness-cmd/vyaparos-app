-- VyaparOS: strict multi-business data isolation + shared bank transaction visibility.
-- Normal app-data rows remain isolated by business_id. Only transactions tied
-- to a bank account with the same account number + IFSC are intentionally shared.

CREATE OR REPLACE FUNCTION public.get_shared_bank_transactions(
  p_account_number text,
  p_ifsc_code text
)
RETURNS TABLE (
  id uuid,
  type text,
  amount numeric,
  category text,
  description text,
  date timestamptz,
  tag text,
  source_account_id text,
  dest_account_id text,
  is_from_galla boolean,
  shop_name text,
  expense_items jsonb,
  created_at timestamptz,
  source_is_shared_bank boolean,
  dest_is_shared_bank boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_key text;
  v_ifsc_key text;
  v_has_access boolean;
BEGIN
  v_account_key := regexp_replace(lower(coalesce(trim(p_account_number), '')), '[^a-z0-9]', '', 'g');
  v_ifsc_key := regexp_replace(lower(coalesce(trim(p_ifsc_code), '')), '[^a-z0-9]', '', 'g');

  IF v_account_key = '' OR v_ifsc_key = '' THEN
    RETURN;
  END IF;

  -- A user may see shared transactions only when the selected bank account
  -- exists in one of the businesses they belong to.
  SELECT EXISTS (
    SELECT 1
    FROM public.bank_accounts b
    WHERE public.is_business_member(b.business_id)
      AND regexp_replace(lower(coalesce(b.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key
      AND regexp_replace(lower(coalesce(b.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.type,
    t.amount,
    t.category,
    t.description,
    t.date,
    t.tag,
    t.source_account_id,
    t.dest_account_id,
    t.is_from_galla,
    t.shop_name,
    t.expense_items,
    t.created_at,
    EXISTS (SELECT 1 FROM public.bank_accounts sb WHERE sb.id::text = t.source_account_id AND regexp_replace(lower(coalesce(sb.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key AND regexp_replace(lower(coalesce(sb.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key),
    EXISTS (SELECT 1 FROM public.bank_accounts db WHERE db.id::text = t.dest_account_id AND regexp_replace(lower(coalesce(db.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key AND regexp_replace(lower(coalesce(db.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key)
  FROM public.transactions t
  WHERE EXISTS (
    SELECT 1
    FROM public.bank_accounts b
    WHERE regexp_replace(lower(coalesce(b.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key
      AND regexp_replace(lower(coalesce(b.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key
      AND (t.source_account_id = b.id::text OR t.dest_account_id = b.id::text)
  )
  ORDER BY t.date DESC, t.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_bank_transactions(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_bank_transactions(text,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
