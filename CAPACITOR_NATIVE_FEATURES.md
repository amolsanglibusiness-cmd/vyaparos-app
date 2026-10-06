# VyaparOS Native Biometric + Contacts

## Dependencies

The project now uses:

- `@capgo/capacitor-native-biometric` for Android/iOS native biometric prompts.
- `@capacitor-community/contacts` for native contact access.

Run after extracting the project:

```bash
npm install
npx cap sync android
```

If the Android platform folder does not exist yet:

```bash
npx cap add android
npx cap sync android
```

## Android permissions

The native biometric plugin requires `USE_BIOMETRIC`. The contacts feature requires `READ_CONTACTS`. If your generated Android project does not receive these permissions through plugin manifest merging, add these lines inside `<manifest>` in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
```

Then run:

```bash
npx cap sync android
```

## Biometric behavior

- Native Capacitor app: uses the Android native biometric prompt directly; it does not require HTTPS/WebAuthn.
- Browser/PWA: keeps WebAuthn as the fallback and therefore requires a secure context such as HTTPS or localhost.

## Contacts behavior

- Native Android: requests `readContacts`, loads contacts, and provides in-app search by name/mobile.
- Browser: uses `navigator.contacts.select()` when the browser supports the Contacts Picker API.
- Unsupported browser: shows a clear message instead of failing silently.

## Supabase migration

Run:

```sql
alter table public.ledger_parties
  add column if not exists gstin text null;
```

The migration is also included at `supabase/ADD_PARTY_GSTIN.sql`.
