ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0;

ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS hsn_code text NOT NULL DEFAULT '';
