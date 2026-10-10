# VyaparOS — Business Delete Update (2026-10-08)

- Added a small Delete button beside the active Business selector in Settings.
- Only the business owner sees the button.
- Delete requires confirmation.
- Deletion calls the Supabase `delete_business_workspace(uuid)` security-definer RPC.
- Business application data is removed through existing `ON DELETE CASCADE` business_id foreign keys.
- At least one owned business must remain.
- If the active business is deleted, the app switches to another remaining business and refreshes the active-business cache.
- No unrelated UI/business logic was changed.

- Added `20261008235000_vyaparos_business_delete_guard.sql` so databases that already applied the earlier delete migration still receive the last-business safety guard.
