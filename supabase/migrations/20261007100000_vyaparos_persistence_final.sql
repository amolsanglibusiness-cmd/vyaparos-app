-- VyaparOS: final persistence repair for users, categories and business profile data.
-- Run after the existing migrations. No existing rows are deleted.

-- 1) Public user profile must contain the email used by the multi-user directory.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- 2) Keep transaction categories in the business-scoped cloud profile so they
-- survive logout, reinstall and device changes while remaining simple JSON data.
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS transaction_categories jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3) Public ledger share rows belong to the same business as their customer.
ALTER TABLE public.ledger_share_links
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

UPDATE public.ledger_share_links l
SET business_id = p.business_id
FROM public.ledger_parties p
WHERE l.business_id IS NULL
  AND p.id = l.party_id
  AND p.business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_share_links_business_id
  ON public.ledger_share_links(business_id);

-- Existing share-link policies remain valid for the authenticated owner; add
-- business membership to writes so a link cannot be attached cross-business.
DROP POLICY IF EXISTS "insert_own_ledger_share_links" ON public.ledger_share_links;
CREATE POLICY "insert_own_ledger_share_links" ON public.ledger_share_links
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_business_member(business_id)
    AND EXISTS (
      SELECT 1 FROM public.ledger_parties p
      WHERE p.id = party_id
        AND p.user_id = auth.uid()
        AND p.business_id = business_id
    )
  );

DROP POLICY IF EXISTS "select_own_ledger_share_links" ON public.ledger_share_links;
CREATE POLICY "select_own_ledger_share_links" ON public.ledger_share_links
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_business_member(business_id));

DROP POLICY IF EXISTS "update_own_ledger_share_links" ON public.ledger_share_links;
CREATE POLICY "update_own_ledger_share_links" ON public.ledger_share_links
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_business_member(business_id))
  WITH CHECK (auth.uid() = user_id AND public.is_business_member(business_id));

GRANT SELECT, INSERT, UPDATE ON public.ledger_share_links TO authenticated;
