import { describe, it, expect } from 'vitest';
import { createGeofenceTracker, currentRing } from './geofence';

describe('currentRing', () => {
  it('returns the innermost ring the user is inside', () => {
    expect(currentRing(4000)).toBeNull();
    expect(currentRing(3000)).toBe(3000);
    expect(currentRing(2999)).toBe(3000);
    expect(currentRing(800)).toBe(1000);
    expect(currentRing(500)).toBe(500);
    expect(currentRing(0)).toBe(500);
  });
});

describe('createGeofenceTracker', () => {
  it('fires each ring once as the user approaches', () => {
    const g = createGeofenceTracker();
    expect(g.update(5000)).toBeNull();
    expect(g.update(2900)).toBe(3000);
    expect(g.update(2800)).toBeNull();
    expect(g.update(900)).toBe(1000);
    expect(g.update(400)).toBe(500);
    expect(g.update(300)).toBeNull();
  });

  it('fires only the innermost ring when rings are skipped', () => {
    const g = createGeofenceTracker();
    expect(g.update(400)).toBe(500);
    expect(g.update(300)).toBeNull();
  });

  it('fires the inner ring when the trip starts inside', () => {
    const g = createGeofenceTracker();
    expect(g.update(900)).toBe(1000);
    expect(g.update(450)).toBe(500);
  });

  it('does not fire again after leaving and re-entering', () => {
    const g = createGeofenceTracker();
    expect(g.update(2900)).toBe(3000);
    expect(g.update(3500)).toBeNull();
    expect(g.update(2900)).toBeNull();
  });
});