import { PHRASES_BANK, VOCABULARY_DECK } from '../data/KnowledgeBank';
import { Icons } from '../icons';
import { fetchRandomWikiSummary, WikiSummary } from '../services/OnlineApi';
import {
  importUmbralBackupJson,
  loadUmbralSnapshot,
  resolveCompanionUrl,
  UmbralSnapshot,
} from '../services/UmbralBridge';
import { lifeStore } from '../state/LifeStore';
import { HabitKey, ModuleId } from '../types';

const HABIT_LABELS: { key: HabitKey; label: string; target: ModuleId }[] = [
  { key: 'read', label: 'Lectura online', target: 'reader' },
  { key: 'calligraphy', label: 'Caligrafía', target: 'calligraphy' },
  { key: 'typing', label: 'Escritura rápida', target: 'typing' },
  { key: 'language', label: 'Ortografía y léxico', target: 'language' },
  { key: 'mindset', label: 'Frases e ideas', target: 'mindset' },
  { key: 'singing', label: 'Práctica de canto', target: 'singing' },
  { key: 'calm', label: 'Calma y respiración', target: 'calm' },
];

export class HomeView {
  private wikiCache: WikiSummary | null = null;
  private wikiLoading = false;
  private wikiError = '';

  public render(container: HTMLElement, navigate: (id: ModuleId) => void): void {
    const profile = lifeStore.get();
    const doneCount = Object.values(profile.todayHabits).filter(Boolean).length;

    const dayIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const dailyPhrase = PHRASES_BANK[dayIdx % PHRASES_BANK.length];
    const dailyWord = VOCABULARY_DECK[dayIdx % VOCABULARY_DECK.length];

    const habitChips = HABIT_LABELS.map((h) => {
      const done = profile.todayHabits[h.key];
      return `
        <button type="button" class="al-habit-chip ${done ? 'is-done' : ''}" data-nav="${h.target}">
          <span class="al-habit-check">${done ? Icons.check(14) : ''}</span>
          <span>${h.label}</span>
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div class="al-page al-home">
        <section class="al-welcome-row">
          <div class="al-welcome-card">
            <h1>Un espacio tranquilo para crecer un poco cada día</h1>
            <p>Sin prisa y sin competir contra nadie. Lee un capítulo, afina la voz, cuida tu letra o frena la ansiedad cuando el día se ponga pesado.</p>
            <div class="al-welcome-actions">
              <button type="button" class="al-btn al-btn-calm" data-nav="calm">${Icons.wind(18)}<span>Necesito calmarme ahora (SOS)</span></button>
              <button type="button" class="al-btn al-btn-primary" data-nav="reader">${Icons.book(18)}<span>Abrir biblioteca</span></button>
            </div>
          </div>

          <aside class="al-habits-card">
            <div class="al-card-head">
              <h2>Tu ritmo de hoy (${doneCount}/7)</h2>
              <span class="al-streak-badge">${profile.dailyStreak === 1 ? '1 día seguido' : `${profile.dailyStreak} días seguidos`}</span>
            </div>
            <div class="al-habits-list">${habitChips}</div>
            <div class="al-mini-metrics">
              <div><span>Ortografía</span><strong>${profile.stats.orthographyCorrect}/${profile.stats.orthographyTotal}</strong></div>
              <div><span>Tipeo PC / Móvil</span><strong>${profile.stats.bestWpmPc} / ${profile.stats.bestWpmMobile}</strong></div>
              <div><span>Calma</span><strong>${profile.stats.calmSessions}</strong></div>
            </div>
          </aside>
        </section>

        <section class="al-capsules-grid">
          <article class="al-panel al-capsule">
            <div class="al-card-head">
              <h2>Palabra útil del día</h2>
              <button type="button" class="al-link-btn" data-nav="language">Practicar léxico</button>
            </div>
            <div class="al-word-big">${dailyWord.word}</div>
            <p class="al-capsule-text">${dailyWord.meaning}</p>
            <p class="al-capsule-sub">Úsala en lugar de: <em>«${dailyWord.replaces ?? 'algo genérico'}»</em> · Ej: ${dailyWord.example}</p>
          </article>

          <article class="al-panel al-capsule">
            <div class="al-card-head">
              <h2>Idea para recordar</h2>
              <button type="button" class="al-link-btn" data-nav="mindset">Ver cuaderno</button>
            </div>
            <blockquote class="al-quote-mini">«${dailyPhrase.quote}»</blockquote>
            <p class="al-capsule-text">${dailyPhrase.meaning}</p>
            <p class="al-capsule-sub"><strong>Reto:</strong> ${dailyPhrase.dailyAction}</p>
          </article>

          <article class="al-panel al-capsule">
            <div class="al-card-head">
              <h2>Dato vivo de Wikipedia</h2>
              <button type="button" class="al-icon-btn" id="al-wiki-refresh" title="Cargar otro tema">${Icons.refresh(16)}</button>
            </div>
            <div id="al-wiki-slot"></div>
          </article>
        </section>

        <section class="al-panel al-umbral-bridge" id="al-umbral-bridge">
          <div class="al-card-head">
            <div>
              <h2>Ecosistema académico (UNUmbral + OMNI ARENA)</h2>
              <p class="al-muted" id="al-umbral-status">Sincronizando horario y tareas locales de UNUmbral...</p>
            </div>
            <div class="al-tool-group">
              <label class="al-btn" title="Importar respaldo JSON exportado desde UNUmbral">
                <span>Importar JSON</span>
                <input type="file" id="al-umbral-file" accept=".json,application/json" style="display:none" />
              </label>
              <a class="al-btn" href="${resolveCompanionUrl('unumbral')}">Abrir UNUmbral</a>
              <a class="al-btn al-btn-primary" href="${resolveCompanionUrl('arena')}">Abrir OMNI ARENA</a>
            </div>
          </div>
          <div id="al-umbral-body" class="al-umbral-grid"></div>
        </section>

        <section class="al-studios-sec">
          <h2>Estudios disponibles</h2>
          <div class="al-studios-grid">
            <button type="button" class="al-studio-tile" data-nav="reader">
              <span class="al-studio-icon">${Icons.book(20)}</span>
              <div><h3>Biblioteca y Lector</h3><p>Libros completos de Wikisource, Open Library y diccionario al tacto.</p></div>
            </button>
            <button type="button" class="al-studio-tile" data-nav="calligraphy">
              <span class="al-studio-icon">${Icons.pen(20)}</span>
              <div><h3>Taller de Caligrafía</h3><p>Pautas guiadas, trazos, cursiva e imprenta sobre lienzo sensible.</p></div>
            </button>
            <button type="button" class="al-studio-tile" data-nav="typing">
              <span class="al-studio-icon">${Icons.keyboard(20)}</span>
              <div><h3>Escritura Rápida</h3><p>Modo PC (mecanografía y dedos guía) o Celular (pulgares y sprint 30s).</p></div>
            </button>
            <button type="button" class="al-studio-tile" data-nav="language">
              <span class="al-studio-icon">${Icons.spell(20)}</span>
              <div><h3>Ortografía y Vocabulario</h3><p>Reglas explicadas, sustitución de muletillas y Wikcionario en vivo.</p></div>
            </button>
            <button type="button" class="al-studio-tile" data-nav="mindset">
              <span class="al-studio-icon">${Icons.bulb(20)}</span>
              <div><h3>Frases y Criterio</h3><p>Modelos mentales claros para conversar mejor y decidir con calma.</p></div>
            </button>
            <button type="button" class="al-studio-tile" data-nav="singing">
              <span class="al-studio-icon">${Icons.mic(20)}</span>
              <div><h3>Estudio de Canto</h3><p>Afinador vocal en tiempo real con micrófono, piano guía y escalas.</p></div>
            </button>
            <button type="button" class="al-studio-tile" data-nav="calm">
              <span class="al-studio-icon">${Icons.heart(20)}</span>
              <div><h3>Calma y Reencuadre</h3><p>Respiración 4-7-8, aterrizaje 5-4-3-2-1 y diario positivo guiado.</p></div>
            </button>
          </div>
        </section>
      </div>
    `;

    container.querySelectorAll<HTMLElement>('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.dataset.nav as ModuleId));
    });

    const wikiSlot = container.querySelector<HTMLDivElement>('#al-wiki-slot')!;
    const refreshBtn = container.querySelector<HTMLButtonElement>('#al-wiki-refresh')!;

    const renderWikiSlot = () => {
      if (this.wikiLoading) {
        wikiSlot.innerHTML = `<p class="al-muted">Consultando artículo en español...</p>`;
      } else if (this.wikiError) {
        wikiSlot.innerHTML = `<p class="al-muted">${this.wikiError}</p>`;
      } else if (this.wikiCache) {
        wikiSlot.innerHTML = `
          <div class="al-wiki-title">${this.wikiCache.title}</div>
          <p class="al-capsule-text">${this.wikiCache.extract.slice(0, 210)}${this.wikiCache.extract.length > 210 ? '…' : ''}</p>
        `;
      }
    };

    const loadWiki = async () => {
      this.wikiLoading = true;
      this.wikiError = '';
      renderWikiSlot();
      try {
        this.wikiCache = await fetchRandomWikiSummary();
      } catch {
        this.wikiError = 'No se pudo cargar Wikipedia ahora. Pulsa recargar.';
      } finally {
        this.wikiLoading = false;
        renderWikiSlot();
      }
    };

    refreshBtn.addEventListener('click', () => void loadWiki());
    if (!this.wikiCache) {
      void loadWiki();
    } else {
      renderWikiSlot();
    }

    const umbralStatus = container.querySelector<HTMLElement>('#al-umbral-status')!;
    const umbralBody = container.querySelector<HTMLElement>('#al-umbral-body')!;
    const fileInput = container.querySelector<HTMLInputElement>('#al-umbral-file')!;

    const paintUmbral = (snap: UmbralSnapshot) => {
      if (snap.source === 'none') {
        umbralStatus.textContent =
          'Cuando uses UNUmbral en tu cuenta de GitHub Pages (o importes su respaldo .json), verás aquí tus huecos libres y tareas críticas.';
        umbralBody.innerHTML = '';
        return;
      }
      umbralStatus.textContent =
        snap.source === 'indexeddb'
          ? `Conectado en vivo con UmbralDB · ${snap.todayClassesCount} clases hoy · ${snap.pendingCount} tareas pendientes`
          : `Respaldo de UNUmbral cargado · ${snap.todayClassesCount} clases hoy · ${snap.pendingCount} tareas pendientes`;

      const gapHtml = snap.freeGaps.length
        ? snap.freeGaps
            .slice(0, 3)
            .map(
              (g) => `
          <div class="al-umbral-chip">
            <strong>Hueco libre (${g.duracionMin} min)</strong>
            <span>${g.inicioLabel} – ${g.finLabel} · Ideal para lectura o 5 min de canto</span>
          </div>`
            )
            .join('')
        : '<div class="al-umbral-chip"><strong>Sin huecos largos entre clases hoy</strong><span>Puedes hacer 1 reto corto de ortografía o respiración.</span></div>';

      const taskHtml = snap.criticalTasks.length
        ? snap.criticalTasks
            .map(
              (t) => `
          <div class="al-umbral-chip is-critical">
            <strong>Entrega crítica (Nv ${t.importancia ?? 4})</strong>
            <span>${t.titulo ?? 'Tarea pendiente'}</span>
          </div>`
            )
            .join('')
        : '<div class="al-umbral-chip"><strong>Sin entregas críticas urgentes</strong><span>Buen día para avanzar con calma.</span></div>';

      umbralBody.innerHTML = gapHtml + taskHtml;
    };

    void loadUmbralSnapshot().then(paintUmbral);

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const txt = await file.text();
        const snap = importUmbralBackupJson(txt);
        paintUmbral(snap);
      } catch {
        umbralStatus.textContent = 'No se pudo leer ese archivo JSON de respaldo.';
      }
    });
  }
}
