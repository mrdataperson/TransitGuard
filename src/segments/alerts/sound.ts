import type { BeepPattern } from './alertConfig';

let ctx: AudioContext | null = null;

// Browsers block audio until the user has tapped the page once.
// The engine calls this on the first tap so later alerts can play.
export function primeAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    // audio not supported
  }
}

export function playBeeps(p: BeepPattern): void {
  primeAudio();
  if (!ctx) return;
  const c = ctx;
  const start = c.currentTime + 0.05;
  const dur = p.durationMs / 1000;

  for (let i = 0; i < p.count; i++) {
    const t = start + (i * (p.durationMs + p.gapMs)) / 1000;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.value = p.freq;
    gain.gain.setValueAtTime(p.volume, t);
    gain.gain.setValueAtTime(0, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}