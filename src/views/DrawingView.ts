import {
  DRAWING_BLOCKS,
  DRAWING_CHALLENGES,
  DRAWING_LESSONS,
  DRAWING_SWATCHES,
  DRAWING_TOPIC_CHIPS,
  evaluateDrawingCoverage,
  getLessonDifficulty,
  mirrorStrokePoints,
  parseNormalizedPathCommands,
  type DrawingBlockId,
  type DrawingChallenge,
  type DrawingLesson,
  type DrawingPoint,
} from '../data/DrawingBank';
import { Icons } from '../icons';
import {
  sanitizeManualImageUrl,
  searchDrawingReferences,
  type DrawingReferenceItem,
  type DrawingRefSourceFilter,
} from '../services/OnlineApi';
import { lifeStore } from '../state/LifeStore';
import type { DifficultyLevel, DrawingGridMode, DrawingSymmetry, SavedCanvasStroke } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, type SectionTutorialSpec } from '../ui/TutorialBanner';

const DRAWING_DIFF_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Guía clara con puntos de referencia visibles y pasos guiados.',
  intermedio: 'Guía moderada para afinar proporción sin depender del calco.',
  avanzado: 'Guía muy tenue sin puntos visibles; exige ojo y pulso propios.',
};

type DrawingTool = 'pencil' | 'ruler' | 'eraser';
type RefViewMode = 'side' | 'trace' | 'off';
type RefImgStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ActiveDrawingRef {
  id: string;
  origin: 'wikimedia' | 'cleveland' | 'upload' | 'url';
  title: string;
  artist: string;
  license: string;
  thumbUrl: string;
  fullUrl: string;
  pageUrl: string;
}

interface CanvasStroke {
  tool: DrawingTool;
  color: string;
  size: number;
  opacity: number;
  symmetry: DrawingSymmetry;
  points: DrawingPoint[];
  usePressure: boolean;
}

const MAX_UNDO_STEPS = 30;

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class DrawingView {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private g: CanvasRenderingContext2D | null = null;
  private strokeLayer: HTMLCanvasElement | null = null;
  private sg: CanvasRenderingContext2D | null = null;

  private width = 820;
  private height = 470;
  private dpr = 1;

  private tool: DrawingTool = 'pencil';
  private strokes: CanvasStroke[] = [];
  private activeStroke: CanvasStroke | null = null;
  private undoStack: CanvasStroke[][] = [];
  private redoStack: CanvasStroke[][] = [];

  // Puntos de fuga normalizados [0..1], arrastrables en el lienzo
  private horizonY = 0.36;
  private vp1X = 0.5;
  private vp2X = 0.88;
  private draggingVp: 'vp1' | 'vp2' | null = null;

  // Estado transitorio de Referencias de Internet / Calco (en memoria, sin inflar localStorage)
  private refPanelOpen = false;
  private refQuery = '';
  private refSource: DrawingRefSourceFilter = 'all';
  private refActiveChipId: string | null = null;
  private refSearching = false;
  private refStatusMsg =
    'Busca fotos y dibujos libres en Wikimedia Commons o Museo de Cleveland CC0, o carga tu propia imagen.';
  private refResults: DrawingReferenceItem[] = [];
  private activeRef: ActiveDrawingRef | null = null;
  private refViewMode: RefViewMode = 'side';
  private refOpacity = 0.38;
  private refHighContrast = false;
  private refMirror = false;
  private refImgStatus: RefImgStatus = 'idle';
  private searchSeq = 0;
  private urlInputOpen = false;
  private urlDraft = '';
  private activeObjectUrl: string | null = null;
  private uploadedFile: File | null = null;

  private feedbackMsg =
    'Elige una lámina guiada, un reto cronometrado o Lienzo Libre. Tus trazos y progreso se guardan automáticamente.';
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private hydrated = false;
  private loadedDraftKey = '';
  private activeChallengeId = DRAWING_CHALLENGES[0].id;
  private challengeTimerId = 0;
  private challengeRemainingSec = 0;

  private getActiveMode(): 'lessons' | 'challenge' | 'free' {
    return lifeStore.get().progress.drawing.modeExtra ?? lifeStore.get().modulePrefs.drawing.mode;
  }

  private getCurrentDraftKey(): string {
    const mode = this.getActiveMode();
    if (mode === 'lessons') return `lesson:${lifeStore.get().modulePrefs.drawing.lessonId}`;
    if (mode === 'challenge') return `challenge:${this.activeChallengeId}`;
    return 'free:canvas';
  }

  private hydrateFromProgress(): void {
    const prog = lifeStore.get().progress.drawing;
    if (!this.hydrated) {
      this.hydrated = true;
      this.tool = prog.activeTool;
      this.horizonY = prog.horizonY;
      this.vp1X = prog.vp1X;
      this.vp2X = prog.vp2X;
      this.refOpacity = prog.refOpacity;
      this.refHighContrast = prog.refHighContrast;
      this.refMirror = prog.refMirror;
      this.refViewMode = prog.refViewMode;
    }
    const key = this.getCurrentDraftKey();
    if (this.loadedDraftKey !== key) {
      this.loadedDraftKey = key;
      const saved = prog.savedDrafts[key];
      if (saved && saved.length > 0) {
        this.strokes = saved.map((s) => ({
          tool: s.eraser ? 'eraser' : 'pencil',
          color: s.color,
          size: s.size,
          opacity: s.opacity,
          symmetry: 'none',
          points: s.points.map(([nx, ny, pr]) => ({ x: nx * this.width, y: ny * this.height, pressure: pr })),
          usePressure: false,
        }));
      } else {
        this.strokes = [];
      }
      this.undoStack = [];
      this.redoStack = [];
    }
  }

  private persistDraft(): void {
    const key = this.getCurrentDraftKey();
    const w = Math.max(1, this.width);
    const h = Math.max(1, this.height);
    const compact: SavedCanvasStroke[] = this.strokes.map((s) => ({
      color: s.color,
      size: s.size,
      opacity: s.opacity,
      eraser: s.tool === 'eraser',
      points: s.points
        .filter((_, idx) => idx % 2 === 0 || idx === s.points.length - 1)
        .map((p) => [
          Math.round((p.x / w) * 1000) / 1000,
          Math.round((p.y / h) * 1000) / 1000,
          Math.round((p.pressure ?? 0.5) * 100) / 100,
        ]),
    }));
    lifeStore.saveDrawingDraft(key, compact);
  }

  private stopChallengeTimer(): void {
    if (this.challengeTimerId) {
      window.clearInterval(this.challengeTimerId);
      this.challengeTimerId = 0;
    }
  }

  private getActiveChallenge(): DrawingChallenge {
    return DRAWING_CHALLENGES.find((c) => c.id === this.activeChallengeId) ?? DRAWING_CHALLENGES[0];
  }

  public render(container: HTMLElement): void {
    this.container = container;
    this.restoreLocalUploadUrlIfNeeded();
    this.hydrateFromProgress();

    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.drawing;
    const prog = profile.progress.drawing;
    const diff = lifeStore.getDifficulty('drawing');
    const activeMode = this.getActiveMode();
    const activeLesson = this.getActiveLesson(prefs.lessonId);
    const activeBlock = activeLesson.block;
    const blockLessons = DRAWING_LESSONS.filter((l) => l.block === activeBlock);
    const lessonIndex = DRAWING_LESSONS.findIndex((l) => l.id === activeLesson.id);
    const isLessons = activeMode === 'lessons';
    const isChallenge = activeMode === 'challenge';
    const totalLessons = DRAWING_LESSONS.length;
    const completedLessons = prog.completedLessons.length;
    const completedChallenges = prog.completedChallenges.length;
    const masteryPct = Math.min(100, Math.round(((completedLessons + completedChallenges) / (totalLessons + DRAWING_CHALLENGES.length)) * 100));
    const currentBest = prog.mastery[activeLesson.id] ?? 0;
    const totalGuideSteps = Math.max(1, activeLesson.guideSvgPaths.length);
    const activeGuideStep = prog.guideStep > totalGuideSteps ? 0 : prog.guideStep;
    const activeChallenge = this.getActiveChallenge();

    const showSideRef = Boolean(this.activeRef && this.refViewMode === 'side');
    const showTraceRef = Boolean(this.activeRef && this.refViewMode === 'trace');
    const refUrl = this.activeRef ? this.activeRef.fullUrl || this.activeRef.thumbUrl : '';
    const refImgStyle = this.buildRefFilterStyle(showTraceRef);

    const tutorialSpec = this.getTutorialSpec(isLessons);

    container.innerHTML = `
      <div class="al-page al-drawing-page">
        <div class="al-module-hero" style="--mod-c1: #B45309; --mod-c2: #F59E0B;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #B45309; --em-c2: #F59E0B;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.palette(20)}</span>
            </div>
            <div>
              <h1>Taller de Dibujo Guiado</h1>
              <p>${totalLessons} láminas paso a paso, ${DRAWING_CHALLENGES.length} retos creativos cronometrados y calco con borrador guardado.</p>
            </div>
          </div>
          <div class="al-mono-pill">Láminas guardadas: ${profile.stats.drawingSheets}</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'drawing',
          progressLabel: `Dominio de dibujo (${completedLessons}/${totalLessons} láminas · ${completedChallenges}/${DRAWING_CHALLENGES.length} retos)`,
          progressPct: masteryPct,
          progressDetail: isLessons && currentBest > 0 ? `Mejor cobertura en esta lámina: ${currentBest}%` : 'Tus trazos, herramientas y puntos de fuga se guardan automáticamente.',
          difficultyHints: DRAWING_DIFF_HINTS,
          extraMetric: `${this.strokes.length} trazos`,
        })}

        ${renderTutorialBanner(tutorialSpec)}

        <div class="al-seg-tabs al-drawing-mode-tabs" role="tablist" aria-label="Modo de dibujo">
          <button type="button" role="tab" aria-selected="${isLessons}" class="al-seg-btn ${isLessons ? 'is-active' : ''}" data-draw-mode="lessons">
            ${Icons.layers(16)}<span>Lecciones Guiadas (${totalLessons})</span>
          </button>
          <button type="button" role="tab" aria-selected="${isChallenge}" class="al-seg-btn ${isChallenge ? 'is-active' : ''}" data-draw-mode="challenge">
            ${Icons.check(16)}<span>Retos Creativos (${DRAWING_CHALLENGES.length})</span>
          </button>
          <button type="button" role="tab" aria-selected="${activeMode === 'free'}" class="al-seg-btn ${activeMode === 'free' ? 'is-active' : ''}" data-draw-mode="free">
            ${Icons.palette(16)}<span>Lienzo Libre</span>
          </button>
        </div>

        ${
          isLessons
            ? `
          <section class="al-panel al-drawing-lessons-bar" aria-label="Selector de láminas">
            <div class="al-drawing-blocks" role="group" aria-label="Bloques de aprendizaje">
              ${DRAWING_BLOCKS.map(
                (b) => `
                <button type="button" class="al-btn al-btn-sm ${activeBlock === b.id ? 'al-btn-primary' : ''}" data-draw-block="${b.id}">
                  <span>${esc(b.label)}</span>
                </button>`
              ).join('')}
            </div>

            <div class="al-drawing-lesson-pills" role="group" aria-label="Láminas del bloque">
              ${blockLessons
                .map((l, idxInBlock) => {
                  const globalNum = DRAWING_LESSONS.findIndex((item) => item.id === l.id) + 1;
                  const score = prog.mastery[l.id] ?? 0;
                  const lDiff = getLessonDifficulty(l, idxInBlock);
                  return `
                  <button type="button" class="al-btn al-btn-sm ${l.id === activeLesson.id ? 'is-toggled' : ''}" data-draw-lesson="${l.id}">
                    <span>${globalNum}. ${esc(l.title)}</span>
                    ${score > 0 ? `<span class="al-mastery-badge">${score}%</span>` : lDiff === diff ? `<span class="al-mastery-badge is-warn">${difficultyLabel(lDiff)}</span>` : ''}
                  </button>`;
                })
                .join('')}
            </div>

            <div class="al-drawing-tip-banner">
              <div>
                <strong>Lámina ${lessonIndex + 1}/${totalLessons} · ${esc(activeLesson.title)} ${currentBest > 0 ? `(Mejor: ${currentBest}%)` : ''}</strong>
                <p>${esc(activeLesson.tip)}</p>
                <div class="al-step-bar" aria-label="Revelado progresivo de guía">
                  <span class="al-muted" style="font-size:0.76rem">Guía paso a paso:</span>
                  <button type="button" class="al-step-pill ${activeGuideStep === 0 ? 'is-active' : ''}" data-guide-step="0">Completa (${totalGuideSteps})</button>
                  ${activeLesson.guideSvgPaths
                    .map(
                      (_, sIdx) =>
                        `<button type="button" class="al-step-pill ${activeGuideStep === sIdx + 1 ? 'is-active' : ''}" data-guide-step="${sIdx + 1}">Paso ${sIdx + 1}</button>`
                    )
                    .join('')}
                </div>
              </div>
              <button type="button" class="al-btn al-btn-sm" id="al-draw-next-lesson">
                ${Icons.skip(15)}<span>Siguiente lámina</span>
              </button>
            </div>
          </section>`
            : ''
        }

        ${
          isChallenge
            ? `
          <section class="al-panel al-drawing-lessons-bar" aria-label="Retos creativos guiados">
            <div class="al-step-bar">
              ${DRAWING_CHALLENGES.map((ch) => {
                const done = prog.completedChallenges.includes(ch.id);
                const cls = ch.id === activeChallenge.id ? 'is-active' : done ? 'is-done' : '';
                return `<button type="button" class="al-step-pill ${cls}" data-draw-challenge="${ch.id}">${esc(ch.title)} · ${difficultyLabel(ch.difficulty)}${done ? ' · OK' : ''}</button>`;
              }).join('')}
            </div>
            <div class="al-study-card" style="margin-top:10px">
              <div class="al-didactic-prog-head">
                <strong>${esc(activeChallenge.title)} (${activeChallenge.durationSec}s)</strong>
                <span class="al-mastery-badge">${difficultyLabel(activeChallenge.difficulty)}${prog.completedChallenges.includes(activeChallenge.id) ? ' · Completado' : ''}</span>
              </div>
              <p class="al-muted" style="margin:0">${esc(activeChallenge.prompt)}</p>
              <ol class="al-muted" style="margin:4px 0 6px;padding-left:18px;font-size:0.84rem">
                ${activeChallenge.steps.map((s) => `<li>${esc(s)}</li>`).join('')}
              </ol>
              <div class="al-tool-group">
                <button type="button" class="al-btn al-btn-sm al-btn-primary" id="al-draw-ch-timer">
                  <span>${this.challengeTimerId ? `Tiempo: ${this.challengeRemainingSec}s (Pausar)` : `Iniciar cronómetro (${activeChallenge.durationSec}s)`}</span>
                </button>
                <button type="button" class="al-btn al-btn-sm" id="al-draw-ch-done">
                  ${Icons.check(14)}<span>Marcar reto completado</span>
                </button>
              </div>
            </div>
          </section>`
            : ''
        }

        <section class="al-panel al-drawing-ref-panel" aria-label="Referencias de Internet y Calco">
          <div class="al-drawing-ref-head">
            <div class="al-drawing-ref-head-title">
              ${Icons.search(17)}
              <strong>Referencias de Internet / Calco</strong>
              ${
                this.activeRef
                  ? `<span class="al-mono-pill">${esc(this.activeRef.title.slice(0, 36))}${this.activeRef.title.length > 36 ? '...' : ''}</span>`
                  : `<span class="al-muted">Wikimedia Commons + Museo CC0 + Subida local</span>`
              }
            </div>
            <button
              type="button"
              class="al-btn al-btn-sm ${this.refPanelOpen ? 'is-toggled' : ''}"
              id="al-draw-ref-toggle"
              aria-expanded="${this.refPanelOpen}"
            >
              ${Icons.chevronDown(14)}<span>${this.refPanelOpen ? 'Ocultar buscador' : 'Abrir referencias'}</span>
            </button>
          </div>

          <div class="al-drawing-ref-body" id="al-draw-ref-body"${this.refPanelOpen ? '' : ' hidden'}>
            <div class="al-drawing-ref-search-row">
              <form class="al-drawing-ref-search-form" id="al-draw-ref-form">
                <input
                  type="search"
                  class="al-drawing-ref-input"
                  id="al-draw-ref-query"
                  value="${esc(this.refQuery)}"
                  placeholder="Ej: hand anatomy, portrait, skull, botanical..."
                  aria-label="Buscar referencia visual en Internet"
                />
                <select class="al-drawing-ref-select" id="al-draw-ref-source" aria-label="Fuente de referencias">
                  <option value="all"${this.refSource === 'all' ? ' selected' : ''}>Todas</option>
                  <option value="wikimedia"${this.refSource === 'wikimedia' ? ' selected' : ''}>Wikimedia</option>
                  <option value="cleveland"${this.refSource === 'cleveland' ? ' selected' : ''}>Museo CC0</option>
                </select>
                <button type="submit" class="al-btn al-btn-sm al-btn-primary" id="al-draw-ref-search-btn"${this.refSearching ? ' disabled' : ''}>
                  ${Icons.search(15)}<span>${this.refSearching ? 'Buscando...' : 'Buscar'}</span>
                </button>
              </form>

              <div class="al-tool-group">
                <input type="file" id="al-draw-ref-file" accept="image/*" hidden />
                <button type="button" class="al-btn al-btn-sm" id="al-draw-ref-upload-btn">
                  ${Icons.upload(15)}<span>Subir foto</span>
                </button>
                <button type="button" class="al-btn al-btn-sm ${this.urlInputOpen ? 'is-toggled' : ''}" id="al-draw-ref-url-toggle">
                  ${Icons.link(15)}<span>Pegar URL</span>
                </button>
              </div>
            </div>

            ${
              this.urlInputOpen
                ? `
              <form class="al-drawing-ref-url-bar" id="al-draw-ref-url-form">
                <input
                  type="url"
                  class="al-drawing-ref-input"
                  id="al-draw-ref-url-input"
                  value="${esc(this.urlDraft)}"
                  placeholder="Pega enlace https:// o data:image/..."
                  aria-label="URL directa de imagen de referencia"
                />
                <button type="submit" class="al-btn al-btn-sm al-btn-primary">Usar imagen</button>
                <button type="button" class="al-btn al-btn-sm" id="al-draw-ref-url-cancel">Cancelar</button>
              </form>`
                : ''
            }

            <div class="al-drawing-ref-chips" role="group" aria-label="Temas sugeridos de dibujo">
              ${DRAWING_TOPIC_CHIPS.map(
                (chip) => `
                <button
                  type="button"
                  class="al-chip-btn al-drawing-ref-chip ${this.refActiveChipId === chip.id ? 'is-active' : ''}"
                  data-ref-chip="${chip.id}"
                >
                  <span>${esc(chip.label)}</span>
                </button>`
              ).join('')}
            </div>

            <div id="al-draw-ref-feed">
              ${this.renderRefFeedHtml()}
            </div>
          </div>

          ${
            this.activeRef
              ? `
            <div class="al-drawing-ref-controls" role="group" aria-label="Controles de referencia activa">
              <div class="al-tool-group">
                <button type="button" class="al-btn al-btn-sm ${this.refViewMode === 'side' ? 'al-btn-primary' : ''}" data-ref-view="side">
                  <span>Lado a lado</span>
                </button>
                <button type="button" class="al-btn al-btn-sm ${this.refViewMode === 'trace' ? 'al-btn-primary' : ''}" data-ref-view="trace">
                  <span>Calco traslúcido</span>
                </button>
                <button type="button" class="al-btn al-btn-sm ${this.refViewMode === 'off' ? 'is-toggled' : ''}" data-ref-view="off">
                  ${Icons.eyeOff(15)}<span>Ocultar</span>
                </button>
                <button type="button" class="al-btn al-btn-sm" id="al-draw-ref-clear">
                  ${Icons.trash(15)}<span>Quitar</span>
                </button>
              </div>

              <label class="al-inline-range">
                <span>Opacidad ref. <strong id="al-draw-ref-opacity-val">${Math.round(this.refOpacity * 100)}%</strong></span>
                <input
                  type="range"
                  id="al-draw-ref-opacity"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value="${this.refOpacity}"
                  ${this.refViewMode === 'trace' ? '' : 'disabled'}
                />
              </label>

              <button
                type="button"
                class="al-btn al-btn-sm ${this.refHighContrast ? 'is-toggled' : ''}"
                id="al-draw-ref-contrast"
                aria-pressed="${this.refHighContrast}"
              >
                ${Icons.sliders(14)}<span>Alto contraste B/N</span>
              </button>

              <button
                type="button"
                class="al-btn al-btn-sm ${this.refMirror ? 'is-toggled' : ''}"
                id="al-draw-ref-mirror"
                aria-pressed="${this.refMirror}"
              >
                ${Icons.symmetry(14)}<span>Espejo ref.</span>
              </button>

              <span class="al-muted" id="al-draw-ref-img-state">${esc(this.getActiveRefStatusLabel())}</span>
            </div>`
              : ''
          }
        </section>

        <section class="al-panel al-drawing-workspace">
          <div class="al-drawing-toolbar">
            <div class="al-tool-group" role="group" aria-label="Herramienta de trazo">
              <button type="button" class="al-btn al-btn-sm ${this.tool === 'pencil' ? 'al-btn-primary' : ''}" data-draw-tool="pencil" aria-pressed="${this.tool === 'pencil'}">
                ${Icons.pen(15)}<span>Lápiz</span>
              </button>
              <button type="button" class="al-btn al-btn-sm ${this.tool === 'ruler' ? 'al-btn-primary' : ''}" data-draw-tool="ruler" aria-pressed="${this.tool === 'ruler'}">
                ${Icons.arrowUpRight(15)}<span>Regla recta</span>
              </button>
              <button type="button" class="al-btn al-btn-sm ${this.tool === 'eraser' ? 'al-btn-primary' : ''}" data-draw-tool="eraser" aria-pressed="${this.tool === 'eraser'}">
                ${Icons.eraser(15)}<span>Goma</span>
              </button>
            </div>

            <div class="al-tool-group" role="group" aria-label="Simetría">
              <span class="al-draw-group-label">${Icons.symmetry(15)}<span>Simetría:</span></span>
              ${(
                [
                  ['none', 'Ninguna'],
                  ['vertical', 'Espejo'],
                  ['radial4', 'Radial 4×'],
                ] as [DrawingSymmetry, string][]
              )
                .map(
                  ([sym, label]) => `
                <button type="button" class="al-btn al-btn-sm ${prefs.symmetry === sym ? 'is-toggled' : ''}" data-draw-sym="${sym}" aria-pressed="${prefs.symmetry === sym}">
                  <span>${label}</span>
                </button>`
                )
                .join('')}
            </div>

            <div class="al-tool-group" role="group" aria-label="Guía geométrica">
              <span class="al-draw-group-label">${Icons.perspective(15)}<span>Guía:</span></span>
              ${(
                [
                  ['none', 'Sin guía'],
                  ['grid', 'Cuadrícula'],
                  ['perspective1', 'Fuga 1 pt'],
                  ['perspective2', 'Fuga 2 pts'],
                ] as [DrawingGridMode, string][]
              )
                .map(
                  ([grid, label]) => `
                <button type="button" class="al-btn al-btn-sm ${prefs.grid === grid ? 'is-toggled' : ''}" data-draw-grid="${grid}" aria-pressed="${prefs.grid === grid}">
                  <span>${label}</span>
                </button>`
                )
                .join('')}
            </div>

            ${
              isLessons
                ? `
              <button type="button" class="al-btn al-btn-sm ${prefs.showGuide ? 'is-toggled' : ''}" id="al-draw-toggle-guide" aria-pressed="${prefs.showGuide}">
                ${prefs.showGuide ? Icons.eye(15) : Icons.eyeOff(15)}<span>Plantilla fantasma</span>
              </button>`
                : ''
            }
          </div>

          <div class="al-drawing-toolbar al-drawing-toolbar-sub">
            <div class="al-tool-group" role="group" aria-label="Paleta de color">
              ${DRAWING_SWATCHES.map(
                (s) => `
                <button type="button" class="al-swatch ${prefs.brushColor.toLowerCase() === s.hex.toLowerCase() ? 'is-active' : ''}" data-draw-color="${s.hex}" title="${esc(s.name)}" aria-label="Color ${esc(s.name)}" style="background:${s.hex}"></button>`
              ).join('')}
            </div>

            <label class="al-inline-range">
              <span>Grosor <strong id="al-draw-size-val">${prefs.brushSize}px</strong></span>
              <input type="range" id="al-draw-size" min="1" max="20" step="1" value="${prefs.brushSize}" />
            </label>

            <label class="al-inline-range">
              <span>Opacidad <strong id="al-draw-opacity-val">${Math.round(prefs.brushOpacity * 100)}%</strong></span>
              <input type="range" id="al-draw-opacity" min="0.15" max="1" step="0.05" value="${prefs.brushOpacity}" />
            </label>
          </div>

          ${
            prefs.grid === 'perspective1' || prefs.grid === 'perspective2'
              ? `<p class="al-muted al-draw-vp-hint">Arrastra los círculos <strong>F1</strong>${prefs.grid === 'perspective2' ? ' y <strong>F2</strong>' : ''} directamente en el lienzo para mover los puntos de fuga y la línea del horizonte.</p>`
              : ''
          }

          <div class="al-drawing-stage-grid ${showSideRef ? 'has-ref-side' : ''}">
            ${
              showSideRef && this.activeRef
                ? `
              <aside class="al-drawing-ref-side" aria-label="Referencia lateral">
                <div class="al-drawing-ref-side-frame">
                  <img
                    id="al-draw-ref-side-img"
                    class="al-drawing-ref-side-img"
                    src="${esc(refUrl)}"
                    alt="${esc(this.activeRef.title)}"
                    referrerpolicy="no-referrer"
                    style="${refImgStyle}"
                  />
                </div>
                <div class="al-drawing-ref-side-meta">
                  <strong>${esc(this.activeRef.title)}</strong>
                  <span>${esc(this.activeRef.artist)} · ${esc(this.activeRef.license)}</span>
                  ${
                    this.activeRef.pageUrl
                      ? `<a class="al-link-btn" href="${esc(this.activeRef.pageUrl)}" target="_blank" rel="noopener noreferrer">Ver ficha original</a>`
                      : ''
                  }
                </div>
              </aside>`
                : ''
            }

            <div class="al-drawing-stage-wrap">
              ${
                showTraceRef && this.activeRef
                  ? `<img
                      id="al-draw-ref-bg-img"
                      class="al-drawing-ref-bg"
                      src="${esc(refUrl)}"
                      alt=""
                      aria-hidden="true"
                      referrerpolicy="no-referrer"
                      style="${refImgStyle}"
                    />`
                  : ''
              }
              <canvas id="al-drawing-canvas" class="al-drawing-canvas" aria-label="Lienzo de dibujo interactivo"></canvas>
            </div>
          </div>

          <div class="al-drawing-foot">
            <span id="al-draw-feedback" class="al-muted">${esc(this.feedbackMsg)}</span>
            <div class="al-tool-group">
              <button type="button" class="al-btn al-btn-sm" id="al-draw-undo" ${this.undoStack.length === 0 ? 'disabled' : ''} title="Deshacer (Ctrl+Z)">
                ${Icons.undo(15)}<span>Deshacer</span>
              </button>
              <button type="button" class="al-btn al-btn-sm" id="al-draw-redo" ${this.redoStack.length === 0 ? 'disabled' : ''} title="Rehacer (Ctrl+Y)">
                ${Icons.redo(15)}<span>Rehacer</span>
              </button>
              <button type="button" class="al-btn al-btn-sm" id="al-draw-clear">
                ${Icons.trash(15)}<span>Limpiar</span>
              </button>
              <button type="button" class="al-btn al-btn-sm" id="al-draw-download">
                ${Icons.download(15)}<span>Descargar PNG</span>
              </button>
              <button type="button" class="al-btn al-btn-primary" id="al-draw-evaluate">
                ${Icons.check(15)}<span>Evaluar y guardar</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    `;

    this.canvas = container.querySelector<HTMLCanvasElement>('#al-drawing-canvas');
    this.g = this.canvas?.getContext('2d') ?? null;
    this.strokeLayer = document.createElement('canvas');
    this.sg = this.strokeLayer.getContext('2d');

    this.resizeCanvas(this.strokes.length > 0);
    this.redraw();
    this.bindEvents(container);
    this.bindActiveRefImageEvents(container);
    bindDidacticBar(container, 'drawing', () => this.render(container));
    bindTutorialBanners(container);
    this.attachWindowListeners();
  }

  public unmount(): void {
    this.stopChallengeTimer();
    this.detachWindowListeners();
    this.revokeObjectUrlOnly();
    this.activeStroke = null;
    this.draggingVp = null;
    this.container = null;
    this.canvas = null;
    this.g = null;
    this.strokeLayer = null;
    this.sg = null;
  }

  private getTutorialSpec(isLessons: boolean): SectionTutorialSpec {
    if (this.activeRef && this.refViewMode === 'trace') {
      return {
        id: 'drawing:reference-trace',
        moduleName: 'Taller de Dibujo',
        sectionName: 'Calco traslúcido',
        summary: 'Calca proporciones sobre una imagen sin manchar el archivo PNG exportado.',
        steps: [
          'Ajusta Opacidad ref. entre 10% y 90% y activa Alto contraste B/N si quieres ver mejor las sombras.',
          'Usa Espejo ref. para invertir la foto y entrenar el ojo en otra orientación sin alterar el pincel.',
          'Dibuja con Lápiz o Regla recta; tus trazos quedan en una capa aparte limpia y lista para Descargar PNG.',
        ],
        tip: 'Alterna entre Calco traslúcido y Lado a lado cuando quieras pasar de calcar líneas base a dibujar por observación.',
      };
    }
    if (this.activeRef) {
      return {
        id: 'drawing:reference-side',
        moduleName: 'Taller de Dibujo',
        sectionName: 'Referencia de Internet',
        summary: 'Estudia anatomía, retratos u obras CC0 lado a lado sin perder tus trazos.',
        steps: [
          'Usa los 12 temas rápidos o busca en Wikimedia Commons y Museo de Cleveland CC0.',
          'Cambia entre Lado a lado, Calco traslúcido u Ocultar sin borrar tu dibujo actual.',
          'Pulsa Evaluar y guardar para registrar la lámina en tu progreso diario sin penalización de guía.',
        ],
        tip: 'Activa Cuadrícula en la barra superior para medir proporciones comparando la foto lateral con tu lienzo.',
      };
    }
    if (isLessons) {
      return {
        id: 'drawing:lessons',
        moduleName: 'Taller de Dibujo',
        sectionName: 'Lecciones Guiadas',
        summary: `${DRAWING_LESSONS.length} láminas estructuradas en 5 bloques progresivos.`,
        steps: [
          'Elige un bloque (Trazos, Perspectiva, Luz, Proporción o Composición) y selecciona una lámina.',
          'Activa Plantilla fantasma si deseas ver el trazo base o apágala para intentar de memoria.',
          'Al terminar, pulsa Evaluar y guardar para medir cobertura de puntos clave y sumar la lámina.',
        ],
        tip: 'También puedes abrir Referencias de Internet / Calco en cualquier momento sin perder lo dibujado.',
      };
    }
    return {
      id: 'drawing:free',
      moduleName: 'Taller de Dibujo',
      sectionName: 'Lienzo Libre',
      summary: 'Espacio abierto con regla recta, simetría, puntos de fuga arrastrables y referencias.',
      steps: [
        'Combina Lápiz con Simetría Espejo o Radial 4x para diseños geométricos o retratos frontales.',
        'En Fuga 1 pt o Fuga 2 pts, arrastra los círculos F1 y F2 directamente sobre el lienzo.',
        'Usa Ctrl+Z para deshacer y Ctrl+Y para rehacer en cualquier momento.',
      ],
      tip: 'Si abres Referencias de Internet / Calco puedes subir una foto propia o pegar una URL segura para estudiarla.',
    };
  }

  private renderRefFeedHtml(): string {
    const cardsHtml =
      this.refResults.length > 0
        ? `
      <div class="al-drawing-ref-results" role="list">
        ${this.refResults
          .map((item) => {
            const isSelected = this.activeRef?.id === item.id;
            const srcBadge = item.source === 'cleveland' ? 'Museo CC0' : 'Wikimedia';
            return `
            <button
              type="button"
              role="listitem"
              class="al-drawing-ref-card ${isSelected ? 'is-active' : ''}"
              data-ref-pick="${esc(item.id)}"
              title="${esc(item.title)}"
            >
              <img
                class="al-drawing-ref-card-thumb"
                src="${esc(item.thumbUrl)}"
                alt="${esc(item.title)}"
                loading="lazy"
                referrerpolicy="no-referrer"
              />
              <div class="al-drawing-ref-card-meta">
                <span class="al-drawing-ref-card-title">${esc(item.title)}</span>
                <span class="al-drawing-ref-card-sub">${esc(srcBadge)} · ${esc(item.artist)}</span>
              </div>
            </button>`;
          })
          .join('')}
      </div>`
        : '';

    return `
      <p class="al-drawing-ref-status" id="al-draw-ref-status">${esc(this.refStatusMsg)}</p>
      ${cardsHtml}
    `;
  }

  private buildRefFilterStyle(isTrace: boolean): string {
    const parts: string[] = [];
    if (isTrace) parts.push(`opacity:${this.refOpacity}`);
    parts.push(`filter:${this.refHighContrast ? 'grayscale(1) contrast(1.45)' : 'none'}`);
    parts.push(`transform:${this.refMirror ? 'scaleX(-1)' : 'none'}`);
    return parts.join(';');
  }

  private getActiveRefStatusLabel(): string {
    if (!this.activeRef) return '';
    if (this.refViewMode === 'off') return 'Referencia oculta (los trazos siguen intactos).';
    if (this.refImgStatus === 'loading') return 'Cargando imagen de referencia...';
    if (this.refImgStatus === 'error') {
      return 'No se pudo cargar esta imagen; papel sólido restaurado. Prueba otra referencia.';
    }
    return this.refViewMode === 'trace'
      ? `Calco activo (${Math.round(this.refOpacity * 100)}%) · descarga PNG limpia`
      : 'Vista lateral activa';
  }

  private syncActiveRefStyles(container: HTMLElement): void {
    const bgImg = container.querySelector<HTMLImageElement>('#al-draw-ref-bg-img');
    if (bgImg) {
      bgImg.style.opacity = String(this.refOpacity);
      bgImg.style.filter = this.refHighContrast ? 'grayscale(1) contrast(1.45)' : 'none';
      bgImg.style.transform = this.refMirror ? 'scaleX(-1)' : 'none';
    }
    const sideImg = container.querySelector<HTMLImageElement>('#al-draw-ref-side-img');
    if (sideImg) {
      sideImg.style.filter = this.refHighContrast ? 'grayscale(1) contrast(1.45)' : 'none';
      sideImg.style.transform = this.refMirror ? 'scaleX(-1)' : 'none';
    }
    const opLabel = container.querySelector('#al-draw-ref-opacity-val');
    if (opLabel) opLabel.textContent = `${Math.round(this.refOpacity * 100)}%`;

    const contrastBtn = container.querySelector('#al-draw-ref-contrast');
    if (contrastBtn) {
      contrastBtn.classList.toggle('is-toggled', this.refHighContrast);
      contrastBtn.setAttribute('aria-pressed', String(this.refHighContrast));
    }
    const mirrorBtn = container.querySelector('#al-draw-ref-mirror');
    if (mirrorBtn) {
      mirrorBtn.classList.toggle('is-toggled', this.refMirror);
      mirrorBtn.setAttribute('aria-pressed', String(this.refMirror));
    }
    const stateEl = container.querySelector('#al-draw-ref-img-state');
    if (stateEl) stateEl.textContent = this.getActiveRefStatusLabel();
  }

  private bindActiveRefImageEvents(container: HTMLElement): void {
    const img =
      container.querySelector<HTMLImageElement>('#al-draw-ref-bg-img') ??
      container.querySelector<HTMLImageElement>('#al-draw-ref-side-img');
    if (!img || !this.activeRef) return;

    const updateStateLabel = () => {
      const stateEl = this.container?.querySelector('#al-draw-ref-img-state');
      if (stateEl) stateEl.textContent = this.getActiveRefStatusLabel();
    };

    if (img.complete) {
      this.refImgStatus = img.naturalWidth > 0 ? 'ready' : 'error';
      updateStateLabel();
      this.redraw();
      return;
    }

    this.refImgStatus = 'loading';
    updateStateLabel();
    this.redraw();

    const expectedSrc = img.src;
    img.addEventListener('load', () => {
      if (!this.container || img.src !== expectedSrc) return;
      this.refImgStatus = 'ready';
      updateStateLabel();
      this.redraw();
    });
    img.addEventListener('error', () => {
      if (!this.container || img.src !== expectedSrc) return;
      this.refImgStatus = 'error';
      updateStateLabel();
      this.redraw();
    });
  }

  private revokeObjectUrlOnly(): void {
    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }
  }

  private restoreLocalUploadUrlIfNeeded(): void {
    if (
      this.activeRef &&
      this.activeRef.origin === 'upload' &&
      this.uploadedFile &&
      !this.activeObjectUrl
    ) {
      const freshUrl = URL.createObjectURL(this.uploadedFile);
      this.activeObjectUrl = freshUrl;
      this.activeRef = {
        ...this.activeRef,
        thumbUrl: freshUrl,
        fullUrl: freshUrl,
      };
      this.refImgStatus = 'loading';
    }
  }

  private selectReference(ref: ActiveDrawingRef): void {
    if (ref.origin !== 'upload') {
      this.revokeObjectUrlOnly();
      this.uploadedFile = null;
    }
    this.activeRef = ref;
    this.refImgStatus = 'loading';
    if (this.refViewMode === 'off') this.refViewMode = 'side';
    this.feedbackMsg = `Referencia activa: ${ref.title}. Puedes alternar Lado a lado o Calco traslúcido sin perder tus trazos.`;
    if (this.container) this.render(this.container);
  }

  private async runRefSearch(rawQuery: string): Promise<void> {
    const q = rawQuery.trim();
    this.refQuery = q;
    this.refPanelOpen = true;
    if (!q) {
      this.refStatusMsg = 'Escribe un tema para buscar referencias o elige uno de los 12 chips rápidos.';
      this.updateRefFeedDom();
      return;
    }

    const seq = ++this.searchSeq;
    this.refSearching = true;
    this.refStatusMsg = 'Buscando referencias abiertas en Wikimedia Commons y Museo CC0...';
    const searchBtn = this.container?.querySelector<HTMLButtonElement>('#al-draw-ref-search-btn');
    if (searchBtn) searchBtn.disabled = true;
    this.updateRefFeedDom();

    const result = await searchDrawingReferences(q, this.refSource);
    if (!this.container || seq !== this.searchSeq) return;

    this.refSearching = false;
    this.refResults = result.items;

    const errNotes = [
      result.errors.wikimedia ? `Wikimedia (${result.errors.wikimedia})` : '',
      result.errors.cleveland ? `Museo CC0 (${result.errors.cleveland})` : '',
    ].filter(Boolean);

    if (result.items.length === 0) {
      this.refStatusMsg =
        errNotes.length > 0
          ? `No se obtuvieron resultados (${errNotes.join(' · ')}). Prueba otra palabra o sube una foto.`
          : 'Sin resultados para esa búsqueda. Prueba términos en inglés como "hand sketch" o "portrait".';
    } else {
      const warnSuffix = errNotes.length > 0 ? ` · aviso: ${errNotes.join(', ')}` : '';
      this.refStatusMsg = `${result.items.length} referencias encontradas (clic en una tarjeta para abrirla)${warnSuffix}.`;
    }

    const btnAfter = this.container.querySelector<HTMLButtonElement>('#al-draw-ref-search-btn');
    if (btnAfter) btnAfter.disabled = false;
    this.updateRefFeedDom();
  }

  private updateRefFeedDom(): void {
    const feedEl = this.container?.querySelector<HTMLElement>('#al-draw-ref-feed');
    if (!feedEl) return;
    feedEl.innerHTML = this.renderRefFeedHtml();
    this.bindRefResultCards(feedEl);
  }

  private bindRefResultCards(scope: HTMLElement): void {
    scope.querySelectorAll<HTMLButtonElement>('[data-ref-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const picked = this.refResults.find((item) => item.id === btn.dataset.refPick);
        if (!picked) return;
        this.selectReference({
          id: picked.id,
          origin: picked.source,
          title: picked.title,
          artist: picked.artist,
          license: picked.license,
          thumbUrl: picked.thumbUrl,
          fullUrl: picked.fullUrl,
          pageUrl: picked.pageUrl,
        });
      });
    });
  }

  private getActiveLesson(lessonId: string): DrawingLesson {
    return DRAWING_LESSONS.find((l) => l.id === lessonId) ?? DRAWING_LESSONS[0];
  }

  private getPaperBg(isNight: boolean): string {
    return isNight ? '#111822' : '#FFFFFF';
  }

  private resizeCanvas(scaleExisting: boolean): void {
    if (!this.canvas || !this.g || !this.strokeLayer || !this.sg) return;
    const prevW = this.width;
    const prevH = this.height;
    const rect = this.canvas.getBoundingClientRect();
    const nextW = Math.max(300, Math.floor(rect.width || 820));
    const nextH = Math.max(320, Math.min(540, Math.round(nextW * 0.58)));

    if (scaleExisting && prevW > 0 && prevH > 0 && (nextW !== prevW || nextH !== prevH)) {
      const sx = nextW / prevW;
      const sy = nextH / prevH;
      const scaleList = (list: CanvasStroke[]) =>
        list.map((st) => ({
          ...st,
          points: st.points.map((p) => ({ ...p, x: p.x * sx, y: p.y * sy })),
        }));
      this.strokes = scaleList(this.strokes);
      this.undoStack = this.undoStack.map(scaleList);
      this.redoStack = this.redoStack.map(scaleList);
    }

    this.width = nextW;
    this.height = nextH;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.height = `${this.height}px`;
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.strokeLayer.width = this.canvas.width;
    this.strokeLayer.height = this.canvas.height;
    this.sg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private pushUndoSnapshot(): void {
    const snap = this.strokes.map((s) => ({
      ...s,
      points: s.points.map((p) => ({ ...p })),
    }));
    this.undoStack.push(snap);
    if (this.undoStack.length > MAX_UNDO_STEPS) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.syncHistoryButtons();
  }

  private undo(): void {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(
      this.strokes.map((s) => ({
        ...s,
        points: s.points.map((p) => ({ ...p })),
      }))
    );
    if (this.redoStack.length > MAX_UNDO_STEPS) {
      this.redoStack.shift();
    }
    this.strokes = prev;
    this.persistDraft();
    this.redraw();
    this.syncHistoryButtons();
  }

  private redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(
      this.strokes.map((s) => ({
        ...s,
        points: s.points.map((p) => ({ ...p })),
      }))
    );
    if (this.undoStack.length > MAX_UNDO_STEPS) {
      this.undoStack.shift();
    }
    this.strokes = next;
    this.persistDraft();
    this.redraw();
    this.syncHistoryButtons();
  }

  private syncHistoryButtons(): void {
    if (!this.container) return;
    const undoBtn = this.container.querySelector<HTMLButtonElement>('#al-draw-undo');
    const redoBtn = this.container.querySelector<HTMLButtonElement>('#al-draw-redo');
    if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
  }

  private redraw(): void {
    if (!this.g || !this.sg || !this.strokeLayer) return;
    const g = this.g;
    const sg = this.sg;
    const prof = lifeStore.get();
    const prefs = prof.modulePrefs.drawing;
    const isNight = prof.theme === 'night';
    const w = this.width;
    const h = this.height;

    const tracingReady =
      this.refViewMode === 'trace' &&
      this.activeRef !== null &&
      this.refImgStatus === 'ready';

    // 1. Papel base (solo transparente cuando el calco traslúcido está listo)
    if (tracingReady) {
      g.clearRect(0, 0, w, h);
    } else {
      g.fillStyle = this.getPaperBg(isNight);
      g.fillRect(0, 0, w, h);
    }

    // 2. Rejilla / Perspectiva
    this.drawGridGuides(g, prefs.grid, isNight);

    // 3. Ejes de simetría visibles
    this.drawSymmetryAxes(g, prefs.symmetry, isNight);

    // 4. Plantilla fantasma (se suprime cuando hay calco activo listo para no encimar líneas)
    if (this.getActiveMode() === 'lessons' && prefs.showGuide && !tracingReady) {
      const lesson = this.getActiveLesson(prefs.lessonId);
      this.drawLessonGuide(g, lesson, isNight);
    }

    // 5. Capa de trazos (la goma borra solo trazos con destination-out, nunca las guías)
    sg.clearRect(0, 0, w, h);
    const all = this.activeStroke ? [...this.strokes, this.activeStroke] : this.strokes;
    for (const st of all) {
      this.drawStrokeOnLayer(sg, st, isNight);
    }
    g.drawImage(this.strokeLayer, 0, 0, w, h);

    // 6. Controles arrastrables de puntos de fuga por encima de todo
    if (prefs.grid === 'perspective1' || prefs.grid === 'perspective2') {
      this.drawVanishingHandles(g, prefs.grid, isNight);
    }
  }

  private drawGridGuides(
    g: CanvasRenderingContext2D,
    grid: DrawingGridMode,
    isNight: boolean
  ): void {
    if (grid === 'none') return;
    const w = this.width;
    const h = this.height;
    const lineCol = isNight ? 'rgba(148, 163, 184, 0.16)' : 'rgba(15, 23, 42, 0.10)';
    const rayCol = isNight ? 'rgba(245, 158, 11, 0.25)' : 'rgba(180, 83, 9, 0.22)';
    const horizonCol = isNight ? 'rgba(56, 189, 248, 0.48)' : 'rgba(14, 116, 144, 0.42)';

    g.save();
    if (grid === 'grid') {
      g.strokeStyle = lineCol;
      g.lineWidth = 1;
      const step = 36;
      for (let x = step; x < w; x += step) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, h);
        g.stroke();
      }
      for (let y = step; y < h; y += step) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
      }
      g.restore();
      return;
    }

    const hy = this.horizonY * h;
    g.strokeStyle = horizonCol;
    g.lineWidth = 1.4;
    g.setLineDash([7, 5]);
    g.beginPath();
    g.moveTo(0, hy);
    g.lineTo(w, hy);
    g.stroke();
    g.setLineDash([]);

    const drawRays = (vx: number, vy: number, count: number) => {
      g.strokeStyle = rayCol;
      g.lineWidth = 1;
      const radius = Math.hypot(w, h) * 1.2;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2;
        g.beginPath();
        g.moveTo(vx, vy);
        g.lineTo(vx + Math.cos(ang) * radius, vy + Math.sin(ang) * radius);
        g.stroke();
      }
    };

    if (grid === 'perspective1') {
      drawRays(this.vp1X * w, hy, 20);
    } else if (grid === 'perspective2') {
      drawRays(this.vp1X * w, hy, 16);
      drawRays(this.vp2X * w, hy, 16);
    }
    g.restore();
  }

  private drawVanishingHandles(
    g: CanvasRenderingContext2D,
    grid: DrawingGridMode,
    isNight: boolean
  ): void {
    const w = this.width;
    const h = this.height;
    const hy = this.horizonY * h;
    const handles: { x: number; y: number; label: string }[] = [
      { x: this.vp1X * w, y: hy, label: 'F1' },
    ];
    if (grid === 'perspective2') {
      handles.push({ x: this.vp2X * w, y: hy, label: 'F2' });
    }

    g.save();
    for (const pt of handles) {
      g.fillStyle = isNight ? '#F59E0B' : '#B45309';
      g.strokeStyle = isNight ? '#111822' : '#FFFFFF';
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      g.fillStyle = '#FFFFFF';
      g.font = '700 10px "JetBrains Mono", monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(pt.label, pt.x, pt.y + 0.5);
    }
    g.restore();
  }

  private drawSymmetryAxes(
    g: CanvasRenderingContext2D,
    symmetry: DrawingSymmetry,
    isNight: boolean
  ): void {
    if (symmetry === 'none') return;
    const w = this.width;
    const h = this.height;
    g.save();
    g.strokeStyle = isNight ? 'rgba(52, 211, 153, 0.36)' : 'rgba(22, 101, 52, 0.30)';
    g.lineWidth = 1.25;
    g.setLineDash([6, 6]);
    g.beginPath();
    g.moveTo(w / 2, 0);
    g.lineTo(w / 2, h);
    if (symmetry === 'radial4') {
      g.moveTo(0, h / 2);
      g.lineTo(w, h / 2);
    }
    g.stroke();
    g.restore();
  }

  private drawLessonGuide(
    g: CanvasRenderingContext2D,
    lesson: DrawingLesson,
    isNight: boolean
  ): void {
    const w = this.width;
    const h = this.height;
    const diff = lifeStore.getDifficulty('drawing');
    const stepLimit = lifeStore.get().progress.drawing.guideStep;
    const visiblePaths =
      stepLimit > 0 && stepLimit < lesson.guideSvgPaths.length
        ? lesson.guideSvgPaths.slice(0, stepLimit)
        : lesson.guideSvgPaths;
    const alpha = diff === 'basico' ? 0.36 : diff === 'intermedio' ? 0.22 : 0.09;

    g.save();
    g.strokeStyle = isNight
      ? `rgba(148, 163, 184, ${alpha})`
      : `rgba(30, 41, 59, ${alpha})`;
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.setLineDash([7, 6]);

    for (let idx = 0; idx < visiblePaths.length; idx++) {
      const pathStr = visiblePaths[idx];
      if (stepLimit > 0 && idx === visiblePaths.length - 1) {
        g.strokeStyle = isNight ? 'rgba(245, 158, 11, 0.72)' : 'rgba(180, 83, 9, 0.65)';
        g.lineWidth = 2.6;
      }
      const cmds = parseNormalizedPathCommands(pathStr);
      if (cmds.length === 0) continue;
      g.beginPath();
      for (const cmd of cmds) {
        const n = cmd.nums;
        if (cmd.op === 'M') g.moveTo(n[0] * w, n[1] * h);
        else if (cmd.op === 'L') g.lineTo(n[0] * w, n[1] * h);
        else if (cmd.op === 'Q') g.quadraticCurveTo(n[0] * w, n[1] * h, n[2] * w, n[3] * h);
        else if (cmd.op === 'C') {
          g.bezierCurveTo(
            n[0] * w,
            n[1] * h,
            n[2] * w,
            n[3] * h,
            n[4] * w,
            n[5] * h
          );
        } else if (cmd.op === 'Z') {
          g.closePath();
        }
      }
      g.stroke();
    }

    if (diff !== 'avanzado') {
      g.setLineDash([]);
      g.fillStyle = isNight ? 'rgba(245, 158, 11, 0.38)' : 'rgba(180, 83, 9, 0.32)';
      for (const [nx, ny] of lesson.targetCheckpoints) {
        g.beginPath();
        g.arc(nx * w, ny * h, 3.2, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
  }

  private drawStrokeOnLayer(
    sg: CanvasRenderingContext2D,
    stroke: CanvasStroke,
    isNight: boolean
  ): void {
    const mirrored = mirrorStrokePoints(stroke.points, stroke.symmetry, this.width, this.height);
    const isEraser = stroke.tool === 'eraser';
    const effectiveColor =
      isNight && (stroke.color.toLowerCase() === '#1e293b' || stroke.color.toLowerCase() === '#0f172a')
        ? '#E2E8F0'
        : stroke.color;

    sg.save();
    sg.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    sg.globalAlpha = isEraser ? 1 : stroke.opacity;
    sg.strokeStyle = isEraser ? '#000000' : effectiveColor;
    sg.fillStyle = isEraser ? '#000000' : effectiveColor;
    sg.lineCap = 'round';
    sg.lineJoin = 'round';

    const baseWidth = isEraser ? Math.max(10, stroke.size * 2.4) : stroke.size;

    for (const pts of mirrored) {
      if (pts.length === 0) continue;
      if (pts.length === 1) {
        sg.beginPath();
        sg.arc(pts[0].x, pts[0].y, baseWidth / 2, 0, Math.PI * 2);
        sg.fill();
        continue;
      }

      if (stroke.tool === 'ruler') {
        const a = pts[0];
        const b = pts[pts.length - 1];
        sg.lineWidth = baseWidth;
        sg.beginPath();
        sg.moveTo(a.x, a.y);
        sg.lineTo(b.x, b.y);
        sg.stroke();
        continue;
      }

      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        let segW = baseWidth;

        if (!isEraser) {
          if (stroke.usePressure && typeof curr.pressure === 'number' && curr.pressure > 0) {
            segW = Math.max(0.8, baseWidth * (0.4 + curr.pressure * 1.2));
          } else {
            const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
            const dt = Math.max(1, (curr.t ?? 0) - (prev.t ?? 0));
            const speed = dist / dt;
            const factor = Math.max(0.55, Math.min(1.3, 1.2 - speed * 0.2));
            segW = Math.max(0.8, baseWidth * factor);
          }
        }

        sg.lineWidth = segW;
        sg.beginPath();
        sg.moveTo(prev.x, prev.y);
        sg.lineTo(curr.x, curr.y);
        sg.stroke();
      }
    }
    sg.restore();
  }

  private hitVanishingPoint(x: number, y: number): 'vp1' | 'vp2' | null {
    const grid = lifeStore.get().modulePrefs.drawing.grid;
    if (grid !== 'perspective1' && grid !== 'perspective2') return null;
    const hy = this.horizonY * this.height;
    if (Math.hypot(x - this.vp1X * this.width, y - hy) <= 18) return 'vp1';
    if (grid === 'perspective2' && Math.hypot(x - this.vp2X * this.width, y - hy) <= 18) {
      return 'vp2';
    }
    return null;
  }

  private pointFromEvent(e: PointerEvent): DrawingPoint {
    const rect = this.canvas!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(this.width, e.clientX - rect.left)),
      y: Math.max(0, Math.min(this.height, e.clientY - rect.top)),
      pressure: e.pressure,
      t: performance.now(),
    };
  }

  private evaluateAndSave(): void {
    const prefs = lifeStore.get().modulePrefs.drawing;
    const inkStrokes = this.strokes.filter((s) => s.tool !== 'eraser');
    if (inkStrokes.length === 0) {
      this.feedbackMsg = 'Haz algunos trazos sobre el lienzo antes de evaluar y guardar.';
      this.updateFeedback();
      return;
    }

    const allMirrored: DrawingPoint[][] = [];
    for (const s of inkStrokes) {
      allMirrored.push(...mirrorStrokePoints(s.points, s.symmetry, this.width, this.height));
    }

    if (this.activeRef) {
      lifeStore.recordDrawingSheet();
      this.feedbackMsg = `Estudio con referencia guardado (${inkStrokes.length} trazos · total ${lifeStore.get().stats.drawingSheets} láminas).`;
    } else if (this.getActiveMode() === 'challenge') {
      const ch = this.getActiveChallenge();
      lifeStore.recordDrawingChallenge(ch.id);
      this.feedbackMsg = `Reto «${ch.title}» completado y guardado (${inkStrokes.length} trazos).`;
    } else if (this.getActiveMode() === 'lessons') {
      const lesson = this.getActiveLesson(prefs.lessonId);
      const res = evaluateDrawingCoverage(
        allMirrored,
        lesson.targetCheckpoints,
        this.width,
        this.height
      );
      lifeStore.recordDrawingMastery(lesson.id, res.coveragePct);
      const tone =
        res.coveragePct >= 80
          ? 'Excelente seguimiento de guía.'
          : res.coveragePct >= 65
            ? 'Lámina dominada. Puedes afinar o pasar a la siguiente.'
            : 'Guardada como práctica: acerca tus trazos a los puntos guía o usa Paso a paso.';
      this.feedbackMsg = `Lámina guardada (${inkStrokes.length} trazos · ${res.coveragePct}% de cobertura guía). ${tone}`;
    } else {
      lifeStore.recordDrawingSheet();
      this.feedbackMsg = `Boceto libre guardado en tu progreso (${inkStrokes.length} trazos · total ${lifeStore.get().stats.drawingSheets} láminas).`;
    }
    this.persistDraft();

    if (this.container) this.render(this.container);
  }

  private downloadPng(): void {
    if (!this.strokeLayer) return;
    const prof = lifeStore.get();
    const isNight = prof.theme === 'night';
    const out = document.createElement('canvas');
    out.width = this.strokeLayer.width;
    out.height = this.strokeLayer.height;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    // Zero-taint PNG: solo papel sólido + capa de trazos del usuario
    ctx.fillStyle = this.getPaperBg(isNight);
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(this.strokeLayer, 0, 0);

    const a = document.createElement('a');
    const slug = this.activeRef
      ? 'estudio-referencia'
      : prof.modulePrefs.drawing.mode === 'lessons'
        ? prof.modulePrefs.drawing.lessonId
        : 'lienzo-libre';
    a.download = `atelier-dibujo-${slug}.png`;
    a.href = out.toDataURL('image/png');
    a.click();
    this.feedbackMsg = `PNG limpio descargado como ${a.download}.`;
    this.updateFeedback();
  }

  private updateFeedback(): void {
    const el = this.container?.querySelector('#al-draw-feedback');
    if (el) el.textContent = this.feedbackMsg;
  }

  private selectLesson(lessonId: string): void {
    const lesson = this.getActiveLesson(lessonId);
    const prev = lifeStore.get().modulePrefs.drawing;
    this.loadedDraftKey = '';
    this.undoStack = [];
    this.redoStack = [];
    this.horizonY = lesson.id === 'persp-building-2pt' ? 0.48 : 0.30;
    this.vp1X = lesson.recommendedGrid === 'perspective2' ? 0.12 : 0.5;
    this.vp2X = 0.88;
    lifeStore.updateModulePrefs('drawing', {
      mode: 'lessons',
      lessonId: lesson.id,
      grid: lesson.recommendedGrid,
      symmetry: lesson.recommendedSymmetry ?? 'none',
      showGuide: prev.showGuide,
    });
    lifeStore.updateProgress('drawing', {
      modeExtra: 'lessons',
      guideStep: 0,
      horizonY: this.horizonY,
      vp1X: this.vp1X,
      vp2X: this.vp2X,
    });
    this.feedbackMsg = `Lámina cargada: ${lesson.title}.`;
    if (this.container) this.render(this.container);
  }

  private bindEvents(container: HTMLElement): void {
    const canvas = this.canvas;
    if (canvas) {
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        // Blur de inputs/selects/textareas enfocados dentro de la vista para devolver Ctrl+Z/Y al lienzo
        const activeEl = document.activeElement;
        if (
          activeEl instanceof HTMLElement &&
          container.contains(activeEl) &&
          (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA')
        ) {
          activeEl.blur();
        }

        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        const pt = this.pointFromEvent(e);

        const vpHit = this.hitVanishingPoint(pt.x, pt.y);
        if (vpHit) {
          this.draggingVp = vpHit;
          canvas.style.cursor = 'grabbing';
          return;
        }

        const prefs = lifeStore.get().modulePrefs.drawing;
        const hasRealPressure =
          e.pointerType === 'pen' || (e.pressure > 0 && Math.abs(e.pressure - 0.5) > 0.01);

        this.activeStroke = {
          tool: this.tool,
          color: prefs.brushColor,
          size: prefs.brushSize,
          opacity: prefs.brushOpacity,
          symmetry: prefs.symmetry,
          points: [pt],
          usePressure: hasRealPressure,
        };
        this.redraw();
      });

      canvas.addEventListener('pointermove', (e) => {
        const pt = this.pointFromEvent(e);
        if (this.draggingVp) {
          const clampedX = Math.max(0.04, Math.min(0.96, pt.x / this.width));
          const clampedY = Math.max(0.08, Math.min(0.92, pt.y / this.height));
          this.horizonY = clampedY;
          if (this.draggingVp === 'vp1') this.vp1X = clampedX;
          else this.vp2X = clampedX;
          this.redraw();
          return;
        }

        if (!this.activeStroke) {
          canvas.style.cursor = this.hitVanishingPoint(pt.x, pt.y) ? 'grab' : 'crosshair';
          return;
        }

        if (this.activeStroke.tool === 'ruler') {
          this.activeStroke.points = [this.activeStroke.points[0], pt];
        } else {
          const prev = this.activeStroke.points[this.activeStroke.points.length - 1];
          if (Math.hypot(pt.x - prev.x, pt.y - prev.y) >= 1.5) {
            if (e.pressure > 0 && Math.abs(e.pressure - 0.5) > 0.01) {
              this.activeStroke.usePressure = true;
            }
            this.activeStroke.points.push(pt);
          }
        }
        this.redraw();
      });

      const finishPointer = (e: PointerEvent) => {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
        if (this.draggingVp) {
          this.draggingVp = null;
          canvas.style.cursor = 'crosshair';
          lifeStore.updateProgress('drawing', {
            horizonY: this.horizonY,
            vp1X: this.vp1X,
            vp2X: this.vp2X,
          });
          return;
        }
        if (this.activeStroke) {
          this.pushUndoSnapshot();
          this.strokes.push(this.activeStroke);
          this.activeStroke = null;
          this.persistDraft();
          this.redraw();
          this.syncHistoryButtons();
        }
      };

      canvas.addEventListener('pointerup', finishPointer);
      canvas.addEventListener('pointercancel', finishPointer);
    }

    // Referencias de Internet / Calco
    container.querySelector('#al-draw-ref-toggle')?.addEventListener('click', () => {
      this.refPanelOpen = !this.refPanelOpen;
      const body = container.querySelector<HTMLElement>('#al-draw-ref-body');
      const btn = container.querySelector<HTMLButtonElement>('#al-draw-ref-toggle');
      if (body) body.hidden = !this.refPanelOpen;
      if (btn) {
        btn.classList.toggle('is-toggled', this.refPanelOpen);
        btn.setAttribute('aria-expanded', String(this.refPanelOpen));
        const span = btn.querySelector('span');
        if (span) span.textContent = this.refPanelOpen ? 'Ocultar buscador' : 'Abrir referencias';
      }
    });

    container.querySelector<HTMLInputElement>('#al-draw-ref-query')?.addEventListener('input', (e) => {
      this.refQuery = (e.target as HTMLInputElement).value;
    });

    container.querySelector<HTMLSelectElement>('#al-draw-ref-source')?.addEventListener('change', (e) => {
      this.refSource = (e.target as HTMLSelectElement).value as DrawingRefSourceFilter;
      if (this.refQuery.trim()) {
        void this.runRefSearch(this.refQuery);
      }
    });

    container.querySelector('#al-draw-ref-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.refActiveChipId = null;
      const input = container.querySelector<HTMLInputElement>('#al-draw-ref-query');
      void this.runRefSearch(input?.value ?? this.refQuery);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ref-chip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chip = DRAWING_TOPIC_CHIPS.find((c) => c.id === btn.dataset.refChip);
        if (!chip) return;
        this.refActiveChipId = chip.id;
        this.refQuery = chip.query;
        const input = container.querySelector<HTMLInputElement>('#al-draw-ref-query');
        if (input) input.value = chip.query;
        container.querySelectorAll<HTMLButtonElement>('[data-ref-chip]').forEach((other) => {
          other.classList.toggle('is-active', other.dataset.refChip === chip.id);
        });
        void this.runRefSearch(chip.query);
      });
    });

    const feedEl = container.querySelector<HTMLElement>('#al-draw-ref-feed');
    if (feedEl) this.bindRefResultCards(feedEl);

    // Subir foto local
    const fileInput = container.querySelector<HTMLInputElement>('#al-draw-ref-file');
    container.querySelector('#al-draw-ref-upload-btn')?.addEventListener('click', () => {
      fileInput?.click();
    });
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      if (file.type && !file.type.startsWith('image/')) {
        this.refStatusMsg = 'Selecciona un archivo de imagen válido (PNG, JPG, WebP o SVG).';
        this.updateRefFeedDom();
        return;
      }
      this.revokeObjectUrlOnly();
      const objUrl = URL.createObjectURL(file);
      this.activeObjectUrl = objUrl;
      this.uploadedFile = file;
      this.refStatusMsg = `Imagen local cargada: ${file.name}.`;
      this.selectReference({
        id: `local-file-${Date.now()}`,
        origin: 'upload',
        title: file.name || 'Foto subida',
        artist: 'Archivo local',
        license: 'Uso personal',
        thumbUrl: objUrl,
        fullUrl: objUrl,
        pageUrl: '',
      });
    });

    // Pegar URL manual
    container.querySelector('#al-draw-ref-url-toggle')?.addEventListener('click', () => {
      this.urlInputOpen = !this.urlInputOpen;
      this.render(container);
    });
    container.querySelector('#al-draw-ref-url-cancel')?.addEventListener('click', () => {
      this.urlInputOpen = false;
      this.render(container);
    });
    container.querySelector<HTMLInputElement>('#al-draw-ref-url-input')?.addEventListener('input', (e) => {
      this.urlDraft = (e.target as HTMLInputElement).value;
    });
    container.querySelector('#al-draw-ref-url-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = container.querySelector<HTMLInputElement>('#al-draw-ref-url-input')?.value ?? this.urlDraft;
      const safeUrl = sanitizeManualImageUrl(raw);
      if (!safeUrl) {
        this.refStatusMsg = 'URL rechazada: usa solo https://, http://, blob: o data:image/... válido.';
        this.updateRefFeedDom();
        return;
      }
      this.urlDraft = '';
      this.urlInputOpen = false;
      this.refStatusMsg = 'Imagen externa cargada desde URL manual.';
      this.selectReference({
        id: `manual-url-${Date.now()}`,
        origin: 'url',
        title: 'Imagen desde URL',
        artist: 'Enlace manual',
        license: 'Referencia externa',
        thumbUrl: safeUrl,
        fullUrl: safeUrl,
        pageUrl: '',
      });
    });

    // Controles de referencia activa
    container.querySelectorAll<HTMLButtonElement>('[data-ref-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.refView as RefViewMode;
        if (this.refViewMode === nextMode) return;
        this.refViewMode = nextMode;
        lifeStore.updateProgress('drawing', { refViewMode: nextMode });
        if (this.activeRef && nextMode !== 'off' && this.refImgStatus === 'idle') {
          this.refImgStatus = 'loading';
        }
        this.render(container);
      });
    });

    container.querySelector('#al-draw-ref-clear')?.addEventListener('click', () => {
      this.revokeObjectUrlOnly();
      this.uploadedFile = null;
      this.activeRef = null;
      this.refImgStatus = 'idle';
      this.feedbackMsg = 'Referencia retirada. Tus trazos permanecen intactos.';
      this.render(container);
    });

    container.querySelector<HTMLInputElement>('#al-draw-ref-opacity')?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.refOpacity = Number.isFinite(val) ? Math.max(0.1, Math.min(0.9, val)) : 0.38;
      lifeStore.updateProgress('drawing', { refOpacity: this.refOpacity });
      this.syncActiveRefStyles(container);
    });

    container.querySelector('#al-draw-ref-contrast')?.addEventListener('click', () => {
      this.refHighContrast = !this.refHighContrast;
      lifeStore.updateProgress('drawing', { refHighContrast: this.refHighContrast });
      this.syncActiveRefStyles(container);
    });

    container.querySelector('#al-draw-ref-mirror')?.addEventListener('click', () => {
      this.refMirror = !this.refMirror;
      lifeStore.updateProgress('drawing', { refMirror: this.refMirror });
      this.syncActiveRefStyles(container);
    });

    // Tabs modo (Lecciones / Retos / Lienzo Libre)
    container.querySelectorAll<HTMLButtonElement>('[data-draw-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.drawMode as 'lessons' | 'challenge' | 'free';
        if (this.getActiveMode() === mode) return;
        this.stopChallengeTimer();
        this.loadedDraftKey = '';
        lifeStore.updateProgress('drawing', { modeExtra: mode });
        lifeStore.updateModulePrefs('drawing', { mode: mode === 'free' ? 'free' : 'lessons' });
        this.feedbackMsg =
          mode === 'free'
            ? 'Lienzo libre activo: experimenta con simetría, cuadrícula o puntos de fuga arrastrables.'
            : mode === 'challenge'
              ? 'Modo Retos Creativos activo: elige un reto y pon a prueba tu trazo.'
              : 'Modo Lecciones Guiadas activo.';
        this.render(container);
      });
    });

    // Paso a paso en guía de lección
    container.querySelectorAll<HTMLButtonElement>('[data-guide-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.guideStep!, 10) || 0;
        lifeStore.updateProgress('drawing', { guideStep: step });
        this.render(container);
      });
    });

    // Retos creativos
    container.querySelectorAll<HTMLButtonElement>('[data-draw-challenge]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stopChallengeTimer();
        this.activeChallengeId = btn.dataset.drawChallenge!;
        this.loadedDraftKey = '';
        const ch = this.getActiveChallenge();
        lifeStore.updateModulePrefs('drawing', {
          grid: ch.recommendedGrid,
          symmetry: ch.recommendedSymmetry,
        });
        this.feedbackMsg = `Reto cargado: ${ch.title}.`;
        this.render(container);
      });
    });

    container.querySelector('#al-draw-ch-timer')?.addEventListener('click', () => {
      const ch = this.getActiveChallenge();
      if (this.challengeTimerId) {
        this.stopChallengeTimer();
        this.render(container);
        return;
      }
      this.challengeRemainingSec = ch.durationSec;
      this.challengeTimerId = window.setInterval(() => {
        this.challengeRemainingSec -= 1;
        const btn = this.container?.querySelector('#al-draw-ch-timer span');
        if (this.challengeRemainingSec <= 0) {
          this.stopChallengeTimer();
          this.feedbackMsg = `Tiempo completado en «${ch.title}». Evalúa o guarda tu progreso.`;
          if (this.container) this.render(this.container);
        } else if (btn) {
          btn.textContent = `Tiempo: ${this.challengeRemainingSec}s (Pausar)`;
        }
      }, 1000);
      this.render(container);
    });

    container.querySelector('#al-draw-ch-done')?.addEventListener('click', () => {
      const ch = this.getActiveChallenge();
      this.stopChallengeTimer();
      lifeStore.recordDrawingChallenge(ch.id);
      this.persistDraft();
      this.feedbackMsg = `Reto «${ch.title}» guardado como completado.`;
      this.render(container);
    });

    // Bloques
    container.querySelectorAll<HTMLButtonElement>('[data-draw-block]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const block = btn.dataset.drawBlock as DrawingBlockId;
        const first = DRAWING_LESSONS.find((l) => l.block === block);
        if (first) this.selectLesson(first.id);
      });
    });

    // Láminas
    container.querySelectorAll<HTMLButtonElement>('[data-draw-lesson]').forEach((btn) => {
      btn.addEventListener('click', () => this.selectLesson(btn.dataset.drawLesson!));
    });

    container.querySelector('#al-draw-next-lesson')?.addEventListener('click', () => {
      const curId = lifeStore.get().modulePrefs.drawing.lessonId;
      const idx = DRAWING_LESSONS.findIndex((l) => l.id === curId);
      const next = DRAWING_LESSONS[(idx + 1) % DRAWING_LESSONS.length];
      this.selectLesson(next.id);
    });

    // Herramientas
    container.querySelectorAll<HTMLButtonElement>('[data-draw-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tool = btn.dataset.drawTool as DrawingTool;
        lifeStore.updateProgress('drawing', { activeTool: this.tool });
        this.render(container);
      });
    });

    // Simetría
    container.querySelectorAll<HTMLButtonElement>('[data-draw-sym]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sym = btn.dataset.drawSym as DrawingSymmetry;
        lifeStore.updateModulePrefs('drawing', { symmetry: sym });
        this.render(container);
      });
    });

    // Guía / Perspectiva
    container.querySelectorAll<HTMLButtonElement>('[data-draw-grid]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const grid = btn.dataset.drawGrid as DrawingGridMode;
        if (grid === 'perspective1') {
          this.vp1X = 0.5;
          this.horizonY = 0.36;
        } else if (grid === 'perspective2') {
          this.vp1X = 0.14;
          this.vp2X = 0.86;
          this.horizonY = 0.48;
        }
        lifeStore.updateModulePrefs('drawing', { grid });
        this.render(container);
      });
    });

    // Plantilla fantasma
    container.querySelector('#al-draw-toggle-guide')?.addEventListener('click', () => {
      const cur = lifeStore.get().modulePrefs.drawing.showGuide;
      lifeStore.updateModulePrefs('drawing', { showGuide: !cur });
      this.render(container);
    });

    // Paleta de color
    container.querySelectorAll<HTMLButtonElement>('[data-draw-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.tool === 'eraser') this.tool = 'pencil';
        lifeStore.updateModulePrefs('drawing', { brushColor: btn.dataset.drawColor! });
        this.render(container);
      });
    });

    // Grosor y Opacidad de pincel
    container.querySelector<HTMLInputElement>('#al-draw-size')?.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10) || 4;
      lifeStore.updateModulePrefs('drawing', { brushSize: v });
      const lbl = container.querySelector('#al-draw-size-val');
      if (lbl) lbl.textContent = `${v}px`;
    });

    container.querySelector<HTMLInputElement>('#al-draw-opacity')?.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value) || 1;
      lifeStore.updateModulePrefs('drawing', { brushOpacity: v });
      const lbl = container.querySelector('#al-draw-opacity-val');
      if (lbl) lbl.textContent = `${Math.round(v * 100)}%`;
    });

    // Acciones
    container.querySelector('#al-draw-undo')?.addEventListener('click', () => this.undo());
    container.querySelector('#al-draw-redo')?.addEventListener('click', () => this.redo());
    container.querySelector('#al-draw-clear')?.addEventListener('click', () => {
      if (this.strokes.length === 0) return;
      this.pushUndoSnapshot();
      this.strokes = [];
      this.persistDraft();
      this.redraw();
      this.feedbackMsg = 'Lienzo limpio. Puedes usar Deshacer si quieres recuperar el dibujo.';
      this.updateFeedback();
    });
    container.querySelector('#al-draw-download')?.addEventListener('click', () => this.downloadPng());
    container.querySelector('#al-draw-evaluate')?.addEventListener('click', () => this.evaluateAndSave());
  }

  private attachWindowListeners(): void {
    this.detachWindowListeners();

    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.container) return;
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName;
      const isTextInput =
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        Boolean(active?.isContentEditable) ||
        (tag === 'INPUT' && (active as HTMLInputElement).type !== 'range');
      if (isTextInput) {
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        this.redo();
      }
    };

    this.resizeHandler = () => {
      if (!this.canvas) return;
      this.resizeCanvas(true);
      this.redraw();
    };

    window.addEventListener('keydown', this.keyHandler);
    window.addEventListener('resize', this.resizeHandler);
  }

  private detachWindowListeners(): void {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
    this.keyHandler = null;
    this.resizeHandler = null;
  }
}
