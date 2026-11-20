let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let lastPlayedAt = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.03);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

export function playMinecraftClickSound(tone: 'primary' | 'soft' = 'primary'): void {
  const nowMs = performance.now();
  if (nowMs - lastPlayedAt < 35) return;
  lastPlayedAt = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const pitchJitter = 0.97 + Math.random() * 0.06;
    const volumeScale = tone === 'soft' ? 0.45 : 0.72;

    // 1. Triangle pitch drop (820Hz -> 195Hz over 26ms)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(820 * pitchJitter, t);
    osc.frequency.exponentialRampToValueAtTime(195 * pitchJitter, t + 0.026);

    oscGain.gain.setValueAtTime(0.18 * volumeScale, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.028);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);

    // 2. Bandpass-filtered white noise burst at 1850Hz (Q=2.0) for 22ms
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1850 * pitchJitter, t);
    filter.Q.setValueAtTime(2.0, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.14 * volumeScale, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + 0.024);
  } catch {
    // Ignore audio errors if blocked by browser autoplay policy
  }
}
