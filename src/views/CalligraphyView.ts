import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

type DrillMode = 'trazos' | 'imprenta' | 'cursiva' | 'frase';

const MODE_TUTORIALS: Record<DrillMode, Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  trazos: {
    sectionName: 'Trazos base',
    summary: 'Calienta la mano y estabiliza ritmo, altura e inclinación antes de escribir letras.',
    steps: [
      'Activa Renglones e Inclinación 55° para ver la altura de cuerpo, ascendentes y descendentes.',
      'Traza despacio de arriba hacia abajo siguiendo el modelo fantasma en el lienzo.',
      'Mantén presión y velocidad parejas; el plumín dinámico engrosa si bajas con calma.',
      'Pulsa Evaluar y guardar hoja cuando termines para medir tu precisión dentro de la pauta.',
    ],
    tip: 'Dibuja desde la muñeca y el antebrazo, no apretando los dedos contra el ratón o lápiz.',
  },
  imprenta: {
    sectionName: 'Imprenta clara',
    summary: 'Uniforma proporciones de mayúsculas, minúsculas, números y signos en español.',
    steps: [
      'Alinea las mayúsculas hasta la línea superior y las minúsculas en la zona media.',
      'Observa el espacio uniforme entre cada letra del modelo.',
      'Usa Siguiente muestra para recorrer las 24 láminas del bloque (incluidas tildes y signos).',
      'Guarda la hoja para registrar tu práctica diaria de caligrafía.',
    ],
    tip: 'Una letra imprenta limpia depende más de mantener la línea base pareja que de escribir rápido.',
  },
  cursiva: {
    sectionName: 'Cursiva fluida',
    summary: 'Enlaza letras con inclinación constante y ritmo continuo sin cortes bruscos.',
    steps: [
      'Activa Inclinación 55° para que todos los ejes verticales compartan el mismo ángulo.',
      'Intenta unir sílabas completas en un solo movimiento suave antes de levantar el trazo.',
      'Ajusta el grosor del plumín entre 3 y 6 para resaltar el contraste fino-grueso.',
      'Evalúa la hoja al completar la palabra o frase guía.',
    ],
    tip: 'Respira al soltar el trazo: si contienes el aire, las curvas salen tensas.',
  },
  frase: {
    sectionName: 'Frases completas',
    summary: 'Aplica legibilidad, espaciado entre palabras y ritmo sostenido en oraciones reales.',
    steps: [
      'Lee la frase completa antes de empezar para calcular el ancho del renglón.',
      'Deja un espacio constante (equivalente a una «o») entre palabra y palabra.',
      'Usa Deshacer si un trazo se desvía sin borrar toda la lámina.',
      'Guarda tu hoja para sumar progreso en tu estadística semanal.',
    ],
    tip: 'Prioriza terminar la frase con la misma calma y altura con la que empezaste.',
  },
};

interface StrokePt {
  x: number;
  y: number;
  t: number;
}

const INK_SWATCHES = [
  { name: 'Verde Atelier', hex: '#147D58' },
  { name: 'Azul Tinta', hex: '#1D4ED8' },
  { name: 'Carbón', hex: '#10211B' },
  { name: 'Terracota', hex: '#B45309' },
  { name: 'Ciruela', hex: '#6D28D9' },
];

const TEMPLATES: Record<DrillMode, string[]> = {
  trazos: [
    '|  |  |  |  |', 'O  O  O  O', '/ / / / / /', 'uuu   nnn   mmm',
    '\\ \\ \\ \\ \\ \\', 'o o o o o o', 'c c c c c c', 'l l l l l l',
    'iii   uuu   www', 'eee   lll   eee', 'vvv   www   vvv', 'mmm   nnn   uuu',
    '(((   )))   (((', 'sss   sss   sss', 'rrr   nnn   rrr', 'hhh   kkk   bbb',
    'ggg   jjj   yyy', 'ppp   qqq   ddd', 'aaa   ooo   ccc', 'zzz   xxx   zzz',
    'ooo   eee   ooo', 'lll   ttt   fff', 'nnn   hhh   mmm', '8 8 8 8 8 8',
  ],
  imprenta: [
    'A a  B b  C c', 'E e  G g  R r', 'M m  S s  Z z', 'La letra clara ordena la mente.',
    'D d  F f  H h', 'I i  J j  K k', 'L l  N n  Ñ ñ', 'O o  P p  Q q',
    'T t  U u  V v', 'W w  X x  Y y', 'á é í ó ú ü', '¿Qué? ¡Sí! «Ya»',
    '0 1 2 3 4 5', '6 7 8 9  # @', 'Ch ch  Ll ll  Rr', 'Á É Í Ó Ú  Ñ',
    'ba be bi bo bu', 'ca ce ci co cu', 'ga ge gi go gu', 'que qui gue gui',
    'pra pre pri pro', 'tra tre tri tro', 'claro · orden · paz', 'El lápiz dibuja ideas.',
  ],
  cursiva: [
    'ele  ala  olo', 'fluidez y ritmo', 'serenidad', 'Paso firme cada día',
    'mar  mano  menta', 'bello  llama  lluvia', 'ñandú  niño  año', 'gracia  guiño',
    'armonía', 'constancia', 'quietud y luz', 'Querida libreta',
    'sol  sombra  silencio', 'brisa  bosque  brote', 'pulso  pluma  pausa', 'claridad mental',
    'tinta verde', 'horizonte sereno', 'palabra precisa', 'lectura nocturna',
    'canto y melodía', 'paso a paso', 'estudio profundo', 'atelier diario',
  ],
  frase: [
    'Respira hondo.', 'Un paso hoy.', 'Mente serena.', 'Todo mejora paso a paso.',
    'Hoy elijo la calma.', 'Poco a poco se llega.', 'Hecho es mejor que perfecto.',
    'La calma también es fuerza.', 'Lento, pero sin pausa.', 'Aprendo de cada error.',
    'Sé amable contigo.', 'El jamón y el kiwi añejo.',
    'La claridad supera a la prisa.', 'Escribir despacio ordena el día.',
    'Cada línea entrena tu pulso.', 'Sin prisa, pero sin rendirse.',
    'La práctica diaria construye oficio.', 'Escucha antes de responder.',
    'Menos ruido, más presencia.', 'Un trazo firme vale por diez.',
    'El orden exterior trae sosiego.', 'Cuida el detalle en lo pequeño.',
    'Tu atención es tu mejor recurso.', 'Hoy sumo una hoja limpia más.',
  ],
};

export class CalligraphyView {
  private strokes: StrokePt[][] = [];
  private activeStroke: StrokePt[] | null = null;
  private feedbackMsg = 'Dibuja despacio siguiendo la pauta guía. Tu configuración queda guardada en Supabase.';

  private canvas!: HTMLCanvasElement;
  private g!: CanvasRenderingContext2D;
  private width = 720;
  private height = 340;
  private dpr = 1;

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.calligraphy;
    const list = TEMPLATES[prefs.mode];
    const totalTemplates = Object.values(TEMPLATES).reduce((acc, arr) => acc + arr.length, 0);
    const currentText = list[prefs.sampleIdx % list.length];
    const modeTut = MODE_TUTORIALS[prefs.mode];

    container.innerHTML = `
      <div class="al-page al-calligraphy-page">
        <div class="al-module-hero" style="--mod-c1: #0D7A72; --mod-c2: #4FD1C5;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #0D7A72; --em-c2: #4FD1C5;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.pen(20)}</span>
            </div>
            <div>
              <h1>Taller de Caligrafía</h1>
              <p>Practica pulso, altura uniforme e inclinación constante en ${totalTemplates} plantillas sobre pauta profesional.</p>
            </div>
          </div>
          <div class="al-mono-pill">Hojas completadas: ${profile.stats.calligraphySheets}</div>
        </div>

        <div class="al-toolbar">
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${prefs.mode === 'trazos' ? 'is-active' : ''}" data-cmode="trazos">Trazos base (${TEMPLATES.trazos.length})</button>
            <button type="button" class="al-seg-btn ${prefs.mode === 'imprenta' ? 'is-active' : ''}" data-cmode="imprenta">Imprenta (${TEMPLATES.imprenta.length})</button>
            <button type="button" class="al-seg-btn ${prefs.mode === 'cursiva' ? 'is-active' : ''}" data-cmode="cursiva">Cursiva (${TEMPLATES.cursiva.length})</button>
            <button type="button" class="al-seg-btn ${prefs.mode === 'frase' ? 'is-active' : ''}" data-cmode="frase">Frases (${TEMPLATES.frase.length})</button>
          </div>

          <div class="al-tool-group">
            <button type="button" class="al-btn" id="al-cal-next">Siguiente muestra</button>
            <button type="button" class="al-btn ${prefs.showGuidelines ? 'is-toggled' : ''}" id="al-cal-guides">Renglones</button>
            <button type="button" class="al-btn ${prefs.showSlant ? 'is-toggled' : ''}" id="al-cal-slant">Inclinación 55°</button>
            <div class="al-tool-group" aria-label="Color de tinta">
              ${INK_SWATCHES.map(
                (s) =>
                  `<button type="button" class="al-swatch ${prefs.inkColor === s.hex ? 'is-active' : ''}" data-ink="${s.hex}" title="${s.name}" style="background:${s.hex}"></button>`
              ).join('')}
            </div>
            <label class="al-inline-range">Plumín <input type="range" id="al-cal-nib" min="2" max="9" value="${prefs.nibSize}" /></label>
          </div>
        </div>

        ${renderTutorialBanner({
          id: `calligraphy:${prefs.mode}`,
          moduleName: 'Taller de Caligrafía',
          ...modeTut,
        })}

        <div class="al-panel al-canvas-panel">
          <div class="al-cal-sample-label">
            <span>Modelo ${(prefs.sampleIdx % list.length) + 1}/${list.length}:</span>
            <strong>${currentText}</strong>
          </div>
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
    bindTutorialBanners(container);
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
    const prof = lifeStore.get();
    const prefs = prof.modulePrefs.calligraphy;
    const isNight = prof.theme === 'night';
    const bg = isNight ? '#111A17' : '#FFFFFF';
    const ink = isNight && prefs.inkColor === '#10211B' ? '#34D399' : prefs.inkColor;
    const guideMain = isNight ? 'rgba(130, 175, 160, 0.25)' : 'rgba(20, 125, 88, 0.24)';
    const guideSub = isNight ? 'rgba(130, 175, 160, 0.14)' : 'rgba(20, 125, 88, 0.12)';
    const ghostColor = isNight ? 'rgba(230, 239, 234, 0.12)' : 'rgba(16, 33, 27, 0.11)';

    g.fillStyle = bg;
    g.fillRect(0, 0, this.width, this.height);

    const ascY = 75;
    const xTopY = 135;
    const baseY = 205;
    const descY = 265;

    if (prefs.showGuidelines) {
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

    if (prefs.showSlant) {
      g.strokeStyle = guideSub;
      g.lineWidth = 1;
      for (let x = -120; x < this.width + 120; x += 48) {
        g.beginPath();
        g.moveTo(x, this.height);
        g.lineTo(x + this.height * 0.52, 0);
        g.stroke();
      }
    }

    const list = TEMPLATES[prefs.mode];
    const sample = list[prefs.sampleIdx % list.length];
    g.fillStyle = ghostColor;
    const fontStyle = prefs.mode === 'cursiva' ? 'italic ' : '';
    const fontSize = sample.length > 20 ? 44 : 58;
    g.font = `${fontStyle}600 ${fontSize}px "Literata", Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillText(sample, this.width / 2, baseY - 2);

    const allStrokes = this.activeStroke ? [...this.strokes, this.activeStroke] : this.strokes;
    g.strokeStyle = ink;
    g.lineCap = 'round';
    g.lineJoin = 'round';

    for (const stroke of allStrokes) {
      if (stroke.length < 2) {
        if (stroke.length === 1) {
          g.fillStyle = ink;
          g.beginPath();
          g.arc(stroke[0].x, stroke[0].y, prefs.nibSize / 2, 0, Math.PI * 2);
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
        const dynamicW = Math.max(
          1.8,
          Math.min(prefs.nibSize * 1.4, prefs.nibSize * (1.25 - speed * 0.2))
        );
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
    return `Hoja guardada en tu progreso (${this.strokes.length} trazos · ${zonePct}% dentro de la pauta).`;
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
        lifeStore.updateModulePrefs('calligraphy', {
          mode: btn.dataset.cmode as DrillMode,
          sampleIdx: 0,
        });
        this.strokes = [];
        this.render(container);
      });
    });

    container.querySelector('#al-cal-next')?.addEventListener('click', () => {
      const prefs = lifeStore.get().modulePrefs.calligraphy;
      lifeStore.updateModulePrefs('calligraphy', { sampleIdx: prefs.sampleIdx + 1 });
      this.strokes = [];
      this.render(container);
    });

    container.querySelector('#al-cal-guides')?.addEventListener('click', () => {
      const prefs = lifeStore.get().modulePrefs.calligraphy;
      lifeStore.updateModulePrefs('calligraphy', { showGuidelines: !prefs.showGuidelines });
      this.render(container);
    });

    container.querySelector('#al-cal-slant')?.addEventListener('click', () => {
      const prefs = lifeStore.get().modulePrefs.calligraphy;
      lifeStore.updateModulePrefs('calligraphy', { showSlant: !prefs.showSlant });
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ink]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.updateModulePrefs('calligraphy', { inkColor: btn.dataset.ink! });
        this.render(container);
      });
    });

    container.querySelector<HTMLInputElement>('#al-cal-nib')?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10) || 4;
      lifeStore.updateModulePrefs('calligraphy', { nibSize: val });
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
      this.render(container);
    });
  }
}
