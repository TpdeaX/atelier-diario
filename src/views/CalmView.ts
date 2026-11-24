import { voiceStudio } from '../audio/VoiceStudio';
import {
  BREATH_PATTERNS,
  breathStateAt,
  GROUNDING_GROUPS,
  PANIC_TRUTH_CARDS,
  PMR_STEPS,
  REFRAME_EXAMPLES,
  SOS_PATTERN_ORDER,
  SOS_REASSURANCE,
} from '../data/CalmBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import type { CalmPatternId } from '../types';
import { bindDidacticBar, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

type CalmTab = 'sos' | 'reframe' | 'checkin';

const CALM_TUTORIALS: Record<CalmTab, Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  sos: {
    sectionName: 'SOS Pánico Ahora',
    summary: 'Protocolo inmediato paso a paso para bajar la adrenalina sin tener que pensar ni escribir.',
    steps: [
      'Sigue el círculo respiratorio hasta completar la meta de ciclos de tu nivel (3, 4 o 6 ciclos).',
      'Activa Lluvia suave, Pulso 84→60 BPM o Tono cálido para anclar tu atención auditiva; tu preferencia se guarda.',
      'Toca los círculos de Aterrizaje 5-4-3-2-1 para traer tu mente a objetos reales del entorno.',
      'Usa Relajación muscular guiada (PMR) y recorre las Frases de anclaje cuando el pulso empiece a bajar.',
    ],
    tip: 'Puedes abrir esta pantalla directo con la ruta #sos o #calm?sos=1 cuando necesites alivio en un toque.',
  },
  reframe: {
    sectionName: 'Calma y Reencuadre',
    summary: 'Ordena un mal día separando lo que escapa de tus manos de tu próximo micro-paso concreto.',
    steps: [
      'Si sientes pánico físico ahora, entra primero a SOS Pánico Ahora para regular la respiración.',
      'Puedes pulsar cualquier ejemplo guiado TCC para ver cómo estructurar un reencuadre realista.',
      'Escribe en 3 líneas: preocupación, parte bajo tu control y micro-paso de 5 minutos, luego guarda.',
      'Usa el buscador inferior para revisar o depurar tu cuaderno completo de reencuadres.',
    ],
    tip: 'No intentes resolver toda la semana en el paso 3: elige una acción tan pequeña que puedas hacerla hoy.',
  },
  checkin: {
    sectionName: 'Registro Emocional (Antes y Después)',
    summary: 'Mide tu nivel de tensión del 1 al 10 antes y después de aplicar una técnica para comprobar qué te funciona mejor.',
    steps: [
      'Marca cuánta tensión sentías ANTES (1 = muy tranquilo, 10 = máxima saturación).',
      'Selecciona la técnica que aplicaste (respiración, aterrizaje, PMR o reencuadre).',
      'Marca tu nivel DESPUÉS y agrega una nota breve opcional para identificar patrones útiles.',
    ],
    tip: 'Ver en números que tu tensión baja incluso 2 puntos entrena a tu cerebro a confiar en tus herramientas.',
  },
};

type CalmSoundKind = 'rain' | 'pulse' | 'drone';

const SOUND_TOGGLES: { kind: CalmSoundKind; label: string; icon: (s?: number) => string }[] = [
  { kind: 'rain', label: 'Lluvia suave', icon: Icons.droplet },
  { kind: 'pulse', label: 'Pulso 84→60 BPM', icon: Icons.heartPulse },
  { kind: 'drone', label: 'Tono cálido', icon: Icons.tone },
];

const CHECKIN_TECHNIQUES: string[] = [
  'Exhalar largo 3-6',
  'Suspiro fisiológico',
  'Respiración 4-7-8',
  'Caja 4-4-4-4',
  'Coherencia 5.5-5.5',
  'Aterrizaje 5-4-3-2-1',
  'Relajación muscular (PMR)',
  'Reencuadre cognitivo',
  'Pausa consciente sin pantallas',
];

const GROUND_TOTAL = GROUNDING_GROUPS.reduce((a, g) => a + g.count, 0);

function groundFlatIndex(gi: number, itemIdx: number): number {
  let offset = 0;
  for (let i = 0; i < gi; i++) {
    offset += GROUNDING_GROUPS[i].count;
  }
  return offset + itemIdx;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export class CalmView {
  private hydrated = false;
  private container: HTMLElement | null = null;
  private tab: CalmTab = 'reframe';

  // Respiración (basada en reloj, admite fases de 5.5 s)
  private sosPattern: CalmPatternId = 'exhale36';
  private breathingRunning = false;
  private breathStartMs = 0;
  private breathPhaseIdx = -1;
  private breathCycles = 0;
  private breathRecordedThisRun = false;
  private breathTimer = 0;
  private vibrateOn = false;
  private preferredSound: 'off' | CalmSoundKind = 'off';

  // Aterrizaje 5-4-3-2-1 (15 posiciones persistidas)
  private groundFlags: boolean[] = Array.from({ length: GROUND_TOTAL }, () => false);
  private groundRecorded = false;

  // Relajación muscular progresiva
  private pmrRunning = false;
  private pmrStep = 0;
  private pmrPhase: 'tense' | 'release' = 'tense';
  private pmrRemainingMs = PMR_STEPS[0].tenseSec * 1000;
  private pmrLastTickMs = 0;
  private pmrTimer = 0;
  private pmrFinished = false;
  private pmrStarted = false;

  private cardIdx = 0;
  private audioNote = '';

  // Reencuadre búsqueda y borrador (para precargar ejemplos)
  private reframeSearch = '';
  private draftWorry = '';
  private draftControl = '';
  private draftStep = '';

  // Check-in emocional
  private checkinBefore = 7;
  private checkinAfter = 3;
  private checkinTechnique = CHECKIN_TECHNIQUES[0];
  private checkinNote = '';
  private checkinSavedNotice = '';

  private hydrateFromStore(): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.calm;
    const pr = profile.progress.calm;

    if (!this.hydrated) {
      this.hydrated = true;
      this.tab = pr.activeTab || 'reframe';
      const savedPat = prefs.patternId;
      this.sosPattern = savedPat && BREATH_PATTERNS[savedPat] ? savedPat : 'exhale36';
      this.vibrateOn = Boolean(pr.vibrateOn);
      this.preferredSound = pr.ambientSound || 'off';
      this.cardIdx = Math.max(0, pr.cardIdx || 0) % PANIC_TRUTH_CARDS.length;
      const savedStep = Math.max(0, Math.min(PMR_STEPS.length - 1, pr.pmrStep || 0));
      this.pmrStep = savedStep;
      this.pmrRemainingMs = PMR_STEPS[savedStep].tenseSec * 1000;
      this.groundFlags = Array.from({ length: GROUND_TOTAL }, (_, i) => Boolean(pr.groundDone[i]));
      this.groundRecorded = this.groundCount() === GROUND_TOTAL;
    }
  }

  private groundCount(): number {
    return this.groundFlags.filter(Boolean).length;
  }

  private getTargetCycles(): number {
    const diff = lifeStore.getDifficulty('calm');
    return diff === 'basico' ? 3 : diff === 'intermedio' ? 4 : 6;
  }

  public render(container: HTMLElement): void {
    this.container = container;
    this.hydrateFromStore();
    container.innerHTML =
      this.tab === 'sos'
        ? this.renderSos()
        : this.tab === 'checkin'
          ? this.renderCheckin()
          : this.renderReframe();
    bindDidacticBar(container, 'calm', () => this.render(container));
    this.bind(container);
    bindTutorialBanners(container);
    if (this.tab === 'sos') this.syncAllSos();
  }

  /** Abre el modo SOS Pánico Ahora (acceso directo `#calm?sos=1` o `#sos`). */
  public enterSosMode(container?: HTMLElement): void {
    if (container) this.container = container;
    this.hydrateFromStore();
    const wasSos = this.tab === 'sos';
    this.tab = 'sos';
    lifeStore.updateProgress('calm', { activeTab: 'sos' });
    if (!wasSos) {
      // Respeta el patrón guardado en modulePrefs.calm.patternId sin sobreescribirlo
      const savedPat = lifeStore.get().modulePrefs.calm.patternId;
      if (savedPat && BREATH_PATTERNS[savedPat]) {
        this.sosPattern = savedPat;
      }
      this.breathCycles = 0;
      this.breathRecordedThisRun = false;
      this.audioNote = '';
    }
    if (this.container) {
      this.render(this.container);
      if (!this.breathingRunning) this.startBreathing();
    }
  }

  public unmount(): void {
    this.stopBreathing();
    this.stopPmr();
    voiceStudio.stopAllCalmAudio();
    this.container = null;
  }

  // ---------------------------------------------------------------------------
  // Plantillas
  // ---------------------------------------------------------------------------

  private renderHeroAndBar(): string {
    const profile = lifeStore.get();
    const pr = profile.progress.calm;
    const summary = lifeStore.getOverallMasterySummary();
    const targetCycles = this.getTargetCycles();
    const avgDrop = this.computeAverageDrop();

    return `
      <div class="al-module-hero" style="--mod-c1: #0F766E; --mod-c2: #5EEAD4;">
        <div class="al-module-hero-id">
          <div class="al-diamond-emblem is-sm" style="--em-c1: #0F766E; --em-c2: #5EEAD4;">
            <span class="al-diamond-ring"></span>
            <span class="al-diamond-core">${Icons.wind(20)}</span>
          </div>
          <div>
            <h1>Centro de Calma y Regulación</h1>
            <p>Baja el ritmo físico con SOS Pánico, reencuadra pensamientos y registra tu alivio emocional.</p>
          </div>
        </div>
        <div class="al-mono-pill">Sesiones: ${profile.stats.calmSessions} · Reencuadres: ${profile.reframeLog.length} · Registros: ${pr.checkins.length}</div>
      </div>

      ${renderDidacticBar({
        moduleId: 'calm',
        progressLabel: 'Práctica de Regulación y Calma',
        progressPct: summary.byModule.calm,
        progressDetail: `Meta actual: ${targetCycles} ciclos · Patrón activo: ${BREATH_PATTERNS[this.sosPattern].chip}`,
        extraMetric:
          avgDrop !== null
            ? `Alivio promedio: ${avgDrop >= 0 ? `-${avgDrop.toFixed(1)}` : `+${Math.abs(avgDrop).toFixed(1)}`} pts`
            : `${pr.checkins.length} registros emocionales`,
        difficultyHints: {
          basico: 'Sesiones suaves de 3 ciclos respiratorios y guías paso a paso.',
          intermedio: '4 ciclos respiratorios, aterrizaje 5-4-3-2-1 y PMR guiado.',
          avanzado: 'Protocolo profundo de 6 ciclos, PMR completo y diario emocional.',
        },
      })}
    `;
  }

  private renderTabs(): string {
    const checkinsCount = lifeStore.get().progress.calm.checkins.length;
    const reframeCount = lifeStore.get().reframeLog.length;
    return `
      <div class="al-seg-tabs al-calm-tabs" role="tablist" aria-label="Secciones de calma">
        <button type="button" role="tab" aria-selected="${this.tab === 'sos'}" class="al-seg-btn al-calm-tab-sos ${this.tab === 'sos' ? 'is-active' : ''}" data-calm-tab="sos">
          ${Icons.heartPulse(16)}<span>SOS Pánico Ahora</span>
        </button>
        <button type="button" role="tab" aria-selected="${this.tab === 'reframe'}" class="al-seg-btn ${this.tab === 'reframe' ? 'is-active' : ''}" data-calm-tab="reframe">
          ${Icons.wind(16)}<span>Calma y Reencuadre (${reframeCount})</span>
        </button>
        <button type="button" role="tab" aria-selected="${this.tab === 'checkin'}" class="al-seg-btn ${this.tab === 'checkin' ? 'is-active' : ''}" data-calm-tab="checkin">
          ${Icons.sliders(16)}<span>Registro emocional (${checkinsCount})</span>
        </button>
      </div>`;
  }

  private renderSos(): string {
    const pat = BREATH_PATTERNS[this.sosPattern];
    const targetCycles = this.getTargetCycles();
    const gCount = this.groundCount();
    return `
      <div class="al-page al-calm-page al-calm-sos">
        ${this.renderHeroAndBar()}
        ${this.renderTabs()}
        ${renderTutorialBanner({
          id: 'calm:sos',
          moduleName: 'Centro de Calma',
          ...CALM_TUTORIALS.sos,
        })}
        <div class="al-sos-stage">
          <p class="al-sos-banner" role="status">${SOS_REASSURANCE}</p>

          <section class="al-sos-breath" aria-label="Respiración guiada">
            <div class="al-sos-patterns" role="group" aria-label="Elegir ritmo de respiración">
              ${SOS_PATTERN_ORDER.map(
                (id) => `
                <button type="button" class="al-sos-chip" data-sos-pattern="${id}" aria-pressed="${id === this.sosPattern}">${BREATH_PATTERNS[id].chip}</button>`
              ).join('')}
            </div>
            <div class="al-sos-orb-wrap">
              <div class="al-sos-orb" id="al-sos-orb"><span id="al-sos-sec">${pat.phases[0].sec}</span></div>
            </div>
            <div class="al-sos-phase" id="al-sos-phase" aria-live="polite">Prepárate</div>
            <p class="al-sos-rhythm" id="al-sos-rhythm">${pat.rhythm}. ${pat.desc}</p>
            <div class="al-tool-group al-sos-actions">
              <button type="button" class="al-btn al-btn-calm al-btn-lg" id="al-sos-breath-toggle">
                ${Icons.pause(16)}<span>Pausar respiración</span>
              </button>
              ${
                typeof navigator !== 'undefined' && 'vibrate' in navigator
                  ? `<button type="button" class="al-btn" id="al-sos-vibrate" aria-pressed="${this.vibrateOn}">${Icons.phone(16)}<span>Vibración suave: ${this.vibrateOn ? 'Sí' : 'No'}</span></button>`
                  : ''
              }
              <span class="al-mono-pill">Ciclos: <strong id="al-sos-cycles">${this.breathCycles}</strong> / ${targetCycles}</span>
            </div>
          </section>

          <section class="al-sos-block" aria-label="Sonido calmante">
            <div class="al-sos-block-head">
              <h2>Sonido que ayuda</h2>
              ${
                this.preferredSound !== 'off'
                  ? `<span class="al-mono-pill">Preferido guardado: ${SOUND_TOGGLES.find((s) => s.kind === this.preferredSound)?.label ?? ''}</span>`
                  : ''
              }
            </div>
            <div class="al-sos-sounds">
              ${SOUND_TOGGLES.map(
                (s) => `
                <button type="button" class="al-sos-sound" data-sos-sound="${s.kind}" aria-pressed="${voiceStudio.isCalmSoundOn(s.kind)}">
                  ${s.icon(18)}<span>${s.label}</span>
                </button>`
              ).join('')}
            </div>
            <p class="al-muted al-sos-note" id="al-sos-audio-note">${esc(this.audioNote)}</p>
          </section>

          <section class="al-sos-block" aria-label="Aterrizaje 5-4-3-2-1">
            <div class="al-sos-block-head">
              <h2>Aterrizaje 5-4-3-2-1</h2>
              <span class="al-mono-pill"><strong id="al-ground-count">${gCount}</strong>/${GROUND_TOTAL}</span>
            </div>
            <p class="al-muted">Toca un círculo por cada cosa que encuentres. Tu avance se guarda automáticamente.</p>
            <div class="al-ground-grid">
              ${GROUNDING_GROUPS.map(
                (g, gi) => `
                <div class="al-ground-row">
                  <span class="al-ground-label">${g.prompt}</span>
                  <div class="al-ground-dots">
                    ${Array.from({ length: g.count })
                      .map((_, i) => {
                        const flatIdx = groundFlatIndex(gi, i);
                        const done = Boolean(this.groundFlags[flatIdx]);
                        return `<button type="button" class="al-ground-dot ${done ? 'is-done' : ''}" data-ground-idx="${flatIdx}" aria-pressed="${done}" aria-label="${g.prompt}: ${i + 1}">${i + 1}</button>`;
                      })
                      .join('')}
                  </div>
                </div>`
              ).join('')}
            </div>
            <p class="al-ground-done" id="al-ground-done" ${gCount < GROUND_TOTAL ? 'hidden' : ''}>Bien hecho. Estás aquí, ahora. Tu cuerpo ya está más tranquilo.</p>
            <button type="button" class="al-btn" id="al-ground-reset">${Icons.refresh(15)}<span>Reiniciar casillas</span></button>
          </section>

          <section class="al-sos-block al-pmr-box" aria-label="Relajación muscular progresiva">
            <div class="al-sos-block-head">
              <h2>Relajación muscular guiada (PMR)</h2>
              <span class="al-mono-pill" id="al-pmr-progress">Grupo ${Math.min(this.pmrStep + 1, PMR_STEPS.length)}/${PMR_STEPS.length}</span>
            </div>
            <div class="al-pmr-stage" aria-live="polite">
              <strong class="al-pmr-group" id="al-pmr-group">${PMR_STEPS[this.pmrStep].group}</strong>
              <span class="al-pmr-instruction" id="al-pmr-instruction">Pulsa Iniciar y sigue las indicaciones.</span>
              <span class="al-pmr-count" id="al-pmr-count">--</span>
            </div>
            <div class="al-tool-group">
              <button type="button" class="al-btn al-btn-calm" id="al-pmr-toggle">${Icons.play(16)}<span>Iniciar relajación muscular</span></button>
              <button type="button" class="al-btn" id="al-pmr-reset">${Icons.refresh(15)}<span>Reiniciar</span></button>
            </div>
          </section>

          <section class="al-sos-block al-anchor-card" aria-label="Frase de anclaje">
            <span class="al-mono-pill">Anclaje ${(this.cardIdx % PANIC_TRUTH_CARDS.length) + 1}/${PANIC_TRUTH_CARDS.length}</span>
            <p class="al-anchor-text" id="al-anchor-text">${PANIC_TRUTH_CARDS[this.cardIdx % PANIC_TRUTH_CARDS.length]}</p>
            <div class="al-tool-group">
              <button type="button" class="al-btn" id="al-anchor-next">${Icons.arrowDown(15)}<span>Siguiente frase de anclaje</span></button>
              <button type="button" class="al-btn al-btn-primary" data-calm-tab="checkin">${Icons.check(15)}<span>Registrar cómo me siento ahora</span></button>
            </div>
          </section>
        </div>
      </div>`;
  }

  private renderReframe(): string {
    const profile = lifeStore.get();
    const query = this.reframeSearch.trim().toLowerCase();
    const filteredReframes = query
      ? profile.reframeLog.filter(
          (r) =>
            r.worry.toLowerCase().includes(query) ||
            r.control.toLowerCase().includes(query) ||
            r.nextStep.toLowerCase().includes(query)
        )
      : profile.reframeLog;

    return `
      <div class="al-page al-calm-page">
        ${this.renderHeroAndBar()}
        ${this.renderTabs()}

        ${renderTutorialBanner({
          id: 'calm:reframe',
          moduleName: 'Centro de Calma',
          ...CALM_TUTORIALS.reframe,
        })}

        <section class="al-panel al-sos-entry">
          <div>
            <h2>¿Estás en crisis ahora mismo?</h2>
            <p class="al-muted">Abre la pantalla de emergencia: respiración, sonido y aterrizaje sin escribir nada.</p>
          </div>
          <button type="button" class="al-btn al-btn-calm al-btn-lg" data-calm-tab="sos">${Icons.heartPulse(18)}<span>SOS Pánico Ahora</span></button>
        </section>

        <section class="al-panel">
          <div class="al-card-head">
            <div>
              <h2>Ejemplos didácticos de reencuadre (TCC)</h2>
              <p class="al-muted">Pulsa un escenario común para cargar un ejemplo y adaptarlo a tu situación real.</p>
            </div>
          </div>
          <div class="al-study-grid">
            ${REFRAME_EXAMPLES.map(
              (ex) => `
              <div class="al-study-card">
                <strong style="font-size:0.9rem;">${esc(ex.label)}</strong>
                <p class="al-muted" style="margin:0; font-size:0.82rem;">${esc(ex.worry)}</p>
                <button type="button" class="al-btn al-btn-sm" data-reframe-example="${ex.id}" style="margin-top:auto;">
                  ${Icons.edit(13)}<span>Cargar ejemplo</span>
                </button>
              </div>`
            ).join('')}
          </div>
        </section>

        <section class="al-panel">
          <h2>Reencuadre cuando el día va mal</h2>
          <p class="al-muted">Sacar el ruido de la cabeza y escribirlo en 3 líneas concretas reduce la sensación de bloqueo.</p>

          <form class="al-reframe-form" id="al-reframe-form">
            <label>
              <span>1. ¿Qué está pasando o qué te preocupa hoy?</span>
              <textarea id="al-rf-worry" rows="2" placeholder="Ej. Me equivoqué en algo importante / siento que no avanzo...">${esc(this.draftWorry)}</textarea>
            </label>
            <label>
              <span>2. ¿Qué parte SÍ depende de ti ahora mismo?</span>
              <textarea id="al-rf-control" rows="2" placeholder="Ej. Descansar hoy, corregir solo una parte, pedir ayuda o practicar 5 minutos...">${esc(this.draftControl)}</textarea>
            </label>
            <label>
              <span>3. Un paso amable de 5 minutos que harás hoy</span>
              <input type="text" id="al-rf-step" value="${esc(this.draftStep)}" placeholder="Ej. Tomar un vaso de agua y hacer una cosa pequeña sin juzgarme" />
            </label>
            <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar en mi cuaderno privado</span></button>
          </form>

          <div class="al-reframe-history" style="margin-top:16px;">
            <div class="al-card-head" style="margin-bottom:10px;">
              <h3>Tus reencuadres guardados (${filteredReframes.length}${query ? ` de ${profile.reframeLog.length}` : ''})</h3>
              ${
                profile.reframeLog.length > 0
                  ? `<input type="search" id="al-rf-search" value="${esc(this.reframeSearch)}" placeholder="Buscar en tus reencuadres..." style="max-width:260px;" />`
                  : ''
              }
            </div>
            ${
              profile.reframeLog.length === 0
                ? '<p class="al-muted">Aún no escribiste ninguno. Se guardan localmente y se sincronizan en Supabase.</p>'
                : filteredReframes.length === 0
                  ? '<p class="al-muted">No hay reencuadres que coincidan con tu búsqueda.</p>'
                  : filteredReframes
                      .map(
                        (r) => `
                  <div class="al-reframe-item">
                    <div class="al-card-head">
                      <strong>Paso elegido: ${esc(r.nextStep)}</strong>
                      <button type="button" class="al-icon-btn" data-del-reframe="${esc(r.id)}" title="Eliminar reencuadre">${Icons.trash(14)}</button>
                    </div>
                    <p style="margin:4px 0 2px;"><strong>Preocupación:</strong> ${esc(r.worry)}</p>
                    <p style="margin:0 0 4px;"><strong>Lo que controlo:</strong> ${esc(r.control)}</p>
                    <small>${new Date(r.createdAt).toLocaleDateString('es-ES')}</small>
                  </div>`
                      )
                      .join('')
            }
          </div>
        </section>
      </div>`;
  }

  private computeAverageDrop(): number | null {
    const list = lifeStore.get().progress.calm.checkins;
    if (list.length === 0) return null;
    const sum = list.reduce((acc, c) => acc + (c.before - c.after), 0);
    return sum / list.length;
  }

  private renderCheckin(): string {
    const checkins = lifeStore.get().progress.calm.checkins;
    const avgDrop = this.computeAverageDrop();
    const avgBefore =
      checkins.length > 0
        ? (checkins.reduce((a, c) => a + c.before, 0) / checkins.length).toFixed(1)
        : '--';
    const avgAfter =
      checkins.length > 0
        ? (checkins.reduce((a, c) => a + c.after, 0) / checkins.length).toFixed(1)
        : '--';

    const scaleButtons = (kind: 'before' | 'after', current: number) =>
      Array.from({ length: 10 }, (_, idx) => {
        const val = idx + 1;
        return `<button type="button" class="al-scale-btn ${current === val ? 'is-active' : ''}" data-scale-${kind}="${val}" aria-pressed="${current === val}">${val}</button>`;
      }).join('');

    return `
      <div class="al-page al-calm-page">
        ${this.renderHeroAndBar()}
        ${this.renderTabs()}

        ${renderTutorialBanner({
          id: 'calm:checkin',
          moduleName: 'Centro de Calma',
          ...CALM_TUTORIALS.checkin,
        })}

        <div class="al-two-col">
          <section class="al-panel">
            <div class="al-card-head">
              <div>
                <h2>Nuevo registro emocional</h2>
                <p class="al-muted">Evalúa cómo entraste y cómo saliste tras tu práctica de regulación.</p>
              </div>
              <span class="al-mastery-badge">Cambio: ${this.checkinAfter - this.checkinBefore <= 0 ? `${this.checkinAfter - this.checkinBefore}` : `+${this.checkinAfter - this.checkinBefore}`} pts</span>
            </div>

            <form id="al-checkin-form" style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
              <div>
                <span style="font-size:0.86rem; font-weight:600;">1. Tensión ANTES (1 = calma total, 10 = tensión máxima): <strong>${this.checkinBefore}/10</strong></span>
                <div class="al-scale-row" role="group" aria-label="Nivel de tensión antes">
                  ${scaleButtons('before', this.checkinBefore)}
                </div>
              </div>

              <label style="display:flex; flex-direction:column; gap:5px;">
                <span style="font-size:0.86rem; font-weight:600;">2. Técnica aplicada</span>
                <select id="al-checkin-tech">
                  ${CHECKIN_TECHNIQUES.map(
                    (t) => `<option value="${esc(t)}" ${this.checkinTechnique === t ? 'selected' : ''}>${esc(t)}</option>`
                  ).join('')}
                </select>
              </label>

              <div>
                <span style="font-size:0.86rem; font-weight:600;">3. Tensión DESPUÉS (1 = calma total, 10 = tensión máxima): <strong>${this.checkinAfter}/10</strong></span>
                <div class="al-scale-row" role="group" aria-label="Nivel de tensión después">
                  ${scaleButtons('after', this.checkinAfter)}
                </div>
              </div>

              <label style="display:flex; flex-direction:column; gap:5px;">
                <span style="font-size:0.86rem; font-weight:600;">4. Nota breve (opcional)</span>
                <textarea id="al-checkin-note" class="al-inline-note" placeholder="Ej. Soltar la mandíbula y 4 ciclos 3-6 me bajaron las palpitaciones...">${esc(this.checkinNote)}</textarea>
              </label>

              <div class="al-tool-group">
                <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar registro emocional</span></button>
                ${this.checkinSavedNotice ? `<span class="al-muted" style="font-size:0.84rem;">${esc(this.checkinSavedNotice)}</span>` : ''}
              </div>
            </form>
          </section>

          <section class="al-panel">
            <div class="al-card-head">
              <h2>Evolución y alivio promedio</h2>
              <span class="al-mono-pill">${checkins.length} registros</span>
            </div>

            <div class="al-mini-metrics" style="margin:10px 0 14px;">
              <div><span>Antes (prom.)</span><strong>${avgBefore}/10</strong></div>
              <div><span>Después (prom.)</span><strong>${avgAfter}/10</strong></div>
              <div>
                <span>Reducción media</span>
                <strong>${avgDrop !== null ? (avgDrop >= 0 ? `-${avgDrop.toFixed(1)}` : `+${Math.abs(avgDrop).toFixed(1)}`) : '--'}</strong>
              </div>
              <div><span>Sesiones calma</span><strong>${lifeStore.get().stats.calmSessions}</strong></div>
            </div>

            ${
              checkins.length === 0
                ? '<p class="al-muted">Aún no tienes registros emocionales. Guarda tu primer antes y después para medir qué técnica te ayuda más.</p>'
                : `<div class="al-study-grid">
                    ${checkins
                      .slice(0, 12)
                      .map((c) => {
                        const drop = c.before - c.after;
                        const deltaText = drop > 0 ? `-${drop} pts` : drop === 0 ? 'Sin cambio' : `+${Math.abs(drop)} pts`;
                        return `
                          <div class="al-study-card ${drop > 0 ? 'is-done' : ''}">
                            <div class="al-card-head">
                              <strong style="font-size:0.86rem;">${esc(c.technique)}</strong>
                              <span class="al-mastery-badge ${drop <= 0 ? 'is-warn' : ''}">${c.before} → ${c.after} (${deltaText})</span>
                            </div>
                            ${c.note ? `<p class="al-muted" style="margin:2px 0; font-size:0.82rem;">${esc(c.note)}</p>` : ''}
                            <small class="al-muted">${new Date(c.at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</small>
                          </div>`;
                      })
                      .join('')}
                  </div>`
            }
          </section>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------

  private bind(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('[data-calm-tab]').forEach((btn) => {
      btn.addEventListener('click', () => this.setTab(btn.dataset.calmTab as CalmTab));
    });

    container.querySelectorAll<HTMLButtonElement>('[data-sos-pattern]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.sosPattern = btn.dataset.sosPattern as CalmPatternId;
        lifeStore.updateModulePrefs('calm', { patternId: this.sosPattern });
        this.syncPatternChips();
        this.startBreathing();
      });
    });

    container.querySelector('#al-sos-breath-toggle')?.addEventListener('click', () => {
      if (this.breathingRunning) this.stopBreathing();
      else this.startBreathing();
      this.syncBreathButton();
    });

    container.querySelector('#al-sos-vibrate')?.addEventListener('click', () => {
      this.vibrateOn = !this.vibrateOn;
      lifeStore.updateProgress('calm', { vibrateOn: this.vibrateOn });
      const b = container.querySelector<HTMLElement>('#al-sos-vibrate');
      if (b) {
        b.setAttribute('aria-pressed', String(this.vibrateOn));
        const label = b.querySelector('span');
        if (label) label.textContent = `Vibración suave: ${this.vibrateOn ? 'Sí' : 'No'}`;
      }
      if (this.vibrateOn) navigator.vibrate?.(40);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-sos-sound]').forEach((btn) => {
      btn.addEventListener('click', () => this.toggleSound(btn.dataset.sosSound as CalmSoundKind));
    });

    container.querySelectorAll<HTMLButtonElement>('[data-ground-idx]').forEach((btn) => {
      btn.addEventListener('click', () => this.toggleGround(Number(btn.dataset.groundIdx)));
    });
    container.querySelector('#al-ground-reset')?.addEventListener('click', () => {
      this.groundFlags = Array.from({ length: GROUND_TOTAL }, () => false);
      this.groundRecorded = false;
      lifeStore.updateProgress('calm', { groundDone: [...this.groundFlags] });
      this.syncGrounding();
    });

    container.querySelector('#al-pmr-toggle')?.addEventListener('click', () => {
      if (this.pmrRunning) this.pausePmr();
      else this.startPmr();
    });
    container.querySelector('#al-pmr-reset')?.addEventListener('click', () => {
      this.stopPmr();
      this.resetPmr();
      lifeStore.updateProgress('calm', { pmrStep: 0 });
      this.syncPmr();
    });

    container.querySelector('#al-anchor-next')?.addEventListener('click', () => {
      this.cardIdx = (this.cardIdx + 1) % PANIC_TRUTH_CARDS.length;
      lifeStore.updateProgress('calm', { cardIdx: this.cardIdx });
      const el = container.querySelector('#al-anchor-text');
      if (el) el.textContent = PANIC_TRUTH_CARDS[this.cardIdx];
      if (this.container) this.render(this.container);
    });

    // Reframe examples & form & search & delete
    container.querySelectorAll<HTMLButtonElement>('[data-reframe-example]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ex = REFRAME_EXAMPLES.find((x) => x.id === btn.dataset.reframeExample);
        if (!ex) return;
        this.draftWorry = ex.worry;
        this.draftControl = ex.control;
        this.draftStep = ex.nextStep;
        if (this.container) this.render(this.container);
      });
    });

    container.querySelector('#al-rf-worry')?.addEventListener('input', (e) => {
      this.draftWorry = (e.target as HTMLTextAreaElement).value;
    });
    container.querySelector('#al-rf-control')?.addEventListener('input', (e) => {
      this.draftControl = (e.target as HTMLTextAreaElement).value;
    });
    container.querySelector('#al-rf-step')?.addEventListener('input', (e) => {
      this.draftStep = (e.target as HTMLInputElement).value;
    });

    container.querySelector('#al-reframe-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const worry = container.querySelector<HTMLTextAreaElement>('#al-rf-worry')!.value.trim();
      const control = container.querySelector<HTMLTextAreaElement>('#al-rf-control')!.value.trim();
      const step = container.querySelector<HTMLInputElement>('#al-rf-step')!.value.trim();
      if (!worry && !control && !step) return;
      lifeStore.addReframe(
        worry || 'Día difícil',
        control || 'Cuidar mi paso de hoy',
        step || 'Respirar 2 minutos y descansar'
      );
      this.draftWorry = '';
      this.draftControl = '';
      this.draftStep = '';
      if (this.container) this.render(this.container);
    });

    container.querySelector('#al-rf-search')?.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      const pos = input.selectionStart ?? input.value.length;
      this.reframeSearch = input.value;
      if (this.container) {
        this.render(this.container);
        const nextInput = this.container.querySelector<HTMLInputElement>('#al-rf-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(pos, pos);
        }
      }
    });

    container.querySelectorAll<HTMLButtonElement>('[data-del-reframe]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.delReframe!;
        lifeStore.deleteReframe(id);
        if (this.container) this.render(this.container);
      });
    });

    // Checkin controls
    container.querySelectorAll<HTMLButtonElement>('[data-scale-before]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.checkinBefore = Number(btn.dataset.scaleBefore);
        this.checkinSavedNotice = '';
        if (this.container) this.render(this.container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-scale-after]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.checkinAfter = Number(btn.dataset.scaleAfter);
        this.checkinSavedNotice = '';
        if (this.container) this.render(this.container);
      });
    });

    container.querySelector('#al-checkin-tech')?.addEventListener('change', (e) => {
      this.checkinTechnique = (e.target as HTMLSelectElement).value;
    });

    container.querySelector('#al-checkin-note')?.addEventListener('input', (e) => {
      this.checkinNote = (e.target as HTMLTextAreaElement).value;
    });

    container.querySelector('#al-checkin-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      lifeStore.addCalmCheckin({
        before: this.checkinBefore,
        after: this.checkinAfter,
        technique: this.checkinTechnique,
        note: this.checkinNote.trim(),
      });
      this.checkinNote = '';
      this.checkinSavedNotice = 'Registro emocional guardado en tu historial.';
      if (this.container) this.render(this.container);
    });
  }

  private setTab(tab: CalmTab): void {
    if (tab === this.tab) return;
    if (tab === 'sos') {
      this.enterSosMode();
      return;
    }
    this.leaveSos();
    this.tab = tab;
    lifeStore.updateProgress('calm', { activeTab: tab });
    if (this.container) this.render(this.container);
  }

  private leaveSos(): void {
    this.stopBreathing();
    this.stopPmr();
    voiceStudio.stopAllCalmAudio();
  }

  // ---------------------------------------------------------------------------
  // Respiración
  // ---------------------------------------------------------------------------

  private startBreathing(): void {
    window.clearInterval(this.breathTimer);
    this.breathingRunning = true;
    this.breathStartMs = performance.now();
    this.breathPhaseIdx = -1;
    this.breathCycles = 0;
    this.breathRecordedThisRun = false;
    this.breathTimer = window.setInterval(() => this.tickBreathing(), 100);
    this.tickBreathing();
    this.syncBreathButton();
  }

  private stopBreathing(): void {
    this.breathingRunning = false;
    window.clearInterval(this.breathTimer);
    this.breathTimer = 0;
  }

  private tickBreathing(): void {
    if (!this.breathingRunning) return;
    const pat = BREATH_PATTERNS[this.sosPattern];
    const state = breathStateAt(pat, (performance.now() - this.breathStartMs) / 1000);
    const root = this.container;
    if (!root) return;
    const orb = root.querySelector<HTMLElement>('#al-sos-orb');
    const secEl = root.querySelector<HTMLElement>('#al-sos-sec');
    const phaseEl = root.querySelector<HTMLElement>('#al-sos-phase');
    const cycEl = root.querySelector<HTMLElement>('#al-sos-cycles');
    const phase = pat.phases[state.phaseIdx];

    if (state.phaseIdx !== this.breathPhaseIdx) {
      this.breathPhaseIdx = state.phaseIdx;
      if (orb) {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        orb.style.transition = reduce ? 'none' : `transform ${phase.sec}s ease-in-out`;
        orb.style.transform = `scale(${phase.scale})`;
      }
      if (phaseEl) phaseEl.textContent = phase.label;
      if (lifeStore.get().modulePrefs.calm.soundCue) {
        try {
          voiceStudio.playCalmChime(state.phaseIdx === 0 ? 432 : 340);
        } catch {
          // sin audio disponible
        }
      }
      if (this.vibrateOn) navigator.vibrate?.(state.phaseIdx === 0 ? 30 : [20, 60, 20]);
    }
    if (secEl) secEl.textContent = String(Math.max(1, Math.ceil(state.phaseRemainingSec - 0.05)));
    if (state.cycles !== this.breathCycles) {
      this.breathCycles = state.cycles;
      if (cycEl) cycEl.textContent = String(state.cycles);
      const target = this.getTargetCycles();
      if (state.cycles >= target && !this.breathRecordedThisRun) {
        this.breathRecordedThisRun = true;
        lifeStore.recordCalmSession();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Sonido
  // ---------------------------------------------------------------------------

  private toggleSound(kind: CalmSoundKind): void {
    const on = voiceStudio.isCalmSoundOn(kind);
    if (on) {
      if (kind === 'rain') voiceStudio.stopRainNoise();
      else if (kind === 'pulse') voiceStudio.stopCalmPulse();
      else voiceStudio.stopWarmDrone();
      const anyLeft = SOUND_TOGGLES.find((s) => voiceStudio.isCalmSoundOn(s.kind))?.kind ?? 'off';
      this.preferredSound = anyLeft;
    } else {
      try {
        if (kind === 'rain') voiceStudio.startRainNoise(0.5);
        else if (kind === 'pulse') voiceStudio.startCalmPulse(84, 60, 180);
        else voiceStudio.startWarmDrone(174);
        this.preferredSound = kind;
      } catch {
        // se informa abajo
      }
    }
    lifeStore.updateProgress('calm', { ambientSound: this.preferredSound });
    this.audioNote =
      !on && !voiceStudio.isCalmSoundOn(kind)
        ? 'Este navegador no permite audio. Sigue con la respiración visual.'
        : '';
    this.syncSounds();
  }

  // ---------------------------------------------------------------------------
  // Aterrizaje
  // ---------------------------------------------------------------------------

  private toggleGround(idx: number): void {
    if (idx < 0 || idx >= GROUND_TOTAL) return;
    const next = !this.groundFlags[idx];
    this.groundFlags[idx] = next;
    lifeStore.updateProgress('calm', { groundDone: [...this.groundFlags] });
    if (next) {
      try {
        voiceStudio.playCalmChime(520 + this.groundCount() * 12);
      } catch {
        // sin audio
      }
    }
    this.syncGrounding();
    if (this.groundCount() === GROUND_TOTAL && !this.groundRecorded) {
      this.groundRecorded = true;
      lifeStore.recordCalmSession();
    }
  }

  // ---------------------------------------------------------------------------
  // Relajación muscular
  // ---------------------------------------------------------------------------

  private resetPmr(): void {
    this.pmrRunning = false;
    this.pmrStep = 0;
    this.pmrPhase = 'tense';
    this.pmrRemainingMs = PMR_STEPS[0].tenseSec * 1000;
    this.pmrFinished = false;
    this.pmrStarted = false;
  }

  private startPmr(): void {
    if (this.pmrFinished) {
      this.resetPmr();
      lifeStore.updateProgress('calm', { pmrStep: 0 });
    }
    window.clearInterval(this.pmrTimer);
    this.pmrRunning = true;
    this.pmrStarted = true;
    this.pmrLastTickMs = performance.now();
    this.pmrTimer = window.setInterval(() => this.tickPmr(), 200);
    this.syncPmr();
  }

  private pausePmr(): void {
    this.stopPmr();
    this.syncPmr();
  }

  private stopPmr(): void {
    this.pmrRunning = false;
    window.clearInterval(this.pmrTimer);
    this.pmrTimer = 0;
  }

  private tickPmr(): void {
    if (!this.pmrRunning) return;
    const now = performance.now();
    this.pmrRemainingMs -= now - this.pmrLastTickMs;
    this.pmrLastTickMs = now;
    if (this.pmrRemainingMs <= 0) {
      const step = PMR_STEPS[this.pmrStep];
      if (this.pmrPhase === 'tense') {
        this.pmrPhase = 'release';
        this.pmrRemainingMs = step.releaseSec * 1000;
        if (this.vibrateOn) navigator.vibrate?.(40);
      } else if (this.pmrStep + 1 < PMR_STEPS.length) {
        this.pmrStep += 1;
        this.pmrPhase = 'tense';
        this.pmrRemainingMs = PMR_STEPS[this.pmrStep].tenseSec * 1000;
        lifeStore.updateProgress('calm', { pmrStep: this.pmrStep });
      } else {
        this.stopPmr();
        this.pmrFinished = true;
        lifeStore.updateProgress('calm', { pmrStep: 0 });
        lifeStore.recordCalmSession();
      }
    }
    this.syncPmr();
  }

  // ---------------------------------------------------------------------------
  // Sincronización puntual del DOM (evita re-renderizar y perder foco/scroll)
  // ---------------------------------------------------------------------------

  private syncAllSos(): void {
    this.syncPatternChips();
    this.syncBreathButton();
    this.syncSounds();
    this.syncGrounding();
    this.syncPmr();
    const root = this.container;
    if (!root) return;
    const cycEl = root.querySelector('#al-sos-cycles');
    if (cycEl) cycEl.textContent = String(this.breathCycles);
    if (this.breathingRunning) {
      const phase = BREATH_PATTERNS[this.sosPattern].phases[Math.max(0, this.breathPhaseIdx)];
      const orb = root.querySelector<HTMLElement>('#al-sos-orb');
      if (orb) orb.style.transform = `scale(${phase.scale})`;
      this.breathPhaseIdx = -1;
    }
  }

  private syncPatternChips(): void {
    const root = this.container;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-sos-pattern]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.sosPattern === this.sosPattern));
    });
    const pat = BREATH_PATTERNS[this.sosPattern];
    const rhythm = root.querySelector('#al-sos-rhythm');
    if (rhythm) rhythm.textContent = `${pat.rhythm}. ${pat.desc}`;
    const secEl = root.querySelector('#al-sos-sec');
    if (secEl && !this.breathingRunning) secEl.textContent = String(pat.phases[0].sec);
  }

  private syncBreathButton(): void {
    const btn = this.container?.querySelector<HTMLElement>('#al-sos-breath-toggle');
    if (!btn) return;
    btn.innerHTML = this.breathingRunning
      ? `${Icons.pause(16)}<span>Pausar respiración</span>`
      : `${Icons.play(16)}<span>Retomar respiración</span>`;
  }

  private syncSounds(): void {
    const root = this.container;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-sos-sound]').forEach((b) => {
      b.setAttribute('aria-pressed', String(voiceStudio.isCalmSoundOn(b.dataset.sosSound as CalmSoundKind)));
    });
    const note = root.querySelector('#al-sos-audio-note');
    if (note) note.textContent = this.audioNote;
  }

  private syncGrounding(): void {
    const root = this.container;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-ground-idx]').forEach((b) => {
      const idx = Number(b.dataset.groundIdx);
      const done = Boolean(this.groundFlags[idx]);
      b.setAttribute('aria-pressed', String(done));
      b.classList.toggle('is-done', done);
    });
    const count = root.querySelector('#al-ground-count');
    const totalDone = this.groundCount();
    if (count) count.textContent = String(totalDone);
    const done = root.querySelector<HTMLElement>('#al-ground-done');
    if (done) done.hidden = totalDone < GROUND_TOTAL;
  }

  private syncPmr(): void {
    const root = this.container;
    if (!root) return;
    const step = PMR_STEPS[this.pmrStep];
    const groupEl = root.querySelector('#al-pmr-group');
    const instrEl = root.querySelector('#al-pmr-instruction');
    const countEl = root.querySelector('#al-pmr-count');
    const progEl = root.querySelector('#al-pmr-progress');
    const toggle = root.querySelector<HTMLElement>('#al-pmr-toggle');
    const box = root.querySelector<HTMLElement>('.al-pmr-box');
    const sec = Math.max(1, Math.ceil(this.pmrRemainingMs / 1000));
    const started = this.pmrStarted;
    if (groupEl) groupEl.textContent = this.pmrFinished ? 'Listo' : step.group;
    if (progEl) progEl.textContent = `Grupo ${Math.min(this.pmrStep + 1, PMR_STEPS.length)}/${PMR_STEPS.length}`;
    if (instrEl) {
      instrEl.textContent = this.pmrFinished
        ? `Terminaste los ${PMR_STEPS.length} grupos. Respira y nota tu cuerpo más pesado y suelto.`
        : !started
          ? 'Pulsa Iniciar y sigue las indicaciones.'
          : this.pmrPhase === 'tense'
            ? `Tensa ${step.tenseSec} s: ${step.action}`
            : `Suelta por completo ${step.releaseSec} s. ${step.tip}`;
    }
    if (countEl) countEl.textContent = this.pmrFinished || !started ? '--' : `${sec}`;
    if (box) box.dataset.pmrPhase = this.pmrFinished ? 'done' : this.pmrPhase;
    if (toggle) {
      toggle.innerHTML = this.pmrRunning
        ? `${Icons.pause(16)}<span>Pausar</span>`
        : `${Icons.play(16)}<span>${this.pmrFinished ? 'Repetir relajación' : started ? 'Continuar' : 'Iniciar relajación muscular'}</span>`;
    }
  }
}
