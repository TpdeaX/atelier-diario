import { Icons } from '../icons';

export interface SectionTutorialSpec {
  id: string;
  moduleName: string;
  sectionName: string;
  summary: string;
  steps: string[];
  tip?: string;
}

const STORAGE_PREFIX = 'al_tut_';

function escHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readOpenState(id: string): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(STORAGE_PREFIX + id) === '1';
  } catch {
    return false;
  }
}

function writeOpenState(id: string, open: boolean): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(STORAGE_PREFIX + id, open ? '1' : '0');
  } catch {
    // ignore storage quota / privacy mode errors
  }
}

function stripLeadingStepNumber(step: string): string {
  return step.replace(/^\s*\d+[\.)]\s+/, '').trim();
}

export function renderTutorialBanner(spec: SectionTutorialSpec): string {
  const isOpen = readOpenState(spec.id);
  const steps = spec.steps
    .map((s) => stripLeadingStepNumber(s))
    .filter((s) => s.length > 0);

  const stepsHtml =
    steps.length > 0
      ? `<ol class="al-tutorial-steps">${steps.map((s) => `<li>${escHtml(s)}</li>`).join('')}</ol>`
      : '';

  const tipHtml = spec.tip
    ? `<p class="al-tutorial-tip"><strong>Consejo:</strong> ${escHtml(spec.tip)}</p>`
    : '';

  return `
    <section
      class="al-tutorial-box ${isOpen ? 'is-open' : ''}"
      data-tut-id="${escHtml(spec.id)}"
      data-tut-open="${isOpen ? '1' : '0'}"
      aria-label="Tutorial de ${escHtml(spec.sectionName)}"
    >
      <div class="al-tutorial-head">
        <div class="al-tutorial-title-wrap">
          <span class="al-tutorial-badge">${Icons.bulb(14)}<span>Guía rápida</span></span>
          <strong class="al-tutorial-title">${escHtml(spec.moduleName)} · ${escHtml(spec.sectionName)}</strong>
          <span class="al-tutorial-summary">${escHtml(spec.summary)}</span>
        </div>
        <button
          type="button"
          class="al-btn al-btn-sm al-tutorial-toggle"
          aria-expanded="${isOpen}"
        >
          ${Icons.chevronDown(14)}<span class="al-tutorial-toggle-label">${isOpen ? 'Ocultar tutorial' : 'Tutorial'}</span>
        </button>
      </div>
      <div class="al-tutorial-body"${isOpen ? '' : ' hidden'}>
        ${stepsHtml}
        ${tipHtml}
      </div>
    </section>
  `;
}

export function bindTutorialBanners(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.al-tutorial-box[data-tut-id]').forEach((box) => {
    if (box.dataset.tutBound === '1') return;
    box.dataset.tutBound = '1';
    const id = box.dataset.tutId ?? '';
    const toggleBtn = box.querySelector<HTMLButtonElement>('.al-tutorial-toggle');
    const labelEl = box.querySelector<HTMLElement>('.al-tutorial-toggle-label');
    const bodyEl = box.querySelector<HTMLElement>('.al-tutorial-body');
    if (!toggleBtn || !bodyEl) return;

    toggleBtn.addEventListener('click', () => {
      const nextOpen = !box.classList.contains('is-open');
      box.classList.toggle('is-open', nextOpen);
      box.dataset.tutOpen = nextOpen ? '1' : '0';
      toggleBtn.setAttribute('aria-expanded', String(nextOpen));
      if (labelEl) {
        labelEl.textContent = nextOpen ? 'Ocultar tutorial' : 'Tutorial';
      }
      bodyEl.hidden = !nextOpen;
      if (id) writeOpenState(id, nextOpen);
    });
  });
}
