import {
  DAILY_STOIC_PROMPTS,
  findLowestWheelArea,
  OKR_QUICK_TEMPLATES,
  URGE_SURFING_PHASES,
  WEEKLY_REVIEW_CHECKLIST,
  WHEEL_OF_LIFE_AREAS,
} from '../data/CompassBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import type { DifficultyLevel, ModuleId } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, type SectionTutorialSpec } from '../ui/TutorialBanner';

type CompassTab = 'diario' | 'metas' | 'antihabitos';

const COMPASS_TUTORIALS: Record<CompassTab, Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  diario: {
    sectionName: 'Diario 3 min y Rueda de la Vida',
    summary: 'Cierra cada día con claridad en 4 campos breves y calibra mensualmente tus 8 áreas vitales.',
    steps: [
      'Responde en menos de 3 minutos: 1 logro de hoy, 1 fricción o aprendizaje, 1 ajuste para mañana y gratitud.',
      'Los domingos marca el checklist de Revisión Semanal para arrancar la semana sin carga mental.',
      'Mueve los deslizadores de la Rueda de la Vida (1-10) y guarda una foto mensual; te señalaremos el área más baja para enfocar.',
    ],
    tip: 'Escribir 1 ajuste concreto para mañana vale más que un diario largo sin acción.',
  },
  metas: {
    sectionName: 'Metas Trimestrales (OKRs a 90 días)',
    summary: 'Enfócate en máximo 3 objetivos a 90 días con hitos verificables para evitar saturación.',
    steps: [
      'Crea hasta 3 metas activas usando una plantilla rápida o escribiendo la tuya con fecha objetivo.',
      'Agrega hitos concretos y márcalos conforme avanzas para ver tu porcentaje en vivo.',
      'Cuando cierres una meta trimestral, archívala o elimínala para abrir espacio a la siguiente.',
    ],
    tip: 'Si tienes 10 prioridades, en la práctica no tienes ninguna. Tres metas trimestrales bien ejecutadas cambian tu año.',
  },
  antihabitos: {
    sectionName: 'Anti-Hábitos y Modo Urgencia 90s',
    summary: 'Desarma hábitos que te drenan registrando disparadores y surfeando el impulso por 90 segundos.',
    steps: [
      'Marca «+1 día limpio» al cerrar el día cumpliendo tu límite o agrega un anti-hábito propio.',
      'Cuando sientas un impulso fuerte, pulsa Botón Urgencia 90s y respira con el temporizador de ola emocional.',
      'Registra qué disparó el impulso y qué sustitución saludable aplicaste para aprender tu patrón.',
    ],
    tip: 'Un impulso compulsivo alcanza su pico y cae en ~90 segundos si no lo alimentas con el primer clic.',
  },
};

const COMPASS_DIFF_HINTS: Record<DifficultyLevel, string> = {
  basico: '1 registro rápido diario y 1 meta trimestral con pasos simples.',
  intermedio: 'Diario 3 min, revisión semanal completa y hasta 2 OKRs activos.',
  avanzado: 'Revisión integral, foto mensual de la Rueda de la Vida y 3 OKRs con seguimiento estricto.',
};

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultTargetDate90(): string {
  const d = new Date(Date.now() + 90 * 24 * 3600 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class CompassView {
  private container: HTMLElement | null = null;
  private onNavigate?: (next: ModuleId, options?: { sos?: boolean }) => void;
  private selectedDay = todayStamp();
  private statusMsg = '';
  private showNewOkrForm = false;
  private showNewAntiForm = false;
  private activeTriggerHabitId: string | null = null;

  // Urgencia 90s state
  private urgeRunning = false;
  private urgeRemaining = 90;
  private urgeTimer = 0;
  private urgeDoneBanner = false;

  public unmount(): void {
    this.stopUrgeTimer();
    this.container = null;
  }

  private stopUrgeTimer(): void {
    if (this.urgeTimer) {
      window.clearInterval(this.urgeTimer);
      this.urgeTimer = 0;
    }
    this.urgeRunning = false;
  }

  private renderWheelSvg(scores: Record<string, number>, lowestId: string): string {
    const cx = 160;
    const cy = 155;
    const maxR = 104;
    const n = WHEEL_OF_LIFE_AREAS.length;

    const pt = (idx: number, val: number): [number, number] => {
      const angle = (idx / n) * Math.PI * 2 - Math.PI / 2;
      const r = (Math.max(1, Math.min(10, val)) / 10) * maxR;
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    };

    const rings = [2, 4, 6, 8, 10]
      .map((lvl) => {
        const pts = WHEEL_OF_LIFE_AREAS.map((_, i) => pt(i, lvl).map((v) => v.toFixed(1)).join(',')).join(' ');
        return `<polygon points="${pts}" fill="none" stroke="var(--border-subtle)" stroke-width="1" />`;
      })
      .join('');

    const axes = WHEEL_OF_LIFE_AREAS.map((area, i) => {
      const [x2, y2] = pt(i, 10);
      const [lx, ly] = pt(i, 12.1);
      const isLow = area.id === lowestId;
      return `
        <line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--border-subtle)" stroke-width="1" />
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="10.5" font-weight="${isLow ? '700' : '600'}" fill="${isLow ? 'var(--accent-amber)' : 'var(--ink-secondary)'}">
          ${esc(area.shortLabel)} (${scores[area.id] ?? 5})
        </text>
      `;
    }).join('');

    const polyPoints = WHEEL_OF_LIFE_AREAS.map((area, i) =>
      pt(i, scores[area.id] ?? 5)
        .map((v) => v.toFixed(1))
        .join(',')
    ).join(' ');

    const dots = WHEEL_OF_LIFE_AREAS.map((area, i) => {
      const [dx, dy] = pt(i, scores[area.id] ?? 5);
      const isLow = area.id === lowestId;
      return `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${isLow ? '5.5' : '4'}" fill="${isLow ? 'var(--accent-amber)' : 'var(--accent-calm)'}" stroke="var(--bg-surface)" stroke-width="1.5" />`;
    }).join('');

    return `
      <svg class="al-wheel-svg" viewBox="0 0 320 310" role="img" aria-label="Rueda de la Vida en 8 áreas">
        ${rings}
        ${axes}
        <polygon points="${polyPoints}" fill="rgba(15, 118, 110, 0.22)" stroke="var(--accent-calm)" stroke-width="2.5" />
        ${dots}
      </svg>
    `;
  }

  public render(
    container: HTMLElement,
    onNavigate?: (next: ModuleId, options?: { sos?: boolean }) => void
  ): void {
    this.container = container;
    if (onNavigate) this.onNavigate = onNavigate;
    const prog = lifeStore.get().progress.compass;
    const diff = lifeStore.getDifficulty('compass');
    const summary = lifeStore.getOverallMasterySummary();
    const tab = prog.activeTab;

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #0E7490; --mod-c2: #22D3EE;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #0E7490; --em-c2: #22D3EE;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.compass(20)}</span>
            </div>
            <div>
              <h1>Brújula Personal</h1>
              <p>Diario de 3 minutos, Rueda de la Vida en 8 áreas, metas a 90 días (OKRs) y freno de anti-hábitos con Urgencia 90s.</p>
            </div>
          </div>
          <div class="al-mono-pill">${Object.keys(prog.dailyLogs).length} diarios · ${prog.okrs.length}/3 OKRs · ${prog.urgeSurfsCompleted} olas superadas</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'compass',
          progressLabel: 'Claridad y Dirección Personal',
          progressPct: summary.byModule.compass,
          progressDetail: `Diarios guardados: ${Object.keys(prog.dailyLogs).length} · Fotos Rueda: ${prog.wheelHistory.length}`,
          difficultyHints: COMPASS_DIFF_HINTS,
          extraMetric: `Nivel ${difficultyLabel(diff)}`,
        })}

        <div class="al-toolbar">
          <div class="al-seg-tabs" role="tablist">
            <button type="button" class="al-seg-btn ${tab === 'diario' ? 'is-active' : ''}" data-ctab="diario">Diario 3 min y Rueda</button>
            <button type="button" class="al-seg-btn ${tab === 'metas' ? 'is-active' : ''}" data-ctab="metas">Metas 90 días (${prog.okrs.length}/3)</button>
            <button type="button" class="al-seg-btn ${tab === 'antihabitos' ? 'is-active' : ''}" data-ctab="antihabitos">Anti-Hábitos y Urgencia 90s</button>
          </div>
          ${this.statusMsg ? `<span class="al-mastery-badge">${esc(this.statusMsg)}</span>` : ''}
        </div>

        ${renderTutorialBanner({
          id: `compass:${tab}`,
          moduleName: 'Brújula Personal',
          ...COMPASS_TUTORIALS[tab],
        })}

        ${
          tab === 'diario'
            ? this.renderDiarioTab()
            : tab === 'metas'
              ? this.renderMetasTab()
              : this.renderAntiHabitsTab()
        }
      </div>
    `;

    this.bindEvents(container);
    bindDidacticBar(container, 'compass', () => this.render(container, this.onNavigate));
    bindTutorialBanners(container);
  }

  private renderDiarioTab(): string {
    const prog = lifeStore.get().progress.compass;
    const entry = prog.dailyLogs[this.selectedDay] ?? {
      day: this.selectedDay,
      win: '',
      friction: '',
      adjustment: '',
      gratitude: '',
      updatedAt: 0,
    };
    const stoicIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % DAILY_STOIC_PROMPTS.length;
    const stoic = DAILY_STOIC_PROMPTS[stoicIdx];
    const recentDays = Object.keys(prog.dailyLogs).sort().reverse().slice(0, 7);
    const weeklyDone = WEEKLY_REVIEW_CHECKLIST.filter((c) => prog.weeklyChecks[c.id]).length;
    const lowest = findLowestWheelArea(prog.wheelScores);
    const wheelAvg =
      Math.round(
        (WHEEL_OF_LIFE_AREAS.reduce((a, area) => a + (prog.wheelScores[area.id] ?? 5), 0) /
          WHEEL_OF_LIFE_AREAS.length) *
          10
      ) / 10;

    return `
      <div class="al-two-col">
        <section class="al-panel">
          <div class="al-card-head">
            <div>
              <h2>Diario estructurado de 3 minutos</h2>
              <p class="al-muted" style="margin:2px 0 0">«${esc(stoic.quote)}» — ${esc(stoic.author)}</p>
            </div>
            <label class="al-inline-range">
              <span>Fecha</span>
              <input type="date" id="al-comp-day" value="${esc(this.selectedDay)}" />
            </label>
          </div>

          <form id="al-comp-daily-form" class="al-vault-form-stack" style="margin-top:12px">
            <label>
              <strong>1. Un logro concreto de hoy</strong>
              <textarea id="al-comp-win" class="al-inline-note" placeholder="¿Qué sacaste adelante hoy, aunque sea pequeño?">${esc(entry.win)}</textarea>
            </label>
            <label>
              <strong>2. Una fricción o aprendizaje</strong>
              <textarea id="al-comp-friction" class="al-inline-note" placeholder="¿Qué te frenó, distrajo o enseñó algo importante?">${esc(entry.friction)}</textarea>
            </label>
            <label>
              <strong>3. Un ajuste concreto para mañana</strong>
              <textarea id="al-comp-adjust" class="al-inline-note" placeholder="Una sola acción observable para mejorar mañana...">${esc(entry.adjustment)}</textarea>
            </label>
            <label>
              <strong>4. Gratitud o frase de cierre</strong>
              <textarea id="al-comp-gratitude" class="al-inline-note" placeholder="Algo que valoras hoy o un principio que te recuerda tu norte...">${esc(entry.gratitude)}</textarea>
            </label>
            <div class="al-tool-group">
              <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar diario del día</span></button>
              ${entry.updatedAt ? `<span class="al-muted" style="font-size:0.8rem">Guardado ${new Date(entry.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>` : ''}
            </div>
          </form>

          ${
            recentDays.length > 0
              ? `
            <div class="al-step-bar" style="margin-top:12px">
              <span class="al-muted" style="font-size:0.8rem">Entradas guardadas:</span>
              ${recentDays
                .map(
                  (d) =>
                    `<button type="button" class="al-step-pill ${d === this.selectedDay ? 'is-active' : 'is-done'}" data-comp-pick-day="${esc(d)}">${esc(d)}</button>`
                )
                .join('')}
            </div>`
              : ''
          }
        </section>

        <section class="al-panel">
          <div class="al-card-head">
            <div>
              <h2>Rueda de la Vida (8 áreas)</h2>
              <p class="al-muted" style="margin:2px 0 0">Promedio actual: <strong>${wheelAvg}/10</strong></p>
            </div>
            <button type="button" class="al-btn al-btn-sm al-btn-primary" id="al-comp-snap-wheel">
              ${Icons.bookmark(14)}<span>Guardar foto mensual</span>
            </button>
          </div>

          <div class="al-wheel-wrap">
            ${this.renderWheelSvg(prog.wheelScores, lowest.area.id)}
          </div>

          <div class="al-study-card is-warn-box" style="margin:8px 0 12px">
            <div class="al-didactic-prog-head">
              <strong>Área prioritaria detectada: ${esc(lowest.area.label)} (${lowest.score}/10)</strong>
              <span class="al-mastery-badge is-warn">Enfoque sugerido</span>
            </div>
            <p class="al-muted" style="margin:0;font-size:0.84rem">${esc(lowest.area.hint)}</p>
          </div>

          <div class="al-wheel-sliders">
            ${WHEEL_OF_LIFE_AREAS.map((area) => {
              const val = prog.wheelScores[area.id] ?? 5;
              const isLow = area.id === lowest.area.id;
              return `
                <label class="al-wheel-slider-row ${isLow ? 'is-lowest' : ''}">
                  <span>${esc(area.label)}</span>
                  <input type="range" min="1" max="10" step="1" value="${val}" data-wheel-area="${area.id}" />
                  <strong class="al-mono-pill">${val}</strong>
                </label>`;
            }).join('')}
          </div>

          ${
            prog.wheelHistory.length > 0
              ? `
            <div class="al-step-bar" style="margin-top:12px">
              <span class="al-muted" style="font-size:0.8rem">Historial mensual (${prog.wheelHistory.length}):</span>
              ${prog.wheelHistory
                .slice(0, 6)
                .map((h) => {
                  const vals = Object.values(h.scores);
                  const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
                  return `<span class="al-step-pill is-done">${esc(h.month)} · ${avg}/10</span>`;
                })
                .join('')}
            </div>`
              : ''
          }
        </section>
      </div>

      <section class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Revisión Semanal de Domingo (${weeklyDone}/${WEEKLY_REVIEW_CHECKLIST.length})</h2>
            <p class="al-muted" style="margin:2px 0 0">15 minutos el domingo te ahorran horas de dispersión entre lunes y viernes.</p>
          </div>
          <button type="button" class="al-btn al-btn-sm" id="al-comp-reset-weekly">${Icons.refresh(14)}<span>Reiniciar semana</span></button>
        </div>
        <div class="al-study-grid">
          ${WEEKLY_REVIEW_CHECKLIST.map((item) => {
            const on = Boolean(prog.weeklyChecks[item.id]);
            return `
              <button type="button" class="al-study-card ${on ? 'is-done' : ''}" data-comp-weekly="${item.id}" style="text-align:left">
                <div class="al-didactic-prog-head">
                  <strong>${esc(item.label)}</strong>
                  <span class="al-mastery-badge">${on ? 'Listo' : 'Pendiente'}</span>
                </div>
                <span class="al-muted" style="font-size:0.8rem">${esc(item.detail)}</span>
              </button>`;
          }).join('')}
        </div>
      </section>
    `;
  }

  private renderMetasTab(): string {
    const prog = lifeStore.get().progress.compass;
    const canAdd = prog.okrs.length < 3;

    return `
      <section class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Metas Trimestrales (OKRs a 90 días · Máximo 3 activas)</h2>
            <p class="al-muted" style="margin:2px 0 0">Limitar a 3 objetivos evita dispersión y aumenta drásticamente la tasa de cumplimiento.</p>
          </div>
          <button type="button" class="al-btn al-btn-primary" id="al-okr-toggle-new" ${canAdd ? '' : 'disabled'}>
            ${Icons.plus(15)}<span>${canAdd ? 'Nueva meta 90 días' : 'Límite 3/3 alcanzado'}</span>
          </button>
        </div>

        ${
          this.showNewOkrForm && canAdd
            ? `
          <form id="al-okr-form" class="al-study-card" style="margin-top:12px">
            <div class="al-form-grid-3">
              <label><span>Objetivo a 90 días</span><input type="text" id="al-okr-title" placeholder="Ej. Terminar proyecto de grado con excelencia" required /></label>
              <label>
                <span>Área de vida</span>
                <select id="al-okr-area">
                  ${WHEEL_OF_LIFE_AREAS.map((a) => `<option value="${esc(a.label)}">${esc(a.label)}</option>`).join('')}
                </select>
              </label>
              <label><span>Fecha objetivo</span><input type="date" id="al-okr-date" value="${defaultTargetDate90()}" required /></label>
            </div>
            <label>
              <span>Hitos clave (uno por línea, 2 a 6 hitos medibles)</span>
              <textarea id="al-okr-milestones" class="al-inline-note" placeholder="Hito 1: Definir alcance&#10;Hito 2: Construir prototipo funcional&#10;Hito 3: Validar y presentar"></textarea>
            </label>
            <div class="al-tool-group">
              <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Crear meta</span></button>
              <button type="button" class="al-btn" id="al-okr-cancel">Cancelar</button>
            </div>
          </form>`
            : ''
        }

        ${
          prog.okrs.length === 0
            ? `<p class="al-muted" style="margin-top:12px">Aún no tienes metas trimestrales activas. Crea la primera arriba o aplica una plantilla rápida abajo.</p>`
            : `<div class="al-study-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); margin-top:12px">
                ${prog.okrs
                  .map((okr) => {
                    const total = okr.milestones.length;
                    const done = okr.milestones.filter((m) => m.done).length;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return `
                      <article class="al-study-card ${pct === 100 ? 'is-done' : ''}">
                        <div class="al-card-head">
                          <span class="al-mono-pill">${esc(okr.area)} · Meta ${esc(okr.targetDate)}</span>
                          <button type="button" class="al-icon-btn" data-okr-del="${esc(okr.id)}" title="Eliminar meta">${Icons.trash(14)}</button>
                        </div>
                        <h3 style="margin:4px 0">${esc(okr.title)}</h3>
                        <div class="al-didactic-prog-head">
                          <span class="al-muted" style="font-size:0.8rem">${done}/${total} hitos completados</span>
                          <strong>${pct}%</strong>
                        </div>
                        <progress class="al-didactic-meter" value="${pct}" max="100"></progress>
                        <div class="al-okr-ms-list">
                          ${okr.milestones
                            .map(
                              (ms) => `
                            <label class="al-inline-check al-okr-ms-item ${ms.done ? 'is-done' : ''}">
                              <input type="checkbox" data-okr-ms="${esc(okr.id)}:${esc(ms.id)}" ${ms.done ? 'checked' : ''} />
                              <span>${esc(ms.title)}</span>
                            </label>`
                            )
                            .join('')}
                        </div>
                        <form class="al-vault-note-form" data-okr-add-ms="${esc(okr.id)}" style="margin-top:auto">
                          <input type="text" class="al-vault-note-input" placeholder="Añadir hito clave..." />
                          <button type="submit" class="al-btn al-btn-sm">${Icons.plus(13)}</button>
                        </form>
                      </article>`;
                  })
                  .join('')}
              </div>`
        }
      </section>

      <section class="al-panel">
        <h2>Plantillas rápidas de OKRs (1 clic)</h2>
        <div class="al-study-grid">
          ${OKR_QUICK_TEMPLATES.map(
            (tpl) => `
            <div class="al-study-card">
              <span class="al-mono-pill">${esc(tpl.area)}</span>
              <strong>${esc(tpl.title)}</strong>
              <ul class="al-muted" style="margin:4px 0;padding-left:18px;font-size:0.82rem">
                ${tpl.milestones.map((m) => `<li>${esc(m)}</li>`).join('')}
              </ul>
              <button type="button" class="al-btn al-btn-sm" data-okr-tpl="${tpl.id}" ${canAdd ? '' : 'disabled'}>
                ${Icons.plus(14)}<span>Usar plantilla</span>
              </button>
            </div>`
          ).join('')}
        </div>
      </section>
    `;
  }

  private renderAntiHabitsTab(): string {
    const prog = lifeStore.get().progress.compass;
    const today = todayStamp();
    const activePhase =
      URGE_SURFING_PHASES.find((p) => this.urgeRemaining <= p.startSec && this.urgeRemaining >= p.endSec) ??
      URGE_SURFING_PHASES[0];
    const wavePct = Math.round(((90 - this.urgeRemaining) / 90) * 100);

    return `
      <section class="al-panel al-urge-hero">
        <div class="al-card-head">
          <div>
            <h2>Botón Urgencia 90s (Surfear el impulso)</h2>
            <p class="al-muted" style="margin:2px 0 0">Si sientes urgencia de caer en un mal hábito, aguanta solo 90 segundos mientras la ola química baja.</p>
          </div>
          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-primary al-btn-lg" id="al-urge-toggle">
              ${this.urgeRunning ? Icons.pause(16) : Icons.shield(16)}
              <span>${this.urgeRunning ? 'Pausar ola (90s)' : 'Activar Urgencia 90s'}</span>
            </button>
            <button type="button" class="al-btn al-sos-pill-btn" id="al-comp-jump-sos">
              ${Icons.heartPulse(15)}<span>Ir a SOS Calma</span>
            </button>
          </div>
        </div>

        ${
          this.urgeRunning || this.urgeRemaining < 90 || this.urgeDoneBanner
            ? `
          <div class="al-study-card is-done" style="margin-top:12px">
            <div class="al-didactic-prog-head">
              <strong>${this.urgeDoneBanner ? 'Ola superada con éxito' : esc(activePhase.title)}</strong>
              <span class="al-fl-clock" id="al-urge-clock">${this.urgeRemaining}s</span>
            </div>
            <progress class="al-didactic-meter" value="${this.urgeDoneBanner ? 100 : wavePct}" max="100"></progress>
            <p style="margin:6px 0 0;font-size:0.94rem">
              ${
                this.urgeDoneBanner
                  ? 'Acabas de demostrarle a tu cerebro que puedes elegir sin obedecer al impulso. Aplica tu sustitución saludable ahora.'
                  : esc(activePhase.cue)
              }
            </p>
            <div class="al-tool-group" style="margin-top:8px">
              <button type="button" class="al-btn al-btn-sm" id="al-urge-reset">${Icons.refresh(13)}<span>Reiniciar 90s</span></button>
            </div>
          </div>`
            : ''
        }
      </section>

      <section class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Anti-Hábitos a reducir o eliminar (${prog.antiHabits.length})</h2>
            <p class="al-muted" style="margin:2px 0 0">Registra días limpios, disparadores reales y la sustitución saludable que los reemplaza.</p>
          </div>
          <button type="button" class="al-btn al-btn-primary" id="al-ah-toggle-new">${Icons.plus(15)}<span>Añadir anti-hábito</span></button>
        </div>

        ${
          this.showNewAntiForm
            ? `
          <form id="al-ah-form" class="al-study-card" style="margin-top:12px">
            <div class="al-form-grid-2">
              <label><span>Hábito a reducir</span><input type="text" id="al-ah-title" placeholder="Ej. Revisar redes al despertar" required /></label>
              <label><span>Sustitución saludable</span><input type="text" id="al-ah-repl" placeholder="Ej. Tomar un vaso de agua y estirar 2 min" required /></label>
            </div>
            <div class="al-tool-group">
              <button type="submit" class="al-btn al-btn-primary">${Icons.check(14)}<span>Guardar</span></button>
              <button type="button" class="al-btn" id="al-ah-cancel">Cancelar</button>
            </div>
          </form>`
            : ''
        }

        <div class="al-study-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); margin-top:12px">
          ${prog.antiHabits
            .map((ah) => {
              const markedToday = ah.lastCleanDay === today;
              const logOpen = this.activeTriggerHabitId === ah.id;
              return `
                <article class="al-study-card ${markedToday ? 'is-done' : ''}">
                  <div class="al-card-head">
                    <span class="al-mastery-badge">${ah.cleanDays} ${ah.cleanDays === 1 ? 'día limpio' : 'días limpios'}</span>
                    <button type="button" class="al-icon-btn" data-ah-del="${esc(ah.id)}" title="Eliminar">${Icons.trash(14)}</button>
                  </div>
                  <strong style="font-size:1rem">${esc(ah.title)}</strong>
                  <p class="al-muted" style="margin:0;font-size:0.84rem"><strong>Sustitución:</strong> ${esc(ah.replacementDefault)}</p>

                  <div class="al-tool-group" style="margin-top:6px">
                    <button type="button" class="al-btn al-btn-sm ${markedToday ? '' : 'al-btn-primary'}" data-ah-clean="${esc(ah.id)}" ${markedToday ? 'disabled' : ''}>
                      ${Icons.check(13)}<span>${markedToday ? 'Día limpio marcado' : '+1 día limpio hoy'}</span>
                    </button>
                    <button type="button" class="al-btn al-btn-sm" data-ah-log-toggle="${esc(ah.id)}">
                      ${Icons.edit(13)}<span>Registrar disparador</span>
                    </button>
                  </div>

                  ${
                    logOpen
                      ? `
                    <form class="al-vault-form-stack" data-ah-log-form="${esc(ah.id)}" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-subtle)">
                      <label><span>¿Qué lo disparó?</span><input type="text" name="trigger" placeholder="Ej. Aburrimiento tras estudiar, estrés..." required /></label>
                      <label><span>Sustitución aplicada</span><input type="text" name="replacement" value="${esc(ah.replacementDefault)}" required /></label>
                      <div class="al-tool-group">
                        <button type="submit" name="outcome" value="resisted" class="al-btn al-btn-sm al-btn-primary">Resistí el impulso</button>
                        <button type="submit" name="outcome" value="slipped" class="al-btn al-btn-sm">Recaí (reiniciar racha)</button>
                      </div>
                    </form>`
                      : ''
                  }

                  ${
                    ah.logs.length > 0
                      ? `
                    <div class="al-ah-logs">
                      ${ah.logs
                        .slice(0, 3)
                        .map(
                          (l) => `
                        <div class="al-ah-log-row">
                          <span class="al-mastery-badge ${l.resisted ? '' : 'is-warn'}">${l.resisted ? 'Resistido' : 'Aprendizaje'}</span>
                          <span>${esc(l.trigger)} → ${esc(l.replacement)}</span>
                        </div>`
                        )
                        .join('')}
                    </div>`
                      : ''
                  }
                </article>`;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  private startUrgeTimer(): void {
    this.stopUrgeTimer();
    this.urgeDoneBanner = false;
    if (this.urgeRemaining <= 0) this.urgeRemaining = 90;
    this.urgeRunning = true;
    this.urgeTimer = window.setInterval(() => {
      this.urgeRemaining -= 1;
      const clock = this.container?.querySelector('#al-urge-clock');
      if (this.urgeRemaining > 0) {
        if (clock) clock.textContent = `${this.urgeRemaining}s`;
        // Re-render on phase boundaries
        if (this.urgeRemaining === 64 || this.urgeRemaining === 34) {
          if (this.container) this.render(this.container, this.onNavigate);
        }
        return;
      }
      this.stopUrgeTimer();
      this.urgeRemaining = 0;
      this.urgeDoneBanner = true;
      lifeStore.recordUrgeSurfComplete();
      this.statusMsg = 'Ola de 90s completada y registrada.';
      if (this.container) this.render(this.container, this.onNavigate);
    }, 1000);
    if (this.container) this.render(this.container, this.onNavigate);
  }

  private bindEvents(container: HTMLElement): void {
    container.querySelectorAll<HTMLButtonElement>('[data-ctab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.statusMsg = '';
        lifeStore.updateProgress('compass', { activeTab: btn.dataset.ctab as CompassTab });
        this.render(container, this.onNavigate);
      });
    });

    // Diario 3 min
    container.querySelector<HTMLInputElement>('#al-comp-day')?.addEventListener('change', (e) => {
      this.selectedDay = (e.target as HTMLInputElement).value || todayStamp();
      this.render(container, this.onNavigate);
    });
    container.querySelectorAll<HTMLButtonElement>('[data-comp-pick-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedDay = btn.dataset.compPickDay!;
        this.render(container, this.onNavigate);
      });
    });
    container.querySelector('#al-comp-daily-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      lifeStore.saveCompassDailyLog(
        {
          win: container.querySelector<HTMLTextAreaElement>('#al-comp-win')?.value ?? '',
          friction: container.querySelector<HTMLTextAreaElement>('#al-comp-friction')?.value ?? '',
          adjustment: container.querySelector<HTMLTextAreaElement>('#al-comp-adjust')?.value ?? '',
          gratitude: container.querySelector<HTMLTextAreaElement>('#al-comp-gratitude')?.value ?? '',
        },
        this.selectedDay
      );
      this.statusMsg = `Diario del ${this.selectedDay} guardado.`;
      this.render(container, this.onNavigate);
    });

    // Rueda de la vida
    container.querySelectorAll<HTMLInputElement>('[data-wheel-area]').forEach((inp) => {
      inp.addEventListener('change', () => {
        lifeStore.setCompassWheelScore(inp.dataset.wheelArea!, Number(inp.value));
        this.render(container, this.onNavigate);
      });
    });
    container.querySelector('#al-comp-snap-wheel')?.addEventListener('click', () => {
      const snap = lifeStore.saveCompassWheelSnapshot();
      this.statusMsg = `Foto mensual ${snap.month} guardada.`;
      this.render(container, this.onNavigate);
    });

    // Weekly checklist
    container.querySelectorAll<HTMLButtonElement>('[data-comp-weekly]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.compWeekly!;
        const cur = lifeStore.get().progress.compass.weeklyChecks;
        lifeStore.updateProgress('compass', { weeklyChecks: { ...cur, [id]: !cur[id] } });
        lifeStore.markHabit('compass');
        this.render(container, this.onNavigate);
      });
    });
    container.querySelector('#al-comp-reset-weekly')?.addEventListener('click', () => {
      lifeStore.updateProgress('compass', { weeklyChecks: {} });
      this.statusMsg = 'Revisión semanal reiniciada para la nueva semana.';
      this.render(container, this.onNavigate);
    });

    // Metas OKRs
    container.querySelector('#al-okr-toggle-new')?.addEventListener('click', () => {
      this.showNewOkrForm = !this.showNewOkrForm;
      this.render(container, this.onNavigate);
    });
    container.querySelector('#al-okr-cancel')?.addEventListener('click', () => {
      this.showNewOkrForm = false;
      this.render(container, this.onNavigate);
    });
    container.querySelector('#al-okr-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = container.querySelector<HTMLInputElement>('#al-okr-title')?.value.trim() ?? '';
      const area = container.querySelector<HTMLSelectElement>('#al-okr-area')?.value ?? 'Propósito';
      const targetDate = container.querySelector<HTMLInputElement>('#al-okr-date')?.value ?? defaultTargetDate90();
      const msRaw = container.querySelector<HTMLTextAreaElement>('#al-okr-milestones')?.value ?? '';
      const milestones = msRaw.split('\n').map((s) => s.trim()).filter(Boolean);
      if (!title) return;
      lifeStore.addCompassOkr({
        title,
        area,
        targetDate,
        milestones: milestones.length > 0 ? milestones : ['Definir primer paso de esta semana'],
      });
      this.showNewOkrForm = false;
      this.statusMsg = 'Meta trimestral creada.';
      this.render(container, this.onNavigate);
    });
    container.querySelectorAll<HTMLButtonElement>('[data-okr-tpl]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tpl = OKR_QUICK_TEMPLATES.find((t) => t.id === btn.dataset.okrTpl);
        if (!tpl) return;
        const ok = lifeStore.addCompassOkr({
          title: tpl.title,
          area: tpl.area,
          targetDate: defaultTargetDate90(),
          milestones: tpl.milestones,
        });
        if (ok) {
          this.statusMsg = `Plantilla «${tpl.title}» añadida.`;
          this.render(container, this.onNavigate);
        }
      });
    });
    container.querySelectorAll<HTMLInputElement>('[data-okr-ms]').forEach((chk) => {
      chk.addEventListener('change', () => {
        const [okrId, msId] = (chk.dataset.okrMs ?? '').split(':');
        if (okrId && msId) {
          lifeStore.toggleCompassOkrMilestone(okrId, msId);
          this.render(container, this.onNavigate);
        }
      });
    });
    container.querySelectorAll<HTMLFormElement>('[data-okr-add-ms]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const okrId = form.dataset.okrAddMs!;
        const inp = form.querySelector<HTMLInputElement>('input');
        if (inp && inp.value.trim()) {
          lifeStore.addCompassOkrMilestone(okrId, inp.value.trim());
          this.render(container, this.onNavigate);
        }
      });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-okr-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.deleteCompassOkr(btn.dataset.okrDel!);
        this.render(container, this.onNavigate);
      });
    });

    // Anti-habits & Urgencia 90s
    container.querySelector('#al-urge-toggle')?.addEventListener('click', () => {
      if (this.urgeRunning) {
        this.stopUrgeTimer();
        this.render(container, this.onNavigate);
      } else {
        this.startUrgeTimer();
      }
    });
    container.querySelector('#al-urge-reset')?.addEventListener('click', () => {
      this.stopUrgeTimer();
      this.urgeRemaining = 90;
      this.urgeDoneBanner = false;
      this.render(container, this.onNavigate);
    });
    container.querySelector('#al-comp-jump-sos')?.addEventListener('click', () => {
      this.stopUrgeTimer();
      if (this.onNavigate) this.onNavigate('calm', { sos: true });
      else window.location.hash = '#calm?sos=1';
    });

    container.querySelector('#al-ah-toggle-new')?.addEventListener('click', () => {
      this.showNewAntiForm = !this.showNewAntiForm;
      this.render(container, this.onNavigate);
    });
    container.querySelector('#al-ah-cancel')?.addEventListener('click', () => {
      this.showNewAntiForm = false;
      this.render(container, this.onNavigate);
    });
    container.querySelector('#al-ah-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = container.querySelector<HTMLInputElement>('#al-ah-title')?.value.trim() ?? '';
      const repl = container.querySelector<HTMLInputElement>('#al-ah-repl')?.value.trim() ?? '';
      if (!title) return;
      lifeStore.addAntiHabit(title, repl);
      this.showNewAntiForm = false;
      this.statusMsg = 'Anti-hábito añadido.';
      this.render(container, this.onNavigate);
    });
    container.querySelectorAll<HTMLButtonElement>('[data-ah-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.deleteAntiHabit(btn.dataset.ahDel!);
        this.render(container, this.onNavigate);
      });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-ah-clean]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.markAntiHabitCleanDay(btn.dataset.ahClean!);
        this.statusMsg = 'Día limpio sumado a tu racha.';
        this.render(container, this.onNavigate);
      });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-ah-log-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.ahLogToggle!;
        this.activeTriggerHabitId = this.activeTriggerHabitId === id ? null : id;
        this.render(container, this.onNavigate);
      });
    });
    container.querySelectorAll<HTMLFormElement>('[data-ah-log-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = form.dataset.ahLogForm!;
        const fd = new FormData(form);
        const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
        const resisted = (submitter?.value ?? 'resisted') === 'resisted';
        const trigger = String(fd.get('trigger') ?? '');
        const replacement = String(fd.get('replacement') ?? '');
        if (!trigger.trim()) return;
        lifeStore.logAntiHabitTrigger(id, trigger, replacement, resisted);
        this.activeTriggerHabitId = null;
        this.statusMsg = resisted ? 'Disparador registrado: impulso resistido.' : 'Disparador registrado para aprender del patrón.';
        this.render(container, this.onNavigate);
      });
    });
  }
}
