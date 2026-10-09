import type { GeoPoint } from '../../contract/types';

// Starts watching GPS. Returns a stop function.
export function watchGps(
  onPosition: (p: GeoPoint) => void,
  onError: (message: string) => void,
): () => void {
  if (!('geolocation' in navigator)) {
    onError('GPS is not supported on this device.');
    return () => {};
  }

  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed ?? undefined,
        timestamp: pos.timestamp,
      }),
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        onError('Location permission denied. Allow location to track your trip.');
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        onError('Location unavailable. Check GPS or network.');
      } else {
        onError('Location request timed out.');
      }
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
  );

  return () => navigator.geolocation.clearWatch(id);
}