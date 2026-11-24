import { CRITICAL_CASES, DECISION_TEMPLATES, type CriticalCase } from '../data/PersonalDevBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import type { DecisionCriterion, DifficultyLevel } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, type SectionTutorialSpec } from '../ui/TutorialBanner';

const CRIT_TUTORIALS: Record<'casos' | 'matriz' | 'repaso', Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  casos: {
    sectionName: 'Detector de sesgos y falacias',
    summary: 'Entrena criterio detectando errores de razonamiento en situaciones reales de estudio, trabajo y vida.',
    steps: [
      'Lee el escenario y elige qué sesgo cognitivo o falacia lógica lo explica.',
      'Revisa el antídoto práctico que aparece al responder para aplicarlo en tu semana.',
      'Cambia la dificultad arriba para filtrar entre casos básicos, intermedios o avanzados.',
    ],
    tip: 'Cada error se guarda automáticamente en la pestaña Repaso de fallos hasta que lo domines.',
  },
  matriz: {
    sectionName: 'Matriz de decisiones ponderada',
    summary: 'Compara dos opciones importantes con criterios claros y pesos reales para decidir sin sesgo emocional.',
    steps: [
      'Carga una plantilla rápida o escribe tu propia decisión y tus dos opciones A y B.',
      'Asigna peso (1-5) a cada criterio y puntúa ambas opciones del 1 al 10.',
      'Pulsa Guardar decisión para conservar tu análisis y el ganador ponderado en Supabase.',
    ],
    tip: 'Si el resultado numérico te incomoda, suele revelar un criterio importante que olvidaste incluir.',
  },
  repaso: {
    sectionName: 'Repaso de fallos',
    summary: 'Refuerza los sesgos y falacias que fallaste hasta convertirlos en aciertos sólidos.',
    steps: [
      'Resuelve los casos pendientes de tu cola de fallos.',
      'Al acertar un caso, sale de la cola y suma dominio en tu progreso global.',
    ],
    tip: 'Un sesgo que sabes nombrar pierde la mitad de su poder sobre tus decisiones.',
  },
};

const CRIT_DIFF_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Sesgos y falacias cotidianos (costo hundido, confirmación, ad hominem).',
  intermedio: 'Sesgos de proyectos y análisis (supervivencia, Dunning-Kruger, falsa causa).',
  avanzado: 'Razonamiento probabilístico, encuadre, tasa base y aversión a la pérdida.',
};

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class CriticalView {
  private pickedIdx: number | null = null;
  private matrixTitle = DECISION_TEMPLATES[0].title;
  private optionA = DECISION_TEMPLATES[0].options[0];
  private optionB = DECISION_TEMPLATES[0].options[1];
  private criteria: DecisionCriterion[] = DECISION_TEMPLATES[0].criteria.map((c) => ({ ...c }));

  private getPool(tab: 'casos' | 'matriz' | 'repaso', diff: DifficultyLevel): CriticalCase[] {
    const prog = lifeStore.get().progress.critical;
    if (tab === 'repaso') {
      return CRITICAL_CASES.filter((c) => prog.missedIds.includes(c.id));
    }
    const byDiff = CRITICAL_CASES.filter((c) => c.difficulty === diff);
    return byDiff.length > 0 ? byDiff : CRITICAL_CASES;
  }

  public render(container: HTMLElement): void {
    const prog = lifeStore.get().progress.critical;
    const diff = lifeStore.getDifficulty('critical');
    const tab = prog.activeTab;
    const totalCases = CRITICAL_CASES.length;
    const masteryPct = Math.min(
      100,
      Math.round((prog.masteredIds.length / totalCases) * 75 + Math.min(25, prog.decisions.length * 8))
    );

    const pool = this.getPool(tab, diff);
    const activeCase = pool.length > 0 ? pool[prog.caseIdx % pool.length] : null;

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #3730A3; --mod-c2: #818CF8;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #3730A3; --em-c2: #818CF8;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.scale(20)}</span>
            </div>
            <div>
              <h1>Pensamiento Crítico y Decisiones</h1>
              <p>Detecta sesgos cognitivos y falacias en ${totalCases} casos reales, y evalúa decisiones importantes con matriz ponderada.</p>
            </div>
          </div>
          <div class="al-mono-pill">${prog.masteredIds.length}/${totalCases} casos · ${prog.decisions.length} matrices</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'critical',
          progressLabel: `Dominio de criterio (${prog.masteredIds.length}/${totalCases} casos · ${prog.decisions.length} matrices)`,
          progressPct: masteryPct,
          progressDetail:
            prog.missedIds.length > 0
              ? `Tienes ${prog.missedIds.length} caso(s) en tu cola de repaso.`
              : 'Sin casos pendientes de repaso. Todo al día.',
          difficultyHints: CRIT_DIFF_HINTS,
          extraMetric: `Nivel ${difficultyLabel(diff)}`,
        })}

        <div class="al-toolbar">
          <div class="al-seg-tabs" role="tablist">
            <button type="button" class="al-seg-btn ${tab === 'casos' ? 'is-active' : ''}" data-ctab="casos">Casos de sesgos y falacias</button>
            <button type="button" class="al-seg-btn ${tab === 'repaso' ? 'is-active' : ''}" data-ctab="repaso">Repaso de fallos (${prog.missedIds.length})</button>
            <button type="button" class="al-seg-btn ${tab === 'matriz' ? 'is-active' : ''}" data-ctab="matriz">Matriz de decisiones (${prog.decisions.length})</button>
          </div>
        </div>

        ${renderTutorialBanner({
          id: `critical:${tab}`,
          moduleName: 'Pensamiento Crítico',
          ...CRIT_TUTORIALS[tab],
        })}

        ${tab === 'matriz' ? this.renderMatrixHtml() : this.renderCaseHtml(activeCase, pool.length, prog.caseIdx)}
      </div>
    `;

    this.bindEvents(container, activeCase, pool.length);
    bindDidacticBar(container, 'critical', () => {
      this.pickedIdx = null;
      lifeStore.updateProgress('critical', { caseIdx: 0 });
      this.render(container);
    });
    bindTutorialBanners(container);
  }

  private renderCaseHtml(item: CriticalCase | null, total: number, idx: number): string {
    if (!item) {
      return `
        <section class="al-panel">
          <h2>Cola de fallos limpia</h2>
          <p class="al-muted">No tienes sesgos ni falacias pendientes de repaso. Vuelve a Casos para seguir entrenando o sube la dificultad.</p>
          <button type="button" class="al-btn al-btn-primary" data-ctab="casos">Ir a Casos</button>
        </section>`;
    }

    const mastered = lifeStore.get().progress.critical.masteredIds.includes(item.id);
    const answered = this.pickedIdx !== null;
    const isCorrect = this.pickedIdx === item.correctIndex;

    return `
      <section class="al-panel">
        <div class="al-card-head">
          <div>
            <span class="al-mastery-badge">${item.kind === 'sesgo' ? 'Sesgo cognitivo' : item.kind === 'falacia' ? 'Falacia lógica' : 'Criterio de decisión'}</span>
            <span class="al-mastery-badge">${difficultyLabel(item.difficulty)}</span>
            ${mastered ? '<span class="al-mastery-badge">Dominado</span>' : ''}
          </div>
          <span class="al-mono-pill">Caso ${(idx % total) + 1}/${total}</span>
        </div>

        <h2 style="margin:8px 0 6px">${esc(item.title)}</h2>
        <p style="font-size:1.02rem;line-height:1.55;margin:0 0 14px">${esc(item.scenario)}</p>

        <div class="al-study-grid">
          ${item.options
            .map((opt, i) => {
              let cls = 'al-btn';
              if (answered) {
                if (i === item.correctIndex) cls += ' al-btn-primary';
                else if (i === this.pickedIdx) cls += ' is-toggled';
              }
              return `<button type="button" class="${cls}" data-copt="${i}" ${answered ? 'disabled' : ''} style="justify-content:flex-start;text-align:left;padding:12px 14px">${esc(opt)}</button>`;
            })
            .join('')}
        </div>

        ${
          answered
            ? `
          <div class="al-study-card" style="margin-top:14px">
            <strong>${isCorrect ? 'Correcto' : 'A revisar'}: ${esc(item.concept)}</strong>
            <p style="margin:0;font-size:0.9rem">${esc(item.explanation)}</p>
            <p class="al-muted" style="margin:0;font-size:0.86rem"><strong>Antídoto práctico:</strong> ${esc(item.antidote)}</p>
            <div class="al-tool-group" style="margin-top:6px">
              <button type="button" class="al-btn al-btn-primary" id="al-crit-next">Siguiente caso</button>
            </div>
          </div>`
            : ''
        }
      </section>
    `;
  }

  private renderMatrixHtml(): string {
    const prog = lifeStore.get().progress.critical;
    const totalA = this.criteria.reduce((acc, c) => acc + c.weight * c.scoreA, 0);
    const totalB = this.criteria.reduce((acc, c) => acc + c.weight * c.scoreB, 0);
    const maxScore = Math.max(1, this.criteria.reduce((acc, c) => acc + c.weight * 10, 0));
    const pctA = Math.round((totalA / maxScore) * 100);
    const pctB = Math.round((totalB / maxScore) * 100);
    const winner =
      totalA === totalB
        ? 'Empate técnico (añade un criterio decisivo)'
        : totalA > totalB
          ? this.optionA || 'Opción A'
          : this.optionB || 'Opción B';

    return `
      <section class="al-panel">
        <div class="al-card-head">
          <h2>Constructor de matriz ponderada</h2>
          <div class="al-step-bar" style="margin:0">
            ${DECISION_TEMPLATES.map(
              (t) => `<button type="button" class="al-step-pill" data-dtpl="${t.id}">${esc(t.title)}</button>`
            ).join('')}
          </div>
        </div>

        <div class="al-form-grid-3" style="margin-top:10px">
          <label><span>Decisión a evaluar</span><input type="text" id="al-dm-title" value="${esc(this.matrixTitle)}" /></label>
          <label><span>Opción A</span><input type="text" id="al-dm-a" value="${esc(this.optionA)}" /></label>
          <label><span>Opción B</span><input type="text" id="al-dm-b" value="${esc(this.optionB)}" /></label>
        </div>

        <div class="al-study-grid" style="margin-top:12px">
          ${this.criteria
            .map(
              (c, idx) => `
            <div class="al-study-card">
              <input type="text" data-dm-cname="${idx}" value="${esc(c.name)}" aria-label="Criterio ${idx + 1}" style="font-weight:600;padding:6px 8px;border-radius:6px;border:1px solid var(--border-subtle);background:var(--bg-surface)" />
              <label class="al-inline-range"><span>Peso (1-5): <strong>${c.weight}</strong></span><input type="range" min="1" max="5" value="${c.weight}" data-dm-w="${idx}" /></label>
              <label class="al-inline-range"><span>${esc(this.optionA.slice(0, 18))}: <strong>${c.scoreA}/10</strong></span><input type="range" min="1" max="10" value="${c.scoreA}" data-dm-sa="${idx}" /></label>
              <label class="al-inline-range"><span>${esc(this.optionB.slice(0, 18))}: <strong>${c.scoreB}/10</strong></span><input type="range" min="1" max="10" value="${c.scoreB}" data-dm-sb="${idx}" /></label>
            </div>`
            )
            .join('')}
        </div>

        <div class="al-study-card" style="margin-top:14px">
          <div class="al-didactic-prog-head">
            <strong>Resultado ponderado: ${esc(winner)}</strong>
            <span class="al-mono-pill">A: ${totalA} pts (${pctA}%) · B: ${totalB} pts (${pctB}%)</span>
          </div>
          <div class="al-tool-group" style="margin-top:6px">
            <button type="button" class="al-btn" id="al-dm-add-crit">${Icons.plus(14)}<span>Añadir criterio</span></button>
            <button type="button" class="al-btn al-btn-primary" id="al-dm-save">${Icons.check(15)}<span>Guardar decisión en mi historial</span></button>
          </div>
        </div>
      </section>

      ${
        prog.decisions.length > 0
          ? `
        <section class="al-panel">
          <h2>Decisiones guardadas (${prog.decisions.length})</h2>
          <div class="al-study-grid">
            ${prog.decisions
              .map(
                (d) => `
              <div class="al-study-card is-done">
                <div class="al-didactic-prog-head">
                  <strong>${esc(d.title)}</strong>
                  <button type="button" class="al-icon-btn" data-dm-del="${d.id}" title="Eliminar">×</button>
                </div>
                <span class="al-muted" style="font-size:0.82rem">${esc(d.optionA)} vs. ${esc(d.optionB)}</span>
                <span class="al-mastery-badge">Ganador: ${esc(d.winner)}</span>
              </div>`
              )
              .join('')}
          </div>
        </section>`
          : ''
      }
    `;
  }

  private bindEvents(container: HTMLElement, activeCase: CriticalCase | null, poolLen: number): void {
    container.querySelectorAll<HTMLButtonElement>('[data-ctab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.pickedIdx = null;
        lifeStore.updateProgress('critical', {
          activeTab: btn.dataset.ctab as 'casos' | 'matriz' | 'repaso',
          caseIdx: 0,
        });
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-copt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!activeCase || this.pickedIdx !== null) return;
        const pick = parseInt(btn.dataset.copt!, 10);
        this.pickedIdx = pick;
        lifeStore.recordCriticalResult(activeCase.id, pick === activeCase.correctIndex);
        this.render(container);
      });
    });

    container.querySelector('#al-crit-next')?.addEventListener('click', () => {
      this.pickedIdx = null;
      const cur = lifeStore.get().progress.critical.caseIdx;
      lifeStore.updateProgress('critical', { caseIdx: poolLen > 0 ? (cur + 1) % poolLen : 0 });
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-dtpl]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tpl = DECISION_TEMPLATES.find((t) => t.id === btn.dataset.dtpl);
        if (!tpl) return;
        this.matrixTitle = tpl.title;
        this.optionA = tpl.options[0];
        this.optionB = tpl.options[1];
        this.criteria = tpl.criteria.map((c) => ({ ...c }));
        this.render(container);
      });
    });

    container.querySelector<HTMLInputElement>('#al-dm-title')?.addEventListener('input', (e) => {
      this.matrixTitle = (e.target as HTMLInputElement).value;
    });
    container.querySelector<HTMLInputElement>('#al-dm-a')?.addEventListener('input', (e) => {
      this.optionA = (e.target as HTMLInputElement).value;
    });
    container.querySelector<HTMLInputElement>('#al-dm-b')?.addEventListener('input', (e) => {
      this.optionB = (e.target as HTMLInputElement).value;
    });

    container.querySelectorAll<HTMLInputElement>('[data-dm-cname]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const i = parseInt(inp.dataset.dmCname!, 10);
        if (this.criteria[i]) this.criteria[i].name = inp.value;
      });
    });
    container.querySelectorAll<HTMLInputElement>('[data-dm-w]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const i = parseInt(inp.dataset.dmW!, 10);
        if (this.criteria[i]) this.criteria[i].weight = parseInt(inp.value, 10) || 3;
        this.render(container);
      });
    });
    container.querySelectorAll<HTMLInputElement>('[data-dm-sa]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const i = parseInt(inp.dataset.dmSa!, 10);
        if (this.criteria[i]) this.criteria[i].scoreA = parseInt(inp.value, 10) || 5;
        this.render(container);
      });
    });
    container.querySelectorAll<HTMLInputElement>('[data-dm-sb]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const i = parseInt(inp.dataset.dmSb!, 10);
        if (this.criteria[i]) this.criteria[i].scoreB = parseInt(inp.value, 10) || 5;
        this.render(container);
      });
    });

    container.querySelector('#al-dm-add-crit')?.addEventListener('click', () => {
      if (this.criteria.length >= 8) return;
      this.criteria.push({ name: `Criterio ${this.criteria.length + 1}`, weight: 3, scoreA: 6, scoreB: 6 });
      this.render(container);
    });

    container.querySelector('#al-dm-save')?.addEventListener('click', () => {
      const totalA = this.criteria.reduce((acc, c) => acc + c.weight * c.scoreA, 0);
      const totalB = this.criteria.reduce((acc, c) => acc + c.weight * c.scoreB, 0);
      const winner = totalA === totalB ? 'Empate' : totalA > totalB ? this.optionA || 'Opción A' : this.optionB || 'Opción B';
      lifeStore.saveDecisionMatrix({
        title: this.matrixTitle.trim() || 'Decisión sin título',
        optionA: this.optionA.trim() || 'Opción A',
        optionB: this.optionB.trim() || 'Opción B',
        criteria: this.criteria.map((c) => ({ ...c })),
        winner,
      });
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-dm-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.deleteDecisionMatrix(btn.dataset.dmDel!);
        this.render(container);
      });
    });
  }
}
