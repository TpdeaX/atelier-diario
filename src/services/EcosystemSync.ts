import { cloudSync } from './CloudSync';
import { listNotebooks, saveNotebook } from './NotebookStore';
import { cacheRemoteArenaProfile, cacheRemoteUmbralBackup } from './UmbralBridge';
import { directoryStore } from '../state/DirectoryStore';
import { lifeStore } from '../state/LifeStore';
import { DirectoryConfig, LifeProfile } from '../types';

export interface SyncSummary {
  ok: boolean;
  message: string;
  pulledScopes: string[];
  notebooksCount: number;
}

let realtimeWired = false;

export function initEcosystemRealtime(onAnyRemoteUpdate: () => void): void {
  if (realtimeWired) return;
  realtimeWired = true;

  cloudSync.onScopeUpdate((scope, payload, updatedAt) => {
    let changed = false;
    if (scope === 'directory_config' && payload) {
      changed = directoryStore.applyRemote(payload as Partial<DirectoryConfig>, updatedAt);
    } else if (scope === 'atelier_profile' && payload) {
      changed = lifeStore.applyRemote(payload as Partial<LifeProfile>, updatedAt);
    } else if (scope === 'unumbral_backup' && payload) {
      cacheRemoteUmbralBackup(payload, updatedAt);
      changed = true;
    } else if (scope === 'arena_profile' && payload) {
      cacheRemoteArenaProfile(payload);
      changed = true;
    }
    if (changed) onAnyRemoteUpdate();
  });

  if (cloudSync.isConfigured() && cloudSync.getConfig().autoSync) {
    cloudSync.startEcosystemRealtime();
    void pullAllEcosystemFromCloud().then((res) => {
      if (res.pulledScopes.length > 0 || res.notebooksCount > 0) {
        onAnyRemoteUpdate();
      }
    });
  }
}

export async function pullAllEcosystemFromCloud(forceOverwrite = false): Promise<SyncSummary> {
  if (!cloudSync.isConfigured()) {
    return {
      ok: false,
      message: 'Configura tu Supabase URL, Anon Key y código de espacio primero.',
      pulledScopes: [],
      notebooksCount: 0,
    };
  }

  const [scopes, remoteDocs] = await Promise.all([
    cloudSync.pullAllScopes(),
    cloudSync.pullAllNotebooks(),
  ]);

  const pulledScopes: string[] = [];

  const dirRemote = scopes.directory_config;
  if (dirRemote?.payload) {
    const applied = directoryStore.applyRemote(
      dirRemote.payload as Partial<DirectoryConfig>,
      dirRemote.updatedAt,
      forceOverwrite
    );
    if (applied) pulledScopes.push('Directorio');
  }

  const lifeRemote = scopes.atelier_profile;
  if (lifeRemote?.payload) {
    const applied = lifeStore.applyRemote(
      lifeRemote.payload as Partial<LifeProfile>,
      lifeRemote.updatedAt,
      forceOverwrite
    );
    if (applied) pulledScopes.push('Perfil Atelier');
  }

  const umbralRemote = scopes.unumbral_backup;
  if (umbralRemote?.payload) {
    cacheRemoteUmbralBackup(umbralRemote.payload, umbralRemote.updatedAt);
    pulledScopes.push('UNUmbral');
  }

  const arenaRemote = scopes.arena_profile;
  if (arenaRemote?.payload) {
    cacheRemoteArenaProfile(arenaRemote.payload);
    pulledScopes.push('OMNI ARENA');
  }

  let notebooksUpdated = 0;
  if (remoteDocs.length > 0) {
    const localDocs = await listNotebooks();
    const byId = new Map(localDocs.map((d) => [d.id, d]));
    for (const r of remoteDocs) {
      const local = byId.get(r.id);
      if (forceOverwrite || !local || r.updatedAt > local.updatedAt) {
        await saveNotebook(r);
        notebooksUpdated += 1;
      }
    }
  }

  return {
    ok: true,
    message:
      pulledScopes.length || notebooksUpdated
        ? `Sincronizado desde Supabase (${[...pulledScopes, notebooksUpdated ? `${notebooksUpdated} cuaderno(s)` : ''].filter(Boolean).join(', ')}).`
        : 'Conectado con Supabase. Todo al día.',
    pulledScopes,
    notebooksCount: notebooksUpdated,
  };
}

export async function pushAndPullAllEcosystem(): Promise<SyncSummary> {
  if (!cloudSync.isConfigured()) {
    return {
      ok: false,
      message: 'Completa URL, Anon Key y código de espacio antes de sincronizar.',
      pulledScopes: [],
      notebooksCount: 0,
    };
  }

  const test = await cloudSync.testConnection();
  if (!test.ok) {
    return {
      ok: false,
      message: test.message,
      pulledScopes: [],
      notebooksCount: 0,
    };
  }

  const localDocs = await listNotebooks();
  await Promise.all([
    directoryStore.pushNow(),
    lifeStore.pushNow(),
    ...localDocs.map((d) => cloudSync.pushNotebook(d)),
  ]);

  const pulled = await pullAllEcosystemFromCloud(false);
  cloudSync.startEcosystemRealtime();
  return {
    ...pulled,
    message: `Todo guardado y sincronizado en el espacio «${cloudSync.getConfig().spaceCode}».`,
  };
}
