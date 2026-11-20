import { PHRASES_BANK } from '../data/KnowledgeBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import { PhraseItem } from '../types';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

const CAT_LABELS: Record<PhraseItem['category'], string> = {
  hablar: 'Hablar mejor',
  mente: 'Mente fuerte',
  decisiones: 'Decisiones',
  calma: 'Calma',
};

const MINDSET_TUTORIALS: Record<'all' | 'favs' | PhraseItem['category'], Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  all: {
    sectionName: 'Todas las ideas y principios',
    summary: 'Recorre modelos mentales prácticos, filtra por situación y guarda tus propias frases.',
    steps: [
      'Elige una categoría según lo que necesites hoy (Hablar mejor, Mente fuerte, Decisiones o Calma).',
      'Usa el buscador para encontrar ideas por autor o palabra clave.',
      'Marca con el ícono de marcador tus favoritas y aplica la Micro-acción del día.',
      'Pulsa Nueva idea para registrar criterios propios sincronizados en Supabase.',
    ],
    tip: 'Elige una sola micro-acción por día en lugar de leer veinte frases sin aplicar ninguna.',
  },
  hablar: {
    sectionName: 'Hablar mejor',
    summary: 'Principios concretos de comunicación, preguntas útiles, límites y presencia verbal.',
    steps: [
      'Revisa una tarjeta antes de una exposición, reunión o conversación importante.',
      'Identifica en Cuándo usarla si coincide con tu situación actual.',
      'Ejecuta la micro-acción sugerida en tu próxima charla real.',
    ],
    tip: 'Combina estas ideas con el simulador de Oratoria y Dicción para ensayarlas en voz alta.',
  },
  mente: {
    sectionName: 'Mente fuerte',
    summary: 'Herramientas de aprendizaje activo, constancia, metacognición y autodiálogo sano.',
    steps: [
      'Lee Qué significa para traducir la cita a conducta observable.',
      'Guarda como favoritas las ideas que te destraben cuando pierdas motivación.',
      'Aplica una micro-acción corta de 5 minutos hoy mismo.',
    ],
    tip: 'Releer tus 5 favoritas una vez por semana fija criterios que después salen en automático.',
  },
  decisiones: {
    sectionName: 'Decisiones y estrategia',
    summary: 'Criterios prácticos para priorizar, evitar la parálisis y diseñar tu entorno.',
    steps: [
      'Filtra aquí cuando tengas demasiados pendientes o dudes entre dos caminos.',
      'Usa la micro-acción para tomar una decisión reversible en menos de cinco minutos.',
      'Anota principios propios con Nueva idea cada vez que aprendas una lección importante.',
    ],
    tip: 'La claridad antes de ejecutar ahorra horas de retrabajo después.',
  },
  calma: {
    sectionName: 'Calma y perspectiva',
    summary: 'Recordatorios serenos para cortar la rumiación y volver a lo que sí controlas.',
    steps: [
      'Lee con pausa una sola tarjeta y suelta la urgencia antes de actuar.',
      'Si sientes ansiedad física intensa, abre el Centro de Calma para respirar primero.',
      'Usa la micro-acción para aterrizar el problema en un paso concreto.',
    ],
    tip: 'Cuando la emoción está alta, prioriza regular el cuerpo antes de analizar el problema.',
  },
  favs: {
    sectionName: 'Tus favoritas',
    summary: 'Tu cuaderno personal con los principios que elegiste mantener siempre a mano.',
    steps: [
      'Repasa tus frases guardadas al empezar o cerrar la jornada.',
      'Quita el marcador de las que ya integraste para mantener la lista enfocada.',
      'Añade notas propias con Nueva idea o promueve recursos desde el Baúl.',
    ],
    tip: 'Una lista corta de 8 a 12 favoritas vivas es más útil que cien guardadas sin releer.',
  },
};

export class MindsetView {
  private addFormOpen = false;

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.mindset;
    const q = prefs.searchQuery.trim().toLowerCase();

    const allPhrases = [...profile.customPhrases, ...PHRASES_BANK];
    const list = allPhrases.filter((p) => {
      if (prefs.category === 'favs' && !profile.favoritePhraseIds.includes(p.id)) return false;
      if (prefs.category !== 'all' && prefs.category !== 'favs' && p.category !== prefs.category) return false;
      if (!q) return true;
      return (
        p.quote.toLowerCase().includes(q) ||
        p.meaning.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q)
      );
    });

    const cardsHtml = list
      .map((p) => {
        const isFav = profile.favoritePhraseIds.includes(p.id);
        return `
        <article class="al-panel al-phrase-card">
          <div class="al-card-head">
            <span class="al-mono-pill">${CAT_LABELS[p.category] ?? p.category}${p.isCustom ? ' · Propia' : ''}</span>
            <div class="al-tool-group">
              ${
                p.sourceUrl
                  ? `<a class="al-icon-btn" href="${p.sourceUrl}" target="_blank" rel="noopener noreferrer" title="Ver post original">${Icons.arrowUpRight(14)}</a>`
                  : ''
              }
              ${
                p.isCustom
                  ? `<button type="button" class="al-icon-btn" data-del-phrase="${p.id}" title="Eliminar frase propia">${Icons.trash(14)}</button>`
                  : ''
              }
              <button type="button" class="al-icon-btn ${isFav ? 'is-fav' : ''}" data-fav="${p.id}" title="Guardar en favoritas">${Icons.bookmark(15)}</button>
            </div>
          </div>
          <blockquote class="al-phrase-quote">«${p.quote}»</blockquote>
          <div class="al-phrase-author">— ${p.author}</div>
          <div class="al-phrase-detail">
            <p><strong>Qué significa:</strong> ${p.meaning}</p>
            <p><strong>Cuándo usarla:</strong> ${p.whenToUse}</p>
            <p><strong>Micro-acción:</strong> ${p.dailyAction}</p>
          </div>
        </article>
      `;
      })
      .join('');

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #9D174D; --mod-c2: #F472B6;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #9D174D; --em-c2: #F472B6;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.bulb(20)}</span>
            </div>
            <div>
              <h1>Frases, Criterio y Modelos Mentales</h1>
              <p>Ideas prácticas para pensar con claridad, conversar mejor y guardar tus propias notas en Supabase.</p>
            </div>
          </div>
          <div class="al-tool-group">
            <div class="al-mono-pill">Favoritas: ${profile.favoritePhraseIds.length}</div>
            <button type="button" class="al-btn al-btn-primary" id="al-mind-add-btn">${Icons.plus(15)}<span>Nueva idea</span></button>
          </div>
        </div>

        ${
          this.addFormOpen
            ? `
          <form class="al-panel al-add-link-bar" id="al-mind-add-form">
            <div class="al-card-head">
              <h2>Guardar frase o criterio personal (se sincroniza en Supabase)</h2>
              <button type="button" class="al-icon-btn" id="al-mind-add-close">×</button>
            </div>
            <div class="al-form-grid-2">
              <label><span>Frase o principio</span><input type="text" id="al-mp-quote" placeholder="Ej. Claridad antes que velocidad" required /></label>
              <label><span>Autor o fuente</span><input type="text" id="al-mp-author" placeholder="Nota personal" /></label>
            </div>
            <div class="al-form-grid-3">
              <label>
                <span>Categoría</span>
                <select id="al-mp-cat">
                  <option value="mente">Mente fuerte</option>
                  <option value="hablar">Hablar mejor</option>
                  <option value="decisiones">Decisiones</option>
                  <option value="calma">Calma</option>
                </select>
              </label>
              <label><span>Qué significa</span><input type="text" id="al-mp-meaning" placeholder="Resumen práctico" /></label>
              <label><span>Micro-acción</span><input type="text" id="al-mp-action" placeholder="Paso concreto para hoy" /></label>
            </div>
            <div class="al-tool-group">
              <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar idea</span></button>
            </div>
          </form>`
            : ''
        }

        <div class="al-toolbar">
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${prefs.category === 'all' ? 'is-active' : ''}" data-cat="all">Todas (${allPhrases.length})</button>
            <button type="button" class="al-seg-btn ${prefs.category === 'hablar' ? 'is-active' : ''}" data-cat="hablar">Hablar mejor</button>
            <button type="button" class="al-seg-btn ${prefs.category === 'mente' ? 'is-active' : ''}" data-cat="mente">Mente fuerte</button>
            <button type="button" class="al-seg-btn ${prefs.category === 'decisiones' ? 'is-active' : ''}" data-cat="decisiones">Decisiones</button>
            <button type="button" class="al-seg-btn ${prefs.category === 'calma' ? 'is-active' : ''}" data-cat="calma">Calma</button>
            <button type="button" class="al-seg-btn ${prefs.category === 'favs' ? 'is-active' : ''}" data-cat="favs">Favoritas</button>
          </div>

          <input type="search" id="al-phrase-search" class="al-filter-input" value="${prefs.searchQuery.replace(/"/g, '&quot;')}" placeholder="Filtrar ideas o autores..." />
        </div>

        ${renderTutorialBanner({
          id: `mindset:${prefs.category}`,
          moduleName: 'Frases y Criterio',
          ...(MINDSET_TUTORIALS[prefs.category] ?? MINDSET_TUTORIALS.all),
        })}

        <div class="al-phrases-grid">
          ${cardsHtml || '<p class="al-muted">No hay frases que coincidan con ese filtro.</p>'}
        </div>
      </div>
    `;

    bindTutorialBanners(container);

    container.querySelector('#al-mind-add-btn')?.addEventListener('click', () => {
      this.addFormOpen = !this.addFormOpen;
      this.render(container);
    });

    container.querySelector('#al-mind-add-close')?.addEventListener('click', () => {
      this.addFormOpen = false;
      this.render(container);
    });

    container.querySelector('#al-mind-add-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const quote = container.querySelector<HTMLInputElement>('#al-mp-quote')!.value.trim();
      const author = container.querySelector<HTMLInputElement>('#al-mp-author')!.value.trim() || 'Nota personal';
      const category = container.querySelector<HTMLSelectElement>('#al-mp-cat')!.value as PhraseItem['category'];
      const meaning = container.querySelector<HTMLInputElement>('#al-mp-meaning')!.value.trim() || 'Recordatorio personal.';
      const dailyAction = container.querySelector<HTMLInputElement>('#al-mp-action')!.value.trim() || 'Aplicarlo hoy una vez.';
      if (!quote) return;
      lifeStore.addCustomPhrase({
        category,
        quote,
        author,
        meaning,
        whenToUse: 'En el momento que necesites recordar este enfoque.',
        dailyAction,
      });
      this.addFormOpen = false;
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.updateModulePrefs('mindset', {
          category: btn.dataset.cat as 'all' | 'favs' | PhraseItem['category'],
        });
        this.render(container);
      });
    });

    container.querySelector('#al-phrase-search')?.addEventListener('input', (e) => {
      lifeStore.updateModulePrefs('mindset', {
        searchQuery: (e.target as HTMLInputElement).value,
      });
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-fav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.toggleFavoritePhrase(btn.dataset.fav!);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-del-phrase]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.removeCustomPhrase(btn.dataset.delPhrase!);
        this.render(container);
      });
    });
  }
}
