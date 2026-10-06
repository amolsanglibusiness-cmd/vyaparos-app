import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vyaparos.app',
  appName: 'VyaparOS',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
