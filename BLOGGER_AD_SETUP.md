# Blogger Public Ledger Advertisement

Use the HTML in `BLOGGER_LEDGER_BRIDGE_WITH_AD.html` for:
`https://www.sanglibusiness.in/p/ledger.html`

The page intentionally does not auto-redirect. It shows the advertisement first and provides a **View Customer Ledger** button.

## Change advertisement
At the top of the HTML edit only:

- `AD_IMAGE_URL` = the advertisement image URL
- `AD_DESTINATION_URL` = Play Store or any destination URL

The public ledger token remains in `?t=...&s=pr` and the View Customer Ledger button opens the corresponding Vercel public ledger route.

This keeps the advertisement configuration outside the VyaparOS app. Only someone with access to the Blogger page/editor can change the advertisement.
