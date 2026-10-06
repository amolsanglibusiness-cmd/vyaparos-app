# VyaparOS Android Contacts Permission Fix

The Add New Party screen now uses a small `Import contacts` button inside the Party Name row.
Imported contacts appear in the Party Name dropdown/search list.

The project also includes `scripts/ensure-android-contacts-permissions.mjs`.
It is automatically run after `cap add android` and `cap sync android` and ensures:

- `android.permission.READ_CONTACTS`
- `android.permission.WRITE_CONTACTS`

are present in `android/app/src/main/AndroidManifest.xml`.

After extracting this project, run:

```bash
npm install
npm run cap:add:android
```

If the Android project already exists:

```bash
npm run cap:sync
```
