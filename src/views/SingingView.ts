import { midiToFreq, noteLabelEs, PitchReading, voiceStudio } from '../audio/VoiceStudio';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';

const PIANO_KEYS: { label: string; midi: number; sharp: boolean }[] = [
  { label: 'Do4', midi: 60, sharp: false },
  { label: 'Do#', midi: 61, sharp: true },
  { label: 'Re4', midi: 62, sharp: false },
  { label: 'Re#', midi: 63, sharp: true },
  { label: 'Mi4', midi: 64, sharp: false },
  { label: 'Fa4', midi: 65, sharp: false },
  { label: 'Fa#', midi: 66, sharp: true },
  { label: 'Sol4', midi: 67, sharp: false },
  { label: 'Sol#', midi: 68, sharp: true },
  { label: 'La4', midi: 69, sharp: false },
  { label: 'La#', midi: 70, sharp: true },
  { label: 'Si4', midi: 71, sharp: false },
  { label: 'Do5', midi: 72, sharp: false },
];

const DRILLS = [
  {
    id: 'major5',
    title: 'Escala 5 notas (Do-Re-Mi-Fa-Sol)',
    notes: [60, 62, 64, 65, 67, 65, 64, 62, 60],
    tip: 'Respira desde el abdomen sin subir los hombros y mantén la garganta relajada.',
  },
  {
    id: 'arpeggio',
    title: 'Arpegio Mayor (Do-Mi-Sol-Do5)',
    notes: [60, 64, 67, 72, 67, 64, 60],
    tip: 'Salta limpio entre notas sin arrastrar la voz como sirena.',
  },
  {
    id: 'holdA4',
    title: 'Nota sostenida (La4 · 440 Hz)',
    notes: [69, 69, 69],
    tip: 'Intenta sostener «Aaaa» o «Mmmm» manteniendo la aguja en el centro (±15 cents).',
  },
];

export class SingingView {
  private micError = '';
  private rafId = 0;
  private historyCents: number[] = [];
  private activeTargetMidi: number | null = null;
  private containerRef: HTMLElement | null = null;

  public render(container: HTMLElement): void {
    this.containerRef = container;
    const isMicOn = voiceStudio.isMicActive();
    const profile = lifeStore.get();

    container.innerHTML = `
      <div class="al-page al-singing-page">
        <div class="al-page-head">
          <div>
            <h1>Estudio de Canto y Afinación</h1>
            <p>Practica afinación en vivo con el micrófono o entrena tu oído con el piano de referencia y las escalas guiadas.</p>
          </div>
          <div class="al-mono-pill">Mejor precisión: ${profile.stats.singingBestCents !== null ? `±${profile.stats.singingBestCents} cents` : '--'}</div>
        </div>

        <div class="al-two-col">
          <section class="al-panel al-tuner-panel">
            <div class="al-card-head">
              <h2>Afinador vocal en vivo</h2>
              <button type="button" class="al-btn ${isMicOn ? 'al-btn-danger' : 'al-btn-primary'}" id="al-mic-toggle">
                ${Icons.mic(16)}<span>${isMicOn ? 'Detener micrófono' : 'Activar micrófono'}</span>
              </button>
            </div>

            ${this.micError ? `<p class="al-warn-text">${this.micError}</p>` : ''}

            <div class="al-tuner-readout">
              <div class="al-note-big" id="al-note-big">--</div>
              <div class="al-tuner-sub">
                <span id="al-freq-readout">0.0 Hz</span>
                <span id="al-cents-readout">Canta o tararea una nota</span>
              </div>
            </div>

            <div class="al-cents-bar">
              <div class="al-cents-center"></div>
              <div class="al-cents-needle" id="al-cents-needle"></div>
            </div>
            <div class="al-cents-labels">
              <span>Muy grave (-50c)</span>
              <span>Afinado (0c)</span>
              <span>Muy agudo (+50c)</span>
            </div>

            <canvas id="al-pitch-canvas" class="al-pitch-canvas"></canvas>
          </section>

          <section class="al-panel">
            <h2>Rutinas de práctica guiada</h2>
            <div class="al-drills-list">
              ${DRILLS.map(
                (d) => `
                <div class="al-drill-item">
                  <div>
                    <strong>${d.title}</strong>
                    <p>${d.tip}</p>
                  </div>
                  <button type="button" class="al-btn" data-drill="${d.id}">${Icons.volume(16)}<span>Escuchar guía</span></button>
                </div>`
              ).join('')}
            </div>

            <h2 class="al-subhead">Piano de referencia (Toca para escuchar tu nota)</h2>
            <div class="al-piano-strip">
              ${PIANO_KEYS.map(
                (k) => `
                <button type="button" class="al-piano-key ${k.sharp ? 'is-sharp' : ''} ${this.activeTargetMidi === k.midi ? 'is-active' : ''}" data-midi="${k.midi}">
                  <span>${k.label}</span>
                </button>`
              ).join('')}
            </div>
          </section>
        </div>
      </div>
    `;

    this.bindEvents(container);
    if (isMicOn) {
      this.startLoop();
    }
  }

  private bindEvents(container: HTMLElement): void {
    container.querySelector('#al-mic-toggle')?.addEventListener('click', async () => {
      if (voiceStudio.isMicActive()) {
        voiceStudio.stopMic();
        cancelAnimationFrame(this.rafId);
        this.render(container);
      } else {
        this.micError = '';
        try {
          await voiceStudio.startMic();
          lifeStore.markHabit('singing');
          this.render(container);
        } catch (err) {
          this.micError =
            err instanceof Error
              ? `No se pudo acceder al micrófono: ${err.message}. Puedes seguir usando el piano de referencia.`
              : 'Permiso de micrófono no concedido.';
          this.render(container);
        }
      }
    });

    container.querySelectorAll<HTMLButtonElement>('[data-midi]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const midi = parseInt(btn.dataset.midi!, 10);
        this.activeTargetMidi = midi;
        voiceStudio.playPianoNote(midiToFreq(midi), 0.9);
        lifeStore.markHabit('singing');
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-drill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const drill = DRILLS.find((d) => d.id === btn.dataset.drill);
        if (!drill) return;
        lifeStore.markHabit('singing');
        drill.notes.forEach((midi, idx) => {
          voiceStudio.playPianoNote(midiToFreq(midi), 0.55, idx * 0.62);
        });
      });
    });
  }

  private startLoop(): void {
    cancelAnimationFrame(this.rafId);
    const tick = () => {
      if (!this.containerRef || !voiceStudio.isMicActive()) return;
      const reading = voiceStudio.samplePitch();
      this.updateTunerUI(reading);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private updateTunerUI(reading: PitchReading | null): void {
    if (!this.containerRef) return;
    const noteEl = this.containerRef.querySelector<HTMLElement>('#al-note-big');
    const freqEl = this.containerRef.querySelector<HTMLElement>('#al-freq-readout');
    const centsEl = this.containerRef.querySelector<HTMLElement>('#al-cents-readout');
    const needleEl = this.containerRef.querySelector<HTMLElement>('#al-cents-needle');
    const canvas = this.containerRef.querySelector<HTMLCanvasElement>('#al-pitch-canvas');
    if (!noteEl || !freqEl || !centsEl || !needleEl || !canvas) return;

    if (reading) {
      noteEl.textContent = noteLabelEs(reading.noteName, reading.octave);
      freqEl.textContent = `${reading.freqHz.toFixed(1)} Hz`;
      const absC = Math.abs(reading.cents);
      const status =
        absC <= 12 ? 'AFINADO' : reading.cents < 0 ? 'UN POCO GRAVE' : 'UN POCO AGUDO';
      centsEl.textContent = `${reading.cents >= 0 ? '+' : ''}${reading.cents} cents · ${status}`;
      centsEl.style.color = absC <= 12 ? '#147D58' : absC <= 26 ? '#C96A00' : '#C2410C';

      const pct = Math.max(4, Math.min(96, 50 + reading.cents));
      needleEl.style.left = `${pct}%`;
      needleEl.style.opacity = '1';

      if (absC <= 18) {
        lifeStore.recordSingingAccuracy(absC);
      }
      this.historyCents.push(reading.cents);
      if (this.historyCents.length > 70) this.historyCents.shift();
    } else {
      needleEl.style.opacity = '0.35';
    }

    // Draw rolling stability trace
    const w = canvas.clientWidth || 360;
    const h = 92;
    if (canvas.width !== w) {
      canvas.width = w;
      canvas.height = h;
    }
    const g = canvas.getContext('2d')!;
    const isNight = lifeStore.get().theme === 'night';
    g.fillStyle = isNight ? '#0D1513' : '#EEF2F0';
    g.fillRect(0, 0, w, h);

    // Center tuned band
    g.fillStyle = isNight ? 'rgba(52, 211, 153, 0.14)' : 'rgba(20, 125, 88, 0.12)';
    g.fillRect(0, h / 2 - 12, w, 24);
    g.strokeStyle = isNight ? 'rgba(52, 211, 153, 0.45)' : 'rgba(20, 125, 88, 0.45)';
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();

    if (this.historyCents.length > 1) {
      g.strokeStyle = '#2D5BFF';
      g.lineWidth = 2.5;
      g.beginPath();
      this.historyCents.forEach((c, idx) => {
        const x = (idx / 69) * w;
        const y = h / 2 - (Math.max(-50, Math.min(50, c)) / 50) * (h * 0.42);
        if (idx === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.stroke();
    }
  }

  public unmount(): void {
    cancelAnimationFrame(this.rafId);
    voiceStudio.stopMic();
    this.containerRef = null;
  }
}
