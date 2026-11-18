import {
  noteLabelEs,
  PitchReading,
  VibratoReading,
  voiceStudio,
} from '../audio/VoiceStudio';
import {
  EAR_INTERVALS,
  IntervalDef,
  midiToNoteEs,
  PIANO_KEY_BY_CODE,
  PIANO_KEYS_2OCT,
  SINGING_DRILLS,
  SINGING_SONGS,
  suggestTransposeFromRange,
} from '../data/SingingBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import { SingingTimbre } from '../types';

type SingingTab = 'karaoke' | 'routines' | 'ear';

interface SongTimelineEvent {
  midi: number;
  lyric: string;
  startSec: number;
  endSec: number;
  playedCue: boolean;
}

interface EarChordChallenge {
  kind: 'chord';
  rootMidi: number;
  quality: 'major' | 'minor';
  midis: number[];
  answered: 'major' | 'minor' | null;
}

interface EarIntervalChallenge {
  kind: 'interval';
  rootMidi: number;
  interval: IntervalDef;
  answeredId: string | null;
}

export class SingingView {
  private containerRef: HTMLElement | null = null;
  private activeTab: SingingTab = 'karaoke';
  private micError = '';
  private rafId = 0;

  // Piano keyboard state
  private activeMidis = new Set<number>();
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private blurHandler: (() => void) | null = null;

  // Tuner & Vibrato state
  private historyCents: number[] = [];
  private lastReading: PitchReading | null = null;
  private lastVibrato: VibratoReading | null = null;

  // Karaoke state
  private selectedSongId = SINGING_SONGS[0].id;
  private transpose: -12 | 0 | 12 = 0;
  private playGuideNotes = true;
  private karaokeRunning = false;
  private karaokeStartMs = 0;
  private karaokeTimeline: SongTimelineEvent[] = [];
  private karaokeDurationSec = 0;
  private karaokeTrace: { t: number; midiFloat: number; hit: boolean }[] = [];
  private karaokeSampleHits = 0;
  private karaokeSampleTotal = 0;
  private karaokeLastScore: number | null = null;

  // Breathing 4-4-6 state
  private breathRunning = false;
  private breathStartMs = 0;
  private breathTimerId = 0;

  // Vocal range capture state
  private rangeMode: 'low' | 'high' | null = null;
  private rangeHoldSamples: number[] = [];
  private rangeHoldStartMs = 0;
  private rangeStatusMsg = '';

  // Ear training state
  private earMode: 'chord' | 'interval' = 'chord';
  private earChord: EarChordChallenge | null = null;
  private earInterval: EarIntervalChallenge | null = null;
  private earScore = { correct: 0, total: 0 };

  public render(container: HTMLElement): void {
    this.containerRef = container;
    const isMicOn = voiceStudio.isMicActive();
    const profile = lifeStore.get();
    const level = profile.modulePrefs.singing.level;
    const timbre = profile.modulePrefs.singing.timbre;
    const lastDrillId = profile.modulePrefs.singing.lastDrillId;
    const suggestedTranspose = suggestTransposeFromRange(
      profile.stats.vocalRangeLow,
      profile.stats.vocalRangeHigh
    );

    if (!this.earChord) this.nextChordChallenge(false);
    if (!this.earInterval) this.nextIntervalChallenge(false);

    container.innerHTML = `
      <div class="al-page al-singing-page">
        <div class="al-module-hero" style="--mod-c1: #6D28D9; --mod-c2: #A78BFA;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #6D28D9; --em-c2: #A78BFA;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.mic(20)}</span>
            </div>
            <div>
              <h1>Estudio de Canto y Piano</h1>
              <p>Afinador con detector de vibrato, karaoke guiado en vivo, rutinas por nivel, oído musical y piano de 2 octavas Do3–Do5.</p>
            </div>
          </div>
          <div class="al-singing-hero-right">
            <div class="al-mono-pill">Mejor precisión: ${profile.stats.singingBestCents !== null ? `±${profile.stats.singingBestCents} cents` : '--'}</div>
            <button type="button" class="al-btn ${isMicOn ? 'al-btn-danger' : 'al-btn-primary'}" id="al-mic-toggle">
              ${Icons.mic(16)}<span>${isMicOn ? 'Detener micrófono' : 'Activar micrófono'}</span>
            </button>
          </div>
        </div>

        ${this.micError ? `<p class="al-warn-text">${this.micError}</p>` : ''}

        <div class="al-seg-tabs al-singing-tabs" role="tablist" aria-label="Secciones del estudio de canto">
          <button type="button" role="tab" aria-selected="${this.activeTab === 'karaoke'}" class="al-seg-btn ${this.activeTab === 'karaoke' ? 'is-active' : ''}" data-sing-tab="karaoke">Afinador y Karaoke</button>
          <button type="button" role="tab" aria-selected="${this.activeTab === 'routines'}" class="al-seg-btn ${this.activeTab === 'routines' ? 'is-active' : ''}" data-sing-tab="routines">Rutinas, Respiración y Rango</button>
          <button type="button" role="tab" aria-selected="${this.activeTab === 'ear'}" class="al-seg-btn ${this.activeTab === 'ear' ? 'is-active' : ''}" data-sing-tab="ear">Oído y Acordes</button>
        </div>

        ${this.activeTab === 'karaoke' ? this.renderKaraokeTab(level) : ''}
        ${this.activeTab === 'routines' ? this.renderRoutinesTab(level, lastDrillId, suggestedTranspose) : ''}
        ${this.activeTab === 'ear' ? this.renderEarTab() : ''}

        <section class="al-panel al-piano-panel" aria-label="Piano interactivo de dos octavas Do3 a Do5">
          <div class="al-card-head al-piano-head">
            <div>
              <h2>Piano de 2 octavas (Do3–Do5)</h2>
              <p class="al-muted">Toca con clic, toque múltiple o las teclas de tu PC (fila <kbd>Z</kbd>–<kbd>M</kbd> y <kbd>Q</kbd>–<kbd>I</kbd>).</p>
            </div>
            <div class="al-timbre-bar" role="group" aria-label="Selector de timbre">
              <span class="al-timbre-label">Timbre:</span>
              ${(['piano', 'organ', 'soft'] as SingingTimbre[])
                .map(
                  (t) => `
                <button type="button" class="al-btn al-btn-sm ${timbre === t ? 'al-btn-primary' : ''}" aria-pressed="${timbre === t}" data-timbre="${t}">
                  ${t === 'piano' ? 'Piano' : t === 'organ' ? 'Órgano' : 'Suave'}
                </button>`
                )
                .join('')}
            </div>
          </div>

          <div class="al-piano-scroll">
            <div class="al-piano-2oct">
              ${PIANO_KEYS_2OCT.filter((k) => !k.sharp)
                .map(
                  (k) => `
                <button type="button" class="al-key-white ${this.activeMidis.has(k.midi) ? 'is-active' : ''}" data-piano-midi="${k.midi}" aria-label="${k.noteEs}, tecla ${k.keyLabel}">
                  <span class="al-key-note">${k.noteEs}</span>
                  <kbd class="al-key-kbd">${k.keyLabel}</kbd>
                </button>`
                )
                .join('')}
              ${PIANO_KEYS_2OCT.filter((k) => k.sharp)
                .map((k) => {
                  const leftPct = ((k.whiteIndex + 0.68) / 15) * 100;
                  return `
                <button type="button" class="al-key-black ${this.activeMidis.has(k.midi) ? 'is-active' : ''}" data-piano-midi="${k.midi}" style="left:${leftPct.toFixed(3)}%" aria-label="${k.noteEs}, tecla ${k.keyLabel}">
                  <span class="al-key-note">${k.shortEs}</span>
                  <kbd class="al-key-kbd">${k.keyLabel}</kbd>
                </button>`;
                })
                .join('')}
            </div>
          </div>
        </section>
      </div>
    `;

    this.bindEvents(container);
    this.attachKeyboardListeners();
    if (this.activeTab === 'karaoke') {
      this.drawKaraokeCanvas();
    }
    if (isMicOn || this.karaokeRunning) {
      this.startLoop();
    }
  }

  private renderKaraokeTab(level: 1 | 2 | 3): string {
    const profile = lifeStore.get();
    const song = SINGING_SONGS.find((s) => s.id === this.selectedSongId) ?? SINGING_SONGS[0];
    const bestPct = profile.stats.singingSongBest[song.id];
    const tolerance = level === 3 ? 35 : 50;
    const suggested = suggestTransposeFromRange(
      profile.stats.vocalRangeLow,
      profile.stats.vocalRangeHigh
    );

    return `
      <div class="al-two-col">
        <section class="al-panel al-tuner-panel">
          <div class="al-card-head">
            <h2>Afinador y vibrato en vivo</h2>
            <span class="al-mono-pill" id="al-vibrato-pill">Vibrato: en espera</span>
          </div>

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

        <section class="al-panel al-karaoke-panel">
          <div class="al-card-head">
            <div>
              <h2>Karaoke vocal guiado</h2>
              <p class="al-muted">${song.description} Tolerancia nivel ${level}: ±${tolerance} cents.</p>
            </div>
            <span class="al-mono-pill">${bestPct !== undefined ? `Mejor: ${bestPct}%` : 'Sin marca'}</span>
          </div>

          <div class="al-karaoke-controls">
            <label class="al-karaoke-select">
              <span>Canción (${SINGING_SONGS.length})</span>
              <select id="al-song-select">
                ${SINGING_SONGS.map(
                  (s) =>
                    `<option value="${s.id}" ${s.id === song.id ? 'selected' : ''}>${s.title} (${s.bpm} BPM)</option>`
                ).join('')}
              </select>
            </label>

            <div class="al-transpose-group" role="group" aria-label="Transporte de tono">
              <span>Transporte:</span>
              ${([-12, 0, 12] as const)
                .map(
                  (tr) => `
                <button type="button" class="al-btn al-btn-sm ${this.transpose === tr ? 'al-btn-primary' : ''}" aria-pressed="${this.transpose === tr}" data-transpose="${tr}">
                  ${tr === 0 ? '0 (Original)' : tr > 0 ? '+12 (+1 oct)' : '-12 (-1 oct)'}
                </button>`
                )
                .join('')}
            </div>
          </div>

          ${
            suggested !== 0 && suggested !== this.transpose
              ? `<p class="al-muted al-range-suggest">Según tu rango vocal guardado, te sugerimos transporte <strong>${suggested > 0 ? '+12' : '-12'}</strong>.</p>`
              : ''
          }

          <div class="al-karaoke-actions">
            <button type="button" class="al-btn ${this.karaokeRunning ? 'al-btn-danger' : 'al-btn-primary'}" id="al-karaoke-toggle">
              ${Icons.volume(16)}<span>${this.karaokeRunning ? 'Detener karaoke' : 'Iniciar karaoke'}</span>
            </button>
            <label class="al-inline-check">
              <input type="checkbox" id="al-karaoke-guide" ${this.playGuideNotes ? 'checked' : ''} />
              <span>Guía de piano</span>
            </label>
            <span class="al-mono-pill" id="al-karaoke-score-live">
              ${this.karaokeLastScore !== null ? `Último acierto: ${this.karaokeLastScore}%` : 'Pulsa Iniciar para cantar'}
            </span>
          </div>

          <canvas id="al-karaoke-canvas" class="al-karaoke-canvas"></canvas>
        </section>
      </div>
    `;
  }

  private renderRoutinesTab(
    level: 1 | 2 | 3,
    lastDrillId: string,
    suggestedTranspose: -12 | 0 | 12
  ): string {
    const profile = lifeStore.get();
    const filtered = SINGING_DRILLS.filter((d) => d.level === level);
    const low = profile.stats.vocalRangeLow;
    const high = profile.stats.vocalRangeHigh;

    return `
      <div class="al-two-col">
        <section class="al-panel">
          <div class="al-card-head">
            <h2>Rutinas por nivel (${filtered.length} de ${SINGING_DRILLS.length})</h2>
          </div>

          <div class="al-seg-tabs" role="group" aria-label="Nivel de rutina">
            ${([1, 2, 3] as const)
              .map(
                (lv) => `
              <button type="button" class="al-seg-btn ${level === lv ? 'is-active' : ''}" aria-pressed="${level === lv}" data-sing-level="${lv}">
                ${lv === 1 ? 'Nivel 1 · Inicial' : lv === 2 ? 'Nivel 2 · Intermedio' : 'Nivel 3 · Avanzado'}
              </button>`
              )
              .join('')}
          </div>

          <div class="al-drills-list" style="margin-top:12px;">
            ${filtered
              .map(
                (d) => `
              <div class="al-drill-item ${lastDrillId === d.id ? 'is-selected' : ''}">
                <div>
                  <strong>${d.title}</strong>
                  <p>${d.tip}</p>
                </div>
                <button type="button" class="al-btn" data-drill="${d.id}">${Icons.volume(16)}<span>Escuchar guía</span></button>
              </div>`
              )
              .join('')}
          </div>
        </section>

        <div class="al-routines-side">
          <section class="al-panel">
            <div class="al-card-head">
              <div>
                <h2>Respiración 4-4-6</h2>
                <p class="al-muted">Ciclo de apoyo vocal: inhala 4 s, sostén 4 s, exhala 6 s.</p>
              </div>
              <button type="button" class="al-btn ${this.breathRunning ? 'al-btn-danger' : 'al-btn-primary'}" id="al-breath-toggle">
                ${Icons.wind(16)}<span>${this.breathRunning ? 'Detener' : 'Iniciar 4-4-6'}</span>
              </button>
            </div>
            <div class="al-sing-breath-box">
              <div class="al-sing-breath-orb" id="al-sing-breath-orb">4-4-6</div>
              <div class="al-sing-breath-copy">
                <strong id="al-sing-breath-phase">Listo para empezar</strong>
                <span id="al-sing-breath-sec">Mantén los hombros relajados y expande el abdomen.</span>
              </div>
            </div>
          </section>

          <section class="al-panel">
            <div class="al-card-head">
              <div>
                <h2>Rango vocal y transporte</h2>
                <p class="al-muted">Activa el micrófono y sostén 1 segundo tu nota grave y tu nota aguda cómodas.</p>
              </div>
            </div>
            <div class="al-range-stats">
              <div class="al-mini-stat"><span>Nota más grave</span><strong>${low !== null ? midiToNoteEs(low) : '--'}</strong></div>
              <div class="al-mini-stat"><span>Nota más aguda</span><strong>${high !== null ? midiToNoteEs(high) : '--'}</strong></div>
              <div class="al-mini-stat"><span>Transporte sugerido</span><strong>${suggestedTranspose === 0 ? '0' : suggestedTranspose > 0 ? '+12' : '-12'}</strong></div>
            </div>
            <div class="al-range-actions">
              <button type="button" class="al-btn ${this.rangeMode === 'low' ? 'al-btn-primary' : ''}" id="al-range-low">Capturar grave (1 s)</button>
              <button type="button" class="al-btn ${this.rangeMode === 'high' ? 'al-btn-primary' : ''}" id="al-range-high">Capturar aguda (1 s)</button>
            </div>
            <p class="al-muted" id="al-range-status" style="margin:8px 0 0;">
              ${this.rangeStatusMsg || 'Tu rango se guarda automáticamente para sugerirte el tono ideal en Karaoke.'}
            </p>
          </section>
        </div>
      </div>
    `;
  }

  private renderEarTab(): string {
    const isChord = this.earMode === 'chord';
    const c = this.earChord!;
    const iv = this.earInterval!;

    return `
      <section class="al-panel al-ear-panel">
        <div class="al-card-head">
          <div>
            <h2>Mini entrenamiento de oído y acordes</h2>
            <p class="al-muted">Escucha con atención y elige la cualidad o intervalo correcto.</p>
          </div>
          <span class="al-mono-pill">Aciertos: ${this.earScore.correct}/${this.earScore.total}</span>
        </div>

        <div class="al-seg-tabs" role="group" aria-label="Modo de entrenamiento auditivo">
          <button type="button" class="al-seg-btn ${isChord ? 'is-active' : ''}" data-ear-mode="chord">Acordes (Mayor o menor)</button>
          <button type="button" class="al-seg-btn ${!isChord ? 'is-active' : ''}" data-ear-mode="interval">Intervalos (3ª, 5ª, 8ª)</button>
        </div>

        <div class="al-ear-stage">
          <div class="al-ear-actions">
            <button type="button" class="al-btn al-btn-primary" id="al-ear-replay">
              ${Icons.volume(16)}<span>${isChord ? 'Escuchar acorde' : 'Escuchar intervalo'}</span>
            </button>
            <button type="button" class="al-btn" id="al-ear-next">
              ${Icons.refresh(16)}<span>Siguiente ejercicio</span>
            </button>
          </div>

          ${
            isChord
              ? `
            <div class="al-ear-options">
              <button type="button" class="al-btn al-ear-opt ${c.answered === 'major' ? (c.quality === 'major' ? 'is-good' : 'is-bad') : ''}" data-ear-chord="major" ${c.answered ? 'disabled' : ''}>
                Acorde Mayor (brillante)
              </button>
              <button type="button" class="al-btn al-ear-opt ${c.answered === 'minor' ? (c.quality === 'minor' ? 'is-good' : 'is-bad') : ''}" data-ear-chord="minor" ${c.answered ? 'disabled' : ''}>
                Acorde Menor (melancólico)
              </button>
            </div>
            ${
              c.answered
                ? `<p class="al-ear-feedback">
                    <strong>${c.answered === c.quality ? 'Correcto.' : 'Casi.'}</strong>
                    Era ${midiToNoteEs(c.rootMidi)} ${c.quality === 'major' ? 'Mayor' : 'menor'} (${c.midis.map(midiToNoteEs).join(' – ')}):
                    ${
                      c.quality === 'major'
                        ? 'su 3ª mayor (4 semitonos desde la raíz) produce un carácter abierto y estable.'
                        : 'su 3ª menor (3 semitonos desde la raíz) da el color más íntimo o melancólico.'
                    }
                  </p>`
                : ''
            }`
              : `
            <div class="al-ear-options">
              ${EAR_INTERVALS.map(
                (opt) => `
                <button type="button" class="al-btn al-ear-opt ${iv.answeredId === opt.id ? (iv.interval.id === opt.id ? 'is-good' : 'is-bad') : ''}" data-ear-interval="${opt.id}" ${iv.answeredId ? 'disabled' : ''}>
                  ${opt.label} (${opt.example})
                </button>`
              ).join('')}
            </div>
            ${
              iv.answeredId
                ? `<p class="al-ear-feedback">
                    <strong>${iv.answeredId === iv.interval.id ? 'Correcto.' : 'Casi.'}</strong>
                    Era una ${iv.interval.label} (${midiToNoteEs(iv.rootMidi)} → ${midiToNoteEs(iv.rootMidi + iv.interval.semitones)}). ${iv.interval.explanation}
                  </p>`
                : ''
            }`
          }
        </div>
      </section>
    `;
  }

  private bindEvents(container: HTMLElement): void {
    container.querySelector('#al-mic-toggle')?.addEventListener('click', async () => {
      if (voiceStudio.isMicActive()) {
        voiceStudio.stopMic();
        this.rangeMode = null;
        if (!this.karaokeRunning) cancelAnimationFrame(this.rafId);
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
              ? `No se pudo acceder al micrófono: ${err.message}. Puedes seguir usando el piano y oído.`
              : 'Permiso de micrófono no concedido.';
          this.render(container);
        }
      }
    });

    container.querySelectorAll<HTMLButtonElement>('[data-sing-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.singTab as SingingTab;
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-timbre]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const timbre = btn.dataset.timbre as SingingTimbre;
        lifeStore.updateModulePrefs('singing', { timbre });
        this.render(container);
      });
    });

    // 2-octave Piano pointer events (noteOn / noteOff)
    container.querySelectorAll<HTMLButtonElement>('[data-piano-midi]').forEach((btn) => {
      const midi = parseInt(btn.dataset.pianoMidi!, 10);
      const startKey = (e: PointerEvent) => {
        e.preventDefault();
        const timbre = lifeStore.get().modulePrefs.singing.timbre;
        this.activeMidis.add(midi);
        btn.classList.add('is-active');
        voiceStudio.noteOn(`ptr-${midi}`, midi, timbre);
        lifeStore.markHabit('singing');
      };
      const stopKey = () => {
        this.activeMidis.delete(midi);
        btn.classList.remove('is-active');
        voiceStudio.noteOff(`ptr-${midi}`);
      };
      btn.addEventListener('pointerdown', startKey);
      btn.addEventListener('pointerup', stopKey);
      btn.addEventListener('pointercancel', stopKey);
      btn.addEventListener('pointerleave', stopKey);
    });

    // Karaoke controls
    container.querySelector('#al-song-select')?.addEventListener('change', (e) => {
      this.selectedSongId = (e.target as HTMLSelectElement).value;
      this.stopKaraoke(false);
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-transpose]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.transpose = parseInt(btn.dataset.transpose!, 10) as -12 | 0 | 12;
        if (this.karaokeRunning) this.stopKaraoke(false);
        this.render(container);
      });
    });

    container.querySelector('#al-karaoke-guide')?.addEventListener('change', (e) => {
      this.playGuideNotes = (e.target as HTMLInputElement).checked;
    });

    container.querySelector('#al-karaoke-toggle')?.addEventListener('click', async () => {
      if (this.karaokeRunning) {
        this.stopKaraoke(true);
        this.render(container);
      } else {
        if (!voiceStudio.isMicActive()) {
          try {
            await voiceStudio.startMic();
            this.micError = '';
          } catch {
            // Can still run karaoke visual + piano guide without mic
          }
        }
        this.startKaraoke();
        this.render(container);
      }
    });

    // Routines & level
    container.querySelectorAll<HTMLButtonElement>('[data-sing-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const level = parseInt(btn.dataset.singLevel!, 10) as 1 | 2 | 3;
        lifeStore.updateModulePrefs('singing', { level });
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-drill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const drill = SINGING_DRILLS.find((d) => d.id === btn.dataset.drill);
        if (!drill) return;
        const timbre = lifeStore.get().modulePrefs.singing.timbre;
        lifeStore.updateModulePrefs('singing', { lastDrillId: drill.id });
        lifeStore.markHabit('singing');
        drill.notes.forEach((midi, idx) => {
          voiceStudio.playMidiNote(midi, 0.55, timbre, idx * 0.62);
        });
        this.render(container);
      });
    });

    // Breathing 4-4-6
    container.querySelector('#al-breath-toggle')?.addEventListener('click', () => {
      if (this.breathRunning) {
        this.stopBreathing();
        this.render(container);
      } else {
        this.startBreathing();
        this.render(container);
      }
    });

    // Vocal range capture
    const triggerRangeCapture = async (mode: 'low' | 'high') => {
      if (!voiceStudio.isMicActive()) {
        try {
          await voiceStudio.startMic();
          this.micError = '';
        } catch (err) {
          this.micError =
            err instanceof Error
              ? `Activa el micrófono para medir tu rango: ${err.message}`
              : 'Activa el micrófono para medir tu rango.';
          this.render(container);
          return;
        }
      }
      this.rangeMode = mode;
      this.rangeHoldSamples = [];
      this.rangeHoldStartMs = performance.now();
      this.rangeStatusMsg =
        mode === 'low'
          ? 'Canta ahora tu nota más grave cómoda durante 1 segundo...'
          : 'Canta ahora tu nota más aguda cómoda durante 1 segundo...';
      this.render(container);
    };
    container.querySelector('#al-range-low')?.addEventListener('click', () => void triggerRangeCapture('low'));
    container.querySelector('#al-range-high')?.addEventListener('click', () => void triggerRangeCapture('high'));

    // Ear training
    container.querySelectorAll<HTMLButtonElement>('[data-ear-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.earMode = btn.dataset.earMode as 'chord' | 'interval';
        this.render(container);
      });
    });

    container.querySelector('#al-ear-replay')?.addEventListener('click', () => {
      this.playCurrentEarPrompt();
    });

    container.querySelector('#al-ear-next')?.addEventListener('click', () => {
      if (this.earMode === 'chord') this.nextChordChallenge(true);
      else this.nextIntervalChallenge(true);
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ear-chord]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.earChord || this.earChord.answered) return;
        const choice = btn.dataset.earChord as 'major' | 'minor';
        this.earChord.answered = choice;
        this.earScore.total += 1;
        if (choice === this.earChord.quality) this.earScore.correct += 1;
        lifeStore.markHabit('singing');
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ear-interval]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.earInterval || this.earInterval.answeredId) return;
        const choice = btn.dataset.earInterval!;
        this.earInterval.answeredId = choice;
        this.earScore.total += 1;
        if (choice === this.earInterval.interval.id) this.earScore.correct += 1;
        lifeStore.markHabit('singing');
        this.render(container);
      });
    });
  }

  private attachKeyboardListeners(): void {
    this.detachKeyboardListeners();

    this.keyDownHandler = (e: KeyboardEvent) => {
      if (!this.containerRef || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

      const keyDef = PIANO_KEY_BY_CODE[e.code];
      if (!keyDef) return;
      e.preventDefault();
      if (this.activeMidis.has(keyDef.midi)) return;

      const timbre = lifeStore.get().modulePrefs.singing.timbre;
      this.activeMidis.add(keyDef.midi);
      this.containerRef
        .querySelector(`[data-piano-midi="${keyDef.midi}"]`)
        ?.classList.add('is-active');
      voiceStudio.noteOn(`kbd-${keyDef.midi}`, keyDef.midi, timbre);
      lifeStore.markHabit('singing');
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      const keyDef = PIANO_KEY_BY_CODE[e.code];
      if (!keyDef) return;
      this.activeMidis.delete(keyDef.midi);
      this.containerRef
        ?.querySelector(`[data-piano-midi="${keyDef.midi}"]`)
        ?.classList.remove('is-active');
      voiceStudio.noteOff(`kbd-${keyDef.midi}`);
    };

    this.blurHandler = () => {
      this.activeMidis.clear();
      this.containerRef
        ?.querySelectorAll('[data-piano-midi].is-active')
        .forEach((el) => el.classList.remove('is-active'));
      voiceStudio.stopAllNotes();
    };

    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    window.addEventListener('blur', this.blurHandler);
  }

  private detachKeyboardListeners(): void {
    if (this.keyDownHandler) window.removeEventListener('keydown', this.keyDownHandler);
    if (this.keyUpHandler) window.removeEventListener('keyup', this.keyUpHandler);
    if (this.blurHandler) window.removeEventListener('blur', this.blurHandler);
    this.keyDownHandler = null;
    this.keyUpHandler = null;
    this.blurHandler = null;
  }

  private startKaraoke(): void {
    const song = SINGING_SONGS.find((s) => s.id === this.selectedSongId) ?? SINGING_SONGS[0];
    const secPerBeat = 60 / song.bpm;
    let cursor = 1.2; // 1.2s lead-in before first note hits "AHORA" line
    this.karaokeTimeline = song.notes.map((n) => {
      const dur = n.beats * secPerBeat;
      const ev: SongTimelineEvent = {
        midi: n.midi + this.transpose,
        lyric: n.lyric,
        startSec: cursor,
        endSec: cursor + dur,
        playedCue: false,
      };
      cursor += dur;
      return ev;
    });
    this.karaokeDurationSec = cursor + 0.6;
    this.karaokeStartMs = performance.now();
    this.karaokeTrace = [];
    this.karaokeSampleHits = 0;
    this.karaokeSampleTotal = 0;
    this.karaokeRunning = true;
    lifeStore.markHabit('singing');
  }

  private stopKaraoke(recordScore: boolean): void {
    if (recordScore && this.karaokeSampleTotal > 0) {
      const pct = Math.round((this.karaokeSampleHits / this.karaokeSampleTotal) * 100);
      this.karaokeLastScore = pct;
      lifeStore.recordSingingSongScore(this.selectedSongId, pct);
    }
    this.karaokeRunning = false;
  }

  private startBreathing(): void {
    this.stopBreathing();
    this.breathRunning = true;
    this.breathStartMs = performance.now();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const tick = () => {
      if (!this.containerRef || !this.breathRunning) return;
      const elapsed = ((performance.now() - this.breathStartMs) / 1000) % 14;
      const orb = this.containerRef.querySelector<HTMLElement>('#al-sing-breath-orb');
      const phaseEl = this.containerRef.querySelector<HTMLElement>('#al-sing-breath-phase');
      const secEl = this.containerRef.querySelector<HTMLElement>('#al-sing-breath-sec');
      if (orb && phaseEl && secEl) {
        if (elapsed < 4) {
          const left = Math.ceil(4 - elapsed);
          phaseEl.textContent = 'Inhala por la nariz (4 s)';
          secEl.textContent = `Faltan ${left} s · Expande abdomen sin subir hombros`;
          orb.textContent = `${left}s`;
          if (!reduceMotion) orb.style.transform = `scale(${(1 + (elapsed / 4) * 0.25).toFixed(2)})`;
        } else if (elapsed < 8) {
          const left = Math.ceil(8 - elapsed);
          phaseEl.textContent = 'Sostén el aire (4 s)';
          secEl.textContent = `Faltan ${left} s · Garganta suelta y abierta`;
          orb.textContent = `${left}s`;
          if (!reduceMotion) orb.style.transform = 'scale(1.25)';
        } else {
          const left = Math.ceil(14 - elapsed);
          const p = (elapsed - 8) / 6;
          phaseEl.textContent = 'Exhala suave con «sss» (6 s)';
          secEl.textContent = `Faltan ${left} s · Dosifica el aire parejo`;
          orb.textContent = `${left}s`;
          if (!reduceMotion) orb.style.transform = `scale(${(1.25 - p * 0.25).toFixed(2)})`;
        }
      }
      this.breathTimerId = window.setTimeout(tick, 120);
    };
    tick();
  }

  private stopBreathing(): void {
    this.breathRunning = false;
    window.clearTimeout(this.breathTimerId);
    this.breathTimerId = 0;
  }

  private nextChordChallenge(playAudio: boolean): void {
    const rootMidi = 57 + Math.floor(Math.random() * 8); // La3..Mi4
    const quality: 'major' | 'minor' = Math.random() < 0.5 ? 'major' : 'minor';
    const third = quality === 'major' ? 4 : 3;
    this.earChord = {
      kind: 'chord',
      rootMidi,
      quality,
      midis: [rootMidi, rootMidi + third, rootMidi + 7],
      answered: null,
    };
    if (playAudio) this.playCurrentEarPrompt();
  }

  private nextIntervalChallenge(playAudio: boolean): void {
    const rootMidi = 58 + Math.floor(Math.random() * 6);
    const interval = EAR_INTERVALS[Math.floor(Math.random() * EAR_INTERVALS.length)];
    this.earInterval = {
      kind: 'interval',
      rootMidi,
      interval,
      answeredId: null,
    };
    if (playAudio) this.playCurrentEarPrompt();
  }

  private playCurrentEarPrompt(): void {
    const timbre = lifeStore.get().modulePrefs.singing.timbre;
    if (this.earMode === 'chord' && this.earChord) {
      voiceStudio.playChord(this.earChord.midis, 0.95, timbre, 0.08);
    } else if (this.earMode === 'interval' && this.earInterval) {
      voiceStudio.playMidiNote(this.earInterval.rootMidi, 0.65, timbre, 0);
      voiceStudio.playMidiNote(
        this.earInterval.rootMidi + this.earInterval.interval.semitones,
        0.75,
        timbre,
        0.55
      );
    }
  }

  private startLoop(): void {
    cancelAnimationFrame(this.rafId);
    const tick = () => {
      if (!this.containerRef || (!voiceStudio.isMicActive() && !this.karaokeRunning)) return;
      const reading = voiceStudio.isMicActive() ? voiceStudio.samplePitch() : null;
      this.lastReading = reading;
      this.lastVibrato = voiceStudio.isMicActive() ? voiceStudio.sampleVibrato() : null;

      if (this.rangeMode && reading) {
        this.handleRangeSample(reading);
      }

      if (this.activeTab === 'karaoke') {
        this.updateTunerUI(reading, this.lastVibrato);
        this.stepKaraoke(reading);
        this.drawKaraokeCanvas();
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private handleRangeSample(reading: PitchReading): void {
    if (!this.rangeMode || !this.containerRef) return;
    this.rangeHoldSamples.push(reading.midi);
    const elapsed = performance.now() - this.rangeHoldStartMs;
    const statusEl = this.containerRef.querySelector<HTMLElement>('#al-range-status');
    if (elapsed >= 1000 && this.rangeHoldSamples.length >= 8) {
      const sorted = [...this.rangeHoldSamples].sort((a, b) => a - b);
      const medianMidi = sorted[Math.floor(sorted.length / 2)];
      if (this.rangeMode === 'low') {
        lifeStore.recordVocalRange(medianMidi, null);
        this.rangeStatusMsg = `Nota grave guardada: ${midiToNoteEs(medianMidi)}.`;
      } else {
        lifeStore.recordVocalRange(null, medianMidi);
        this.rangeStatusMsg = `Nota aguda guardada: ${midiToNoteEs(medianMidi)}.`;
      }
      this.rangeMode = null;
      this.render(this.containerRef);
    } else if (statusEl) {
      statusEl.textContent = `Detectando ${midiToNoteEs(reading.midi)}... sostén estable (${Math.min(100, Math.round((elapsed / 1000) * 100))}%).`;
    }
  }

  private stepKaraoke(reading: PitchReading | null): void {
    if (!this.karaokeRunning) return;
    const elapsedSec = (performance.now() - this.karaokeStartMs) / 1000;
    const timbre = lifeStore.get().modulePrefs.singing.timbre;
    const level = lifeStore.get().modulePrefs.singing.level;
    const toleranceSemitones = level === 3 ? 0.35 : 0.5;

    for (const ev of this.karaokeTimeline) {
      if (!ev.playedCue && elapsedSec >= ev.startSec) {
        ev.playedCue = true;
        if (this.playGuideNotes) {
          voiceStudio.playMidiNote(
            ev.midi,
            Math.max(0.22, ev.endSec - ev.startSec - 0.04),
            timbre,
            0,
            0.14
          );
        }
      }
    }

    const activeNote = this.karaokeTimeline.find(
      (ev) => elapsedSec >= ev.startSec && elapsedSec <= ev.endSec
    );
    if (activeNote && reading) {
      const diffSemis = Math.abs(reading.midiFloat - activeNote.midi);
      const hit = diffSemis <= toleranceSemitones;
      this.karaokeSampleTotal += 1;
      if (hit) this.karaokeSampleHits += 1;
      this.karaokeTrace.push({ t: elapsedSec, midiFloat: reading.midiFloat, hit });
      if (this.karaokeTrace.length > 260) this.karaokeTrace.shift();
    } else if (reading) {
      this.karaokeTrace.push({ t: elapsedSec, midiFloat: reading.midiFloat, hit: false });
      if (this.karaokeTrace.length > 260) this.karaokeTrace.shift();
    }

    const liveEl = this.containerRef?.querySelector<HTMLElement>('#al-karaoke-score-live');
    if (liveEl && this.karaokeSampleTotal > 0) {
      const pct = Math.round((this.karaokeSampleHits / this.karaokeSampleTotal) * 100);
      liveEl.textContent = `Acierto en vivo: ${pct}%`;
    }

    if (elapsedSec >= this.karaokeDurationSec) {
      this.stopKaraoke(true);
      if (this.containerRef) this.render(this.containerRef);
    }
  }

  private drawKaraokeCanvas(): void {
    if (!this.containerRef) return;
    const canvas = this.containerRef.querySelector<HTMLCanvasElement>('#al-karaoke-canvas');
    if (!canvas) return;
    const w = canvas.clientWidth || 440;
    const h = 156;
    if (canvas.width !== w) {
      canvas.width = w;
      canvas.height = h;
    }
    const g = canvas.getContext('2d');
    if (!g) return;

    const isNight = lifeStore.get().theme === 'night';
    g.fillStyle = isNight ? '#0D1513' : '#EEF2F0';
    g.fillRect(0, 0, w, h);

    const nowSec = this.karaokeRunning ? (performance.now() - this.karaokeStartMs) / 1000 : 0;
    const song = SINGING_SONGS.find((s) => s.id === this.selectedSongId) ?? SINGING_SONGS[0];
    const events: SongTimelineEvent[] = this.karaokeRunning
      ? this.karaokeTimeline
      : (() => {
          const spb = 60 / song.bpm;
          let cur = 0.6;
          return song.notes.map((n) => {
            const d = n.beats * spb;
            const item = {
              midi: n.midi + this.transpose,
              lyric: n.lyric,
              startSec: cur,
              endSec: cur + d,
              playedCue: false,
            };
            cur += d;
            return item;
          });
        })();

    const minMidi = 46 + this.transpose;
    const maxMidi = 74 + this.transpose;
    const midiToY = (m: number) => {
      const norm = Math.max(0, Math.min(1, (m - minMidi) / (maxMidi - minMidi)));
      return h - 18 - norm * (h - 36);
    };

    const nowX = Math.round(w * 0.24);
    const pxPerSec = 105;

    // Horizontal pitch guide lines
    g.strokeStyle = isNight ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
    g.lineWidth = 1;
    for (let m = 48 + this.transpose; m <= 72 + this.transpose; m += 4) {
      const y = midiToY(m);
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }

    // Target note bars
    for (const ev of events) {
      const x1 = nowX + (ev.startSec - nowSec) * pxPerSec;
      const x2 = nowX + (ev.endSec - nowSec) * pxPerSec;
      if (x2 < 0 || x1 > w) continue;
      const y = midiToY(ev.midi);
      const isCurrent = nowSec >= ev.startSec && nowSec <= ev.endSec;

      g.fillStyle = isCurrent
        ? '#6D28D9'
        : isNight
          ? 'rgba(167, 139, 250, 0.36)'
          : 'rgba(109, 40, 217, 0.24)';
      g.fillRect(x1 + 2, y - 9, Math.max(8, x2 - x1 - 4), 18);

      g.fillStyle = isCurrent ? '#FFFFFF' : isNight ? '#E2E8F0' : '#1E293B';
      g.font = '600 11px monospace';
      g.fillText(`${ev.lyric} (${midiToNoteEs(ev.midi)})`, x1 + 6, y + 4);
    }

    // "AHORA" line
    g.strokeStyle = isNight ? '#34D399' : '#166534';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(nowX, 0);
    g.lineTo(nowX, h);
    g.stroke();

    // User voice trace
    if (this.karaokeTrace.length > 1) {
      g.lineWidth = 2.5;
      for (let i = 1; i < this.karaokeTrace.length; i++) {
        const p0 = this.karaokeTrace[i - 1];
        const p1 = this.karaokeTrace[i];
        if (p1.t - p0.t > 0.2) continue;
        const x0 = nowX + (p0.t - nowSec) * pxPerSec;
        const x1 = nowX + (p1.t - nowSec) * pxPerSec;
        if (x1 < 0) continue;
        g.strokeStyle = p1.hit ? '#16A34A' : '#F59E0B';
        g.beginPath();
        g.moveTo(x0, midiToY(p0.midiFloat));
        g.lineTo(x1, midiToY(p1.midiFloat));
        g.stroke();
      }
    }

    // Live voice dot on "AHORA"
    if (this.lastReading) {
      const y = midiToY(this.lastReading.midiFloat);
      g.fillStyle = '#16A34A';
      g.beginPath();
      g.arc(nowX, y, 5, 0, Math.PI * 2);
      g.fill();
    }
  }

  private updateTunerUI(reading: PitchReading | null, vibrato: VibratoReading | null): void {
    if (!this.containerRef) return;
    const noteEl = this.containerRef.querySelector<HTMLElement>('#al-note-big');
    const freqEl = this.containerRef.querySelector<HTMLElement>('#al-freq-readout');
    const centsEl = this.containerRef.querySelector<HTMLElement>('#al-cents-readout');
    const needleEl = this.containerRef.querySelector<HTMLElement>('#al-cents-needle');
    const vibEl = this.containerRef.querySelector<HTMLElement>('#al-vibrato-pill');
    const canvas = this.containerRef.querySelector<HTMLCanvasElement>('#al-pitch-canvas');
    if (!noteEl || !freqEl || !centsEl || !needleEl || !canvas) return;

    if (vibEl) {
      if (vibrato && vibrato.detected) {
        vibEl.textContent = `Vibrato ${vibrato.rateHz} Hz · ±${vibrato.depthCents} cents${vibrato.healthy ? ' (estable)' : ''}`;
      } else {
        vibEl.textContent = reading ? 'Nota recta (sin vibrato)' : 'Vibrato: en espera';
      }
    }

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

    g.fillStyle = isNight ? 'rgba(52, 211, 153, 0.14)' : 'rgba(20, 125, 88, 0.12)';
    g.fillRect(0, h / 2 - 12, w, 24);
    g.strokeStyle = isNight ? 'rgba(52, 211, 153, 0.45)' : 'rgba(20, 125, 88, 0.45)';
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();

    if (this.historyCents.length > 1) {
      g.strokeStyle = '#6D28D9';
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
    this.stopBreathing();
    this.stopKaraoke(false);
    this.detachKeyboardListeners();
    this.activeMidis.clear();
    voiceStudio.stopAllNotes();
    voiceStudio.stopMic();
    this.containerRef = null;
  }
}
