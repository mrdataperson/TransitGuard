import type { AlertLevel } from './types';

// Geofence rings around the destination, in metres. Outermost first.
export const RADII = [3000, 1000, 500] as const;
export type RingRadius = (typeof RADII)[number];

// Proposed mapping, change here if you decide differently
export const RING_TO_LEVEL: Record<RingRadius, AlertLevel> = {
  3000: 'INFO',
  1000: 'WARNING',
  500: 'CRITICAL',
};

// Alert keeps repeating at this interval until the user turns it off
export const ALERT_REPEAT_MS = 5000;

// Tracking ends by itself when the user gets this close to the destination
export const ARRIVAL_M = 150;

// Below this, the scanner asks the user to confirm or fix the ticket details
export const MIN_TICKET_CONFIDENCE = 0.6;

// SOS must be held this long (pocket-dial proof)
export const SOS_HOLD_MS = 2000;