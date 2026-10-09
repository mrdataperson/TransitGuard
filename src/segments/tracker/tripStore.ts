import { create } from 'zustand';
import { emit, on } from '../../contract/eventBus';
import { ARRIVAL_M, type RingRadius } from '../../contract/constants';
import type { Destination, GeoPoint, Ticket, Trip } from '../../contract/types';
import { distanceM } from '../../core/geo';
import { useAuthStore } from '../../core/authStore';
import { MAX_ACCURACY_M, createGeofenceTracker, currentRing, type GeofenceTracker } from './geofence';

interface TripState {
  ticket: Ticket | null;
  trip: Trip | null;
  position: GeoPoint | null;
  distanceM: number | null;
  ring: RingRadius | null; // innermost ring the user is inside right now
  confirmDestination: (destination: Destination) => void;
  handlePosition: (p: GeoPoint) => void;
  stopTracking: () => void;
  cancelTicket: () => void;
}

let geofence: GeofenceTracker | null = null;

export const useTripStore = create<TripState>((set, get) => {
  // 'arrived' = the user reached the destination, 'stopped' = the user turned tracking off
  function finish(reason: 'arrived' | 'stopped') {
    const { trip } = get();
    if (!trip) return;
    geofence = null;
    set({ ticket: null, trip: null, distanceM: null, ring: null });
    emit('TRIP_ENDED', { trip: { ...trip, status: 'ended', endedAt: Date.now() }, reason });
  }

  return {
    ticket: null,
    trip: null,
    position: null,
    distanceM: null,
    ring: null,

    confirmDestination: (destination) => {
      const { ticket, trip: existing, position } = get();
      if (!ticket || existing || !destination.location) return;

      // Works without login while developing: falls back to a local user
      const { user, role } = useAuthStore.getState();
      const trip: Trip = {
        id: crypto.randomUUID(),
        userId: user?.id ?? 'local',
        role: role ?? 'adult',
        ticket,
        destination,
        status: 'active',
        startedAt: Date.now(),
      };

      geofence = createGeofenceTracker();
      set({ trip, distanceM: null, ring: null });
      emit('DESTINATION_CONFIRMED', { tripId: trip.id, destination });
      emit('TRIP_STARTED', { trip });

      // If GPS already has a fix, evaluate it right away (user may already be inside a ring)
      if (position) get().handlePosition(position);
    },

    handlePosition: (p) => {
      set({ position: p });
      const { trip } = get();
      const target = trip?.destination.location;
      if (!trip || !target) return;

      const d = distanceM(p, target);
      set({ distanceM: d, ring: currentRing(d) });
      emit('POSITION_UPDATED', { tripId: trip.id, position: p });

      // poor GPS readings are shown but never fire rings or end the trip
      if (p.accuracy !== undefined && p.accuracy > MAX_ACCURACY_M) return;

      const entered = geofence?.update(d) ?? null;
      if (entered !== null) {
        emit('RING_ENTERED', { tripId: trip.id, radius: entered, distanceM: d });
      }

      if (d <= ARRIVAL_M) finish('arrived');
    },

    stopTracking: () => finish('stopped'),

    cancelTicket: () => {
      if (!get().trip) set({ ticket: null });
    },
  };
});

// Scanner -> tracker
on('TICKET_SCANNED', ({ ticket }) => {
  if (useTripStore.getState().trip) return; // ignore scans while a trip is running
  useTripStore.setState({ ticket });
});