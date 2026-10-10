# Supabase Sync 400 Fix — 2026-10-07

Only the Supabase persistence/sync layer was changed.

## Fixed
- Do not send browser-cached `business_id` in write payloads. Supabase resolves it with the authenticated business default/RLS, preventing stale-business PostgREST 400 failures.
- Do not filter cloud pulls by browser-cached `business_id`; RLS scopes the result to the authenticated user's accessible business data.
- Preserve `transaction_id` when syncing `ledger_entries`.
- Sync errors now retain structured Supabase error details in the local sync status/log instead of reducing an error object to `[object Object]`.

No UI or unrelated application behavior was changed.


## 2026-10-07 final schema sync repair
- Canonicalized bank account sync to CSV columns `account_holder` and `ifsc`.
- Added compatibility/backfill for bank account metadata columns.
- Added missing ledger-party `gstin` and transaction `shop_name`/`expense_items` columns.
- Reconciled invoice billing columns and business-scoped defaults/RLS.
- Added `vyaparos_persistence_schema_check` diagnostic view.
