# VyaparOS – Multi-Business Isolation + Persistent Device Contacts

## 1. Business-wise data isolation
- The currently selected business id is included in Supabase sync writes.
- Cloud pulls are filtered by the selected `business_id`.
- Delete sync is also restricted to the selected business.
- This prevents invoices, customers/parties, inventory, transactions, bank accounts, ledger data and other app data from Business A appearing in Business B.
- Existing RLS remains the server-side security boundary.

## 2. Shared Bank Accounts
- A bank account is treated as shared when the same normalized account number + IFSC exists across businesses.
- A new RPC `get_shared_bank_transactions()` exposes only transactions connected to that shared bank account.
- Shared transactions are shown in other businesses as read-only and are marked `Shared`.
- Edit/Delete is disabled for a shared transaction because it belongs to the business that created it.
- Shared bank balance aggregation continues through the existing shared-bank RPC.

## 3. Add New Party – contacts persistence
- After the first successful device contact import, the contact list is stored in device local storage.
- Reopening Add New Party restores the contacts immediately.
- The `Import contacts` button stays hidden once the cached contacts exist.
- The contacts list is not re-imported or permission-requested every time the Add New Party screen opens.
- Android native permission support remains unchanged.

## Supabase migration to apply
Run:
`supabase/migrations/20261008230000_vyaparos_business_isolation_shared_bank_transactions.sql`

No existing Auth users are deleted or changed by this update.
