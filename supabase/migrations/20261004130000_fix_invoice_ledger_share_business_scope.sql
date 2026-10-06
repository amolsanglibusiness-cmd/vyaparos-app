-- VyaparOS: current-customer public ledger link fix.
--
-- Important: some existing Supabase databases were created before the
-- multi-business migration was applied. In those databases ledger_parties
-- does NOT yet have business_id. Add the column safely here before any query
-- or RPC references it.

-- Ensure the business workspace columns required by the public ledger RPC
-- exist even when the earlier multi-business migration was not applied.
ALTER TABLE public.ledger_parties
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.ledger_entries
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ledger_parties_business_id
  ON public.ledger_parties(business_id);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_business_id
  ON public.ledger_entries(business_id);

CREATE INDEX IF NOT EXISTS idx_invoices_business_id
  ON public.invoices(business_id);

-- Put existing rows into the user's first business workspace only when the
-- row does not already have a business. New rows use the active workspace.
UPDATE public.ledger_parties p
SET business_id = bm.business_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, business_id
  FROM public.business_members
  ORDER BY user_id, created_at ASC
) bm
WHERE p.user_id = bm.user_id
  AND p.business_id IS NULL;

UPDATE public.ledger_entries e
SET business_id = bm.business_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, business_id
  FROM public.business_members
  ORDER BY user_id, created_at ASC
) bm
WHERE e.user_id = bm.user_id
  AND e.business_id IS NULL;

UPDATE public.invoices i
SET business_id = bm.business_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, business_id
  FROM public.business_members
  ORDER BY user_id, created_at ASC
) bm
WHERE i.user_id = bm.user_id
  AND i.business_id IS NULL;

-- Keep future writes in the currently selected workspace.
DO $$
BEGIN
  IF to_regprocedure('public.my_business_id()') IS NOT NULL THEN
    ALTER TABLE public.ledger_parties ALTER COLUMN business_id SET DEFAULT public.my_business_id();
    ALTER TABLE public.ledger_entries ALTER COLUMN business_id SET DEFAULT public.my_business_id();
    ALTER TABLE public.invoices ALTER COLUMN business_id SET DEFAULT public.my_business_id();
  END IF;
END $$;

-- Repair older share rows where business_id was left NULL. Prefer the
-- business recorded on the share's user membership rather than guessing from
-- a customer's name or phone number.
UPDATE public.ledger_share_links l
SET business_id = bm.business_id
FROM public.business_members bm
WHERE l.business_id IS NULL
  AND bm.user_id = l.user_id
  AND bm.business_id = (
    SELECT mb.business_id
    FROM public.business_members mb
    WHERE mb.user_id = l.user_id
    ORDER BY mb.created_at ASC
    LIMIT 1
  );

CREATE INDEX IF NOT EXISTS idx_ledger_share_links_party_business
  ON public.ledger_share_links(party_id, business_id);

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
  v_business_id uuid;
  v_ad jsonb;
BEGIN
  SELECT l.party_id,
         l.business_id,
         l.business_snapshot,
         l.payment_snapshot
  INTO v_party_id, v_business_id, v_business, v_payment
  FROM public.ledger_share_links l
  WHERE l.token = p_token AND l.revoked_at IS NULL;

  IF v_party_id IS NULL OR v_business_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired link');
  END IF;

  -- The token must point to the exact customer in the exact business.
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
  WHERE p.id = v_party_id
    AND p.business_id = v_business_id;

  IF v_party IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Customer not found for this business');
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
  WHERE e.party_id = v_party_id
    AND e.business_id = v_business_id;

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
  WHERE i.business_id = v_business_id
    AND (
      lower(COALESCE(to_jsonb(i)->>'customer_name', '')) = lower(v_party_name)
      OR COALESCE(NULLIF(to_jsonb(i)->>'customer_id', '')::uuid,
                  '00000000-0000-0000-0000-000000000000'::uuid) = v_party_id
    );

  SELECT COALESCE(jsonb_build_object(
    'imageUrl', a.image_data_url,
    'destinationUrl', a.destination_url
  ), '{}'::jsonb)
  INTO v_ad
  FROM public.business_public_ledger_ads a
  WHERE a.business_id = v_business_id;

  RETURN jsonb_build_object(
    'ok', true,
    'party', v_party,
    'business', COALESCE(v_business, '{}'::jsonb),
    'payment', v_payment,
    'advertisement', COALESCE(v_ad, '{}'::jsonb),
    'entries', v_entries,
    'invoices', v_invoices,
    'generatedAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_customer_ledger(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_customer_ledger(uuid) TO anon, authenticated;
