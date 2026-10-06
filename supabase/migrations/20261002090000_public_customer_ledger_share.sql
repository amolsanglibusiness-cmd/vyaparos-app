-- Public, tokenized customer ledger sharing.
-- The token is the bearer credential; UUIDs are intentionally unguessable.
CREATE TABLE IF NOT EXISTS public.ledger_share_links (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES public.ledger_parties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ledger_share_links_party_id ON public.ledger_share_links(party_id);
CREATE INDEX IF NOT EXISTS idx_ledger_share_links_user_id ON public.ledger_share_links(user_id);

ALTER TABLE public.ledger_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_own_ledger_share_links" ON public.ledger_share_links;
CREATE POLICY "insert_own_ledger_share_links" ON public.ledger_share_links
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.ledger_parties p WHERE p.id = party_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "select_own_ledger_share_links" ON public.ledger_share_links;
CREATE POLICY "select_own_ledger_share_links" ON public.ledger_share_links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ledger_share_links" ON public.ledger_share_links;
CREATE POLICY "update_own_ledger_share_links" ON public.ledger_share_links
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public read happens only through this SECURITY DEFINER function and requires the token.
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
    'notes', p.notes
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

  RETURN jsonb_build_object(
    'ok', true,
    'party', v_party,
    'entries', v_entries,
    'generatedAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_customer_ledger(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_customer_ledger(uuid) TO anon, authenticated;

-- Keep transaction linkage optional so older ledger rows continue to work.
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS transaction_id uuid;
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON public.ledger_entries(transaction_id);
