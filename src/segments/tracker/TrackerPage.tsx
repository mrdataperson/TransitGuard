import { useEffect, useState } from 'react';
import { RING_TO_LEVEL } from '../../contract/constants';
import { useTripStore } from './tripStore';
import { watchGps } from './gpsWatcher';
import { keepScreenAwake } from './wakeLock';
import DestinationPicker from './DestinationPicker';
import MapView from './MapView';

const fmtDistance = (d: number) => (d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`);

export default function TrackerPage() {
  const ticket = useTripStore((s) => s.ticket);
  const trip = useTripStore((s) => s.trip);
  const position = useTripStore((s) => s.position);
  const distance = useTripStore((s) => s.distanceM);
  const ring = useTripStore((s) => s.ring);
  const confirmDestination = useTripStore((s) => s.confirmDestination);
  const handlePosition = useTripStore((s) => s.handlePosition);
  const stopTracking = useTripStore((s) => s.stopTracking);
  const cancelTicket = useTripStore((s) => s.cancelTicket);

  const [gpsError, setGpsError] = useState<string | null>(null);
  const active = ticket !== null || trip !== null;

  // GPS + screen wake lock run from ticket scan until the trip ends
  useEffect(() => {
    if (!active) return;
    const stopGps = watchGps((p) => {
      setGpsError(null);
      handlePosition(p);
    }, setGpsError);
    const stopWake = keepScreenAwake();
    return () => {
      stopGps();
      stopWake();
    };
  }, [active, handlePosition]);

  function onStop() {
    if (window.confirm('Stop tracking this trip?')) stopTracking();
  }

  // Dev only: fake a position `d` metres north of the destination
  function simulate(d: number) {
    const dest = trip?.destination.location;
    if (!dest) return;
    handlePosition({ lat: dest.lat + d / 111320, lng: dest.lng, accuracy: 10, timestamp: Date.now() });
  }

  const dest = trip?.destination.location;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="font-board text-2xl font-semibold tracking-tight">Tracker</h1>

      {gpsError && <p className="rounded bg-red-100 p-2 text-sm text-red-800">{gpsError}</p>}

      {!active && (
        <p className="rounded border p-3 text-sm text-gray-600">No active trip. Scan a ticket to start.</p>
      )}

      {ticket && !trip && (
        <DestinationPicker
          ticket={ticket}
          position={position}
          onConfirm={confirmDestination}
          onCancel={cancelTicket}
        />
      )}

      {trip && dest && (
        <div className="space-y-3">
          {/* the destination board */}
          <div className="rounded-md bg-ink-900 p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="truncate font-board text-2xl font-semibold leading-tight">
                {trip.destination.name}
              </div>
              {trip.ticket.routeNo && (
                <span className="shrink-0 rounded-sm bg-board-400 px-2 py-1 font-board text-xl font-bold leading-none text-ink-900">
                  {trip.ticket.routeNo}
                </span>
              )}
            </div>
            <div className="mt-4 font-board text-6xl font-semibold leading-none tracking-tight text-board-400">
              {distance !== null ? fmtDistance(distance) : '...'}
            </div>
            <div className="mt-1 text-sm text-white/70">
              {distance === null
                ? 'Waiting for GPS'
                : ring
                  ? `Inside ${ring} m ring (${RING_TO_LEVEL[ring]})`
                  : 'Outside all rings'}
              {position?.accuracy !== undefined && `, GPS accuracy ${Math.round(position.accuracy)} m`}
            </div>
            <div className="mt-3 border-t border-dashed border-white/25 pt-2 text-xs text-white/60">
              Tracking continues until you reach your destination.
            </div>
          </div>

          <MapView destination={dest} position={position} />

          <button onClick={onStop} className="w-full rounded border border-red-600 p-2 text-sm text-red-700">
            Stop tracking
          </button>

          {import.meta.env.DEV && (
            <div className="rounded border border-dashed p-3 text-sm">
              <div className="mb-2 text-gray-600">Dev: simulate distance from destination</div>
              <div className="flex flex-wrap gap-2">
                {[3500, 2900, 900, 400, 100].map((d) => (
                  <button key={d} onClick={() => simulate(d)} className="rounded border px-3 py-1">
                    {fmtDistance(d)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}