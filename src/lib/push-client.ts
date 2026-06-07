import { VAPID_PUBLIC_KEY } from "./push-config";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

export async function registerPushSW(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
}

export interface SerializedSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string;
}

export async function subscribeToPush(): Promise<SerializedSubscription> {
  if (!pushSupported()) throw new Error("Push notifications not supported in this browser");
  if (Notification.permission === "default") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Notification permission denied");
  }
  if (Notification.permission !== "granted") {
    throw new Error("Notification permission denied");
  }
  const reg = await registerPushSW();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });
  }
  const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey("p256dh")),
    auth: json.keys?.auth ?? arrayBufferToBase64(sub.getKey("auth")),
    user_agent: navigator.userAgent,
  };
}

export async function unsubscribeFromPush(): Promise<string | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) return null;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
