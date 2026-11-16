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
  importancia?: number;
  completada?: boolean;
}

export interface UmbralFreeGap {
  inicioLabel: string;
  finLabel: string;
  duracionMin: number;
}

export interface UmbralSnapshot {
  source: 'indexeddb' | 'json' | 'none';
  updatedAt: number;
  todayClassesCount: number;
  freeGaps: UmbralFreeGap[];
  criticalTasks: UmbralTaskItem[];
  pendingCount: number;
}

const SNAPSHOT_KEY = 'atelier_umbral_snapshot_v1';
const DAY_NAMES = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

export function resolveCompanionUrl(app: 'atelier' | 'unumbral' | 'arena'): string {
  const host = window.location.hostname;
  if (host.endsWith('github.io')) {
    if (app === 'atelier') return '../atelier-diario/';
    if (app === 'unumbral') return '../UNUmbral/';
    return '../omni-arena/';
  }
  if (app === 'atelier') return 'http://localhost:5176/';
  if (app === 'unumbral') return 'http://localhost:5177/';
  return 'http://localhost:5175/';
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
  source: UmbralSnapshot['source']
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
    updatedAt: Date.now(),
    todayClassesCount: todayClasses.length,
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

export async function loadUmbralSnapshot(): Promise<UmbralSnapshot> {
  // 1. Try reading live IndexedDB UmbralDB if it already exists on this origin (e.g. shared github.io)
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
          const [clases, tareas] = await Promise.all([
            readStore(db, 'clases'),
            readStore(db, 'tareas'),
          ]);
          db.close();
          if (clases.length > 0 || tareas.length > 0) {
            return computeSnapshot(
              clases as UmbralClassItem[],
              tareas as UmbralTaskItem[],
              'indexeddb'
            );
          }
        }
      }
    }
  } catch {
    // Fallback to imported JSON snapshot
  }

  // 2. Fallback to manually imported JSON backup
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        clases?: UmbralClassItem[];
        tareas?: UmbralTaskItem[];
      };
      return computeSnapshot(parsed.clases ?? [], parsed.tareas ?? [], 'json');
    }
  } catch {
    // Ignore corrupt JSON
  }

  return {
    source: 'none',
    updatedAt: Date.now(),
    todayClassesCount: 0,
    freeGaps: [],
    criticalTasks: [],
    pendingCount: 0,
  };
}

export function importUmbralBackupJson(rawText: string): UmbralSnapshot {
  const parsed = JSON.parse(rawText) as {
    clases?: UmbralClassItem[];
    tareas?: UmbralTaskItem[];
    data?: { clases?: UmbralClassItem[]; tareas?: UmbralTaskItem[] };
  };
  const clases = parsed.clases ?? parsed.data?.clases ?? [];
  const tareas = parsed.tareas ?? parsed.data?.tareas ?? [];
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ clases, tareas }));
  return computeSnapshot(clases, tareas, 'json');
}
