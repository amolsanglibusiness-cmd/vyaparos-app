# Sale / Invoice Modal Navigation Fix

## Navigation stack

Sale screen owns customerSearchOpen and customerDialogOpen. Add Items screen owns itemSearchOpen and itemDialogOpen. The Add New Item dialog never changes the `screen` state, so it stays mounted over Add Items and closes back to the same screen.

## Outside click

`lib/use-click-outside.ts` listens to `pointerdown` in capture mode and closes only when the event target is outside the search container. The listener is disabled while the related dialog is open.

## Shared Party dialog

`app/banking/party-dialog.tsx` is now the single reusable Add/Edit Party UI. Ledger and Sale both use the same component. Sale supplies its own form state and performs invoice-specific duplicate-mobile validation before creating the party.

## Z-index

Search dropdowns use z-40. Existing page chrome/bottom actions use z-30/z-40. Party and inventory dialogs use z-[70], ensuring nested dialogs render above the Add Items screen without changing the parent `screen` state.
