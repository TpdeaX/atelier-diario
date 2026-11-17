import { VAULT_BANK } from '../data/SavedVaultBank';
import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import {
  PhraseItem,
  VaultCategory,
  VaultFilterCategory,
  VaultItem,
  VaultStatus,
} from '../types';

const CAT_LABELS: Record<VaultCategory, string> = {
  mentalidad: 'Mentalidad',
  oratoria: 'Oratoria y Social',
  tech: 'Tech / IA',
  estudio: 'Estudio y Libros',
  carrera: 'Carrera y Finanzas',
  bienestar: 'Bienestar y Voz',
  otros: 'Otros útiles',
  ocio: 'Ocio / Anime',
  visual: 'Por revisar (visual)',
};

const STATUS_LABELS: Record<VaultStatus, string> = {
  pending: 'Pendiente',
  seen: 'Visto',
  applied: 'Aplicado',
  archived: 'Archivado',
};

const FILTER_TABS: { id: VaultFilterCategory; label: string; optional?: boolean }[] = [
  { id: 'useful', label: 'Útiles' },
  { id: 'mentalidad', label: 'Mentalidad' },
  { id: 'oratoria', label: 'Oratoria' },
  { id: 'tech', label: 'Tech / IA' },
  { id: 'estudio', label: 'Estudio' },
  { id: 'carrera', label: 'Carrera' },
  { id: 'bienestar', label: 'Bienestar' },
  { id: 'otros', label: 'Otros' },
  { id: 'favs', label: 'Favoritos' },
  { id: 'applied', label: 'Aplicados' },
  { id: 'custom', label: 'Añadidos' },
  { id: 'visual', label: 'Por revisar (visual)', optional: true },
  { id: 'ocio', label: 'Ocio / Anime', optional: true },
  { id: 'all', label: 'Todos (1,290+)', optional: true },
];

const PHRASE_CAT_MAP: Record<VaultCategory, PhraseItem['category']> = {
  mentalidad: 'mente',
  oratoria: 'hablar',
  tech: 'decisiones',
  estudio: 'mente',
  carrera: 'decisiones',
  bienestar: 'calma',
  otros: 'mente',
  ocio: 'calma',
  visual: 'mente',
};

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeUrl(raw: string): string {
  return raw.trim().split('?')[0];
}

export class VaultView {
  private addFormOpen = false;
  private addMode: 'single' | 'batch' = 'single';
  private showOptionalTabs = false;
  private visibleLimit = 30;
  private feedbackMsg = '';
  private openNoteId: string | null = null;
  private promotedIds = new Set<string>();

  private getAllItems(): VaultItem[] {
    const profile = lifeStore.get();
    return [...profile.customVaultItems, ...VAULT_BANK];
  }

  private filterItems(items: VaultItem[]): VaultItem[] {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.vault;
    const q = prefs.searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const status: VaultStatus = profile.vaultStatuses[item.id] ?? 'pending';
      const isFav = profile.vaultFavorites.includes(item.id);
      const note = (profile.vaultNotes[item.id] ?? '').toLowerCase();

      if (prefs.statusFilter === 'active') {
        if (status === 'archived') return false;
      } else if (status !== prefs.statusFilter) {
        return false;
      }

      if (prefs.category === 'useful') {
        if (item.category === 'ocio' || item.category === 'visual') return false;
      } else if (prefs.category === 'favs') {
        if (!isFav) return false;
      } else if (prefs.category === 'applied') {
        if (status !== 'applied') return false;
      } else if (prefs.category === 'custom') {
        if (!item.isCustom) return false;
      } else if (prefs.category !== 'all') {
        if (item.category !== prefs.category) return false;
      }

      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        note.includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }

  private renderCardsHtml(filtered: VaultItem[]): string {
    const profile = lifeStore.get();
    const slice = filtered.slice(0, this.visibleLimit);

    if (slice.length === 0) {
      return '<p class="al-muted">No hay recursos que coincidan con ese filtro o búsqueda.</p>';
    }

    return slice
      .map((item) => {
        const status: VaultStatus = profile.vaultStatuses[item.id] ?? 'pending';
        const isFav = profile.vaultFavorites.includes(item.id);
        const note = profile.vaultNotes[item.id] ?? '';
        const isNoteOpen = this.openNoteId === item.id;
        const isPromoted = this.promotedIds.has(item.id);

        const tagsHtml = item.tags
          .slice(0, 4)
          .map((t) => `<span class="al-vault-tag">#${esc(t)}</span>`)
          .join('');

        return `
          <article class="al-panel al-phrase-card al-vault-card ${status === 'archived' ? 'is-archived' : ''}" data-vault-id="${esc(item.id)}">
            <div class="al-card-head">
              <div class="al-tool-group">
                <span class="al-mono-pill">${CAT_LABELS[item.category]}${item.isCustom ? ' · Añadido' : item.index ? ` · #${item.index}` : ''}</span>
                ${status !== 'pending' ? `<span class="al-vault-status is-${status}">${STATUS_LABELS[status]}</span>` : ''}
              </div>
              <div class="al-tool-group">
                <a class="al-icon-btn" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" title="Abrir publicación original">${Icons.arrowUpRight(14)}</a>
                ${
                  item.isCustom
                    ? `<button type="button" class="al-icon-btn" data-vault-del="${esc(item.id)}" title="Eliminar recurso añadido">${Icons.trash(14)}</button>`
                    : ''
                }
                <button type="button" class="al-icon-btn ${isFav ? 'is-fav' : ''}" data-vault-fav="${esc(item.id)}" title="Marcar como favorito">${Icons.bookmark(15)}</button>
              </div>
            </div>

            <h3 class="al-vault-title">${esc(item.title)}</h3>
            <p class="al-vault-summary">${esc(item.summary)}</p>

            ${tagsHtml ? `<div class="al-vault-tags">${tagsHtml}</div>` : ''}
            ${note && !isNoteOpen ? `<p class="al-vault-note-preview"><strong>Nota:</strong> ${esc(note)}</p>` : ''}

            ${
              isNoteOpen
                ? `
              <form class="al-vault-note-form" data-note-form="${esc(item.id)}">
                <input type="text" class="al-vault-note-input" value="${esc(note)}" placeholder="Anota qué rescataste o cómo aplicarlo..." />
                <button type="submit" class="al-btn al-btn-primary al-btn-sm">Guardar</button>
              </form>
            `
                : ''
            }

            <div class="al-vault-actions">
              <button type="button" class="al-seg-btn ${status === 'seen' ? 'is-active' : ''}" data-vault-status="${esc(item.id)}:${status === 'seen' ? 'pending' : 'seen'}">Visto</button>
              <button type="button" class="al-seg-btn ${status === 'applied' ? 'is-active' : ''}" data-vault-status="${esc(item.id)}:${status === 'applied' ? 'pending' : 'applied'}">Aplicado</button>
              <button type="button" class="al-seg-btn" data-vault-note-toggle="${esc(item.id)}">${note ? 'Editar nota' : 'Nota'}</button>
              <button type="button" class="al-seg-btn ${isPromoted ? 'is-active' : ''}" data-vault-promote="${esc(item.id)}">${isPromoted ? 'En Criterio ✓' : 'Pasar a Criterio'}</button>
              <button type="button" class="al-seg-btn" data-vault-status="${esc(item.id)}:${status === 'archived' ? 'pending' : 'archived'}">${status === 'archived' ? 'Restaurar' : 'Ocultar'}</button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  private bindGridEvents(container: HTMLElement, allItems: VaultItem[]): void {
    const itemMap = new Map(allItems.map((i) => [i.id, i]));

    container.querySelectorAll<HTMLButtonElement>('[data-vault-fav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.toggleVaultFavorite(btn.dataset.vaultFav!);
        this.refreshResults(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vault-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [id, nextStatus] = btn.dataset.vaultStatus!.split(':') as [string, VaultStatus];
        lifeStore.setVaultStatus(id, nextStatus);
        this.refreshResults(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vault-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.removeCustomVaultItem(btn.dataset.vaultDel!);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vault-note-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.vaultNoteToggle!;
        this.openNoteId = this.openNoteId === id ? null : id;
        this.refreshResults(container);
      });
    });

    container.querySelectorAll<HTMLFormElement>('[data-note-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = form.dataset.noteForm!;
        const val = form.querySelector<HTMLInputElement>('.al-vault-note-input')!.value;
        lifeStore.setVaultNote(id, val);
        this.openNoteId = null;
        this.refreshResults(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vault-promote]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.vaultPromote!;
        const item = itemMap.get(id);
        if (!item) return;
        const targetCat = PHRASE_CAT_MAP[item.category] ?? 'mente';
        lifeStore.promoteVaultToPhrase(item, targetCat);
        this.promotedIds.add(id);
        this.feedbackMsg = `Guardado en Frases y Criterio: "${item.title.slice(0, 48)}"`;
        this.render(container);
      });
    });

    container.querySelector('#al-vault-load-more')?.addEventListener('click', () => {
      this.visibleLimit += 30;
      this.refreshResults(container);
    });
  }

  private refreshResults(container: HTMLElement): void {
    const allItems = this.getAllItems();
    const filtered = this.filterItems(allItems);
    const grid = container.querySelector('#al-vault-grid');
    const countEl = container.querySelector('#al-vault-count');
    const moreWrap = container.querySelector('#al-vault-more-wrap');

    if (grid) {
      grid.innerHTML = this.renderCardsHtml(filtered);
    }
    if (countEl) {
      const showing = Math.min(this.visibleLimit, filtered.length);
      countEl.textContent = `Mostrando ${showing} de ${filtered.length} recursos`;
    }
    const statsEl = container.querySelector('#al-vault-stats-pill');
    if (statsEl) {
      const profile = lifeStore.get();
      const appliedCount = Object.values(profile.vaultStatuses).filter((s) => s === 'applied').length;
      statsEl.textContent = `Favoritos: ${profile.vaultFavorites.length} · Aplicados: ${appliedCount}`;
    }
    if (moreWrap) {
      moreWrap.innerHTML =
        filtered.length > this.visibleLimit
          ? `<button type="button" class="al-btn" id="al-vault-load-more">Cargar 30 más (${filtered.length - this.visibleLimit} restantes)</button>`
          : '';
    }
    this.bindGridEvents(container, allItems);
  }

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.vault;
    const allItems = this.getAllItems();
    const filtered = this.filterItems(allItems);
    const appliedCount = Object.values(profile.vaultStatuses).filter((s) => s === 'applied').length;
    const showing = Math.min(this.visibleLimit, filtered.length);

    const visibleTabs = FILTER_TABS.filter(
      (t) => !t.optional || this.showOptionalTabs || prefs.category === t.id
    );

    container.innerHTML = `
      <div class="al-page">
        <div class="al-module-hero" style="--mod-c1: #0F4C81; --mod-c2: #38BDF8;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #0F4C81; --em-c2: #38BDF8;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.archive(20)}</span>
            </div>
            <div>
              <h1>Baúl de Guardados e Ideas</h1>
              <p>Tus ${allItems.length} recursos clasificados por tema. Agrega enlaces nuevos, anota aprendizajes y pasa los mejores a Criterio.</p>
            </div>
          </div>
          <div class="al-tool-group">
            <div class="al-mono-pill" id="al-vault-stats-pill">Favoritos: ${profile.vaultFavorites.length} · Aplicados: ${appliedCount}</div>
            <button type="button" class="al-btn al-btn-primary" id="al-vault-add-btn">${Icons.plus(15)}<span>Añadir recurso</span></button>
          </div>
        </div>

        ${
          this.feedbackMsg
            ? `<div class="al-panel al-vault-feedback"><span>${esc(this.feedbackMsg)}</span><button type="button" class="al-icon-btn" id="al-vault-fb-close">×</button></div>`
            : ''
        }

        ${
          this.addFormOpen
            ? `
          <div class="al-panel al-add-link-bar">
            <div class="al-card-head">
              <div class="al-seg-tabs">
                <button type="button" class="al-seg-btn ${this.addMode === 'single' ? 'is-active' : ''}" data-add-mode="single">Añadir 1 enlace</button>
                <button type="button" class="al-seg-btn ${this.addMode === 'batch' ? 'is-active' : ''}" data-add-mode="batch">Importar varios / JSON</button>
              </div>
              <button type="button" class="al-icon-btn" id="al-vault-add-close">×</button>
            </div>

            ${
              this.addMode === 'single'
                ? `
              <form id="al-vault-single-form" class="al-vault-form-stack">
                <div class="al-form-grid-2">
                  <label><span>Título o idea clave</span><input type="text" id="al-v-title" required placeholder="Ej. Cómo estructurar una exposición" /></label>
                  <label><span>Enlace (Instagram, web, YouTube...)</span><input type="url" id="al-v-url" required placeholder="https://www.instagram.com/p/..." /></label>
                </div>
                <div class="al-form-grid-3">
                  <label>
                    <span>Categoría</span>
                    <select id="al-v-cat">
                      <option value="mentalidad">Mentalidad</option>
                      <option value="oratoria">Oratoria y Social</option>
                      <option value="tech">Tech / IA</option>
                      <option value="estudio">Estudio y Libros</option>
                      <option value="carrera">Carrera y Finanzas</option>
                      <option value="bienestar">Bienestar y Voz</option>
                      <option value="otros">Otros útiles</option>
                      <option value="ocio">Ocio / Anime</option>
                    </select>
                  </label>
                  <label><span>Resumen o nota rápida</span><input type="text" id="al-v-summary" placeholder="Qué enseña o por qué lo guardaste" /></label>
                  <label><span>Etiquetas (separadas por coma)</span><input type="text" id="al-v-tags" placeholder="psicologia, enfoque" /></label>
                </div>
                <div class="al-tool-group">
                  <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar en Supabase</span></button>
                </div>
              </form>
            `
                : `
              <form id="al-vault-batch-form" class="al-vault-form-stack">
                <p class="al-muted">Pega una lista de enlaces (uno por línea, opcionalmente <code>URL | Título | categoría</code>) o un arreglo JSON <code>[{url, title, summary, category}]</code>. Los duplicados se omiten automáticamente.</p>
                <textarea id="al-v-batch-text" class="al-vault-textarea" rows="5" placeholder="https://www.instagram.com/p/.../ | Idea clave | mentalidad&#10;https://www.instagram.com/p/.../ | Recurso SQL | tech" required></textarea>
                <div class="al-tool-group">
                  <label class="al-vault-inline-cat">
                    <span>Categoría por defecto</span>
                    <select id="al-v-batch-cat">
                      <option value="mentalidad">Mentalidad</option>
                      <option value="oratoria">Oratoria y Social</option>
                      <option value="tech">Tech / IA</option>
                      <option value="estudio">Estudio y Libros</option>
                      <option value="carrera">Carrera y Finanzas</option>
                      <option value="bienestar">Bienestar y Voz</option>
                      <option value="otros">Otros útiles</option>
                    </select>
                  </label>
                  <button type="submit" class="al-btn al-btn-primary">${Icons.upload(15)}<span>Importar lote</span></button>
                </div>
              </form>
            `
            }
          </div>
        `
            : ''
        }

        <div class="al-toolbar">
          <div class="al-seg-tabs">
            ${visibleTabs
              .map(
                (t) => `<button type="button" class="al-seg-btn ${prefs.category === t.id ? 'is-active' : ''}" data-vcat="${t.id}">${t.label}</button>`
              )
              .join('')}
            <button type="button" class="al-seg-btn" id="al-vault-toggle-opt">
              ${this.showOptionalTabs ? 'Ocultar extras' : '+ Visual / Ocio'}
            </button>
          </div>
        </div>

        <div class="al-toolbar">
          <div class="al-seg-tabs">
            <button type="button" class="al-seg-btn ${prefs.statusFilter === 'active' ? 'is-active' : ''}" data-vstatus="active">Activos</button>
            <button type="button" class="al-seg-btn ${prefs.statusFilter === 'pending' ? 'is-active' : ''}" data-vstatus="pending">Pendientes</button>
            <button type="button" class="al-seg-btn ${prefs.statusFilter === 'seen' ? 'is-active' : ''}" data-vstatus="seen">Vistos</button>
            <button type="button" class="al-seg-btn ${prefs.statusFilter === 'applied' ? 'is-active' : ''}" data-vstatus="applied">Aplicados</button>
            <button type="button" class="al-seg-btn ${prefs.statusFilter === 'archived' ? 'is-active' : ''}" data-vstatus="archived">Ocultos</button>
          </div>

          <div class="al-tool-group">
            <span class="al-mono-pill" id="al-vault-count">Mostrando ${showing} de ${filtered.length} recursos</span>
            <input type="search" id="al-vault-search" class="al-filter-input" value="${esc(prefs.searchQuery)}" placeholder="Buscar idea, etiqueta, nota o URL..." />
          </div>
        </div>

        <div class="al-phrases-grid" id="al-vault-grid">
          ${this.renderCardsHtml(filtered)}
        </div>

        <div class="al-vault-more-wrap" id="al-vault-more-wrap">
          ${
            filtered.length > this.visibleLimit
              ? `<button type="button" class="al-btn" id="al-vault-load-more">Cargar 30 más (${filtered.length - this.visibleLimit} restantes)</button>`
              : ''
          }
        </div>
      </div>
    `;

    container.querySelector('#al-vault-add-btn')?.addEventListener('click', () => {
      this.addFormOpen = !this.addFormOpen;
      this.render(container);
    });

    container.querySelector('#al-vault-add-close')?.addEventListener('click', () => {
      this.addFormOpen = false;
      this.render(container);
    });

    container.querySelector('#al-vault-fb-close')?.addEventListener('click', () => {
      this.feedbackMsg = '';
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-add-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.addMode = btn.dataset.addMode as 'single' | 'batch';
        this.render(container);
      });
    });

    container.querySelector('#al-vault-single-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = container.querySelector<HTMLInputElement>('#al-v-title')!.value.trim();
      const url = normalizeUrl(container.querySelector<HTMLInputElement>('#al-v-url')!.value);
      const category = container.querySelector<HTMLSelectElement>('#al-v-cat')!.value as VaultCategory;
      const summary =
        container.querySelector<HTMLInputElement>('#al-v-summary')!.value.trim() ||
        'Recurso guardado manualmente.';
      const tagsRaw = container.querySelector<HTMLInputElement>('#al-v-tags')!.value;
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 5);
      if (!title || !url) return;

      lifeStore.addCustomVaultItem({ title, url, category, summary, tags });
      this.addFormOpen = false;
      this.feedbackMsg = `Recurso añadido al Baúl: "${title}"`;
      this.render(container);
    });

    container.querySelector('#al-vault-batch-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = container.querySelector<HTMLTextAreaElement>('#al-v-batch-text')!.value.trim();
      const defCat = container.querySelector<HTMLSelectElement>('#al-v-batch-cat')!.value as VaultCategory;
      if (!raw) return;

      const parsed: Omit<VaultItem, 'id' | 'isCustom' | 'createdAt'>[] = [];
      if (raw.startsWith('[') || raw.startsWith('{')) {
        try {
          const json = JSON.parse(raw);
          const arr = Array.isArray(json) ? json : [json];
          for (const row of arr) {
            const url = normalizeUrl(String(row?.url || ''));
            if (!url) continue;
            const title = String(row?.title || row?.caption || url).slice(0, 90);
            const summary = String(row?.summary || row?.caption || 'Recurso importado.').slice(0, 420);
            const cat = (row?.category as VaultCategory) || defCat;
            const tags = Array.isArray(row?.tags) ? row.tags.map(String).slice(0, 5) : [];
            parsed.push({ url, title, summary, category: CAT_LABELS[cat] ? cat : defCat, tags });
          }
        } catch {
          this.feedbackMsg = 'El JSON no es válido. Usa líneas URL | Título o un arreglo JSON válido.';
          this.render(container);
          return;
        }
      } else {
        for (const line of raw.split(/\r?\n/)) {
          const clean = line.trim();
          if (!clean) continue;
          const parts = clean.split('|').map((p) => p.trim());
          const url = normalizeUrl(parts[0] || '');
          if (!/^https?:\/\//i.test(url)) continue;
          const title = parts[1] || `Recurso añadido (${url.split('/').filter(Boolean).pop() || 'enlace'})`;
          const maybeCat = (parts[2] || '').toLowerCase() as VaultCategory;
          const cat = CAT_LABELS[maybeCat] ? maybeCat : defCat;
          const summary = parts[3] || title;
          parsed.push({ url, title, summary, category: cat, tags: [] });
        }
      }

      const existingUrls = new Set(VAULT_BANK.map((v) => normalizeUrl(v.url)));
      const added = lifeStore.importCustomVaultItems(parsed, existingUrls);
      this.addFormOpen = false;
      this.feedbackMsg =
        added > 0
          ? `Se añadieron ${added} recurso(s) nuevo(s) al Baúl (duplicados omitidos).`
          : 'No se añadieron recursos nuevos (enlaces vacíos o ya existentes).';
      this.render(container);
    });

    container.querySelector('#al-vault-toggle-opt')?.addEventListener('click', () => {
      this.showOptionalTabs = !this.showOptionalTabs;
      this.render(container);
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vcat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.visibleLimit = 30;
        lifeStore.updateModulePrefs('vault', {
          category: btn.dataset.vcat as VaultFilterCategory,
        });
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-vstatus]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.visibleLimit = 30;
        lifeStore.updateModulePrefs('vault', {
          statusFilter: btn.dataset.vstatus as 'active' | VaultStatus,
        });
        this.render(container);
      });
    });

    container.querySelector('#al-vault-search')?.addEventListener('input', (e) => {
      this.visibleLimit = 30;
      lifeStore.updateModulePrefs('vault', {
        searchQuery: (e.target as HTMLInputElement).value,
      });
      this.refreshResults(container);
    });

    this.bindGridEvents(container, allItems);
  }
}
