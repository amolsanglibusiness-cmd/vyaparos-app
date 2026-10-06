-- VyaparOS: one-time BUSINESS DATA RESET
-- Keeps Supabase Auth users and does NOT drop tables, columns, RLS or schema.
-- Run this manually in Supabase SQL Editor when you want the cloud business data = 0.

BEGIN;

TRUNCATE TABLE
  public.ledger_entries,
  public.invoices,
  public.ledger_parties,
  public.transactions,
  public.inventory_items,
  public.financial_goals,
  public.sub_savings,
  public.bank_accounts,
  public.business_profiles
RESTART IDENTITY CASCADE;

COMMIT;

-- Intentionally NOT touched:
-- auth.users
-- public.profiles / public.users (if present)
-- database schema / tables / RLS policies
