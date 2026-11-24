import { DRAWING_LESSONS } from '../data/DrawingBank.ts';
import { FLASHCARDS_BANK } from '../data/FocusLabBank.ts';
import { SINGING_SONGS } from '../data/SingingBank.ts';
import type { DifficultyLevel, HabitKey, LifeProfile, PracticeModuleId } from '../types.ts';
import type { UmbralSnapshot } from './UmbralBridge.ts';

export interface HomeActionCard {
  id: string;
  moduleId: PracticeModuleId;
  title: string;
  subtitle: string;
  badge: string;
  cta: string;
  priority: 'high' | 'normal';
  durationLabel?: string;
}

export interface HomeCockpitData {
  resume: {
    moduleId: PracticeModuleId;
    title: string;
    detail: string;
    timeLabel: string;
    difficulty: DifficultyLevel;
  } | null;
  pending: HomeActionCard[];
  recommended: HomeActionCard[];
  recent: {
    moduleId: PracticeModuleId;
    label: string;
    detail: string;
    timeLabel: string;
  }[];
}

const MODULE_TITLES: Record<PracticeModuleId, string> = {
  studio: 'Cuaderno y PDF',
  reader: 'Biblioteca y Lector',
  calligraphy: 'Taller de Caligrafía',
  drawing: 'Taller de Dibujo',
  typing: 'Mecanografía',
  language: 'Ortografía y Léxico',
  mindset: 'Frases y Criterio',
  focuslab: 'Oratoria y Enfoque',
  singing: 'Estudio de Canto',
  calm: 'Centro de Calma',
};

const MODULE_TO_HABIT: Partial<Record<PracticeModuleId, HabitKey>> = {
  reader: 'read',
  studio: 'studio',
  calligraphy: 'calligraphy',
  drawing: 'drawing',
  typing: 'typing',
  language: 'language',
  mindset: 'mindset',
  focuslab: 'focuslab',
  singing: 'singing',
  calm: 'calm',
};

export function formatRelativeTimeEs(ts: number, now = Date.now()): string {
  if (!ts || ts <= 0) return 'Sin fecha';
  const diffMin = Math.max(0, Math.floor((now - ts) / 60000));
  if (diffMin < 1) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ayer';
  return `Hace ${diffD} días`;
}

function diffEs(d: DifficultyLevel): string {
  return d === 'basico' ? 'Básico' : d === 'intermedio' ? 'Intermedio' : 'Avanzado';
}

function enrichResumeTitle(profile: LifeProfile, mod: PracticeModuleId, fallbackLabel: string): string {
  if (mod === 'drawing') {
    const mode = profile.progress.drawing.modeExtra;
    if (mode === 'lessons') {
      const lesson = DRAWING_LESSONS.find((l) => l.id === profile.modulePrefs.drawing.lessonId);
      if (lesson) return `Taller de Dibujo · ${lesson.title}`;
    }
  }
  if (mod === 'singing' && profile.progress.singing.activeTab === 'karaoke') {
    const song = SINGING_SONGS.find((s) => s.id === profile.progress.singing.selectedSongId);
    if (song) return `Estudio de Canto · ${song.title}`;
  }
  if (mod === 'reader' && profile.modulePrefs.reader.lastArticleTitle) {
    return `Lectura · ${profile.modulePrefs.reader.lastArticleTitle}`;
  }
  return fallbackLabel || MODULE_TITLES[mod];
}

export function buildHomeCockpit(
  profile: LifeProfile,
  masteryByModule: Record<PracticeModuleId, number>,
  umbralSnap?: UmbralSnapshot | null,
  now = Date.now()
): HomeCockpitData {
  const pr = profile.progress;
  const act = pr.activity;

  // 1. Donde lo dejaste (resume)
  let resume: HomeCockpitData['resume'] = null;
  if (act.lastModule) {
    const recentFirst = act.recent.find((r) => r.moduleId === act.lastModule);
    resume = {
      moduleId: act.lastModule,
      title: enrichResumeTitle(profile, act.lastModule, recentFirst?.label ?? MODULE_TITLES[act.lastModule]),
      detail: recentFirst?.detail || `Dificultad ${diffEs(pr.difficulty[act.lastModule] ?? 'intermedio')}`,
      timeLabel: formatRelativeTimeEs(act.lastVisitedAt || recentFirst?.at || profile.updatedAt, now),
      difficulty: pr.difficulty[act.lastModule] ?? 'intermedio',
    };
  } else if (profile.modulePrefs.reader.lastArticleTitle) {
    resume = {
      moduleId: 'reader',
      title: `Lectura · ${profile.modulePrefs.reader.lastArticleTitle}`,
      detail: `Avance guardado: ${pr.reader.scrollByTitle[profile.modulePrefs.reader.lastArticleTitle] ?? 0}%`,
      timeLabel: formatRelativeTimeEs(profile.updatedAt, now),
      difficulty: pr.difficulty.reader,
    };
  }

  // 2. Pendientes y borradores a medias
  const pending: HomeActionCard[] = [];

  // Lectura a medias
  const halfRead = Object.entries(pr.reader.scrollByTitle).find(([, pct]) => pct > 0 && pct < 100);
  if (halfRead) {
    pending.push({
      id: 'pend-reader',
      moduleId: 'reader',
      title: `Retomar lectura: ${halfRead[0].slice(0, 42)}`,
      subtitle: `Te quedaste al ${halfRead[1]}%. Sigue por bloques o guarda tu síntesis.`,
      badge: `${halfRead[1]}% leído`,
      cta: 'Seguir leyendo',
      priority: 'high',
      durationLabel: '5 min',
    });
  }

  // Cola de fallos de Ortografía
  if (pr.language.missedOrthoIds.length > 0) {
    const n = pr.language.missedOrthoIds.length;
    pending.push({
      id: 'pend-ortho',
      moduleId: 'language',
      title: `Repasar ${n} ${n === 1 ? 'regla fallada' : 'reglas falladas'} en Ortografía`,
      subtitle: 'Usa el modo Repaso de fallos para convertir errores en aciertos.',
      badge: `${n} ${n === 1 ? 'pendiente' : 'pendientes'}`,
      cta: 'Repasar fallos',
      priority: 'high',
      durationLabel: '3 min',
    });
  }

  // Borradores de Dibujo sin dominar
  const drawDraftKeys = Object.keys(pr.drawing.savedDrafts);
  if (drawDraftKeys.length > 0) {
    const firstKey = drawDraftKeys[0];
    const lessonId = firstKey.startsWith('lesson:') ? firstKey.slice(7) : '';
    const lesson = lessonId ? DRAWING_LESSONS.find((l) => l.id === lessonId) : null;
    const score = lessonId ? pr.drawing.mastery[lessonId] ?? 0 : 0;
    if (!lessonId || score < 70) {
      pending.push({
        id: 'pend-drawing',
        moduleId: 'drawing',
        title: lesson ? `Terminar lámina: ${lesson.title}` : 'Borrador de dibujo guardado',
        subtitle:
          score > 0
            ? `Tienes trazos guardados (mejor cobertura ${score}%). Afina y llega a 70%+.`
            : 'Tienes trazos en curso guardados automáticamente en el lienzo.',
        badge: 'Borrador activo',
        cta: 'Abrir lienzo',
        priority: 'high',
        durationLabel: '6 min',
      });
    }
  }

  // Borradores de Caligrafía
  const calDraftKeys = Object.keys(pr.calligraphy.savedStrokes);
  if (calDraftKeys.length > 0) {
    const firstKey = calDraftKeys[0];
    const score = pr.calligraphy.mastery[firstKey] ?? 0;
    if (score < 70) {
      pending.push({
        id: 'pend-calligraphy',
        moduleId: 'calligraphy',
        title: `Terminar muestra de caligrafía (${firstKey.replace(':', ' #')})`,
        subtitle: 'Tu hoja en progreso sigue guardada lista para evaluar.',
        badge: 'Hoja en curso',
        cta: 'Continuar trazo',
        priority: 'normal',
        durationLabel: '4 min',
      });
    }
  }

  // Tarjetas vencidas en Evocación Activa
  const allCards = [...FLASHCARDS_BANK, ...profile.customFlashcards];
  const dueCards = allCards.filter((c) => {
    const st = profile.flashcardProgress[c.id];
    return st && st.nextReviewAt > 0 && st.nextReviewAt <= now;
  }).length;
  if (dueCards > 0) {
    pending.push({
      id: 'pend-recall',
      moduleId: 'focuslab',
      title: `${dueCards} ${dueCards === 1 ? 'tarjeta vencida' : 'tarjetas vencidas'} en Evocación Activa`,
      subtitle: 'Repásalas hoy para mantener tu curva de memoria espaciada.',
      badge: 'Repaso hoy',
      cta: 'Repasar tarjetas',
      priority: 'high',
      durationLabel: '4 min',
    });
  }

  // Teclas débiles en Mecanografía
  const weakKeys = Object.entries(pr.typing.keyErrors)
    .filter(([, cnt]) => cnt >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => (k === ' ' ? 'Espacio' : k));
  if (weakKeys.length > 0) {
    pending.push({
      id: 'pend-typing',
      moduleId: 'typing',
      title: `Reforzar teclas débiles: ${weakKeys.join(', ')}`,
      subtitle: 'El modo Adaptativo genera ejercicios exactos con tus teclas más falladas.',
      badge: 'Adaptativo',
      cta: 'Entrenar teclas',
      priority: 'normal',
      durationLabel: '3 min',
    });
  }

  // Calma 5-4-3-2-1 a medias
  const groundCount = pr.calm.groundDone.filter(Boolean).length;
  if (groundCount > 0 && groundCount < 15) {
    pending.push({
      id: 'pend-calm',
      moduleId: 'calm',
      title: `Aterrizaje 5-4-3-2-1 en curso (${groundCount}/15)`,
      subtitle: 'Dejaste tu sesión sensorial a medias; puedes completarla en 2 minutos.',
      badge: `${groundCount}/15`,
      cta: 'Continuar calma',
      priority: 'normal',
      durationLabel: '2 min',
    });
  }

  // 3. Recomendado ahora (motor inteligente)
  const recommended: HomeActionCard[] = [];
  const usedMods = new Set<PracticeModuleId>();
  const addRec = (card: HomeActionCard) => {
    if (recommended.length >= 4 || usedMods.has(card.moduleId)) return;
    usedMods.add(card.moduleId);
    recommended.push(card);
  };

  // 3a. Contexto UNUmbral (entrega crítica o hueco libre)
  if (umbralSnap && umbralSnap.source !== 'none') {
    if (umbralSnap.criticalTasks.length > 0) {
      const topTask = umbralSnap.criticalTasks[0];
      addRec({
        id: 'rec-umbral-task',
        moduleId: 'studio',
        title: `Prepara tu entrega: ${(topTask.titulo || 'Tarea crítica').slice(0, 38)}`,
        subtitle: 'Aplica la plantilla Cornell o Plan de Bloque en Cuaderno para dividirla en 3 pasos.',
        badge: 'Prioridad UNU',
        cta: 'Abrir Cuaderno',
        priority: 'high',
        durationLabel: '15 min',
      });
    } else if (umbralSnap.freeGaps.length > 0) {
      const gap = umbralSnap.freeGaps[0];
      addRec({
        id: 'rec-umbral-gap',
        moduleId: 'focuslab',
        title: `Aprovecha tu hueco libre (${gap.duracionMin} min)`,
        subtitle: `De ${gap.inicioLabel} a ${gap.finLabel}: ideal para Evocación Activa o Schulte.`,
        badge: 'Hueco libre',
        cta: 'Entrenar foco',
        priority: 'high',
        durationLabel: `${Math.min(15, gap.duracionMin)} min`,
      });
    }
  }

  // 3b. Sugerencia de subir dificultad si ya domina un módulo en Básico/Intermedio
  const levelUpCandidate = (Object.keys(masteryByModule) as PracticeModuleId[]).find(
    (m) => masteryByModule[m] >= 75 && pr.difficulty[m] !== 'avanzado'
  );
  if (levelUpCandidate) {
    const curD = pr.difficulty[levelUpCandidate];
    const nextD = curD === 'basico' ? 'Intermedio' : 'Avanzado';
    addRec({
      id: `rec-lvlup-${levelUpCandidate}`,
      moduleId: levelUpCandidate,
      title: `Sube a ${nextD} en ${MODULE_TITLES[levelUpCandidate]}`,
      subtitle: `Ya tienes ${masteryByModule[levelUpCandidate]}% de dominio en ${diffEs(curD)}. Es momento de subir el reto.`,
      badge: 'Subir nivel',
      cta: 'Subir dificultad',
      priority: 'high',
      durationLabel: '5 min',
    });
  }

  // 3c. Recomendación por momento del día (si aún no está hecho hoy)
  const hour = new Date(now).getHours();
  const timeCandidates: { mod: PracticeModuleId; title: string; subtitle: string; badge: string; dur: string }[] =
    hour < 12
      ? [
          {
            mod: 'language',
            title: 'Activa la mente con 5 retos de Ortografía',
            subtitle: 'Arranca la mañana afinando precisión escrita y sumando racha diaria.',
            badge: 'Mañana',
            dur: '4 min',
          },
          {
            mod: 'focuslab',
            title: 'Calienta tu foco con Schulte o Evocación',
            subtitle: 'Una ronda rápida de atención periférica prepara tus bloques de estudio.',
            badge: 'Mañana',
            dur: '5 min',
          },
        ]
      : hour < 19
        ? [
            {
              mod: 'drawing',
              title: 'Avanza 1 lámina guiada o reto de Dibujo',
              subtitle: 'Usa la guía paso a paso y guarda tu cobertura para subir dominio.',
              badge: 'Tarde',
              dur: '8 min',
            },
            {
              mod: 'singing',
              title: 'Calentamiento vocal de 5 min o Entrenamiento de Oído',
              subtitle: 'Prueba los nuevos modos de Escalas o Dictado melódico.',
              badge: 'Tarde',
              dur: '6 min',
            },
          ]
        : [
            {
              mod: 'calm',
              title: 'Cierra el día con respiración 3-6 y registro emocional',
              subtitle: 'Baja pulsaciones y registra cómo cambia tu tensión antes y después.',
              badge: 'Noche',
              dur: '4 min',
            },
            {
              mod: 'reader',
              title: 'Lectura nocturna guiada por bloques',
              subtitle: 'Lee 2 bloques de un clásico y guarda tu nota de comprensión.',
              badge: 'Noche',
              dur: '7 min',
            },
          ];

  for (const tc of timeCandidates) {
    const hk = MODULE_TO_HABIT[tc.mod];
    if (!hk || !profile.todayHabits[hk]) {
      addRec({
        id: `rec-time-${tc.mod}`,
        moduleId: tc.mod,
        title: tc.title,
        subtitle: tc.subtitle,
        badge: tc.badge,
        cta: 'Empezar ahora',
        priority: 'normal',
        durationLabel: tc.dur,
      });
    }
  }

  // 3d. Rellenar con los módulos de menor dominio que no se hayan hecho hoy
  const sortedLowest = (Object.keys(masteryByModule) as PracticeModuleId[])
    .filter((m) => {
      const hk = MODULE_TO_HABIT[m];
      return !hk || !profile.todayHabits[hk];
    })
    .sort((a, b) => masteryByModule[a] - masteryByModule[b]);

  for (const mod of sortedLowest) {
    if (recommended.length >= 3) break;
    addRec({
      id: `rec-low-${mod}`,
      moduleId: mod,
      title: `Impulsa ${MODULE_TITLES[mod]} (${masteryByModule[mod]}%)`,
      subtitle: `Es uno de tus módulos con mayor margen de mejora en dificultad ${diffEs(pr.difficulty[mod])}.`,
      badge: 'Por mejorar',
      cta: 'Practicar hoy',
      priority: 'normal',
      durationLabel: '5 min',
    });
  }

  // 4. Historial reciente
  const recent = act.recent.slice(0, 4).map((r) => ({
    moduleId: r.moduleId,
    label: enrichResumeTitle(profile, r.moduleId, r.label),
    detail: r.detail,
    timeLabel: formatRelativeTimeEs(r.at, now),
  }));

  return { resume, pending: pending.slice(0, 4), recommended: recommended.slice(0, 3), recent };
}
