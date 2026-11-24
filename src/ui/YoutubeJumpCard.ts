import { buildYoutubeSearchUrl, getGuidesForModule } from '../data/YoutubeGuidesBank';
import { Icons } from '../icons';
import type { ModuleId } from '../types';

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Widget compacto y desplegable para saltar desde un módulo práctico de Atelier
 * hacia búsquedas curadas en YouTube o hacia el mapa completo de #guides.
 */
export function renderYoutubeJumpCard(moduleId: ModuleId): string {
  const topics = getGuidesForModule(moduleId);
  if (topics.length === 0) return '';

  const primary = topics[0];
  const quickLinks = topics
    .flatMap((t) =>
      t.stages.slice(0, 2).map((st) => ({
        topicTitle: t.title,
        level: st.level,
        label: st.youtubeLinks[0]?.label ?? t.title,
        url: buildYoutubeSearchUrl(st.youtubeLinks[0]?.query ?? t.title),
      }))
    )
    .slice(0, 4);

  return `
    <details class="al-panel al-yt-jump-card">
      <summary class="al-yt-jump-summary">
        <div class="al-yt-jump-head">
          <span class="al-yt-badge">${Icons.youtube(16)}<span>YouTube</span></span>
          <div>
            <strong>¿Quieres profundizar más? Rutas recomendadas en YouTube</strong>
            <small class="al-muted">Tutoriales visuales sugeridos para ${esc(primary.title)} y habilidades relacionadas</small>
          </div>
        </div>
        <span class="al-step-pill">Ver sugerencias</span>
      </summary>
      <div class="al-yt-jump-body">
        <div class="al-yt-links-grid">
          ${quickLinks
            .map(
              (item) => `
            <a class="al-btn al-btn-sm al-yt-link-btn" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">
              ${Icons.youtube(14)}
              <span>${esc(item.label)} <small class="al-muted">(${esc(item.level)})</small></span>
              ${Icons.arrowUpRight(13)}
            </a>`
            )
            .join('')}
        </div>
        <div class="al-yt-jump-foot">
          <span class="al-muted">Guarda tu progreso por etapas y tus canales favoritos en el mapa completo.</span>
          <a class="al-btn al-btn-sm al-btn-primary" href="#guides">
            ${Icons.compass(14)}<span>Abrir Rutas y YouTube</span>
          </a>
        </div>
      </div>
    </details>
  `;
}
