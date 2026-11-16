import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { BoardElement, NotebookDoc } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfJsDoc = pdfjsLib.PDFDocumentProxy;

export const BOARD_LOGICAL_W = 1000;
export const BOARD_LOGICAL_H = 1350;

export async function openPdfBytes(bytes: ArrayBuffer): Promise<PdfJsDoc> {
  const copy = bytes.slice(0);
  const task = pdfjsLib.getDocument({ data: copy });
  return task.promise;
}

export async function renderPdfPageToCanvas(
  pdfDoc: PdfJsDoc,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  displayW: number,
  displayH: number
): Promise<void> {
  const page = await pdfDoc.getPage(Math.max(1, Math.min(pdfDoc.numPages, pageNumber)));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewport1 = page.getViewport({ scale: 1 });
  const scale = Math.min((displayW * dpr) / viewport1.width, (displayH * dpr) / viewport1.height);
  const viewport = page.getViewport({ scale });

  canvas.width = Math.floor(displayW * dpr);
  canvas.height = Math.floor(displayH * dpr);

  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const offsetX = Math.floor((canvas.width - viewport.width) / 2);
  const offsetY = Math.floor((canvas.height - viewport.height) / 2);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  ctx.restore();
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 16;
  const g = parseInt(clean.slice(2, 4), 16) || 33;
  const b = parseInt(clean.slice(4, 6), 16) || 27;
  return rgb(r / 255, g / 255, b / 255);
}

function winAnsiSafe(str: string): string {
  return str.replace(/[^\x20-\xFF]/g, '?');
}

export async function exportAnnotatedPdf(
  baseBytes: ArrayBuffer | null,
  doc: NotebookDoc
): Promise<Uint8Array> {
  const pdf = baseBytes ? await PDFDocument.load(baseBytes.slice(0)) : await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  if (!baseBytes) {
    while (pdf.getPageCount() < doc.pageCount) {
      pdf.addPage([595, 842]);
    }
  }

  const totalPages = pdf.getPageCount();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = pdf.getPage(pageNum - 1);
    const { width, height } = page.getSize();
    const elements: BoardElement[] = doc.pages[pageNum] ?? [];

    // Draw subtle paper ruling if it's a fresh notebook
    if (!baseBytes && doc.paper !== 'blank') {
      const guideCol = rgb(0.75, 0.82, 0.78);
      if (doc.paper === 'lined' || doc.paper === 'grid') {
        for (let y = 40; y < height - 20; y += 26) {
          page.drawLine({ start: { x: 24, y }, end: { x: width - 24, y }, thickness: 0.5, color: guideCol });
        }
      }
      if (doc.paper === 'grid') {
        for (let x = 24; x < width - 20; x += 26) {
          page.drawLine({ start: { x, y: 24 }, end: { x, y: height - 24 }, thickness: 0.5, color: guideCol });
        }
      }
      if (doc.paper === 'dotted') {
        for (let y = 32; y < height - 24; y += 24) {
          for (let x = 32; x < width - 24; x += 24) {
            page.drawCircle({ x, y, size: 0.9, color: guideCol });
          }
        }
      }
    }

    const sx = width / BOARD_LOGICAL_W;
    const sy = height / BOARD_LOGICAL_H;

    for (const el of elements) {
      const col = hexToRgb(el.color);
      if (el.type === 'stroke') {
        const pts = el.points;
        const thick = Math.max(1, el.width * sx);
        for (let i = 1; i < pts.length; i++) {
          page.drawLine({
            start: { x: pts[i - 1][0] * sx, y: height - pts[i - 1][1] * sy },
            end: { x: pts[i][0] * sx, y: height - pts[i][1] * sy },
            thickness: thick,
            color: col,
            opacity: el.alpha,
          });
        }
      } else if (el.type === 'rect') {
        const rx = Math.min(el.x1, el.x2) * sx;
        const ryTop = Math.min(el.y1, el.y2) * sy;
        const rw = Math.abs(el.x2 - el.x1) * sx;
        const rh = Math.abs(el.y2 - el.y1) * sy;
        page.drawRectangle({
          x: rx,
          y: height - ryTop - rh,
          width: rw,
          height: rh,
          borderColor: col,
          borderWidth: Math.max(1, el.width * sx),
        });
      } else if (el.type === 'circle') {
        const cx = ((el.x1 + el.x2) / 2) * sx;
        const cy = height - ((el.y1 + el.y2) / 2) * sy;
        const rx = Math.max(2, (Math.abs(el.x2 - el.x1) / 2) * sx);
        const ry = Math.max(2, (Math.abs(el.y2 - el.y1) / 2) * sy);
        page.drawEllipse({
          x: cx,
          y: cy,
          xScale: rx,
          yScale: ry,
          borderColor: col,
          borderWidth: Math.max(1, el.width * sx),
        });
      } else if (el.type === 'arrow') {
        const x1 = el.x1 * sx;
        const y1 = height - el.y1 * sy;
        const x2 = el.x2 * sx;
        const y2 = height - el.y2 * sy;
        const thick = Math.max(1, el.width * sx);
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: thick, color: col });
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const head = 12;
        page.drawLine({
          start: { x: x2, y: y2 },
          end: { x: x2 - head * Math.cos(ang - 0.45), y: y2 - head * Math.sin(ang - 0.45) },
          thickness: thick,
          color: col,
        });
        page.drawLine({
          start: { x: x2, y: y2 },
          end: { x: x2 - head * Math.cos(ang + 0.45), y: y2 - head * Math.sin(ang + 0.45) },
          thickness: thick,
          color: col,
        });
      } else if (el.type === 'text') {
        const tx = el.x * sx;
        const ty = height - el.y * sy;
        const sz = Math.max(9, el.fontSize * sx);
        page.drawText(winAnsiSafe(el.text), {
          x: tx,
          y: ty,
          size: sz,
          font,
          color: col,
        });
      }
    }
  }

  return pdf.save();
}
