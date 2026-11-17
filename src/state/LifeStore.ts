import { cloudSync } from '../services/CloudSync';
import {
  BookBookmark,
  DeviceProfile,
  HabitKey,
  LifeProfile,
  ModulePreferences,
  PhraseItem,
  ReframeEntry,
  SavedWord,
  ThemeMode,
  VaultItem,
  VaultStatus,
} from '../types';

const STORAGE_KEY = 'atelier_diario_profile_v1';

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyHabits(): Record<HabitKey, boolean> {
  return {
    read: false,
    calligraphy: false,
    studio: false,
    typing: false,
    language: false,
    mindset: false,
    singing: false,
    calm: false,
  };
}

export function defaultModulePrefs(): ModulePreferences {
  return {
    reader: {
      sourceTab: 'wikisource',
      lastArticleTitle: '',
    },
    studio: {
      activeId: '',
      currentPage: 1,
      tool: 'pen',
      color: '#10211B',
      strokeWidth: 4,
    },
    calligraphy: {
      mode: 'trazos',
      sampleIdx: 0,
      showGuidelines: true,
      showSlant: true,
      inkColor: '#147D58',
      nibSize: 4,
    },
    typing: {
      pcDrill: 'accents',
      mobileDrill: 'agile',
      sampleIdx: 0,
      showFingerGuide: true,
    },
    language: {
      tab: 'ortho',
      orthoIdx: 0,
      vocabIdx: 0,
    },
    mindset: {
      category: 'all',
      searchQuery: '',
    },
    vault: {
      category: 'useful',
      statusFilter: 'active',
      searchQuery: '',
    },
    singing: {
      lastDrillId: 'major5',
    },
    calm: {
      patternId: '478',
      soundCue: true,
      groundingIdx: 0,
    },
  };
}

function defaultProfile(): LifeProfile {
  return {
    theme: 'day',
    deviceMode: 'auto',
    readerFontSize: 18,
    dailyStreak: 0,
    lastActiveDay: '',
    todayHabits: emptyHabits(),
    favoritePhraseIds: [],
    customPhrases: [],
    vaultStatuses: {},
    vaultFavorites: [],
    vaultNotes: {},
    customVaultItems: [],
    savedWords: [],
    reframeLog: [],
    bookmarks: [],
    stats: {
      orthographyCorrect: 0,
      orthographyTotal: 0,
      calligraphySheets: 0,
      calmSessions: 0,
      singingBestCents: null,
      bestWpmPc: 0,
      bestWpmMobile: 0,
    },
    modulePrefs: defaultModulePrefs(),
    updatedAt: 0,
  };
}

function normalizeProfile(raw: Partial<LifeProfile> | null | undefined): LifeProfile {
  const base = defaultProfile();
  if (!raw || typeof raw !== 'object') return base;
  const mp = raw.modulePrefs ?? ({} as Partial<ModulePreferences>);
  return {
    ...base,
    ...raw,
    todayHabits: { ...base.todayHabits, ...(raw.todayHabits ?? {}) },
    stats: { ...base.stats, ...(raw.stats ?? {}) },
    favoritePhraseIds: Array.isArray(raw.favoritePhraseIds) ? raw.favoritePhraseIds : [],
    customPhrases: Array.isArray(raw.customPhrases) ? raw.customPhrases : [],
    vaultStatuses:
      raw.vaultStatuses && typeof raw.vaultStatuses === 'object' ? { ...raw.vaultStatuses } : {},
    vaultFavorites: Array.isArray(raw.vaultFavorites) ? raw.vaultFavorites : [],
    vaultNotes: raw.vaultNotes && typeof raw.vaultNotes === 'object' ? { ...raw.vaultNotes } : {},
    customVaultItems: Array.isArray(raw.customVaultItems) ? raw.customVaultItems : [],
    savedWords: Array.isArray(raw.savedWords) ? raw.savedWords : [],
    reframeLog: Array.isArray(raw.reframeLog) ? raw.reframeLog : [],
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
    modulePrefs: {
      reader: { ...base.modulePrefs.reader, ...(mp.reader ?? {}) },
      studio: { ...base.modulePrefs.studio, ...(mp.studio ?? {}) },
      calligraphy: { ...base.modulePrefs.calligraphy, ...(mp.calligraphy ?? {}) },
      typing: { ...base.modulePrefs.typing, ...(mp.typing ?? {}) },
      language: { ...base.modulePrefs.language, ...(mp.language ?? {}) },
      mindset: { ...base.modulePrefs.mindset, ...(mp.mindset ?? {}) },
      vault: { ...base.modulePrefs.vault, ...(mp.vault ?? {}) },
      singing: { ...base.modulePrefs.singing, ...(mp.singing ?? {}) },
      calm: { ...base.modulePrefs.calm, ...(mp.calm ?? {}) },
    },
    updatedAt: Number(raw.updatedAt) || 0,
  };
}

class LifeStore {
  private profile: LifeProfile;
  private listeners = new Set<() => void>();
  private pushTimer = 0;

  constructor() {
    this.profile = this.load();
    this.rolloverDay();
  }

  private load(): LifeProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProfile();
      return normalizeProfile(JSON.parse(raw) as Partial<LifeProfile>);
    } catch {
      return defaultProfile();
    }
  }

  private save(syncCloud = true): void {
    this.profile.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
      localStorage.setItem('umbral-theme', this.profile.theme === 'night' ? 'dark' : 'light');
    } catch {
      // Ignore storage quota issues
    }
    this.listeners.forEach((fn) => fn());
    if (syncCloud && cloudSync.isConfigured()) {
      window.clearTimeout(this.pushTimer);
      this.pushTimer = window.setTimeout(() => {
        void cloudSync.pushScope('atelier_profile', this.profile, this.profile.updatedAt);
      }, 650);
    }
  }

  public async pushNow(): Promise<boolean> {
    if (!cloudSync.isConfigured()) return false;
    return cloudSync.pushScope('atelier_profile', this.profile, this.profile.updatedAt || Date.now());
  }

  public applyRemote(raw: Partial<LifeProfile>, remoteUpdatedAt: number, force = false): boolean {
    const clean = normalizeProfile({ ...raw, updatedAt: remoteUpdatedAt || raw.updatedAt });
    if (!force && clean.updatedAt <= this.profile.updatedAt) return false;
    this.profile = clean;
    this.rolloverDay(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
      localStorage.setItem('umbral-theme', this.profile.theme === 'night' ? 'dark' : 'light');
    } catch {
      // Ignore storage quota issues
    }
    this.listeners.forEach((fn) => fn());
    return true;
  }

  public replaceAll(raw: Partial<LifeProfile>): void {
    this.profile = normalizeProfile(raw);
    this.save(true);
  }

  private rolloverDay(sync = true): void {
    const today = todayStamp();
    if (this.profile.lastActiveDay && this.profile.lastActiveDay !== today) {
      const prev = new Date(this.profile.lastActiveDay);
      const curr = new Date(today);
      const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 1) {
        this.profile.dailyStreak = 0;
      }
      this.profile.todayHabits = emptyHabits();
      this.save(sync);
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public get(): LifeProfile {
    return this.profile;
  }

  public updateModulePrefs<K extends keyof ModulePreferences>(
    moduleKey: K,
    patch: Partial<ModulePreferences[K]>
  ): void {
    this.profile.modulePrefs[moduleKey] = {
      ...this.profile.modulePrefs[moduleKey],
      ...patch,
    };
    this.save();
  }

  public setTheme(theme: ThemeMode): void {
    this.profile.theme = theme;
    this.save();
  }

  public setDeviceMode(deviceMode: DeviceProfile): void {
    this.profile.deviceMode = deviceMode;
    this.save();
  }

  public recordTyping(mode: 'pc' | 'mobile', wpm: number): void {
    const cleanWpm = Math.max(0, Math.round(wpm));
    if (mode === 'pc' && cleanWpm > this.profile.stats.bestWpmPc) {
      this.profile.stats.bestWpmPc = cleanWpm;
    }
    if (mode === 'mobile' && cleanWpm > this.profile.stats.bestWpmMobile) {
      this.profile.stats.bestWpmMobile = cleanWpm;
    }
    this.markHabit('typing');
    this.save();
  }

  public setReaderFontSize(px: number): void {
    this.profile.readerFontSize = Math.max(15, Math.min(26, px));
    this.save();
  }

  public markHabit(key: HabitKey): void {
    const today = todayStamp();
    const hadAnyToday = Object.values(this.profile.todayHabits).some(Boolean);
    this.profile.todayHabits[key] = true;
    if (!hadAnyToday && this.profile.lastActiveDay !== today) {
      this.profile.dailyStreak += 1;
    }
    this.profile.lastActiveDay = today;
    this.save();
  }

  public toggleFavoritePhrase(id: string): boolean {
    const idx = this.profile.favoritePhraseIds.indexOf(id);
    if (idx >= 0) {
      this.profile.favoritePhraseIds.splice(idx, 1);
      this.save();
      return false;
    }
    this.profile.favoritePhraseIds.unshift(id);
    this.markHabit('mindset');
    this.save();
    return true;
  }

  public addCustomPhrase(input: Omit<PhraseItem, 'id' | 'isCustom'>): PhraseItem {
    const item: PhraseItem = {
      ...input,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isCustom: true,
    };
    this.profile.customPhrases.unshift(item);
    this.profile.favoritePhraseIds.unshift(item.id);
    this.markHabit('mindset');
    this.save();
    return item;
  }

  public removeCustomPhrase(id: string): void {
    this.profile.customPhrases = this.profile.customPhrases.filter((p) => p.id !== id);
    this.profile.favoritePhraseIds = this.profile.favoritePhraseIds.filter((fid) => fid !== id);
    this.save();
  }

  public setVaultStatus(id: string, status: VaultStatus): void {
    if (status === 'pending') {
      delete this.profile.vaultStatuses[id];
    } else {
      this.profile.vaultStatuses[id] = status;
    }
    this.save();
  }

  public toggleVaultFavorite(id: string): boolean {
    const idx = this.profile.vaultFavorites.indexOf(id);
    if (idx >= 0) {
      this.profile.vaultFavorites.splice(idx, 1);
      this.save();
      return false;
    }
    this.profile.vaultFavorites.unshift(id);
    this.save();
    return true;
  }

  public setVaultNote(id: string, note: string): void {
    const clean = note.trim();
    if (!clean) {
      delete this.profile.vaultNotes[id];
    } else {
      this.profile.vaultNotes[id] = clean;
    }
    this.save();
  }

  public addCustomVaultItem(input: Omit<VaultItem, 'id' | 'isCustom' | 'createdAt'>): VaultItem {
    const item: VaultItem = {
      ...input,
      id: `vcustom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      isCustom: true,
      createdAt: Date.now(),
    };
    this.profile.customVaultItems.unshift(item);
    this.save();
    return item;
  }

  public importCustomVaultItems(
    inputs: Omit<VaultItem, 'id' | 'isCustom' | 'createdAt'>[],
    existingUrls: Set<string>
  ): number {
    let added = 0;
    const seen = new Set(existingUrls);
    for (const c of this.profile.customVaultItems) {
      if (c.url) seen.add(c.url.trim().split('?')[0]);
    }
    for (const inp of inputs) {
      const cleanUrl = (inp.url || '').trim().split('?')[0];
      if (cleanUrl && seen.has(cleanUrl)) continue;
      if (cleanUrl) seen.add(cleanUrl);
      this.profile.customVaultItems.unshift({
        ...inp,
        url: cleanUrl || inp.url,
        id: `vcustom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        isCustom: true,
        createdAt: Date.now(),
      });
      added++;
    }
    if (added > 0) this.save();
    return added;
  }

  public removeCustomVaultItem(id: string): void {
    this.profile.customVaultItems = this.profile.customVaultItems.filter((v) => v.id !== id);
    this.profile.vaultFavorites = this.profile.vaultFavorites.filter((fid) => fid !== id);
    delete this.profile.vaultStatuses[id];
    delete this.profile.vaultNotes[id];
    this.save();
  }

  public promoteVaultToPhrase(item: VaultItem, category: PhraseItem['category']): PhraseItem {
    const note = this.profile.vaultNotes[item.id] || '';
    const phrase = this.addCustomPhrase({
      category,
      quote: item.title.replace(/…$/, ''),
      author: 'Baúl de Guardados',
      meaning: note || item.summary,
      whenToUse: 'Cuando quieras recordar o aplicar esta idea guardada.',
      dailyAction: 'Aplícalo hoy una vez y marca el recurso como aplicado.',
      sourceUrl: item.url,
    });
    this.profile.vaultStatuses[item.id] = 'applied';
    this.save();
    return phrase;
  }

  public saveWord(word: string, definition: string): void {
    const clean = word.trim().toLowerCase();
    if (!clean) return;
    const exists = this.profile.savedWords.some((w) => w.word.toLowerCase() === clean);
    if (!exists) {
      const item: SavedWord = { word: word.trim(), definition, addedAt: Date.now() };
      this.profile.savedWords.unshift(item);
      this.profile.savedWords = this.profile.savedWords.slice(0, 120);
    }
    this.markHabit('language');
    this.save();
  }

  public removeWord(word: string): void {
    this.profile.savedWords = this.profile.savedWords.filter(
      (w) => w.word.toLowerCase() !== word.toLowerCase()
    );
    this.save();
  }

  public recordOrthography(correct: boolean): void {
    this.profile.stats.orthographyTotal += 1;
    if (correct) this.profile.stats.orthographyCorrect += 1;
    this.markHabit('language');
    this.save();
  }

  public recordCalligraphySheet(): void {
    this.profile.stats.calligraphySheets += 1;
    this.markHabit('calligraphy');
    this.save();
  }

  public recordCalmSession(): void {
    this.profile.stats.calmSessions += 1;
    this.markHabit('calm');
    this.save();
  }

  public recordSingingAccuracy(centsAbs: number): void {
    const prev = this.profile.stats.singingBestCents;
    if (prev === null || centsAbs < prev) {
      this.profile.stats.singingBestCents = Math.round(centsAbs);
    }
    this.markHabit('singing');
    this.save();
  }

  public addReframe(worry: string, control: string, nextStep: string): void {
    const entry: ReframeEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      worry: worry.trim(),
      control: control.trim(),
      nextStep: nextStep.trim(),
      createdAt: Date.now(),
    };
    this.profile.reframeLog.unshift(entry);
    this.profile.reframeLog = this.profile.reframeLog.slice(0, 60);
    this.recordCalmSession();
  }

  public saveBookmark(bookmark: Omit<BookBookmark, 'updatedAt'>): void {
    this.profile.bookmarks = this.profile.bookmarks.filter((b) => b.title !== bookmark.title);
    this.profile.bookmarks.unshift({ ...bookmark, updatedAt: Date.now() });
    this.profile.bookmarks = this.profile.bookmarks.slice(0, 30);
    this.markHabit('read');
    this.save();
  }
}

export const lifeStore = new LifeStore();
