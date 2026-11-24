import {
  computeCompoundInterest,
  FINANCE_QUIZ_CASES,
  type FinanceQuizItem,
} from '../data/PersonalDevBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import type { DifficultyLevel, FinanceTransaction } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, type SectionTutorialSpec } from '../ui/TutorialBanner';

const FIN_TUTORIALS: Record<
  'presupuesto' | 'metas' | 'compuesto' | 'criterio',
  Omit<SectionTutorialSpec, 'id' | 'moduleName'>
> = {
  presupuesto: {
    sectionName: 'Presupuesto y regla 50/30/20',
    summary: 'Registra ingresos y egresos en segundos y compara tu distribución real contra la regla 50/30/20.',
    steps: [
      'Elige tu moneda (S/, $ o €) y agrega tus ingresos y gastos por tipo: Necesidad, Deseo o Ahorro.',
      'Observa las 3 barras 50/30/20 para detectar si tus gustos superan el 30% o si el ahorro baja de 20%.',
      'Todo movimiento se guarda automáticamente en local y Supabase.',
    ],
    tip: 'Separa el ahorro apenas recibes un ingreso («págate a ti mismo primero»).',
  },
  metas: {
    sectionName: 'Metas de ahorro',
    summary: 'Divide objetivos concretos (fondo de emergencia, laptop, viaje, curso) en aportes medibles.',
    steps: [
      'Crea una meta con monto objetivo o suma aportes rápidos (+50 / +100) a tus metas activas.',
      'Revisa el porcentaje de avance y ajusta el monto ahorrado cuando necesites.',
    ],
    tip: 'Prioriza completar tu fondo de emergencia de 3 a 6 meses antes de inversiones volátiles.',
  },
  compuesto: {
    sectionName: 'Simulador de interés compuesto',
    summary: 'Visualiza cómo crecen tu capital inicial y aportes mensuales a lo largo del tiempo.',
    steps: [
      'Ajusta capital inicial, aporte mensual, tasa anual estimada y horizonte en años.',
      'Compara cuánto pones de tu bolsillo frente a cuánto genera el interés compuesto.',
    ],
    tip: 'Empezar 5 años antes suele pesar más que duplicar el aporte mensual tarde.',
  },
  criterio: {
    sectionName: 'Criterio financiero práctico',
    summary: 'Resuelve escenarios reales de deudas, inflación, gastos hormiga y diversificación.',
    steps: [
      'Lee cada caso y elige la decisión más sólida matemáticamente.',
      'Revisa la explicación y cambia de dificultad para practicar escenarios avanzados.',
    ],
    tip: 'Pagar una deuda de tarjeta cara supera casi cualquier rendimiento garantizado del mercado.',
  },
};

const FIN_DIFF_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Regla 50/30/20, fondo de emergencia y detección de gastos hormiga.',
  intermedio: 'Priorización de deudas (Avalancha vs Bola de nieve) e interés compuesto.',
  avanzado: 'Inflación real, costo de oportunidad y diversificación de largo plazo.',
};

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtMoney(currency: string, val: number): string {
  return `${currency} ${Math.round(val).toLocaleString('es-PE')}`;
}

export class FinanceView {
  private quizPicked: number | null = null;

  private getQuizPool(diff: DifficultyLevel): FinanceQuizItem[] {
    const byDiff = FINANCE_QUIZ_CASES.filter((q) => q.difficulty === diff);
    return byDiff.length > 0 ? byDiff : FINANCE_QUIZ_CASES;
  }

  public render(container: HTMLElement): void {
    const prog = lifeStore.get().progress.finance;
    const diff = lifeStore.getDifficulty('finance');
    const tab = prog.activeTab;
    const masteryPct = Math.min(
      100,
      Math.round(
        (prog.quizMasteredIds.length / FINANCE_QUIZ_CASES.length) * 50 +
          Math.min(25, prog.transactions.length * 5) +
          Math.min(25, prog.goals.filter((g) => g.saved > 0).length * 12)
      )
    );
    const quizPool = this.getQuizPool(diff);
    const activeQuiz = quizPool[prog.quizIdx % quizPool.length];

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #047857; --mod-c2: #34D399;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #047857; --em-c2: #34D399;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.wallet(20)}</span>
            </div>
            <div>
              <h1>Finanzas Personales y Ahorro</h1>
              <p>Controla tu flujo 50/30/20, construye metas de ahorro, simula interés compuesto y entrena criterio financiero.</p>
            </div>
          </div>
          <div class="al-tool-group">
            <div class="al-diff-pills" role="group" aria-label="Moneda">
              ${(['S/', '$', '€'] as const)
                .map(
                  (cur) =>
                    `<button type="button" class="al-diff-btn ${prog.currency === cur ? 'is-active' : ''}" data-fcur="${cur}" aria-pressed="${prog.currency === cur}">${cur}</button>`
                )
                .join('')}
            </div>
          </div>
        </div>

        ${renderDidacticBar({
          moduleId: 'finance',
          progressLabel: `Dominio financiero (${prog.quizMasteredIds.length}/${FINANCE_QUIZ_CASES.length} retos · ${prog.goals.length} metas)`,
          progressPct: masteryPct,
          progressDetail: `${prog.transactions.length} movimientos registrados · Simulador guardado en ${prog.currency}`,
          difficultyHints: FIN_DIFF_HINTS,
          extraMetric: `Nivel ${difficultyLabel(diff)}`,
        })}

        <div class="al-toolbar">
          <div class="al-seg-tabs" role="tablist">
            <button type="button" class="al-seg-btn ${tab === 'presupuesto' ? 'is-active' : ''}" data-ftab="presupuesto">Presupuesto 50/30/20</button>
            <button type="button" class="al-seg-btn ${tab === 'metas' ? 'is-active' : ''}" data-ftab="metas">Metas (${prog.goals.length})</button>
            <button type="button" class="al-seg-btn ${tab === 'compuesto' ? 'is-active' : ''}" data-ftab="compuesto">Interés compuesto</button>
            <button type="button" class="al-seg-btn ${tab === 'criterio' ? 'is-active' : ''}" data-ftab="criterio">Criterio (${prog.quizMasteredIds.length}/${FINANCE_QUIZ_CASES.length})</button>
          </div>
        </div>

        ${renderTutorialBanner({
          id: `finance:${tab}`,
          moduleName: 'Finanzas Personales',
          ...FIN_TUTORIALS[tab],
        })}

        ${
          tab === 'presupuesto'
            ? this.renderBudgetHtml()
            : tab === 'metas'
              ? this.renderGoalsHtml()
              : tab === 'compuesto'
                ? this.renderCompoundHtml()
                : this.renderQuizHtml(activeQuiz, quizPool.length, prog.quizIdx)
        }
      </div>
    `;

    this.bindEvents(container, activeQuiz, quizPool.length);
    bindDidacticBar(container, 'finance', () => {
      this.quizPicked = null;
      lifeStore.updateProgress('finance', { quizIdx: 0 });
      this.render(container);
    });
    bindTutorialBanners(container);
  }

  private renderBudgetHtml(): string {
    const prog = lifeStore.get().progress.finance;
    const cur = prog.currency;
    const sum = (kind: FinanceTransaction['kind']) =>
      prog.transactions.filter((t) => t.kind === kind).reduce((a, b) => a + b.amount, 0);

    const income = sum('income');
    const need = sum('need');
    const want = sum('want');
    const saving = sum('saving');
    const net = income - need - want - saving;

    const base = Math.max(1, income || need + want + saving);
    const needPct = Math.round((need / base) * 100);
    const wantPct = Math.round((want / base) * 100);
    const savingPct = Math.round((saving / base) * 100);

    const kindLabels: Record<FinanceTransaction['kind'], string> = {
      income: 'Ingreso',
      need: 'Necesidad (50%)',
      want: 'Deseo (30%)',
      saving: 'Ahorro (20%)',
    };

    return `
      <section class="al-panel">
        <h2>Registrar movimiento rápido</h2>
        <form id="al-fin-tx-form" class="al-form-grid-3" style="margin-top:8px">
          <label>
            <span>Tipo</span>
            <select id="al-fin-kind">
              <option value="income">Ingreso</option>
              <option value="need" selected>Necesidad esencial (meta <= 50%)</option>
              <option value="want">Deseo / estilo de vida (meta <= 30%)</option>
              <option value="saving">Ahorro / inversión (meta >= 20%)</option>
            </select>
          </label>
          <label>
            <span>Concepto</span>
            <input type="text" id="al-fin-label" placeholder="Ej. Sueldo, pasajes, almuerzo, ahorro..." required />
          </label>
          <label>
            <span>Monto (${cur})</span>
            <input type="number" id="al-fin-amount" min="0.5" step="0.5" placeholder="Ej. 120" required />
          </label>
          <div style="grid-column:1 / -1">
            <button type="submit" class="al-btn al-btn-primary">${Icons.plus(15)}<span>Guardar movimiento</span></button>
          </div>
        </form>

        <div class="al-study-grid" style="margin-top:14px">
          <div class="al-study-card">
            <div class="al-didactic-prog-head"><strong>Necesidades</strong><span class="al-mastery-badge ${needPct > 50 ? 'is-warn' : ''}">${needPct}% (meta <= 50%)</span></div>
            <progress class="al-didactic-meter" value="${Math.min(100, needPct)}" max="100"></progress>
            <span class="al-muted">${fmtMoney(cur, need)}</span>
          </div>
          <div class="al-study-card">
            <div class="al-didactic-prog-head"><strong>Deseos</strong><span class="al-mastery-badge ${wantPct > 30 ? 'is-warn' : ''}">${wantPct}% (meta <= 30%)</span></div>
            <progress class="al-didactic-meter" value="${Math.min(100, wantPct)}" max="100"></progress>
            <span class="al-muted">${fmtMoney(cur, want)}</span>
          </div>
          <div class="al-study-card">
            <div class="al-didactic-prog-head"><strong>Ahorro</strong><span class="al-mastery-badge ${savingPct < 20 && income > 0 ? 'is-warn' : ''}">${savingPct}% (meta >= 20%)</span></div>
            <progress class="al-didactic-meter" value="${Math.min(100, savingPct)}" max="100"></progress>
            <span class="al-muted">${fmtMoney(cur, saving)}</span>
          </div>
          <div class="al-study-card is-done">
            <div class="al-didactic-prog-head"><strong>Balance libre</strong><span class="al-mono-pill">${fmtMoney(cur, net)}</span></div>
            <span class="al-muted">Ingresos totales: ${fmtMoney(cur, income)}</span>
          </div>
        </div>
      </section>

      <section class="al-panel">
        <h2>Movimientos recientes (${prog.transactions.length})</h2>
        ${
          prog.transactions.length === 0
            ? '<p class="al-muted">Aún no registras movimientos. Agrega tu ingreso mensual y gastos clave arriba para ver tu diagnóstico 50/30/20.</p>'
            : `<div class="al-study-grid">
                ${prog.transactions
                  .slice(0, 18)
                  .map(
                    (tx) => `
                  <div class="al-study-card">
                    <div class="al-didactic-prog-head">
                      <strong>${esc(tx.label)}</strong>
                      <button type="button" class="al-icon-btn" data-ftx-del="${tx.id}" title="Eliminar">×</button>
                    </div>
                    <div class="al-didactic-prog-head">
                      <span class="al-mastery-badge ${tx.kind === 'want' ? 'is-warn' : ''}">${kindLabels[tx.kind]}</span>
                      <strong>${tx.kind === 'income' ? '+' : '-'}${fmtMoney(cur, tx.amount)}</strong>
                    </div>
                  </div>`
                  )
                  .join('')}
              </div>`
        }
      </section>
    `;
  }

  private renderGoalsHtml(): string {
    const prog = lifeStore.get().progress.finance;
    const cur = prog.currency;

    return `
      <section class="al-panel">
        <h2>Crear nueva meta de ahorro</h2>
        <form id="al-fin-goal-form" class="al-form-grid-3" style="margin-top:8px">
          <label><span>Nombre de la meta</span><input type="text" id="al-fg-title" placeholder="Ej. Laptop nueva, Viaje, Certificación" required /></label>
          <label><span>Objetivo (${cur})</span><input type="number" id="al-fg-target" min="10" step="10" placeholder="Ej. 2500" required /></label>
          <label><span>Ahorrado actual (${cur})</span><input type="number" id="al-fg-saved" min="0" step="10" value="0" /></label>
          <div style="grid-column:1 / -1">
            <button type="submit" class="al-btn al-btn-primary">${Icons.plus(15)}<span>Guardar meta</span></button>
          </div>
        </form>

        <div class="al-study-grid" style="margin-top:14px">
          ${prog.goals
            .map((g) => {
              const pct = Math.min(100, Math.round((g.saved / Math.max(1, g.target)) * 100));
              return `
                <div class="al-study-card ${pct >= 100 ? 'is-done' : ''}">
                  <div class="al-didactic-prog-head">
                    <strong>${esc(g.title)}</strong>
                    <button type="button" class="al-icon-btn" data-fg-del="${g.id}" title="Eliminar meta">×</button>
                  </div>
                  <progress class="al-didactic-meter" value="${pct}" max="100"></progress>
                  <div class="al-didactic-prog-head">
                    <span class="al-muted">${fmtMoney(cur, g.saved)} / ${fmtMoney(cur, g.target)}</span>
                    <span class="al-mastery-badge">${pct}%</span>
                  </div>
                  <div class="al-tool-group" style="margin-top:6px">
                    <button type="button" class="al-btn al-btn-sm" data-fg-add="${g.id}:50">+50</button>
                    <button type="button" class="al-btn al-btn-sm" data-fg-add="${g.id}:100">+100</button>
                    <button type="button" class="al-btn al-btn-sm al-btn-primary" data-fg-add="${g.id}:250">+250</button>
                  </div>
                </div>`;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  private renderCompoundHtml(): string {
    const prog = lifeStore.get().progress.finance;
    const cur = prog.currency;
    const res = computeCompoundInterest(
      prog.calcInitial,
      prog.calcMonthly,
      prog.calcRate,
      prog.calcYears
    );
    const interestShare =
      res.totalBalance > 0 ? Math.round((res.totalInterest / res.totalBalance) * 100) : 0;

    return `
      <section class="al-panel">
        <h2>Simulador de interés compuesto (parámetros guardados)</h2>
        <div class="al-study-grid" style="margin-top:10px">
          <div class="al-study-card">
            <label class="al-inline-range"><span>Capital inicial: <strong>${fmtMoney(cur, prog.calcInitial)}</strong></span>
              <input type="range" id="al-fc-init" min="0" max="20000" step="250" value="${prog.calcInitial}" />
            </label>
            <label class="al-inline-range"><span>Aporte mensual: <strong>${fmtMoney(cur, prog.calcMonthly)}</strong></span>
              <input type="range" id="al-fc-monthly" min="0" max="3000" step="50" value="${prog.calcMonthly}" />
            </label>
          </div>
          <div class="al-study-card">
            <label class="al-inline-range"><span>Rendimiento anual: <strong>${prog.calcRate}%</strong></span>
              <input type="range" id="al-fc-rate" min="1" max="18" step="0.5" value="${prog.calcRate}" />
            </label>
            <label class="al-inline-range"><span>Horizonte: <strong>${prog.calcYears} años</strong></span>
              <input type="range" id="al-fc-years" min="1" max="30" step="1" value="${prog.calcYears}" />
            </label>
          </div>
        </div>

        <div class="al-study-grid" style="margin-top:12px">
          <div class="al-study-card is-done">
            <span class="al-muted">Saldo proyectado al año ${prog.calcYears}</span>
            <strong style="font-size:1.3rem">${fmtMoney(cur, res.totalBalance)}</strong>
          </div>
          <div class="al-study-card">
            <span class="al-muted">Total aportado por ti</span>
            <strong style="font-size:1.15rem">${fmtMoney(cur, res.totalContributed)}</strong>
          </div>
          <div class="al-study-card">
            <span class="al-muted">Intereses generados (${interestShare}% del total)</span>
            <strong style="font-size:1.15rem;color:var(--accent-primary)">+${fmtMoney(cur, res.totalInterest)}</strong>
          </div>
        </div>

        <div class="al-study-card" style="margin-top:12px">
          <strong>Evolución por hitos</strong>
          ${res.timeline
            .filter((_, i, arr) => i === 0 || (i + 1) % Math.max(1, Math.floor(arr.length / 6)) === 0 || i === arr.length - 1)
            .map((pt) => {
              const barPct = Math.round((pt.balance / Math.max(1, res.totalBalance)) * 100);
              return `
                <div style="margin-top:6px">
                  <div class="al-didactic-prog-head" style="font-size:0.82rem">
                    <span>Año ${pt.year} · Aporte ${fmtMoney(cur, pt.contributed)}</span>
                    <strong>${fmtMoney(cur, pt.balance)} (+${fmtMoney(cur, pt.interest)})</strong>
                  </div>
                  <progress class="al-didactic-meter" value="${barPct}" max="100"></progress>
                </div>`;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  private renderQuizHtml(item: FinanceQuizItem, total: number, idx: number): string {
    const mastered = lifeStore.get().progress.finance.quizMasteredIds.includes(item.id);
    const answered = this.quizPicked !== null;
    const isCorrect = this.quizPicked === item.correctIndex;

    return `
      <section class="al-panel">
        <div class="al-card-head">
          <div class="al-tool-group">
            <span class="al-mastery-badge">${difficultyLabel(item.difficulty)}</span>
            ${mastered ? '<span class="al-mastery-badge">Dominado</span>' : ''}
          </div>
          <span class="al-mono-pill">Reto ${(idx % total) + 1}/${total}</span>
        </div>

        <h2 style="margin:8px 0 12px">${esc(item.question)}</h2>

        <div class="al-study-grid">
          ${item.options
            .map((opt, i) => {
              let cls = 'al-btn';
              if (answered) {
                if (i === item.correctIndex) cls += ' al-btn-primary';
                else if (i === this.quizPicked) cls += ' is-toggled';
              }
              return `<button type="button" class="${cls}" data-fqopt="${i}" ${answered ? 'disabled' : ''} style="justify-content:flex-start;text-align:left;padding:12px 14px">${esc(opt)}</button>`;
            })
            .join('')}
        </div>

        ${
          answered
            ? `
          <div class="al-study-card" style="margin-top:14px">
            <strong>${isCorrect ? 'Respuesta correcta' : 'Regla financiera clave'}</strong>
            <p style="margin:0;font-size:0.9rem">${esc(item.explanation)}</p>
            <div class="al-tool-group" style="margin-top:6px">
              <button type="button" class="al-btn al-btn-primary" id="al-fq-next">Siguiente reto</button>
            </div>
          </div>`
            : ''
        }
      </section>
    `;
  }

  private bindEvents(container: HTMLElement, activeQuiz: FinanceQuizItem, quizLen: number): void {
    container.querySelectorAll<HTMLButtonElement>('[data-fcur]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.updateProgress('finance', { currency: btn.dataset.fcur as 'S/' | '$' | '€' });
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ftab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.quizPicked = null;
        lifeStore.updateProgress('finance', {
          activeTab: btn.dataset.ftab as 'presupuesto' | 'metas' | 'compuesto' | 'criterio',
        });
        this.render(container);
      });
    });

    container.querySelector('#al-fin-tx-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const kind = container.querySelector<HTMLSelectElement>('#al-fin-kind')!.value as FinanceTransaction['kind'];
      const label = container.querySelector<HTMLInputElement>('#al-fin-label')!.value.trim();
      const amount = parseFloat(container.querySelector<HTMLInputElement>('#al-fin-amount')!.value);
      if (!label || !Number.isFinite(amount) || amount <= 0) return;
      lifeStore.addFinanceTransaction({ kind, label, amount });
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ftx-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.deleteFinanceTransaction(btn.dataset.ftxDel!);
        this.render(container);
      });
    });

    container.querySelector('#al-fin-goal-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = container.querySelector<HTMLInputElement>('#al-fg-title')!.value.trim();
      const target = parseFloat(container.querySelector<HTMLInputElement>('#al-fg-target')!.value);
      const saved = parseFloat(container.querySelector<HTMLInputElement>('#al-fg-saved')!.value) || 0;
      if (!title || !Number.isFinite(target) || target <= 0) return;
      lifeStore.upsertFinanceGoal({ title, target, saved });
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-fg-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [id, deltaStr] = btn.dataset.fgAdd!.split(':');
        const delta = parseFloat(deltaStr) || 0;
        const goal = lifeStore.get().progress.finance.goals.find((g) => g.id === id);
        if (!goal) return;
        lifeStore.upsertFinanceGoal({ ...goal, saved: goal.saved + delta });
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-fg-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.deleteFinanceGoal(btn.dataset.fgDel!);
        this.render(container);
      });
    });

    const wireCalc = (sel: string, key: 'calcInitial' | 'calcMonthly' | 'calcRate' | 'calcYears') => {
      container.querySelector<HTMLInputElement>(sel)?.addEventListener('change', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        if (Number.isFinite(val)) {
          lifeStore.updateProgress('finance', { [key]: val });
          this.render(container);
        }
      });
    };
    wireCalc('#al-fc-init', 'calcInitial');
    wireCalc('#al-fc-monthly', 'calcMonthly');
    wireCalc('#al-fc-rate', 'calcRate');
    wireCalc('#al-fc-years', 'calcYears');

    container.querySelectorAll<HTMLButtonElement>('[data-fqopt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.quizPicked !== null) return;
        const pick = parseInt(btn.dataset.fqopt!, 10);
        this.quizPicked = pick;
        lifeStore.recordFinanceQuiz(activeQuiz.id, pick === activeQuiz.correctIndex);
        this.render(container);
      });
    });

    container.querySelector('#al-fq-next')?.addEventListener('click', () => {
      this.quizPicked = null;
      const cur = lifeStore.get().progress.finance.quizIdx;
      lifeStore.updateProgress('finance', { quizIdx: (cur + 1) % quizLen });
      this.render(container);
    });
  }
}
