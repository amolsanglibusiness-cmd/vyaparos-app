import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.log('[VyaparOS] Android project not found yet; contacts permissions will be applied after `cap add android`.');
  process.exit(0);
}

let xml = fs.readFileSync(manifestPath, 'utf8');
const permissions = [
  'android.permission.READ_CONTACTS',
  'android.permission.WRITE_CONTACTS',
];

let changed = false;
for (const permission of permissions) {
  const declaration = `    <uses-permission android:name="${permission}" />`;
  const escaped = permission.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<uses-permission\\s+android:name=["']${escaped}["']\\s*/?>`);
  if (!re.test(xml)) {
    const marker = '</manifest>';
    if (!xml.includes(marker)) throw new Error(`Could not locate </manifest> in ${manifestPath}`);
    xml = xml.replace(marker, `${declaration}\n${marker}`);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(manifestPath, xml, 'utf8');
  console.log('[VyaparOS] Added Android READ_CONTACTS and WRITE_CONTACTS permissions.');
} else {
  console.log('[VyaparOS] Android contacts permissions are already present.');
}
