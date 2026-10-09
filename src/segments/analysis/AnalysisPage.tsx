import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../core/authStore';
import { formatDay, formatDuration, formatINR } from '../../core/format';
import { dailyBuckets, periodRange, summarize, type Period, type TripRecord } from './aggregate';
import { deleteTrip, fetchTrips } from './tripRecorder';

type Metric = 'fare' | 'time';

const timeOf = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export default function AnalysisPage() {
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);
  const [metric, setMetric] = useState<Metric>('fare');
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const range = useMemo(() => periodRange(period, offset), [period, offset]);
  const summary = useMemo(() => summarize(trips), [trips]);
  const buckets = useMemo(() => dailyBuckets(trips, range, period), [trips, range, period]);

  const load = useCallback(async () => {
    if (!user) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchTrips(range.start, range.end);
      if (id === reqId.current) setTrips(rows);
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : 'Could not load trips');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [user, range]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    if (!window.confirm('Delete this trip?')) return;
    try {
      await deleteTrip(id);
      setTrips((t) => t.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete trip');
    }
  }

  if (!user) {
    return <p className="mx-auto max-w-md p-4 text-sm text-gray-600">Log in to see your travel analysis.</p>;
  }

  const value = (b: { fare: number; minutes: number }) => (metric === 'fare' ? b.fare : b.minutes);
  const max = Math.max(1, ...buckets.map(value));

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-medium">Travel analysis</h1>

      <div className="flex gap-2">
        {(['week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p);
              setOffset(0);
            }}
            className={`flex-1 rounded border px-3 py-2 text-sm ${
              period === p ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            {p === 'week' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <button onClick={() => setOffset((o) => o - 1)} className="rounded border px-3 py-1" aria-label="Previous">
          ←
        </button>
        <span className="font-medium">{range.label}</span>
        <button
          onClick={() => setOffset((o) => o + 1)}
          disabled={offset >= 0}
          className="rounded border px-3 py-1 disabled:opacity-30"
          aria-label="Next"
        >
          →
        </button>
      </div>

      {error && <p className="rounded bg-red-100 p-2 text-sm text-red-800">{error}</p>}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded border p-3">
          <div className="text-gray-600">Spent</div>
          <div className="text-xl font-medium">{formatINR(summary.totalFare)}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-gray-600">Travel time</div>
          <div className="text-xl font-medium">{formatDuration(summary.totalMinutes)}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-gray-600">Trips</div>
          <div className="text-xl font-medium">{summary.count}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-gray-600">Avg fare</div>
          <div className="text-xl font-medium">{formatINR(summary.avgFare)}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 text-sm">
          {(['fare', 'time'] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded border px-3 py-1 ${metric === m ? 'bg-black text-white' : ''}`}
            >
              {m === 'fare' ? 'Spent' : 'Time'}
            </button>
          ))}
        </div>
        <div className="flex h-32 items-end gap-1">
          {buckets.map((b) => {
            const v = value(b);
            return (
              <div
                key={b.date}
                className="flex h-full flex-1 flex-col justify-end"
                title={`${formatDay(b.date)}: ${metric === 'fare' ? formatINR(b.fare) : formatDuration(b.minutes)}`}
              >
                <div
                  className="w-full rounded-t bg-black"
                  style={{ height: v > 0 ? `${Math.max(3, (v / max) * 100)}%` : '0%' }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1 text-[10px] text-gray-600">
          {buckets.map((b, i) => (
            <div key={b.date} className="flex-1 text-center">
              {period === 'week' || i % 5 === 0 ? b.label : ''}
            </div>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-gray-600">Loading...</p>}
      {!loading && trips.length === 0 && !error && (
        <p className="rounded border p-3 text-sm text-gray-600">No trips in this period.</p>
      )}

      <ul className="space-y-2">
        {trips.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-2 rounded border p-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">
                {t.from || '?'} → {t.to}
              </div>
              <div className="text-xs text-gray-600">
                {t.routeNo ? `Route ${t.routeNo}, ` : ''}
                {formatDay(t.startedAt)}, {timeOf(t.startedAt)}
              </div>
              <button onClick={() => void remove(t.id)} className="mt-1 text-xs text-red-700 underline">
                Delete
              </button>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-medium">{formatINR(t.fare)}</div>
              <div className="text-xs text-gray-600">{formatDuration(t.durationMin)}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}