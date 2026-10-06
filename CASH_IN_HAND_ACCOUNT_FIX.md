# Cash in Hand Account / Transaction Fix

Implemented:

1. `Cash in Hand` is a first-class account in Add Transaction, alongside `Galla (Cash Box)` and bank accounts.
2. Income can be deposited directly into Cash in Hand.
3. Expense can be paid directly from Cash in Hand.
4. Transfer supports:
   - Galla -> Cash in Hand
   - Cash in Hand -> Galla
   - Bank -> Cash in Hand
   - Cash in Hand -> Bank
   - Bank -> Bank
   - Galla -> Bank
   - Bank -> Galla
5. Transaction History edit account selectors also include Cash in Hand.
6. Cash page has a `Bank ↔ Cash in Hand` shortcut that opens the normal transaction window.
7. Existing Galla opening-balance/derived-income accounting remains unchanged.

Note: this change records account-to-account transfers in the transaction ledger. It does not introduce a second duplicate transaction row.
