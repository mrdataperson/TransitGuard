import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../core/authStore';
import { supabase } from '../../core/supabaseClient';
import { listMyChildren } from './parentLink';
import { syncPushSubscription } from './push';
import { startSosAlarm, stopSosAlarm } from './sosAlarm';
import type { LiveTripRow } from './tripSync';

const ACK_KEY = 'tg_sos_ack';

function readAck(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ACK_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function writeAck(ids: string[]) {
  try {
    localStorage.setItem(ACK_KEY, JSON.stringify(ids.slice(-50)));
  } catch {
    // storage blocked
  }
}

// Trips whose SOS this parent has already seen, so a seen SOS never re-opens the alarm
let ackSet: Set<string> | null = null;
function acked(): Set<string> {
  ackSet ??= new Set(readAck());
  return ackSet;
}

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

// Mounted once for adult accounts. Whatever page is open, a linked child's SOS takes over the
// screen with a siren and a buzz until the parent confirms they have seen it.
export default function SosWatcher() {
  const role = useAuthStore((s) => s.role);
  const userId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Record<string, LiveTripRow>>({});
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (role !== 'adult' || !userId) return;
    let cancelled = false;

    void syncPushSubscription().catch(() => {});

    const accept = (row: LiveTripRow) => {
      if (!row.sos || acked().has(row.trip_id)) return;
      setAlerts((prev) => ({ ...prev, [row.trip_id]: row }));
    };

    void (async () => {
      try {
        const people = await listMyChildren();
        if (!cancelled) setNames(Object.fromEntries(people.map((p) => [p.id, p.name])));
      } catch {
        // names fall back to "Your child"
      }
      // an SOS may have arrived while the app was closed
      const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      const { data } = await supabase.from('live_trips').select('*').eq('sos', true).gte('updated_at', since);
      if (!cancelled) ((data ?? []) as LiveTripRow[]).forEach(accept);
    })();

    const channel = supabase
      .channel('sos-watch')
      .on<LiveTripRow>('postgres_changes', { event: '*', schema: 'public', table: 'live_trips' }, (payload) => {
        if (payload.eventType !== 'DELETE') accept(payload.new);
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [role, userId]);

  const count = Object.keys(alerts).length;
  useEffect(() => {
    if (count > 0) startSosAlarm();
    return () => stopSosAlarm();
  }, [count]);

  const ack = useCallback((tripId: string) => {
    acked().add(tripId);
    writeAck([...acked()]);
    setAlerts((prev) => {
      const next = { ...prev };
      delete next[tripId];
      return next;
    });
  }, []);

  const current = Object.values(alerts).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  if (role !== 'adult' || !current) return null;

  const who = names[current.child_id] ?? 'Your child';
  const at = new Date(current.updated_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const hasLocation = current.lat !== null && current.lng !== null;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={`SOS from ${who}`}
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-5 bg-red-700 p-6 text-center text-white"
    >
      <span className="animate-pulse rounded-sm bg-white px-3 py-1 font-board text-2xl font-bold tracking-wide text-red-700">
        SOS
      </span>
      <h1 className="font-board text-5xl font-bold leading-tight">{who} needs help</h1>
      <p className="text-lg">On the way to {current.destination_name}</p>
      <p className="text-sm text-white/80">
        {hasLocation ? `Last location at ${at}` : 'Location not available yet'}
        {current.distance_m !== null ? `, ${fmtDist(current.distance_m)} from destination` : ''}
      </p>
      {count > 1 && <p className="text-sm font-semibold">{count - 1} more SOS waiting</p>}

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={() => {
            ack(current.trip_id);
            navigate('/dashboard');
          }}
          className="rounded-lg bg-white p-4 text-lg font-semibold text-red-700"
        >
          Open live map
        </button>
        {hasLocation && (
          <a
            href={`https://www.google.com/maps?q=${current.lat},${current.lng}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white p-3 text-base"
          >
            Open in Google Maps
          </a>
        )}
        <button onClick={() => ack(current.trip_id)} className="p-2 text-sm text-white/80 underline">
          I have seen this, stop the alarm
        </button>
      </div>
    </div>
  );
}