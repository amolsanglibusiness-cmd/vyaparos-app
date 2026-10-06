# VyaparOS Android Back Navigation

This build handles Android Capacitor back navigation as follows:

- On any inner page: Back returns to the previous app page.
- If the inner page has no history, it returns to Home.
- On Home: Android Back exits the app.
- If the Capacitor App plugin is not installed yet, run:

```powershell
npm install @capacitor/app@8.5.2
npx cap sync android
```

The web shell detects the plugin at runtime, so it does not crash when the plugin is temporarily unavailable.
