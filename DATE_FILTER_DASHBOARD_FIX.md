# Dashboard Date Filter Fix

The Dashboard now uses one shared `DateFilterProvider`.

`DateFilterBar`, `DashboardPage`, `NetWorthCard`, and `RecentTransactionsWidget` all read the same selected range.

Filtered by the selected range:
- Income / Sales metrics
- Expense metric
- Net Profit
- Recent Transactions
- Net Worth graph

Current balance cards remain current balances and are not rewritten as historical balances.
