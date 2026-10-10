import { create } from 'zustand';
import { emit, on } from '../../contract/eventBus';
import { RADII } from '../../contract/constants';
import type { GeoPoint, Trip } from '../../contract/types';
import { distanceM } from '../../core/geo';
import { useAuthStore } from '../../core/authStore';
import { supabase } from '../../core/supabaseClient';
import { sendSosPush } from './push';

export type LiveStatus = 'active' | 'arrived' | 'ended';

export type LiveTripRow = {
  trip_id: string;
  child_id: string;
  destination_name: string;
  dest_lat: number;
  dest_lng: number;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  distance_m: number | null;
  status: LiveStatus;
  sos: boolean;
  started_at: string;
  updated_at: string;
};

// Ending the trip within this distance of the destination counts as "arrived safe"
export const ARRIVAL_RADIUS_M = Math.min(...RADII);

const POSITION_PUSH_MS = 15_000;

type Patch = Partial<Omit<LiveTripRow, 'trip_id' | 'child_id' | 'started_at' | 'updated_at'>>;

interface Tracked {
  dest: GeoPoint;
  lastDistance: number | null;
  lastPosition: GeoPoint | null;
  lastPush: number;
  ready: Promise<void>; // the insert must finish before we patch the row
}

const tracked = new Map<string, Tracked>();

// Read by SosButton, so it never needs to import the tracker segment
interface ChildTripState {
  tripId: string | null;
  position: GeoPoint | null;
  sosSent: boolean;
}
const noTrip: ChildTripState = { tripId: null, position: null, sosSent: false };
export const useChildTrip = create<ChildTripState>(() => noTrip);

async function patchTrip(tripId: string, patch: Patch, retries = 2): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { error } = await supabase.from('live_trips').update(patch).eq('trip_id', tripId);
    if (!error) return;
    if (attempt === retries) {
      console.error('[childcare] could not update live trip:', error.message);
    } else {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

function startRow(trip: Trip, dest: GeoPoint): Promise<void> {
  return (async () => {
    const { error } = await supabase.from('live_trips').upsert({
      trip_id: trip.id,
      child_id: trip.userId,
      destination_name: trip.destination.name,
      dest_lat: dest.lat,
      dest_lng: dest.lng,
      status: 'active',
      sos: false,
      started_at: new Date(trip.startedAt).toISOString(),
    });
    if (error) console.error('[childcare] could not start live trip:', error.message);
  })();
}

// Call once at app start. Only child trips are synced. Returns a cleanup function.
export function startChildCareSync(): () => void {
  const offs = [
    on('TRIP_STARTED', ({ trip }) => {
      const { user } = useAuthStore.getState();
      const dest = trip.destination.location;
      if (trip.role !== 'child' || !dest || !user || trip.userId !== user.id) return;
      tracked.set(trip.id, {
        dest,
        lastDistance: null,
        lastPosition: null,
        lastPush: 0,
        ready: startRow(trip, dest),
      });
      useChildTrip.setState({ tripId: trip.id, position: null, sosSent: false });
    }),

    on('POSITION_UPDATED', ({ tripId, position }) => {
      const t = tracked.get(tripId);
      if (!t) return;
      const d = distanceM(position, t.dest);
      t.lastDistance = d;
      t.lastPosition = position;
      useChildTrip.setState({ position });

      const now = Date.now();
      if (now - t.lastPush < POSITION_PUSH_MS) return;
      t.lastPush = now;
      void t.ready.then(() =>
        patchTrip(tripId, {
          lat: position.lat,
          lng: position.lng,
          accuracy: position.accuracy ?? null,
          distance_m: d,
        }),
      );
    }),

    on('SOS_TRIGGERED', ({ tripId, position }) => {
      const t = tracked.get(tripId);
      if (!t) return;
      useChildTrip.setState({ sosSent: true });
      const patch: Patch = { sos: true };
      if (position) {
        patch.lat = position.lat;
        patch.lng = position.lng;
        patch.accuracy = position.accuracy ?? null;
        patch.distance_m = distanceM(position, t.dest);
      }
            void t.ready
        .then(() => patchTrip(tripId, patch, 4)) // SOS gets extra retries
        .then(() => sendSosPush(tripId)); // then push to the parents' phones
    }),

    on('TRIP_ENDED', ({ trip }) => {
      const t = tracked.get(trip.id);
      if (!t) return;
      tracked.delete(trip.id);
      useChildTrip.setState(noTrip);

      const arrived = t.lastDistance !== null && t.lastDistance <= ARRIVAL_RADIUS_M;
      const patch: Patch = {
        status: arrived ? 'arrived' : 'ended',
        distance_m: t.lastDistance,
      };
      if (t.lastPosition) {
        patch.lat = t.lastPosition.lat;
        patch.lng = t.lastPosition.lng;
      }
      void t.ready.then(() => patchTrip(trip.id, patch));
      if (arrived) emit('ARRIVED_SAFE', { tripId: trip.id });
    }),
  ];

  return () => {
    offs.forEach((off) => off());
    tracked.clear();
    useChildTrip.setState(noTrip);
  };
}