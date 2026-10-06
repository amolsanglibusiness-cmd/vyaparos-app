# VyaparOS Multi-Business Setup

## Supabase migration

Run the migrations in `supabase/migrations/` through Supabase CLI or your normal migration pipeline. The new migration `20261003133000_fix_multi_business_create_rls.sql` adds the `create_business_workspace(text)` RPC and reinforces the `businesses` RLS policies.

The app now creates a new business through that authenticated RPC instead of directly inserting into `businesses` from the browser. The RPC uses `auth.uid()`, creates the owner membership, and creates the business account settings in one transaction.

## Business visibility

The Business Switcher loads memberships for the currently authenticated `user.id`. It does not query every Supabase user/business as a global directory. A user can therefore manage multiple businesses while remaining isolated from businesses they do not belong to.

## Important

After applying the migration, redeploy the Vercel app so the updated client code is live.
