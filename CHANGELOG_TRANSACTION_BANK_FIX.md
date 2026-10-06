# VyaparOS Transaction / Cash / Bank / Savings Fix

## Included changes

1. Transaction Management
- Search bar for description, category, date and account.
- Date filter: All / Today.
- Tabs: All / Income / Expense / Savings / Transfer.

2. Cash page
- Search cash transactions.
- Filter by Income / Expense / Transfer.
- Existing Galla and Cash in Hand entry/transfer behavior retained.

3. Transaction Categories
- Removed category management section from Settings.
- Add/Edit/Delete category is available inside Add Transaction.
- A category used by an existing transaction cannot be deleted.
- Managed categories are used directly for Income/Expense category selection.

4. Main Bank for POS
- Settings now has a Main Bank for POS selector.
- It selects one of the banks already added in Bank & Savings.
- POS defaults to the selected main bank.
- POS receipt keeps the selected bank and prints bank details, UPI ID and QR.
- The selected bank remains a normal Main Bank account on the Banking page.

5. Savings transactions
- Add Transaction has a Savings type.
- Savings destinations include Daily Pigmy, RD, FD and Gold Savings sub-savings accounts.
- Existing sub-savings accounts created on Bank & Savings are selectable.
- Savings transaction amount is reflected in the selected sub-savings balance.
- Editing/deleting a Savings transaction reverses/reapplies the corresponding amount.

6. Bank page
- Main bank cards are no longer all displayed together.
- Select a bank first; only the selected bank card is shown.
- Selected bank history appears below it.
- Bank history has search and type filter.

7. Account labels
- Sub-savings accounts are recognized by transaction account labels.
