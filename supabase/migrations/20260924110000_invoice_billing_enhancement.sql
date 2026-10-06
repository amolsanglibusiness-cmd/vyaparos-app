-- VyaparOS invoice billing enhancement.
-- Adds customer/payment/tax/round-off fields while keeping existing invoices compatible.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES ledger_parties(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_phone text NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_address text NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_mode text NOT NULL DEFAULT 'percentage';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_value numeric NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_mode text NOT NULL DEFAULT 'fixed';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS round_off boolean NOT NULL DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS round_off_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_account_id text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Paid';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due numeric NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS terms text NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signature_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_parties_customer_phone ON ledger_parties(user_id, phone) WHERE type = 'Customer';

-- The app performs a friendly duplicate check before saving. This constraint is
-- intentionally not unique because historical/customer data may contain blank
-- phones and because existing duplicate data must remain readable.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS state_of_supply text NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS attachment_name text NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS attachment_data_url text NOT NULL DEFAULT '';
