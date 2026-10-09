import { Html5Qrcode } from 'html5-qrcode';

export interface ScanHandle {
  cancelled: boolean;
}

// Camera starts and stops run one at a time. React can mount, unmount and
// mount the page again within milliseconds (strict mode in dev), and two
// scanners in the same element would show two camera previews.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function stopScanner(scanner: Html5Qrcode): Promise<void> {
  try {
    if (scanner.isScanning) await scanner.stop();
    scanner.clear();
  } catch {
    // already stopped
  }
}

// Starts the camera inside the element with this id.
// Returns a stop function. Always call it on cleanup.
export function startQrScan(
  elementId: string,
  onDecoded: (text: string) => void,
  handle: ScanHandle,
): Promise<() => Promise<void>> {
  return enqueue(async () => {
    const noop = async () => {};
    if (handle.cancelled) return noop; // page was left before we even started

    const scanner = new Html5Qrcode(elementId);
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (text) => onDecoded(text),
      () => {}, // per-frame "no QR found", ignore
    );

    if (handle.cancelled) {
      await stopScanner(scanner);
      return noop;
    }
    return () => enqueue(() => stopScanner(scanner));
  });
}