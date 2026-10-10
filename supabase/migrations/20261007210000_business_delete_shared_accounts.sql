-- VyaparOS: business deletion + explicit shared-account settings.
-- This replaces the old cash/galla shared-mode settings with account-based sharing.
ALTER TABLE public.business_account_settings
  ADD COLUMN IF NOT EXISTS shared_account_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS main_bank_shared boolean NOT NULL DEFAULT false;

-- Only the owner may remove a business. ON DELETE CASCADE on the business
-- workspace tables removes that business's application data as one unit.
CREATE OR REPLACE FUNCTION public.delete_business_workspace(p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE id = p_business_id
      AND owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the business owner can delete this business';
  END IF;

  IF (
    SELECT count(*)
    FROM public.businesses
    WHERE owner_user_id = auth.uid()
  ) <= 1 THEN
    RAISE EXCEPTION 'At least one business must remain';
  END IF;

  DELETE FROM public.businesses WHERE id = p_business_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_business_workspace(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_business_workspace(uuid) TO authenticated;
