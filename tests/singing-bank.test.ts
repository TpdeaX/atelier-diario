import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  EAR_INTERVALS,
  EAR_INTERVALS_FULL,
  SINGING_SONGS,
  VOWEL_DRILLS,
  WARMUP_CHAIN_STEPS,
} from '../src/data/SingingBank.ts';

describe('SingingBank: 15 canciones con acordes', () => {
  it('tiene exactamente 15 canciones con ids unicos, notas validas y acordes', () => {
    assert.equal(SINGING_SONGS.length, 15);
    const ids = new Set<string>();
    for (const song of SINGING_SONGS) {
      assert.ok(!ids.has(song.id), `id duplicado: ${song.id}`);
      ids.add(song.id);
      assert.ok(song.title.length >= 3);
      assert.ok(song.bpm > 40 && song.bpm <= 180, `${song.id} bpm invalido`);
      assert.ok(song.notes.length >= 8, `${song.id} necesita al menos 8 notas`);
      for (const n of song.notes) {
        assert.ok(n.midi >= 36 && n.midi <= 84, `${song.id} midi fuera de rango: ${n.midi}`);
        assert.ok(n.beats > 0);
        assert.ok(n.lyric.trim().length > 0, `${song.id} tiene silaba vacia`);
      }
      assert.ok(Array.isArray(song.chords) && song.chords.length >= 2, `${song.id} necesita acordes`);
      for (const ch of song.chords) {
        assert.ok(ch.startBeat >= 0);
        assert.ok(ch.midis.length >= 3);
      }
    }
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
