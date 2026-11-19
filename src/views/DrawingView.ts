import {
  DRAWING_BLOCKS,
  DRAWING_LESSONS,
  DRAWING_SWATCHES,
  evaluateDrawingCoverage,
  mirrorStrokePoints,
  parseNormalizedPathCommands,
  type DrawingBlockId,
  type DrawingLesson,
  type DrawingPoint,
} from '../data/DrawingBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import type { DrawingGridMode, DrawingSymmetry } from '../types';

type DrawingTool = 'pencil' | 'ruler' | 'eraser';

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

  private feedbackMsg =
    'Elige una lámina guiada o pasa a Lienzo Libre. Toca y arrastra con ratón, dedo o lápiz stylus.';
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;

  public render(container: HTMLElement): void {
    this.container = container;
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.drawing;
    const activeLesson = this.getActiveLesson(prefs.lessonId);
    const activeBlock = activeLesson.block;
    const blockLessons = DRAWING_LESSONS.filter((l) => l.block === activeBlock);
    const lessonIndex = DRAWING_LESSONS.findIndex((l) => l.id === activeLesson.id);
    const isLessons = prefs.mode === 'lessons';

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
              <p>20 láminas paso a paso de trazo, perspectiva, luz y figura, más lienzo libre con simetría y puntos de fuga.</p>
            </div>
          </div>
          <div class="al-mono-pill">Láminas guardadas: ${profile.stats.drawingSheets}</div>
        </div>

        <div class="al-seg-tabs al-drawing-mode-tabs" role="tablist" aria-label="Modo de dibujo">
          <button type="button" role="tab" aria-selected="${isLessons}" class="al-seg-btn ${isLessons ? 'is-active' : ''}" data-draw-mode="lessons">
            ${Icons.layers(16)}<span>Lecciones Guiadas (20)</span>
          </button>
          <button type="button" role="tab" aria-selected="${!isLessons}" class="al-seg-btn ${!isLessons ? 'is-active' : ''}" data-draw-mode="free">
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
                  <span>${b.label}</span>
                </button>`
              ).join('')}
            </div>

            <div class="al-drawing-lesson-pills" role="group" aria-label="Láminas del bloque">
              ${blockLessons
                .map((l) => {
                  const globalNum = DRAWING_LESSONS.findIndex((item) => item.id === l.id) + 1;
                  return `
                  <button type="button" class="al-btn al-btn-sm ${l.id === activeLesson.id ? 'is-toggled' : ''}" data-draw-lesson="${l.id}">
                    <span>${globalNum}. ${l.title}</span>
                  </button>`;
                })
                .join('')}
            </div>

            <div class="al-drawing-tip-banner">
              <div>
                <strong>Lámina ${lessonIndex + 1}/20 · ${activeLesson.title}</strong>
                <p>${activeLesson.tip}</p>
              </div>
              <button type="button" class="al-btn al-btn-sm" id="al-draw-next-lesson">
                ${Icons.skip(15)}<span>Siguiente lámina</span>
              </button>
            </div>
          </section>`
            : ''
        }

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
                <button type="button" class="al-swatch ${prefs.brushColor.toLowerCase() === s.hex.toLowerCase() ? 'is-active' : ''}" data-draw-color="${s.hex}" title="${s.name}" aria-label="Color ${s.name}" style="background:${s.hex}"></button>`
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

          <div class="al-drawing-stage-wrap">
            <canvas id="al-drawing-canvas" class="al-drawing-canvas" aria-label="Lienzo de dibujo interactivo"></canvas>
          </div>

          <div class="al-drawing-foot">
            <span id="al-draw-feedback" class="al-muted">${this.feedbackMsg}</span>
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

    this.resizeCanvas(false);
    this.redraw();
    this.bindEvents(container);
    this.attachWindowListeners();
  }

  public unmount(): void {
    this.detachWindowListeners();
    this.activeStroke = null;
    this.draggingVp = null;
    this.container = null;
    this.canvas = null;
    this.g = null;
    this.strokeLayer = null;
    this.sg = null;
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

    // 1. Papel base
    g.fillStyle = this.getPaperBg(isNight);
    g.fillRect(0, 0, w, h);

    // 2. Rejilla / Perspectiva
    this.drawGridGuides(g, prefs.grid, isNight);

    // 3. Ejes de simetría visibles
    this.drawSymmetryAxes(g, prefs.symmetry, isNight);

    // 4. Plantilla fantasma (solo en modo lecciones cuando showGuide=true)
    if (prefs.mode === 'lessons' && prefs.showGuide) {
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
    // Línea de horizonte
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
    g.save();
    g.strokeStyle = isNight ? 'rgba(148, 163, 184, 0.34)' : 'rgba(30, 41, 59, 0.24)';
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.setLineDash([7, 6]);

    for (const pathStr of lesson.guideSvgPaths) {
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

    // Puntos de referencia suaves
    g.setLineDash([]);
    g.fillStyle = isNight ? 'rgba(245, 158, 11, 0.35)' : 'rgba(180, 83, 9, 0.28)';
    for (const [nx, ny] of lesson.targetCheckpoints) {
      g.beginPath();
      g.arc(nx * w, ny * h, 3.2, 0, Math.PI * 2);
      g.fill();
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

    if (prefs.mode === 'lessons') {
      const lesson = this.getActiveLesson(prefs.lessonId);
      const res = evaluateDrawingCoverage(
        allMirrored,
        lesson.targetCheckpoints,
        this.width,
        this.height
      );
      lifeStore.recordDrawingSheet();
      const tone =
        res.coveragePct >= 80
          ? 'Excelente seguimiento de guía.'
          : res.coveragePct >= 50
            ? 'Buen avance: puedes afinar los puntos restantes o pasar a la siguiente lámina.'
            : 'Guardada como práctica libre: intenta acercar tus trazos a los puntos guía.';
      this.feedbackMsg = `Lámina guardada (${inkStrokes.length} trazos · ${res.coveragePct}% de cobertura guía). ${tone}`;
    } else {
      lifeStore.recordDrawingSheet();
      this.feedbackMsg = `Boceto libre guardado en tu progreso (${inkStrokes.length} trazos · total ${lifeStore.get().stats.drawingSheets} láminas).`;
    }

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

    ctx.fillStyle = this.getPaperBg(isNight);
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(this.strokeLayer, 0, 0);

    const a = document.createElement('a');
    const slug =
      prof.modulePrefs.drawing.mode === 'lessons'
        ? prof.modulePrefs.drawing.lessonId
        : 'lienzo-libre';
    a.download = `atelier-dibujo-${slug}.png`;
    a.href = out.toDataURL('image/png');
    a.click();
    this.feedbackMsg = `Imagen descargada como ${a.download}.`;
    this.updateFeedback();
  }

  private updateFeedback(): void {
    const el = this.container?.querySelector('#al-draw-feedback');
    if (el) el.textContent = this.feedbackMsg;
  }

  private selectLesson(lessonId: string): void {
    const lesson = this.getActiveLesson(lessonId);
    const prev = lifeStore.get().modulePrefs.drawing;
    this.strokes = [];
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
    this.feedbackMsg = `Lámina cargada: ${lesson.title}.`;
    if (this.container) this.render(this.container);
  }

  private bindEvents(container: HTMLElement): void {
    const canvas = this.canvas;
    if (canvas) {
      canvas.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
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
          return;
        }
        if (this.activeStroke) {
          this.pushUndoSnapshot();
          this.strokes.push(this.activeStroke);
          this.activeStroke = null;
          this.redraw();
          this.syncHistoryButtons();
        }
      };

      canvas.addEventListener('pointerup', finishPointer);
      canvas.addEventListener('pointercancel', finishPointer);
    }

    // Tabs modo (Lecciones / Lienzo Libre)
    container.querySelectorAll<HTMLButtonElement>('[data-draw-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.drawMode as 'lessons' | 'free';
        if (lifeStore.get().modulePrefs.drawing.mode === mode) return;
        lifeStore.updateModulePrefs('drawing', { mode });
        this.feedbackMsg =
          mode === 'free'
            ? 'Lienzo libre activo: experimenta con simetría, cuadrícula o puntos de fuga arrastrables.'
            : 'Modo Lecciones Guiadas activo.';
        this.render(container);
      });
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

    // Grosor y Opacidad
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
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active?.isContentEditable) {
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
