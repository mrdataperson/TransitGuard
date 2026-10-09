// Keeps the screen on during a trip. Returns a release function.
// The browser drops the lock when the tab is hidden, so we re-acquire on return.
export function keepScreenAwake(): () => void {
  if (!('wakeLock' in navigator)) return () => {};

  let sentinel: WakeLockSentinel | null = null;
  let active = true;

  const acquire = async () => {
    try {
      sentinel = await navigator.wakeLock.request('screen');
    } catch {
      // denied or page hidden, nothing to do
    }
  };

  const onVisible = () => {
    if (active && document.visibilityState === 'visible') void acquire();
  };

  document.addEventListener('visibilitychange', onVisible);
  void acquire();

  return () => {
    active = false;
    document.removeEventListener('visibilitychange', onVisible);
    void sentinel?.release().catch(() => {});
  };
}