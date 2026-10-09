import type { AlertLevel } from '../../contract/types';
import { ALERT_PROFILES, alertMessage } from './alertConfig';
import { dismissAlert, useAlertStore } from './alertEngine';

const BG: Record<AlertLevel, string> = {
  INFO: 'bg-blue-700',
  WARNING: 'bg-amber-600',
  CRITICAL: 'bg-red-700 animate-pulse',
};

export default function AlertOverlay() {
  const { active, level, distanceM, destinationName } = useAlertStore();
  if (!active || !level) return null;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={ALERT_PROFILES[level].title}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-6 text-center text-white ${BG[level]}`}
    >
      <div className="text-sm uppercase tracking-wide opacity-80">{level}</div>
      <h1 className="text-4xl font-medium">{ALERT_PROFILES[level].title}</h1>
      <p className="text-xl">{alertMessage(distanceM, destinationName)}</p>
      <button
        onClick={dismissAlert}
        className="w-full max-w-xs rounded-lg bg-white p-4 text-lg font-medium text-black"
      >
        {level === 'CRITICAL' ? "I'm awake, turn off" : 'Turn off alert'}
      </button>
    </div>
  );
}