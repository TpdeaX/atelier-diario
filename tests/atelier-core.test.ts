import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

// Entorno minimo de navegador para importar los stores en Node.
const mem = new Map<string, string>();
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};
g.window = globalThis;

type Store = typeof import('../src/state/LifeStore.ts');
type Types = typeof import('../src/types.ts');
type Bridge = typeof import('../src/services/UmbralBridge.ts');
type Directory = typeof import('../src/state/DirectoryStore.ts');

let store: Store;
let types: Types;
let bridge: Bridge;
let directory: Directory;

before(async () => {
  types = await import('../src/types.ts');
  store = await import('../src/state/LifeStore.ts');
  bridge = await import('../src/services/UmbralBridge.ts');
  directory = await import('../src/state/DirectoryStore.ts');
});

describe('normalizeProfile (migracion drawing)', () => {
  it('hidrata drawing en un perfil antiguo sin perder racha ni estadisticas', () => {
    const legacy = {
      dailyStreak: 7,
      lastActiveDay: '2026-11-18',
      todayHabits: { read: true, calm: true },
      stats: { calmSessions: 12, calligraphySheets: 3 },
      modulePrefs: { calm: { patternId: 'box', soundCue: false, groundingIdx: 3 } },
    };
    const p = store.normalizeProfile(legacy as never);
    assert.equal(p.dailyStreak, 7);
    assert.equal(p.stats.calmSessions, 12);
    assert.equal(p.stats.calligraphySheets, 3);
    assert.equal(p.todayHabits.drawing, false);
    assert.equal(p.todayHabits.read, true);
    assert.equal(p.stats.drawingSheets, 0);
    assert.deepEqual(p.modulePrefs.drawing, {
      mode: 'lessons',
      lessonId: 'stroke-lines',
      brushColor: '#1E293B',
      brushSize: 4,
      brushOpacity: 1,
      symmetry: 'none',
      grid: 'none',
      showGuide: true,
    });
    assert.equal(p.modulePrefs.calm.patternId, 'box');
  });

  it('acepta null / basura sin lanzar y devuelve defaults', () => {
    assert.equal(store.normalizeProfile(null).stats.drawingSheets, 0);
    const bad = store.normalizeProfile({
      stats: { drawingSheets: 'x' },
      modulePrefs: { drawing: { mode: 'raro', brushSize: -4, symmetry: 'zzz', grid: 'zzz' } },
    } as never);
    assert.equal(bad.stats.drawingSheets, 0);
    assert.equal(bad.modulePrefs.drawing.mode, 'lessons');
    assert.equal(bad.modulePrefs.drawing.symmetry, 'none');
    assert.equal(bad.modulePrefs.drawing.grid, 'none');
    assert.ok(bad.modulePrefs.drawing.brushSize >= 1);
  });

  it('recordDrawingSheet suma lamina y marca el habito drawing', () => {
    const before = store.lifeStore.get().stats.drawingSheets;
    store.lifeStore.recordDrawingSheet();
    assert.equal(store.lifeStore.get().stats.drawingSheets, before + 1);
    assert.equal(store.lifeStore.get().todayHabits.drawing, true);
  });
});

describe('parseHashRoute', () => {
  it('reconoce SOS y modulos validos', () => {
    assert.deepEqual(types.parseHashRoute('#calm?sos=1'), { moduleId: 'calm', sos: true });
    assert.deepEqual(types.parseHashRoute('#sos'), { moduleId: 'calm', sos: true });
    assert.deepEqual(types.parseHashRoute('#calm'), { moduleId: 'calm', sos: false });
    assert.deepEqual(types.parseHashRoute('#drawing'), { moduleId: 'drawing', sos: false });
    assert.deepEqual(types.parseHashRoute('#singing'), { moduleId: 'singing', sos: false });
  });

  it('cae a home con hashes desconocidos o vacios', () => {
    assert.deepEqual(types.parseHashRoute('#nada'), { moduleId: 'home', sos: false });
    assert.deepEqual(types.parseHashRoute(''), { moduleId: 'home', sos: false });
    assert.deepEqual(types.parseHashRoute('#'), { moduleId: 'home', sos: false });
  });
});

describe('contadores y directorio', () => {
  it('DEFAULT_ARENA_META refleja 33 disciplinas y 15 academias', () => {
    assert.deepEqual(bridge.DEFAULT_ARENA_META, {
      total: 33,
      academies: 15,
      dexterity2d: 13,
      action3d: 5,
    });
  });

  it('mod-drawing va justo despues de mod-calligraphy', () => {
    const order = directory.DEFAULT_DIRECTORY_ORDER;
    assert.equal(order.indexOf('mod-drawing'), order.indexOf('mod-calligraphy') + 1);
  });
});
