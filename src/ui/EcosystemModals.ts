import { Icons } from '../icons';
import { cloudSync, SUPABASE_SETUP_SQL } from '../services/CloudSync';
import { pullAllEcosystemFromCloud, pushAndPullAllEcosystem } from '../services/EcosystemSync';
import { listNotebooks, saveNotebook } from '../services/NotebookStore';
import { directoryStore } from '../state/DirectoryStore';
import { lifeStore } from '../state/LifeStore';
import { DeviceProfile, DirectoryConfig, LifeProfile, NotebookDoc, ThemeMode } from '../types';

export type ActiveModalType = 'none' | 'cloud' | 'profile';

export class EcosystemModals {
  private activeModal: ActiveModalType = 'none';
  private cloudFeedback = '';
  private busy = false;
  private onRerender: () => void;

  constructor(onRerender: () => void) {
    this.onRerender = onRerender;
  }

  public open(type: ActiveModalType): void {
    this.activeModal = type;
    this.cloudFeedback = '';
    this.onRerender();
  }

  public close(): void {
    this.activeModal = 'none';
    this.onRerender();
  }

  public render(): string {
    if (this.activeModal === 'cloud') return this.renderCloudModal();
    if (this.activeModal === 'profile') return this.renderProfileModal();
    return '';
  }

  private renderCloudModal(): string {
    const cfg = cloudSync.getConfig();
    const meta = cloudSync.getSyncMeta();
    const lastSyncText = meta.lastSyncAt
      ? new Date(meta.lastSyncAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : 'Sin sincronizar aún';

    return `
      <div class="al-modal-backdrop" id="al-eco-modal-backdrop">
        <div class="al-modal-dialog al-panel" role="dialog" aria-modal="true" aria-label="Centro de Nube Supabase">
          <div class="al-card-head">
            <div>
              <h2>Nube Supabase y Respaldo del Ecosistema</h2>
              <p class="al-muted">Guarda y sincroniza en vivo tu Directorio, configuraciones de cada módulo, hábitos, glosario, cuadernos/PDFs, UNUmbral y OMNI ARENA.</p>
            </div>
            <button type="button" class="al-icon-btn" id="al-eco-modal-close" title="Cerrar">×</button>
          </div>

          <div class="al-cloud-scope-strip">
            <span class="al-scope-pill ${meta.configured ? 'is-ok' : ''}">Directorio y Perfil</span>
            <span class="al-scope-pill ${meta.configured ? 'is-ok' : ''}">8 Módulos Atelier</span>
            <span class="al-scope-pill ${meta.configured ? 'is-ok' : ''}">Cuadernos y PDFs</span>
            <span class="al-scope-pill ${meta.configured ? 'is-ok' : ''}">UNUmbral</span>
            <span class="al-scope-pill ${meta.configured ? 'is-ok' : ''}">OMNI ARENA</span>
            <span class="al-mono-pill">Último sync: ${lastSyncText}</span>
          </div>

          <form class="al-reframe-form" id="al-eco-cloud-form">
            <div class="al-form-grid-2">
              <label>
                <span>URL del proyecto Supabase</span>
                <input type="url" id="al-eco-sb-url" value="${cfg.supabaseUrl}" placeholder="https://tuproyecto.supabase.co" />
              </label>
              <label>
                <span>Código de espacio compartido</span>
                <input type="text" id="al-eco-sb-space" value="${cfg.spaceCode}" placeholder="joseph-espacio" />
              </label>
            </div>
            <label>
              <span>Supabase Anon Public Key</span>
              <input type="text" id="al-eco-sb-key" value="${cfg.supabaseAnonKey}" placeholder="eyJhbGciOi..." />
            </label>
            <label class="al-inline-check">
              <input type="checkbox" id="al-eco-sb-auto" ${cfg.autoSync ? 'checked' : ''} />
              <span>Guardar automáticamente cada cambio en tiempo real</span>
            </label>

            <div class="al-tool-group">
              <button type="submit" class="al-btn al-btn-primary" ${this.busy ? 'disabled' : ''}>
                ${Icons.cloud(15)}<span>${this.busy ? 'Conectando...' : 'Guardar y conectar todo'}</span>
              </button>
              <button type="button" class="al-btn" id="al-eco-sync-push" ${this.busy ? 'disabled' : ''}>
                ${Icons.refresh(15)}<span>Sincronizar ahora</span>
              </button>
              <button type="button" class="al-btn" id="al-eco-sync-pull" ${this.busy ? 'disabled' : ''}>
                ${Icons.download(15)}<span>Traer desde nube</span>
              </button>
              <button type="button" class="al-btn" id="al-eco-copy-sql">Copiar SQL completo</button>
            </div>
          </form>

          ${
            this.cloudFeedback || meta.lastError
              ? `<div class="al-feedback-banner">${this.cloudFeedback || meta.lastError}</div>`
              : ''
          }

          <div class="al-cloud-sections">
            <div class="al-cloud-box">
              <strong>Enlace rápido entre puertos/dispositivos</strong>
              <p class="al-muted">Copia tus credenciales de Supabase en 1 clic para pegarlas rápido en UNUmbral o OMNI ARENA en desarrollo local.</p>
              <div class="al-tool-group">
                <button type="button" class="al-btn" id="al-eco-copy-token">Copiar llave rápida</button>
                <button type="button" class="al-btn" id="al-eco-paste-token">Pegar llave rápida</button>
              </div>
            </div>

            <div class="al-cloud-box">
              <strong>Respaldo completo en archivo (.json)</strong>
              <p class="al-muted">Exporta o restaura en un solo archivo todo tu perfil, directorio, hábitos, notas y cuadernos.</p>
              <div class="al-tool-group">
                <button type="button" class="al-btn" id="al-eco-export-all">${Icons.download(14)}<span>Exportar todo</span></button>
                <label class="al-btn">
                  ${Icons.upload(14)}<span>Importar respaldo</span>
                  <input type="file" id="al-eco-import-all" accept=".json,application/json" style="display:none" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderProfileModal(): string {
    const dir = directoryStore.get();
    const life = lifeStore.get();

    return `
      <div class="al-modal-backdrop" id="al-eco-modal-backdrop">
        <div class="al-modal-dialog al-panel" role="dialog" aria-modal="true" aria-label="Perfil y Preferencias">
          <div class="al-card-head">
            <div>
              <h2>Perfil y Configuración del Ecosistema</h2>
              <p class="al-muted">Cada cambio se guarda al instante y se sincroniza con tu espacio en Supabase.</p>
            </div>
            <button type="button" class="al-icon-btn" id="al-eco-modal-close" title="Cerrar">×</button>
          </div>

          <form class="al-reframe-form" id="al-eco-profile-form">
            <div class="al-form-grid-2">
              <label>
                <span>Tu nombre en cabecera</span>
                <input type="text" id="al-prof-name" value="${dir.userName.replace(/"/g, '&quot;')}" required />
              </label>
              <label>
                <span>Sede o subtítulo</span>
                <input type="text" id="al-prof-sub" value="${dir.userSubtitle.replace(/"/g, '&quot;')}" />
              </label>
            </div>

            <div class="al-form-grid-2">
              <label>
                <span>Iniciales del avatar (2-3 letras)</span>
                <input type="text" id="al-prof-init" maxlength="3" value="${dir.userInitials.replace(/"/g, '&quot;')}" />
              </label>
              <label>
                <span>Título del ecosistema</span>
                <input type="text" id="al-prof-ecotitle" value="${dir.ecosystemTitle.replace(/"/g, '&quot;')}" />
              </label>
            </div>

            <label>
              <span>Subtítulo del directorio</span>
              <input type="text" id="al-prof-ecosub" value="${dir.ecosystemSubtitle.replace(/"/g, '&quot;')}" />
            </label>

            <div class="al-form-grid-2">
              <label>
                <span>Apariencia del sistema</span>
                <select id="al-prof-theme">
                  <option value="day" ${life.theme === 'day' ? 'selected' : ''}>Modo Día (Claro institucional)</option>
                  <option value="night" ${life.theme === 'night' ? 'selected' : ''}>Modo Noche (Tinta oscura)</option>
                </select>
              </label>
              <label>
                <span>Perfil de dispositivo</span>
                <select id="al-prof-device">
                  <option value="auto" ${life.deviceMode === 'auto' ? 'selected' : ''}>Automático (según pantalla)</option>
                  <option value="pc" ${life.deviceMode === 'pc' ? 'selected' : ''}>Escritorio / Laptop (PC)</option>
                  <option value="mobile" ${life.deviceMode === 'mobile' ? 'selected' : ''}>Celular / Táctil</option>
                </select>
              </label>
            </div>

            <div class="al-form-grid-2">
              <label>
                <span>URL personalizada de UNUmbral (opcional)</span>
                <input type="text" id="al-prof-url-unumbral" value="${dir.companionUrls.unumbral.replace(/"/g, '&quot;')}" placeholder="Vacío = detección automática" />
              </label>
              <label>
                <span>URL personalizada de OMNI ARENA (opcional)</span>
                <input type="text" id="al-prof-url-arena" value="${dir.companionUrls.arena.replace(/"/g, '&quot;')}" placeholder="Vacío = detección automática" />
              </label>
            </div>

            <div class="al-tool-group">
              <button type="submit" class="al-btn al-btn-primary">${Icons.check(15)}<span>Guardar configuración</span></button>
              <button type="button" class="al-btn" id="al-prof-open-cloud">${Icons.cloud(15)}<span>Configurar Supabase</span></button>
              <button type="button" class="al-btn" id="al-prof-reset-dir">Restaurar orden del Directorio</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  public bind(root: HTMLElement): void {
    if (this.activeModal === 'none') return;

    root.querySelector('#al-eco-modal-close')?.addEventListener('click', () => this.close());
    root.querySelector('#al-eco-modal-backdrop')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'al-eco-modal-backdrop') this.close();
    });

    if (this.activeModal === 'cloud') {
      root.querySelector('#al-eco-cloud-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = root.querySelector<HTMLInputElement>('#al-eco-sb-url')!.value;
        const key = root.querySelector<HTMLInputElement>('#al-eco-sb-key')!.value;
        const space = root.querySelector<HTMLInputElement>('#al-eco-sb-space')!.value;
        const auto = root.querySelector<HTMLInputElement>('#al-eco-sb-auto')!.checked;
        cloudSync.saveConfig({ supabaseUrl: url, supabaseAnonKey: key, spaceCode: space, autoSync: auto });
        this.busy = true;
        this.cloudFeedback = 'Probando conexión y sincronizando todo...';
        this.onRerender();
        const res = await pushAndPullAllEcosystem();
        this.busy = false;
        this.cloudFeedback = res.message;
        this.onRerender();
      });

      root.querySelector('#al-eco-sync-push')?.addEventListener('click', async () => {
        this.busy = true;
        this.cloudFeedback = 'Guardando cambios locales y descargando actualizaciones...';
        this.onRerender();
        const res = await pushAndPullAllEcosystem();
        this.busy = false;
        this.cloudFeedback = res.message;
        this.onRerender();
      });

      root.querySelector('#al-eco-sync-pull')?.addEventListener('click', async () => {
        this.busy = true;
        this.cloudFeedback = 'Trayendo estado remoto desde Supabase...';
        this.onRerender();
        const res = await pullAllEcosystemFromCloud(true);
        this.busy = false;
        this.cloudFeedback = res.message;
        this.onRerender();
      });

      root.querySelector('#al-eco-copy-sql')?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
          this.cloudFeedback = 'SQL completo copiado. Pégalo en Supabase -> SQL Editor -> Run.';
        } catch {
          this.cloudFeedback = 'Revisa el archivo supabase_setup.sql en la raíz del proyecto.';
        }
        this.onRerender();
      });

      root.querySelector('#al-eco-copy-token')?.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(cloudSync.exportConfigToken());
          this.cloudFeedback = 'Llave rápida copiada al portapapeles. Pégala en UNUmbral u OMNI ARENA.';
        } catch {
          this.cloudFeedback = 'No se pudo acceder al portapapeles.';
        }
        this.onRerender();
      });

      root.querySelector('#al-eco-paste-token')?.addEventListener('click', async () => {
        const raw = window.prompt('Pega aquí la llave rápida JSON de Supabase:');
        if (!raw) return;
        if (cloudSync.importConfigToken(raw)) {
          this.busy = true;
          this.onRerender();
          const res = await pushAndPullAllEcosystem();
          this.busy = false;
          this.cloudFeedback = res.message;
        } else {
          this.cloudFeedback = 'El texto pegado no es una llave rápida válida.';
        }
        this.onRerender();
      });

      root.querySelector('#al-eco-export-all')?.addEventListener('click', async () => {
        const notebooks = await listNotebooks();
        const payload = {
          tipo: 'ecosistema-atelier-respaldo-total',
          version: 2,
          exportedAt: new Date().toISOString(),
          directoryConfig: directoryStore.get(),
          atelierProfile: lifeStore.get(),
          notebooks,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ecosistema_Atelier_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.cloudFeedback = 'Respaldo completo descargado.';
        this.onRerender();
      });

      root.querySelector<HTMLInputElement>('#al-eco-import-all')?.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const data = JSON.parse(await file.text()) as {
            directoryConfig?: Partial<DirectoryConfig>;
            atelierProfile?: Partial<LifeProfile>;
            notebooks?: NotebookDoc[];
          };
          if (data.directoryConfig) {
            directoryStore.applyRemote(data.directoryConfig, Date.now(), true);
            await directoryStore.pushNow();
          }
          if (data.atelierProfile) {
            lifeStore.replaceAll(data.atelierProfile);
          }
          if (Array.isArray(data.notebooks)) {
            for (const nb of data.notebooks) {
              if (nb?.id && nb?.title) {
                await saveNotebook(nb);
                void cloudSync.pushNotebook(nb);
              }
            }
          }
          this.cloudFeedback = 'Respaldo completo restaurado y sincronizado.';
        } catch {
          this.cloudFeedback = 'El archivo seleccionado no es un respaldo válido del ecosistema.';
        }
        this.onRerender();
      });
    }

    if (this.activeModal === 'profile') {
      root.querySelector('#al-eco-profile-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        directoryStore.updateIdentity({
          userName: root.querySelector<HTMLInputElement>('#al-prof-name')!.value,
          userSubtitle: root.querySelector<HTMLInputElement>('#al-prof-sub')!.value,
          userInitials: root.querySelector<HTMLInputElement>('#al-prof-init')!.value,
          ecosystemTitle: root.querySelector<HTMLInputElement>('#al-prof-ecotitle')!.value,
          ecosystemSubtitle: root.querySelector<HTMLInputElement>('#al-prof-ecosub')!.value,
          companionUrls: {
            unumbral: root.querySelector<HTMLInputElement>('#al-prof-url-unumbral')!.value,
            arena: root.querySelector<HTMLInputElement>('#al-prof-url-arena')!.value,
          },
        });
        lifeStore.setTheme(root.querySelector<HTMLSelectElement>('#al-prof-theme')!.value as ThemeMode);
        lifeStore.setDeviceMode(root.querySelector<HTMLSelectElement>('#al-prof-device')!.value as DeviceProfile);
        this.close();
      });

      root.querySelector('#al-prof-open-cloud')?.addEventListener('click', () => this.open('cloud'));
      root.querySelector('#al-prof-reset-dir')?.addEventListener('click', () => {
        directoryStore.resetLayout();
        this.close();
      });
    }
  }
}
