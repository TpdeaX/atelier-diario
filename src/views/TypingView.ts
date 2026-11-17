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
    'El pingüino Wenceslao hizo kilómetros bajo exhaustiva lluvia y frío; añoraba a su querido cachorro.',
    '¿Cuántas páginas leíste hoy? Aunque sean pocas, cada línea suma a tu comprensión.',
    'Él sabía que la próxima revisión sería difícil, así que decidió estudiar un poco más.',
    'El murciélago comía feliz cardillo y kiwi mientras la cigüeña tocaba el saxofón.',
    'Después de la reunión, María envió un resumen claro con las tareas y los plazos acordados.',
    '¡Qué alegría! Por fin logré escribir sin mirar el teclado durante cinco minutos seguidos.',
    'La música, la lectura y el ejercicio físico son hábitos que fortalecen la atención.',
    'Aún no sé cuál será el próximo capítulo, pero sí sé que quiero escribirlo con calma.',
  ],
  speed: [
    'cada tecla tiene su propio lugar cuando mantienes los dedos sobre la fila base',
    'respirar hondo antes de empezar mejora tu ritmo y reduce los errores al escribir',
    'velocidad sin precision solo genera correcciones busca un paso firme y continuo',
    'dominar la mecanografia te ahorra horas cada semana al estudiar o programar',
    'los dedos indices descansan sobre la f y la j para encontrar el centro sin mirar',
    'un texto claro nace de ideas ordenadas y frases cortas que van directo al punto',
    'la constancia diaria vence al talento que no se entrena con disciplina y paciencia',
    'escribe despacio al principio y deja que la velocidad llegue sola con la practica',
    'mantener la espalda recta y los hombros sueltos evita el cansancio al teclear',
    'cada error es una pista sobre que dedo necesita mas atencion en la siguiente ronda',
    'leer en voz alta mientras escribes ayuda a sentir el ritmo natural de las palabras',
    'una mente tranquila comete menos errores que una mente apurada y dispersa',
  ],
  classic: [
    'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.',
    'Volverán las oscuras golondrinas en tu balcón sus nidos a colgar, y otra vez con el ala a sus cristales jugando llamarán.',
    'Nuestras vidas son los ríos que van a dar en la mar, que es el morir; allí van los señoríos derechos a se acabar y consumir.',
    'Caminante, son tus huellas el camino y nada más; caminante, no hay camino, se hace camino al andar.',
    'Con diez cañones por banda, viento en popa a toda vela, no corta el mar, sino vuela un velero bergantín.',
    'Pues sepa vuestra merced, ante todas cosas, que a mí llaman Lázaro de Tormes, hijo de Tomé González y de Antona Pérez.',
    '¿Qué es la vida? Un frenesí. ¿Qué es la vida? Una ilusión, una sombra, una ficción, y el mayor bien es pequeño.',
    'Era del año la estación florida en que el mentido robador de Europa, media luna las armas de su frente, y el Sol todos los rayos de su pelo.',
  ],
};

const MOBILE_PHRASES: Record<'agile' | 'orthowords', string[]> = {
  agile: [
    'Hoy voy a avanzar con calma y orden',
    'Nos vemos después de clases en la biblioteca',
    'Voy por buen camino paso a paso',
    'Primero respiro luego organizo mi tarde',
    'Ya llegué a casa te escribo en un rato',
    'Mañana repaso los apuntes antes del examen',
    'Gracias por la ayuda de hoy fue muy útil',
    'Salgo en diez minutos espérame en la puerta',
    'Hoy terminé la tarea y me siento tranquilo',
    'Avísame cuando llegues para quedarme en paz',
    'Me tomo un descanso y vuelvo con energía',
    'Podemos hablarlo con calma después de cenar',
  ],
  orthowords: [
    'Quizás haya tiempo para revisar la próxima práctica',
    'Aún no sé por qué cambió la fecha del examen',
    'Tuvo la lucidez y templanza para responder bien',
    'Echo el cuaderno en la mochila antes de salir',
    'Vamos a ver si hay suficiente café para todos',
    'Él sí sabe cuándo conviene callar y escuchar',
    'No es que no quiera sino que hoy no puedo',
    'El porqué de su decisión aún nos sorprende',
    'Tú y yo sabemos que mañana habrá más trabajo',
    'Ojalá que la valla del parque ya esté reparada',
    'Se cayó el vaso pero nadie se hizo daño',
    'Hecho el trabajo nos fuimos a descansar',
  ],
};

const SPRINT_WORDS = [
  'calma', 'ritmo', 'claro', 'mente', 'texto', 'libro', 'voz', 'pulso', 'trazo',
  'hábito', 'tiempo', 'camino', 'criterio', 'foco', 'orden', 'frase', 'tarde',
  'meta', 'clase', 'estudio', 'logro', 'fluidez', 'salud', 'simple', 'fuerza',
  'sabio', 'suave', 'firme', 'libre', 'calidad', 'progreso', 'canto', 'nota',
  'año', 'niño', 'sueño', 'mañana', 'pequeño', 'montaña', 'compañía', 'enseñar',
  'lápiz', 'árbol', 'música', 'página', 'rápido', 'círculo', 'brújula', 'océano',
  'canción', 'atención', 'razón', 'corazón', 'misión', 'visión', 'acción', 'jardín',
  'quietud', 'virtud', 'bondad', 'gratitud', 'actitud', 'paz', 'luz', 'nuez',
  'idea', 'lectura', 'escritura', 'memoria', 'paciencia', 'equilibrio', 'cuaderno', 'teclado',
  'agua', 'pingüino', 'cigüeña', 'vergüenza', 'guitarra', 'guiño', 'queso', 'kilo',
  'horizonte', 'brillo', 'calle', 'llave', 'yema', 'zapato', 'exacto', 'xilófono',
  'aprender', 'crecer', 'avanzar', 'respirar', 'pensar', 'crear', 'leer', 'cantar',
];

const FINGER_HINTS: Record<string, string> = {
  a: 'Meñique izq.', q: 'Meñique izq.', z: 'Meñique izq.',
  s: 'Anular izq.', w: 'Anular izq.', x: 'Anular izq.',
  d: 'Medio izq.', e: 'Medio izq.', c: 'Medio izq.',
  f: 'Índice izq.', r: 'Índice izq.', t: 'Índice izq.', g: 'Índice izq.', v: 'Índice izq.', b: 'Índice izq.',
  j: 'Índice der.', y: 'Índice der.', u: 'Índice der.', h: 'Índice der.', n: 'Índice der.', m: 'Índice der.',
  k: 'Medio der.', i: 'Medio der.',
  l: 'Anular der.', o: 'Anular der.',
  ñ: 'Meñique der.', p: 'Meñique der.',
  ' ': 'Pulgar (Espacio)',
};

export function resolveEffectiveDevice(pref: DeviceProfile): 'pc' | 'mobile' {
  if (pref === 'pc' || pref === 'mobile') return pref;
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const narrow = typeof window !== 'undefined' && window.innerWidth < 760;
  return coarse || narrow ? 'mobile' : 'pc';
}

export class TypingView {
  private targetText = '';
  private typedText = '';
  private startedAt = 0;
  private finished = false;
  private totalKeystrokes = 0;
  private mistakeChars: Record<string, number> = {};

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

    const prof = lifeStore.get();
    const prefs = prof.modulePrefs.typing;
    const mode = resolveEffectiveDevice(prof.deviceMode);
    if (mode === 'pc') {
      const list = PC_TEXTS[prefs.pcDrill];
      const idx = keepSample ? prefs.sampleIdx : prefs.sampleIdx % list.length;
      this.targetText = list[idx % list.length];
    } else if (prefs.mobileDrill === 'sprint30') {
      this.sprintCurrentWord = SPRINT_WORDS[Math.floor(Math.random() * SPRINT_WORDS.length)];
      this.targetText = this.sprintCurrentWord;
    } else {
      const list = MOBILE_PHRASES[prefs.mobileDrill];
      this.targetText = list[prefs.sampleIdx % list.length];
    }
  }

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.typing;
    const pref = profile.deviceMode;
    const eff = resolveEffectiveDevice(pref);

    if (!this.targetText) this.resetRound(false);

    const bestLabel =
      eff === 'pc'
        ? `Récord PC: ${profile.stats.bestWpmPc} PPM`
        : `Récord Celular: ${profile.stats.bestWpmMobile} PPM`;

    const modeTabs =
      eff === 'pc'
        ? `
        <div class="al-seg-tabs">
          <button type="button" class="al-seg-btn ${prefs.pcDrill === 'accents' ? 'is-active' : ''}" data-pcdrill="accents">Con tildes</button>
          <button type="button" class="al-seg-btn ${prefs.pcDrill === 'speed' ? 'is-active' : ''}" data-pcdrill="speed">Velocidad pura</button>
          <button type="button" class="al-seg-btn ${prefs.pcDrill === 'classic' ? 'is-active' : ''}" data-pcdrill="classic">Párrafo clásico</button>
        </div>`
        : `
        <div class="al-seg-tabs">
          <button type="button" class="al-seg-btn ${prefs.mobileDrill === 'agile' ? 'is-active' : ''}" data-mdrill="agile">Frases ágiles</button>
          <button type="button" class="al-seg-btn ${prefs.mobileDrill === 'orthowords' ? 'is-active' : ''}" data-mdrill="orthowords">Tildes rápidas</button>
          <button type="button" class="al-seg-btn ${prefs.mobileDrill === 'sprint30' ? 'is-active' : ''}" data-mdrill="sprint30">Ráfaga 30s</button>
        </div>`;

    container.innerHTML = `
      <div class="al-page al-typing-page">
        <div class="al-module-hero" style="--mod-c1: #4338CA; --mod-c2: #818CF8;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #4338CA; --em-c2: #818CF8;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.keyboard(20)}</span>
            </div>
            <div>
              <h1>Mecanografía (${eff === 'pc' ? 'Modo PC · Teclado' : 'Modo Celular · Táctil'})</h1>
              <p>${
                eff === 'pc'
                  ? 'Entrena tildes en español, precisión y posición de dedos sobre fila base.'
                  : 'Optimizado para pulgares o teclado móvil sin tapar la línea que lees.'
              }</p>
            </div>
          </div>
          <div class="al-mono-pill" id="al-typing-best">${bestLabel}</div>
        </div>

        <div class="al-toolbar">
          <div class="al-seg-tabs" aria-label="Selector de dispositivo">
            <button type="button" class="al-seg-btn ${pref === 'auto' ? 'is-active' : ''}" data-dev="auto">Automático (${eff === 'pc' ? 'PC' : 'Móvil'})</button>
            <button type="button" class="al-seg-btn ${pref === 'pc' ? 'is-active' : ''}" data-dev="pc">${Icons.monitor(14)} <span>Escritorio</span></button>
            <button type="button" class="al-seg-btn ${pref === 'mobile' ? 'is-active' : ''}" data-dev="mobile">${Icons.phone(14)} <span>Celular</span></button>
          </div>
          ${modeTabs}
        </div>

        <section class="al-panel al-typing-card">
          <div class="al-typing-stats">
            <div><span>Velocidad</span><strong id="al-typ-wpm">${this.lastWpm} PPM</strong></div>
            <div><span>Precisión</span><strong id="al-typ-acc">${this.lastAcc}%</strong></div>
            ${
              eff === 'mobile' && prefs.mobileDrill === 'sprint30'
                ? `<div><span>Tiempo / Palabras</span><strong id="al-typ-sprint">${this.sprintSeconds}s · ${this.sprintWordsDone} pal.</strong></div>`
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
              placeholder="${eff === 'mobile' && prefs.mobileDrill === 'sprint30' ? 'Escribe la palabra y pulsa Espacio...' : 'Empieza a escribir aquí...'}"
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
                <input type="checkbox" id="al-finger-toggle" ${prefs.showFingerGuide ? 'checked' : ''} />
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
    if (!lifeStore.get().modulePrefs.typing.showFingerGuide) return 'Guía oculta';
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
    const prefs = lifeStore.get().modulePrefs.typing;
    const weakEntries = Object.entries(this.mistakeChars)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => `«${k === ' ' ? 'Espacio' : k}» (${n})`)
      .join(', ');

    sumEl.innerHTML = `
      <strong>${eff === 'mobile' && prefs.mobileDrill === 'sprint30' ? `Ráfaga terminada: ${this.sprintWordsDone} palabras (${this.lastWpm} PPM)` : `Texto completado a ${this.lastWpm} PPM (${this.lastAcc}% precisión)`}</strong>
      <p>${weakEntries ? `Teclas con más tropiezos: ${weakEntries}.` : '¡Sin errores en teclas clave!'}</p>
      <button type="button" class="al-btn al-btn-primary" id="al-typ-next-btn">Siguiente reto</button>
    `;
    sumEl.querySelector('#al-typ-next-btn')?.addEventListener('click', () => {
      lifeStore.updateModulePrefs('typing', { sampleIdx: lifeStore.get().modulePrefs.typing.sampleIdx + 1 });
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
        lifeStore.updateModulePrefs('typing', { pcDrill: btn.dataset.pcdrill as PcDrill, sampleIdx: 0 });
        this.resetRound(true);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-mdrill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.updateModulePrefs('typing', { mobileDrill: btn.dataset.mdrill as MobileDrill, sampleIdx: 0 });
        this.resetRound(true);
        this.render(container);
      });
    });

    container.querySelector('#al-typ-restart')?.addEventListener('click', () => {
      lifeStore.updateModulePrefs('typing', { sampleIdx: lifeStore.get().modulePrefs.typing.sampleIdx + 1 });
      this.resetRound(true);
      this.render(container);
      container.querySelector<HTMLInputElement>('#al-typ-input')?.focus();
    });

    container.querySelector<HTMLInputElement>('#al-finger-toggle')?.addEventListener('change', (e) => {
      lifeStore.updateModulePrefs('typing', { showFingerGuide: (e.target as HTMLInputElement).checked });
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
      const mobileDrill = lifeStore.get().modulePrefs.typing.mobileDrill;

      if (!this.startedAt && val.length > 0) {
        this.startedAt = performance.now();
        if (eff === 'mobile' && mobileDrill === 'sprint30' && !this.sprintRunning) {
          this.sprintRunning = true;
          this.sprintTimerId = window.setInterval(() => {
            this.sprintSeconds -= 1;
            if (sprintEl) sprintEl.textContent = `${this.sprintSeconds}s · ${this.sprintWordsDone} pal.`;
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

      if (eff === 'mobile' && mobileDrill === 'sprint30') {
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
          wpmEl.textContent = `${this.lastWpm} PPM`;
          if (sprintEl) sprintEl.textContent = `${this.sprintSeconds}s · ${this.sprintWordsDone} pal.`;
          return;
        }
        this.typedText = val;
        promptEl.innerHTML = this.renderTargetCharsHtml();
        return;
      }

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
      wpmEl.textContent = `${wpm} PPM`;
      accEl.textContent = `${acc}%`;
      if (progEl) progEl.textContent = `${this.typedText.length}/${this.targetText.length}`;
      if (hintEl) hintEl.textContent = this.currentFingerHint();

      if (this.typedText === this.targetText) {
        this.finished = true;
        lifeStore.recordTyping(eff, wpm);
        const bestEl = container.querySelector('#al-typing-best');
        if (bestEl) {
          const st = lifeStore.get().stats;
          bestEl.textContent = eff === 'pc' ? `Récord PC: ${st.bestWpmPc} PPM` : `Récord Celular: ${st.bestWpmMobile} PPM`;
        }
        this.paintSummary(container, eff);
      }
    });
  }

  public unmount(): void {
    window.clearInterval(this.sprintTimerId);
  }
}
