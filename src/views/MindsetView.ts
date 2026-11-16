import { PHRASES_BANK } from '../data/KnowledgeBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import { PhraseItem } from '../types';

export class MindsetView {
  private category: 'all' | 'favs' | PhraseItem['category'] = 'all';
  private searchQuery = '';

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const q = this.searchQuery.trim().toLowerCase();

    const list = PHRASES_BANK.filter((p) => {
      if (this.category === 'favs' && !profile.favoritePhraseIds.includes(p.id)) return false;
      if (this.category !== 'all' && this.category !== 'favs' && p.category !== this.category) return false;
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
            <span class="al-mono-pill">${p.category.toUpperCase()}</span>
            <button type="button" class="al-icon-btn ${isFav ? 'is-fav' : ''}" data-fav="${p.id}" title="Guardar en favoritas">${Icons.bookmark(15)}</button>
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
        <div class="al-page-head">
          <div>
            <h1>Frases, Criterio y Modelos Mentales</h1>
            <p>Ideas prácticas para pensar con más claridad, conversar mejor y no perder el equilibrio en días complicados.</p>
          </div>
          <div class="al-mono-pill">Favoritas: ${profile.favoritePhraseIds.length}</div>
        </div>

        <div class="al-toolbar">
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${this.category === 'all' ? 'is-active' : ''}" data-cat="all">Todas</button>
            <button type="button" class="al-seg-btn ${this.category === 'hablar' ? 'is-active' : ''}" data-cat="hablar">Hablar mejor</button>
            <button type="button" class="al-seg-btn ${this.category === 'mente' ? 'is-active' : ''}" data-cat="mente">Mente fuerte</button>
            <button type="button" class="al-seg-btn ${this.category === 'decisiones' ? 'is-active' : ''}" data-cat="decisiones">Decisiones</button>
            <button type="button" class="al-seg-btn ${this.category === 'calma' ? 'is-active' : ''}" data-cat="calma">Calma</button>
            <button type="button" class="al-seg-btn ${this.category === 'favs' ? 'is-active' : ''}" data-cat="favs">Favoritas</button>
          </div>

          <input type="search" id="al-phrase-search" class="al-filter-input" value="${this.searchQuery}" placeholder="Filtrar ideas o autores..." />
        </div>

        <div class="al-phrases-grid">
          ${cardsHtml || '<p class="al-muted">No hay frases que coincidan con ese filtro.</p>'}
        </div>
      </div>
    `;

    container.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.category = btn.dataset.cat as typeof this.category;
        this.render(container);
      });
    });

    container.querySelector('#al-phrase-search')?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-fav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.toggleFavoritePhrase(btn.dataset.fav!);
        this.render(container);
      });
    });
  }
}
