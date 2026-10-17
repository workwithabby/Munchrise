import type { CapacitorConfig } from '@capacitor/cli';

// Values from the build prompt (Section 9). webDir must match the Angular
// build output, which is "www" (see angular.json -> outputPath.base).
const config: CapacitorConfig = {
  appId: 'com.munchrise.app',
  appName: 'Munchrise',
  webDir: 'www',
};

export default config;
