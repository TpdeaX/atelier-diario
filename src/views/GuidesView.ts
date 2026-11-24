import {
  buildYoutubeSearchUrl,
  YOUTUBE_GUIDES_BANK,
  type LearningGuideTopic,
} from '../data/YoutubeGuidesBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import type { DifficultyLevel, ModuleId } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner } from '../ui/TutorialBanner';

const CAT_LABELS: Record<'all' | LearningGuideTopic['category'], string> = {
  all: 'Todas',
  arte: 'Arte y Manualidades',
  cuerpo: 'Cuerpo y Cocina',
  mente: 'Mente y Estrategia',
  practico: 'Vida Práctica',
};

const GUIDES_DIFF_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Destaca la etapa Principiante para construir fundamentos sin vicios.',
  intermedio: 'Equilibra práctica interna en Atelier con tutoriales visuales intermedios.',
  avanzado: 'Enfoque en técnicas avanzadas, análisis fino y proyectos propios.',
};

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class GuidesView {
  private categoryFilter: 'all' | LearningGuideTopic['category'] = 'all';
  private onNavigate?: (next: ModuleId) => void;
  private statusMsg = '';

  public render(container: HTMLElement, onNavigate?: (next: ModuleId) => void): void {
    if (onNavigate) this.onNavigate = onNavigate;
    const prog = lifeStore.get().progress.guides;
    const diff = lifeStore.getDifficulty('guides');
    const summary = lifeStore.getOverallMasterySummary();

    const totalSteps = YOUTUBE_GUIDES_BANK.reduce((acc, t) => acc + t.stages.length, 0);
    const doneSteps = prog.completedSteps.length;
    const q = prog.searchQuery.trim().toLowerCase();

    const visibleTopics = YOUTUBE_GUIDES_BANK.filter((t) => {
      if (this.categoryFilter !== 'all' && t.category !== this.categoryFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.stages.some((s) => s.goal.toLowerCase().includes(q))
      );
    });

    const activeTopic =
      visibleTopics.find((t) => t.id === prog.selectedTopicId) ??
      YOUTUBE_GUIDES_BANK.find((t) => t.id === prog.selectedTopicId) ??
      YOUTUBE_GUIDES_BANK[0];

    const topicNote = prog.topicNotes[activeTopic.id] ?? '';
    const topicDoneCount = activeTopic.stages.filter((s) => prog.completedSteps.includes(s.stepKey)).length;

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #B91C1C; --mod-c2: #F87171;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #B91C1C; --em-c2: #F87171;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.youtube(20)}</span>
            </div>
            <div>
              <h1>Rutas de Aprendizaje y YouTube</h1>
              <p>Mapa claro de qué practicar aquí dentro y qué tutoriales visuales abrir en YouTube (Origami, Dibujo, Canto, Postura, Cocina, Rubik y más).</p>
            </div>
          </div>
          <div class="al-mono-pill">${YOUTUBE_GUIDES_BANK.length} rutas · ${doneSteps}/${totalSteps} etapas</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'guides',
          progressLabel: `Avance global de rutas (${doneSteps}/${totalSteps} etapas completadas)`,
          progressPct: summary.byModule.guides,
          progressDetail: `Notas guardadas en ${Object.keys(prog.topicNotes).length} habilidades`,
          difficultyHints: GUIDES_DIFF_HINTS,
          extraMetric: `Nivel ${difficultyLabel(diff)}`,
        })}

        ${renderTutorialBanner({
          id: 'guides:main',
          moduleName: 'Rutas y YouTube',
          sectionName: 'Cómo combinar Atelier con YouTube',
          summary: 'Aprende la técnica visual con búsquedas curadas en YouTube y consolida el hábito diario aquí.',
          steps: [
            'Elige una habilidad del catálogo (incluye artes físicas como Origami o Cubo Rubik).',
            'Revisa arriba qué puedes practicar dentro de Atelier/OMNI ARENA y qué conviene aprender viendo manos en acción en YouTube.',
            'Abre cualquiera de los botones de búsqueda exacta en YouTube (nueva pestaña), marca tu etapa al dominarla y guarda tus canales favoritos.',
          ],
          tip: 'Un solo video bien practicado con pausa y repetición vale por veinte vistos de corrido sin tocar nada.',
        })}

        <div class="al-toolbar">
          <div class="al-seg-tabs" role="tablist">
            ${(Object.keys(CAT_LABELS) as ('all' | LearningGuideTopic['category'])[])
              .map(
                (cat) =>
                  `<button type="button" class="al-seg-btn ${this.categoryFilter === cat ? 'is-active' : ''}" data-gcat="${cat}">${CAT_LABELS[cat]}</button>`
              )
              .join('')}
          </div>
          <input type="search" id="al-guides-search" class="al-filter-input" value="${esc(prog.searchQuery)}" placeholder="Buscar origami, cocina, rubik, dibujo..." />
        </div>

        <div class="al-guides-layout">
          <aside class="al-panel al-guides-list">
            <h2 style="margin:0 0 8px">Habilidades (${visibleTopics.length})</h2>
            <div class="al-stack-list">
              ${
                visibleTopics.length === 0
                  ? '<p class="al-muted">No hay rutas con ese filtro.</p>'
                  : visibleTopics
                      .map((t) => {
                        const tDone = t.stages.filter((s) => prog.completedSteps.includes(s.stepKey)).length;
                        const active = t.id === activeTopic.id;
                        return `
                          <button type="button" class="al-list-btn ${active ? 'is-active' : ''}" data-gtopic="${t.id}">
                            <strong>${esc(t.title)} <span class="al-mastery-badge">${tDone}/${t.stages.length}</span></strong>
                            <span>${esc(t.summary)}</span>
                          </button>`;
                      })
                      .join('')
              }
            </div>
          </aside>

          <section class="al-panel al-guides-detail">
            <div class="al-card-head">
              <div>
                <span class="al-mono-pill">${CAT_LABELS[activeTopic.category]} · ${topicDoneCount}/${activeTopic.stages.length} etapas</span>
                <h2 style="margin:6px 0 4px">${esc(activeTopic.title)}</h2>
                <p class="al-muted" style="margin:0">${esc(activeTopic.summary)}</p>
              </div>
              ${
                activeTopic.internalRoute
                  ? `<button type="button" class="al-btn al-btn-primary" data-gnav="${activeTopic.internalRoute}">${Icons.play(14)}<span>Practicar en Atelier</span></button>`
                  : `<span class="al-mastery-badge">Práctica física externa</span>`
              }
            </div>

            <div class="al-study-card" style="margin-top:12px">
              <strong>Qué hacer dentro del ecosistema:</strong>
              <p style="margin:0;font-size:0.88rem">${esc(activeTopic.insideApp)}</p>
              ${activeTopic.externalArenaHint ? `<small class="al-muted">${esc(activeTopic.externalArenaHint)}</small>` : ''}
            </div>

            <div class="al-study-grid" style="grid-template-columns:1fr;margin-top:12px">
              ${activeTopic.stages
                .map((st, idx) => {
                  const done = prog.completedSteps.includes(st.stepKey);
                  const recommended =
                    (diff === 'basico' && idx === 0) ||
                    (diff === 'intermedio' && idx === 1) ||
                    (diff === 'avanzado' && idx === 2);
                  return `
                    <article class="al-study-card ${done ? 'is-done' : ''}">
                      <div class="al-card-head">
                        <div class="al-tool-group">
                          <span class="al-mono-pill">Etapa ${idx + 1} · ${st.level}</span>
                          ${recommended ? '<span class="al-mastery-badge">Tu nivel actual</span>' : ''}
                        </div>
                        <label class="al-inline-check" style="cursor:pointer">
                          <input type="checkbox" data-gstep="${esc(st.stepKey)}" ${done ? 'checked' : ''} />
                          <span>${done ? 'Completada' : 'Marcar completada'}</span>
                        </label>
                      </div>
                      <p style="margin:4px 0"><strong>Meta:</strong> ${esc(st.goal)}</p>
                      <p class="al-muted" style="margin:0;font-size:0.85rem"><strong>Qué observar para evitar malos hábitos:</strong> ${esc(st.watchOut)}</p>
                      <div class="al-tool-group" style="margin-top:8px">
                        ${st.youtubeLinks
                          .map(
                            (lnk) => `
                          <a class="al-btn al-btn-sm al-yt-link-btn" href="${esc(buildYoutubeSearchUrl(lnk.query))}" target="_blank" rel="noopener noreferrer">
                            ${Icons.youtube(14)}<span>${esc(lnk.label)}</span>${Icons.arrowUpRight(13)}
                          </a>`
                          )
                          .join('')}
                      </div>
                    </article>`;
                })
                .join('')}
            </div>

            <div class="al-study-card" style="margin-top:14px">
              <div class="al-card-head">
                <strong>Mis notas, canales favoritos o enlaces de videos (${esc(activeTopic.title)})</strong>
                ${this.statusMsg ? `<span class="al-mastery-badge">${esc(this.statusMsg)}</span>` : ''}
              </div>
              <textarea id="al-guides-note" class="al-inline-note" placeholder="Pega aquí tu canal favorito, video pendiente o punto en el que te quedaste...">${esc(topicNote)}</textarea>
              <div class="al-tool-group">
                <button type="button" class="al-btn al-btn-primary al-btn-sm" id="al-guides-save-note">${Icons.check(14)}<span>Guardar nota</span></button>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;

    this.bindEvents(container, activeTopic.id);
    bindDidacticBar(container, 'guides', () => this.render(container, this.onNavigate));
    bindTutorialBanners(container);
  }

  private bindEvents(container: HTMLElement, activeTopicId: string): void {
    container.querySelectorAll<HTMLButtonElement>('[data-gcat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.categoryFilter = btn.dataset.gcat as 'all' | LearningGuideTopic['category'];
        this.render(container, this.onNavigate);
      });
    });

    container.querySelector<HTMLInputElement>('#al-guides-search')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      lifeStore.updateProgress('guides', { searchQuery: val });
      this.render(container, this.onNavigate);
      const nextInp = container.querySelector<HTMLInputElement>('#al-guides-search');
      if (nextInp) {
        nextInp.focus();
        nextInp.setSelectionRange(val.length, val.length);
      }
    });

    container.querySelectorAll<HTMLButtonElement>('[data-gtopic]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.statusMsg = '';
        lifeStore.updateProgress('guides', { selectedTopicId: btn.dataset.gtopic! });
        this.render(container, this.onNavigate);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-gnav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mod = btn.dataset.gnav as ModuleId;
        if (this.onNavigate) this.onNavigate(mod);
        else window.location.hash = `#${mod}`;
      });
    });

    container.querySelectorAll<HTMLInputElement>('[data-gstep]').forEach((chk) => {
      chk.addEventListener('change', () => {
        lifeStore.toggleGuideStep(chk.dataset.gstep!);
        this.render(container, this.onNavigate);
      });
    });

    container.querySelector('#al-guides-save-note')?.addEventListener('click', () => {
      const val = container.querySelector<HTMLTextAreaElement>('#al-guides-note')?.value ?? '';
      lifeStore.saveGuideTopicNote(activeTopicId, val);
      this.statusMsg = 'Nota guardada.';
      this.render(container, this.onNavigate);
    });
  }
}
