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
import { CareerView } from './views/CareerView';
import { CompassView } from './views/CompassView';
import { CriticalView } from './views/CriticalView';
import { DrawingView } from './views/DrawingView';
import { FinanceView } from './views/FinanceView';
import { FocusLabView } from './views/FocusLabView';
import { GuidesView } from './views/GuidesView';
import { HomeView } from './views/HomeView';
import { LanguageView } from './views/LanguageView';
import { MindsetView } from './views/MindsetView';
import { ReaderView } from './views/ReaderView';
import { SingingView } from './views/SingingView';
import { StudioView } from './views/StudioView';
import { TypingView } from './views/TypingView';
import { VitalityView } from './views/VitalityView';
import { WritingView } from './views/WritingView';

const NAV_ITEMS: { id: ModuleId; label: string; icon: (s?: number) => string }[] = [
  { id: 'home', label: 'Inicio Atelier', icon: Icons.home },
  { id: 'reader', label: 'Lectura', icon: Icons.book },
  { id: 'studio', label: 'Cuaderno/PDF', icon: Icons.tablet },
  { id: 'calligraphy', label: 'Caligrafía', icon: Icons.pen },
  { id: 'drawing', label: 'Dibujo', icon: Icons.palette },
  { id: 'typing', label: 'Mecanografía', icon: Icons.keyboard },
  { id: 'language', label: 'Léxico', icon: Icons.spell },
  { id: 'mindset', label: 'Criterio', icon: Icons.bulb },
  { id: 'focuslab', label: 'Oratoria/Foco', icon: Icons.mic },
  { id: 'singing', label: 'Canto', icon: Icons.mic },
  { id: 'calm', label: 'Calma', icon: Icons.wind },
  { id: 'critical', label: 'Crítico', icon: Icons.scale },
  { id: 'writing', label: 'Escritura', icon: Icons.feather },
  { id: 'finance', label: 'Finanzas', icon: Icons.wallet },
  { id: 'vitality', label: 'Postura Pro', icon: Icons.activity },
  { id: 'compass', label: 'Brújula', icon: Icons.compass },
  { id: 'career', label: 'Social/Carrera', icon: Icons.briefcase },
  { id: 'guides', label: 'Rutas YouTube', icon: Icons.youtube },
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
const focusLabView = new FocusLabView();
const singingView = new SingingView();
const calmView = new CalmView();
const criticalView = new CriticalView();
const writingView = new WritingView();
const financeView = new FinanceView();
const vitalityView = new VitalityView();
const compassView = new CompassView();
const careerView = new CareerView();
const guidesView = new GuidesView();

const initialRoute = parseHashRoute(window.location.hash);
let currentModule: ModuleId = initialRoute.moduleId;
let pendingSos = initialRoute.sos;

const modals = new EcosystemModals(() => renderApp());

function applyTheme(): void {
  const theme = lifeStore.get().theme;
  document.documentElement.setAttribute('data-theme', theme);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'night' ? '#0F1311' : '#FAFBF8');
  }
}

function navigate(next: ModuleId, options?: { sos?: boolean }): void {
  if (currentModule !== 'home' && currentModule !== next) {
    lifeStore.recordModuleVisit(currentModule);
  }
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
  if (currentModule === 'vitality' && next !== 'vitality') {
    vitalityView.unmount();
  }
  if (currentModule === 'compass' && next !== 'compass') {
    compassView.unmount();
  }
  if (currentModule === 'career' && next !== 'career') {
    careerView.unmount();
  }
  if (currentModule === 'reader' && next !== 'reader') {
    readerView.unmount();
  }
  if (currentModule === 'mindset' && next !== 'mindset') {
    mindsetView.unmount();
  }
  currentModule = next;
  if (next !== 'home') {
    lifeStore.recordModuleVisit(next);
  }
  pendingSos = Boolean(options?.sos && next === 'calm');
  const nextHash =
    next === 'home' ? './' : next === 'calm' && pendingSos ? '#calm?sos=1' : `#${next}`;
  if (window.location.hash !== (nextHash === './' ? '' : nextHash)) {
    history.replaceState(null, '', nextHash);
  }
  renderApp();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderEcoSwitch(): string {
  return `
    <nav class="eco-switch" aria-label="Aplicaciones del ecosistema">
      <a class="eco-switch-link" data-eco-app="directorio" href="${resolveEcoUrl('directorio')}">
        <span class="eco-swatch is-dir" aria-hidden="true"></span>
        <span class="eco-label-full">Directorio</span><span class="eco-label-short">Directorio</span>
      </a>
      <a class="eco-switch-link is-current" data-eco-app="atelier" aria-current="page" href="${resolveEcoUrl('atelier')}">
        <span class="eco-swatch is-atelier" aria-hidden="true"></span>
        <span class="eco-label-full">Atelier Diario</span><span class="eco-label-short">Atelier</span>
      </a>
      <a class="eco-switch-link" data-eco-app="unumbral" href="${resolveEcoUrl('unumbral')}">
        <span class="eco-swatch is-unu" aria-hidden="true"></span>
        <span class="eco-label-full">UNUmbral</span><span class="eco-label-short">UNUmbral</span>
      </a>
      <a class="eco-switch-link" data-eco-app="arena" href="${resolveEcoUrl('arena')}">
        <span class="eco-swatch is-arena" aria-hidden="true"></span>
        <span class="eco-label-full">OMNI ARENA</span><span class="eco-label-short">Arena</span>
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
      ? 'Nube aviso'
      : `Supabase · ${syncMeta.spaceCode}`
    : 'Supabase';

  root.innerHTML = `
    <div class="al-shell">
      ${renderEcoSwitch()}
      <header class="al-topbar">
        <div class="al-topbar-main">
          <button type="button" class="al-brand" data-route="home" aria-label="Ir al inicio de Atelier Diario">
            <span class="al-brand-emblem" aria-hidden="true">
              <span class="al-brand-emblem-core">${Icons.book(17)}</span>
            </span>
            <span class="al-brand-copy">
              <span class="al-brand-name">Atelier Diario</span>
              <span class="al-brand-sub">17 talleres de estudio, arte y bienestar</span>
            </span>
          </button>

          <div class="al-topbar-actions">
            <button type="button" class="al-cloud-pill ${syncMeta.configured ? 'is-live' : ''} ${syncMeta.lastError ? 'is-err' : ''}" id="al-open-cloud" title="Configurar y sincronizar todo en Supabase">
              ${Icons.cloud(14)}
              <span>${cloudLabel}</span>
            </button>

            <button type="button" class="al-btn al-theme-btn" id="al-theme-toggle" title="${theme === 'day' ? 'Cambiar a modo noche' : 'Cambiar a modo día'}" aria-pressed="${theme === 'night'}">
              ${theme === 'day' ? Icons.moon(15) : Icons.sun(15)}
              <span>${theme === 'day' ? 'Día' : 'Noche'}</span>
            </button>

            <button type="button" class="al-profile-chip" id="al-open-profile" title="Editar perfil y preferencias">
              <span class="al-avatar">${dir.userInitials}</span>
              <span class="al-profile-meta">
                <strong>${dir.userName}</strong>
                <small>${dir.userSubtitle}</small>
              </span>
              ${Icons.chevronDown(13)}
            </button>

            <button type="button" class="al-btn al-sos-pill-btn" id="al-open-sos" title="Abrir modo SOS Pánico Ahora">
              ${Icons.heartPulse(14)}
              <span>SOS Calma</span>
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
    case 'critical':
      criticalView.render(mainEl);
      break;
    case 'writing':
      writingView.render(mainEl);
      break;
    case 'finance':
      financeView.render(mainEl);
      break;
    case 'vitality':
      vitalityView.render(mainEl);
      break;
    case 'compass':
      compassView.render(mainEl, navigate);
      break;
    case 'career':
      careerView.render(mainEl);
      break;
    case 'guides':
      guidesView.render(mainEl, navigate);
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
