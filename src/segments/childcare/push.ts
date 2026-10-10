import { supabase } from '../../core/supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

// Same buzz the service worker uses for a real SOS push
export const SOS_BUZZ = [500, 150, 500, 150, 900, 300, 500, 150, 500, 150, 900];

export type PushStatus = 'unsupported' | 'not-configured' | 'denied' | 'off' | 'on';

function toApplicationServerKey(base64Url: string): ArrayBuffer {
  const padded = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) throw new Error('Invalid push subscription');
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
  });
  if (error) throw new Error(error.message);
}

export async function getPushStatus(): Promise<PushStatus> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    typeof Notification === 'undefined'
  ) {
    return 'unsupported';
  }
  if (!VAPID_PUBLIC_KEY) return 'not-configured';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'unsupported'; // no service worker (dev server, or very first visit)
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

// Must be called from a button tap (browsers require a user gesture for the permission prompt)
export async function enablePush(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) throw new Error('Push is not configured');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications were not allowed on this device');
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error('The app is not ready yet. Reload the page and try again.');
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toApplicationServerKey(VAPID_PUBLIC_KEY),
    }));
  await saveSubscription(sub);
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

// On login: re-save this device for the current account (covers switching accounts on one phone)
export async function syncPushSubscription(): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;
  const sub = await currentSubscription();
  if (sub) await saveSubscription(sub);
}

// Local test: shows the same kind of notification and buzz without involving the server
export async function showTestNotification(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error('The app is not ready yet. Reload the page and try again.');
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: 'If you felt a buzz and saw this, SOS alerts will reach you.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'sos-test',
    renotify: true,
    vibrate: SOS_BUZZ,
  };
  await reg.showNotification('SOS test from TransitGuard', options);
}

// Child side: ask the server to push the SOS to the parents' devices
export async function sendSosPush(tripId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tripId }),
      });
      if (res.ok || (res.status >= 400 && res.status < 500)) return; // done, or a client error that retrying won't fix
    } catch {
      // network problem, retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
}