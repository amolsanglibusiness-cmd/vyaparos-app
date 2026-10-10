-- VyaparOS main/sub-business hierarchy migration
-- Run this after SUPABASE_APPLY_20261008.sql.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS parent_business_id uuid NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS logo_url text NULL;

CREATE INDEX IF NOT EXISTS businesses_parent_business_id_idx
  ON public.businesses(parent_business_id);

-- Create a sub-business under a main business that the signed-in user owns/administers.
CREATE OR REPLACE FUNCTION public.create_sub_business_workspace(
  p_name text,
  p_parent_business_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_parent_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;

  SELECT b.owner_user_id INTO v_parent_owner
  FROM public.businesses b
  JOIN public.business_members bm ON bm.business_id = b.id
  WHERE b.id = p_parent_business_id
    AND bm.user_id = auth.uid()
    AND bm.role IN ('owner', 'admin')
    AND b.parent_business_id IS NULL;

  IF v_parent_owner IS NULL THEN
    RAISE EXCEPTION 'Main business not found or permission denied';
  END IF;

  v_new_id := public.create_business_workspace(trim(p_name));
  UPDATE public.businesses
     SET parent_business_id = p_parent_business_id
   WHERE id = v_new_id;
  RETURN v_new_id;
END;
$$;

-- Guard all deletion paths: a main business cannot be deleted while it has sub-businesses.
CREATE OR REPLACE FUNCTION public.prevent_main_business_delete_with_children()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.businesses WHERE parent_business_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete a main business while sub-businesses exist';
  END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS businesses_prevent_parent_delete ON public.businesses;
CREATE TRIGGER businesses_prevent_parent_delete
BEFORE DELETE ON public.businesses FOR EACH ROW
EXECUTE FUNCTION public.prevent_main_business_delete_with_children();

-- Optional explicit account sharing registry. App-level bank transaction RPCs can use this
-- registry to restrict cross-business visibility to businesses that the owner selected.
CREATE TABLE IF NOT EXISTS public.business_shared_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  target_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_shared_bank_accounts_distinct_businesses CHECK (owner_business_id <> target_business_id),
  CONSTRAINT business_shared_bank_accounts_unique UNIQUE (owner_business_id, target_business_id, bank_account_id)
);

ALTER TABLE public.business_shared_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS business_shared_bank_accounts_read_member ON public.business_shared_bank_accounts;
CREATE POLICY business_shared_bank_accounts_read_member ON public.business_shared_bank_accounts
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id=owner_business_id AND bm.user_id=auth.uid())
  OR EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id=target_business_id AND bm.user_id=auth.uid())
);
DROP POLICY IF EXISTS business_shared_bank_accounts_insert_admin ON public.business_shared_bank_accounts;
CREATE POLICY business_shared_bank_accounts_insert_admin ON public.business_shared_bank_accounts
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id=owner_business_id AND bm.user_id=auth.uid() AND bm.role IN ('owner','admin'))
);
DROP POLICY IF EXISTS business_shared_bank_accounts_delete_admin ON public.business_shared_bank_accounts;
CREATE POLICY business_shared_bank_accounts_delete_admin ON public.business_shared_bank_accounts
FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id=owner_business_id AND bm.user_id=auth.uid() AND bm.role IN ('owner','admin'))
);
