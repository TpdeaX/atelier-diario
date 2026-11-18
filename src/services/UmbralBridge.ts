import { directoryStore } from '../state/DirectoryStore';
import { lifeStore } from '../state/LifeStore';
import { EcoAppId } from '../types';

export interface UmbralClassItem {
  id?: string | number;
  materia?: string;
  curso_id?: string | number;
  dia_semana?: string | number;
  hora_inicio?: string;
  hora_fin?: string;
  aula?: string;
}

export interface UmbralTaskItem {
  id?: string | number;
  titulo?: string;
  fecha_entrega?: string;
  fecha_limite?: string;
  importancia?: number;
  completada?: boolean;
}

export interface UmbralFreeGap {
  inicioLabel: string;
  finLabel: string;
  duracionMin: number;
}

export interface UmbralSnapshot {
  source: 'indexeddb' | 'supabase' | 'json' | 'none';
  updatedAt: number;
  todayClassesCount: number;
  coursesCount: number;
  freeGaps: UmbralFreeGap[];
  criticalTasks: UmbralTaskItem[];
  pendingCount: number;
}

export interface ArenaSnapshot {
  source: 'local' | 'supabase' | 'none';
  level: number;
  xp: number;
  overallRating: number;
  streak: number;
  totalRuns: number;
}

const SNAPSHOT_KEY = 'atelier_umbral_snapshot_v1';
const UNUMBRAL_SNAPSHOT_KEY = 'unumbral_last_snapshot_v1';
const ARENA_LOCAL_KEY = 'omni_arena_profile_v1';
const ARENA_CLOUD_CACHE_KEY = 'atelier_arena_snapshot_v1';
const ARENA_META_KEY = 'omni_arena_catalog_meta_v1';
const DAY_NAMES = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export interface ArenaCatalogMeta {
  total: number;
  academies: number;
  dexterity2d: number;
  action3d: number;
}

const DEFAULT_ARENA_META: ArenaCatalogMeta = {
  total: 26,
  academies: 8,
  dexterity2d: 13,
  action3d: 5,
};

const ECO_APP_PORT: Record<EcoAppId, number> = {
  directorio: 5178,
  atelier: 5176,
  unumbral: 5177,
  arena: 5175,
};

const ECO_APP_PATH: Record<EcoAppId, string> = {
  directorio: '/directorio/',
  atelier: '/atelier-diario/',
  unumbral: '/UNUmbral/',
  arena: '/omni-arena/',
};

function isPrivateIp(host: string): boolean {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
}

export function resolveEcoUrl(
  app: EcoAppId,
  opts: { hash?: string; carryTheme?: boolean } = {}
): string {
  const cleanHash = opts.hash ? `#${opts.hash.replace(/^#/, '')}` : '';
  const carryTheme = opts.carryTheme !== false;
  const ecoTheme = lifeStore.get().theme === 'night' ? 'dark' : 'light';

  const customUrls = directoryStore.get().companionUrls;
  const custom =
    app === 'atelier'
      ? customUrls.atelier?.trim()
      : app === 'unumbral'
        ? customUrls.unumbral?.trim()
        : app === 'arena'
          ? customUrls.arena?.trim()
          : '';

  if (custom) {
    let base = `${custom.replace(/#.*$/, '').replace(/\/?$/, '/')}`;
    try {
      if (carryTheme) {
        const targetOrigin = new URL(base, window.location.href).origin;
        if (targetOrigin !== window.location.origin) {
          base = `${base}${base.includes('?') ? '&' : '?'}eco_theme=${ecoTheme}`;
        }
      }
    } catch {
      // Ignore URL parse error
    }
    return `${base}${cleanHash}`;
  }

  const host = window.location.hostname;
  const port = window.location.port ?? '';
  const protocol = window.location.protocol || 'http:';
  const isCapacitor = Boolean((window as { Capacitor?: unknown }).Capacitor);

  const route = ECO_APP_PATH[app];
  const appPort = ECO_APP_PORT[app];

  let base = '';
  let crossOrigin = false;

  if (isCapacitor || (host === 'localhost' && port === '')) {
    base = `https://tpdeax.github.io${route}`;
    crossOrigin = true;
  } else if (host.endsWith('github.io')) {
    base = `..${route}`;
    crossOrigin = false;
  } else if (
    port !== '' &&
    (host === 'localhost' || host === '127.0.0.1' || isPrivateIp(host))
  ) {
    base = `${protocol}//${host}:${appPort}/`;
    crossOrigin = String(appPort) !== String(port);
  } else {
    base = `https://tpdeax.github.io${route}`;
    crossOrigin = true;
  }

  if (crossOrigin && carryTheme) {
    base = `${base}${base.includes('?') ? '&' : '?'}eco_theme=${ecoTheme}`;
  }
  return `${base}${cleanHash}`;
}

export function resolveCompanionUrl(
  app: 'directorio' | 'atelier' | 'unumbral' | 'arena',
  hash?: string
): string {
  return resolveEcoUrl(app, { hash });
}

export function readArenaCatalogMeta(): ArenaCatalogMeta {
  try {
    const raw = localStorage.getItem(ARENA_META_KEY);
    if (!raw) return DEFAULT_ARENA_META;
    const p = JSON.parse(raw) as Partial<ArenaCatalogMeta>;
    const total = Number(p.total);
    const academies = Number(p.academies);
    if (Number.isFinite(total) && total > 0 && Number.isFinite(academies) && academies >= 0) {
      return {
        total,
        academies,
        dexterity2d: Number(p.dexterity2d) || DEFAULT_ARENA_META.dexterity2d,
        action3d: Number(p.action3d) || DEFAULT_ARENA_META.action3d,
      };
    }
  } catch {
    // Fallback
  }
  return DEFAULT_ARENA_META;
}

function parseMinutes(str?: string): number {
  if (!str) return -1;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return -1;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3]?.toUpperCase();
  if (mer === 'PM' && h < 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function format12h(totalMin: number): string {
  let h = Math.floor(totalMin / 60);
  const m = String(totalMin % 60).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

function isSameDay(diaVal: string | number | undefined, jsDay: number): boolean {
  if (diaVal === undefined || diaVal === null) return false;
  if (typeof diaVal === 'number') {
    const isoDay = jsDay === 0 ? 7 : jsDay;
    return diaVal === jsDay || diaVal === isoDay;
  }
  const clean = String(diaVal)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
  const target = DAY_NAMES[jsDay];
  return clean === target || clean.startsWith(target.slice(0, 3));
}

function computeSnapshot(
  clases: UmbralClassItem[],
  tareas: UmbralTaskItem[],
  coursesCount: number,
  source: UmbralSnapshot['source'],
  updatedAt = Date.now()
): UmbralSnapshot {
  const jsDay = new Date().getDay();
  const todayClasses = clases
    .filter((c) => isSameDay(c.dia_semana, jsDay))
    .map((c) => ({
      start: parseMinutes(c.hora_inicio),
      end: parseMinutes(c.hora_fin),
    }))
    .filter((c) => c.start >= 0 && c.end > c.start)
    .sort((a, b) => a.start - b.start);

  const freeGaps: UmbralFreeGap[] = [];
  for (let i = 0; i < todayClasses.length - 1; i++) {
    const gapStart = todayClasses[i].end;
    const gapEnd = todayClasses[i + 1].start;
    const dur = gapEnd - gapStart;
    if (dur >= 30) {
      freeGaps.push({
        inicioLabel: format12h(gapStart),
        finLabel: format12h(gapEnd),
        duracionMin: dur,
      });
    }
  }

  const pending = tareas.filter((t) => !t.completada);
  const critical = [...pending]
    .sort((a, b) => (b.importancia ?? 0) - (a.importancia ?? 0))
    .filter((t) => (t.importancia ?? 0) >= 4)
    .slice(0, 4);

  return {
    source,
    updatedAt,
    todayClassesCount: todayClasses.length,
    coursesCount,
    freeGaps,
    criticalTasks: critical,
    pendingCount: pending.length,
  };
}

async function readStore(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  if (!db.objectStoreNames.contains(storeName)) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export function cacheRemoteUmbralBackup(payload: unknown, updatedAt = Date.now()): void {
  if (!payload || typeof payload !== 'object') return;
  try {
    localStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ ...(payload as Record<string, unknown>), _source: 'supabase', _updatedAt: updatedAt })
    );
  } catch {
    // Ignore storage error
  }
}

export function cacheRemoteArenaProfile(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return;
  try {
    localStorage.setItem(ARENA_CLOUD_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage error
  }
}

export function loadArenaSnapshot(): ArenaSnapshot {
  const tryParse = (raw: string | null, source: 'local' | 'supabase'): ArenaSnapshot | null => {
    if (!raw) return null;
    try {
      const p = JSON.parse(raw) as {
        level?: number;
        xp?: number;
        dailyStreak?: number;
        ratings?: Record<string, number>;
        playCounts?: Record<string, number>;
      };
      if (!p || typeof p !== 'object') return null;
      const ratingVals = Object.values(p.ratings ?? {});
      const overall = ratingVals.length
        ? Math.round(ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length)
        : 300;
      const totalRuns = Object.values(p.playCounts ?? {}).reduce((a, b) => a + b, 0);
      return {
        source,
        level: p.level ?? 1,
        xp: p.xp ?? 0,
        overallRating: overall,
        streak: p.dailyStreak ?? 0,
        totalRuns,
      };
    } catch {
      return null;
    }
  };

  return (
    tryParse(localStorage.getItem(ARENA_LOCAL_KEY), 'local') ??
    tryParse(localStorage.getItem(ARENA_CLOUD_CACHE_KEY), 'supabase') ?? {
      source: 'none',
      level: 1,
      xp: 0,
      overallRating: 300,
      streak: 0,
      totalRuns: 0,
    }
  );
}

export async function loadUmbralSnapshot(): Promise<UmbralSnapshot> {
  // 1. Live IndexedDB UmbralDB on shared origin
  try {
    if ('databases' in indexedDB) {
      const dbs = await indexedDB.databases();
      const hasUmbral = dbs.some((d) => d.name === 'UmbralDB');
      if (hasUmbral) {
        const db = await new Promise<IDBDatabase | null>((resolve) => {
          const req = indexedDB.open('UmbralDB');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });
        if (db) {
          const [clases, tareas, cursos] = await Promise.all([
            readStore(db, 'clases'),
            readStore(db, 'tareas'),
            readStore(db, 'cursos'),
          ]);
          db.close();
          if (clases.length > 0 || tareas.length > 0 || cursos.length > 0) {
            return computeSnapshot(
              clases as UmbralClassItem[],
              tareas as UmbralTaskItem[],
              cursos.length,
              'indexeddb'
            );
          }
        }
      }
    }
  } catch {
    // Fallback to Supabase/JSON snapshot
  }

  // 2. Supabase-synced or manually imported JSON snapshot
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        clases?: UmbralClassItem[];
        tareas?: UmbralTaskItem[];
        cursos?: unknown[];
        _source?: 'supabase' | 'json';
        _updatedAt?: number;
      };
      return computeSnapshot(
        parsed.clases ?? [],
        parsed.tareas ?? [],
        Array.isArray(parsed.cursos) ? parsed.cursos.length : 0,
        parsed._source === 'supabase' ? 'supabase' : 'json',
        parsed._updatedAt || Date.now()
      );
    }

    const snapRaw = localStorage.getItem(UNUMBRAL_SNAPSHOT_KEY);
    if (snapRaw) {
      const snap = JSON.parse(snapRaw) as {
        coursesCount?: number;
        pendingTasks?: number;
        todayClasses?: number;
        updatedAt?: number;
      };
      if (typeof snap.coursesCount === 'number') {
        return {
          source: 'indexeddb',
          updatedAt: Number(snap.updatedAt) || Date.now(),
          todayClassesCount: Number(snap.todayClasses) || 0,
          coursesCount: Number(snap.coursesCount) || 0,
          freeGaps: [],
          criticalTasks: [],
          pendingCount: Number(snap.pendingTasks) || 0,
        };
      }
    }
  } catch {
    // Ignore corrupt JSON
  }

  return {
    source: 'none',
    updatedAt: Date.now(),
    todayClassesCount: 0,
    coursesCount: 0,
    freeGaps: [],
    criticalTasks: [],
    pendingCount: 0,
  };
}

export function importUmbralBackupJson(rawText: string): UmbralSnapshot {
  const parsed = JSON.parse(rawText) as {
    clases?: UmbralClassItem[];
    tareas?: UmbralTaskItem[];
    cursos?: unknown[];
    data?: { clases?: UmbralClassItem[]; tareas?: UmbralTaskItem[]; cursos?: unknown[] };
  };
  const clases = parsed.clases ?? parsed.data?.clases ?? [];
  const tareas = parsed.tareas ?? parsed.data?.tareas ?? [];
  const cursos = parsed.cursos ?? parsed.data?.cursos ?? [];
  localStorage.setItem(
    SNAPSHOT_KEY,
    JSON.stringify({ clases, tareas, cursos, _source: 'json', _updatedAt: Date.now() })
  );
  return computeSnapshot(clases, tareas, cursos.length, 'json');
}
