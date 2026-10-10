# Bank Supabase Sync Fix — 2026-10-09

## Problem
Bank accounts created in the Android APK were saved to Dexie/local storage but were not reaching Supabase.

## Root cause
The Dexie bank-account row uses `account_holder_name` and `ifsc_code`, while `addBankAccount()` was writing local rows with `account_holder` and `ifsc`. The sync mapper only accepted the Dexie keys, so the Supabase payload lost the required `account_holder` and `ifsc` values. The database validation trigger then rejected the insert/update.

## Fix
- Bank form writes canonical Dexie keys: `account_holder_name` and `ifsc_code`.
- Sync mapper maps those keys to Supabase `account_holder` and `ifsc`.
- Sync mapper also accepts the old `account_holder` / `ifsc` local keys so already-queued APK records can sync after updating.
- No UI or bank calculation logic was changed.
- Existing offline queue records remain eligible for retry.
