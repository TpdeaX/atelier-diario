import type { BodyZoneId, DifficultyLevel } from '../types.ts';

export interface BodyZoneMeta {
  id: BodyZoneId;
  label: string;
  shortLabel: string;
  symptom: string;
  quickTip: string;
  svgX: number;
  svgY: number;
  side: 'front' | 'back';
}

export const BODY_ZONES: BodyZoneMeta[] = [
  {
    id: 'ojos',
    label: 'Ojos y Vista',
    shortLabel: 'Ojos',
    symptom: 'Sequedad, ardor o visión cansada tras pantallas.',
    quickTip: 'Regla 20-20-20: cada 20 min mira a 6 metros por 20s y parpadea lento.',
    svgX: 90,
    svgY: 36,
    side: 'front',
  },
  {
    id: 'cuello',
    label: 'Cuello y Cervical',
    shortLabel: 'Cuello',
    symptom: 'Rigidez en nuca o cabeza adelantada (Text Neck).',
    quickTip: 'Retracción suave de mentón alineando orejas directamente sobre hombros.',
    svgX: 90,
    svgY: 62,
    side: 'front',
  },
  {
    id: 'hombros',
    label: 'Hombros y Trapecio',
    shortLabel: 'Hombros',
    symptom: 'Hombros elevados hacia las orejas o encorvados hacia adelante.',
    quickTip: 'Suelta hombros abajo y atrás; codos cerca del cuerpo a 90 grados.',
    svgX: 54,
    svgY: 86,
    side: 'front',
  },
  {
    id: 'espalda_alta',
    label: 'Espalda Alta (Torácica)',
    shortLabel: 'Espalda Alta',
    symptom: 'Encorvamiento dorsal y pecho cerrado por horas frente a laptop.',
    quickTip: 'Abre el pecho juntando omóplatos suavemente 10 segundos cada hora.',
    svgX: 250,
    svgY: 102,
    side: 'back',
  },
  {
    id: 'lumbar',
    label: 'Zona Lumbar',
    shortLabel: 'Lumbar',
    symptom: 'Presión en espalda baja al sentarse hundido en la silla.',
    quickTip: 'Apoya glúteos al fondo del respaldo y ponte de pie 2 min cada 45 min.',
    svgX: 250,
    svgY: 152,
    side: 'back',
  },
  {
    id: 'munecas',
    label: 'Muñecas y Antebrazos',
    shortLabel: 'Muñecas',
    symptom: 'Tensión al teclear, usar mouse o dibujar largo rato.',
    quickTip: 'Mantén muñecas neutras sin doblarlas hacia arriba y estira flexores.',
    svgX: 34,
    svgY: 156,
    side: 'front',
  },
  {
    id: 'caderas',
    label: 'Caderas y Flexores',
    shortLabel: 'Caderas',
    symptom: 'Acortamiento de psoas y rigidez al levantarte tras horas sentado.',
    quickTip: 'Alterna zancada suave atrás y camina 20 pasos para reactivar circulación.',
    svgX: 90,
    svgY: 176,
    side: 'front',
  },
];

export type PosturePoseAnim =
  | 'eye_focus'
  | 'chin_tuck'
  | 'neck_tilt'
  | 'shoulder_roll'
  | 'wrist_stretch'
  | 'chest_open'
  | 'thoracic_twist'
  | 'standing_reach'
  | 'cat_cow'
  | 'hip_opener';

export interface PostureProStep {
  title: string;
  instruction: string;
  breathCue: string;
  durationSec: number;
  anim: PosturePoseAnim;
}

export interface PostureProRoutine {
  id: string;
  title: string;
  zones: BodyZoneId[];
  difficulty: DifficultyLevel;
  summary: string;
  steps: PostureProStep[];
}

export const POSTURE_PRO_ROUTINES: PostureProRoutine[] = [
  {
    id: 'vr-202020',
    title: 'Descanso visual 20-20-20',
    zones: ['ojos', 'cuello'],
    difficulty: 'basico',
    summary: 'Relaja los músculos oculares tras pantallas y quita tensión frontal.',
    steps: [
      {
        title: 'Mirada lejana (6 metros)',
        instruction: 'Aparta la vista del monitor y enfoca un punto lejano por una ventana o pared opuesta.',
        breathCue: 'Inhala suave 4s · Exhala 4s relajando el entrecejo',
        durationSec: 20,
        anim: 'eye_focus',
      },
      {
        title: 'Parpadeo consciente lento',
        instruction: 'Parpadea suave 10 veces seguidas para lubricar los ojos sin apretar párpados.',
        breathCue: 'Respiración nasal calmada y continua',
        durationSec: 15,
        anim: 'eye_focus',
      },
      {
        title: 'Palming cálido y cuello neutro',
        instruction: 'Frota tus palmas y colócalas ahuecadas sobre ojos cerrados manteniendo cabeza alineada.',
        breathCue: 'Inhala 4s · Exhala largo 6s soltando mandíbula',
        durationSec: 20,
        anim: 'chin_tuck',
      },
    ],
  },
  {
    id: 'vr-cuello',
    title: 'Antídoto Text-Neck (Cuello y Hombros)',
    zones: ['cuello', 'hombros'],
    difficulty: 'basico',
    summary: 'Corrige cabeza adelantada y descarga trapecio superior en 90 segundos.',
    steps: [
      {
        title: 'Retracción de mentón (Chin Tuck)',
        instruction: 'Siéntate alto y desliza el mentón hacia atrás horizontalmente, creando doble mentón suave.',
        breathCue: 'Exhala al llevar el mentón atrás · Mantén 5s y suelta',
        durationSec: 25,
        anim: 'chin_tuck',
      },
      {
        title: 'Inclinación lateral derecha',
        instruction: 'Lleva la oreja derecha hacia el hombro derecho manteniendo el hombro izquierdo bajo.',
        breathCue: 'Inhala suave · Al exhalar deja caer más el hombro opuesto',
        durationSec: 25,
        anim: 'neck_tilt',
      },
      {
        title: 'Inclinación lateral izquierda',
        instruction: 'Cambia de lado con suavidad y mantén la mandíbula completamente relajada.',
        breathCue: 'Exhalación lenta de 6s para liberar fibra muscular',
        durationSec: 25,
        anim: 'neck_tilt',
      },
      {
        title: 'Círculos lentos de hombros hacia atrás',
        instruction: 'Eleva, lleva atrás y desciende ambos hombros en círculos amplios abriendo clavículas.',
        breathCue: 'Inhala al subir hombros · Exhala al bajar escápulas',
        durationSec: 20,
        anim: 'shoulder_roll',
      },
    ],
  },
  {
    id: 'vr-manos',
    title: 'Descompresión de Muñecas y Antebrazos',
    zones: ['munecas', 'hombros'],
    difficulty: 'basico',
    summary: 'Previene rigidez de túnel carpiano y fatiga tras código, teclado o dibujo.',
    steps: [
      {
        title: 'Estiramiento de flexores',
        instruction: 'Brazo extendido al frente con palma arriba; jala suavemente dedos hacia abajo (15s por lado).',
        breathCue: 'Respiración constante, cero rebotes',
        durationSec: 30,
        anim: 'wrist_stretch',
      },
      {
        title: 'Estiramiento de extensores',
        instruction: 'Brazo al frente con dorso arriba; flexiona suavemente la muñeca hacia ti (15s por lado).',
        breathCue: 'Exhala soltando la tensión del antebrazo',
        durationSec: 30,
        anim: 'wrist_stretch',
      },
      {
        title: 'Abanico de dedos y rotación suave',
        instruction: 'Abre dedos al máximo, cierra en puño ligero y rota muñecas lento en ambos sentidos.',
        breathCue: 'Inhala al abrir dedos · Exhala al relajar',
        durationSec: 20,
        anim: 'wrist_stretch',
      },
    ],
  },
  {
    id: 'vr-espalda',
    title: 'Apertura Torácica y Espalda Alta',
    zones: ['espalda_alta', 'hombros', 'cuello'],
    difficulty: 'intermedio',
    summary: 'Revierte la postura encorvada abriendo pecho y despertando los músculos escapulares.',
    steps: [
      {
        title: 'Apertura de pecho y escápulas (W-Y)',
        instruction: 'Junta omóplatos llevando codos hacia atrás en forma de W y abre el esternón.',
        breathCue: 'Inhala expandiendo costillas · Mantén y exhala suave',
        durationSec: 30,
        anim: 'chest_open',
      },
      {
        title: 'Torsión torácica sentada',
        instruction: 'Columna larga, rota suavemente el torso mirando sobre el hombro (15s cada lado).',
        breathCue: 'Inhala creciendo arriba · Exhala rotando un poco más',
        durationSec: 30,
        anim: 'thoracic_twist',
      },
      {
        title: 'Extensión de pie hacia el techo',
        instruction: 'Ponte de pie, entrelaza dedos arriba y alarga costados sin arquear la espalda baja.',
        breathCue: 'Inhala estirando · Exhala bajando brazos lento',
        durationSec: 25,
        anim: 'standing_reach',
      },
    ],
  },
  {
    id: 'vr-lumbar',
    title: 'Alivio Lumbar y Apertura de Caderas',
    zones: ['lumbar', 'caderas'],
    difficulty: 'intermedio',
    summary: 'Descomprime espalda baja y libera flexores de cadera acortados por estar sentado.',
    steps: [
      {
        title: 'Gato-Vaca de pie (manos en muslos)',
        instruction: 'Rodillas ligeramente flexionadas; redondea y extiende la columna con control suave.',
        breathCue: 'Inhala abriendo pecho · Exhala redondeando espalda',
        durationSec: 35,
        anim: 'cat_cow',
      },
      {
        title: 'Apertura de flexor de cadera derecha',
        instruction: 'Da un paso atrás con la pierna derecha, activa glúteo y siente estiramiento frontal suave.',
        breathCue: 'Respiración profunda hacia el abdomen',
        durationSec: 30,
        anim: 'hip_opener',
      },
      {
        title: 'Apertura de flexor de cadera izquierda',
        instruction: 'Cambia de pierna manteniendo torso erguido sin inclinar la cintura.',
        breathCue: 'Exhala soltando rigidez de cadera',
        durationSec: 30,
        anim: 'hip_opener',
      },
    ],
  },
  {
    id: 'vr-full',
    title: 'Reset Postural Integral (4 min)',
    zones: ['ojos', 'cuello', 'hombros', 'espalda_alta', 'lumbar', 'munecas', 'caderas'],
    difficulty: 'avanzado',
    summary: 'Secuencia completa de cabeza a caderas para reiniciar tu postura a mitad de jornada.',
    steps: [
      {
        title: 'Retracción cervical + hombros',
        instruction: '5 retracciones lentas de mentón seguidas de 8 círculos amplios de hombros atrás.',
        breathCue: 'Inhala 4s · Exhala 6s',
        durationSec: 40,
        anim: 'chin_tuck',
      },
      {
        title: 'Apertura torácica y torsión',
        instruction: 'Abre el pecho juntando escápulas y realiza una torsión suave a cada lado.',
        breathCue: 'Inhala abriendo pecho · Exhala rotando',
        durationSec: 45,
        anim: 'chest_open',
      },
      {
        title: 'Descompresión de muñecas',
        instruction: 'Estira flexores y extensores de ambas muñecas sin forzar.',
        breathCue: 'Respiración constante',
        durationSec: 40,
        anim: 'wrist_stretch',
      },
      {
        title: 'Gato-Vaca de pie + apertura de cadera',
        instruction: 'Moviliza la lumbar en Gato-Vaca y haz zancada suave alterna para abrir caderas.',
        breathCue: 'Sincroniza cada movimiento con tu exhalación',
        durationSec: 65,
        anim: 'cat_cow',
      },
      {
        title: 'Descanso visual 20-20-20 y anclaje postural',
        instruction: 'Mira lejos 20s, alinea orejas-hombros-cadera y apoya ambos pies firmes.',
        breathCue: '3 respiraciones lentas de cierre',
        durationSec: 35,
        anim: 'eye_focus',
      },
    ],
  },
];

export interface PostureAssessmentQuestion {
  id: string;
  testName: string;
  instruction: string;
  options: { label: string; score: number }[];
}

export const POSTURE_ASSESSMENT_TESTS: PostureAssessmentQuestion[] = [
  {
    id: 'pa-wall',
    testName: 'Test de Pared (Cabeza adelantada)',
    instruction: 'Apoya talones (a 5 cm de la pared), glúteos y omóplatos contra una pared recta sin forzar el mentón.',
    options: [
      { label: 'La nuca toca la pared con comodidad mirando al frente', score: 10 },
      { label: 'Llega con leve esfuerzo o inclinando un poco el mentón', score: 6 },
      { label: 'Queda separada más de 3-4 cm o genera tensión inmediata', score: 2 },
    ],
  },
  {
    id: 'pa-thoracic',
    testName: 'Movilidad Torácica (Brazos en pared)',
    instruction: 'Con espalda apoyada en pared, intenta subir ambos brazos en forma de Y sin despegar la zona lumbar.',
    options: [
      { label: 'Los dorsos de las manos tocan la pared sin arquear la espalda', score: 10 },
      { label: 'Llegan casi al fondo pero siento rigidez en pecho/hombros', score: 6 },
      { label: 'Se despega mucho la espalda baja o no alcanzan atrás', score: 2 },
    ],
  },
  {
    id: 'pa-screen',
    testName: 'Ergonomía de Pantalla y Laptop',
    instruction: 'Observa tu posición real en este instante frente a tu pantalla principal.',
    options: [
      { label: 'Borde superior a la altura de los ojos (soporte/monitor)', score: 10 },
      { label: 'Un poco baja, inclino levemente el cuello hacia abajo', score: 6 },
      { label: 'Laptop baja en mesa y mirada inclinada hacia abajo todo el día', score: 2 },
    ],
  },
  {
    id: 'pa-seat',
    testName: 'Apoyo Lumbar y Pies',
    instruction: 'Revisa cómo están tus pies, caderas y espalda baja al estudiar o trabajar.',
    options: [
      { label: 'Pies planos en suelo, espalda apoyada y codos cerca de 90 grados', score: 10 },
      { label: 'Empiezo bien pero a los 20 min termino encorvado o cruzando piernas', score: 6 },
      { label: 'Trabajo en cama, sillón blando o silla sin apoyo estable', score: 2 },
    ],
  },
  {
    id: 'pa-breaks',
    testName: 'Frecuencia de Pausas Activas',
    instruction: '¿Cada cuánto te levantas o descansas la vista durante bloques largos?',
    options: [
      { label: 'Cada 45-60 minutos hago 2 min de pausa y 20-20-20', score: 10 },
      { label: 'Cada 2 horas aproximadamente', score: 6 },
      { label: 'Paso 3+ horas seguidas sin levantarme', score: 2 },
    ],
  },
];

export function evaluatePostureScore(
  answers: Record<string, number>,
  checklistChecks: Record<string, boolean>,
  checklistTotal = 5
): { score: number; answered: number; level: string; diagnosis: string } {
  const answeredKeys = POSTURE_ASSESSMENT_TESTS.filter((t) => typeof answers[t.id] === 'number');
  const testMax = POSTURE_ASSESSMENT_TESTS.length * 10;
  const testSum = answeredKeys.reduce((acc, t) => acc + (answers[t.id] ?? 0), 0);
  const checkDone = Object.values(checklistChecks).filter(Boolean).length;
  const checkPct = checklistTotal > 0 ? checkDone / checklistTotal : 0;

  // 80% from assessment tests (or scaled if partial), 20% from desk checklist
  const testPart = answeredKeys.length > 0 ? (testSum / testMax) * 80 : 0;
  const score = Math.min(100, Math.round(testPart + checkPct * 20));

  if (answeredKeys.length === 0) {
    return {
      score,
      answered: 0,
      level: 'Sin evaluar',
      diagnosis: 'Completa los 5 tests rápidos de arriba para obtener tu puntaje postural 0-100 y diagnóstico personalizado.',
    };
  }
  if (score >= 82) {
    return {
      score,
      answered: answeredKeys.length,
      level: 'Postura Sólida',
      diagnosis: 'Excelente base postural y ergonómica. Mantén pausas 20-20-20 y movilidad torácica para sostenerla.',
    };
  }
  if (score >= 55) {
    return {
      score,
      answered: answeredKeys.length,
      level: 'En Ajuste',
      diagnosis: 'Hay signos moderados de fatiga postural. Prioriza elevar la pantalla y completar los días 1-14 del Plan Correctivo.',
    };
  }
  return {
    score,
    answered: answeredKeys.length,
    level: 'Prioridad Correctiva',
    diagnosis: 'Alta sobrecarga cervical/lumbar detectada. Activa alertas cada 30 min, usa el soporte de pantalla hoy mismo y arranca el Día 1 del Plan.',
  };
}

export interface Plan21Day {
  day: number;
  week: 1 | 2 | 3;
  focus: string;
  mission: string;
  durationLabel: string;
}

export const PLAN_21_DAYS: Plan21Day[] = [
  { day: 1, week: 1, focus: 'Conciencia', mission: 'Eleva tu pantalla a la altura de tus ojos y haz 5 retracciones de mentón.', durationLabel: '3 min' },
  { day: 2, week: 1, focus: 'Cuello', mission: 'Completa la rutina Antídoto Text-Neck una vez a mitad de mañana.', durationLabel: '3 min' },
  { day: 3, week: 1, focus: 'Vista', mission: 'Aplica el descanso 20-20-20 al menos 3 veces durante tu jornada.', durationLabel: '3 min' },
  { day: 4, week: 1, focus: 'Hombros', mission: 'Haz 2 series de 10 círculos amplios de hombros hacia atrás al levantarte.', durationLabel: '3 min' },
  { day: 5, week: 1, focus: 'Muñecas', mission: 'Completa la rutina de descompresión de muñecas tras tu bloque principal de PC.', durationLabel: '3 min' },
  { day: 6, week: 1, focus: 'Pecho', mission: 'Estiramiento en marco de puerta 30s por lado para soltar pectorales acortados.', durationLabel: '4 min' },
  { day: 7, week: 1, focus: 'Revisión S1', mission: 'Repite el Test de Pared y anota si sientes menos rigidez en la nuca.', durationLabel: '4 min' },
  { day: 8, week: 2, focus: 'Torácica', mission: 'Realiza 10 repeticiones lentas de brazos en W-Y juntando omóplatos.', durationLabel: '4 min' },
  { day: 9, week: 2, focus: 'Lumbar', mission: 'Completa Gato-Vaca de pie + caminata de 2 minutos sin mirar el celular.', durationLabel: '4 min' },
  { day: 10, week: 2, focus: 'Caderas', mission: 'Haz la rutina Alivio Lumbar y Apertura de Caderas al terminar la tarde.', durationLabel: '4 min' },
  { day: 11, week: 2, focus: 'Monitor Live', mission: 'Usa el Monitor Postural Live por 15 minutos y entrena tu alerta corporal.', durationLabel: '5 min' },
  { day: 12, week: 2, focus: 'Respiración', mission: 'Practica 10 respiraciones costales expandiendo espalda y costillas bajas.', durationLabel: '3 min' },
  { day: 13, week: 2, focus: 'Alternancia', mission: 'Haz al menos una llamada o lectura breve de pie para variar carga lumbar.', durationLabel: '5 min' },
  { day: 14, week: 2, focus: 'Revisión S2', mission: 'Verifica los 5 puntos ergonómicos de tu escritorio y ajusta cualquier desvío.', durationLabel: '4 min' },
  { day: 15, week: 3, focus: 'Resistencia', mission: 'Sostén 3 series de 15s de retracción cervical suave + escápulas activas.', durationLabel: '4 min' },
  { day: 16, week: 3, focus: 'Rotación', mission: 'Completa la rutina Apertura Torácica con foco en torsiones simétricas.', durationLabel: '4 min' },
  { day: 17, week: 3, focus: 'Celular Alto', mission: 'Sube el celular a la altura del pecho cada vez que leas mensajes hoy.', durationLabel: 'Todo el día' },
  { day: 18, week: 3, focus: 'Reset Total', mission: 'Completa la rutina Reset Postural Integral de 4 minutos.', durationLabel: '4 min' },
  { day: 19, week: 3, focus: 'Caderas+', mission: 'Alterna 3 pausas cortas de 90s poniéndote de pie y estirando caderas.', durationLabel: '5 min' },
  { day: 20, week: 3, focus: 'Monitor Live', mission: 'Acumula 20 minutos erguidos en el Monitor Postural Live sin alertas rojas.', durationLabel: '5 min' },
  { day: 21, week: 3, focus: 'Graduación', mission: 'Re-evalúa tu Puntaje Postural 0-100 y compara tu avance desde el Día 1.', durationLabel: '5 min' },
];

export const NUTRITION_DAILY_CHECKLIST: { id: string; label: string; tip: string }[] = [
  { id: 'nut-protein', label: 'Proteína en comidas principales', tip: 'Huevos, pollo, pescado, atún, lentejas, quinua o yogur griego.' },
  { id: 'nut-produce', label: 'Frutas o verduras visibles hoy', tip: 'Suma color y fibra en al menos 2 comidas.' },
  { id: 'nut-water', label: 'Meta de agua cumplida', tip: 'Hidratación constante sostiene energía y lucidez mental.' },
  { id: 'nut-screens', label: 'Sin pantallas 30 min antes de dormir', tip: 'Protege melatonina y recuperación física nocturna.' },
];

export interface QuickProteinMeal {
  id: string;
  moment: 'Desayuno' | 'Almuerzo' | 'Cena / Snack';
  title: string;
  prepMin: number;
  proteinApprox: string;
  ingredients: string;
  steps: string;
}

export const QUICK_PROTEIN_MEALS: QuickProteinMeal[] = [
  {
    id: 'meal-1',
    moment: 'Desayuno',
    title: 'Revuelto de 3 huevos con espinaca y pan integral',
    prepMin: 8,
    proteinApprox: '~24 g proteína',
    ingredients: '3 huevos, 1 puñado de espinaca o tomate, 1 cda aceite de oliva, 1-2 rebanadas de pan integral.',
    steps: 'Saltea la espinaca 1 min, agrega huevos batidos con sal/pimienta a fuego medio-bajo y acompaña con pan tostado.',
  },
  {
    id: 'meal-2',
    moment: 'Desayuno',
    title: 'Bowl de avena proteica con yogur griego y plátano',
    prepMin: 6,
    proteinApprox: '~22 g proteína',
    ingredients: '1/2 taza de avena, 150 g yogur griego natural, 1 plátano, 1 cda de maní o chía, canela.',
    steps: 'Hidrata la avena con agua caliente o leche 3 min, mezcla con yogur griego, rodajas de plátano y canela.',
  },
  {
    id: 'meal-3',
    moment: 'Desayuno',
    title: 'Tostadas de palta, huevo duro y queso fresco',
    prepMin: 10,
    proteinApprox: '~20 g proteína',
    ingredients: '2 rebanadas de pan integral, 1/2 palta, 2 huevos sancochados, 40 g queso fresco, limón y sal.',
    steps: 'Aplasta la palta con gotas de limón sobre pan tostado y corona con huevo en láminas y queso fresco.',
  },
  {
    id: 'meal-4',
    moment: 'Desayuno',
    title: 'Panqueques rápidos de avena, huevo y plátano',
    prepMin: 12,
    proteinApprox: '~21 g proteína',
    ingredients: '2 huevos + 2 claras, 1 plátano maduro, 4 cdas de avena molida, pizca de canela.',
    steps: 'Licúa o aplasta todo hasta integrar y cocina en sartén antiadherente 2 min por lado.',
  },
  {
    id: 'meal-5',
    moment: 'Almuerzo',
    title: 'Bowl de quinua, pollo a la plancha y ensalada fresca',
    prepMin: 15,
    proteinApprox: '~38 g proteína',
    ingredients: '150 g pechuga de pollo, 1 taza quinua cocida, pepino, tomate, palta, limón y orégano.',
    steps: 'Sazona el pollo en tiras con ajo, comino y limón; dóralo 6 min y sirve sobre quinua tibia con verduras.',
  },
  {
    id: 'meal-6',
    moment: 'Almuerzo',
    title: 'Ensalada tibia de atún, lentejas y cebolla morada',
    prepMin: 10,
    proteinApprox: '~35 g proteína',
    ingredients: '1 lata de atún en agua, 1 taza de lentejas cocidas, tomate, cebolla en pluma, culantro y limón.',
    steps: 'Escurre el atún, mezcla con lentejas tibias, verduras picadas, gotas de aceite de oliva y jugo de limón.',
  },
  {
    id: 'meal-7',
    moment: 'Almuerzo',
    title: 'Saltado express de pollo con verduras y arroz',
    prepMin: 15,
    proteinApprox: '~36 g proteína',
    ingredients: '150 g pollo en cubos, brócoli o vainitas, zanahoria en tiras, 1 cda sillao bajo en sodio, 1 taza arroz.',
    steps: 'Saltea el pollo a fuego alto 5 min, suma verduras 4 min, agrega chorrito de sillao y sirve con arroz.',
  },
  {
    id: 'meal-8',
    moment: 'Almuerzo',
    title: 'Filete de pescado a la plancha con camote y ensalada',
    prepMin: 15,
    proteinApprox: '~34 g proteína',
    ingredients: '160 g filete de bonito o tilapia, 1 camote mediano sancochado, ensalada criolla o lechuga.',
    steps: 'Sazona el pescado con ajo, pimienta y limón; cocina 3-4 min por lado en sartén caliente.',
  },
  {
    id: 'meal-9',
    moment: 'Cena / Snack',
    title: 'Tortilla española rápida de atún y verduras',
    prepMin: 10,
    proteinApprox: '~32 g proteína',
    ingredients: '2 huevos + 1 lata de atún escurrido, cebolla china picada, pimiento o espinaca.',
    steps: 'Mezcla huevos con atún y verduras, cuaja en sartén tapada 3 min por lado a fuego medio.',
  },
  {
    id: 'meal-10',
    moment: 'Cena / Snack',
    title: 'Wrap integral de pollo deshilachado y yogur con limón',
    prepMin: 8,
    proteinApprox: '~30 g proteína',
    ingredients: '1 tortilla integral, 120 g pollo cocido, 2 cdas yogur natural con limón/mostaza, lechuga y tomate.',
    steps: 'Mezcla el pollo con la salsa ligera de yogur, rellena la tortilla con vegetales frescos y dora 1 min.',
  },
  {
    id: 'meal-11',
    moment: 'Cena / Snack',
    title: 'Parfait nocturno de yogur griego, fruta y semillas',
    prepMin: 4,
    proteinApprox: '~18 g proteína',
    ingredients: '200 g yogur griego sin azúcar, frutos rojos o manzana picada, 1 cda semillas de zapallo o nueces.',
    steps: 'Combina en un vaso o bowl; ideal cuando necesitas proteína ligera antes de descansar.',
  },
  {
    id: 'meal-12',
    moment: 'Cena / Snack',
    title: 'Tazón de garbanzos salteados con huevo a la plancha',
    prepMin: 12,
    proteinApprox: '~26 g proteína',
    ingredients: '1 taza garbanzos cocidos, 2 huevos, pimentón dulce, comino, ajo en polvo y espinaca.',
    steps: 'Dora los garbanzos especiados 5 min con espinaca y corona con 2 huevos hechos en la misma sartén.',
  },
];

/** Genera un diagrama SVG animado limpio que demuestra cada ejercicio postural sin depender de imágenes externas. */
export function renderPosturePoseSvg(anim: PosturePoseAnim): string {
  const baseStyle = 'class="al-pose-svg" viewBox="0 0 180 140" role="img" aria-label="Diagrama postural animado"';
  switch (anim) {
    case 'eye_focus':
      return `<svg ${baseStyle}>
        <g class="al-pose-eye">
          <path d="M26 70 Q68 38 110 70 Q68 102 26 70 Z" fill="none" stroke="currentColor" stroke-width="3"/>
          <circle cx="68" cy="70" r="14" fill="none" stroke="var(--accent-calm)" stroke-width="3"/>
          <circle cx="68" cy="70" r="5" fill="var(--accent-calm)"/>
        </g>
        <line x1="118" y1="70" x2="154" y2="70" stroke="var(--accent-primary)" stroke-width="2" stroke-dasharray="4 4"/>
        <circle class="al-pose-pulse" cx="160" cy="70" r="8" fill="none" stroke="var(--accent-primary)" stroke-width="2.5"/>
        <text x="90" y="126" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Enfoque lejano 6 m</text>
      </svg>`;
    case 'chin_tuck':
      return `<svg ${baseStyle}>
        <line x1="92" y1="18" x2="92" y2="118" stroke="var(--accent-primary)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.55"/>
        <line x1="92" y1="68" x2="92" y2="118" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
        <path d="M72 86 L92 74 L112 86" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        <g class="al-pose-chin">
          <circle cx="102" cy="46" r="15" fill="none" stroke="var(--accent-calm)" stroke-width="3.5"/>
          <line x1="92" y1="61" x2="98" y2="68" stroke="var(--accent-calm)" stroke-width="3.5" stroke-linecap="round"/>
        </g>
        <path d="M128 46 L114 46 M119 41 L114 46 L119 51" fill="none" stroke="var(--accent-primary)" stroke-width="2.5" stroke-linecap="round"/>
        <text x="90" y="132" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Mentón hacia atrás en eje</text>
      </svg>`;
    case 'neck_tilt':
      return `<svg ${baseStyle}>
        <line x1="90" y1="74" x2="90" y2="118" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
        <path d="M58 84 L90 74 L122 84" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        <g class="al-pose-tilt">
          <line x1="90" y1="74" x2="90" y2="54" stroke="var(--accent-calm)" stroke-width="4" stroke-linecap="round"/>
          <circle cx="90" cy="40" r="15" fill="none" stroke="var(--accent-calm)" stroke-width="3.5"/>
        </g>
        <text x="90" y="132" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Oreja suave hacia hombro</text>
      </svg>`;
    case 'shoulder_roll':
      return `<svg ${baseStyle}>
        <circle cx="90" cy="38" r="13" fill="none" stroke="currentColor" stroke-width="3"/>
        <line x1="90" y1="51" x2="90" y2="112" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
        <g class="al-pose-shoulders">
          <path d="M54 74 Q90 64 126 74" fill="none" stroke="var(--accent-calm)" stroke-width="4.5" stroke-linecap="round"/>
          <circle cx="54" cy="74" r="6" fill="var(--accent-primary)"/>
          <circle cx="126" cy="74" r="6" fill="var(--accent-primary)"/>
        </g>
        <path d="M40 62 A14 14 0 1 1 38 78" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-dasharray="3 2"/>
        <path d="M140 62 A14 14 0 1 0 142 78" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-dasharray="3 2"/>
        <text x="90" y="132" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Círculos lentos atrás</text>
      </svg>`;
    case 'wrist_stretch':
      return `<svg ${baseStyle}>
        <line x1="36" y1="74" x2="104" y2="74" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
        <g class="al-pose-wrist">
          <path d="M104 74 L132 54 M104 74 L138 66 M104 74 L134 80" fill="none" stroke="var(--accent-calm)" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="104" cy="74" r="5" fill="var(--accent-primary)"/>
        </g>
        <text x="90" y="126" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Extensión y flexión suave</text>
      </svg>`;
    case 'chest_open':
      return `<svg ${baseStyle}>
        <circle cx="90" cy="34" r="13" fill="none" stroke="currentColor" stroke-width="3"/>
        <line x1="90" y1="47" x2="90" y2="112" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
        <g class="al-pose-open">
          <path d="M90 64 L54 78 L40 50" fill="none" stroke="var(--accent-calm)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M90 64 L126 78 L140 50" fill="none" stroke="var(--accent-calm)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <text x="90" y="132" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Abrir pecho · Juntar omóplatos</text>
      </svg>`;
    case 'thoracic_twist':
      return `<svg ${baseStyle}>
        <circle cx="90" cy="36" r="13" fill="none" stroke="currentColor" stroke-width="3"/>
        <line x1="90" y1="49" x2="90" y2="112" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        <g class="al-pose-twist">
          <line x1="54" y1="70" x2="126" y2="70" stroke="var(--accent-calm)" stroke-width="4.5" stroke-linecap="round"/>
          <circle cx="54" cy="70" r="5" fill="var(--accent-primary)"/>
          <circle cx="126" cy="70" r="5" fill="var(--accent-primary)"/>
        </g>
        <text x="90" y="132" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Rotación torácica suave</text>
      </svg>`;
    case 'standing_reach':
      return `<svg ${baseStyle}>
        <circle cx="90" cy="48" r="12" fill="none" stroke="currentColor" stroke-width="3"/>
        <line x1="90" y1="60" x2="90" y2="96" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M90 96 L76 120 M90 96 L104 120" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        <g class="al-pose-reach">
          <path d="M90 66 L72 40 L84 18" fill="none" stroke="var(--accent-calm)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M90 66 L108 40 L96 18" fill="none" stroke="var(--accent-calm)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <text x="90" y="134" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Alargar columna arriba</text>
      </svg>`;
    case 'cat_cow':
      return `<svg ${baseStyle}>
        <circle cx="52" cy="58" r="11" fill="none" stroke="currentColor" stroke-width="3"/>
        <path class="al-pose-spine" d="M62 66 Q95 48 128 70" fill="none" stroke="var(--accent-calm)" stroke-width="5" stroke-linecap="round"/>
        <path d="M66 68 L62 108 M124 72 L130 112" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        <text x="90" y="130" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Movilidad lumbar Gato-Vaca</text>
      </svg>`;
    case 'hip_opener':
      return `<svg ${baseStyle}>
        <circle cx="90" cy="30" r="11" fill="none" stroke="currentColor" stroke-width="3"/>
        <line x1="90" y1="41" x2="90" y2="80" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
        <g class="al-pose-lunge">
          <path d="M90 80 L64 96 L64 118" fill="none" stroke="var(--accent-calm)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M90 80 L118 102 L134 118" fill="none" stroke="var(--accent-primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <text x="90" y="134" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.75">Apertura de flexor de cadera</text>
      </svg>`;
  }
}
