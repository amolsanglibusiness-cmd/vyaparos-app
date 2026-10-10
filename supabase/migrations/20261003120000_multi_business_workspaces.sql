-- VyaparOS: multiple businesses per single authenticated user.
-- Each business gets its own app-data workspace. Bank accounts can still be
-- duplicated/linked across businesses; the existing shared-balance RPC handles
-- matching account number + IFSC.

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = p_business_id AND user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "members_insert_businesses" ON public.businesses;
CREATE POLICY "members_insert_businesses" ON public.businesses FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "members_read_businesses" ON public.businesses;
CREATE POLICY "members_read_businesses" ON public.businesses FOR SELECT TO authenticated
USING (owner_user_id = auth.uid() OR public.is_business_member(id));

DROP POLICY IF EXISTS "owners_update_businesses" ON public.businesses;
CREATE POLICY "owners_update_businesses" ON public.businesses FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "owners_delete_businesses" ON public.businesses;
CREATE POLICY "owners_delete_businesses" ON public.businesses FOR DELETE TO authenticated
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "owners_add_business_members" ON public.business_members;
CREATE POLICY "owners_add_business_members" ON public.business_members FOR INSERT TO authenticated
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.owner_user_id = auth.uid()))
  OR (business_id = public.my_business_id() AND public.is_business_admin(business_id))
);

ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS business_contact_number text NOT NULL DEFAULT '';
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS business_logo_url text;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS bottom_button_1 text;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS bottom_button_2 text;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS bottom_button_4 text;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS main_bank_account_id uuid;

-- Add a business workspace column to every application table.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bank_accounts','sub_savings','transactions','financial_goals','inventory_items','invoices','ledger_parties','ledger_entries','business_profiles'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(business_id)', 'idx_' || t || '_business_id', t);
  END LOOP;
END $$;

-- Existing data belongs to each user's first business workspace.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bank_accounts','sub_savings','transactions','financial_goals','inventory_items','invoices','ledger_parties','ledger_entries','business_profiles'] LOOP
    EXECUTE format($q$
      UPDATE public.%I x
      SET business_id = m.business_id
      FROM (
        SELECT DISTINCT ON (user_id) user_id, business_id
        FROM public.business_members
        ORDER BY user_id, created_at ASC
      ) m
      WHERE x.user_id = m.user_id AND x.business_id IS NULL
    $q$, t);
  END LOOP;
END $$;

-- New writes must always identify a business workspace.
ALTER TABLE public.bank_accounts ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.sub_savings ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.transactions ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.financial_goals ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.inventory_items ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.invoices ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.ledger_parties ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.ledger_entries ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.business_profiles ALTER COLUMN business_id SET DEFAULT public.my_business_id();

-- business_profiles was previously unique per user; it is now unique per business.
DROP INDEX IF EXISTS public.idx_business_profiles_user_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_business_user_unique
  ON public.business_profiles(business_id, user_id);

-- The original profile policy names were singular, so remove them explicitly.
DROP POLICY IF EXISTS "select_own_business_profile" ON public.business_profiles;
DROP POLICY IF EXISTS "insert_own_business_profile" ON public.business_profiles;
DROP POLICY IF EXISTS "update_own_business_profile" ON public.business_profiles;
DROP POLICY IF EXISTS "delete_own_business_profile" ON public.business_profiles;

-- Business-scoped RLS for all app data.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bank_accounts','sub_savings','transactions','financial_goals','inventory_items','invoices','ledger_parties','ledger_entries','business_profiles'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "select_own_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "insert_own_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "update_own_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "delete_own_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "select_business_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "insert_business_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "update_business_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "delete_business_%s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "select_business_%s" ON public.%I FOR SELECT TO authenticated USING (public.is_business_member(business_id))', t, t);
    EXECUTE format('CREATE POLICY "insert_business_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_business_member(business_id))', t, t);
    EXECUTE format('CREATE POLICY "update_business_%s" ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_business_member(business_id)) WITH CHECK (user_id = auth.uid() AND public.is_business_member(business_id))', t, t);
    EXECUTE format('CREATE POLICY "delete_business_%s" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.is_business_member(business_id))', t, t);
  END LOOP;
END $$;

-- Existing shared-bank balance function must consider accounts across all
-- businesses owned by/accessible to the caller, while the caller's access is
-- still checked by account number + IFSC.
CREATE OR REPLACE FUNCTION public.get_shared_bank_balance(p_account_number text, p_ifsc_code text)
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
  IF v_account_key = '' OR v_ifsc_key = '' THEN RETURN 0; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.bank_accounts b
    WHERE public.is_business_member(b.business_id)
      AND regexp_replace(lower(coalesce(b.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key
      AND regexp_replace(lower(coalesce(b.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key
  ) INTO v_has_access;
  IF NOT v_has_access THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(b.balance), 0) INTO v_base_balance
  FROM public.bank_accounts b
  WHERE regexp_replace(lower(coalesce(b.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key
    AND regexp_replace(lower(coalesce(b.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key
    AND public.is_business_member(b.business_id);

  SELECT COALESCE(SUM(CASE
    WHEN t.source_account_id = b.id::text AND t.type = 'Income' THEN t.amount
    WHEN t.source_account_id = b.id::text AND t.type IN ('Expense','Transfer') THEN -t.amount
    WHEN t.dest_account_id = b.id::text AND t.type = 'Transfer' THEN t.amount
    ELSE 0 END), 0)
  INTO v_transaction_net
  FROM public.transactions t
  JOIN public.bank_accounts b ON t.source_account_id = b.id::text OR t.dest_account_id = b.id::text
  WHERE regexp_replace(lower(coalesce(b.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key
    AND regexp_replace(lower(coalesce(b.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key
    AND public.is_business_member(b.business_id)
    AND public.is_business_member(t.business_id);

  RETURN v_base_balance + v_transaction_net;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_bank_balance(text,text) TO authenticated;

-- Existing business-level settings/advertisement policies were based on the
-- old single-business helper. Allow any business the current user belongs to.
DROP POLICY IF EXISTS "members_read_account_settings" ON public.business_account_settings;
DROP POLICY IF EXISTS "admins_update_account_settings" ON public.business_account_settings;
CREATE POLICY "members_read_account_settings" ON public.business_account_settings FOR SELECT TO authenticated
USING (public.is_business_member(business_id));
CREATE POLICY "admins_update_account_settings" ON public.business_account_settings FOR UPDATE TO authenticated
USING (public.is_business_admin(business_id))
WITH CHECK (public.is_business_admin(business_id));

DROP POLICY IF EXISTS "members_read_public_ledger_ads" ON public.business_public_ledger_ads;
DROP POLICY IF EXISTS "admins_insert_public_ledger_ads" ON public.business_public_ledger_ads;
DROP POLICY IF EXISTS "admins_update_public_ledger_ads" ON public.business_public_ledger_ads;
DROP POLICY IF EXISTS "admins_delete_public_ledger_ads" ON public.business_public_ledger_ads;
CREATE POLICY "members_read_public_ledger_ads" ON public.business_public_ledger_ads FOR SELECT TO authenticated
USING (public.is_business_member(business_id));
CREATE POLICY "admins_insert_public_ledger_ads" ON public.business_public_ledger_ads FOR INSERT TO authenticated
WITH CHECK (public.is_business_admin(business_id));
CREATE POLICY "admins_update_public_ledger_ads" ON public.business_public_ledger_ads FOR UPDATE TO authenticated
USING (public.is_business_admin(business_id)) WITH CHECK (public.is_business_admin(business_id));
CREATE POLICY "admins_delete_public_ledger_ads" ON public.business_public_ledger_ads FOR DELETE TO authenticated
USING (public.is_business_admin(business_id));
