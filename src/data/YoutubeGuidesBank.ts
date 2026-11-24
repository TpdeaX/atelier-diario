import type { ModuleId } from '../types.ts';

export interface YoutubeQueryLink {
  label: string;
  query: string;
}

export interface GuideStage {
  level: 'Principiante' | 'Intermedio' | 'Avanzado';
  stepKey: string;
  goal: string;
  watchOut: string;
  youtubeLinks: YoutubeQueryLink[];
}

export interface LearningGuideTopic {
  id: string;
  title: string;
  category: 'arte' | 'cuerpo' | 'mente' | 'practico';
  summary: string;
  insideApp: string;
  internalRoute?: ModuleId;
  externalArenaHint?: string;
  stages: GuideStage[];
}

export function buildYoutubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
}

export const YOUTUBE_GUIDES_BANK: LearningGuideTopic[] = [
  {
    id: 'origami',
    title: 'Origami (Papiroflexia)',
    category: 'arte',
    summary: 'Precisión manual, geometría espacial y calma activa doblando papel sin pegamento ni tijeras.',
    insideApp: 'Actividad física externa con papel: aquí llevas tu mapa de progresión, marcas etapas dominadas y anotas tus modelos favoritos.',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'origami:1',
        goal: 'Dominar pliegues base (valle, montaña, base bomba de agua y base pájaro) y figuras clásicas limpias.',
        watchOut: 'Alinea siempre esquinas antes de marcar el doblez con la uña; un error de 2 mm al inicio se multiplica al final.',
        youtubeLinks: [
          { label: 'Bases del origami desde cero', query: 'origami para principiantes pliegues basicos paso a paso español' },
          { label: 'Grulla tradicional paso a paso', query: 'como hacer grulla de origami tradicional lento español' },
          { label: '5 figuras fáciles sin tijeras', query: 'origami facil figuras animales paso a paso español' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'origami:2',
        goal: 'Construir origami modular (kusudama, cubos Sonobe) y figuras animales con cambios de color.',
        watchOut: 'Usa papel cuadrado exacto y delgado (70-80 g); el papel muy grueso deforma las uniones modulares.',
        youtubeLinks: [
          { label: 'Origami modular Sonobe', query: 'origami modular sonobe kusudama paso a paso español' },
          { label: 'Dragón y animales intermedios', query: 'origami intermedio animales tutorial detallado español' },
          { label: 'Cajas y sobres funcionales', query: 'caja origami masu tapa paso a paso español' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'origami:3',
        goal: 'Leer patrones de pliegue (Crease Patterns), técnica wet-folding y modelos complejos.',
        watchOut: 'Pre-marca los dobleces con paciencia antes de colapsar la base; forzar el papel rompe las fibras.',
        youtubeLinks: [
          { label: 'Cómo leer Crease Patterns', query: 'como leer crease patterns origami tutorial español' },
          { label: 'Técnica Wet Folding explicada', query: 'origami wet folding tecnica papel tutorial' },
          { label: 'Origami complejo paso a paso', query: 'complex origami tutorial step by step Jo Nakashima' },
        ],
      },
    ],
  },
  {
    id: 'dibujo',
    title: 'Dibujo y Anatomía Visual',
    category: 'arte',
    summary: 'Construye volumen, perspectiva, luces y figura humana desde fundamentos sólidos.',
    insideApp: 'Practica diariamente en Taller de Dibujo (#drawing) con las 56 láminas guiadas, perspectiva de 1-2 puntos, simetría y referencias Wikimedia/Museo CC0.',
    internalRoute: 'drawing',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'dibujo:1',
        goal: 'Soltar el trazo desde el hombro, dibujar cajas/esferas/cilindros en 3D y medir proporciones.',
        watchOut: 'Evita líneas peludas cortitas; haz trazos seguros y construye formas grandes antes del detalle.',
        youtubeLinks: [
          { label: 'Fundamentos de dibujo 3D', query: 'como aprender a dibujar desde cero formas basicas perspectiva español' },
          { label: 'Ejercicios de pulso y trazos', query: 'ejercicios soltar la mano dibujo drawabox español' },
          { label: 'Sombras y valores básicos', query: 'luz y sombra esfera dibujo valores tonales español' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'dibujo:2',
        goal: 'Dominar cabeza método Loomis, gesto dinámico de figura humana y perspectiva a 2 puntos.',
        watchOut: 'No copies contornos planos; piensa siempre en el plano frontal, lateral y volumen que gira en el espacio.',
        youtubeLinks: [
          { label: 'Cabeza y rostro método Loomis', query: 'metodo loomis cabeza dibujo paso a paso español' },
          { label: 'Dibujo de gesto (Gesture)', query: 'dibujo de gesto figura humana proko español' },
          { label: 'Perspectiva 1 y 2 puntos', query: 'perspectiva 1 y 2 puntos de fuga dibujo arquitectonico español' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'dibujo:3',
        goal: 'Anatomía aplicada (manos, pliegues de ropa), composición y narrativa visual.',
        watchOut: 'Equilibra estudios de referencia real con dibujos de imaginación para evitar depender solo del calco.',
        youtubeLinks: [
          { label: 'Cómo dibujar manos fácil', query: 'como dibujar manos anatomia simplificada español' },
          { label: 'Composición y valor tonal', query: 'composicion dibujo ilustracion valores narrativa visual español' },
        ],
      },
    ],
  },
  {
    id: 'caligrafia',
    title: 'Caligrafía y Letra Legible',
    category: 'arte',
    summary: 'Mejora tu letra diaria, consistencia de altura, ritmo e inclinación a 55 grados.',
    insideApp: 'Usa Taller de Caligrafía (#calligraphy) para entrenar trazos base, imprenta, cursiva, números y ritmo con pauta 55°.',
    internalRoute: 'calligraphy',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'caligrafia:1',
        goal: 'Agarre relajado del lápiz/pluma, postura de muñeca y trazos rectos/óvalos uniformes.',
        watchOut: 'No aprietes el bolígrafo con los dedos rígidos; la tensión cansa la mano y quiebra la fluidez.',
        youtubeLinks: [
          { label: 'Mejorar la letra paso a paso', query: 'como mejorar la letra caligrafia ejercicios basicos español' },
          { label: 'Agarre correcto y postura', query: 'como sostener correctamente el lapiz caligrafia evitar cansancio' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'caligrafia:2',
        goal: 'Consistencia en altura-x, espaciado entre letras y cursiva fluida tipo Palmer.',
        watchOut: 'Escribe más lento de lo habitual durante la práctica; la velocidad llega sola cuando la forma es automática.',
        youtubeLinks: [
          { label: 'Método Palmer cursiva', query: 'metodo palmer caligrafia cursiva ejercicios español' },
          { label: 'Espaciado y ritmo en escritura', query: 'ejercicios espaciado uniforme letra bonita español' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'caligrafia:3',
        goal: 'Brush lettering, pluma estilográfica o estilo Copperplate/Itálica con modulación de trazo.',
        watchOut: 'Recuerda la regla de oro: trazos hacia abajo gruesos con presión, hacia arriba finos y ligeros.',
        youtubeLinks: [
          { label: 'Caligrafía itálica / plumilla', query: 'caligrafia italica pluma biselada tutorial principiantes español' },
          { label: 'Lettering con rotulador pincel', query: 'brush lettering trazos basicos paso a paso español' },
        ],
      },
    ],
  },
  {
    id: 'canto',
    title: 'Canto, Técnica Vocal y Oído',
    category: 'arte',
    summary: 'Respiración diafragmática, afinación limpia, resonancia sin forzar garganta y oído musical.',
    insideApp: 'Entrena en Estudio de Canto (#singing) con afinador en vivo, 34 canciones karaoke, calentamiento de 5 min y entrenamiento de oído.',
    internalRoute: 'singing',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'canto:1',
        goal: 'Respiración costo-diafragmática, relajación laríngea y afinación estable en tu tesitura cómoda.',
        watchOut: 'Nunca levantes la barbilla ni empujes aire en exceso para llegar a agudos; eso tensa las cuerdas vocales.',
        youtubeLinks: [
          { label: 'Respiración diafragmática canto', query: 'respiracion diafragmatica apoyo vocal canto tutorial español' },
          { label: 'Calentamiento vocal lip trills', query: 'calentamiento vocal 5 minutos lip trill principiantes español' },
          { label: 'Cómo afinar la voz desde cero', query: 'como mejorar la afinacion al cantar ejercicios español' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'canto:2',
        goal: 'Conectar voz de pecho y voz de cabeza (voz mixta) sin quiebres bruscos en el pasaje.',
        watchOut: 'Practica primero con vocales cerradas suaves (U, I, «nay») a volumen moderado antes de cantar fuerte.',
        youtubeLinks: [
          { label: 'Voz mixta sin forzar', query: 'como sacar voz mixta canto ejercicios paso a paso español' },
          { label: 'Eliminar tensión de garganta', query: 'como cantar sin forzar la garganta ejercicios relajacion laringea' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'canto:3',
        goal: 'Control de vibrato natural, dinámicas expresivas, agilidad vocal y armonización de oído.',
        watchOut: 'El vibrato real nace de relajación y flujo de aire constante, nunca sacudiendo la mandíbula.',
        youtubeLinks: [
          { label: 'Vibrato natural y dinámicas', query: 'como desarrollar vibrato natural canto tecnica vocal español' },
          { label: 'Agilidad y melismas limpios', query: 'ejercicios agilidad vocal melismas riffs canto español' },
        ],
      },
    ],
  },
  {
    id: 'postura',
    title: 'Postura, Ergonomía y Fisioterapia',
    category: 'cuerpo',
    summary: 'Corrige cabeza adelantada, hombros caídos y rigidez lumbar con movilidad segura basada en fisioterapia.',
    insideApp: 'Usa Postura Pro (#vitality): mapa corporal interactivo, monitor postural local por webcam, evaluación 0-100 y Plan Correctivo de 21 días.',
    internalRoute: 'vitality',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'postura:1',
        goal: 'Configurar escritorio ergonómico y dominar retracción cervical (chin tuck) + descansos 20-20-20.',
        watchOut: 'En el chin tuck desliza la cabeza hacia atrás horizontalmente sin inclinar el mentón hacia abajo o arriba.',
        youtubeLinks: [
          { label: 'Corregir cuello adelantado (fisioterapia)', query: 'ejercicios cabeza adelantada cuello texto fisioterapia español' },
          { label: 'Ergonomía correcta en PC', query: 'ergonomia escritorio computadora altura monitor silla fisioterapia' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'postura:2',
        goal: 'Abrir columna torácica, fortalecer espalda media (escapular) y soltar flexores de cadera acortados.',
        watchOut: 'Nunca fuerces dolor punzante o adormecimiento; el estiramiento debe sentirse como alivio firme, nunca agudo.',
        youtubeLinks: [
          { label: 'Movilidad torácica y hombros', query: 'ejercicios movilidad toracica hombros redondeados fisioterapia español' },
          { label: 'Alivio lumbar por estar sentado', query: 'rutina fisioterapia dolor lumbar estar mucho tiempo sentado' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'postura:3',
        goal: 'Estabilidad de core profundo (McGill Big 3) y resistencia postural durante jornadas largas.',
        watchOut: 'La mejor postura es la siguiente postura: alterna posición cada 45-60 min incluso con silla ergonómica.',
        youtubeLinks: [
          { label: 'McGill Big 3 estabilidad lumbar', query: 'mcgill big 3 ejercicios espalda baja explicacion fisioterapia español' },
          { label: 'Fortalecimiento escapular sin equipo', query: 'ejercicios escapulas YTWL en casa postura espalda alta' },
        ],
      },
    ],
  },
  {
    id: 'cocina',
    title: 'Cocina Práctica Alta en Proteína',
    category: 'cuerpo',
    summary: 'Aprende técnicas base de sartén, sazonado y meal-prep realista en 10-15 minutos con ingredientes accesibles.',
    insideApp: 'Complementa el recetario rápido y checklist nutricional dentro de Postura Pro (#vitality → Recuperación y Nutrición).',
    internalRoute: 'vitality',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'cocina:1',
        goal: 'Técnica segura de cuchillo, control de temperatura en sartén y cocción perfecta de huevos, arroz y pollo.',
        watchOut: 'Precalienta la sartén antes de echar el aceite y no llenes en exceso el fondo o la carne se hervirá en vez de dorarse.',
        youtubeLinks: [
          { label: 'Bases de cocina para principiantes', query: 'como aprender a cocinar desde cero tecnicas basicas sarten cuchillo' },
          { label: 'Desayunos altos en proteína 10 min', query: 'desayunos altos en proteina rapidos 10 minutos economicos' },
          { label: 'Pechuga de pollo jugosa siempre', query: 'como hacer pechuga de pollo a la plancha jugosa truco' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'cocina:2',
        goal: 'Salteados balanceados, aderezos caseros saludables y menestras/quinua listas para la semana.',
        watchOut: 'Equilibra siempre 4 pilares de sabor: sal, ácido (limón/vinagre), grasa saludable y especias aromáticas.',
        youtubeLinks: [
          { label: 'Meal prep económico para la semana', query: 'meal prep semanal economico alto en proteina facil' },
          { label: 'Recetas rápidas con atún y quinua', query: 'recetas faciles saludables con quinua atun lentejas' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'cocina:3',
        goal: 'Improvisar comidas nutritivas con lo que haya en casa, salsas ligeras y cocina por lotes eficiente.',
        watchOut: 'Mantén una despensa base (huevos, avena, legumbres, verduras congeladas, aceite de oliva, limón y especias).',
        youtubeLinks: [
          { label: 'Cocinar sin recetas (estructura)', query: 'como cocinar sin recetas fundamentos combinacion sabores' },
          { label: 'Batch cooking en 1 hora', query: 'batch cooking 1 hora comidas saludables toda la semana' },
        ],
      },
    ],
  },
  {
    id: 'ajedrez',
    title: 'Ajedrez (Táctica y Estrategia)',
    category: 'mente',
    summary: 'Cálculo ordenado, patrones tácticos, finales esenciales y control del centro sin memorizar líneas vacías.',
    insideApp: 'Juega y entrena patrones en OMNI ARENA (academia de Ajedrez) y refuerza enfoque visual con Tabla de Schulte (#focuslab).',
    internalRoute: 'focuslab',
    externalArenaHint: 'Disponible en OMNI ARENA · Academia de Ajedrez',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'ajedrez:1',
        goal: 'Principios de apertura (centro, desarrollo, enroque), mates básicos y evitar colgar piezas.',
        watchOut: 'Antes de mover, haz el chequeo CCA: ¿Qué Jaques, Capturas y Amenazas tiene mi rival?',
        youtubeLinks: [
          { label: 'Principios de ajedrez desde cero', query: 'principios basicos ajedrez principiantes apertura centro enroque' },
          { label: 'Mates elementales y táctica base', query: 'patrones tacticos ajedrez clavada doble tenedor principiantes' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'ajedrez:2',
        goal: 'Reconocer motivos tácticos en segundos, finales de peones/torres y plan en el medio juego.',
        watchOut: 'No estudies 15 aperturas; domina 1 respuesta sólida con blancas y 1 con negras, y dedica 60% a táctica y finales.',
        youtubeLinks: [
          { label: 'Finales imprescindibles de peones', query: 'finales de peones oposicion regla del cuadrado ajedrez español' },
          { label: 'Cómo pensar en el medio juego', query: 'como elaborar un plan en el medio juego ajedrez estrategia' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'ajedrez:3',
        goal: 'Estructuras de peones, cálculo profundo de variantes forzadas y análisis de partidas propias.',
        watchOut: 'Analiza primero tus partidas perdidas sin módulo para detectar dónde falló tu razonamiento real.',
        youtubeLinks: [
          { label: 'Estructuras de peones explicadas', query: 'estructuras de peones ajedrez estrategia intermedia avanzada español' },
          { label: 'Técnica de cálculo profundo', query: 'como calcular variantes en ajedrez jugadas candidatas' },
        ],
      },
    ],
  },
  {
    id: 'rubik',
    title: 'Cubo Rubik (Principiante a CFOP)',
    category: 'mente',
    summary: 'Memoria espacial, agilidad de dedos (fingertricks) y transición limpia del método principiante a CFOP.',
    insideApp: 'Actividad manual física: usa esta ruta para seguir tu progresión paso a paso y anotar tus mejores tiempos y algoritmos.',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'rubik:1',
        goal: 'Resolver el cubo 3x3 completo sin apuntes con el método por capas y entender notación básica (R, U, F, L).',
        watchOut: 'Aprende el porqué de cada paso en vez de solo repetir letras; evita girar con toda la muñeca.',
        youtubeLinks: [
          { label: 'Resolver 3x3 método principiante', query: 'como armar cubo rubik 3x3 metodo principiantes facil español' },
          { label: 'Notación y fingertricks básicos', query: 'fingertricks basicos cubo rubik notacion R U F español' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'rubik:2',
        goal: 'Dominar Cruz en la base, F2L intuitivo y 2-Look OLL / 2-Look PLL para bajar de 30 segundos.',
        watchOut: 'Al pasar a F2L intuitivo tus tiempos subirán primero unos días: es completamente normal mientras tu vista se adapta.',
        youtubeLinks: [
          { label: 'F2L intuitivo paso a paso', query: 'f2l intuitivo cubo rubik tutorial completo español' },
          { label: '2-Look OLL y PLL fácil', query: '2 look oll y pll reducido cubo rubik español' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'rubik:3',
        goal: 'Lookahead sin pausas, PLL completo (21 algoritmos) y planificación de cruz en inspección de 15s.',
        watchOut: 'Practica giros lentos continuos sin detenerte a buscar piezas: fluidez vence a girar rápido con pausas.',
        youtubeLinks: [
          { label: 'Lookahead y bajar de 20s', query: 'como mejorar lookahead cubo rubik sub 20 español' },
          { label: 'PLL completo con fingertricks', query: 'todos los algoritmos pll cubo rubik fingertricks español' },
        ],
      },
    ],
  },
  {
    id: 'instrumentos',
    title: 'Instrumentos Musicales (Piano / Guitarra)',
    category: 'arte',
    summary: 'Postura relajada, ritmo con metrónomo, acordes limpios e independencia de manos.',
    insideApp: 'Usa el teclado interactivo y entrenamiento de oído de Estudio de Canto (#singing) y las academias musicales de OMNI ARENA.',
    internalRoute: 'singing',
    externalArenaHint: 'Disponible en OMNI ARENA · Academias de Piano, Cuerdas y Batería',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'instrumentos:1',
        goal: 'Postura sin tensión, acordes abiertos/tríadas mayores y menores, y cambio a tiempo con metrónomo lento.',
        watchOut: 'Nunca practiques rápido con errores; 10 minutos diarios a 60 BPM limpio valen más que 2 horas atropelladas.',
        youtubeLinks: [
          { label: 'Piano desde cero (postura y acordes)', query: 'curso piano desde cero principiantes acordes postura español' },
          { label: 'Guitarra desde cero sin dolor', query: 'clases guitarra principiantes desde cero acordes basicos español' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'instrumentos:2',
        goal: 'Independencia de manos / rasgueos rítmicos variados, cejilla limpia e inversiones de acordes.',
        watchOut: 'Divide cada canción difícil en compases de 2 a 4 tiempos y domina la transición antes de unir todo.',
        youtubeLinks: [
          { label: 'Independencia de manos en piano', query: 'ejercicios independencia de manos piano principiante intermedio' },
          { label: 'Dominar cejilla y ritmos guitarra', query: 'como hacer cejilla guitarra facil ejercicios ritmos español' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'instrumentos:3',
        goal: 'Sacar canciones de oído, armonía funcional (progresiones II-V-I) e improvisación melódica.',
        watchOut: 'Escucha el bajo primero para identificar la progresión armónica de cualquier tema.',
        youtubeLinks: [
          { label: 'Armonía práctica para tocar de oído', query: 'armonia musical funcional sacar canciones de oido tutorial español' },
          { label: 'Improvisación con escalas y motivos', query: 'como improvisar musica escalas pentatonica fraseo español' },
        ],
      },
    ],
  },
  {
    id: 'oratoria',
    title: 'Oratoria y Presencia Escénica',
    category: 'mente',
    summary: 'Estructura clara, voz proyectada, pausas con seguridad y lenguaje corporal natural.',
    insideApp: 'Practica en Oratoria y Enfoque (#focuslab) con destructor de muletillas en vivo y en Social y Carrera (#career) con simulador de entrevistas.',
    internalRoute: 'focuslab',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'oratoria:1',
        goal: 'Sustituir muletillas por pausas de 1 segundo y hablar con estructura de 3 puntos (Inicio-Cuerpo-Cierre).',
        watchOut: 'Grábate 60 segundos y escúchate: detectarás en 1 minuto hábitos que nadie te dice.',
        youtubeLinks: [
          { label: 'Cómo eliminar muletillas al hablar', query: 'como dejar de decir muletillas hablar en publico ejercicios' },
          { label: 'Estructura clara para exponer', query: 'como estructurar una exposicion o presentacion efectiva' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'oratoria:2',
        goal: 'Modulación de tono y ritmo, contacto visual distribuido y storytelling breve con ejemplos reales.',
        watchOut: 'Evita memorizar palabra por palabra; memoriza los 3 bloques clave y explica con naturalidad.',
        youtubeLinks: [
          { label: 'Lenguaje corporal y manos', query: 'lenguaje corporal manos postura al hablar en publico' },
          { label: 'Storytelling práctico en 2 minutos', query: 'tecnicas storytelling presentaciones profesionales español' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'oratoria:3',
        goal: 'Improvisación estructurada (PREP / STAR), manejo de preguntas difíciles y persuasión ejecutiva.',
        watchOut: 'Cuando recibas una pregunta difícil, respira 2 segundos, valida la pregunta y responde primero la conclusión.',
        youtubeLinks: [
          { label: 'Improvisar con claridad (PREP)', query: 'tecnica PREP improvisar hablar claro sin trabarse' },
          { label: 'Responder preguntas difíciles con aplomo', query: 'como responder preguntas dificiles en exposicion entrevista' },
        ],
      },
    ],
  },
  {
    id: 'finanzas',
    title: 'Finanzas Personales e Inversión Prudente',
    category: 'practico',
    summary: 'Control de flujo mensual, fondo de emergencia, entender inflación/tasas e inversión pasiva diversificada.',
    insideApp: 'Usa Finanzas Personales (#finance) para registrar tu 50/30/20, calcular interés compuesto y entrenar criterio financiero.',
    internalRoute: 'finance',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'finanzas:1',
        goal: 'Presupuesto 50/30/20 real, eliminar deuda cara de tarjeta y armar fondo de emergencia de 3-6 meses.',
        watchOut: 'Desconfía de cualquier promesa de retornos rápidos sin riesgo; las finanzas sanas empiezan por flujo positivo.',
        youtubeLinks: [
          { label: 'Finanzas personales desde cero', query: 'finanzas personales desde cero presupuesto ahorro fondo emergencia' },
          { label: 'Cómo usar tarjeta de crédito bien', query: 'como usar tarjeta de credito sin pagar intereses guia' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'finanzas:2',
        goal: 'Entender tasa real vs. inflación, cuentas de alto rendimiento, depósitos y costo de oportunidad.',
        watchOut: 'Evalúa siempre comisiones anuales y liquidez antes de mover dinero a cualquier instrumento.',
        youtubeLinks: [
          { label: 'Interés compuesto e inflación', query: 'interes compuesto inflacion tasa real explicacion facil' },
          { label: 'Instrumentos de renta fija básicos', query: 'renta fija depositos cuentas ahorro invertir principiantes latinoamerica' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'finanzas:3',
        goal: 'Inversión diversificada a largo plazo (fondos indexados/ETFs), horizonte y manejo emocional.',
        watchOut: 'Invierte solo dinero que no necesites en el corto plazo y entiende bien impuestos locales antes de operar.',
        youtubeLinks: [
          { label: 'Fondos indexados y ETFs explicados', query: 'que son fondos indexados ETF diversificacion largo plazo español' },
          { label: 'Psicología del inversionista', query: 'psicologia del dinero errores comunes inversionistas largo plazo' },
        ],
      },
    ],
  },
  {
    id: 'fotografia',
    title: 'Fotografía Móvil y Composición',
    category: 'practico',
    summary: 'Saca fotos nítidas y con intención usando solo el celular: luz natural, encuadre y edición sutil.',
    insideApp: 'Actividad práctica externa: combina observación visual del Taller de Dibujo (#drawing) con esta ruta guiada.',
    internalRoute: 'drawing',
    stages: [
      {
        level: 'Principiante',
        stepKey: 'fotografia:1',
        goal: 'Activar cuadrícula de tercios, limpiar lente, controlar exposición manual tocando la pantalla y buscar luz suave.',
        watchOut: 'Evita el zoom digital y la luz dura del mediodía directo al rostro; busca sombra abierta o hora dorada.',
        youtubeLinks: [
          { label: 'Fotografía móvil desde cero', query: 'curso fotografia con celular principiantes composicion luz' },
          { label: 'Regla de tercios y líneas guía', query: 'composicion fotografica regla de tercios lineas guia ejemplos' },
        ],
      },
      {
        level: 'Intermedio',
        stepKey: 'fotografia:2',
        goal: 'Retratos naturales, profundidad de campo, ángulos creativos y manejo del modo Pro (ISO y velocidad).',
        watchOut: 'Cuida el fondo tanto como el sujeto: evita postes o elementos distractores saliendo detrás de la cabeza.',
        youtubeLinks: [
          { label: 'Modo Pro del celular explicado', query: 'como usar modo pro camara celular iso obturacion balance blancos' },
          { label: 'Retratos naturales con luz de ventana', query: 'retratos con luz natural ventana celular consejos' },
        ],
      },
      {
        level: 'Avanzado',
        stepKey: 'fotografia:3',
        goal: 'Edición equilibrada de color y contraste (Lightroom Mobile / Snapseed) y series fotográficas con historia.',
        watchOut: 'Menos es más en edición: evita saturación extrema o HDR artificial que destruye textura natural.',
        youtubeLinks: [
          { label: 'Edición limpia en Lightroom Mobile', query: 'editar fotos natural lightroom mobile snapseed tutorial español' },
          { label: 'Narrativa visual y color', query: 'teoria del color fotografia composicion avanzada storytelling' },
        ],
      },
    ],
  },
];

export function getGuidesForModule(moduleId: ModuleId): LearningGuideTopic[] {
  const map: Partial<Record<ModuleId, string[]>> = {
    drawing: ['dibujo', 'fotografia'],
    calligraphy: ['caligrafia', 'origami'],
    singing: ['canto', 'instrumentos'],
    vitality: ['postura', 'cocina'],
    focuslab: ['oratoria', 'ajedrez'],
    finance: ['finanzas'],
  };
  const ids = map[moduleId] ?? [];
  return YOUTUBE_GUIDES_BANK.filter((t) => ids.includes(t.id));
}
