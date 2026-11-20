export interface WikiSummary {
  title: string;
  extract: string;
  description?: string;
  url?: string;
}

export interface WikisourceSearchItem {
  title: string;
  snippet: string;
}

export interface WikisourceArticle {
  title: string;
  paragraphs: string[];
  subpages: string[];
}

export interface OpenLibraryBook {
  title: string;
  author: string;
  year?: number;
  subject?: string;
  key: string;
  readUrl?: string;
}

export type DrawingRefSourceFilter = 'all' | 'wikimedia' | 'cleveland';

export interface DrawingReferenceItem {
  id: string;
  source: 'wikimedia' | 'cleveland';
  title: string;
  artist: string;
  license: string;
  thumbUrl: string;
  fullUrl: string;
  pageUrl: string;
}

export interface DrawingReferenceSearchResult {
  items: DrawingReferenceItem[];
  errors: Partial<Record<'wikimedia' | 'cleveland', string>>;
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ndash: '–',
  mdash: '—',
  laquo: '«',
  raquo: '»',
};

const WIKIMEDIA_ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
]);

/** Limpia etiquetas HTML y entidades sin tocar el DOM (seguro para XSS y Node tests). */
export function stripHtmlSafe(raw: string): string {
  if (typeof raw !== 'string' || !raw) return '';
  const withoutBlocks = raw
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(?:p|div|br|li|tr|td|th|h[1-6]|section|article)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '');
  const decoded = withoutBlocks.replace(
    /&(nbsp|amp|lt|gt|quot|apos|ndash|mdash|laquo|raquo|#\d+|#x[0-9a-fA-F]+);/gi,
    (full, token: string) => {
      const low = token.toLowerCase();
      if (low in NAMED_HTML_ENTITIES) return NAMED_HTML_ENTITIES[low];
      if (low.startsWith('#x')) {
        const cp = Number.parseInt(low.slice(2), 16);
        return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
      }
      if (low.startsWith('#')) {
        const cp = Number.parseInt(low.slice(1), 10);
        return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
      }
      return full;
    }
  );
  return decoded.replace(/\s+/g, ' ').trim();
}

/** Valida URLs de imagen provenientes de APIs externas: solo protocolo https:. */
export function sanitizeApiImageUrl(url: string): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || !parsed.hostname) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

/** Valida URLs ingresadas manualmente o archivos locales: https:, http:, blob: y data:image/*. */
export function sanitizeManualImageUrl(url: string): string {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^data:image\/(png|jpeg|jpg|webp|gif|bmp|avif|svg\+xml)(?:;charset=[^;,]+)?(?:;base64)?,/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.toLowerCase().startsWith('data:')) return '';
  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname) {
      return parsed.toString();
    }
    if (parsed.protocol === 'blob:' && trimmed.length > 5) {
      return trimmed;
    }
    return '';
  } catch {
    return '';
  }
}

export function parseWikimediaSearchPayload(json: unknown): DrawingReferenceItem[] {
  const pagesObj = (json as { query?: { pages?: Record<string, unknown> } } | null)?.query?.pages;
  if (!pagesObj || typeof pagesObj !== 'object') return [];

  interface RawWikiPage {
    pageid?: number;
    index?: number;
    title?: string;
    imageinfo?: Array<{
      url?: string;
      thumburl?: string;
      descriptionurl?: string;
      mime?: string;
      extmetadata?: {
        ObjectName?: { value?: string };
        Artist?: { value?: string };
        LicenseShortName?: { value?: string };
      };
    }>;
  }

  const pages = (Object.values(pagesObj) as RawWikiPage[]).sort(
    (a, b) => (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER)
  );

  const out: DrawingReferenceItem[] = [];
  for (const page of pages) {
    const info = Array.isArray(page.imageinfo) ? page.imageinfo[0] : undefined;
    if (!info) continue;
    const mime = String(info.mime ?? '').toLowerCase().trim();
    if (!WIKIMEDIA_ALLOWED_MIMES.has(mime)) continue;

    const safeThumb = sanitizeApiImageUrl(String(info.thumburl ?? ''));
    const safeFull = sanitizeApiImageUrl(String(info.url ?? ''));

    // Los navegadores no renderizan .tiff en <img>; exige thumburl rasterizado
    if (mime === 'image/tiff' && !safeThumb) continue;

    const thumbUrl = safeThumb || safeFull;
    const fullUrl = mime === 'image/tiff' ? safeThumb : safeFull || safeThumb;
    if (!thumbUrl || !fullUrl) continue;

    const ext = info.extmetadata ?? {};
    const fallbackTitle = String(page.title ?? '')
      .replace(/^File:/i, '')
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/_/g, ' ')
      .trim();

    out.push({
      id: `wm-${String(page.pageid ?? page.title ?? thumbUrl)}`,
      source: 'wikimedia',
      title: stripHtmlSafe(String(ext.ObjectName?.value ?? '')) || fallbackTitle || 'Referencia Wikimedia',
      artist: stripHtmlSafe(String(ext.Artist?.value ?? '')) || 'Wikimedia Commons',
      license: stripHtmlSafe(String(ext.LicenseShortName?.value ?? '')) || 'Wikimedia',
      thumbUrl,
      fullUrl,
      pageUrl: sanitizeApiImageUrl(String(info.descriptionurl ?? '')),
    });
  }
  return out;
}

export function parseClevelandSearchPayload(json: unknown): DrawingReferenceItem[] {
  const list = (json as { data?: unknown[] } | null)?.data;
  if (!Array.isArray(list)) return [];

  interface RawClevelandItem {
    id?: number | string;
    title?: string;
    url?: string;
    share_license_status?: string;
    creators?: Array<{ description?: string; name?: string }>;
    images?: {
      web?: { url?: string };
      print?: { url?: string };
    };
  }

  const out: DrawingReferenceItem[] = [];
  for (const raw of list as RawClevelandItem[]) {
    const webUrl = sanitizeApiImageUrl(String(raw?.images?.web?.url ?? ''));
    if (!webUrl) continue;
    const printUrl = sanitizeApiImageUrl(String(raw?.images?.print?.url ?? ''));
    const creators = Array.isArray(raw?.creators) ? raw.creators : [];
    const artistNames = creators
      .map((c) => stripHtmlSafe(String(c?.description ?? c?.name ?? '')))
      .filter(Boolean);

    out.push({
      id: `cma-${String(raw?.id ?? webUrl)}`,
      source: 'cleveland',
      title: stripHtmlSafe(String(raw?.title ?? '')) || 'Obra CC0',
      artist: artistNames.length > 0 ? artistNames.join(', ') : 'Artista anónimo',
      license: stripHtmlSafe(String(raw?.share_license_status ?? '')) || 'CC0',
      thumbUrl: webUrl,
      fullUrl: printUrl || webUrl,
      pageUrl: sanitizeApiImageUrl(String(raw?.url ?? '')),
    });
  }
  return out;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function searchDrawingReferences(
  query: string,
  source: DrawingRefSourceFilter = 'all'
): Promise<DrawingReferenceSearchResult> {
  const q = query.trim();
  if (!q) return { items: [], errors: {} };

  const errors: Partial<Record<'wikimedia' | 'cleveland', string>> = {};
  let wmItems: DrawingReferenceItem[] = [];
  let cmaItems: DrawingReferenceItem[] = [];

  const tasks: Array<Promise<void>> = [];

  if (source === 'all' || source === 'wikimedia') {
    const wmUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      q
    )}&gsrlimit=12&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=960&format=json&origin=*`;
    tasks.push(
      fetchJsonWithTimeout(wmUrl, 8000)
        .then((json) => {
          wmItems = parseWikimediaSearchPayload(json);
        })
        .catch((err) => {
          errors.wikimedia = err instanceof Error ? err.message : 'Error al consultar Wikimedia';
        })
    );
  }

  if (source === 'all' || source === 'cleveland') {
    const cmaUrl = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(
      q
    )}&has_image=1&cc0=1&limit=12`;
    tasks.push(
      fetchJsonWithTimeout(cmaUrl, 8000)
        .then((json) => {
          cmaItems = parseClevelandSearchPayload(json);
        })
        .catch((err) => {
          errors.cleveland = err instanceof Error ? err.message : 'Error al consultar Cleveland CC0';
        })
    );
  }

  await Promise.allSettled(tasks);

  const combined: DrawingReferenceItem[] = [];
  const seen = new Set<string>();
  const maxLen = Math.max(cmaItems.length, wmItems.length);
  for (let i = 0; i < maxLen; i++) {
    for (const candidate of [cmaItems[i], wmItems[i]]) {
      if (candidate && !seen.has(candidate.thumbUrl)) {
        seen.add(candidate.thumbUrl);
        combined.push(candidate);
      }
    }
  }

  return { items: combined, errors };
}

function stripHtml(raw: string): string {
  return stripHtmlSafe(raw);
}

export async function fetchRandomWikiSummary(): Promise<WikiSummary> {
  const res = await fetch('https://es.wikipedia.org/api/rest_v1/page/random/summary');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    title: string;
    extract?: string;
    description?: string;
    content_urls?: { desktop?: { page?: string } };
  };
  return {
    title: data.title,
    extract: data.extract ?? 'Sin resumen disponible.',
    description: data.description,
    url: data.content_urls?.desktop?.page,
  };
}

export async function searchWikisource(query: string): Promise<WikisourceSearchItem[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `https://es.wikisource.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    q
  )}&srlimit=12&srnamespace=0&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    query?: { search?: Array<{ title: string; snippet: string }> };
  };
  return (data.query?.search ?? []).map((item) => ({
    title: item.title,
    snippet: stripHtml(item.snippet),
  }));
}

export async function fetchWikisourcePage(title: string): Promise<WikisourceArticle> {
  const extractUrl = `https://es.wikisource.org/w/api.php?action=query&prop=extracts&explaintext=true&titles=${encodeURIComponent(
    title
  )}&format=json&origin=*`;
  const subUrl = `https://es.wikisource.org/w/api.php?action=query&list=prefixsearch&pssearch=${encodeURIComponent(
    title + '/'
  )}&pslimit=20&format=json&origin=*`;

  const [extRes, subRes] = await Promise.all([fetch(extractUrl), fetch(subUrl)]);
  if (!extRes.ok) throw new Error(`HTTP ${extRes.status}`);

  const extData = (await extRes.json()) as {
    query?: { pages?: Record<string, { title?: string; extract?: string }> };
  };
  const pages = Object.values(extData.query?.pages ?? {});
  const page = pages[0];
  const rawText = page?.extract ?? '';
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let subpages: string[] = [];
  if (subRes.ok) {
    const subData = (await subRes.json()) as {
      query?: { prefixsearch?: Array<{ title: string }> };
    };
    subpages = (subData.query?.prefixsearch ?? []).map((s) => s.title);
  }

  return {
    title: page?.title ?? title,
    paragraphs,
    subpages,
  };
}

export async function lookupWiktionary(word: string): Promise<{
  word: string;
  found: boolean;
  lines: string[];
}> {
  const clean = word
    .trim()
    .toLowerCase()
    .replace(/[.,;:¡!¿?"'()«»—]/g, '');
  if (!clean) return { word: clean, found: false, lines: [] };

  const url = `https://es.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=true&titles=${encodeURIComponent(
    clean
  )}&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { extract?: string; missing?: string }> };
  };
  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page || 'missing' in page || !page.extract) {
    return { word: clean, found: false, lines: [] };
  }

  const lines = page.extract
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 3 && !l.startsWith('=='))
    .slice(0, 8);

  return { word: clean, found: lines.length > 0, lines };
}

export async function searchOpenLibrary(query: string): Promise<OpenLibraryBook[]> {
  const q = query.trim() || 'filosofia';
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&language=spa&limit=10&fields=key,title,author_name,first_publish_year,subject,ebook_access,public_scan_b,ia`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    docs?: Array<{
      title?: string;
      author_name?: string[];
      first_publish_year?: number;
      subject?: string[];
      key?: string;
      ebook_access?: string;
      public_scan_b?: boolean;
      ia?: string[];
    }>;
  };
  return (data.docs ?? []).map((d) => ({
    title: d.title ?? 'Sin título',
    author: d.author_name?.[0] ?? 'Autor desconocido',
    year: d.first_publish_year,
    subject: d.subject?.slice(0, 3).join(' · '),
    key: d.key ?? '',
    readUrl:
      (d.ebook_access === 'public' || d.public_scan_b) && d.ia?.[0]
        ? `https://archive.org/details/${d.ia[0]}`
        : undefined,
  }));
}

/* ------------------------------------------------------------------ */
/* Libros en línea para el Cuaderno/PDF                                 */
/* ------------------------------------------------------------------ */

export interface OnlineBookResult {
  source: 'wikisource' | 'archive';
  id: string;
  title: string;
  author: string;
  detail: string;
  url: string;
}

export interface WikisourceFullText {
  title: string;
  sections: Array<{ heading: string; text: string }>;
  chaptersTotal: number;
  chaptersLoaded: number;
}

async function wikisourceExtract(title: string): Promise<{ title: string; text: string }> {
  const url = `https://es.wikisource.org/w/api.php?action=query&prop=extracts&explaintext=true&redirects=1&titles=${encodeURIComponent(
    title
  )}&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    query?: { pages?: Record<string, { title?: string; extract?: string }> };
  };
  const page = Object.values(data.query?.pages ?? {})[0];
  return { title: page?.title ?? title, text: (page?.extract ?? '').trim() };
}

async function wikisourceSubpages(title: string, limit = 60): Promise<string[]> {
  const url = `https://es.wikisource.org/w/api.php?action=query&list=prefixsearch&pssearch=${encodeURIComponent(
    title + '/'
  )}&pslimit=${limit}&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { query?: { prefixsearch?: Array<{ title: string }> } };
  return (data.query?.prefixsearch ?? [])
    .map((s) => s.title)
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

/** Downloads a Wikisource work: the main page plus its chapters (subpages), up to `maxChapters`. */
export async function fetchWikisourceFullText(
  title: string,
  maxChapters = 40,
  onProgress?: (done: number, total: number) => void
): Promise<WikisourceFullText> {
  const main = await wikisourceExtract(title);
  const subs = await wikisourceSubpages(main.title);
  const sections: Array<{ heading: string; text: string }> = [];
  if (main.text.length > 200 || subs.length === 0) {
    sections.push({ heading: '', text: main.text });
  }
  const toLoad = subs.slice(0, maxChapters);
  for (let i = 0; i < toLoad.length; i++) {
    onProgress?.(i, toLoad.length);
    try {
      const ch = await wikisourceExtract(toLoad[i]);
      if (ch.text) {
        sections.push({ heading: ch.title.slice(main.title.length + 1).replace(/\//g, ' · '), text: ch.text });
      }
    } catch {
      // skip chapter
    }
  }
  return { title: main.title, sections, chaptersTotal: subs.length, chaptersLoaded: toLoad.length };
}

export async function searchOnlineBooks(query: string): Promise<OnlineBookResult[]> {
  const q = query.trim();
  if (!q) return [];
  const iaQuery = `(${q}) AND mediatype:texts AND format:PDF AND -access-restricted-item:true AND -collection:inlibrary AND -collection:printdisabled`;
  const iaUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
    iaQuery
  )}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&fl[]=language&sort[]=downloads+desc&rows=12&output=json`;

  const [ws, ia] = await Promise.all([
    searchWikisource(q).catch(() => [] as WikisourceSearchItem[]),
    fetch(iaUrl)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null) as Promise<{
      response?: {
        docs?: Array<{
          identifier: string;
          title?: string;
          creator?: string | string[];
          year?: string | number;
          language?: string | string[];
        }>;
      };
    } | null>,
  ]);

  const wsResults: OnlineBookResult[] = ws.slice(0, 8).map((w) => ({
    source: 'wikisource',
    id: w.title,
    title: w.title,
    author: 'Wikisource',
    detail: w.snippet.slice(0, 120),
    url: `https://es.wikisource.org/wiki/${encodeURIComponent(w.title.replace(/ /g, '_'))}`,
  }));

  const iaResults: OnlineBookResult[] = (ia?.response?.docs ?? []).map((d) => {
    const creator = Array.isArray(d.creator) ? d.creator[0] : d.creator;
    const lang = Array.isArray(d.language) ? d.language[0] : d.language;
    return {
      source: 'archive',
      id: d.identifier,
      title: d.title ?? d.identifier,
      author: creator ?? 'Autor desconocido',
      detail: [d.year, lang].filter(Boolean).join(' · '),
      url: `https://archive.org/details/${d.identifier}`,
    };
  });

  return [...wsResults, ...iaResults];
}

/** Finds the main PDF file of an Internet Archive item and returns its download URL. */
export async function resolveArchivePdfUrl(identifier: string): Promise<string | null> {
  const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { files?: Array<{ name: string; format?: string; size?: string }> };
  const pdfs = (data.files ?? []).filter((f) => /\.pdf$/i.test(f.name) && !/_text\.pdf$/i.test(f.name));
  if (pdfs.length === 0) return null;
  pdfs.sort((a, b) => Number(a.size ?? 0) - Number(b.size ?? 0));
  const pick = pdfs.find((f) => f.format === 'Text PDF') ?? pdfs[0];
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(pick.name)}`;
}

/** Tries to download a PDF directly (works only if the server allows CORS). */
export async function tryFetchPdf(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const head = new Uint8Array(buf.slice(0, 5));
    return String.fromCharCode(...head) === '%PDF-' ? buf : null;
  } catch {
    return null;
  }
}
