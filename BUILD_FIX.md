# Build Fix

Fixed `app/banking/pos-page.tsx` where the POS sync button referenced the removed `syncOfflineData` handler.
It now calls the existing centralized `syncAll()` service.

The Supabase realtime critical-dependency message shown by Next.js is a warning, not the TypeScript failure.
