# Net Worth Balance Privacy Fix

## Changes
- Dashboard Net Worth card no longer permanently displays Bank Balance, Savings, Galla, or Cash in Hand amounts.
- Net Worth amount remains visible on the dashboard.
- Eye button opens a secure PIN dialog.
- The PIN is verified using the same App Lock PIN configured in Settings (`lib/app-lock.ts`).
- If App Lock PIN is not configured, the user is asked to set it in Settings first.
- After successful verification, balance details become visible across the dashboard balance cards.
- Eye-off hides the balances again without changing stored data.
- Net Worth card now uses a composition donut chart after unlock, showing Bank, Savings, Galla, and Cash in Hand proportions.
- Before unlock, the chart area is intentionally non-sensitive and does not reveal account composition.
- Existing Net Worth calculation is unchanged: Bank + Sub-Savings + Galla + Cash in Hand.

## Validation
The three changed TSX files were transpiled with the installed TypeScript compiler using the project's JSX/ESNext settings. No TypeScript syntax/transpile diagnostics were reported.
A full Next.js build was not run because this extracted source package does not contain node_modules.
