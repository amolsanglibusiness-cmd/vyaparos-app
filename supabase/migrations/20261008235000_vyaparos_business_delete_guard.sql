-- VyaparOS: business deletion guard.
-- Re-apply the delete RPC so already-migrated databases also receive the
-- "keep at least one owned business" protection.
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

NOTIFY pgrst, 'reload schema';
