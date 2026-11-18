import { SingingTimbre } from '../types';

export interface PitchReading {
  freqHz: number;
  noteName: string;
  octave: number;
  midi: number;
  midiFloat: number;
  cents: number; // -50..+50
  clarity: number; // 0..1
}

export interface VibratoReading {
  detected: boolean;
  rateHz: number;
  depthCents: number;
  healthy: boolean;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_ES: Record<string, string> = {
  C: 'Do',
  'C#': 'Do#',
  D: 'Re',
  'D#': 'Re#',
  E: 'Mi',
  F: 'Fa',
  'F#': 'Fa#',
  G: 'Sol',
  'G#': 'Sol#',
  A: 'La',
  'A#': 'La#',
  B: 'Si',
};

export function freqToNote(freq: number): PitchReading {
  const midiFloat = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const noteName = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { freqHz: freq, noteName, octave, midi, midiFloat, cents, clarity: 1 };
}

export function noteLabelEs(noteName: string, octave: number): string {
  return `${NOTE_ES[noteName] ?? noteName}${octave} (${noteName}${octave})`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface ActiveVoice {
  stop: () => void;
  startedAt: number;
}

interface PitchSamplePoint {
  t: number;
  midiFloat: number;
}

class VoiceStudioEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;
  private activeVoices = new Map<string, ActiveVoice>();
  private pitchHistory: PitchSamplePoint[] = [];

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private createVoiceGraph(
    ctx: AudioContext,
    freq: number,
    timbre: SingingTimbre,
    startTime: number,
    gainPeak: number
  ): { master: GainNode; oscs: OscillatorNode[] } {
    const master = ctx.createGain();
    const oscs: OscillatorNode[] = [];

    if (timbre === 'organ') {
      const harmonics: [number, number, OscillatorType][] = [
        [1, 0.55, 'sine'],
        [2, 0.32, 'sine'],
        [3, 0.18, 'sine'],
        [4, 0.08, 'triangle'],
      ];
      harmonics.forEach(([mult, level, type]) => {
        const osc = ctx.createOscillator();
        const sub = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq * mult, startTime);
        sub.gain.setValueAtTime(level, startTime);
        osc.connect(sub);
        sub.connect(master);
        oscs.push(osc);
      });
      master.gain.setValueAtTime(0.0001, startTime);
      master.gain.linearRampToValueAtTime(gainPeak * 0.85, startTime + 0.03);
      master.connect(ctx.destination);
      return { master, oscs };
    }

    if (timbre === 'soft') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1350, startTime);
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq, startTime);
      const sub2 = ctx.createGain();
      sub2.gain.setValueAtTime(0.22, startTime);
      osc1.connect(filter);
      osc2.connect(sub2);
      sub2.connect(filter);
      filter.connect(master);
      master.gain.setValueAtTime(0.0001, startTime);
      master.gain.linearRampToValueAtTime(gainPeak, startTime + 0.055);
      master.connect(ctx.destination);
      oscs.push(osc1, osc2);
      return { master, oscs };
    }

    // Default 'piano' timbre
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    const sub2 = ctx.createGain();
    sub2.gain.setValueAtTime(0.28, startTime);

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, startTime);
    const sub3 = ctx.createGain();
    sub3.gain.setValueAtTime(0.08, startTime);

    osc1.connect(master);
    osc2.connect(sub2);
    sub2.connect(master);
    osc3.connect(sub3);
    sub3.connect(master);

    master.gain.setValueAtTime(0.0001, startTime);
    master.gain.linearRampToValueAtTime(gainPeak, startTime + 0.015);
    master.connect(ctx.destination);
    oscs.push(osc1, osc2, osc3);
    return { master, oscs };
  }

  public playPianoNote(
    freq: number,
    durationSec = 0.75,
    whenOffset = 0,
    timbre: SingingTimbre = 'piano',
    gainLevel = 0.24
  ): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime + Math.max(0, whenOffset);
    const dur = Math.max(0.08, durationSec);
    const { master, oscs } = this.createVoiceGraph(ctx, freq, timbre, t, gainLevel);

    if (timbre === 'organ') {
      master.gain.setValueAtTime(gainLevel * 0.8, t + Math.max(0.04, dur - 0.08));
      master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    } else {
      master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }

    oscs.forEach((osc) => {
      osc.start(t);
      osc.stop(t + dur + 0.04);
    });
  }

  public playMidiNote(
    midi: number,
    durationSec = 0.75,
    timbre: SingingTimbre = 'piano',
    whenOffset = 0,
    gainLevel = 0.24
  ): void {
    this.playPianoNote(midiToFreq(midi), durationSec, whenOffset, timbre, gainLevel);
  }

  public playChord(
    midis: number[],
    durationSec = 0.9,
    timbre: SingingTimbre = 'piano',
    arpeggioStepSec = 0
  ): void {
    midis.forEach((m, idx) => {
      this.playMidiNote(m, durationSec, timbre, idx * arpeggioStepSec, 0.16);
    });
  }

  public noteOn(id: string | number, midi: number, timbre: SingingTimbre = 'piano'): void {
    const key = String(id);
    if (this.activeVoices.has(key)) return;

    if (this.activeVoices.size >= 12) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.activeVoices.entries()) {
        if (v.startedAt < oldestTime) {
          oldestTime = v.startedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) this.noteOff(oldestKey);
    }

    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    const { master, oscs } = this.createVoiceGraph(ctx, midiToFreq(midi), timbre, t, 0.22);

    if (timbre === 'piano') {
      master.gain.setTargetAtTime(0.11, t + 0.06, 0.35);
    }

    oscs.forEach((osc) => osc.start(t));

    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime;
      try {
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(Math.max(0.001, master.gain.value), now);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        oscs.forEach((osc) => osc.stop(now + 0.16));
      } catch {
        // Ignore already stopped oscillators
      }
    };

    this.activeVoices.set(key, { stop, startedAt: Date.now() });
  }

  public noteOff(id: string | number): void {
    const key = String(id);
    const voice = this.activeVoices.get(key);
    if (!voice) return;
    this.activeVoices.delete(key);
    voice.stop();
  }

  public stopAllNotes(): void {
    for (const voice of this.activeVoices.values()) {
      voice.stop();
    }
    this.activeVoices.clear();
  }

  public playCalmChime(freq = 396): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.45);
  }

  public async startMic(): Promise<void> {
    const ctx = this.ensureCtx();
    if (this.stream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Tu navegador no soporta captura de micrófono.');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    this.source = ctx.createMediaStreamSource(this.stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);
    this.buf = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));
    this.pitchHistory = [];
  }

  public stopMic(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((tr) => tr.stop());
      this.stream = null;
    }
    this.analyser = null;
    this.buf = null;
    this.pitchHistory = [];
  }

  public isMicActive(): boolean {
    return this.stream !== null && this.analyser !== null;
  }

  public resetVibratoHistory(): void {
    this.pitchHistory = [];
  }

  public samplePitch(): PitchReading | null {
    if (!this.analyser || !this.buf || !this.ctx) return null;
    this.analyser.getFloatTimeDomainData(this.buf);

    const buf = this.buf;
    const n = buf.length;
    let rms = 0;
    for (let i = 0; i < n; i++) {
      rms += buf[i] * buf[i];
    }
    rms = Math.sqrt(rms / n);
    if (rms < 0.012) return null; // Too quiet

    // Normalized autocorrelation across human singing range (~75 Hz .. 900 Hz)
    const sr = this.ctx.sampleRate;
    const minLag = Math.floor(sr / 900);
    const maxLag = Math.min(Math.floor(n / 2), Math.floor(sr / 75));

    let bestLag = -1;
    let bestCorr = 0;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let num = 0;
      let denA = 0;
      let denB = 0;
      for (let i = 0; i < n - lag; i += 2) {
        const a = buf[i];
        const b = buf[i + lag];
        num += a * b;
        denA += a * a;
        denB += b * b;
      }
      const denom = Math.sqrt(denA * denB);
      const corr = denom > 0 ? num / denom : 0;
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    if (bestLag <= 0 || bestCorr < 0.72) return null;

    const freq = sr / bestLag;
    const reading = freqToNote(freq);
    reading.clarity = bestCorr;

    const now = performance.now();
    this.pitchHistory.push({ t: now, midiFloat: reading.midiFloat });
    const cutoff = now - 1400;
    while (this.pitchHistory.length > 0 && this.pitchHistory[0].t < cutoff) {
      this.pitchHistory.shift();
    }

    return reading;
  }

  public sampleVibrato(): VibratoReading | null {
    const now = performance.now();
    const recent = this.pitchHistory.filter((p) => now - p.t <= 1200);
    if (recent.length < 24) return null;
    const spanSec = (recent[recent.length - 1].t - recent[0].t) / 1000;
    if (spanSec < 0.55) return null;

    const mean = recent.reduce((acc, p) => acc + p.midiFloat, 0) / recent.length;
    const centDevs = recent.map((p) => (p.midiFloat - mean) * 100);
    const maxAbs = Math.max(...centDevs.map((c) => Math.abs(c)));
    // Reject large pitch jumps (not a sustained note)
    if (maxAbs > 220) return null;

    let crossings = 0;
    let lastSign = 0;
    for (const c of centDevs) {
      if (Math.abs(c) < 5) continue;
      const sign = c > 0 ? 1 : -1;
      if (lastSign !== 0 && sign !== lastSign) {
        crossings += 1;
      }
      lastSign = sign;
    }

    const rateHz = (crossings / 2) / spanSec;
    const rmsCents = Math.sqrt(centDevs.reduce((acc, c) => acc + c * c, 0) / centDevs.length);
    const depthCents = Math.round(rmsCents * Math.SQRT2);
    const detected = rateHz >= 3.0 && rateHz <= 9.0 && depthCents >= 12;
    const healthy = rateHz >= 4.5 && rateHz <= 7.0 && depthCents >= 20 && depthCents <= 60;

    return {
      detected,
      rateHz: Number(rateHz.toFixed(1)),
      depthCents,
      healthy,
    };
  }
}

export const voiceStudio = new VoiceStudioEngine();
