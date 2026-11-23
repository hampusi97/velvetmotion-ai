/** Request notification permission and fire local proactive alerts when tab is backgrounded. */

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const r = await Notification.requestPermission();
    return r === "granted";
  } catch {
    return false;
  }
}

export function showProactiveNotification(title: string, body: string, tag = "vm-proactive") {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* */
  }
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const isTauri =
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown; isTauri?: unknown }).__TAURI_INTERNALS__) ||
    Boolean((window as unknown as { isTauri?: unknown }).isTauri) ||
    window.location.hostname === "tauri.localhost" ||
    window.location.protocol === "tauri:";
  if (isTauri) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
