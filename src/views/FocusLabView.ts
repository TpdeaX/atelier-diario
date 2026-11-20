import { DICTION_DRILLS, FLASHCARDS_BANK, ORATORY_PROMPTS } from '../data/FocusLabBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import { FlashcardItem } from '../types';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

const FOCUSLAB_TUTORIALS: Record<'oratory' | 'schulte' | 'recall', Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  oratory: {
    sectionName: 'Oratoria y Dicción',
    summary: 'Entrena exposiciones cronometradas con estructura, elimina muletillas y pule tu dicción.',
    steps: [
      'Lee el reto y su estructura guía (izquierda) antes de pulsar Iniciar práctica.',
      'Habla siguiendo el reloj; el micrófono cuenta muletillas en vivo y también puedes pulsar los botones +1 manualmente.',
      'Usa el panel derecho de Rutina de Dicción y Voz para calentar articulación y pausas en 1 minuto.',
      'Pulsa Otro reto u Otra rutina para recorrer los 16 retos de oratoria y 10 rutinas de dicción.',
    ],
    tip: 'Cuando sientas venir un «eh» o «este», haz una pausa limpia de 1 segundo en silencio: proyecta seguridad.',
  },
  schulte: {
    sectionName: 'Tabla de Schulte',
    summary: 'Amplía tu visión periférica y velocidad de rastreo visual tocando números en orden.',
    steps: [
      'Elige el tamaño del tablero (4×4 para calentar, 5×5 estándar o 6×6 avanzado).',
      'Fija los ojos en el centro de la cuadrícula e intenta ubicar del 1 al máximo sin mover la cabeza.',
      'El cronómetro arranca automáticamente al tocar el 1 y guarda tu mejor marca en 5×5.',
    ],
    tip: 'Mantén la respiración tranquila: apresurar la mirada salta números y añade más tiempo que avanzar parejo.',
  },
  recall: {
    sectionName: 'Evocación Activa',
    summary: 'Fija conceptos técnicos y personales con recuperación activa y repetición espaciada.',
    steps: [
      'Filtra por mazo arriba o elige Todos para intercalar temas distintos.',
      'Escribe o piensa tu respuesta en el campo de evocación antes de pulsar Mostrar respuesta.',
      'Califica tu recuerdo (10 min, +2 días o +5 días) para programar automáticamente el próximo repaso.',
      'Pulsa Nueva tarjeta para añadir preguntas propias de tus cursos o lecturas.',
    ],
    tip: 'Esforzarte 10 segundos en recordar antes de mirar la respuesta es lo que realmente consolida la memoria.',
  },
};

const FILLER_PATTERNS: { key: string; label: string; regex: RegExp }[] = [
  { key: 'eh', label: 'eh / ehh', regex: /\b(?:eh+|emm+)\b/gi },
  { key: 'este', label: 'este...', regex: /\beste\b/gi },
  { key: 'osea', label: 'o sea', regex: /\bo sea\b/gi },
  { key: 'tipo', label: 'tipo', regex: /\btipo\b/gi },
  { key: 'bueno', label: 'bueno / pues', regex: /\b(?:bueno|pues)\b/gi },
];

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function shuffleNumbers(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class FocusLabView {
  private promptIdx = 0;
  private drillIdx = 0;
  private speakingRunning = false;
  private speakingRemaining = 45;
  private speakingElapsed = 0;
  private speakingTimer = 0;
  private fillerCounts: Record<string, number> = { eh: 0, este: 0, osea: 0, tipo: 0, bueno: 0 };
  private transcriptText = '';
  private speechRec: { stop?: () => void } | null = null;
  private micStatus = '';

  // Tabla de Schulte
  private schulteNumbers: number[] = shuffleNumbers(25);
  private schulteNext = 1;
  private schulteErrors = 0;
  private schulteStartMs = 0;
  private schulteElapsedMs = 0;
  private schulteDone = false;
  private schulteInterval = 0;

  // Evocación activa
  private recallIdx = 0;
  private recallRevealed = false;
  private recallDraft = '';
  private addCardOpen = false;

  public unmount(): void {
    this.stopSpeaking();
    if (this.schulteInterval) {
      window.clearInterval(this.schulteInterval);
      this.schulteInterval = 0;
    }
  }

  private stopSpeaking(): void {
    this.speakingRunning = false;
    if (this.speakingTimer) {
      window.clearInterval(this.speakingTimer);
      this.speakingTimer = 0;
    }
    if (this.speechRec && typeof this.speechRec.stop === 'function') {
      try {
        this.speechRec.stop();
      } catch {
        // Ignore stop error
      }
    }
    this.speechRec = null;
  }

  private getAllCards(): FlashcardItem[] {
    return [...lifeStore.get().customFlashcards, ...FLASHCARDS_BANK];
  }

  private renderOratoryTab(): string {
    const prompt = ORATORY_PROMPTS[this.promptIdx % ORATORY_PROMPTS.length];
    const drill = DICTION_DRILLS[this.drillIdx % DICTION_DRILLS.length];
    const totalFillers = Object.values(this.fillerCounts).reduce((a, b) => a + b, 0);
    const wordsCount = this.transcriptText.trim() ? this.transcriptText.trim().split(/\s+/).length : 0;
    const wpm = this.speakingElapsed >= 5 ? Math.round((wordsCount / this.speakingElapsed) * 60) : 0;

    return `
      <div class="al-two-col">
        <section class="al-panel al-focus-card">
          <div class="al-card-head">
            <h2>Simulador de Exposición y Muletillas</h2>
            <button type="button" class="al-btn al-btn-sm" id="fl-next-prompt">${Icons.refresh(14)}<span>Otro reto</span></button>
          </div>
          <div class="al-fl-prompt-box">
            <span class="al-mono-pill">${prompt.durationSec}s · Reto ${(this.promptIdx % ORATORY_PROMPTS.length) + 1}/${ORATORY_PROMPTS.length}</span>
            <h3>${esc(prompt.title)}</h3>
            <p>${esc(prompt.prompt)}</p>
            <div class="al-fl-framework"><strong>Estructura:</strong> ${esc(prompt.framework)}</div>
          </div>

          <div class="al-fl-clock-row">
            <div class="al-fl-clock" id="fl-speaking-clock">${String(Math.floor(this.speakingRemaining / 60)).padStart(2, '0')}:${String(this.speakingRemaining % 60).padStart(2, '0')}</div>
            <div class="al-tool-group">
              <button type="button" class="al-btn al-btn-primary" id="fl-speak-toggle">
                ${Icons.mic(15)}<span>${this.speakingRunning ? 'Detener sesión' : 'Iniciar práctica'}</span>
              </button>
              <button type="button" class="al-btn" id="fl-speak-reset">Reiniciar</button>
            </div>
          </div>

          ${this.micStatus ? `<p class="al-muted" style="margin:6px 0 0;">${esc(this.micStatus)}</p>` : ''}

          <div class="al-fl-filler-row">
            <div class="al-card-head" style="margin-bottom:6px;">
              <strong>Destructor de muletillas (toca si se te escapa una):</strong>
              <span class="al-mono-pill">Total: ${totalFillers}${wpm > 0 ? ` · ${wpm} PPM` : ''}</span>
            </div>
            <div class="al-tool-group">
              ${FILLER_PATTERNS.map(
                (f) => `
                <button type="button" class="al-seg-btn" data-filler-tap="${f.key}">
                  +1 ${f.label} (${this.fillerCounts[f.key] ?? 0})
                </button>`
              ).join('')}
            </div>
          </div>

          ${
            this.transcriptText
              ? `<div class="al-fl-transcript"><strong>Transcripción detectada:</strong> ${esc(this.transcriptText)}</div>`
              : ''
          }
        </section>

        <section class="al-panel al-focus-card">
          <div class="al-card-head">
            <h2>Rutina de Dicción y Voz (${(this.drillIdx % DICTION_DRILLS.length) + 1}/${DICTION_DRILLS.length})</h2>
            <button type="button" class="al-btn al-btn-sm" id="fl-next-drill">${Icons.refresh(14)}<span>Otra rutina</span></button>
          </div>
          <h3 style="margin:0 0 8px;">${esc(drill.title)}</h3>
          <ol class="al-fl-steps">
            ${drill.steps.map((s) => `<li>${esc(s)}</li>`).join('')}
          </ol>
          <blockquote class="al-quote-mini" style="margin-top:12px;">«${esc(drill.sampleText)}»</blockquote>
          <p class="al-muted" style="margin-top:10px;">
            Tip de tus guardados: Si te trabas, haz una pausa limpia de 1–2 segundos en silencio; el silencio proyecta control, la muletilla proyecta duda.
          </p>
        </section>
      </div>
    `;
  }

  private renderSchulteTab(container: HTMLElement): string {
    const profile = lifeStore.get();
    const size = profile.modulePrefs.focuslab.schulteSize;
    const total = size * size;
    const secStr = (this.schulteElapsedMs / 1000).toFixed(2);
    const best5 = profile.stats.schulteBestMs !== null ? `${(profile.stats.schulteBestMs / 1000).toFixed(2)} s` : '—';

    void container;
    return `
      <div class="al-panel al-fl-schulte-wrap">
        <div class="al-card-head">
          <div>
            <h2>Tabla de Schulte · Atención y Visión Periférica</h2>
            <p class="al-muted">Fija la vista en el centro del tablero y toca del <strong>1 al ${total}</strong> en orden ascendente sin mover la cabeza.</p>
          </div>
          <div class="al-tool-group">
            <div class="al-seg-tabs">
              ${([4, 5, 6] as const)
                .map(
                  (sz) => `<button type="button" class="al-seg-btn ${size === sz ? 'is-active' : ''}" data-schulte-size="${sz}">${sz}×${sz}</button>`
                )
                .join('')}
            </div>
            <button type="button" class="al-btn al-btn-primary" id="fl-schulte-reset">${Icons.refresh(15)}<span>Nuevo tablero</span></button>
          </div>
        </div>

        <div class="al-fl-schulte-stats">
          <span class="al-mono-pill">Siguiente: <strong>${this.schulteDone ? 'Completado' : this.schulteNext}</strong></span>
          <span class="al-mono-pill" id="fl-schulte-timer">Tiempo: <strong>${secStr} s</strong></span>
          <span class="al-mono-pill">Errores: <strong>${this.schulteErrors}</strong></span>
          <span class="al-mono-pill">Récord 5×5: <strong>${best5}</strong></span>
        </div>

        <div class="al-schulte-grid" style="grid-template-columns: repeat(${size}, minmax(0, 1fr));">
          ${this.schulteNumbers
            .map((num) => {
              const found = num < this.schulteNext || this.schulteDone;
              return `<button type="button" class="al-schulte-cell ${found ? 'is-found' : ''}" data-schulte-num="${num}">${num}</button>`;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  private renderRecallTab(): string {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.focuslab;
    const allCards = this.getAllCards();
    const decks = Array.from(new Set(allCards.map((c) => c.deck)));

    const filtered = prefs.recallDeck === 'all' ? allCards : allCards.filter((c) => c.deck === prefs.recallDeck);
    const now = Date.now();
    const dueCards = filtered.filter((c) => {
      const prog = profile.flashcardProgress[c.id];
      return !prog || prog.nextReviewAt <= now;
    });
    const activePool = dueCards.length > 0 ? dueCards : filtered;
    const card = activePool[this.recallIdx % activePool.length];
    const prog = card ? profile.flashcardProgress[card.id] : undefined;

    return `
      <div class="al-panel">
        <div class="al-card-head">
          <div>
            <h2>Evocación Activa (Active Recall + Repetición Espaciada)</h2>
            <p class="al-muted">${dueCards.length} pendientes de repaso ahora · ${profile.stats.recallReviewed} repasos completados</p>
          </div>
          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-primary" id="fl-add-card-toggle">${Icons.plus(15)}<span>Nueva tarjeta</span></button>
          </div>
        </div>

        ${
          this.addCardOpen
            ? `
          <form id="fl-add-card-form" class="al-vault-form-stack" style="margin:12px 0; padding:12px; border:1px solid var(--border-subtle); border-radius:12px;">
            <div class="al-form-grid-3">
              <label><span>Curso o mazo</span><input type="text" id="fl-fc-deck" value="${esc(prefs.recallDeck === 'all' ? 'Sistemas Distribuidos' : prefs.recallDeck)}" required /></label>
              <label><span>Pregunta / Concepto</span><input type="text" id="fl-fc-front" placeholder="Ej. ¿Qué garantiza la propiedad de idempotencia?" required /></label>
              <label><span>Respuesta clave</span><input type="text" id="fl-fc-back" placeholder="Ejecutar N veces produce el mismo efecto que 1 vez." required /></label>
            </div>
            <div class="al-tool-group">
              <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar tarjeta</span></button>
              <button type="button" class="al-btn" id="fl-add-card-cancel">Cancelar</button>
            </div>
          </form>
        `
            : ''
        }

        <div class="al-seg-tabs" style="margin: 12px 0;">
          <button type="button" class="al-seg-btn ${prefs.recallDeck === 'all' ? 'is-active' : ''}" data-deck="all">Todos (${allCards.length})</button>
          ${decks
            .map(
              (d) => `<button type="button" class="al-seg-btn ${prefs.recallDeck === d ? 'is-active' : ''}" data-deck="${esc(d)}">${esc(d)}</button>`
            )
            .join('')}
        </div>

        ${
          card
            ? `
          <div class="al-fl-recall-card">
            <div class="al-card-head">
              <span class="al-mono-pill">${esc(card.deck)}${card.source ? ` · ${esc(card.source)}` : ''}</span>
              <div class="al-tool-group">
                ${prog ? `<span class="al-mono-pill">Intervalo: ${prog.intervalDays}d</span>` : '<span class="al-mono-pill">Nueva</span>'}
                ${card.isCustom ? `<button type="button" class="al-icon-btn" id="fl-del-card" data-card-id="${esc(card.id)}" title="Eliminar tarjeta">${Icons.trash(14)}</button>` : ''}
              </div>
            </div>
            <h3 class="al-fl-recall-front">${esc(card.front)}</h3>

            <label style="display:block; margin:10px 0;">
              <span class="al-muted" style="font-size:0.8rem;">Tu evocación antes de ver la respuesta (opcional, fuerza la memoria activa):</span>
              <input type="text" id="fl-recall-draft" class="al-vault-note-input" style="width:100%; margin-top:4px;" value="${esc(this.recallDraft)}" placeholder="Escribe brevemente lo que recuerdas..." />
            </label>

            ${
              this.recallRevealed
                ? `
              <div class="al-fl-recall-back">
                <strong>Respuesta clave:</strong>
                <p>${esc(card.back)}</p>
              </div>
              <div class="al-tool-group" style="margin-top:12px;">
                <button type="button" class="al-btn" data-rate="again">Repasar en 10 min</button>
                <button type="button" class="al-btn" data-rate="good">Bien (+2 días)</button>
                <button type="button" class="al-btn al-btn-primary" data-rate="easy">Dominado (+5 días)</button>
              </div>
            `
                : `
              <div class="al-tool-group" style="margin-top:10px;">
                <button type="button" class="al-btn al-btn-primary" id="fl-reveal-answer">${Icons.eye(15)}<span>Mostrar respuesta</span></button>
                <button type="button" class="al-btn" id="fl-skip-card">Siguiente</button>
              </div>
            `
            }
          </div>
        `
            : '<p class="al-muted">No hay tarjetas en este mazo.</p>'
        }
      </div>
    `;
  }

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.focuslab;
    const best5Txt = profile.stats.schulteBestMs !== null ? `${(profile.stats.schulteBestMs / 1000).toFixed(1)}s` : '—';

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #0F766E; --mod-c2: #2DD4BF;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #0F766E; --em-c2: #2DD4BF;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.mic(20)}</span>
            </div>
            <div>
              <h1>Oratoria, Atención y Evocación</h1>
              <p>Módulo nacido de tus mejores guardados de Instagram: destruye muletillas, entrena atención con Schulte y repasa con Active Recall.</p>
            </div>
          </div>
          <div class="al-mono-pill">Oratoria: ${profile.stats.oratorySessions} · Schulte: ${best5Txt} · Recall: ${profile.stats.recallReviewed}</div>
        </div>

        <div class="al-toolbar">
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${prefs.tab === 'oratory' ? 'is-active' : ''}" data-fltab="oratory">Oratoria y Dicción (${ORATORY_PROMPTS.length})</button>
            <button type="button" class="al-seg-btn ${prefs.tab === 'schulte' ? 'is-active' : ''}" data-fltab="schulte">Tabla de Schulte</button>
            <button type="button" class="al-seg-btn ${prefs.tab === 'recall' ? 'is-active' : ''}" data-fltab="recall">Evocación Activa (${this.getAllCards().length})</button>
          </div>
        </div>

        ${renderTutorialBanner({
          id: `focuslab:${prefs.tab}`,
          moduleName: 'Oratoria y Enfoque',
          ...(FOCUSLAB_TUTORIALS[prefs.tab] ?? FOCUSLAB_TUTORIALS.oratory),
        })}

        ${
          prefs.tab === 'oratory'
            ? this.renderOratoryTab()
            : prefs.tab === 'schulte'
              ? this.renderSchulteTab(container)
              : this.renderRecallTab()
        }
      </div>
    `;

    bindTutorialBanners(container);

    container.querySelectorAll<HTMLButtonElement>('[data-fltab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (prefs.tab === 'oratory') this.stopSpeaking();
        lifeStore.updateModulePrefs('focuslab', {
          tab: btn.dataset.fltab as 'oratory' | 'schulte' | 'recall',
        });
        this.render(container);
      });
    });

    if (prefs.tab === 'oratory') {
      this.bindOratoryEvents(container);
    } else if (prefs.tab === 'schulte') {
      this.bindSchulteEvents(container);
    } else {
      this.bindRecallEvents(container);
    }
  }

  private bindOratoryEvents(container: HTMLElement): void {
    const prompt = ORATORY_PROMPTS[this.promptIdx % ORATORY_PROMPTS.length];

    container.querySelector('#fl-next-prompt')?.addEventListener('click', () => {
      this.stopSpeaking();
      this.promptIdx += 1;
      const nextP = ORATORY_PROMPTS[this.promptIdx % ORATORY_PROMPTS.length];
      this.speakingRemaining = nextP.durationSec;
      this.speakingElapsed = 0;
      this.transcriptText = '';
      this.fillerCounts = { eh: 0, este: 0, osea: 0, tipo: 0, bueno: 0 };
      this.render(container);
    });

    container.querySelector('#fl-next-drill')?.addEventListener('click', () => {
      this.drillIdx += 1;
      this.render(container);
    });

    container.querySelector('#fl-speak-reset')?.addEventListener('click', () => {
      this.stopSpeaking();
      this.speakingRemaining = prompt.durationSec;
      this.speakingElapsed = 0;
      this.transcriptText = '';
      this.micStatus = '';
      this.fillerCounts = { eh: 0, este: 0, osea: 0, tipo: 0, bueno: 0 };
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-filler-tap]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.fillerTap!;
        this.fillerCounts[key] = (this.fillerCounts[key] ?? 0) + 1;
        this.render(container);
      });
    });

    container.querySelector('#fl-speak-toggle')?.addEventListener('click', () => {
      if (this.speakingRunning) {
        this.stopSpeaking();
        lifeStore.recordOratorySession();
        this.micStatus = 'Sesión registrada.';
        this.render(container);
        return;
      }

      if (this.speakingRemaining <= 0) {
        this.speakingRemaining = prompt.durationSec;
        this.speakingElapsed = 0;
      }
      this.speakingRunning = true;
      this.micStatus = 'Cronómetro activo.';

      const win = window as unknown as {
        SpeechRecognition?: new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        };
        webkitSpeechRecognition?: new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        };
      };
      const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechCtor) {
        try {
          const rec = new SpeechCtor();
          rec.lang = 'es-PE';
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (ev) => {
            let full = '';
            for (let i = 0; i < ev.results.length; i++) {
              full += ' ' + ev.results[i][0].transcript;
            }
            this.transcriptText = full.trim();
            for (const f of FILLER_PATTERNS) {
              const matches = this.transcriptText.match(f.regex);
              if (matches) this.fillerCounts[f.key] = matches.length;
            }
          };
          rec.onerror = () => {
            this.micStatus = 'Sin micrófono activo (usa los contadores táctiles de muletillas).';
          };
          rec.start();
          this.speechRec = rec;
          this.micStatus = 'Escuchando en español y contando muletillas en vivo…';
        } catch {
          this.micStatus = 'Cronómetro activo (contador manual de muletillas disponible).';
        }
      } else {
        this.micStatus = 'Tu navegador no soporta dictado en vivo; usa el cronómetro y los botones +1 muletilla.';
      }

      this.speakingTimer = window.setInterval(() => {
        this.speakingElapsed += 1;
        this.speakingRemaining = Math.max(0, this.speakingRemaining - 1);
        const clockEl = container.querySelector('#fl-speaking-clock');
        if (clockEl) {
          clockEl.textContent = `${String(Math.floor(this.speakingRemaining / 60)).padStart(2, '0')}:${String(this.speakingRemaining % 60).padStart(2, '0')}`;
        }
        if (this.speakingRemaining <= 0) {
          this.stopSpeaking();
          lifeStore.recordOratorySession();
          this.micStatus = 'Tiempo completado. Sesión guardada.';
          this.render(container);
        }
      }, 1000);

      this.render(container);
    });
  }

  private bindSchulteEvents(container: HTMLElement): void {
    const size = lifeStore.get().modulePrefs.focuslab.schulteSize;
    const total = size * size;

    const resetBoard = (sz: 4 | 5 | 6) => {
      if (this.schulteInterval) {
        window.clearInterval(this.schulteInterval);
        this.schulteInterval = 0;
      }
      this.schulteNumbers = shuffleNumbers(sz * sz);
      this.schulteNext = 1;
      this.schulteErrors = 0;
      this.schulteStartMs = 0;
      this.schulteElapsedMs = 0;
      this.schulteDone = false;
      this.render(container);
    };

    container.querySelectorAll<HTMLButtonElement>('[data-schulte-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextSz = Number(btn.dataset.schulteSize) as 4 | 5 | 6;
        lifeStore.updateModulePrefs('focuslab', { schulteSize: nextSz });
        resetBoard(nextSz);
      });
    });

    container.querySelector('#fl-schulte-reset')?.addEventListener('click', () => {
      resetBoard(size);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-schulte-num]').forEach((cell) => {
      cell.addEventListener('click', () => {
        if (this.schulteDone) return;
        const val = Number(cell.dataset.schulteNum);
        if (val === 1 && this.schulteNext === 1 && !this.schulteStartMs) {
          this.schulteStartMs = performance.now();
          this.schulteInterval = window.setInterval(() => {
            this.schulteElapsedMs = performance.now() - this.schulteStartMs;
            const timerEl = container.querySelector('#fl-schulte-timer');
            if (timerEl) {
              timerEl.innerHTML = `Tiempo: <strong>${(this.schulteElapsedMs / 1000).toFixed(2)} s</strong>`;
            }
          }, 80);
        }

        if (val === this.schulteNext) {
          this.schulteNext += 1;
          if (this.schulteNext > total) {
            this.schulteDone = true;
            if (this.schulteInterval) {
              window.clearInterval(this.schulteInterval);
              this.schulteInterval = 0;
            }
            this.schulteElapsedMs = this.schulteStartMs ? performance.now() - this.schulteStartMs : 0;
            lifeStore.recordSchulteTime(this.schulteElapsedMs, size);
          }
          this.render(container);
        } else if (val > this.schulteNext) {
          this.schulteErrors += 1;
          cell.classList.add('is-wrong');
          setTimeout(() => cell.classList.remove('is-wrong'), 260);
        }
      });
    });
  }

  private bindRecallEvents(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.focuslab;
    const allCards = this.getAllCards();
    const filtered = prefs.recallDeck === 'all' ? allCards : allCards.filter((c) => c.deck === prefs.recallDeck);
    const now = Date.now();
    const dueCards = filtered.filter((c) => {
      const prog = profile.flashcardProgress[c.id];
      return !prog || prog.nextReviewAt <= now;
    });
    const activePool = dueCards.length > 0 ? dueCards : filtered;
    const card = activePool[this.recallIdx % Math.max(1, activePool.length)];

    container.querySelector('#fl-add-card-toggle')?.addEventListener('click', () => {
      this.addCardOpen = !this.addCardOpen;
      this.render(container);
    });

    container.querySelector('#fl-add-card-cancel')?.addEventListener('click', () => {
      this.addCardOpen = false;
      this.render(container);
    });

    container.querySelector('#fl-add-card-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const deck = (container.querySelector('#fl-fc-deck') as HTMLInputElement).value.trim();
      const front = (container.querySelector('#fl-fc-front') as HTMLInputElement).value.trim();
      const back = (container.querySelector('#fl-fc-back') as HTMLInputElement).value.trim();
      if (!front || !back) return;
      lifeStore.addCustomFlashcard(deck, front, back);
      this.addCardOpen = false;
      this.recallIdx = 0;
      this.recallRevealed = false;
      this.recallDraft = '';
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-deck]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.recallIdx = 0;
        this.recallRevealed = false;
        this.recallDraft = '';
        lifeStore.updateModulePrefs('focuslab', { recallDeck: btn.dataset.deck! });
        this.render(container);
      });
    });

    container.querySelector('#fl-recall-draft')?.addEventListener('input', (e) => {
      this.recallDraft = (e.target as HTMLInputElement).value;
    });

    container.querySelector('#fl-reveal-answer')?.addEventListener('click', () => {
      this.recallRevealed = true;
      this.render(container);
    });

    container.querySelector('#fl-skip-card')?.addEventListener('click', () => {
      this.recallIdx += 1;
      this.recallRevealed = false;
      this.recallDraft = '';
      this.render(container);
    });

    container.querySelector('#fl-del-card')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.cardId!;
      lifeStore.removeCustomFlashcard(id);
      this.recallRevealed = false;
      this.recallDraft = '';
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-rate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!card) return;
        lifeStore.reviewFlashcard(card.id, btn.dataset.rate as 'again' | 'good' | 'easy');
        this.recallIdx += 1;
        this.recallRevealed = false;
        this.recallDraft = '';
        this.render(container);
      });
    });
  }
}
