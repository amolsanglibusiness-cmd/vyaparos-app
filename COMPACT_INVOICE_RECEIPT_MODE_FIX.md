# Compact Invoice Header + Payment Receipt Mode

## State conditions

```ts
const isReceiptMode = lines.length === 0;
const receiptReceived = Math.max(0, Number(receivedAmount) || 0);
const receiptBalanceDue = selectedCustomer
  ? Math.max(0, customerBalance - receiptReceived)
  : 0;
const documentTotal = isReceiptMode ? receiptReceived : total;
```

`isReceiptMode` is the single source of truth used by the Sale UI, invoice object, preview, print and canvas image renderer.

## Sale UI

When `isReceiptMode === true`:
- Bill Summary is not rendered.
- Item list/metrics are not rendered.
- Tax and discount controls are not rendered.
- Only Customer, Payment Type, Receiving/Received amount, Balance Due and Notes remain.
- Save creates a payment receipt with `items: []` and `total = receivedAmount`.

When `isReceiptMode === false` the normal tax invoice sections are rendered.

## Compact selectors

Invoice number and date are compact inline controls. Invoice number opens a small edit dialog. Date uses the native date picker through `HTMLInputElement.showPicker()` with focus fallback.

Payment Type, Receiving Account and State of Supply use `CompactSelector`, a small inline label that opens a bottom-sheet style selection overlay.

## Preview/Image/Print

`PreviewScreen`, `createInvoiceImage()` and `printInvoice()` branch on `invoice.items.length === 0`.

Receipt preview/image/print contains only:
- Customer Name
- Date
- Received Amount
- Payment Type
- Balance Due
- Notes/Description

No item table, subtotal, tax or discount is generated for a receipt.

## Accounting

Receipt mode records only the received payment. It does not create a new receivable (`Given`) entry. The persisted `balance_due` field stores the remaining party balance for accurate reopening/preview.

## Database

Added `invoices.balance_due` to:
- Supabase migration
- Dexie InvoiceRow
- AppDataContext mapping
- Sync-service local/remote mapping
- Invoice TypeScript model
