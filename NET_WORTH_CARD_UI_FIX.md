# Net Worth Card UI Fix

## Changes
- Removed Bank / Savings / Galla / Cash in Hand breakdown from inside the Net Worth card.
- Removed the four balance mini-cards that were rendered inside the Net Worth card after PIN unlock.
- Net Worth card now displays only the Net Worth metric, matching the supplied reference style.
- Added a single-series animated circular visual around the Net Worth amount. It is decorative and does not imply a percentage split between accounts.
- Kept the existing Eye + App Lock PIN behavior:
  - locked: Net Worth amount is masked
  - unlocked: Net Worth amount is visible
  - the dashboard balance cards below remain controlled by the same unlock state
- Kept the existing Net Worth calculation: Bank + Sub-Savings + Galla + Cash in Hand.
- Responsive mobile/desktop layout retained.

## Validation
The repository does not contain node_modules in this upload, so a full Next.js build could not be completed in this environment. TypeScript parsing was checked with the installed compiler; reported errors are dependency/type-environment errors caused by missing node_modules, not JSX parse errors in the modified Net Worth card.
