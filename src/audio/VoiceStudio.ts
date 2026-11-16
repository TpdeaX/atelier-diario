export interface PitchReading {
  freqHz: number;
  noteName: string;
  octave: number;
  cents: number; // -50..+50
  clarity: number; // 0..1
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
  return { freqHz: freq, noteName, octave, cents, clarity: 1 };
}

export function noteLabelEs(noteName: string, octave: number): string {
  return `${NOTE_ES[noteName] ?? noteName}${octave} (${noteName}${octave})`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class VoiceStudioEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;

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

  public playPianoNote(freq: number, durationSec = 0.75, whenOffset = 0): void {
    const ctx = this.ensureCtx();
    const t = ctx.currentTime + whenOffset;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durationSec);

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, t);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, t);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.25, t);

    osc1.connect(g);
    osc2.connect(subGain);
    subGain.connect(g);
    g.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + durationSec + 0.03);
    osc2.stop(t + durationSec + 0.03);
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
  }

  public isMicActive(): boolean {
    return this.stream !== null && this.analyser !== null;
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
    return reading;
  }
}

export const voiceStudio = new VoiceStudioEngine();
