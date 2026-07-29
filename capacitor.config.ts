import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell config (iOS / Android).
 *
 * The app is a server-rendered TanStack Start app, so the native shell loads the
 * live production site instead of a static bundle. Swap `server.url` for a local
 * IP (e.g. http://192.168.1.20:8080) while developing against the dev server.
 */
const config: CapacitorConfig = {
  appId: "com.moorisharches.padelsetmatch",
  appName: "PadelSetMatch",
  // Not used at runtime while `server.url` is set, but Capacitor requires it to exist.
  webDir: "public",
  server: {
    url: "https://padelsetmatch.com",
    hostname: "padelsetmatch.com",
    androidScheme: "https",
    iosScheme: "https",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: "#faf7f0",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#faf7f0",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
