import { POSTURE_CHECKLIST } from '../data/PersonalDevBank';
import {
  BODY_ZONES,
  evaluatePostureScore,
  NUTRITION_DAILY_CHECKLIST,
  PLAN_21_DAYS,
  POSTURE_ASSESSMENT_TESTS,
  POSTURE_PRO_ROUTINES,
  QUICK_PROTEIN_MEALS,
  renderPosturePoseSvg,
  type PostureProRoutine,
  type QuickProteinMeal,
} from '../data/PostureProBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import type { BodyZoneId, DifficultyLevel, VitalityDayLog } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, type SectionTutorialSpec } from '../ui/TutorialBanner';
import { renderYoutubeJumpCard } from '../ui/YoutubeJumpCard';

type VitalityTab = 'pausas' | 'monitor' | 'plan21' | 'registro';
type PostureLiveStatus = 'idle' | 'ready' | 'good' | 'warn' | 'bad';

const VIT_TUTORIALS: Record<VitalityTab, Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  pausas: {
    sectionName: 'Mapa Corporal y Pausas Animadas',
    summary: 'Toca la zona que sientes cargada en la silueta humana para filtrar rutinas con diagrama postural animado.',
    steps: [
      'Haz clic en cualquier punto del Mapa Corporal (Ojos, Cuello, Hombros, Espalda Alta, Lumbar, Muñecas o Caderas).',
      'Elige la rutina filtrada y pulsa Iniciar paso para seguir el diagrama animado, la respiración y el cronómetro.',
      'Al completar la secuencia, la pausa se guarda automáticamente en tu registro diario.',
    ],
    tip: 'Dos minutos de descarga postural cada 45-50 minutos rinden mucho más que aguantar horas encorvado.',
  },
  monitor: {
    sectionName: 'Monitor Postural Live (100% Local) y Alertas',
    summary: 'Vigila tu postura en tiempo real desde el navegador sin enviar nada a Internet y programa pausas 20-20-20.',
    steps: [
      'Pulsa Activar cámara (procesamiento 100% local en un canvas pequeño de tu dispositivo).',
      'Siéntate erguido con hombros relajados y pulsa Calibrar postura correcta.',
      'El monitor avisará suavemente si te hundes (slouch) o te acercas demasiado (Text Neck), sumando minutos erguidos.',
      'Abajo puedes activar el motor de recordatorios cada 20, 30, 45 o 60 minutos con sonido suave o notificación.',
    ],
    tip: 'Si cambias la altura de tu silla o laptop, vuelve a pulsar Calibrar para ajustar tu línea base.',
  },
  plan21: {
    sectionName: 'Evaluación 0-100 y Plan Correctivo 21 Días',
    summary: 'Mide tu estado postural real con tests de fisioterapia y completa 21 micro-misiones progresivas.',
    steps: [
      'Responde los 5 tests rápidos (Test de Pared, Movilidad Torácica, Ergonomía) para calcular tu Puntaje 0-100.',
      'Marca los 5 puntos del checklist ergonómico de tu escritorio.',
      'Completa 1 micro-misión diaria de 3 a 5 minutos durante 21 días para consolidar hábitos posturales duraderos.',
    ],
    tip: 'Elevar la laptop al nivel de los ojos es el cambio con mayor retorno inmediato contra el dolor cervical.',
  },
  registro: {
    sectionName: 'Recuperación, Entreno Externo y Nutrición Práctica',
    summary: 'Registra hidratación, sueño, energía, tu entrenamiento en casa y comidas rápidas altas en proteína.',
    steps: [
      'Actualiza vasos de agua, horas dormidas y energía actual (1-10).',
      'Registra si entrenaste hoy con tu app externa de casa (tipo, intensidad y nota de recuperación).',
      'Marca tu checklist nutricional simple y consulta recetas realistas de 10-15 minutos.',
    ],
    tip: 'Registrar tu entrenamiento externo aquí ayuda a cruzar energía, sueño y recuperación sin duplicar rutinas.',
  },
};

const VIT_DIFF_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Pausas de 1-2 min (ojos, cuello, muñecas) y meta de 6 vasos de agua.',
  intermedio: 'Apertura torácica, alivio lumbar, Plan 21 días y meta de 8 vasos de agua.',
  avanzado: 'Reset postural integral, Monitor Live constante y seguimiento nutricional diario.',
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

interface HeadSample {
  yNorm: number; // 0..1 (lower = higher in frame)
  sizeNorm: number; // relative height/area 0..1
  method: 'FaceDetector' | 'Canvas';
}

export class VitalityView {
  private container: HTMLElement | null = null;
  private stepIdx = 0;
  private remainingSec = 0;
  private timerId = 0;
  private running = false;
  private statusMsg = '';
  private mealFilter: 'all' | QuickProteinMeal['moment'] = 'all';

  // Live Webcam Posture Monitor (100% local)
  private camActive = false;
  private camError = '';
  private camStream: MediaStream | null = null;
  private camLoopId = 0;
  private camCanvas: HTMLCanvasElement | null = null;
  private baseline: { yNorm: number; sizeNorm: number } | null = null;
  private lastSample: HeadSample | null = null;
  private liveStatus: PostureLiveStatus = 'idle';
  private liveReason = 'Activa la cámara local y calibra tu postura erguida.';
  private liveSoundOn = true;
  private lastChimeAt = 0;
  private goodAccumSec = 0;
  private sessionUprightSec = 0;

  // Smart Background Reminder Engine
  private reminderTimerId = 0;
  private nextReminderAt = 0;
  private reminderBanner = '';

  private stopRoutineTimer(): void {
    if (this.timerId) {
      window.clearInterval(this.timerId);
      this.timerId = 0;
    }
    this.running = false;
  }

  private stopCamera(): void {
    if (this.camLoopId) {
      window.clearInterval(this.camLoopId);
      this.camLoopId = 0;
    }
    if (this.camStream) {
      this.camStream.getTracks().forEach((t) => t.stop());
      this.camStream = null;
    }
    this.camActive = false;
    this.liveStatus = 'idle';
    this.lastSample = null;
    if (this.goodAccumSec >= 15) {
      lifeStore.addVitalityUprightMinutes(this.goodAccumSec / 60);
      this.goodAccumSec = 0;
    }
  }

  private stopReminderTimer(): void {
    if (this.reminderTimerId) {
      window.clearInterval(this.reminderTimerId);
      this.reminderTimerId = 0;
    }
    this.nextReminderAt = 0;
  }

  public unmount(): void {
    this.stopRoutineTimer();
    this.stopCamera();
    this.stopReminderTimer();
    this.container = null;
  }

  private playSoftChime(kind: 'alert' | 'reminder' = 'alert'): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = kind === 'reminder' ? 528 : 396;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
      window.setTimeout(() => void ctx.close().catch(() => {}), 600);
    } catch {
      // Audio unavailable
    }
  }

  private ensureReminderEngine(): void {
    const prog = lifeStore.get().progress.vitality;
    if (prog.reminderIntervalMin <= 0) {
      this.stopReminderTimer();
      return;
    }
    if (!this.reminderTimerId) {
      this.nextReminderAt = Date.now() + prog.reminderIntervalMin * 60 * 1000;
      this.reminderTimerId = window.setInterval(() => {
        const cur = lifeStore.get().progress.vitality;
        if (cur.reminderIntervalMin <= 0) {
          this.stopReminderTimer();
          return;
        }
        const left = this.nextReminderAt - Date.now();
        const cdEl = this.container?.querySelector('#al-vit-rem-countdown');
        if (left > 0) {
          if (cdEl) {
            const mins = Math.floor(left / 60000);
            const secs = Math.floor((left % 60000) / 1000);
            cdEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          }
          return;
        }
        // Trigger reminder
        this.nextReminderAt = Date.now() + cur.reminderIntervalMin * 60 * 1000;
        this.reminderBanner = 'Pausa 20-20-20: mira a 6 metros 20s, suelta hombros y ponte de pie un minuto.';
        if (cur.reminderSound) this.playSoftChime('reminder');
        if (cur.reminderNotify && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('Postura Pro · Pausa 20-20-20', {
              body: 'Descansa tu vista 20 segundos, alinea el cuello y estira la espalda.',
            });
          } catch {
            // Ignore
          }
        }
        if (this.container) this.render(this.container);
      }, 1000);
    }
  }

  private getFilteredRoutines(zone: BodyZoneId | 'all'): PostureProRoutine[] {
    if (zone === 'all') return POSTURE_PRO_ROUTINES;
    const match = POSTURE_PRO_ROUTINES.filter((r) => r.zones.includes(zone));
    return match.length > 0 ? match : POSTURE_PRO_ROUTINES;
  }

  private getActiveRoutine(): PostureProRoutine {
    const prog = lifeStore.get().progress.vitality;
    const pool = this.getFilteredRoutines(prog.selectedZone);
    return pool.find((r) => r.id === prog.selectedRoutineId) ?? pool[0];
  }

  public render(container: HTMLElement): void {
    this.container = container;
    this.ensureReminderEngine();
    const prog = lifeStore.get().progress.vitality;
    const diff = lifeStore.getDifficulty('vitality');
    const summary = lifeStore.getOverallMasterySummary();
    const tab = prog.activeTab;
    const routine = this.getActiveRoutine();
    const scoreEval = evaluatePostureScore(prog.assessmentAnswers, prog.postureChecks, POSTURE_CHECKLIST.length);

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
              <h1>Postura Pro, Ergonomía y Energía</h1>
              <p>Mapa corporal interactivo con pausas animadas, monitor postural local por webcam, Plan Correctivo 21 días y nutrición práctica.</p>
            </div>
          </div>
          <div class="al-mono-pill">Puntaje: ${scoreEval.score}/100 · Plan ${prog.plan21DoneDays.length}/21 · ${prog.completedRoutines} pausas</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'vitality',
          progressLabel: `Dominio Postura Pro (${prog.completedRoutines} pausas · ${prog.plan21DoneDays.length}/21 días correctivos)`,
          progressPct: summary.byModule.vitality,
          progressDetail: `Minutos erguidos en monitor: ${Math.round(prog.uprightMinutes)} min · Puntaje postural: ${scoreEval.score}/100`,
          difficultyHints: VIT_DIFF_HINTS,
          extraMetric: `Nivel ${difficultyLabel(diff)}`,
        })}

        ${
          this.reminderBanner
            ? `<div class="al-panel al-vault-feedback">
                <span>${Icons.bell(15)} <strong>Recordatorio activo:</strong> ${esc(this.reminderBanner)}</span>
                <button type="button" class="al-btn al-btn-sm" id="al-vit-dismiss-rem">Entendido</button>
              </div>`
            : ''
        }

        <div class="al-toolbar">
          <div class="al-seg-tabs" role="tablist">
            <button type="button" class="al-seg-btn ${tab === 'pausas' ? 'is-active' : ''}" data-vtab="pausas">Mapa Corporal y Pausas</button>
            <button type="button" class="al-seg-btn ${tab === 'monitor' ? 'is-active' : ''}" data-vtab="monitor">Monitor Live y Alertas</button>
            <button type="button" class="al-seg-btn ${tab === 'plan21' ? 'is-active' : ''}" data-vtab="plan21">Plan 21 Días y Test (${prog.plan21DoneDays.length}/21)</button>
            <button type="button" class="al-seg-btn ${tab === 'registro' ? 'is-active' : ''}" data-vtab="registro">Recuperación y Nutrición</button>
          </div>
        </div>

        ${renderTutorialBanner({
          id: `vitality:${tab}`,
          moduleName: 'Postura Pro',
          ...VIT_TUTORIALS[tab],
        })}

        ${
          tab === 'pausas'
            ? this.renderBodyMapAndRoutinesHtml(routine)
            : tab === 'monitor'
              ? this.renderMonitorTabHtml()
              : tab === 'plan21'
                ? this.renderPlan21TabHtml(scoreEval)
                : this.renderRecoveryNutritionTabHtml(diff)
        }

        ${renderYoutubeJumpCard('vitality')}
      </div>
    `;

    this.bindEvents(container, routine);
    if (tab === 'monitor' && this.camActive && this.camStream) {
      const vid = container.querySelector<HTMLVideoElement>('#al-posture-video');
      if (vid && vid.srcObject !== this.camStream) {
        vid.srcObject = this.camStream;
        void vid.play().catch(() => {});
      }
    }
    bindDidacticBar(container, 'vitality', () => this.render(container));
    bindTutorialBanners(container);
  }

  private renderBodyMapSvg(selectedZone: BodyZoneId | 'all'): string {
    return `
      <svg class="al-bodymap-svg" viewBox="0 0 340 270" role="img" aria-label="Mapa corporal interactivo frente y espalda">
        <!-- Frente -->
        <text x="90" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink-muted)">VISTA FRONTAL</text>
        <g stroke="var(--border-strong)" stroke-width="2.5" fill="var(--bg-soft)" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="90" cy="40" r="16"/>
          <path d="M84 56 L96 56 L100 68 L128 80 L138 148 L126 150 L118 98 L114 166 L112 246 L96 246 L93 182 L87 182 L84 246 L68 246 L66 166 L62 98 L54 150 L42 148 L52 80 L80 68 Z"/>
        </g>

        <!-- Espalda -->
        <text x="250" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink-muted)">VISTA POSTERIOR</text>
        <g stroke="var(--border-strong)" stroke-width="2.5" fill="var(--bg-soft)" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="250" cy="40" r="16"/>
          <path d="M244 56 L256 56 L260 68 L288 80 L298 148 L286 150 L278 98 L274 166 L272 246 L256 246 L253 182 L247 182 L244 246 L228 246 L226 166 L222 98 L214 150 L202 148 L212 80 L240 68 Z"/>
          <line x1="250" y1="64" x2="250" y2="162" stroke="var(--border-strong)" stroke-width="2" stroke-dasharray="4 4"/>
        </g>

        <!-- Hotspots -->
        ${BODY_ZONES.map((z) => {
          const active = selectedZone === z.id;
          return `
            <g class="al-body-hotspot ${active ? 'is-active' : ''}" data-bzone="${z.id}" tabindex="0" role="button" aria-label="Filtrar zona ${esc(z.label)}">
              <circle cx="${z.svgX}" cy="${z.svgY}" r="${active ? '14' : '11'}" class="al-hotspot-halo"/>
              <circle cx="${z.svgX}" cy="${z.svgY}" r="${active ? '7.5' : '6'}" class="al-hotspot-dot"/>
              <title>${esc(z.label)}: ${esc(z.symptom)}</title>
            </g>`;
        }).join('')}
      </svg>
    `;
  }

  private renderBodyMapAndRoutinesHtml(routine: PostureProRoutine): string {
    const prog = lifeStore.get().progress.vitality;
    const pool = this.getFilteredRoutines(prog.selectedZone);
    const activeZone = prog.selectedZone === 'all' ? null : BODY_ZONES.find((z) => z.id === prog.selectedZone) ?? null;
    const totalSec = routine.steps.reduce((a, s) => a + s.durationSec, 0);
    const curStep = routine.steps[this.stepIdx];
    const stepPct = Math.round(((this.stepIdx + 1) / routine.steps.length) * 100);
    const doneCount = prog.routineHistory[routine.id] ?? 0;

    return `
      <div class="al-two-col">
        <section class="al-panel">
          <div class="al-card-head">
            <div>
              <h2>Mapa Corporal Interactivo</h2>
              <p class="al-muted" style="margin:2px 0 0">Toca la zona con tensión para ver su rutina de alivio.</p>
            </div>
            <button type="button" class="al-btn al-btn-sm ${prog.selectedZone === 'all' ? 'al-btn-primary' : ''}" data-bzone-btn="all">Todas las zonas</button>
          </div>

          <div class="al-bodymap-wrap">
            ${this.renderBodyMapSvg(prog.selectedZone)}
          </div>

          <div class="al-step-bar">
            ${BODY_ZONES.map(
              (z) =>
                `<button type="button" class="al-step-pill ${prog.selectedZone === z.id ? 'is-active' : ''}" data-bzone-btn="${z.id}">${esc(z.shortLabel)}</button>`
            ).join('')}
          </div>

          ${
            activeZone
              ? `
            <div class="al-study-card is-done" style="margin-top:12px">
              <strong>${esc(activeZone.label)}</strong>
              <p class="al-muted" style="margin:0;font-size:0.84rem"><strong>Señal común:</strong> ${esc(activeZone.symptom)}</p>
              <p style="margin:0;font-size:0.86rem"><strong>Clave inmediata:</strong> ${esc(activeZone.quickTip)}</p>
            </div>`
              : ''
          }
        </section>

        <section class="al-panel">
          <h2>Rutinas recomendadas (${pool.length})</h2>
          <div class="al-step-bar" aria-label="Rutinas filtradas">
            ${pool
              .map((r) => {
                const count = prog.routineHistory[r.id] ?? 0;
                const cls = r.id === routine.id ? 'is-active' : count > 0 ? 'is-done' : '';
                return `<button type="button" class="al-step-pill ${cls}" data-vr-pick="${r.id}">${esc(r.title)} · ${difficultyLabel(r.difficulty)}${count > 0 ? ` (${count}x)` : ''}</button>`;
              })
              .join('')}
          </div>

          <div class="al-study-card" style="margin-top:12px">
            <div class="al-didactic-prog-head">
              <strong>${esc(routine.title)} (${Math.round((totalSec / 60) * 10) / 10} min)</strong>
              <span class="al-mastery-badge">${doneCount > 0 ? `Hecha ${doneCount}x` : difficultyLabel(routine.difficulty)}</span>
            </div>
            <p class="al-muted" style="margin:0;font-size:0.85rem">${esc(routine.summary)}</p>
          </div>

          <div class="al-study-card is-done" style="margin-top:12px">
            <div class="al-didactic-prog-head">
              <strong>Paso ${this.stepIdx + 1}/${routine.steps.length}: ${esc(curStep.title)}</strong>
              <span class="al-mono-pill" id="al-vit-countdown">${this.remainingSec}s</span>
            </div>
            <progress class="al-didactic-meter" value="${stepPct}" max="100"></progress>

            <div class="al-pose-stage">
              ${renderPosturePoseSvg(curStep.anim)}
              <div class="al-pose-copy">
                <p style="margin:0 0 8px;font-size:0.95rem">${esc(curStep.instruction)}</p>
                <div class="al-breath-cue">${Icons.wind(14)}<span>${esc(curStep.breathCue)}</span></div>
              </div>
            </div>

            ${this.statusMsg ? `<p class="al-muted" style="margin:4px 0;font-weight:600;color:var(--accent-primary)">${esc(this.statusMsg)}</p>` : ''}

            <div class="al-tool-group" style="margin-top:6px">
              <button type="button" class="al-btn al-btn-primary" id="al-vit-toggle">${this.running ? Icons.pause(14) : Icons.play(14)}<span>${this.running ? 'Pausar' : 'Iniciar paso'}</span></button>
              <button type="button" class="al-btn" id="al-vit-next-step">${this.stepIdx + 1 < routine.steps.length ? 'Siguiente paso' : 'Terminar y guardar'}</button>
              <button type="button" class="al-btn" id="al-vit-complete-now">${Icons.check(15)}<span>Marcar hecha</span></button>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  private renderMonitorTabHtml(): string {
    const prog = lifeStore.get().progress.vitality;
    const statusLabel =
      this.liveStatus === 'good'
        ? 'Postura erguida (Óptima)'
        : this.liveStatus === 'warn'
          ? 'Aviso leve · Reajusta cabeza/hombros'
          : this.liveStatus === 'bad'
            ? 'Alerta postural · Te encorvaste o acercaste'
            : this.liveStatus === 'ready'
              ? 'Cámara lista · Falta calibrar'
              : 'Monitor apagado';
    const statusCls =
      this.liveStatus === 'good'
        ? 'is-good'
        : this.liveStatus === 'warn'
          ? 'is-warn'
          : this.liveStatus === 'bad'
            ? 'is-bad'
            : '';
    const remRemaining =
      this.nextReminderAt > Date.now()
        ? (() => {
            const left = this.nextReminderAt - Date.now();
            return `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
          })()
        : '--:--';
    const notifPerm = typeof Notification !== 'undefined' ? Notification.permission : 'denied';

    return `
      <div class="al-two-col">
        <section class="al-panel">
          <div class="al-card-head">
            <div>
              <h2>Monitor Postural Live (Webcam Local)</h2>
              <p class="al-muted" style="margin:2px 0 0">Detecta encorvamiento y Text Neck en vivo sin depender de apps externas.</p>
            </div>
            <span class="al-mastery-badge">${Icons.shield(12)} 100% local · Sin subida</span>
          </div>

          <div class="al-posture-cam-box">
            <video id="al-posture-video" class="al-posture-video ${this.camActive ? '' : 'is-hidden'}" autoplay playsinline muted></video>
            ${
              !this.camActive
                ? `<div class="al-posture-cam-placeholder">
                    ${Icons.camera(30)}
                    <strong>Cámara apagada</strong>
                    <span class="al-muted">El video se analiza solo en tu navegador (canvas 96×72) y se apaga al salir de este módulo.</span>
                  </div>`
                : ''
            }
          </div>

          <div class="al-posture-status-banner ${statusCls}" id="al-posture-live-banner">
            <strong>${esc(statusLabel)}</strong>
            <span id="al-posture-live-reason">${esc(this.liveReason)}</span>
          </div>

          ${this.camError ? `<p class="al-muted" style="color:var(--accent-danger);margin:6px 0 0">${esc(this.camError)}</p>` : ''}

          <div class="al-tool-group" style="margin-top:10px">
            <button type="button" class="al-btn ${this.camActive ? 'al-btn-danger' : 'al-btn-primary'}" id="al-cam-toggle">
              ${Icons.camera(15)}<span>${this.camActive ? 'Detener cámara' : 'Activar cámara'}</span>
            </button>
            <button type="button" class="al-btn al-btn-primary" id="al-cam-calibrate" ${this.camActive ? '' : 'disabled'}>
              ${Icons.target(15)}<span>Calibrar postura correcta</span>
            </button>
            <label class="al-inline-check">
              <input type="checkbox" id="al-cam-sound" ${this.liveSoundOn ? 'checked' : ''} />
              <span>Aviso sonoro suave</span>
            </label>
          </div>

          <div class="al-step-bar" style="margin-top:10px">
            <span class="al-mono-pill">Erguido esta sesión: <strong id="al-cam-session-min">${Math.floor(this.sessionUprightSec / 60)}m ${this.sessionUprightSec % 60}s</strong></span>
            <span class="al-mono-pill">Total acumulado: <strong>${Math.round(prog.uprightMinutes)} min</strong></span>
            ${this.lastSample ? `<span class="al-mono-pill">Motor: ${this.lastSample.method}</span>` : ''}
          </div>
        </section>

        <section class="al-panel">
          <div class="al-card-head">
            <div>
              <h2>Motor Inteligente de Recordatorios</h2>
              <p class="al-muted" style="margin:2px 0 0">Programa pausas automáticas 20-20-20 y alertas para ponerte de pie mientras estudias.</p>
            </div>
            <span class="al-mono-pill" id="al-vit-rem-countdown">${prog.reminderIntervalMin > 0 ? remRemaining : 'Inactivo'}</span>
          </div>

          <div style="margin-top:12px">
            <span class="al-muted" style="font-size:0.84rem;display:block;margin-bottom:6px">Frecuencia de alerta postural y visual:</span>
            <div class="al-seg-tabs" role="group" aria-label="Intervalo de recordatorio">
              ${([0, 20, 30, 45, 60] as const)
                .map(
                  (m) =>
                    `<button type="button" class="al-seg-btn ${prog.reminderIntervalMin === m ? 'is-active' : ''}" data-rem-min="${m}">${m === 0 ? 'Apagado' : `Cada ${m} min`}</button>`
                )
                .join('')}
            </div>
          </div>

          <div class="al-study-card" style="margin-top:12px">
            <label class="al-inline-check" style="cursor:pointer">
              <input type="checkbox" id="al-rem-sound" ${prog.reminderSound ? 'checked' : ''} />
              <span>Sonido suave (Web Audio chime) al cumplirse el intervalo</span>
            </label>
            <label class="al-inline-check" style="cursor:pointer">
              <input type="checkbox" id="al-rem-notify" ${prog.reminderNotify ? 'checked' : ''} />
              <span>Notificación del navegador (${notifPerm === 'granted' ? 'Permiso activo' : notifPerm === 'denied' ? 'Bloqueado en navegador' : 'Pedirá permiso'})</span>
            </label>
            <div class="al-tool-group" style="margin-top:6px">
              <button type="button" class="al-btn al-btn-sm" id="al-rem-test">${Icons.bell(14)}<span>Probar alerta ahora</span></button>
            </div>
          </div>

          <div class="al-study-card" style="margin-top:12px">
            <strong>Cómo funciona mejor que una app móvil aislada</strong>
            <ul class="al-muted" style="margin:0;padding-left:18px;font-size:0.84rem">
              <li>Calibración personal a tu propia altura de silla y cámara (sin falsos positivos por altura).</li>
              <li>Detecta tanto caída vertical (slouch) como acercamiento excesivo a la pantalla (Text Neck).</li>
              <li>Cero envío de imágenes: tu cámara nunca sale de tu equipo.</li>
            </ul>
          </div>
        </section>
      </div>
    `;
  }

  private renderPlan21TabHtml(scoreEval: ReturnType<typeof evaluatePostureScore>): string {
    const prog = lifeStore.get().progress.vitality;
    const planPct = Math.round((prog.plan21DoneDays.length / 21) * 100);

    return `
      <section class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Autoevaluación Postural (0–100)</h2>
            <p class="al-muted" style="margin:2px 0 0">Responde estos 5 tests guiados basados en ergonomía y fisioterapia.</p>
          </div>
          <div class="al-level-orb" style="width:auto;padding:0 14px" aria-label="Puntaje postural ${scoreEval.score} de 100">
            <small>${esc(scoreEval.level)}</small>
            <span>${scoreEval.score}/100</span>
          </div>
        </div>

        <div class="al-study-card is-done" style="margin-top:10px">
          <strong>Diagnóstico actual:</strong>
          <p style="margin:0;font-size:0.9rem">${esc(scoreEval.diagnosis)}</p>
        </div>

        <div class="al-study-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-top:12px">
          ${POSTURE_ASSESSMENT_TESTS.map((t) => {
            const curScore = prog.assessmentAnswers[t.id];
            return `
              <article class="al-study-card ${curScore !== undefined ? 'is-done' : ''}">
                <strong>${esc(t.testName)}</strong>
                <p class="al-muted" style="margin:0;font-size:0.82rem">${esc(t.instruction)}</p>
                <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px">
                  ${t.options
                    .map(
                      (o) => `
                    <button type="button" class="al-btn al-btn-sm ${curScore === o.score ? 'al-btn-primary' : ''}" data-pa-ans="${t.id}:${o.score}" style="text-align:left;white-space:normal;height:auto;justify-content:flex-start">
                      ${esc(o.label)}
                    </button>`
                    )
                    .join('')}
                </div>
              </article>`;
          }).join('')}
        </div>

        <h3 style="margin:16px 0 8px">Checklist ergonómico de escritorio</h3>
        <div class="al-study-grid">
          ${POSTURE_CHECKLIST.map((item) => {
            const on = Boolean(prog.postureChecks[item.id]);
            return `
              <button type="button" class="al-study-card ${on ? 'is-done' : ''}" data-vposture="${item.id}" style="text-align:left">
                <div class="al-didactic-prog-head">
                  <span style="font-size:0.86rem">${esc(item.label)}</span>
                  <span class="al-mastery-badge">${on ? 'Listo' : 'Revisar'}</span>
                </div>
              </button>`;
          }).join('')}
        </div>
      </section>

      <section class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Plan Correctivo Progresivo de 21 Días (${prog.plan21DoneDays.length}/21)</h2>
            <p class="al-muted" style="margin:2px 0 0">Micro-misiones de 3 a 5 min diseñadas para desprogramar cuello adelantado y rigidez lumbar.</p>
          </div>
          <span class="al-mono-pill">${planPct}% completado</span>
        </div>
        <progress class="al-didactic-meter" value="${planPct}" max="100" style="margin:10px 0 14px"></progress>

        ${([1, 2, 3] as const)
          .map((wk) => {
            const wkTitle =
              wk === 1
                ? 'Semana 1: Conciencia, Cuello y Vista'
                : wk === 2
                  ? 'Semana 2: Apertura Torácica, Lumbar y Caderas'
                  : 'Semana 3: Resistencia Postural y Hábito Automático';
            const days = PLAN_21_DAYS.filter((d) => d.week === wk);
            return `
              <h3 style="margin:12px 0 8px">${wkTitle}</h3>
              <div class="al-study-grid">
                ${days
                  .map((d) => {
                    const done = prog.plan21DoneDays.includes(d.day);
                    return `
                      <button type="button" class="al-study-card ${done ? 'is-done' : ''}" data-plan21-day="${d.day}" style="text-align:left">
                        <div class="al-didactic-prog-head">
                          <strong>Día ${d.day} · ${esc(d.focus)}</strong>
                          <span class="al-mastery-badge">${done ? 'Hecho' : esc(d.durationLabel)}</span>
                        </div>
                        <span class="al-muted" style="font-size:0.82rem">${esc(d.mission)}</span>
                      </button>`;
                  })
                  .join('')}
              </div>`;
          })
          .join('')}
      </section>
    `;
  }

  private renderRecoveryNutritionTabHtml(diff: DifficultyLevel): string {
    const prog = lifeStore.get().progress.vitality;
    const today = todayKey();
    const cur: VitalityDayLog = prog.dayLogs.find((d) => d.day === today) ?? {
      day: today,
      waterCups: 0,
      sleepHours: 7,
      energyLevel: 7,
      breaksDone: 0,
      workoutType: 'none',
      workoutIntensity: 'media',
      sorenessNote: '',
    };
    const waterGoal = diff === 'basico' ? 6 : 8;
    const waterPct = Math.min(100, Math.round((cur.waterCups / waterGoal) * 100));
    const nutToday = prog.nutritionChecksByDay[today] ?? {};
    const nutDone = NUTRITION_DAILY_CHECKLIST.filter((c) => nutToday[c.id]).length;
    const meals =
      this.mealFilter === 'all'
        ? QUICK_PROTEIN_MEALS
        : QUICK_PROTEIN_MEALS.filter((m) => m.moment === this.mealFilter);

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
            <span class="al-muted" style="font-size:0.8rem">${cur.sleepHours >= 7 ? 'Descanso óptimo para memoria y foco.' : 'Con menos de 7h prioriza pausas cortas hoy.'}</span>
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

      <div class="al-two-col">
        <section class="al-panel">
          <div class="al-card-head">
            <div>
              <h2>Check-in de Entrenamiento en Casa (App externa)</h2>
              <p class="al-muted" style="margin:2px 0 0">Complementa tu app de ejercicios sin duplicar rutinas y cruza tu recuperación con energía y sueño.</p>
            </div>
          </div>

          <div style="margin-top:10px">
            <span class="al-muted" style="font-size:0.82rem;display:block;margin-bottom:6px">¿Entrenaste hoy en casa?</span>
            <div class="al-seg-tabs">
              ${(
                [
                  ['none', 'Sin entreno'],
                  ['fuerza', 'Fuerza'],
                  ['cardio', 'Cardio'],
                  ['movilidad', 'Movilidad'],
                ] as const
              )
                .map(
                  ([k, lbl]) =>
                    `<button type="button" class="al-seg-btn ${(cur.workoutType ?? 'none') === k ? 'is-active' : ''}" data-wk-type="${k}">${lbl}</button>`
                )
                .join('')}
            </div>
          </div>

          <div style="margin-top:10px">
            <span class="al-muted" style="font-size:0.82rem;display:block;margin-bottom:6px">Intensidad percibida</span>
            <div class="al-seg-tabs">
              ${(
                [
                  ['suave', 'Suave'],
                  ['media', 'Media'],
                  ['alta', 'Alta'],
                ] as const
              )
                .map(
                  ([k, lbl]) =>
                    `<button type="button" class="al-seg-btn ${(cur.workoutIntensity ?? 'media') === k ? 'is-active' : ''}" data-wk-int="${k}">${lbl}</button>`
                )
                .join('')}
            </div>
          </div>

          <label style="display:block;margin-top:10px">
            <span class="al-muted" style="font-size:0.82rem">Nota de fatiga muscular o recuperación:</span>
            <div class="al-vault-note-form" style="margin-top:4px">
              <input type="text" id="al-wk-note" class="al-vault-note-input" value="${esc(cur.sorenessNote ?? '')}" placeholder="Ej. Hombros cargados, piernas bien, descansar temprano..." />
              <button type="button" class="al-btn al-btn-sm al-btn-primary" id="al-wk-save-note">Guardar</button>
            </div>
          </label>
        </section>

        <section class="al-panel">
          <div class="al-card-head">
            <div>
              <h2>Nutrición Práctica de Hoy (${nutDone}/${NUTRITION_DAILY_CHECKLIST.length})</h2>
              <p class="al-muted" style="margin:2px 0 0">Cuatro hábitos simples sin contar calorías obsesivamente.</p>
            </div>
          </div>
          <div class="al-study-grid" style="grid-template-columns:1fr;margin-top:10px">
            ${NUTRITION_DAILY_CHECKLIST.map((item) => {
              const on = Boolean(nutToday[item.id]);
              return `
                <button type="button" class="al-study-card ${on ? 'is-done' : ''}" data-nut-chk="${item.id}" style="text-align:left">
                  <div class="al-didactic-prog-head">
                    <strong>${esc(item.label)}</strong>
                    <span class="al-mastery-badge">${on ? 'Cumplido' : 'Pendiente'}</span>
                  </div>
                  <span class="al-muted" style="font-size:0.8rem">${esc(item.tip)}</span>
                </button>`;
            }).join('')}
          </div>
        </section>
      </div>

      <section class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Recetario Express Alto en Proteína (10–15 min · Ingredientes locales)</h2>
            <p class="al-muted" style="margin:2px 0 0">Opciones realistas con huevos, pollo, atún, quinua, lentejas, avena y yogur griego.</p>
          </div>
          <div class="al-seg-tabs">
            ${(['all', 'Desayuno', 'Almuerzo', 'Cena / Snack'] as const)
              .map(
                (f) =>
                  `<button type="button" class="al-seg-btn ${this.mealFilter === f ? 'is-active' : ''}" data-meal-f="${f}">${f === 'all' ? `Todas (${QUICK_PROTEIN_MEALS.length})` : f}</button>`
              )
              .join('')}
          </div>
        </div>
        <div class="al-study-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-top:12px">
          ${meals
            .map(
              (m) => `
            <article class="al-study-card">
              <div class="al-didactic-prog-head">
                <span class="al-mono-pill">${esc(m.moment)} · ${m.prepMin} min</span>
                <span class="al-mastery-badge">${esc(m.proteinApprox)}</span>
              </div>
              <strong>${esc(m.title)}</strong>
              <p class="al-muted" style="margin:0;font-size:0.82rem"><strong>Ingredientes:</strong> ${esc(m.ingredients)}</p>
              <p style="margin:2px 0 0;font-size:0.83rem">${esc(m.steps)}</p>
            </article>`
            )
            .join('')}
        </div>
      </section>

      ${
        prog.dayLogs.length > 0
          ? `
        <section class="al-panel">
          <h2>Historial físico reciente (${prog.dayLogs.length} días)</h2>
          <div class="al-study-grid">
            ${prog.dayLogs
              .slice(0, 7)
              .map(
                (d) => `
              <div class="al-study-card">
                <strong>${esc(d.day)}</strong>
                <span class="al-muted" style="font-size:0.82rem">Agua: ${d.waterCups} · Sueño: ${d.sleepHours}h · Entreno: ${d.workoutType && d.workoutType !== 'none' ? d.workoutType : '—'}</span>
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

  private async toggleCamera(): Promise<void> {
    if (this.camActive) {
      this.stopCamera();
      if (this.container) this.render(this.container);
      return;
    }
    this.camError = '';
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.camError = 'Este navegador no ofrece acceso a cámara local (usa HTTPS o localhost).';
      if (this.container) this.render(this.container);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: false,
      });
      this.camStream = stream;
      this.camActive = true;
      this.baseline = null;
      this.liveStatus = 'ready';
      this.liveReason = 'Siéntate erguido, mira al frente y pulsa «Calibrar postura correcta».';
      if (!this.camCanvas) {
        this.camCanvas = document.createElement('canvas');
        this.camCanvas.width = 96;
        this.camCanvas.height = 72;
      }
      if (this.container) this.render(this.container);

      this.camLoopId = window.setInterval(() => {
        void this.sampleCameraFrame();
      }, 450);
    } catch {
      this.camError = 'No se pudo abrir la cámara (permiso denegado o cámara en uso por otra app).';
      this.camActive = false;
      if (this.container) this.render(this.container);
    }
  }

  private async detectHeadFromVideo(vid: HTMLVideoElement): Promise<HeadSample | null> {
    if (vid.readyState < 2 || vid.videoWidth === 0 || vid.videoHeight === 0) return null;

    // 1. Native FaceDetector API when available (Chrome/Edge experimental or OS-backed)
    const FD = (window as unknown as { FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect: (src: HTMLVideoElement) => Promise<{ boundingBox: { y: number; height: number } }[]> } }).FaceDetector;
    if (FD) {
      try {
        const detector = new FD({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(vid);
        if (faces && faces.length > 0) {
          const box = faces[0].boundingBox;
          return {
            yNorm: (box.y + box.height * 0.5) / vid.videoHeight,
            sizeNorm: box.height / vid.videoHeight,
            method: 'FaceDetector',
          };
        }
      } catch {
        // Fall through to universal canvas centroid tracker
      }
    }

    // 2. Universal lightweight skin-tone + upper-center luminance centroid tracker (96x72 offscreen)
    if (!this.camCanvas) return null;
    const w = this.camCanvas.width;
    const h = this.camCanvas.height;
    const ctx = this.camCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(vid, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    let sumY = 0;
    let count = 0;
    let minY = h;
    let maxY = 0;
    const xStart = Math.floor(w * 0.18);
    const xEnd = Math.floor(w * 0.82);

    for (let y = 2; y < h - 2; y++) {
      for (let x = xStart; x < xEnd; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Simple YCbCr skin mask robust across lighting
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        if (r > 55 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 175) {
          sumY += y;
          count += 1;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (count < 24) {
      // Fallback: upper-region contrast centroid if lighting is dim
      let lumSumY = 0;
      let lumW = 0;
      for (let y = 4; y < Math.floor(h * 0.78); y++) {
        for (let x = Math.floor(w * 0.25); x < Math.floor(w * 0.75); x++) {
          const idx = (y * w + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (lum > 70) {
            lumSumY += y * lum;
            lumW += lum;
          }
        }
      }
      if (lumW <= 0) return null;
      return { yNorm: lumSumY / lumW / h, sizeNorm: 0.3, method: 'Canvas' };
    }

    const centroidY = sumY / count / h;
    const spanNorm = Math.max(0.12, (maxY - minY) / h);
    return { yNorm: centroidY, sizeNorm: spanNorm, method: 'Canvas' };
  }

  private async sampleCameraFrame(): Promise<void> {
    if (!this.camActive || !this.container) return;
    const vid = this.container.querySelector<HTMLVideoElement>('#al-posture-video');
    if (!vid) return;
    const sample = await this.detectHeadFromVideo(vid);
    if (!sample) return;
    this.lastSample = sample;

    if (!this.baseline) {
      this.liveStatus = 'ready';
      this.liveReason = 'Rostro detectado. Siéntate erguido y pulsa «Calibrar postura correcta».';
      this.updateMonitorDom();
      return;
    }

    const dropDelta = sample.yNorm - this.baseline.yNorm; // positive = head dropped lower
    const sizeRatio = sample.sizeNorm / Math.max(0.08, this.baseline.sizeNorm); // >1 = leaning closer

    let nextStatus: PostureLiveStatus = 'good';
    let nextReason = 'Postura alineada. Mantén hombros sueltos y vista al frente.';

    if (dropDelta > 0.085 || sizeRatio > 1.28) {
      nextStatus = 'bad';
      nextReason =
        sizeRatio > 1.28
          ? 'Text Neck detectado: te acercaste demasiado a la pantalla. Retrocede el mentón.'
          : 'Encorvamiento detectado: tu cabeza cayó respecto a tu línea base. Alarga la columna.';
      if (this.liveSoundOn && Date.now() - this.lastChimeAt > 12000) {
        this.lastChimeAt = Date.now();
        this.playSoftChime('alert');
      }
    } else if (dropDelta > 0.045 || sizeRatio > 1.16) {
      nextStatus = 'warn';
      nextReason = 'Leve inclinación: vuelve a alinear orejas sobre hombros.';
    } else {
      this.sessionUprightSec += 0.45;
      this.goodAccumSec += 0.45;
      if (this.goodAccumSec >= 60) {
        lifeStore.addVitalityUprightMinutes(1);
        this.goodAccumSec -= 60;
      }
    }

    this.liveStatus = nextStatus;
    this.liveReason = nextReason;
    this.updateMonitorDom();
  }

  private updateMonitorDom(): void {
    if (!this.container) return;
    const banner = this.container.querySelector<HTMLElement>('#al-posture-live-banner');
    if (banner) {
      banner.classList.remove('is-good', 'is-warn', 'is-bad');
      if (this.liveStatus === 'good') banner.classList.add('is-good');
      else if (this.liveStatus === 'warn') banner.classList.add('is-warn');
      else if (this.liveStatus === 'bad') banner.classList.add('is-bad');
      const strong = banner.querySelector('strong');
      if (strong) {
        strong.textContent =
          this.liveStatus === 'good'
            ? 'Postura erguida (Óptima)'
            : this.liveStatus === 'warn'
              ? 'Aviso leve · Reajusta cabeza/hombros'
              : this.liveStatus === 'bad'
                ? 'Alerta postural · Te encorvaste o acercaste'
                : 'Cámara lista · Falta calibrar';
      }
      const reason = banner.querySelector('#al-posture-live-reason');
      if (reason) reason.textContent = this.liveReason;
    }
    const minEl = this.container.querySelector('#al-cam-session-min');
    if (minEl) {
      const secs = Math.floor(this.sessionUprightSec);
      minEl.textContent = `${Math.floor(secs / 60)}m ${secs % 60}s`;
    }
  }

  private startStepTimer(routine: PostureProRoutine): void {
    this.stopRoutineTimer();
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
        this.playSoftChime('reminder');
        if (this.container) this.render(this.container);
      } else {
        this.stopRoutineTimer();
        this.stepIdx = 0;
        this.remainingSec = routine.steps[0].durationSec;
        lifeStore.recordVitalityRoutine(routine.id);
        this.playSoftChime('reminder');
        this.statusMsg = `Pausa «${routine.title}» completada y guardada en tu registro diario.`;
        if (this.container) this.render(this.container);
      }
    }, 1000);
    if (this.container) this.render(this.container);
  }

  private bindEvents(container: HTMLElement, routine: PostureProRoutine): void {
    container.querySelector('#al-vit-dismiss-rem')?.addEventListener('click', () => {
      this.reminderBanner = '';
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vtab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stopRoutineTimer();
        const nextTab = btn.dataset.vtab as VitalityTab;
        if (nextTab !== 'monitor' && this.camActive) {
          this.stopCamera();
        }
        lifeStore.updateProgress('vitality', { activeTab: nextTab });
        this.render(container);
      });
    });

    // Body map hotspots & chips
    const selectZone = (z: BodyZoneId | 'all') => {
      this.stopRoutineTimer();
      this.stepIdx = 0;
      this.remainingSec = 0;
      this.statusMsg = '';
      const filtered = this.getFilteredRoutines(z);
      lifeStore.updateProgress('vitality', {
        selectedZone: z,
        selectedRoutineId: filtered[0]?.id ?? 'vr-202020',
      });
      this.render(container);
    };

    container.querySelectorAll<Element>('[data-bzone]').forEach((el) => {
      el.addEventListener('click', () => selectZone(el.getAttribute('data-bzone') as BodyZoneId));
      el.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
          e.preventDefault();
          selectZone(el.getAttribute('data-bzone') as BodyZoneId);
        }
      });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-bzone-btn]').forEach((btn) => {
      btn.addEventListener('click', () => selectZone(btn.dataset.bzoneBtn as BodyZoneId | 'all'));
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vr-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stopRoutineTimer();
        this.stepIdx = 0;
        this.remainingSec = 0;
        this.statusMsg = '';
        lifeStore.updateProgress('vitality', { selectedRoutineId: btn.dataset.vrPick! });
        this.render(container);
      });
    });

    container.querySelector('#al-vit-toggle')?.addEventListener('click', () => {
      if (this.running) {
        this.stopRoutineTimer();
        this.render(container);
      } else {
        this.startStepTimer(routine);
      }
    });

    container.querySelector('#al-vit-next-step')?.addEventListener('click', () => {
      this.stopRoutineTimer();
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
      this.stopRoutineTimer();
      this.stepIdx = 0;
      this.remainingSec = routine.steps[0].durationSec;
      lifeStore.recordVitalityRoutine(routine.id);
      this.statusMsg = `Pausa «${routine.title}» registrada en tu progreso.`;
      this.render(container);
    });

    // Monitor Live events
    container.querySelector('#al-cam-toggle')?.addEventListener('click', () => {
      void this.toggleCamera();
    });
    container.querySelector('#al-cam-calibrate')?.addEventListener('click', async () => {
      const vid = container.querySelector<HTMLVideoElement>('#al-posture-video');
      if (vid && !this.lastSample) {
        this.lastSample = await this.detectHeadFromVideo(vid);
      }
      if (this.lastSample) {
        this.baseline = { yNorm: this.lastSample.yNorm, sizeNorm: this.lastSample.sizeNorm };
        this.liveStatus = 'good';
        this.liveReason = 'Calibración guardada. Monitorizando tu postura en vivo.';
        this.playSoftChime('reminder');
        this.updateMonitorDom();
      } else {
        this.liveReason = 'Espera 1 segundo a que la cámara estabilice la imagen e intenta calibrar de nuevo.';
        this.updateMonitorDom();
      }
    });
    container.querySelector<HTMLInputElement>('#al-cam-sound')?.addEventListener('change', (e) => {
      this.liveSoundOn = (e.target as HTMLInputElement).checked;
    });

    // Reminder engine events
    container.querySelectorAll<HTMLButtonElement>('[data-rem-min]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mins = Number(btn.dataset.remMin) as 0 | 20 | 30 | 45 | 60;
        this.stopReminderTimer();
        lifeStore.updateProgress('vitality', { reminderIntervalMin: mins });
        if (mins > 0) this.ensureReminderEngine();
        this.render(container);
      });
    });
    container.querySelector<HTMLInputElement>('#al-rem-sound')?.addEventListener('change', (e) => {
      lifeStore.updateProgress('vitality', { reminderSound: (e.target as HTMLInputElement).checked });
    });
    container.querySelector<HTMLInputElement>('#al-rem-notify')?.addEventListener('change', async (e) => {
      const want = (e.target as HTMLInputElement).checked;
      if (want && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          // Ignore
        }
      }
      lifeStore.updateProgress('vitality', { reminderNotify: want });
      this.render(container);
    });
    container.querySelector('#al-rem-test')?.addEventListener('click', () => {
      const prog = lifeStore.get().progress.vitality;
      if (prog.reminderSound) this.playSoftChime('reminder');
      this.reminderBanner = 'Alerta de prueba: mira a 6 metros 20s y suelta hombros.';
      this.render(container);
    });

    // Plan 21 & Assessment
    container.querySelectorAll<HTMLButtonElement>('[data-pa-ans]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [testId, scStr] = (btn.dataset.paAns ?? '').split(':');
        if (testId) {
          lifeStore.setVitalityAssessmentAnswer(testId, Number(scStr));
          this.render(container);
        }
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
    container.querySelectorAll<HTMLButtonElement>('[data-plan21-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.toggleVitalityPlan21Day(Number(btn.dataset.plan21Day));
        this.render(container);
      });
    });

    // Day log, external workout & nutrition
    const today = todayKey();
    const curLog = (): VitalityDayLog =>
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
        lifeStore.saveVitalityDayLog({ energyLevel: parseInt(btn.dataset.venergy!, 10) || 7 });
        this.render(container);
      });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-wk-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.saveVitalityDayLog({
          workoutType: btn.dataset.wkType as VitalityDayLog['workoutType'],
        });
        this.render(container);
      });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-wk-int]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.saveVitalityDayLog({
          workoutIntensity: btn.dataset.wkInt as VitalityDayLog['workoutIntensity'],
        });
        this.render(container);
      });
    });
    container.querySelector('#al-wk-save-note')?.addEventListener('click', () => {
      const note = container.querySelector<HTMLInputElement>('#al-wk-note')?.value ?? '';
      lifeStore.saveVitalityDayLog({ sorenessNote: note });
      this.render(container);
    });
    container.querySelectorAll<HTMLButtonElement>('[data-nut-chk]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.toggleVitalityNutritionCheck(btn.dataset.nutChk!);
        this.render(container);
      });
    });
    container.querySelectorAll<HTMLButtonElement>('[data-meal-f]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.mealFilter = btn.dataset.mealF as 'all' | QuickProteinMeal['moment'];
        this.render(container);
      });
    });
  }
}
