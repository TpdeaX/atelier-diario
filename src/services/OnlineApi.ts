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
}

function stripHtml(raw: string): string {
  const div = document.createElement('div');
  div.innerHTML = raw;
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim();
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
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&language=spa&limit=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as {
    docs?: Array<{
      title?: string;
      author_name?: string[];
      first_publish_year?: number;
      subject?: string[];
      key?: string;
    }>;
  };
  return (data.docs ?? []).map((d) => ({
    title: d.title ?? 'Sin título',
    author: d.author_name?.[0] ?? 'Autor desconocido',
    year: d.first_publish_year,
    subject: d.subject?.slice(0, 3).join(' · '),
    key: d.key ?? '',
  }));
}
