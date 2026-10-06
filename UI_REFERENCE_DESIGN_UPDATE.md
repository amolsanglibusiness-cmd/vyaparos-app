# VyaparOS Reference UI Design Update

This update changes **UI/styling only**. Existing business logic, state management, data operations, API calls, Supabase integration, AI command processing, and page/component structure are preserved.

## Visual direction
- Unified VyaparOS visual language across authenticated pages.
- Dark mode: deep navy surfaces with cyan/blue/violet glow accents inspired by the supplied reference.
- Light mode: white/soft-blue surfaces with the same cyan-to-violet accent system.
- Rounded cards, stronger hierarchy, translucent sticky headers, softer shadows, and consistent borders.
- Primary actions use a cyan → blue → violet gradient.
- Mobile bottom navigation and AI voice button receive the same glow treatment.
- Login/auth screens use the same visual system.
- Invoice paper preview remains white/paper-like intentionally.

## Files changed
- `app/globals.css` — reference theme and light/dark styling layer.
- `app/banking/app-shell.tsx` — adds the visual theme wrapper class only.
- `components/auth-gate.tsx` — adds the visual auth wrapper class only.

No business logic was intentionally changed.
