import {
  noteLabelEs,
  PitchReading,
  VibratoReading,
  voiceStudio,
} from '../audio/VoiceStudio';
import {
  EAR_INTERVALS,
  EAR_INTERVALS_FULL,
  EAR_MELODIES,
  EAR_SCALES,
  EarMelodyDef,
  EarScaleDef,
  getSongDifficulty,
  IntervalDef,
  JUMP_VERIFIER_INTERVALS,
  midiToNoteEs,
  PIANO_KEY_BY_CODE,
  PIANO_KEYS_2OCT,
  SINGING_DRILLS,
  SINGING_SONGS,
  SingingDrill,
  suggestTransposeFromRange,
  VOWEL_DRILLS,
  WARMUP_CHAIN_STEPS,
} from '../data/SingingBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import { DifficultyLevel, SingingTimbre } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

type SingingTab = 'karaoke' | 'routines' | 'ear';
type EarMode = 'chord' | 'interval' | 'scale' | 'melody';

const SINGING_TUTORIALS: Record<SingingTab, Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  karaoke: {
    sectionName: 'Afinador y Karaoke',
    summary: 'Afina tu voz en tiempo real y canta canciones guiadas con piano, acordes y transporte de octava.',
    steps: [
      'Pulsa Activar micrófono arriba para ver tu nota exacta, desvío en cents y vibrato en vivo.',
      'Elige una canción del repertorio, ajusta Velocidad (0.75× a 1.15×) y Transporte (-12 / 0 / +12) a tu registro cómodo.',
      'Pulsa Iniciar karaoke: escucharás un conteo 3·2·1 seguido de la guía melódica y los acordes.',
      'Usa el Piano Do3–Do5 inferior con clic o teclado PC (Z–M y Q–I) para comprobar cualquier nota.',
    ],
    tip: 'Si una canción queda muy alta o baja, captura tu rango en Rutinas o cambia el transporte antes de forzar la garganta.',
  },
  routines: {
    sectionName: 'Calentamiento 5 min y Rutinas',
    summary: 'Prepara tu voz en 5 minutos, estabiliza vocales, verifica saltos y entrena rutinas por nivel.',
    steps: [
      'Inicia el Calentamiento guiado automático (5 min) antes de cantar piezas exigentes.',
      'Practica Estabilidad de vocales (A-E-I-O-U) y Saltos cantados con el micrófono activo.',
      'Filtra Rutinas por nivel (1 Inicial, 2 Intermedio, 3 Avanzado) y pulsa Escuchar guía para imitar cada patrón.',
      'Registra tu nota grave y aguda en Rango vocal para recibir sugerencias de transporte.',
    ],
    tip: 'Calentar 5 minutos con zumbido «Mmmm» y trino «Brrr» evita fatiga y mejora tu afinación al instante.',
  },
  ear: {
    sectionName: 'Oído, Acordes, Escalas y Dictado',
    summary: 'Entrena el reconocimiento auditivo de acordes, intervalos, escalas musicales y dictado melódico según tu dificultad.',
    steps: [
      'Elige entre Acordes, Intervalos (3 o 12 semitonos), Escalas o Dictado melódico.',
      'Pulsa Escuchar para repetir el patrón las veces que necesites y elige la respuesta correcta.',
      'Tu puntaje acumulado y racha se guardan automáticamente; usa el piano inferior para comparar.',
    ],
    tip: 'Asocia cada intervalo o escala con una emoción o melodía conocida (ej. 5ª justa con Estrellita).',
  },
};
type ChordQuality = 'major' | 'minor' | 'seventh';
type KaraokeTempo = 0.75 | 1 | 1.15;

interface SongTimelineEvent {
  midi: number;
  lyric: string;
  startSec: number;
  endSec: number;
  playedCue: boolean;
}

interface ChordTimelineEvent {
  midis: number[];
  label: string;
  startSec: number;
  durationSec: number;
  played: boolean;
}

interface EarChordChallenge {
  kind: 'chord';
  rootMidi: number;
  quality: ChordQuality;
  midis: number[];
  answered: ChordQuality | null;
}

interface EarIntervalChallenge {
  kind: 'interval';
  rootMidi: number;
  interval: IntervalDef;
  answeredId: string | null;
}

interface EarScaleChallenge {
  kind: 'scale';
  rootMidi: number;
  scale: EarScaleDef;
  answeredId: string | null;
}

interface EarMelodyChallenge {
  kind: 'melody';
  rootMidi: number;
  melody: EarMelodyDef;
  answeredId: string | null;
}

interface ActiveDrillEval {
  drill: SingingDrill;
  startedAtMs: number;
  stepDurationMs: number;
  lastPlayedIdx: number;
  hits: number;
  total: number;
  lastResultPct: number | null;
}

interface JumpChallenge {
  baseMidi: number;
  targetMidi: number;
  interval: IntervalDef;
  stage: 'base' | 'target' | 'done';
  holdMs: number;
}

const LEAD_IN_STEP_SEC = 0.72;
const LEAD_IN_TOTAL_SEC = LEAD_IN_STEP_SEC * 3; // 3 · 2 · 1

function fmtSec(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export class SingingView {
  private hydrated = false;
  private containerRef: HTMLElement | null = null;
  private activeTab: SingingTab = 'karaoke';
  private micError = '';
  private rafId = 0;
  private lastRafMs = 0;

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
  private karaokeTempo: KaraokeTempo = 1;
  private playGuideNotes = true;
  private playChordBacking = true;
  private karaokeRunning = false;
  private karaokeStartMs = 0;
  private karaokeLastCountBeep = 0;
  private karaokeTimeline: SongTimelineEvent[] = [];
  private karaokeChords: ChordTimelineEvent[] = [];
  private karaokeDurationSec = 0;
  private karaokeTrace: { t: number; midiFloat: number; hit: boolean }[] = [];
  private karaokeSampleHits = 0;
  private karaokeSampleTotal = 0;
  private karaokeLastScore: number | null = null;

  // Guided 5-min warmup chain state
  private warmupRunning = false;
  private warmupFinished = false;
  private warmupStepIdx = 0;
  private warmupStepRemSec = WARMUP_CHAIN_STEPS[0].durationSec;
  private warmupLastTickMs = 0;
  private warmupTimerId = 0;

  // Vowel stability drill (A-E-I-O-U)
  private vowelIdx = 0;
  private vowelHoldMs = 0;
  private vowelsCompleted = new Set<string>();

  // Sung interval jump verifier
  private jumpChallenge: JumpChallenge | null = null;

  // Interactive drill evaluator
  private activeDrillEval: ActiveDrillEval | null = null;
  private lastDrillFeedback = '';

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
  private earMode: EarMode = 'chord';
  private earIntervalMode: 'basic' | 'full' = 'basic';
  private earChord: EarChordChallenge | null = null;
  private earInterval: EarIntervalChallenge | null = null;
  private earScale: EarScaleChallenge | null = null;
  private earMelody: EarMelodyChallenge | null = null;

  private hydrateFromStore(): void {
    const s = lifeStore.get().progress.singing;
    if (!this.hydrated) {
      this.hydrated = true;
      this.activeTab = s.activeTab || 'karaoke';
      this.selectedSongId =
        SINGING_SONGS.some((song) => song.id === s.selectedSongId)
          ? s.selectedSongId
          : SINGING_SONGS[0].id;
      this.transpose = s.transpose === -12 || s.transpose === 12 ? s.transpose : 0;
      this.karaokeTempo =
        s.karaokeTempo === 0.75 || s.karaokeTempo === 1.15 ? s.karaokeTempo : 1;
      this.playGuideNotes = s.playGuideNotes !== false;
      this.playChordBacking = s.playChordBacking !== false;
      this.earMode = s.earMode || 'chord';
      this.earIntervalMode = s.earIntervalMode || 'basic';
    }
    this.vowelsCompleted = new Set(s.vowelsCompleted);
  }

  private getToleranceCents(): number {
    const diff = lifeStore.getDifficulty('singing');
    return diff === 'basico' ? 35 : diff === 'intermedio' ? 25 : 15;
  }

  private getScalesForDifficulty(diff: DifficultyLevel): EarScaleDef[] {
    if (diff === 'basico') return EAR_SCALES.filter((sc) => sc.difficulty === 'basico');
    if (diff === 'intermedio') {
      return EAR_SCALES.filter((sc) => sc.difficulty === 'basico' || sc.difficulty === 'intermedio');
    }
    return EAR_SCALES;
  }

  private getMelodiesForDifficulty(diff: DifficultyLevel): EarMelodyDef[] {
    if (diff === 'basico') return EAR_MELODIES.filter((m) => m.difficulty === 'basico');
    if (diff === 'intermedio') {
      return EAR_MELODIES.filter((m) => m.difficulty === 'basico' || m.difficulty === 'intermedio');
    }
    return EAR_MELODIES;
  }

  public render(container: HTMLElement): void {
    this.containerRef = container;
    this.hydrateFromStore();
    const isMicOn = voiceStudio.isMicActive();
    const profile = lifeStore.get();
    const sProg = profile.progress.singing;
    const diff = lifeStore.getDifficulty('singing');
    const level: 1 | 2 | 3 = diff === 'basico' ? 1 : diff === 'intermedio' ? 2 : 3;
    const tolCents = this.getToleranceCents();
    const timbre = profile.modulePrefs.singing.timbre;
    const lastDrillId = profile.modulePrefs.singing.lastDrillId;
    const suggestedTranspose = suggestTransposeFromRange(
      profile.stats.vocalRangeLow,
      profile.stats.vocalRangeHigh
    );
    const summary = lifeStore.getOverallMasterySummary();
    const songsDone = Object.keys(profile.stats.singingSongBest).length;
    const drillsDone = Object.keys(sProg.drillsMastered).length;

    if (!this.earChord) this.nextChordChallenge(false);
    if (!this.earInterval) this.nextIntervalChallenge(false);
    if (!this.earScale) this.nextScaleChallenge(false);
    if (!this.earMelody) this.nextMelodyChallenge(false);
    if (!this.jumpChallenge) this.nextJumpChallenge(false);

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
              <p>Calentamiento guiado de 5 min, ${SINGING_SONGS.length} canciones con acordes, vocales, saltos cantados, oído completo y piano Do3–Do5.</p>
            </div>
          </div>
          <div class="al-singing-hero-right">
            <div class="al-mono-pill">Mejor precisión: ${profile.stats.singingBestCents !== null ? `±${profile.stats.singingBestCents} cents` : '--'}</div>
            <button type="button" class="al-btn ${isMicOn ? 'al-btn-danger' : 'al-btn-primary'}" id="al-mic-toggle">
              ${Icons.mic(16)}<span>${isMicOn ? 'Detener micrófono' : 'Activar micrófono'}</span>
            </button>
          </div>
        </div>

        ${renderDidacticBar({
          moduleId: 'singing',
          progressLabel: 'Dominio Vocal y Auditivo',
          progressPct: summary.byModule.singing,
          progressDetail: `Canciones: ${songsDone}/${SINGING_SONGS.length} · Rutinas: ${drillsDone}/${SINGING_DRILLS.length} · Vocales: ${sProg.vowelsCompleted.length}/5 · Oído: ${sProg.earCorrect}/${sProg.earTotal}`,
          extraMetric: `Tolerancia: ±${tolCents}c · Racha oído: ${sProg.earStreak}`,
          difficultyHints: {
            basico: 'Nivel 1 · Tolerancia ±35 cents, escalas y dictados melódicos iniciales.',
            intermedio: 'Nivel 2 · Tolerancia ±25 cents, repertorio medio y escalas armónicas.',
            avanzado: 'Nivel 3 · Tolerancia ±15 cents, modos avanzados y máxima precisión vocal.',
          },
        })}

        ${this.micError ? `<p class="al-warn-text">${this.micError}</p>` : ''}

        <div class="al-seg-tabs al-singing-tabs" role="tablist" aria-label="Secciones del estudio de canto">
          <button type="button" role="tab" aria-selected="${this.activeTab === 'karaoke'}" class="al-seg-btn ${this.activeTab === 'karaoke' ? 'is-active' : ''}" data-sing-tab="karaoke">
            ${Icons.music(15)}<span>Afinador y Karaoke (${SINGING_SONGS.length})</span>
          </button>
          <button type="button" role="tab" aria-selected="${this.activeTab === 'routines'}" class="al-seg-btn ${this.activeTab === 'routines' ? 'is-active' : ''}" data-sing-tab="routines">
            ${Icons.wind(15)}<span>Calentamiento 5 min y Rutinas (${SINGING_DRILLS.length})</span>
          </button>
          <button type="button" role="tab" aria-selected="${this.activeTab === 'ear'}" class="al-seg-btn ${this.activeTab === 'ear' ? 'is-active' : ''}" data-sing-tab="ear">
            ${Icons.volume(15)}<span>Oído, Escalas y Dictado</span>
          </button>
        </div>

        ${renderTutorialBanner({
          id: `singing:${this.activeTab}`,
          moduleName: 'Estudio de Canto',
          ...(SINGING_TUTORIALS[this.activeTab] ?? SINGING_TUTORIALS.karaoke),
        })}

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

    bindDidacticBar(container, 'singing', () => {
      this.earScale = null;
      this.earMelody = null;
      this.render(container);
    });
    this.bindEvents(container);
    bindTutorialBanners(container);
    this.attachKeyboardListeners();
    if (this.activeTab === 'karaoke') {
      this.drawKaraokeCanvas();
    }
    if (this.activeTab === 'routines') {
      this.syncWarmupUI();
    }
    if (isMicOn || this.karaokeRunning || this.activeDrillEval) {
      this.startLoop();
    }
  }

  private renderKaraokeTab(level: 1 | 2 | 3): string {
    const profile = lifeStore.get();
    const song = SINGING_SONGS.find((s) => s.id === this.selectedSongId) ?? SINGING_SONGS[0];
    const songDiff = getSongDifficulty(song);
    const bestPct = profile.stats.singingSongBest[song.id];
    const tolerance = this.getToleranceCents();
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
            <div class="al-tool-group">
              <span class="al-mastery-badge ${songDiff === 'avanzado' ? 'is-warn' : ''}">${difficultyLabel(songDiff)}</span>
              <span class="al-mastery-badge">${bestPct !== undefined ? `Mejor: ${bestPct}%` : 'Sin marca'}</span>
            </div>
          </div>

          <div class="al-karaoke-controls">
            <label class="al-karaoke-select">
              <span>Canción (${SINGING_SONGS.length})</span>
              <select id="al-song-select">
                ${SINGING_SONGS.map((s) => {
                  const dLbl = difficultyLabel(getSongDifficulty(s));
                  const b = profile.stats.singingSongBest[s.id];
                  return `<option value="${s.id}" ${s.id === song.id ? 'selected' : ''}>${s.title} · ${dLbl} · ${s.bpm} BPM${b !== undefined ? ` · ${b}%` : ''}</option>`;
                }).join('')}
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

            <div class="al-transpose-group" role="group" aria-label="Velocidad del karaoke">
              <span>Velocidad:</span>
              ${(
                [
                  [0.75, '0.75× Lento'],
                  [1, '1.0× Normal'],
                  [1.15, '1.15× Ágil'],
                ] as [KaraokeTempo, string][]
              )
                .map(
                  ([rate, label]) => `
                <button type="button" class="al-btn al-btn-sm ${this.karaokeTempo === rate ? 'al-btn-primary' : ''}" aria-pressed="${this.karaokeTempo === rate}" data-tempo="${rate}">
                  ${label}
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
              ${this.karaokeRunning ? Icons.pause(16) : Icons.play(16)}<span>${this.karaokeRunning ? 'Detener karaoke' : 'Iniciar karaoke'}</span>
            </button>
            <label class="al-inline-check">
              <input type="checkbox" id="al-karaoke-guide" ${this.playGuideNotes ? 'checked' : ''} />
              <span>Guía de piano</span>
            </label>
            <label class="al-inline-check">
              <input type="checkbox" id="al-karaoke-chords" ${this.playChordBacking ? 'checked' : ''} />
              <span>Acompañamiento de acordes</span>
            </label>
            <span class="al-mono-pill" id="al-karaoke-score-live">
              ${this.karaokeLastScore !== null ? `Último acierto: ${this.karaokeLastScore}%` : 'Conteo 3·2·1 al iniciar'}
            </span>
          </div>

          <div class="al-karaoke-stage">
            <canvas id="al-karaoke-canvas" class="al-karaoke-canvas"></canvas>
            <div class="al-karaoke-countdown" id="al-karaoke-countdown" hidden aria-live="polite">3</div>
          </div>
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
    const sProg = profile.progress.singing;
    const filtered = SINGING_DRILLS.filter((d) => d.level === level);
    const low = profile.stats.vocalRangeLow;
    const high = profile.stats.vocalRangeHigh;
    const step = WARMUP_CHAIN_STEPS[this.warmupStepIdx];
    const vowel = VOWEL_DRILLS[this.vowelIdx];
    const jump = this.jumpChallenge!;
    const isMicOn = voiceStudio.isMicActive();
    const tolCents = this.getToleranceCents();
    const masteredInLevel = filtered.filter((d) => sProg.drillsMastered[d.id] !== undefined).length;

    return `
      <section class="al-panel al-warmup-panel" aria-label="Calentamiento guiado de 5 minutos">
        <div class="al-card-head">
          <div>
            <h2>Calentamiento guiado automático (5 min)</h2>
            <p class="al-muted">Encadena 5 pasos con reloj y tonos guía para preparar tu voz sin forzarla.</p>
          </div>
          <div class="al-tool-group">
            <span class="al-mastery-badge">Completados: ${sProg.warmupCount}</span>
            <span class="al-mono-pill" id="al-warmup-live-pitch">
              ${isMicOn ? 'Afinador activo' : 'Micrófono opcional'}
            </span>
            <span class="al-mono-pill" id="al-warmup-total-left">${fmtSec(this.getWarmupRemainingTotal())}</span>
          </div>
        </div>

        <div class="al-warmup-steps-strip">
          ${WARMUP_CHAIN_STEPS.map(
            (s, i) => `
            <span class="al-warmup-step-chip ${i === this.warmupStepIdx && !this.warmupFinished ? 'is-current' : ''} ${i < this.warmupStepIdx || this.warmupFinished ? 'is-done' : ''}">
              ${i + 1}. ${s.title.replace(/^\d+\.\s*/, '').split(' ')[0]}
            </span>`
          ).join('')}
        </div>

        <div class="al-warmup-bar-track">
          <div class="al-warmup-bar-fill" id="al-warmup-bar-fill" style="width: 0%"></div>
        </div>

        <div class="al-warmup-stage">
          <div>
            <strong id="al-warmup-title">${this.warmupFinished ? 'Calentamiento completado (5 min)' : step.title}</strong>
            <p id="al-warmup-instr">${this.warmupFinished ? 'Tu voz ya está preparada. Puedes pasar al Karaoke o a las vocales.' : step.instruction}</p>
            <small class="al-muted" id="al-warmup-cue">${this.warmupFinished ? `Calentamiento registrado (${sProg.warmupCount} acumulados).` : step.cue}</small>
          </div>
          <div class="al-warmup-clock" id="al-warmup-step-clock">${this.warmupFinished ? '00:00' : fmtSec(this.warmupStepRemSec)}</div>
        </div>

        <div class="al-tool-group">
          <button type="button" class="al-btn ${this.warmupRunning ? 'al-btn-danger' : 'al-btn-primary'}" id="al-warmup-toggle">
            ${this.warmupRunning ? Icons.pause(15) : Icons.play(15)}<span>${this.warmupRunning ? 'Pausar' : this.warmupFinished ? 'Repetir calentamiento (5 min)' : 'Iniciar calentamiento (5 min)'}</span>
          </button>
          <button type="button" class="al-btn" id="al-warmup-play-guide">
            ${Icons.volume(15)}<span>Escuchar notas guía</span>
          </button>
          <button type="button" class="al-btn" id="al-warmup-skip">
            ${Icons.skip(15)}<span>Saltar paso</span>
          </button>
          <button type="button" class="al-btn" id="al-warmup-reset">
            ${Icons.refresh(15)}<span>Reiniciar</span>
          </button>
        </div>
      </section>

      <div class="al-two-col">
        <section class="al-panel">
          <div class="al-card-head">
            <h2>Estabilidad de vocales (A-E-I-O-U)</h2>
            <span class="al-mastery-badge">Logradas: ${sProg.vowelsCompleted.length}/5</span>
          </div>
          <p class="al-muted">Elige una vocal, escucha su tono y sostenla afinada (±${tolCents} cents) durante 2 segundos con el micrófono.</p>

          <div class="al-tool-group" role="group" aria-label="Elegir vocal">
            ${VOWEL_DRILLS.map(
              (v, idx) => `
              <button type="button" class="al-btn al-btn-sm ${idx === this.vowelIdx ? 'al-btn-primary' : ''} ${this.vowelsCompleted.has(v.vowel) ? 'is-toggled' : ''}" data-vowel-idx="${idx}">
                ${this.vowelsCompleted.has(v.vowel) ? Icons.check(13) : ''}<span>${v.vowel}</span>
              </button>`
            ).join('')}
            <button type="button" class="al-btn al-btn-sm" id="al-vowel-play">
              ${Icons.volume(15)}<span>Escuchar ${midiToNoteEs(vowel.targetMidi + this.transpose)}</span>
            </button>
          </div>

          <p class="al-muted" style="margin: 10px 0 6px;"><strong>${vowel.title}:</strong> ${vowel.cue}</p>
          <div class="al-warmup-bar-track">
            <div class="al-warmup-bar-fill is-violet" id="al-vowel-bar" style="width:${Math.min(100, Math.round((this.vowelHoldMs / 2000) * 100))}%"></div>
          </div>
          <p class="al-muted" id="al-vowel-status" style="margin: 6px 0 0;">
            ${isMicOn ? `Canta «${vowel.vowel}» en ${midiToNoteEs(vowel.targetMidi + this.transpose)} para llenar la barra.` : 'Activa el micrófono arriba para medir tu estabilidad en vivo.'}
          </p>
        </section>

        <section class="al-panel">
          <div class="al-card-head">
            <h2>Saltos cantados (verificador en vivo)</h2>
            <span class="al-mastery-badge">Dominados: ${sProg.jumpsVerified.length}/${JUMP_VERIFIER_INTERVALS.length}</span>
          </div>
          <p class="al-muted">Escucha las dos notas y cántalas en orden dentro de ±${Math.max(30, tolCents + 15)} cents.</p>

          <div class="al-step-bar" style="margin:4px 0 8px;">
            ${JUMP_VERIFIER_INTERVALS.map(
              (ji) => `
              <span class="al-step-pill ${sProg.jumpsVerified.includes(ji.id) ? 'is-done' : ''}">
                ${sProg.jumpsVerified.includes(ji.id) ? Icons.check(11) : ''} ${ji.label}
              </span>`
            ).join('')}
          </div>

          <div class="al-jump-display">
            <span class="al-jump-node ${jump.stage !== 'base' ? 'is-hit' : 'is-active'}" id="al-jump-n1">
              1. ${midiToNoteEs(jump.baseMidi)}
            </span>
            <span class="al-jump-arrow">→</span>
            <span class="al-jump-node ${jump.stage === 'done' ? 'is-hit' : jump.stage === 'target' ? 'is-active' : ''}" id="al-jump-n2">
              2. ${midiToNoteEs(jump.targetMidi)}
            </span>
            <span class="al-mono-pill">${jump.interval.label}</span>
          </div>

          <p class="al-muted" id="al-jump-status">
            ${
              jump.stage === 'done'
                ? `Salto de ${jump.interval.label} afinado y guardado. Pulsa Nuevo salto para continuar.`
                : !isMicOn
                  ? 'Pulsa Escuchar salto y activa el micrófono para verificar tu voz.'
                  : jump.stage === 'base'
                    ? `Paso 1: canta ${midiToNoteEs(jump.baseMidi)} estable.`
                    : `Paso 2: ahora salta a ${midiToNoteEs(jump.targetMidi)}.`
            }
          </p>

          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-primary al-btn-sm" id="al-jump-play">
              ${Icons.volume(15)}<span>Escuchar salto</span>
            </button>
            <button type="button" class="al-btn al-btn-sm" id="al-jump-next">
              ${Icons.refresh(15)}<span>Nuevo salto</span>
            </button>
          </div>
        </section>
      </div>

      <div class="al-two-col">
        <section class="al-panel">
          <div class="al-card-head">
            <h2>Rutinas por nivel (${filtered.length} de ${SINGING_DRILLS.length})</h2>
            <span class="al-mastery-badge">Dominadas nivel ${level}: ${masteredInLevel}/${filtered.length}</span>
          </div>

          <div class="al-seg-tabs" role="group" aria-label="Nivel de rutina">
            ${([1, 2, 3] as const)
              .map(
                (lv) => `
              <button type="button" class="al-seg-btn ${level === lv ? 'is-active' : ''}" aria-pressed="${level === lv}" data-sing-level="${lv}">
                ${lv === 1 ? 'Nivel 1 · Básico' : lv === 2 ? 'Nivel 2 · Intermedio' : 'Nivel 3 · Avanzado'}
              </button>`
              )
              .join('')}
          </div>

          ${
            this.activeDrillEval
              ? `
            <div class="al-study-card is-done" style="margin-top:12px;">
              <div class="al-card-head">
                <strong>Evaluando en vivo: ${this.activeDrillEval.drill.title}</strong>
                <button type="button" class="al-btn al-btn-sm al-btn-danger" id="al-drill-eval-stop">Detener</button>
              </div>
              <div class="al-warmup-bar-track">
                <div class="al-warmup-bar-fill is-violet" id="al-drill-eval-bar" style="width:0%"></div>
              </div>
              <p class="al-muted" id="al-drill-eval-status" style="margin:4px 0 0;">
                Sigue cada nota guía con tu voz (tolerancia ±${tolCents} cents)...
              </p>
            </div>`
              : this.lastDrillFeedback
                ? `<p class="al-muted" style="margin:10px 0 0;">${this.lastDrillFeedback}</p>`
                : ''
          }

          <div class="al-drills-list" style="margin-top:12px;">
            ${filtered
              .map((d) => {
                const best = sProg.drillsMastered[d.id];
                const isEvaluating = this.activeDrillEval?.drill.id === d.id;
                return `
              <div class="al-drill-item ${lastDrillId === d.id ? 'is-selected' : ''}">
                <div>
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <strong>${d.title}</strong>
                    ${
                      best !== undefined
                        ? `<span class="al-mastery-badge">${Icons.check(12)} Dominada · ${best}%</span>`
                        : ''
                    }
                  </div>
                  <p>${d.tip}</p>
                </div>
                <div class="al-tool-group">
                  <button type="button" class="al-btn al-btn-sm" data-drill="${d.id}">${Icons.volume(15)}<span>Guía</span></button>
                  <button type="button" class="al-btn al-btn-sm ${isEvaluating ? 'al-btn-danger' : 'al-btn-primary'}" data-drill-eval="${d.id}">
                    ${Icons.mic(14)}<span>${isEvaluating ? 'Detener' : 'Evaluar'}</span>
                  </button>
                  <button type="button" class="al-btn al-btn-sm" data-drill-complete="${d.id}" title="Marcar rutina completada sin micrófono">
                    ${Icons.check(14)}<span>Dominada</span>
                  </button>
                </div>
              </div>`;
              })
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
    const sProg = lifeStore.get().progress.singing;
    const diff = lifeStore.getDifficulty('singing');
    const c = this.earChord!;
    const iv = this.earInterval!;
    const sc = this.earScale!;
    const mel = this.earMelody!;
    const activeIntervals =
      this.earIntervalMode === 'full' ? EAR_INTERVALS_FULL : EAR_INTERVALS;
    const activeScales = this.getScalesForDifficulty(diff);
    const activeMelodies = this.getMelodiesForDifficulty(diff);

    const chordExplanation =
      c.quality === 'major'
        ? 'su 3ª mayor (4 semitonos desde la raíz) produce un carácter abierto y estable.'
        : c.quality === 'minor'
          ? 'su 3ª menor (3 semitonos desde la raíz) da el color más íntimo o melancólico.'
          : 'añade una 7ª menor (10 semitonos) sobre la tríada mayor, creando tensión armónica que pide resolver.';

    const chordName =
      c.quality === 'major' ? 'Mayor' : c.quality === 'minor' ? 'menor' : 'de Séptima (7)';

    const playBtnLabel =
      this.earMode === 'chord'
        ? 'Escuchar acorde'
        : this.earMode === 'interval'
          ? 'Escuchar intervalo'
          : this.earMode === 'scale'
            ? 'Escuchar escala'
            : 'Escuchar melodía';

    return `
      <section class="al-panel al-ear-panel">
        <div class="al-card-head">
          <div>
            <h2>Entrenamiento auditivo completo</h2>
            <p class="al-muted">Reconoce acordes, intervalos, escalas musicales y dictado melódico adaptados a dificultad <strong>${difficultyLabel(diff)}</strong>.</p>
          </div>
          <div class="al-tool-group">
            <span class="al-mastery-badge">Aciertos: ${sProg.earCorrect}/${sProg.earTotal}</span>
            <span class="al-mono-pill">Racha: ${sProg.earStreak}</span>
          </div>
        </div>

        <div class="al-tool-group" style="justify-content: space-between; flex-wrap:wrap;">
          <div class="al-seg-tabs" role="group" aria-label="Modo de entrenamiento auditivo">
            <button type="button" class="al-seg-btn ${this.earMode === 'chord' ? 'is-active' : ''}" data-ear-mode="chord">Acordes</button>
            <button type="button" class="al-seg-btn ${this.earMode === 'interval' ? 'is-active' : ''}" data-ear-mode="interval">Intervalos</button>
            <button type="button" class="al-seg-btn ${this.earMode === 'scale' ? 'is-active' : ''}" data-ear-mode="scale">Escalas (${activeScales.length})</button>
            <button type="button" class="al-seg-btn ${this.earMode === 'melody' ? 'is-active' : ''}" data-ear-mode="melody">Dictado melódico (${activeMelodies.length})</button>
          </div>

          ${
            this.earMode === 'interval'
              ? `
            <div class="al-seg-tabs" role="group" aria-label="Dificultad de intervalos">
              <button type="button" class="al-seg-btn ${this.earIntervalMode === 'basic' ? 'is-active' : ''}" data-ear-iv-mode="basic">Básico (3)</button>
              <button type="button" class="al-seg-btn ${this.earIntervalMode === 'full' ? 'is-active' : ''}" data-ear-iv-mode="full">Completo (12)</button>
            </div>`
              : ''
          }
        </div>

        <div class="al-ear-stage">
          <div class="al-ear-actions">
            <button type="button" class="al-btn al-btn-primary" id="al-ear-replay">
              ${Icons.volume(16)}<span>${playBtnLabel}</span>
            </button>
            <button type="button" class="al-btn" id="al-ear-next">
              ${Icons.refresh(16)}<span>Siguiente ejercicio</span>
            </button>
          </div>

          ${
            this.earMode === 'chord'
              ? `
            <div class="al-ear-options">
              <button type="button" class="al-btn al-ear-opt ${c.answered === 'major' ? (c.quality === 'major' ? 'is-good' : 'is-bad') : ''}" data-ear-chord="major" ${c.answered ? 'disabled' : ''}>
                Acorde Mayor (brillante)
              </button>
              <button type="button" class="al-btn al-ear-opt ${c.answered === 'minor' ? (c.quality === 'minor' ? 'is-good' : 'is-bad') : ''}" data-ear-chord="minor" ${c.answered ? 'disabled' : ''}>
                Acorde Menor (melancólico)
              </button>
              <button type="button" class="al-btn al-ear-opt ${c.answered === 'seventh' ? (c.quality === 'seventh' ? 'is-good' : 'is-bad') : ''}" data-ear-chord="seventh" ${c.answered ? 'disabled' : ''}>
                Acorde Séptima (tensión)
              </button>
            </div>
            ${
              c.answered
                ? `<p class="al-ear-feedback">
                    <strong>${c.answered === c.quality ? 'Correcto.' : 'Casi.'}</strong>
                    Era ${midiToNoteEs(c.rootMidi)} ${chordName} (${c.midis.map(midiToNoteEs).join(' – ')}): ${chordExplanation}
                  </p>`
                : ''
            }`
              : this.earMode === 'interval'
                ? `
            <div class="al-ear-options ${this.earIntervalMode === 'full' ? 'is-full-grid' : ''}">
              ${activeIntervals
                .map(
                  (opt) => `
                <button type="button" class="al-btn al-ear-opt ${iv.answeredId === opt.id ? (iv.interval.id === opt.id ? 'is-good' : 'is-bad') : ''}" data-ear-interval="${opt.id}" ${iv.answeredId ? 'disabled' : ''}>
                  ${opt.label} (${opt.example})
                </button>`
                )
                .join('')}
            </div>
            ${
              iv.answeredId
                ? `<p class="al-ear-feedback">
                    <strong>${iv.answeredId === iv.interval.id ? 'Correcto.' : 'Casi.'}</strong>
                    Era una ${iv.interval.label} (${midiToNoteEs(iv.rootMidi)} → ${midiToNoteEs(iv.rootMidi + iv.interval.semitones)}). ${iv.interval.explanation}
                  </p>`
                : ''
            }`
                : this.earMode === 'scale'
                  ? `
            <div class="al-ear-options is-full-grid">
              ${activeScales
                .map(
                  (opt) => `
                <button type="button" class="al-btn al-ear-opt ${sc.answeredId === opt.id ? (sc.scale.id === opt.id ? 'is-good' : 'is-bad') : ''}" data-ear-scale="${opt.id}" ${sc.answeredId ? 'disabled' : ''}>
                  ${opt.label}
                </button>`
                )
                .join('')}
            </div>
            ${
              sc.answeredId
                ? `<p class="al-ear-feedback">
                    <strong>${sc.answeredId === sc.scale.id ? 'Correcto.' : 'Casi.'}</strong>
                    Era ${sc.scale.label} desde ${midiToNoteEs(sc.rootMidi)} (${sc.scale.semitones.map((st) => midiToNoteEs(sc.rootMidi + st)).join(' - ')}). ${sc.scale.character}
                  </p>`
                : ''
            }`
                  : `
            <div class="al-ear-options is-full-grid">
              ${activeMelodies
                .map(
                  (opt) => `
                <button type="button" class="al-btn al-ear-opt ${mel.answeredId === opt.id ? (mel.melody.id === opt.id ? 'is-good' : 'is-bad') : ''}" data-ear-melody="${opt.id}" ${mel.answeredId ? 'disabled' : ''}>
                  ${opt.label} (${opt.patternLabel})
                </button>`
                )
                .join('')}
            </div>
            ${
              mel.answeredId
                ? `<p class="al-ear-feedback">
                    <strong>${mel.answeredId === mel.melody.id ? 'Correcto.' : 'Casi.'}</strong>
                    Era ${mel.melody.label} (${mel.melody.offsets.map((off) => midiToNoteEs(mel.rootMidi + off)).join(' → ')}). ${mel.melody.hint}
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
              ? `No se pudo acceder al micrófono: ${err.message}. Puedes seguir usando el calentamiento, karaoke guía, piano y oído.`
              : 'Permiso de micrófono no concedido.';
          this.render(container);
        }
      }
    });

    container.querySelectorAll<HTMLButtonElement>('[data-sing-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.singTab as SingingTab;
        lifeStore.updateProgress('singing', { activeTab: this.activeTab });
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

    // 2-octave Piano pointer events
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
      lifeStore.updateProgress('singing', { selectedSongId: this.selectedSongId });
      this.stopKaraoke(false);
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-transpose]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.transpose = parseInt(btn.dataset.transpose!, 10) as -12 | 0 | 12;
        lifeStore.updateProgress('singing', { transpose: this.transpose });
        if (this.karaokeRunning) this.stopKaraoke(false);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-tempo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.karaokeTempo = parseFloat(btn.dataset.tempo!) as KaraokeTempo;
        lifeStore.updateProgress('singing', { karaokeTempo: this.karaokeTempo });
        if (this.karaokeRunning) this.stopKaraoke(false);
        this.render(container);
      });
    });

    container.querySelector('#al-karaoke-guide')?.addEventListener('change', (e) => {
      this.playGuideNotes = (e.target as HTMLInputElement).checked;
      lifeStore.updateProgress('singing', { playGuideNotes: this.playGuideNotes });
    });

    container.querySelector('#al-karaoke-chords')?.addEventListener('change', (e) => {
      this.playChordBacking = (e.target as HTMLInputElement).checked;
      lifeStore.updateProgress('singing', { playChordBacking: this.playChordBacking });
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
            // Sigue funcionando visualmente y con guía/acordes aunque denieguen micrófono
          }
        }
        this.startKaraoke();
        this.render(container);
      }
    });

    // Guided 5-min warmup controls
    container.querySelector('#al-warmup-toggle')?.addEventListener('click', () => {
      if (this.warmupRunning) {
        this.pauseWarmup();
        this.render(container);
      } else {
        this.startWarmup();
        this.render(container);
      }
    });

    container.querySelector('#al-warmup-play-guide')?.addEventListener('click', () => {
      this.playWarmupStepNotes(this.warmupStepIdx);
    });

    container.querySelector('#al-warmup-skip')?.addEventListener('click', () => {
      this.advanceWarmupStep();
      this.render(container);
    });

    container.querySelector('#al-warmup-reset')?.addEventListener('click', () => {
      this.resetWarmup();
      this.render(container);
    });

    // Vowel stability controls
    container.querySelectorAll<HTMLButtonElement>('[data-vowel-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.vowelIdx = parseInt(btn.dataset.vowelIdx!, 10) || 0;
        this.vowelHoldMs = 0;
        this.playVowelGuide();
        this.render(container);
      });
    });

    container.querySelector('#al-vowel-play')?.addEventListener('click', () => {
      this.playVowelGuide();
    });

    // Sung interval jump controls
    container.querySelector('#al-jump-play')?.addEventListener('click', () => {
      this.playJumpGuide();
    });

    container.querySelector('#al-jump-next')?.addEventListener('click', () => {
      this.nextJumpChallenge(true);
      this.render(container);
    });

    // Routines & level
    container.querySelectorAll<HTMLButtonElement>('[data-sing-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const level = parseInt(btn.dataset.singLevel!, 10) as 1 | 2 | 3;
        const nextDiff: DifficultyLevel = level === 1 ? 'basico' : level === 2 ? 'intermedio' : 'avanzado';
        lifeStore.setDifficulty('singing', nextDiff);
        this.earScale = null;
        this.earMelody = null;
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
          voiceStudio.playMidiNote(midi + this.transpose, 0.55, timbre, idx * 0.62);
        });
        this.render(container);
      });
    });

    container.querySelector('#al-drill-eval-stop')?.addEventListener('click', () => {
      this.finishDrillEvaluation(false);
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-drill-eval]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const drill = SINGING_DRILLS.find((d) => d.id === btn.dataset.drillEval);
        if (!drill) return;
        if (this.activeDrillEval?.drill.id === drill.id) {
          this.finishDrillEvaluation(false);
          this.render(container);
          return;
        }
        lifeStore.updateModulePrefs('singing', { lastDrillId: drill.id });
        if (!voiceStudio.isMicActive()) {
          try {
            await voiceStudio.startMic();
            this.micError = '';
          } catch {
            this.lastDrillFeedback =
              'Sin micrófono activo: escucha la guía y pulsa «Dominada» para registrar tu autoevaluación.';
            const timbre = lifeStore.get().modulePrefs.singing.timbre;
            drill.notes.forEach((midi, idx) => {
              voiceStudio.playMidiNote(midi + this.transpose, 0.55, timbre, idx * 0.62);
            });
            this.render(container);
            return;
          }
        }
        this.startDrillEvaluation(drill);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-drill-complete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const drill = SINGING_DRILLS.find((d) => d.id === btn.dataset.drillComplete);
        if (!drill) return;
        lifeStore.updateModulePrefs('singing', { lastDrillId: drill.id });
        const prev = lifeStore.get().progress.singing.drillsMastered[drill.id] ?? 0;
        const pct = Math.max(prev, 85);
        lifeStore.recordSingingDrillMastery(drill.id, pct);
        this.lastDrillFeedback = `Rutina «${drill.title}» guardada como dominada (${pct}%).`;
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
    container
      .querySelector('#al-range-low')
      ?.addEventListener('click', () => void triggerRangeCapture('low'));
    container
      .querySelector('#al-range-high')
      ?.addEventListener('click', () => void triggerRangeCapture('high'));

    // Ear training
    container.querySelectorAll<HTMLButtonElement>('[data-ear-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.earMode = btn.dataset.earMode as EarMode;
        lifeStore.updateProgress('singing', { earMode: this.earMode });
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ear-iv-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.earIvMode as 'basic' | 'full';
        if (nextMode === this.earIntervalMode) return;
        this.earIntervalMode = nextMode;
        lifeStore.updateProgress('singing', { earIntervalMode: nextMode });
        this.nextIntervalChallenge(false);
        this.render(container);
      });
    });

    container.querySelector('#al-ear-replay')?.addEventListener('click', () => {
      this.playCurrentEarPrompt();
    });

    container.querySelector('#al-ear-next')?.addEventListener('click', () => {
      if (this.earMode === 'chord') this.nextChordChallenge(true);
      else if (this.earMode === 'interval') this.nextIntervalChallenge(true);
      else if (this.earMode === 'scale') this.nextScaleChallenge(true);
      else this.nextMelodyChallenge(true);
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ear-chord]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.earChord || this.earChord.answered) return;
        const choice = btn.dataset.earChord as ChordQuality;
        this.earChord.answered = choice;
        lifeStore.recordSingingEar(choice === this.earChord.quality);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ear-interval]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.earInterval || this.earInterval.answeredId) return;
        const choice = btn.dataset.earInterval!;
        this.earInterval.answeredId = choice;
        lifeStore.recordSingingEar(choice === this.earInterval.interval.id);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ear-scale]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.earScale || this.earScale.answeredId) return;
        const choice = btn.dataset.earScale!;
        this.earScale.answeredId = choice;
        lifeStore.recordSingingEar(choice === this.earScale.scale.id);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ear-melody]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.earMelody || this.earMelody.answeredId) return;
        const choice = btn.dataset.earMelody!;
        this.earMelody.answeredId = choice;
        lifeStore.recordSingingEar(choice === this.earMelody.melody.id);
        this.render(container);
      });
    });
  }

  private attachKeyboardListeners(): void {
    this.detachKeyboardListeners();

    this.keyDownHandler = (e: KeyboardEvent) => {
      if (!this.containerRef || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const active = document.activeElement as HTMLElement | null;
      const activeTag = active?.tagName;
      if (
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeTag === 'SELECT' ||
        active?.isContentEditable
      ) {
        return;
      }

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

  // ---------------------------------------------------------------------------
  // Calentamiento guiado de 5 minutos (300 s)
  // ---------------------------------------------------------------------------

  private getWarmupRemainingTotal(): number {
    if (this.warmupFinished) return 0;
    let rem = this.warmupStepRemSec;
    for (let i = this.warmupStepIdx + 1; i < WARMUP_CHAIN_STEPS.length; i++) {
      rem += WARMUP_CHAIN_STEPS[i].durationSec;
    }
    return rem;
  }

  private playWarmupStepNotes(stepIdx: number): void {
    const step = WARMUP_CHAIN_STEPS[stepIdx];
    if (!step) return;
    const timbre = lifeStore.get().modulePrefs.singing.timbre;
    step.guideNotes.forEach((midi, idx) => {
      voiceStudio.playMidiNote(midi + this.transpose, 0.52, timbre, idx * 0.56, 0.18);
    });
  }

  private startWarmup(): void {
    if (this.warmupFinished) {
      this.resetWarmup();
    }
    window.clearInterval(this.warmupTimerId);
    this.warmupRunning = true;
    this.warmupLastTickMs = performance.now();
    this.playWarmupStepNotes(this.warmupStepIdx);
    lifeStore.markHabit('singing');
    this.warmupTimerId = window.setInterval(() => this.tickWarmup(), 250);
  }

  private pauseWarmup(): void {
    this.warmupRunning = false;
    window.clearInterval(this.warmupTimerId);
    this.warmupTimerId = 0;
  }

  private resetWarmup(): void {
    this.pauseWarmup();
    this.warmupFinished = false;
    this.warmupStepIdx = 0;
    this.warmupStepRemSec = WARMUP_CHAIN_STEPS[0].durationSec;
  }

  private advanceWarmupStep(): void {
    if (this.warmupStepIdx + 1 < WARMUP_CHAIN_STEPS.length) {
      this.warmupStepIdx += 1;
      this.warmupStepRemSec = WARMUP_CHAIN_STEPS[this.warmupStepIdx].durationSec;
      if (this.warmupRunning) {
        this.playWarmupStepNotes(this.warmupStepIdx);
      }
    } else {
      this.pauseWarmup();
      this.warmupFinished = true;
      this.warmupStepRemSec = 0;
      lifeStore.recordSingingWarmup();
    }
  }

  private tickWarmup(): void {
    if (!this.warmupRunning) return;
    const now = performance.now();
    const dt = (now - this.warmupLastTickMs) / 1000;
    this.warmupLastTickMs = now;
    this.warmupStepRemSec -= dt;
    if (this.warmupStepRemSec <= 0) {
      this.advanceWarmupStep();
      if (this.containerRef && this.activeTab === 'routines') {
        this.render(this.containerRef);
      }
      return;
    }
    this.syncWarmupUI();
  }

  private syncWarmupUI(): void {
    if (!this.containerRef) return;
    const totalSec = WARMUP_CHAIN_STEPS.reduce((a, s) => a + s.durationSec, 0);
    const remTotal = this.getWarmupRemainingTotal();
    const pct = Math.min(100, Math.max(0, Math.round(((totalSec - remTotal) / totalSec) * 100)));
    const bar = this.containerRef.querySelector<HTMLElement>('#al-warmup-bar-fill');
    const stepClock = this.containerRef.querySelector<HTMLElement>('#al-warmup-step-clock');
    const totalClock = this.containerRef.querySelector<HTMLElement>('#al-warmup-total-left');
    if (bar) bar.style.width = `${pct}%`;
    if (stepClock) stepClock.textContent = this.warmupFinished ? '00:00' : fmtSec(this.warmupStepRemSec);
    if (totalClock) totalClock.textContent = fmtSec(remTotal);
  }

  // ---------------------------------------------------------------------------
  // Vocales y saltos cantados
  // ---------------------------------------------------------------------------

  private playVowelGuide(): void {
    const vowel = VOWEL_DRILLS[this.vowelIdx];
    const timbre = lifeStore.get().modulePrefs.singing.timbre;
    voiceStudio.playMidiNote(vowel.targetMidi + this.transpose, 1.3, timbre, 0, 0.22);
    lifeStore.markHabit('singing');
  }

  private nextJumpChallenge(playAudio: boolean): void {
    const basePool = [57, 58, 60, 62, 64];
    const baseMidi = basePool[Math.floor(Math.random() * basePool.length)] + this.transpose;
    const interval =
      JUMP_VERIFIER_INTERVALS[Math.floor(Math.random() * JUMP_VERIFIER_INTERVALS.length)];
    this.jumpChallenge = {
      baseMidi,
      targetMidi: baseMidi + interval.semitones,
      interval,
      stage: 'base',
      holdMs: 0,
    };
    if (playAudio) this.playJumpGuide();
  }

  private playJumpGuide(): void {
    if (!this.jumpChallenge) return;
    const timbre = lifeStore.get().modulePrefs.singing.timbre;
    voiceStudio.playMidiNote(this.jumpChallenge.baseMidi, 0.7, timbre, 0, 0.22);
    voiceStudio.playMidiNote(this.jumpChallenge.targetMidi, 0.9, timbre, 0.78, 0.22);
    lifeStore.markHabit('singing');
  }

  private startDrillEvaluation(drill: SingingDrill): void {
    this.activeDrillEval = {
      drill,
      startedAtMs: performance.now(),
      stepDurationMs: 900,
      lastPlayedIdx: -1,
      hits: 0,
      total: 0,
      lastResultPct: null,
    };
    this.lastDrillFeedback = '';
    lifeStore.markHabit('singing');
  }

  private finishDrillEvaluation(record: boolean): void {
    if (!this.activeDrillEval) return;
    const ev = this.activeDrillEval;
    this.activeDrillEval = null;
    if (record) {
      const pct = ev.total > 0 ? Math.round((ev.hits / ev.total) * 100) : 70;
      lifeStore.recordSingingDrillMastery(ev.drill.id, pct);
      this.lastDrillFeedback =
        ev.total > 0
          ? `Rutina «${ev.drill.title}» evaluada: ${pct}% de precisión vocal guardada.`
          : `Rutina «${ev.drill.title}» completada (${pct}%). Activa el micrófono más cerca para medir afinación.`;
    }
  }

  private updateRoutineVoiceChecks(reading: PitchReading | null, dtMs: number): void {
    if (!this.containerRef) return;
    const tolCents = this.getToleranceCents();
    const tolSemis = tolCents / 100;
    const livePill = this.containerRef.querySelector<HTMLElement>('#al-warmup-live-pitch');
    if (livePill) {
      livePill.textContent = reading
        ? `Voz: ${noteLabelEs(reading.noteName, reading.octave)} (${reading.cents >= 0 ? '+' : ''}${reading.cents}c)`
        : voiceStudio.isMicActive()
          ? 'Afinador activo'
          : 'Micrófono opcional';
    }

    // 0. Evaluación interactiva de rutina activa
    if (this.activeDrillEval) {
      const ev = this.activeDrillEval;
      const elapsed = performance.now() - ev.startedAtMs;
      const notes = ev.drill.notes;
      const totalMs = notes.length * ev.stepDurationMs;
      const idx = Math.floor(elapsed / ev.stepDurationMs);

      if (idx >= notes.length) {
        this.finishDrillEvaluation(true);
        this.render(this.containerRef);
        return;
      }

      const targetMidi = notes[idx] + this.transpose;
      if (idx > ev.lastPlayedIdx) {
        ev.lastPlayedIdx = idx;
        const timbre = lifeStore.get().modulePrefs.singing.timbre;
        voiceStudio.playMidiNote(targetMidi, 0.55, timbre, 0, 0.18);
      }

      if (reading) {
        ev.total += 1;
        if (Math.abs(reading.midiFloat - targetMidi) <= tolSemis) {
          ev.hits += 1;
        }
      }

      const bar = this.containerRef.querySelector<HTMLElement>('#al-drill-eval-bar');
      const status = this.containerRef.querySelector<HTMLElement>('#al-drill-eval-status');
      const progPct = Math.min(100, Math.round((elapsed / totalMs) * 100));
      if (bar) bar.style.width = `${progPct}%`;
      if (status) {
        const liveAcc = ev.total > 0 ? `${Math.round((ev.hits / ev.total) * 100)}%` : '--';
        status.textContent = `Nota ${idx + 1}/${notes.length}: canta ${midiToNoteEs(targetMidi)} · Acierto en vivo: ${liveAcc}`;
      }
    }

    // 1. Estabilidad de vocales (A-E-I-O-U)
    const vowel = VOWEL_DRILLS[this.vowelIdx];
    const targetVowelMidi = vowel.targetMidi + this.transpose;
    if (reading && Math.abs(reading.midiFloat - targetVowelMidi) <= tolSemis) {
      this.vowelHoldMs = Math.min(2000, this.vowelHoldMs + dtMs);
      if (this.vowelHoldMs >= 2000 && !this.vowelsCompleted.has(vowel.vowel)) {
        this.vowelsCompleted.add(vowel.vowel);
        lifeStore.recordSingingVowel(vowel.vowel);
        this.render(this.containerRef);
        return;
      }
    } else {
      this.vowelHoldMs = Math.max(0, this.vowelHoldMs - dtMs * 0.45);
    }
    const vBar = this.containerRef.querySelector<HTMLElement>('#al-vowel-bar');
    const vStatus = this.containerRef.querySelector<HTMLElement>('#al-vowel-status');
    const pct = Math.min(100, Math.round((this.vowelHoldMs / 2000) * 100));
    if (vBar) vBar.style.width = `${pct}%`;
    if (vStatus && reading) {
      const diffCents = Math.round((reading.midiFloat - targetVowelMidi) * 100);
      vStatus.textContent =
        Math.abs(diffCents) <= tolCents
          ? `Estable en «${vowel.vowel}»: ${pct}% completado`
          : diffCents < 0
            ? `Sube un poco hacia ${midiToNoteEs(targetVowelMidi)} (${diffCents} cents)`
            : `Baja un poco hacia ${midiToNoteEs(targetVowelMidi)} (+${diffCents} cents)`;
    }

    // 2. Verificador de saltos cantados
    const j = this.jumpChallenge;
    if (!j || j.stage === 'done' || !reading) return;
    const expectedMidi = j.stage === 'base' ? j.baseMidi : j.targetMidi;
    const jumpTol = Math.max(0.3, (tolCents + 15) / 100);
    const within = Math.abs(reading.midiFloat - expectedMidi) <= jumpTol;
    if (within) {
      j.holdMs += dtMs;
      if (j.holdMs >= 350) {
        j.holdMs = 0;
        if (j.stage === 'base') {
          j.stage = 'target';
          const n1 = this.containerRef.querySelector('#al-jump-n1');
          const n2 = this.containerRef.querySelector('#al-jump-n2');
          const st = this.containerRef.querySelector('#al-jump-status');
          n1?.classList.remove('is-active');
          n1?.classList.add('is-hit');
          n2?.classList.add('is-active');
          if (st) st.textContent = `Nota base captada. Ahora salta a ${midiToNoteEs(j.targetMidi)}.`;
        } else {
          j.stage = 'done';
          lifeStore.recordSingingJump(j.interval.id);
          this.render(this.containerRef);
        }
      }
    } else {
      j.holdMs = Math.max(0, j.holdMs - dtMs * 0.5);
    }
  }

  // ---------------------------------------------------------------------------
  // Karaoke (conteo 3-2-1, tempo y acompañamiento de acordes)
  // ---------------------------------------------------------------------------

  private startKaraoke(): void {
    const song = SINGING_SONGS.find((s) => s.id === this.selectedSongId) ?? SINGING_SONGS[0];
    const secPerBeat = (60 / song.bpm) / this.karaokeTempo;
    let cursor = LEAD_IN_TOTAL_SEC;

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

    const totalBeats = song.notes.reduce((a, n) => a + n.beats, 0);
    const chordShift = this.transpose === 12 ? 12 : 0; // evita acordes demasiado graves en -12
    const rawChords = song.chords ?? [];
    this.karaokeChords = rawChords.map((ch, idx) => {
      const nextBeat = idx + 1 < rawChords.length ? rawChords[idx + 1].startBeat : totalBeats;
      const durBeats = Math.max(1, nextBeat - ch.startBeat);
      return {
        midis: ch.midis.map((m) => m + chordShift),
        label: ch.label ?? '',
        startSec: LEAD_IN_TOTAL_SEC + ch.startBeat * secPerBeat,
        durationSec: Math.min(2.4, durBeats * secPerBeat * 0.92),
        played: false,
      };
    });

    this.karaokeDurationSec = cursor + 0.65;
    this.karaokeStartMs = performance.now();
    this.karaokeLastCountBeep = 0;
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
    const qualities: ChordQuality[] = ['major', 'minor', 'seventh'];
    const quality = qualities[Math.floor(Math.random() * qualities.length)];
    const midis =
      quality === 'major'
        ? [rootMidi, rootMidi + 4, rootMidi + 7]
        : quality === 'minor'
          ? [rootMidi, rootMidi + 3, rootMidi + 7]
          : [rootMidi, rootMidi + 4, rootMidi + 7, rootMidi + 10];
    this.earChord = {
      kind: 'chord',
      rootMidi,
      quality,
      midis,
      answered: null,
    };
    if (playAudio) this.playCurrentEarPrompt();
  }

  private nextIntervalChallenge(playAudio: boolean): void {
    const rootMidi = 58 + Math.floor(Math.random() * 6);
    const pool = this.earIntervalMode === 'full' ? EAR_INTERVALS_FULL : EAR_INTERVALS;
    const interval = pool[Math.floor(Math.random() * pool.length)];
    this.earInterval = {
      kind: 'interval',
      rootMidi,
      interval,
      answeredId: null,
    };
    if (playAudio) this.playCurrentEarPrompt();
  }

  private nextScaleChallenge(playAudio: boolean): void {
    const diff = lifeStore.getDifficulty('singing');
    const pool = this.getScalesForDifficulty(diff);
    const scale = pool[Math.floor(Math.random() * pool.length)];
    const rootMidi = 57 + Math.floor(Math.random() * 6); // La3..Re4
    this.earScale = {
      kind: 'scale',
      rootMidi,
      scale,
      answeredId: null,
    };
    if (playAudio) this.playCurrentEarPrompt();
  }

  private nextMelodyChallenge(playAudio: boolean): void {
    const diff = lifeStore.getDifficulty('singing');
    const pool = this.getMelodiesForDifficulty(diff);
    const melody = pool[Math.floor(Math.random() * pool.length)];
    const rootMidi = 60 + Math.floor(Math.random() * 5); // Do4..Mi4
    this.earMelody = {
      kind: 'melody',
      rootMidi,
      melody,
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
    } else if (this.earMode === 'scale' && this.earScale) {
      this.earScale.scale.semitones.forEach((st, idx) => {
        voiceStudio.playMidiNote(this.earScale!.rootMidi + st, 0.4, timbre, idx * 0.34, 0.2);
      });
    } else if (this.earMode === 'melody' && this.earMelody) {
      this.earMelody.melody.offsets.forEach((off, idx) => {
        voiceStudio.playMidiNote(this.earMelody!.rootMidi + off, 0.48, timbre, idx * 0.48, 0.2);
      });
    }
  }

  private startLoop(): void {
    cancelAnimationFrame(this.rafId);
    this.lastRafMs = performance.now();
    const tick = () => {
      if (!this.containerRef || (!voiceStudio.isMicActive() && !this.karaokeRunning && !this.activeDrillEval)) return;
      const now = performance.now();
      const dtMs = Math.min(100, Math.max(0, now - this.lastRafMs));
      this.lastRafMs = now;

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
      } else if (this.activeTab === 'routines') {
        this.updateRoutineVoiceChecks(reading, dtMs);
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
    const toleranceSemitones = this.getToleranceCents() / 100;

    // Conteo previo visual 3 · 2 · 1 · ¡Canta!
    const countEl = this.containerRef?.querySelector<HTMLElement>('#al-karaoke-countdown');
    if (elapsedSec < LEAD_IN_TOTAL_SEC) {
      const stepNum = Math.floor(elapsedSec / LEAD_IN_STEP_SEC) + 1; // 1, 2, 3
      const remainingCount = Math.max(1, 4 - stepNum); // 3, 2, 1
      if (countEl) {
        countEl.hidden = false;
        countEl.textContent = String(remainingCount);
      }
      if (stepNum > this.karaokeLastCountBeep) {
        this.karaokeLastCountBeep = stepNum;
        if (this.playGuideNotes || this.playChordBacking) {
          voiceStudio.playPianoNote(remainingCount === 1 ? 660 : 520, 0.12, 0, 'soft', 0.09);
        }
      }
    } else if (elapsedSec < LEAD_IN_TOTAL_SEC + 0.55) {
      if (countEl) {
        countEl.hidden = false;
        countEl.textContent = '¡Canta!';
      }
    } else if (countEl) {
      countEl.hidden = true;
    }

    // Acompañamiento armónico de acordes
    if (this.playChordBacking) {
      for (const ch of this.karaokeChords) {
        if (!ch.played && elapsedSec >= ch.startSec) {
          ch.played = true;
          voiceStudio.playChord(ch.midis, ch.durationSec, 'soft', 0.03);
        }
      }
    }

    // Guía melódica de piano
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
    if (liveEl) {
      if (elapsedSec < LEAD_IN_TOTAL_SEC) {
        const rem = Math.max(1, 3 - Math.floor(elapsedSec / LEAD_IN_STEP_SEC));
        liveEl.textContent = `Prepárate: ${rem}...`;
      } else if (this.karaokeSampleTotal > 0) {
        const pct = Math.round((this.karaokeSampleHits / this.karaokeSampleTotal) * 100);
        liveEl.textContent = `Acierto en vivo: ${pct}%`;
      } else {
        liveEl.textContent = '¡Canta ahora!';
      }
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
    const h = 162;
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
          const spb = (60 / song.bpm) / this.karaokeTempo;
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
    const maxMidi = 76 + this.transpose;
    const midiToY = (m: number) => {
      const norm = Math.max(0, Math.min(1, (m - minMidi) / (maxMidi - minMidi)));
      return h - 18 - norm * (h - 40);
    };

    const nowX = Math.round(w * 0.24);
    const pxPerSec = 105;

    // Horizontal pitch guide lines
    g.strokeStyle = isNight ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
    g.lineWidth = 1;
    for (let m = 48 + this.transpose; m <= 74 + this.transpose; m += 4) {
      const y = midiToY(m);
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }

    // Chord labels strip at top when chords are available
    if (this.karaokeRunning && this.playChordBacking) {
      g.font = '700 11px "JetBrains Mono", monospace';
      for (const ch of this.karaokeChords) {
        if (!ch.label) continue;
        const cx = nowX + (ch.startSec - nowSec) * pxPerSec;
        if (cx < -40 || cx > w) continue;
        g.fillStyle = isNight ? 'rgba(52, 211, 153, 0.85)' : 'rgba(22, 101, 52, 0.85)';
        g.fillText(ch.label, cx + 2, 13);
      }
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
    this.pauseWarmup();
    this.stopBreathing();
    this.stopKaraoke(false);
    this.activeDrillEval = null;
    this.detachKeyboardListeners();
    this.activeMidis.clear();
    voiceStudio.stopAllNotes();
    voiceStudio.stopMic();
    this.containerRef = null;
  }
}
