-- VyaparOS multi-user + shared account foundation
-- Users can belong to the same VyaparOS business workspace.
-- Bank balances can be shared across users/businesses when account number + IFSC match.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;


CREATE OR REPLACE FUNCTION public.handle_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = CASE WHEN public.users.display_name = '' THEN EXCLUDED.display_name ELSE public.users.display_name END,
    avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_profile ON auth.users;
CREATE TRIGGER trg_auth_user_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_profile();

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

CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON public.business_members(business_id);

CREATE TABLE IF NOT EXISTS public.business_account_settings (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  cash_mode text NOT NULL DEFAULT 'separate' CHECK (cash_mode IN ('separate','shared')),
  galla_mode text NOT NULL DEFAULT 'separate' CHECK (galla_mode IN ('separate','shared')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_account_settings ENABLE ROW LEVEL SECURITY;

-- The app needs a directory of registered users so a logged-in user can add
-- another already-registered Gmail/email user to the same business workspace.
DROP POLICY IF EXISTS "authenticated_read_user_directory" ON public.users;
CREATE POLICY "authenticated_read_user_directory"
  ON public.users FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.my_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.business_members
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  business_id uuid;
BEGIN
  INSERT INTO public.businesses (name, owner_user_id)
  VALUES (COALESCE(NULLIF(NEW.display_name, ''), 'My Business'), NEW.id)
  RETURNING id INTO business_id;

  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (business_id, NEW.id, 'owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.business_account_settings (business_id)
  VALUES (business_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_create_business ON public.users;
CREATE TRIGGER trg_users_create_business
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.ensure_user_business();

-- Backfill a workspace for existing users who do not have one.
DO $$
DECLARE
  u record;
  b uuid;
BEGIN
  FOR u IN SELECT id, display_name FROM public.users LOOP
    IF NOT EXISTS (SELECT 1 FROM public.business_members WHERE user_id = u.id) THEN
      INSERT INTO public.businesses (name, owner_user_id)
      VALUES (COALESCE(NULLIF(u.display_name, ''), 'My Business'), u.id)
      RETURNING id INTO b;
      INSERT INTO public.business_members (business_id, user_id, role) VALUES (b, u.id, 'owner');
      INSERT INTO public.business_account_settings (business_id) VALUES (b) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Existing profile email/avatar metadata is copied into the directory when available.
UPDATE public.users u
SET email = a.email,
    avatar_url = COALESCE(u.avatar_url, a.raw_user_meta_data ->> 'avatar_url', a.raw_user_meta_data ->> 'picture')
FROM auth.users a
WHERE a.id = u.id;


CREATE OR REPLACE FUNCTION public.is_business_admin(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND role IN ('owner','admin')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "members_read_businesses" ON public.businesses;
CREATE POLICY "members_read_businesses" ON public.businesses FOR SELECT TO authenticated
USING (id = public.my_business_id());

DROP POLICY IF EXISTS "members_read_business_members" ON public.business_members;
CREATE POLICY "members_read_business_members" ON public.business_members FOR SELECT TO authenticated
USING (business_id = public.my_business_id());

DROP POLICY IF EXISTS "admins_add_business_members" ON public.business_members;
CREATE POLICY "admins_add_business_members" ON public.business_members FOR INSERT TO authenticated
WITH CHECK (
  business_id = public.my_business_id()
  AND public.is_business_admin(business_members.business_id)
);

DROP POLICY IF EXISTS "admins_remove_business_members" ON public.business_members;
CREATE POLICY "admins_remove_business_members" ON public.business_members FOR DELETE TO authenticated
USING (
  business_id = public.my_business_id()
  AND user_id <> auth.uid()
  AND public.is_business_admin(business_members.business_id)
);

DROP POLICY IF EXISTS "members_read_account_settings" ON public.business_account_settings;
CREATE POLICY "members_read_account_settings" ON public.business_account_settings FOR SELECT TO authenticated
USING (business_id = public.my_business_id());

DROP POLICY IF EXISTS "admins_update_account_settings" ON public.business_account_settings;
CREATE POLICY "admins_update_account_settings" ON public.business_account_settings FOR UPDATE TO authenticated
USING (
  business_id = public.my_business_id()
  AND public.is_business_admin(business_account_settings.business_id)
)
WITH CHECK (business_id = public.my_business_id());

GRANT EXECUTE ON FUNCTION public.my_business_id() TO authenticated;

-- Aggregate a bank as one account whenever account number + IFSC match.
-- SAFE VERSION:
-- * The caller must own at least one matching bank account.
-- * Other matching accounts may belong to other users/businesses.
-- * Existing bank_accounts.balance is treated as the stored opening/current
--   base balance, and transaction effects are added exactly once.
-- * No bank_accounts or transactions rows are modified by this function.
-- * Account/IFSC matching ignores spaces, punctuation and letter case.
CREATE OR REPLACE FUNCTION public.get_shared_bank_balance(p_account_number text, p_ifsc_code text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_key text;
  v_ifsc_key text;
  v_has_access boolean;
  v_base_balance numeric := 0;
  v_transaction_net numeric := 0;
BEGIN
  v_account_key := regexp_replace(lower(coalesce(trim(p_account_number), '')), '[^a-z0-9]', '', 'g');
  v_ifsc_key := regexp_replace(lower(coalesce(trim(p_ifsc_code), '')), '[^a-z0-9]', '', 'g');

  IF v_account_key = '' OR v_ifsc_key = '' THEN
    RETURN 0;
  END IF;

  -- Privacy boundary: a caller can aggregate a shared bank only when that
  -- caller actually has a matching bank account of their own.
  SELECT EXISTS (
    SELECT 1
    FROM public.bank_accounts b
    WHERE b.user_id = auth.uid()
      AND regexp_replace(lower(coalesce(b.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key
      AND regexp_replace(lower(coalesce(b.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RETURN 0;
  END IF;

  -- Each user's stored balance is included once. The application currently
  -- stores bank opening/base balance on bank_accounts and stores later changes
  -- as transactions, so transaction effects are added separately below.
  SELECT COALESCE(SUM(b.balance), 0)
  INTO v_base_balance
  FROM public.bank_accounts b
  WHERE regexp_replace(lower(coalesce(b.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key
    AND regexp_replace(lower(coalesce(b.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key;

  SELECT COALESCE(SUM(
    CASE
      WHEN t.source_account_id = b.id::text AND t.type = 'Income' THEN t.amount
      WHEN t.source_account_id = b.id::text AND t.type = 'Expense' THEN -t.amount
      WHEN t.source_account_id = b.id::text AND t.type = 'Transfer' THEN -t.amount
      WHEN t.dest_account_id = b.id::text AND t.type = 'Transfer' THEN t.amount
      ELSE 0
    END
  ), 0)
  INTO v_transaction_net
  FROM public.transactions t
  JOIN public.bank_accounts b
    ON t.source_account_id = b.id::text
    OR t.dest_account_id = b.id::text
  WHERE regexp_replace(lower(coalesce(b.account_number, '')), '[^a-z0-9]', '', 'g') = v_account_key
    AND regexp_replace(lower(coalesce(b.ifsc, '')), '[^a-z0-9]', '', 'g') = v_ifsc_key;

  RETURN v_base_balance + v_transaction_net;
END;
$$;
REVOKE ALL ON FUNCTION public.get_shared_bank_balance(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_bank_balance(text,text) TO authenticated;

-- Combined cash/galla transaction net for the current user's business members.
CREATE OR REPLACE FUNCTION public.get_shared_cash_galla_balance(p_account_id text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN t.source_account_id = p_account_id AND t.type = 'Income' THEN t.amount
      WHEN t.source_account_id = p_account_id AND t.type IN ('Expense','Transfer') THEN -t.amount
      WHEN t.dest_account_id = p_account_id AND t.type = 'Transfer' THEN t.amount
      ELSE 0
    END
  ), 0)
  FROM public.transactions t
  WHERE t.user_id IN (SELECT user_id FROM public.business_members WHERE business_id = public.my_business_id())
    AND (t.source_account_id = p_account_id OR t.dest_account_id = p_account_id);
$$;
REVOKE ALL ON FUNCTION public.get_shared_cash_galla_balance(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_cash_galla_balance(text) TO authenticated;
