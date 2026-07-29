import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();
export const nativePlatform = () => Capacitor.getPlatform();

/** Native share sheet on iOS/Android, Web Share API / clipboard elsewhere. */
export async function nativeShare(opts: { title?: string; text?: string; url: string }) {
  if (isNative()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title });
    return true;
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
    return true;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(opts.url);
    return false;
  }
  return false;
}

/** Ask iOS for push permission and return the APNs token (null if declined). */
export async function registerNativePush(): Promise<string | null> {
  if (!isNative()) return null;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return null;
  return await new Promise<string | null>((resolve) => {
    const timeout = setTimeout(() => resolve(null), 10000);
    PushNotifications.addListener("registration", (token) => {
      clearTimeout(timeout);
      resolve(token.value);
    });
    PushNotifications.addListener("registrationError", () => {
      clearTimeout(timeout);
      resolve(null);
    });
    void PushNotifications.register();
  });
}

/** Status bar, splash screen and hardware back button. Safe no-op on the web. */
export async function initNativeShell() {
  if (!isNative()) return;
  try {
    const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
      import("@capacitor/app"),
    ]);
    await StatusBar.setStyle({ style: Style.Light });
    await SplashScreen.hide();
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void App.exitApp();
    });
  } catch {
    /* plugin missing in this build — ignore */
  }
}
