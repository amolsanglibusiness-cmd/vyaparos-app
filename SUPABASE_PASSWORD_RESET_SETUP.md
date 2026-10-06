# VyaparOS — Supabase Password Reset

Brevo/OTP password reset has been completely removed. Forgot Password now uses only Supabase Auth.

## Flow

1. User taps **Forgot password?** on the Login screen.
2. User enters the registered email.
3. The app calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
4. Supabase sends its password-reset email.
5. The user opens the reset link from that email.
6. Supabase establishes the recovery session and the app opens `/reset-password`.
7. The user enters a new password twice.
8. The app calls `supabase.auth.updateUser({ password })`.
9. The password is updated in Supabase Auth and the user is returned to Login.

## Environment variables

No Brevo variables are required for password reset. Do not add `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_OTP_SECRET`, or `SUPABASE_SERVICE_ROLE_KEY` for this feature.

Keep the normal client Supabase variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## Supabase Dashboard configuration

### 1. Authentication → URL Configuration

Set the production **Site URL** to the deployed VyaparOS URL.

Add this exact redirect URL to **Redirect URLs**:

```text
https://YOUR-DOMAIN.com/reset-password
```

For local testing you can also add:

```text
http://localhost:3000/reset-password
```

Supabase requires the redirect URL used by `resetPasswordForEmail()` to be in the allowed Redirect URLs list.

### 2. Authentication → Email Templates → Reset Password

The reset email can use the normal Supabase recovery template. The button/link must use `{{ .ConfirmationURL }}`.

Example:

```html
<h2>Reset your password</h2>
<p>We received a request to reset your VyaparOS password.</p>
<p><a href="{{ .ConfirmationURL }}">Set a new password</a></p>
<p>If you did not request this, you can ignore this email.</p>
```

### 3. Email delivery

Supabase provides a default email service for testing, but it is rate-limited. For production, configure a custom SMTP provider in Supabase if required.

## Files removed from the Brevo flow

- `app/api/send-otp/route.ts`
- `app/api/verify-reset-otp/route.ts`
- `lib/supabase-admin.ts` (the password-reset-only admin helper)
- Brevo OTP environment-variable documentation

## Important

The reset page is public only so the Supabase recovery link can reach it. A new password is accepted only after Supabase has established a valid recovery session.
