import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CLASSIC_WIKISOURCE_SUGGESTIONS,
  ORTHOGRAPHY_BANK,
  PHRASES_BANK,
  VOCABULARY_DECK,
} from '../src/data/KnowledgeBank.ts';
import {
  DICTION_DRILLS,
  FLASHCARDS_BANK,
  ORATORY_PROMPTS,
} from '../src/data/FocusLabBank.ts';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

describe('KnowledgeBank: ortografia, vocabulario, frases y clasicos', () => {
  it('ORTHOGRAPHY_BANK tiene >= 80 preguntas con ids unicos, hueco ___ y sin < ni > ni emojis', () => {
    assert.ok(ORTHOGRAPHY_BANK.length >= 80, `esperado >= 80, obtuvo ${ORTHOGRAPHY_BANK.length}`);
    const ids = new Set<string>();
    const sentences = new Set<string>();
    for (const q of ORTHOGRAPHY_BANK) {
      assert.ok(!ids.has(q.id), `id duplicado: ${q.id}`);
      ids.add(q.id);
      const normSent = q.sentence.trim().toLowerCase();
      assert.ok(!sentences.has(normSent), `oracion duplicada: ${q.sentence}`);
      sentences.add(normSent);
      assert.ok(q.sentence.includes('___'), `${q.id} debe incluir ___`);
      assert.ok(!/[<>]/.test(q.sentence), `${q.id} contiene < o > crudo`);
      assert.ok(!/[<>]/.test(q.rule), `${q.id} rule contiene < o > crudo`);
      assert.ok(q.options.length >= 3, `${q.id} necesita al menos 3 opciones`);
      assert.ok(q.correctIndex >= 0 && q.correctIndex < q.options.length, `${q.id} correctIndex fuera de rango`);
      assert.ok(q.rule.trim().length >= 12, `${q.id} regla demasiado corta`);
      assert.ok(!EMOJI_RE.test(q.sentence) && !EMOJI_RE.test(q.rule), `emoji en ${q.id}`);
      for (const opt of q.options) {
        assert.ok(!/[<>]/.test(opt), `${q.id} opcion contiene < o >`);
        assert.ok(!EMOJI_RE.test(opt), `emoji en opcion de ${q.id}`);
      }
    }
  });

  it('VOCABULARY_DECK tiene >= 36 palabras unicas sin emojis', () => {
    assert.ok(VOCABULARY_DECK.length >= 36, `esperado >= 36, obtuvo ${VOCABULARY_DECK.length}`);
    const words = new Set<string>();
    for (const v of VOCABULARY_DECK) {
      const norm = v.word.trim().toLowerCase();
      assert.ok(!words.has(norm), `palabra duplicada: ${v.word}`);
      words.add(norm);
      assert.ok(v.meaning.trim().length >= 10);
      assert.ok(v.example.trim().length >= 10);
      assert.ok(!EMOJI_RE.test(`${v.word} ${v.meaning} ${v.example} ${v.replaces ?? ''}`));
    }
  });

  it('PHRASES_BANK tiene >= 72 frases unicas con categorias validas y 0 emojis', () => {
    assert.ok(PHRASES_BANK.length >= 72, `esperado >= 72, obtuvo ${PHRASES_BANK.length}`);
    const ids = new Set<string>();
    const quotes = new Set<string>();
    const validCats = new Set(['mente', 'hablar', 'decisiones', 'calma']);
    for (const p of PHRASES_BANK) {
      assert.ok(!ids.has(p.id), `frase id duplicado: ${p.id}`);
      ids.add(p.id);
      const normQ = p.quote.trim().toLowerCase();
      assert.ok(!quotes.has(normQ), `quote duplicado: ${p.quote}`);
      quotes.add(normQ);
      assert.ok(validCats.has(p.category), `categoria invalida en ${p.id}`);
      assert.ok(p.author.trim().length >= 3);
      assert.ok(p.meaning.trim().length >= 10);
      assert.ok(p.whenToUse.trim().length >= 8);
      assert.ok(p.dailyAction.trim().length >= 8);
      assert.ok(
        !EMOJI_RE.test(`${p.quote} ${p.author} ${p.meaning} ${p.whenToUse} ${p.dailyAction}`),
        `emoji en frase ${p.id}`
      );
    }
  });

  it('CLASSIC_WIKISOURCE_SUGGESTIONS tiene >= 28 clasicos unicos sin emojis', () => {
    assert.ok(
      CLASSIC_WIKISOURCE_SUGGESTIONS.length >= 28,
      `esperado >= 28, obtuvo ${CLASSIC_WIKISOURCE_SUGGESTIONS.length}`
    );
    const titles = new Set<string>();
    for (const c of CLASSIC_WIKISOURCE_SUGGESTIONS) {
      const norm = c.title.trim().toLowerCase();
      assert.ok(!titles.has(norm), `clasico duplicado: ${c.title}`);
      titles.add(norm);
      assert.ok(c.query.trim().length >= 3);
      assert.ok(c.note.trim().length >= 10);
      assert.ok(!EMOJI_RE.test(`${c.title} ${c.query} ${c.note}`));
    }
  });
});

describe('FocusLabBank: oratoria, diccion y flashcards', () => {
  it('ORATORY_PROMPTS tiene >= 16 retos unicos sin emojis', () => {
    assert.ok(ORATORY_PROMPTS.length >= 16, `esperado >= 16, obtuvo ${ORATORY_PROMPTS.length}`);
    const ids = new Set<string>();
    const titles = new Set<string>();
    for (const p of ORATORY_PROMPTS) {
      assert.ok(!ids.has(p.id), `oratory id duplicado: ${p.id}`);
      ids.add(p.id);
      const norm = p.title.trim().toLowerCase();
      assert.ok(!titles.has(norm), `oratory titulo duplicado: ${p.title}`);
      titles.add(norm);
      assert.ok(p.prompt.trim().length >= 15);
      assert.ok(p.framework.trim().length >= 8);
      assert.ok(p.durationSec >= 20 && p.durationSec <= 180);
      assert.ok(!EMOJI_RE.test(`${p.title} ${p.prompt} ${p.framework}`));
    }
  });

  it('DICTION_DRILLS tiene >= 10 rutinas unicas sin emojis', () => {
    assert.ok(DICTION_DRILLS.length >= 10, `esperado >= 10, obtuvo ${DICTION_DRILLS.length}`);
    const ids = new Set<string>();
    const titles = new Set<string>();
    for (const d of DICTION_DRILLS) {
      assert.ok(!ids.has(d.id), `diction id duplicado: ${d.id}`);
      ids.add(d.id);
      const norm = d.title.trim().toLowerCase();
      assert.ok(!titles.has(norm), `diction titulo duplicado: ${d.title}`);
      titles.add(norm);
      assert.ok(d.steps.length >= 3);
      assert.ok(d.sampleText.trim().length >= 20);
      assert.ok(!EMOJI_RE.test(`${d.title} ${d.sampleText} ${d.steps.join(' ')}`));
    }
  });

  it('FLASHCARDS_BANK tiene >= 44 tarjetas unicas con decks claros y 0 emojis', () => {
    assert.ok(FLASHCARDS_BANK.length >= 44, `esperado >= 44, obtuvo ${FLASHCARDS_BANK.length}`);
    const ids = new Set<string>();
    const fronts = new Set<string>();
    const decks = new Set<string>();
    for (const fc of FLASHCARDS_BANK) {
      assert.ok(!ids.has(fc.id), `flashcard id duplicado: ${fc.id}`);
      ids.add(fc.id);
      const normF = fc.front.trim().toLowerCase();
      assert.ok(!fronts.has(normF), `flashcard pregunta duplicada: ${fc.front}`);
      fronts.add(normF);
      decks.add(fc.deck);
      assert.ok(fc.deck.trim().length >= 3);
      assert.ok(fc.front.trim().length >= 8);
      assert.ok(fc.back.trim().length >= 10);
      assert.ok(!EMOJI_RE.test(`${fc.deck} ${fc.front} ${fc.back} ${fc.source ?? ''}`));
    }
    assert.ok(decks.size >= 7, `esperado >= 7 decks, obtuvo ${decks.size}`);
  });
});
