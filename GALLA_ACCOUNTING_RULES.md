# VyaparOS Galla Accounting Rules

## Galla meaning
Galla is the shop's running cash drawer. Cash already present in Galla is an opening balance, not today's business income.

## Opening balance
The Cash page has a **Galla Opening Balance** field. Example: opening balance ₹500.

Opening balance affects the Galla closing balance but is never added to today's income/turnover.

## Daily income/outflow matching
For each calendar day:

- Real Galla income = POS cash income + other real income deposited into Galla.
- Galla outflow = Galla expenses + Galla-to-bank transfers + Galla-to-Cash-in-Hand transfers.
- Real income is considered first against that day's outflow.
- If outflow is greater than real income, only the unmatched amount is treated as **Automatic Galla Income**.
- Automatic Galla Income is derived, not stored as a duplicate database transaction.

Formula:

`Automatic Galla Income = max(0, Galla Outflow - Real Galla Income)`

`Closing Galla = Opening Galla + Real Galla Income + Automatic Galla Income - Galla Outflow + transfers into Galla`

This keeps the opening cash intact when an outflow represents cash that was already present/generated but was not entered as an explicit income.

## Examples

### Opening ₹500, POS/other income ₹2,000, bank transfer ₹2,000
- Opening: ₹500
- Real income: ₹2,000
- Outflow: ₹2,000
- Automatic income: ₹0
- Business income/turnover: ₹2,000
- Closing Galla: ₹500

### Same day, another ₹1,000 transfer/expense
- Total real income: ₹2,000
- Total outflow: ₹3,000
- Automatic income: ₹1,000
- Business income/turnover: ₹3,000
- Closing Galla: ₹500

### Opening ₹500, no recorded income, Galla expense ₹1,000
- Real income: ₹0
- Outflow: ₹1,000
- Automatic income: ₹1,000
- Business income/turnover: ₹1,000
- Closing Galla: ₹500

The derived automatic amount recalculates when a real POS/income, expense, or transfer is edited or deleted.
