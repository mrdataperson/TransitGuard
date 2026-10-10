// Vercel Function: POST /api/sos
// The child's app calls this right after an SOS is saved. It sends a Web Push to every
// device of every parent linked to this child. It runs as the child (their own token),
// so row level security still applies and no service key is needed.
import { createClient } from '@supabase/supabase-js';

type WebPush = typeof import('web-push');

interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface Res {
  status: (code: number) => Res;
  json: (body: unknown) => void;
}

interface SubRow {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

const RESEND_GUARD_MS = 60_000;

// web-push is a CommonJS package, so load it in a way that works whether the function runs as ESM or CJS
async function loadWebPush(): Promise<WebPush> {
  const mod = (await import('web-push')) as unknown as WebPush & { default?: WebPush };
  return mod.default ?? mod;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const header = req.headers.authorization;
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
  const body = (req.body ?? {}) as { tripId?: unknown };
  const tripId = typeof body.tripId === 'string' ? body.tripId : '';
  if (!token || !tripId) return res.status(400).json({ error: 'Missing token or tripId' });

  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!url || !anonKey || !publicKey || !privateKey || !subject) {
    return res.status(500).json({ error: 'Push is not configured on the server' });
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return res.status(401).json({ error: 'Not signed in' });
  const childId = userData.user.id;

  // The SOS must be real: this child's own trip, flagged sos
  const { data: trip } = await supabase
    .from('live_trips')
    .select('trip_id, destination_name, sos, sos_notified_at')
    .eq('trip_id', tripId)
    .eq('child_id', childId)
    .maybeSingle();
  if (!trip || !trip.sos) return res.status(409).json({ error: 'No SOS on this trip' });
  if (trip.sos_notified_at && Date.now() - Date.parse(trip.sos_notified_at as string) < RESEND_GUARD_MS) {
    return res.status(200).json({ sent: 0, skipped: 'already sent' });
  }

  const { data: me } = await supabase.from('profiles').select('name').eq('id', childId).maybeSingle();
  const { data: subs, error: subsError } = await supabase.rpc('parent_push_subscriptions');
  if (subsError) return res.status(500).json({ error: 'Could not load parent devices' });
  const targets = (subs ?? []) as SubRow[];
  if (targets.length === 0) return res.status(200).json({ sent: 0, failed: 0, note: 'No parent devices subscribed' });

  const name = (me?.name as string | undefined) || 'Your child';
  const place = trip.destination_name ? ` on the way to ${trip.destination_name as string}` : '';
  const payload = JSON.stringify({
    type: 'sos',
    tripId,
    title: `SOS from ${name}`,
    body: `${name} needs help${place}. Tap to see the live location.`,
    url: '/dashboard',
  });

  const webpush = await loadWebPush();
  webpush.setVapidDetails(subject, publicKey, privateKey);

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    targets.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
          payload,
          { TTL: 3600, urgency: 'high' },
        );
        sent += 1;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.endpoint); // device unsubscribed, clean it up
      }
    }),
  );

  await Promise.all(gone.map((endpoint) => supabase.rpc('delete_push_subscription', { p_endpoint: endpoint })));
  if (sent > 0) {
    await supabase.from('live_trips').update({ sos_notified_at: new Date().toISOString() }).eq('trip_id', tripId);
  }

  return res.status(200).json({ sent, failed: targets.length - sent });
}