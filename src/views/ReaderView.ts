import { CLASSIC_WIKISOURCE_SUGGESTIONS } from '../data/KnowledgeBank';
import { Icons } from '../icons';
import {
  fetchRandomWikiSummary,
  fetchWikisourcePage,
  lookupWiktionary,
  OpenLibraryBook,
  searchOpenLibrary,
  searchWikisource,
  WikisourceArticle,
  WikisourceSearchItem,
} from '../services/OnlineApi';
import { lifeStore } from '../state/LifeStore';

export class ReaderView {
  private sourceTab: 'wikisource' | 'wikipedia' | 'openlibrary' = 'wikisource';
  private searchResults: WikisourceSearchItem[] = [];
  private openLibResults: OpenLibraryBook[] = [];
  private activeArticle: WikisourceArticle | null = null;
  private dictWord = '';
  private dictResult: { found: boolean; lines: string[] } | null = null;
  private statusText = 'Elige un clásico o busca cualquier libro/tema arriba.';

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const bookmarksHtml = profile.bookmarks
      .slice(0, 4)
      .map(
        (b) =>
          `<button type="button" class="al-chip-btn" data-open-ws="${b.title.replace(/"/g, '&quot;')}">${Icons.bookmark(13)}<span>${b.title}</span></button>`
      )
      .join('');

    container.innerHTML = `
      <div class="al-page al-reader-page">
        <div class="al-page-head">
          <div>
            <h1>Biblioteca y Lector Online</h1>
            <p>Lee textos completos en español desde Wikisource, descubre temas de Wikipedia y consulta palabras al instante en Wikcionario.</p>
          </div>
          <div class="al-reader-controls">
            <button type="button" class="al-icon-btn" id="al-font-dec" title="Reducir texto">A-</button>
            <span class="al-mono-pill" id="al-font-val">${profile.readerFontSize}px</span>
            <button type="button" class="al-icon-btn" id="al-font-inc" title="Aumentar texto">A+</button>
            <button type="button" class="al-btn al-btn-primary" id="al-mark-read">${Icons.check(16)}<span>Marcar lectura de hoy</span></button>
          </div>
        </div>

        <div class="al-search-bar-row">
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${this.sourceTab === 'wikisource' ? 'is-active' : ''}" data-src="wikisource">Wikisource (Textos)</button>
            <button type="button" class="al-seg-btn ${this.sourceTab === 'wikipedia' ? 'is-active' : ''}" data-src="wikipedia">Wikipedia (Curiosidades)</button>
            <button type="button" class="al-seg-btn ${this.sourceTab === 'openlibrary' ? 'is-active' : ''}" data-src="openlibrary">Open Library (Catálogo)</button>
          </div>
          <form class="al-search-form" id="al-reader-search-form">
            <input type="search" id="al-reader-query" placeholder="Buscar libro, autor o tema en español..." />
            <button type="submit" class="al-btn al-btn-primary">${Icons.search(16)}<span>Buscar</span></button>
          </form>
        </div>

        <div class="al-reader-layout">
          <aside class="al-reader-sidebar">
            <div class="al-panel">
              <h2>Clásicos sugeridos</h2>
              <div class="al-stack-list">
                ${CLASSIC_WIKISOURCE_SUGGESTIONS.map(
                  (c) => `
                  <button type="button" class="al-list-btn" data-suggest="${c.query}">
                    <strong>${c.title}</strong>
                    <span>${c.note}</span>
                  </button>`
                ).join('')}
              </div>
            </div>

            ${
              bookmarksHtml
                ? `<div class="al-panel"><h2>Tus marcadores</h2><div class="al-chip-wrap">${bookmarksHtml}</div></div>`
                : ''
            }

            <div class="al-panel">
              <h2>Diccionario en vivo (Wikcionario)</h2>
              <form class="al-dict-form" id="al-dict-form">
                <input type="text" id="al-dict-input" value="${this.dictWord}" placeholder="Escribe o selecciona una palabra..." />
                <button type="submit" class="al-btn">Definir</button>
              </form>
              <div id="al-dict-output" class="al-dict-output">
                ${this.renderDictHtml()}
              </div>
            </div>
          </aside>

          <section class="al-reader-main al-panel">
            <div id="al-results-strip"></div>
            <article class="al-book-paper" id="al-book-paper" style="font-size: ${profile.readerFontSize}px">
              ${this.renderArticleHtml()}
            </article>
          </section>
        </div>
      </div>
    `;

    this.bindEvents(container);
    this.renderResultsStrip(container);
  }

  private renderDictHtml(): string {
    if (!this.dictWord) {
      return '<p class="al-muted">Consejo: haz doble clic sobre cualquier palabra mientras lees para buscar su significado.</p>';
    }
    if (!this.dictResult) {
      return `<p class="al-muted">Consultando «${this.dictWord}»...</p>`;
    }
    if (!this.dictResult.found) {
      return `<p class="al-muted">No se encontró definición directa para «${this.dictWord}». Prueba con la palabra en singular o infinitivo.</p>`;
    }
    return `
      <div class="al-dict-head">
        <strong>${this.dictWord}</strong>
        <button type="button" class="al-link-btn" id="al-save-dict-word">Guardar en mi léxico</button>
      </div>
      <ul class="al-dict-lines">${this.dictResult.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
    `;
  }

  private renderArticleHtml(): string {
    if (!this.activeArticle) {
      return `
        <div class="al-empty-reader">
          <h2>Tu sala de lectura</h2>
          <p>${this.statusText}</p>
        </div>
      `;
    }

    const subHtml = this.activeArticle.subpages.length
      ? `
      <div class="al-chapters-bar">
        <span>Capítulos / Secciones relacionadas:</span>
        <div class="al-chip-wrap">
          ${this.activeArticle.subpages
            .slice(0, 12)
            .map((sp) => `<button type="button" class="al-chip-btn" data-open-ws="${sp.replace(/"/g, '&quot;')}">${sp.split('/').pop()}</button>`)
            .join('')}
        </div>
      </div>`
      : '';

    const bodyHtml = this.activeArticle.paragraphs.length
      ? this.activeArticle.paragraphs.map((p) => `<p>${p}</p>`).join('')
      : '<p class="al-muted">Esta portada es un índice de obra. Elige uno de los capítulos arriba para comenzar a leer.</p>';

    return `
      <div class="al-article-top">
        <h2>${this.activeArticle.title}</h2>
        <button type="button" class="al-btn" id="al-save-bookmark">${Icons.bookmark(15)}<span>Guardar marcador</span></button>
      </div>
      ${subHtml}
      <div class="al-article-body">${bodyHtml}</div>
    `;
  }

  private renderResultsStrip(container: HTMLElement): void {
    const strip = container.querySelector<HTMLDivElement>('#al-results-strip')!;
    if (this.sourceTab === 'wikisource' && this.searchResults.length > 0) {
      strip.innerHTML = `
        <div class="al-results-list">
          ${this.searchResults
            .slice(0, 6)
            .map(
              (r) => `
            <button type="button" class="al-result-item" data-open-ws="${r.title.replace(/"/g, '&quot;')}">
              <strong>${r.title}</strong>
              <span>${r.snippet.slice(0, 110)}…</span>
            </button>`
            )
            .join('')}
        </div>
      `;
    } else if (this.sourceTab === 'openlibrary' && this.openLibResults.length > 0) {
      strip.innerHTML = `
        <div class="al-results-list">
          ${this.openLibResults
            .map(
              (b) => `
            <div class="al-result-item is-static">
              <strong>${b.title}</strong>
              <span>${b.author}${b.year ? ` (${b.year})` : ''}${b.subject ? ` · ${b.subject}` : ''}</span>
            </div>`
            )
            .join('')}
        </div>
      `;
    } else {
      strip.innerHTML = '';
    }

    strip.querySelectorAll<HTMLElement>('[data-open-ws]').forEach((btn) => {
      btn.addEventListener('click', () => void this.openWikisource(btn.dataset.openWs!, container));
    });
  }

  private async openWikisource(title: string, container: HTMLElement): Promise<void> {
    this.statusText = `Cargando «${title}»...`;
    const paper = container.querySelector<HTMLElement>('#al-book-paper')!;
    paper.innerHTML = `<p class="al-muted">${this.statusText}</p>`;
    try {
      this.activeArticle = await fetchWikisourcePage(title);
      lifeStore.markHabit('read');
      this.render(container);
    } catch {
      this.statusText = 'No se pudo cargar ese texto. Verifica tu conexión e intenta de nuevo.';
      paper.innerHTML = `<p class="al-muted">${this.statusText}</p>`;
    }
  }

  private async runDictLookup(word: string, container: HTMLElement): Promise<void> {
    const clean = word.trim();
    if (!clean) return;
    this.dictWord = clean;
    this.dictResult = null;
    const out = container.querySelector<HTMLDivElement>('#al-dict-output')!;
    out.innerHTML = this.renderDictHtml();
    try {
      const res = await lookupWiktionary(clean);
      this.dictWord = res.word || clean;
      this.dictResult = { found: res.found, lines: res.lines };
    } catch {
      this.dictResult = { found: false, lines: [] };
    }
    out.innerHTML = this.renderDictHtml();
    out.querySelector('#al-save-dict-word')?.addEventListener('click', () => {
      if (this.dictResult?.found) {
        lifeStore.saveWord(this.dictWord, this.dictResult.lines[0] ?? 'Definición guardada');
        const btn = out.querySelector('#al-save-dict-word');
        if (btn) btn.textContent = 'Guardada en tu léxico';
      }
    });
  }

  private bindEvents(container: HTMLElement): void {
    container.querySelector('#al-font-dec')?.addEventListener('click', () => {
      lifeStore.setReaderFontSize(lifeStore.get().readerFontSize - 1);
      this.render(container);
    });
    container.querySelector('#al-font-inc')?.addEventListener('click', () => {
      lifeStore.setReaderFontSize(lifeStore.get().readerFontSize + 1);
      this.render(container);
    });
    container.querySelector('#al-mark-read')?.addEventListener('click', () => {
      lifeStore.markHabit('read');
      const btn = container.querySelector('#al-mark-read span');
      if (btn) btn.textContent = 'Lectura registrada hoy';
    });

    container.querySelectorAll<HTMLButtonElement>('[data-src]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        this.sourceTab = btn.dataset.src as typeof this.sourceTab;
        if (this.sourceTab === 'wikipedia') {
          this.statusText = 'Obteniendo artículo aleatorio de Wikipedia...';
          this.activeArticle = null;
          this.render(container);
          try {
            const sum = await fetchRandomWikiSummary();
            this.activeArticle = {
              title: sum.title,
              paragraphs: [sum.extract],
              subpages: [],
            };
            lifeStore.markHabit('read');
          } catch {
            this.statusText = 'No se pudo consultar Wikipedia ahora.';
          }
        }
        this.render(container);
      });
    });

    container.querySelector('#al-reader-search-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = container.querySelector<HTMLInputElement>('#al-reader-query')!;
      const q = input.value.trim();
      if (!q) return;
      if (this.sourceTab === 'openlibrary') {
        this.openLibResults = await searchOpenLibrary(q).catch(() => []);
      } else {
        this.sourceTab = 'wikisource';
        this.searchResults = await searchWikisource(q).catch(() => []);
      }
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-suggest]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        this.sourceTab = 'wikisource';
        this.searchResults = await searchWikisource(btn.dataset.suggest!).catch(() => []);
        if (this.searchResults.length > 0) {
          await this.openWikisource(this.searchResults[0].title, container);
        } else {
          this.render(container);
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-open-ws]').forEach((btn) => {
      btn.addEventListener('click', () => void this.openWikisource(btn.dataset.openWs!, container));
    });

    container.querySelector('#al-save-bookmark')?.addEventListener('click', () => {
      if (!this.activeArticle) return;
      lifeStore.saveBookmark({
        source: this.sourceTab === 'wikipedia' ? 'wikipedia' : 'wikisource',
        title: this.activeArticle.title,
        excerpt: this.activeArticle.paragraphs[0]?.slice(0, 120) ?? '',
      });
      this.render(container);
    });

    container.querySelector('#al-dict-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const w = container.querySelector<HTMLInputElement>('#al-dict-input')!.value;
      void this.runDictLookup(w, container);
    });

    // Double-click any word in the reader paper to look it up on Wiktionary!
    container.querySelector('#al-book-paper')?.addEventListener('dblclick', () => {
      const sel = window.getSelection()?.toString().trim() ?? '';
      if (sel && !sel.includes(' ')) {
        const inp = container.querySelector<HTMLInputElement>('#al-dict-input');
        if (inp) inp.value = sel;
        void this.runDictLookup(sel, container);
      }
    });
  }
}
