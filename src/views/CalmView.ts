import { voiceStudio } from '../audio/VoiceStudio';
import {
  BREATH_PATTERNS,
  breathStateAt,
  GROUNDING_GROUPS,
  PANIC_TRUTH_CARDS,
  PMR_STEPS,
  SOS_PATTERN_ORDER,
  SOS_REASSURANCE,
} from '../data/CalmBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import type { CalmPatternId } from '../types';

type CalmTab = 'sos' | 'reframe';
type CalmSoundKind = 'rain' | 'pulse' | 'drone';

const SOUND_TOGGLES: { kind: CalmSoundKind; label: string; icon: (s?: number) => string }[] = [
  { kind: 'rain', label: 'Lluvia suave', icon: Icons.droplet },
  { kind: 'pulse', label: 'Pulso 84→60 BPM', icon: Icons.heartPulse },
  { kind: 'drone', label: 'Tono cálido', icon: Icons.tone },
];

const GROUND_TOTAL = GROUNDING_GROUPS.reduce((a, g) => a + g.count, 0);

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export class CalmView {
  private container: HTMLElement | null = null;
  private tab: CalmTab = 'reframe';

  // Respiración (basada en reloj, admite fases de 5.5 s)
  private sosPattern: CalmPatternId = 'exhale36';
  private breathingRunning = false;
  private breathStartMs = 0;
  private breathPhaseIdx = -1;
  private breathCycles = 0;
  private breathTimer = 0;
  private vibrateOn = false;

  // Aterrizaje 5-4-3-2-1
  private groundDone = new Set<string>();
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

  public render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML =
      this.tab === 'sos' ? this.renderSos() : this.renderReframe();
    this.bind(container);
    if (this.tab === 'sos') this.syncAllSos();
  }

  /** Abre el modo SOS Pánico Ahora (acceso directo `#calm?sos=1`). */
  public enterSosMode(container?: HTMLElement): void {
    if (container) this.container = container;
    const wasSos = this.tab === 'sos';
    this.tab = 'sos';
    if (!wasSos) this.resetSosSession();
    if (this.container) {
      this.render(this.container);
      if (!this.breathingRunning) this.startBreathing();
    }
  }

  public unmount(): void {
    this.stopBreathing();
    this.stopPmr();
    voiceStudio.stopAllCalmAudio();
    this.tab = 'reframe';
    this.container = null;
  }

  // ---------------------------------------------------------------------------
  // Plantillas
  // ---------------------------------------------------------------------------

  private renderTabs(): string {
    return `
      <div class="al-seg-tabs al-calm-tabs" role="tablist" aria-label="Secciones de calma">
        <button type="button" role="tab" aria-selected="${this.tab === 'sos'}" class="al-seg-btn al-calm-tab-sos ${this.tab === 'sos' ? 'is-active' : ''}" data-calm-tab="sos">
          ${Icons.heartPulse(16)}<span>SOS Pánico Ahora</span>
        </button>
        <button type="button" role="tab" aria-selected="${this.tab === 'reframe'}" class="al-seg-btn ${this.tab === 'reframe' ? 'is-active' : ''}" data-calm-tab="reframe">
          ${Icons.wind(16)}<span>Calma y Reencuadre</span>
        </button>
      </div>`;
  }

  private renderSos(): string {
    const pat = BREATH_PATTERNS[this.sosPattern];
    return `
      <div class="al-page al-calm-page al-calm-sos">
        ${this.renderTabs()}
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
            <p class="al-sos-rhythm" id="al-sos-rhythm">${pat.rhythm}</p>
            <div class="al-tool-group al-sos-actions">
              <button type="button" class="al-btn al-btn-calm al-btn-lg" id="al-sos-breath-toggle">
                ${Icons.pause(16)}<span>Pausar respiración</span>
              </button>
              ${
                typeof navigator !== 'undefined' && 'vibrate' in navigator
                  ? `<button type="button" class="al-btn" id="al-sos-vibrate" aria-pressed="false">${Icons.phone(16)}<span>Vibración suave: No</span></button>`
                  : ''
              }
              <span class="al-mono-pill">Ciclos: <strong id="al-sos-cycles">0</strong></span>
            </div>
          </section>

          <section class="al-sos-block" aria-label="Sonido calmante">
            <h2>Sonido que ayuda</h2>
            <div class="al-sos-sounds">
              ${SOUND_TOGGLES.map(
                (s) => `
                <button type="button" class="al-sos-sound" data-sos-sound="${s.kind}" aria-pressed="false">
                  ${s.icon(18)}<span>${s.label}</span>
                </button>`
              ).join('')}
            </div>
            <p class="al-muted al-sos-note" id="al-sos-audio-note">${this.audioNote}</p>
          </section>

          <section class="al-sos-block" aria-label="Aterrizaje 5-4-3-2-1">
            <div class="al-sos-block-head">
              <h2>Aterrizaje 5-4-3-2-1</h2>
              <span class="al-mono-pill"><strong id="al-ground-count">0</strong>/${GROUND_TOTAL}</span>
            </div>
            <p class="al-muted">Toca un círculo por cada cosa que encuentres. No hace falta escribir.</p>
            <div class="al-ground-grid">
              ${GROUNDING_GROUPS.map(
                (g, gi) => `
                <div class="al-ground-row">
                  <span class="al-ground-label">${g.prompt}</span>
                  <div class="al-ground-dots">
                    ${Array.from({ length: g.count })
                      .map(
                        (_, i) =>
                          `<button type="button" class="al-ground-dot" data-ground="${gi}-${i}" aria-pressed="false" aria-label="${g.prompt}: ${i + 1}">${i + 1}</button>`
                      )
                      .join('')}
                  </div>
                </div>`
              ).join('')}
            </div>
            <p class="al-ground-done" id="al-ground-done" hidden>Bien hecho. Estás aquí, ahora. Tu cuerpo ya está más tranquilo.</p>
            <button type="button" class="al-btn" id="al-ground-reset">${Icons.refresh(15)}<span>Reiniciar casillas</span></button>
          </section>

          <section class="al-sos-block al-pmr-box" aria-label="Relajación muscular progresiva">
            <div class="al-sos-block-head">
              <h2>Relajación muscular guiada</h2>
              <span class="al-mono-pill" id="al-pmr-progress">Grupo 1/${PMR_STEPS.length}</span>
            </div>
            <div class="al-pmr-stage" aria-live="polite">
              <strong class="al-pmr-group" id="al-pmr-group">${PMR_STEPS[0].group}</strong>
              <span class="al-pmr-instruction" id="al-pmr-instruction">Pulsa Iniciar y sigue las indicaciones.</span>
              <span class="al-pmr-count" id="al-pmr-count">--</span>
            </div>
            <div class="al-tool-group">
              <button type="button" class="al-btn al-btn-calm" id="al-pmr-toggle">${Icons.play(16)}<span>Iniciar relajación muscular</span></button>
              <button type="button" class="al-btn" id="al-pmr-reset">${Icons.refresh(15)}<span>Reiniciar</span></button>
            </div>
          </section>

          <section class="al-sos-block al-anchor-card" aria-label="Frase de anclaje">
            <p class="al-anchor-text" id="al-anchor-text">${PANIC_TRUTH_CARDS[this.cardIdx % PANIC_TRUTH_CARDS.length]}</p>
            <button type="button" class="al-btn" id="al-anchor-next">${Icons.arrowDown(15)}<span>Siguiente frase de anclaje</span></button>
          </section>
        </div>
      </div>`;
  }

  private renderReframe(): string {
    const profile = lifeStore.get();
    return `
      <div class="al-page al-calm-page">
        <div class="al-module-hero" style="--mod-c1: #0F766E; --mod-c2: #5EEAD4;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #0F766E; --em-c2: #5EEAD4;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.wind(20)}</span>
            </div>
            <div>
              <h1>Centro de Calma y Mente Positiva</h1>
              <p>Cuando todo parezca salir mal, baja el ritmo físico primero y ordena un solo paso.</p>
            </div>
          </div>
          <div class="al-mono-pill">Sesiones de calma: ${profile.stats.calmSessions}</div>
        </div>

        ${this.renderTabs()}

        <section class="al-panel al-sos-entry">
          <div>
            <h2>¿Estás en crisis ahora mismo?</h2>
            <p class="al-muted">Abre la pantalla de emergencia: respiración, sonido y aterrizaje sin escribir nada.</p>
          </div>
          <button type="button" class="al-btn al-btn-calm al-btn-lg" data-calm-tab="sos">${Icons.heartPulse(18)}<span>SOS Pánico Ahora</span></button>
        </section>

        <section class="al-panel">
          <h2>Reencuadre cuando el día va mal</h2>
          <p class="al-muted">Sacar el ruido de la cabeza y escribirlo en 3 líneas concretas reduce la sensación de bloqueo.</p>

          <form class="al-reframe-form" id="al-reframe-form">
            <label>
              <span>1. ¿Qué está pasando o qué te preocupa hoy?</span>
              <textarea id="al-rf-worry" rows="2" placeholder="Ej. Me equivoqué en algo importante / siento que no avanzo..."></textarea>
            </label>
            <label>
              <span>2. ¿Qué parte SÍ depende de ti ahora mismo?</span>
              <textarea id="al-rf-control" rows="2" placeholder="Ej. Descansar hoy, corregir solo una parte, pedir ayuda o practicar 5 minutos..."></textarea>
            </label>
            <label>
              <span>3. Un paso amable de 5 minutos que harás hoy</span>
              <input type="text" id="al-rf-step" placeholder="Ej. Tomar un vaso de agua y hacer una cosa pequeña sin juzgarme" />
            </label>
            <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar en mi cuaderno privado</span></button>
          </form>

          <div class="al-reframe-history">
            <h3>Tus reencuadres anteriores (${profile.reframeLog.length})</h3>
            ${
              profile.reframeLog.length === 0
                ? '<p class="al-muted">Aún no escribiste ninguno. Se guardan localmente y se sincronizan en Supabase.</p>'
                : profile.reframeLog
                    .slice(0, 5)
                    .map(
                      (r) => `
                  <div class="al-reframe-item">
                    <strong>Paso elegido: ${esc(r.nextStep)}</strong>
                    <p>Lo que controlo: ${esc(r.control)}</p>
                    <small>${new Date(r.createdAt).toLocaleDateString('es-ES')}</small>
                  </div>`
                    )
                    .join('')
            }
          </div>
        </section>
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

    container.querySelectorAll<HTMLButtonElement>('[data-ground]').forEach((btn) => {
      btn.addEventListener('click', () => this.toggleGround(btn.dataset.ground!));
    });
    container.querySelector('#al-ground-reset')?.addEventListener('click', () => {
      this.groundDone.clear();
      this.groundRecorded = false;
      this.syncGrounding();
    });

    container.querySelector('#al-pmr-toggle')?.addEventListener('click', () => {
      if (this.pmrRunning) this.pausePmr();
      else this.startPmr();
    });
    container.querySelector('#al-pmr-reset')?.addEventListener('click', () => {
      this.stopPmr();
      this.resetPmr();
      this.syncPmr();
    });

    container.querySelector('#al-anchor-next')?.addEventListener('click', () => {
      this.cardIdx = (this.cardIdx + 1) % PANIC_TRUTH_CARDS.length;
      const el = container.querySelector('#al-anchor-text');
      if (el) el.textContent = PANIC_TRUTH_CARDS[this.cardIdx];
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
    if (this.container) this.render(this.container);
  }

  private leaveSos(): void {
    this.stopBreathing();
    this.stopPmr();
    voiceStudio.stopAllCalmAudio();
  }

  private resetSosSession(): void {
    this.leaveSos();
    this.sosPattern = 'exhale36';
    this.breathCycles = 0;
    this.groundDone.clear();
    this.groundRecorded = false;
    this.resetPmr();
    this.audioNote = '';
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
      if (state.cycles === 3) lifeStore.recordCalmSession();
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
    } else {
      try {
        if (kind === 'rain') voiceStudio.startRainNoise(0.5);
        else if (kind === 'pulse') voiceStudio.startCalmPulse(84, 60, 180);
        else voiceStudio.startWarmDrone(174);
      } catch {
        // se informa abajo
      }
    }
    this.audioNote =
      !on && !voiceStudio.isCalmSoundOn(kind)
        ? 'Este navegador no permite audio. Sigue con la respiración visual.'
        : '';
    this.syncSounds();
  }

  // ---------------------------------------------------------------------------
  // Aterrizaje
  // ---------------------------------------------------------------------------

  private toggleGround(key: string): void {
    if (this.groundDone.has(key)) {
      this.groundDone.delete(key);
    } else {
      this.groundDone.add(key);
      try {
        voiceStudio.playCalmChime(520 + this.groundDone.size * 12);
      } catch {
        // sin audio
      }
    }
    this.syncGrounding();
    if (this.groundDone.size === GROUND_TOTAL && !this.groundRecorded) {
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
    if (this.pmrFinished) this.resetPmr();
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
      } else {
        this.stopPmr();
        this.pmrFinished = true;
        lifeStore.recordCalmSession();
      }
    }
    this.syncPmr();
  }

  // ---------------------------------------------------------------------------
  // Sincronizacion puntual del DOM (evita re-renderizar y perder foco/scroll)
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
      this.breathPhaseIdx = -1; // fuerza reaplicar etiqueta en el próximo tick
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
    root.querySelectorAll<HTMLElement>('[data-ground]').forEach((b) => {
      const done = this.groundDone.has(b.dataset.ground!);
      b.setAttribute('aria-pressed', String(done));
      b.classList.toggle('is-done', done);
    });
    const count = root.querySelector('#al-ground-count');
    if (count) count.textContent = String(this.groundDone.size);
    const done = root.querySelector<HTMLElement>('#al-ground-done');
    if (done) done.hidden = this.groundDone.size < GROUND_TOTAL;
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
        ? 'Terminaste los 6 grupos. Respira y nota tu cuerpo más pesado y suelto.'
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
