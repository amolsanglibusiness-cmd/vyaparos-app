alter table public.ledger_parties
  add column if not exists gstin text null;
