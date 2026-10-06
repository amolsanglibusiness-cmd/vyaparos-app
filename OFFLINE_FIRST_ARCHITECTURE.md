# VyaparOS Offline-First Architecture

## Runtime model

```text
UI (Next.js / React)
        │
        ▼
Dexie / IndexedDB  ← authoritative local data
        │
        ├── immediate CRUD while offline
        ├── sync_queue (insert/update/delete)
        └── live queries → UI updates immediately
        │
        ▼
Supabase sync-service
        │
        └── push pending + pull remote when online

PWA service worker
        └── caches app documents, JS, CSS and fonts for offline relaunch

Capacitor Android
        ├── App lifecycle → sync on resume
        └── PIN / biometric app-lock → local unlock, no internet required
```

## Guarantees

- After an online login, business data is kept in Dexie so normal dashboard,
  inventory, invoices, transactions and ledger screens can render offline.
- Offline inserts/updates/deletes are written locally first and queued for cloud
  synchronization.
- Reconnect and Android app resume trigger synchronization.
- A locked app is not logged out. PIN/biometric verification is local and does
  not require internet.
- Logging out is intentionally different: the local financial workspace is
  cleared to prevent another person using the same device from opening cached
  data.
- Local workspace identity is isolated by Supabase user id. Switching accounts
  clears the previous user's local database before loading the new account.

## Important limitation

The public `/t/[token]` ledger remains a network-backed public sharing route.
The authenticated business workspace is the offline-first portion. A new public
ledger link still requires internet to fetch fresh cloud data.

## Android build direction

The project already contains Capacitor configuration and native plugins. Because
Next.js also contains the dynamic public `/t/[token]` route and server-backed
features, do not switch the whole project to `output: 'export'` just to make an
APK. A fully bundled native build should use a dedicated static/client shell or
a native-capable web bundle for the authenticated workspace. The current PWA +
Capacitor lifecycle is safe to test first, while cloud APIs remain online-only
and local business data remains offline-first.
