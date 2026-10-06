-- VyaparOS: itemized Expense bills
-- Adds shop name and JSONB item lines to transactions. Existing transactions remain valid.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS shop_name text NOT NULL DEFAULT '';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS expense_items jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_transactions_shop_name
  ON public.transactions (user_id, shop_name);

CREATE INDEX IF NOT EXISTS idx_transactions_expense_items_gin
  ON public.transactions USING gin (expense_items);

-- Keep RLS enabled and retain the existing auth.uid() policies.
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
