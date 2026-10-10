import { useCallback, useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../core/supabaseClient';
import { listMyChildren } from './parentLink';
import { ARRIVAL_RADIUS_M, type LiveTripRow } from './tripSync';

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

function ago(iso: string, now: number) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return mins < 1 ? 'just now' : `${mins} min ago`;
}

function notify(body: string) {
  if (body.startsWith('SOS')) return; // the SOS watcher handles these with the alarm
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('TransitGuard', { body });
    }
  } catch {
    // some mobile browsers need a service worker for this
  }
}

function statusOf(t: LiveTripRow): { text: string; cls: string } {
  if (t.status === 'arrived') return { text: 'Arrived safe', cls: 'bg-green-100 text-green-800' };
  if (t.status === 'ended') {
    if (t.distance_m !== null && t.distance_m > ARRIVAL_RADIUS_M) {
      return {
        text: `Trip ended ${fmtDist(t.distance_m)} from destination`,
        cls: 'bg-amber-100 text-amber-800',
      };
    }
    return { text: 'Trip ended', cls: 'bg-gray-100 text-gray-800' };
  }
  return { text: 'On the way', cls: 'bg-blue-100 text-blue-800' };
}

function ChildMap({ trip }: { trip: LiveTripRow }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const childRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const dest: L.LatLngExpression = [trip.dest_lat, trip.dest_lng];
    const map = L.map(el.current).setView(dest, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.circleMarker(dest, { radius: 8, color: '#A32D2D', fillColor: '#E24B4A', fillOpacity: 1 }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      childRef.current = null;
    };
  }, [trip.dest_lat, trip.dest_lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || trip.lat === null || trip.lng === null) return;
    const at: L.LatLngExpression = [trip.lat, trip.lng];
    if (!childRef.current) {
      childRef.current = L.circleMarker(at, {
        radius: 7,
        color: '#185FA5',
        fillColor: '#378ADD',
        fillOpacity: 1,
      }).addTo(map);
      map.fitBounds(L.latLngBounds([[trip.dest_lat, trip.dest_lng], at]).pad(0.3));
    } else {
      childRef.current.setLatLng(at);
    }
  }, [trip.lat, trip.lng, trip.dest_lat, trip.dest_lng]);

  return <div ref={el} className="h-64 w-full overflow-hidden rounded" />;
}

type Mode = 'load' | 'insert' | 'update';

export default function ParentDashboard() {
  const [trips, setTrips] = useState<Record<string, LiveTripRow>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [feed, setFeed] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

  const tripsRef = useRef<Record<string, LiveTripRow>>({});
  const namesRef = useRef<Record<string, string>>({});

  const loadNames = useCallback(async () => {
    try {
      const people = await listMyChildren();
      namesRef.current = Object.fromEntries(people.map((p) => [p.id, p.name]));
      setNames(namesRef.current);
    } catch {
      // names fall back to "Your child"
    }
  }, []);

  const apply = useCallback(
    (row: LiveTripRow, mode: Mode) => {
      const prev = tripsRef.current[row.trip_id];
      const who = namesRef.current[row.child_id] ?? 'Your child';
      const msgs: string[] = [];

      if (mode !== 'load') {
        if (mode === 'insert') msgs.push(`${who} started a trip to ${row.destination_name}`);
        if (row.sos && !prev?.sos) msgs.push(`SOS from ${who}!`);
        if (row.status !== 'active' && prev?.status === 'active') {
          msgs.push(`${who}: ${statusOf(row).text}`);
        }
      }

      tripsRef.current = { ...tripsRef.current, [row.trip_id]: row };
      setTrips(tripsRef.current);
      setSelected((s) => (mode === 'insert' ? row.trip_id : (s ?? row.trip_id)));
      if (msgs.length) {
        setFeed((f) => [...msgs, ...f].slice(0, 20));
        msgs.forEach(notify);
      }
      if (!namesRef.current[row.child_id]) void loadNames();
    },
    [loadNames],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await loadNames();
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data, error: err } = await supabase
        .from('live_trips')
        .select('*')
        .gte('started_at', since)
        .order('started_at', { ascending: false });
      if (cancelled) return;
      if (err) {
        setError(err.message);
        return;
      }
      ((data ?? []) as LiveTripRow[]).forEach((r) => apply(r, 'load'));
    })();

    const channel = supabase
      .channel('parent-live-trips')
      .on<LiveTripRow>('postgres_changes', { event: '*', schema: 'public', table: 'live_trips' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old.trip_id;
          if (!id) return;
          const next = { ...tripsRef.current };
          delete next[id];
          tripsRef.current = next;
          setTrips(next);
          return;
        }
        apply(payload.new, payload.eventType === 'INSERT' ? 'insert' : 'update');
      })
      .subscribe();

    const tick = setInterval(() => setNow(Date.now()), 30000);

    return () => {
      cancelled = true;
      clearInterval(tick);
      void supabase.removeChannel(channel);
    };
  }, [apply, loadNames]);

  const list = Object.values(trips).sort((a, b) => b.started_at.localeCompare(a.started_at));
  const sel = selected ? trips[selected] : undefined;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-medium">Children's trips</h1>

      {error && <p className="rounded bg-red-100 p-2 text-sm text-red-800">{error}</p>}

      {perm === 'default' && (
        <button
          onClick={() => void Notification.requestPermission().then(setPerm)}
          className="w-full rounded border p-2 text-sm"
        >
          Enable notifications
        </button>
      )}

      {feed.length > 0 && (
        <ul className="space-y-1 rounded border p-3 text-sm">
          {feed.map((m, i) => (
            <li key={`${i}-${m}`}>{m}</li>
          ))}
        </ul>
      )}

      {list.length === 0 && !error && (
        <p className="rounded border p-3 text-sm text-gray-600">
          No trips in the last 24 hours. When a linked child scans a ticket, it shows up here.
        </p>
      )}

      <ul className="space-y-2">
        {list.map((t) => {
          const st = statusOf(t);
          return (
            <li key={t.trip_id}>
              <button
                onClick={() => setSelected(t.trip_id)}
                className={`w-full rounded border p-3 text-left text-sm ${
                  t.sos ? 'border-red-600 bg-red-50' : ''
                } ${selected === t.trip_id ? 'ring-2 ring-black' : ''}`}
              >
                {t.sos && <div className="mb-1 font-medium text-red-700">SOS: needs help</div>}
                <div className="font-medium">{names[t.child_id] ?? 'Your child'}</div>
                <div className="text-gray-600">to {t.destination_name}</div>
                <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs ${st.cls}`}>{st.text}</span>
                <div className="mt-1 text-xs text-gray-600">
                  {t.distance_m !== null ? `${fmtDist(t.distance_m)} to go, ` : ''}
                  updated {ago(t.updated_at, now)}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {sel && (
        <div className="space-y-2">
          <ChildMap key={sel.trip_id} trip={sel} />
          {sel.lat !== null && sel.lng !== null && (
            <a
              href={`https://www.google.com/maps?q=${sel.lat},${sel.lng}`}
              target="_blank"
              rel="noreferrer"
              className="block text-sm underline"
            >
              Open last location in Google Maps
            </a>
          )}
        </div>
      )}
    </div>
  );
}