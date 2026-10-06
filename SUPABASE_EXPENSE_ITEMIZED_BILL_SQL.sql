-- VyaparOS Itemized Expense Bill / Purchase
-- Run after the existing VyaparOS schema/migrations. Safe for existing transactions.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS shop_name text NOT NULL DEFAULT '';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS expense_items jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_transactions_shop_name
  ON public.transactions (user_id, shop_name);

CREATE INDEX IF NOT EXISTS idx_transactions_expense_items_gin
  ON public.transactions USING gin (expense_items);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Existing transactions RLS policies continue to protect these columns because
-- they are stored on the existing transactions row owned by auth.uid().
