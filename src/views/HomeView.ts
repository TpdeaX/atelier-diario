import { DRAWING_LESSONS } from '../data/DrawingBank';
import { PHRASES_BANK, VOCABULARY_DECK } from '../data/KnowledgeBank';
import { SINGING_DRILLS, SINGING_SONGS } from '../data/SingingBank';
import { Icons } from '../icons';
import { cloudSync } from '../services/CloudSync';
import { buildHomeCockpit } from '../services/HomeRecommendations';
import { fetchRandomWikiSummary, WikiSummary } from '../services/OnlineApi';
import {
  importUmbralBackupJson,
  loadUmbralSnapshot,
  resolveCompanionUrl,
  resolveEcoUrl,
  UmbralSnapshot,
} from '../services/UmbralBridge';
import { lifeStore } from '../state/LifeStore';
import { HabitKey, ModuleId, PracticeModuleId } from '../types';
import { difficultyLabel } from '../ui/DidacticBar';

type AtelierTrack = 'all' | 'estudio' | 'expresion' | 'bienestar';

interface AtelierModuleCard {
  id: PracticeModuleId;
  title: string;
  track: Exclude<AtelierTrack, 'all'>;
  trackLabel: string;
  subtitle: string;
  icon: (s?: number) => string;
  habitKey: HabitKey;
  badgeText: string;
}

const TRACK_TABS: { id: AtelierTrack; label: string }[] = [
  { id: 'all', label: 'Todos los talleres (17)' },
  { id: 'estudio', label: 'Mente y Estudio (7)' },
  { id: 'expresion', label: 'Expresión y Arte (5)' },
  { id: 'bienestar', label: 'Bienestar y Vida (5)' },
];

const HABIT_LABELS: { key: HabitKey; label: string; target: ModuleId }[] = [
  { key: 'read', label: 'Lectura online', target: 'reader' },
  { key: 'studio', label: 'Cuaderno y PDF', target: 'studio' },
  { key: 'calligraphy', label: 'Caligrafía', target: 'calligraphy' },
  { key: 'drawing', label: 'Dibujo guiado', target: 'drawing' },
  { key: 'typing', label: 'Mecanografía', target: 'typing' },
  { key: 'language', label: 'Ortografía y léxico', target: 'language' },
  { key: 'mindset', label: 'Frases e ideas', target: 'mindset' },
  { key: 'focuslab', label: 'Oratoria y enfoque', target: 'focuslab' },
  { key: 'singing', label: 'Canto y afinación', target: 'singing' },
  { key: 'calm', label: 'Calma y respiración', target: 'calm' },
  { key: 'critical', label: 'Pensamiento crítico', target: 'critical' },
  { key: 'writing', label: 'Escritura clara', target: 'writing' },
  { key: 'finance', label: 'Finanzas personales', target: 'finance' },
  { key: 'vitality', label: 'Postura Pro', target: 'vitality' },
  { key: 'compass', label: 'Brújula personal', target: 'compass' },
  { key: 'career', label: 'Social y carrera', target: 'career' },
  { key: 'guides', label: 'Rutas YouTube', target: 'guides' },
];

export class HomeView {
  private wikiCache: WikiSummary | null = null;
  private wikiLoading = false;
  private wikiError = '';
  private activeTrack: AtelierTrack = 'all';
  private searchQuery = '';
  private lastUmbralSnap: UmbralSnapshot | null = null;

  private buildModules(): AtelierModuleCard[] {
    const profile = lifeStore.get();
    return [
      {
        id: 'reader',
        title: 'Biblioteca y Lector',
        track: 'estudio',
        trackLabel: 'Mente y Estudio',
        subtitle:
          profile.bookmarks.length > 0
            ? `${profile.bookmarks.length} marcadores · ${profile.readerFontSize}px`
            : 'Wikisource, Open Library y lectura RSVP',
        icon: Icons.book,
        habitKey: 'read',
        badgeText: profile.todayHabits.read ? 'Hecho hoy' : 'Lectura',
      },
      {
        id: 'studio',
        title: 'Cuaderno y PDF',
        track: 'estudio',
        trackLabel: 'Mente y Estudio',
        subtitle: 'Anotaciones vectoriales tipo tablet y biblioteca PDF',
        icon: Icons.tablet,
        habitKey: 'studio',
        badgeText: profile.todayHabits.studio ? 'Hecho hoy' : 'Sincronizado',
      },
      {
        id: 'language',
        title: 'Ortografía y Léxico',
        track: 'estudio',
        trackLabel: 'Mente y Estudio',
        subtitle: `${profile.stats.orthographyCorrect}/${profile.stats.orthographyTotal} aciertos · ${profile.savedWords.length} palabras`,
        icon: Icons.spell,
        habitKey: 'language',
        badgeText: profile.todayHabits.language ? 'Hecho hoy' : 'Idioma',
      },
      {
        id: 'focuslab',
        title: 'Oratoria, SM-2 y Feynman',
        track: 'estudio',
        trackLabel: 'Mente y Estudio',
        subtitle: `${profile.stats.oratorySessions} exposiciones · ${profile.stats.recallReviewed} evocaciones`,
        icon: Icons.mic,
        habitKey: 'focuslab',
        badgeText: profile.todayHabits.focuslab ? 'Hecho hoy' : 'Recall',
      },
      {
        id: 'critical',
        title: 'Pensamiento Crítico',
        track: 'estudio',
        trackLabel: 'Mente y Estudio',
        subtitle: `${profile.progress.critical.masteredIds.length}/18 casos · ${profile.progress.critical.decisions.length} matrices`,
        icon: Icons.scale,
        habitKey: 'critical',
        badgeText: profile.todayHabits.critical ? 'Hecho hoy' : 'Criterio',
      },
      {
        id: 'typing',
        title: 'Mecanografía',
        track: 'estudio',
        trackLabel: 'Mente y Estudio',
        subtitle: `Récord PC ${profile.stats.bestWpmPc} · Móvil ${profile.stats.bestWpmMobile} PPM`,
        icon: Icons.keyboard,
        habitKey: 'typing',
        badgeText: profile.todayHabits.typing ? 'Hecho hoy' : 'Velocidad',
      },
      {
        id: 'guides',
        title: 'Rutas y YouTube',
        track: 'estudio',
        trackLabel: 'Mente y Estudio',
        subtitle: `${profile.progress.guides.completedSteps.length} etapas hechas · Rutas guiadas de aprendizaje`,
        icon: Icons.youtube,
        habitKey: 'guides',
        badgeText: profile.todayHabits.guides ? 'Hecho hoy' : 'Rutas',
      },
      {
        id: 'drawing',
        title: 'Taller de Dibujo',
        track: 'expresion',
        trackLabel: 'Expresión y Arte',
        subtitle:
          profile.stats.drawingSheets > 0
            ? `${profile.stats.drawingSheets} láminas · ${DRAWING_LESSONS.length} lecciones y lienzo libre`
            : `${DRAWING_LESSONS.length} lecciones guiadas, perspectiva y simetría`,
        icon: Icons.palette,
        habitKey: 'drawing',
        badgeText: profile.todayHabits.drawing ? 'Hecho hoy' : 'Dibujo',
      },
      {
        id: 'calligraphy',
        title: 'Taller de Caligrafía',
        track: 'expresion',
        trackLabel: 'Expresión y Arte',
        subtitle: `${profile.stats.calligraphySheets} hojas practicadas · Pauta 55°`,
        icon: Icons.pen,
        habitKey: 'calligraphy',
        badgeText: profile.todayHabits.calligraphy ? 'Hecho hoy' : 'Trazos',
      },
      {
        id: 'singing',
        title: 'Estudio de Canto',
        track: 'expresion',
        trackLabel: 'Expresión y Arte',
        subtitle:
          profile.stats.singingBestCents !== null
            ? `Mejor ±${profile.stats.singingBestCents}c · ${SINGING_SONGS.length} canciones · ${SINGING_DRILLS.length} rutinas`
            : `${SINGING_SONGS.length} canciones, calentamiento 5 min y afinador`,
        icon: Icons.mic,
        habitKey: 'singing',
        badgeText: profile.todayHabits.singing ? 'Hecho hoy' : 'Voz',
      },
      {
        id: 'writing',
        title: 'Escritura Clara',
        track: 'expresion',
        trackLabel: 'Expresión y Arte',
        subtitle: `${profile.progress.writing.completedIds.length}/9 retos · Analizador de claridad en vivo`,
        icon: Icons.feather,
        habitKey: 'writing',
        badgeText: profile.todayHabits.writing ? 'Hecho hoy' : 'Síntesis',
      },
      {
        id: 'mindset',
        title: 'Frases y Creatividad',
        track: 'expresion',
        trackLabel: 'Expresión y Arte',
        subtitle: `${profile.favoritePhraseIds.length} favoritas · ${profile.customPhrases.length} propias · SCAMPER`,
        icon: Icons.bulb,
        habitKey: 'mindset',
        badgeText: profile.todayHabits.mindset ? 'Hecho hoy' : 'Ideas',
      },
      {
        id: 'compass',
        title: 'Brújula Personal',
        track: 'bienestar',
        trackLabel: 'Bienestar y Vida',
        subtitle: `${Object.keys(profile.progress.compass.dailyLogs).length} diarios · ${profile.progress.compass.okrs.length}/3 OKRs · Anti-hábitos`,
        icon: Icons.compass,
        habitKey: 'compass',
        badgeText: profile.todayHabits.compass ? 'Hecho hoy' : 'Brújula',
      },
      {
        id: 'calm',
        title: 'Centro de Calma',
        track: 'bienestar',
        trackLabel: 'Bienestar y Vida',
        subtitle:
          profile.stats.calmSessions > 0
            ? `${profile.stats.calmSessions} sesiones · SOS Pánico y ${profile.reframeLog.length} reencuadres`
            : 'SOS Pánico inmediato, 5-4-3-2-1 y respiración',
        icon: Icons.wind,
        habitKey: 'calm',
        badgeText: 'SOS Calma',
      },
      {
        id: 'vitality',
        title: 'Postura Pro y Energía',
        track: 'bienestar',
        trackLabel: 'Bienestar y Vida',
        subtitle: `${profile.progress.vitality.completedRoutines} pausas · Webcam local, mapa corporal y 21 días`,
        icon: Icons.activity,
        habitKey: 'vitality',
        badgeText: profile.todayHabits.vitality ? 'Hecho hoy' : 'Postura Pro',
      },
      {
        id: 'finance',
        title: 'Finanzas y Ahorro',
        track: 'bienestar',
        trackLabel: 'Bienestar y Vida',
        subtitle: `${profile.progress.finance.transactions.length} movimientos · 50/30/20 e interés compuesto`,
        icon: Icons.wallet,
        habitKey: 'finance',
        badgeText: profile.todayHabits.finance ? 'Hecho hoy' : 'Finanzas',
      },
      {
        id: 'career',
        title: 'Social y Carrera',
        track: 'bienestar',
        trackLabel: 'Bienestar y Vida',
        subtitle: `${profile.progress.career.masteredScenarioIds.length}/18 casos · Entrevistas STAR y Brag Doc`,
        icon: Icons.briefcase,
        habitKey: 'career',
        badgeText: profile.todayHabits.career ? 'Hecho hoy' : 'Carrera',
      },
    ];
  }

  public render(
    container: HTMLElement,
    navigate: (id: ModuleId) => void,
    openModal?: (m: 'cloud' | 'profile') => void
  ): void {
    const profile = lifeStore.get();
    const doneCount = Object.values(profile.todayHabits).filter(Boolean).length;
    const mastery = lifeStore.getOverallMasterySummary();
    const syncMeta = cloudSync.getSyncMeta();
    const xpRemaining = Math.max(0, mastery.nextLevelXp - mastery.totalXp);
    const saveStatusLabel = syncMeta.configured
      ? `Nube (${syncMeta.spaceCode})`
      : 'Guardado local';

    const dayIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const dailyPhrase = PHRASES_BANK[dayIdx % PHRASES_BANK.length];
    const dailyWord = VOCABULARY_DECK[dayIdx % VOCABULARY_DECK.length];
    const cockpit = buildHomeCockpit(profile, mastery.byModule, this.lastUmbralSnap);

    const esc = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const resumeHtml = cockpit.resume
      ? `
        <div class="al-cockpit-resume">
          <div class="al-cockpit-meta-row">
            <span class="al-mastery-badge">${difficultyLabel(cockpit.resume.difficulty)}</span>
            <span class="al-muted">${esc(cockpit.resume.timeLabel)}</span>
          </div>
          <strong class="al-cockpit-resume-title">${esc(cockpit.resume.title)}</strong>
          <p class="al-muted" style="margin:0;font-size:0.84rem">${esc(cockpit.resume.detail)}</p>
          <div class="al-tool-group" style="margin-top:8px">
            <button type="button" class="al-btn al-btn-primary" data-nav="${cockpit.resume.moduleId}">
              ${Icons.play(14)}<span>Continuar taller</span>
            </button>
          </div>
        </div>`
      : `
        <div class="al-cockpit-resume">
          <strong class="al-cockpit-resume-title">Listo para empezar tu sesión</strong>
          <p class="al-muted" style="margin:0;font-size:0.84rem">Abre cualquier taller y aquí quedará guardado exactamente dónde te quedaste.</p>
          <div class="al-tool-group" style="margin-top:8px">
            <button type="button" class="al-btn al-btn-primary" data-nav="${cockpit.recommended[0]?.moduleId ?? 'language'}">
              ${Icons.play(14)}<span>Empezar recomendación</span>
            </button>
          </div>
        </div>`;

    const recentHtml =
      cockpit.recent.length > 0
        ? `
        <div class="al-recent-strip" aria-label="Últimos módulos visitados">
          <span class="al-diff-caption">Recientes:</span>
          ${cockpit.recent
            .map(
              (r) => `
              <button type="button" class="al-step-pill" data-nav="${r.moduleId}" title="${esc(r.detail)}">
                ${esc(r.label.split('·')[0].trim())} · ${esc(r.timeLabel)}
              </button>`
            )
            .join('')}
        </div>`
        : '';

    const pendingHtml =
      cockpit.pending.length > 0
        ? cockpit.pending
            .map(
              (item) => `
              <button type="button" class="al-cockpit-item ${item.priority === 'high' ? 'is-priority' : ''}" data-nav="${item.moduleId}">
                <div class="al-cockpit-item-top">
                  <strong>${esc(item.title)}</strong>
                  <span class="al-mastery-badge ${item.priority === 'high' ? 'is-warn' : ''}">${esc(item.badge)}</span>
                </div>
                <span class="al-cockpit-item-sub">${esc(item.subtitle)}</span>
                <span class="al-cockpit-item-cta">${esc(item.cta)}${item.durationLabel ? ` · ${esc(item.durationLabel)}` : ''}</span>
              </button>`
            )
            .join('')
        : `<p class="al-muted" style="margin:4px 0 0;font-size:0.85rem">Todo limpio: sin lecturas a medias ni fallos pendientes.</p>`;

    const recommendedHtml = cockpit.recommended
      .map(
        (rec) => `
        <button type="button" class="al-cockpit-item" data-nav="${rec.moduleId}">
          <div class="al-cockpit-item-top">
            <strong>${esc(rec.title)}</strong>
            <span class="al-mastery-badge">${esc(rec.badge)}</span>
          </div>
          <span class="al-cockpit-item-sub">${esc(rec.subtitle)}</span>
          <span class="al-cockpit-item-cta">${esc(rec.cta)}${rec.durationLabel ? ` · ${esc(rec.durationLabel)}` : ''}</span>
        </button>`
      )
      .join('');

    const modules = this.buildModules();
    const q = this.searchQuery.trim().toLowerCase();
    const visibleModules = modules.filter((m) => {
      if (this.activeTrack !== 'all' && m.track !== this.activeTrack) return false;
      if (q && !`${m.title} ${m.subtitle} ${m.trackLabel} ${m.badgeText}`.toLowerCase().includes(q)) return false;
      return true;
    });

    const tilesHtml = visibleModules
      .map((item) => {
        const modPct = mastery.byModule[item.id] ?? 0;
        const modDiff = difficultyLabel(lifeStore.getDifficulty(item.id));
        const doneToday = profile.todayHabits[item.habitKey];
        return `
          <button type="button" class="al-dir-card ${doneToday ? 'is-done-today' : ''}" data-nav="${item.id}" data-track="${item.track}">
            <div class="al-mod-head">
              <span class="al-track-pill">${esc(item.trackLabel)}</span>
              <span class="al-mod-icon-box" aria-hidden="true">${item.icon(16)}</span>
            </div>
            <div class="al-tile-title">
              <strong>${esc(item.title)}</strong>
              <p class="al-tile-sub">${esc(item.subtitle)}</p>
            </div>
            <div class="al-tile-progress" aria-label="Dominio ${modPct}%, dificultad ${modDiff}">
              <div class="al-tile-prog-track">
                <div class="al-tile-prog-fill" style="width:${modPct}%"></div>
              </div>
              <div class="al-tile-prog-meta">
                <span>${esc(item.badgeText)} · ${esc(modDiff)}</span>
                <strong>${modPct}%</strong>
              </div>
            </div>
          </button>`;
      })
      .join('');

    const habitChips = HABIT_LABELS.map((h) => {
      const done = profile.todayHabits[h.key];
      return `
        <button type="button" class="al-habit-chip ${done ? 'is-done' : ''}" data-nav="${h.target}">
          <span class="al-habit-check">${done ? Icons.check(13) : ''}</span>
          <span>${h.label}</span>
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div class="al-page al-home">
        <section class="al-panel al-global-mastery" aria-label="Progreso global de Atelier Diario">
          <div class="al-global-mastery-left">
            <div class="al-level-orb" aria-label="Nivel ${mastery.level}">
              <small>NV</small>
              <span>${mastery.level}</span>
            </div>
            <div>
              <h1 class="al-home-h1">Tu Taller de Hoy</h1>
              <p class="al-muted" style="margin:2px 0 0; font-size:0.84rem;">
                ${doneCount}/${HABIT_LABELS.length} hábitos hoy · ${mastery.totalXp} XP · Faltan ${xpRemaining} XP para Nv ${mastery.level + 1}
              </p>
            </div>
          </div>

          <div class="al-didactic-progress" style="max-width:300px;">
            <div class="al-didactic-prog-head">
              <span class="al-didactic-label">Avance Nivel ${mastery.level + 1}</span>
              <strong class="al-didactic-pct">${mastery.levelPct}%</strong>
            </div>
            <progress class="al-didactic-meter" value="${mastery.levelPct}" max="100" aria-label="Progreso hacia el siguiente nivel: ${mastery.levelPct}%"></progress>
            <div class="al-didactic-meta">
              <span>Racha: ${profile.dailyStreak === 1 ? '1 día' : `${profile.dailyStreak} días`}</span>
              <span>Guías: ${profile.progress.tutorialsDone.length}</span>
            </div>
          </div>

          <div class="al-tool-group">
            <button type="button" class="al-save-chip ${syncMeta.configured ? 'is-cloud' : ''}" id="al-home-sync-now" title="Guardar y sincronizar progreso ahora">
              ${syncMeta.configured ? Icons.cloud(13) : Icons.check(13)}<span>${saveStatusLabel}</span>
            </button>
            <a class="al-btn" href="${resolveEcoUrl('directorio')}">Directorio y Ruta 15m →</a>
          </div>
        </section>

        <section class="al-cockpit-grid" aria-label="Continuar y recomendaciones de Atelier">
          <article class="al-panel al-cockpit-card is-active-leg">
            <div class="al-card-head">
              <h2>Donde lo dejaste</h2>
              <span class="al-muted" style="font-size:0.76rem">Autoguardado</span>
            </div>
            ${resumeHtml}
            ${recentHtml}
          </article>

          <article class="al-panel al-cockpit-card">
            <div class="al-card-head">
              <h2>Pendientes (${cockpit.pending.length})</h2>
              <span class="al-muted" style="font-size:0.76rem">Retoma sin perder nada</span>
            </div>
            <div class="al-cockpit-list">${pendingHtml}</div>
          </article>

          <article class="al-panel al-cockpit-card">
            <div class="al-card-head">
              <h2>Recomendado ahora</h2>
              <span class="al-muted" style="font-size:0.76rem">Según tu avance</span>
            </div>
            <div class="al-cockpit-list">${recommendedHtml}</div>
          </article>
        </section>

        <section class="al-dir-toolbar" aria-label="Filtrar talleres de Atelier Diario">
          <div class="al-seg-tabs" role="tablist">
            ${TRACK_TABS.map(
              (t) => `
              <button type="button" class="al-seg-btn ${this.activeTrack === t.id ? 'is-active' : ''}" data-track-tab="${t.id}" role="tab" aria-selected="${this.activeTrack === t.id ? 'true' : 'false'}">
                ${t.label}
              </button>`
            ).join('')}
          </div>

          <div class="al-home-search-wrap">
            <input
              type="search"
              id="al-home-search"
              class="al-home-search"
              value="${esc(this.searchQuery)}"
              placeholder="Buscar en los 17 talleres..."
              aria-label="Buscar taller de Atelier Diario"
            />
          </div>
        </section>

        <section class="al-dir-grid" aria-label="Los 17 talleres de Atelier Diario">
          ${
            tilesHtml ||
            `<div class="al-panel al-muted" style="grid-column:1 / -1;">Sin talleres que coincidan con "${esc(this.searchQuery)}". <button type="button" class="al-link-btn" id="al-clear-home-search">Limpiar búsqueda</button></div>`
          }
        </section>

        <section class="al-pulse-row">
          <div class="al-panel al-habits-card">
            <div class="al-card-head">
              <h2>Ritmo de hoy (${doneCount}/${HABIT_LABELS.length})</h2>
              <span class="al-streak-badge">${profile.dailyStreak === 1 ? '1 día seguido' : `${profile.dailyStreak} días seguidos`}</span>
            </div>
            <div class="al-habits-list">${habitChips}</div>
            <div class="al-mini-metrics">
              <div><span>Dibujo</span><strong>${profile.stats.drawingSheets}</strong></div>
              <div><span>Ortografía</span><strong>${profile.stats.orthographyCorrect}/${profile.stats.orthographyTotal}</strong></div>
              <div><span>Tipeo PC / Móvil</span><strong>${profile.stats.bestWpmPc} / ${profile.stats.bestWpmMobile}</strong></div>
              <div><span>Calma</span><strong>${profile.stats.calmSessions}</strong></div>
            </div>
          </div>

          <section class="al-panel al-umbral-bridge" id="al-umbral-bridge">
            <div class="al-card-head">
              <div>
                <h2>Pulso académico (UNUmbral)</h2>
                <p class="al-muted" id="al-umbral-status">Sincronizando horario y tareas...</p>
              </div>
              <div class="al-tool-group">
                <label class="al-btn" title="Importar respaldo JSON exportado desde UNUmbral">
                  <span>Importar JSON</span>
                  <input type="file" id="al-umbral-file" accept=".json,application/json" style="display:none" />
                </label>
                <a class="al-btn al-btn-primary" href="${resolveCompanionUrl('unumbral')}">Abrir UNUmbral</a>
              </div>
            </div>
            <div id="al-umbral-body" class="al-umbral-grid"></div>
          </section>
        </section>

        <section class="al-capsules-grid">
          <article class="al-panel al-capsule">
            <div class="al-card-head">
              <h2>Palabra útil del día</h2>
              <button type="button" class="al-link-btn" data-nav="language">Practicar léxico</button>
            </div>
            <div class="al-word-big">${dailyWord.word}</div>
            <p class="al-capsule-text">${dailyWord.meaning}</p>
            <p class="al-capsule-sub">Úsala en lugar de: <em>«${dailyWord.replaces ?? 'algo genérico'}»</em> · Ej: ${dailyWord.example}</p>
          </article>

          <article class="al-panel al-capsule">
            <div class="al-card-head">
              <h2>Idea para recordar</h2>
              <button type="button" class="al-link-btn" data-nav="mindset">Ver cuaderno</button>
            </div>
            <blockquote class="al-quote-mini">«${dailyPhrase.quote}»</blockquote>
            <p class="al-capsule-text">${dailyPhrase.meaning}</p>
            <p class="al-capsule-sub"><strong>Reto:</strong> ${dailyPhrase.dailyAction}</p>
          </article>

          <article class="al-panel al-capsule">
            <div class="al-card-head">
              <h2>Dato vivo de Wikipedia</h2>
              <button type="button" class="al-icon-btn" id="al-wiki-refresh" title="Cargar otro tema">${Icons.refresh(16)}</button>
            </div>
            <div id="al-wiki-slot"></div>
          </article>
        </section>
      </div>
    `;

    container.querySelector('#al-home-sync-now')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLButtonElement;
      const span = btn.querySelector('span');
      if (span) span.textContent = 'Guardando...';
      const ok = await lifeStore.pushNow();
      if (span) {
        span.textContent = ok
          ? 'Sincronizado ahora'
          : cloudSync.isConfigured()
            ? 'Guardado local (sin red)'
            : 'Guardado en este dispositivo';
      }
      btn.classList.add('is-saved-flash');
      window.setTimeout(() => btn.classList.remove('is-saved-flash'), 1200);
    });

    container.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.dataset.nav as ModuleId));
    });

    container.querySelectorAll<HTMLButtonElement>('[data-track-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTrack = btn.dataset.trackTab as AtelierTrack;
        this.render(container, navigate, openModal);
      });
    });

    const searchInput = container.querySelector<HTMLInputElement>('#al-home-search');
    searchInput?.addEventListener('input', () => {
      const pos = searchInput.selectionStart ?? searchInput.value.length;
      this.searchQuery = searchInput.value;
      this.render(container, navigate, openModal);
      const nextInput = container.querySelector<HTMLInputElement>('#al-home-search');
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(pos, pos);
      }
    });

    container.querySelector('#al-clear-home-search')?.addEventListener('click', () => {
      this.searchQuery = '';
      this.activeTrack = 'all';
      this.render(container, navigate, openModal);
    });

    const wikiSlot = container.querySelector<HTMLDivElement>('#al-wiki-slot')!;
    const refreshBtn = container.querySelector<HTMLButtonElement>('#al-wiki-refresh')!;

    const renderWikiSlot = () => {
      if (this.wikiLoading) {
        wikiSlot.innerHTML = `<p class="al-muted">Consultando artículo en español...</p>`;
      } else if (this.wikiError) {
        wikiSlot.innerHTML = `<p class="al-muted">${this.wikiError}</p>`;
      } else if (this.wikiCache) {
        wikiSlot.innerHTML = `
          <div class="al-wiki-title">${this.wikiCache.title}</div>
          <p class="al-capsule-text">${this.wikiCache.extract.slice(0, 200)}${this.wikiCache.extract.length > 200 ? '…' : ''}</p>
        `;
      }
    };

    const loadWiki = async () => {
      this.wikiLoading = true;
      this.wikiError = '';
      renderWikiSlot();
      try {
        this.wikiCache = await fetchRandomWikiSummary();
      } catch {
        this.wikiError = 'No se pudo cargar Wikipedia ahora. Pulsa recargar.';
      } finally {
        this.wikiLoading = false;
        renderWikiSlot();
      }
    };

    refreshBtn.addEventListener('click', () => void loadWiki());
    if (!this.wikiCache) {
      void loadWiki();
    } else {
      renderWikiSlot();
    }

    const umbralStatus = container.querySelector<HTMLElement>('#al-umbral-status')!;
    const umbralBody = container.querySelector<HTMLElement>('#al-umbral-body')!;
    const fileInput = container.querySelector<HTMLInputElement>('#al-umbral-file')!;

    const paintUmbral = (snap: UmbralSnapshot) => {
      this.lastUmbralSnap = snap;
      if (snap.source === 'none') {
        umbralStatus.textContent =
          'Sin datos de UNUmbral en este origen. Abre UNUmbral o activa la Nube para verlos aquí.';
        umbralBody.innerHTML = openModal
          ? '<button type="button" class="al-btn" id="al-umbral-open-cloud">Configurar Nube</button>'
          : '';
        umbralBody.querySelector('#al-umbral-open-cloud')?.addEventListener('click', () => openModal?.('cloud'));
        return;
      }
      const originLabel =
        snap.source === 'indexeddb'
          ? 'En vivo desde UmbralDB'
          : snap.source === 'supabase'
            ? 'Sincronizado desde Supabase'
            : 'Respaldo JSON cargado';
      umbralStatus.textContent = `${originLabel} · ${snap.todayClassesCount} clases hoy · ${snap.pendingCount} tareas pendientes`;

      const gapHtml = snap.freeGaps.length
        ? snap.freeGaps
            .slice(0, 2)
            .map(
              (g) => `
          <div class="al-umbral-chip">
            <strong>Hueco libre (${g.duracionMin} min)</strong>
            <span>${g.inicioLabel} – ${g.finLabel} · Ideal para lectura o 5 min de canto</span>
          </div>`
            )
            .join('')
        : '<div class="al-umbral-chip"><strong>Sin huecos largos entre clases hoy</strong><span>Puedes hacer 1 reto corto de ortografía o respiración.</span></div>';

      const taskHtml = snap.criticalTasks.length
        ? snap.criticalTasks
            .slice(0, 2)
            .map(
              (t) => `
          <div class="al-umbral-chip is-critical">
            <strong>Entrega crítica (Nv ${t.importancia ?? 4})</strong>
            <span>${t.titulo ?? 'Tarea pendiente'}</span>
          </div>`
            )
            .join('')
        : '<div class="al-umbral-chip"><strong>Sin entregas críticas urgentes</strong><span>Buen día para avanzar con calma.</span></div>';

      umbralBody.innerHTML = gapHtml + taskHtml;
    };

    void loadUmbralSnapshot().then(paintUmbral);

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const txt = await file.text();
        const snap = importUmbralBackupJson(txt);
        paintUmbral(snap);
      } catch {
        umbralStatus.textContent = 'No se pudo leer ese archivo JSON de respaldo.';
      }
    });
  }
}
