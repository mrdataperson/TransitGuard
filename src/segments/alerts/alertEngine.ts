import { create } from 'zustand';
import { emit, on } from '../../contract/eventBus';
import type { EventMap } from '../../contract/events';
import { ALERT_REPEAT_MS, RING_TO_LEVEL, type RingRadius } from '../../contract/constants';
import type { AlertLevel, GeoPoint } from '../../contract/types';
import { distanceM } from '../../core/geo';
import { ALERT_PROFILES, LEVEL_RANK, alertMessage } from './alertConfig';
import { playBeeps, primeAudio } from './sound';
import { stopVibration, vibrate } from './vibration';
import {
  clearAlertNotification,
  requestNotificationPermission,
  showAlertNotification,
} from './notifications';

export interface AlertState {
  active: boolean;
  tripId: string | null;
  level: AlertLevel | null;
  radius: RingRadius | null;
  distanceM: number | null;
  destinationName: string | null;
}

const idle: AlertState = {
  active: false,
  tripId: null,
  level: null,
  radius: null,
  distanceM: null,
  destinationName: null,
};

// The overlay reads this
export const useAlertStore = create<AlertState>(() => idle);

let timer: ReturnType<typeof setInterval> | null = null;
const trips = new Map<string, { name: string; location?: GeoPoint }>();

function fire(level: AlertLevel) {
  const profile = ALERT_PROFILES[level];
  vibrate(profile.vibration);
  playBeeps(profile.beeps);
}

function stopRepeating() {
  if (timer) clearInterval(timer);
  timer = null;
  stopVibration();
}

function reset() {
  stopRepeating();
  useAlertStore.setState(idle);
  void clearAlertNotification();
}

function handleRing({ tripId, radius, distanceM: dist }: EventMap['RING_ENTERED']) {
  const level = RING_TO_LEVEL[radius];
  const cur = useAlertStore.getState();
  // already alerting at this level or higher for this trip, nothing to do
  if (cur.active && cur.tripId === tripId && cur.level && LEVEL_RANK[level] <= LEVEL_RANK[cur.level]) {
    return;
  }

  const destinationName = trips.get(tripId)?.name ?? null;
  useAlertStore.setState({ active: true, tripId, level, radius, distanceM: dist, destinationName });
  emit('ALERT_STARTED', { tripId, level, radius });

  // start (or escalate) and keep repeating until the user turns it off
  stopRepeating();
  fire(level);
  timer = setInterval(() => fire(level), ALERT_REPEAT_MS);

  void showAlertNotification(ALERT_PROFILES[level].title, alertMessage(dist, destinationName), level === 'CRITICAL');
}

// Turns the current alert off. Tracking continues, and a deeper ring can start a new alert.
export function dismissAlert(): void {
  const { active, tripId } = useAlertStore.getState();
  if (!active || !tripId) return;
  reset();
  emit('ALERT_DISMISSED', { tripId });
}

// Call once at app start. Returns a cleanup function.
export function startAlertEngine(): () => void {
  const offs = [
    on('TRIP_STARTED', ({ trip }) => {
      trips.set(trip.id, { name: trip.destination.name, location: trip.destination.location });
    }),

    // keep the distance on the overlay live
    on('POSITION_UPDATED', ({ tripId, position }) => {
      const cur = useAlertStore.getState();
      const dest = trips.get(tripId)?.location;
      if (cur.active && cur.tripId === tripId && dest) {
        useAlertStore.setState({ distanceM: distanceM(position, dest) });
      }
    }),

    on('RING_ENTERED', handleRing),

    on('TRIP_ENDED', ({ trip, reason }) => {
      trips.delete(trip.id);
      // arrived: keep ringing until the user turns it off (they may be asleep).
      // stopped: the user turned tracking off themselves, so they are awake.
      if (reason === 'stopped' && useAlertStore.getState().tripId === trip.id) reset();
    }),
  ];

  // Audio and notification permission need a user gesture, so we use the first tap
  const onFirstTap = () => {
    primeAudio();
    void requestNotificationPermission();
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', onFirstTap, { once: true });
  }

  return () => {
    offs.forEach((off) => off());
    if (typeof document !== 'undefined') document.removeEventListener('pointerdown', onFirstTap);
    reset();
    trips.clear();
  };
}