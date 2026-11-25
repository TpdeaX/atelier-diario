import { PHRASES_BANK } from '../data/KnowledgeBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import { DifficultyLevel, PhraseItem } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { shuffleBySeed } from '../ui/shuffle';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

type MindsetMode = 'tarjetas' | 'reto_hoy' | 'reflexion' | 'creatividad';

const SCAMPER_PROMPTS: { letter: string; verb: string; question: string; target: string }[] = [
  { letter: 'S', verb: 'Sustituir', question: '¿Qué paso, material o herramienta habitual podrías reemplazar por algo más simple o inesperado?', target: 'Tu rutina de estudio o un producto cotidiano' },
  { letter: 'C', verb: 'Combinar', question: '¿Qué dos hábitos, formatos o habilidades aparentemente lejanas ganarían fuerza si las fusionas?', target: 'Un proyecto personal o de carrera' },
  { letter: 'A', verb: 'Adaptar', question: '¿Qué principio de otro campo (música, biología, videojuegos, cocina) podrías importar a tu reto actual?', target: 'Un problema técnico o académico' },
  { letter: 'M', verb: 'Modificar / Magnificar', question: '¿Qué pasaría si multiplicaras por 10 una sola característica o la redujeras a una versión de 2 minutos?', target: 'Tu flujo diario o entregable clave' },
  { letter: 'P', verb: 'Poner otros usos', question: '¿Para qué otro problema completamente distinto serviría algo que ya construiste o sabes hacer?', target: 'Una habilidad o herramienta que ya dominas' },
  { letter: 'E', verb: 'Eliminar', question: '¿Qué paso o regla asumida podrías quitar por completo sin perder el valor real?', target: 'Una reunión, proceso o pantalla compleja' },
  { letter: 'R', verb: 'Reordenar / Invertir', question: '¿Qué ocurre si empiezas por el final, inviertes el orden o haces lo contrario a lo estándar?', target: 'Cómo presentas una idea o planificas tu día' },
];

const FORCED_CONCEPTS_A = [
  'Origami modular', 'Reloj de arena', 'Biblioteca silenciosa', 'Juego de ajedrez',
  'Mapa del metro', 'Semáforo inteligente', 'Diario de bolsillo', 'Cocina en 10 minutos',
  'Orquesta sinfónica', 'Brújula magnética', 'Estación espacial', 'Cuaderno de bocetos',
];

const FORCED_CONCEPTS_B = [
  'App de productividad', 'Preparación de entrevistas', 'Hábito de lectura', 'Estudio universitario',
  'Finanzas personales', 'Trabajo en equipo remoto', 'Aprendizaje de música', 'Descanso y postura',
  'Escritura clara', 'Comunicación difícil', 'Organización semanal', 'Proyecto de software',
];

const SPRINT10_THEMES = [
  '10 formas de hacer más divertido estudiar un tema denso',
  '10 micro-herramientas que te ahorrarían 15 minutos cada día',
  '10 maneras creativas de recordar lo que lees o aprendes',
  '10 proyectos pequeños de portafolio que puedas construir en 1 fin de semana',
  '10 formas distintas de explicar tu trabajo a un niño de 10 años',
  '10 mejoras simples para tu espacio físico de trabajo y postura',
];

const CAT_LABELS: Record<PhraseItem['category'], string> = {
  hablar: 'Hablar mejor',
  mente: 'Mente fuerte',
  decisiones: 'Decisiones',
  calma: 'Calma',
};

const DIFFICULTY_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Ideas esenciales y directas para aplicar en micro-acciones rápidas hoy.',
  intermedio: 'Todas las ideas combinadas con reto diario de 3 principios prácticos.',
  avanzado: 'Prioriza modelos avanzados y diario de reflexión profunda.',
};

const MINDSET_TUTORIALS: Record<string, Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  all: {
    sectionName: 'Todas las ideas y principios',
    summary: 'Recorre modelos mentales prácticos, marca micro-acciones cumplidas y guarda reflexiones propias.',
    steps: [
      'Alterna entre Cuaderno completo, Reto de hoy (3 ideas) y Diario de reflexión.',
      'Filtra por categoría o busca por autor y palabra clave.',
      'Pulsa Acción cumplida en cada idea que lleves a la práctica para registrar tu hábito diario.',
      'Pulsa Nueva idea para guardar principios propios sincronizados.',
    ],
    tip: 'Elige una sola micro-acción por día en lugar de leer veinte frases sin aplicar ninguna.',
  },
  reto_hoy: {
    sectionName: 'Misión guiada de hoy (3 ideas)',
    summary: 'Convierte tres principios seleccionados para tu nivel en conductas verificables durante el día.',
    steps: [
      'Lee las 3 ideas elegidas para hoy según tu nivel de dificultad.',
      'Marca la casilla Acción cumplida conforme ejecutes cada micro-acción real.',
      'Anota una reflexión breve de lo que cambió al aplicarla.',
    ],
    tip: 'Completar las 3 micro-acciones diarias construye criterio mucho más rápido que leer sin actuar.',
  },
  reflexion: {
    sectionName: 'Diario de reflexión',
    summary: 'Responde la pregunta de reflexión de cada principio con guardado automático en tu perfil.',
    steps: [
      'Lee la pregunta guía debajo de cada frase y escribe una respuesta concreta de 2 a 4 líneas.',
      'Tu texto se guarda automáticamente al escribir o al salir del campo.',
      'Activa Solo con reflexión para releer tu cuaderno personal de aprendizajes.',
    ],
    tip: 'Escribir en primera persona convierte una cita ajena en criterio propio.',
  },
  hablar: {
    sectionName: 'Hablar mejor',
    summary: 'Principios concretos de comunicación, preguntas útiles, límites y presencia verbal.',
    steps: [
      'Revisa una tarjeta antes de una exposición, reunión o conversación importante.',
      'Identifica en Cuándo usarla si coincide con tu situación actual.',
      'Marca Acción cumplida tras aplicarla en tu próxima charla real.',
    ],
    tip: 'Combina estas ideas con el simulador de Oratoria y Dicción para ensayarlas en voz alta.',
  },
  mente: {
    sectionName: 'Mente fuerte',
    summary: 'Herramientas de aprendizaje activo, constancia, metacognición y autodiálogo sano.',
    steps: [
      'Lee Qué significa para traducir la cita a conducta observable.',
      'Guarda como favoritas las ideas que te destraben cuando pierdas motivación.',
      'Cumple la micro-acción corta de 5 minutos hoy mismo.',
    ],
    tip: 'Releer tus 5 favoritas una vez por semana fija criterios que después salen en automático.',
  },
  decisiones: {
    sectionName: 'Decisiones y estrategia',
    summary: 'Criterios prácticos para priorizar, evitar la parálisis y diseñar tu entorno.',
    steps: [
      'Filtra aquí cuando tengas demasiados pendientes o dudes entre dos caminos.',
      'Usa la micro-acción para tomar una decisión reversible en menos de cinco minutos.',
      'Anota principios propios con Nueva idea cada vez que aprendas una lección importante.',
    ],
    tip: 'La claridad antes de ejecutar ahorra horas de retrabajo después.',
  },
  calma: {
    sectionName: 'Calma y perspectiva',
    summary: 'Recordatorios serenos para cortar la rumiación y volver a lo que sí controlas.',
    steps: [
      'Lee con pausa una sola tarjeta y suelta la urgencia antes de actuar.',
      'Si sientes ansiedad física intensa, abre el Centro de Calma para respirar primero.',
      'Usa la micro-acción para aterrizar el problema en un paso concreto.',
    ],
    tip: 'Cuando la emoción está alta, prioriza regular el cuerpo antes de analizar el problema.',
  },
  favs: {
    sectionName: 'Tus favoritas',
    summary: 'Tu cuaderno personal con los principios que elegiste mantener siempre a mano.',
    steps: [
      'Repasa tus frases guardadas al empezar o cerrar la jornada.',
      'Quita el marcador de las que ya integraste para mantener la lista enfocada.',
      'Añade notas propias con Nueva idea o promueve recursos desde el Baúl.',
    ],
    tip: 'Una lista corta de 8 a 12 favoritas vivas es más útil que cien guardadas sin releer.',
  },
  creatividad: {
    sectionName: 'Creatividad y Pensamiento Lateral',
    summary: 'Desbloquea ideas nuevas con SCAMPER diario, Combinaciones Forzadas y sprints de 10 ideas en 3 minutos.',
    steps: [
      'Usa el generador SCAMPER o gira un par de Combinación Forzada para salir del pensamiento lineal.',
      'Arranca el sprint «10 ideas en 3 min» y suelta ideas rápidas sin juzgarlas hasta completar 10.',
      'Guarda tus mejores hallazgos en tu Banco de Ideas sincronizado.',
    ],
    tip: 'Las primeras 4 ideas suelen ser obvias; las realmente originales aparecen entre la idea 7 y la 10.',
  },
};

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inferPhraseDifficulty(p: PhraseItem, idx: number): DifficultyLevel {
  if (p.difficulty) return p.difficulty;
  if (idx % 3 === 0) return 'basico';
  if (idx % 3 === 1) return 'intermedio';
  return 'avanzado';
}

function getReflectionPrompt(p: PhraseItem): string {
  if (p.reflectionPrompt && p.reflectionPrompt.trim()) return p.reflectionPrompt.trim();
  return `¿En qué situación concreta de hoy puedes aplicar esta idea y qué resultado esperas ver?`;
}

function daySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

export class MindsetView {
  private addFormOpen = false;
  private missionOffset = 0;
  private shuffleNonce = 0;
  private onlyWithReflection = false;
  private openInlineReflectionId: string | null = null;
  private saveTimers = new Map<string, number>();

  // Creatividad (Pensamiento Lateral) state
  private scamperIdx = daySeed() % SCAMPER_PROMPTS.length;
  private comboSeed = daySeed();
  private sprintThemeIdx = daySeed() % SPRINT10_THEMES.length;
  private sprintRunning = false;
  private sprintRemainingSec = 180;
  private sprintTimerId = 0;
  private sprintDraftIdeas: string[] = [];
  private creativeMsg = '';

  private stopSprintTimer(): void {
    if (this.sprintTimerId) {
      window.clearInterval(this.sprintTimerId);
      this.sprintTimerId = 0;
    }
    this.sprintRunning = false;
  }

  private getAllPhrases(): { phrase: PhraseItem; diff: DifficultyLevel }[] {
    const profile = lifeStore.get();
    const all = [...profile.customPhrases, ...PHRASES_BANK];
    return all.map((phrase, idx) => ({
      phrase,
      diff: inferPhraseDifficulty(phrase, idx),
    }));
  }

  private getMissionPhrases(diff: DifficultyLevel): { phrase: PhraseItem; diff: DifficultyLevel }[] {
    const all = this.getAllPhrases();
    let pool = all;
    if (diff === 'basico') {
      const basics = all.filter((x) => x.diff === 'basico');
      if (basics.length >= 3) pool = basics;
    } else if (diff === 'avanzado') {
      const adv = all.filter((x) => x.diff === 'avanzado' || x.diff === 'intermedio');
      if (adv.length >= 3) pool = adv;
    }
    const seed = daySeed() + this.missionOffset * 7;
    const picked: { phrase: PhraseItem; diff: DifficultyLevel }[] = [];
    const used = new Set<string>();
    for (let i = 0; i < 3 && picked.length < pool.length; i++) {
      let idx = (seed + i * 11) % pool.length;
      while (used.has(pool[idx].phrase.id)) {
        idx = (idx + 1) % pool.length;
      }
      used.add(pool[idx].phrase.id);
      picked.push(pool[idx]);
    }
    return picked;
  }

  private filterPhrases(
    entries: { phrase: PhraseItem; diff: DifficultyLevel }[],
    diff: DifficultyLevel
  ): { phrase: PhraseItem; diff: DifficultyLevel }[] {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.mindset;
    const q = prefs.searchQuery.trim().toLowerCase();

    // Orden por defecto: barajado con la fecha (cambia cada día) y, si pulsa Barajar, con un nonce extra.
    const shuffled = shuffleBySeed(entries, daySeed() + this.shuffleNonce * 7919, (x) => x.phrase.id);
    const filtered = shuffled.filter(({ phrase: p, diff: pDiff }) => {
      if (prefs.category === 'favs' && !profile.favoritePhraseIds.includes(p.id)) return false;
      if (prefs.category !== 'all' && prefs.category !== 'favs' && p.category !== prefs.category) return false;
      if (diff === 'basico' && !q && prefs.category === 'all' && !p.isCustom && pDiff !== 'basico') {
        return false;
      }
      if (!q) return true;
      return (
        p.quote.toLowerCase().includes(q) ||
        p.meaning.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.dailyAction.toLowerCase().includes(q)
      );
    });

    if (diff === 'avanzado') {
      return [...filtered].sort((a, b) => {
        const rank = (d: DifficultyLevel) => (d === 'avanzado' ? 0 : d === 'intermedio' ? 1 : 2);
        return rank(a.diff) - rank(b.diff);
      });
    }
    return filtered;
  }

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.mindset;
    const mProg = profile.progress.mindset;
    const mode: MindsetMode = mProg.mode ?? 'tarjetas';
    const diff = lifeStore.getDifficulty('mindset');

    const allEntries = this.getAllPhrases();
    const reflectionsCount = Object.keys(mProg.reflections).length;
    const actionsCount = mProg.completedActionIds.length;
    const progressDenom = Math.max(12, allEntries.length);
    const progressPct = Math.min(100, Math.round(((actionsCount + reflectionsCount) / progressDenom) * 100));

    let modeBodyHtml = '';
    if (mode === 'reto_hoy') {
      modeBodyHtml = this.renderRetoHoyHtml(diff);
    } else if (mode === 'reflexion') {
      modeBodyHtml = this.renderReflexionHtml(allEntries, diff);
    } else if (mode === 'creatividad') {
      modeBodyHtml = this.renderCreatividadHtml();
    } else {
      modeBodyHtml = this.renderTarjetasHtml(allEntries, diff);
    }

    const tutKey =
      mode === 'reto_hoy'
        ? 'reto_hoy'
        : mode === 'reflexion'
          ? 'reflexion'
          : mode === 'creatividad'
            ? 'creatividad'
            : prefs.category;

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #9D174D; --mod-c2: #F472B6;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #9D174D; --em-c2: #F472B6;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.bulb(20)}</span>
            </div>
            <div>
              <h1>Frases, Criterio y Modelos Mentales</h1>
              <p>Convierte ideas en micro-acciones cumplidas, misiones diarias y reflexiones escritas que perduran. Criterio es juzgar bien antes de decidir: aquí entrenas a pensar con claridad, separar lo importante de lo urgente y elegir con calma.</p>
            </div>
          </div>
          <div class="al-tool-group">
            <div class="al-mono-pill">Favoritas: ${profile.favoritePhraseIds.length} · Acciones: ${actionsCount}</div>
            <button type="button" class="al-btn al-btn-primary" id="al-mind-add-btn">${Icons.plus(15)}<span>Nueva idea</span></button>
          </div>
        </div>

        ${renderDidacticBar({
          moduleId: 'mindset',
          progressLabel: 'Práctica y Reflexión de Criterio',
          progressPct,
          progressDetail: `Acciones cumplidas: ${actionsCount} · Reflexiones guardadas: ${reflectionsCount}`,
          extraMetric: `Check-ins acumulados: ${mProg.dailyCheckins}`,
          difficultyHints: DIFFICULTY_HINTS,
        })}

        ${
          this.addFormOpen
            ? `
          <form class="al-panel al-add-link-bar" id="al-mind-add-form">
            <div class="al-card-head">
              <h2>Guardar frase o criterio personal (se sincroniza en Supabase)</h2>
              <button type="button" class="al-icon-btn" id="al-mind-add-close">×</button>
            </div>
            <div class="al-form-grid-2">
              <label><span>Frase o principio</span><input type="text" id="al-mp-quote" placeholder="Ej. Claridad antes que velocidad" required /></label>
              <label><span>Autor o fuente</span><input type="text" id="al-mp-author" placeholder="Nota personal" /></label>
            </div>
            <div class="al-form-grid-3">
              <label>
                <span>Categoría</span>
                <select id="al-mp-cat">
                  <option value="mente">Mente fuerte</option>
                  <option value="hablar">Hablar mejor</option>
                  <option value="decisiones">Decisiones</option>
                  <option value="calma">Calma</option>
                </select>
              </label>
              <label><span>Qué significa</span><input type="text" id="al-mp-meaning" placeholder="Resumen práctico" /></label>
              <label><span>Micro-acción</span><input type="text" id="al-mp-action" placeholder="Paso concreto para hoy" /></label>
            </div>
            <div class="al-tool-group">
              <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar idea</span></button>
            </div>
          </form>`
            : ''
        }

        <div class="al-toolbar">
          <div class="al-seg-tabs" role="tablist" aria-label="Modos de Frases y Criterio">
            <button type="button" class="al-seg-btn ${mode === 'tarjetas' ? 'is-active' : ''}" data-mmode="tarjetas">Cuaderno completo (${allEntries.length})</button>
            <button type="button" class="al-seg-btn ${mode === 'reto_hoy' ? 'is-active' : ''}" data-mmode="reto_hoy">Reto de hoy (3 ideas)</button>
            <button type="button" class="al-seg-btn ${mode === 'reflexion' ? 'is-active' : ''}" data-mmode="reflexion">Diario de reflexión (${reflectionsCount})</button>
            <button type="button" class="al-seg-btn ${mode === 'creatividad' ? 'is-active' : ''}" data-mmode="creatividad">Creatividad (${mProg.ideaBank.length})</button>
          </div>
          ${
            mode !== 'reto_hoy' && mode !== 'creatividad'
              ? `<input type="search" id="al-phrase-search" class="al-filter-input" value="${esc(prefs.searchQuery)}" placeholder="Filtrar ideas o autores..." />
                <button type="button" class="al-btn al-btn-sm" id="al-mind-shuffle">${Icons.refresh(14)}<span>Barajar</span></button>`
              : mode === 'reto_hoy'
                ? `<button type="button" class="al-btn al-btn-sm" id="al-mind-rotate-mission">${Icons.refresh(14)}<span>Rotar 3 ideas</span></button>`
                : ''
          }
        </div>

        ${
          mode !== 'reto_hoy' && mode !== 'creatividad'
            ? `
          <div class="al-toolbar">
            <div class="al-seg-tabs">
              <button type="button" class="al-seg-btn ${prefs.category === 'all' ? 'is-active' : ''}" data-cat="all">Todas (${allEntries.length})</button>
              <button type="button" class="al-seg-btn ${prefs.category === 'hablar' ? 'is-active' : ''}" data-cat="hablar">Hablar mejor</button>
              <button type="button" class="al-seg-btn ${prefs.category === 'mente' ? 'is-active' : ''}" data-cat="mente">Mente fuerte</button>
              <button type="button" class="al-seg-btn ${prefs.category === 'decisiones' ? 'is-active' : ''}" data-cat="decisiones">Decisiones</button>
              <button type="button" class="al-seg-btn ${prefs.category === 'calma' ? 'is-active' : ''}" data-cat="calma">Calma</button>
              <button type="button" class="al-seg-btn ${prefs.category === 'favs' ? 'is-active' : ''}" data-cat="favs">Favoritas</button>
            </div>
            ${
              mode === 'reflexion'
                ? `<button type="button" class="al-seg-btn ${this.onlyWithReflection ? 'is-active' : ''}" id="al-mind-only-refl">Solo con reflexión (${reflectionsCount})</button>`
                : ''
            }
          </div>`
            : ''
        }

        ${renderTutorialBanner({
          id: `mindset:${tutKey}`,
          moduleName: 'Frases y Criterio',
          ...(MINDSET_TUTORIALS[tutKey] ?? MINDSET_TUTORIALS.all),
        })}

        ${modeBodyHtml}
      </div>
    `;

    this.bindEvents(container);
    bindTutorialBanners(container);
    bindDidacticBar(container, 'mindset', () => {
      this.render(container);
    });
  }

  private renderTarjetasHtml(
    allEntries: { phrase: PhraseItem; diff: DifficultyLevel }[],
    diff: DifficultyLevel
  ): string {
    const profile = lifeStore.get();
    const mProg = profile.progress.mindset;
    const list = this.filterPhrases(allEntries, diff);

    const cardsHtml = list
      .map(({ phrase: p, diff: pDiff }) => {
        const isFav = profile.favoritePhraseIds.includes(p.id);
        const isDone = mProg.completedActionIds.includes(p.id);
        const savedRefl = mProg.reflections[p.id] ?? '';
        const isReflOpen = this.openInlineReflectionId === p.id;

        return `
        <article class="al-panel al-phrase-card ${isDone ? 'is-done' : ''}">
          <div class="al-card-head">
            <div class="al-tool-group">
              <span class="al-mono-pill">${CAT_LABELS[p.category] ?? p.category}${p.isCustom ? ' · Propia' : ''}</span>
              <span class="al-mono-pill">${difficultyLabel(pDiff)}</span>
              ${savedRefl ? `<span class="al-mastery-badge">${Icons.edit(12)} Reflexión guardada</span>` : ''}
            </div>
            <div class="al-tool-group">
              ${
                p.sourceUrl
                  ? `<a class="al-icon-btn" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer" title="Ver post original">${Icons.arrowUpRight(14)}</a>`
                  : ''
              }
              ${
                p.isCustom
                  ? `<button type="button" class="al-icon-btn" data-del-phrase="${esc(p.id)}" title="Eliminar frase propia">${Icons.trash(14)}</button>`
                  : ''
              }
              <button type="button" class="al-icon-btn ${isFav ? 'is-fav' : ''}" data-fav="${esc(p.id)}" title="Guardar en favoritas">${Icons.bookmark(15)}</button>
            </div>
          </div>
          <blockquote class="al-phrase-quote">«${esc(p.quote)}»</blockquote>
          <div class="al-phrase-author">— ${esc(p.author)}</div>
          <div class="al-phrase-detail">
            <p><strong>Qué significa:</strong> ${esc(p.meaning)}</p>
            <p><strong>Cuándo usarla:</strong> ${esc(p.whenToUse)}</p>
            <p><strong>Micro-acción:</strong> ${esc(p.dailyAction)}</p>
          </div>
          ${
            savedRefl && !isReflOpen
              ? `<p class="al-vault-note-preview"><strong>Tu reflexión:</strong> ${esc(savedRefl)}</p>`
              : ''
          }
          ${
            isReflOpen
              ? `
            <div class="al-study-card">
              <small class="al-muted">${esc(getReflectionPrompt(p))}</small>
              <textarea
                class="al-inline-note"
                data-refl-input="${esc(p.id)}"
                placeholder="Escribe cómo aplicarías esto hoy..."
              >${esc(savedRefl)}</textarea>
              <div class="al-card-head">
                <span class="al-muted" data-refl-status="${esc(p.id)}">${savedRefl ? 'Guardado en tu perfil' : 'Auto-guardado activo'}</span>
                <button type="button" class="al-btn al-btn-sm al-btn-primary" data-refl-save="${esc(p.id)}">${Icons.check(13)}<span>Guardar</span></button>
              </div>
            </div>`
              : ''
          }
          <div class="al-vault-actions">
            <button type="button" class="al-seg-btn ${isDone ? 'is-active' : ''}" data-toggle-action="${esc(p.id)}">
              ${Icons.check(13)} <span>${isDone ? 'Acción cumplida' : 'Marcar acción cumplida'}</span>
            </button>
            <button type="button" class="al-seg-btn ${isReflOpen ? 'is-active' : ''}" data-toggle-inline-refl="${esc(p.id)}">
              ${Icons.edit(13)} <span>${savedRefl ? 'Editar reflexión' : 'Reflexionar'}</span>
            </button>
          </div>
        </article>
      `;
      })
      .join('');

    return `
      ${
        diff === 'basico' && !profile.modulePrefs.mindset.searchQuery && profile.modulePrefs.mindset.category === 'all'
          ? `<p class="al-muted">Nivel Básico: mostrando tus ideas esenciales (${list.length}). Cambia a Intermedio o Avanzado para ver el banco completo.</p>`
          : ''
      }
      <div class="al-phrases-grid">
        ${cardsHtml || '<p class="al-muted">No hay frases que coincidan con ese filtro.</p>'}
      </div>
    `;
  }

  private renderRetoHoyHtml(diff: DifficultyLevel): string {
    const profile = lifeStore.get();
    const mProg = profile.progress.mindset;
    const mission = this.getMissionPhrases(diff);
    const doneInMission = mission.filter((x) => mProg.completedActionIds.includes(x.phrase.id)).length;

    const stepsHtml = mission
      .map((item, idx) => {
        const done = mProg.completedActionIds.includes(item.phrase.id);
        return `<span class="al-step-pill ${done ? 'is-done' : idx === doneInMission ? 'is-active' : ''}">Idea ${idx + 1}: ${CAT_LABELS[item.phrase.category]}${done ? ' · Cumplida' : ''}</span>`;
      })
      .join('');

    const cardsHtml = mission
      .map(({ phrase: p, diff: pDiff }, idx) => {
        const isDone = mProg.completedActionIds.includes(p.id);
        const savedRefl = mProg.reflections[p.id] ?? '';

        return `
          <article class="al-panel al-study-card ${isDone ? 'is-done' : ''}">
            <div class="al-card-head">
              <div class="al-tool-group">
                <span class="al-mono-pill">Misión ${idx + 1} de 3 · ${CAT_LABELS[p.category]}</span>
                <span class="al-mono-pill">${difficultyLabel(pDiff)}</span>
              </div>
              <label class="al-inline-check">
                <input type="checkbox" data-check-action="${esc(p.id)}" ${isDone ? 'checked' : ''} />
                <span>${isDone ? 'Acción cumplida' : 'Marcar cumplida'}</span>
              </label>
            </div>
            <blockquote class="al-phrase-quote">«${esc(p.quote)}»</blockquote>
            <div class="al-phrase-author">— ${esc(p.author)}</div>
            <p><strong>Qué significa:</strong> ${esc(p.meaning)}</p>
            <p><strong>Cuándo usarla:</strong> ${esc(p.whenToUse)}</p>
            <div class="al-rule-box ${isDone ? 'is-ok' : ''}">
              <strong>Micro-acción de hoy:</strong>
              <p>${esc(p.dailyAction)}</p>
            </div>
            <div class="al-study-card">
              <small class="al-muted">${esc(getReflectionPrompt(p))}</small>
              <textarea
                class="al-inline-note"
                data-refl-input="${esc(p.id)}"
                placeholder="Registra cómo te fue al aplicar esta micro-acción..."
              >${esc(savedRefl)}</textarea>
              <small class="al-muted" data-refl-status="${esc(p.id)}">${savedRefl ? 'Reflexión guardada automáticamente' : 'Se guarda automáticamente al escribir'}</small>
            </div>
          </article>
        `;
      })
      .join('');

    return `
      <section class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Misión guiada de hoy (${doneInMission}/3 cumplidas)</h2>
            <p class="al-muted">Tres principios seleccionados para nivel ${difficultyLabel(diff)}. Completa al menos una micro-acción para mantener activo tu hábito de Criterio.</p>
          </div>
          ${doneInMission === 3 ? `<span class="al-mastery-badge">${Icons.check(13)} Misión completa</span>` : ''}
        </div>
        <div class="al-step-bar">${stepsHtml}</div>
      </section>
      <div class="al-study-grid" style="grid-template-columns: 1fr;">
        ${cardsHtml}
      </div>
    `;
  }

  private renderReflexionHtml(
    allEntries: { phrase: PhraseItem; diff: DifficultyLevel }[],
    diff: DifficultyLevel
  ): string {
    const mProg = lifeStore.get().progress.mindset;
    let list = this.filterPhrases(allEntries, diff);
    if (this.onlyWithReflection) {
      list = list.filter((x) => Boolean(mProg.reflections[x.phrase.id]));
    }

    if (list.length === 0) {
      return `<div class="al-panel"><p class="al-muted">${
        this.onlyWithReflection
          ? 'Aún no tienes reflexiones guardadas con ese filtro. Desactiva "Solo con reflexión" para escribir la primera.'
          : 'No hay frases que coincidan con ese filtro.'
      }</p></div>`;
    }

    return `
      <div class="al-study-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
        ${list
          .map(({ phrase: p, diff: pDiff }) => {
            const isDone = mProg.completedActionIds.includes(p.id);
            const savedRefl = mProg.reflections[p.id] ?? '';
            return `
              <article class="al-panel al-study-card ${savedRefl ? 'is-done' : ''}">
                <div class="al-card-head">
                  <div class="al-tool-group">
                    <span class="al-mono-pill">${CAT_LABELS[p.category]}</span>
                    <span class="al-mono-pill">${difficultyLabel(pDiff)}</span>
                  </div>
                  ${
                    savedRefl
                      ? `<span class="al-mastery-badge">${Icons.check(12)} Guardada</span>`
                      : '<span class="al-muted">Sin reflexión</span>'
                  }
                </div>
                <blockquote class="al-phrase-quote">«${esc(p.quote)}»</blockquote>
                <div class="al-phrase-author">— ${esc(p.author)}</div>
                <p><strong>Pregunta de reflexión:</strong> ${esc(getReflectionPrompt(p))}</p>
                <textarea
                  class="al-inline-note"
                  data-refl-input="${esc(p.id)}"
                  placeholder="Escribe tu reflexión honesta aquí (se guarda automáticamente)..."
                >${esc(savedRefl)}</textarea>
                <div class="al-card-head">
                  <small class="al-muted" data-refl-status="${esc(p.id)}">${savedRefl ? 'Guardado en tu perfil' : 'Auto-guardado activo'}</small>
                  <div class="al-tool-group">
                    <button type="button" class="al-seg-btn ${isDone ? 'is-active' : ''}" data-toggle-action="${esc(p.id)}">
                      ${Icons.check(13)} <span>${isDone ? 'Acción cumplida' : 'Acción'}</span>
                    </button>
                    <button type="button" class="al-btn al-btn-sm" data-refl-save="${esc(p.id)}">Guardar</button>
                  </div>
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    `;
  }

  private renderCreatividadHtml(): string {
    const mProg = lifeStore.get().progress.mindset;
    const scamper = SCAMPER_PROMPTS[this.scamperIdx % SCAMPER_PROMPTS.length];
    const conceptA = FORCED_CONCEPTS_A[this.comboSeed % FORCED_CONCEPTS_A.length];
    const conceptB = FORCED_CONCEPTS_B[(this.comboSeed * 3 + 5) % FORCED_CONCEPTS_B.length];
    const sprintTheme = SPRINT10_THEMES[this.sprintThemeIdx % SPRINT10_THEMES.length];
    const mm = String(Math.floor(this.sprintRemainingSec / 60)).padStart(2, '0');
    const ss = String(this.sprintRemainingSec % 60).padStart(2, '0');

    return `
      <div class="al-two-col">
        <section class="al-panel">
          <div class="al-card-head">
            <div>
              <h2>Generador SCAMPER (${scamper.letter} · ${scamper.verb})</h2>
              <p class="al-muted" style="margin:2px 0 0">Aplica una lente lateral sobre: <strong>${esc(scamper.target)}</strong></p>
            </div>
            <button type="button" class="al-btn al-btn-sm" id="al-cr-next-scamper">${Icons.refresh(14)}<span>Otra lente</span></button>
          </div>
          <div class="al-study-card is-done" style="margin:10px 0">
            <strong>${esc(scamper.question)}</strong>
          </div>
          <form id="al-cr-scamper-form" class="al-vault-form-stack">
            <textarea id="al-cr-scamper-input" class="al-inline-note" placeholder="Anota una idea provocada por esta lente SCAMPER..." required></textarea>
            <div>
              <button type="submit" class="al-btn al-btn-primary al-btn-sm">${Icons.sparkles(14)}<span>Guardar en Banco de Ideas</span></button>
            </div>
          </form>
        </section>

        <section class="al-panel">
          <div class="al-card-head">
            <div>
              <h2>Combinaciones Forzadas</h2>
              <p class="al-muted" style="margin:2px 0 0">Fusiona dos conceptos distintos en una sola solución original.</p>
            </div>
            <button type="button" class="al-btn al-btn-sm" id="al-cr-roll-combo">${Icons.refresh(14)}<span>Girar par</span></button>
          </div>
          <div class="al-combo-pair">
            <span class="al-step-pill is-active">${esc(conceptA)}</span>
            <strong>+</strong>
            <span class="al-step-pill is-active">${esc(conceptB)}</span>
          </div>
          <form id="al-cr-combo-form" class="al-vault-form-stack" style="margin-top:10px">
            <textarea id="al-cr-combo-input" class="al-inline-note" placeholder="¿Qué crearías combinando ambos conceptos?" required></textarea>
            <div>
              <button type="submit" class="al-btn al-btn-primary al-btn-sm">${Icons.sparkles(14)}<span>Guardar combinación</span></button>
            </div>
          </form>
        </section>
      </div>

      <section class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Sprint Creativo: 10 ideas en 3 minutos (${this.sprintDraftIdeas.length}/10)</h2>
            <p class="al-muted" style="margin:2px 0 0">Tema: <strong>${esc(sprintTheme)}</strong></p>
          </div>
          <div class="al-tool-group">
            <span class="al-fl-clock" id="al-cr-sprint-clock" style="font-size:1.5rem">${mm}:${ss}</span>
            <button type="button" class="al-btn al-btn-primary al-btn-sm" id="al-cr-sprint-toggle">
              ${this.sprintRunning ? Icons.pause(14) : Icons.play(14)}<span>${this.sprintRunning ? 'Pausar' : 'Iniciar 3 min'}</span>
            </button>
            <button type="button" class="al-btn al-btn-sm" id="al-cr-sprint-theme">${Icons.refresh(14)}<span>Otro tema</span></button>
          </div>
        </div>

        <form id="al-cr-sprint-add" class="al-vault-note-form" style="margin-top:10px">
          <input type="text" id="al-cr-sprint-input" class="al-vault-note-input" placeholder="Escribe una idea rápida y pulsa Enter (sin filtrar ni juzgar)..." />
          <button type="submit" class="al-btn al-btn-primary al-btn-sm">${Icons.plus(14)}<span>Agregar (#${this.sprintDraftIdeas.length + 1})</span></button>
        </form>

        ${
          this.sprintDraftIdeas.length > 0
            ? `
          <ol class="al-fl-steps" style="margin-top:10px">
            ${this.sprintDraftIdeas.map((idea) => `<li>${esc(idea)}</li>`).join('')}
          </ol>
          <div class="al-tool-group" style="margin-top:10px">
            <button type="button" class="al-btn al-btn-primary al-btn-sm" id="al-cr-sprint-save-all">${Icons.check(14)}<span>Guardar sprint en Banco de Ideas</span></button>
            <button type="button" class="al-btn al-btn-sm" id="al-cr-sprint-clear">Limpiar borrador</button>
          </div>`
            : ''
        }
        ${this.creativeMsg ? `<p class="al-muted" style="margin:8px 0 0;color:var(--accent-primary)">${esc(this.creativeMsg)}</p>` : ''}
      </section>

      <section class="al-panel">
        <div class="al-card-head">
          <h2>Tu Banco de Ideas (${mProg.ideaBank.length})</h2>
          <span class="al-muted" style="font-size:0.8rem">Sincronizado automáticamente en tu perfil</span>
        </div>
        ${
          mProg.ideaBank.length === 0
            ? '<p class="al-muted" style="margin-top:8px">Aún no guardas ideas creativas. Usa SCAMPER, Combinaciones o el Sprint arriba.</p>'
            : `<div class="al-study-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-top:10px">
                ${mProg.ideaBank
                  .map(
                    (it) => `
                  <article class="al-study-card is-done">
                    <div class="al-card-head">
                      <span class="al-mono-pill">${it.technique === 'scamper' ? 'SCAMPER' : it.technique === 'combinacion' ? 'Combinación' : 'Sprint 10'}</span>
                      <button type="button" class="al-icon-btn" data-cr-del="${esc(it.id)}" title="Eliminar idea">${Icons.trash(13)}</button>
                    </div>
                    <small class="al-muted">${esc(it.prompt)}</small>
                    <p style="margin:4px 0 0;font-size:0.88rem;white-space:pre-line">${esc(it.idea)}</p>
                  </article>`
                  )
                  .join('')}
              </div>`
        }
      </section>
    `;
  }

  private bindEvents(container: HTMLElement): void {
    container.querySelector('#al-mind-add-btn')?.addEventListener('click', () => {
      this.addFormOpen = !this.addFormOpen;
      this.render(container);
    });

    container.querySelector('#al-mind-add-close')?.addEventListener('click', () => {
      this.addFormOpen = false;
      this.render(container);
    });

    container.querySelector('#al-mind-add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const quote = container.querySelector<HTMLInputElement>('#al-mp-quote')!.value.trim();
      const author = container.querySelector<HTMLInputElement>('#al-mp-author')!.value.trim() || 'Nota personal';
      const category = container.querySelector<HTMLSelectElement>('#al-mp-cat')!.value as PhraseItem['category'];
      const meaning = container.querySelector<HTMLInputElement>('#al-mp-meaning')!.value.trim() || 'Recordatorio personal.';
      const dailyAction = container.querySelector<HTMLInputElement>('#al-mp-action')!.value.trim() || 'Aplicarlo hoy una vez.';
      if (!quote) return;
      lifeStore.addCustomPhrase({
        category,
        quote,
        author,
        meaning,
        whenToUse: 'En el momento que necesites recordar este enfoque.',
        dailyAction,
      });
      this.addFormOpen = false;
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-mmode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.updateProgress('mindset', { mode: btn.dataset.mmode as MindsetMode });
        this.render(container);
      });
    });

    container.querySelector('#al-mind-rotate-mission')?.addEventListener('click', () => {
      this.missionOffset += 1;
      this.render(container);
    });

    container.querySelector('#al-mind-shuffle')?.addEventListener('click', () => {
      this.shuffleNonce += 1;
      this.render(container);
    });

    container.querySelector('#al-mind-only-refl')?.addEventListener('click', () => {
      this.onlyWithReflection = !this.onlyWithReflection;
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.updateModulePrefs('mindset', {
          category: btn.dataset.cat as 'all' | 'favs' | PhraseItem['category'],
        });
        this.render(container);
      });
    });

    container.querySelector('#al-phrase-search')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      lifeStore.updateModulePrefs('mindset', { searchQuery: val });
      this.render(container);
      const nextInput = container.querySelector<HTMLInputElement>('#al-phrase-search');
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(val.length, val.length);
      }
    });

    container.querySelectorAll<HTMLButtonElement>('[data-fav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.toggleFavoritePhrase(btn.dataset.fav!);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-del-phrase]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.removeCustomPhrase(btn.dataset.delPhrase!);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-toggle-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.toggleMindsetAction(btn.dataset.toggleAction!);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLInputElement>('[data-check-action]').forEach((chk) => {
      chk.addEventListener('change', () => {
        lifeStore.toggleMindsetAction(chk.dataset.checkAction!);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-toggle-inline-refl]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggleInlineRefl!;
        this.openInlineReflectionId = this.openInlineReflectionId === id ? null : id;
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLTextAreaElement>('[data-refl-input]').forEach((area) => {
      const id = area.dataset.reflInput!;
      const statusEl = container.querySelector<HTMLElement>(`[data-refl-status="${CSS.escape(id)}"]`);

      area.addEventListener('input', () => {
        const prev = this.saveTimers.get(id);
        if (prev) window.clearTimeout(prev);
        if (statusEl) statusEl.textContent = 'Guardando...';
        const timerId = window.setTimeout(() => {
          lifeStore.saveMindsetReflection(id, area.value);
          this.saveTimers.delete(id);
          if (statusEl) statusEl.textContent = area.value.trim() ? 'Guardado automáticamente' : 'Reflexión vacía';
        }, 450);
        this.saveTimers.set(id, timerId);
      });

      area.addEventListener('blur', () => {
        const prev = this.saveTimers.get(id);
        if (prev) {
          window.clearTimeout(prev);
          this.saveTimers.delete(id);
        }
        lifeStore.saveMindsetReflection(id, area.value);
        if (statusEl) statusEl.textContent = area.value.trim() ? 'Guardado en tu perfil' : 'Sin reflexión';
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-refl-save]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.reflSave!;
        const area = container.querySelector<HTMLTextAreaElement>(`[data-refl-input="${CSS.escape(id)}"]`);
        if (area) {
          lifeStore.saveMindsetReflection(id, area.value);
        }
        this.render(container);
      });
    });

    // Creatividad events
    container.querySelector('#al-cr-next-scamper')?.addEventListener('click', () => {
      this.scamperIdx = (this.scamperIdx + 1) % SCAMPER_PROMPTS.length;
      this.render(container);
    });
    container.querySelector('#al-cr-scamper-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = container.querySelector<HTMLTextAreaElement>('#al-cr-scamper-input')?.value.trim() ?? '';
      if (!txt) return;
      const sc = SCAMPER_PROMPTS[this.scamperIdx % SCAMPER_PROMPTS.length];
      lifeStore.addCreativeIdea({ technique: 'scamper', prompt: `SCAMPER (${sc.verb}): ${sc.target}`, idea: txt });
      this.creativeMsg = 'Idea SCAMPER guardada en tu Banco.';
      this.render(container);
    });
    container.querySelector('#al-cr-roll-combo')?.addEventListener('click', () => {
      this.comboSeed += 1;
      this.render(container);
    });
    container.querySelector('#al-cr-combo-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = container.querySelector<HTMLTextAreaElement>('#al-cr-combo-input')?.value.trim() ?? '';
      if (!txt) return;
      const a = FORCED_CONCEPTS_A[this.comboSeed % FORCED_CONCEPTS_A.length];
      const b = FORCED_CONCEPTS_B[(this.comboSeed * 3 + 5) % FORCED_CONCEPTS_B.length];
      lifeStore.addCreativeIdea({ technique: 'combinacion', prompt: `${a} + ${b}`, idea: txt });
      this.creativeMsg = 'Combinación guardada en tu Banco.';
      this.render(container);
    });
    container.querySelector('#al-cr-sprint-theme')?.addEventListener('click', () => {
      this.stopSprintTimer();
      this.sprintThemeIdx = (this.sprintThemeIdx + 1) % SPRINT10_THEMES.length;
      this.sprintRemainingSec = 180;
      this.sprintDraftIdeas = [];
      this.render(container);
    });
    container.querySelector('#al-cr-sprint-toggle')?.addEventListener('click', () => {
      if (this.sprintRunning) {
        this.stopSprintTimer();
        this.render(container);
      } else {
        if (this.sprintRemainingSec <= 0) this.sprintRemainingSec = 180;
        this.sprintRunning = true;
        this.sprintTimerId = window.setInterval(() => {
          this.sprintRemainingSec = Math.max(0, this.sprintRemainingSec - 1);
          const el = container.querySelector('#al-cr-sprint-clock');
          if (el) {
            el.textContent = `${String(Math.floor(this.sprintRemainingSec / 60)).padStart(2, '0')}:${String(this.sprintRemainingSec % 60).padStart(2, '0')}`;
          }
          if (this.sprintRemainingSec <= 0) {
            this.stopSprintTimer();
            this.creativeMsg = `Tiempo cumplido: lograste ${this.sprintDraftIdeas.length} ideas.`;
            this.render(container);
          }
        }, 1000);
        this.render(container);
      }
    });
    container.querySelector('#al-cr-sprint-add')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const inp = container.querySelector<HTMLInputElement>('#al-cr-sprint-input');
      const val = inp?.value.trim() ?? '';
      if (!val) return;
      this.sprintDraftIdeas.push(val);
      this.render(container);
      container.querySelector<HTMLInputElement>('#al-cr-sprint-input')?.focus();
    });
    container.querySelector('#al-cr-sprint-save-all')?.addEventListener('click', () => {
      if (this.sprintDraftIdeas.length === 0) return;
      this.stopSprintTimer();
      const theme = SPRINT10_THEMES[this.sprintThemeIdx % SPRINT10_THEMES.length];
      lifeStore.addCreativeIdea({
        technique: 'sprint10',
        prompt: theme,
        idea: this.sprintDraftIdeas.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      });
      this.sprintDraftIdeas = [];
      this.sprintRemainingSec = 180;
      this.creativeMsg = 'Sprint guardado en tu Banco de Ideas.';
      this.render(container);
    });
    container.querySelector('#al-cr-sprint-clear')?.addEventListener('click', () => {
      this.stopSprintTimer();
      this.sprintDraftIdeas = [];
      this.sprintRemainingSec = 180;
      this.render(container);
    });
    container.querySelectorAll<HTMLButtonElement>('[data-cr-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.deleteCreativeIdea(btn.dataset.crDel!);
        this.render(container);
      });
    });
  }

  public unmount(): void {
    this.stopSprintTimer();
    this.saveTimers.forEach((t) => window.clearTimeout(t));
    this.saveTimers.clear();
  }
}
