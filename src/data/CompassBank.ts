export interface WheelAreaDef {
  id: string;
  label: string;
  shortLabel: string;
  hint: string;
  suggestedModule: string;
}

export const WHEEL_OF_LIFE_AREAS: WheelAreaDef[] = [
  {
    id: 'salud',
    label: 'Salud y Energía',
    shortLabel: 'Salud',
    hint: 'Sueño, postura, hidratación, alimentación y movimiento físico.',
    suggestedModule: 'vitality',
  },
  {
    id: 'carrera',
    label: 'Estudio y Carrera',
    shortLabel: 'Carrera',
    hint: 'Avance académico, habilidades técnicas, portafolio y entrevistas.',
    suggestedModule: 'career',
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    shortLabel: 'Finanzas',
    hint: 'Presupuesto 50/30/20, ahorro consciente y fondo de emergencia.',
    suggestedModule: 'finance',
  },
  {
    id: 'relaciones',
    label: 'Relaciones',
    shortLabel: 'Relaciones',
    hint: 'Familia, amistades, límites sanos y conversaciones de calidad.',
    suggestedModule: 'career',
  },
  {
    id: 'mente',
    label: 'Mente y Enfoque',
    shortLabel: 'Mente',
    hint: 'Claridad mental, atención sostenida, lectura y regulación emocional.',
    suggestedModule: 'focuslab',
  },
  {
    id: 'creatividad',
    label: 'Creatividad',
    shortLabel: 'Creatividad',
    hint: 'Dibujo, canto, escritura, música, origami o proyectos personales.',
    suggestedModule: 'drawing',
  },
  {
    id: 'descanso',
    label: 'Descanso y Ocio',
    shortLabel: 'Descanso',
    hint: 'Pausas reales sin culpa, desconexión de pantallas y disfrute.',
    suggestedModule: 'calm',
  },
  {
    id: 'proposito',
    label: 'Propósito',
    shortLabel: 'Propósito',
    hint: 'Alineación entre tus valores, metas trimestrales y decisiones diarias.',
    suggestedModule: 'mindset',
  },
];

export const WEEKLY_REVIEW_CHECKLIST: { id: string; label: string; detail: string }[] = [
  {
    id: 'wr-wins',
    label: 'Revisé mis 3 mejores avances de la semana',
    detail: 'Reconocer progreso concreto evita la sensación de no haber avanzado nada.',
  },
  {
    id: 'wr-friction',
    label: 'Identifiqué la mayor fricción o ladrón de tiempo',
    detail: 'Detecta qué interrupción o hábito te drenó más foco esta semana.',
  },
  {
    id: 'wr-okrs',
    label: 'Actualicé el avance de mis metas a 90 días (OKRs)',
    detail: 'Marca hitos logrados o ajusta el siguiente paso semanal.',
  },
  {
    id: 'wr-calendar',
    label: 'Bloqueé mis 3 prioridades clave de la próxima semana',
    detail: 'Si algo es importante, necesita hora y espacio en tu agenda.',
  },
  {
    id: 'wr-cleanup',
    label: 'Ordené escritorio físico, notas y pendientes sueltos',
    detail: 'Empezar el lunes con entorno limpio reduce carga cognitiva.',
  },
  {
    id: 'wr-energy',
    label: 'Verifiqué horas de sueño, postura y pausas de descanso',
    detail: 'La disciplina sostenible empieza por cuidar tu energía base.',
  },
];

export const DAILY_STOIC_PROMPTS: { quote: string; author: string }[] = [
  { quote: 'No es lo que te ocurre, sino cómo respondes a lo que ocurre lo que marca el rumbo.', author: 'Epicteto' },
  { quote: 'La calidad de tu vida depende de la calidad de tus pensamientos cotidianos.', author: 'Marco Aurelio' },
  { quote: 'Sufre más quien teme sufrir que quien se enfoca en el siguiente paso concreto.', author: 'Séneca' },
  { quote: 'Quien tiene un porqué claro puede sostener casi cualquier cómo.', author: 'Viktor Frankl' },
  { quote: 'No aspiramos a la perfección de un día, sino a la dirección constante de cada semana.', author: 'Criterio Atelier' },
  { quote: 'La claridad reduce la ansiedad: divide lo enorme en un primer bloque de 15 minutos.', author: 'Criterio Atelier' },
  { quote: 'Protege tu atención como tu recurso más valioso: donde va tu enfoque, crece tu vida.', author: 'Criterio Atelier' },
];

export interface OkrTemplate {
  id: string;
  title: string;
  area: string;
  milestones: string[];
}

export const OKR_QUICK_TEMPLATES: OkrTemplate[] = [
  {
    id: 'tpl-carrera',
    title: 'Consolidar portafolio y preparación de entrevistas',
    area: 'Estudio y Carrera',
    milestones: [
      'Documentar 2 proyectos clave con métricas reales en el Brag Document',
      'Completar 10 simulacros STAR cronometrados',
      'Actualizar CV con verbos de impacto y logros medibles',
      'Enviar postulaciones o pedir 2 revisiones a mentores',
    ],
  },
  {
    id: 'tpl-postura',
    title: 'Transformar postura de escritorio y energía diaria',
    area: 'Salud y Energía',
    milestones: [
      'Completar el Plan Correctivo de 21 días en Postura Pro',
      'Ajustar pantalla y silla con puntaje ergonómico >= 85/100',
      'Mantener promedio de 7h+ de sueño durante 4 semanas',
      'Registrar 6+ vasos de agua diarios por 30 días',
    ],
  },
  {
    id: 'tpl-finanzas',
    title: 'Construir fondo de emergencia de 3 meses',
    area: 'Finanzas',
    milestones: [
      'Registrar ingresos y gastos 50/30/20 durante 90 días',
      'Auditar y cancelar suscripciones o gastos hormiga innecesarios',
      'Separar automáticamente el 20% apenas llega el ingreso',
      'Alcanzar el 100% de la meta en cuenta líquida separada',
    ],
  },
  {
    id: 'tpl-lectura',
    title: 'Leer 4 libros completos con síntesis aplicables',
    area: 'Mente y Enfoque',
    milestones: [
      'Completar Libro 1 con cierre de comprensión activa guardado',
      'Completar Libro 2 y extraer 5 tarjetas SM-2 en Evocación',
      'Completar Libro 3 practicando lectura guiada o RSVP',
      'Completar Libro 4 y compartir un resumen claro por escrito',
    ],
  },
];

export const URGE_SURFING_PHASES: { startSec: number; endSec: number; title: string; cue: string }[] = [
  {
    startSec: 90,
    endSec: 65,
    title: 'Fase 1: Detén el piloto automático',
    cue: 'No luches contra el impulso ni cedas todavía. Solo obsérvalo como una ola que sube. Inhala 4s, exhala 6s.',
  },
  {
    startSec: 64,
    endSec: 35,
    title: 'Fase 2: Nombra la sensación física',
    cue: '¿Dónde sientes la urgencia (pecho, manos, aburrimiento, cansancio)? Recuerda: una emoción pico dura menos de 90 segundos si no la alimentas.',
  },
  {
    startSec: 34,
    endSec: 1,
    title: 'Fase 3: Elige tu sustitución saludable',
    cue: 'La ola ya está bajando. Toma un vaso de agua, aléjate 2 minutos de la pantalla o haz la acción alternativa que definiste.',
  },
];

export function findLowestWheelArea(scores: Record<string, number>): { area: WheelAreaDef; score: number } {
  let lowest = WHEEL_OF_LIFE_AREAS[0];
  let lowestScore = scores[lowest.id] ?? 5;
  for (const area of WHEEL_OF_LIFE_AREAS) {
    const val = scores[area.id] ?? 5;
    if (val < lowestScore) {
      lowest = area;
      lowestScore = val;
    }
  }
  return { area: lowest, score: lowestScore };
}
