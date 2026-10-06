-- Public customer ledger: preserve the business header and payment account
-- snapshot at the moment a share link is created. This is necessary because
-- VyaparOS business settings are stored client-side for the signed-in user.
ALTER TABLE public.ledger_share_links
  ADD COLUMN IF NOT EXISTS business_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS payment_snapshot jsonb;

CREATE OR REPLACE FUNCTION public.get_public_customer_ledger(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_party_id uuid;
  v_party_name text;
  v_party jsonb;
  v_entries jsonb;
  v_invoices jsonb;
  v_business jsonb;
  v_payment jsonb;
BEGIN
  SELECT party_id, business_snapshot, payment_snapshot
  INTO v_party_id, v_business, v_payment
  FROM public.ledger_share_links
  WHERE token = p_token AND revoked_at IS NULL;

  IF v_party_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired link');
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'type', p.type,
    'phone', p.phone,
    'email', p.email,
    'address', p.address,
    'upiId', p.upi_id,
    'notes', p.notes,
    'openingBalance', COALESCE(p.opening_balance, 0)
  ), p.name
  INTO v_party, v_party_name
  FROM public.ledger_parties p
  WHERE p.id = v_party_id;

  IF v_party IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Customer not found');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'type', e.type,
    'amount', e.amount,
    'description', COALESCE(e.description, ''),
    'date', e.date,
    'createdAt', e.created_at
  ) ORDER BY e.date DESC, e.created_at DESC), '[]'::jsonb)
  INTO v_entries
  FROM public.ledger_entries e
  WHERE e.party_id = v_party_id;

  -- Use to_jsonb(i) so this function remains compatible with installations
  -- where newer invoice columns such as payment_status are not present.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'invoiceNumber', COALESCE(to_jsonb(i)->>'invoice_number', to_jsonb(i)->>'number', ''),
    'items', COALESCE(to_jsonb(i)->'items', '[]'::jsonb),
    'subtotal', COALESCE(NULLIF(to_jsonb(i)->>'subtotal', '')::numeric, 0),
    'discount', COALESCE(NULLIF(to_jsonb(i)->>'discount', '')::numeric, 0),
    'total', COALESCE(NULLIF(to_jsonb(i)->>'total', '')::numeric, 0),
    'paymentMethod', COALESCE(to_jsonb(i)->>'payment_method', ''),
    'date', COALESCE(to_jsonb(i)->>'date', to_jsonb(i)->>'created_at', now()::text),
    'paymentStatus', CASE
      WHEN COALESCE(NULLIF(to_jsonb(i)->>'balance_due', '')::numeric, 0) > 0 THEN 'Pending'
      WHEN lower(COALESCE(to_jsonb(i)->>'payment_status', '')) = 'pending' THEN 'Pending'
      ELSE 'Paid'
    END,
    'balanceDue', COALESCE(NULLIF(to_jsonb(i)->>'balance_due', '')::numeric, 0),
    'description', COALESCE(to_jsonb(i)->>'description', '')
  ) ORDER BY COALESCE(to_jsonb(i)->>'date', to_jsonb(i)->>'created_at', '') DESC), '[]'::jsonb)
  INTO v_invoices
  FROM public.invoices i
  WHERE lower(COALESCE(to_jsonb(i)->>'customer_name', '')) = lower(v_party_name)
     OR COALESCE(NULLIF(to_jsonb(i)->>'customer_id', '')::uuid,
                 '00000000-0000-0000-0000-000000000000'::uuid) = v_party_id;

  RETURN jsonb_build_object(
    'ok', true,
    'party', v_party,
    'business', COALESCE(v_business, '{}'::jsonb),
    'payment', v_payment,
    'entries', v_entries,
    'invoices', v_invoices,
    'generatedAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_customer_ledger(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_customer_ledger(uuid) TO anon, authenticated;
