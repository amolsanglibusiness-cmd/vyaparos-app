# VyaparOS UI/UX Overhaul — v3

## Design system
- Primary: Deep Indigo / Slate
- Accent: Emerald
- Cards: subtle `border-border/40`, rounded-xl/rounded-2xl, restrained shadows
- Controls: 44px minimum touch target
- Tables: calmer headers, tighter row rhythm, responsive horizontal overflow
- Dialogs: softer overlay, rounded-2xl surfaces
- Light/dark tokens are unified through CSS variables

## Scope
This overhaul is presentation-only. Existing Supabase bindings, API routes, state management, business calculations, persistence and navigation logic were intentionally left intact.

## Updated shared UI
- `app/globals.css`
- `app/banking/app-shell.tsx` (branding classes only)
- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/input.tsx`
- `components/ui/table.tsx`
- `components/ui/tabs.tsx`
- `components/ui/dialog.tsx`
- `components/ui/badge.tsx`

The global theme layer also modernizes existing dashboard/reference classes without changing their data or event handlers.
