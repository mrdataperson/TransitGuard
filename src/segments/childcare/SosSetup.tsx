import { useCallback, useEffect, useState } from 'react';
import { disablePush, enablePush, getPushStatus, showTestNotification, type PushStatus } from './push';

const COPY: Record<PushStatus, string> = {
  unsupported:
    "This browser can't receive background alerts. Open the live site (not the dev server) in Chrome on Android, or add the app to the Home Screen on iPhone.",
  'not-configured': 'SOS push is not set up on this deployment yet.',
  denied: "Notifications are blocked for this site. Allow them in the browser's site settings, then reload.",
  off: 'Turn this on so an SOS from your child buzzes this phone, even when the app is closed.',
  on: 'SOS alerts are on for this device. An SOS will notify and buzz this phone, even when the app is closed.',
};

export default function SosSetup() {
  const [status, setStatus] = useState<PushStatus | 'checking'>('checking');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    setStatus(await getPushStatus());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(task: () => Promise<void>, success?: string) {
    setBusy(true);
    setMsg(null);
    try {
      await task();
      if (success) setMsg({ ok: true, text: success });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <div className="rounded border p-3 text-sm">
        <div className="font-board text-lg font-semibold">SOS alerts</div>
        <p className="mt-1 text-gray-600">{status === 'checking' ? 'Checking...' : COPY[status]}</p>

        {msg && (
          <p className={`mt-2 rounded p-2 ${msg.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {msg.text}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          {status === 'off' && (
            <button
              onClick={() => void run(enablePush, 'SOS alerts are on.')}
              disabled={busy}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              Turn on SOS alerts
            </button>
          )}
          {status === 'on' && (
            <>
              <button
                onClick={() => void run(showTestNotification)}
                disabled={busy}
                className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                Send a test buzz
              </button>
              <button
                onClick={() => void run(disablePush, 'SOS alerts are off for this device.')}
                disabled={busy}
                className="rounded border px-4 py-2 disabled:opacity-50"
              >
                Turn off
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}