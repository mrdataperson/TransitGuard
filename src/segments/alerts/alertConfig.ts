import type { AlertLevel } from '../../contract/types';

export interface BeepPattern {
  freq: number; // Hz
  durationMs: number;
  gapMs: number;
  count: number;
  volume: number; // 0 to 1
}

export interface AlertProfile {
  title: string;
  vibration: number[]; // vibrate, pause, vibrate... in ms
  beeps: BeepPattern;
}

export const LEVEL_RANK: Record<AlertLevel, number> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
};

// Proposed behaviour per level, tune here
export const ALERT_PROFILES: Record<AlertLevel, AlertProfile> = {
  INFO: {
    title: 'Destination is near',
    vibration: [200],
    beeps: { freq: 660, durationMs: 200, gapMs: 150, count: 1, volume: 0.3 },
  },
  WARNING: {
    title: 'Get ready to get down',
    vibration: [300, 150, 300],
    beeps: { freq: 880, durationMs: 250, gapMs: 150, count: 2, volume: 0.6 },
  },
  CRITICAL: {
    title: 'WAKE UP!',
    vibration: [600, 200, 600, 200, 600],
    beeps: { freq: 1046, durationMs: 300, gapMs: 120, count: 4, volume: 1 },
  },
};

export function alertMessage(distanceM: number | null, destinationName: string | null): string {
  const place = destinationName ?? 'Your destination';
  if (distanceM === null) return `${place} is close`;
  const d = distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${Math.round(distanceM)} m`;
  return `${place} is ${d} away`;
}