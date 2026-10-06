# VyaparOS Public Customer Ledger Sharing

## 1. Run the Supabase migration
Run:
`supabase/migrations/20261002090000_public_customer_ledger_share.sql`

It creates tokenized share links, the public read RPC, and optional ledger-entry-to-transaction linkage.

## 2. Public URL
The app generates `/t/<token>?s=pr` links. To use a custom domain such as `https://khata.pe`, set:
`NEXT_PUBLIC_PUBLIC_LEDGER_BASE_URL=https://www.sanglibusiness.in`

If this variable is not set, the app uses the current site origin.

## 3. WhatsApp
Opening **WhatsApp** on a customer ledger creates a secure UUID-token link and opens WhatsApp with the customer name, current balance, and the full ledger-history URL.

The public page is view-only and shows all ledger entries as Given / Received with dates and amounts.


## 4. Custom domain requirement
The public ledger route is served by this Next.js app. `www.sanglibusiness.in` must point to the same deployed Next.js app (or a reverse proxy must forward `/t/*` to it). The current public website at `https://www.sanglibusiness.in/` is a news site, so changing the app URL alone does not add the `/t/*` route to that existing site.


## 2026-10-02 public bills/receipts update
WhatsApp now shares the Blogger bridge URL `https://www.sanglibusiness.in/p/ledger.html?t=<token>&s=pr`. The public view shows bills, receipt numbers, bill status, balance due, payment method, item details, dates, descriptions, and full ledger/payment history without login. Apply migration `20261002110000_public_customer_ledger_bills_receipts.sql`.


## 2026-10-02 public ledger exact format fix
The public `/t/[token]` page is login-free and uses a four-column Transaction History table: Date, Debit(-), Credit(+), Balance. The RPC avoids direct references to optional invoice columns so older schemas do not fail with `payment_status does not exist`.
