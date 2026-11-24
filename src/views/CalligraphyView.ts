import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import { DifficultyLevel, SavedCalligraphyStroke } from '../types';
import { bindDidacticBar, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

type DrillMode = 'trazos' | 'imprenta' | 'cursiva' | 'frase' | 'numeros' | 'ritmo';

const MODE_TUTORIALS: Record<DrillMode, Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  trazos: {
    sectionName: 'Trazos base',
    summary: 'Calienta la mano y estabiliza ritmo, altura e inclinación antes de escribir letras.',
    steps: [
      'Activa Renglones e Inclinación 55° para ver la altura de cuerpo, ascendentes y descendentes.',
      'Traza despacio de arriba hacia abajo siguiendo el modelo fantasma en el lienzo.',
      'Mantén presión y velocidad parejas; el plumín dinámico engrosa si bajas con calma.',
      'Pulsa Evaluar y guardar hoja cuando termines para medir y guardar tu dominio.',
    ],
    tip: 'Dibuja desde la muñeca y el antebrazo, no apretando los dedos contra el ratón o lápiz.',
  },
  imprenta: {
    sectionName: 'Imprenta clara',
    summary: 'Uniforma proporciones de mayúsculas, minúsculas, números y signos en español.',
    steps: [
      'Alinea las mayúsculas hasta la línea superior y las minúsculas en la zona media.',
      'Observa el espacio uniforme entre cada letra del modelo.',
      'Recorre las 24 láminas del bloque; tus trazos y puntaje se guardan por muestra.',
      'Evalúa la hoja para subir tu porcentaje de dominio.',
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
  numeros: {
    sectionName: 'Números y símbolos',
    summary: 'Logra cifras, fracciones, fechas y símbolos técnicos completamente legibles en apuntes.',
    steps: [
      'Distingue claramente el 1 del 7, el 0 de la O y el 5 de la S.',
      'Mantén todos los dígitos con la misma altura desde la línea base hasta la ascendente.',
      'Practica símbolos de ingeniería, fechas y monedas con trazos firmes.',
    ],
    tip: 'Los números nítidos reducen errores de lectura en exámenes, tablas y fórmulas.',
  },
  ritmo: {
    sectionName: 'Ritmo y ligaduras',
    summary: 'Entrena continuidad sin despegar el lápiz en bucles, arcos y combinaciones frecuentes.',
    steps: [
      'Mantén una velocidad estable sin acelerar al final del renglón.',
      'Respeta el mismo ancho en cada arco o bucle consecutivo.',
      'Sube a dificultad Avanzado cuando superes 80% con guía suave.',
    ],
    tip: 'La elegancia caligráfica nace del ritmo regular entre blancos y trazos.',
  },
};

const CAL_DIFF_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Modelo fantasma bien visible (20%) y banda de evaluación cómoda.',
  intermedio: 'Modelo suave (11%) y evaluación de pauta + cobertura horizontal.',
  avanzado: 'Modelo tenue (4%) y evaluación exigente de altura y pulso parejo.',
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
  numeros: [
    '0 1 2 3 4 5 6 7 8 9', '10  25  48  79  90', '2026 / 11 / 24', 'S/ 125.50  ·  100%',
    'x + y = z  (a - b)', 'f(n) = O(n log n)', '1/2  3/4  5/8  7/10', '§  #  @  &  *  +',
    '<=  >=  !=  =>  ->', '08:30 - 10:15 AM', 'N° 01  N° 02  N° 03', 'A1  B2  C3  D4  E5',
    '3.1416  ·  2.7182', '98% precisión real', 'I  II  III  IV  V  X', '¿Cuánto? ¡Exacto!',
  ],
  ritmo: [
    'mmmmmmmm  nnnnnnnn', 'uuuuuuuu  wwwwwwww', 'lelelele  lalalala', 'oooo  cccc  oooo',
    'espiral suave continua', 'minimo  aluminio', 'miel  nube  luna', 'ritmo firme y parejo',
    'sube fino, baja firme', 'fluir sin apuro', 'trazo largo y sereno', 'armonía en cada curva',
    'pausa, respira, sigue', 'pulso ligero y estable', 'enlace continuo limpio', 'precisión en movimiento',
  ],
};

export class CalligraphyView {
  private strokes: StrokePt[][] = [];
  private activeStroke: StrokePt[] | null = null;
  private loadedKey = '';
  private feedbackMsg = 'Dibuja despacio siguiendo la pauta guía. Tus trazos y progreso se guardan automáticamente.';

  private canvas!: HTMLCanvasElement;
  private g!: CanvasRenderingContext2D;
  private width = 720;
  private height = 340;
  private dpr = 1;

  private activeMode(): DrillMode {
    return lifeStore.get().progress.calligraphy.modeExtra ?? lifeStore.get().modulePrefs.calligraphy.mode;
  }

  private templateKey(mode: DrillMode, idx: number): string {
    const list = TEMPLATES[mode];
    return `${mode}:${idx % list.length}`;
  }

  private hydrateStrokes(key: string): void {
    if (this.loadedKey === key) return;
    this.loadedKey = key;
    const saved = lifeStore.get().progress.calligraphy.savedStrokes[key];
    if (saved && saved.length > 0) {
      this.strokes = saved.map((s) => s.points.map(([x, y, t]) => ({ x, y, t })));
    } else {
      this.strokes = [];
    }
  }

  private persistCurrentStrokes(key: string): void {
    const compact: SavedCalligraphyStroke[] = this.strokes.map((s) => ({
      points: s.filter((_, idx) => idx % 2 === 0 || idx === s.length - 1).map((p) => [
        Math.round(p.x * 10) / 10,
        Math.round(p.y * 10) / 10,
        Math.round(p.t),
      ]),
    }));
    lifeStore.saveCalligraphyStrokes(key, compact);
  }

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.calligraphy;
    const prog = profile.progress.calligraphy;
    const mode = this.activeMode();
    const list = TEMPLATES[mode];
    const sampleIdx = prefs.sampleIdx % list.length;
    const key = this.templateKey(mode, sampleIdx);
    this.hydrateStrokes(key);

    const totalTemplates = Object.values(TEMPLATES).reduce((acc, arr) => acc + arr.length, 0);
    const completedCount = prog.completedTemplates.length;
    const masteryPct = Math.round((completedCount / totalTemplates) * 100);
    const currentText = list[sampleIdx];
    const currentBest = prog.mastery[key] ?? 0;
    const modeTut = MODE_TUTORIALS[mode];

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
              <p>Entrena pulso, altura uniforme, números y ritmo en ${totalTemplates} plantillas con borrador y puntaje guardados.</p>
            </div>
          </div>
          <div class="al-mono-pill">Hojas completadas: ${profile.stats.calligraphySheets}</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'calligraphy',
          progressLabel: `Dominio caligráfico (${completedCount}/${totalTemplates} muestras >= 70%)`,
          progressPct: masteryPct,
          progressDetail: currentBest > 0 ? `Mejor nota en esta muestra: ${currentBest}%` : 'Traza y pulsa Evaluar para guardar tu nota en esta lámina.',
          difficultyHints: CAL_DIFF_HINTS,
          extraMetric: `${this.strokes.length} trazos en lienzo`,
        })}

        <div class="al-toolbar">
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${mode === 'trazos' ? 'is-active' : ''}" data-cmode="trazos">Trazos (${TEMPLATES.trazos.length})</button>
            <button type="button" class="al-seg-btn ${mode === 'imprenta' ? 'is-active' : ''}" data-cmode="imprenta">Imprenta (${TEMPLATES.imprenta.length})</button>
            <button type="button" class="al-seg-btn ${mode === 'cursiva' ? 'is-active' : ''}" data-cmode="cursiva">Cursiva (${TEMPLATES.cursiva.length})</button>
            <button type="button" class="al-seg-btn ${mode === 'frase' ? 'is-active' : ''}" data-cmode="frase">Frases (${TEMPLATES.frase.length})</button>
            <button type="button" class="al-seg-btn ${mode === 'numeros' ? 'is-active' : ''}" data-cmode="numeros">Números (${TEMPLATES.numeros.length})</button>
            <button type="button" class="al-seg-btn ${mode === 'ritmo' ? 'is-active' : ''}" data-cmode="ritmo">Ritmo (${TEMPLATES.ritmo.length})</button>
          </div>

          <div class="al-tool-group">
            <button type="button" class="al-btn" id="al-cal-prev">Anterior</button>
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
          id: `calligraphy:${mode}`,
          moduleName: 'Taller de Caligrafía',
          ...modeTut,
        })}

        <div class="al-panel al-canvas-panel">
          <div class="al-cal-sample-label">
            <span>Modelo ${sampleIdx + 1}/${list.length}:</span>
            <strong>${currentText}</strong>
            ${currentBest > 0 ? `<span class="al-mastery-badge">Mejor: ${currentBest}%</span>` : ''}
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

          <div class="al-step-bar" aria-label="Selector rápido de muestras">
            ${list
              .map((_, i) => {
                const k = `${mode}:${i}`;
                const score = prog.mastery[k] ?? 0;
                const cls = i === sampleIdx ? 'is-active' : score >= 70 ? 'is-done' : '';
                return `<button type="button" class="al-step-pill ${cls}" data-cal-jump="${i}">${i + 1}${score >= 70 ? ` · ${score}%` : ''}</button>`;
              })
              .join('')}
          </div>
        </div>
      </div>
    `;

    this.canvas = container.querySelector<HTMLCanvasElement>('#al-cal-canvas')!;
    this.g = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    this.redraw();
    this.bindEvents(container, key, list.length);
    bindDidacticBar(container, 'calligraphy', () => this.render(container));
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
    const diff = lifeStore.getDifficulty('calligraphy');
    const mode = this.activeMode();
    const isNight = prof.theme === 'night';
    const bg = isNight ? '#111A17' : '#FFFFFF';
    const ink = isNight && prefs.inkColor === '#10211B' ? '#34D399' : prefs.inkColor;
    const guideMain = isNight ? 'rgba(130, 175, 160, 0.25)' : 'rgba(20, 125, 88, 0.24)';
    const guideSub = isNight ? 'rgba(130, 175, 160, 0.14)' : 'rgba(20, 125, 88, 0.12)';
    const ghostAlpha = diff === 'basico' ? 0.2 : diff === 'intermedio' ? 0.11 : 0.045;
    const ghostColor = isNight
      ? `rgba(230, 239, 234, ${ghostAlpha})`
      : `rgba(16, 33, 27, ${ghostAlpha})`;

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

    const list = TEMPLATES[mode];
    const sample = list[prefs.sampleIdx % list.length];
    g.fillStyle = ghostColor;
    const fontStyle = mode === 'cursiva' || mode === 'ritmo' ? 'italic ' : '';
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

  private evaluatePractice(key: string): string {
    if (this.strokes.length === 0) {
      return 'Haz al menos un par de trazos sobre el lienzo antes de guardar.';
    }
    const diff = lifeStore.getDifficulty('calligraphy');
    const minY = diff === 'avanzado' ? 85 : diff === 'intermedio' ? 75 : 65;
    const maxY = diff === 'avanzado' ? 245 : diff === 'intermedio' ? 260 : 275;

    let totalPts = 0;
    let inZone = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const s of this.strokes) {
      for (const p of s) {
        totalPts += 1;
        if (p.y >= minY && p.y <= maxY) inZone += 1;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      }
    }
    const zonePct = totalPts > 0 ? Math.round((inZone / totalPts) * 100) : 0;
    const spanRatio = Math.min(1, Math.max(0, (maxX - minX) / Math.max(180, this.width * 0.55)));
    const spanPct = Math.round(spanRatio * 100);
    const finalScore = Math.round(zonePct * 0.65 + spanPct * 0.35);

    const compact: SavedCalligraphyStroke[] = this.strokes.map((s) => ({
      points: s.filter((_, idx) => idx % 2 === 0 || idx === s.length - 1).map((p) => [
        Math.round(p.x * 10) / 10,
        Math.round(p.y * 10) / 10,
        Math.round(p.t),
      ]),
    }));
    lifeStore.recordCalligraphyMastery(key, finalScore, compact);
    lifeStore.recordCalligraphySheet();

    const tip =
      finalScore >= 85
        ? 'Excelente control de pauta y amplitud.'
        : finalScore >= 70
          ? 'Muestra dominada. Prueba subir dificultad para exigir más pulso.'
          : 'Sigue el ancho completo del modelo manteniéndote entre la línea media y la base.';
    return `Puntaje ${finalScore}% (pauta ${zonePct}% · amplitud ${spanPct}%). ${tip}`;
  }

  private bindEvents(container: HTMLElement, key: string, listLen: number): void {
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
        this.persistCurrentStrokes(key);
        this.redraw();
      }
    };
    this.canvas.addEventListener('pointerup', finishStroke);
    this.canvas.addEventListener('pointercancel', finishStroke);

    container.querySelectorAll<HTMLButtonElement>('[data-cmode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.cmode as DrillMode;
        lifeStore.updateProgress('calligraphy', { modeExtra: next });
        const coreMode =
          next === 'trazos' || next === 'imprenta' || next === 'cursiva' || next === 'frase'
            ? next
            : 'trazos';
        lifeStore.updateModulePrefs('calligraphy', { mode: coreMode, sampleIdx: 0 });
        this.loadedKey = '';
        this.render(container);
      });
    });

    container.querySelector('#al-cal-prev')?.addEventListener('click', () => {
      const prefs = lifeStore.get().modulePrefs.calligraphy;
      const nextIdx = (prefs.sampleIdx - 1 + listLen) % listLen;
      lifeStore.updateModulePrefs('calligraphy', { sampleIdx: nextIdx });
      this.loadedKey = '';
      this.render(container);
    });

    container.querySelector('#al-cal-next')?.addEventListener('click', () => {
      const prefs = lifeStore.get().modulePrefs.calligraphy;
      lifeStore.updateModulePrefs('calligraphy', { sampleIdx: (prefs.sampleIdx + 1) % listLen });
      this.loadedKey = '';
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-cal-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.calJump!, 10) || 0;
        lifeStore.updateModulePrefs('calligraphy', { sampleIdx: idx });
        this.loadedKey = '';
        this.render(container);
      });
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
      this.persistCurrentStrokes(key);
      this.redraw();
    });

    container.querySelector('#al-cal-clear')?.addEventListener('click', () => {
      this.strokes = [];
      this.persistCurrentStrokes(key);
      this.redraw();
    });

    container.querySelector('#al-cal-save')?.addEventListener('click', () => {
      this.feedbackMsg = this.evaluatePractice(key);
      this.render(container);
    });
  }
}
