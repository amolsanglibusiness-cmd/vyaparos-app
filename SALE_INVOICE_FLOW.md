# VyaparOS Sale / Invoice Creation Flow

## Screen flow

`/invoice` is a single client-side Sale workspace with four visual screens:

1. `sale` — customer, invoice/date, billed-items summary, bill discount/tax, round-off, payment, state, notes, attachment and terms.
2. `items` — Add Items to Sale. Inventory search, quantity/rate/tax/discount per item, Save & New and Save.
3. `new-item` — dedicated Add Item form. Saves the new product to the shared Inventory/Dexie/Supabase data layer and appends it to the current sale.
4. `preview` — saved tax invoice preview with Standard, Tally Style and Landscape themes, WhatsApp/share, print, image download and New Sale.

## State flow

The Sale page owns the draft state. Item screens never own a second copy of the sale. They receive the same `lines` and `itemDraft` state through props and return changes through callbacks.

- Customer selection updates `selectedCustomer`, `customerPhone`, `customerAddress` and derived Party Balance.
- Duplicate mobile validation searches `ledgerParties` and blocks final save when the number belongs to another customer.
- Existing Inventory selection converts the inventory row into a sale line.
- New Inventory creation writes the item through `addInventoryItem()` and immediately appends the created item to the sale lines.
- `commitInvoice()` is the single accounting commit point. It saves the invoice, decreases linked stock, creates customer ledger entries for received/receivable amounts and creates a cash/bank income transaction for money actually received.
- After commit, `savedInvoice` becomes the immutable preview source.

## Accounting behavior

- Credit: no cash/bank income is created. The unpaid amount is recorded as `Given` in the customer ledger.
- Paid/partial payment: received amount is recorded as Income in Galla or the selected bank account. Any remaining balance is recorded as `Given` against the customer.
- Customer payment received on the same sale is recorded as `Received` in the customer ledger.
- Inventory stock is reduced only for sale lines linked to an Inventory item.

## Persistence changes

Invoice persistence now supports:
- `state_of_supply`
- `description`
- `attachment_name`
- `attachment_data_url`

Inventory persistence now supports:
- `hsn_code`

Dexie version 3 and Supabase migration changes are included.

## Local validation

The changed TypeScript/TSX files were syntax-transpiled successfully. A full project `npm run typecheck/build` requires installed npm dependencies; this source package intentionally does not include `node_modules`.
