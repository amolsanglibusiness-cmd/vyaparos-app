# VyaparOS Dual AI + Custom Command Memory

## AI priority
1. Gemini 3.8 Flash through the Supabase `vyaparos-gemini` Edge Function.
2. If Gemini is unavailable, rate-limited, offline, or returns an error, the existing local Marathi/Hindi/English NLP parser runs automatically.

## Custom command learning
Users can teach a shortcut in two ways:
- Tap **नवीन Command शिकवा**, enter the phrase and explain its meaning.
- Or type: `शिकवा: माझा उधारी हिशोब म्हणजे अमोलचे pending bill दाखवा`

The app stores the phrase, canonical command, explanation, creation time, and usage count in localStorage for the signed-in user/device. Learned commands are checked before Gemini and the local generic parser.

Gemini is used once during teaching when available to convert the explanation into a canonical command. If Gemini is unavailable, the supplied explanation is used as the canonical command and can still be executed by the local parser when it uses existing VyaparOS vocabulary.

## Deployment
```powershell
npx supabase secrets set GEMINI_MODEL=gemini-3.8-flash
npx supabase functions deploy vyaparos-gemini
```
