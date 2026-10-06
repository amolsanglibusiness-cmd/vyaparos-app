# VyaparOS — Invoice Bill Generation Integration

## Added
- `/invoice` complete Invoice Bill Generation page.
- Business profile, logo, GSTIN, contact, bank details, UPI QR, signature/stamp preview.
- Customer autocomplete from Ledger.
- Existing customer selection autofills mobile/address.
- New customer is automatically stored in `ledger_parties`.
- Duplicate customer mobile validation with direct `/ledger?edit=<id>` link.
- Dynamic invoice rows with Inventory autocomplete.
- Inline new Inventory item creation.
- Inventory GST/Tax rate field.
- Quantity × Rate calculations.
- Line tax + bill-level percentage/fixed tax.
- Percentage/fixed discount.
- Optional whole-bill round-off.
- Payment modes: Cash, UPI, Bank Transfer, Cheque, Credit/Pending.
- Bank selection for UPI/Bank Transfer/Cheque.
- Credit invoice creates Customer Ledger `Given` / receivable entry.
- Paid invoice creates Income transaction in Galla or selected bank account and a `Received` ledger entry for the customer.
- Linked inventory stock is reduced when a bill is saved.
- Invoice image generation uses the browser Canvas API, so no extra image-rendering dependency is required.
- Web Share API shares the PNG + structured text on supported mobile devices. Desktop fallback opens WhatsApp text and downloads the PNG.
- Existing Ledger page now uses the shared Dexie/Supabase data context so invoice-created customers and entries appear in Ledger.

## Files added
- `app/invoice/page.tsx`
- `app/banking/invoice-page.tsx`
- `supabase/migrations/20260924110000_invoice_billing_enhancement.sql`
- `supabase/migrations/20260924110100_inventory_tax_rate.sql`
- `INVOICE_BILLING_IMPLEMENTATION.md`

## Existing files updated
- `app/banking/types.ts`
- `app/banking/app-data-context.tsx`
- `app/banking/app-shell.tsx`
- `app/banking/i18n.ts`
- `app/banking/inventory-page.tsx`
- `app/banking/ledger-page.tsx`
- `lib/offline-db.ts` (Dexie v2 schema)
- `lib/sync-service.ts`
- `supabase/migrations/20260921084516_create_app_data_tables.sql`
- `package.json`

## Database model
### invoices
Existing invoice data remains compatible and is extended with:
- `customer_id`
- `customer_phone`
- `customer_address`
- `tax_mode`, `tax_value`, `tax_amount`
- `discount_mode`, `discount_value`
- `round_off`, `round_off_amount`
- `payment_account_id`
- `payment_status`
- `terms`
- `signature_enabled`

### ledger_parties
Existing customer/supplier table is reused. Customers are identified by `type = 'Customer'`.

### ledger_entries
Existing `Given` means receivable/Udhari given to customer and `Received` means payment received/settled against the customer ledger.

### transactions
Existing Income transaction table is reused for paid invoices. Cash invoices use `galla-cashbox`; UPI/Bank/Cheque use the selected bank account ID.

### inventory_items
Existing inventory table is reused and now has `tax_rate`.

## Supabase migration
Apply the two new migrations after the existing migrations. If your Supabase project uses the migration folder, push/apply migrations normally. Existing rows are preserved because all added columns use safe defaults.

## Local-first state flow
1. User enters/selects customer.
2. Invoice page checks the local Ledger mirror for duplicate mobile numbers.
3. New customer is written to Dexie and queued for Supabase sync.
4. Inventory item selection uses the same InventoryContext/AppDataProvider data.
5. New inventory item is written locally and queued for sync.
6. Saving the invoice writes the invoice locally first.
7. Linked inventory stock is reduced locally.
8. Credit creates a `Given` ledger entry; paid invoices create a `Received` ledger entry and an Income transaction.
9. `sync-service.ts` pushes all queued records to Supabase when online.

## Payment accounting rules
- Cash → Income transaction source = Galla (`galla-cashbox`).
- UPI → Income transaction source = selected bank account.
- Bank Transfer → Income transaction source = selected bank account.
- Cheque → Income transaction source = selected bank account.
- Credit/Pending → no cash/bank Income transaction; Customer Ledger receives a `Given` entry.

## WhatsApp behavior
On Android/mobile browsers that support Web Share with files, the generated PNG and structured text are shared together. On browsers without file sharing, the app opens a WhatsApp text URL and downloads the PNG so it can be attached manually.

## Dependency correction
The project originally requested `@capacitor/app@^8.5.2`, which is not a matching published version. It is changed to `^8.1.1`. The ZIP intentionally does not include a stale `package-lock.json`; run `npm install` to generate a fresh lockfile from the corrected `package.json`.

## Install and run
```powershell
cd "D:\svp App 2026\ERP_APP\VyaparOS-Build-Error-Fix"
npm install
npm run typecheck
npm run build
npm run dev
```

Then open:
- `http://localhost:3000/invoice`

## Important production note
The duplicate-mobile check is performed against the current local tenant data before save, which works offline. For a multi-device environment, an optional server-side uniqueness trigger/index can be added after cleaning any historical duplicate customer numbers. The migration deliberately avoids a hard unique constraint so existing customer data cannot become un-migratable.
