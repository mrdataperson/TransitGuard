import { useAuthStore } from '../core/authStore';
import { SosButton } from '../segments/childcare';
import { ScannerPage } from '../segments/scanner';
import { TrackerPage, useTripStore } from '../segments/tracker';

// Scanner while idle, tracker once a ticket is scanned (so the camera is off during a trip)
export default function HomePage() {
  const role = useAuthStore((s) => s.role);
  const active = useTripStore((s) => s.ticket !== null || s.trip !== null);

  return (
    <>
      {active ? <TrackerPage /> : <ScannerPage />}
      {role === 'child' && (
        <div className="mx-auto max-w-md px-4">
          <SosButton />
        </div>
      )}
    </>
  );
}