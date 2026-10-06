# VyaparOS Android Print / Export Fix

This build keeps the existing Chrome/browser behavior and adds a native Capacitor path for Android/iOS:
- Invoice PNG/PDF export uses Capacitor Filesystem + Share on native builds.
- Invoice print generates the existing A4 PDF and sends it to the native Printer plugin.
- Receipt printing uses native Printer.printHtml on native builds.
- Browser builds continue using the existing browser download/window.print behavior.

After extracting:
1. npm install
2. npx cap sync android
3. npm run build
4. npx cap copy android (optional after build)
5. Build the APK from Android Studio.

Dependencies added:
- @dimer47/capacitor-plugin-printer ^2.0.4
- @capacitor/filesystem ^8.0.0
- @capacitor/share ^8.0.0
