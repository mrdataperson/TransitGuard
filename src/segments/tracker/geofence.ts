import { RADII, type RingRadius } from '../../contract/constants';

// GPS readings worse than this are shown but never trigger a ring
export const MAX_ACCURACY_M = 150;

// Innermost ring the user is currently inside, or null if outside all rings
export function currentRing(distance: number): RingRadius | null {
  let found: RingRadius | null = null;
  for (const r of RADII) {
    if (distance <= r) found = r; // RADII is outermost first, so the last match is the innermost
  }
  return found;
}

export interface GeofenceTracker {
  // Returns the innermost ring newly entered, or null if nothing new
  update: (distance: number) => RingRadius | null;
}

// One tracker per trip. Each ring fires once per trip.
export function createGeofenceTracker(): GeofenceTracker {
  const fired = new Set<RingRadius>();
  return {
    update(distance) {
      const newly = RADII.filter((r) => distance <= r && !fired.has(r));
      if (newly.length === 0) return null;
      newly.forEach((r) => fired.add(r));
      return newly[newly.length - 1];
    },
  };
}