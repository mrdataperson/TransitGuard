import { on } from '../../contract/eventBus';
import type { Trip } from '../../contract/types';
import { useAuthStore } from '../../core/authStore';
import { supabase } from '../../core/supabaseClient';
import type { TripRecord } from './aggregate';

interface TripRow {
  trip_id: string;
  user_id: string;
  route_no: string;
  from_stop: string;
  to_stop: string;
  fare: number | string;
  started_at: string;
  ended_at: string;
  duration_min: number | string;
}

const PENDING_KEY = 'tg_pending_trips';

function toRow(trip: Trip): TripRow {
  const ended = trip.endedAt ?? Date.now();
  return {
    trip_id: trip.id,
    user_id: trip.userId,
    route_no: trip.ticket.routeNo,
    from_stop: trip.ticket.from,
    to_stop: trip.ticket.to,
    fare: trip.ticket.fare,
    started_at: new Date(trip.startedAt).toISOString(),
    ended_at: new Date(ended).toISOString(),
    duration_min: Math.max(0, Math.round(((ended - trip.startedAt) / 60000) * 100) / 100),
  };
}

function toRecord(r: TripRow): TripRecord {
  return {
    id: r.trip_id,
    routeNo: r.route_no,
    from: r.from_stop,
    to: r.to_stop,
    fare: Number(r.fare),
    startedAt: Date.parse(r.started_at),
    endedAt: Date.parse(r.ended_at),
    durationMin: Number(r.duration_min),
  };
}

// Trips wait here until they are safely saved, so a network drop never loses a fare
function readPending(): TripRow[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as TripRow[];
  } catch {
    return [];
  }
}

function writePending(rows: TripRow[]): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(rows));
  } catch {
    // storage full or blocked
  }
}

let flushing = false;

export async function flushPending(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const { user } = useAuthStore.getState();
    const rows = readPending();
    if (!user || rows.length === 0) return;

    const mine = rows.filter((r) => r.user_id === user.id);
    if (mine.length === 0) return;
    const others = rows.filter((r) => r.user_id !== user.id);

    const { error } = await supabase.from('trips').upsert(mine, { onConflict: 'trip_id' });
    if (error) {
      console.error('[analysis] could not save trips, will retry:', error.message);
      return;
    }
    writePending(others);
  } finally {
    flushing = false;
  }
}

export async function fetchTrips(start: number, end: number): Promise<TripRecord[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .gte('started_at', new Date(start).toISOString())
    .lt('started_at', new Date(end).toISOString())
    .order('started_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as TripRow[]).map(toRecord);
}

export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('trip_id', id);
  if (error) throw new Error(error.message);
}

// Call once at app start. Returns a cleanup function.
export function startTripRecorder(): () => void {
  const offTrip = on('TRIP_ENDED', ({ trip }) => {
    const { user } = useAuthStore.getState();
    if (!user || trip.userId !== user.id) return; // not logged in, nothing to save to
    writePending([...readPending(), toRow(trip)]);
    void flushPending();
  });

  const onOnline = () => void flushPending();
  window.addEventListener('online', onOnline);

  // retry anything left over once the user is known
  const offAuth = useAuthStore.subscribe((s, prev) => {
    if (s.user && s.user !== prev.user) void flushPending();
  });
  void flushPending();

  return () => {
    offTrip();
    window.removeEventListener('online', onOnline);
    offAuth();
  };
}