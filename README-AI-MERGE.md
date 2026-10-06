# VyaparOS AI — UI Preserved + Finance/Bank Command Fix

This package keeps the AI Assistant UI from the supplied Message-Screen-Fixed project unchanged and merges the finance command fixes.

Key behavior:
- Money actions are resolved before analytics/Gemini.
- “आज 500 रुपये खर्च झाले बँकेतून” is treated as an expense action.
- No bank account: user is told that a bank account is not saved.
- Multiple bank accounts: user is asked which bank to use.
- Explicit bank name/account is resolved to that account.
- The same source-account resolution is used for AI invoice payment accounts.
- Existing chat/voice, Local AI learning, message screen, auto-scroll and other UI functionality are preserved.

Also includes the updated Supabase Gemini Edge Function and requested Next.js API handler.
