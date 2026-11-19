import './style.css';
import { Icons } from './icons';
import { cloudSync } from './services/CloudSync';
import { initEcosystemRealtime } from './services/EcosystemSync';
import { resolveEcoUrl } from './services/UmbralBridge';
import { directoryStore } from './state/DirectoryStore';
import { lifeStore } from './state/LifeStore';
import { ModuleId, parseHashRoute } from './types';
import { EcosystemModals } from './ui/EcosystemModals';
import { CalligraphyView } from './views/CalligraphyView';
import { CalmView } from './views/CalmView';
import { DrawingView } from './views/DrawingView';
import { FocusLabView } from './views/FocusLabView';
import { HomeView } from './views/HomeView';
import { LanguageView } from './views/LanguageView';
import { MindsetView } from './views/MindsetView';
import { ReaderView } from './views/ReaderView';
import { SingingView } from './views/SingingView';
import { StudioView } from './views/StudioView';
import { TypingView } from './views/TypingView';
import { VaultView } from './views/VaultView';

const NAV_ITEMS: { id: ModuleId; label: string; icon: (s?: number) => string }[] = [
  { id: 'home', label: 'Directorio', icon: Icons.grid },
  { id: 'reader', label: 'Lectura', icon: Icons.book },
  { id: 'studio', label: 'Cuaderno/PDF', icon: Icons.tablet },
  { id: 'calligraphy', label: 'Caligrafía', icon: Icons.pen },
  { id: 'drawing', label: 'Dibujo', icon: Icons.palette },
  { id: 'typing', label: 'Mecanografía', icon: Icons.keyboard },
  { id: 'language', label: 'Léxico', icon: Icons.spell },
  { id: 'mindset', label: 'Criterio', icon: Icons.bulb },
  { id: 'vault', label: 'Baúl', icon: Icons.archive },
  { id: 'focuslab', label: 'Oratoria/Foco', icon: Icons.mic },
  { id: 'singing', label: 'Canto', icon: Icons.mic },
  { id: 'calm', label: 'Calma', icon: Icons.wind },
];

const root = document.getElementById('app')!;
const homeView = new HomeView();
const readerView = new ReaderView();
const studioView = new StudioView();
const calligraphyView = new CalligraphyView();
const drawingView = new DrawingView();
const typingView = new TypingView();
const languageView = new LanguageView();
const mindsetView = new MindsetView();
const vaultView = new VaultView();
const focusLabView = new FocusLabView();
const singingView = new SingingView();
const calmView = new CalmView();

const initialRoute = parseHashRoute(window.location.hash);
let currentModule: ModuleId = initialRoute.moduleId;
let pendingSos = initialRoute.sos;

const modals = new EcosystemModals(() => renderApp());

function applyTheme(): void {
  const theme = lifeStore.get().theme;
  document.documentElement.setAttribute('data-theme', theme);
}

function navigate(next: ModuleId, options?: { sos?: boolean }): void {
  if (currentModule === 'singing' && next !== 'singing') {
    singingView.unmount();
  }
  if (currentModule === 'calm' && next !== 'calm') {
    calmView.unmount();
  }
  if (currentModule === 'drawing' && next !== 'drawing') {
    drawingView.unmount();
  }
  if (currentModule === 'typing' && next !== 'typing') {
    typingView.unmount();
  }
  if (currentModule === 'studio' && next !== 'studio') {
    studioView.unmount();
  }
  if (currentModule === 'focuslab' && next !== 'focuslab') {
    focusLabView.unmount();
  }
  currentModule = next;
  pendingSos = Boolean(options?.sos && next === 'calm');
  const nextHash =
    next === 'home' ? './' : next === 'calm' && pendingSos ? '#calm?sos=1' : `#${next}`;
  if (window.location.hash !== (nextHash === './' ? '' : nextHash)) {
    history.replaceState(null, '', nextHash);
  }
  renderApp();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

const ECO_ARENA_ICON = (s = 16) =>
  `<svg class="al-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 21 7 21 17 12 22 3 17 3 7"/><circle cx="12" cy="12" r="3"/></svg>`;

function renderEcoSwitch(): string {
  return `
    <nav class="eco-switch" aria-label="Aplicaciones del ecosistema">
      <a class="eco-switch-link" data-eco-app="directorio" href="${resolveEcoUrl('directorio')}">
        ${Icons.grid(16)}<span class="eco-label-full">Directorio</span><span class="eco-label-short">Directorio</span>
      </a>
      <a class="eco-switch-link is-current" data-eco-app="atelier" aria-current="page" href="${resolveEcoUrl('atelier')}">
        ${Icons.book(16)}<span class="eco-label-full">Atelier Diario</span><span class="eco-label-short">Atelier</span>
      </a>
      <a class="eco-switch-link" data-eco-app="unumbral" href="${resolveEcoUrl('unumbral')}">
        ${Icons.graduation(16)}<span class="eco-label-full">UNUmbral</span><span class="eco-label-short">UNUmbral</span>
      </a>
      <a class="eco-switch-link" data-eco-app="arena" href="${resolveEcoUrl('arena')}">
        ${ECO_ARENA_ICON(16)}<span class="eco-label-full">OMNI ARENA</span><span class="eco-label-short">Arena</span>
      </a>
    </nav>
  `;
}

function renderApp(): void {
  applyTheme();
  const theme = lifeStore.get().theme;
  const dir = directoryStore.get();
  const syncMeta = cloudSync.getSyncMeta();
  const cloudLabel = syncMeta.configured
    ? syncMeta.lastError
      ? 'Nube con aviso'
      : `Supabase · ${syncMeta.spaceCode}`
    : 'Conectar Supabase';

  root.innerHTML = `
    <div class="al-shell">
      ${renderEcoSwitch()}
      <header class="al-topbar">
        <div class="al-topbar-main">
          <div class="al-brand">
            <span class="al-brand-emblem">
              <span class="al-brand-emblem-core">${Icons.grid(18)}</span>
            </span>
            <div class="al-brand-copy">
              <span class="al-brand-name">${dir.ecosystemTitle}</span>
              <span class="al-brand-sub">${dir.ecosystemSubtitle}</span>
            </div>
          </div>

          <div class="al-topbar-actions">
            <button type="button" class="al-btn al-sos-pill-btn" id="al-open-sos" title="Abrir modo SOS Pánico Ahora">
              ${Icons.heartPulse(16)}
              <span>SOS Calma</span>
            </button>

            <button type="button" class="al-cloud-pill ${syncMeta.configured ? 'is-live' : ''} ${syncMeta.lastError ? 'is-err' : ''}" id="al-open-cloud" title="Configurar y sincronizar todo en Supabase">
              ${Icons.cloud(15)}
              <span>${cloudLabel}</span>
            </button>

            <button type="button" class="al-btn al-theme-btn" id="al-theme-toggle" title="${theme === 'day' ? 'Cambiar a modo noche' : 'Cambiar a modo día'}" aria-pressed="${theme === 'night'}">
              ${theme === 'day' ? Icons.moon(16) : Icons.sun(16)}
              <span>${theme === 'day' ? 'Tema: Día' : 'Tema: Noche'}</span>
            </button>

            <button type="button" class="al-profile-chip" id="al-open-profile" title="Editar perfil y preferencias">
              <span class="al-avatar">${dir.userInitials}</span>
              <span class="al-profile-meta">
                <strong>${dir.userName}</strong>
                <small>${dir.userSubtitle}</small>
              </span>
              ${Icons.chevronDown(14)}
            </button>
          </div>
        </div>

        ${
          currentModule !== 'home'
            ? `
          <div class="al-subnav-bar">
            <button type="button" class="al-back-dir-btn" data-route="home">
              ${Icons.home(15)}<span>Inicio Atelier</span>
            </button>
            <nav class="al-nav" aria-label="Estudios principales">
              ${NAV_ITEMS.filter((i) => i.id !== 'home')
                .map(
                  (item) => `
                  <button type="button" class="al-nav-btn ${currentModule === item.id ? 'is-active' : ''}" data-route="${item.id}">
                    ${item.icon(15)}
                    <span>${item.label}</span>
                  </button>`
                )
                .join('')}
            </nav>
          </div>`
            : ''
        }
      </header>

      <main class="al-main" id="al-main"></main>
      ${modals.render()}
    </div>
  `;

  root.querySelector('#al-open-sos')!.addEventListener('click', () => navigate('calm', { sos: true }));
  root.querySelector('#al-open-cloud')!.addEventListener('click', () => modals.open('cloud'));
  root.querySelector('#al-open-profile')!.addEventListener('click', () => modals.open('profile'));

  root.querySelector('#al-theme-toggle')!.addEventListener('click', () => {
    const next = lifeStore.get().theme === 'day' ? 'night' : 'day';
    lifeStore.setTheme(next);
    renderApp();
  });

  root.querySelectorAll<HTMLButtonElement>('[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.route as ModuleId));
  });

  modals.bind(root);

  const mainEl = root.querySelector<HTMLElement>('#al-main')!;
  switch (currentModule) {
    case 'home':
      homeView.render(mainEl, navigate, (m) => modals.open(m));
      break;
    case 'reader':
      readerView.render(mainEl, {
        onOpenStudio: () => navigate('studio'),
      });
      break;
    case 'studio':
      void studioView.render(mainEl, {
        onOpenCloudModal: () => modals.open('cloud'),
      });
      break;
    case 'calligraphy':
      calligraphyView.render(mainEl);
      break;
    case 'drawing':
      drawingView.render(mainEl);
      break;
    case 'typing':
      typingView.render(mainEl);
      break;
    case 'language':
      languageView.render(mainEl);
      break;
    case 'mindset':
      mindsetView.render(mainEl);
      break;
    case 'vault':
      vaultView.render(mainEl);
      break;
    case 'focuslab':
      focusLabView.render(mainEl);
      break;
    case 'singing':
      singingView.render(mainEl);
      break;
    case 'calm':
      if (pendingSos) {
        pendingSos = false;
        calmView.enterSosMode(mainEl);
      } else {
        calmView.render(mainEl);
      }
      break;
  }
}

cloudSync.onStatusChange(() => {
  const pill = root.querySelector('#al-open-cloud span');
  const btn = root.querySelector('#al-open-cloud');
  if (!pill || !btn) return;
  const meta = cloudSync.getSyncMeta();
  pill.textContent = meta.configured
    ? meta.lastError
      ? 'Nube con aviso'
      : `Supabase · ${meta.spaceCode}`
    : 'Conectar Supabase';
  btn.classList.toggle('is-live', meta.configured);
  btn.classList.toggle('is-err', Boolean(meta.lastError));
});

initEcosystemRealtime(() => {
  renderApp();
});

window.addEventListener('hashchange', () => {
  const parsed = parseHashRoute(window.location.hash);
  if (parsed.moduleId !== currentModule || parsed.sos) {
    navigate(parsed.moduleId, { sos: parsed.sos });
  }
});

lifeStore.applyIncomingEcoTheme();
window.addEventListener('storage', (e) => {
  if (e.key === 'umbral-theme' && lifeStore.syncThemeFromStorage()) {
    renderApp();
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && lifeStore.syncThemeFromStorage()) {
    renderApp();
  }
});

renderApp();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
