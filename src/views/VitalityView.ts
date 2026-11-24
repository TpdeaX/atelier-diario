import { POSTURE_CHECKLIST, VITALITY_ROUTINES, type VitalityRoutine } from '../data/PersonalDevBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import type { DifficultyLevel } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, type SectionTutorialSpec } from '../ui/TutorialBanner';

const VIT_TUTORIALS: Record<'pausas' | 'registro' | 'postura', Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  pausas: {
    sectionName: 'Pausas activas con cronómetro',
    summary: 'Libera tensión de cuello, espalda, muñecas y ojos sin salir de tu escritorio.',
    steps: [
      'Elige una rutina según tu molestia o el tiempo disponible (de 1 a 5 minutos).',
      'Pulsa Iniciar rutina y sigue cada paso mientras corre el cronómetro automático.',
      'Al completar los pasos, la pausa se suma automáticamente a tu historial y hábito diario.',
    ],
    tip: 'Hacer 2 minutos de pausa cada 50 minutos rinde mucho más que trabajar 4 horas seguidas con fatiga.',
  },
  registro: {
    sectionName: 'Registro diario de energía, agua y sueño',
    summary: 'Mide los tres pilares físicos que sostienen tu foco cognitivo cada día.',
    steps: [
      'Suma cada vaso de agua que tomes con el botón +1 vaso.',
      'Registra cuántas horas dormiste anoche y tu nivel de energía actual (1-10).',
      'Compara tus últimos días guardados para detectar qué hábito dispara tu energía.',
    ],
    tip: 'La deshidratación leve baja la concentración antes de que sientas sed intensa.',
  },
  postura: {
    sectionName: 'Checklist ergonómico de escritorio',
    summary: 'Ajusta pantalla, silla, cuello y apoyo plantar para estudiar sin dolor lumbar ni cervical.',
    steps: [
      'Marca cada punto ergonómico que ya cumples en tu estación de estudio.',
      'Corrige hoy al menos un punto pendiente y tu configuración queda guardada.',
    ],
    tip: 'Elevar la laptop con un soporte o libros al nivel de los ojos elimina gran parte del dolor de cuello.',
  },
};

const VIT_DIFF_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Pausas breves de 1-2 min (vista 20-20-20, cuello y muñecas). Meta: 6 vasos de agua.',
  intermedio: 'Rutinas de 3 min (espalda y energía anti-somnolencia). Meta: 8 vasos de agua.',
  avanzado: 'Pausa integral completa de 5 min, ergonomía al 100% y seguimiento diario constante.',
};

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class VitalityView {
  private container: HTMLElement | null = null;
  private stepIdx = 0;
  private remainingSec = 0;
  private timerId = 0;
  private running = false;
  private statusMsg = '';

  private stopTimer(): void {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = 0;
    }
    this.running = false;
  }

  public unmount(): void {
    this.stopTimer();
    this.container = null;
  }

  private getActiveRoutine(): VitalityRoutine {
    const id = lifeStore.get().progress.vitality.selectedRoutineId;
    return VITALITY_ROUTINES.find((r) => r.id === id) ?? VITALITY_ROUTINES[0];
  }

  public render(container: HTMLElement): void {
    this.container = container;
    const prog = lifeStore.get().progress.vitality;
    const diff = lifeStore.getDifficulty('vitality');
    const tab = prog.activeTab;
    const routine = this.getActiveRoutine();
    const postureDone = POSTURE_CHECKLIST.filter((c) => prog.postureChecks[c.id]).length;
    const masteryPct = Math.min(
      100,
      Math.round(
        prog.completedRoutines * 10 +
          (postureDone / POSTURE_CHECKLIST.length) * 30 +
          Math.min(30, prog.dayLogs.length * 6)
      )
    );

    if (this.stepIdx >= routine.steps.length) this.stepIdx = 0;
    const curStep = routine.steps[this.stepIdx];
    if (!this.running && this.remainingSec <= 0) {
      this.remainingSec = curStep.durationSec;
    }

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #0284C7; --mod-c2: #38BDF8;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #0284C7; --em-c2: #38BDF8;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.activity(20)}</span>
            </div>
            <div>
              <h1>Energía, Postura y Pausas Activas</h1>
              <p>Cuida tu vista (20-20-20), libera cuello, espalda y muñecas con cronómetro guiado y registra agua y sueño.</p>
            </div>
          </div>
          <div class="al-mono-pill">${prog.completedRoutines} pausas · Postura ${postureDone}/${POSTURE_CHECKLIST.length}</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'vitality',
          progressLabel: `Cuidado físico y energía (${prog.completedRoutines} pausas · ${prog.dayLogs.length} días registrados)`,
          progressPct: masteryPct,
          progressDetail: `Ergonomía actual: ${postureDone}/${POSTURE_CHECKLIST.length} puntos verificados`,
          difficultyHints: VIT_DIFF_HINTS,
          extraMetric: `Nivel ${difficultyLabel(diff)}`,
        })}

        <div class="al-toolbar">
          <div class="al-seg-tabs" role="tablist">
            <button type="button" class="al-seg-btn ${tab === 'pausas' ? 'is-active' : ''}" data-vtab="pausas">Pausas guiadas (${VITALITY_ROUTINES.length})</button>
            <button type="button" class="al-seg-btn ${tab === 'registro' ? 'is-active' : ''}" data-vtab="registro">Agua, sueño y energía</button>
            <button type="button" class="al-seg-btn ${tab === 'postura' ? 'is-active' : ''}" data-vtab="postura">Postura y ergonomía (${postureDone}/${POSTURE_CHECKLIST.length})</button>
          </div>
        </div>

        ${renderTutorialBanner({
          id: `vitality:${tab}`,
          moduleName: 'Energía y Postura',
          ...VIT_TUTORIALS[tab],
        })}

        ${
          tab === 'pausas'
            ? this.renderRoutinesHtml(routine)
            : tab === 'registro'
              ? this.renderDayLogHtml(diff)
              : this.renderPostureHtml()
        }
      </div>
    `;

    this.bindEvents(container, routine);
    bindDidacticBar(container, 'vitality', () => this.render(container));
    bindTutorialBanners(container);
  }

  private renderRoutinesHtml(routine: VitalityRoutine): string {
    const prog = lifeStore.get().progress.vitality;
    const totalSec = routine.steps.reduce((a, s) => a + s.durationSec, 0);
    const curStep = routine.steps[this.stepIdx];
    const stepPct = Math.round(((this.stepIdx + 1) / routine.steps.length) * 100);
    const doneCount = prog.routineHistory[routine.id] ?? 0;

    return `
      <section class="al-panel">
        <div class="al-step-bar" aria-label="Rutinas disponibles">
          ${VITALITY_ROUTINES.map((r) => {
            const count = prog.routineHistory[r.id] ?? 0;
            const cls = r.id === routine.id ? 'is-active' : count > 0 ? 'is-done' : '';
            return `<button type="button" class="al-step-pill ${cls}" data-vr-pick="${r.id}">${esc(r.title)} · ${difficultyLabel(r.difficulty)}${count > 0 ? ` (${count}x)` : ''}</button>`;
          }).join('')}
        </div>

        <div class="al-study-card" style="margin-top:12px">
          <div class="al-didactic-prog-head">
            <strong>${esc(routine.title)} (${Math.round(totalSec / 60 * 10) / 10} min)</strong>
            <span class="al-mastery-badge">${doneCount > 0 ? `Hecha ${doneCount} vez/veces` : difficultyLabel(routine.difficulty)}</span>
          </div>
          <p class="al-muted" style="margin:0">${esc(routine.summary)}</p>
        </div>

        <div class="al-study-card is-done" style="margin-top:12px">
          <div class="al-didactic-prog-head">
            <strong>Paso ${this.stepIdx + 1}/${routine.steps.length}: ${esc(curStep.title)}</strong>
            <span class="al-mono-pill" id="al-vit-countdown">${this.remainingSec}s</span>
          </div>
          <progress class="al-didactic-meter" value="${stepPct}" max="100"></progress>
          <p style="margin:4px 0 8px;font-size:0.98rem">${esc(curStep.instruction)}</p>
          ${this.statusMsg ? `<p class="al-muted" style="margin:0 0 6px;font-weight:600">${esc(this.statusMsg)}</p>` : ''}
          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-primary" id="al-vit-toggle">${this.running ? 'Pausar' : 'Iniciar paso'}</button>
            <button type="button" class="al-btn" id="al-vit-next-step">${this.stepIdx + 1 < routine.steps.length ? 'Siguiente paso' : 'Terminar y guardar pausa'}</button>
            <button type="button" class="al-btn" id="al-vit-complete-now">${Icons.check(15)}<span>Marcar completada</span></button>
          </div>
        </div>
      </section>
    `;
  }

  private renderDayLogHtml(diff: DifficultyLevel): string {
    const prog = lifeStore.get().progress.vitality;
    const today = todayKey();
    const cur = prog.dayLogs.find((d) => d.day === today) ?? {
      day: today,
      waterCups: 0,
      sleepHours: 7,
      energyLevel: 7,
      breaksDone: 0,
    };
    const waterGoal = diff === 'basico' ? 6 : 8;
    const waterPct = Math.min(100, Math.round((cur.waterCups / waterGoal) * 100));

    return `
      <section class="al-panel">
        <h2>Tu estado físico de hoy (${today})</h2>
        <div class="al-study-grid" style="margin-top:10px">
          <div class="al-study-card">
            <div class="al-didactic-prog-head">
              <strong>Hidratación</strong>
              <span class="al-mastery-badge">${cur.waterCups}/${waterGoal} vasos</span>
            </div>
            <progress class="al-didactic-meter" value="${waterPct}" max="100"></progress>
            <div class="al-tool-group" style="margin-top:6px">
              <button type="button" class="al-btn al-btn-sm" id="al-vit-water-dec">-1</button>
              <button type="button" class="al-btn al-btn-sm al-btn-primary" id="al-vit-water-inc">+1 vaso de agua</button>
            </div>
          </div>

          <div class="al-study-card">
            <div class="al-didactic-prog-head">
              <strong>Sueño de anoche</strong>
              <span class="al-mono-pill">${cur.sleepHours} h</span>
            </div>
            <label class="al-inline-range">
              <span>Horas dormidas</span>
              <input type="range" id="al-vit-sleep" min="3" max="12" step="0.5" value="${cur.sleepHours}" />
            </label>
            <span class="al-muted" style="font-size:0.8rem">${cur.sleepHours >= 7 ? 'Descanso óptimo para memoria y foco.' : 'Con menos de 7h conviene priorizar pausas cortas hoy.'}</span>
          </div>

          <div class="al-study-card">
            <div class="al-didactic-prog-head">
              <strong>Nivel de energía (1-10)</strong>
              <span class="al-mono-pill">${cur.energyLevel}/10</span>
            </div>
            <div class="al-scale-row" role="group" aria-label="Nivel de energía de 1 a 10">
              ${Array.from({ length: 10 }, (_, i) => i + 1)
                .map(
                  (n) =>
                    `<button type="button" class="al-scale-btn ${cur.energyLevel === n ? 'is-active' : ''}" data-venergy="${n}" aria-pressed="${cur.energyLevel === n}">${n}</button>`
                )
                .join('')}
            </div>
          </div>
        </div>
      </section>

      ${
        prog.dayLogs.length > 0
          ? `
        <section class="al-panel">
          <h2>Historial reciente (${prog.dayLogs.length} días)</h2>
          <div class="al-study-grid">
            ${prog.dayLogs
              .slice(0, 7)
              .map(
                (d) => `
              <div class="al-study-card">
                <strong>${esc(d.day)}</strong>
                <span class="al-muted" style="font-size:0.82rem">Agua: ${d.waterCups} vasos · Sueño: ${d.sleepHours}h</span>
                <span class="al-mastery-badge">Energía ${d.energyLevel}/10 · ${d.breaksDone} pausas</span>
              </div>`
              )
              .join('')}
          </div>
        </section>`
          : ''
      }
    `;
  }

  private renderPostureHtml(): string {
    const prog = lifeStore.get().progress.vitality;
    return `
      <section class="al-panel">
        <h2>Checklist ergonómico de tu espacio de trabajo</h2>
        <div class="al-study-grid" style="margin-top:10px">
          ${POSTURE_CHECKLIST.map((item) => {
            const on = Boolean(prog.postureChecks[item.id]);
            return `
              <button type="button" class="al-study-card ${on ? 'is-done' : ''}" data-vposture="${item.id}" style="text-align:left">
                <div class="al-didactic-prog-head">
                  <span>${esc(item.label)}</span>
                  <span class="al-mastery-badge">${on ? 'Listo' : 'Revisar'}</span>
                </div>
              </button>`;
          }).join('')}
        </div>
      </section>
    `;
  }

  private startStepTimer(routine: VitalityRoutine): void {
    this.stopTimer();
    this.running = true;
    this.statusMsg = '';
    this.timerId = window.setInterval(() => {
      this.remainingSec -= 1;
      const el = this.container?.querySelector('#al-vit-countdown');
      if (this.remainingSec > 0) {
        if (el) el.textContent = `${this.remainingSec}s`;
        return;
      }
      if (this.stepIdx + 1 < routine.steps.length) {
        this.stepIdx += 1;
        this.remainingSec = routine.steps[this.stepIdx].durationSec;
        if (this.container) this.render(this.container);
      } else {
        this.stopTimer();
        this.stepIdx = 0;
        this.remainingSec = routine.steps[0].durationSec;
        lifeStore.recordVitalityRoutine(routine.id);
        this.statusMsg = `Pausa «${routine.title}» completada y guardada en tu registro diario.`;
        if (this.container) this.render(this.container);
      }
    }, 1000);
    if (this.container) this.render(this.container);
  }

  private bindEvents(container: HTMLElement, routine: VitalityRoutine): void {
    container.querySelectorAll<HTMLButtonElement>('[data-vtab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stopTimer();
        lifeStore.updateProgress('vitality', {
          activeTab: btn.dataset.vtab as 'pausas' | 'registro' | 'postura',
        });
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vr-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stopTimer();
        this.stepIdx = 0;
        this.remainingSec = 0;
        this.statusMsg = '';
        lifeStore.updateProgress('vitality', { selectedRoutineId: btn.dataset.vrPick! });
        this.render(container);
      });
    });

    container.querySelector('#al-vit-toggle')?.addEventListener('click', () => {
      if (this.running) {
        this.stopTimer();
        this.render(container);
      } else {
        this.startStepTimer(routine);
      }
    });

    container.querySelector('#al-vit-next-step')?.addEventListener('click', () => {
      this.stopTimer();
      if (this.stepIdx + 1 < routine.steps.length) {
        this.stepIdx += 1;
        this.remainingSec = routine.steps[this.stepIdx].durationSec;
      } else {
        this.stepIdx = 0;
        this.remainingSec = routine.steps[0].durationSec;
        lifeStore.recordVitalityRoutine(routine.id);
        this.statusMsg = `Pausa «${routine.title}» completada y guardada.`;
      }
      this.render(container);
    });

    container.querySelector('#al-vit-complete-now')?.addEventListener('click', () => {
      this.stopTimer();
      this.stepIdx = 0;
      this.remainingSec = routine.steps[0].durationSec;
      lifeStore.recordVitalityRoutine(routine.id);
      this.statusMsg = `Pausa «${routine.title}» registrada en tu progreso.`;
      this.render(container);
    });

    const today = todayKey();
    const curLog = () =>
      lifeStore.get().progress.vitality.dayLogs.find((d) => d.day === today) ?? {
        day: today,
        waterCups: 0,
        sleepHours: 7,
        energyLevel: 7,
        breaksDone: 0,
      };

    container.querySelector('#al-vit-water-dec')?.addEventListener('click', () => {
      lifeStore.saveVitalityDayLog({ waterCups: Math.max(0, curLog().waterCups - 1) });
      this.render(container);
    });
    container.querySelector('#al-vit-water-inc')?.addEventListener('click', () => {
      lifeStore.saveVitalityDayLog({ waterCups: curLog().waterCups + 1 });
      this.render(container);
    });
    container.querySelector<HTMLInputElement>('#al-vit-sleep')?.addEventListener('change', (e) => {
      const h = parseFloat((e.target as HTMLInputElement).value);
      if (Number.isFinite(h)) {
        lifeStore.saveVitalityDayLog({ sleepHours: h });
        this.render(container);
      }
    });
    container.querySelectorAll<HTMLButtonElement>('[data-venergy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.venergy!, 10) || 7;
        lifeStore.saveVitalityDayLog({ energyLevel: val });
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vposture]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.vposture!;
        const cur = lifeStore.get().progress.vitality.postureChecks;
        lifeStore.updateProgress('vitality', { postureChecks: { ...cur, [id]: !cur[id] } });
        lifeStore.markHabit('vitality');
        this.render(container);
      });
    });
  }
}
