-- VyaparOS: multi-business workspaces + per-business settings.

ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS business_contact_number text NOT NULL DEFAULT '';
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS business_logo_url text;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS bottom_button_1 text;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS bottom_button_2 text;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS bottom_button_4 text;
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS main_bank_account_id uuid;

CREATE INDEX IF NOT EXISTS idx_business_profiles_business_id ON public.business_profiles(business_id);
UPDATE public.business_profiles p SET business_id = (SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id=p.user_id ORDER BY bm.created_at ASC LIMIT 1) WHERE p.business_id IS NULL;

DROP INDEX IF EXISTS idx_business_profiles_user_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_business_user_unique ON public.business_profiles(business_id,user_id);

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members WHERE business_id=p_business_id AND user_id=auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.is_business_admin(p_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_members WHERE business_id=p_business_id AND user_id=auth.uid() AND role IN ('owner','admin'));
$$;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid) TO authenticated;

-- Users see only businesses to which they belong.
DROP POLICY IF EXISTS "members_read_businesses" ON public.businesses;
CREATE POLICY "members_read_businesses" ON public.businesses FOR SELECT TO authenticated
USING (public.is_business_member(id));
DROP POLICY IF EXISTS "members_insert_businesses" ON public.businesses;
CREATE POLICY "members_insert_businesses" ON public.businesses FOR INSERT TO authenticated
WITH CHECK (owner_user_id=auth.uid());
DROP POLICY IF EXISTS "owners_update_businesses" ON public.businesses;
CREATE POLICY "owners_update_businesses" ON public.businesses FOR UPDATE TO authenticated
USING (owner_user_id=auth.uid()) WITH CHECK (owner_user_id=auth.uid());
DROP POLICY IF EXISTS "owners_delete_businesses" ON public.businesses;
CREATE POLICY "owners_delete_businesses" ON public.businesses FOR DELETE TO authenticated
USING (owner_user_id=auth.uid());

-- A single authenticated RPC creates the workspace, membership and settings.
CREATE OR REPLACE FUNCTION public.create_business_workspace(p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_business uuid; v_name text:=NULLIF(trim(coalesce(p_name,'')),'');
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Login आवश्यक आहे.' USING ERRCODE='42501'; END IF;
 IF v_name IS NULL THEN RAISE EXCEPTION 'Business name भरा.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.businesses(name,owner_user_id) VALUES(v_name,v_user) RETURNING id INTO v_business;
 INSERT INTO public.business_members(business_id,user_id,role) VALUES(v_business,v_user,'owner');
 INSERT INTO public.business_account_settings(business_id) VALUES(v_business) ON CONFLICT DO NOTHING;
 RETURN v_business;
END $$;
REVOKE ALL ON FUNCTION public.create_business_workspace(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_business_workspace(text) TO authenticated;

-- Per-business profile policies.
DROP POLICY IF EXISTS "select_own_business_profile" ON public.business_profiles;
DROP POLICY IF EXISTS "insert_own_business_profile" ON public.business_profiles;
DROP POLICY IF EXISTS "update_own_business_profile" ON public.business_profiles;
DROP POLICY IF EXISTS "delete_own_business_profile" ON public.business_profiles;
CREATE POLICY "select_own_business_profile" ON public.business_profiles FOR SELECT TO authenticated
USING (user_id=auth.uid() AND public.is_business_member(business_id));
CREATE POLICY "insert_own_business_profile" ON public.business_profiles FOR INSERT TO authenticated
WITH CHECK (user_id=auth.uid() AND public.is_business_member(business_id));
CREATE POLICY "update_own_business_profile" ON public.business_profiles FOR UPDATE TO authenticated
USING (user_id=auth.uid() AND public.is_business_member(business_id))
WITH CHECK (user_id=auth.uid() AND public.is_business_member(business_id));
CREATE POLICY "delete_own_business_profile" ON public.business_profiles FOR DELETE TO authenticated
USING (user_id=auth.uid() AND public.is_business_member(business_id));

-- Business settings must be visible/editable for every member/admin of the active workspace.
DROP POLICY IF EXISTS "members_read_account_settings" ON public.business_account_settings;
DROP POLICY IF EXISTS "admins_update_account_settings" ON public.business_account_settings;
DROP POLICY IF EXISTS "admins_insert_account_settings" ON public.business_account_settings;
CREATE POLICY "members_read_account_settings" ON public.business_account_settings FOR SELECT TO authenticated USING(public.is_business_member(business_id));
CREATE POLICY "admins_update_account_settings" ON public.business_account_settings FOR UPDATE TO authenticated USING(public.is_business_admin(business_id)) WITH CHECK(public.is_business_admin(business_id));
CREATE POLICY "admins_insert_account_settings" ON public.business_account_settings FOR INSERT TO authenticated WITH CHECK(public.is_business_admin(business_id));

-- A user may list every business they are a member of (not only the first one).
DROP POLICY IF EXISTS "members_read_business_members" ON public.business_members;
CREATE POLICY "members_read_business_members" ON public.business_members FOR SELECT TO authenticated
USING (public.is_business_member(business_id));

DROP POLICY IF EXISTS "admins_add_business_members" ON public.business_members;
CREATE POLICY "admins_add_business_members" ON public.business_members FOR INSERT TO authenticated
WITH CHECK (public.is_business_admin(business_id));

DROP POLICY IF EXISTS "admins_remove_business_members" ON public.business_members;
CREATE POLICY "admins_remove_business_members" ON public.business_members FOR DELETE TO authenticated
USING (public.is_business_admin(business_id) AND user_id <> auth.uid());
