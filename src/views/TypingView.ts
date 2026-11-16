import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import { DeviceProfile } from '../types';

type PcDrill = 'accents' | 'speed' | 'classic';
type MobileDrill = 'agile' | 'orthowords' | 'sprint30';

const PC_TEXTS: Record<PcDrill, string[]> = {
  accents: [
    'La práctica constante convierte el esfuerzo lento en fluidez natural y segura.',
    'Escribir sin mirar el teclado libera tu atención para pensar con más claridad.',
    'Un paso pequeño cada mañana vale más que diez intenciones perfectas sin acción.',
    'La ecuanimidad y el pragmatismo ayudan a resolver problemas complejos con calma.',
  ],
  speed: [
    'cada tecla tiene su propio lugar cuando mantienes los dedos sobre la fila base',
    'respirar hondo antes de empezar mejora tu ritmo y reduce los errores al escribir',
    'velocidad sin precision solo genera correcciones busca un paso firme y continuo',
    'dominar la mecanografia te ahorra horas cada semana al estudiar o programar',
  ],
  classic: [
    'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.',
    'Volverán las oscuras golondrinas en tu balcón sus nidos a colgar, y otra vez con el ala a sus cristales jugando llamarán.',
  ],
};

const MOBILE_PHRASES: Record<'agile' | 'orthowords', string[]> = {
  agile: [
    'Hoy voy a avanzar con calma y orden',
    'Nos vemos después de clases en la biblioteca',
    'Voy por buen camino paso a paso',
    'Primero respiro luego organizo mi tarde',
  ],
  orthowords: [
    'Quizás haya tiempo para revisar la próxima práctica',
    'Aún no sé por qué cambió la fecha del examen',
    'Tuvo la lucidez y templanza para responder bien',
    'Echo el cuaderno en la mochila antes de salir',
  ],
};

const SPRINT_WORDS = [
  'calma', 'ritmo', 'claro', 'mente', 'texto', 'libro', 'voz', 'pulso', 'trazo',
  'hábito', 'tiempo', 'camino', 'criterio', 'foco', 'orden', 'frase', 'tarde',
  'meta', 'clase', 'estudio', 'logro', 'fluidez', 'salud', 'simple', 'fuerza',
  'sabio', 'suave', 'firme', 'libre', 'calidad', 'progreso', 'canto', 'nota',
];

const FINGER_HINTS: Record<string, string> = {
  a: 'Meñique izq', q: 'Meñique izq', z: 'Meñique izq',
  s: 'Anular izq', w: 'Anular izq', x: 'Anular izq',
  d: 'Medio izq', e: 'Medio izq', c: 'Medio izq',
  f: 'Índice izq', r: 'Índice izq', t: 'Índice izq', g: 'Índice izq', v: 'Índice izq', b: 'Índice izq',
  j: 'Índice der', y: 'Índice der', u: 'Índice der', h: 'Índice der', n: 'Índice der', m: 'Índice der',
  k: 'Medio der', i: 'Medio der',
  l: 'Anular der', o: 'Anular der',
  ñ: 'Meñique der', p: 'Meñique der',
  ' ': 'Pulgar (Espacio)',
};

export function resolveEffectiveDevice(pref: DeviceProfile): 'pc' | 'mobile' {
  if (pref === 'pc' || pref === 'mobile') return pref;
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const narrow = typeof window !== 'undefined' && window.innerWidth < 760;
  return coarse || narrow ? 'mobile' : 'pc';
}

export class TypingView {
  private pcDrill: PcDrill = 'accents';
  private mobileDrill: MobileDrill = 'agile';
  private sampleIdx = 0;

  private targetText = '';
  private typedText = '';
  private startedAt = 0;
  private finished = false;
  private totalKeystrokes = 0;
  private mistakeChars: Record<string, number> = {};
  private showFingerGuide = true;

  // Mobile Sprint 30s state
  private sprintSeconds = 30;
  private sprintRunning = false;
  private sprintWordsDone = 0;
  private sprintTimerId = 0;
  private sprintCurrentWord = SPRINT_WORDS[0];

  private lastWpm = 0;
  private lastAcc = 100;

  constructor() {
    this.resetRound(false);
  }

  private resetRound(keepSample = false): void {
    window.clearInterval(this.sprintTimerId);
    this.sprintRunning = false;
    this.sprintSeconds = 30;
    this.sprintWordsDone = 0;
    this.typedText = '';
    this.startedAt = 0;
    this.finished = false;
    this.totalKeystrokes = 0;
    this.mistakeChars = {};

    const mode = resolveEffectiveDevice(lifeStore.get().deviceMode);
    if (mode === 'pc') {
      const list = PC_TEXTS[this.pcDrill];
      if (!keepSample) this.sampleIdx = this.sampleIdx % list.length;
      this.targetText = list[this.sampleIdx % list.length];
    } else if (this.mobileDrill === 'sprint30') {
      this.sprintCurrentWord = SPRINT_WORDS[Math.floor(Math.random() * SPRINT_WORDS.length)];
      this.targetText = this.sprintCurrentWord;
    } else {
      const list = MOBILE_PHRASES[this.mobileDrill];
      this.targetText = list[this.sampleIdx % list.length];
    }
  }

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const pref = profile.deviceMode;
    const eff = resolveEffectiveDevice(pref);

    const bestLabel =
      eff === 'pc'
        ? `Récord PC: ${profile.stats.bestWpmPc} WPM`
        : `Récord Celular: ${profile.stats.bestWpmMobile} WPM`;

    const modeTabs =
      eff === 'pc'
        ? `
        <div class="al-seg-tabs">
          <button type="button" class="al-seg-btn ${this.pcDrill === 'accents' ? 'is-active' : ''}" data-pcdrill="accents">Con tildes</button>
          <button type="button" class="al-seg-btn ${this.pcDrill === 'speed' ? 'is-active' : ''}" data-pcdrill="speed">Velocidad pura</button>
          <button type="button" class="al-seg-btn ${this.pcDrill === 'classic' ? 'is-active' : ''}" data-pcdrill="classic">Párrafo clásico</button>
        </div>`
        : `
        <div class="al-seg-tabs">
          <button type="button" class="al-seg-btn ${this.mobileDrill === 'agile' ? 'is-active' : ''}" data-mdrill="agile">Frases ágiles</button>
          <button type="button" class="al-seg-btn ${this.mobileDrill === 'orthowords' ? 'is-active' : ''}" data-mdrill="orthowords">Tildes rápidas</button>
          <button type="button" class="al-seg-btn ${this.mobileDrill === 'sprint30' ? 'is-active' : ''}" data-mdrill="sprint30">Sprint 30s</button>
        </div>`;

    container.innerHTML = `
      <div class="al-page al-typing-page">
        <div class="al-page-head">
          <div>
            <h1>Escritura Rápida (${eff === 'pc' ? 'Modo PC · Teclado' : 'Modo Celular · Táctil'})</h1>
            <p>${
              eff === 'pc'
                ? 'Entrena mecanografía con tildes, precisión y posición de dedos sobre fila base.'
                : 'Optimizado para pulgares o deslizar sobre el teclado del teléfono sin tapar lo que lees.'
            }</p>
          </div>
          <div class="al-mono-pill" id="al-typing-best">${bestLabel}</div>
        </div>

        <div class="al-toolbar">
          <div class="al-seg-tabs" aria-label="Selector de dispositivo">
            <button type="button" class="al-seg-btn ${pref === 'auto' ? 'is-active' : ''}" data-dev="auto">Auto (${eff === 'pc' ? 'PC' : 'Móvil'})</button>
            <button type="button" class="al-seg-btn ${pref === 'pc' ? 'is-active' : ''}" data-dev="pc">${Icons.monitor(14)} <span>Soy en PC</span></button>
            <button type="button" class="al-seg-btn ${pref === 'mobile' ? 'is-active' : ''}" data-dev="mobile">${Icons.phone(14)} <span>Soy en Celular</span></button>
          </div>
          ${modeTabs}
        </div>

        <section class="al-panel al-typing-card">
          <div class="al-typing-stats">
            <div><span>Velocidad</span><strong id="al-typ-wpm">${this.lastWpm} WPM</strong></div>
            <div><span>Precisión</span><strong id="al-typ-acc">${this.lastAcc}%</strong></div>
            ${
              eff === 'mobile' && this.mobileDrill === 'sprint30'
                ? `<div><span>Tiempo / Palabras</span><strong id="al-typ-sprint">${this.sprintSeconds}s · ${this.sprintWordsDone} pal</strong></div>`
                : `<div><span>Progreso</span><strong id="al-typ-prog">${this.typedText.length}/${this.targetText.length}</strong></div>`
            }
          </div>

          <div class="al-typing-prompt" id="al-typ-prompt">${this.renderTargetCharsHtml()}</div>

          <div class="al-typing-input-wrap">
            <input
              type="text"
              id="al-typ-input"
              class="al-typing-input"
              value="${this.typedText.replace(/"/g, '&quot;')}"
              placeholder="${eff === 'mobile' && this.mobileDrill === 'sprint30' ? 'Escribe la palabra y pulsa Espacio...' : 'Empieza a escribir aquí...'}"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              enterkeyhint="${eff === 'mobile' ? 'next' : 'done'}"
            />
            <button type="button" class="al-btn" id="al-typ-restart">${Icons.refresh(15)}<span>Otro texto</span></button>
          </div>

          ${
            eff === 'pc'
              ? `
            <div class="al-finger-bar">
              <label class="al-inline-check">
                <input type="checkbox" id="al-finger-toggle" ${this.showFingerGuide ? 'checked' : ''} />
                <span>Guía de dedo (fila base)</span>
              </label>
              <span class="al-mono-pill" id="al-finger-hint">${this.currentFingerHint()}</span>
            </div>`
              : ''
          }

          <div id="al-typ-summary" class="al-rule-box ${this.finished ? '' : 'is-hidden'}"></div>
        </section>
      </div>
    `;

    this.bindEvents(container, eff);
    if (this.finished) {
      this.paintSummary(container, eff);
    }
  }

  private currentFingerHint(): string {
    if (!this.showFingerGuide) return 'Guía oculta';
    const nextChar = this.targetText[this.typedText.length] ?? '';
    if (!nextChar) return '¡Completado!';
    const base = nextChar.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return `Siguiente «${nextChar === ' ' ? 'ESPACIO' : nextChar}» → ${FINGER_HINTS[base] ?? 'Mano cercana'}`;
  }

  private renderTargetCharsHtml(): string {
    return Array.from(this.targetText)
      .map((ch, idx) => {
        let cls = 'al-ch';
        if (idx < this.typedText.length) {
          cls += this.typedText[idx] === ch ? ' is-ok' : ' is-err';
        } else if (idx === this.typedText.length) {
          cls += ' is-curr';
        }
        const safe = ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;
        return `<span class="${cls}">${safe}</span>`;
      })
      .join('');
  }

  private computeLiveStats(): { wpm: number; acc: number } {
    const elapsedMin = this.startedAt ? Math.max(0.03, (performance.now() - this.startedAt) / 60000) : 0;
    let correctChars = 0;
    for (let i = 0; i < this.typedText.length; i++) {
      if (this.typedText[i] === this.targetText[i]) correctChars += 1;
    }
    const wpm = elapsedMin > 0 ? Math.round(correctChars / 5 / elapsedMin) : 0;
    const total = Math.max(1, this.totalKeystrokes || this.typedText.length);
    const errors = Object.values(this.mistakeChars).reduce((a, b) => a + b, 0);
    const acc = Math.max(0, Math.min(100, Math.round(((total - errors) / total) * 100)));
    return { wpm, acc };
  }

  private paintSummary(container: HTMLElement, eff: 'pc' | 'mobile'): void {
    const sumEl = container.querySelector<HTMLElement>('#al-typ-summary');
    if (!sumEl) return;
    sumEl.classList.remove('is-hidden');
    const weakEntries = Object.entries(this.mistakeChars)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => `«${k === ' ' ? 'Espacio' : k}» (${n})`)
      .join(', ');

    sumEl.innerHTML = `
      <strong>${eff === 'mobile' && this.mobileDrill === 'sprint30' ? `Sprint terminado: ${this.sprintWordsDone} palabras (${this.lastWpm} WPM)` : `Texto completado a ${this.lastWpm} WPM (${this.lastAcc}% precisión)`}</strong>
      <p>${weakEntries ? `Teclas con más tropiezos: ${weakEntries}.` : '¡Sin errores en teclas clave!'}</p>
      <button type="button" class="al-btn al-btn-primary" id="al-typ-next-btn">Siguiente reto</button>
    `;
    sumEl.querySelector('#al-typ-next-btn')?.addEventListener('click', () => {
      this.sampleIdx += 1;
      this.resetRound(true);
      this.render(container);
      container.querySelector<HTMLInputElement>('#al-typ-input')?.focus();
    });
  }

  private bindEvents(container: HTMLElement, eff: 'pc' | 'mobile'): void {
    container.querySelectorAll<HTMLButtonElement>('[data-dev]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.setDeviceMode(btn.dataset.dev as DeviceProfile);
        this.resetRound(false);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-pcdrill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.pcDrill = btn.dataset.pcdrill as PcDrill;
        this.sampleIdx = 0;
        this.resetRound(true);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-mdrill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.mobileDrill = btn.dataset.mdrill as MobileDrill;
        this.sampleIdx = 0;
        this.resetRound(true);
        this.render(container);
      });
    });

    container.querySelector('#al-typ-restart')?.addEventListener('click', () => {
      this.sampleIdx += 1;
      this.resetRound(true);
      this.render(container);
      container.querySelector<HTMLInputElement>('#al-typ-input')?.focus();
    });

    container.querySelector<HTMLInputElement>('#al-finger-toggle')?.addEventListener('change', (e) => {
      this.showFingerGuide = (e.target as HTMLInputElement).checked;
      const hint = container.querySelector('#al-finger-hint');
      if (hint) hint.textContent = this.currentFingerHint();
    });

    const inputEl = container.querySelector<HTMLInputElement>('#al-typ-input')!;
    const promptEl = container.querySelector<HTMLElement>('#al-typ-prompt')!;
    const wpmEl = container.querySelector<HTMLElement>('#al-typ-wpm')!;
    const accEl = container.querySelector<HTMLElement>('#al-typ-acc')!;
    const progEl = container.querySelector<HTMLElement>('#al-typ-prog');
    const sprintEl = container.querySelector<HTMLElement>('#al-typ-sprint');
    const hintEl = container.querySelector<HTMLElement>('#al-finger-hint');

    inputEl.addEventListener('input', () => {
      if (this.finished) return;
      const val = inputEl.value;
      if (!this.startedAt && val.length > 0) {
        this.startedAt = performance.now();
        if (eff === 'mobile' && this.mobileDrill === 'sprint30' && !this.sprintRunning) {
          this.sprintRunning = true;
          this.sprintTimerId = window.setInterval(() => {
            this.sprintSeconds -= 1;
            if (sprintEl) sprintEl.textContent = `${this.sprintSeconds}s · ${this.sprintWordsDone} pal`;
            if (this.sprintSeconds <= 0) {
              window.clearInterval(this.sprintTimerId);
              this.sprintRunning = false;
              this.finished = true;
              this.lastWpm = this.sprintWordsDone * 2;
              this.lastAcc = 100;
              lifeStore.recordTyping('mobile', this.lastWpm);
              this.paintSummary(container, eff);
            }
          }, 1000);
        }
      }

      // Sprint 30s mobile word commit on space
      if (eff === 'mobile' && this.mobileDrill === 'sprint30') {
        if (val.endsWith(' ')) {
          const clean = val.trim().toLowerCase();
          if (clean === this.sprintCurrentWord.toLowerCase()) {
            this.sprintWordsDone += 1;
            this.lastWpm = Math.round((this.sprintWordsDone / Math.max(1, 30 - this.sprintSeconds)) * 60);
          }
          inputEl.value = '';
          this.typedText = '';
          this.sprintCurrentWord = SPRINT_WORDS[Math.floor(Math.random() * SPRINT_WORDS.length)];
          this.targetText = this.sprintCurrentWord;
          promptEl.innerHTML = this.renderTargetCharsHtml();
          wpmEl.textContent = `${this.lastWpm} WPM`;
          if (sprintEl) sprintEl.textContent = `${this.sprintSeconds}s · ${this.sprintWordsDone} pal`;
          return;
        }
        this.typedText = val;
        promptEl.innerHTML = this.renderTargetCharsHtml();
        return;
      }

      // Standard phrase typing (PC & Mobile)
      if (val.length > this.typedText.length) {
        this.totalKeystrokes += 1;
        const pos = val.length - 1;
        if (pos < this.targetText.length && val[pos] !== this.targetText[pos]) {
          const expected = this.targetText[pos];
          this.mistakeChars[expected] = (this.mistakeChars[expected] ?? 0) + 1;
        }
      }

      this.typedText = val.slice(0, this.targetText.length);
      promptEl.innerHTML = this.renderTargetCharsHtml();
      const { wpm, acc } = this.computeLiveStats();
      this.lastWpm = wpm;
      this.lastAcc = acc;
      wpmEl.textContent = `${wpm} WPM`;
      accEl.textContent = `${acc}%`;
      if (progEl) progEl.textContent = `${this.typedText.length}/${this.targetText.length}`;
      if (hintEl) hintEl.textContent = this.currentFingerHint();

      if (this.typedText === this.targetText) {
        this.finished = true;
        lifeStore.recordTyping(eff, wpm);
        const bestEl = container.querySelector('#al-typing-best');
        if (bestEl) {
          const st = lifeStore.get().stats;
          bestEl.textContent = eff === 'pc' ? `Récord PC: ${st.bestWpmPc} WPM` : `Récord Celular: ${st.bestWpmMobile} WPM`;
        }
        this.paintSummary(container, eff);
      }
    });
  }

  public unmount(): void {
    window.clearInterval(this.sprintTimerId);
  }
}
