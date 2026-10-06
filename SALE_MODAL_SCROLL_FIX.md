# Sale / Invoice UX Fix — Nested Add Item Dialog + Scroll Reset

## 1. Nested dialog ownership
The Add New Item dialog is now rendered inside `ItemsScreen`, not inside the parent Sale-screen return branch.

Flow:
Sale -> screen='items' -> ItemsScreen remains mounted -> itemDialogOpen=true -> NewItemDialog

The child dialog is closed with `setItemDialogOpen(false)`, so `screen` remains `items`.

## 2. Scroll reset
`ItemsScreen` owns `scrollRef` and resets both its own scroll position and the window scroll position on mount. A `requestAnimationFrame` second reset handles browser layout/restore timing.

This is the React/Next.js equivalent of a Flutter ScrollController reset to 0.0 when a route/sheet is opened.

## 3. No root-screen dialog state
The parent `InvoicePage` no longer owns `itemDialogOpen`. This prevents a dialog state change from accidentally rendering through the Sale screen branch.
