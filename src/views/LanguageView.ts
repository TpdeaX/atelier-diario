import { ORTHOGRAPHY_BANK, VOCABULARY_DECK } from '../data/KnowledgeBank';
import { Icons } from '../icons';
import { lookupWiktionary } from '../services/OnlineApi';
import { lifeStore } from '../state/LifeStore';

export class LanguageView {
  private tab: 'ortho' | 'vocab' | 'dict' = 'ortho';
  private orthoIdx = 0;
  private orthoPicked: number | null = null;
  private vocabIdx = 0;
  private dictQuery = '';
  private dictLines: string[] = [];
  private dictStatus = 'Busca cualquier palabra en español y consulta su definición real en Wikcionario.';

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const acc =
      profile.stats.orthographyTotal > 0
        ? Math.round((profile.stats.orthographyCorrect / profile.stats.orthographyTotal) * 100)
        : 100;

    let bodyHtml = '';
    if (this.tab === 'ortho') {
      bodyHtml = this.renderOrthoHtml();
    } else if (this.tab === 'vocab') {
      bodyHtml = this.renderVocabHtml();
    } else {
      bodyHtml = this.renderDictHtml();
    }

    container.innerHTML = `
      <div class="al-page">
        <div class="al-page-head">
          <div>
            <h1>Ortografía, Vocabulario y Elocuencia</h1>
            <p>Domina tildes y dudas frecuentes, enriquece tu forma de hablar y guarda palabras nuevas desde Wikcionario.</p>
          </div>
          <div class="al-mono-pill">Aciertos: ${profile.stats.orthographyCorrect}/${profile.stats.orthographyTotal} (${acc}%)</div>
        </div>

        <div class="al-seg-tabs">
          <button type="button" class="al-seg-btn ${this.tab === 'ortho' ? 'is-active' : ''}" data-ltab="ortho">Reto de ortografía</button>
          <button type="button" class="al-seg-btn ${this.tab === 'vocab' ? 'is-active' : ''}" data-ltab="vocab">Vocabulario útil (${VOCABULARY_DECK.length})</button>
          <button type="button" class="al-seg-btn ${this.tab === 'dict' ? 'is-active' : ''}" data-ltab="dict">Diccionario vivo y Glosario (${profile.savedWords.length})</button>
        </div>

        ${bodyHtml}
      </div>
    `;

    this.bindEvents(container);
  }

  private renderOrthoHtml(): string {
    const q = ORTHOGRAPHY_BANK[this.orthoIdx % ORTHOGRAPHY_BANK.length];
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
          <span class="al-mono-pill">Pregunta ${(this.orthoIdx % ORTHOGRAPHY_BANK.length) + 1} / ${ORTHOGRAPHY_BANK.length}</span>
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

  private renderVocabHtml(): string {
    const item = VOCABULARY_DECK[this.vocabIdx % VOCABULARY_DECK.length];
    const alreadySaved = lifeStore
      .get()
      .savedWords.some((w) => w.word.toLowerCase() === item.word.toLowerCase());

    return `
      <div class="al-panel al-vocab-card">
        <div class="al-card-head">
          <span class="al-mono-pill">Tarjeta ${(this.vocabIdx % VOCABULARY_DECK.length) + 1} / ${VOCABULARY_DECK.length}</span>
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
        this.tab = btn.dataset.ltab as typeof this.tab;
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.opt!, 10);
        this.orthoPicked = idx;
        const q = ORTHOGRAPHY_BANK[this.orthoIdx % ORTHOGRAPHY_BANK.length];
        lifeStore.recordOrthography(idx === q.correctIndex);
        this.render(container);
      });
    });

    container.querySelector('#al-ortho-next')?.addEventListener('click', () => {
      this.orthoIdx += 1;
      this.orthoPicked = null;
      this.render(container);
    });

    container.querySelector('#al-vocab-prev')?.addEventListener('click', () => {
      this.vocabIdx = (this.vocabIdx - 1 + VOCABULARY_DECK.length) % VOCABULARY_DECK.length;
      this.render(container);
    });
    container.querySelector('#al-vocab-next')?.addEventListener('click', () => {
      this.vocabIdx = (this.vocabIdx + 1) % VOCABULARY_DECK.length;
      lifeStore.markHabit('language');
      this.render(container);
    });
    container.querySelector('#al-vocab-save')?.addEventListener('click', () => {
      const item = VOCABULARY_DECK[this.vocabIdx % VOCABULARY_DECK.length];
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
