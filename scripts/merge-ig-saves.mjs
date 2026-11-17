import fs from 'node:fs';
import path from 'node:path';

const VAULT_TS = path.resolve(import.meta.dirname, '../src/data/SavedVaultBank.ts');

const args = process.argv.slice(2);
const deltaIdx = args.indexOf('--delta');
const cleanDirIdx = args.indexOf('--clean-dir');
const masterIdx = args.indexOf('--master');

function readJsonBom(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function stripIgFluff(raw) {
  let s = (raw || '')
    .replace(/\uFFFC/g, ' ')
    .replace(/\s*Clip(?:\s+\d+)?\s*$/i, '')
    .replace(/(?:💾|👉|👇|📌|🔥|✨|🧠|🗣️|💡|🎙️|✅|❌|⚠️|📲|🔗|📚|🎯)+/gu, ' ')
    .replace(/(?:comenta|escribe|escribime|manda|envia|envía)\s+["'“”]?[A-ZÁÉÍÓÚÑ0-9_]{2,}["'“”]?\s+y\s+(?:te\s+)?(?:env[ií]o|paso|mando)[^.!?\n]*[.!?]?/giu, ' ')
    .replace(/(?:link|enlace)\s+en\s+(?:mi\s+)?(?:bio|perfil)[^.!?\n]*[.!?]?/giu, ' ')
    .replace(/(?:guarda|gu[aá]rdalo|comparte|comp[aá]rtelo|s[ií]gueme)\s+(?:este\s+(?:reel|post|video)|para\s+(?:no\s+olvidarlo|despu[eé]s|probarlo))[^.!?\n]*[.!?]?/giu, ' ')
    .replace(/(?:\s+#[\p{L}\p{N}_]+)+\s*$/gu, '')
    .replace(/#([\p{L}\p{N}_]+)/gu, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

function extractTags(raw) {
  const matches = (raw || '').match(/#[\p{L}\p{N}_]+/gu) || [];
  const ignore = new Set(['fyp', 'parati', 'viral', 'reel', 'reels', 'shorts', 'explore', 'trending']);
  const out = [];
  for (const m of matches) {
    const clean = m.slice(1).toLowerCase();
    if (!ignore.has(clean) && clean.length > 1 && !out.includes(clean)) {
      out.push(clean);
      if (out.length >= 3) break;
    }
  }
  return out;
}

function classifyFallback(text) {
  const n = norm(text);
  if (n.replace(/[^a-z0-9\s]/g, '').trim().length < 14) return 'visual';
  if (/\b(anime|manga|fortnite|juego|gaming|meme|pelicula|serie|valorant|minecraft)\b/.test(n)) return 'ocio';
  if (/\b(ia|ai|chatgpt|claude|gemini|python|java|sql|css|html|javascript|typescript|react|programacion|software|linux|git|api|excel|prompt|docker|vscode)\b/.test(n)) return 'tech';
  if (/\b(hablar|oratoria|comunicacion|diccion|liderazgo|persuasion|carisma|conversar|debate|argumentar|exponer|entrevista|escuchar)\b/.test(n)) return 'oratoria';
  if (/\b(psicologia|mentalidad|habito|disciplina|ansiedad|calma|estoico|autoestima|procrastinacion|dopamina|enfoque|sesgo|mindset|sobrepensar)\b/.test(n)) return 'mentalidad';
  if (/\b(estudiar|estudio|universidad|aprender|examen|resumen|libro|lectura|memoria|ingles|caligrafia|ortografia|vocabulario|tesis|evocacion)\b/.test(n)) return 'estudio';
  if (/\b(dinero|finanzas|ahorro|invertir|negocio|trabajo|curriculum|empleo|cliente|vender|emprender|productividad)\b/.test(n)) return 'carrera';
  if (/\b(gym|entrenar|ejercicio|postura|dormir|salud|respiracion|canto|vocal|afinacion|musica|guitarra|piano)\b/.test(n)) return 'bienestar';
  return 'otros';
}

function extractShortTitle(clean, index) {
  if (!clean || clean.length < 8) return `Guardado visual #${index}`;
  const sent = clean.match(/^(.{10,68}?[.!?…])(?:\s|$)/);
  let title = sent ? sent[1].trim() : clean;
  if (title.length > 68) title = title.slice(0, 66).replace(/\s+\S*$/, '').trim() + '…';
  return title.replace(/[\s.]+$/g, (m) => (m.includes('…') ? '…' : ''));
}

function parseCurrentVault() {
  const ts = fs.readFileSync(VAULT_TS, 'utf8');
  const idx = ts.indexOf('= [');
  return JSON.parse(ts.slice(idx + 2, ts.lastIndexOf(']') + 1));
}

function writeVault(items) {
  const tsContent = `import { VaultItem } from '../types';

// Generado y depurado desde los guardados de Instagram (@jjm16_md)
export const VAULT_BANK: VaultItem[] = ${JSON.stringify(items, null, 2)};
`;
  fs.writeFileSync(VAULT_TS, tsContent, 'utf8');
}

const VALID_CATS = new Set([
  'mentalidad', 'oratoria', 'tech', 'estudio', 'carrera', 'bienestar', 'ocio', 'visual', 'otros',
]);

// Modo 1: fusionar clean_*.json generados por lotes de subagentes sobre los datos existentes
if (cleanDirIdx >= 0 && args[cleanDirIdx + 1]) {
  const cleanDir = args[cleanDirIdx + 1];
  const masterPath = masterIdx >= 0 ? args[masterIdx + 1] : null;
  const masterMap = new Map();
  if (masterPath && fs.existsSync(masterPath)) {
    for (const r of readJsonBom(masterPath)) {
      const url = (r.url || '').trim().split('?')[0];
      const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/]+)/i);
      const id = m ? `ig-${m[1]}` : `ig-row-${r.index}`;
      masterMap.set(id, { ...r, url });
    }
  }

  const cleanedById = new Map();
  const files = fs.readdirSync(cleanDir).filter((f) => /^clean_(?:\d+|frames|vis_\d+)\.json$/i.test(f)).sort();
  for (const f of files) {
    const arr = readJsonBom(path.join(cleanDir, f));
    for (const row of arr) {
      if (row && row.id) cleanedById.set(row.id, row);
    }
  }

  const current = parseCurrentVault();
  const updated = current.map((item) => {
    const c = cleanedById.get(item.id);
    if (!c) {
      // Limpiar captions visuales cortos
      const cleanVis = stripIgFluff(item.summary);
      return {
        ...item,
        title: item.title.replace(/\s*Clip$/i, '').trim(),
        summary: cleanVis || 'Reel o publicación visual sin descripción de texto.',
      };
    }
    const cat = VALID_CATS.has(c.c) ? c.c : item.category;
    let title = String(c.t || item.title).trim().replace(/\.{2,}$/, '').replace(/\s+/g, ' ').trim();
    if (title.length > 68) title = title.slice(0, 66).replace(/\s+\S*$/, '').trim() + '…';
    let summary = stripIgFluff(String(c.m || item.summary)).replace(/\s*\.{2,}\s*/g, '. ').replace(/\s+/g, ' ').trim();
    if (!summary || summary.length < 8) summary = title;
    summary = summary.slice(0, 240);
    const tags = Array.isArray(c.k) ? c.k.map((x) => String(x).toLowerCase().replace(/^#/, '')).filter(Boolean).slice(0, 4) : item.tags;
    return {
      id: item.id,
      index: item.index,
      url: item.url,
      title,
      summary,
      category: cat,
      tags,
    };
  });

  writeVault(updated);
  const counts = {};
  for (const x of updated) counts[x.category] = (counts[x.category] || 0) + 1;
  console.log(`Merged ${cleanedById.size} AI-cleaned items into ${VAULT_TS}. Total: ${updated.length}`, counts);
  process.exit(0);
}

// Modo 2: anteponer nuevos guardados desde --delta
if (deltaIdx >= 0 && args[deltaIdx + 1]) {
  const deltaPath = args[deltaIdx + 1];
  const delta = readJsonBom(deltaPath);
  const current = parseCurrentVault();
  const knownUrls = new Set(current.map((x) => (x.url || '').trim().split('?')[0]));

  const prepended = [];
  for (const row of delta) {
    const url = (row.url || '').trim().split('?')[0];
    if (!url || knownUrls.has(url)) continue;
    knownUrls.add(url);
    const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/]+)/i);
    const id = m ? `ig-${m[1]}` : `ig-new-${Date.now()}-${prepended.length}`;
    const clean = stripIgFluff(row.caption);
    const category = classifyFallback(clean);
    const title = extractShortTitle(clean, row.index || prepended.length + 1);
    const summary = clean ? clean.slice(0, 240) : 'Reel o publicación visual guardada recientemente.';
    const tags = extractTags(row.caption);
    prepended.push({ id, index: row.index || 1, url, title, summary, category, tags });
  }

  const combined = [...prepended, ...current].map((item, idx) => ({ ...item, index: idx + 1 }));
  writeVault(combined);
  console.log(`Prepended ${prepended.length} new saves into SavedVaultBank.ts. Total: ${combined.length}`);
  process.exit(0);
}

console.log('Uso: node merge-ig-saves.mjs --clean-dir <dir> | --delta <delta.json>');
