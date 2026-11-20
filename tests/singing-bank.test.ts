import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  EAR_INTERVALS,
  EAR_INTERVALS_FULL,
  SINGING_DRILLS,
  SINGING_SONGS,
  VOWEL_DRILLS,
  WARMUP_CHAIN_STEPS,
} from '../src/data/SingingBank.ts';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

const ORIGINAL_SONG_IDS = [
  'ode',
  'twinkle',
  'frere',
  'birthday',
  'arroz',
  'cielito',
  'bamba',
  'nochepaz',
  'scarborough',
  'greensleeves',
  'elisa',
  'minueto',
  'ojosazules',
  'bellaciao',
  'auldlangsyne',
];

describe('SingingBank: 34 canciones con acordes', () => {
  it('tiene exactamente 34 canciones, conserva las 15 originales y valida notas, acordes y 0 emojis', () => {
    assert.equal(SINGING_SONGS.length, 34);
    assert.deepEqual(
      SINGING_SONGS.slice(0, ORIGINAL_SONG_IDS.length).map((s) => s.id),
      ORIGINAL_SONG_IDS
    );

    const ids = new Set<string>();
    const titles = new Set<string>();
    for (const song of SINGING_SONGS) {
      assert.ok(!ids.has(song.id), `id duplicado: ${song.id}`);
      ids.add(song.id);
      const normTitle = song.title.trim().toLowerCase();
      assert.ok(!titles.has(normTitle), `titulo duplicado: ${song.title}`);
      titles.add(normTitle);
      assert.ok(song.title.length >= 3);
      assert.ok(!EMOJI_RE.test(song.title), `emoji en titulo: ${song.title}`);
      assert.ok(!EMOJI_RE.test(song.description), `emoji en descripcion: ${song.id}`);
      assert.ok(song.bpm > 40 && song.bpm <= 180, `${song.id} bpm invalido`);
      assert.ok(song.notes.length >= 8, `${song.id} necesita al menos 8 notas`);
      for (const n of song.notes) {
        assert.ok(n.midi >= 36 && n.midi <= 84, `${song.id} midi fuera de rango: ${n.midi}`);
        assert.ok(n.beats > 0);
        assert.ok(n.lyric.trim().length > 0, `${song.id} tiene silaba vacia`);
        assert.ok(!EMOJI_RE.test(n.lyric), `emoji en lyric de ${song.id}`);
      }
      assert.ok(Array.isArray(song.chords) && song.chords.length >= 2, `${song.id} necesita acordes`);
      for (const ch of song.chords) {
        assert.ok(ch.startBeat >= 0);
        assert.ok(ch.midis.length >= 3);
      }
    }
  });
});

describe('SingingBank: 28 drills vocales', () => {
  it('tiene exactamente 28 drills con ids y titulos unicos, notas validas y sin emojis', () => {
    assert.equal(SINGING_DRILLS.length, 28);
    const ids = new Set<string>();
    const titles = new Set<string>();
    const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const d of SINGING_DRILLS) {
      assert.ok(!ids.has(d.id), `drill id duplicado: ${d.id}`);
      ids.add(d.id);
      const normTitle = d.title.trim().toLowerCase();
      assert.ok(!titles.has(normTitle), `drill titulo duplicado: ${d.title}`);
      titles.add(normTitle);
      assert.ok([1, 2, 3].includes(d.level), `nivel invalido en ${d.id}`);
      byLevel[d.level] += 1;
      assert.ok(d.notes.length >= 3, `${d.id} necesita al menos 3 notas`);
      for (const midi of d.notes) {
        assert.ok(midi >= 36 && midi <= 84, `${d.id} midi fuera de rango: ${midi}`);
      }
      assert.ok(d.tip.trim().length >= 10, `${d.id} tip demasiado corto`);
      assert.ok(!EMOJI_RE.test(d.title) && !EMOJI_RE.test(d.tip), `emoji en drill ${d.id}`);
    }
    assert.ok(byLevel[1] >= 8 && byLevel[2] >= 8 && byLevel[3] >= 8, `distribucion desequilibrada: ${JSON.stringify(byLevel)}`);
  });
});

describe('SingingBank: calentamiento 5 min y vocales', () => {
  it('WARMUP_CHAIN_STEPS tiene 5 pasos que suman 300 segundos', () => {
    assert.equal(WARMUP_CHAIN_STEPS.length, 5);
    const total = WARMUP_CHAIN_STEPS.reduce((acc, s) => acc + s.durationSec, 0);
    assert.equal(total, 300);
    for (const s of WARMUP_CHAIN_STEPS) {
      assert.ok(s.title.length > 3);
      assert.ok(s.instruction.length > 8);
      assert.ok(s.guideNotes.length >= 3);
    }
  });

  it('VOWEL_DRILLS cubre A, E, I, O, U', () => {
    assert.deepEqual(
      VOWEL_DRILLS.map((v) => v.vowel),
      ['A', 'E', 'I', 'O', 'U']
    );
  });
});

describe('SingingBank: intervalos de oido', () => {
  it('EAR_INTERVALS mantiene los 3 basicos y EAR_INTERVALS_FULL cubre los 12 semitonos 1..12', () => {
    assert.equal(EAR_INTERVALS.length, 3);
    assert.equal(EAR_INTERVALS_FULL.length, 12);
    const semis = EAR_INTERVALS_FULL.map((i) => i.semitones).sort((a, b) => a - b);
    assert.deepEqual(semis, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const ids = new Set(EAR_INTERVALS_FULL.map((i) => i.id));
    assert.equal(ids.size, 12);
  });
});
