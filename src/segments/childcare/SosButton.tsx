import { useEffect, useRef, useState } from 'react';
import { emit } from '../../contract/eventBus';
import { SOS_HOLD_MS } from '../../contract/constants';
import { useChildTrip } from './tripSync';

// Hold for 2 seconds to send SOS, so a pocket tap does nothing. Shows only during a child trip.
export default function SosButton() {
  const tripId = useChildTrip((s) => s.tripId);
  const sosSent = useChildTrip((s) => s.sosSent);
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!tripId) return null;

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }

  function start() {
    if (!tripId || sosSent) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      const position = useChildTrip.getState().position ?? undefined;
      emit('SOS_TRIGGERED', { tripId, position });
    }, SOS_HOLD_MS);
  }

  return (
    <button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      disabled={sosSent}
      className="relative w-full touch-none select-none overflow-hidden rounded-lg bg-red-600 p-4 text-lg font-medium text-white disabled:opacity-80"
    >
      <span
        className="absolute inset-y-0 left-0 bg-red-900/60"
        style={{
          width: holding ? '100%' : '0%',
          transitionProperty: 'width',
          transitionTimingFunction: 'linear',
          transitionDuration: holding ? `${SOS_HOLD_MS}ms` : '150ms',
        }}
      />
      <span className="relative">
        {sosSent ? 'SOS sent to parents' : holding ? 'Keep holding...' : 'Hold for SOS'}
      </span>
    </button>
  );
}