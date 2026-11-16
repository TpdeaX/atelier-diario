import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';

type DrillMode = 'trazos' | 'imprenta' | 'cursiva' | 'frase';

interface StrokePt {
  x: number;
  y: number;
  t: number;
}

const TEMPLATES: Record<DrillMode, string[]> = {
  trazos: ['|  |  |  |  |', 'O  O  O  O', '/ / / / / /', 'uuu   nnn   mmm'],
  imprenta: ['A a  B b  C c', 'E e  G g  R r', 'M m  S s  Z z', 'La letra clara ordena la mente.'],
  cursiva: ['ele  ala  olo', 'fluidez y ritmo', 'serenidad', 'Paso firme cada día'],
  frase: ['Respira hondo.', 'Un paso hoy.', 'Mente serena.', 'Todo mejora paso a paso.'],
};

export class CalligraphyView {
  private mode: DrillMode = 'trazos';
  private sampleIdx = 0;
  private showGuidelines = true;
  private showSlant = true;
  private inkColor = '#147D58';
  private nibSize = 4;

  private strokes: StrokePt[][] = [];
  private activeStroke: StrokePt[] | null = null;
  private feedbackMsg = 'Dibuja despacio siguiendo la pauta guía. Busca regularidad más que velocidad.';

  private canvas!: HTMLCanvasElement;
  private g!: CanvasRenderingContext2D;
  private width = 720;
  private height = 340;
  private dpr = 1;

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const currentText = TEMPLATES[this.mode][this.sampleIdx % TEMPLATES[this.mode].length];

    container.innerHTML = `
      <div class="al-page al-calligraphy-page">
        <div class="al-page-head">
          <div>
            <h1>Taller de Caligrafía</h1>
            <p>Practica pulso, altura uniforme e inclinación constante sobre pauta profesional.</p>
          </div>
          <div class="al-mono-pill">Hojas completadas: ${profile.stats.calligraphySheets}</div>
        </div>

        <div class="al-toolbar">
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${this.mode === 'trazos' ? 'is-active' : ''}" data-cmode="trazos">Trazos base</button>
            <button type="button" class="al-seg-btn ${this.mode === 'imprenta' ? 'is-active' : ''}" data-cmode="imprenta">Imprenta</button>
            <button type="button" class="al-seg-btn ${this.mode === 'cursiva' ? 'is-active' : ''}" data-cmode="cursiva">Cursiva</button>
            <button type="button" class="al-seg-btn ${this.mode === 'frase' ? 'is-active' : ''}" data-cmode="frase">Frases</button>
          </div>

          <div class="al-tool-group">
            <button type="button" class="al-btn" id="al-cal-next">Siguiente muestra</button>
            <button type="button" class="al-btn ${this.showGuidelines ? 'is-toggled' : ''}" id="al-cal-guides">Renglones</button>
            <button type="button" class="al-btn ${this.showSlant ? 'is-toggled' : ''}" id="al-cal-slant">Inclinación 55°</button>
            <label class="al-inline-range">Plumín <input type="range" id="al-cal-nib" min="2" max="9" value="${this.nibSize}" /></label>
          </div>
        </div>

        <div class="al-panel al-canvas-panel">
          <div class="al-cal-sample-label">Modelo: <strong>${currentText}</strong></div>
          <canvas id="al-cal-canvas" class="al-cal-canvas"></canvas>
          <div class="al-cal-foot">
            <span id="al-cal-feedback" class="al-muted">${this.feedbackMsg}</span>
            <div class="al-tool-group">
              <button type="button" class="al-btn" id="al-cal-undo">${Icons.undo(15)}<span>Deshacer</span></button>
              <button type="button" class="al-btn" id="al-cal-clear">${Icons.trash(15)}<span>Limpiar</span></button>
              <button type="button" class="al-btn al-btn-primary" id="al-cal-save">${Icons.check(15)}<span>Evaluar y guardar hoja</span></button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.canvas = container.querySelector<HTMLCanvasElement>('#al-cal-canvas')!;
    this.g = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    this.redraw();
    this.bindEvents(container);
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(300, Math.floor(rect.width || 720));
    this.height = 320;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private redraw(): void {
    const g = this.g;
    const isNight = lifeStore.get().theme === 'night';
    const bg = isNight ? '#111A17' : '#FFFFFF';
    const ink = isNight ? '#34D399' : this.inkColor;
    const guideMain = isNight ? 'rgba(130, 175, 160, 0.25)' : 'rgba(20, 125, 88, 0.24)';
    const guideSub = isNight ? 'rgba(130, 175, 160, 0.14)' : 'rgba(20, 125, 88, 0.12)';
    const ghostColor = isNight ? 'rgba(230, 239, 234, 0.12)' : 'rgba(16, 33, 27, 0.11)';

    g.fillStyle = bg;
    g.fillRect(0, 0, this.width, this.height);

    const ascY = 75;
    const xTopY = 135;
    const baseY = 205;
    const descY = 265;

    if (this.showGuidelines) {
      g.lineWidth = 1;
      for (const [y, dashed, col] of [
        [ascY, true, guideSub],
        [xTopY, true, guideMain],
        [baseY, false, guideMain],
        [descY, true, guideSub],
      ] as [number, boolean, string][]) {
        g.strokeStyle = col;
        g.setLineDash(dashed ? [6, 6] : []);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(this.width, y);
        g.stroke();
      }
      g.setLineDash([]);
    }

    if (this.showSlant) {
      g.strokeStyle = guideSub;
      g.lineWidth = 1;
      for (let x = -120; x < this.width + 120; x += 48) {
        g.beginPath();
        g.moveTo(x, this.height);
        g.lineTo(x + this.height * 0.52, 0);
        g.stroke();
      }
    }

    // Ghost text template
    const sample = TEMPLATES[this.mode][this.sampleIdx % TEMPLATES[this.mode].length];
    g.fillStyle = ghostColor;
    const fontStyle = this.mode === 'cursiva' ? 'italic ' : '';
    const fontSize = sample.length > 20 ? 44 : 58;
    g.font = `${fontStyle}600 ${fontSize}px "Literata", Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillText(sample, this.width / 2, baseY - 2);

    // Draw all user strokes with smooth quadratic interpolation
    const allStrokes = this.activeStroke ? [...this.strokes, this.activeStroke] : this.strokes;
    g.strokeStyle = ink;
    g.lineCap = 'round';
    g.lineJoin = 'round';

    for (const stroke of allStrokes) {
      if (stroke.length < 2) {
        if (stroke.length === 1) {
          g.fillStyle = ink;
          g.beginPath();
          g.arc(stroke[0].x, stroke[0].y, this.nibSize / 2, 0, Math.PI * 2);
          g.fill();
        }
        continue;
      }

      for (let i = 1; i < stroke.length; i++) {
        const prev = stroke[i - 1];
        const curr = stroke[i];
        const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        const dt = Math.max(1, curr.t - prev.t);
        const speed = dist / dt;
        // Slower deliberate strokes render slightly fuller like fountain ink
        const dynamicW = Math.max(1.8, Math.min(this.nibSize * 1.4, this.nibSize * (1.25 - speed * 0.2)));
        g.lineWidth = dynamicW;
        g.beginPath();
        g.moveTo(prev.x, prev.y);
        g.lineTo(curr.x, curr.y);
        g.stroke();
      }
    }
  }

  private pointFromEvent(e: PointerEvent): StrokePt {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: performance.now(),
    };
  }

  private evaluatePractice(): string {
    if (this.strokes.length === 0) {
      return 'Haz al menos un par de trazos sobre el lienzo antes de guardar.';
    }
    let totalPts = 0;
    let inZone = 0;
    for (const s of this.strokes) {
      for (const p of s) {
        totalPts += 1;
        if (p.y >= 70 && p.y <= 270) inZone += 1;
      }
    }
    const zonePct = totalPts > 0 ? Math.round((inZone / totalPts) * 100) : 0;
    lifeStore.recordCalligraphySheet();
    return `Hoja guardada (${this.strokes.length} trazos · ${zonePct}% dentro de la pauta). Sigue priorizando trazos constantes.`;
  }

  private bindEvents(container: HTMLElement): void {
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.canvas.setPointerCapture(e.pointerId);
      this.activeStroke = [this.pointFromEvent(e)];
      this.redraw();
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.activeStroke) return;
      this.activeStroke.push(this.pointFromEvent(e));
      this.redraw();
    });

    const finishStroke = () => {
      if (this.activeStroke) {
        this.strokes.push(this.activeStroke);
        this.activeStroke = null;
        this.redraw();
      }
    };
    this.canvas.addEventListener('pointerup', finishStroke);
    this.canvas.addEventListener('pointercancel', finishStroke);

    container.querySelectorAll<HTMLButtonElement>('[data-cmode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.cmode as DrillMode;
        this.sampleIdx = 0;
        this.strokes = [];
        this.render(container);
      });
    });

    container.querySelector('#al-cal-next')?.addEventListener('click', () => {
      this.sampleIdx += 1;
      this.strokes = [];
      this.render(container);
    });

    container.querySelector('#al-cal-guides')?.addEventListener('click', () => {
      this.showGuidelines = !this.showGuidelines;
      this.render(container);
    });

    container.querySelector('#al-cal-slant')?.addEventListener('click', () => {
      this.showSlant = !this.showSlant;
      this.render(container);
    });

    container.querySelector<HTMLInputElement>('#al-cal-nib')?.addEventListener('input', (e) => {
      this.nibSize = parseInt((e.target as HTMLInputElement).value, 10) || 4;
      this.redraw();
    });

    container.querySelector('#al-cal-undo')?.addEventListener('click', () => {
      this.strokes.pop();
      this.redraw();
    });

    container.querySelector('#al-cal-clear')?.addEventListener('click', () => {
      this.strokes = [];
      this.redraw();
    });

    container.querySelector('#al-cal-save')?.addEventListener('click', () => {
      this.feedbackMsg = this.evaluatePractice();
      const fb = container.querySelector('#al-cal-feedback');
      if (fb) fb.textContent = this.feedbackMsg;
    });
  }
}
