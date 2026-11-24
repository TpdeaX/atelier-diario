import { Icons } from '../icons';
import { cloudSync } from '../services/CloudSync';
import { lifeStore } from '../state/LifeStore';
import { DifficultyLevel, PracticeModuleId } from '../types';

export interface DidacticBarOptions {
  moduleId: PracticeModuleId;
  progressLabel: string;
  progressPct: number;
  progressDetail?: string;
  difficultyHints?: Record<DifficultyLevel, string>;
  extraMetric?: string;
}

const DIFF_LABELS: { id: DifficultyLevel; label: string }[] = [
  { id: 'basico', label: 'Básico' },
  { id: 'intermedio', label: 'Intermedio' },
  { id: 'avanzado', label: 'Avanzado' },
];

const DEFAULT_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Guías completas, ritmo cómodo y pistas visibles.',
  intermedio: 'Equilibrio entre guía y práctica autónoma.',
  avanzado: 'Mayor precisión, menos pistas y retos exigentes.',
};

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function difficultyLabel(level: DifficultyLevel): string {
  return level === 'basico' ? 'Básico' : level === 'intermedio' ? 'Intermedio' : 'Avanzado';
}

export function renderDidacticBar(opts: DidacticBarOptions): string {
  const diff = lifeStore.getDifficulty(opts.moduleId);
  const pct = Math.max(0, Math.min(100, Math.round(opts.progressPct)));
  const hints = opts.difficultyHints ?? DEFAULT_HINTS;
  const syncMeta = cloudSync.getSyncMeta();
  const saveLabel = syncMeta.configured
    ? `Guardado · Nube (${syncMeta.spaceCode})`
    : 'Guardado local';

  return `
    <section class="al-didactic-bar" data-didactic-mod="${opts.moduleId}" aria-label="Progreso y dificultad del módulo">
      <div class="al-didactic-progress">
        <div class="al-didactic-prog-head">
          <span class="al-didactic-label">${esc(opts.progressLabel)}</span>
          <strong class="al-didactic-pct">${pct}%</strong>
        </div>
        <progress class="al-didactic-meter" value="${pct}" max="100" aria-label="${esc(opts.progressLabel)}: ${pct}%"></progress>
        <div class="al-didactic-meta">
          <span>${esc(opts.progressDetail ?? 'Tu progreso se guarda automáticamente en cada acción.')}</span>
          ${opts.extraMetric ? `<span class="al-didactic-extra">${esc(opts.extraMetric)}</span>` : ''}
        </div>
      </div>

      <div class="al-didactic-controls">
        <div class="al-diff-wrap">
          <span class="al-diff-caption">Dificultad</span>
          <div class="al-diff-pills" role="group" aria-label="Nivel de dificultad">
            ${DIFF_LABELS.map(
              (d) => `
                <button
                  type="button"
                  class="al-diff-btn ${diff === d.id ? 'is-active' : ''}"
                  data-diff-set="${d.id}"
                  aria-pressed="${diff === d.id}"
                >${d.label}</button>`
            ).join('')}
          </div>
          <small class="al-diff-hint">${esc(hints[diff])}</small>
        </div>

        <button
          type="button"
          class="al-save-chip ${syncMeta.configured ? 'is-cloud' : ''}"
          data-didactic-save="1"
          title="Forzar guardado inmediato en local y Supabase"
        >
          ${Icons.check(13)}<span>${esc(saveLabel)}</span>
        </button>
      </div>
    </section>
  `;
}

export function bindDidacticBar(
  root: HTMLElement,
  moduleId: PracticeModuleId,
  onDifficultyChange: (next: DifficultyLevel) => void
): void {
  const bar = root.querySelector<HTMLElement>(`.al-didactic-bar[data-didactic-mod="${moduleId}"]`);
  if (!bar) return;

  bar.querySelectorAll<HTMLButtonElement>('[data-diff-set]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.diffSet as DifficultyLevel;
      if (next === lifeStore.getDifficulty(moduleId)) return;
      lifeStore.setDifficulty(moduleId, next);
      onDifficultyChange(next);
    });
  });

  const saveBtn = bar.querySelector<HTMLButtonElement>('[data-didactic-save]');
  saveBtn?.addEventListener('click', async () => {
    const span = saveBtn.querySelector('span');
    if (span) span.textContent = 'Guardando...';
    const ok = await lifeStore.pushNow();
    if (span) {
      span.textContent = ok
        ? 'Sincronizado ahora'
        : cloudSync.isConfigured()
          ? 'Guardado local (sin red)'
          : 'Guardado en este dispositivo';
    }
    saveBtn.classList.add('is-saved-flash');
    window.setTimeout(() => saveBtn.classList.remove('is-saved-flash'), 1200);
  });
}
