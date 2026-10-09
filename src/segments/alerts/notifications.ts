const TAG = 'transitguard-alert';
let fallback: Notification | null = null;

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

// Shows a system notification (works best once the PWA service worker is set up)
export async function showAlertNotification(title: string, body: string, urgent: boolean): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, tag: TAG, requireInteraction: urgent });
    } else {
      fallback?.close();
      fallback = new Notification(title, { body, tag: TAG, requireInteraction: urgent });
    }
  } catch {
    // some mobile browsers only allow notifications through a service worker
  }
}

export async function clearAlertNotification(): Promise<void> {
  try {
    fallback?.close();
    fallback = null;
    const reg = await navigator.serviceWorker?.getRegistration();
    const list = await reg?.getNotifications({ tag: TAG });
    list?.forEach((n) => n.close());
  } catch {
    // nothing to clear
  }
}