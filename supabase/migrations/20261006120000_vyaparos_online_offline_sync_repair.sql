-- VyaparOS: final online/offline persistence repair.
-- Run this AFTER the existing migrations.
-- This migration makes every app-data row belong to an explicit business,
-- repairs existing rows, and applies consistent RLS/grants.

-- 1) Make sure the business foundation exists for every authenticated user.
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Business',
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_members (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.business_account_settings (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  cash_mode text NOT NULL DEFAULT 'separate' CHECK (cash_mode IN ('separate','shared')),
  galla_mode text NOT NULL DEFAULT 'separate' CHECK (galla_mode IN ('separate','shared')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_account_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON public.business_members(business_id);

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = p_business_id AND user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_business_admin(p_business_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND role IN ('owner','admin')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid) TO authenticated;

-- Ensure every existing auth user has at least one business.
DO $$
DECLARE
  u record;
  b uuid;
BEGIN
  FOR u IN
    SELECT a.id, COALESCE(NULLIF(a.raw_user_meta_data ->> 'display_name',''), NULLIF(a.raw_user_meta_data ->> 'full_name',''), NULLIF(a.raw_user_meta_data ->> 'name',''), 'My Business') AS business_name
    FROM auth.users a
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.business_members bm WHERE bm.user_id = u.id
    ) THEN
      INSERT INTO public.businesses(name, owner_user_id)
      VALUES (u.business_name, u.id)
      RETURNING id INTO b;

      INSERT INTO public.business_members(business_id,user_id,role)
      VALUES (b,u.id,'owner')
      ON CONFLICT DO NOTHING;

      INSERT INTO public.business_account_settings(business_id)
      VALUES (b)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- 2) Add business_id everywhere if an older deployment is missing it.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bank_accounts','sub_savings','transactions','financial_goals',
    'inventory_items','invoices','ledger_parties','ledger_entries','business_profiles'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(business_id)',
      'idx_' || t || '_business_id', t
    );
  END LOOP;
END $$;

-- 3) Repair NULL business IDs using each row owner's first business.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bank_accounts','sub_savings','transactions','financial_goals',
    'inventory_items','invoices','ledger_parties','ledger_entries','business_profiles'
  ] LOOP
    EXECUTE format($q$
      UPDATE public.%I x
      SET business_id = m.business_id
      FROM (
        SELECT DISTINCT ON (bm.user_id)
          bm.user_id, bm.business_id
        FROM public.business_members bm
        ORDER BY bm.user_id, bm.created_at ASC, bm.business_id ASC
      ) m
      WHERE x.user_id = m.user_id
        AND x.business_id IS NULL
    $q$, t);
  END LOOP;
END $$;

-- 4) New app rows must never be created without a business.
CREATE OR REPLACE FUNCTION public.my_business_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT bm.business_id
  FROM public.business_members bm
  WHERE bm.user_id = auth.uid()
  ORDER BY bm.created_at ASC, bm.business_id ASC
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.my_business_id() TO authenticated;

ALTER TABLE public.bank_accounts ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.sub_savings ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.transactions ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.financial_goals ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.inventory_items ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.invoices ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.ledger_parties ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.ledger_entries ALTER COLUMN business_id SET DEFAULT public.my_business_id();
ALTER TABLE public.business_profiles ALTER COLUMN business_id SET DEFAULT public.my_business_id();

ALTER TABLE public.bank_accounts ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.sub_savings ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.financial_goals ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.inventory_items ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.ledger_parties ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.ledger_entries ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE public.business_profiles ALTER COLUMN business_id SET NOT NULL;

-- 5) Rebuild app-data RLS consistently. Every read/write is restricted to a
-- business the logged-in user belongs to, and every write must remain owned by
-- the authenticated user.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bank_accounts','sub_savings','transactions','financial_goals',
    'inventory_items','invoices','ledger_parties','ledger_entries','business_profiles'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "select_own_%s" ON public.%I', t, t);
    IF t = 'business_profiles' THEN
      EXECUTE 'DROP POLICY IF EXISTS "select_own_business_profile" ON public.business_profiles';
      EXECUTE 'DROP POLICY IF EXISTS "insert_own_business_profile" ON public.business_profiles';
      EXECUTE 'DROP POLICY IF EXISTS "update_own_business_profile" ON public.business_profiles';
      EXECUTE 'DROP POLICY IF EXISTS "delete_own_business_profile" ON public.business_profiles';
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS "insert_own_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "update_own_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "delete_own_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "select_business_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "insert_business_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "update_business_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "delete_business_%s" ON public.%I', t, t);

    EXECUTE format(
      'CREATE POLICY "select_business_%s" ON public.%I FOR SELECT TO authenticated USING (public.is_business_member(business_id))',
      t,t
    );
    EXECUTE format(
      'CREATE POLICY "insert_business_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_business_member(business_id))',
      t,t
    );
    EXECUTE format(
      'CREATE POLICY "update_business_%s" ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_business_member(business_id)) WITH CHECK (user_id = auth.uid() AND public.is_business_member(business_id))',
      t,t
    );
    EXECUTE format(
      'CREATE POLICY "delete_business_%s" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.is_business_member(business_id))',
      t,t
    );

    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  END LOOP;
END $$;

-- 6) Business/profile access.
DROP POLICY IF EXISTS "members_read_businesses" ON public.businesses;
DROP POLICY IF EXISTS "members_insert_businesses" ON public.businesses;
DROP POLICY IF EXISTS "owners_update_businesses" ON public.businesses;
DROP POLICY IF EXISTS "owners_delete_businesses" ON public.businesses;
CREATE POLICY "members_read_businesses" ON public.businesses FOR SELECT TO authenticated
USING (public.is_business_member(id));
CREATE POLICY "members_insert_businesses" ON public.businesses FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "owners_update_businesses" ON public.businesses FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "owners_delete_businesses" ON public.businesses FOR DELETE TO authenticated
USING (owner_user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;

DROP POLICY IF EXISTS "members_read_business_members" ON public.business_members;
DROP POLICY IF EXISTS "admins_add_business_members" ON public.business_members;
DROP POLICY IF EXISTS "admins_remove_business_members" ON public.business_members;
CREATE POLICY "members_read_business_members" ON public.business_members FOR SELECT TO authenticated
USING (public.is_business_member(business_id));
CREATE POLICY "admins_add_business_members" ON public.business_members FOR INSERT TO authenticated
WITH CHECK (public.is_business_admin(business_id));
CREATE POLICY "admins_remove_business_members" ON public.business_members FOR DELETE TO authenticated
USING (public.is_business_admin(business_id) AND user_id <> auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO authenticated;

DROP POLICY IF EXISTS "members_read_account_settings" ON public.business_account_settings;
DROP POLICY IF EXISTS "admins_update_account_settings" ON public.business_account_settings;
DROP POLICY IF EXISTS "admins_insert_account_settings" ON public.business_account_settings;
CREATE POLICY "members_read_account_settings" ON public.business_account_settings FOR SELECT TO authenticated
USING (public.is_business_member(business_id));
CREATE POLICY "admins_update_account_settings" ON public.business_account_settings FOR UPDATE TO authenticated
USING (public.is_business_admin(business_id)) WITH CHECK (public.is_business_admin(business_id));
CREATE POLICY "admins_insert_account_settings" ON public.business_account_settings FOR INSERT TO authenticated
WITH CHECK (public.is_business_admin(business_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_account_settings TO authenticated;

-- 7) Profile is per-user/per-business. The application syncs it through Dexie
-- too, so profile changes survive offline use and are uploaded on reconnect.
DROP INDEX IF EXISTS public.idx_business_profiles_user_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_business_user_unique
  ON public.business_profiles(business_id, user_id);

-- 8) Foreign keys used by offline-created records must remain inside the same
-- business. These triggers reject accidental cross-business references.
CREATE OR REPLACE FUNCTION public.vyaparos_validate_business_links()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'sub_savings' AND NEW.linked_bank_account_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bank_accounts b
      WHERE b.id = NEW.linked_bank_account_id AND b.business_id = NEW.business_id
    ) THEN RAISE EXCEPTION 'Linked bank account belongs to another business.' USING ERRCODE='23514'; END IF;
  END IF;

  IF TG_TABLE_NAME = 'invoices' AND NEW.customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_parties p
      WHERE p.id = NEW.customer_id AND p.business_id = NEW.business_id
    ) THEN RAISE EXCEPTION 'Customer belongs to another business.' USING ERRCODE='23514'; END IF;
  END IF;

  IF TG_TABLE_NAME = 'ledger_entries' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.ledger_parties p
      WHERE p.id = NEW.party_id AND p.business_id = NEW.business_id
    ) THEN RAISE EXCEPTION 'Ledger party belongs to another business.' USING ERRCODE='23514'; END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vyaparos_sub_savings_business_link ON public.sub_savings;
CREATE TRIGGER trg_vyaparos_sub_savings_business_link
BEFORE INSERT OR UPDATE ON public.sub_savings
FOR EACH ROW EXECUTE FUNCTION public.vyaparos_validate_business_links();

DROP TRIGGER IF EXISTS trg_vyaparos_invoice_business_link ON public.invoices;
CREATE TRIGGER trg_vyaparos_invoice_business_link
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.vyaparos_validate_business_links();

DROP TRIGGER IF EXISTS trg_vyaparos_ledger_entry_business_link ON public.ledger_entries;
CREATE TRIGGER trg_vyaparos_ledger_entry_business_link
BEFORE INSERT OR UPDATE ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.vyaparos_validate_business_links();

-- 9) Useful indexes for RLS + active business sync.
CREATE INDEX IF NOT EXISTS idx_bank_accounts_business_user ON public.bank_accounts(business_id,user_id);
CREATE INDEX IF NOT EXISTS idx_sub_savings_business_user ON public.sub_savings(business_id,user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business_user_date ON public.transactions(business_id,user_id,date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_goals_business_user ON public.financial_goals(business_id,user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_business_user ON public.inventory_items(business_id,user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_user_date ON public.invoices(business_id,user_id,date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_parties_business_user ON public.ledger_parties(business_id,user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_business_user_date ON public.ledger_entries(business_id,user_id,date DESC);
CREATE INDEX IF NOT EXISTS idx_business_profiles_business_user ON public.business_profiles(business_id,user_id);
