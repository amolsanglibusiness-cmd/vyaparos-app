-- VyaparOS: reliable creation of additional business workspaces for the logged-in user.
-- The function is SECURITY DEFINER so creation remains atomic even when RLS is enabled.

CREATE OR REPLACE FUNCTION public.create_business_workspace(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_name text := NULLIF(trim(coalesce(p_name, '')), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Login आवश्यक आहे.' USING ERRCODE = '42501';
  END IF;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Business name भरा.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.businesses (name, owner_user_id)
  VALUES (v_name, v_user_id)
  RETURNING id INTO v_business_id;

  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (v_business_id, v_user_id, 'owner');

  INSERT INTO public.business_account_settings (business_id)
  VALUES (v_business_id)
  ON CONFLICT (business_id) DO NOTHING;

  RETURN v_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_business_workspace(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_business_workspace(text) TO authenticated;

-- Keep direct table access correctly limited to the logged-in owner/member.
DROP POLICY IF EXISTS "members_insert_businesses" ON public.businesses;
CREATE POLICY "members_insert_businesses"
  ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "members_read_businesses" ON public.businesses;
CREATE POLICY "members_read_businesses"
  ON public.businesses FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_business_member(id));

DROP POLICY IF EXISTS "owners_update_businesses" ON public.businesses;
CREATE POLICY "owners_update_businesses"
  ON public.businesses FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "owners_delete_businesses" ON public.businesses;
CREATE POLICY "owners_delete_businesses"
  ON public.businesses FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid());
