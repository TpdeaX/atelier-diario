import {
  DICTION_DRILLS,
  FLASHCARDS_BANK,
  ORATORY_PROMPTS,
  ORATORY_RUBRIC_ITEMS,
  OratoryPrompt,
} from '../data/FocusLabBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import { DifficultyLevel, FlashcardItem } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

type SchulteMode = 'normal' | 'inverso' | 'doble';
type RecallMode = 'repaso' | 'quiz';

const FOCUSLAB_TUTORIALS: Record<'oratory' | 'schulte' | 'recall', Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  oratory: {
    sectionName: 'Oratoria y Dicción',
    summary: 'Entrena exposiciones cronometradas con estructura, elimina muletillas y evalúa tu desempeño con rúbrica.',
    steps: [
      'Ajusta la dificultad arriba para recibir retos cortos (Básico), variados (Intermedio) o extensos (Avanzado).',
      'Lee el reto y su estructura guía antes de pulsar Iniciar práctica; el micrófono cuenta muletillas en vivo.',
      'Al terminar, marca los 5 criterios de la rúbrica y guarda tu sesión en el historial.',
      'Calienta articulación y pausas con el panel derecho de Rutina de Dicción y Voz.',
    ],
    tip: 'Cuando sientas venir un «eh» o «este», haz una pausa limpia de 1 segundo en silencio: proyecta seguridad.',
  },
  schulte: {
    sectionName: 'Tabla de Schulte',
    summary: 'Amplía tu visión periférica y velocidad de rastreo visual en modo ascendente, inverso o doble.',
    steps: [
      'Elige el modo (Normal 1→N, Inverso N→1 o Doble alternando impares ascendentes y pares descendentes) y el tamaño.',
      'Fija los ojos en el centro de la cuadrícula e intenta ubicar cada número sin mover la cabeza.',
      'El cronómetro arranca al tocar el primer número objetivo y guarda tu récord para cada combinación modo × tamaño.',
    ],
    tip: 'Mantén la respiración tranquila: apresurar la mirada salta números y añade más tiempo que avanzar parejo.',
  },
  recall: {
    sectionName: 'Evocación Activa',
    summary: 'Fija conceptos técnicos y personales con recuperación activa SM-2 o modo Quiz de opción múltiple.',
    steps: [
      'Filtra por mazo arriba o elige Todos para intercalar temas distintos y revisar tu progreso por mazo.',
      'En modo Repaso SM-2, escribe tu evocación (se auto-guarda) antes de revelar la respuesta y calificar.',
      'En modo Quiz, elige la respuesta correcta entre distractores reales del mismo mazo.',
      'Pulsa Nueva tarjeta para añadir preguntas propias de tus cursos o lecturas.',
    ],
    tip: 'Esforzarte 10 segundos en recordar antes de mirar la respuesta es lo que realmente consolida la memoria.',
  },
};

const FILLER_PATTERNS: { key: string; label: string; regex: RegExp }[] = [
  { key: 'eh', label: 'eh / ehh', regex: /\b(?:eh+|emm+)\b/gi },
  { key: 'este', label: 'este...', regex: /\beste\b/gi },
  { key: 'osea', label: 'o sea', regex: /\bo sea\b/gi },
  { key: 'tipo', label: 'tipo', regex: /\btipo\b/gi },
  { key: 'bueno', label: 'bueno / pues', regex: /\b(?:bueno|pues)\b/gi },
];

const SCHULTE_MODE_META: Record<SchulteMode, { label: string; desc: string }> = {
  normal: {
    label: 'Normal (1→N)',
    desc: 'Encuentra los números en orden ascendente del 1 al máximo.',
  },
  inverso: {
    label: 'Inverso (N→1)',
    desc: 'Recorre el tablero en orden descendente desde el número mayor hasta el 1.',
  },
  doble: {
    label: 'Doble (Impar ↑ / Par ↓)',
    desc: 'Alterna impares ascendentes (1, 3, 5...) con pares descendentes (máx. par... 4, 2).',
  },
};

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function shuffleNumbers(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSchulteSequence(mode: SchulteMode, total: number): number[] {
  if (mode === 'normal') {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (mode === 'inverso') {
    return Array.from({ length: total }, (_, i) => total - i);
  }
  // doble: interleave odd ascending (1, 3, 5...) with even descending (maxEven, maxEven-2, ..., 2)
  const odds: number[] = [];
  const evens: number[] = [];
  for (let i = 1; i <= total; i++) {
    if (i % 2 === 1) odds.push(i);
    else evens.push(i);
  }
  evens.reverse();
  const seq: number[] = [];
  const maxLen = Math.max(odds.length, evens.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < odds.length) seq.push(odds[i]);
    if (i < evens.length) seq.push(evens[i]);
  }
  return seq;
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class FocusLabView {
  private hydrated = false;
  private promptIdx = 0;
  private drillIdx = 0;
  private speakingRunning = false;
  private speakingRemaining = 45;
  private speakingElapsed = 0;
  private speakingTimer = 0;
  private fillerCounts: Record<string, number> = { eh: 0, este: 0, osea: 0, tipo: 0, bueno: 0 };
  private transcriptText = '';
  private speechRec: { stop?: () => void } | null = null;
  private micStatus = '';
  private rubricChecked = new Set<string>();
  private lastOratorySavedNote = '';

  // Tabla de Schulte
  private schulteNumbers: number[] = [];
  private schulteSequence: number[] = [];
  private schulteStepIdx = 0;
  private schulteFound = new Set<number>();
  private schulteErrors = 0;
  private schulteStartMs = 0;
  private schulteElapsedMs = 0;
  private schulteDone = false;
  private schulteInterval = 0;
  private schulteBoardSize: 4 | 5 | 6 = 5;
  private schulteBoardMode: SchulteMode = 'normal';

  // Evocación activa
  private recallIdx = 0;
  private recallRevealed = false;
  private recallDraft = '';
  private recallDraftCardId = '';
  private addCardOpen = false;
  private extraPractice = false;
  private quizSelectedIdx: number | null = null;
  private quizCorrectCount = 0;
  private quizTotalCount = 0;

  private hydrate(): void {
    if (this.hydrated) return;
    this.hydrated = true;
    const pr = lifeStore.get().progress.focuslab;
    const prefs = lifeStore.get().modulePrefs.focuslab;
    this.promptIdx = Math.max(0, pr.promptIdx || 0);
    this.drillIdx = Math.max(0, pr.drillIdx || 0);
    const activePrompt = this.getActivePrompt();
    this.speakingRemaining = activePrompt.durationSec;
    this.initSchulteBoard(prefs.schulteSize, pr.schulteMode || 'normal');
  }

  private initSchulteBoard(size: 4 | 5 | 6, mode: SchulteMode): void {
    if (this.schulteInterval) {
      window.clearInterval(this.schulteInterval);
      this.schulteInterval = 0;
    }
    this.schulteBoardSize = size;
    this.schulteBoardMode = mode;
    const total = size * size;
    this.schulteNumbers = shuffleNumbers(total);
    this.schulteSequence = buildSchulteSequence(mode, total);
    this.schulteStepIdx = 0;
    this.schulteFound.clear();
    this.schulteErrors = 0;
    this.schulteStartMs = 0;
    this.schulteElapsedMs = 0;
    this.schulteDone = false;
  }

  private getPromptsForDifficulty(diff: DifficultyLevel): OratoryPrompt[] {
    if (diff === 'basico') {
      const short = ORATORY_PROMPTS.filter((p) => p.durationSec <= 45);
      return short.length > 0 ? short : ORATORY_PROMPTS;
    }
    if (diff === 'avanzado') {
      const long = ORATORY_PROMPTS.filter((p) => p.durationSec >= 50);
      return long.length > 0 ? long : ORATORY_PROMPTS;
    }
    return ORATORY_PROMPTS;
  }

  private getActivePrompt(): OratoryPrompt {
    const diff = lifeStore.getDifficulty('focuslab');
    const pool = this.getPromptsForDifficulty(diff);
    return pool[this.promptIdx % pool.length];
  }

  public unmount(): void {
    this.stopSpeaking();
    if (this.schulteInterval) {
      window.clearInterval(this.schulteInterval);
      this.schulteInterval = 0;
    }
  }

  private stopSpeaking(): void {
    this.speakingRunning = false;
    if (this.speakingTimer) {
      window.clearInterval(this.speakingTimer);
      this.speakingTimer = 0;
    }
    if (this.speechRec && typeof this.speechRec.stop === 'function') {
      try {
        this.speechRec.stop();
      } catch {
        // Ignore stop error
      }
    }
    this.speechRec = null;
  }

  private getAllCards(): FlashcardItem[] {
    return [...lifeStore.get().customFlashcards, ...FLASHCARDS_BANK];
  }

  private buildQuizOptions(card: FlashcardItem, deckCards: FlashcardItem[], allCards: FlashcardItem[]): { text: string; isCorrect: boolean }[] {
    const sameDeckPool = deckCards.filter((c) => c.id !== card.id && c.back.trim() !== card.back.trim());
    const otherPool = allCards.filter((c) => c.id !== card.id && c.deck !== card.deck && c.back.trim() !== card.back.trim());
    const combined = [...sameDeckPool, ...otherPool];

    // Deterministic order per card id so UI stays stable on re-render
    const seed = hashSeed(card.id);
    const ranked = combined
      .map((c) => ({ c, score: hashSeed(`${seed}:${c.id}`) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((x) => ({ text: x.c.back, isCorrect: false }));

    const opts = [{ text: card.back, isCorrect: true }, ...ranked];
    return opts
      .map((o, idx) => ({ o, k: hashSeed(`${card.id}:opt:${idx}:${o.text.slice(0, 12)}`) }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.o);
  }

  private renderOratoryTab(): string {
    const diff = lifeStore.getDifficulty('focuslab');
    const pool = this.getPromptsForDifficulty(diff);
    const prompt = pool[this.promptIdx % pool.length];
    const drill = DICTION_DRILLS[this.drillIdx % DICTION_DRILLS.length];
    const totalFillers = Object.values(this.fillerCounts).reduce((a, b) => a + b, 0);
    const wordsCount = this.transcriptText.trim() ? this.transcriptText.trim().split(/\s+/).length : 0;
    const wpm = this.speakingElapsed >= 5 ? Math.round((wordsCount / this.speakingElapsed) * 60) : 0;
    const history = lifeStore.get().progress.focuslab.oratoryHistory;
    const rubricScore = this.rubricChecked.size;

    return `
      <div class="al-two-col">
        <section class="al-panel al-focus-card">
          <div class="al-card-head">
            <h2>Simulador de Exposición y Muletillas</h2>
            <button type="button" class="al-btn al-btn-sm" id="fl-next-prompt">${Icons.refresh(14)}<span>Otro reto</span></button>
          </div>
          <div class="al-fl-prompt-box">
            <span class="al-mono-pill">${prompt.durationSec}s · Reto ${(this.promptIdx % pool.length) + 1}/${pool.length} · ${difficultyLabel(diff)}</span>
            <h3>${esc(prompt.title)}</h3>
            <p>${esc(prompt.prompt)}</p>
            <div class="al-fl-framework"><strong>Estructura:</strong> ${esc(prompt.framework)}</div>
          </div>

          <div class="al-fl-clock-row">
            <div class="al-fl-clock" id="fl-speaking-clock">${String(Math.floor(this.speakingRemaining / 60)).padStart(2, '0')}:${String(this.speakingRemaining % 60).padStart(2, '0')}</div>
            <div class="al-tool-group">
              <button type="button" class="al-btn al-btn-primary" id="fl-speak-toggle">
                ${Icons.mic(15)}<span>${this.speakingRunning ? 'Detener y registrar' : 'Iniciar práctica'}</span>
              </button>
              <button type="button" class="al-btn" id="fl-speak-reset">Reiniciar</button>
            </div>
          </div>

          ${this.micStatus ? `<p class="al-muted" style="margin:6px 0 0;">${esc(this.micStatus)}</p>` : ''}

          <div class="al-fl-filler-row">
            <div class="al-card-head" style="margin-bottom:6px;">
              <strong>Destructor de muletillas (toca si se te escapa una):</strong>
              <span class="al-mono-pill">Total: ${totalFillers}${wpm > 0 ? ` · ${wpm} PPM` : ''}</span>
            </div>
            <div class="al-tool-group">
              ${FILLER_PATTERNS.map(
                (f) => `
                <button type="button" class="al-seg-btn" data-filler-tap="${f.key}">
                  +1 ${f.label} (${this.fillerCounts[f.key] ?? 0})
                </button>`
              ).join('')}
            </div>
          </div>

          ${
            this.transcriptText
              ? `<div class="al-fl-transcript"><strong>Transcripción detectada:</strong> ${esc(this.transcriptText)}</div>`
              : ''
          }

          <div class="al-fl-filler-row">
            <div class="al-card-head" style="margin-bottom:6px;">
              <strong>Autorrúbrica de exposición (5 criterios)</strong>
              <span class="al-mastery-badge ${rubricScore < 3 ? 'is-warn' : ''}">${rubricScore}/${ORATORY_RUBRIC_ITEMS.length} cumplidos</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${ORATORY_RUBRIC_ITEMS.map((item) => {
                const checked = this.rubricChecked.has(item.id);
                return `
                  <label class="al-inline-check" style="align-items:flex-start; gap:8px; cursor:pointer;">
                    <input type="checkbox" data-rubric-id="${item.id}" ${checked ? 'checked' : ''} />
                    <span style="font-size:0.86rem;">${esc(item.label)}</span>
                  </label>`;
              }).join('')}
            </div>
            <div class="al-tool-group" style="margin-top:10px;">
              <button type="button" class="al-btn al-btn-primary al-btn-sm" id="fl-save-oratory">
                ${Icons.check(14)}<span>Guardar sesión con rúbrica (${rubricScore}/5)</span>
              </button>
              ${this.lastOratorySavedNote ? `<span class="al-muted" style="font-size:0.82rem;">${esc(this.lastOratorySavedNote)}</span>` : ''}
            </div>
          </div>
        </section>

        <div style="display:flex; flex-direction:column; gap:14px;">
          <section class="al-panel al-focus-card">
            <div class="al-card-head">
              <h2>Rutina de Dicción y Voz (${(this.drillIdx % DICTION_DRILLS.length) + 1}/${DICTION_DRILLS.length})</h2>
              <button type="button" class="al-btn al-btn-sm" id="fl-next-drill">${Icons.refresh(14)}<span>Otra rutina</span></button>
            </div>
            <h3 style="margin:0 0 8px;">${esc(drill.title)}</h3>
            <ol class="al-fl-steps">
              ${drill.steps.map((s) => `<li>${esc(s)}</li>`).join('')}
            </ol>
            <blockquote class="al-quote-mini" style="margin-top:12px;">«${esc(drill.sampleText)}»</blockquote>
            <p class="al-muted" style="margin-top:10px;">
              Tip: si te trabas, haz una pausa limpia de 1–2 segundos en silencio; el silencio proyecta control, la muletilla proyecta duda.
            </p>
          </section>

          <section class="al-panel al-focus-card">
            <div class="al-card-head">
              <h2>Historial reciente de exposiciones</h2>
              <span class="al-mono-pill">${history.length} guardadas</span>
            </div>
            ${
              history.length === 0
                ? '<p class="al-muted" style="margin:0;">Completa una práctica o guarda tu rúbrica para ver tu evolución en muletillas y claridad.</p>'
                : `<div class="al-study-grid" style="margin-top:4px;">
                    ${history
                      .slice(0, 6)
                      .map(
                        (h) => `
                        <div class="al-study-card ${h.rubricScore >= 4 ? 'is-done' : ''}">
                          <strong style="font-size:0.88rem;">${esc(h.title)}</strong>
                          <div class="al-step-bar" style="margin-top:2px;">
                            <span class="al-mastery-badge ${h.rubricScore < 3 ? 'is-warn' : ''}">Rúbrica: ${h.rubricScore}/5</span>
                            <span class="al-mastery-badge ${h.fillers > 3 ? 'is-warn' : ''}">Muletillas: ${h.fillers}</span>
                          </div>
                          <small class="al-muted">${h.durationSec}s · ${new Date(h.at).toLocaleDateString('es-ES')}</small>
                        </div>`
                      )
                      .join('')}
                  </div>`
            }
          </section>
        </div>
      </div>
    `;
  }

  private renderSchulteTab(): string {
    const profile = lifeStore.get();
    const size = profile.modulePrefs.focuslab.schulteSize;
    const mode = profile.progress.focuslab.schulteMode || 'normal';
    const total = size * size;

    if (
      this.schulteBoardSize !== size ||
      this.schulteBoardMode !== mode ||
      this.schulteNumbers.length !== total
    ) {
      this.initSchulteBoard(size, mode);
    }

    const secStr = (this.schulteElapsedMs / 1000).toFixed(2);
    const bestKey = `${mode}_${size}x${size}`;
    const bestMs = profile.progress.focuslab.schulteBestByKey[bestKey];
    const bestStr = bestMs !== undefined ? `${(bestMs / 1000).toFixed(2)} s` : 'Sin marca';
    const nextTarget = this.schulteSequence[this.schulteStepIdx];
    const nextHint = this.schulteDone
      ? 'Completado'
      : mode === 'doble'
        ? `${nextTarget} (${nextTarget % 2 === 1 ? 'Impar ↑' : 'Par ↓'})`
        : String(nextTarget);

    const savedRecords = Object.entries(profile.progress.focuslab.schulteBestByKey);

    return `
      <div class="al-panel al-fl-schulte-wrap">
        <div class="al-card-head">
          <div>
            <h2>Tabla de Schulte · Atención y Visión Periférica</h2>
            <p class="al-muted">${SCHULTE_MODE_META[mode].desc}</p>
          </div>
          <div class="al-tool-group">
            <div class="al-seg-tabs" role="group" aria-label="Tamaño de cuadrícula">
              ${([4, 5, 6] as const)
                .map(
                  (sz) => `<button type="button" class="al-seg-btn ${size === sz ? 'is-active' : ''}" data-schulte-size="${sz}">${sz}×${sz}</button>`
                )
                .join('')}
            </div>
            <button type="button" class="al-btn al-btn-primary" id="fl-schulte-reset">${Icons.refresh(15)}<span>Nuevo tablero</span></button>
          </div>
        </div>

        <div class="al-seg-tabs" role="group" aria-label="Modo de Tabla de Schulte">
          ${(['normal', 'inverso', 'doble'] as SchulteMode[])
            .map(
              (m) =>
                `<button type="button" class="al-seg-btn ${mode === m ? 'is-active' : ''}" data-schulte-mode="${m}">${SCHULTE_MODE_META[m].label}</button>`
            )
            .join('')}
        </div>

        <div class="al-fl-schulte-stats">
          <span class="al-mono-pill">Siguiente: <strong>${nextHint}</strong></span>
          <span class="al-mono-pill">Avance: <strong>${this.schulteStepIdx}/${total}</strong></span>
          <span class="al-mono-pill" id="fl-schulte-timer">Tiempo: <strong>${secStr} s</strong></span>
          <span class="al-mono-pill">Errores: <strong>${this.schulteErrors}</strong></span>
          <span class="al-mastery-badge">Récord ${SCHULTE_MODE_META[mode].label.split(' ')[0]} ${size}×${size}: ${bestStr}</span>
        </div>

        ${
          mode === 'doble'
            ? `<div class="al-step-bar">
                <span class="al-step-pill ${!this.schulteDone && nextTarget % 2 === 1 ? 'is-active' : ''}">Impares: 1 → ${total % 2 === 1 ? total : total - 1} (tono verde)</span>
                <span class="al-step-pill ${!this.schulteDone && nextTarget % 2 === 0 ? 'is-active' : ''}">Pares: ${total % 2 === 0 ? total : total - 1} → 2 (tono ámbar)</span>
              </div>`
            : ''
        }

        <div class="al-schulte-grid" style="grid-template-columns: repeat(${size}, minmax(0, 1fr));">
          ${this.schulteNumbers
            .map((num) => {
              const found = this.schulteFound.has(num) || this.schulteDone;
              const dualStyle =
                mode === 'doble' && !found
                  ? num % 2 === 1
                    ? 'border-color: rgba(20, 125, 88, 0.55);'
                    : 'border-color: rgba(180, 83, 9, 0.55); background: rgba(180, 83, 9, 0.08);'
                  : '';
              return `<button type="button" class="al-schulte-cell ${found ? 'is-found' : ''}" style="${dualStyle}" data-schulte-num="${num}">${num}</button>`;
            })
            .join('')}
        </div>

        ${
          savedRecords.length > 0
            ? `<div class="al-step-bar" style="margin-top:6px;">
                <span class="al-muted" style="font-size:0.8rem;">Tus mejores marcas guardadas:</span>
                ${savedRecords
                  .map(([k, ms]) => {
                    const [m, sz] = k.split('_');
                    const mLabel = m === 'normal' ? 'Normal' : m === 'inverso' ? 'Inverso' : 'Doble';
                    return `<span class="al-step-pill ${k === bestKey ? 'is-done' : ''}">${mLabel} ${sz}: ${(ms / 1000).toFixed(2)}s</span>`;
                  })
                  .join('')}
              </div>`
            : ''
        }
      </div>
    `;
  }

  private renderRecallTab(): string {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.focuslab;
    const pr = profile.progress.focuslab;
    const recallMode: RecallMode = pr.recallMode || 'repaso';
    const allCards = this.getAllCards();
    const decks = Array.from(new Set(allCards.map((c) => c.deck)));

    const filtered = prefs.recallDeck === 'all' ? allCards : allCards.filter((c) => c.deck === prefs.recallDeck);
    const now = Date.now();
    const dueCards = filtered.filter((c) => {
      const prog = profile.flashcardProgress[c.id];
      return !prog || prog.nextReviewAt <= now;
    });
    const masteredInDeck = filtered.filter((c) => {
      const prog = profile.flashcardProgress[c.id];
      return prog && prog.nextReviewAt > now;
    }).length;
    const deckPct = filtered.length > 0 ? Math.round((masteredInDeck / filtered.length) * 100) : 0;

    const allCaughtUp = dueCards.length === 0 && filtered.length > 0;
    const activePool = dueCards.length > 0 ? dueCards : filtered;
    const card = activePool[this.recallIdx % Math.max(1, activePool.length)];
    const prog = card ? profile.flashcardProgress[card.id] : undefined;

    // Hydrate saved draft for current card
    if (card && this.recallDraftCardId !== card.id) {
      this.recallDraftCardId = card.id;
      this.recallDraft = pr.recallDrafts[card.id] ?? '';
      this.quizSelectedIdx = null;
    }

    const quizOptions = card && recallMode === 'quiz' ? this.buildQuizOptions(card, filtered, allCards) : [];

    return `
      <div class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Evocación Activa (SM-2 + Quiz de Opción Múltiple)</h2>
            <p class="al-muted">${dueCards.length} pendientes ahora · ${masteredInDeck}/${filtered.length} al día en este mazo · ${profile.stats.recallReviewed} repasos totales</p>
          </div>
          <div class="al-tool-group">
            <div class="al-seg-tabs" role="group" aria-label="Modo de evocación">
              <button type="button" class="al-seg-btn ${recallMode === 'repaso' ? 'is-active' : ''}" data-recall-mode="repaso">Repaso SM-2</button>
              <button type="button" class="al-seg-btn ${recallMode === 'quiz' ? 'is-active' : ''}" data-recall-mode="quiz">Modo Quiz</button>
            </div>
            <button type="button" class="al-btn al-btn-primary" id="fl-add-card-toggle">${Icons.plus(15)}<span>Nueva tarjeta</span></button>
          </div>
        </div>

        <div class="al-didactic-progress" style="margin:10px 0 12px;">
          <div class="al-didactic-prog-head">
            <span class="al-didactic-label">Dominio del mazo: ${esc(prefs.recallDeck === 'all' ? 'Todos los mazos' : prefs.recallDeck)}</span>
            <strong class="al-didactic-pct">${deckPct}% (${masteredInDeck}/${filtered.length})</strong>
          </div>
          <progress class="al-didactic-meter" value="${deckPct}" max="100"></progress>
        </div>

        ${
          this.addCardOpen
            ? `
          <form id="fl-add-card-form" class="al-vault-form-stack" style="margin:12px 0; padding:12px; border:1px solid var(--border-subtle); border-radius:12px;">
            <div class="al-form-grid-3">
              <label><span>Curso o mazo</span><input type="text" id="fl-fc-deck" value="${esc(prefs.recallDeck === 'all' ? 'Sistemas Distribuidos' : prefs.recallDeck)}" required /></label>
              <label><span>Pregunta / Concepto</span><input type="text" id="fl-fc-front" placeholder="Ej. ¿Qué garantiza la propiedad de idempotencia?" required /></label>
              <label><span>Respuesta clave</span><input type="text" id="fl-fc-back" placeholder="Ejecutar N veces produce el mismo efecto que 1 vez." required /></label>
            </div>
            <div class="al-tool-group">
              <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar tarjeta</span></button>
              <button type="button" class="al-btn" id="fl-add-card-cancel">Cancelar</button>
            </div>
          </form>
        `
            : ''
        }

        <div class="al-seg-tabs" style="margin: 12px 0;">
          <button type="button" class="al-seg-btn ${prefs.recallDeck === 'all' ? 'is-active' : ''}" data-deck="all">Todos (${allCards.length})</button>
          ${decks
            .map((d) => {
              const dCards = allCards.filter((c) => c.deck === d);
              const dDue = dCards.filter((c) => {
                const p = profile.flashcardProgress[c.id];
                return !p || p.nextReviewAt <= now;
              }).length;
              return `<button type="button" class="al-seg-btn ${prefs.recallDeck === d ? 'is-active' : ''}" data-deck="${esc(d)}">${esc(d)} (${dDue}/${dCards.length})</button>`;
            })
            .join('')}
        </div>

        ${
          allCaughtUp && !this.extraPractice
            ? `
          <div class="al-study-card is-done" style="padding:18px; margin-top:10px;">
            <div class="al-card-head">
              <div>
                <span class="al-mastery-badge">${Icons.check(13)} Mazo al día hoy</span>
                <h3 style="margin:8px 0 4px;">Has completado todos los repasos pendientes de este mazo</h3>
                <p class="al-muted" style="margin:0;">Tus ${filtered.length} tarjetas tienen su próximo repaso espaciado programado automáticamente. Puedes cambiar de mazo o practicar extra si deseas reforzar.</p>
              </div>
              <button type="button" class="al-btn al-btn-primary" id="fl-extra-practice">
                ${Icons.refresh(15)}<span>Seguir practicando extra</span>
              </button>
            </div>
          </div>
        `
            : card
              ? `
          ${
            allCaughtUp
              ? `<div class="al-step-bar" style="margin-bottom:10px;">
                  <span class="al-mastery-badge">${Icons.check(12)} Mazo al día hoy · Práctica extra</span>
                </div>`
              : ''
          }
          <div class="al-fl-recall-card">
            <div class="al-card-head">
              <span class="al-mono-pill">${esc(card.deck)}${card.source ? ` · ${esc(card.source)}` : ''}</span>
              <div class="al-tool-group">
                ${recallMode === 'quiz' ? `<span class="al-mono-pill">Quiz: ${this.quizCorrectCount}/${this.quizTotalCount}</span>` : ''}
                ${prog ? `<span class="al-mono-pill">Intervalo: ${prog.intervalDays}d</span>` : '<span class="al-mono-pill">Nueva</span>'}
                ${card.isCustom ? `<button type="button" class="al-icon-btn" id="fl-del-card" data-card-id="${esc(card.id)}" title="Eliminar tarjeta">${Icons.trash(14)}</button>` : ''}
              </div>
            </div>
            <h3 class="al-fl-recall-front">${esc(card.front)}</h3>

            ${
              recallMode === 'repaso'
                ? `
              <label style="display:block; margin:10px 0;">
                <span class="al-muted" style="font-size:0.8rem;">Tu evocación antes de ver la respuesta (se auto-guarda por tarjeta):</span>
                <textarea id="fl-recall-draft" class="al-inline-note" style="margin-top:4px;" placeholder="Escribe brevemente lo que recuerdas...">${esc(this.recallDraft)}</textarea>
              </label>

              ${
                this.recallRevealed
                  ? `
                <div class="al-fl-recall-back">
                  <strong>Respuesta clave:</strong>
                  <p>${esc(card.back)}</p>
                </div>
                <div class="al-tool-group" style="margin-top:12px;">
                  <button type="button" class="al-btn" data-rate="again">Repasar en 10 min</button>
                  <button type="button" class="al-btn" data-rate="good">Bien (+2 días)</button>
                  <button type="button" class="al-btn al-btn-primary" data-rate="easy">Dominado (+5 días)</button>
                </div>
              `
                  : `
                <div class="al-tool-group" style="margin-top:10px;">
                  <button type="button" class="al-btn al-btn-primary" id="fl-reveal-answer">${Icons.eye(15)}<span>Mostrar respuesta</span></button>
                  <button type="button" class="al-btn" id="fl-skip-card">Siguiente</button>
                </div>
              `
              }
            `
                : `
              <div class="al-study-grid" style="margin-top:10px;">
                ${quizOptions
                  .map((opt, idx) => {
                    const answered = this.quizSelectedIdx !== null;
                    const chosen = this.quizSelectedIdx === idx;
                    let cls = 'al-btn';
                    if (answered) {
                      if (opt.isCorrect) cls = 'al-btn al-btn-primary';
                      else if (chosen) cls = 'al-btn al-btn-danger';
                    }
                    return `
                      <button
                        type="button"
                        class="${cls}"
                        style="text-align:left; white-space:normal; height:auto; padding:10px 12px; justify-content:flex-start;"
                        data-quiz-opt="${idx}"
                        data-quiz-ok="${opt.isCorrect ? '1' : '0'}"
                        ${answered ? 'disabled' : ''}
                      >
                        <span><strong>${String.fromCharCode(65 + idx)}.</strong> ${esc(opt.text)}</span>
                      </button>`;
                  })
                  .join('')}
              </div>
              ${
                this.quizSelectedIdx !== null
                  ? `
                <div class="al-fl-recall-back" style="margin-top:12px;">
                  <strong>${quizOptions[this.quizSelectedIdx]?.isCorrect ? 'Correcto. Repaso registrado como Bien (+2 días).' : 'Respuesta incorrecta. Programada para repasar en 10 min.'}</strong>
                  <p>${esc(card.back)}</p>
                </div>
                <div class="al-tool-group" style="margin-top:10px;">
                  <button type="button" class="al-btn al-btn-primary" id="fl-quiz-next">Siguiente pregunta</button>
                </div>
              `
                  : `
                <div class="al-tool-group" style="margin-top:10px;">
                  <button type="button" class="al-btn" id="fl-skip-card">Saltar pregunta</button>
                </div>
              `
              }
            `
            }
          </div>
        `
              : '<p class="al-muted">No hay tarjetas en este mazo.</p>'
        }
      </div>
    `;
  }

  public render(container: HTMLElement): void {
    this.hydrate();
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.focuslab;
    const pr = profile.progress.focuslab;
    const summary = lifeStore.getOverallMasterySummary();
    const best5Txt = profile.stats.schulteBestMs !== null ? `${(profile.stats.schulteBestMs / 1000).toFixed(1)}s` : '—';
    const schulteRecordsCount = Object.keys(pr.schulteBestByKey).length;

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #0F766E; --mod-c2: #2DD4BF;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #0F766E; --em-c2: #2DD4BF;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.mic(20)}</span>
            </div>
            <div>
              <h1>Oratoria, Atención y Evocación</h1>
              <p>Destruye muletillas con autorrúbrica, entrena visión periférica con Schulte multimodo y consolida cursos con Active Recall.</p>
            </div>
          </div>
          <div class="al-mono-pill">Oratoria: ${profile.stats.oratorySessions} · Schulte: ${best5Txt} · Recall: ${profile.stats.recallReviewed}</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'focuslab',
          progressLabel: 'Dominio de Oratoria y Enfoque',
          progressPct: summary.byModule.focuslab,
          progressDetail: `${pr.oratoryHistory.length} exposiciones evaluadas · ${schulteRecordsCount} marcas Schulte · ${profile.stats.recallReviewed} repasos`,
          extraMetric: `Récord 5×5: ${best5Txt}`,
          difficultyHints: {
            basico: 'Prompts cortos (≤45s), Schulte 4×4 normal y repaso espaciado guiado.',
            intermedio: 'Catálogo estándar de oratoria, Schulte 5×5 y repaso activo.',
            avanzado: 'Prompts largos (≥50s), Schulte 6×6 o inverso y modo Quiz.',
          },
        })}

        <div class="al-toolbar">
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${prefs.tab === 'oratory' ? 'is-active' : ''}" data-fltab="oratory">Oratoria y Dicción (${ORATORY_PROMPTS.length})</button>
            <button type="button" class="al-seg-btn ${prefs.tab === 'schulte' ? 'is-active' : ''}" data-fltab="schulte">Tabla de Schulte</button>
            <button type="button" class="al-seg-btn ${prefs.tab === 'recall' ? 'is-active' : ''}" data-fltab="recall">Evocación Activa (${this.getAllCards().length})</button>
          </div>
        </div>

        ${renderTutorialBanner({
          id: `focuslab:${prefs.tab}`,
          moduleName: 'Oratoria y Enfoque',
          ...(FOCUSLAB_TUTORIALS[prefs.tab] ?? FOCUSLAB_TUTORIALS.oratory),
        })}

        ${
          prefs.tab === 'oratory'
            ? this.renderOratoryTab()
            : prefs.tab === 'schulte'
              ? this.renderSchulteTab()
              : this.renderRecallTab()
        }
      </div>
    `;

    bindDidacticBar(container, 'focuslab', (next) => {
      this.stopSpeaking();
      if (next === 'basico') {
        lifeStore.updateModulePrefs('focuslab', { schulteSize: 4 });
        lifeStore.updateProgress('focuslab', { schulteMode: 'normal', recallMode: 'repaso' });
        this.initSchulteBoard(4, 'normal');
      } else if (next === 'intermedio') {
        lifeStore.updateModulePrefs('focuslab', { schulteSize: 5 });
        lifeStore.updateProgress('focuslab', { schulteMode: 'normal' });
        this.initSchulteBoard(5, 'normal');
      } else {
        lifeStore.updateModulePrefs('focuslab', { schulteSize: 6 });
        lifeStore.updateProgress('focuslab', { schulteMode: 'inverso', recallMode: 'quiz' });
        this.initSchulteBoard(6, 'inverso');
      }
      const nextP = this.getActivePrompt();
      this.speakingRemaining = nextP.durationSec;
      this.speakingElapsed = 0;
      this.render(container);
    });

    bindTutorialBanners(container);

    container.querySelectorAll<HTMLButtonElement>('[data-fltab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (prefs.tab === 'oratory') this.stopSpeaking();
        lifeStore.updateModulePrefs('focuslab', {
          tab: btn.dataset.fltab as 'oratory' | 'schulte' | 'recall',
        });
        this.render(container);
      });
    });

    if (prefs.tab === 'oratory') {
      this.bindOratoryEvents(container);
    } else if (prefs.tab === 'schulte') {
      this.bindSchulteEvents(container);
    } else {
      this.bindRecallEvents(container);
    }
  }

  private bindOratoryEvents(container: HTMLElement): void {
    const diff = lifeStore.getDifficulty('focuslab');
    const pool = this.getPromptsForDifficulty(diff);
    const prompt = pool[this.promptIdx % pool.length];

    const recordCurrentOratory = (reason: string) => {
      const totalFillers = Object.values(this.fillerCounts).reduce((a, b) => a + b, 0);
      lifeStore.recordOratoryHistory({
        promptId: prompt.id,
        title: prompt.title,
        durationSec: this.speakingElapsed > 0 ? this.speakingElapsed : prompt.durationSec,
        fillers: totalFillers,
        rubricScore: this.rubricChecked.size,
      });
      this.lastOratorySavedNote = reason;
    };

    container.querySelector('#fl-next-prompt')?.addEventListener('click', () => {
      this.stopSpeaking();
      this.promptIdx = (this.promptIdx + 1) % pool.length;
      lifeStore.updateProgress('focuslab', { promptIdx: this.promptIdx });
      const nextP = pool[this.promptIdx % pool.length];
      this.speakingRemaining = nextP.durationSec;
      this.speakingElapsed = 0;
      this.transcriptText = '';
      this.fillerCounts = { eh: 0, este: 0, osea: 0, tipo: 0, bueno: 0 };
      this.rubricChecked.clear();
      this.lastOratorySavedNote = '';
      this.render(container);
    });

    container.querySelector('#fl-next-drill')?.addEventListener('click', () => {
      this.drillIdx = (this.drillIdx + 1) % DICTION_DRILLS.length;
      lifeStore.updateProgress('focuslab', { drillIdx: this.drillIdx });
      this.render(container);
    });

    container.querySelector('#fl-speak-reset')?.addEventListener('click', () => {
      this.stopSpeaking();
      this.speakingRemaining = prompt.durationSec;
      this.speakingElapsed = 0;
      this.transcriptText = '';
      this.micStatus = '';
      this.lastOratorySavedNote = '';
      this.fillerCounts = { eh: 0, este: 0, osea: 0, tipo: 0, bueno: 0 };
      this.rubricChecked.clear();
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-filler-tap]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.fillerTap!;
        this.fillerCounts[key] = (this.fillerCounts[key] ?? 0) + 1;
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLInputElement>('[data-rubric-id]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.rubricId!;
        if (cb.checked) this.rubricChecked.add(id);
        else this.rubricChecked.delete(id);
        this.render(container);
      });
    });

    container.querySelector('#fl-save-oratory')?.addEventListener('click', () => {
      if (this.speakingRunning) this.stopSpeaking();
      recordCurrentOratory('Sesión y rúbrica guardadas en historial.');
      this.micStatus = 'Sesión registrada con autorrúbrica.';
      this.render(container);
    });

    container.querySelector('#fl-speak-toggle')?.addEventListener('click', () => {
      if (this.speakingRunning) {
        this.stopSpeaking();
        recordCurrentOratory('Sesión detenida y guardada.');
        this.micStatus = 'Sesión registrada. Puedes ajustar tu rúbrica y guardar de nuevo si lo deseas.';
        this.render(container);
        return;
      }

      if (this.speakingRemaining <= 0) {
        this.speakingRemaining = prompt.durationSec;
        this.speakingElapsed = 0;
      }
      this.speakingRunning = true;
      this.lastOratorySavedNote = '';
      this.micStatus = 'Cronómetro activo.';

      const win = window as unknown as {
        SpeechRecognition?: new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        };
        webkitSpeechRecognition?: new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        };
      };
      const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechCtor) {
        try {
          const rec = new SpeechCtor();
          rec.lang = 'es-PE';
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (ev) => {
            let full = '';
            for (let i = 0; i < ev.results.length; i++) {
              full += ' ' + ev.results[i][0].transcript;
            }
            this.transcriptText = full.trim();
            for (const f of FILLER_PATTERNS) {
              const matches = this.transcriptText.match(f.regex);
              if (matches) this.fillerCounts[f.key] = matches.length;
            }
          };
          rec.onerror = () => {
            this.micStatus = 'Sin micrófono activo (usa los contadores táctiles de muletillas).';
          };
          rec.start();
          this.speechRec = rec;
          this.micStatus = 'Escuchando en español y contando muletillas en vivo...';
        } catch {
          this.micStatus = 'Cronómetro activo (contador manual de muletillas disponible).';
        }
      } else {
        this.micStatus = 'Tu navegador no soporta dictado en vivo; usa el cronómetro y los botones +1 muletilla.';
      }

      this.speakingTimer = window.setInterval(() => {
        this.speakingElapsed += 1;
        this.speakingRemaining = Math.max(0, this.speakingRemaining - 1);
        const clockEl = container.querySelector('#fl-speaking-clock');
        if (clockEl) {
          clockEl.textContent = `${String(Math.floor(this.speakingRemaining / 60)).padStart(2, '0')}:${String(this.speakingRemaining % 60).padStart(2, '0')}`;
        }
        if (this.speakingRemaining <= 0) {
          this.stopSpeaking();
          recordCurrentOratory('Tiempo completado y registrado.');
          this.micStatus = 'Tiempo completado. Sesión guardada en tu historial.';
          this.render(container);
        }
      }, 1000);

      this.render(container);
    });
  }

  private bindSchulteEvents(container: HTMLElement): void {
    const profile = lifeStore.get();
    const size = profile.modulePrefs.focuslab.schulteSize;
    const mode = profile.progress.focuslab.schulteMode || 'normal';

    container.querySelectorAll<HTMLButtonElement>('[data-schulte-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextSz = Number(btn.dataset.schulteSize) as 4 | 5 | 6;
        lifeStore.updateModulePrefs('focuslab', { schulteSize: nextSz });
        this.initSchulteBoard(nextSz, mode);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-schulte-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.schulteMode as SchulteMode;
        lifeStore.updateProgress('focuslab', { schulteMode: nextMode });
        this.initSchulteBoard(size, nextMode);
        this.render(container);
      });
    });

    container.querySelector('#fl-schulte-reset')?.addEventListener('click', () => {
      this.initSchulteBoard(size, mode);
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-schulte-num]').forEach((cell) => {
      cell.addEventListener('click', () => {
        if (this.schulteDone) return;
        const val = Number(cell.dataset.schulteNum);
        const expected = this.schulteSequence[this.schulteStepIdx];

        if (val === expected && this.schulteStepIdx === 0 && !this.schulteStartMs) {
          this.schulteStartMs = performance.now();
          this.schulteInterval = window.setInterval(() => {
            this.schulteElapsedMs = performance.now() - this.schulteStartMs;
            const timerEl = container.querySelector('#fl-schulte-timer');
            if (timerEl) {
              timerEl.innerHTML = `Tiempo: <strong>${(this.schulteElapsedMs / 1000).toFixed(2)} s</strong>`;
            }
          }, 80);
        }

        if (val === expected) {
          this.schulteFound.add(val);
          this.schulteStepIdx += 1;
          if (this.schulteStepIdx >= this.schulteSequence.length) {
            this.schulteDone = true;
            if (this.schulteInterval) {
              window.clearInterval(this.schulteInterval);
              this.schulteInterval = 0;
            }
            this.schulteElapsedMs = this.schulteStartMs ? performance.now() - this.schulteStartMs : 0;
            lifeStore.recordSchulteRun(mode, size, this.schulteElapsedMs);
          }
          this.render(container);
        } else if (!this.schulteFound.has(val)) {
          this.schulteErrors += 1;
          cell.classList.add('is-wrong');
          window.setTimeout(() => cell.classList.remove('is-wrong'), 260);
        }
      });
    });
  }

  private bindRecallEvents(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.focuslab;
    const allCards = this.getAllCards();
    const filtered = prefs.recallDeck === 'all' ? allCards : allCards.filter((c) => c.deck === prefs.recallDeck);
    const now = Date.now();
    const dueCards = filtered.filter((c) => {
      const prog = profile.flashcardProgress[c.id];
      return !prog || prog.nextReviewAt <= now;
    });
    const activePool = dueCards.length > 0 ? dueCards : filtered;
    const card = activePool[this.recallIdx % Math.max(1, activePool.length)];

    container.querySelectorAll<HTMLButtonElement>('[data-recall-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.recallMode as RecallMode;
        lifeStore.updateProgress('focuslab', { recallMode: nextMode });
        this.recallRevealed = false;
        this.quizSelectedIdx = null;
        this.render(container);
      });
    });

    container.querySelector('#fl-extra-practice')?.addEventListener('click', () => {
      this.extraPractice = true;
      this.render(container);
    });

    container.querySelector('#fl-add-card-toggle')?.addEventListener('click', () => {
      this.addCardOpen = !this.addCardOpen;
      this.render(container);
    });

    container.querySelector('#fl-add-card-cancel')?.addEventListener('click', () => {
      this.addCardOpen = false;
      this.render(container);
    });

    container.querySelector('#fl-add-card-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const deck = (container.querySelector('#fl-fc-deck') as HTMLInputElement).value.trim();
      const front = (container.querySelector('#fl-fc-front') as HTMLInputElement).value.trim();
      const back = (container.querySelector('#fl-fc-back') as HTMLInputElement).value.trim();
      if (!front || !back) return;
      lifeStore.addCustomFlashcard(deck, front, back);
      this.addCardOpen = false;
      this.recallIdx = 0;
      this.recallRevealed = false;
      this.recallDraft = '';
      this.recallDraftCardId = '';
      this.quizSelectedIdx = null;
      this.extraPractice = false;
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-deck]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.recallIdx = 0;
        this.recallRevealed = false;
        this.recallDraft = '';
        this.recallDraftCardId = '';
        this.quizSelectedIdx = null;
        this.extraPractice = false;
        lifeStore.updateModulePrefs('focuslab', { recallDeck: btn.dataset.deck! });
        this.render(container);
      });
    });

    container.querySelector('#fl-recall-draft')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLTextAreaElement).value;
      this.recallDraft = val;
      if (card) {
        lifeStore.saveRecallDraft(card.id, val);
      }
    });

    container.querySelector('#fl-reveal-answer')?.addEventListener('click', () => {
      this.recallRevealed = true;
      this.render(container);
    });

    container.querySelector('#fl-skip-card')?.addEventListener('click', () => {
      this.recallIdx += 1;
      this.recallRevealed = false;
      this.recallDraft = '';
      this.recallDraftCardId = '';
      this.quizSelectedIdx = null;
      this.render(container);
    });

    container.querySelector('#fl-del-card')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.cardId!;
      lifeStore.removeCustomFlashcard(id);
      this.recallRevealed = false;
      this.recallDraft = '';
      this.recallDraftCardId = '';
      this.quizSelectedIdx = null;
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-rate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!card) return;
        lifeStore.saveRecallDraft(card.id, '');
        lifeStore.reviewFlashcard(card.id, btn.dataset.rate as 'again' | 'good' | 'easy');
        this.recallIdx += 1;
        this.recallRevealed = false;
        this.recallDraft = '';
        this.recallDraftCardId = '';
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-quiz-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!card || this.quizSelectedIdx !== null) return;
        const idx = Number(btn.dataset.quizOpt);
        const isCorrect = btn.dataset.quizOk === '1';
        this.quizSelectedIdx = idx;
        this.quizTotalCount += 1;
        if (isCorrect) this.quizCorrectCount += 1;
        lifeStore.reviewFlashcard(card.id, isCorrect ? 'good' : 'again');
        this.render(container);
      });
    });

    container.querySelector('#fl-quiz-next')?.addEventListener('click', () => {
      this.recallIdx += 1;
      this.quizSelectedIdx = null;
      this.recallDraftCardId = '';
      this.render(container);
    });
  }
}
