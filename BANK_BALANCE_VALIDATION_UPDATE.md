# VyaparOS Bank Balance & Validation Update — 2026-10-08

## Changes
- Main Bank Accounts now calculate and display opening/base balance plus transaction effects.
- Bank Expense, Transfer and Savings transactions reduce the selected bank balance.
- Bank Income increases balance and Bank Transfer-to increases destination balance.
- App-side insufficient-balance validation blocks bank outflows and shows available vs required amount.
- Supabase BEFORE INSERT/UPDATE trigger independently rejects insufficient bank outflows.
- Bank account fields persisted:
  bank_name, account_holder, account_type, account_number, ifsc, branch, nickname,
  opening_date, status, show_on_invoice, notes, opening_balance.
- Bank Name, Account Holder and Account Number are required.
- Duplicate bank name + account number is rejected case/space-insensitively, both in UI and Supabase.
- Legacy account_holder_name/ifsc_code values are backfilled to account_holder/ifsc.
- Light-mode bank page text is foreground/black; dark mode keeps readable light text.
- Supabase Realtime two-way sync remains enabled for all offline-first tables.
- Galla Savings is included in automatic Galla Income logic.

## Supabase
Apply:
`supabase/migrations/20261008133000_vyaparos_bank_balance_fields_validation.sql`

The earlier realtime/IFSC migration is also included:
`supabase/migrations/20261008120000_vyaparos_two_way_sync_ifsc_repair.sql`

These migrations must be applied to the target Supabase project.

## Validation
ZIP structure and key source files were checked after packaging. A full Next.js
production build could not be completed in this environment because npm dependency
installation exceeded the available execution time.
