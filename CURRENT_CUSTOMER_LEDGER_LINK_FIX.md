# Current Customer Ledger Link Fix — corrected database compatibility

The previous patch assumed `ledger_parties.business_id` already existed. Some
VyaparOS databases do not have that column yet, which causes PostgreSQL 42703:
`column ledger_parties.business_id does not exist`.

This corrected migration first creates the missing workspace columns safely,
backfills existing rows from `business_members`, and then creates the
business-scoped public ledger RPC.

## Apply

Supabase Dashboard → SQL Editor → run the migration file:
`supabase/migrations/20261004130000_fix_invoice_ledger_share_business_scope.sql`

After it succeeds, refresh the app and share the invoice again.

Do not deploy to Vercel until this migration completes successfully.
