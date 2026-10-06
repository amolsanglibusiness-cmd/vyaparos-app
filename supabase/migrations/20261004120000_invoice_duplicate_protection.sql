-- Prevent future duplicate invoice numbers inside the same business.
-- Existing historical duplicates are not modified. Updates to unrelated fields
-- on those historical rows remain allowed; changing an invoice number to an
-- already-used number is rejected.

CREATE INDEX IF NOT EXISTS idx_invoices_business_invoice_number
  ON public.invoices (business_id, invoice_number);

CREATE OR REPLACE FUNCTION public.prevent_duplicate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(trim(NEW.invoice_number), '') = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.invoice_number IS NOT DISTINCT FROM OLD.invoice_number
     AND NEW.business_id IS NOT DISTINCT FROM OLD.business_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.business_id = NEW.business_id
      AND upper(trim(i.invoice_number)) = upper(trim(NEW.invoice_number))
      AND i.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Duplicate invoice number: %', trim(NEW.invoice_number)
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_invoice_number ON public.invoices;

CREATE TRIGGER trg_prevent_duplicate_invoice_number
BEFORE INSERT OR UPDATE OF business_id, invoice_number
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_invoice_number();
