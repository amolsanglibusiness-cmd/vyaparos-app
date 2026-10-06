# VyaparOS — Vihaan icon + animated startup splash

This project package includes:
- Android launcher resources under `android-assets/res/`.
- Web/PWA icons under `public/icons/`.
- Animated startup asset at `public/vihaan-splash.gif`.
- Static splash asset at `public/vihaan-splash-static.png`.
- React startup overlay at `components/vihaan-splash.tsx`.
- `app/layout.tsx` renders `<VihaanSplash />`.
- `app/globals.css` contains the splash overlay/fade styles.
- `@capacitor/splash-screen` is included in `package.json`.
- `capacitor.config.ts` is configured for an immediate dark native handoff.

## From the project root

```powershell
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

## Android icon resources

After `npx cap add android`, merge:

```text
android-assets/res/*
```

into:

```text
android/app/src/main/res/
```

Do not delete the whole `res` folder. Merge/replace only matching launcher resources.

## Animated startup

The actual animation is implemented as a WebView overlay:
`components/vihaan-splash.tsx` -> `/vihaan-splash.gif`.

The Capacitor native splash is deliberately static/dark so the native launch-to-WebView handoff is immediate. Android native launch screens are not intended to play GIF animations.

## APK

```powershell
cd android
.\gradlew assembleDebug
```

Output:
`android/app/build/outputs/apk/debug/app-debug.apk`
