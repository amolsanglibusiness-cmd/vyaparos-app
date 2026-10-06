# Offline / Online Data Sync Refactor

## Single source of truth

Inventory is now owned by `AppDataProvider` -> Dexie `inventory_items`.
`InventoryProvider` exposes that live collection through `useInventory()`.

- Inventory Add/Edit/Delete -> Dexie + sync queue
- POS -> derives products from `inventory`
- Low Stock Alerts -> derives alerts from `inventory`
- Offline -> Dexie stores changes locally
- Online -> existing `sync-service` pushes pending changes
- `src/lib/storage.ts` mirrors inventory to localStorage and dispatches `inventory-updated`
- No page should write `app_inventory_items_v1`, `mockPOSProducts`, or its own inventory store.

## PWA

`next-pwa` is enabled in production and disabled in development.
Install dependencies with `npm install`, then run `npm run build`.

The App Router manifest is at `app/manifest.ts`.
Add:
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`

## Important

Supabase synchronization still depends on the existing authenticated `sync-service`.
`navigator.onLine` only indicates browser connectivity; it is not a server sync guarantee.
