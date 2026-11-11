/**
 * Procedural soundscape built on the Web Audio API. Nothing is sampled or
 * downloaded: every layer (drone, pad, solar wind, shimmer, world voices and
 * interface sounds) is synthesised in the browser.
 */

const MASTER_LEVEL = 0.8;
const ROOT = 73.42;
const OVERVIEW_CHORD = [146.83, 220, 349.23] as const;
const SCALE = [293.66, 349.23, 392, 440, 523.25, 587.33, 698.46, 783.99];
const REVERB_SECONDS = 3.8;
const REVERB_DECAY = 2.6;
const NOISE_SECONDS = 2;
const DRONE_CUTOFF = 190;
const DRONE_CUTOFF_PER_WARP = 28;
const WIND_LEVEL = 0.012;
const WIND_LEVEL_PER_WARP = 0.0022;
const MAX_WARP = 12;
const VOICE_LEVEL = 0.055;
const SHIMMER_MIN_MS = 2500;
const SHIMMER_SPREAD_MS = 4500;
const FIFTH = 1.5;
const OCTAVE = 2;

type Voice = {
  gain: GainNode;
  pan: StereoPannerNode;
};

type PluckOptions = {
  freq: number;
  level: number;
  attack: number;
  release: number;
  pan?: number;
  delay?: number;
};

type AudioContextCtor = typeof AudioContext;

const getContextCtor = (): AudioContextCtor | undefined => {
  if (typeof window === "undefined") {
    return;
  }
  const legacy = window as unknown as { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? legacy.webkitAudioContext;
};

const ignoreRejection = (): void => {
  // Browsers reject suspend/resume while a context is closing; safe to drop.
};

const randomBetween = (min: number, max: number): number =>
  min + Math.random() * (max - min);

class Soundscape {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private padOscillators: OscillatorNode[] = [];
  private readonly voices = new Map<string, Voice>();
  private shimmerTimer: ReturnType<typeof setTimeout> | null = null;
  private muted = false;

  get running(): boolean {
    return this.ctx !== null;
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  start(worlds: readonly { id: string; note: number }[]): void {
    if (this.ctx) {
      this.ctx.resume().catch(ignoreRejection);
      return;
    }
    const Ctor = getContextCtor();
    if (!Ctor) {
      return;
    }
    const ctx = new Ctor();
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.connect(ctx.destination);

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(compressor);
    this.master = master;

    const dry = ctx.createGain();
    dry.connect(master);
    this.dry = dry;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.buildImpulse(ctx);
    reverb.connect(master);
    const wet = ctx.createGain();
    wet.gain.value = 0.9;
    wet.connect(reverb);
    this.wet = wet;

    this.noiseBuffer = this.buildNoise(ctx);
    this.buildDrone(ctx);
    this.buildPad(ctx);
    this.buildWind(ctx);
    for (const world of worlds) {
      this.buildVoice(ctx, world.id, world.note);
    }

    const fadeIn = 2.5;
    master.gain.setTargetAtTime(
      this.muted ? 0 : MASTER_LEVEL,
      ctx.currentTime,
      fadeIn
    );
    ctx.resume().catch(ignoreRejection);
    this.scheduleShimmer();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.master) {
      const smoothing = 0.25;
      this.master.gain.setTargetAtTime(
        muted ? 0 : MASTER_LEVEL,
        this.ctx.currentTime,
        smoothing
      );
    }
  }

  setSuspended(suspended: boolean): void {
    if (!this.ctx) {
      return;
    }
    const action = suspended ? this.ctx.suspend() : this.ctx.resume();
    action.catch(ignoreRejection);
  }

  /** Retunes the pad to the focused world, or back to the home chord. */
  setFocus(note: number | null): void {
    if (!this.ctx) {
      return;
    }
    const chord =
      note === null ? OVERVIEW_CHORD : [note, note * FIFTH, note * OCTAVE];
    const glide = 0.9;
    for (const [index, osc] of this.padOscillators.entries()) {
      const target = chord[index % chord.length];
      osc.frequency.setTargetAtTime(target, this.ctx.currentTime, glide);
    }
  }

  /** Opens the drone and raises the solar wind as time accelerates. */
  setWarp(scale: number): void {
    if (!(this.ctx && this.droneFilter && this.windGain)) {
      return;
    }
    const warp = Math.min(Math.max(scale, 0), MAX_WARP);
    const smoothing = 0.4;
    this.droneFilter.frequency.setTargetAtTime(
      DRONE_CUTOFF + warp * DRONE_CUTOFF_PER_WARP,
      this.ctx.currentTime,
      smoothing
    );
    this.windGain.gain.setTargetAtTime(
      WIND_LEVEL + warp * WIND_LEVEL_PER_WARP,
      this.ctx.currentTime,
      smoothing
    );
  }

  /** Called from the render loop: how near a world is and where it sits. */
  updateBody(id: string, proximity: number, pan: number): void {
    const voice = this.voices.get(id);
    if (!(this.ctx && voice)) {
      return;
    }
    const smoothing = 0.3;
    const now = this.ctx.currentTime;
    voice.gain.gain.setTargetAtTime(proximity * VOICE_LEVEL, now, smoothing);
    voice.pan.pan.setTargetAtTime(
      Math.min(Math.max(pan, -1), 1),
      now,
      smoothing
    );
  }

  hover(): void {
    const ctx = this.ctx;
    if (!(ctx && this.dry)) {
      return;
    }
    const now = ctx.currentTime;
    const duration = 0.09;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1300, now);
    osc.frequency.exponentialRampToValueAtTime(1900, now + duration);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.dry);
    osc.start(now);
    osc.stop(now + duration);
  }

  select(note: number): void {
    this.pluck({
      freq: note * OCTAVE,
      level: 0.09,
      attack: 0.005,
      release: 1.8,
    });
    this.pluck({
      freq: note * OCTAVE * FIFTH,
      level: 0.05,
      attack: 0.005,
      release: 2.2,
      delay: 0.09,
    });
  }

  /** A single bell-like note from the scale, used for comets and shimmer. */
  chime(pan = 0): void {
    const freq = SCALE[Math.floor(Math.random() * SCALE.length)];
    this.pluck({ freq, level: 0.07, attack: 0.01, release: 3, pan });
  }

  travel(): void {
    const ctx = this.ctx;
    if (!(ctx && this.dry && this.wet && this.noiseBuffer)) {
      return;
    }
    const now = ctx.currentTime;
    const duration = 1.7;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.4;
    band.frequency.setValueAtTime(180, now);
    band.frequency.exponentialRampToValueAtTime(2600, now + duration * 0.45);
    band.frequency.exponentialRampToValueAtTime(260, now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    noise.connect(band);
    band.connect(gain);
    gain.connect(this.dry);
    gain.connect(this.wet);
    noise.start(now);
    noise.stop(now + duration);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + duration);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(0.12, now + 0.2);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    sub.connect(subGain);
    subGain.connect(this.dry);
    sub.start(now);
    sub.stop(now + duration);
  }

  private pluck(options: PluckOptions): void {
    const ctx = this.ctx;
    if (!(ctx && this.dry && this.wet)) {
      return;
    }
    const { freq, level, attack, release, pan = 0, delay = 0 } = options;
    const start = ctx.currentTime + delay;
    const end = start + attack + release;
    const shimmerDetune = 1.003;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.min(Math.max(pan, -1), 1);

    const fundamental = ctx.createOscillator();
    fundamental.type = "sine";
    fundamental.frequency.value = freq;
    fundamental.connect(gain);

    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.type = "sine";
    overtone.frequency.value = freq * OCTAVE * shimmerDetune;
    overtoneGain.gain.value = 0.25;
    overtone.connect(overtoneGain);
    overtoneGain.connect(gain);

    const dryLevel = ctx.createGain();
    dryLevel.gain.value = 0.45;
    gain.connect(panner);
    panner.connect(dryLevel);
    dryLevel.connect(this.dry);
    panner.connect(this.wet);

    fundamental.start(start);
    overtone.start(start);
    fundamental.stop(end);
    overtone.stop(end);
  }

  private scheduleShimmer(): void {
    const wait = SHIMMER_MIN_MS + Math.random() * SHIMMER_SPREAD_MS;
    this.shimmerTimer = setTimeout(() => {
      if (this.ctx?.state === "running") {
        const freq = SCALE[Math.floor(Math.random() * SCALE.length)] * OCTAVE;
        this.pluck({
          freq,
          level: 0.022,
          attack: 0.5,
          release: 4.5,
          pan: randomBetween(-0.8, 0.8),
        });
      }
      this.scheduleShimmer();
    }, wait);
  }

  private buildImpulse(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * REVERB_SECONDS);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        data[i] = randomBetween(-1, 1) * (1 - i / length) ** REVERB_DECAY;
      }
    }
    return impulse;
  }

  private buildNoise(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = randomBetween(-1, 1);
    }
    return buffer;
  }

  private buildDrone(ctx: AudioContext): void {
    if (!(this.dry && this.wet)) {
      return;
    }
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = DRONE_CUTOFF;
    filter.Q.value = 0.7;
    filter.connect(this.dry);
    filter.connect(this.wet);
    this.droneFilter = filter;

    const layers: readonly [OscillatorType, number, number, number][] = [
      ["sine", ROOT, 0, 0.14],
      ["sine", ROOT * FIFTH, -6, 0.06],
      ["sawtooth", ROOT / OCTAVE, 4, 0.05],
      ["triangle", ROOT, 9, 0.05],
    ];
    for (const [type, freq, detune, level] of layers) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      gain.gain.value = level;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
    }

    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoDepth.gain.value = 55;
    lfo.connect(lfoDepth);
    lfoDepth.connect(filter.frequency);
    lfo.start();
  }

  private buildPad(ctx: AudioContext): void {
    if (!(this.dry && this.wet)) {
      return;
    }
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 950;
    const dryLevel = ctx.createGain();
    dryLevel.gain.value = 0.4;
    filter.connect(dryLevel);
    dryLevel.connect(this.dry);
    filter.connect(this.wet);

    const detunes = [-5, 4, 7];
    for (const [index, freq] of OVERVIEW_CHORD.entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.detune.value = detunes[index];
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      this.padOscillators.push(osc);
    }
  }

  private buildWind(ctx: AudioContext): void {
    if (!(this.dry && this.wet && this.noiseBuffer)) {
      return;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 420;
    band.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = WIND_LEVEL;
    noise.connect(band);
    band.connect(gain);
    gain.connect(this.dry);
    gain.connect(this.wet);
    this.windGain = gain;

    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 0.03;
    lfoDepth.gain.value = 260;
    lfo.connect(lfoDepth);
    lfoDepth.connect(band.frequency);
    lfo.start();
    noise.start();
  }

  private buildVoice(ctx: AudioContext, id: string, note: number): void {
    if (!(this.dry && this.wet)) {
      return;
    }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const pan = ctx.createStereoPanner();
    gain.connect(pan);
    pan.connect(this.dry);
    pan.connect(this.wet);

    const overtoneRatio = 2.01;
    const layers: readonly [OscillatorType, number, number][] = [
      ["sine", note, 1],
      ["triangle", note * overtoneRatio, 0.3],
      ["sine", note / OCTAVE, 0.6],
    ];
    for (const [type, freq, level] of layers) {
      const osc = ctx.createOscillator();
      const layerGain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      layerGain.gain.value = level;
      osc.connect(layerGain);
      layerGain.connect(gain);
      osc.start();
    }

    // Slow tremolo so each world breathes at its own rate.
    const tremolo = ctx.createOscillator();
    const tremoloDepth = ctx.createGain();
    tremolo.frequency.value = randomBetween(0.08, 0.22);
    tremoloDepth.gain.value = 0.012;
    tremolo.connect(tremoloDepth);
    tremoloDepth.connect(gain.gain);
    tremolo.start();

    this.voices.set(id, { gain, pan });
  }

  dispose(): void {
    if (this.shimmerTimer) {
      clearTimeout(this.shimmerTimer);
      this.shimmerTimer = null;
    }
    this.ctx?.close().catch(ignoreRejection);
    this.ctx = null;
    this.master = null;
    this.dry = null;
    this.wet = null;
    this.droneFilter = null;
    this.windGain = null;
    this.noiseBuffer = null;
    this.padOscillators = [];
    this.voices.clear();
  }
}

export const soundscape = new Soundscape();
