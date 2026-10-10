-- Explicit shared bank/cash accounts across business workspaces.
CREATE TABLE IF NOT EXISTS public.business_shared_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  target_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_shared_bank_accounts_distinct_businesses CHECK (owner_business_id <> target_business_id),
  CONSTRAINT business_shared_bank_accounts_unique UNIQUE(owner_business_id,target_business_id,bank_account_id)
);
CREATE INDEX IF NOT EXISTS business_shared_bank_accounts_target_idx ON public.business_shared_bank_accounts(target_business_id, bank_account_id);
ALTER TABLE public.business_shared_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shared_accounts_select_members ON public.business_shared_bank_accounts;
CREATE POLICY shared_accounts_select_members ON public.business_shared_bank_accounts FOR SELECT TO authenticated USING (
 public.is_business_member(owner_business_id) OR public.is_business_member(target_business_id)
);
DROP POLICY IF EXISTS shared_accounts_insert_owner_admin ON public.business_shared_bank_accounts;
CREATE POLICY shared_accounts_insert_owner_admin ON public.business_shared_bank_accounts FOR INSERT TO authenticated WITH CHECK (
 public.is_business_member(owner_business_id) AND EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id=owner_business_id AND bm.user_id=auth.uid() AND bm.role IN ('owner','admin'))
 AND public.is_business_member(target_business_id)
 AND EXISTS (SELECT 1 FROM public.bank_accounts ba WHERE ba.id=bank_account_id AND ba.business_id=owner_business_id)
);
DROP POLICY IF EXISTS shared_accounts_delete_owner_admin ON public.business_shared_bank_accounts;
CREATE POLICY shared_accounts_delete_owner_admin ON public.business_shared_bank_accounts FOR DELETE TO authenticated USING (
 EXISTS (SELECT 1 FROM public.business_members bm WHERE bm.business_id=owner_business_id AND bm.user_id=auth.uid() AND bm.role IN ('owner','admin'))
);

-- Returns shared bank rows for the active workspace without duplicating the account record.
CREATE OR REPLACE FUNCTION public.get_accessible_shared_bank_accounts(p_business_id uuid)
RETURNS SETOF public.bank_accounts
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT ba.* FROM public.bank_accounts ba
 JOIN public.business_shared_bank_accounts s ON s.bank_account_id=ba.id
 WHERE s.target_business_id=p_business_id AND public.is_business_member(p_business_id)
 UNION
 SELECT ba.* FROM public.bank_accounts ba
 JOIN public.business_shared_bank_accounts s ON s.bank_account_id=ba.id
 WHERE s.owner_business_id=p_business_id AND public.is_business_member(p_business_id)
$$;
REVOKE ALL ON FUNCTION public.get_accessible_shared_bank_accounts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_accessible_shared_bank_accounts(uuid) TO authenticated;

-- Ledger history intentionally merges all transactions against the explicitly shared bank,
-- but returns business name so the origin of each entry is clear.
DROP FUNCTION IF EXISTS public.get_shared_bank_transactions(text,text);
CREATE OR REPLACE FUNCTION public.get_shared_bank_transactions(p_account_number text,p_ifsc_code text)
RETURNS TABLE(id uuid,type text,amount numeric,category text,description text,date timestamptz,tag text,source_account_id text,dest_account_id text,is_from_galla boolean,shop_name text,expense_items jsonb,created_at timestamptz,source_is_shared_bank boolean,dest_is_shared_bank boolean,business_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_account_key text; v_ifsc_key text; v_has_access boolean;
BEGIN
 v_account_key:=regexp_replace(lower(coalesce(trim(p_account_number),'')),'[^a-z0-9]','','g');
 v_ifsc_key:=regexp_replace(lower(coalesce(trim(p_ifsc_code),'')),'[^a-z0-9]','','g');
 IF v_account_key='' OR v_ifsc_key='' THEN RETURN; END IF;
 SELECT EXISTS(SELECT 1 FROM public.bank_accounts b WHERE public.is_business_member(b.business_id)
   AND regexp_replace(lower(coalesce(b.account_number,'')),'[^a-z0-9]','','g')=v_account_key
   AND regexp_replace(lower(coalesce(b.ifsc,'')),'[^a-z0-9]','','g')=v_ifsc_key
   AND (EXISTS(SELECT 1 FROM public.business_shared_bank_accounts s WHERE s.bank_account_id=b.id AND (public.is_business_member(s.owner_business_id) OR public.is_business_member(s.target_business_id)))
        OR b.business_id IN (SELECT s.owner_business_id FROM public.business_shared_bank_accounts s WHERE s.bank_account_id=b.id UNION SELECT s.target_business_id FROM public.business_shared_bank_accounts s WHERE s.bank_account_id=b.id))) INTO v_has_access;
 IF NOT v_has_access THEN RETURN; END IF;
 RETURN QUERY SELECT t.id,t.type,t.amount,t.category,t.description,t.date,t.tag,t.source_account_id,t.dest_account_id,t.is_from_galla,t.shop_name,t.expense_items,t.created_at,
  EXISTS(SELECT 1 FROM public.bank_accounts sb WHERE sb.id::text=t.source_account_id AND regexp_replace(lower(coalesce(sb.account_number,'')),'[^a-z0-9]','','g')=v_account_key AND regexp_replace(lower(coalesce(sb.ifsc,'')),'[^a-z0-9]','','g')=v_ifsc_key),
  EXISTS(SELECT 1 FROM public.bank_accounts db WHERE db.id::text=t.dest_account_id AND regexp_replace(lower(coalesce(db.account_number,'')),'[^a-z0-9]','','g')=v_account_key AND regexp_replace(lower(coalesce(db.ifsc,'')),'[^a-z0-9]','','g')=v_ifsc_key),
  COALESCE(b.name,'Business')
 FROM public.transactions t LEFT JOIN public.businesses b ON b.id=t.business_id
 WHERE EXISTS(SELECT 1 FROM public.bank_accounts ba JOIN public.business_shared_bank_accounts s ON s.bank_account_id=ba.id
   WHERE regexp_replace(lower(coalesce(ba.account_number,'')),'[^a-z0-9]','','g')=v_account_key AND regexp_replace(lower(coalesce(ba.ifsc,'')),'[^a-z0-9]','','g')=v_ifsc_key
   AND (t.source_account_id=ba.id::text OR t.dest_account_id=ba.id::text)
   AND (public.is_business_member(s.owner_business_id) OR public.is_business_member(s.target_business_id)) )
 ORDER BY t.date DESC,t.created_at DESC;
END; $$;
REVOKE ALL ON FUNCTION public.get_shared_bank_transactions(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_bank_transactions(text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
