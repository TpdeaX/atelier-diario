import {
  inferOrthoDifficulty,
  inferOrthoTopic,
  ORTHOGRAPHY_BANK,
  VOCABULARY_DECK,
} from '../data/KnowledgeBank';
import { Icons } from '../icons';
import { lookupWiktionary } from '../services/OnlineApi';
import { lifeStore } from '../state/LifeStore';
import { DifficultyLevel, OrthographyQuestion, OrthographyTopic, VocabPair } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

type OrthoTopicFilter = 'todos' | OrthographyTopic;
type OrthoMode = 'practica' | 'repaso_fallos' | 'examen';
type VocabMode = 'tarjetas' | 'quiz' | 'cloze';

const TOPIC_LABELS: Record<OrthoTopicFilter, string> = {
  todos: 'Todos',
  tildes: 'Tildes',
  homofonos: 'Homófonos',
  b_v_g_j: 'B/V · G/J · H',
  puntuacion: 'Puntuación',
  sintaxis: 'Sintaxis',
};

const TOPIC_HINTS: Record<OrthographyTopic, string> = {
  tildes: 'Identifica la sílaba tónica, posible hiato o si requiere tilde diacrítica según su función.',
  homofonos: 'Comprueba la función gramatical en la oración: verbo, preposición, conjunción o adverbio.',
  b_v_g_j: 'Recuerda la familia léxica y la raíz etimológica de la palabra antes de elegir grafía.',
  puntuacion: 'Lee la frase en voz alta y detecta dónde va una pausa lógica, vocativo o aclaración.',
  sintaxis: 'Revisa concordancia de número, género, régimen preposicional y claridad estructural.',
};

const DIFFICULTY_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Prioriza casos básicos y muestra pista automática antes de responder.',
  intermedio: 'Mezcla equilibrada de niveles con pista opcional bajo demanda.',
  avanzado: 'Prioriza casos avanzados y oculta pistas para entrenar criterio puro.',
};

const LANGUAGE_TUTORIALS: Record<'ortho' | 'vocab' | 'dict', Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  ortho: {
    sectionName: 'Reto de ortografía',
    summary: 'Domina tildes, homófonos y reglas reales con práctica por tema, cola de fallos y mini-examen.',
    steps: [
      'Elige el modo: Práctica guiada, Cola de fallos (errores guardados) o Mini-examen de 10 preguntas.',
      'Filtra por tema (Tildes, Homófonos, B/V · G/J · H, Puntuación o Sintaxis) según lo que quieras reforzar.',
      'Cada acierto se guarda en tu lista de dominadas y cada fallo entra automáticamente a tu cola de repaso.',
    ],
    tip: 'Cuando falles una duda frecuente (como a ver / haber o sino / si no), invéntate una frase propia en voz alta.',
  },
  vocab: {
    sectionName: 'Vocabulario útil',
    summary: 'Incorpora palabras precisas mediante tarjetas con notas personales, quiz de significado y frases para completar.',
    steps: [
      'Explora las tarjetas, escribe una nota personal de uso y marca la palabra como dominada.',
      'Cambia a Quiz de significado para reconocer definiciones entre 4 opciones.',
      'Usa Completar frase para elegir la palabra exacta dentro de una oración real.',
    ],
    tip: 'Adopta solo 1 palabra nueva cada dos días y úsala en un mensaje real para fijarla de verdad.',
  },
  dict: {
    sectionName: 'Diccionario vivo y Glosario',
    summary: 'Consulta definiciones en vivo en Wikcionario y construye tu propio léxico personal.',
    steps: [
      'Escribe cualquier palabra en el buscador izquierdo y pulsa Buscar.',
      'Si te resulta útil, pulsa Guardar para sumarla a tu glosario sincronizado a la derecha.',
      'Depura tu glosario eliminando las palabras que ya dominas con naturalidad.',
    ],
    tip: 'Si un verbo conjugado no devuelve resultado, búscalo en infinitivo o en singular.',
  },
};

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildHintForQuestion(q: OrthographyQuestion): string {
  if (q.hint && q.hint.trim()) return q.hint.trim();
  const topic = inferOrthoTopic(q);
  return TOPIC_HINTS[topic] ?? 'Analiza el contexto completo de la oración antes de responder.';
}

function buildClozeSentence(word: string, example: string): string {
  const cleanWord = word.trim();
  const exactRe = new RegExp(`\\b${escapeRegex(cleanWord)}\\b`, 'i');
  if (exactRe.test(example)) {
    return esc(example).replace(
      new RegExp(`\\b${escapeRegex(esc(cleanWord))}\\b`, 'i'),
      '<span class="al-blank">______</span>'
    );
  }
  const minStem = Math.max(4, Math.floor(cleanWord.length * 0.6));
  for (let len = cleanWord.length - 1; len >= minStem; len--) {
    const stem = cleanWord.slice(0, len);
    const stemRe = new RegExp(`\\b${escapeRegex(stem)}[a-záéíóúüñ]*\\b`, 'i');
    if (stemRe.test(example)) {
      return esc(example).replace(
        new RegExp(`\\b${escapeRegex(esc(stem))}[a-záéíóúüñ]*\\b`, 'i'),
        '<span class="al-blank">______</span>'
      );
    }
  }
  return `${esc(example)} <span class="al-blank">______</span>`;
}

interface IndexedOrtho {
  q: OrthographyQuestion;
  bankIdx: number;
  topic: OrthographyTopic;
  diff: DifficultyLevel;
}

interface ExamState {
  questions: IndexedOrtho[];
  currentIdx: number;
  answers: (number | null)[];
  startedAt: number;
  finishedAt: number | null;
}

export class LanguageView {
  private orthoPicked: number | null = null;
  private showHint = false;
  private missedCursor = 0;
  private exam: ExamState | null = null;

  private vocabQuizPicked: number | null = null;
  private vocabQuizCursor = 0;
  private vocabNoteSavedMsg = '';

  private dictQuery = '';
  private dictLines: string[] = [];
  private dictStatus = 'Busca cualquier palabra en español y consulta su definición real en Wikcionario.';

  private getIndexedBank(): IndexedOrtho[] {
    return ORTHOGRAPHY_BANK.map((q, bankIdx) => ({
      q,
      bankIdx,
      topic: inferOrthoTopic(q),
      diff: inferOrthoDifficulty(q, bankIdx),
    }));
  }

  private getPracticePool(topic: OrthoTopicFilter, diff: DifficultyLevel): IndexedOrtho[] {
    const all = this.getIndexedBank();
    const byTopic = topic === 'todos' ? all : all.filter((x) => x.topic === topic);
    const base = byTopic.length > 0 ? byTopic : all;

    if (diff === 'basico') {
      const onlyBasic = base.filter((x) => x.diff === 'basico');
      return onlyBasic.length >= 2 ? onlyBasic : [...base].sort((a, b) => (a.diff === 'basico' ? -1 : b.diff === 'basico' ? 1 : 0));
    }
    if (diff === 'avanzado') {
      const onlyAdv = base.filter((x) => x.diff === 'avanzado');
      return onlyAdv.length >= 2 ? onlyAdv : [...base].sort((a, b) => (a.diff === 'avanzado' ? -1 : b.diff === 'avanzado' ? 1 : 0));
    }
    return base;
  }

  private getMissedPool(topic: OrthoTopicFilter): IndexedOrtho[] {
    const missedIds = new Set(lifeStore.get().progress.language.missedOrthoIds);
    const allMissed = this.getIndexedBank().filter((x) => missedIds.has(x.q.id));
    if (topic === 'todos') return allMissed;
    const byTopic = allMissed.filter((x) => x.topic === topic);
    return byTopic;
  }

  private startExam(topic: OrthoTopicFilter, diff: DifficultyLevel): void {
    const pool = this.getPracticePool(topic, diff);
    const all = this.getIndexedBank();
    const combined: IndexedOrtho[] = [...pool];
    const seen = new Set(combined.map((x) => x.q.id));
    for (const item of all) {
      if (combined.length >= 10) break;
      if (!seen.has(item.q.id)) {
        combined.push(item);
        seen.add(item.q.id);
      }
    }
    const shuffled = [...combined].sort((a, b) => {
      const sa = (a.bankIdx * 37 + Date.now() % 97) % 101;
      const sb = (b.bankIdx * 37 + Date.now() % 97) % 101;
      return sa - sb;
    });
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));
    this.exam = {
      questions: selected,
      currentIdx: 0,
      answers: selected.map(() => null),
      startedAt: Date.now(),
      finishedAt: null,
    };
    this.orthoPicked = null;
    this.showHint = false;
  }

  private getVocabPool(diff: DifficultyLevel): VocabPair[] {
    if (diff === 'basico') {
      const subset = VOCABULARY_DECK.filter((v, idx) => (v.difficulty ?? (idx % 3 === 0 ? 'basico' : idx % 3 === 1 ? 'intermedio' : 'avanzado')) === 'basico');
      return subset.length >= 4 ? subset : VOCABULARY_DECK;
    }
    if (diff === 'avanzado') {
      const subset = VOCABULARY_DECK.filter((v, idx) => (v.difficulty ?? (idx % 3 === 0 ? 'basico' : idx % 3 === 1 ? 'intermedio' : 'avanzado')) === 'avanzado');
      return subset.length >= 4 ? subset : VOCABULARY_DECK;
    }
    return VOCABULARY_DECK;
  }

  private getVocabChoices(target: VocabPair, seed: number): { options: VocabPair[]; correctIdx: number } {
    const others = VOCABULARY_DECK.filter((v) => v.word !== target.word);
    const distractors: VocabPair[] = [];
    const step = Math.max(1, Math.floor(others.length / 4));
    for (let i = 0; i < 3 && others.length > 0; i++) {
      const pick = others[(seed * 5 + i * step + 3) % others.length];
      if (!distractors.some((d) => d.word === pick.word)) {
        distractors.push(pick);
      }
    }
    for (const cand of others) {
      if (distractors.length >= 3) break;
      if (!distractors.some((d) => d.word === cand.word)) distractors.push(cand);
    }
    const list = [target, ...distractors];
    const rot = seed % list.length;
    const rotated = [...list.slice(rot), ...list.slice(0, rot)];
    const correctIdx = rotated.findIndex((x) => x.word === target.word);
    return { options: rotated, correctIdx };
  }

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.language;
    const lProg = profile.progress.language;
    const diff = lifeStore.getDifficulty('language');
    const acc =
      profile.stats.orthographyTotal > 0
        ? Math.round((profile.stats.orthographyCorrect / profile.stats.orthographyTotal) * 100)
        : 100;

    const orthoRatio = ORTHOGRAPHY_BANK.length > 0 ? lProg.masteredOrthoIds.length / ORTHOGRAPHY_BANK.length : 0;
    const vocabRatio = VOCABULARY_DECK.length > 0 ? lProg.vocabMastered.length / VOCABULARY_DECK.length : 0;
    const combinedPct = Math.round(Math.min(100, orthoRatio * 65 + vocabRatio * 35));

    let bodyHtml = '';
    if (prefs.tab === 'ortho') {
      bodyHtml = this.renderOrthoHtml(prefs.orthoIdx, lProg.orthoMode, lProg.topic, diff);
    } else if (prefs.tab === 'vocab') {
      bodyHtml = this.renderVocabHtml(prefs.vocabIdx, lProg.vocabMode, diff);
    } else {
      bodyHtml = this.renderDictHtml();
    }

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #B45309; --mod-c2: #FBBF24;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #B45309; --em-c2: #FBBF24;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.spell(20)}</span>
            </div>
            <div>
              <h1>Ortografía, Vocabulario y Elocuencia</h1>
              <p>Domina tildes y dudas frecuentes por tema, repasa tus fallos, rinde mini-exámenes y entrena léxico preciso.</p>
            </div>
          </div>
          <div class="al-mono-pill">Aciertos: ${profile.stats.orthographyCorrect}/${profile.stats.orthographyTotal} (${acc}%)</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'language',
          progressLabel: 'Dominio de Ortografía y Vocabulario',
          progressPct: combinedPct,
          progressDetail: `Ortografía: ${lProg.masteredOrthoIds.length}/${ORTHOGRAPHY_BANK.length} · Vocabulario: ${lProg.vocabMastered.length}/${VOCABULARY_DECK.length}`,
          extraMetric: `Mejor examen: ${lProg.bestExamScore}% · Fallos en cola: ${lProg.missedOrthoIds.length}`,
          difficultyHints: DIFFICULTY_HINTS,
        })}

        <div class="al-seg-tabs">
          <button type="button" class="al-seg-btn ${prefs.tab === 'ortho' ? 'is-active' : ''}" data-ltab="ortho">Reto de ortografía (${ORTHOGRAPHY_BANK.length})</button>
          <button type="button" class="al-seg-btn ${prefs.tab === 'vocab' ? 'is-active' : ''}" data-ltab="vocab">Vocabulario útil (${VOCABULARY_DECK.length})</button>
          <button type="button" class="al-seg-btn ${prefs.tab === 'dict' ? 'is-active' : ''}" data-ltab="dict">Diccionario vivo y Glosario (${profile.savedWords.length})</button>
        </div>

        ${renderTutorialBanner({
          id: `language:${prefs.tab}`,
          moduleName: 'Ortografía y Léxico',
          ...(LANGUAGE_TUTORIALS[prefs.tab] ?? LANGUAGE_TUTORIALS.ortho),
        })}

        ${bodyHtml}
      </div>
    `;

    this.bindEvents(container);
    bindTutorialBanners(container);
    bindDidacticBar(container, 'language', () => {
      this.orthoPicked = null;
      this.showHint = false;
      this.vocabQuizPicked = null;
      this.exam = null;
      this.render(container);
    });
  }

  private renderOrthoControlsHtml(mode: OrthoMode, topic: OrthoTopicFilter): string {
    const lProg = lifeStore.get().progress.language;
    const topics: OrthoTopicFilter[] = ['todos', 'tildes', 'homofonos', 'b_v_g_j', 'puntuacion', 'sintaxis'];

    return `
      <div class="al-toolbar">
        <div class="al-seg-tabs" role="tablist" aria-label="Modo de ortografía">
          <button type="button" class="al-seg-btn ${mode === 'practica' ? 'is-active' : ''}" data-omode="practica">Práctica guiada</button>
          <button type="button" class="al-seg-btn ${mode === 'repaso_fallos' ? 'is-active' : ''}" data-omode="repaso_fallos">Cola de fallos (${lProg.missedOrthoIds.length})</button>
          <button type="button" class="al-seg-btn ${mode === 'examen' ? 'is-active' : ''}" data-omode="examen">Mini-examen (10) · Récord ${lProg.bestExamScore}%</button>
        </div>
        <div class="al-seg-tabs" aria-label="Filtro por tema ortográfico">
          ${topics
            .map(
              (t) =>
                `<button type="button" class="al-seg-btn ${topic === t ? 'is-active' : ''}" data-otopic="${t}">${TOPIC_LABELS[t]}</button>`
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private renderOrthoHtml(
    orthoIdx: number,
    mode: OrthoMode,
    topic: OrthoTopicFilter,
    diff: DifficultyLevel
  ): string {
    const controls = this.renderOrthoControlsHtml(mode, topic);
    const lProg = lifeStore.get().progress.language;

    if (mode === 'examen') {
      if (!this.exam) this.startExam(topic, diff);
      return controls + this.renderExamHtml(diff);
    }

    if (mode === 'repaso_fallos') {
      const missedPool = this.getMissedPool(topic);
      if (missedPool.length === 0) {
        const hasAnyMissed = lProg.missedOrthoIds.length > 0;
        return `
          ${controls}
          <div class="al-panel al-quiz-card">
            <h3>${hasAnyMissed ? 'Sin fallos pendientes en este tema' : 'Tu cola de fallos está limpia'}</h3>
            <p class="al-muted">${
              hasAnyMissed
                ? `Tienes ${lProg.missedOrthoIds.length} fallo(s) guardado(s) en otros temas. Cambia el filtro a Todos para repasarlos.`
                : 'Cada vez que falles una pregunta en práctica o examen aparecerá aquí hasta que la aciertes.'
            }</p>
            <div class="al-tool-group">
              ${hasAnyMissed ? '<button type="button" class="al-btn al-btn-primary" data-otopic="todos">Ver todos los temas</button>' : ''}
              <button type="button" class="al-btn ${hasAnyMissed ? '' : 'al-btn-primary'}" data-omode="practica">Ir a Práctica guiada</button>
              <button type="button" class="al-btn" data-omode="examen">Probar Mini-examen</button>
            </div>
          </div>
        `;
      }

      const item = missedPool[this.missedCursor % missedPool.length];
      return controls + this.renderSingleOrthoCard(item, (this.missedCursor % missedPool.length) + 1, missedPool.length, diff, true);
    }

    const pool = this.getPracticePool(topic, diff);
    const item = pool[orthoIdx % pool.length];
    return controls + this.renderSingleOrthoCard(item, (orthoIdx % pool.length) + 1, pool.length, diff, false);
  }

  private renderSingleOrthoCard(
    item: IndexedOrtho,
    pos: number,
    total: number,
    diff: DifficultyLevel,
    isMissedQueue: boolean
  ): string {
    const { q } = item;
    const lProg = lifeStore.get().progress.language;
    const isMastered = lProg.masteredOrthoIds.includes(q.id);
    const answered = this.orthoPicked !== null;
    const isCorrect = answered && this.orthoPicked === q.correctIndex;
    const hintText = buildHintForQuestion(q);

    const optionsHtml = q.options
      .map((opt, idx) => {
        let cls = 'al-quiz-opt';
        if (answered) {
          if (idx === q.correctIndex) cls += ' is-correct';
          else if (idx === this.orthoPicked) cls += ' is-wrong';
        }
        return `<button type="button" class="${cls}" data-opt="${idx}" ${answered ? 'disabled' : ''}>${esc(opt)}</button>`;
      })
      .join('');

    const hintHtml = answered
      ? ''
      : diff === 'basico'
        ? `<div class="al-rule-box"><strong>Pista (nivel Básico):</strong> <p>${esc(hintText)}</p></div>`
        : diff === 'intermedio'
          ? this.showHint
            ? `<div class="al-rule-box"><strong>Pista:</strong> <p>${esc(hintText)}</p></div>`
            : `<div class="al-tool-group"><button type="button" class="al-btn al-btn-sm" id="al-ortho-hint-btn">${Icons.bulb(14)}<span>Ver pista</span></button></div>`
          : `<p class="al-muted">Modo Avanzado: pistas ocultas para evaluar tu criterio directo.</p>`;

    return `
      <div class="al-panel al-quiz-card">
        <div class="al-card-head">
          <div class="al-tool-group">
            <span class="al-mono-pill">${isMissedQueue ? 'Repaso' : 'Pregunta'} ${pos} / ${total}</span>
            <span class="al-mono-pill">${TOPIC_LABELS[item.topic]}</span>
            <span class="al-mono-pill">${difficultyLabel(item.diff)}</span>
          </div>
          ${
            isMastered
              ? `<span class="al-mastery-badge">${Icons.check(12)} Dominada</span>`
              : isMissedQueue
                ? `<span class="al-mastery-badge is-warn">Pendiente de dominar</span>`
                : ''
          }
        </div>

        <p class="al-quiz-sentence">${esc(q.sentence).replace('___', '<span class="al-blank">______</span>')}</p>
        ${hintHtml}
        <div class="al-quiz-options">${optionsHtml}</div>
        ${
          answered
            ? `
          <div class="al-rule-box ${isCorrect ? 'is-ok' : 'is-warn'}">
            <strong>${isCorrect ? 'Correcto. Marcada como dominada.' : `La forma correcta es «${esc(q.options[q.correctIndex])}». Guardada en tu cola de fallos.`}</strong>
            <p>${esc(q.rule)}</p>
            <button type="button" class="al-btn al-btn-primary" id="al-ortho-next">${isMissedQueue ? 'Siguiente fallo' : 'Siguiente pregunta'}</button>
          </div>`
            : ''
        }
      </div>
    `;
  }

  private renderExamHtml(diff: DifficultyLevel): string {
    const exam = this.exam!;
    const lProg = lifeStore.get().progress.language;

    if (exam.finishedAt !== null) {
      const correct = exam.questions.filter((item, i) => exam.answers[i] === item.q.correctIndex).length;
      const total = exam.questions.length;
      const pct = Math.round((correct / Math.max(1, total)) * 100);
      const sec = Math.max(1, Math.round((exam.finishedAt - exam.startedAt) / 1000));
      const missedList = exam.questions
        .map((item, i) => ({ item, picked: exam.answers[i] }))
        .filter((row) => row.picked !== row.item.q.correctIndex);

      return `
        <div class="al-panel al-quiz-card">
          <div class="al-card-head">
            <h2>Resultado del Mini-examen</h2>
            <span class="al-mastery-badge ${pct >= 70 ? '' : 'is-warn'}">Nota: ${pct}% (${correct}/${total})</span>
          </div>
          <p class="al-muted">Tiempo: ${sec} segundos · Mejor marca guardada: ${lProg.bestExamScore}% · Nivel ${difficultyLabel(diff)}.</p>
          ${
            missedList.length === 0
              ? '<div class="al-rule-box is-ok"><strong>Examen perfecto.</strong><p>Todas las respuestas fueron correctas y quedaron registradas como dominadas.</p></div>'
              : `<div class="al-study-grid">
                  ${missedList
                    .map(
                      ({ item, picked }) => `
                    <div class="al-study-card">
                      <strong>${esc(item.q.sentence.replace('___', `«${item.q.options[item.q.correctIndex]}»`))}</strong>
                      <small class="al-muted">Elegiste: ${picked !== null ? esc(item.q.options[picked]) : 'Sin respuesta'}</small>
                      <p>${esc(item.q.rule)}</p>
                    </div>`
                    )
                    .join('')}
                </div>`
          }
          <div class="al-tool-group">
            <button type="button" class="al-btn al-btn-primary" id="al-exam-restart">${Icons.refresh(15)}<span>Nuevo mini-examen</span></button>
            ${
              lProg.missedOrthoIds.length > 0
                ? '<button type="button" class="al-btn" data-omode="repaso_fallos">Repasar cola de fallos</button>'
                : ''
            }
            <button type="button" class="al-btn" data-omode="practica">Volver a Práctica</button>
          </div>
        </div>
      `;
    }

    const item = exam.questions[exam.currentIdx];
    const picked = exam.answers[exam.currentIdx];
    const answered = picked !== null;
    const isCorrect = answered && picked === item.q.correctIndex;

    const stepsHtml = exam.questions
      .map((qItem, idx) => {
        const ans = exam.answers[idx];
        const cls =
          idx === exam.currentIdx
            ? 'al-step-pill is-active'
            : ans !== null
              ? ans === qItem.q.correctIndex
                ? 'al-step-pill is-done'
                : 'al-step-pill'
              : 'al-step-pill';
        return `<span class="${cls}">${idx + 1}</span>`;
      })
      .join('');

    const optionsHtml = item.q.options
      .map((opt, idx) => {
        let cls = 'al-quiz-opt';
        if (answered) {
          if (idx === item.q.correctIndex) cls += ' is-correct';
          else if (idx === picked) cls += ' is-wrong';
        }
        return `<button type="button" class="${cls}" data-exam-opt="${idx}" ${answered ? 'disabled' : ''}>${esc(opt)}</button>`;
      })
      .join('');

    return `
      <div class="al-panel al-quiz-card">
        <div class="al-card-head">
          <div class="al-tool-group">
            <span class="al-mono-pill">Examen · Pregunta ${exam.currentIdx + 1} / ${exam.questions.length}</span>
            <span class="al-mono-pill">${TOPIC_LABELS[item.topic]}</span>
          </div>
          <button type="button" class="al-btn al-btn-sm" id="al-exam-restart">${Icons.refresh(14)}<span>Reiniciar</span></button>
        </div>
        <div class="al-step-bar" aria-label="Progreso del mini-examen">${stepsHtml}</div>
        <p class="al-quiz-sentence">${esc(item.q.sentence).replace('___', '<span class="al-blank">______</span>')}</p>
        <div class="al-quiz-options">${optionsHtml}</div>
        ${
          answered
            ? `
          <div class="al-rule-box ${isCorrect ? 'is-ok' : 'is-warn'}">
            <strong>${isCorrect ? 'Correcto.' : `Correcta: «${esc(item.q.options[item.q.correctIndex])}».`}</strong>
            <p>${esc(item.q.rule)}</p>
            <button type="button" class="al-btn al-btn-primary" id="al-exam-next">
              ${exam.currentIdx + 1 >= exam.questions.length ? 'Ver nota final' : 'Siguiente pregunta'}
            </button>
          </div>`
            : ''
        }
      </div>
    `;
  }

  private renderVocabHtml(vocabIdx: number, vocabMode: VocabMode, diff: DifficultyLevel): string {
    const lProg = lifeStore.get().progress.language;
    const pool = this.getVocabPool(diff);
    const modeTabs = `
      <div class="al-toolbar">
        <div class="al-seg-tabs" role="tablist" aria-label="Modos de vocabulario">
          <button type="button" class="al-seg-btn ${vocabMode === 'tarjetas' ? 'is-active' : ''}" data-vmode="tarjetas">Tarjetas (${lProg.vocabMastered.length}/${VOCABULARY_DECK.length})</button>
          <button type="button" class="al-seg-btn ${vocabMode === 'quiz' ? 'is-active' : ''}" data-vmode="quiz">Quiz de significado</button>
          <button type="button" class="al-seg-btn ${vocabMode === 'cloze' ? 'is-active' : ''}" data-vmode="cloze">Completar frase</button>
        </div>
        <span class="al-mono-pill">Nivel ${difficultyLabel(diff)} · ${pool.length} palabras</span>
      </div>
    `;

    if (vocabMode === 'tarjetas') {
      const item = pool[vocabIdx % pool.length];
      const normKey = item.word.toLowerCase();
      const isMastered = lProg.vocabMastered.includes(normKey);
      const savedNote = lProg.wordNotes[normKey] ?? '';
      const alreadySaved = lifeStore
        .get()
        .savedWords.some((w) => w.word.toLowerCase() === normKey);

      return `
        ${modeTabs}
        <div class="al-panel al-vocab-card">
          <div class="al-card-head">
            <div class="al-tool-group">
              <span class="al-mono-pill">Tarjeta ${(vocabIdx % pool.length) + 1} / ${pool.length}</span>
              ${item.difficulty ? `<span class="al-mono-pill">${difficultyLabel(item.difficulty)}</span>` : ''}
              ${isMastered ? `<span class="al-mastery-badge">${Icons.check(12)} Dominada</span>` : ''}
            </div>
            ${item.replaces ? `<span class="al-muted">Eleva expresiones como: «${esc(item.replaces)}»</span>` : ''}
          </div>
          <h2 class="al-vocab-word">${esc(item.word)}</h2>
          <p class="al-vocab-meaning">${esc(item.meaning)}</p>
          <p class="al-vocab-example"><strong>En una frase:</strong> «${esc(item.example)}»</p>

          <div class="al-study-card">
            <div class="al-card-head">
              <strong>Tu nota personal o ejemplo propio</strong>
              ${this.vocabNoteSavedMsg ? `<span class="al-mastery-badge">${esc(this.vocabNoteSavedMsg)}</span>` : ''}
            </div>
            <textarea
              id="al-vocab-note"
              class="al-inline-note"
              data-note-word="${esc(item.word)}"
              placeholder="Escribe una frase tuya usando «${esc(item.word)}» o un recordatorio de cuándo decirla..."
            >${esc(savedNote)}</textarea>
            <div class="al-tool-group">
              <button type="button" class="al-btn al-btn-sm" id="al-vocab-save-note">${Icons.check(14)}<span>Guardar nota</span></button>
            </div>
          </div>

          <div class="al-tool-group" style="margin-top:10px;">
            <button type="button" class="al-btn" id="al-vocab-prev">Anterior</button>
            <button type="button" class="al-btn ${isMastered ? '' : 'al-btn-primary'}" id="al-vocab-master" data-master-word="${esc(item.word)}">
              ${Icons.check(15)}<span>${isMastered ? 'Palabra dominada' : 'Marcar dominada'}</span>
            </button>
            <button type="button" class="al-btn" id="al-vocab-save" data-save-word="${esc(item.word)}">
              ${Icons.bookmark(15)}<span>${alreadySaved ? 'En tu glosario' : 'Guardar en glosario'}</span>
            </button>
            <button type="button" class="al-btn al-btn-primary" id="al-vocab-next">Siguiente palabra</button>
          </div>
        </div>
      `;
    }

    const item = pool[this.vocabQuizCursor % pool.length];
    const { options, correctIdx } = this.getVocabChoices(item, this.vocabQuizCursor + 7);
    const answered = this.vocabQuizPicked !== null;
    const isCorrect = answered && this.vocabQuizPicked === correctIdx;

    if (vocabMode === 'quiz') {
      const optionsHtml = options
        .map((opt, idx) => {
          let cls = 'al-quiz-opt';
          if (answered) {
            if (idx === correctIdx) cls += ' is-correct';
            else if (idx === this.vocabQuizPicked) cls += ' is-wrong';
          }
          return `<button type="button" class="${cls}" data-vquiz-opt="${idx}" ${answered ? 'disabled' : ''}>${esc(opt.meaning)}</button>`;
        })
        .join('');

      return `
        ${modeTabs}
        <div class="al-panel al-quiz-card">
          <div class="al-card-head">
            <span class="al-mono-pill">Quiz de significado · ${(this.vocabQuizCursor % pool.length) + 1} / ${pool.length}</span>
            ${item.replaces && diff === 'basico' ? `<span class="al-muted">Pista: reemplaza «${esc(item.replaces)}»</span>` : ''}
          </div>
          <h2 class="al-vocab-word">¿Qué significa «${esc(item.word)}»?</h2>
          <div class="al-quiz-options">${optionsHtml}</div>
          ${
            answered
              ? `
            <div class="al-rule-box ${isCorrect ? 'is-ok' : 'is-warn'}">
              <strong>${isCorrect ? `Exacto. «${esc(item.word)}» marcada como dominada.` : `Significado correcto de «${esc(item.word)}»: ${esc(item.meaning)}`}</strong>
              <p><strong>Ejemplo:</strong> «${esc(item.example)}»</p>
              <button type="button" class="al-btn al-btn-primary" id="al-vquiz-next">Siguiente palabra</button>
            </div>`
              : ''
          }
        </div>
      `;
    }

    // cloze mode
    const clozeHtml = buildClozeSentence(item.word, item.example);
    const optionsHtml = options
      .map((opt, idx) => {
        let cls = 'al-quiz-opt';
        if (answered) {
          if (idx === correctIdx) cls += ' is-correct';
          else if (idx === this.vocabQuizPicked) cls += ' is-wrong';
        }
        return `<button type="button" class="${cls}" data-vquiz-opt="${idx}" ${answered ? 'disabled' : ''}>${esc(opt.word)}</button>`;
      })
      .join('');

    return `
      ${modeTabs}
      <div class="al-panel al-quiz-card">
        <div class="al-card-head">
          <span class="al-mono-pill">Completar frase · ${(this.vocabQuizCursor % pool.length) + 1} / ${pool.length}</span>
          ${diff !== 'avanzado' ? `<span class="al-muted">Sentido: ${esc(item.meaning)}</span>` : '<span class="al-muted">Elige la palabra precisa según el contexto.</span>'}
        </div>
        <p class="al-quiz-sentence">${clozeHtml}</p>
        <div class="al-quiz-options">${optionsHtml}</div>
        ${
          answered
            ? `
          <div class="al-rule-box ${isCorrect ? 'is-ok' : 'is-warn'}">
            <strong>${isCorrect ? `Correcto. «${esc(item.word)}» registrada como dominada.` : `La palabra exacta es «${esc(item.word)}».`}</strong>
            <p><strong>Oración completa:</strong> «${esc(item.example)}»</p>
            <p>${esc(item.meaning)}</p>
            <button type="button" class="al-btn al-btn-primary" id="al-vquiz-next">Siguiente frase</button>
          </div>`
            : ''
        }
      </div>
    `;
  }

  private renderDictHtml(): string {
    const saved = lifeStore.get().savedWords;
    return `
      <div class="al-two-col">
        <div class="al-panel">
          <h2>Consultar en Wikcionario (En vivo)</h2>
          <form class="al-search-form" id="al-lang-dict-form">
            <input type="text" id="al-lang-dict-input" value="${esc(this.dictQuery)}" placeholder="Ej. elocuencia, resiliencia, procrastinar..." />
            <button type="submit" class="al-btn al-btn-primary">${Icons.search(15)}<span>Buscar</span></button>
          </form>
          <div class="al-dict-box">
            <p class="al-muted">${esc(this.dictStatus)}</p>
            ${
              this.dictLines.length > 0
                ? `<ul class="al-dict-lines">${this.dictLines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
                   <button type="button" class="al-btn" id="al-lang-save-found">${Icons.bookmark(15)}<span>Guardar «${esc(this.dictQuery)}»</span></button>`
                : ''
            }
          </div>
        </div>

        <div class="al-panel">
          <h2>Tu glosario personal (${saved.length})</h2>
          ${
            saved.length === 0
              ? '<p class="al-muted">Aún no guardaste palabras. Añádelas desde las tarjetas de vocabulario o el buscador.</p>'
              : `<div class="al-glossary-list">
                  ${saved
                    .map(
                      (s) => `
                    <div class="al-glossary-item">
                      <div>
                        <strong>${esc(s.word)}</strong>
                        <p>${esc(s.definition)}</p>
                      </div>
                      <button type="button" class="al-icon-btn" data-del-word="${esc(s.word)}" title="Quitar">${Icons.trash(14)}</button>
                    </div>`
                    )
                    .join('')}
                </div>`
          }
        </div>
      </div>
    `;
  }

  private bindEvents(container: HTMLElement): void {
    const diff = lifeStore.getDifficulty('language');
    const lProg = lifeStore.get().progress.language;

    container.querySelectorAll<HTMLButtonElement>('[data-ltab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.vocabNoteSavedMsg = '';
        lifeStore.updateModulePrefs('language', {
          tab: btn.dataset.ltab as 'ortho' | 'vocab' | 'dict',
        });
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-omode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.omode as OrthoMode;
        lifeStore.updateProgress('language', { orthoMode: nextMode });
        this.orthoPicked = null;
        this.showHint = false;
        if (nextMode === 'examen') {
          this.startExam(lifeStore.get().progress.language.topic, lifeStore.getDifficulty('language'));
        }
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-otopic]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextTopic = btn.dataset.otopic as OrthoTopicFilter;
        lifeStore.updateProgress('language', { topic: nextTopic });
        lifeStore.updateModulePrefs('language', { orthoIdx: 0 });
        this.missedCursor = 0;
        this.orthoPicked = null;
        this.showHint = false;
        if (lifeStore.get().progress.language.orthoMode === 'examen') {
          this.startExam(nextTopic, lifeStore.getDifficulty('language'));
        }
        this.render(container);
      });
    });

    container.querySelector('#al-ortho-hint-btn')?.addEventListener('click', () => {
      this.showHint = true;
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.opt!, 10);
        this.orthoPicked = idx;
        const pool =
          lProg.orthoMode === 'repaso_fallos'
            ? this.getMissedPool(lProg.topic)
            : this.getPracticePool(lProg.topic, diff);
        const cursor =
          lProg.orthoMode === 'repaso_fallos'
            ? this.missedCursor
            : lifeStore.get().modulePrefs.language.orthoIdx;
        const item = pool[cursor % Math.max(1, pool.length)];
        if (item) {
          lifeStore.recordOrthoResult(item.q.id, idx === item.q.correctIndex);
        }
        this.render(container);
      });
    });

    container.querySelector('#al-ortho-next')?.addEventListener('click', () => {
      if (lProg.orthoMode === 'repaso_fallos') {
        this.missedCursor += 1;
      } else {
        const orthoIdx = lifeStore.get().modulePrefs.language.orthoIdx;
        lifeStore.updateModulePrefs('language', { orthoIdx: orthoIdx + 1 });
      }
      this.orthoPicked = null;
      this.showHint = false;
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-exam-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.exam || this.exam.finishedAt !== null) return;
        const idx = parseInt(btn.dataset.examOpt!, 10);
        const cur = this.exam.questions[this.exam.currentIdx];
        this.exam.answers[this.exam.currentIdx] = idx;
        lifeStore.recordOrthoResult(cur.q.id, idx === cur.q.correctIndex);
        this.render(container);
      });
    });

    container.querySelector('#al-exam-next')?.addEventListener('click', () => {
      if (!this.exam) return;
      if (this.exam.currentIdx + 1 >= this.exam.questions.length) {
        this.exam.finishedAt = Date.now();
        const correct = this.exam.questions.filter(
          (item, i) => this.exam!.answers[i] === item.q.correctIndex
        ).length;
        const scorePct = Math.round((correct / Math.max(1, this.exam.questions.length)) * 100);
        lifeStore.recordOrthoExam(scorePct);
      } else {
        this.exam.currentIdx += 1;
      }
      this.render(container);
    });

    container.querySelector('#al-exam-restart')?.addEventListener('click', () => {
      this.startExam(lifeStore.get().progress.language.topic, lifeStore.getDifficulty('language'));
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vmode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.updateProgress('language', { vocabMode: btn.dataset.vmode as VocabMode });
        this.vocabQuizPicked = null;
        this.vocabNoteSavedMsg = '';
        this.render(container);
      });
    });

    container.querySelector('#al-vocab-prev')?.addEventListener('click', () => {
      const pool = this.getVocabPool(diff);
      const vocabIdx = lifeStore.get().modulePrefs.language.vocabIdx;
      this.vocabNoteSavedMsg = '';
      lifeStore.updateModulePrefs('language', {
        vocabIdx: (vocabIdx - 1 + pool.length) % pool.length,
      });
      this.render(container);
    });

    container.querySelector('#al-vocab-next')?.addEventListener('click', () => {
      const pool = this.getVocabPool(diff);
      const vocabIdx = lifeStore.get().modulePrefs.language.vocabIdx;
      this.vocabNoteSavedMsg = '';
      lifeStore.updateModulePrefs('language', {
        vocabIdx: (vocabIdx + 1) % pool.length,
      });
      lifeStore.markHabit('language');
      this.render(container);
    });

    container.querySelector<HTMLButtonElement>('#al-vocab-master')?.addEventListener('click', (e) => {
      const word = (e.currentTarget as HTMLButtonElement).dataset.masterWord;
      if (!word) return;
      lifeStore.recordVocabMastered(word);
      this.render(container);
    });

    container.querySelector<HTMLButtonElement>('#al-vocab-save')?.addEventListener('click', (e) => {
      const word = (e.currentTarget as HTMLButtonElement).dataset.saveWord;
      const item = VOCABULARY_DECK.find((v) => v.word === word);
      if (!item) return;
      lifeStore.saveWord(item.word, item.meaning);
      this.render(container);
    });

    const saveNote = () => {
      const area = container.querySelector<HTMLTextAreaElement>('#al-vocab-note');
      if (!area) return;
      const word = area.dataset.noteWord;
      if (!word) return;
      lifeStore.setWordNote(word, area.value);
      this.vocabNoteSavedMsg = area.value.trim() ? 'Nota guardada' : 'Nota limpiada';
      this.render(container);
    };

    container.querySelector('#al-vocab-save-note')?.addEventListener('click', saveNote);
    container.querySelector<HTMLTextAreaElement>('#al-vocab-note')?.addEventListener('blur', (e) => {
      const area = e.currentTarget as HTMLTextAreaElement;
      const word = area.dataset.noteWord;
      if (word) lifeStore.setWordNote(word, area.value);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vquiz-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.vquizOpt!, 10);
        this.vocabQuizPicked = idx;
        const pool = this.getVocabPool(diff);
        const item = pool[this.vocabQuizCursor % pool.length];
        const { correctIdx } = this.getVocabChoices(item, this.vocabQuizCursor + 7);
        if (idx === correctIdx) {
          lifeStore.recordVocabMastered(item.word);
        } else {
          lifeStore.markHabit('language');
        }
        this.render(container);
      });
    });

    container.querySelector('#al-vquiz-next')?.addEventListener('click', () => {
      this.vocabQuizCursor += 1;
      this.vocabQuizPicked = null;
      this.render(container);
    });

    container.querySelector('#al-lang-dict-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = container.querySelector<HTMLInputElement>('#al-lang-dict-input')!.value.trim();
      if (!val) return;
      this.dictQuery = val;
      this.dictLines = [];
      this.dictStatus = `Consultando «${val}» en Wikcionario...`;
      this.render(container);
      try {
        const res = await lookupWiktionary(val);
        if (res.found) {
          this.dictStatus = `Definiciones encontradas para «${res.word}»:`;
          this.dictLines = res.lines;
        } else {
          this.dictStatus = `No apareció entrada directa para «${val}». Prueba en minúscula o singular.`;
        }
      } catch {
        this.dictStatus = 'Error de red al consultar Wikcionario.';
      }
      this.render(container);
    });

    container.querySelector('#al-lang-save-found')?.addEventListener('click', () => {
      if (this.dictQuery && this.dictLines.length > 0) {
        lifeStore.saveWord(this.dictQuery, this.dictLines[0]);
        this.render(container);
      }
    });

    container.querySelectorAll<HTMLButtonElement>('[data-del-word]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.removeWord(btn.dataset.delWord!);
        this.render(container);
      });
    });
  }
}
