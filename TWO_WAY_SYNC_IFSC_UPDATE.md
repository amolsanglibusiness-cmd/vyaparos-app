# VyaparOS 2026-10-08 — Two-Way Sync / Galla / IFSC Update

## Included changes

1. Dexie -> Supabase push remains offline-first and now has Supabase Realtime listeners.
   INSERT/UPDATE/DELETE changes made from another browser/device are applied to Dexie
   immediately when Realtime is connected; the existing initial pull and 60-second
   retry remain as a safety net.

2. Galla accounting:
   - Galla Expense => automatic equal Income row.
   - Galla Transfer => automatic equal Income row.
   - Galla Savings (Pigmy/RD/FD/Gold) => automatic equal Income row.
   The technical AUTO-GALLA-INCOME row is hidden by the transaction history UI.

3. Bank persistence:
   - IFSC is stored in the canonical Supabase `bank_accounts.ifsc` column.
   - Existing legacy `ifsc_code` values are copied into `ifsc`.
   - Existing legacy `account_holder_name` values are copied into `account_holder`.
   - `upi_id` and `updated_at` compatibility/defaults are retained.

4. Realtime publication:
   The new migration adds all Dexie-backed tables to `supabase_realtime` if they
   are not already present.

## Supabase migration

The required migration is:

`supabase/migrations/20261008120000_vyaparos_two_way_sync_ifsc_repair.sql`

Run your normal Supabase migrations (recommended). If migrations are applied
manually, run that SQL in the Supabase SQL Editor after the previous migrations.

## Validation

The changed TypeScript/TSX files were syntax-parsed successfully in this build
environment. A full Next.js production build could not be completed here because
the project's npm dependency installation exceeded the available execution window;
no application source error was inferred from that timeout.

## Important

This ZIP changes the application and includes the Supabase migration. It does not
directly execute SQL against your private Supabase project. The migration must be
applied to the target Supabase database before Realtime/IFSC cloud persistence can
be verified end-to-end.
