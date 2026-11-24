import {
  INTERVIEW_QUESTIONS,
  INTERVIEW_RUBRIC_ITEMS,
  SOCIAL_CATEGORY_LABELS,
  SOCIAL_SCENARIOS,
  type SocialCategory,
} from '../data/CareerBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import type { BragCategory, DifficultyLevel } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, type SectionTutorialSpec } from '../ui/TutorialBanner';

type CareerTab = 'social' | 'entrevistas' | 'logros';

const CAREER_TUTORIALS: Record<CareerTab, Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  social: {
    sectionName: 'Habilidades Sociales y Negociación',
    summary: 'Entrena situaciones reales (límites, plazos, CNV, escucha activa y críticas) con guiones listos para usar.',
    steps: [
      'Filtra por categoría o recorre los 18 escenarios prácticos en orden.',
      'Elige la respuesta más efectiva y lee la crítica para entender el principio detrás.',
      'Copia o adapta el guión listo para usar en tu próxima reunión o conversación real.',
    ],
    tip: 'Practicar en frío una frase clara para decir no o negociar un plazo evita improvisar desde el nerviosismo.',
  },
  entrevistas: {
    sectionName: 'Simulador de Entrevistas (STAR y Técnicas)',
    summary: 'Responde preguntas reales contra reloj (60/90/120s), grábate localmente para escucharte y evalúate con rúbrica.',
    steps: [
      'Elige categoría (STAR conductual o Técnica) y el tiempo objetivo (60s, 90s o 120s).',
      'Pulsa Iniciar respuesta (o Activar grabación de voz opcional para escucharte al terminar).',
      'Marca los 5 criterios de la rúbrica y guarda tu intento en el historial para medir progreso.',
    ],
    tip: 'Escuchar tu propia grabación de 90 segundos revela muletillas, velocidad y claridad mucho mejor que solo pensarlo.',
  },
  logros: {
    sectionName: 'Brag Document (Diario de Logros)',
    summary: 'Registra cada semana logros concretos con impacto medible y expórtalos a Markdown para tu CV o entrevistas.',
    steps: [
      'Anota contexto, qué hiciste exactamente y el impacto medible (tiempo ahorrado, bugs evitados, nota, entregas).',
      'Etiqueta cada logro (Técnico, Liderazgo, Académico o Personal) para filtrarlos en segundos.',
      'Pulsa Copiar Markdown o Descargar .md cuando actualices tu currículum o prepares una evaluación.',
    ],
    tip: 'La memoria borra tus mejores logros a los 2 meses; anotar 1 logro por viernes construye un CV imbatible.',
  },
};

const CAREER_DIFF_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Escenarios cotidianos de límites y entrevistas de 120s con estructura visible.',
  intermedio: 'Negociación, CNV, entrevistas de 90s y registro semanal de logros.',
  avanzado: 'Entrevistas técnicas y conductuales en 60s exactos con máxima concisión.',
};

const BRAG_LABELS: Record<BragCategory, string> = {
  tecnico: 'Técnico',
  liderazgo: 'Liderazgo',
  academico: 'Académico',
  personal: 'Personal',
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

export class CareerView {
  private container: HTMLElement | null = null;
  private socialFilter: 'all' | SocialCategory = 'all';
  private selectedOption: number | null = null;
  private statusMsg = '';

  // Interview simulator state
  private timerRunning = false;
  private remainingSec = 90;
  private elapsedSec = 0;
  private timerId = 0;
  private rubricChecked = new Set<string>();
  private interviewNote = '';
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private recordedAudioUrl = '';
  private micError = '';

  // Brag document filter
  private bragFilter: 'all' | BragCategory = 'all';

  public unmount(): void {
    this.stopTimerAndRec();
    if (this.recordedAudioUrl) {
      URL.revokeObjectURL(this.recordedAudioUrl);
      this.recordedAudioUrl = '';
    }
    this.container = null;
  }

  private stopTimerAndRec(): void {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = 0;
    }
    this.timerRunning = false;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore
      }
    }
    this.mediaRecorder = null;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  public render(container: HTMLElement): void {
    this.container = container;
    const prog = lifeStore.get().progress.career;
    const diff = lifeStore.getDifficulty('career');
    const summary = lifeStore.getOverallMasterySummary();
    const tab = prog.activeTab;

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #1D4ED8; --mod-c2: #93C5FD;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #1D4ED8; --em-c2: #93C5FD;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.briefcase(20)}</span>
            </div>
            <div>
              <h1>Social y Carrera</h1>
              <p>Entrena límites, negociación y CNV en 18 escenarios, simula entrevistas STAR/técnicas con audio y construye tu Brag Document.</p>
            </div>
          </div>
          <div class="al-mono-pill">${prog.masteredScenarioIds.length}/${SOCIAL_SCENARIOS.length} casos · ${prog.interviewHistory.length} entrevistas · ${prog.bragLogs.length} logros</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'career',
          progressLabel: 'Comunicación Profesional y Carrera',
          progressPct: summary.byModule.career,
          progressDetail: `Casos sociales dominados: ${prog.masteredScenarioIds.length}/${SOCIAL_SCENARIOS.length} · Logros documentados: ${prog.bragLogs.length}`,
          difficultyHints: CAREER_DIFF_HINTS,
          extraMetric: `Nivel ${difficultyLabel(diff)}`,
        })}

        <div class="al-toolbar">
          <div class="al-seg-tabs" role="tablist">
            <button type="button" class="al-seg-btn ${tab === 'social' ? 'is-active' : ''}" data-cartab="social">Habilidades Sociales (${SOCIAL_SCENARIOS.length})</button>
            <button type="button" class="al-seg-btn ${tab === 'entrevistas' ? 'is-active' : ''}" data-cartab="entrevistas">Simulador Entrevistas (${INTERVIEW_QUESTIONS.length})</button>
            <button type="button" class="al-seg-btn ${tab === 'logros' ? 'is-active' : ''}" data-cartab="logros">Brag Document (${prog.bragLogs.length})</button>
          </div>
          ${this.statusMsg ? `<span class="al-mastery-badge">${esc(this.statusMsg)}</span>` : ''}
        </div>

        ${renderTutorialBanner({
          id: `career:${tab}`,
          moduleName: 'Social y Carrera',
          ...CAREER_TUTORIALS[tab],
        })}

        ${
          tab === 'social'
            ? this.renderSocialTab()
            : tab === 'entrevistas'
              ? this.renderInterviewTab()
              : this.renderBragTab()
        }
      </div>
    `;

    this.bindEvents(container);
    bindDidacticBar(container, 'career', (next) => {
      const nextDur = next === 'basico' ? 120 : next === 'avanzado' ? 60 : 90;
      lifeStore.updateProgress('career', { interviewDurationSec: nextDur });
      if (!this.timerRunning) this.remainingSec = nextDur;
      this.render(container);
    });
    bindTutorialBanners(container);
  }

  private renderSocialTab(): string {
    const prog = lifeStore.get().progress.career;
    const pool =
      this.socialFilter === 'all'
        ? SOCIAL_SCENARIOS
        : SOCIAL_SCENARIOS.filter((s) => s.category === this.socialFilter);
    const idx = prog.scenarioIdx % Math.max(1, pool.length);
    const sc = pool[idx];
    const mastered = prog.masteredScenarioIds.includes(sc.id);
    const answered = this.selectedOption !== null;
    const isCorrect = this.selectedOption === sc.correctIndex;

    return `
      <section class="al-panel">
        <div class="al-seg-tabs" style="margin-bottom:12px">
          <button type="button" class="al-seg-btn ${this.socialFilter === 'all' ? 'is-active' : ''}" data-soc-cat="all">Todos (${SOCIAL_SCENARIOS.length})</button>
          {(Object.keys(SOCIAL_CATEGORY_LABELS) as SocialCategory[])}
        </div>
      </section>
    `.replace(
      '{(Object.keys(SOCIAL_CATEGORY_LABELS) as SocialCategory[])}',
      (Object.keys(SOCIAL_CATEGORY_LABELS) as SocialCategory[])
        .map(
          (cat) =>
            `<button type="button" class="al-seg-btn ${this.socialFilter === cat ? 'is-active' : ''}" data-soc-cat="${cat}">${SOCIAL_CATEGORY_LABELS[cat]}</button>`
        )
        .join('')
    ) +
      `
      <section class="al-panel">
        <div class="al-card-head">
          <div class="al-tool-group">
            <span class="al-mono-pill">Escenario ${idx + 1}/${pool.length} · ${SOCIAL_CATEGORY_LABELS[sc.category]}</span>
            ${mastered ? `<span class="al-mastery-badge">${Icons.check(12)} Dominado</span>` : ''}
          </div>
          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-sm" id="al-soc-prev">Anterior</button>
            <button type="button" class="al-btn al-btn-sm al-btn-primary" id="al-soc-next">Siguiente caso</button>
          </div>
        </div>

        <h2 style="margin:10px 0 6px">${esc(sc.title)}</h2>
        <p style="margin:0 0 12px;font-size:0.96rem">${esc(sc.situation)}</p>

        <div class="al-study-grid" style="grid-template-columns:1fr">
          ${sc.options
            .map((opt, i) => {
              let cls = 'al-btn';
              if (answered) {
                if (i === sc.correctIndex) cls = 'al-btn al-btn-primary';
                else if (i === this.selectedOption) cls = 'al-btn al-btn-danger';
              }
              return `
                <button type="button" class="${cls}" data-soc-opt="${i}" style="text-align:left;white-space:normal;height:auto;padding:11px 14px;justify-content:flex-start" ${answered ? 'disabled' : ''}>
                  <span><strong>${String.fromCharCode(65 + i)}.</strong> ${esc(opt)}</span>
                </button>`;
            })
            .join('')}
        </div>

        ${
          answered
            ? `
          <div class="al-study-card ${isCorrect ? 'is-done' : ''}" style="margin-top:14px">
            <strong>${isCorrect ? 'Criterio acertado.' : 'Revisa este enfoque más efectivo:'}</strong>
            <p style="margin:0">${esc(sc.critique)}</p>
            <div class="al-fl-recall-back">
              <div class="al-card-head">
                <strong>Guión listo para adaptar y usar:</strong>
                <button type="button" class="al-btn al-btn-sm" id="al-soc-copy-script">${Icons.copy(13)}<span>Copiar guión</span></button>
              </div>
              <p id="al-soc-script-text">«${esc(sc.readyScript)}»</p>
            </div>
          </div>`
            : ''
        }
      </section>
    `;
  }

  private renderInterviewTab(): string {
    const prog = lifeStore.get().progress.career;
    const pool =
      prog.interviewCategory === 'all'
        ? INTERVIEW_QUESTIONS
        : INTERVIEW_QUESTIONS.filter((q) => q.category === prog.interviewCategory);
    const idx = prog.interviewIdx % Math.max(1, pool.length);
    const q = pool[idx];
    if (!this.timerRunning && this.elapsedSec === 0) {
      this.remainingSec = prog.interviewDurationSec;
    }
    const mm = String(Math.floor(this.remainingSec / 60)).padStart(2, '0');
    const ss = String(this.remainingSec % 60).padStart(2, '0');
    const rubricScore = this.rubricChecked.size;

    return `
      <div class="al-two-col">
        <section class="al-panel al-focus-card">
          <div class="al-card-head">
            <div class="al-seg-tabs">
              <button type="button" class="al-seg-btn ${prog.interviewCategory === 'all' ? 'is-active' : ''}" data-int-cat="all">Todas (${INTERVIEW_QUESTIONS.length})</button>
              <button type="button" class="al-seg-btn ${prog.interviewCategory === 'star' ? 'is-active' : ''}" data-int-cat="star">Conductuales STAR</button>
              <button type="button" class="al-seg-btn ${prog.interviewCategory === 'tecnica' ? 'is-active' : ''}" data-int-cat="tecnica">Técnicas</button>
            </div>
            <button type="button" class="al-btn al-btn-sm" id="al-int-next">${Icons.refresh(14)}<span>Otra pregunta</span></button>
          </div>

          <div class="al-fl-prompt-box">
            <span class="al-mono-pill">${q.category === 'star' ? 'STAR Conductual' : 'Técnica'} · ${esc(q.roleTag)} · Pregunta ${idx + 1}/${pool.length}</span>
            <h3>${esc(q.question)}</h3>
            <p><strong>Qué evalúan:</strong> ${esc(q.whatTheyLookFor)}</p>
            <div class="al-fl-framework"><strong>Guía de estructura:</strong> ${esc(q.structureHint)}</div>
          </div>

          <div class="al-fl-clock-row">
            <div class="al-fl-clock" id="al-int-clock">${mm}:${ss}</div>
            <div class="al-seg-tabs" role="group" aria-label="Duración objetivo">
              ${([60, 90, 120] as const)
                .map(
                  (sec) =>
                    `<button type="button" class="al-seg-btn ${prog.interviewDurationSec === sec ? 'is-active' : ''}" data-int-dur="${sec}">${sec}s</button>`
                )
                .join('')}
            </div>
          </div>

          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-primary" id="al-int-start-only">
              ${this.timerRunning ? Icons.pause(15) : Icons.play(15)}<span>${this.timerRunning ? 'Detener reloj' : 'Iniciar reloj'}</span>
            </button>
            <button type="button" class="al-btn" id="al-int-start-mic" ${this.timerRunning ? 'disabled' : ''}>
              ${Icons.mic(15)}<span>Grabar con micrófono (local)</span>
            </button>
            <button type="button" class="al-btn" id="al-int-reset">Reiniciar</button>
          </div>

          ${this.micError ? `<p class="al-muted" style="margin:0;color:var(--accent-amber)">${esc(this.micError)}</p>` : ''}

          ${
            this.recordedAudioUrl
              ? `
            <div class="al-study-card is-done">
              <strong>Tu grabación local (no se sube a ningún servidor):</strong>
              <audio controls src="${this.recordedAudioUrl}" style="width:100%"></audio>
            </div>`
              : ''
          }
        </section>

        <section class="al-panel al-focus-card">
          <div class="al-card-head">
            <h2>Autoevaluación (5 criterios)</h2>
            <span class="al-mastery-badge ${rubricScore < 3 ? 'is-warn' : ''}">${rubricScore}/5</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px">
            ${INTERVIEW_RUBRIC_ITEMS.map(
              (item) => `
              <label class="al-inline-check" style="align-items:flex-start;gap:8px;cursor:pointer">
                <input type="checkbox" data-int-rubric="${item.id}" ${this.rubricChecked.has(item.id) ? 'checked' : ''} />
                <span style="font-size:0.86rem">${esc(item.label)}</span>
              </label>`
            ).join('')}
          </div>

          <label>
            <span class="al-muted" style="font-size:0.82rem">Nota breve para mejorar en el siguiente intento:</span>
            <textarea id="al-int-note" class="al-inline-note" placeholder="Ej. Me faltó cuantificar el resultado final...">${esc(this.interviewNote)}</textarea>
          </label>

          <button type="button" class="al-btn al-btn-primary" id="al-int-save">
            ${Icons.check(15)}<span>Guardar práctica en historial (${rubricScore}/5)</span>
          </button>

          <div style="margin-top:8px;padding-top:10px;border-top:1px solid var(--border-subtle)">
            <div class="al-card-head">
              <strong>Historial reciente (${prog.interviewHistory.length})</strong>
            </div>
            ${
              prog.interviewHistory.length === 0
                ? '<p class="al-muted" style="margin:6px 0 0">Aún no guardas prácticas de entrevista.</p>'
                : `<div class="al-study-grid" style="grid-template-columns:1fr;margin-top:8px">
                    ${prog.interviewHistory
                      .slice(0, 5)
                      .map(
                        (h) => `
                      <div class="al-study-card ${h.rubricScore >= 4 ? 'is-done' : ''}">
                        <div class="al-didactic-prog-head">
                          <span class="al-mono-pill">${h.category.toUpperCase()} · ${h.durationSec}s</span>
                          <span class="al-mastery-badge ${h.rubricScore < 3 ? 'is-warn' : ''}">${h.rubricScore}/5</span>
                        </div>
                        <strong style="font-size:0.86rem">${esc(h.question.slice(0, 88))}${h.question.length > 88 ? '…' : ''}</strong>
                        ${h.note ? `<small class="al-muted">${esc(h.note)}</small>` : ''}
                      </div>`
                      )
                      .join('')}
                  </div>`
            }
          </div>
        </section>
      </div>
    `;
  }

  private buildBragMarkdown(): string {
    const logs = lifeStore.get().progress.career.bragLogs;
    const lines = [
      '# Brag Document · Diario de Logros',
      '',
      `Exportado desde Atelier Diario (${todayStamp()})`,
      '',
    ];
    for (const b of logs) {
      lines.push(`## [${BRAG_LABELS[b.category]}] ${b.context} (${b.date})`);
      lines.push(`- **Qué hice:** ${b.action}`);
      lines.push(`- **Impacto medible:** ${b.impact}`);
      lines.push('');
    }
    return lines.join('\n');
  }

  private renderBragTab(): string {
    const logs = lifeStore.get().progress.career.bragLogs;
    const filtered = this.bragFilter === 'all' ? logs : logs.filter((b) => b.category === this.bragFilter);

    return `
      <section class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Registrar nuevo logro (listo para CV o entrevista)</h2>
            <p class="al-muted" style="margin:2px 0 0">Usa verbos de acción + resultado concreto o métrica.</p>
          </div>
          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-sm" id="al-brag-copy-md" ${logs.length === 0 ? 'disabled' : ''}>
              ${Icons.copy(14)}<span>Copiar Markdown</span>
            </button>
            <button type="button" class="al-btn al-btn-sm al-btn-primary" id="al-brag-export-md" ${logs.length === 0 ? 'disabled' : ''}>
              ${Icons.download(14)}<span>Exportar .md</span>
            </button>
          </div>
        </div>

        <form id="al-brag-form" class="al-vault-form-stack" style="margin-top:12px">
          <div class="al-form-grid-3">
            <label><span>Proyecto / Contexto</span><input type="text" id="al-brag-context" placeholder="Ej. Migración API de reportes" required /></label>
            <label>
              <span>Etiqueta</span>
              <select id="al-brag-cat">
                <option value="tecnico">Técnico</option>
                <option value="liderazgo">Liderazgo</option>
                <option value="academico">Académico</option>
                <option value="personal">Personal</option>
              </select>
            </label>
            <label><span>Fecha</span><input type="date" id="al-brag-date" value="${todayStamp()}" /></label>
          </div>
          <div class="al-form-grid-2">
            <label><span>Qué hiciste exactamente</span><textarea id="al-brag-action" class="al-inline-note" placeholder="Ej. Optimicé consultas SQL con índices compuestos y caché local..." required></textarea></label>
            <label><span>Impacto medible</span><textarea id="al-brag-impact" class="al-inline-note" placeholder="Ej. Reduje el tiempo de carga de 9s a 1.1s y eliminé timeouts diarios." required></textarea></label>
          </div>
          <div>
            <button type="submit" class="al-btn al-btn-primary">${Icons.plus(15)}<span>Guardar logro en Brag Document</span></button>
          </div>
        </form>
      </section>

      <section class="al-panel">
        <div class="al-card-head">
          <h2>Tus logros guardados (${filtered.length})</h2>
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${this.bragFilter === 'all' ? 'is-active' : ''}" data-brag-f="all">Todos</button>
            {(Object.keys(BRAG_LABELS) as BragCategory[])}
          </div>
        </div>
        ${
          filtered.length === 0
            ? '<p class="al-muted" style="margin-top:10px">Aún no hay logros en esta categoría. Registra el primero arriba.</p>'
            : `<div class="al-study-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-top:12px">
                ${filtered
                  .map(
                    (b) => `
                  <article class="al-study-card is-done">
                    <div class="al-card-head">
                      <span class="al-mono-pill">${BRAG_LABELS[b.category]} · ${esc(b.date)}</span>
                      <button type="button" class="al-icon-btn" data-brag-del="${esc(b.id)}" title="Eliminar logro">${Icons.trash(14)}</button>
                    </div>
                    <strong>${esc(b.context)}</strong>
                    <p style="margin:2px 0;font-size:0.86rem"><strong>Acción:</strong> ${esc(b.action)}</p>
                    <p style="margin:0;font-size:0.86rem;color:var(--accent-primary)"><strong>Impacto:</strong> ${esc(b.impact)}</p>
                  </article>`
                  )
                  .join('')}
              </div>`
        }
      </section>
    `.replace(
      '{(Object.keys(BRAG_LABELS) as BragCategory[])}',
      (Object.keys(BRAG_LABELS) as BragCategory[])
        .map(
          (cat) =>
            `<button type="button" class="al-seg-btn ${this.bragFilter === cat ? 'is-active' : ''}" data-brag-f="${cat}">${BRAG_LABELS[cat]}</button>`
        )
        .join('')
    );
  }

  private async startInterview(withMic: boolean): Promise<void> {
    this.stopTimerAndRec();
    this.micError = '';
    const dur = lifeStore.get().progress.career.interviewDurationSec;
    this.remainingSec = dur;
    this.elapsedSec = 0;

    if (withMic) {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        this.micError = 'Tu navegador no permite grabar audio local; el cronómetro sigue activo para practicar en voz alta.';
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.mediaStream = stream;
          this.recordedChunks = [];
          const rec = new MediaRecorder(stream);
          rec.ondataavailable = (ev) => {
            if (ev.data.size > 0) this.recordedChunks.push(ev.data);
          };
          rec.onstop = () => {
            if (this.recordedChunks.length > 0) {
              if (this.recordedAudioUrl) URL.revokeObjectURL(this.recordedAudioUrl);
              const blob = new Blob(this.recordedChunks, { type: rec.mimeType || 'audio/webm' });
              this.recordedAudioUrl = URL.createObjectURL(blob);
              if (this.container) this.render(this.container);
            }
          };
          rec.start();
          this.mediaRecorder = rec;
        } catch {
          this.micError = 'No se obtuvo permiso de micrófono; practicando solo con cronómetro.';
        }
      }
    }

    this.timerRunning = true;
    this.timerId = window.setInterval(() => {
      this.elapsedSec += 1;
      this.remainingSec = Math.max(0, this.remainingSec - 1);
      const clock = this.container?.querySelector('#al-int-clock');
      if (clock) {
        clock.textContent = `${String(Math.floor(this.remainingSec / 60)).padStart(2, '0')}:${String(this.remainingSec % 60).padStart(2, '0')}`;
      }
      if (this.remainingSec <= 0) {
        this.stopTimerAndRec();
        this.statusMsg = 'Tiempo completado. Evalúa tu respuesta con la rúbrica.';
        if (this.container) this.render(this.container);
      }
    }, 1000);
    if (this.container) this.render(this.container);
  }

  private bindEvents(container: HTMLElement): void {
    container.querySelectorAll<HTMLButtonElement>('[data-cartab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stopTimerAndRec();
        this.statusMsg = '';
        lifeStore.updateProgress('career', { activeTab: btn.dataset.cartab as CareerTab });
        this.render(container);
      });
    });

    // Social drills
    container.querySelectorAll<HTMLButtonElement>('[data-soc-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.socialFilter = btn.dataset.socCat as 'all' | SocialCategory;
        this.selectedOption = null;
        lifeStore.updateProgress('career', { scenarioIdx: 0 });
        this.render(container);
      });
    });
    const poolSocial =
      this.socialFilter === 'all'
        ? SOCIAL_SCENARIOS
        : SOCIAL_SCENARIOS.filter((s) => s.category === this.socialFilter);
    const curSocIdx = lifeStore.get().progress.career.scenarioIdx % Math.max(1, poolSocial.length);
    const curSc = poolSocial[curSocIdx];

    container.querySelector('#al-soc-prev')?.addEventListener('click', () => {
      this.selectedOption = null;
      lifeStore.updateProgress('career', { scenarioIdx: (curSocIdx - 1 + poolSocial.length) % poolSocial.length });
      this.render(container);
    });
    container.querySelector('#al-soc-next')?.addEventListener('click', () => {
      this.selectedOption = null;
      lifeStore.updateProgress('career', { scenarioIdx: (curSocIdx + 1) % poolSocial.length });
      this.render(container);
    });
    container.querySelectorAll<HTMLButtonElement>('[data-soc-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.selectedOption !== null) return;
        const opt = Number(btn.dataset.socOpt);
        this.selectedOption = opt;
        lifeStore.recordCareerScenario(curSc.id, opt === curSc.correctIndex);
        this.render(container);
      });
    });
    container.querySelector('#al-soc-copy-script')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(curSc.readyScript);
        this.statusMsg = 'Guión copiado al portapapeles.';
      } catch {
        this.statusMsg = 'Selecciona y copia el guión manualmente.';
      }
      this.render(container);
    });

    // Interviews
    const prog = lifeStore.get().progress.career;
    const poolInt =
      prog.interviewCategory === 'all'
        ? INTERVIEW_QUESTIONS
        : INTERVIEW_QUESTIONS.filter((q) => q.category === prog.interviewCategory);
    const curQ = poolInt[prog.interviewIdx % Math.max(1, poolInt.length)];

    container.querySelectorAll<HTMLButtonElement>('[data-int-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stopTimerAndRec();
        this.elapsedSec = 0;
        lifeStore.updateProgress('career', {
          interviewCategory: btn.dataset.intCat as 'all' | 'star' | 'tecnica',
          interviewIdx: 0,
        });
        this.render(container);
      });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-int-dur]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stopTimerAndRec();
        const dur = Number(btn.dataset.intDur) as 60 | 90 | 120;
        this.remainingSec = dur;
        this.elapsedSec = 0;
        lifeStore.updateProgress('career', { interviewDurationSec: dur });
        this.render(container);
      });
    });
    container.querySelector('#al-int-next')?.addEventListener('click', () => {
      this.stopTimerAndRec();
      this.elapsedSec = 0;
      this.rubricChecked.clear();
      this.interviewNote = '';
      lifeStore.updateProgress('career', { interviewIdx: (prog.interviewIdx + 1) % poolInt.length });
      this.render(container);
    });
    container.querySelector('#al-int-start-only')?.addEventListener('click', () => {
      if (this.timerRunning) {
        this.stopTimerAndRec();
        this.render(container);
      } else {
        void this.startInterview(false);
      }
    });
    container.querySelector('#al-int-start-mic')?.addEventListener('click', () => {
      void this.startInterview(true);
    });
    container.querySelector('#al-int-reset')?.addEventListener('click', () => {
      this.stopTimerAndRec();
      this.elapsedSec = 0;
      this.remainingSec = prog.interviewDurationSec;
      this.rubricChecked.clear();
      this.interviewNote = '';
      this.render(container);
    });
    container.querySelectorAll<HTMLInputElement>('[data-int-rubric]').forEach((chk) => {
      chk.addEventListener('change', () => {
        const id = chk.dataset.intRubric!;
        if (chk.checked) this.rubricChecked.add(id);
        else this.rubricChecked.delete(id);
        this.render(container);
      });
    });
    container.querySelector<HTMLTextAreaElement>('#al-int-note')?.addEventListener('input', (e) => {
      this.interviewNote = (e.target as HTMLTextAreaElement).value;
    });
    container.querySelector('#al-int-save')?.addEventListener('click', () => {
      this.stopTimerAndRec();
      lifeStore.recordInterviewSession({
        questionId: curQ.id,
        question: curQ.question,
        category: curQ.category,
        durationSec: this.elapsedSec > 0 ? this.elapsedSec : prog.interviewDurationSec,
        rubricScore: this.rubricChecked.size,
        note: this.interviewNote.trim(),
      });
      this.statusMsg = `Entrevista guardada (${this.rubricChecked.size}/5).`;
      this.rubricChecked.clear();
      this.interviewNote = '';
      this.elapsedSec = 0;
      this.render(container);
    });

    // Brag Document
    container.querySelector('#al-brag-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const context = container.querySelector<HTMLInputElement>('#al-brag-context')?.value.trim() ?? '';
      const category = (container.querySelector<HTMLSelectElement>('#al-brag-cat')?.value ?? 'tecnico') as BragCategory;
      const date = container.querySelector<HTMLInputElement>('#al-brag-date')?.value || todayStamp();
      const action = container.querySelector<HTMLTextAreaElement>('#al-brag-action')?.value.trim() ?? '';
      const impact = container.querySelector<HTMLTextAreaElement>('#al-brag-impact')?.value.trim() ?? '';
      if (!context || !action || !impact) return;
      lifeStore.addBragLog({ date, context, action, impact, category });
      this.statusMsg = 'Logro añadido al Brag Document.';
      this.render(container);
    });
    container.querySelectorAll<HTMLButtonElement>('[data-brag-f]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.bragFilter = btn.dataset.bragF as 'all' | BragCategory;
        this.render(container);
      });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-brag-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.deleteBragLog(btn.dataset.bragDel!);
        this.render(container);
      });
    });
    container.querySelector('#al-brag-copy-md')?.addEventListener('click', async () => {
      const md = this.buildBragMarkdown();
      try {
        await navigator.clipboard.writeText(md);
        this.statusMsg = 'Brag Document copiado en formato Markdown.';
      } catch {
        this.statusMsg = 'No se pudo copiar automáticamente; usa Exportar .md.';
      }
      this.render(container);
    });
    container.querySelector('#al-brag-export-md')?.addEventListener('click', () => {
      const md = this.buildBragMarkdown();
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brag-document-${todayStamp()}.md`;
      a.click();
      URL.revokeObjectURL(url);
      this.statusMsg = 'Archivo Markdown descargado.';
      this.render(container);
    });
  }
}
