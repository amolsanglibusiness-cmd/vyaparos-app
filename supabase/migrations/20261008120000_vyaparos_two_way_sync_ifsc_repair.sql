-- VyaparOS Realtime publication for two-way offline/cloud synchronization.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bank_accounts','sub_savings','transactions','financial_goals',
    'inventory_items','invoices','ledger_parties','ledger_entries','business_profiles'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
