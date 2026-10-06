-- Public customer ledger: expose bills, receipts and complete payment history
-- only through an unguessable bearer token.
CREATE OR REPLACE FUNCTION public.get_public_customer_ledger(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_party_id uuid;
  v_party jsonb;
  v_entries jsonb;
  v_invoices jsonb;
BEGIN
  SELECT party_id INTO v_party_id
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
    'openingBalance', p.opening_balance
  ) INTO v_party
  FROM public.ledger_parties p
  WHERE p.id = v_party_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'type', e.type,
    'amount', e.amount,
    'description', e.description,
    'date', e.date,
    'createdAt', e.created_at
  ) ORDER BY e.date DESC, e.created_at DESC), '[]'::jsonb)
  INTO v_entries
  FROM public.ledger_entries e
  WHERE e.party_id = v_party_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'invoiceNumber', i.invoice_number,
    'items', COALESCE(i.items, '[]'::jsonb),
    'subtotal', i.subtotal,
    'discount', i.discount,
    'total', i.total,
    'paymentMethod', i.payment_method,
    'date', i.date,
    'paymentStatus', COALESCE(i.payment_status, 'Paid'),
    'balanceDue', COALESCE(i.balance_due, 0),
    'description', COALESCE(i.description, '')
  ) ORDER BY i.date DESC, i.created_at DESC), '[]'::jsonb)
  INTO v_invoices
  FROM public.invoices i
  WHERE i.customer_id = v_party_id;

  RETURN jsonb_build_object(
    'ok', true,
    'party', v_party,
    'entries', v_entries,
    'invoices', v_invoices,
    'generatedAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_customer_ledger(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_customer_ledger(uuid) TO anon, authenticated;
