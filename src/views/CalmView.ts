import { voiceStudio } from '../audio/VoiceStudio';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';

type BreathPatternId = '478' | 'box' | 'sigh';

const BREATH_PATTERNS: Record<
  BreathPatternId,
  {
    name: string;
    desc: string;
    phases: { label: string; sec: number; scale: number }[];
  }
> = {
  '478': {
    name: 'Respiración 4-7-8',
    desc: 'Activa el freno natural del sistema nervioso para bajar palpitaciones y ansiedad.',
    phases: [
      { label: 'Inhala suave por la nariz', sec: 4, scale: 1.0 },
      { label: 'Sostén sin tensión', sec: 7, scale: 1.0 },
      { label: 'Exhala lento por la boca', sec: 8, scale: 0.48 },
    ],
  },
  box: {
    name: 'Caja 4-4-4-4',
    desc: 'Equilibra la mente cuando tienes muchos pensamientos al mismo tiempo.',
    phases: [
      { label: 'Inhala', sec: 4, scale: 1.0 },
      { label: 'Mantén', sec: 4, scale: 1.0 },
      { label: 'Exhala', sec: 4, scale: 0.48 },
      { label: 'Pausa vacía', sec: 4, scale: 0.48 },
    ],
  },
  sigh: {
    name: 'Suspiro fisiológico',
    desc: 'Doble inhalación + exhalación larga para alivio rápido en 30 segundos.',
    phases: [
      { label: 'Inhala hondo', sec: 3, scale: 0.85 },
      { label: 'Segundo sorbo de aire', sec: 1, scale: 1.05 },
      { label: 'Suelta todo el aire lento', sec: 6, scale: 0.46 },
    ],
  },
};

const GROUNDING_STEPS = [
  'Nombra 5 cosas reales que puedas VER ahora mismo a tu alrededor.',
  'Toca 4 texturas físicas (la mesa, tu ropa, tus manos, el suelo bajo tus pies).',
  'Identifica 3 sonidos distintos que escuches en este instante.',
  'Nota 2 olores del ambiente o respira aire fresco.',
  'Nota 1 sabor en tu boca o toma un sorbo de agua despacio.',
  'Di una verdad amable y realista: «Esto es incómodo ahora, pero pasará; solo atiendo este minuto».',
  'Apoya bien los pies en el suelo y siente el peso de tu cuerpo sobre la silla.',
  'Suelta los hombros, afloja la mandíbula y abre las manos sobre tus piernas.',
  'Elige un objeto cercano y descríbelo en voz baja: color, forma, tamaño y textura.',
  'Cuenta hacia atrás desde 20 de tres en tres sin prisa (20, 17, 14…).',
  'Piensa en un lugar donde te sientas a salvo y nombra tres detalles de él.',
  'Decide un solo próximo paso pequeño y realista para los siguientes 5 minutos.',
];

export class CalmView {
  private breathingRunning = false;
  private phaseIdx = 0;
  private phaseRemaining = 4;
  private cyclesDone = 0;
  private timerId = 0;

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.calm;
    const pat = BREATH_PATTERNS[prefs.patternId];
    const currentPhase = pat.phases[this.phaseIdx % pat.phases.length];
    const gIdx = prefs.groundingIdx % GROUNDING_STEPS.length;

    container.innerHTML = `
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

        <div class="al-two-col">
          <section class="al-panel al-breath-panel">
            <div class="al-card-head">
              <h2>${pat.name}</h2>
              <label class="al-inline-check">
                <input type="checkbox" id="al-breath-sound" ${prefs.soundCue ? 'checked' : ''} />
                <span>Tono suave</span>
              </label>
            </div>
            <p class="al-muted">${pat.desc}</p>

            <div class="al-seg-tabs">
              <button type="button" class="al-seg-btn ${prefs.patternId === '478' ? 'is-active' : ''}" data-bpat="478">4-7-8 (Ansiedad)</button>
              <button type="button" class="al-seg-btn ${prefs.patternId === 'box' ? 'is-active' : ''}" data-bpat="box">Caja 4-4-4-4</button>
              <button type="button" class="al-seg-btn ${prefs.patternId === 'sigh' ? 'is-active' : ''}" data-bpat="sigh">Alivio rápido</button>
            </div>

            <div class="al-breath-stage">
              <div class="al-breath-orb" id="al-breath-orb" style="transform: scale(${this.breathingRunning ? currentPhase.scale : 0.68})">
                <span id="al-breath-sec">${this.breathingRunning ? this.phaseRemaining : pat.phases[0].sec}</span>
              </div>
              <div class="al-breath-label" id="al-breath-label">
                ${this.breathingRunning ? currentPhase.label : 'Pulsa iniciar y sigue el círculo'}
              </div>
            </div>

            <div class="al-tool-group">
              <button type="button" class="al-btn al-btn-calm" id="al-breath-toggle">
                ${Icons.wind(16)}<span>${this.breathingRunning ? 'Pausar respiración' : 'Iniciar respiración guiada'}</span>
              </button>
              <span class="al-mono-pill">Ciclos: <strong id="al-breath-cycles">${this.cyclesDone}</strong></span>
            </div>

            <div class="al-grounding-box">
              <h3>Aterrizaje sensorial (5-4-3-2-1)</h3>
              <p>${GROUNDING_STEPS[gIdx]}</p>
              <div class="al-tool-group">
                <button type="button" class="al-btn" id="al-ground-next">Siguiente paso (${gIdx + 1}/${GROUNDING_STEPS.length})</button>
              </div>
            </div>
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
                      <strong>Paso elegido: ${r.nextStep}</strong>
                      <p>Lo que controlo: ${r.control}</p>
                      <small>${new Date(r.createdAt).toLocaleDateString('es-ES')}</small>
                    </div>`
                      )
                      .join('')
              }
            </div>
          </section>
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  private bindEvents(container: HTMLElement): void {
    container.querySelectorAll<HTMLButtonElement>('[data-bpat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stopBreathing();
        const nextPat = btn.dataset.bpat as BreathPatternId;
        lifeStore.updateModulePrefs('calm', { patternId: nextPat });
        this.phaseIdx = 0;
        this.phaseRemaining = BREATH_PATTERNS[nextPat].phases[0].sec;
        this.render(container);
      });
    });

    container.querySelector<HTMLInputElement>('#al-breath-sound')?.addEventListener('change', (e) => {
      lifeStore.updateModulePrefs('calm', { soundCue: (e.target as HTMLInputElement).checked });
    });

    container.querySelector('#al-breath-toggle')?.addEventListener('click', () => {
      if (this.breathingRunning) {
        this.stopBreathing();
        this.render(container);
      } else {
        this.startBreathing(container);
      }
    });

    container.querySelector('#al-ground-next')?.addEventListener('click', () => {
      const nextIdx = (lifeStore.get().modulePrefs.calm.groundingIdx + 1) % GROUNDING_STEPS.length;
      lifeStore.updateModulePrefs('calm', { groundingIdx: nextIdx });
      if (nextIdx === 0) {
        lifeStore.recordCalmSession();
      }
      this.render(container);
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
      this.render(container);
    });
  }

  private startBreathing(container: HTMLElement): void {
    const prefs = lifeStore.get().modulePrefs.calm;
    this.breathingRunning = true;
    this.phaseIdx = 0;
    const pat = BREATH_PATTERNS[prefs.patternId];
    this.phaseRemaining = pat.phases[0].sec;
    if (prefs.soundCue) voiceStudio.playCalmChime(396);
    this.render(container);

    window.clearInterval(this.timerId);
    this.timerId = window.setInterval(() => {
      if (!this.breathingRunning) return;
      this.phaseRemaining -= 1;
      const currPrefs = lifeStore.get().modulePrefs.calm;
      const p = BREATH_PATTERNS[currPrefs.patternId];
      if (this.phaseRemaining <= 0) {
        this.phaseIdx += 1;
        if (this.phaseIdx % p.phases.length === 0) {
          this.cyclesDone += 1;
          lifeStore.recordCalmSession();
        }
        const nextPhase = p.phases[this.phaseIdx % p.phases.length];
        this.phaseRemaining = nextPhase.sec;
        if (currPrefs.soundCue) {
          voiceStudio.playCalmChime(this.phaseIdx % 2 === 0 ? 432 : 340);
        }
      }

      const active = p.phases[this.phaseIdx % p.phases.length];
      const orb = container.querySelector<HTMLElement>('#al-breath-orb');
      const secEl = container.querySelector<HTMLElement>('#al-breath-sec');
      const lblEl = container.querySelector<HTMLElement>('#al-breath-label');
      const cycEl = container.querySelector<HTMLElement>('#al-breath-cycles');
      if (orb) orb.style.transform = `scale(${active.scale})`;
      if (secEl) secEl.textContent = String(this.phaseRemaining);
      if (lblEl) lblEl.textContent = active.label;
      if (cycEl) cycEl.textContent = String(this.cyclesDone);
    }, 1000);
  }

  private stopBreathing(): void {
    this.breathingRunning = false;
    window.clearInterval(this.timerId);
  }

  public unmount(): void {
    this.stopBreathing();
  }
}
