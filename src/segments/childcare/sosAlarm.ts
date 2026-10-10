import { SOS_BUZZ } from './push';

let timer: ReturnType<typeof setInterval> | null = null;
let ctx: AudioContext | null = null;

function siren() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const c = ctx;
    const start = c.currentTime + 0.02;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    // two-tone emergency siren, six swaps in 1.8 seconds
    for (let i = 0; i < 6; i++) {
      osc.frequency.setValueAtTime(i % 2 === 0 ? 960 : 720, start + i * 0.3);
    }
    gain.gain.setValueAtTime(0.4, start);
    gain.gain.setValueAtTime(0, start + 1.8);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 1.85);
  } catch {
    // audio not available
  }
}

function buzz() {
  if ('vibrate' in navigator) navigator.vibrate(SOS_BUZZ);
}

// Repeats the buzz and siren until stopSosAlarm is called
export function startSosAlarm(): void {
  if (timer) return;
  const tick = () => {
    buzz();
    siren();
  };
  tick();
  timer = setInterval(tick, 5000);
}

export function stopSosAlarm(): void {
  if (timer) clearInterval(timer);
  timer = null;
  if ('vibrate' in navigator) navigator.vibrate(0);
}