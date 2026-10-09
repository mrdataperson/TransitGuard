import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emit, on } from '../../contract/eventBus';
import { ALERT_REPEAT_MS } from '../../contract/constants';
import type { Trip } from '../../contract/types';
import { ALERT_PROFILES } from './alertConfig';
import { dismissAlert, startAlertEngine, useAlertStore } from './alertEngine';
import { playBeeps } from './sound';
import { vibrate } from './vibration';

vi.mock('./sound', () => ({ playBeeps: vi.fn(), primeAudio: vi.fn() }));
vi.mock('./vibration', () => ({ vibrate: vi.fn(), stopVibration: vi.fn() }));
vi.mock('./notifications', () => ({
  requestNotificationPermission: vi.fn(),
  showAlertNotification: vi.fn(),
  clearAlertNotification: vi.fn(),
}));

const trip: Trip = {
  id: 't1',
  userId: 'u1',
  role: 'adult',
  ticket: { routeNo: '70A', from: 'Gandhipuram', to: 'Ukkadam', fare: 15, confidence: 1, source: 'manual' },
  destination: { name: 'Ukkadam', location: { lat: 10.9876, lng: 76.96, timestamp: 0 } },
  status: 'active',
  startedAt: 0,
};

const ring = (radius: 3000 | 1000 | 500, distanceM: number) =>
  emit('RING_ENTERED', { tripId: 't1', radius, distanceM });

const endTrip = (reason: 'arrived' | 'stopped') =>
  emit('TRIP_ENDED', { trip: { ...trip, status: 'ended', endedAt: 1 }, reason });

let stopEngine: () => void;
let offs: (() => void)[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  stopEngine = startAlertEngine();
  emit('TRIP_STARTED', { trip });
});

afterEach(() => {
  offs.forEach((off) => off());
  offs = [];
  stopEngine();
  vi.useRealTimers();
});

describe('alert engine', () => {
  it('starts an INFO alert when the 3 km ring is entered', () => {
    const started = vi.fn();
    offs.push(on('ALERT_STARTED', started));

    ring(3000, 2900);

    const s = useAlertStore.getState();
    expect(s.active).toBe(true);
    expect(s.level).toBe('INFO');
    expect(s.destinationName).toBe('Ukkadam');
    expect(started).toHaveBeenCalledWith({ tripId: 't1', level: 'INFO', radius: 3000 });
    expect(playBeeps).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(ALERT_PROFILES.INFO.vibration);
  });

  it('keeps repeating until the user turns it off', () => {
    ring(3000, 2900);
    vi.advanceTimersByTime(ALERT_REPEAT_MS * 3);
    expect(playBeeps).toHaveBeenCalledTimes(4);
  });

  it('escalates on inner rings and never downgrades', () => {
    ring(3000, 2900);
    ring(1000, 900);
    expect(useAlertStore.getState().level).toBe('WARNING');
    ring(500, 400);
    expect(useAlertStore.getState().level).toBe('CRITICAL');
    ring(3000, 2900);
    expect(useAlertStore.getState().level).toBe('CRITICAL');
  });

  it('dismiss stops the alert and emits ALERT_DISMISSED', () => {
    const dismissedSpy = vi.fn();
    offs.push(on('ALERT_DISMISSED', dismissedSpy));

    ring(500, 400);
    dismissAlert();

    expect(useAlertStore.getState().active).toBe(false);
    expect(dismissedSpy).toHaveBeenCalledWith({ tripId: 't1' });

    const calls = vi.mocked(playBeeps).mock.calls.length;
    vi.advanceTimersByTime(ALERT_REPEAT_MS * 3);
    expect(playBeeps).toHaveBeenCalledTimes(calls);
  });

  it('starts a new alert at a deeper ring after the user turned the first one off', () => {
    ring(3000, 2900);
    dismissAlert();
    expect(useAlertStore.getState().active).toBe(false);

    ring(1000, 900);
    expect(useAlertStore.getState().active).toBe(true);
    expect(useAlertStore.getState().level).toBe('WARNING');
  });

  it('stops the alert when the user stops tracking', () => {
    const dismissedSpy = vi.fn();
    offs.push(on('ALERT_DISMISSED', dismissedSpy));

    ring(1000, 900);
    endTrip('stopped');

    expect(useAlertStore.getState().active).toBe(false);
    expect(dismissedSpy).not.toHaveBeenCalled();
  });

  it('keeps ringing when the trip ends on arrival, until the user turns it off', () => {
    const dismissedSpy = vi.fn();
    offs.push(on('ALERT_DISMISSED', dismissedSpy));

    ring(500, 400);
    endTrip('arrived');
    expect(useAlertStore.getState().active).toBe(true);

    const calls = vi.mocked(playBeeps).mock.calls.length;
    vi.advanceTimersByTime(ALERT_REPEAT_MS * 2);
    expect(playBeeps).toHaveBeenCalledTimes(calls + 2);

    dismissAlert();
    expect(useAlertStore.getState().active).toBe(false);
    expect(dismissedSpy).toHaveBeenCalledWith({ tripId: 't1' });
  });

  it('updates the distance while an alert is active', () => {
    ring(500, 400);
    emit('POSITION_UPDATED', { tripId: 't1', position: { lat: 10.9876, lng: 76.96, timestamp: 1 } });
    expect(useAlertStore.getState().distanceM).toBeLessThan(1);
  });
});