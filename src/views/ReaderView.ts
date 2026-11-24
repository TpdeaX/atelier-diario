import { CLASSIC_WIKISOURCE_SUGGESTIONS, READER_COMPREHENSION_PROMPTS } from '../data/KnowledgeBank';
import { Icons } from '../icons';
import { cloudSync } from '../services/CloudSync';
import { saveNotebook, savePdfBytes } from '../services/NotebookStore';
import {
  fetchRandomWikiSummary,
  fetchWikisourceFullText,
  fetchWikisourcePage,
  lookupWiktionary,
  OpenLibraryBook,
  searchOpenLibrary,
  searchWikisource,
  WikisourceArticle,
  WikisourceSearchItem,
} from '../services/OnlineApi';
import { buildBookPdf } from '../services/PdfTools';
import { lifeStore } from '../state/LifeStore';
import { DifficultyLevel, NotebookDoc } from '../types';
import { bindDidacticBar, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

const READER_TUTORIALS: Record<'wikisource' | 'wikipedia' | 'openlibrary', Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  wikisource: {
    sectionName: 'Wikisource (Textos completos)',
    summary: 'Lee clásicos en español de dominio público, define palabras al doble clic y expórtalos a PDF.',
    steps: [
      'Elige una obra de Clásicos sugeridos en la barra lateral o busca cualquier título/autor arriba.',
      'Alterna entre Lectura completa, Lectura guiada por bloques o Comprensión activa para guardar tus notas.',
      'Haz doble clic sobre cualquier palabra del texto para consultar su definición en Wikcionario.',
      'Pulsa Guardar avance o Pasar a Cuaderno PDF para subrayar a mano; todo queda sincronizado.',
    ],
    tip: 'Si una portada es índice de obra, elige cualquiera de los capítulos mostrados arriba del texto.',
  },
  wikipedia: {
    sectionName: 'Wikipedia (Curiosidades)',
    summary: 'Explora resúmenes culturales al instante para ampliar criterio y vocabulario.',
    steps: [
      'Al activar Wikipedia se carga un resumen aleatorio en español listo para leer.',
      'Activa Comprensión activa para sintetizar la idea clave y guardarla en tu historial.',
      'Haz doble clic sobre términos desconocidos para guardarlos en tu glosario personal.',
    ],
    tip: 'Leer un artículo breve de 3 minutos y resumirlo con tus palabras consolida comprensión.',
  },
  openlibrary: {
    sectionName: 'Open Library (Catálogo)',
    summary: 'Busca ediciones, autores y libros gratuitos abiertos en Internet.',
    steps: [
      'Escribe un título, tema o autor en la barra de búsqueda y pulsa Buscar.',
      'Revisa año, autor y temática de cada resultado del catálogo.',
      'Usa el botón Leer gratis cuando la obra tenga vista directa disponible.',
    ],
    tip: 'Si buscas subrayar el texto dentro de Atelier, cambia a Wikisource o usa Buscar libro en Cuaderno PDF.',
  },
};

const READER_DIFF_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Bloques de 2 párrafos en lectura guiada y preguntas de idea principal.',
  intermedio: 'Bloques de 4 párrafos con notas de conexión práctica.',
  avanzado: 'Bloques de 6 párrafos y análisis crítico de argumentos y tesis.',
};

export interface ReaderRenderOpts {
  onOpenStudio?: () => void;
}

export class ReaderView {
  private searchResults: WikisourceSearchItem[] = [];
  private openLibResults: OpenLibraryBook[] = [];
  private activeArticle: WikisourceArticle | null = null;
  private dictWord = '';
  private dictResult: { found: boolean; lines: string[] } | null = null;
  private statusText = 'Elige un clásico o busca cualquier libro o tema en español.';
  private pdfBusy = false;
  private autoLoadedLast = false;
  private guidedChunkIdx = 0;

  private chunkSizeFor(diff: DifficultyLevel): number {
    return diff === 'basico' ? 2 : diff === 'intermedio' ? 4 : 6;
  }

  public render(container: HTMLElement, opts?: ReaderRenderOpts): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.reader;
    const prog = profile.progress.reader;
    const diff = lifeStore.getDifficulty('reader');

    if (!this.autoLoadedLast && !this.activeArticle && prefs.lastArticleTitle && prefs.sourceTab === 'wikisource') {
      this.autoLoadedLast = true;
      void this.openWikisource(prefs.lastArticleTitle, container, opts);
    }

    const masteryPct = Math.min(
      100,
      Math.round((prog.readArticles.length / Math.max(12, CLASSIC_WIKISOURCE_SUGGESTIONS.length * 0.5)) * 100)
    );

    const bookmarksHtml = profile.bookmarks
      .slice(0, 8)
      .map((b) => {
        const pct = prog.scrollByTitle[b.title];
        return `<button type="button" class="al-chip-btn" data-open-ws="${b.title.replace(/"/g, '&quot;')}">${Icons.bookmark(13)}<span>${b.title}${typeof pct === 'number' ? ` (${pct}%)` : ''}</span></button>`;
      })
      .join('');

    container.innerHTML = `
      <div class="al-page al-reader-page">
        <div class="al-module-hero" style="--mod-c1: #C2591D; --mod-c2: #F4A261;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #C2591D; --em-c2: #F4A261;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.book(20)}</span>
            </div>
            <div>
              <h1>Biblioteca y Lector Online</h1>
              <p>Lee textos completos en español, entrena comprensión activa y guarda tu avance párrafo a párrafo.</p>
            </div>
          </div>
          <div class="al-reader-controls">
            <button type="button" class="al-icon-btn" id="al-font-dec" title="Reducir texto">A-</button>
            <span class="al-mono-pill" id="al-font-val">${profile.readerFontSize}px</span>
            <button type="button" class="al-icon-btn" id="al-font-inc" title="Aumentar texto">A+</button>
            <button type="button" class="al-btn al-btn-primary" id="al-mark-read">${Icons.check(16)}<span>Marcar lectura de hoy</span></button>
          </div>
        </div>

        ${renderDidacticBar({
          moduleId: 'reader',
          progressLabel: `Progreso lector (${prog.readArticles.length} textos completados)`,
          progressPct: masteryPct,
          progressDetail: `${prog.wordsRead.toLocaleString('es-PE')} palabras registradas · ${Object.keys(prog.readingNotes).length} notas guardadas`,
          difficultyHints: READER_DIFF_HINTS,
          extraMetric: `${profile.bookmarks.length} marcadores`,
        })}

        <div class="al-search-bar-row">
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${prefs.sourceTab === 'wikisource' ? 'is-active' : ''}" data-src="wikisource">Wikisource (Textos)</button>
            <button type="button" class="al-seg-btn ${prefs.sourceTab === 'wikipedia' ? 'is-active' : ''}" data-src="wikipedia">Wikipedia (Curiosidades)</button>
            <button type="button" class="al-seg-btn ${prefs.sourceTab === 'openlibrary' ? 'is-active' : ''}" data-src="openlibrary">Open Library (Catálogo)</button>
          </div>
          <form class="al-search-form" id="al-reader-search-form">
            <input type="search" id="al-reader-query" placeholder="Buscar libro, autor o tema en español..." />
            <button type="submit" class="al-btn al-btn-primary">${Icons.search(16)}<span>Buscar</span></button>
          </form>
        </div>

        <div class="al-toolbar">
          <div class="al-seg-tabs" role="group" aria-label="Modo de estudio lector">
            <button type="button" class="al-seg-btn ${prog.mode === 'lectura' ? 'is-active' : ''}" data-rmode="lectura">Lectura completa</button>
            <button type="button" class="al-seg-btn ${prog.mode === 'guiada' ? 'is-active' : ''}" data-rmode="guiada">Lectura guiada por bloques</button>
            <button type="button" class="al-seg-btn ${prog.mode === 'comprension' ? 'is-active' : ''}" data-rmode="comprension">Comprensión y notas</button>
          </div>
          <span class="al-muted">Modo actual: <strong>${prog.mode === 'lectura' ? 'Texto continuo' : prog.mode === 'guiada' ? `Bloques de ${this.chunkSizeFor(diff)} párrafos` : 'Guía de síntesis guardada'}</strong></span>
        </div>

        ${renderTutorialBanner({
          id: `reader:${prefs.sourceTab}`,
          moduleName: 'Biblioteca y Lector',
          ...(READER_TUTORIALS[prefs.sourceTab] ?? READER_TUTORIALS.wikisource),
        })}

        <div class="al-reader-layout">
          <aside class="al-reader-sidebar">
            <div class="al-panel">
              <h2>Clásicos sugeridos (${CLASSIC_WIKISOURCE_SUGGESTIONS.length})</h2>
              <div class="al-stack-list">
                ${CLASSIC_WIKISOURCE_SUGGESTIONS.map((c) => {
                  const isDone = prog.readArticles.some(
                    (a) => a.toLowerCase().includes(c.query.toLowerCase()) || c.title.toLowerCase().includes(a.toLowerCase())
                  );
                  return `
                  <button type="button" class="al-list-btn" data-suggest="${c.query}">
                    <strong>${c.title} ${isDone ? '<span class="al-mastery-badge">Leído</span>' : ''}</strong>
                    <span>${c.note}</span>
                  </button>`;
                }).join('')}
              </div>
            </div>

            ${
              bookmarksHtml
                ? `<div class="al-panel"><h2>Tus marcadores (${profile.bookmarks.length})</h2><div class="al-chip-wrap">${bookmarksHtml}</div></div>`
                : ''
            }

            <div class="al-panel">
              <h2>Diccionario en vivo (Wikcionario)</h2>
              <form class="al-dict-form" id="al-dict-form">
                <input type="text" id="al-dict-input" value="${this.dictWord}" placeholder="Escribe o haz doble clic en una palabra..." />
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

    this.bindEvents(container, opts);
    bindDidacticBar(container, 'reader', () => this.render(container, opts));
    bindTutorialBanners(container);
    this.renderResultsStrip(container, opts);
  }

  private renderDictHtml(): string {
    if (!this.dictWord) {
      return '<p class="al-muted">Consejo: haz doble clic sobre cualquier palabra mientras lees para definirla al instante.</p>';
    }
    if (!this.dictResult) {
      return `<p class="al-muted">Consultando «${this.dictWord}»...</p>`;
    }
    if (!this.dictResult.found) {
      return `<p class="al-muted">No se encontró definición directa para «${this.dictWord}». Prueba en singular o infinitivo.</p>`;
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
    const profile = lifeStore.get();
    const sourceTab = profile.modulePrefs.reader.sourceTab;
    const prog = profile.progress.reader;
    const diff = lifeStore.getDifficulty('reader');

    if (!this.activeArticle) {
      return `
        <div class="al-empty-reader">
          <h2>Tu sala de lectura</h2>
          <p>${this.statusText}</p>
        </div>
      `;
    }

    const totalParas = this.activeArticle.paragraphs.length;
    const totalWords = this.activeArticle.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
    const savedPct = prog.scrollByTitle[this.activeArticle.title] ?? 0;
    const isCompleted = prog.readArticles.includes(this.activeArticle.title);
    const savedNote = prog.readingNotes[this.activeArticle.title] ?? '';

    const subHtml = this.activeArticle.subpages.length
      ? `
      <div class="al-chapters-bar">
        <span>Capítulos y secciones relacionadas:</span>
        <div class="al-chip-wrap">
          ${this.activeArticle.subpages
            .slice(0, 14)
            .map((sp) => `<button type="button" class="al-chip-btn" data-open-ws="${sp.replace(/"/g, '&quot;')}">${sp.split('/').pop()}</button>`)
            .join('')}
        </div>
      </div>`
      : '';

    let bodyHtml = '';
    if (totalParas === 0) {
      bodyHtml = '<p class="al-muted">Esta portada es un índice de obra. Elige uno de los capítulos arriba para comenzar a leer.</p>';
    } else if (prog.mode === 'guiada') {
      const size = this.chunkSizeFor(diff);
      const totalChunks = Math.max(1, Math.ceil(totalParas / size));
      const idx = Math.max(0, Math.min(totalChunks - 1, this.guidedChunkIdx));
      this.guidedChunkIdx = idx;
      const slice = this.activeArticle.paragraphs.slice(idx * size, (idx + 1) * size);
      const chunkPct = Math.round(((idx + 1) / totalChunks) * 100);
      bodyHtml = `
        <div class="al-study-card">
          <div class="al-didactic-prog-head">
            <strong>Bloque guiado ${idx + 1} de ${totalChunks}</strong>
            <span class="al-mastery-badge">${chunkPct}% del texto</span>
          </div>
          <progress class="al-didactic-meter" value="${chunkPct}" max="100"></progress>
          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-sm" id="al-chunk-prev" ${idx === 0 ? 'disabled' : ''}>Bloque anterior</button>
            <button type="button" class="al-btn al-btn-sm al-btn-primary" id="al-chunk-next">${idx + 1 < totalChunks ? 'Siguiente bloque y guardar' : 'Finalizar texto y guardar'}</button>
          </div>
        </div>
        ${slice.map((p) => `<p>${p}</p>`).join('')}
      `;
    } else {
      bodyHtml = this.activeArticle.paragraphs.map((p) => `<p>${p}</p>`).join('');
    }

    const prompts = READER_COMPREHENSION_PROMPTS[diff];
    const comprehensionHtml =
      prog.mode === 'comprension'
        ? `
        <div class="al-study-card" style="margin-top:16px">
          <h3>Guía de comprensión (${diff === 'basico' ? 'Básico' : diff === 'intermedio' ? 'Intermedio' : 'Avanzado'})</h3>
          <ul class="al-muted" style="margin:0;padding-left:18px">
            ${prompts.map((pr) => `<li>${pr}</li>`).join('')}
          </ul>
          <label for="al-reader-note-input" style="font-size:0.85rem;font-weight:600">Tu síntesis y notas personales (se guardan por obra):</label>
          <textarea id="al-reader-note-input" class="al-inline-note" placeholder="Escribe con tus palabras qué entendiste y cómo lo aplicarás...">${savedNote.replace(/</g, '&lt;')}</textarea>
          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-primary" id="al-save-reader-note">${Icons.check(15)}<span>Guardar síntesis y completar</span></button>
          </div>
        </div>
      `
        : '';

    return `
      <div class="al-article-top">
        <div>
          <h2>${this.activeArticle.title}</h2>
          <span class="al-muted">${totalWords} palabras · Avance guardado: ${savedPct}% ${isCompleted ? '· Completado' : ''}</span>
        </div>
        <div class="al-tool-group">
          ${
            sourceTab === 'wikisource'
              ? `<button type="button" class="al-btn" id="al-send-to-studio" ${this.pdfBusy ? 'disabled' : ''}>${Icons.tablet(15)}<span>${this.pdfBusy ? 'Generando PDF...' : 'Pasar a Cuaderno PDF'}</span></button>`
              : ''
          }
          <button type="button" class="al-btn" id="al-complete-article">${Icons.check(15)}<span>${isCompleted ? 'Texto completado' : 'Marcar completado'}</span></button>
          <button type="button" class="al-btn al-btn-primary" id="al-save-bookmark">${Icons.bookmark(15)}<span>Guardar marcador</span></button>
        </div>
      </div>
      ${subHtml}
      <div class="al-article-body">${bodyHtml}</div>
      ${comprehensionHtml}
    `;
  }

  private renderResultsStrip(container: HTMLElement, opts?: ReaderRenderOpts): void {
    const strip = container.querySelector<HTMLDivElement>('#al-results-strip')!;
    const sourceTab = lifeStore.get().modulePrefs.reader.sourceTab;
    if (sourceTab === 'wikisource' && this.searchResults.length > 0) {
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
    } else if (sourceTab === 'openlibrary' && this.openLibResults.length > 0) {
      strip.innerHTML = `
        <div class="al-results-list">
          ${this.openLibResults
            .map(
              (b) => `
            <div class="al-result-item is-static">
              <strong>${b.title}</strong>
              <span>${b.author}${b.year ? ` (${b.year})` : ''}${b.subject ? ` · ${b.subject}` : ''}</span>
              ${
                b.readUrl
                  ? `<a class="al-btn al-btn-primary" href="${b.readUrl}" target="_blank" rel="noopener">Leer gratis</a>`
                  : ''
              }
            </div>`
            )
            .join('')}
        </div>
      `;
    } else {
      strip.innerHTML = '';
    }

    strip.querySelectorAll<HTMLElement>('[data-open-ws]').forEach((btn) => {
      btn.addEventListener('click', () => void this.openWikisource(btn.dataset.openWs!, container, opts));
    });
  }

  private async openWikisource(title: string, container: HTMLElement, opts?: ReaderRenderOpts): Promise<void> {
    this.statusText = `Cargando «${title}»...`;
    const paper = container.querySelector<HTMLElement>('#al-book-paper');
    if (paper) paper.innerHTML = `<p class="al-muted">${this.statusText}</p>`;
    try {
      this.activeArticle = await fetchWikisourcePage(title);
      const savedPct = lifeStore.get().progress.reader.scrollByTitle[this.activeArticle.title] ?? 0;
      const diff = lifeStore.getDifficulty('reader');
      const totalChunks = Math.max(1, Math.ceil(this.activeArticle.paragraphs.length / this.chunkSizeFor(diff)));
      this.guidedChunkIdx = Math.min(totalChunks - 1, Math.floor((savedPct / 100) * totalChunks));
      lifeStore.updateModulePrefs('reader', { sourceTab: 'wikisource', lastArticleTitle: this.activeArticle.title });
      lifeStore.markHabit('read');
      this.render(container, opts);
    } catch {
      this.statusText = 'No se pudo cargar ese texto. Verifica tu conexión e intenta de nuevo.';
      if (paper) paper.innerHTML = `<p class="al-muted">${this.statusText}</p>`;
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

  private bindEvents(container: HTMLElement, opts?: ReaderRenderOpts): void {
    container.querySelector('#al-font-dec')?.addEventListener('click', () => {
      lifeStore.setReaderFontSize(lifeStore.get().readerFontSize - 1);
      this.render(container, opts);
    });
    container.querySelector('#al-font-inc')?.addEventListener('click', () => {
      lifeStore.setReaderFontSize(lifeStore.get().readerFontSize + 1);
      this.render(container, opts);
    });
    container.querySelector('#al-mark-read')?.addEventListener('click', () => {
      if (this.activeArticle) {
        const words = this.activeArticle.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
        lifeStore.recordReaderArticle(this.activeArticle.title, words);
      } else {
        lifeStore.markHabit('read');
      }
      this.render(container, opts);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-rmode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.rmode as 'lectura' | 'guiada' | 'comprension';
        lifeStore.updateProgress('reader', { mode });
        this.render(container, opts);
      });
    });

    container.querySelector('#al-chunk-prev')?.addEventListener('click', () => {
      if (!this.activeArticle) return;
      this.guidedChunkIdx = Math.max(0, this.guidedChunkIdx - 1);
      const diff = lifeStore.getDifficulty('reader');
      const totalChunks = Math.max(1, Math.ceil(this.activeArticle.paragraphs.length / this.chunkSizeFor(diff)));
      lifeStore.saveReaderScroll(this.activeArticle.title, ((this.guidedChunkIdx + 1) / totalChunks) * 100);
      this.render(container, opts);
    });

    container.querySelector('#al-chunk-next')?.addEventListener('click', () => {
      if (!this.activeArticle) return;
      const diff = lifeStore.getDifficulty('reader');
      const totalChunks = Math.max(1, Math.ceil(this.activeArticle.paragraphs.length / this.chunkSizeFor(diff)));
      if (this.guidedChunkIdx + 1 < totalChunks) {
        this.guidedChunkIdx += 1;
        lifeStore.saveReaderScroll(this.activeArticle.title, ((this.guidedChunkIdx + 1) / totalChunks) * 100);
      } else {
        const words = this.activeArticle.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
        lifeStore.saveReaderScroll(this.activeArticle.title, 100);
        lifeStore.recordReaderArticle(this.activeArticle.title, words);
      }
      this.render(container, opts);
    });

    container.querySelector('#al-complete-article')?.addEventListener('click', () => {
      if (!this.activeArticle) return;
      const words = this.activeArticle.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
      lifeStore.saveReaderScroll(this.activeArticle.title, 100);
      lifeStore.recordReaderArticle(this.activeArticle.title, words);
      this.render(container, opts);
    });

    container.querySelector('#al-save-reader-note')?.addEventListener('click', () => {
      if (!this.activeArticle) return;
      const note = container.querySelector<HTMLTextAreaElement>('#al-reader-note-input')?.value ?? '';
      lifeStore.saveReaderNote(this.activeArticle.title, note);
      const words = this.activeArticle.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
      const score = note.trim().length >= 40 ? 100 : note.trim().length >= 15 ? 80 : 60;
      lifeStore.recordReaderArticle(this.activeArticle.title, words, score);
      this.render(container, opts);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-src]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nextTab = btn.dataset.src as 'wikisource' | 'wikipedia' | 'openlibrary';
        lifeStore.updateModulePrefs('reader', { sourceTab: nextTab });
        if (nextTab === 'wikipedia') {
          this.statusText = 'Obteniendo artículo aleatorio de Wikipedia...';
          this.activeArticle = null;
          this.render(container, opts);
          try {
            const sum = await fetchRandomWikiSummary();
            this.activeArticle = {
              title: sum.title,
              paragraphs: [sum.extract],
              subpages: [],
            };
            this.guidedChunkIdx = 0;
            lifeStore.markHabit('read');
          } catch {
            this.statusText = 'No se pudo consultar Wikipedia ahora.';
          }
        }
        this.render(container, opts);
      });
    });

    container.querySelector('#al-reader-search-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = container.querySelector<HTMLInputElement>('#al-reader-query')!;
      const q = input.value.trim();
      if (!q) return;
      const tab = lifeStore.get().modulePrefs.reader.sourceTab;
      if (tab === 'openlibrary') {
        this.openLibResults = await searchOpenLibrary(q).catch(() => []);
      } else {
        lifeStore.updateModulePrefs('reader', { sourceTab: 'wikisource' });
        this.searchResults = await searchWikisource(q).catch(() => []);
      }
      this.render(container, opts);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-suggest]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        lifeStore.updateModulePrefs('reader', { sourceTab: 'wikisource' });
        this.searchResults = await searchWikisource(btn.dataset.suggest!).catch(() => []);
        if (this.searchResults.length > 0) {
          await this.openWikisource(this.searchResults[0].title, container, opts);
        } else {
          this.render(container, opts);
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-open-ws]').forEach((btn) => {
      btn.addEventListener('click', () => void this.openWikisource(btn.dataset.openWs!, container, opts));
    });

    container.querySelector('#al-save-bookmark')?.addEventListener('click', () => {
      if (!this.activeArticle) return;
      const tab = lifeStore.get().modulePrefs.reader.sourceTab;
      lifeStore.saveBookmark({
        source: tab === 'wikipedia' ? 'wikipedia' : 'wikisource',
        title: this.activeArticle.title,
        excerpt: this.activeArticle.paragraphs[0]?.slice(0, 120) ?? '',
      });
      this.render(container, opts);
    });

    container.querySelector('#al-send-to-studio')?.addEventListener('click', async () => {
      if (!this.activeArticle || this.pdfBusy) return;
      this.pdfBusy = true;
      this.render(container, opts);
      try {
        const full = await fetchWikisourceFullText(this.activeArticle.title, 40);
        const sections = full.sections.length
          ? full.sections
          : [{ heading: this.activeArticle.title, text: this.activeArticle.paragraphs.join('\n\n') }];
        const { bytes, pages } = await buildBookPdf(
          full.title || this.activeArticle.title,
          sections,
          'Wikisource en español · Generado para subrayar en Atelier Diario'
        );
        const id = `pdf-${Date.now()}`;
        await savePdfBytes(id, bytes);
        let storagePath: string | undefined;
        if (cloudSync.isConfigured()) {
          storagePath = (await cloudSync.uploadPdf(id, bytes)) ?? undefined;
        }
        const doc: NotebookDoc = {
          id,
          title: (full.title || this.activeArticle.title).slice(0, 80),
          kind: 'pdf',
          paper: 'pdf',
          pageCount: pages,
          pages: {},
          pdfStoragePath: storagePath,
          updatedAt: Date.now(),
        };
        await saveNotebook(doc);
        lifeStore.updateModulePrefs('studio', { activeId: id, currentPage: 1 });
        void cloudSync.pushNotebook(doc);
        this.pdfBusy = false;
        opts?.onOpenStudio?.();
      } catch {
        this.pdfBusy = false;
        this.render(container, opts);
      }
    });

    container.querySelector('#al-dict-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const w = container.querySelector<HTMLInputElement>('#al-dict-input')!.value;
      void this.runDictLookup(w, container);
    });

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
