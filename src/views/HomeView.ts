import { DRAWING_LESSONS } from '../data/DrawingBank';
import { PHRASES_BANK, VOCABULARY_DECK } from '../data/KnowledgeBank';
import { VAULT_BANK } from '../data/SavedVaultBank';
import { SINGING_DRILLS, SINGING_SONGS } from '../data/SingingBank';
import { Icons } from '../icons';
import { fetchRandomWikiSummary, WikiSummary } from '../services/OnlineApi';
import {
  ArenaSnapshot,
  importUmbralBackupJson,
  loadArenaSnapshot,
  loadUmbralSnapshot,
  readArenaCatalogMeta,
  resolveCompanionUrl,
  UmbralSnapshot,
} from '../services/UmbralBridge';
import { directoryStore } from '../state/DirectoryStore';
import { lifeStore } from '../state/LifeStore';
import { DirectoryCategory, HabitKey, ModuleId } from '../types';

export interface DirectoryEntry {
  id: string;
  title: string;
  prefix: string;
  subtitle: string;
  category: DirectoryCategory;
  c1: string;
  c2: string;
  icon: (s?: number) => string;
  route?: ModuleId;
  externalUrl?: string;
  badgeText?: string;
  isCustom?: boolean;
}

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
];

const CUSTOM_COLORS: { label: string; c1: string; c2: string }[] = [
  { label: 'Naranja Terracota', c1: '#E06B2B', c2: '#F4A261' },
  { label: 'Azul Cobalto', c1: '#2563EB', c2: '#60A5FA' },
  { label: 'Pizarra Grafito', c1: '#334155', c2: '#94A3B8' },
  { label: 'Turquesa Mar', c1: '#0D9488', c2: '#5EEAD4' },
  { label: 'Verde Bosque', c1: '#15803D', c2: '#4ADE80' },
  { label: 'Índigo Estudio', c1: '#4F46E5', c2: '#818CF8' },
];

function iconForKey(key: string): (s?: number) => string {
  switch (key) {
    case 'graduation':
      return Icons.graduation;
    case 'gamepad':
      return Icons.gamepad;
    case 'book':
      return Icons.book;
    case 'tablet':
      return Icons.tablet;
    case 'pen':
      return Icons.pen;
    case 'palette':
      return Icons.palette;
    case 'keyboard':
      return Icons.keyboard;
    case 'spell':
      return Icons.spell;
    case 'bulb':
      return Icons.bulb;
    case 'mic':
      return Icons.mic;
    case 'wind':
      return Icons.wind;
    default:
      return Icons.link;
  }
}

export class HomeView {
  private wikiCache: WikiSummary | null = null;
  private wikiLoading = false;
  private wikiError = '';
  private editMode = false;
  private addLinkOpen = false;
  private lastUmbralSnap: UmbralSnapshot | null = null;
  private lastArenaSnap: ArenaSnapshot = loadArenaSnapshot();

  private buildDirectoryEntries(umbralSnap: UmbralSnapshot | null, arenaSnap: ArenaSnapshot): DirectoryEntry[] {
    const profile = lifeStore.get();
    const dir = directoryStore.get();

    const base: DirectoryEntry[] = [
      {
        id: 'app-unumbral',
        prefix: 'App',
        title: 'UNUmbral Académico',
        subtitle:
          umbralSnap && umbralSnap.source !== 'none'
            ? `${umbralSnap.todayClassesCount} clases hoy · ${umbralSnap.pendingCount} tareas`
            : 'Horario 12h, cursos, notas y asistencias',
        category: 'universidad',
        c1: '#167C4D',
        c2: '#6BD49E',
        icon: Icons.graduation,
        externalUrl: resolveCompanionUrl('unumbral'),
        badgeText: umbralSnap && umbralSnap.source !== 'none' ? `${umbralSnap.coursesCount} cursos` : 'Universidad',
      },
      {
        id: 'app-arena',
        prefix: 'App',
        title: 'OMNI ARENA 2D/3D',
        subtitle:
          arenaSnap.source !== 'none'
            ? `Nivel ${arenaSnap.level} · Radar ${arenaSnap.overallRating} · ${arenaSnap.totalRuns} partidas`
            : (() => {
                const meta = readArenaCatalogMeta();
                return `${meta.total} disciplinas · ${meta.academies} academias`;
              })(),
        category: 'entrenamiento',
        c1: '#1D4ED8',
        c2: '#60A5FA',
        icon: Icons.gamepad,
        externalUrl: resolveCompanionUrl('arena'),
        badgeText:
          arenaSnap.source !== 'none'
            ? `Nv ${arenaSnap.level}`
            : `${readArenaCatalogMeta().total} Modos`,
      },
      {
        id: 'mod-reader',
        prefix: 'Módulo',
        title: 'Biblioteca y Lector',
        subtitle:
          profile.bookmarks.length > 0
            ? `${profile.bookmarks.length} marcadores · ${profile.readerFontSize}px`
            : 'Wikisource, Open Library y diccionario',
        category: 'atelier',
        c1: '#C2591D',
        c2: '#F4A261',
        icon: Icons.book,
        route: 'reader',
        badgeText: profile.todayHabits.read ? 'Hecho hoy' : 'Lectura',
      },
      {
        id: 'mod-studio',
        prefix: 'Módulo',
        title: 'Cuaderno y PDF',
        subtitle: 'Anotaciones tipo tablet y libros a PDF',
        category: 'atelier',
        c1: '#2A4359',
        c2: '#8FA8BE',
        icon: Icons.tablet,
        route: 'studio',
        badgeText: profile.todayHabits.studio ? 'Hecho hoy' : 'Sincronizado',
      },
      {
        id: 'mod-calligraphy',
        prefix: 'Módulo',
        title: 'Taller de Caligrafía',
        subtitle: `${profile.stats.calligraphySheets} hojas practicadas · Pauta 55°`,
        category: 'atelier',
        c1: '#0D7A72',
        c2: '#4FD1C5',
        icon: Icons.pen,
        route: 'calligraphy',
        badgeText: profile.todayHabits.calligraphy ? 'Hecho hoy' : 'Trazos',
      },
      {
        id: 'mod-drawing',
        prefix: 'Módulo',
        title: 'Taller de Dibujo',
        subtitle:
          profile.stats.drawingSheets > 0
            ? `${profile.stats.drawingSheets} láminas · ${DRAWING_LESSONS.length} lecciones y lienzo libre`
            : `${DRAWING_LESSONS.length} lecciones guiadas, perspectiva y simetría`,
        category: 'atelier',
        c1: '#B45309',
        c2: '#F59E0B',
        icon: Icons.palette,
        route: 'drawing',
        badgeText: profile.todayHabits.drawing ? 'Hecho hoy' : 'Dibujo',
      },
      {
        id: 'mod-typing',
        prefix: 'Módulo',
        title: 'Mecanografía',
        subtitle: `Récord PC ${profile.stats.bestWpmPc} · Móvil ${profile.stats.bestWpmMobile} PPM`,
        category: 'atelier',
        c1: '#4338CA',
        c2: '#818CF8',
        icon: Icons.keyboard,
        route: 'typing',
        badgeText: profile.todayHabits.typing ? 'Hecho hoy' : 'Velocidad',
      },
      {
        id: 'mod-language',
        prefix: 'Módulo',
        title: 'Ortografía y Léxico',
        subtitle: `${profile.stats.orthographyCorrect}/${profile.stats.orthographyTotal} aciertos · ${profile.savedWords.length} palabras`,
        category: 'atelier',
        c1: '#B45309',
        c2: '#FBBF24',
        icon: Icons.spell,
        route: 'language',
        badgeText: profile.todayHabits.language ? 'Hecho hoy' : 'Idioma',
      },
      {
        id: 'mod-mindset',
        prefix: 'Módulo',
        title: 'Frases y Criterio',
        subtitle: `${profile.favoritePhraseIds.length} favoritas · ${profile.customPhrases.length} propias`,
        category: 'atelier',
        c1: '#9D174D',
        c2: '#F472B6',
        icon: Icons.bulb,
        route: 'mindset',
        badgeText: profile.todayHabits.mindset ? 'Hecho hoy' : 'Ideas',
      },
      {
        id: 'mod-vault',
        prefix: 'Módulo',
        title: 'Baúl de Guardados',
        subtitle: `${VAULT_BANK.length + profile.customVaultItems.length} recursos · ${Object.values(profile.vaultStatuses).filter((s) => s === 'applied').length} aplicados`,
        category: 'atelier',
        c1: '#0F4C81',
        c2: '#38BDF8',
        icon: Icons.archive,
        route: 'vault',
        badgeText: 'Recursos',
      },
      {
        id: 'mod-focuslab',
        prefix: 'Módulo',
        title: 'Oratoria y Enfoque',
        subtitle: `${profile.stats.oratorySessions} exposiciones · ${profile.stats.recallReviewed} evocaciones`,
        category: 'atelier',
        c1: '#0F766E',
        c2: '#2DD4BF',
        icon: Icons.mic,
        route: 'focuslab',
        badgeText: profile.todayHabits.focuslab ? 'Hecho hoy' : 'Práctica',
      },
      {
        id: 'mod-singing',
        prefix: 'Módulo',
        title: 'Estudio de Canto',
        subtitle:
          profile.stats.singingBestCents !== null
            ? `Mejor ±${profile.stats.singingBestCents}c · ${SINGING_SONGS.length} canciones · ${SINGING_DRILLS.length} rutinas`
            : `Canto, ${SINGING_SONGS.length} canciones, calentamiento 5 min y oído`,
        category: 'atelier',
        c1: '#6D28D9',
        c2: '#A78BFA',
        icon: Icons.mic,
        route: 'singing',
        badgeText: profile.todayHabits.singing ? 'Hecho hoy' : 'Voz',
      },
      {
        id: 'mod-calm',
        prefix: 'Módulo',
        title: 'Centro de Calma',
        subtitle:
          profile.stats.calmSessions > 0
            ? `${profile.stats.calmSessions} sesiones · SOS Pánico y ${profile.reframeLog.length} reencuadres`
            : 'SOS Pánico inmediato, 5-4-3-2-1 y respiración',
        category: 'atelier',
        c1: '#0F766E',
        c2: '#5EEAD4',
        icon: Icons.wind,
        route: 'calm',
        badgeText: 'SOS Calma',
      },
    ];

    const custom: DirectoryEntry[] = dir.customLinks.map((c) => {
      const palette = CUSTOM_COLORS.find((x) => x.c1 === c.color) ?? { c1: c.color || '#2563EB', c2: '#93C5FD' };
      return {
        id: c.id,
        prefix: 'Acceso',
        title: c.title,
        subtitle: c.subtitle || c.url,
        category: c.category,
        c1: palette.c1,
        c2: palette.c2,
        icon: iconForKey(c.iconKey),
        externalUrl: c.url,
        badgeText: 'Personal',
        isCustom: true,
      };
    });

    const map = new Map([...base, ...custom].map((e) => [e.id, e]));
    const ordered: DirectoryEntry[] = [];
    for (const id of dir.order) {
      const found = map.get(id);
      if (found) {
        ordered.push(found);
        map.delete(id);
      }
    }
    for (const rest of map.values()) ordered.push(rest);
    return ordered;
  }

  public render(
    container: HTMLElement,
    navigate: (id: ModuleId) => void,
    openModal?: (m: 'cloud' | 'profile') => void
  ): void {
    const profile = lifeStore.get();
    const dir = directoryStore.get();
    this.lastArenaSnap = loadArenaSnapshot();
    const doneCount = Object.values(profile.todayHabits).filter(Boolean).length;

    const dayIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const dailyPhrase = PHRASES_BANK[dayIdx % PHRASES_BANK.length];
    const dailyWord = VOCABULARY_DECK[dayIdx % VOCABULARY_DECK.length];

    const entries = this.buildDirectoryEntries(this.lastUmbralSnap, this.lastArenaSnap);
    const atelierModCount = entries.filter((e) => e.category === 'atelier').length;
    const visibleEntries = entries.filter((e) => {
      if (!this.editMode && dir.hiddenIds.includes(e.id)) return false;
      if (dir.activeCategory !== 'all' && e.category !== dir.activeCategory) return false;
      return true;
    });

    // Put pinned items first when not in edit mode
    const sortedEntries = this.editMode
      ? visibleEntries
      : [...visibleEntries].sort((a, b) => {
          const ap = dir.pinnedIds.includes(a.id) ? 0 : 1;
          const bp = dir.pinnedIds.includes(b.id) ? 0 : 1;
          return ap - bp;
        });

    const tilesHtml = sortedEntries
      .map((item) => {
        const isPinned = dir.pinnedIds.includes(item.id);
        const isHidden = dir.hiddenIds.includes(item.id);

        const emblem = `
          <div class="al-diamond-emblem" style="--em-c1: ${item.c1}; --em-c2: ${item.c2}">
            <span class="al-diamond-ring"></span>
            <span class="al-diamond-core">${item.icon(26)}</span>
          </div>
        `;

        const inner = `
          ${isPinned && !this.editMode ? `<span class="al-tile-pin" title="Fijado">${Icons.star(12)}</span>` : ''}
          ${emblem}
          <div class="al-tile-title">
            <span class="al-tile-prefix">${item.prefix}</span>
            <strong>${item.title}</strong>
          </div>
          <p class="al-tile-sub">${item.subtitle}</p>
          ${item.badgeText ? `<span class="al-tile-badge">${item.badgeText}</span>` : ''}
        `;

        const editControls = this.editMode
          ? `
            <div class="al-tile-editbar">
              <button type="button" class="al-mini-ctrl ${isPinned ? 'is-on' : ''}" data-pin="${item.id}" title="Fijar">${Icons.star(13)}</button>
              <button type="button" class="al-mini-ctrl" data-move="${item.id}:-1" title="Mover antes">${Icons.arrowUp(13)}</button>
              <button type="button" class="al-mini-ctrl" data-move="${item.id}:1" title="Mover después">${Icons.arrowDown(13)}</button>
              <button type="button" class="al-mini-ctrl ${isHidden ? 'is-off' : ''}" data-hide="${item.id}" title="${isHidden ? 'Mostrar' : 'Ocultar'}">
                ${isHidden ? Icons.eye(13) : Icons.eyeOff(13)}
              </button>
              ${item.isCustom ? `<button type="button" class="al-mini-ctrl is-del" data-del-custom="${item.id}" title="Eliminar acceso">${Icons.trash(13)}</button>` : ''}
            </div>
          `
          : '';

        if (this.editMode) {
          return `<div class="al-dir-card ${isHidden ? 'is-dimmed' : ''}">${inner}${editControls}</div>`;
        }

        if (item.externalUrl) {
          return `
            <a class="al-dir-card" href="${item.externalUrl}">
              ${inner}
            </a>`;
        }

        return `
          <button type="button" class="al-dir-card" data-nav="${item.route}">
            ${inner}
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
        <section class="al-dir-toolbar">
          <div class="al-seg-tabs" role="tablist" aria-label="Filtrar módulos del ecosistema">
            <button type="button" class="al-seg-btn ${dir.activeCategory === 'all' ? 'is-active' : ''}" data-dcat="all">Todo el ecosistema</button>
            <button type="button" class="al-seg-btn ${dir.activeCategory === 'atelier' ? 'is-active' : ''}" data-dcat="atelier">Atelier Diario (${atelierModCount})</button>
            <button type="button" class="al-seg-btn ${dir.activeCategory === 'universidad' ? 'is-active' : ''}" data-dcat="universidad">Universidad</button>
            <button type="button" class="al-seg-btn ${dir.activeCategory === 'entrenamiento' ? 'is-active' : ''}" data-dcat="entrenamiento">Entrenamiento</button>
            <button type="button" class="al-seg-btn ${dir.activeCategory === 'personal' ? 'is-active' : ''}" data-dcat="personal">Mis Accesos</button>
          </div>

          <div class="al-tool-group">
            <button type="button" class="al-btn" id="al-dir-add-link">${Icons.plus(15)}<span>Nuevo acceso</span></button>
            <button type="button" class="al-btn ${this.editMode ? 'al-btn-primary' : ''}" id="al-dir-edit-toggle">
              ${Icons.sliders(15)}<span>${this.editMode ? 'Listo' : 'Personalizar'}</span>
            </button>
          </div>
        </section>

        ${
          this.addLinkOpen
            ? `
          <form class="al-panel al-add-link-bar" id="al-add-link-form">
            <div class="al-card-head">
              <h2>Agregar acceso directo al Directorio (se guarda en Supabase)</h2>
              <button type="button" class="al-icon-btn" id="al-add-link-close">×</button>
            </div>
            <div class="al-form-grid-3">
              <label><span>Nombre del módulo o enlace</span><input type="text" id="al-cl-title" placeholder="Ej. Intranet UNU" required /></label>
              <label><span>URL destino</span><input type="url" id="al-cl-url" placeholder="https://intranet.unu.edu.pe/" required /></label>
              <label><span>Descripción corta</span><input type="text" id="al-cl-sub" placeholder="Portal universitario" /></label>
            </div>
            <div class="al-form-grid-3">
              <label>
                <span>Categoría</span>
                <select id="al-cl-cat">
                  <option value="personal">Mis Accesos</option>
                  <option value="universidad">Universidad</option>
                  <option value="atelier">Atelier Diario</option>
                  <option value="entrenamiento">Entrenamiento</option>
                </select>
              </label>
              <label>
                <span>Color del rombo</span>
                <select id="al-cl-color">
                  ${CUSTOM_COLORS.map((c) => `<option value="${c.c1}">${c.label}</option>`).join('')}
                </select>
              </label>
              <div class="al-add-link-submit">
                <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar en Directorio</span></button>
              </div>
            </div>
          </form>`
            : ''
        }

        <section class="al-dir-grid" aria-label="Directorio de módulos">
          ${tilesHtml || '<div class="al-panel al-muted">No hay módulos visibles en esta categoría. Activa «Personalizar» para mostrar ocultos o agrega un acceso nuevo.</div>'}
        </section>

        <section class="al-pulse-row">
          <div class="al-panel al-habits-card">
            <div class="al-card-head">
              <h2>Tu ritmo de hoy (${doneCount}/${HABIT_LABELS.length})</h2>
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

    container.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.dataset.nav as ModuleId));
    });

    container.querySelectorAll<HTMLButtonElement>('[data-dcat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        directoryStore.setCategory(btn.dataset.dcat as 'all' | DirectoryCategory);
        this.render(container, navigate, openModal);
      });
    });

    container.querySelector('#al-dir-edit-toggle')?.addEventListener('click', () => {
      this.editMode = !this.editMode;
      this.render(container, navigate, openModal);
    });

    container.querySelector('#al-dir-add-link')?.addEventListener('click', () => {
      this.addLinkOpen = !this.addLinkOpen;
      this.render(container, navigate, openModal);
    });

    container.querySelector('#al-add-link-close')?.addEventListener('click', () => {
      this.addLinkOpen = false;
      this.render(container, navigate, openModal);
    });

    container.querySelector('#al-add-link-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = container.querySelector<HTMLInputElement>('#al-cl-title')!.value.trim();
      const url = container.querySelector<HTMLInputElement>('#al-cl-url')!.value.trim();
      const subtitle = container.querySelector<HTMLInputElement>('#al-cl-sub')!.value.trim();
      const category = container.querySelector<HTMLSelectElement>('#al-cl-cat')!.value as DirectoryCategory;
      const color = container.querySelector<HTMLSelectElement>('#al-cl-color')!.value;
      if (!title || !url) return;
      directoryStore.addCustomLink({
        title,
        url,
        subtitle,
        category,
        color,
        iconKey: 'link',
      });
      this.addLinkOpen = false;
      this.render(container, navigate, openModal);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-pin]').forEach((btn) => {
      btn.addEventListener('click', () => {
        directoryStore.togglePin(btn.dataset.pin!);
        this.render(container, navigate, openModal);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-hide]').forEach((btn) => {
      btn.addEventListener('click', () => {
        directoryStore.toggleHide(btn.dataset.hide!);
        this.render(container, navigate, openModal);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [id, dirStr] = btn.dataset.move!.split(':');
        directoryStore.moveItem(id, dirStr === '-1' ? -1 : 1);
        this.render(container, navigate, openModal);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-del-custom]').forEach((btn) => {
      btn.addEventListener('click', () => {
        directoryStore.removeCustomLink(btn.dataset.delCustom!);
        this.render(container, navigate, openModal);
      });
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
          'Sin datos de esta app en este origen. Abre el ecosistema publicado o activa la Nube para verlos aquí.';
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
