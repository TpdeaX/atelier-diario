import { Icons } from '../icons';
import { cloudSync } from '../services/CloudSync';
import {
  deleteNotebook,
  getPdfBytes,
  listNotebooks,
  saveNotebook,
  savePdfBytes,
} from '../services/NotebookStore';
import {
  fetchWikisourceFullText,
  OnlineBookResult,
  resolveArchivePdfUrl,
  searchOnlineBooks,
  tryFetchPdf,
} from '../services/OnlineApi';
import {
  BOARD_LOGICAL_H,
  BOARD_LOGICAL_W,
  buildBookPdf,
  exportAnnotatedPdf,
  openPdfBytes,
  PdfJsDoc,
  renderPdfPageToCanvas,
} from '../services/PdfTools';
import { lifeStore } from '../state/LifeStore';
import {
  BoardShapeElement,
  BoardStrokeElement,
  BoardTool,
  NotebookDoc,
  PaperStyle,
} from '../types';

const PALETTE = [
  { name: 'Tinta', hex: '#10211B' },
  { name: 'Azul', hex: '#2D5BFF' },
  { name: 'Rojo', hex: '#DC2626' },
  { name: 'Verde', hex: '#147D58' },
  { name: 'Amarillo', hex: '#FACC15' },
  { name: 'Cian', hex: '#22D3EE' },
];

export interface StudioRenderOpts {
  onOpenCloudModal?: () => void;
}

export class StudioView {
  private docs: NotebookDoc[] = [];
  private activeId = '';
  private currentPage = 1;

  private tool: BoardTool = 'pen';
  private color = '#10211B';
  private strokeWidth = 4;

  private pdfCache = new Map<string, PdfJsDoc>();
  private bgCanvas!: HTMLCanvasElement;
  private fgCanvas!: HTMLCanvasElement;
  private fgCtx!: CanvasRenderingContext2D;
  private stageBox!: HTMLDivElement;

  private activeStroke: BoardStrokeElement | null = null;
  private activeShape: BoardShapeElement | null = null;
  private pendingTextPos: { x: number; y: number } | null = null;

  private syncStatusLabel = 'Solo local (IndexedDB)';
  private pushTimer = 0;
  private containerRef: HTMLElement | null = null;
  private resizeObs: ResizeObserver | null = null;
  private lastStageWidth = 0;
  private renderOpts?: StudioRenderOpts;

  private booksModalOpen = false;
  private bookQuery = '';
  private bookStatus = '';
  private bookResults: OnlineBookResult[] = [];
  private bookFallbackUrl = '';

  public async render(container: HTMLElement, opts?: StudioRenderOpts): Promise<void> {
    this.containerRef = container;
    this.renderOpts = opts;

    const prefs = lifeStore.get().modulePrefs.studio;
    this.tool = prefs.tool;
    this.color = prefs.color;
    this.strokeWidth = prefs.strokeWidth;
    if (prefs.activeId) this.activeId = prefs.activeId;
    if (prefs.currentPage > 0) this.currentPage = prefs.currentPage;

    await this.bootstrapDocs();
    this.paintShell(container);
    this.setupCloudRealtime();
  }

  private saveStudioPrefs(): void {
    lifeStore.updateModulePrefs('studio', {
      activeId: this.activeId,
      currentPage: this.currentPage,
      tool: this.tool,
      color: this.color,
      strokeWidth: this.strokeWidth,
    });
  }

  private async bootstrapDocs(): Promise<void> {
    this.docs = await listNotebooks();
    if (cloudSync.isConfigured()) {
      this.syncStatusLabel = `En vivo · ${cloudSync.getConfig().spaceCode}`;
      const remote = await cloudSync.pullAllNotebooks();
      if (remote.length > 0) {
        const byId = new Map<string, NotebookDoc>(this.docs.map((d) => [d.id, d]));
        for (const r of remote) {
          const local = byId.get(r.id);
          if (!local || r.updatedAt > local.updatedAt) {
            byId.set(r.id, r);
            await saveNotebook(r);
          }
        }
        this.docs = Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
      }
    } else {
      this.syncStatusLabel = 'Solo local (IndexedDB)';
    }

    if (this.docs.length === 0) {
      const starter: NotebookDoc = {
        id: 'cuaderno-principal',
        title: 'Cuaderno Principal',
        kind: 'notebook',
        paper: 'dotted',
        pageCount: 1,
        pages: { 1: [] },
        updatedAt: Date.now(),
      };
      await saveNotebook(starter);
      this.docs = [starter];
    }

    if (!this.activeId || !this.docs.some((d) => d.id === this.activeId)) {
      this.activeId = this.docs[0].id;
      this.currentPage = 1;
    }
  }

  private activeDoc(): NotebookDoc {
    return this.docs.find((d) => d.id === this.activeId) ?? this.docs[0];
  }

  private setupCloudRealtime(): void {
    if (!cloudSync.isConfigured()) return;
    cloudSync.subscribeRealtime(
      async (remoteDoc) => {
        const idx = this.docs.findIndex((d) => d.id === remoteDoc.id);
        const existing = idx >= 0 ? this.docs[idx] : null;
        if (!existing || remoteDoc.updatedAt > existing.updatedAt) {
          await saveNotebook(remoteDoc);
          if (idx >= 0) this.docs[idx] = remoteDoc;
          else this.docs.unshift(remoteDoc);
          if (this.activeId === remoteDoc.id) {
            this.redrawFg();
          } else if (this.containerRef) {
            this.paintShell(this.containerRef);
          }
        }
      },
      async (deletedId) => {
        await deleteNotebook(deletedId);
        this.docs = this.docs.filter((d) => d.id !== deletedId);
        if (this.activeId === deletedId && this.docs.length > 0) {
          this.activeId = this.docs[0].id;
          this.currentPage = 1;
        }
        if (this.containerRef) this.paintShell(this.containerRef);
      }
    );
  }

  private paintShell(container: HTMLElement): void {
    const doc = this.activeDoc();
    this.currentPage = Math.max(1, Math.min(doc.pageCount, this.currentPage));

    container.innerHTML = `
      <div class="al-page al-studio-page">
        <div class="al-module-hero" style="--mod-c1: #2A4359; --mod-c2: #8FA8BE;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #2A4359; --em-c2: #8FA8BE;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.tablet(20)}</span>
            </div>
            <div>
              <h1>Cuaderno Digital y Editor PDF</h1>
              <p>Dibuja diagramas, subraya libros PDF, busca obras en línea y sincroniza en vivo con Supabase.</p>
            </div>
          </div>
          <div class="al-tool-group">
            <button type="button" class="al-mono-pill ${cloudSync.isConfigured() ? 'is-synced' : ''}" id="al-sync-pill" title="Abrir centro de Supabase">
              ${Icons.cloud(14)} <span>${this.syncStatusLabel}</span>
            </button>
            <button type="button" class="al-btn" id="al-btn-new-nb">${Icons.plus(15)}<span>Cuaderno</span></button>
            <button type="button" class="al-btn" id="al-btn-books">${Icons.search(15)}<span>Buscar libro</span></button>
            <label class="al-btn al-btn-primary">
              ${Icons.upload(15)}<span>Subir PDF</span>
              <input type="file" id="al-pdf-upload" accept="application/pdf,.pdf" style="display:none" />
            </label>
          </div>
        </div>

        <div class="al-doc-strip" id="al-doc-strip">
          ${this.docs
            .map(
              (d) => `
            <div class="al-doc-chip ${d.id === doc.id ? 'is-active' : ''}">
              <button type="button" class="al-doc-open" data-doc-id="${d.id}">
                ${d.kind === 'pdf' ? Icons.book(14) : Icons.tablet(14)}
                <span>${d.title}</span>
              </button>
              ${
                d.id === doc.id
                  ? `<button type="button" class="al-doc-del" id="al-doc-rename" title="Renombrar">${Icons.edit(12)}</button>`
                  : ''
              }
              ${
                this.docs.length > 1
                  ? `<button type="button" class="al-doc-del" data-del-doc="${d.id}" title="Eliminar">×</button>`
                  : ''
              }
            </div>`
            )
            .join('')}
        </div>

        <div class="al-panel al-board-shell">
          <div class="al-board-toolbar">
            <div class="al-tool-group" aria-label="Herramientas">
              ${this.toolBtn('pen', Icons.pen(15), 'Pluma')}
              ${this.toolBtn('highlighter', Icons.highlighter(15), 'Resaltar')}
              ${this.toolBtn('rect', Icons.square(15), 'Caja')}
              ${this.toolBtn('circle', Icons.circle(15), 'Círculo')}
              ${this.toolBtn('arrow', Icons.arrowUpRight(15), 'Flecha')}
              ${this.toolBtn('text', Icons.typeText(15), 'Texto')}
              ${this.toolBtn('eraser', Icons.eraser(15), 'Borrar')}
            </div>

            <div class="al-tool-group" aria-label="Colores y grosor">
              ${PALETTE.map(
                (p) =>
                  `<button type="button" class="al-swatch ${this.color === p.hex ? 'is-active' : ''}" data-color="${p.hex}" title="${p.name}" style="background:${p.hex}"></button>`
              ).join('')}
              <select id="al-stroke-size" class="al-mini-select" aria-label="Grosor">
                <option value="2.5" ${this.strokeWidth === 2.5 ? 'selected' : ''}>Fino</option>
                <option value="4" ${this.strokeWidth === 4 ? 'selected' : ''}>Medio</option>
                <option value="8" ${this.strokeWidth === 8 ? 'selected' : ''}>Grueso</option>
              </select>
              ${
                doc.kind === 'notebook'
                  ? `
                <select id="al-paper-style" class="al-mini-select" aria-label="Tipo de hoja">
                  <option value="dotted" ${doc.paper === 'dotted' ? 'selected' : ''}>Punteado</option>
                  <option value="grid" ${doc.paper === 'grid' ? 'selected' : ''}>Cuadriculado</option>
                  <option value="lined" ${doc.paper === 'lined' ? 'selected' : ''}>Rayado</option>
                  <option value="blank" ${doc.paper === 'blank' ? 'selected' : ''}>Blanco</option>
                </select>`
                  : ''
              }
            </div>

            <div class="al-tool-group">
              <button type="button" class="al-icon-btn" id="al-page-prev" title="Página anterior">◀</button>
              <span class="al-mono-pill" id="al-page-label">Pág ${this.currentPage}/${doc.pageCount}</span>
              <button type="button" class="al-icon-btn" id="al-page-next" title="Página siguiente">▶</button>
              ${
                doc.kind === 'notebook'
                  ? `<button type="button" class="al-btn" id="al-page-add">${Icons.plus(14)}<span>Hoja</span></button>`
                  : ''
              }
              <button type="button" class="al-btn" id="al-board-undo">${Icons.undo(14)}<span>Deshacer</span></button>
              <button type="button" class="al-btn" id="al-board-clear">${Icons.trash(14)}<span>Limpiar</span></button>
              <button type="button" class="al-btn" id="al-export-json" title="Respaldo rápido de este cuaderno">${Icons.download(14)}<span>.json</span></button>
              <button type="button" class="al-btn al-btn-primary" id="al-export-pdf">${Icons.download(15)}<span>Exportar PDF</span></button>
            </div>
          </div>

          <div class="al-board-stage-wrap">
            <div class="al-board-stage" id="al-board-stage">
              <canvas id="al-board-bg" class="al-board-canvas"></canvas>
              <canvas id="al-board-fg" class="al-board-canvas is-top"></canvas>
              <div id="al-text-popover" class="al-text-popover is-hidden">
                <input type="text" id="al-text-box-input" placeholder="Escribe tu nota aquí..." />
                <button type="button" class="al-btn al-btn-primary" id="al-text-box-ok">Fijar</button>
                <button type="button" class="al-btn" id="al-text-box-cancel">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
        ${this.renderBooksModal()}
      </div>
    `;

    this.stageBox = container.querySelector<HTMLDivElement>('#al-board-stage')!;
    this.bgCanvas = container.querySelector<HTMLCanvasElement>('#al-board-bg')!;
    this.fgCanvas = container.querySelector<HTMLCanvasElement>('#al-board-fg')!;
    this.fgCtx = this.fgCanvas.getContext('2d')!;

    this.bindEvents(container);
    void this.renderAllLayers();

    this.resizeObs?.disconnect();
    this.lastStageWidth = 0;
    this.resizeObs = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0]?.contentRect.width ?? 0);
      if (w > 0 && w !== this.lastStageWidth) {
        this.lastStageWidth = w;
        requestAnimationFrame(() => void this.renderAllLayers());
      }
    });
    this.resizeObs.observe(this.stageBox);
  }

  private async importPdfBytes(bytes: ArrayBuffer, title: string, container: HTMLElement): Promise<void> {
    const pdfDoc = await openPdfBytes(bytes);
    const id = `pdf-${Date.now()}`;
    await savePdfBytes(id, bytes);
    this.pdfCache.set(id, pdfDoc);

    let storagePath: string | undefined;
    if (cloudSync.isConfigured()) {
      storagePath = (await cloudSync.uploadPdf(id, bytes)) ?? undefined;
    }

    const nb: NotebookDoc = {
      id,
      title: title.slice(0, 80) || 'Libro',
      kind: 'pdf',
      paper: 'pdf',
      pageCount: pdfDoc.numPages,
      pages: {},
      pdfStoragePath: storagePath,
      updatedAt: Date.now(),
    };
    this.docs.unshift(nb);
    this.activeId = id;
    this.currentPage = 1;
    this.saveStudioPrefs();
    await saveNotebook(nb);
    void cloudSync.pushNotebook(nb);
    this.paintShell(container);
  }

  private renderBooksModal(): string {
    const esc = (s: string) =>
      s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
    const results = this.bookResults
      .map(
        (b, i) => `
        <div class="al-result-item is-static al-book-result">
          <strong>${esc(b.title)}</strong>
          <span>${b.source === 'wikisource' ? 'Wikisource · texto completo' : 'Internet Archive · PDF'}${
            b.author && b.source === 'archive' ? ` · ${esc(b.author)}` : ''
          }${b.detail ? ` · ${esc(b.detail)}` : ''}</span>
          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-primary" data-book-open="${i}">Abrir en el cuaderno</button>
            <a class="al-btn" href="${b.url}" target="_blank" rel="noopener">Ver fuente</a>
          </div>
        </div>`
      )
      .join('');
    const fallback = this.bookFallbackUrl
      ? `<p class="al-muted">Internet Archive no deja que la app descargue este PDF directamente.
           <a class="al-btn" href="${this.bookFallbackUrl}" target="_blank" rel="noopener">${Icons.download(14)}<span>Descargar PDF</span></a>
           y luego súbelo con <strong>Subir PDF</strong>.</p>`
      : '';
    return `
      <div class="al-modal-backdrop ${this.booksModalOpen ? '' : 'is-hidden'}" id="al-books-modal">
        <div class="al-modal-dialog al-panel">
          <div class="al-card-head">
            <h2>Buscar libro en línea</h2>
            <button type="button" class="al-icon-btn" id="al-books-close">×</button>
          </div>
          <p class="al-muted">Libros gratuitos y legales: <strong>Wikisource</strong> (clásicos en español, se convierten en PDF para subrayar) e <strong>Internet Archive</strong> (PDF escaneados de dominio público).</p>
          <form class="al-search-form" id="al-books-form">
            <input type="search" id="al-books-q" value="${esc(this.bookQuery)}" placeholder="Ej. Don Quijote, Bécquer, Lazarillo..." />
            <button type="submit" class="al-btn al-btn-primary">${Icons.search(15)}<span>Buscar</span></button>
          </form>
          <p class="al-muted" id="al-books-status">${esc(this.bookStatus)}</p>
          ${fallback}
          <div class="al-results-list al-books-results">${results}</div>
        </div>
      </div>`;
  }

  private bindBookSearch(container: HTMLElement): void {
    container.querySelector('#al-btn-books')?.addEventListener('click', () => {
      this.booksModalOpen = true;
      this.paintShell(container);
      container.querySelector<HTMLInputElement>('#al-books-q')?.focus();
    });
    container.querySelector('#al-books-close')?.addEventListener('click', () => {
      this.booksModalOpen = false;
      this.paintShell(container);
    });
    container.querySelector('#al-books-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.bookQuery = container.querySelector<HTMLInputElement>('#al-books-q')!.value.trim();
      if (!this.bookQuery) return;
      this.bookFallbackUrl = '';
      this.setBookStatus(container, 'Buscando en Wikisource e Internet Archive...');
      this.bookResults = await searchOnlineBooks(this.bookQuery).catch(() => []);
      this.bookStatus = this.bookResults.length
        ? `${this.bookResults.length} resultados para «${this.bookQuery}».`
        : 'Sin resultados. Prueba con el título o el autor.';
      this.paintShell(container);
    });
    container.querySelectorAll<HTMLButtonElement>('[data-book-open]').forEach((btn) => {
      btn.addEventListener('click', () => void this.openOnlineBook(Number(btn.dataset.bookOpen), container));
    });
  }

  private setBookStatus(container: HTMLElement, msg: string): void {
    this.bookStatus = msg;
    const el = container.querySelector('#al-books-status');
    if (el) el.textContent = msg;
  }

  private async openOnlineBook(index: number, container: HTMLElement): Promise<void> {
    const book = this.bookResults[index];
    if (!book) return;
    container.querySelectorAll<HTMLButtonElement>('[data-book-open]').forEach((b) => (b.disabled = true));
    this.bookFallbackUrl = '';
    try {
      if (book.source === 'wikisource') {
        this.setBookStatus(container, `Descargando «${book.title}» desde Wikisource...`);
        const full = await fetchWikisourceFullText(book.id, 40, (done, total) =>
          this.setBookStatus(container, `Descargando capítulos ${done + 1}/${total}...`)
        );
        if (full.sections.every((s) => s.text.length < 40)) {
          this.setBookStatus(container, 'Esta página no tiene texto suficiente. Prueba otro resultado.');
          this.paintShell(container);
          return;
        }
        this.setBookStatus(container, 'Armando el PDF...');
        const note =
          full.chaptersTotal > full.chaptersLoaded
            ? `Fuente: es.wikisource.org (dominio público) · primeros ${full.chaptersLoaded} de ${full.chaptersTotal} capítulos`
            : 'Fuente: es.wikisource.org (dominio público)';
        const { bytes } = await buildBookPdf(full.title, full.sections, note);
        this.booksModalOpen = false;
        this.bookStatus = '';
        await this.importPdfBytes(bytes, full.title, container);
        return;
      }

      this.setBookStatus(container, `Buscando el PDF de «${book.title}»...`);
      const pdfUrl = await resolveArchivePdfUrl(book.id);
      if (!pdfUrl) {
        this.setBookStatus(container, 'Este libro no tiene PDF descargable. Prueba otro resultado.');
        this.paintShell(container);
        return;
      }
      const bytes = await tryFetchPdf(pdfUrl);
      if (bytes) {
        this.booksModalOpen = false;
        this.bookStatus = '';
        await this.importPdfBytes(bytes, book.title, container);
        return;
      }
      this.bookFallbackUrl = pdfUrl;
      this.bookStatus = 'Descarga directa bloqueada por Internet Archive.';
      this.paintShell(container);
    } catch {
      this.setBookStatus(container, 'No se pudo abrir el libro (revisa tu conexión).');
      this.paintShell(container);
    }
  }

  private toolBtn(id: BoardTool, icon: string, title: string): string {
    return `<button type="button" class="al-btn al-tool-btn ${this.tool === id ? 'is-toggled' : ''}" data-btool="${id}" title="${title}">${icon}<span>${title}</span></button>`;
  }

  private async renderAllLayers(): Promise<void> {
    if (!this.stageBox || !this.bgCanvas || !this.fgCanvas) return;
    const rect = this.stageBox.getBoundingClientRect();
    const w = Math.max(280, Math.floor(rect.width || 720));
    const h = Math.round((w * BOARD_LOGICAL_H) / BOARD_LOGICAL_W);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.fgCanvas.width = Math.floor(w * dpr);
    this.fgCanvas.height = Math.floor(h * dpr);
    this.fgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    await this.renderBackground(w, h, dpr);
    this.redrawFg();
  }

  private async renderBackground(w: number, h: number, dpr: number): Promise<void> {
    const doc = this.activeDoc();
    if (doc.kind === 'pdf') {
      let pdfDoc = this.pdfCache.get(doc.id);
      if (!pdfDoc) {
        let bytes = await getPdfBytes(doc.id);
        if (!bytes && doc.pdfStoragePath && cloudSync.isConfigured()) {
          bytes = await cloudSync.downloadPdf(doc.pdfStoragePath);
          if (bytes) await savePdfBytes(doc.id, bytes);
        }
        if (bytes) {
          pdfDoc = await openPdfBytes(bytes);
          this.pdfCache.set(doc.id, pdfDoc);
        }
      }
      if (pdfDoc) {
        await renderPdfPageToCanvas(pdfDoc, this.currentPage, this.bgCanvas, w, h);
        return;
      }
    }

    this.bgCanvas.width = Math.floor(w * dpr);
    this.bgCanvas.height = Math.floor(h * dpr);
    const bg = this.bgCanvas.getContext('2d')!;
    bg.setTransform(dpr, 0, 0, dpr, 0, 0);

    bg.fillStyle = '#FFFFFF';
    bg.fillRect(0, 0, w, h);

    const step = (36 * w) / BOARD_LOGICAL_W;
    bg.strokeStyle = '#DCE5DF';
    bg.fillStyle = '#B8C9BF';
    bg.lineWidth = 1;

    if (doc.paper === 'lined' || doc.paper === 'grid') {
      for (let y = step * 2; y < h - step; y += step) {
        bg.beginPath();
        bg.moveTo(16, y);
        bg.lineTo(w - 16, y);
        bg.stroke();
      }
    }
    if (doc.paper === 'grid') {
      for (let x = step; x < w - 16; x += step) {
        bg.beginPath();
        bg.moveTo(x, 16);
        bg.lineTo(x, h - 16);
        bg.stroke();
      }
    }
    if (doc.paper === 'dotted') {
      for (let y = step; y < h - 16; y += step) {
        for (let x = step; x < w - 16; x += step) {
          bg.beginPath();
          bg.arc(x, y, 1.35, 0, Math.PI * 2);
          bg.fill();
        }
      }
    }
  }

  private redrawFg(): void {
    const rect = this.fgCanvas.getBoundingClientRect();
    const w = rect.width || 720;
    const h = rect.height || 972;
    const g = this.fgCtx;
    g.clearRect(0, 0, w, h);

    const sx = w / BOARD_LOGICAL_W;
    const sy = h / BOARD_LOGICAL_H;
    const elements = [...(this.activeDoc().pages[this.currentPage] ?? [])];
    if (this.activeStroke) elements.push(this.activeStroke);
    if (this.activeShape) elements.push(this.activeShape);

    for (const el of elements) {
      g.save();
      if (el.type === 'stroke') {
        g.strokeStyle = el.color;
        g.globalAlpha = el.alpha;
        g.lineWidth = Math.max(1.5, el.width * sx);
        g.lineCap = 'round';
        g.lineJoin = 'round';
        if (el.points.length > 0) {
          g.beginPath();
          g.moveTo(el.points[0][0] * sx, el.points[0][1] * sy);
          for (let i = 1; i < el.points.length; i++) {
            g.lineTo(el.points[i][0] * sx, el.points[i][1] * sy);
          }
          g.stroke();
        }
      } else if (el.type === 'rect') {
        g.strokeStyle = el.color;
        g.lineWidth = Math.max(1.5, el.width * sx);
        const x = Math.min(el.x1, el.x2) * sx;
        const y = Math.min(el.y1, el.y2) * sy;
        const rw = Math.abs(el.x2 - el.x1) * sx;
        const rh = Math.abs(el.y2 - el.y1) * sy;
        g.strokeRect(x, y, rw, rh);
      } else if (el.type === 'circle') {
        g.strokeStyle = el.color;
        g.lineWidth = Math.max(1.5, el.width * sx);
        const cx = ((el.x1 + el.x2) / 2) * sx;
        const cy = ((el.y1 + el.y2) / 2) * sy;
        const rx = Math.max(2, (Math.abs(el.x2 - el.x1) / 2) * sx);
        const ry = Math.max(2, (Math.abs(el.y2 - el.y1) / 2) * sy);
        g.beginPath();
        g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        g.stroke();
      } else if (el.type === 'arrow') {
        g.strokeStyle = el.color;
        g.lineWidth = Math.max(1.5, el.width * sx);
        g.lineCap = 'round';
        const x1 = el.x1 * sx;
        const y1 = el.y1 * sy;
        const x2 = el.x2 * sx;
        const y2 = el.y2 * sy;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const head = Math.max(10, 18 * sx);
        g.moveTo(x2, y2);
        g.lineTo(x2 - head * Math.cos(ang - 0.45), y2 - head * Math.sin(ang - 0.45));
        g.moveTo(x2, y2);
        g.lineTo(x2 - head * Math.cos(ang + 0.45), y2 - head * Math.sin(ang + 0.45));
        g.stroke();
      } else if (el.type === 'text') {
        g.fillStyle = el.color;
        const fz = Math.max(12, Math.round(el.fontSize * sx));
        g.font = `600 ${fz}px Figtree, sans-serif`;
        g.textBaseline = 'top';
        g.fillText(el.text, el.x * sx, el.y * sy);
      }
      g.restore();
    }
  }

  private toLogical(e: PointerEvent): [number, number] {
    const rect = this.fgCanvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * BOARD_LOGICAL_W;
    const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * BOARD_LOGICAL_H;
    return [Math.round(x), Math.round(y)];
  }

  private eraseNear(lx: number, ly: number): boolean {
    const doc = this.activeDoc();
    const list = doc.pages[this.currentPage] ?? [];
    const hitDist = 34;
    const next = list.filter((el) => {
      if (el.type === 'stroke') {
        return !el.points.some(([px, py]) => Math.hypot(px - lx, py - ly) < hitDist);
      }
      if (el.type === 'text') {
        return Math.hypot(el.x + 40 - lx, el.y + 14 - ly) > hitDist * 1.4;
      }
      const minX = Math.min(el.x1, el.x2) - 18;
      const maxX = Math.max(el.x1, el.x2) + 18;
      const minY = Math.min(el.y1, el.y2) - 18;
      const maxY = Math.max(el.y1, el.y2) + 18;
      return !(lx >= minX && lx <= maxX && ly >= minY && ly <= maxY);
    });
    if (next.length !== list.length) {
      doc.pages[this.currentPage] = next;
      return true;
    }
    return false;
  }

  private persistActiveDoc(): void {
    const doc = this.activeDoc();
    doc.updatedAt = Date.now();
    lifeStore.markHabit('studio');
    void saveNotebook(doc);
    window.clearTimeout(this.pushTimer);
    this.pushTimer = window.setTimeout(() => {
      void cloudSync.pushNotebook(doc);
    }, 350);
  }

  private bindEvents(container: HTMLElement): void {
    container.querySelector('#al-sync-pill')?.addEventListener('click', () => {
      this.renderOpts?.onOpenCloudModal?.();
    });

    container.querySelector('#al-doc-rename')?.addEventListener('click', () => {
      const doc = this.activeDoc();
      const nextName = window.prompt('Nuevo nombre del cuaderno o PDF:', doc.title);
      if (nextName && nextName.trim()) {
        doc.title = nextName.trim().slice(0, 80);
        this.persistActiveDoc();
        this.paintShell(container);
      }
    });

    container.querySelectorAll<HTMLButtonElement>('[data-btool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tool = btn.dataset.btool as BoardTool;
        if (this.tool === 'highlighter' && (this.color === '#10211B' || this.color === '#2D5BFF')) {
          this.color = '#FACC15';
        }
        this.saveStudioPrefs();
        this.paintShell(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.color = btn.dataset.color!;
        this.saveStudioPrefs();
        this.paintShell(container);
      });
    });

    container.querySelector<HTMLSelectElement>('#al-stroke-size')?.addEventListener('change', (e) => {
      this.strokeWidth = parseFloat((e.target as HTMLSelectElement).value) || 4;
      this.saveStudioPrefs();
    });

    container.querySelector<HTMLSelectElement>('#al-paper-style')?.addEventListener('change', (e) => {
      const doc = this.activeDoc();
      doc.paper = (e.target as HTMLSelectElement).value as PaperStyle;
      this.persistActiveDoc();
      void this.renderAllLayers();
    });

    container.querySelector('#al-page-prev')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage -= 1;
        this.saveStudioPrefs();
        this.paintShell(container);
      }
    });

    container.querySelector('#al-page-next')?.addEventListener('click', () => {
      const doc = this.activeDoc();
      if (this.currentPage < doc.pageCount) {
        this.currentPage += 1;
        this.saveStudioPrefs();
        this.paintShell(container);
      }
    });

    container.querySelector('#al-page-add')?.addEventListener('click', () => {
      const doc = this.activeDoc();
      doc.pageCount += 1;
      doc.pages[doc.pageCount] = [];
      this.currentPage = doc.pageCount;
      this.saveStudioPrefs();
      this.persistActiveDoc();
      this.paintShell(container);
    });

    container.querySelector('#al-board-undo')?.addEventListener('click', () => {
      const doc = this.activeDoc();
      const arr = doc.pages[this.currentPage] ?? [];
      if (arr.length > 0) {
        arr.pop();
        this.persistActiveDoc();
        this.redrawFg();
      }
    });

    container.querySelector('#al-board-clear')?.addEventListener('click', () => {
      const doc = this.activeDoc();
      doc.pages[this.currentPage] = [];
      this.persistActiveDoc();
      this.redrawFg();
    });

    container.querySelector('#al-export-json')?.addEventListener('click', () => {
      const doc = this.activeDoc();
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title.replace(/[^a-z0-9_-]+/gi, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    container.querySelector('#al-export-pdf')?.addEventListener('click', async () => {
      const doc = this.activeDoc();
      const base = doc.kind === 'pdf' ? await getPdfBytes(doc.id) : null;
      const outBytes = await exportAnnotatedPdf(base, doc);
      const blob = new Blob([new Uint8Array(outBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title.replace(/[^a-z0-9_-]+/gi, '_')}-anotado.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-doc-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeId = btn.dataset.docId!;
        this.currentPage = 1;
        this.saveStudioPrefs();
        this.paintShell(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-del-doc]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.delDoc!;
        await deleteNotebook(id);
        void cloudSync.deleteRemoteNotebook(id);
        this.docs = this.docs.filter((d) => d.id !== id);
        if (this.activeId === id && this.docs.length > 0) {
          this.activeId = this.docs[0].id;
          this.currentPage = 1;
        }
        this.saveStudioPrefs();
        this.paintShell(container);
      });
    });

    container.querySelector('#al-btn-new-nb')?.addEventListener('click', async () => {
      const num = this.docs.length + 1;
      const nb: NotebookDoc = {
        id: `nb-${Date.now()}`,
        title: `Cuaderno ${num}`,
        kind: 'notebook',
        paper: 'grid',
        pageCount: 1,
        pages: { 1: [] },
        updatedAt: Date.now(),
      };
      this.docs.unshift(nb);
      this.activeId = nb.id;
      this.currentPage = 1;
      this.saveStudioPrefs();
      await saveNotebook(nb);
      void cloudSync.pushNotebook(nb);
      this.paintShell(container);
    });

    container.querySelector<HTMLInputElement>('#al-pdf-upload')?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const bytes = await file.arrayBuffer();
      await this.importPdfBytes(bytes, file.name.replace(/\.pdf$/i, ''), container);
    });

    this.bindBookSearch(container);

    const textPop = container.querySelector<HTMLDivElement>('#al-text-popover')!;
    const textInput = container.querySelector<HTMLInputElement>('#al-text-box-input')!;

    this.fgCanvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.fgCanvas.setPointerCapture(e.pointerId);
      const [lx, ly] = this.toLogical(e);

      if (this.tool === 'text') {
        this.pendingTextPos = { x: lx, y: ly };
        textPop.classList.remove('is-hidden');
        textInput.value = '';
        textInput.focus();
        return;
      }

      if (this.tool === 'eraser') {
        if (this.eraseNear(lx, ly)) {
          this.persistActiveDoc();
          this.redrawFg();
        }
        return;
      }

      if (this.tool === 'pen' || this.tool === 'highlighter') {
        const isHi = this.tool === 'highlighter';
        this.activeStroke = {
          id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'stroke',
          tool: this.tool,
          points: [[lx, ly]],
          color: this.color,
          width: isHi ? this.strokeWidth * 5.2 : this.strokeWidth,
          alpha: isHi ? 0.34 : 1,
        };
        this.redrawFg();
        return;
      }

      this.activeShape = {
        id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: this.tool as 'rect' | 'circle' | 'arrow',
        x1: lx,
        y1: ly,
        x2: lx,
        y2: ly,
        color: this.color,
        width: this.strokeWidth,
      };
      this.redrawFg();
    });

    this.fgCanvas.addEventListener('pointermove', (e) => {
      if (!this.activeStroke && !this.activeShape && !(this.tool === 'eraser' && e.buttons === 1)) return;
      const [lx, ly] = this.toLogical(e);
      if (this.tool === 'eraser' && e.buttons === 1) {
        if (this.eraseNear(lx, ly)) {
          this.persistActiveDoc();
          this.redrawFg();
        }
        return;
      }
      if (this.activeStroke) {
        this.activeStroke.points.push([lx, ly]);
        this.redrawFg();
      } else if (this.activeShape) {
        this.activeShape.x2 = lx;
        this.activeShape.y2 = ly;
        this.redrawFg();
      }
    });

    const commitDraw = () => {
      const doc = this.activeDoc();
      if (!doc.pages[this.currentPage]) doc.pages[this.currentPage] = [];

      if (this.activeStroke) {
        if (this.activeStroke.points.length === 1) {
          const [px, py] = this.activeStroke.points[0];
          this.activeStroke.points.push([px + 1, py + 1]);
        }
        doc.pages[this.currentPage].push(this.activeStroke);
        this.activeStroke = null;
        this.persistActiveDoc();
        this.redrawFg();
      } else if (this.activeShape) {
        if (Math.hypot(this.activeShape.x2 - this.activeShape.x1, this.activeShape.y2 - this.activeShape.y1) > 8) {
          doc.pages[this.currentPage].push(this.activeShape);
          this.persistActiveDoc();
        }
        this.activeShape = null;
        this.redrawFg();
      }
    };
    this.fgCanvas.addEventListener('pointerup', commitDraw);
    this.fgCanvas.addEventListener('pointercancel', commitDraw);

    container.querySelector('#al-text-box-ok')?.addEventListener('click', () => {
      const txt = textInput.value.trim();
      if (txt && this.pendingTextPos) {
        const doc = this.activeDoc();
        if (!doc.pages[this.currentPage]) doc.pages[this.currentPage] = [];
        doc.pages[this.currentPage].push({
          id: `tx-${Date.now()}`,
          type: 'text',
          x: this.pendingTextPos.x,
          y: this.pendingTextPos.y,
          text: txt,
          color: this.color,
          fontSize: 28,
        });
        this.persistActiveDoc();
        this.redrawFg();
      }
      this.pendingTextPos = null;
      textPop.classList.add('is-hidden');
    });
    container.querySelector('#al-text-box-cancel')?.addEventListener('click', () => {
      this.pendingTextPos = null;
      textPop.classList.add('is-hidden');
    });
  }

  public unmount(): void {
    this.resizeObs?.disconnect();
    this.resizeObs = null;
    cloudSync.disconnectRealtime();
    this.containerRef = null;
  }
}
