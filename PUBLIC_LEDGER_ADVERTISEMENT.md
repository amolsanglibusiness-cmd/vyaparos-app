# Public Ledger Advertisement

Added a business-level Public Ledger Advertisement setting.

- Business owner/admin can upload or change an advertisement image (up to 800KB).
- Business owner/admin can remove the image.
- Business owner/admin can change the destination URL (Play Store or any http/https URL).
- The Public Ledger displays the current advertisement below the business header.
- Clicking the advertisement opens the configured destination in a new tab.
- Normal business members do not see the advertisement-management section and cannot update it through the app UI.
- Database RLS restricts insert/update/delete of advertisement settings to business owners/admins.
- Existing public ledger links use the current business advertisement, so changing the ad updates existing links as well.

Supabase migration:
`supabase/migrations/20261002180000_public_ledger_advertisement_admin.sql`
