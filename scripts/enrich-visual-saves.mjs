#!/usr/bin/env node
/**
 * Enriches public captionless `visual` items in SavedVaultBank.ts using yt-dlp metadata
 * (no cookies/auth bypass) and updates categories/titles/summaries cleanly.
 * Usage:
 *   node scripts/enrich-visual-saves.mjs [--limit 50] [--frames-dir path]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BANK_PATH = path.join(ROOT, 'src', 'data', 'SavedVaultBank.ts');

const args = process.argv.slice(2);
function getArg(flag, fallback = null) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const YTDLP = process.env.YTDLP_BIN || 'yt-dlp';
const LIMIT = Number(getArg('--limit', '60')) || 60;

const CATEGORY_RULES = [
  ['oratoria', /\b(oratoria|hablar en p[úu]blico|voz|dicci[óo]n|persuasi[óo]n|comunicaci[óo]n|charisma|carisma|expresi[óo]n|entrevista|exponer)\b/i],
  ['tech', /\b(c[óo]digo|programaci[óo]n|python|javascript|typescript|react|sql|git|github|ia\b|inteligencia artificial|claude|chatgpt|prompt|linux|docker|api|software|web|frontend|backend|app|excel|power bi)\b/i],
  ['estudio', /\b(estudio|estudiar|examen|universidad|apuntes|lectura|leer|libro|pdf|memoria|aprendizaje|feynman|pomodoro|flashcards|matem[áa]tica|tesis)\b/i],
  ['carrera', /\b(cv|curr[íi]culum|empleo|trabajo|entrevista laboral|linkedin|sueldo|finanzas|inversi[óo]n|ahorro|negocio|emprender|productividad|notion|portfolio)\b/i],
  ['bienestar', /\b(gym|entreno|entrenamiento|m[úu]sculo|rutina|ejercicio|calistenia|sue[ñn]o|dormir|nutrici[óo]n|prote[íi]na|salud|postura|meditaci[óo]n|respiraci[óo]n|estr[ée]s|ansiedad)\b/i],
  ['mentalidad', /\b(h[áa]bito|disciplina|estoicismo|estoico|mentalidad|enfoque|concentraci[óo]n|dopamina|procrastinaci[óo]n|miedo|confianza|autoestima|psicolog[íi]a|mindset)\b/i],
  ['ocio', /\b(f[úu]tbol|humor|meme|receta|cocina|m[úu]sica|guitarra|anime|pel[íi]cula|serie|videojuego|minecraft|minecraft|viaje|comedia)\b/i],
];

function classifyText(text) {
  for (const [cat, re] of CATEGORY_RULES) {
    if (re.test(text)) return cat;
  }
  return 'otros';
}

function cleanDescription(raw) {
  return String(raw || '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveTitleAndSummary(info) {
  const uploader = (info.uploader || info.channel || '').trim();
  const cleanDesc = cleanDescription(info.description || '');
  const sentences = cleanDesc.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
  const firstSentence = sentences[0] || '';

  let title = '';
  if (firstSentence.length >= 10) {
    title = firstSentence.slice(0, 68).trim();
  } else if (uploader) {
    title = `Video de ${uploader}`.slice(0, 68);
  } else {
    title = 'Video público analizado';
  }

  let summary = '';
  if (cleanDesc.length >= 16) {
    summary = cleanDesc.slice(0, 217) + (cleanDesc.length > 217 ? '...' : '');
  } else if (uploader) {
    summary = `Clip guardado del creador @${uploader}.`.slice(0, 220);
  } else {
    summary = 'Reel público con metadatos capturados.';
  }

  const category = classifyText(`${title} ${summary} ${info.description || ''}`);
  const tagSeed = category === 'otros' ? 'instagram' : category;
  return { title, summary, category, tags: [tagSeed, uploader ? uploader.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 18) : 'video'].filter(Boolean) };
}

async function fetchPublicMeta(url) {
  const { stdout } = await execFileAsync(
    YTDLP,
    ['--no-warnings', '--no-playlist', '--skip-download', '--dump-single-json', url],
    { timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }
  );
  return JSON.parse(stdout);
}

async function main() {
  const raw = fs.readFileSync(BANK_PATH, 'utf8');
  const eqIdx = raw.indexOf('= [');
  const start = eqIdx !== -1 ? raw.indexOf('[', eqIdx) : raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('SavedVaultBank.ts format not recognized');

  const items = JSON.parse(raw.slice(start, end + 1));
  const targets = items.filter((it) => it.category === 'visual').slice(0, LIMIT);
  if (targets.length === 0) {
    console.log('No visual items pending enrichment.');
    return;
  }

  let updated = 0;
  for (const item of targets) {
    try {
      const info = await fetchPublicMeta(item.url);
      if (!info) continue;
      const cleanDesc = cleanDescription(info.description || '');
      if (cleanDesc.length < 12 && !info.uploader) continue;
      const derived = deriveTitleAndSummary(info);
      item.title = derived.title;
      item.summary = derived.summary;
      item.category = derived.category;
      item.tags = derived.tags;
      updated++;
    } catch {
      // Skip private/image-only/rate-limited posts cleanly without bypassing auth
    }
  }

  if (updated > 0) {
    const header = raw.slice(0, start);
    const footer = raw.slice(end + 1);
    fs.writeFileSync(BANK_PATH, `${header}${JSON.stringify(items, null, 2)}${footer}`, 'utf8');
  }
  console.log(`Visual enrichment complete: inspected=${targets.length}, updated=${updated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
