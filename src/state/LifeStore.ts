import {
  BookBookmark,
  DeviceProfile,
  HabitKey,
  LifeProfile,
  ReframeEntry,
  SavedWord,
  ThemeMode,
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

function defaultProfile(): LifeProfile {
  return {
    theme: 'day',
    deviceMode: 'auto',
    readerFontSize: 18,
    dailyStreak: 0,
    lastActiveDay: '',
    todayHabits: emptyHabits(),
    favoritePhraseIds: [],
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
  };
}

class LifeStore {
  private profile: LifeProfile;
  private listeners = new Set<() => void>();

  constructor() {
    this.profile = this.load();
    this.rolloverDay();
  }

  private load(): LifeProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProfile();
      const parsed = JSON.parse(raw) as Partial<LifeProfile>;
      const base = defaultProfile();
      return {
        ...base,
        ...parsed,
        todayHabits: { ...base.todayHabits, ...(parsed.todayHabits ?? {}) },
        stats: { ...base.stats, ...(parsed.stats ?? {}) },
        favoritePhraseIds: Array.isArray(parsed.favoritePhraseIds) ? parsed.favoritePhraseIds : [],
        savedWords: Array.isArray(parsed.savedWords) ? parsed.savedWords : [],
        reframeLog: Array.isArray(parsed.reframeLog) ? parsed.reframeLog : [],
        bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      };
    } catch {
      return defaultProfile();
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch {
      // Ignore storage quota issues
    }
    this.listeners.forEach((fn) => fn());
  }

  private rolloverDay(): void {
    const today = todayStamp();
    if (this.profile.lastActiveDay && this.profile.lastActiveDay !== today) {
      const prev = new Date(this.profile.lastActiveDay);
      const curr = new Date(today);
      const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 1) {
        this.profile.dailyStreak = 0;
      }
      this.profile.todayHabits = emptyHabits();
      this.save();
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public get(): LifeProfile {
    return this.profile;
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

  public saveWord(word: string, definition: string): void {
    const clean = word.trim().toLowerCase();
    if (!clean) return;
    const exists = this.profile.savedWords.some((w) => w.word.toLowerCase() === clean);
    if (!exists) {
      const item: SavedWord = { word: word.trim(), definition, addedAt: Date.now() };
      this.profile.savedWords.unshift(item);
      this.profile.savedWords = this.profile.savedWords.slice(0, 80);
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
    this.profile.reframeLog = this.profile.reframeLog.slice(0, 40);
    this.recordCalmSession();
  }

  public saveBookmark(bookmark: Omit<BookBookmark, 'updatedAt'>): void {
    this.profile.bookmarks = this.profile.bookmarks.filter((b) => b.title !== bookmark.title);
    this.profile.bookmarks.unshift({ ...bookmark, updatedAt: Date.now() });
    this.profile.bookmarks = this.profile.bookmarks.slice(0, 20);
    this.markHabit('read');
    this.save();
  }
}

export const lifeStore = new LifeStore();
