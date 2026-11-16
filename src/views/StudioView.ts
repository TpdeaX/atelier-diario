import { Icons } from '../icons';
import { cloudSync, SUPABASE_SETUP_SQL } from '../services/CloudSync';
import {
  deleteNotebook,
  getPdfBytes,
  listNotebooks,
  saveNotebook,
  savePdfBytes,
} from '../services/NotebookStore';
import {
  BOARD_LOGICAL_H,
  BOARD_LOGICAL_W,
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

  private cloudModalOpen = false;
  private cloudFeedback = '';
  private syncStatusLabel = 'Solo local';
  private pushTimer = 0;
  private containerRef: HTMLElement | null = null;
  private resizeObs: ResizeObserver | null = null;
  private lastStageWidth = 0;

  public async render(container: HTMLElement): Promise<void> {
    this.containerRef = container;
    await this.bootstrapDocs();
    this.paintShell(container);
    this.setupCloudRealtime();
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
    const cfg = cloudSync.getConfig();

    container.innerHTML = `
      <div class="al-page al-studio-page">
        <div class="al-page-head">
          <div>
            <h1>Cuaderno Digital y Editor PDF</h1>
            <p>Dibuja diagramas, subraya libros PDF, anota con calma y sincroniza en vivo entre PC, laptop y celular.</p>
          </div>
          <div class="al-tool-group">
            <span class="al-mono-pill ${cloudSync.isConfigured() ? 'is-synced' : ''}" id="al-sync-pill">
              ${Icons.cloud(14)} <span>${this.syncStatusLabel}</span>
            </span>
            <button type="button" class="al-btn" id="al-btn-cloud">${Icons.cloud(15)}<span>Nube / Compartir</span></button>
            <button type="button" class="al-btn" id="al-btn-new-nb">${Icons.plus(15)}<span>Cuaderno</span></button>
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

        <div class="al-cloud-modal-backdrop ${this.cloudModalOpen ? '' : 'is-hidden'}" id="al-cloud-modal">
          <div class="al-cloud-modal al-panel">
            <div class="al-card-head">
              <h2>Sincronización en vivo y Compartir</h2>
              <button type="button" class="al-icon-btn" id="al-cloud-close">×</button>
            </div>
            <p class="al-muted">Conecta tu propio proyecto gratuito de <strong>Supabase</strong> para ver los mismos cuadernos y PDFs en tu PC, laptop y celular en tiempo real (o comparte tu código de espacio con un amigo).</p>

            <form class="al-reframe-form" id="al-cloud-form">
              <label>
                <span>Supabase Project URL</span>
                <input type="url" id="al-sb-url" value="${cfg.supabaseUrl}" placeholder="https://tuproyecto.supabase.co" />
              </label>
              <label>
                <span>Supabase Anon Public Key</span>
                <input type="text" id="al-sb-key" value="${cfg.supabaseAnonKey}" placeholder="eyJhbGciOi..." />
              </label>
              <label>
                <span>Código de espacio compartido (ej. joseph-estudio)</span>
                <input type="text" id="al-sb-space" value="${cfg.spaceCode}" placeholder="mi-espacio" />
              </label>
              <div class="al-tool-group">
                <button type="submit" class="al-btn al-btn-primary">Guardar y conectar en vivo</button>
                <button type="button" class="al-btn" id="al-sb-sync-now">${Icons.refresh(15)}<span>Sincronizar ahora</span></button>
                <button type="button" class="al-btn" id="al-copy-sql">Copiar SQL de Supabase</button>
              </div>
            </form>

            ${this.cloudFeedback ? `<p class="al-muted" id="al-cloud-fb"><strong>${this.cloudFeedback}</strong></p>` : '<p class="al-muted" id="al-cloud-fb"></p>'}

            <div class="al-cloud-backup-row">
              <span>Respaldo manual sin nube:</span>
              <div class="al-tool-group">
                <button type="button" class="al-btn" id="al-export-json">${Icons.download(14)}<span>Exportar cuaderno .json</span></button>
                <label class="al-btn">
                  ${Icons.upload(14)}<span>Importar .json</span>
                  <input type="file" id="al-import-json" accept=".json,application/json" style="display:none" />
                </label>
              </div>
            </div>
          </div>
        </div>
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
    // Tools, swatches, paper & pages
    container.querySelectorAll<HTMLButtonElement>('[data-btool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tool = btn.dataset.btool as BoardTool;
        if (this.tool === 'highlighter' && (this.color === '#10211B' || this.color === '#2D5BFF')) {
          this.color = '#FACC15';
        }
        this.paintShell(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.color = btn.dataset.color!;
        this.paintShell(container);
      });
    });

    container.querySelector<HTMLSelectElement>('#al-stroke-size')?.addEventListener('change', (e) => {
      this.strokeWidth = parseFloat((e.target as HTMLSelectElement).value) || 4;
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
        this.paintShell(container);
      }
    });

    container.querySelector('#al-page-next')?.addEventListener('click', () => {
      const doc = this.activeDoc();
      if (this.currentPage < doc.pageCount) {
        this.currentPage += 1;
        this.paintShell(container);
      }
    });

    container.querySelector('#al-page-add')?.addEventListener('click', () => {
      const doc = this.activeDoc();
      doc.pageCount += 1;
      doc.pages[doc.pageCount] = [];
      this.currentPage = doc.pageCount;
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

    // Document switcher, creation, PDF upload
    container.querySelectorAll<HTMLButtonElement>('[data-doc-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeId = btn.dataset.docId!;
        this.currentPage = 1;
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
      await saveNotebook(nb);
      void cloudSync.pushNotebook(nb);
      this.paintShell(container);
    });

    container.querySelector<HTMLInputElement>('#al-pdf-upload')?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const bytes = await file.arrayBuffer();
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
        title: file.name.replace(/\.pdf$/i, ''),
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
      await saveNotebook(nb);
      void cloudSync.pushNotebook(nb);
      this.paintShell(container);
    });

    // Canvas drawing pointer events
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

    // Cloud Sync Modal events
    container.querySelector('#al-btn-cloud')?.addEventListener('click', () => {
      this.cloudModalOpen = true;
      this.paintShell(container);
    });
    container.querySelector('#al-cloud-close')?.addEventListener('click', () => {
      this.cloudModalOpen = false;
      this.paintShell(container);
    });

    container.querySelector('#al-cloud-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = container.querySelector<HTMLInputElement>('#al-sb-url')!.value;
      const key = container.querySelector<HTMLInputElement>('#al-sb-key')!.value;
      const space = container.querySelector<HTMLInputElement>('#al-sb-space')!.value;
      cloudSync.saveConfig({ supabaseUrl: url, supabaseAnonKey: key, spaceCode: space, autoSync: true });
      const res = await cloudSync.testConnection();
      this.cloudFeedback = res.message;
      if (res.ok) {
        this.syncStatusLabel = `En vivo · ${cloudSync.getConfig().spaceCode}`;
        await cloudSync.pushNotebook(this.activeDoc());
        await this.bootstrapDocs();
        this.setupCloudRealtime();
      }
      this.paintShell(container);
    });

    container.querySelector('#al-sb-sync-now')?.addEventListener('click', async () => {
      if (!cloudSync.isConfigured()) {
        this.cloudFeedback = 'Primero guarda tu Supabase URL y Anon Key.';
        this.paintShell(container);
        return;
      }
      await cloudSync.pushNotebook(this.activeDoc());
      await this.bootstrapDocs();
      this.cloudFeedback = 'Sincronización completada.';
      this.paintShell(container);
    });

    container.querySelector('#al-copy-sql')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
        this.cloudFeedback = 'Script SQL copiado al portapapeles. Pégalo en Supabase -> SQL Editor -> Run.';
      } catch {
        this.cloudFeedback = 'Revisa el archivo supabase_setup.sql en la raíz del repositorio.';
      }
      const fb = container.querySelector('#al-cloud-fb');
      if (fb) fb.textContent = this.cloudFeedback;
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

    container.querySelector<HTMLInputElement>('#al-import-json')?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text()) as NotebookDoc;
        if (!parsed.id || !parsed.title) throw new Error('invalid');
        parsed.updatedAt = Date.now();
        await saveNotebook(parsed);
        this.activeId = parsed.id;
        this.currentPage = 1;
        this.cloudModalOpen = false;
        this.docs = await listNotebooks();
        void cloudSync.pushNotebook(parsed);
        this.paintShell(container);
      } catch {
        this.cloudFeedback = 'El archivo .json no corresponde a un cuaderno válido.';
        this.paintShell(container);
      }
    });
  }

  public unmount(): void {
    this.resizeObs?.disconnect();
    this.resizeObs = null;
    cloudSync.disconnectRealtime();
    this.containerRef = null;
  }
}
