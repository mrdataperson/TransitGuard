import { formatDay } from '../../core/format';

export type Period = 'week' | 'month';

export interface TripRecord {
  id: string;
  routeNo: string;
  from: string;
  to: string;
  fare: number;
  startedAt: number;
  endedAt: number;
  durationMin: number;
}

export interface Range {
  start: number; // inclusive
  end: number; // exclusive
  days: number;
  label: string;
}

export interface Summary {
  count: number;
  totalFare: number;
  totalMinutes: number;
  avgFare: number;
}

export interface DayBucket {
  date: number;
  label: string;
  fare: number;
  minutes: number;
  trips: number;
}

const DAY_MS = 86_400_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

// offset 0 = this week/month, -1 = previous one. Weeks start on Monday.
export function periodRange(period: Period, offset = 0, now: number = Date.now()): Range {
  const d = new Date(now);
  let start: Date;
  let end: Date;

  if (period === 'week') {
    const sinceMonday = (d.getDay() + 6) % 7;
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday + offset * 7);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  } else {
    start = new Date(d.getFullYear(), d.getMonth() + offset, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  }

  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  const label =
    period === 'week'
      ? `${formatDay(start.getTime())} to ${formatDay(end.getTime() - 1)}`
      : start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return { start: start.getTime(), end: end.getTime(), days, label };
}

export function tripsInRange(trips: TripRecord[], range: Range): TripRecord[] {
  return trips.filter((t) => t.startedAt >= range.start && t.startedAt < range.end);
}

export function summarize(trips: TripRecord[]): Summary {
  const count = trips.length;
  const totalFare = round2(trips.reduce((s, t) => s + t.fare, 0));
  const totalMinutes = round2(trips.reduce((s, t) => s + t.durationMin, 0));
  return { count, totalFare, totalMinutes, avgFare: count ? round2(totalFare / count) : 0 };
}

// One bucket per day in the range, trips are counted on the day they started
export function dailyBuckets(trips: TripRecord[], range: Range, period: Period): DayBucket[] {
  const buckets: DayBucket[] = Array.from({ length: range.days }, (_, i) => {
    const date = new Date(range.start);
    date.setDate(date.getDate() + i);
    return {
      date: date.getTime(),
      label: period === 'week' ? date.toLocaleDateString('en-IN', { weekday: 'short' }) : String(date.getDate()),
      fare: 0,
      minutes: 0,
      trips: 0,
    };
  });

  for (const t of trips) {
    const b = buckets[Math.floor((t.startedAt - range.start) / DAY_MS)];
    if (!b) continue;
    b.fare += t.fare;
    b.minutes += t.durationMin;
    b.trips += 1;
  }

  return buckets.map((b) => ({ ...b, fare: round2(b.fare), minutes: round2(b.minutes) }));
}