import { VAULT_BANK } from '../data/SavedVaultBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import {
  DifficultyLevel,
  PhraseItem,
  VaultCategory,
  VaultFilterCategory,
  VaultItem,
  VaultStatus,
} from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

type VaultMode = 'explorar' | 'estudiar_hoy' | 'quiz_accion';

const GOAL_BY_DIFF: Record<DifficultyLevel, number> = {
  basico: 3,
  intermedio: 5,
  avanzado: 8,
};

const DIFFICULTY_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Meta diaria: 3 recursos · curación ligera sin saturación.',
  intermedio: 'Meta diaria: 5 recursos · revisión constante y notas prácticas.',
  avanzado: 'Meta diaria: 8 recursos · plan de acción obligatorio para aplicar.',
};

const CAT_LABELS: Record<VaultCategory, string> = {
  mentalidad: 'Mentalidad',
  oratoria: 'Oratoria y Social',
  tech: 'Tech / IA',
  estudio: 'Estudio y Libros',
  carrera: 'Carrera y Finanzas',
  bienestar: 'Bienestar y Voz',
  otros: 'Otros útiles',
  ocio: 'Ocio / Anime',
  visual: 'Por revisar (visual)',
};

const STATUS_LABELS: Record<VaultStatus, string> = {
  pending: 'Pendiente',
  seen: 'Visto',
  applied: 'Aplicado',
  archived: 'Archivado',
};

const FILTER_TABS: { id: VaultFilterCategory; label: string; optional?: boolean }[] = [
  { id: 'useful', label: 'Útiles' },
  { id: 'mentalidad', label: 'Mentalidad' },
  { id: 'oratoria', label: 'Oratoria' },
  { id: 'tech', label: 'Tech / IA' },
  { id: 'estudio', label: 'Estudio' },
  { id: 'carrera', label: 'Carrera' },
  { id: 'bienestar', label: 'Bienestar' },
  { id: 'otros', label: 'Otros' },
  { id: 'favs', label: 'Favoritos' },
  { id: 'applied', label: 'Aplicados' },
  { id: 'custom', label: 'Añadidos' },
  { id: 'all', label: 'Todos' },
  { id: 'visual', label: 'Por revisar (visual)', optional: true },
  { id: 'ocio', label: 'Ocio / Anime', optional: true },
];

const PHRASE_CAT_MAP: Record<VaultCategory, PhraseItem['category']> = {
  mentalidad: 'mente',
  oratoria: 'hablar',
  tech: 'decisiones',
  estudio: 'mente',
  carrera: 'decisiones',
  bienestar: 'calma',
  otros: 'mente',
  ocio: 'calma',
  visual: 'mente',
};

const VAULT_TUTORIALS: Record<VaultMode, Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  explorar: {
    sectionName: 'Catálogo y curación',
    summary: 'Convierte tus enlaces guardados en aprendizaje accionable con estados, notas y promoción a Criterio.',
    steps: [
      'Filtra por categoría arriba (o activa + Visual / Ocio) y elige estado: Activos, Pendientes, Vistos o Aplicados.',
      'Abre el ojo para previsualizar posts de Instagram aquí mismo o añade notas propias con el botón Nota.',
      'Pulsa Pasar a Criterio en las ideas más valiosas para moverlas a tu cuaderno de Frases y Criterio.',
      'Usa Añadir recurso para sumar un enlace individual o importar varios enlaces/JSON en lote.',
    ],
    tip: 'Procesa tu meta diaria en el modo Estudiar hoy para avanzar uno a uno sin abrumarte.',
  },
  estudiar_hoy: {
    sectionName: 'Cola didáctica de hoy',
    summary: 'Estudia un recurso a la vez, define un plan de acción concreto y cumple tu meta diaria.',
    steps: [
      'Lee el resumen o abre la publicación original y extrae una idea aplicable.',
      'Redacta tu plan de acción concreto en el cuadro inferior (obligatorio en nivel Avanzado para marcar Aplicado).',
      'Marca Visto o Guardar plan y aplicar para sumar a tu contador diario y pasar al siguiente recurso.',
    ],
    tip: 'Una sola acción concreta aplicada hoy vale más que cincuenta enlaces acumulados sin leer.',
  },
  quiz_accion: {
    sectionName: 'Reto de aplicación',
    summary: 'Pon a prueba tus recursos favoritos y vistos convirtiéndolos en compromisos concretos con seguimiento.',
    steps: [
      'Revisa el recurso propuesto de tu lista de favoritos o vistos.',
      'Elige el horizonte de aplicación (Hoy mismo, Esta semana o Proyecto actual) y redacta un paso verificable.',
      'Guarda el plan para consolidarlo en tu tablero inferior de planes de acción.',
    ],
    tip: 'Vuelve cada fin de semana a tus planes guardados para comprobar cuáles ya se volvieron hábito.',
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

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeUrl(raw: string): string {
  return raw.trim().split('?')[0];
}

function buildInstagramEmbedUrl(rawUrl: string): string | null {
  const m = rawUrl.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  return `https://www.instagram.com/${m[1].toLowerCase()}/${m[2]}/embed/`;
}

export class VaultView {
  private addFormOpen = false;
  private addMode: 'single' | 'batch' = 'single';
  private visibleLimit = 30;
  private feedbackMsg = '';
  private openNoteId: string | null = null;
  private previewItemId: string | null = null;
  private studyQueueOffset = 0;
  private quizCursor = 0;
  private quizHorizon: 'hoy' | 'semana' | 'proyecto' = 'hoy';
  private studyWarnMsg = '';

  private getAllItems(): VaultItem[] {
    const profile = lifeStore.get();
    return [...profile.customVaultItems, ...VAULT_BANK];
  }

  private getReviewedToday(): number {
    const vProg = lifeStore.get().progress.vault;
    return vProg.lastReviewDay === todayStamp() ? vProg.reviewedToday : 0;
  }

  private getEffectiveDailyGoal(): number {
    const vProg = lifeStore.get().progress.vault;
    const diff = lifeStore.getDifficulty('vault');
    return vProg.dailyGoal > 0 ? vProg.dailyGoal : GOAL_BY_DIFF[diff];
  }

  private filterItems(items: VaultItem[]): VaultItem[] {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.vault;
    const q = prefs.searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const status: VaultStatus = profile.vaultStatuses[item.id] ?? 'pending';
      const isFav = profile.vaultFavorites.includes(item.id);
      const note = (profile.vaultNotes[item.id] ?? '').toLowerCase();
      const plan = (profile.progress.vault.actionPlans[item.id] ?? '').toLowerCase();

      if (prefs.statusFilter === 'active') {
        if (status === 'archived') return false;
      } else if (status !== prefs.statusFilter) {
        return false;
      }

      if (prefs.category === 'useful') {
        if (item.category === 'ocio' || item.category === 'visual') return false;
      } else if (prefs.category === 'favs') {
        if (!isFav) return false;
      } else if (prefs.category === 'applied') {
        if (status !== 'applied') return false;
      } else if (prefs.category === 'custom') {
        if (!item.isCustom) return false;
      } else if (prefs.category !== 'all') {
        if (item.category !== prefs.category) return false;
      }

      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        note.includes(q) ||
        plan.includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }

  private getStudyQueue(allItems: VaultItem[]): VaultItem[] {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.vault;
    const usefulPending = allItems.filter((item) => {
      const st = profile.vaultStatuses[item.id] ?? 'pending';
      if (st === 'archived' || st === 'applied') return false;
      if (prefs.category === 'useful' || prefs.category === 'all') {
        return item.category !== 'ocio' && item.category !== 'visual';
      }
      if (prefs.category === 'favs') return profile.vaultFavorites.includes(item.id);
      if (prefs.category === 'custom') return Boolean(item.isCustom);
      if (prefs.category === 'applied') return true;
      return item.category === prefs.category;
    });

    if (usefulPending.length > 0) {
      return [...usefulPending].sort((a, b) => {
        const sa = (profile.vaultStatuses[a.id] ?? 'pending') === 'pending' ? 0 : 1;
        const sb = (profile.vaultStatuses[b.id] ?? 'pending') === 'pending' ? 0 : 1;
        return sa - sb;
      });
    }

    return allItems.filter((item) => (profile.vaultStatuses[item.id] ?? 'pending') !== 'archived');
  }

  private getQuizPool(allItems: VaultItem[]): { items: VaultItem[]; fromPersonal: boolean } {
    const profile = lifeStore.get();
    const personal = allItems.filter((item) => {
      const st = profile.vaultStatuses[item.id] ?? 'pending';
      return profile.vaultFavorites.includes(item.id) || st === 'seen' || st === 'applied';
    });
    if (personal.length > 0) return { items: personal, fromPersonal: true };
    const useful = allItems.filter((item) => item.category !== 'ocio' && item.category !== 'visual');
    return { items: useful.length > 0 ? useful : allItems, fromPersonal: false };
  }

  private renderCardsHtml(filtered: VaultItem[]): string {
    const profile = lifeStore.get();
    const vProg = profile.progress.vault;
    const promotedSet = new Set(vProg.promotedIds);
    const slice = filtered.slice(0, this.visibleLimit);

    if (slice.length === 0) {
      return '<p class="al-muted">No hay recursos que coincidan con ese filtro o búsqueda.</p>';
    }

    return slice
      .map((item) => {
        const status: VaultStatus = profile.vaultStatuses[item.id] ?? 'pending';
        const isFav = profile.vaultFavorites.includes(item.id);
        const note = profile.vaultNotes[item.id] ?? '';
        const actionPlan = vProg.actionPlans[item.id] ?? '';
        const isNoteOpen = this.openNoteId === item.id;
        const isPromoted = promotedSet.has(item.id);

        const tagsHtml = item.tags
          .slice(0, 4)
          .map((t) => `<span class="al-vault-tag">#${esc(t)}</span>`)
          .join('');

        return `
          <article class="al-panel al-phrase-card al-vault-card ${status === 'archived' ? 'is-archived' : ''}" data-vault-id="${esc(item.id)}">
            <div class="al-card-head">
              <div class="al-tool-group">
                <span class="al-mono-pill">${CAT_LABELS[item.category]}${item.isCustom ? ' · Añadido' : item.index ? ` · #${item.index}` : ''}</span>
                ${status !== 'pending' ? `<span class="al-vault-status is-${status}">${STATUS_LABELS[status]}</span>` : ''}
              </div>
              <div class="al-tool-group">
                ${
                  buildInstagramEmbedUrl(item.url)
                    ? `<button type="button" class="al-icon-btn" data-vault-preview="${esc(item.id)}" title="Ver publicación aquí sin salir">${Icons.eye(14)}</button>`
                    : ''
                }
                <a class="al-icon-btn" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" title="Abrir publicación original">${Icons.arrowUpRight(14)}</a>
                ${
                  item.isCustom
                    ? `<button type="button" class="al-icon-btn" data-vault-del="${esc(item.id)}" title="Eliminar recurso añadido">${Icons.trash(14)}</button>`
                    : ''
                }
                <button type="button" class="al-icon-btn ${isFav ? 'is-fav' : ''}" data-vault-fav="${esc(item.id)}" title="Marcar como favorito">${Icons.bookmark(15)}</button>
              </div>
            </div>

            <h3 class="al-vault-title">${esc(item.title)}</h3>
            <p class="al-vault-summary">${esc(item.summary)}</p>

            ${tagsHtml ? `<div class="al-vault-tags">${tagsHtml}</div>` : ''}
            ${note && !isNoteOpen ? `<p class="al-vault-note-preview"><strong>Nota:</strong> ${esc(note)}</p>` : ''}
            ${actionPlan ? `<p class="al-vault-note-preview"><strong>Plan de acción:</strong> ${esc(actionPlan)}</p>` : ''}

            ${
              isNoteOpen
                ? `
              <form class="al-vault-note-form" data-note-form="${esc(item.id)}">
                <input type="text" class="al-vault-note-input" value="${esc(note)}" placeholder="Anota qué rescataste o cómo aplicarlo..." />
                <button type="submit" class="al-btn al-btn-primary al-btn-sm">Guardar</button>
              </form>
            `
                : ''
            }

            <div class="al-vault-actions">
              <button type="button" class="al-seg-btn ${status === 'seen' ? 'is-active' : ''}" data-vault-status="${esc(item.id)}:${status === 'seen' ? 'pending' : 'seen'}">Visto</button>
              <button type="button" class="al-seg-btn ${status === 'applied' ? 'is-active' : ''}" data-vault-status="${esc(item.id)}:${status === 'applied' ? 'pending' : 'applied'}">Aplicado</button>
              <button type="button" class="al-seg-btn" data-vault-note-toggle="${esc(item.id)}">${note ? 'Editar nota' : 'Nota'}</button>
              <button type="button" class="al-seg-btn ${isPromoted ? 'is-active' : ''}" data-vault-promote="${esc(item.id)}">${isPromoted ? `${Icons.check(12)} En Criterio` : 'Pasar a Criterio'}</button>
              <button type="button" class="al-seg-btn" data-vault-status="${esc(item.id)}:${status === 'archived' ? 'pending' : 'archived'}">${status === 'archived' ? 'Restaurar' : 'Ocultar'}</button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  private renderEstudiarHoyHtml(allItems: VaultItem[], diff: DifficultyLevel): string {
    const profile = lifeStore.get();
    const vProg = profile.progress.vault;
    const queue = this.getStudyQueue(allItems);
    const reviewedToday = this.getReviewedToday();
    const dailyGoal = this.getEffectiveDailyGoal();

    const stepPills = Array.from({ length: dailyGoal }, (_, idx) => {
      const done = idx < reviewedToday;
      const active = idx === reviewedToday;
      return `<span class="al-step-pill ${done ? 'is-done' : active ? 'is-active' : ''}">Recurso ${idx + 1}</span>`;
    }).join('');

    if (queue.length === 0) {
      return `
        <section class="al-panel">
          <h2>Cola de estudio vacía</h2>
          <p class="al-muted">Todos los recursos de esta selección están aplicados o archivados. Cambia a Explorar o añade nuevos enlaces.</p>
          <button type="button" class="al-btn al-btn-primary" data-vmode="explorar">Volver al catálogo</button>
        </section>
      `;
    }

    const item = queue[this.studyQueueOffset % queue.length];
    const isFav = profile.vaultFavorites.includes(item.id);
    const isPromoted = vProg.promotedIds.includes(item.id);
    const savedPlan = vProg.actionPlans[item.id] ?? '';
    const savedNote = profile.vaultNotes[item.id] ?? '';
    const status: VaultStatus = profile.vaultStatuses[item.id] ?? 'pending';

    return `
      <section class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Cola didáctica de hoy (${reviewedToday}/${dailyGoal} revisados)</h2>
            <p class="al-muted">Enfócate en un solo recurso a la vez. ${diff === 'avanzado' ? 'Nivel Avanzado: escribe un plan de acción antes de marcar Aplicado.' : 'Lee, rescata lo esencial y avanza.'}</p>
          </div>
          ${
            reviewedToday >= dailyGoal
              ? `<span class="al-mastery-badge">${Icons.check(13)} Meta diaria cumplida</span>`
              : `<span class="al-mono-pill">${queue.length} en cola</span>`
          }
        </div>
        <div class="al-step-bar" aria-label="Avance diario del Baúl">${stepPills}</div>
      </section>

      <article class="al-panel al-study-card" data-study-id="${esc(item.id)}">
        <div class="al-card-head">
          <div class="al-tool-group">
            <span class="al-mono-pill">${CAT_LABELS[item.category]}${item.index ? ` · #${item.index}` : ''}</span>
            <span class="al-vault-status is-${status}">${STATUS_LABELS[status]}</span>
            ${isPromoted ? `<span class="al-mastery-badge">${Icons.check(12)} En Criterio</span>` : ''}
          </div>
          <div class="al-tool-group">
            ${
              buildInstagramEmbedUrl(item.url)
                ? `<button type="button" class="al-btn al-btn-sm" data-vault-preview="${esc(item.id)}">${Icons.eye(14)}<span>Vista previa</span></button>`
                : ''
            }
            <a class="al-btn al-btn-sm" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${Icons.arrowUpRight(14)}<span>Abrir enlace</span></a>
            <button type="button" class="al-icon-btn ${isFav ? 'is-fav' : ''}" data-study-fav="${esc(item.id)}" title="Marcar favorito">${Icons.bookmark(15)}</button>
          </div>
        </div>

        <h2 class="al-vault-title" style="font-size:1.18rem;">${esc(item.title)}</h2>
        <p class="al-vault-summary">${esc(item.summary)}</p>
        ${
          item.tags.length > 0
            ? `<div class="al-vault-tags">${item.tags.slice(0, 6).map((t) => `<span class="al-vault-tag">#${esc(t)}</span>`).join('')}</div>`
            : ''
        }
        ${savedNote ? `<p class="al-vault-note-preview"><strong>Nota previa:</strong> ${esc(savedNote)}</p>` : ''}

        <div class="al-study-card">
          <label for="al-vault-study-plan"><strong>Plan de acción concreto ${diff === 'avanzado' ? '(obligatorio para Aplicado)' : '(opcional)'}</strong></label>
          <textarea
            id="al-vault-study-plan"
            class="al-inline-note"
            placeholder="Ejemplo: Aplicar esta técnica mañana en mi bloque de estudio de las 9:00 a. m. y medir el resultado..."
          >${esc(savedPlan)}</textarea>
          ${this.studyWarnMsg ? `<p class="al-mastery-badge is-warn">${esc(this.studyWarnMsg)}</p>` : ''}
        </div>

        <div class="al-tool-group" style="margin-top:8px;">
          <button type="button" class="al-btn al-btn-primary" id="al-study-apply" data-id="${esc(item.id)}">${Icons.check(15)}<span>Guardar plan y marcar Aplicado</span></button>
          <button type="button" class="al-btn" id="al-study-seen" data-id="${esc(item.id)}">${Icons.eye(15)}<span>Marcar Visto y siguiente</span></button>
          <button type="button" class="al-btn" id="al-study-promote" data-id="${esc(item.id)}">${isPromoted ? `${Icons.check(14)} En Criterio` : 'Pasar a Criterio'}</button>
          <button type="button" class="al-btn" id="al-study-skip">Saltar al siguiente</button>
          <button type="button" class="al-btn" id="al-study-archive" data-id="${esc(item.id)}">Ocultar</button>
        </div>
      </article>
    `;
  }

  private renderQuizAccionHtml(allItems: VaultItem[], diff: DifficultyLevel): string {
    const profile = lifeStore.get();
    const vProg = profile.progress.vault;
    const { items: pool, fromPersonal } = this.getQuizPool(allItems);
    const itemMap = new Map(allItems.map((i) => [i.id, i]));
    const savedPlanEntries = Object.entries(vProg.actionPlans);

    if (pool.length === 0) {
      return '<div class="al-panel"><p class="al-muted">No hay recursos disponibles todavía.</p></div>';
    }

    const item = pool[this.quizCursor % pool.length];
    const currentPlan = vProg.actionPlans[item.id] ?? '';
    const horizonLabel =
      this.quizHorizon === 'hoy'
        ? 'Hoy mismo (acción de 5 min)'
        : this.quizHorizon === 'semana'
          ? 'Esta semana (hábito breve)'
          : 'Proyecto actual (entregable)';

    return `
      <section class="al-panel al-study-card">
        <div class="al-card-head">
          <div>
            <h2>Reto de aplicación (${(this.quizCursor % pool.length) + 1} / ${pool.length})</h2>
            <p class="al-muted">${
              fromPersonal
                ? 'Seleccionado de tus recursos favoritos, vistos o aplicados.'
                : 'Aún no marcas favoritos ni vistos: practicando con tus recursos útiles principales.'
            }</p>
          </div>
          <span class="al-mono-pill">${CAT_LABELS[item.category]} · ${difficultyLabel(diff)}</span>
        </div>

        <div class="al-rule-box">
          <strong>${esc(item.title)}</strong>
          <p>${esc(item.summary)}</p>
          <div class="al-tool-group" style="margin-top:6px;">
            ${
              buildInstagramEmbedUrl(item.url)
                ? `<button type="button" class="al-btn al-btn-sm" data-vault-preview="${esc(item.id)}">${Icons.eye(14)}<span>Vista previa</span></button>`
                : ''
            }
            <a class="al-btn al-btn-sm" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${Icons.arrowUpRight(14)}<span>Ver original</span></a>
          </div>
        </div>

        <div>
          <p><strong>1. ¿Cuándo llevarás esta idea a la práctica?</strong></p>
          <div class="al-seg-tabs" style="margin-top:6px;">
            <button type="button" class="al-seg-btn ${this.quizHorizon === 'hoy' ? 'is-active' : ''}" data-qhorizon="hoy">Hoy mismo</button>
            <button type="button" class="al-seg-btn ${this.quizHorizon === 'semana' ? 'is-active' : ''}" data-qhorizon="semana">Esta semana</button>
            <button type="button" class="al-seg-btn ${this.quizHorizon === 'proyecto' ? 'is-active' : ''}" data-qhorizon="proyecto">En un proyecto</button>
          </div>
        </div>

        <div>
          <label for="al-vault-quiz-plan"><strong>2. Define tu compromiso accionable (${horizonLabel}):</strong></label>
          <textarea
            id="al-vault-quiz-plan"
            class="al-inline-note"
            placeholder="Describe el paso exacto que ejecutarás para aplicar «${esc(item.title.slice(0, 48))}»..."
          >${esc(currentPlan)}</textarea>
          ${this.studyWarnMsg ? `<p class="al-mastery-badge is-warn">${esc(this.studyWarnMsg)}</p>` : ''}
        </div>

        <div class="al-tool-group">
          <button type="button" class="al-btn al-btn-primary" id="al-quiz-save-plan" data-id="${esc(item.id)}">${Icons.check(15)}<span>Registrar plan de acción</span></button>
          <button type="button" class="al-btn" id="al-quiz-next">Siguiente recurso</button>
        </div>
      </section>

      <section class="al-panel">
        <div class="al-card-head">
          <h3>Planes de acción guardados (${savedPlanEntries.length})</h3>
          <span class="al-mono-pill">Sincronizados</span>
        </div>
        ${
          savedPlanEntries.length === 0
            ? '<p class="al-muted">Aún no registras planes de acción. Guarda el primero arriba para verlo en tu tablero.</p>'
            : `<div class="al-study-grid">
                ${savedPlanEntries
                  .slice(0, 9)
                  .map(([id, plan]) => {
                    const found = itemMap.get(id);
                    return `
                      <div class="al-study-card is-done">
                        <div class="al-card-head">
                          <strong>${esc(found ? found.title.slice(0, 60) : id)}</strong>
                          <span class="al-mastery-badge">Aplicado</span>
                        </div>
                        <p>${esc(plan)}</p>
                      </div>`;
                  })
                  .join('')}
              </div>`
        }
      </section>
    `;
  }

  private bindGridEvents(container: HTMLElement, allItems: VaultItem[]): void {
    const itemMap = new Map(allItems.map((i) => [i.id, i]));

    container.querySelectorAll<HTMLButtonElement>('[data-vault-fav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.toggleVaultFavorite(btn.dataset.vaultFav!);
        this.refreshResults(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vault-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [id, nextStatus] = btn.dataset.vaultStatus!.split(':') as [string, VaultStatus];
        const prevStatus = lifeStore.get().vaultStatuses[id] ?? 'pending';
        lifeStore.setVaultStatus(id, nextStatus);
        if (prevStatus === 'pending' && (nextStatus === 'seen' || nextStatus === 'applied')) {
          lifeStore.recordVaultReview(id);
          this.render(container);
          return;
        }
        this.refreshResults(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vault-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.removeCustomVaultItem(btn.dataset.vaultDel!);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vault-note-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.vaultNoteToggle!;
        this.openNoteId = this.openNoteId === id ? null : id;
        this.refreshResults(container);
      });
    });

    container.querySelectorAll<HTMLFormElement>('[data-note-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = form.dataset.noteForm!;
        const val = form.querySelector<HTMLInputElement>('.al-vault-note-input')!.value;
        lifeStore.setVaultNote(id, val);
        this.openNoteId = null;
        this.refreshResults(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vault-promote]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.vaultPromote!;
        const item = itemMap.get(id);
        if (!item) return;
        const targetCat = PHRASE_CAT_MAP[item.category] ?? 'mente';
        lifeStore.promoteVaultToPhrase(item, targetCat);
        lifeStore.markVaultPromoted(id);
        this.feedbackMsg = `Guardado en Frases y Criterio: "${item.title.slice(0, 48)}"`;
        this.render(container);
      });
    });

    container.querySelector('#al-vault-load-more')?.addEventListener('click', () => {
      this.visibleLimit += 30;
      this.refreshResults(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vault-preview]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.previewItemId = btn.dataset.vaultPreview!;
        this.render(container);
      });
    });
  }

  private refreshResults(container: HTMLElement): void {
    const allItems = this.getAllItems();
    const filtered = this.filterItems(allItems);
    const grid = container.querySelector('#al-vault-grid');
    const countEl = container.querySelector('#al-vault-count');
    const moreWrap = container.querySelector('#al-vault-more-wrap');

    if (grid) {
      grid.innerHTML = this.renderCardsHtml(filtered);
    }
    if (countEl) {
      const showing = Math.min(this.visibleLimit, filtered.length);
      countEl.textContent = `Mostrando ${showing} de ${filtered.length} recursos`;
    }
    const statsEl = container.querySelector('#al-vault-stats-pill');
    if (statsEl) {
      const profile = lifeStore.get();
      const appliedCount = Object.values(profile.vaultStatuses).filter((s) => s === 'applied').length;
      statsEl.textContent = `Favoritos: ${profile.vaultFavorites.length} · Aplicados: ${appliedCount}`;
    }
    if (moreWrap) {
      moreWrap.innerHTML =
        filtered.length > this.visibleLimit
          ? `<button type="button" class="al-btn" id="al-vault-load-more">Cargar 30 más (${filtered.length - this.visibleLimit} restantes)</button>`
          : '';
    }
    this.bindGridEvents(container, allItems);
  }

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.vault;
    const vProg = profile.progress.vault;
    const mode: VaultMode = vProg.mode ?? 'explorar';
    const diff = lifeStore.getDifficulty('vault');
    const showOptionalTabs = Boolean(vProg.showOptionalTabs);

    const allItems = this.getAllItems();
    const filtered = this.filterItems(allItems);
    const appliedCount = Object.values(profile.vaultStatuses).filter((s) => s === 'applied').length;
    const actionPlansCount = Object.keys(vProg.actionPlans).length;
    const reviewedToday = this.getReviewedToday();
    const dailyGoal = this.getEffectiveDailyGoal();
    const showing = Math.min(this.visibleLimit, filtered.length);

    const dailyPart = Math.min(1, reviewedToday / Math.max(1, dailyGoal)) * 55;
    const masteryPart = Math.min(45, appliedCount * 3 + actionPlansCount * 5);
    const progressPct = Math.min(100, Math.round(dailyPart + masteryPart));

    const visibleTabs = FILTER_TABS.filter(
      (t) => !t.optional || showOptionalTabs || prefs.category === t.id
    );
    const previewItem = this.previewItemId
      ? allItems.find((x) => x.id === this.previewItemId) ?? null
      : null;
    const previewEmbedUrl = previewItem ? buildInstagramEmbedUrl(previewItem.url) : null;

    let bodyHtml = '';
    if (mode === 'estudiar_hoy') {
      bodyHtml = this.renderEstudiarHoyHtml(allItems, diff);
    } else if (mode === 'quiz_accion') {
      bodyHtml = this.renderQuizAccionHtml(allItems, diff);
    } else {
      bodyHtml = `
        <div class="al-toolbar">
          <div class="al-seg-tabs">
            ${visibleTabs
              .map(
                (t) =>
                  `<button type="button" class="al-seg-btn ${prefs.category === t.id ? 'is-active' : ''}" data-vcat="${t.id}">${t.id === 'all' ? `Todos (${allItems.length})` : t.label}</button>`
              )
              .join('')}
            <button type="button" class="al-seg-btn" id="al-vault-toggle-opt">
              ${showOptionalTabs ? 'Ocultar extras' : '+ Visual / Ocio'}
            </button>
          </div>
        </div>

        <div class="al-toolbar">
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${prefs.statusFilter === 'active' ? 'is-active' : ''}" data-vstatus="active">Activos</button>
            <button type="button" class="al-seg-btn ${prefs.statusFilter === 'pending' ? 'is-active' : ''}" data-vstatus="pending">Pendientes</button>
            <button type="button" class="al-seg-btn ${prefs.statusFilter === 'seen' ? 'is-active' : ''}" data-vstatus="seen">Vistos</button>
            <button type="button" class="al-seg-btn ${prefs.statusFilter === 'applied' ? 'is-active' : ''}" data-vstatus="applied">Aplicados</button>
            <button type="button" class="al-seg-btn ${prefs.statusFilter === 'archived' ? 'is-active' : ''}" data-vstatus="archived">Ocultos</button>
          </div>

          <div class="al-tool-group">
            <span class="al-mono-pill" id="al-vault-count">Mostrando ${showing} de ${filtered.length} recursos</span>
            <input type="search" id="al-vault-search" class="al-filter-input" value="${esc(prefs.searchQuery)}" placeholder="Buscar idea, etiqueta, nota o URL..." />
          </div>
        </div>

        <div class="al-phrases-grid" id="al-vault-grid">
          ${this.renderCardsHtml(filtered)}
        </div>

        <div class="al-vault-more-wrap" id="al-vault-more-wrap">
          ${
            filtered.length > this.visibleLimit
              ? `<button type="button" class="al-btn" id="al-vault-load-more">Cargar 30 más (${filtered.length - this.visibleLimit} restantes)</button>`
              : ''
          }
        </div>
      `;
    }

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #0F4C81; --mod-c2: #38BDF8;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #0F4C81; --em-c2: #38BDF8;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.archive(20)}</span>
            </div>
            <div>
              <h1>Baúl de Guardados e Ideas</h1>
              <p>Tus ${allItems.length} recursos clasificados. Explora, estudia uno a uno con meta diaria y convierte ideas en planes de acción.</p>
            </div>
          </div>
          <div class="al-tool-group">
            <div class="al-mono-pill" id="al-vault-stats-pill">Favoritos: ${profile.vaultFavorites.length} · Aplicados: ${appliedCount}</div>
            <button type="button" class="al-btn al-btn-primary" id="al-vault-add-btn">${Icons.plus(15)}<span>Añadir recurso</span></button>
          </div>
        </div>

        ${renderDidacticBar({
          moduleId: 'vault',
          progressLabel: 'Progreso del Baúl (meta diaria y aplicación)',
          progressPct,
          progressDetail: `Revisados hoy: ${reviewedToday}/${dailyGoal} · Aplicados: ${appliedCount} · Planes de acción: ${actionPlansCount}`,
          extraMetric: `En Criterio: ${vProg.promotedIds.length}`,
          difficultyHints: DIFFICULTY_HINTS,
        })}

        ${
          this.feedbackMsg
            ? `<div class="al-panel al-vault-feedback"><span>${esc(this.feedbackMsg)}</span><button type="button" class="al-icon-btn" id="al-vault-fb-close">×</button></div>`
            : ''
        }

        ${
          this.addFormOpen
            ? `
          <div class="al-panel al-add-link-bar">
            <div class="al-card-head">
              <div class="al-seg-tabs">
                <button type="button" class="al-seg-btn ${this.addMode === 'single' ? 'is-active' : ''}" data-add-mode="single">Añadir 1 enlace</button>
                <button type="button" class="al-seg-btn ${this.addMode === 'batch' ? 'is-active' : ''}" data-add-mode="batch">Importar varios / JSON</button>
              </div>
              <button type="button" class="al-icon-btn" id="al-vault-add-close">×</button>
            </div>

            ${
              this.addMode === 'single'
                ? `
              <form id="al-vault-single-form" class="al-vault-form-stack">
                <div class="al-form-grid-2">
                  <label><span>Título o idea clave</span><input type="text" id="al-v-title" required placeholder="Ej. Cómo estructurar una exposición" /></label>
                  <label><span>Enlace (Instagram, web, YouTube...)</span><input type="url" id="al-v-url" required placeholder="https://www.instagram.com/p/..." /></label>
                </div>
                <div class="al-form-grid-3">
                  <label>
                    <span>Categoría</span>
                    <select id="al-v-cat">
                      <option value="mentalidad">Mentalidad</option>
                      <option value="oratoria">Oratoria y Social</option>
                      <option value="tech">Tech / IA</option>
                      <option value="estudio">Estudio y Libros</option>
                      <option value="carrera">Carrera y Finanzas</option>
                      <option value="bienestar">Bienestar y Voz</option>
                      <option value="otros">Otros útiles</option>
                      <option value="ocio">Ocio / Anime</option>
                    </select>
                  </label>
                  <label><span>Resumen o nota rápida</span><input type="text" id="al-v-summary" placeholder="Qué enseña o por qué lo guardaste" /></label>
                  <label><span>Etiquetas (separadas por coma)</span><input type="text" id="al-v-tags" placeholder="psicologia, enfoque" /></label>
                </div>
                <div class="al-tool-group">
                  <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar en Supabase</span></button>
                </div>
              </form>
            `
                : `
              <form id="al-vault-batch-form" class="al-vault-form-stack">
                <p class="al-muted">Pega una lista de enlaces (uno por línea, opcionalmente <code>URL | Título | categoría</code>) o un arreglo JSON <code>[{url, title, summary, category}]</code>. Los duplicados se omiten automáticamente.</p>
                <textarea id="al-v-batch-text" class="al-vault-textarea" rows="5" placeholder="https://www.instagram.com/p/.../ | Idea clave | mentalidad&#10;https://www.instagram.com/p/.../ | Recurso SQL | tech" required></textarea>
                <div class="al-tool-group">
                  <label class="al-vault-inline-cat">
                    <span>Categoría por defecto</span>
                    <select id="al-v-batch-cat">
                      <option value="mentalidad">Mentalidad</option>
                      <option value="oratoria">Oratoria y Social</option>
                      <option value="tech">Tech / IA</option>
                      <option value="estudio">Estudio y Libros</option>
                      <option value="carrera">Carrera y Finanzas</option>
                      <option value="bienestar">Bienestar y Voz</option>
                      <option value="otros">Otros útiles</option>
                    </select>
                  </label>
                  <button type="submit" class="al-btn al-btn-primary">${Icons.upload(15)}<span>Importar lote</span></button>
                </div>
              </form>
            `
            }
          </div>
        `
            : ''
        }

        <div class="al-toolbar">
          <div class="al-seg-tabs" role="tablist" aria-label="Modos del Baúl">
            <button type="button" class="al-seg-btn ${mode === 'explorar' ? 'is-active' : ''}" data-vmode="explorar">Explorar catálogo</button>
            <button type="button" class="al-seg-btn ${mode === 'estudiar_hoy' ? 'is-active' : ''}" data-vmode="estudiar_hoy">Estudiar hoy (${reviewedToday}/${dailyGoal})</button>
            <button type="button" class="al-seg-btn ${mode === 'quiz_accion' ? 'is-active' : ''}" data-vmode="quiz_accion">Reto de aplicación (${actionPlansCount})</button>
          </div>
        </div>

        ${renderTutorialBanner({
          id: `vault:${mode}`,
          moduleName: 'Baúl de Guardados',
          ...VAULT_TUTORIALS[mode],
        })}

        ${bodyHtml}
      </div>
      ${
        previewItem
          ? `
        <div class="al-modal-backdrop" id="al-vault-preview-backdrop">
          <div class="al-panel al-modal-dialog al-vault-preview-modal" role="dialog" aria-modal="true" aria-label="Vista previa de publicación">
            <div class="al-card-head">
              <div>
                <span class="al-mono-pill">${CAT_LABELS[previewItem.category]}${previewItem.index ? ` · #${previewItem.index}` : ''}</span>
                <h3>${esc(previewItem.title)}</h3>
                <p class="al-muted">${esc(previewItem.summary)}</p>
              </div>
              <button type="button" class="al-icon-btn" id="al-vault-preview-close" aria-label="Cerrar">&times;</button>
            </div>
            ${
              previewEmbedUrl
                ? `<div class="al-vault-embed-wrap"><iframe class="al-vault-embed-frame" src="${esc(previewEmbedUrl)}" loading="lazy" allowtransparency="true" allowfullscreen></iframe></div>`
                : ''
            }
            <div class="al-tool-group">
              <a class="al-btn al-btn-primary" href="${esc(previewItem.url)}" target="_blank" rel="noopener noreferrer">${Icons.arrowUpRight(15)}<span>Abrir en Instagram</span></a>
            </div>
          </div>
        </div>
      `
          : ''
      }
    `;

    this.bindEvents(container, allItems, diff);
    bindTutorialBanners(container);
    bindDidacticBar(container, 'vault', (next) => {
      lifeStore.updateProgress('vault', { dailyGoal: GOAL_BY_DIFF[next] });
      this.studyWarnMsg = '';
      this.render(container);
    });
  }

  private bindEvents(container: HTMLElement, allItems: VaultItem[], diff: DifficultyLevel): void {
    const itemMap = new Map(allItems.map((i) => [i.id, i]));

    container.querySelectorAll<HTMLButtonElement>('[data-vmode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.studyWarnMsg = '';
        lifeStore.updateProgress('vault', { mode: btn.dataset.vmode as VaultMode });
        this.render(container);
      });
    });

    container.querySelector('#al-vault-add-btn')?.addEventListener('click', () => {
      this.addFormOpen = !this.addFormOpen;
      this.render(container);
    });

    container.querySelector('#al-vault-add-close')?.addEventListener('click', () => {
      this.addFormOpen = false;
      this.render(container);
    });

    container.querySelector('#al-vault-fb-close')?.addEventListener('click', () => {
      this.feedbackMsg = '';
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-add-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.addMode = btn.dataset.addMode as 'single' | 'batch';
        this.render(container);
      });
    });

    container.querySelector('#al-vault-single-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = container.querySelector<HTMLInputElement>('#al-v-title')!.value.trim();
      const url = normalizeUrl(container.querySelector<HTMLInputElement>('#al-v-url')!.value);
      const category = container.querySelector<HTMLSelectElement>('#al-v-cat')!.value as VaultCategory;
      const summary =
        container.querySelector<HTMLInputElement>('#al-v-summary')!.value.trim() ||
        'Recurso guardado manualmente.';
      const tagsRaw = container.querySelector<HTMLInputElement>('#al-v-tags')!.value;
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 5);
      if (!title || !url) return;

      lifeStore.addCustomVaultItem({ title, url, category, summary, tags });
      this.addFormOpen = false;
      this.feedbackMsg = `Recurso añadido al Baúl: "${title}"`;
      this.render(container);
    });

    container.querySelector('#al-vault-batch-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = container.querySelector<HTMLTextAreaElement>('#al-v-batch-text')!.value.trim();
      const defCat = container.querySelector<HTMLSelectElement>('#al-v-batch-cat')!.value as VaultCategory;
      if (!raw) return;

      const parsed: Omit<VaultItem, 'id' | 'isCustom' | 'createdAt'>[] = [];
      if (raw.startsWith('[') || raw.startsWith('{')) {
        try {
          const json = JSON.parse(raw);
          const arr = Array.isArray(json) ? json : [json];
          for (const row of arr) {
            const url = normalizeUrl(String(row?.url || ''));
            if (!url) continue;
            const title = String(row?.title || row?.caption || url).slice(0, 90);
            const summary = String(row?.summary || row?.caption || 'Recurso importado.').slice(0, 420);
            const cat = (row?.category as VaultCategory) || defCat;
            const tags = Array.isArray(row?.tags) ? row.tags.map(String).slice(0, 5) : [];
            parsed.push({ url, title, summary, category: CAT_LABELS[cat] ? cat : defCat, tags });
          }
        } catch {
          this.feedbackMsg = 'El JSON no es válido. Usa líneas URL | Título o un arreglo JSON válido.';
          this.render(container);
          return;
        }
      } else {
        for (const line of raw.split(/\r?\n/)) {
          const clean = line.trim();
          if (!clean) continue;
          const parts = clean.split('|').map((p) => p.trim());
          const url = normalizeUrl(parts[0] || '');
          if (!/^https?:\/\//i.test(url)) continue;
          const title = parts[1] || `Recurso añadido (${url.split('/').filter(Boolean).pop() || 'enlace'})`;
          const maybeCat = (parts[2] || '').toLowerCase() as VaultCategory;
          const cat = CAT_LABELS[maybeCat] ? maybeCat : defCat;
          const summary = parts[3] || title;
          parsed.push({ url, title, summary, category: cat, tags: [] });
        }
      }

      const existingUrls = new Set(VAULT_BANK.map((v) => normalizeUrl(v.url)));
      const added = lifeStore.importCustomVaultItems(parsed, existingUrls);
      this.addFormOpen = false;
      this.feedbackMsg =
        added > 0
          ? `Se añadieron ${added} recurso(s) nuevo(s) al Baúl (duplicados omitidos).`
          : 'No se añadieron recursos nuevos (enlaces vacíos o ya existentes).';
      this.render(container);
    });

    container.querySelector('#al-vault-toggle-opt')?.addEventListener('click', () => {
      const cur = Boolean(lifeStore.get().progress.vault.showOptionalTabs);
      lifeStore.updateProgress('vault', { showOptionalTabs: !cur });
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vcat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.visibleLimit = 30;
        lifeStore.updateModulePrefs('vault', {
          category: btn.dataset.vcat as VaultFilterCategory,
        });
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vstatus]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.visibleLimit = 30;
        lifeStore.updateModulePrefs('vault', {
          statusFilter: btn.dataset.vstatus as 'active' | VaultStatus,
        });
        this.render(container);
      });
    });

    container.querySelector('#al-vault-search')?.addEventListener('input', (e) => {
      this.visibleLimit = 30;
      lifeStore.updateModulePrefs('vault', {
        searchQuery: (e.target as HTMLInputElement).value,
      });
      this.refreshResults(container);
    });

    container.querySelector('#al-vault-preview-close')?.addEventListener('click', () => {
      this.previewItemId = null;
      this.render(container);
    });

    container.querySelector('#al-vault-preview-backdrop')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.previewItemId = null;
        this.render(container);
      }
    });

    // Estudiar hoy handlers
    container.querySelector<HTMLButtonElement>('[data-study-fav]')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.studyFav!;
      lifeStore.toggleVaultFavorite(id);
      this.render(container);
    });

    container.querySelector<HTMLButtonElement>('#al-study-apply')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      const plan = container.querySelector<HTMLTextAreaElement>('#al-vault-study-plan')?.value.trim() ?? '';
      if (diff === 'avanzado' && !plan) {
        this.studyWarnMsg = 'En nivel Avanzado debes escribir un plan de acción breve antes de marcar Aplicado.';
        this.render(container);
        return;
      }
      this.studyWarnMsg = '';
      if (plan) {
        lifeStore.saveVaultActionPlan(id, plan);
      } else {
        lifeStore.setVaultStatus(id, 'applied');
      }
      lifeStore.recordVaultReview(id);
      this.studyQueueOffset += 1;
      this.feedbackMsg = 'Recurso marcado como Aplicado y sumado a tu meta diaria.';
      this.render(container);
    });

    container.querySelector<HTMLButtonElement>('#al-study-seen')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      const plan = container.querySelector<HTMLTextAreaElement>('#al-vault-study-plan')?.value.trim() ?? '';
      if (plan) lifeStore.saveVaultActionPlan(id, plan);
      lifeStore.setVaultStatus(id, 'seen');
      lifeStore.recordVaultReview(id);
      this.studyWarnMsg = '';
      this.studyQueueOffset += 1;
      this.render(container);
    });

    container.querySelector<HTMLButtonElement>('#al-study-promote')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      const item = itemMap.get(id);
      if (!item) return;
      lifeStore.promoteVaultToPhrase(item, PHRASE_CAT_MAP[item.category] ?? 'mente');
      lifeStore.markVaultPromoted(id);
      this.feedbackMsg = `Promovido a Frases y Criterio: "${item.title.slice(0, 48)}"`;
      this.render(container);
    });

    container.querySelector('#al-study-skip')?.addEventListener('click', () => {
      this.studyWarnMsg = '';
      this.studyQueueOffset += 1;
      this.render(container);
    });

    container.querySelector<HTMLButtonElement>('#al-study-archive')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      lifeStore.setVaultStatus(id, 'archived');
      this.studyWarnMsg = '';
      this.render(container);
    });

    // Quiz de acción handlers
    container.querySelectorAll<HTMLButtonElement>('[data-qhorizon]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.quizHorizon = btn.dataset.qhorizon as 'hoy' | 'semana' | 'proyecto';
        this.render(container);
      });
    });

    container.querySelector<HTMLButtonElement>('#al-quiz-save-plan')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.id!;
      const rawPlan = container.querySelector<HTMLTextAreaElement>('#al-vault-quiz-plan')?.value.trim() ?? '';
      if (!rawPlan) {
        this.studyWarnMsg = 'Escribe al menos una frase concreta de cómo aplicarás este recurso.';
        this.render(container);
        return;
      }
      const prefix =
        this.quizHorizon === 'hoy'
          ? '[Hoy] '
          : this.quizHorizon === 'semana'
            ? '[Esta semana] '
            : '[Proyecto] ';
      const formatted = rawPlan.startsWith('[') ? rawPlan : `${prefix}${rawPlan}`;
      lifeStore.saveVaultActionPlan(id, formatted);
      lifeStore.recordVaultReview(id);
      this.studyWarnMsg = '';
      this.feedbackMsg = 'Plan de acción guardado y marcado como Aplicado.';
      this.quizCursor += 1;
      this.render(container);
    });

    container.querySelector('#al-quiz-next')?.addEventListener('click', () => {
      this.studyWarnMsg = '';
      this.quizCursor += 1;
      this.render(container);
    });

    this.bindGridEvents(container, allItems);
  }
}
