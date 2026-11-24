import type { DifficultyLevel } from '../types.ts';

/* ==================== 1. PENSAMIENTO CRITICO Y DECISIONES ==================== */

export interface CriticalCase {
  id: string;
  difficulty: DifficultyLevel;
  kind: 'sesgo' | 'falacia' | 'decision';
  title: string;
  scenario: string;
  options: string[];
  correctIndex: number;
  concept: string;
  explanation: string;
  antidote: string;
}

export const CRITICAL_CASES: CriticalCase[] = [
  {
    id: 'cc-1',
    difficulty: 'basico',
    kind: 'sesgo',
    title: 'La suscripción que ya pagaste',
    scenario: 'Pagaste un curso anual que ya no te aporta valor, pero sigues forzándote a verlo cada noche solo porque ya gastaste el dinero.',
    options: ['Sesgo de costo hundido', 'Sesgo de confirmación', 'Efecto halo', 'Falacia ad hominem'],
    correctIndex: 0,
    concept: 'Sesgo de costo hundido (Sunk Cost)',
    explanation: 'El dinero o tiempo pasado no se recupera siguiendo en un mal camino; la decisión debe mirar solo el valor futuro.',
    antidote: 'Pregúntate: si empezara hoy desde cero sin haber pagado nada, ¿elegiría dedicar estas horas a esto?',
  },
  {
    id: 'cc-2',
    difficulty: 'basico',
    kind: 'sesgo',
    title: 'Solo buscar reseñas que te den la razón',
    scenario: 'Quieres comprar una laptop específica y únicamente lees reseñas positivas mientras ignoras los reportes de sobrecalentamiento.',
    options: ['Sesgo de supervivencia', 'Sesgo de confirmación', 'Anclaje numérico', 'Falsa dicotomía'],
    correctIndex: 1,
    concept: 'Sesgo de confirmación',
    explanation: 'Buscamos e interpretamos información que confirma lo que ya deseamos creer, filtrando evidencia contraria.',
    antidote: 'Busca explícitamente las 3 críticas más sólidas antes de cerrar cualquier decisión importante.',
  },
  {
    id: 'cc-3',
    difficulty: 'basico',
    kind: 'falacia',
    title: 'Atacar a la persona en vez del argumento',
    scenario: 'En una revisión de proyecto, alguien descarta una mejora de rendimiento diciendo: «Qué vas a saber tú si recién entraste este ciclo».',
    options: ['Hombre de paja', 'Ad hominem', 'Pendiente resbaladiza', 'Apelación a la mayoría'],
    correctIndex: 1,
    concept: 'Falacia Ad Hominem',
    explanation: 'Se invalida una idea atacando características personales de quien la expone en lugar de evaluar sus pruebas o lógica.',
    antidote: 'Separa el mensaje del mensajero: evalúa los datos, métricas o pruebas independientemente de quién habla.',
  },
  {
    id: 'cc-4',
    difficulty: 'basico',
    kind: 'falacia',
    title: 'O todo perfecto o no sirve',
    scenario: '«Si no lanzamos la app con las 20 funciones el lunes, entonces el proyecto habrá fracasado por completo».',
    options: ['Falsa dicotomía', 'Causa falsa', 'Ad verecundiam', 'Sesgo de disponibilidad'],
    correctIndex: 0,
    concept: 'Falsa dicotomía (Blanco o negro)',
    explanation: 'Reduce una situación con múltiples alternativas intermedias (como lanzar una versión mínima sólida) a solo dos extremos.',
    antidote: 'Fuerza una tercera opción intermedia cada vez que escuches «o esto o lo otro».',
  },
  {
    id: 'cc-5',
    difficulty: 'basico',
    kind: 'sesgo',
    title: 'El precio tachado gigante',
    scenario: 'Ves un reloj que marca «Antes S/ 600, hoy S/ 240» y te parece una ganga sin verificar si su valor real de mercado es S/ 180.',
    options: ['Efecto anclaje', 'Efecto Dunning-Kruger', 'Sesgo de retrospectiva', 'Falacia del francotirador'],
    correctIndex: 0,
    concept: 'Efecto anclaje (Anchoring)',
    explanation: 'La primera cifra que vemos (S/ 600) distorsiona nuestra referencia y hace que la segunda parezca barata aunque no lo sea.',
    antidote: 'Compara contra alternativas independientes del mercado y borra mentalmente el «precio anterior».',
  },
  {
    id: 'cc-6',
    difficulty: 'basico',
    kind: 'falacia',
    title: 'Todo el mundo lo usa, así que es mejor',
    scenario: '«El 90% de mis amigos usa esa herramienta para notas, por lo tanto tiene que ser la mejor opción para mi flujo técnico».',
    options: ['Apelación a la popularidad (Ad populum)', 'Hombre de paja', 'Falsa equivalencia', 'Sesgo de omisión'],
    correctIndex: 0,
    concept: 'Falacia Ad Populum',
    explanation: 'La popularidad de una opción indica adopción social, no necesariamente adecuación a tus requisitos reales.',
    antidote: 'Define tus 3 criterios propios antes de mirar qué está de moda.',
  },
  {
    id: 'cc-7',
    difficulty: 'intermedio',
    kind: 'sesgo',
    title: 'Solo miramos a quienes tuvieron éxito',
    scenario: 'Lees biografías de 5 fundadores que dejaron la universidad y se volvieron millonarios, concluyendo que dejar los estudios garantiza éxito.',
    options: ['Sesgo de supervivencia', 'Efecto encuadre', 'Sesgo de estatus quo', 'Pendiente resbaladiza'],
    correctIndex: 0,
    concept: 'Sesgo de supervivencia',
    explanation: 'Observamos solo los casos visibles que sobrevivieron al filtro e ignoramos a los miles que siguieron el mismo camino y fallaron.',
    antidote: 'Pregunta siempre: ¿dónde están los datos de quienes hicieron lo mismo y no salieron en las noticias?',
  },
  {
    id: 'cc-8',
    difficulty: 'intermedio',
    kind: 'falacia',
    title: 'Distorsionar la postura ajena',
    scenario: 'Dices «conviene dedicar 20 minutos a pruebas automatizadas» y responden: «O sea que quieres retrasar la entrega una semana sin escribir funciones nuevas».',
    options: ['Hombre de paja', 'Ad hominem', 'Post hoc', 'Petición de principio'],
    correctIndex: 0,
    concept: 'Falacia del hombre de paja',
    explanation: 'Se exagera o tergiversa el argumento original para convertirlo en una caricatura fácil de atacar.',
    antidote: 'Restaura la precisión con calma: «Mi propuesta puntual es dedicar 20 minutos, no una semana».',
  },
  {
    id: 'cc-9',
    difficulty: 'intermedio',
    kind: 'sesgo',
    title: 'Confianza excesiva al empezar un tema',
    scenario: 'Tras ver un tutorial de 30 minutos sobre redes neuronales, sientes que ya dominas el área y prometes diseñar un sistema productivo en dos días.',
    options: ['Efecto Dunning-Kruger', 'Sesgo de costo hundido', 'Efecto Halo', 'Sesgo de autoridad'],
    correctIndex: 0,
    concept: 'Efecto Dunning-Kruger',
    explanation: 'Al inicio de un aprendizaje desconocemos la amplitud real del tema, lo que infla temporalmente la sensación de dominio.',
    antidote: 'Estima tiempos añadiendo un margen de pruebas y pide revisión a alguien que ya construyó algo similar.',
  },
  {
    id: 'cc-10',
    difficulty: 'intermedio',
    kind: 'falacia',
    title: 'Pasó después, así que fue la causa',
    scenario: 'Cambiaste el color de un botón el martes y las visitas subieron el miércoles (día de quincena); concluyes que el color duplicó las ventas.',
    options: ['Post hoc ergo propter hoc (Falsa causa)', 'Falsa dicotomía', 'Pendiente resbaladiza', 'Ad populum'],
    correctIndex: 0,
    concept: 'Falacia Post Hoc (Correlación no es causalidad)',
    explanation: 'Que un evento ocurra después de otro no prueba que el primero haya causado el segundo; pueden existir variables ocultas.',
    antidote: 'Controla variables externas (estacionalidad, quincena, campañas) o usa pruebas A/B.',
  },
  {
    id: 'cc-11',
    difficulty: 'intermedio',
    kind: 'sesgo',
    title: 'Juzgar por la apariencia general',
    scenario: 'Un ponente viste impecable y usa diapositivas espectaculares, así que aceptas sus cifras financieras sin revisar la metodología.',
    options: ['Efecto Halo', 'Sesgo de disponibilidad', 'Aversión a la pérdida', 'Sesgo de omisión'],
    correctIndex: 0,
    concept: 'Efecto Halo',
    explanation: 'Una cualidad positiva visible (presencia, carisma, estética) nos hace asumir competencia en áreas no verificadas.',
    antidote: 'Evalúa el contenido por escrito o en números desnudos, separado de la puesta en escena.',
  },
  {
    id: 'cc-12',
    difficulty: 'intermedio',
    kind: 'decision',
    title: 'Planear como si nada fuera a fallar',
    scenario: 'Calculas que terminarás tu trabajo final en 6 horas exactas porque ese es el mejor caso posible si no hay bugs ni interrupciones.',
    options: ['Falacia de planificación', 'Sesgo de estatus quo', 'Efecto encuadre', 'Falsa equivalencia'],
    correctIndex: 0,
    concept: 'Falacia de planificación',
    explanation: 'Subestimamos tiempos y costos porque proyectamos el escenario ideal ignorando nuestro historial real de imprevistos.',
    antidote: 'Toma tu estimado optimista y multiplícalo por 1.5x o compáralo con tus últimos tres proyectos reales.',
  },
  {
    id: 'cc-13',
    difficulty: 'avanzado',
    kind: 'sesgo',
    title: 'Mismo dato, distinto marco emocional',
    scenario: 'Rechazas una cirugía con «10% de riesgo de complicación», pero aceptas la misma cirugía cuando te dicen «90% de tasa de éxito».',
    options: ['Efecto encuadre (Framing)', 'Sesgo de disponibilidad', 'Efecto anclaje', 'Costo hundido'],
    correctIndex: 0,
    concept: 'Efecto encuadre (Framing)',
    explanation: 'La forma en que se presenta la misma probabilidad (como pérdida o ganancia) altera drásticamente la decisión emocional.',
    antidote: 'Reescribe siempre los porcentajes en ambos sentidos (tasa de éxito y tasa de fallo) antes de elegir.',
  },
  {
    id: 'cc-14',
    difficulty: 'avanzado',
    kind: 'falacia',
    title: 'Cadena catastrófica sin evidencia',
    scenario: '«Si hoy aceptamos retrasar una reunión 15 minutos, la próxima semana nadie cumplirá fechas y perderemos todos los clientes».',
    options: ['Pendiente resbaladiza', 'Petición de principio', 'Hombre de paja', 'Falsa analogía'],
    correctIndex: 0,
    concept: 'Falacia de la pendiente resbaladiza',
    explanation: 'Asume que un primer paso pequeño desencadenará inevitablemente una cadena extrema de consecuencias sin probar cada eslabón.',
    antidote: 'Exige evidencia del vínculo real entre el paso A y el paso B, y define límites claros.',
  },
  {
    id: 'cc-15',
    difficulty: 'avanzado',
    kind: 'decision',
    title: 'Aversión asimétrica a perder',
    scenario: 'Mantienes una inversión que pierde valor mes a mes para «no materializar la pérdida», dejando pasar una alternativa mucho más rentable.',
    options: ['Aversión a la pérdida + estatus quo', 'Efecto Halo', 'Ad populum', 'Sesgo de disponibilidad'],
    correctIndex: 0,
    concept: 'Aversión a la pérdida y Sesgo de estatus quo',
    explanation: 'El dolor psicológico de asumir una pérdida pesa roughly el doble que una ganancia equivalente, paralizando decisiones racionales.',
    antidote: 'Evalúa el costo de oportunidad: qué dejas de ganar cada mes por quedarte inmóvil.',
  },
  {
    id: 'cc-16',
    difficulty: 'avanzado',
    kind: 'falacia',
    title: 'Razonamiento circular encubierto',
    scenario: '«Esta arquitectura es la más confiable porque fue diseñada por nuestro equipo, y nuestro equipo solo diseña sistemas confiables».',
    options: ['Petición de principio (Circularidad)', 'Ad hominem', 'Falsa dicotomía', 'Post hoc'],
    correctIndex: 0,
    concept: 'Petición de principio (Petitio principii)',
    explanation: 'La conclusión ya está asumida dentro de la premisa sin aportar evidencia externa verificable.',
    antidote: 'Pide pruebas independientes de la afirmación: métricas, auditorías o ensayos reproducibles.',
  },
  {
    id: 'cc-17',
    difficulty: 'avanzado',
    kind: 'sesgo',
    title: 'Sobrestimar lo más reciente o llamativo',
    scenario: 'Ves una noticia viral sobre un fallo de nube y decides migrar todo a servidores propios, ignorando que la tasa de caída propia es 5 veces mayor.',
    options: ['Heurística de disponibilidad', 'Sesgo de confirmación', 'Efecto anclaje', 'Costo hundido'],
    correctIndex: 0,
    concept: 'Heurística de disponibilidad',
    explanation: 'Estimamos la probabilidad de un riesgo por lo fácil que nos resulta recordar un ejemplo vívido, no por su tasa base real.',
    antidote: 'Consulta tasas base y estadísticas anuales antes de reaccionar a noticias recientes.',
  },
  {
    id: 'cc-18',
    difficulty: 'avanzado',
    kind: 'decision',
    title: 'Comparar probabilidades sin tasa base',
    scenario: 'Un test tiene 95% de precisión para una falla rarísima (1 en 1,000 equipos). Al dar positivo, asumes 95% de probabilidad de que el equipo esté dañado.',
    options: ['Falacia de la tasa base', 'Pendiente resbaladiza', 'Efecto encuadre', 'Ad verecundiam'],
    correctIndex: 0,
    concept: 'Falacia de la tasa base (Razonamiento Bayesiano)',
    explanation: 'En eventos muy raros, los falsos positivos (5% de 999 = ~50) superan ampliamente al único caso real positivo.',
    antidote: 'Multiplica siempre la sensibilidad del indicador por la frecuencia real del evento (tasa base).',
  },
];

export interface DecisionTemplate {
  id: string;
  title: string;
  options: [string, string];
  criteria: { name: string; weight: number; scoreA: number; scoreB: number }[];
}

export const DECISION_TEMPLATES: DecisionTemplate[] = [
  {
    id: 'dt-stack',
    title: 'Elegir tecnología para proyecto',
    options: ['Opción simple conocida', 'Framework nuevo moderno'],
    criteria: [
      { name: 'Velocidad de entrega', weight: 5, scoreA: 9, scoreB: 6 },
      { name: 'Facilidad de mantenimiento', weight: 4, scoreA: 8, scoreB: 7 },
      { name: 'Aprendizaje / CV', weight: 3, scoreA: 5, scoreB: 9 },
      { name: 'Riesgo técnico bajo', weight: 4, scoreA: 9, scoreB: 5 },
    ],
  },
  {
    id: 'dt-career',
    title: 'Práctica profesional vs proyecto propio',
    options: ['Empresa establecida', 'Proyecto propio / Freelance'],
    criteria: [
      { name: 'Ingreso estable', weight: 5, scoreA: 8, scoreB: 5 },
      { name: 'Mentoría y procesos', weight: 4, scoreA: 8, scoreB: 4 },
      { name: 'Flexibilidad de horario', weight: 4, scoreA: 5, scoreB: 9 },
      { name: 'Crecimiento a 12 meses', weight: 5, scoreA: 7, scoreB: 8 },
    ],
  },
  {
    id: 'dt-purchase',
    title: 'Compra importante (equipo / herramienta)',
    options: ['Modelo equilibrado', 'Modelo tope de gama'],
    criteria: [
      { name: 'Relación valor / precio', weight: 5, scoreA: 9, scoreB: 6 },
      { name: 'Impacto en mi presupuesto', weight: 5, scoreA: 8, scoreB: 4 },
      { name: 'Durabilidad (3+ años)', weight: 4, scoreA: 7, scoreB: 9 },
      { name: 'Rendimiento real que necesito', weight: 4, scoreA: 8, scoreB: 9 },
    ],
  },
];

/* ==================== 2. ESCRITURA CLARA Y SINTESIS ==================== */

export interface WritingChallenge {
  id: string;
  difficulty: DifficultyLevel;
  category: 'correo' | 'resumen' | 'argumento' | 'tecnico';
  title: string;
  flawedText: string;
  goal: string;
  maxWords: number;
  hints: string[];
  modelAnswer: string;
}

export const WRITING_CHALLENGES: WritingChallenge[] = [
  {
    id: 'wc-1',
    difficulty: 'basico',
    category: 'correo',
    title: 'Correo sin rodeos para pedir confirmación',
    flawedText: 'Estimado, el motivo del presente correo es principalmente para saludarlo cordialmente y a la vez hacerle llegar la consulta con respecto a si eventualmente sería posible que pudiéramos confirmar la hora de la reunión del día jueves.',
    goal: 'Reescribe el correo en tono respetuoso pero directo en máximo 22 palabras.',
    maxWords: 22,
    hints: ['Elimina «el motivo del presente correo es».', 'Pide la confirmación y la hora en la primera oración.'],
    modelAnswer: 'Hola, ¿podemos confirmar a qué hora será nuestra reunión del jueves? Quedo atento para agendarla.',
  },
  {
    id: 'wc-2',
    difficulty: 'basico',
    category: 'resumen',
    title: 'Cortar redundancias en informe',
    flawedText: 'Actualmente en el día de hoy procedimos a realizar una revisión exhaustiva completa de todos y cada uno de los archivos con la finalidad de poder encontrar errores repetidos.',
    goal: 'Conserva la idea exacta eliminando pleonasmos y relleno en máximo 16 palabras.',
    maxWords: 16,
    hints: ['«Actualmente en el día de hoy» = «Hoy».', '«Procedimos a realizar una revisión» = «Revisamos».'],
    modelAnswer: 'Hoy revisamos a fondo todos los archivos para detectar errores repetidos.',
  },
  {
    id: 'wc-3',
    difficulty: 'basico',
    category: 'tecnico',
    title: 'Reportar un error con datos útiles',
    flawedText: 'Hola, la página no funciona bien cuando entro a ver mis cosas, como que se queda cargando raro y a veces no sale nada, por favor ayúdenme rápido.',
    goal: 'Redacta un reporte claro indicando dónde pasa, qué ocurre y el resultado esperado (máx. 30 palabras).',
    maxWords: 30,
    hints: ['Especifica módulo/pantalla y acción exacta.', 'Indica qué ocurrió vs. qué esperabas.'],
    modelAnswer: 'Al abrir Biblioteca y seleccionar Fábulas de Samaniego, el lector muestra 0 palabras en lugar del texto del capítulo. Reproducido en móvil y PC.',
  },
  {
    id: 'wc-4',
    difficulty: 'intermedio',
    category: 'argumento',
    title: 'Pirámide invertida: conclusión primero',
    flawedText: 'Estuvimos revisando varias opciones durante tres días, comparando precios, viendo documentación y hablando con otros compañeros que tuvieron experiencias mixtas, y al final llegamos a la conclusión de que conviene usar caché local con sincronización en Supabase.',
    goal: 'Abre con la decisión en la primera frase y luego da el respaldo en máximo 28 palabras.',
    maxWords: 28,
    hints: ['Empieza por «Recomendamos usar...».', 'Resume la justificación en una sola cláusula concreta.'],
    modelAnswer: 'Recomendamos usar caché local sincronizada con Supabase: tras evaluar tres alternativas, ofrece respuesta inmediata sin conexión y menor costo operativo.',
  },
  {
    id: 'wc-5',
    difficulty: 'intermedio',
    category: 'correo',
    title: 'Pedir feedback accionable',
    flawedText: 'Te mando el documento que estuve haciendo toda la semana para que lo mires cuando puedas y me digas qué opinas en general de todo lo que puse ahí.',
    goal: 'Pide revisión enfocada indicando qué sección mirar y para cuándo (máx. 26 palabras).',
    maxWords: 26,
    hints: ['Señala el punto exacto a revisar.', 'Propón una fecha límite amable.'],
    modelAnswer: 'Te comparto el borrador. ¿Podrías revisar el alcance y el cronograma antes del viernes al mediodía para confirmar si falta algún hito?',
  },
  {
    id: 'wc-6',
    difficulty: 'intermedio',
    category: 'tecnico',
    title: 'Explicar un trade-off sin jerga innecesaria',
    flawedText: 'La implementación de una capa de abstracción polimórfica desacoplada nos otorgaría extensibilidad teórica futura, sin embargo incrementa significativamente la latencia cognitiva de mantenimiento.',
    goal: 'Traduce esa idea a español claro y preciso en máximo 24 palabras.',
    maxWords: 24,
    hints: ['Reemplaza sustantivos abstractos por verbos directos.', 'Muestra el costo y el beneficio concretos.'],
    modelAnswer: 'Añadir otra capa facilita cambios futuros, pero hoy hace el código más difícil de leer y mantener; conviene mantenerlo simple.',
  },
  {
    id: 'wc-7',
    difficulty: 'avanzado',
    category: 'resumen',
    title: 'Síntesis ejecutiva de incidente',
    flawedText: 'El despliegue automático de páginas falló dos veces seguidas porque el paso de subir el archivo comprimido y el paso de publicar corrían pegados en el mismo trabajo y la plataforma no terminaba de registrar el archivo a tiempo, así que se separaron en dos trabajos distintos y ya quedó resuelto.',
    goal: 'Resume causa, solución y estado actual en máximo 28 palabras usando oraciones cortas.',
    maxWords: 28,
    hints: ['Divide en 2 oraciones claras.', 'Usa estructura: Causa -> Solución -> Estado.'],
    modelAnswer: 'El despliegue fallaba porque publicación y carga corrían en el mismo job antes de indexar el artefacto. Separamos ambos pasos en jobs independientes y quedó operativo.',
  },
  {
    id: 'wc-8',
    difficulty: 'avanzado',
    category: 'argumento',
    title: 'Decir «no» con criterio y alternativa',
    flawedText: 'La verdad es que no creo que podamos meter esa función extra ahora porque estamos muy apretados y ya tenemos demasiadas cosas encima y todo se va a romper si apuramos.',
    goal: 'Rechaza el cambio con profesionalismo, muestra el impacto y ofrece una alternativa viable (máx. 32 palabras).',
    maxWords: 32,
    hints: ['Evita tono defensivo («la verdad es que»).', 'Ofrece plan B con fecha o fase siguiente.'],
    modelAnswer: 'Incluir esa función esta semana pondría en riesgo las pruebas del módulo principal. Propongo cerrar la entrega actual el viernes y priorizarla al inicio del siguiente sprint.',
  },
  {
    id: 'wc-9',
    difficulty: 'avanzado',
    category: 'resumen',
    title: 'Densidad sin perder claridad',
    flawedText: 'El aprendizaje efectivo realmente no se logra simplemente releyendo pasivamente los mismos apuntes una y otra vez, sino que fundamentalmente requiere que el estudiante practique activamente recordar la información desde cero.',
    goal: 'Elimina todos los adverbios en «-mente» y deja una frase memorable de máximo 20 palabras.',
    maxWords: 20,
    hints: ['Quita realmente, simplemente, pasivamente, fundamentalmente, activamente.', 'Contrasta «releer» con «recordar».'],
    modelAnswer: 'Releer apuntes crea ilusión de dominio; el aprendizaje real ocurre cuando te exiges recordar y aplicar sin mirar.',
  },
];

export interface WritingAnalysis {
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  longSentences: number;
  fillerMatches: string[];
  menteCount: number;
  clarityScore: number;
  suggestions: string[];
}

const FILLER_PHRASES = [
  'el motivo del presente',
  'a nivel de',
  'en el día de hoy',
  'con la finalidad de',
  'procedimos a',
  'es importante mencionar que',
  'básicamente',
  'literalmente',
  'la verdad es que',
  'como que',
  'en realidad',
  'o sea',
];

export function analyzeWritingClarity(text: string, difficulty: DifficultyLevel = 'intermedio'): WritingAnalysis {
  const clean = text.trim();
  if (!clean) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      avgWordsPerSentence: 0,
      longSentences: 0,
      fillerMatches: [],
      menteCount: 0,
      clarityScore: 0,
      suggestions: ['Escribe o pega un párrafo para analizar su claridad, concisión y ritmo.'],
    };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = clean
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  const avgWordsPerSentence = Math.round((wordCount / sentenceCount) * 10) / 10;
  const longLimit = difficulty === 'avanzado' ? 20 : difficulty === 'intermedio' ? 24 : 28;
  const longSentences = sentences.filter((s) => s.split(/\s+/).filter(Boolean).length > longLimit).length;

  const lower = clean.toLowerCase();
  const fillerMatches = FILLER_PHRASES.filter((ph) => lower.includes(ph));
  const menteMatches = lower.match(/\b[a-záéíóúñ]{4,}mente\b/gi) ?? [];
  const menteCount = menteMatches.length;

  let score = 100;
  if (avgWordsPerSentence > longLimit) score -= Math.min(28, Math.round((avgWordsPerSentence - longLimit) * 2.5));
  score -= longSentences * 9;
  score -= fillerMatches.length * 11;
  if (menteCount > 1) score -= (menteCount - 1) * 7;
  if (wordCount < 6) score -= 15;
  const clarityScore = Math.max(15, Math.min(100, Math.round(score)));

  const suggestions: string[] = [];
  if (longSentences > 0) {
    suggestions.push(`Detectamos ${longSentences} ${longSentences === 1 ? 'oración larga' : 'oraciones largas'} (>${longLimit} palabras). Divide con punto seguido.`);
  }
  if (fillerMatches.length > 0) {
    suggestions.push(`Recorta frases de relleno: «${fillerMatches.slice(0, 3).join('», «')}».`);
  }
  if (menteCount > 1) {
    suggestions.push(`Usaste ${menteCount} adverbios en «-mente»; reemplaza algunos por verbos precisos.`);
  }
  if (suggestions.length === 0) {
    suggestions.push('Excelente claridad: oraciones directas, sin relleno evidente y buen ritmo de lectura.');
  }

  return {
    wordCount,
    sentenceCount,
    avgWordsPerSentence,
    longSentences,
    fillerMatches,
    menteCount,
    clarityScore,
    suggestions,
  };
}

/* ==================== 3. FINANZAS PERSONALES Y AHORRO ==================== */

export interface FinanceQuizItem {
  id: string;
  difficulty: DifficultyLevel;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const FINANCE_QUIZ_CASES: FinanceQuizItem[] = [
  {
    id: 'fq-1',
    difficulty: 'basico',
    question: 'Según la regla práctica 50/30/20, ¿qué porcentaje mínimo se destina a ahorro o pago acelerado de deudas?',
    options: ['10%', '20%', '30%', '50%'],
    correctIndex: 1,
    explanation: '50% necesidades esenciales, 30% estilo de vida/deseos y al menos 20% a ahorro, fondo de emergencia o inversión.',
  },
  {
    id: 'fq-2',
    difficulty: 'basico',
    question: '¿Cuál es el primer objetivo financiero antes de asumir inversiones volátiles?',
    options: ['Comprar acciones de moda', 'Construir un fondo de emergencia líquido de 3 a 6 meses de gastos', 'Sacar una tarjeta con mayor línea', 'Invertir con dinero prestado'],
    correctIndex: 1,
    explanation: 'Un fondo de emergencia evita que un imprevisto te obligue a endeudarte a tasas altas o vender inversiones en pérdida.',
  },
  {
    id: 'fq-3',
    difficulty: 'basico',
    question: 'Un gasto hormiga de S/ 12 al día en snacks o comisiones equivale aproximadamente en un año a:',
    options: ['S/ 360', 'S/ 1,440', 'S/ 4,380', 'S/ 900'],
    correctIndex: 2,
    explanation: '12 × 365 = S/ 4,380 al año. Medir gastos pequeños frecuentes revela fugas invisibles de ahorro.',
  },
  {
    id: 'fq-4',
    difficulty: 'basico',
    question: '¿Qué significa «pagarte a ti mismo primero» al recibir un ingreso?',
    options: ['Gastar primero en gustos y ahorrar lo que sobre', 'Separar tu porcentaje de ahorro apenas recibes el ingreso', 'Dejar todo en efectivo en casa', 'Pagar solo el mínimo de la tarjeta'],
    correctIndex: 1,
    explanation: 'Automatizar o separar el ahorro al inicio del mes evita que los gastos variables consuman todo el ingreso.',
  },
  {
    id: 'fq-5',
    difficulty: 'intermedio',
    question: 'Si tienes una tarjeta de crédito al 60% TEA y una cuenta de ahorros que paga 6% TEA, ¿qué conviene priorizar con tu excedente?',
    options: ['Seguir ahorrando al 6% y pagar solo el mínimo', 'Liquidar primero la deuda del 60% TEA', 'Dividir 50/50 entre ambas', 'Esperar a fin de año'],
    correctIndex: 1,
    explanation: 'Pagar una deuda de 60% equivale a obtener un retorno garantizado de 60% libre de riesgo, muy superior al 6%.',
  },
  {
    id: 'fq-6',
    difficulty: 'intermedio',
    question: '¿Por qué el interés compuesto crece mucho más rápido a partir del año 10 que en el año 2?',
    options: ['Porque el banco sube la tasa por ley', 'Porque los rendimientos acumulados empiezan a generar sus propios rendimientos', 'Porque desaparece la inflación', 'Porque se duplica tu aporte automáticamente'],
    correctIndex: 1,
    explanation: 'El interés compuesto es exponencial: el tiempo es su mayor palanca porque cada periodo calcula retorno sobre capital más intereses previos.',
  },
  {
    id: 'fq-7',
    difficulty: 'intermedio',
    question: '¿Cuál es la diferencia clave entre el método «Avalancha» y «Bola de nieve» para salir de deudas?',
    options: ['Avalancha paga primero la tasa de interés más alta; Bola de nieve la deuda más pequeña', 'Son exactamente iguales', 'Bola de nieve solo sirve para hipotecas', 'Avalancha ignora los pagos mínimos'],
    correctIndex: 0,
    explanation: 'Avalancha ahorra más intereses matemáticamente; Bola de nieve da victorias psicológicas rápidas cerrando cuentas pequeñas.',
  },
  {
    id: 'fq-8',
    difficulty: 'avanzado',
    question: 'Si tu dinero rinde 4% anual en el banco pero la inflación anual es 6%, ¿qué pasa con tu poder adquisitivo real?',
    options: ['Crece un 4%', 'Se mantiene exactamente igual', 'Pierde aproximadamente 2% de poder de compra al año', 'Crece un 10%'],
    correctIndex: 2,
    explanation: 'La tasa real aproxima rendimiento nominal menos inflación (4% - 6% = -2%): tu saldo sube en número pero compra menos cosas.',
  },
  {
    id: 'fq-9',
    difficulty: 'avanzado',
    question: 'Al evaluar un gasto recurrente (ej. S/ 50/mes en suscripciones poco usadas), ¿qué indicador muestra mejor su costo real?',
    options: ['El costo anualizado y su costo de oportunidad invertido a 5-10 años', 'Solo el pago de este mes', 'El descuento promocional del primer mes', 'Compararlo con el sueldo de otra persona'],
    correctIndex: 0,
    explanation: 'S/ 50/mes son S/ 600/año y más de S/ 8,500 en 10 años invertidos al 7% anual. Auditar suscripciones trimestralmente protege tu flujo.',
  },
  {
    id: 'fq-10',
    difficulty: 'avanzado',
    question: '¿Qué principio reduce el riesgo específico sin eliminar el crecimiento a largo plazo al invertir?',
    options: ['Concentrar todo en una sola empresa conocida', 'Diversificar entre activos/sectores con horizonte claro y costos bajos', 'Entrar y salir cada semana según noticias', 'Usar apalancamiento máximo'],
    correctIndex: 1,
    explanation: 'La diversificación disciplinada con bajas comisiones reduce el riesgo de pérdida permanente por un fallo aislado.',
  },
];

export interface CompoundYearPoint {
  year: number;
  contributed: number;
  balance: number;
  interest: number;
}

export function computeCompoundInterest(
  initial: number,
  monthlyContribution: number,
  annualRatePct: number,
  years: number
): {
  totalBalance: number;
  totalContributed: number;
  totalInterest: number;
  timeline: CompoundYearPoint[];
} {
  const init = Math.max(0, Number.isFinite(initial) ? initial : 0);
  const monthly = Math.max(0, Number.isFinite(monthlyContribution) ? monthlyContribution : 0);
  const rate = Math.max(0, Math.min(50, Number.isFinite(annualRatePct) ? annualRatePct : 0)) / 100;
  const yrs = Math.max(1, Math.min(40, Math.round(Number.isFinite(years) ? years : 10)));
  const monthlyRate = rate / 12;

  let balance = init;
  let contributed = init;
  const timeline: CompoundYearPoint[] = [];

  for (let y = 1; y <= yrs; y++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthly;
      contributed += monthly;
    }
    timeline.push({
      year: y,
      contributed: Math.round(contributed),
      balance: Math.round(balance),
      interest: Math.round(Math.max(0, balance - contributed)),
    });
  }

  return {
    totalBalance: Math.round(balance),
    totalContributed: Math.round(contributed),
    totalInterest: Math.round(Math.max(0, balance - contributed)),
    timeline,
  };
}

/* ==================== 4. ENERGIA, POSTURA Y PAUSAS ACTIVAS ==================== */

export interface VitalityStep {
  title: string;
  instruction: string;
  durationSec: number;
}

export interface VitalityRoutine {
  id: string;
  title: string;
  category: 'vista' | 'cuello' | 'espalda' | 'manos' | 'energia';
  difficulty: DifficultyLevel;
  summary: string;
  steps: VitalityStep[];
}

export const VITALITY_ROUTINES: VitalityRoutine[] = [
  {
    id: 'vr-202020',
    title: 'Descanso visual 20-20-20',
    category: 'vista',
    difficulty: 'basico',
    summary: 'Relaja los músculos ciliares tras 20 minutos frente a pantalla y previene fatiga ocular.',
    steps: [
      { title: 'Mirada lejana (6 metros)', instruction: 'Aparta la vista del monitor y enfoca un punto lejano por una ventana o pared opuesta.', durationSec: 20 },
      { title: 'Parpadeo consciente lento', instruction: 'Parpadea suave 10 veces seguidas para lubricar los ojos sin apretar párpados.', durationSec: 15 },
      { title: 'Palming cálido', instruction: 'Frota tus palmas y colócalas ahuecadas sobre los ojos cerrados sin presionar.', durationSec: 20 },
    ],
  },
  {
    id: 'vr-cuello',
    title: 'Descompresión cervical y hombros',
    category: 'cuello',
    difficulty: 'basico',
    summary: 'Libera tensión acumulada en trapecio, cuello y mandíbula por estudiar inclinado.',
    steps: [
      { title: 'Retracción de mentón', instruction: 'Siéntate erguido y desliza el mentón suavemente hacia atrás alineando orejas con hombros.', durationSec: 20 },
      { title: 'Inclinación lateral derecha', instruction: 'Lleva la oreja derecha hacia el hombro derecho manteniendo el hombro izquierdo bajo.', durationSec: 25 },
      { title: 'Inclinación lateral izquierda', instruction: 'Cambia de lado con suavidad y exhala largo mientras sueltas la mandíbula.', durationSec: 25 },
      { title: 'Círculos lentos de hombros', instruction: 'Rota ambos hombros hacia atrás en círculos amplios abriendo el pecho.', durationSec: 20 },
    ],
  },
  {
    id: 'vr-manos',
    title: 'Muñecas y dedos (teclado / dibujo)',
    category: 'manos',
    difficulty: 'basico',
    summary: 'Previene rigidez de antebrazos y túnel carpiano en sesiones largas de código o escritura.',
    steps: [
      { title: 'Extensión de flexores', instruction: 'Extiende un brazo al frente con palma arriba y jala suave los dedos hacia abajo (alterna ambos lados).', durationSec: 30 },
      { title: 'Flexión dorsal suave', instruction: 'Palma mirando hacia ti, presiona suavemente el dorso de la mano 15s por lado.', durationSec: 30 },
      { title: 'Abanico de dedos y sacudida', instruction: 'Abre los dedos al máximo, cierra suave y sacude las manos relajadas.', durationSec: 20 },
    ],
  },
  {
    id: 'vr-espalda',
    title: 'Reset postural de espalda y pecho',
    category: 'espalda',
    difficulty: 'intermedio',
    summary: 'Contrarresta la postura encorvada abriendo caja torácica y activando escápulas.',
    steps: [
      { title: 'Apertura de pecho en marco o silla', instruction: 'Entrelaza dedos atrás de la espalda y junta suavemente los omóplatos respirando hondo.', durationSec: 30 },
      { title: 'Torsión torácica sentada', instruction: 'Con espalda larga, gira el torso hacia la derecha apoyando la mano en el respaldo (15s por lado).', durationSec: 30 },
      { title: 'Extensión de pie hacia el techo', instruction: 'Ponte de pie, estira ambos brazos arriba y alarga la columna sin arquear la lumbar.', durationSec: 25 },
      { title: 'Balanceo suave de cadera', instruction: 'Camina 15 pasos en el sitio soltando brazos para reactivar circulación.', durationSec: 25 },
    ],
  },
  {
    id: 'vr-energia',
    title: 'Recarga rápida anti-somnolencia (3 min)',
    category: 'energia',
    difficulty: 'intermedio',
    summary: 'Reactiva circulación y alerta mental en la tarde sin depender de cafeína extra.',
    steps: [
      { title: 'Marcha activa con rodillas medias', instruction: 'Ponte de pie y marcha con ritmo ágil moviendo los brazos coordinados.', durationSec: 40 },
      { title: 'Sentadillas suaves controladas', instruction: 'Haz 10 a 12 sentadillas cómodas con espalda neutra y peso en los talones.', durationSec: 40 },
      { title: 'Respiración nasal energizante', instruction: 'Inhala profundo expandiendo costillas y exhala limpio por la boca 6 veces.', durationSec: 30 },
      { title: 'Hidratación inmediata', instruction: 'Toma un vaso completo de agua antes de volver a tu bloque de estudio.', durationSec: 20 },
    ],
  },
  {
    id: 'vr-full',
    title: 'Pausa integral completa (5 min)',
    category: 'espalda',
    difficulty: 'avanzado',
    summary: 'Secuencia completa de cabeza a pies para mitad de jornada académica o laboral.',
    steps: [
      { title: 'Movilidad cervical y hombros', instruction: 'Retracción de mentón y 10 círculos amplios de hombros hacia atrás.', durationSec: 45 },
      { title: 'Estiramiento de muñecas y brazos', instruction: 'Alterna estiramiento de flexores, extensores y rotación suave de muñecas.', durationSec: 45 },
      { title: 'Gato-Vaca de pie (manos en muslos)', instruction: 'Flexiona suavemente rodillas, arquea y redondea la espalda al ritmo de tu respiración.', durationSec: 50 },
      { title: 'Estiramiento de cadera y pantorrillas', instruction: 'Da un paso largo atrás alternando pierna para abrir flexores de cadera.', durationSec: 60 },
      { title: 'Enfoque visual 20-20-20 y postura base', instruction: 'Mira lejos, alinea pantalla a altura de ojos y apoya ambos pies planos en el suelo.', durationSec: 40 },
    ],
  },
];

export const POSTURE_CHECKLIST = [
  { id: 'eyes', label: 'Borde superior de la pantalla a la altura de los ojos' },
  { id: 'feet', label: 'Ambos pies apoyados planos en el suelo (sin cruzar piernas largo rato)' },
  { id: 'shoulders', label: 'Hombros sueltos abajo y codos cerca de 90 grados' },
  { id: 'neck', label: 'Cuello alineado sobre los hombros sin adelantar la cabeza' },
  { id: 'water', label: 'Vaso o botella de agua visible en el escritorio' },
];
