# VyaparOS Changes — 2026-10-06

## Contacts import
- Removed the large “Import Parties from your contacts” card from Add New Party.
- Added a compact `Import contacts` button in the Party Name row.
- Imported contacts are shown directly in the Party Name searchable dropdown.
- Existing native Contacts permission request remains in place.
- Added an Android manifest repair script that inserts READ_CONTACTS and WRITE_CONTACTS whenever Capacitor Android is added/synced.

## User logo / stamp / signature
- Settings images continue to be stored as persistent data URLs in the business profile.
- The business profile is saved locally for offline use and to Supabase for online persistence.
- Image processing now uses the shared image reader/resizer, so uploaded settings images are resized for safer offline storage.
- On a later installation/login, the business profile can be restored from Supabase and the images become available again offline.

## Build note
The ZIP intentionally does not contain a generated `android/` directory. The permission-fix script runs automatically after:
- `npm run cap:add:android`
- `npm run cap:sync`
