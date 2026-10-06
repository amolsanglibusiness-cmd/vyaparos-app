-- Business-level Public Ledger advertisement settings.
-- Only business owners/admins can change these settings. Members can read them
-- while the public ledger receives them only through the tokenized SECURITY DEFINER RPC.
CREATE TABLE IF NOT EXISTS public.business_public_ledger_ads (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  image_data_url text,
  destination_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_public_ledger_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_read_public_ledger_ads" ON public.business_public_ledger_ads;
CREATE POLICY "members_read_public_ledger_ads"
  ON public.business_public_ledger_ads FOR SELECT TO authenticated
  USING (business_id = public.my_business_id());

DROP POLICY IF EXISTS "admins_insert_public_ledger_ads" ON public.business_public_ledger_ads;
CREATE POLICY "admins_insert_public_ledger_ads"
  ON public.business_public_ledger_ads FOR INSERT TO authenticated
  WITH CHECK (
    business_id = public.my_business_id()
    AND public.is_business_admin(business_id)
  );

DROP POLICY IF EXISTS "admins_update_public_ledger_ads" ON public.business_public_ledger_ads;
CREATE POLICY "admins_update_public_ledger_ads"
  ON public.business_public_ledger_ads FOR UPDATE TO authenticated
  USING (
    business_id = public.my_business_id()
    AND public.is_business_admin(business_id)
  )
  WITH CHECK (
    business_id = public.my_business_id()
    AND public.is_business_admin(business_id)
  );

DROP POLICY IF EXISTS "admins_delete_public_ledger_ads" ON public.business_public_ledger_ads;
CREATE POLICY "admins_delete_public_ledger_ads"
  ON public.business_public_ledger_ads FOR DELETE TO authenticated
  USING (
    business_id = public.my_business_id()
    AND public.is_business_admin(business_id)
  );

-- Keep the public share token table connected to a business when possible.
ALTER TABLE public.ledger_share_links
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_ledger_share_links_business_id
  ON public.ledger_share_links(business_id);

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

-- Refresh the public RPC so advertisement settings are returned with the
-- existing login-free ledger payload. The advertisement is dynamic: changing
-- it in Settings updates existing public ledger links too.
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
         COALESCE(l.business_id, (
           SELECT bm.business_id
           FROM public.business_members bm
           WHERE bm.user_id = l.user_id
           ORDER BY bm.created_at ASC
           LIMIT 1
         )),
         l.business_snapshot,
         l.payment_snapshot
  INTO v_party_id, v_business_id, v_business, v_payment
  FROM public.ledger_share_links l
  WHERE l.token = p_token AND l.revoked_at IS NULL;

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
