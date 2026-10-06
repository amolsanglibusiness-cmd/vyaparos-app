# VyaparOS Sale / Invoice Refined Flow

## Navigation
- `/invoice` — Sale creation.
- Customer search dropdown -> `+ Add New Customer` opens a nested Dialog over Sale. Save writes Ledger and selects the customer in the draft.
- `Add Items` -> item screen. Item search dropdown -> `+ Add New Item` opens a nested Dialog over the item screen. Save writes Inventory and appends the item to the current draft.
- Save -> invoice preview. `?view=<id>` opens preview; `?edit=<id>` restores the invoice into Sale.
- `/sales-history` — searchable Sales History with View, Edit, Share/Preview and Delete/Reverse.
- Dashboard includes `Recent Invoices` (latest 5).

## State flow
The Sale page owns the draft. Nested dialogs only return domain objects through callbacks; they never own invoice persistence. This prevents customer/item data loss when navigating back.

## Discount
Line discount is percentage based: `discount = qty * rate * discountPercent / 100`. Bill-level discount retains percentage/fixed selection.

## Payment
Payment type is a Select: Cash, UPI, Bank Transfer, Cheque, Credit/Pending. UPI/Bank/Cheque require a linked bank account.

## Edit/Delete accounting
Edit removes the old invoice's linked ledger entries and cash/bank transaction, then applies the new invoice. Inventory is adjusted by the old-vs-new quantity delta so editing the same item does not double-adjust stock. Delete restores stock and removes linked ledger/cashbook records; the customer master is retained.
