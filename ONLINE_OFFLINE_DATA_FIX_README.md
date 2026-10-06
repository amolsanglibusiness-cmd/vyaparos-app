# VyaparOS — Online + Offline Data Persistence Repair

## काय दुरुस्त केले

ही आवृत्ती **active Business + authenticated user** यांना data scope मानते.

दुरुस्ती केलेले मुख्य भाग:

- Bank Accounts
- Sub Savings / FD / RD / Pigmy
- Income / Expense / Transfer Transactions
- Financial Goals
- Inventory / Services
- Invoices / Saved Bills
- Customers / Suppliers (Ledger Parties)
- Ledger Entries
- Business Profile / Logo / Signature / Stamp / Bottom Bar settings
- Offline Dexie queue + Supabase background sync
- Android app resume / network reconnect sync
- Business switch करताना जुन्या business चा local data दुसऱ्या business मध्ये मिसळणार नाही
- Supabase pull आता **फक्त active business** चा data आणतो
- Supabase push मध्ये `user_id` + `business_id` स्पष्टपणे जातात
- Profile settings सुद्धा Dexie मध्ये offline save होऊन reconnect झाल्यावर Supabase ला जातात
- जुने Brevo OTP password-reset API routes काढले आहेत; password reset Supabase Auth वर आहे

## Supabase SQL

`supabase/migrations/20261006120000_vyaparos_online_offline_sync_repair.sql` ही migration Supabase SQL Editor मध्ये **सर्व जुन्या migrations नंतर** चालवा.

ही migration:

1. प्रत्येक authenticated user साठी business workspace आहे याची खात्री करते.
2. सर्व app-data tables मध्ये `business_id` repair करते.
3. जुन्या rows ला त्यांच्या user च्या business ला जोडते.
4. `business_id` NOT NULL करते.
5. सर्व app-data tables वर consistent RLS policies/grants लावते.
6. RLS filtering साठी indexes तयार करते.
7. cross-business bank/customer/ledger links रोखण्यासाठी validation triggers लावते.

## Environment variables

फक्त हे आवश्यक:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

या data-sync/password-reset fix साठी Brevo किंवा `SUPABASE_SERVICE_ROLE_KEY` आवश्यक नाही.

## Password reset

Supabase Dashboard → Authentication → URL Configuration मध्ये deployed URL चा:

```text
https://YOUR-DOMAIN.com/reset-password
```

Redirect URL म्हणून add करा.

Supabase email template मध्ये reset confirmation URL वापरा.

## Android test

1. नवीन build install करा.
2. Login करा.
3. Bank add करा → app बंद करा → पुन्हा उघडा.
4. Network ON असताना Supabase Table Editor मध्ये row तपासा.
5. Network OFF करून transaction/profile/inventory/invoice add करा.
6. Network ON करा आणि app foreground मध्ये आणा.
7. Pending changes Supabase मध्ये दिसले पाहिजेत.
8. App uninstall → reinstall → त्याच account ने login केल्यावर cloud data पुन्हा local Dexie मध्ये येईल.

## महत्त्वाचे

Android uninstall केल्यावर local Dexie data हटू शकतो. त्यामुळे कायमचा data Supabase मध्ये असणे आवश्यक आहे. या repair मध्ये reconnect/login नंतर Supabase मधून active business data पुन्हा local database मध्ये pull केला जातो.

### Build verification note

या package मध्ये source-level repair पूर्ण केले आहे. उपलब्ध environment मध्ये `npm ci` dependency installation timeout झाल्यामुळे final `npm run build` पूर्ण runtime verification करता आले नाही. त्यामुळे deployment करण्यापूर्वी local/CI मध्ये `npm ci` आणि `npm run build` चालवा.
