import { ORTHOGRAPHY_BANK, VOCABULARY_DECK } from '../data/KnowledgeBank';
import { Icons } from '../icons';
import { lookupWiktionary } from '../services/OnlineApi';
import { lifeStore } from '../state/LifeStore';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

const LANGUAGE_TUTORIALS: Record<'ortho' | 'vocab' | 'dict', Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  ortho: {
    sectionName: 'Reto de ortografía',
    summary: 'Domina tildes, homófonos y reglas reales del español respondiendo casos prácticos.',
    steps: [
      'Lee la frase completa y elige la opción que llena correctamente el espacio en blanco.',
      'Revisa la regla explicada al responder para fijar el criterio, no solo memorizar.',
      'Pulsa Siguiente pregunta para recorrer el banco de preguntas y subir tu porcentaje de aciertos.',
    ],
    tip: 'Cuando falles una duda frecuente (como a ver / haber o sino / si no), invéntate una frase propia en voz alta.',
  },
  vocab: {
    sectionName: 'Vocabulario útil',
    summary: 'Incorpora palabras precisas que reemplazan expresiones genéricas al hablar y redactar.',
    steps: [
      'Lee la palabra, su definición y la expresión cotidiana que puede reemplazar.',
      'Lee el ejemplo en voz alta e intenta crear una oración aplicable a tu día.',
      'Pulsa Guardar en glosario en las palabras que quieras repasar después.',
    ],
    tip: 'Adopta solo 1 palabra nueva cada dos días y úsala en un mensaje real para fijarla de verdad.',
  },
  dict: {
    sectionName: 'Diccionario vivo y Glosario',
    summary: 'Consulta definiciones en vivo en Wikcionario y construye tu propio léxico personal.',
    steps: [
      'Escribe cualquier palabra en el buscador izquierdo y pulsa Buscar.',
      'Si te resulta útil, pulsa Guardar para sumarla a tu glosario sincronizado a la derecha.',
      'Depura tu glosario eliminando las palabras que ya dominas con naturalidad.',
    ],
    tip: 'Si un verbo conjugado no devuelve resultado, búscalo en infinitivo o en singular.',
  },
};

export class LanguageView {
  private orthoPicked: number | null = null;
  private dictQuery = '';
  private dictLines: string[] = [];
  private dictStatus = 'Busca cualquier palabra en español y consulta su definición real en Wikcionario.';

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.language;
    const acc =
      profile.stats.orthographyTotal > 0
        ? Math.round((profile.stats.orthographyCorrect / profile.stats.orthographyTotal) * 100)
        : 100;

    let bodyHtml = '';
    if (prefs.tab === 'ortho') {
      bodyHtml = this.renderOrthoHtml(prefs.orthoIdx);
    } else if (prefs.tab === 'vocab') {
      bodyHtml = this.renderVocabHtml(prefs.vocabIdx);
    } else {
      bodyHtml = this.renderDictHtml();
    }

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #B45309; --mod-c2: #FBBF24;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #B45309; --em-c2: #FBBF24;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.spell(20)}</span>
            </div>
            <div>
              <h1>Ortografía, Vocabulario y Elocuencia</h1>
              <p>Domina tildes y dudas frecuentes, reemplaza muletillas y guarda palabras en tu glosario sincronizado.</p>
            </div>
          </div>
          <div class="al-mono-pill">Aciertos: ${profile.stats.orthographyCorrect}/${profile.stats.orthographyTotal} (${acc}%)</div>
        </div>

        <div class="al-seg-tabs">
          <button type="button" class="al-seg-btn ${prefs.tab === 'ortho' ? 'is-active' : ''}" data-ltab="ortho">Reto de ortografía (${ORTHOGRAPHY_BANK.length})</button>
          <button type="button" class="al-seg-btn ${prefs.tab === 'vocab' ? 'is-active' : ''}" data-ltab="vocab">Vocabulario útil (${VOCABULARY_DECK.length})</button>
          <button type="button" class="al-seg-btn ${prefs.tab === 'dict' ? 'is-active' : ''}" data-ltab="dict">Diccionario vivo y Glosario (${profile.savedWords.length})</button>
        </div>

        ${renderTutorialBanner({
          id: `language:${prefs.tab}`,
          moduleName: 'Ortografía y Léxico',
          ...(LANGUAGE_TUTORIALS[prefs.tab] ?? LANGUAGE_TUTORIALS.ortho),
        })}

        ${bodyHtml}
      </div>
    `;

    this.bindEvents(container);
    bindTutorialBanners(container);
  }

  private renderOrthoHtml(orthoIdx: number): string {
    const q = ORTHOGRAPHY_BANK[orthoIdx % ORTHOGRAPHY_BANK.length];
    const answered = this.orthoPicked !== null;
    const isCorrect = answered && this.orthoPicked === q.correctIndex;

    const optionsHtml = q.options
      .map((opt, idx) => {
        let cls = 'al-quiz-opt';
        if (answered) {
          if (idx === q.correctIndex) cls += ' is-correct';
          else if (idx === this.orthoPicked) cls += ' is-wrong';
        }
        return `<button type="button" class="${cls}" data-opt="${idx}" ${answered ? 'disabled' : ''}>${opt}</button>`;
      })
      .join('');

    return `
      <div class="al-panel al-quiz-card">
        <div class="al-card-head">
          <span class="al-mono-pill">Pregunta ${(orthoIdx % ORTHOGRAPHY_BANK.length) + 1} / ${ORTHOGRAPHY_BANK.length}</span>
        </div>
        <p class="al-quiz-sentence">${q.sentence.replace('___', '<span class="al-blank">______</span>')}</p>
        <div class="al-quiz-options">${optionsHtml}</div>
        ${
          answered
            ? `
          <div class="al-rule-box ${isCorrect ? 'is-ok' : 'is-warn'}">
            <strong>${isCorrect ? 'Correcto.' : `La forma correcta es «${q.options[q.correctIndex]}».`}</strong>
            <p>${q.rule}</p>
            <button type="button" class="al-btn al-btn-primary" id="al-ortho-next">Siguiente pregunta</button>
          </div>`
            : ''
        }
      </div>
    `;
  }

  private renderVocabHtml(vocabIdx: number): string {
    const item = VOCABULARY_DECK[vocabIdx % VOCABULARY_DECK.length];
    const alreadySaved = lifeStore
      .get()
      .savedWords.some((w) => w.word.toLowerCase() === item.word.toLowerCase());

    return `
      <div class="al-panel al-vocab-card">
        <div class="al-card-head">
          <span class="al-mono-pill">Tarjeta ${(vocabIdx % VOCABULARY_DECK.length) + 1} / ${VOCABULARY_DECK.length}</span>
          ${item.replaces ? `<span class="al-muted">Eleva expresiones como: «${item.replaces}»</span>` : ''}
        </div>
        <h2 class="al-vocab-word">${item.word}</h2>
        <p class="al-vocab-meaning">${item.meaning}</p>
        <p class="al-vocab-example"><strong>En una frase:</strong> «${item.example}»</p>
        <div class="al-tool-group">
          <button type="button" class="al-btn" id="al-vocab-prev">Anterior</button>
          <button type="button" class="al-btn" id="al-vocab-save">${Icons.bookmark(15)}<span>${alreadySaved ? 'Ya está en tu glosario' : 'Guardar en glosario'}</span></button>
          <button type="button" class="al-btn al-btn-primary" id="al-vocab-next">Siguiente palabra</button>
        </div>
      </div>
    `;
  }

  private renderDictHtml(): string {
    const saved = lifeStore.get().savedWords;
    return `
      <div class="al-two-col">
        <div class="al-panel">
          <h2>Consultar en Wikcionario (En vivo)</h2>
          <form class="al-search-form" id="al-lang-dict-form">
            <input type="text" id="al-lang-dict-input" value="${this.dictQuery}" placeholder="Ej. elocuencia, resiliencia, procrastinar..." />
            <button type="submit" class="al-btn al-btn-primary">${Icons.search(15)}<span>Buscar</span></button>
          </form>
          <div class="al-dict-box">
            <p class="al-muted">${this.dictStatus}</p>
            ${
              this.dictLines.length > 0
                ? `<ul class="al-dict-lines">${this.dictLines.map((l) => `<li>${l}</li>`).join('')}</ul>
                   <button type="button" class="al-btn" id="al-lang-save-found">${Icons.bookmark(15)}<span>Guardar «${this.dictQuery}»</span></button>`
                : ''
            }
          </div>
        </div>

        <div class="al-panel">
          <h2>Tu glosario personal (${saved.length})</h2>
          ${
            saved.length === 0
              ? '<p class="al-muted">Aún no guardaste palabras. Añádelas desde las tarjetas de vocabulario o el buscador.</p>'
              : `<div class="al-glossary-list">
                  ${saved
                    .map(
                      (s) => `
                    <div class="al-glossary-item">
                      <div>
                        <strong>${s.word}</strong>
                        <p>${s.definition}</p>
                      </div>
                      <button type="button" class="al-icon-btn" data-del-word="${s.word.replace(/"/g, '&quot;')}" title="Quitar">${Icons.trash(14)}</button>
                    </div>`
                    )
                    .join('')}
                </div>`
          }
        </div>
      </div>
    `;
  }

  private bindEvents(container: HTMLElement): void {
    container.querySelectorAll<HTMLButtonElement>('[data-ltab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.updateModulePrefs('language', {
          tab: btn.dataset.ltab as 'ortho' | 'vocab' | 'dict',
        });
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.opt!, 10);
        this.orthoPicked = idx;
        const orthoIdx = lifeStore.get().modulePrefs.language.orthoIdx;
        const q = ORTHOGRAPHY_BANK[orthoIdx % ORTHOGRAPHY_BANK.length];
        lifeStore.recordOrthography(idx === q.correctIndex);
        this.render(container);
      });
    });

    container.querySelector('#al-ortho-next')?.addEventListener('click', () => {
      const orthoIdx = lifeStore.get().modulePrefs.language.orthoIdx;
      lifeStore.updateModulePrefs('language', { orthoIdx: (orthoIdx + 1) % ORTHOGRAPHY_BANK.length });
      this.orthoPicked = null;
      this.render(container);
    });

    container.querySelector('#al-vocab-prev')?.addEventListener('click', () => {
      const vocabIdx = lifeStore.get().modulePrefs.language.vocabIdx;
      lifeStore.updateModulePrefs('language', {
        vocabIdx: (vocabIdx - 1 + VOCABULARY_DECK.length) % VOCABULARY_DECK.length,
      });
      this.render(container);
    });
    container.querySelector('#al-vocab-next')?.addEventListener('click', () => {
      const vocabIdx = lifeStore.get().modulePrefs.language.vocabIdx;
      lifeStore.updateModulePrefs('language', {
        vocabIdx: (vocabIdx + 1) % VOCABULARY_DECK.length,
      });
      lifeStore.markHabit('language');
      this.render(container);
    });
    container.querySelector('#al-vocab-save')?.addEventListener('click', () => {
      const vocabIdx = lifeStore.get().modulePrefs.language.vocabIdx;
      const item = VOCABULARY_DECK[vocabIdx % VOCABULARY_DECK.length];
      lifeStore.saveWord(item.word, item.meaning);
      this.render(container);
    });

    container.querySelector('#al-lang-dict-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = container.querySelector<HTMLInputElement>('#al-lang-dict-input')!.value.trim();
      if (!val) return;
      this.dictQuery = val;
      this.dictLines = [];
      this.dictStatus = `Consultando «${val}» en Wikcionario...`;
      this.render(container);
      try {
        const res = await lookupWiktionary(val);
        if (res.found) {
          this.dictStatus = `Definiciones encontradas para «${res.word}»:`;
          this.dictLines = res.lines;
        } else {
          this.dictStatus = `No apareció entrada directa para «${val}». Prueba en minúscula o singular.`;
        }
      } catch {
        this.dictStatus = 'Error de red al consultar Wikcionario.';
      }
      this.render(container);
    });

    container.querySelector('#al-lang-save-found')?.addEventListener('click', () => {
      if (this.dictQuery && this.dictLines.length > 0) {
        lifeStore.saveWord(this.dictQuery, this.dictLines[0]);
        this.render(container);
      }
    });

    container.querySelectorAll<HTMLButtonElement>('[data-del-word]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.removeWord(btn.dataset.delWord!);
        this.render(container);
      });
    });
  }
}
