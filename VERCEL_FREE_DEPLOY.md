# VyaparOS — Free Vercel Deployment

This package is prepared for a normal Next.js/Vercel deployment.

## Why this build is different from the previous static build

The app contains a dynamic public customer ledger route:

`/t/[token]`

The previous `next.config.js` used `output: 'export'`, which is a static export and is not suitable for arbitrary token URLs. This build uses normal Next.js server output so Vercel can serve `/t/<token>` dynamically.

## Free deployment

1. Create/login to a GitHub account.
2. Create a new private repository, for example `vyaparos`.
3. Upload this project to the repository. `.env` is ignored by `.gitignore`; do not commit secrets.
4. Open Vercel and import the GitHub repository.
5. Framework: Next.js (auto-detected).
6. Node.js: 20.x.
7. Build command: `npm run build`.
8. Output: leave Vercel default.
9. Add these Environment Variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_PUBLIC_LEDGER_BASE_URL` can be left empty for the first deployment.
10. Deploy.

After deployment, Vercel gives a URL similar to:

`https://vyaparos-xxxx.vercel.app`

The WhatsApp ledger link will then use that Vercel origin automatically while the custom domain is not configured.

## Supabase

Before using public ledger links, run:

`supabase/migrations/20261002090000_public_customer_ledger_share.sql`

in the Supabase SQL Editor.

## Later: sanglibusiness.in

Once the Vercel deployment is working, the existing Blogger website can remain on `sanglibusiness.in`. Cloudflare can route only:

`/t/*`

to the Vercel deployment. Then set:

`NEXT_PUBLIC_PUBLIC_LEDGER_BASE_URL=https://www.sanglibusiness.in`

in Vercel and redeploy.

Do not point the entire Blogger domain to Vercel if the goal is to keep the current Blogger news website unchanged.

## WhatsApp Ledger Button Fix

The customer ledger WhatsApp share action now opens a blank tab synchronously before the Supabase request, then navigates that tab to WhatsApp. This avoids browser popup blocking caused by calling `window.open()` after an awaited database request. The action buttons also use `type="button"` explicitly.
