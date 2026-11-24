import { CLASSIC_WIKISOURCE_SUGGESTIONS, READER_COMPREHENSION_PROMPTS } from '../data/KnowledgeBank';
import { Icons } from '../icons';
import { cloudSync } from '../services/CloudSync';
import { listNotebooks, saveNotebook, savePdfBytes } from '../services/NotebookStore';
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
import { BoardTextElement, DifficultyLevel, NotebookDoc } from '../types';
import { bindDidacticBar, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

function formatOrpChunkHtml(wordsChunk: string): string {
  const safe = wordsChunk.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const trimmed = wordsChunk.trim();
  if (!trimmed) return '<span class="al-rsvp-pivot">·</span>';
  // Find pivot index on first word (classic Optimal Recognition Point ~30% into word)
  const len = trimmed.length;
  const pivotIdx = len <= 1 ? 0 : len <= 5 ? 1 : len <= 9 ? 2 : len <= 13 ? 3 : 4;
  const pre = trimmed.slice(0, pivotIdx).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const mid = trimmed[pivotIdx].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const post = trimmed.slice(pivotIdx + 1).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (!safe) return '';
  return `<span class="al-rsvp-pre">${pre}</span><span class="al-rsvp-pivot">${mid}</span><span class="al-rsvp-post">${post}</span>`;
}

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

  // RSVP speed reader state
  private rsvpWords: string[] = [];
  private rsvpIdx = 0;
  private rsvpPlaying = false;
  private rsvpTimerId = 0;
  private rsvpArticleTitle = '';
  private closureStatus = '';

  public unmount(): void {
    this.stopRsvp();
  }

  private stopRsvp(): void {
    if (this.rsvpTimerId) {
      window.clearInterval(this.rsvpTimerId);
      this.rsvpTimerId = 0;
    }
    this.rsvpPlaying = false;
  }

  private syncRsvpWords(): void {
    if (!this.activeArticle) {
      this.rsvpWords = [];
      this.rsvpIdx = 0;
      this.rsvpArticleTitle = '';
      return;
    }
    if (this.rsvpArticleTitle !== this.activeArticle.title) {
      this.stopRsvp();
      this.rsvpArticleTitle = this.activeArticle.title;
      this.rsvpWords = this.activeArticle.paragraphs
        .join(' ')
        .split(/\s+/)
        .filter(Boolean);
      this.rsvpIdx = 0;
    }
  }

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
            <button type="button" class="al-seg-btn ${prog.mode === 'rsvp' ? 'is-active' : ''}" data-rmode="rsvp">Lectura rápida (RSVP)</button>
            <button type="button" class="al-seg-btn ${prog.mode === 'comprension' ? 'is-active' : ''}" data-rmode="comprension">Comprensión y cierre</button>
          </div>
          <span class="al-muted">Modo actual: <strong>${prog.mode === 'lectura' ? 'Texto continuo' : prog.mode === 'guiada' ? `Bloques de ${this.chunkSizeFor(diff)} párrafos` : prog.mode === 'rsvp' ? `RSVP ${prog.rsvpWpm} PPM` : 'Cierre de comprensión activa'}</strong></span>
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

    const escText = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

    const subHtml = this.activeArticle.subpages.length
      ? `
      <div class="al-chapters-bar">
        <span>Capítulos y secciones relacionadas (${this.activeArticle.subpages.length}):</span>
        <div class="al-chip-wrap">
          ${this.activeArticle.subpages
            .slice(0, 24)
            .map((sp) => `<button type="button" class="al-chip-btn" data-open-ws="${sp.replace(/"/g, '&quot;')}">${sp.split('/').pop()}</button>`)
            .join('')}
        </div>
      </div>`
      : '';

    let bodyHtml = '';
    this.syncRsvpWords();
    if (totalParas === 0) {
      const firstSub = this.activeArticle.subpages[0];
      bodyHtml = `
        <p class="al-muted">Esta portada es un índice de obra. Elige uno de los capítulos arriba para comenzar a leer.</p>
        ${
          firstSub
            ? `<button type="button" class="al-btn al-btn-primary" data-open-ws="${firstSub.replace(/"/g, '&quot;')}">Abrir primer capítulo: ${firstSub.split('/').pop()}</button>`
            : ''
        }
      `;
    } else if (prog.mode === 'rsvp') {
      const chunk = prog.rsvpChunk || 1;
      const totalW = Math.max(1, this.rsvpWords.length);
      const curChunkText = this.rsvpWords.slice(this.rsvpIdx, this.rsvpIdx + chunk).join(' ');
      const pct = Math.min(100, Math.round((this.rsvpIdx / totalW) * 100));
      bodyHtml = `
        <div class="al-rsvp-stage">
          <div class="al-rsvp-head">
            <span class="al-mono-pill" id="al-rsvp-counter">Palabra ${Math.min(this.rsvpIdx + 1, totalW)} / ${totalW} (${pct}%)</span>
            <div class="al-seg-tabs" role="group" aria-label="Palabras por golpe">
              <button type="button" class="al-seg-btn ${chunk === 1 ? 'is-active' : ''}" data-rsvp-chunk="1">1 palabra</button>
              <button type="button" class="al-seg-btn ${chunk === 2 ? 'is-active' : ''}" data-rsvp-chunk="2">2 palabras</button>
            </div>
          </div>

          <div class="al-rsvp-window" aria-live="off">
            <div class="al-rsvp-guide-top"></div>
            <div class="al-rsvp-word" id="al-rsvp-word">${formatOrpChunkHtml(curChunkText)}</div>
            <div class="al-rsvp-guide-bot"></div>
          </div>

          <progress class="al-didactic-meter" id="al-rsvp-prog" value="${pct}" max="100"></progress>

          <div class="al-rsvp-controls">
            <div class="al-tool-group">
              <button type="button" class="al-btn" id="al-rsvp-rewind">${Icons.undo(14)}<span>-15 pal.</span></button>
              <button type="button" class="al-btn al-btn-primary" id="al-rsvp-toggle">
                ${this.rsvpPlaying ? Icons.pause(15) : Icons.play(15)}<span>${this.rsvpPlaying ? 'Pausar' : 'Reproducir'}</span>
              </button>
              <button type="button" class="al-btn" id="al-rsvp-restart">${Icons.refresh(14)}<span>Reiniciar</span></button>
            </div>

            <label class="al-inline-range">
              <span>Velocidad: <strong id="al-rsvp-wpm-val">${prog.rsvpWpm} PPM</strong></span>
              <input type="range" id="al-rsvp-wpm" min="180" max="550" step="10" value="${prog.rsvpWpm}" />
            </label>
          </div>
          <p class="al-muted" style="margin:0;font-size:0.82rem">Fija la vista en la letra roja central (punto ORP) sin mover los ojos lateralmente. Al terminar, cambia a <strong>Comprensión y cierre</strong> para fijar la idea.</p>
        </div>
      `;
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
        ${slice.map((p) => `<p>${escText(p)}</p>`).join('')}
      `;
    } else {
      bodyHtml = this.activeArticle.paragraphs.map((p) => `<p>${escText(p)}</p>`).join('');
    }

    const prompts = READER_COMPREHENSION_PROMPTS[diff];
    const closure = prog.activeClosures[this.activeArticle.title] ?? {
      mainIdea: savedNote,
      howToApply: '',
      updatedAt: 0,
    };
    const comprehensionHtml =
      prog.mode === 'comprension'
        ? `
        <div class="al-study-card" style="margin-top:16px">
          <h3>Cierre de Comprensión Activa (${diff === 'basico' ? 'Básico' : diff === 'intermedio' ? 'Intermedio' : 'Avanzado'})</h3>
          <ul class="al-muted" style="margin:0;padding-left:18px">
            ${prompts.map((pr) => `<li>${pr}</li>`).join('')}
          </ul>
          <label for="al-reader-main-idea" style="font-size:0.85rem;font-weight:600">1. Idea principal (en 2-3 líneas con tus propias palabras):</label>
          <textarea id="al-reader-main-idea" class="al-inline-note" placeholder="¿Qué sostiene el autor o cuál es el núcleo del texto?">${closure.mainIdea.replace(/</g, '&lt;')}</textarea>
          <label for="al-reader-apply" style="font-size:0.85rem;font-weight:600">2. Cómo lo aplico (en mi estudio, trabajo o criterio diario):</label>
          <textarea id="al-reader-apply" class="al-inline-note" placeholder="Una decisión, ejemplo o hábito donde aplicarás esta lectura...">${closure.howToApply.replace(/</g, '&lt;')}</textarea>
          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-primary" id="al-save-reader-note">${Icons.check(15)}<span>Guardar cierre y completar</span></button>
            <button type="button" class="al-btn" id="al-export-closure-notebook">${Icons.tablet(15)}<span>Exportar página a Cuaderno</span></button>
          </div>
          ${this.closureStatus ? `<span class="al-muted" style="font-size:0.82rem;color:var(--accent-primary)">${this.closureStatus}</span>` : ''}
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

  private async openWikisource(
    title: string,
    container: HTMLElement,
    opts?: ReaderRenderOpts,
    autoEnterChapter = false
  ): Promise<void> {
    this.statusText = `Cargando «${title}»...`;
    const paper = container.querySelector<HTMLElement>('#al-book-paper');
    if (paper) paper.innerHTML = `<p class="al-muted">${this.statusText}</p>`;
    try {
      let article = await fetchWikisourcePage(title);
      if (autoEnterChapter && article.paragraphs.length === 0 && article.subpages.length > 0) {
        const siblings = article.subpages;
        const firstChapter = await fetchWikisourcePage(siblings[0]).catch(() => null);
        if (firstChapter && firstChapter.paragraphs.length > 0) {
          article = {
            ...firstChapter,
            subpages: Array.from(new Set([...firstChapter.subpages, ...siblings])).slice(0, 30),
          };
        }
      }
      this.activeArticle = article;
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
        this.stopRsvp();
        const mode = btn.dataset.rmode as 'lectura' | 'guiada' | 'rsvp' | 'comprension';
        lifeStore.updateProgress('reader', { mode });
        this.render(container, opts);
      });
    });

    // RSVP controls
    const startRsvpLoop = () => {
      this.stopRsvp();
      if (this.rsvpWords.length === 0) return;
      if (this.rsvpIdx >= this.rsvpWords.length) this.rsvpIdx = 0;
      const prog = lifeStore.get().progress.reader;
      const chunk = prog.rsvpChunk || 1;
      const msPerStep = Math.max(60, Math.round((60000 / Math.max(180, prog.rsvpWpm)) * chunk));
      this.rsvpPlaying = true;
      this.rsvpTimerId = window.setInterval(() => {
        this.rsvpIdx += chunk;
        const total = Math.max(1, this.rsvpWords.length);
        if (this.rsvpIdx >= total) {
          this.rsvpIdx = total - 1;
          this.stopRsvp();
          if (this.activeArticle) {
            lifeStore.saveReaderScroll(this.activeArticle.title, 100);
          }
          this.render(container, opts);
          return;
        }
        const wordEl = container.querySelector('#al-rsvp-word');
        const cntEl = container.querySelector('#al-rsvp-counter');
        const progEl = container.querySelector<HTMLProgressElement>('#al-rsvp-prog');
        const pct = Math.min(100, Math.round((this.rsvpIdx / total) * 100));
        if (wordEl) {
          wordEl.innerHTML = formatOrpChunkHtml(this.rsvpWords.slice(this.rsvpIdx, this.rsvpIdx + chunk).join(' '));
        }
        if (cntEl) cntEl.textContent = `Palabra ${this.rsvpIdx + 1} / ${total} (${pct}%)`;
        if (progEl) progEl.value = pct;
      }, msPerStep);
      this.render(container, opts);
    };

    container.querySelector('#al-rsvp-toggle')?.addEventListener('click', () => {
      if (this.rsvpPlaying) {
        this.stopRsvp();
        if (this.activeArticle && this.rsvpWords.length > 0) {
          lifeStore.saveReaderScroll(this.activeArticle.title, (this.rsvpIdx / this.rsvpWords.length) * 100);
        }
        this.render(container, opts);
      } else {
        startRsvpLoop();
      }
    });
    container.querySelector('#al-rsvp-rewind')?.addEventListener('click', () => {
      this.rsvpIdx = Math.max(0, this.rsvpIdx - 15);
      this.render(container, opts);
    });
    container.querySelector('#al-rsvp-restart')?.addEventListener('click', () => {
      this.stopRsvp();
      this.rsvpIdx = 0;
      this.render(container, opts);
    });
    container.querySelectorAll<HTMLButtonElement>('[data-rsvp-chunk]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wasPlaying = this.rsvpPlaying;
        this.stopRsvp();
        lifeStore.updateProgress('reader', { rsvpChunk: Number(btn.dataset.rsvpChunk) === 2 ? 2 : 1 });
        if (wasPlaying) startRsvpLoop();
        else this.render(container, opts);
      });
    });
    container.querySelector<HTMLInputElement>('#al-rsvp-wpm')?.addEventListener('change', (e) => {
      const wpm = Math.max(180, Math.min(550, Number((e.target as HTMLInputElement).value) || 280));
      const wasPlaying = this.rsvpPlaying;
      this.stopRsvp();
      lifeStore.updateProgress('reader', { rsvpWpm: wpm });
      if (wasPlaying) startRsvpLoop();
      else this.render(container, opts);
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
      const mainIdea = container.querySelector<HTMLTextAreaElement>('#al-reader-main-idea')?.value ?? '';
      const howToApply = container.querySelector<HTMLTextAreaElement>('#al-reader-apply')?.value ?? '';
      lifeStore.saveReaderActiveClosure(this.activeArticle.title, mainIdea, howToApply);
      const words = this.activeArticle.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
      const combinedLen = mainIdea.trim().length + howToApply.trim().length;
      const score = combinedLen >= 50 ? 100 : combinedLen >= 20 ? 85 : 65;
      lifeStore.recordReaderArticle(this.activeArticle.title, words, score);
      this.closureStatus = 'Cierre de comprensión guardado en tus notas y sincronizado.';
      this.render(container, opts);
    });

    container.querySelector('#al-export-closure-notebook')?.addEventListener('click', async () => {
      if (!this.activeArticle) return;
      const mainIdea = container.querySelector<HTMLTextAreaElement>('#al-reader-main-idea')?.value.trim() ?? '';
      const howToApply = container.querySelector<HTMLTextAreaElement>('#al-reader-apply')?.value.trim() ?? '';
      if (!mainIdea && !howToApply) {
        this.closureStatus = 'Escribe primero tu idea principal o aplicación antes de exportar.';
        this.render(container, opts);
        return;
      }
      lifeStore.saveReaderActiveClosure(this.activeArticle.title, mainIdea, howToApply);
      try {
        const docs = await listNotebooks();
        let target = docs.find((d) => d.kind === 'notebook' && d.title === 'Síntesis de Lectura');
        const nextPageNum = target ? target.pageCount + 1 : 1;
        const elements: BoardTextElement[] = [
          {
            id: `txt-${Date.now()}-h`,
            type: 'text',
            x: 60,
            y: 90,
            text: `Lectura: ${this.activeArticle.title}`,
            color: '#166534',
            fontSize: 24,
          },
          {
            id: `txt-${Date.now()}-m`,
            type: 'text',
            x: 60,
            y: 170,
            text: `Idea principal:\n${mainIdea || '—'}`,
            color: '#141C2B',
            fontSize: 18,
          },
          {
            id: `txt-${Date.now()}-a`,
            type: 'text',
            x: 60,
            y: 420,
            text: `Cómo lo aplico:\n${howToApply || '—'}`,
            color: '#0F766E',
            fontSize: 18,
          },
        ];
        if (!target) {
          target = {
            id: `nb-reader-${Date.now()}`,
            title: 'Síntesis de Lectura',
            kind: 'notebook',
            paper: 'lined',
            pageCount: 1,
            pages: { 1: elements },
            updatedAt: Date.now(),
          };
        } else {
          target = {
            ...target,
            pageCount: nextPageNum,
            pages: { ...target.pages, [nextPageNum]: elements },
            updatedAt: Date.now(),
          };
        }
        await saveNotebook(target);
        lifeStore.updateModulePrefs('studio', { activeId: target.id, currentPage: nextPageNum });
        void cloudSync.pushNotebook(target);
        this.closureStatus = `Exportado a Cuaderno «Síntesis de Lectura» (pág. ${nextPageNum}).`;
        this.render(container, opts);
      } catch {
        this.closureStatus = 'No se pudo exportar al Cuaderno local.';
        this.render(container, opts);
      }
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
          await this.openWikisource(this.searchResults[0].title, container, opts, true);
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
