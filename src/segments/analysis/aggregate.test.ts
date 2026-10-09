import { describe, expect, it } from 'vitest';
import { dailyBuckets, periodRange, summarize, tripsInRange, type TripRecord } from './aggregate';

// Friday, 2 Oct 2026, local time
const NOW = new Date(2026, 9, 2, 12).getTime();

const mk = (d: Date, fare: number, durationMin: number): TripRecord => ({
  id: String(d.getTime()),
  routeNo: '70A',
  from: 'A',
  to: 'B',
  fare,
  startedAt: d.getTime(),
  endedAt: d.getTime() + durationMin * 60000,
  durationMin,
});

describe('periodRange', () => {
  it('week starts on Monday and spans 7 days', () => {
    const r = periodRange('week', 0, NOW);
    expect(r.days).toBe(7);
    expect(new Date(r.start).getDate()).toBe(28);
    expect(new Date(r.start).getMonth()).toBe(8);
    expect(new Date(r.end).getDate()).toBe(5);
    expect(new Date(periodRange('week', -1, NOW).start).getDate()).toBe(21);
  });

  it('month covers the whole calendar month', () => {
    expect(periodRange('month', 0, NOW).days).toBe(31);
    const prev = periodRange('month', -1, NOW);
    expect(prev.days).toBe(30);
    expect(new Date(prev.start).getMonth()).toBe(8);
    expect(new Date(prev.start).getDate()).toBe(1);
  });
});

describe('tripsInRange', () => {
  it('includes the start, excludes the end', () => {
    const r = periodRange('week', 0, NOW);
    const atStart = mk(new Date(r.start), 10, 10);
    const atEnd = mk(new Date(r.end), 10, 10);
    const before = mk(new Date(r.start - 1), 10, 10);
    expect(tripsInRange([atStart, atEnd, before], r)).toEqual([atStart]);
  });
});

describe('summarize', () => {
  it('totals fare and travel time', () => {
    const s = summarize([mk(new Date(2026, 8, 29, 9), 15, 30), mk(new Date(2026, 8, 30, 9), 20, 45)]);
    expect(s).toEqual({ count: 2, totalFare: 35, totalMinutes: 75, avgFare: 17.5 });
  });

  it('handles no trips', () => {
    expect(summarize([])).toEqual({ count: 0, totalFare: 0, totalMinutes: 0, avgFare: 0 });
  });
});

describe('dailyBuckets', () => {
  it('groups trips by the day they started', () => {
    const r = periodRange('week', 0, NOW);
    const b = dailyBuckets(
      [
        mk(new Date(2026, 8, 30, 10), 15, 30), // Wed
        mk(new Date(2026, 8, 30, 18), 20, 40), // Wed
        mk(new Date(2026, 9, 4, 23, 30), 12, 20), // Sun
      ],
      r,
      'week',
    );
    expect(b).toHaveLength(7);
    expect(b[2]).toMatchObject({ fare: 35, minutes: 70, trips: 2 });
    expect(b[6]).toMatchObject({ fare: 12, trips: 1 });
    expect(b[0].trips).toBe(0);
  });
});