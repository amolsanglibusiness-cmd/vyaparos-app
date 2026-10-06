# VyaparOS Multi-User Shared Accounts — Safe Fix

Included fixes:
- Shared bank matching by normalized Account Number + IFSC.
- Shared bank balance aggregates stored bank base balances + transaction effects exactly once.
- No bank_accounts or transactions rows are modified by the balance function.
- Caller must own a matching bank account before receiving a shared balance.
- Existing Multi-User, business-member, profile/avatar, and Cash/Galla settings UI are preserved.
- The migration filename remains `20260929130000_multi_user_shared_accounts.sql` so it replaces the earlier migration file.

Apply the migration once in Supabase SQL Editor.
