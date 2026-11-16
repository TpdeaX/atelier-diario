import './style.css';
import { Icons } from './icons';
import { lifeStore } from './state/LifeStore';
import { ModuleId } from './types';
import { CalligraphyView } from './views/CalligraphyView';
import { CalmView } from './views/CalmView';
import { HomeView } from './views/HomeView';
import { LanguageView } from './views/LanguageView';
import { MindsetView } from './views/MindsetView';
import { ReaderView } from './views/ReaderView';
import { SingingView } from './views/SingingView';

const NAV_ITEMS: { id: ModuleId; label: string; icon: (s?: number) => string }[] = [
  { id: 'home', label: 'Inicio', icon: Icons.home },
  { id: 'reader', label: 'Lectura', icon: Icons.book },
  { id: 'calligraphy', label: 'Caligrafía', icon: Icons.pen },
  { id: 'language', label: 'Léxico', icon: Icons.spell },
  { id: 'mindset', label: 'Criterio', icon: Icons.bulb },
  { id: 'singing', label: 'Canto', icon: Icons.mic },
  { id: 'calm', label: 'Calma', icon: Icons.wind },
];

const root = document.getElementById('app')!;
const homeView = new HomeView();
const readerView = new ReaderView();
const calligraphyView = new CalligraphyView();
const languageView = new LanguageView();
const mindsetView = new MindsetView();
const singingView = new SingingView();
const calmView = new CalmView();

let currentModule: ModuleId = 'home';

const VALID_ROUTES = new Set<ModuleId>(['home', 'reader', 'calligraphy', 'language', 'mindset', 'singing', 'calm']);
const initialHash = window.location.hash.replace('#', '') as ModuleId;
if (VALID_ROUTES.has(initialHash)) {
  currentModule = initialHash;
}

function applyTheme(): void {
  const theme = lifeStore.get().theme;
  document.documentElement.setAttribute('data-theme', theme);
}

function navigate(next: ModuleId): void {
  if (currentModule === 'singing' && next !== 'singing') {
    singingView.unmount();
  }
  if (currentModule === 'calm' && next !== 'calm') {
    calmView.unmount();
  }
  currentModule = next;
  if (window.location.hash !== `#${next}`) {
    history.replaceState(null, '', next === 'home' ? './' : `#${next}`);
  }
  renderApp();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderApp(): void {
  applyTheme();
  const theme = lifeStore.get().theme;

  root.innerHTML = `
    <div class="al-shell">
      <header class="al-topbar">
        <div class="al-brand" id="al-brand-home">
          <span class="al-brand-mark">${Icons.book(22)}</span>
          <span class="al-brand-name">Atelier Diario</span>
        </div>

        <nav class="al-nav" aria-label="Estudios principales">
          ${NAV_ITEMS.map(
            (item) => `
            <button type="button" class="al-nav-btn ${currentModule === item.id ? 'is-active' : ''}" data-route="${item.id}">
              ${item.icon(16)}
              <span>${item.label}</span>
            </button>`
          ).join('')}
        </nav>

        <div class="al-topbar-actions">
          <button type="button" class="al-sos-btn" id="al-quick-sos">${Icons.wind(15)}<span>SOS Calma</span></button>
          <button type="button" class="al-icon-btn" id="al-theme-toggle" title="${theme === 'day' ? 'Cambiar a modo noche' : 'Cambiar a modo día'}">
            ${theme === 'day' ? Icons.moon(17) : Icons.sun(17)}
          </button>
        </div>
      </header>

      <main class="al-main" id="al-main"></main>
    </div>
  `;

  root.querySelector('#al-brand-home')!.addEventListener('click', () => navigate('home'));
  root.querySelector('#al-quick-sos')!.addEventListener('click', () => navigate('calm'));
  root.querySelector('#al-theme-toggle')!.addEventListener('click', () => {
    const next = lifeStore.get().theme === 'day' ? 'night' : 'day';
    lifeStore.setTheme(next);
    try {
      localStorage.setItem('umbral-theme', next === 'night' ? 'dark' : 'light');
    } catch {
      // Ignore storage failures
    }
    renderApp();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
  });

  root.querySelectorAll<HTMLButtonElement>('[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.route as ModuleId));
  });

  const mainEl = root.querySelector<HTMLElement>('#al-main')!;
  switch (currentModule) {
    case 'home':
      homeView.render(mainEl, navigate);
      break;
    case 'reader':
      readerView.render(mainEl);
      break;
    case 'calligraphy':
      calligraphyView.render(mainEl);
      break;
    case 'language':
      languageView.render(mainEl);
      break;
    case 'mindset':
      mindsetView.render(mainEl);
      break;
    case 'singing':
      singingView.render(mainEl);
      break;
    case 'calm':
      calmView.render(mainEl);
      break;
  }
}

renderApp();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
