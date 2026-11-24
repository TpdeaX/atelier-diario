import { analyzeWritingClarity, WRITING_CHALLENGES, type WritingChallenge } from '../data/PersonalDevBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import type { DifficultyLevel } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, type SectionTutorialSpec } from '../ui/TutorialBanner';

const WRITING_TUTORIALS: Record<'retos' | 'analizador' | 'plantillas', Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  retos: {
    sectionName: 'Retos de reescritura y síntesis',
    summary: 'Convierte textos enredados en mensajes claros, breves y memorables con medición en vivo.',
    steps: [
      'Lee el texto original inflado y revisa el límite de palabras objetivo.',
      'Escribe tu versión clara abajo; el medidor analiza concisión, frases largas y relleno al instante.',
      'Pulsa Evaluar y guardar para registrar tu puntaje y comparar con el modelo recomendado.',
    ],
    tip: 'Cortar la primera oración de relleno suele mejorar el 50% de cualquier correo o reporte.',
  },
  analizador: {
    sectionName: 'Analizador de claridad libre',
    summary: 'Pega tus propios correos, informes o ensayos para detectar frases largas, muletillas y adverbios en exceso.',
    steps: [
      'Escribe o pega cualquier texto real que vayas a enviar o entregar.',
      'Observa el puntaje de claridad, promedio de palabras por oración y sugerencias concretas.',
      'Tu borrador queda guardado automáticamente en local y Supabase.',
    ],
    tip: 'En dificultad Avanzado, el analizador exige oraciones de máximo 20 palabras para máxima fuerza.',
  },
  plantillas: {
    sectionName: 'Plantillas de comunicación escrita',
    summary: 'Estructuras listas para correos ejecutivos, reportes técnicos, solicitudes y resúmenes.',
    steps: [
      'Elige una plantilla y pulsa Cargar en Analizador para editarla con tus datos reales.',
      'Reemplaza los corchetes y verifica que tu puntaje de claridad supere 85%.',
    ],
    tip: 'Empieza siempre por la conclusión o la petición exacta en la primera línea.',
  },
};

const WRITING_DIFF_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Oraciones objetivo <= 28 palabras y pistas visibles en cada reto.',
  intermedio: 'Oraciones objetivo <= 24 palabras y correos/argumentos profesionales.',
  avanzado: 'Máxima concisión (<= 20 palabras por oración), síntesis ejecutiva y cero relleno.',
};

const WRITING_TEMPLATES = [
  {
    id: 'wt-mail',
    title: 'Correo de solicitud rápida (3 líneas)',
    body: 'Hola [Nombre],\nNecesito tu confirmación sobre [tema concreto] antes del [día y hora].\nYa adelanté [contexto en 1 frase]; solo falta validar [decisión puntual]. Gracias.',
  },
  {
    id: 'wt-pyramid',
    title: 'Resumen en Pirámide Invertida',
    body: 'Conclusión: recomendamos [decisión principal] porque logra [beneficio medible].\nSoporte: evaluamos [alternativas] y verificamos [dato clave].\nSiguiente paso: ejecutar [acción] esta semana y revisar resultados el [fecha].',
  },
  {
    id: 'wt-bug',
    title: 'Reporte técnico claro',
    body: 'Problema: al ejecutar [acción exacta] en [módulo], ocurre [error observado].\nEsperado: debería mostrar [comportamiento correcto].\nCausa probable y prueba: verificado en [navegador/dispositivo]; adjunto paso reproducible.',
  },
  {
    id: 'wt-no',
    title: 'Decir «no» con alternativa',
    body: 'Gracias por proponer [solicitud]. Incluirla hoy pondría en riesgo [entrega prioritaria].\nPropongo cerrar primero [hito actual] el [fecha] y retomar tu propuesta al inicio del siguiente bloque.',
  },
];

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class WritingView {
  private showModel = false;
  private feedbackMsg = '';

  private getPool(diff: DifficultyLevel): WritingChallenge[] {
    const filtered = WRITING_CHALLENGES.filter((c) => c.difficulty === diff);
    return filtered.length > 0 ? filtered : WRITING_CHALLENGES;
  }

  public render(container: HTMLElement): void {
    const prog = lifeStore.get().progress.writing;
    const diff = lifeStore.getDifficulty('writing');
    const tab = prog.activeTab;
    const pool = this.getPool(diff);
    const activeChallenge = pool[prog.challengeIdx % pool.length];
    const masteryPct = Math.min(
      100,
      Math.round((prog.completedIds.length / WRITING_CHALLENGES.length) * 100)
    );

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #0F766E; --mod-c2: #34D399;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #0F766E; --em-c2: #34D399;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.feather(20)}</span>
            </div>
            <div>
              <h1>Escritura Clara y Síntesis</h1>
              <p>Elimina rodeos, mejora tus correos e informes técnicos y mide tu claridad en vivo con guardado automático.</p>
            </div>
          </div>
          <div class="al-mono-pill">${prog.completedIds.length}/${WRITING_CHALLENGES.length} retos dominados</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'writing',
          progressLabel: `Dominio de redacción (${prog.completedIds.length}/${WRITING_CHALLENGES.length} retos >= 75%)`,
          progressPct: masteryPct,
          progressDetail: 'Tus borradores, puntajes y textos libres se guardan automáticamente.',
          difficultyHints: WRITING_DIFF_HINTS,
          extraMetric: `Nivel ${difficultyLabel(diff)}`,
        })}

        <div class="al-toolbar">
          <div class="al-seg-tabs" role="tablist">
            <button type="button" class="al-seg-btn ${tab === 'retos' ? 'is-active' : ''}" data-wtab="retos">Retos de síntesis (${WRITING_CHALLENGES.length})</button>
            <button type="button" class="al-seg-btn ${tab === 'analizador' ? 'is-active' : ''}" data-wtab="analizador">Analizador libre</button>
            <button type="button" class="al-seg-btn ${tab === 'plantillas' ? 'is-active' : ''}" data-wtab="plantillas">Plantillas (${WRITING_TEMPLATES.length})</button>
          </div>
        </div>

        ${renderTutorialBanner({
          id: `writing:${tab}`,
          moduleName: 'Escritura Clara',
          ...WRITING_TUTORIALS[tab],
        })}

        ${
          tab === 'retos'
            ? this.renderChallengeHtml(activeChallenge, pool.length, prog.challengeIdx, diff)
            : tab === 'analizador'
              ? this.renderAnalyzerHtml(prog.freeDraft, diff)
              : this.renderTemplatesHtml()
        }
      </div>
    `;

    this.bindEvents(container, activeChallenge, pool.length, diff);
    bindDidacticBar(container, 'writing', () => {
      this.showModel = false;
      this.feedbackMsg = '';
      lifeStore.updateProgress('writing', { challengeIdx: 0 });
      this.render(container);
    });
    bindTutorialBanners(container);
  }

  private renderMetricsBox(text: string, diff: DifficultyLevel, maxWords?: number): string {
    const a = analyzeWritingClarity(text, diff);
    const overLimit = maxWords !== undefined && a.wordCount > maxWords;
    return `
      <div class="al-study-card" id="al-write-metrics">
        <div class="al-didactic-prog-head">
          <strong>Puntaje de claridad: ${a.clarityScore}/100</strong>
          <span class="al-mastery-badge ${overLimit ? 'is-warn' : ''}">
            ${a.wordCount}${maxWords ? `/${maxWords}` : ''} palabras · ${a.avgWordsPerSentence} pal/oración
          </span>
        </div>
        <progress class="al-didactic-meter" value="${a.clarityScore}" max="100"></progress>
        <ul class="al-muted" style="margin:4px 0 0;padding-left:18px;font-size:0.83rem">
          ${overLimit ? `<li>Te pasaste por ${a.wordCount - maxWords!} palabras del límite objetivo (${maxWords}).</li>` : ''}
          ${a.suggestions.map((s) => `<li>${esc(s)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  private renderChallengeHtml(ch: WritingChallenge, total: number, idx: number, diff: DifficultyLevel): string {
    const prog = lifeStore.get().progress.writing;
    const draft = prog.drafts[ch.id] ?? '';
    const best = prog.bestScores[ch.id] ?? 0;

    return `
      <section class="al-panel">
        <div class="al-card-head">
          <div class="al-tool-group">
            <span class="al-mastery-badge">${ch.category}</span>
            <span class="al-mastery-badge">${difficultyLabel(ch.difficulty)}</span>
            ${best > 0 ? `<span class="al-mastery-badge">Mejor: ${best}/100</span>` : ''}
          </div>
          <span class="al-mono-pill">Reto ${(idx % total) + 1}/${total}</span>
        </div>

        <h2 style="margin:8px 0 4px">${esc(ch.title)}</h2>
        <p class="al-muted" style="margin:0 0 10px">${esc(ch.goal)}</p>

        <div class="al-study-card" style="margin-bottom:12px">
          <strong style="font-size:0.82rem">Texto original inflado:</strong>
          <p style="margin:0;font-size:0.95rem">${esc(ch.flawedText)}</p>
        </div>

        ${
          diff !== 'avanzado'
            ? `<p class="al-muted" style="font-size:0.83rem;margin:0 0 8px"><strong>Pistas:</strong> ${ch.hints.map(esc).join(' · ')}</p>`
            : ''
        }

        <label for="al-write-draft" style="display:block;font-weight:600;font-size:0.86rem;margin-bottom:4px">Tu versión clara (máximo ${ch.maxWords} palabras):</label>
        <textarea id="al-write-draft" class="al-inline-note" style="min-height:96px" placeholder="Reescribe aquí sin rodeos...">${esc(draft)}</textarea>

        <div style="margin-top:10px" id="al-write-metrics-slot">
          ${this.renderMetricsBox(draft, diff, ch.maxWords)}
        </div>

        ${this.feedbackMsg ? `<p class="al-muted" style="margin:8px 0 0;font-weight:600">${esc(this.feedbackMsg)}</p>` : ''}

        <div class="al-tool-group" style="margin-top:12px">
          <button type="button" class="al-btn al-btn-primary" id="al-write-eval">${Icons.check(15)}<span>Evaluar y guardar reto</span></button>
          <button type="button" class="al-btn" id="al-write-model">${this.showModel ? 'Ocultar modelo' : 'Ver modelo sugerido'}</button>
          <button type="button" class="al-btn" id="al-write-next">Siguiente reto</button>
        </div>

        ${
          this.showModel
            ? `
          <div class="al-study-card is-done" style="margin-top:12px">
            <strong>Modelo de referencia:</strong>
            <p style="margin:0">${esc(ch.modelAnswer)}</p>
          </div>`
            : ''
        }
      </section>
    `;
  }

  private renderAnalyzerHtml(freeDraft: string, diff: DifficultyLevel): string {
    return `
      <section class="al-panel">
        <div class="al-card-head">
          <h2>Analizador de claridad en vivo</h2>
          <button type="button" class="al-btn al-btn-sm" id="al-write-free-clear">${Icons.trash(14)}<span>Limpiar</span></button>
        </div>
        <label for="al-write-free" class="al-muted" style="display:block;margin-bottom:6px;font-size:0.86rem">
          Pega aquí un correo, resumen, tesis o mensaje importante. Se guarda automáticamente al escribir:
        </label>
        <textarea id="al-write-free" class="al-inline-note" style="min-height:150px" placeholder="Escribe o pega tu texto aquí...">${esc(freeDraft)}</textarea>
        <div style="margin-top:12px" id="al-write-free-slot">
          ${this.renderMetricsBox(freeDraft, diff)}
        </div>
      </section>
    `;
  }

  private renderTemplatesHtml(): string {
    return `
      <section class="al-panel">
        <h2>Plantillas ejecutivas y académicas</h2>
        <div class="al-study-grid">
          ${WRITING_TEMPLATES.map(
            (t) => `
            <div class="al-study-card">
              <strong>${esc(t.title)}</strong>
              <p class="al-muted" style="margin:0;white-space:pre-line;font-size:0.83rem">${esc(t.body)}</p>
              <button type="button" class="al-btn al-btn-sm al-btn-primary" data-wtpl="${t.id}" style="margin-top:auto">Cargar en Analizador</button>
            </div>`
          ).join('')}
        </div>
      </section>
    `;
  }

  private bindEvents(
    container: HTMLElement,
    ch: WritingChallenge,
    poolLen: number,
    diff: DifficultyLevel
  ): void {
    container.querySelectorAll<HTMLButtonElement>('[data-wtab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.updateProgress('writing', {
          activeTab: btn.dataset.wtab as 'retos' | 'analizador' | 'plantillas',
        });
        this.render(container);
      });
    });

    const draftEl = container.querySelector<HTMLTextAreaElement>('#al-write-draft');
    draftEl?.addEventListener('input', () => {
      const val = draftEl.value;
      const slot = container.querySelector('#al-write-metrics-slot');
      if (slot) slot.innerHTML = this.renderMetricsBox(val, diff, ch.maxWords);
      const nextDrafts = { ...lifeStore.get().progress.writing.drafts, [ch.id]: val };
      lifeStore.updateProgress('writing', { drafts: nextDrafts });
    });

    container.querySelector('#al-write-eval')?.addEventListener('click', () => {
      const val = draftEl?.value.trim() ?? '';
      if (!val) {
        this.feedbackMsg = 'Escribe primero tu propuesta de síntesis antes de evaluar.';
        this.render(container);
        return;
      }
      const analysis = analyzeWritingClarity(val, diff);
      const lengthPenalty = analysis.wordCount > ch.maxWords ? Math.min(25, (analysis.wordCount - ch.maxWords) * 3) : 0;
      const finalScore = Math.max(10, analysis.clarityScore - lengthPenalty);
      lifeStore.saveWritingResult(ch.id, val, finalScore);
      this.feedbackMsg =
        finalScore >= 75
          ? `Reto dominado con ${finalScore}/100 (${analysis.wordCount} palabras). Guardado en tu progreso.`
          : `Guardado con ${finalScore}/100. Acorta un poco o limpia frases de relleno para superar 75/100.`;
      this.render(container);
    });

    container.querySelector('#al-write-model')?.addEventListener('click', () => {
      this.showModel = !this.showModel;
      this.render(container);
    });

    container.querySelector('#al-write-next')?.addEventListener('click', () => {
      this.showModel = false;
      this.feedbackMsg = '';
      const cur = lifeStore.get().progress.writing.challengeIdx;
      lifeStore.updateProgress('writing', { challengeIdx: (cur + 1) % poolLen });
      this.render(container);
    });

    const freeEl = container.querySelector<HTMLTextAreaElement>('#al-write-free');
    freeEl?.addEventListener('input', () => {
      const val = freeEl.value;
      const slot = container.querySelector('#al-write-free-slot');
      if (slot) slot.innerHTML = this.renderMetricsBox(val, diff);
      lifeStore.updateProgress('writing', { freeDraft: val });
      if (val.trim().length >= 30) lifeStore.markHabit('writing');
    });

    container.querySelector('#al-write-free-clear')?.addEventListener('click', () => {
      lifeStore.updateProgress('writing', { freeDraft: '' });
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-wtpl]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tpl = WRITING_TEMPLATES.find((t) => t.id === btn.dataset.wtpl);
        if (!tpl) return;
        lifeStore.updateProgress('writing', { freeDraft: tpl.body, activeTab: 'analizador' });
        this.render(container);
      });
    });
  }
}
