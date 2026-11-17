import { cloudSync } from '../services/CloudSync';
import { CustomDirectoryLink, DirectoryCategory, DirectoryConfig } from '../types';

const STORAGE_KEY = 'atelier_directory_config_v1';

export const DEFAULT_DIRECTORY_ORDER = [
  'mod-reader',
  'mod-studio',
  'mod-calligraphy',
  'mod-typing',
  'mod-language',
  'mod-mindset',
  'mod-singing',
  'mod-calm',
  'app-unumbral',
  'app-arena',
];

function computeInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'JM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function defaultDirectoryConfig(): DirectoryConfig {
  return {
    userName: 'Joseph Marquina',
    userSubtitle: 'Sede Personal · Ecosistema',
    userInitials: 'JM',
    ecosystemTitle: 'Ecosistema Atelier',
    ecosystemSubtitle: 'Directorio Unificado · Estudio, Universidad y Entrenamiento',
    activeCategory: 'all',
    pinnedIds: ['app-unumbral', 'mod-studio', 'app-arena'],
    hiddenIds: [],
    order: [...DEFAULT_DIRECTORY_ORDER],
    customLinks: [],
    companionUrls: {
      unumbral: '',
      arena: '',
    },
    updatedAt: 0,
  };
}

function normalizeConfig(raw: Partial<DirectoryConfig> | null | undefined): DirectoryConfig {
  const base = defaultDirectoryConfig();
  if (!raw || typeof raw !== 'object') return base;
  const userName = (raw.userName ?? base.userName).trim() || base.userName;
  const incomingOrder = Array.isArray(raw.order) ? raw.order : [];
  const mergedOrder = Array.from(new Set([...incomingOrder, ...DEFAULT_DIRECTORY_ORDER]));
  return {
    ...base,
    ...raw,
    userName,
    userInitials: (raw.userInitials ?? computeInitials(userName)).trim().slice(0, 3).toUpperCase() || 'JM',
    pinnedIds: Array.isArray(raw.pinnedIds) ? raw.pinnedIds : base.pinnedIds,
    hiddenIds: Array.isArray(raw.hiddenIds) ? raw.hiddenIds : [],
    order: mergedOrder,
    customLinks: Array.isArray(raw.customLinks) ? raw.customLinks : [],
    companionUrls: {
      unumbral: raw.companionUrls?.unumbral ?? '',
      arena: raw.companionUrls?.arena ?? '',
    },
    updatedAt: Number(raw.updatedAt) || 0,
  };
}

class DirectoryStore {
  private config: DirectoryConfig;
  private listeners = new Set<() => void>();
  private pushTimer = 0;

  constructor() {
    this.config = this.load();
  }

  private load(): DirectoryConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultDirectoryConfig();
      return normalizeConfig(JSON.parse(raw) as Partial<DirectoryConfig>);
    } catch {
      return defaultDirectoryConfig();
    }
  }

  private save(syncCloud = true): void {
    this.config.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Ignore storage error
    }
    this.listeners.forEach((fn) => fn());
    if (syncCloud && cloudSync.isConfigured()) {
      window.clearTimeout(this.pushTimer);
      this.pushTimer = window.setTimeout(() => {
        void cloudSync.pushScope('directory_config', this.config, this.config.updatedAt);
      }, 500);
    }
  }

  public async pushNow(): Promise<boolean> {
    if (!cloudSync.isConfigured()) return false;
    return cloudSync.pushScope('directory_config', this.config, this.config.updatedAt || Date.now());
  }

  public applyRemote(raw: Partial<DirectoryConfig>, remoteUpdatedAt: number, force = false): boolean {
    const clean = normalizeConfig({ ...raw, updatedAt: remoteUpdatedAt || raw.updatedAt });
    if (!force && clean.updatedAt <= this.config.updatedAt) return false;
    this.config = clean;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Ignore storage error
    }
    this.listeners.forEach((fn) => fn());
    return true;
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public get(): DirectoryConfig {
    return this.config;
  }

  public updateIdentity(patch: {
    userName?: string;
    userSubtitle?: string;
    userInitials?: string;
    ecosystemTitle?: string;
    ecosystemSubtitle?: string;
    companionUrls?: { unumbral?: string; arena?: string };
  }): void {
    if (patch.userName !== undefined) {
      this.config.userName = patch.userName.trim() || 'Joseph Marquina';
      if (patch.userInitials === undefined) {
        this.config.userInitials = computeInitials(this.config.userName);
      }
    }
    if (patch.userSubtitle !== undefined) {
      this.config.userSubtitle = patch.userSubtitle.trim() || 'Sede Personal · Ecosistema';
    }
    if (patch.userInitials !== undefined) {
      this.config.userInitials =
        patch.userInitials.trim().slice(0, 3).toUpperCase() || computeInitials(this.config.userName);
    }
    if (patch.ecosystemTitle !== undefined) {
      this.config.ecosystemTitle = patch.ecosystemTitle.trim() || 'Ecosistema Atelier';
    }
    if (patch.ecosystemSubtitle !== undefined) {
      this.config.ecosystemSubtitle =
        patch.ecosystemSubtitle.trim() || 'Directorio Unificado · Estudio, Universidad y Entrenamiento';
    }
    if (patch.companionUrls) {
      this.config.companionUrls = {
        unumbral: patch.companionUrls.unumbral?.trim() ?? this.config.companionUrls.unumbral,
        arena: patch.companionUrls.arena?.trim() ?? this.config.companionUrls.arena,
      };
    }
    this.save();
  }

  public setCategory(cat: 'all' | DirectoryCategory): void {
    this.config.activeCategory = cat;
    this.save();
  }

  public togglePin(id: string): void {
    const idx = this.config.pinnedIds.indexOf(id);
    if (idx >= 0) this.config.pinnedIds.splice(idx, 1);
    else this.config.pinnedIds.unshift(id);
    this.save();
  }

  public toggleHide(id: string): void {
    const idx = this.config.hiddenIds.indexOf(id);
    if (idx >= 0) this.config.hiddenIds.splice(idx, 1);
    else this.config.hiddenIds.push(id);
    this.save();
  }

  public moveItem(id: string, dir: -1 | 1): void {
    const allIds = Array.from(
      new Set([...this.config.order, ...this.config.customLinks.map((c) => c.id)])
    );
    const idx = allIds.indexOf(id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= allIds.length) return;
    [allIds[idx], allIds[target]] = [allIds[target], allIds[idx]];
    this.config.order = allIds;
    this.save();
  }

  public addCustomLink(link: Omit<CustomDirectoryLink, 'id'>): CustomDirectoryLink {
    const item: CustomDirectoryLink = {
      ...link,
      id: `custom-${Date.now().toString(36)}`,
    };
    this.config.customLinks.push(item);
    this.config.order.push(item.id);
    this.save();
    return item;
  }

  public removeCustomLink(id: string): void {
    this.config.customLinks = this.config.customLinks.filter((l) => l.id !== id);
    this.config.order = this.config.order.filter((x) => x !== id);
    this.config.pinnedIds = this.config.pinnedIds.filter((x) => x !== id);
    this.config.hiddenIds = this.config.hiddenIds.filter((x) => x !== id);
    this.save();
  }

  public resetLayout(): void {
    this.config.hiddenIds = [];
    this.config.order = [...DEFAULT_DIRECTORY_ORDER, ...this.config.customLinks.map((c) => c.id)];
    this.save();
  }
}

export const directoryStore = new DirectoryStore();
