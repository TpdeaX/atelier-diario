import { Icons } from '../icons';
import { lifeStore } from '../state/LifeStore';
import { DeviceProfile, DifficultyLevel } from '../types';
import { bindDidacticBar, difficultyLabel, renderDidacticBar } from '../ui/DidacticBar';
import { bindTutorialBanners, renderTutorialBanner, SectionTutorialSpec } from '../ui/TutorialBanner';

type PcDrill = 'accents' | 'speed' | 'classic';
type MobileDrill = 'agile' | 'orthowords' | 'sprint30';
type PcMode = 'accents' | 'speed' | 'classic' | 'filas' | 'codigo' | 'adaptativo';
type MobileMode = 'agile' | 'orthowords' | 'sprint30' | 'precision' | 'frases';

const PC_MODE_LABELS: Record<PcMode, string> = {
  accents: 'Con tildes',
  speed: 'Velocidad pura',
  classic: 'Párrafo clásico',
  filas: 'Filas guía',
  codigo: 'Código TS/SQL',
  adaptativo: 'Adaptativo',
};

const MOBILE_MODE_LABELS: Record<MobileMode, string> = {
  agile: 'Frases ágiles',
  orthowords: 'Tildes rápidas',
  sprint30: 'Ráfaga 30s',
  precision: 'Precisión ñ/tildes',
  frases: 'Frases largas',
};

const GOAL_WPM_BY_DIFF: Record<DifficultyLevel, number> = {
  basico: 30,
  intermedio: 50,
  avanzado: 70,
};

const DIFFICULTY_HINTS: Record<DifficultyLevel, string> = {
  basico: 'Meta 30 PPM · teclado guía y dedos visibles para priorizar precisión.',
  intermedio: 'Meta 50 PPM · cadencia estable con guía opcional.',
  avanzado: 'Meta 70 PPM · ritmo exigente sin guía visual obligatoria.',
};

const TYPING_TUTORIALS: Record<string, Omit<SectionTutorialSpec, 'id' | 'moduleName'>> = {
  'pc:accents': {
    sectionName: 'PC · Con tildes',
    summary: 'Entrena precisión ortográfica con tildes, diéresis, eñe y signos de apertura.',
    steps: [
      'Coloca los índices sobre F y J (las marcas táctiles) antes de empezar.',
      'Escribe siguiendo el texto resaltado; el reloj arranca con tu primera tecla.',
      'Activa Guía de dedo para ver el teclado visual y el dedo de la siguiente letra.',
      'Al terminar, revisa tus teclas débiles y pulsa Siguiente reto.',
    ],
    tip: 'No busques velocidad máxima hoy: 97% de precisión acelera más que corregir errores.',
  },
  'pc:speed': {
    sectionName: 'PC · Velocidad pura',
    summary: 'Construye cadencia constante sin pausas sobre la fila base en minúsculas.',
    steps: [
      'Mantén la vista en la palabra siguiente en lugar de mirar el teclado.',
      'Conserva un ritmo parejo entre letras fáciles y difíciles.',
      'Si fallas una tecla, corrige con calma sin perder la postura de manos.',
      'Supera tu meta de PPM según la dificultad elegida.',
    ],
    tip: 'Relaja hombros y muñecas: la tensión frena los dedos después de 2 minutos.',
  },
  'pc:classic': {
    sectionName: 'PC · Párrafo clásico',
    summary: 'Sostén ritmo y puntuación real en pasajes literarios de dominio público.',
    steps: [
      'Lee la primera línea antes de teclear para anticipar comas y mayúsculas.',
      'Practica Shift alterno (mano opuesta a la letra) para no cortar la fluidez.',
      'Usa Otro texto para rotar entre los 14 pasajes literarios clásicos.',
    ],
    tip: 'Los párrafos largos entrenan resistencia mental y control de errores acumulados.',
  },
  'pc:filas': {
    sectionName: 'PC · Entrenamiento por filas guía',
    summary: 'Domina la memoria muscular separando fila base (ASDF JKLÑ), superior (QWERTY) e inferior (ZXCV).',
    steps: [
      'Mantén siempre el regreso a F y J después de cada desplazamiento.',
      'Observa el teclado visual para confirmar qué dedo alcanza cada fila.',
      'Completa cada bloque sin bajar la mirada y rota con Otro texto.',
    ],
    tip: 'Cinco minutos de filas puras corrigen más vicios que media hora tecleando rápido.',
  },
  'pc:codigo': {
    sectionName: 'PC · Código TypeScript, SQL y HTML',
    summary: 'Practica símbolos, llaves, etiquetas y sintaxis técnica sin perder precisión.',
    steps: [
      'Anticipa signos como paréntesis, puntos y comas, operadores y etiquetas.',
      'Mantén los meñiques relajados al alcanzar llaves, comillas y guiones.',
      'Rota entre fragmentos de TypeScript, SQL y HTML con Otro texto.',
    ],
    tip: 'En código vale más la precisión exacta que la prisa: cada símbolo cuenta.',
  },
  'pc:adaptativo': {
    sectionName: 'PC · Práctica adaptativa',
    summary: 'Genera automáticamente rondas enfocadas en las teclas donde más fallas históricamente.',
    steps: [
      'El sistema analiza tu registro persistente de errores por tecla.',
      'Construye una secuencia de palabras reales que concentran esas letras.',
      'Completa varias rondas limpias para volver fuertes tus teclas débiles.',
    ],
    tip: 'Vuelve a este modo cada semana para eliminar tus tropiezos más repetidos.',
  },
  'mobile:agile': {
    sectionName: 'Celular · Frases ágiles',
    summary: 'Mejora la velocidad natural con ambos pulgares sin depender del autocorrector.',
    steps: [
      'Toca el campo de escritura y reparte las teclas entre pulgar izquierdo y derecho.',
      'Observa las letras en verde o rojo arriba del teclado sin perder la línea.',
      'Completa la frase para guardar tu marca de PPM móvil.',
    ],
    tip: 'Alternar ambos pulgares reduce fatiga y duplica la cadencia en mensajes reales.',
  },
  'mobile:orthowords': {
    sectionName: 'Celular · Tildes rápidas',
    summary: 'Practica escribir acentos y dudas frecuentes con soltura en pantalla táctil.',
    steps: [
      'Mantén pulsada la vocal un instante (o usa la barra de tildes) para acentuar bien.',
      'Verifica cada homófono (a ver / haber, hay / ahí, sino / si no) al teclear.',
      'Pulsa Otro texto para recorrer las 24 frases ortográficas.',
    ],
    tip: 'Escribir bien en el celular también refuerza tu ortografía automática en PC.',
  },
  'mobile:sprint30': {
    sectionName: 'Celular · Ráfaga 30s',
    summary: 'Reto cronometrado de palabras sueltas con medición real de velocidad y precisión.',
    steps: [
      'Escribe la palabra mostrada y pulsa Espacio para validarla y pasar a la siguiente.',
      'El cronómetro de 30 segundos arranca con la primera letra que pulses.',
      'Tu precisión mide palabras acertadas sobre intentos totales.',
    ],
    tip: 'No te apures en la barra espaciadora: confirma mentalmente la última letra antes de enviarla.',
  },
  'mobile:precision': {
    sectionName: 'Celular · Palabras de precisión (tildes y ñ)',
    summary: 'Cadenas cortas cargadas de tildes, diéresis y eñes para entrenar pulgares precisos.',
    steps: [
      'Escribe cada palabra respetando todas las tildes, diéresis y la letra ñ.',
      'Prioriza 95% o más de precisión antes de acelerar.',
      'Rota entre los bloques para reforzar vocales acentuadas en móvil.',
    ],
    tip: 'Dominar la pulsación larga de vocales te evita depender de correcciones automáticas.',
  },
  'mobile:frases': {
    sectionName: 'Celular · Frases largas fluidas',
    summary: 'Sostén ritmo y claridad en mensajes completos de dos o más cláusulas.',
    steps: [
      'Lee la frase completa antes de comenzar para mantener un flujo parejo.',
      'Alterna ambos pulgares con pausas limpias en comas y puntos.',
      'Completa el bloque para registrar tu marca real en mensajes largos.',
    ],
    tip: 'En textos largos de móvil, una cadencia constante supera a las ráfagas apuradas.',
  },
};

const PC_TEXTS: Record<Exclude<PcMode, 'adaptativo'>, string[]> = {
  accents: [
    'La práctica constante convierte el esfuerzo lento en fluidez natural y segura.',
    'Escribir sin mirar el teclado libera tu atención para pensar con más claridad.',
    'Un paso pequeño cada mañana vale más que diez intenciones perfectas sin acción.',
    'La ecuanimidad y el pragmatismo ayudan a resolver problemas complejos con calma.',
    'El pingüino Wenceslao hizo kilómetros bajo exhaustiva lluvia y frío; añoraba a su querido cachorro.',
    '¿Cuántas páginas leíste hoy? Aunque sean pocas, cada línea suma a tu comprensión.',
    'Él sabía que la próxima revisión sería difícil, así que decidió estudiar un poco más.',
    'El murciélago comía feliz cardillo y kiwi mientras la cigüeña tocaba el saxofón.',
    'Después de la reunión, María envió un resumen claro con las tareas y los plazos acordados.',
    '¡Qué alegría! Por fin logré escribir sin mirar el teclado durante cinco minutos seguidos.',
    'La música, la lectura y el ejercicio físico son hábitos que fortalecen la atención.',
    'Aún no sé cuál será el próximo capítulo, pero sí sé que quiero escribirlo con calma.',
    '¿Dónde guardaste el código de acceso? Ojalá esté en la libreta azul junto al lápiz.',
    'El análisis exhaustivo reveló cómo reducir la latencia sin añadir complejidad innecesaria.',
    'Quizás mañana haya llovizna en la montaña; lleva abrigo, té caliente y buena compañía.',
    'La sintaxis clara facilita la colaboración técnica y evita malentendidos costosos.',
    'Ningún método mágico reemplaza quince minutos diarios de práctica enfocada y honesta.',
    'El técnico revisó la conexión inalámbrica, verificó el módulo y registró la solución.',
    '¡Qué rápido pasa el semestre! Conviene repasar hoy antes de que se acumulen exámenes.',
    'La elocuencia nace del orden interior: piensa la idea central y exprésala sin rodeos.',
  ],
  speed: [
    'cada tecla tiene su propio lugar cuando mantienes los dedos sobre la fila base',
    'respirar hondo antes de empezar mejora tu ritmo y reduce los errores al escribir',
    'velocidad sin precision solo genera correcciones busca un paso firme y continuo',
    'dominar la mecanografia te ahorra horas cada semana al estudiar o programar',
    'los dedos indices descansan sobre la f y la j para encontrar el centro sin mirar',
    'un texto claro nace de ideas ordenadas y frases cortas que van directo al punto',
    'la constancia diaria vence al talento que no se entrena con disciplina y paciencia',
    'escribe despacio al principio y deja que la velocidad llegue sola con la practica',
    'mantener la espalda recta y los hombros sueltos evita el cansancio al teclear',
    'cada error es una pista sobre que dedo necesita mas atencion en la siguiente ronda',
    'leer en voz alta mientras escribes ayuda a sentir el ritmo natural de las palabras',
    'una mente tranquila comete menos errores que una mente apurada y dispersa',
    'alterna ambas manos con soltura y evita mirar abajo cuando aparezca una palabra larga',
    'repite los bloques cortos cada tarde para que la memoria muscular trabaje por ti',
    'quien controla el pulso al teclear piensa mejor mientras redacta notas o codigo',
    'mira siempre una palabra por delante para anticipar el movimiento de tus dedos',
    'una sesion breve de diez minutos bien enfocada rinde mas que una hora sin calma',
    'el ritmo parejo suena suave sobre el teclado y evita golpes bruscos en cada tecla',
    'cierra pestanas innecesarias antes de practicar para sostener la atencion continua',
    'cada ronda limpia suma confianza y convierte el teclado en una extension natural',
  ],
  classic: [
    'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.',
    'Volverán las oscuras golondrinas en tu balcón sus nidos a colgar, y otra vez con el ala a sus cristales jugando llamarán.',
    'Nuestras vidas son los ríos que van a dar en la mar, que es el morir; allí van los señoríos derechos a se acabar y consumir.',
    'Caminante, son tus huellas el camino y nada más; caminante, no hay camino, se hace camino al andar.',
    'Con diez cañones por banda, viento en popa a toda vela, no corta el mar, sino vuela un velero bergantín.',
    'Pues sepa vuestra merced, ante todas cosas, que a mí llaman Lázaro de Tormes, hijo de Tomé González y de Antona Pérez.',
    '¿Qué es la vida? Un frenesí. ¿Qué es la vida? Una ilusión, una sombra, una ficción, y el mayor bien es pequeño.',
    'Era del año la estación florida en que el mentido robador de Europa, media luna las armas de su frente, y el Sol todos los rayos de su pelo.',
    'Platero es pequeño, peludo, suave; tan blando por fuera, que se diría todo de algodón, que no lleva huesos.',
    'Recuerde el alma dormida, avive el seso y despierte contemplando cómo se pasa la vida, cómo se viene la muerte tan callando.',
    'Hombres necios que acusáis a la mujer sin razón, sin ver que sois la ocasión de lo mismo que culpáis.',
    'Juventud, divino tesoro, ya te vas para no volver. Cuando quiero llorar, no lloro, y a veces lloro sin querer.',
    'No es verdad, ángel de amor, que en esta apartada orilla más pura la luna brilla y se respira mejor.',
    'Por una mirada, un mundo; por una sonrisa, un cielo; por un beso, yo no sé qué te diera por un beso.',
  ],
  filas: [
    'asdf jklñ fjdk slañ asdf jklñ sala faja hada lada gasa kaja',
    'fila base firme: faja sala gala hada jala lada daña falla halla',
    'qwer tyui opqw erty uiop quiero puerto quieto yerno tuyo poder',
    'fila superior: quieto quiero puerto retiro europeo oportuno tuyo',
    'zxcv bnm, .zxc vbnm zona cava nave bamba calma zumo vaso cima',
    'fila inferior: calma vaca nave bomba zumo cima bazar vecino mambo',
    'asfg hjkl ñlkj hgfd sala fija hada gafa laña falla jala dada',
    'qwrt yiop asdf jklñ poeta quieto puerto faja sala daña lada',
    'zxvc bmn, asdf jklñ campo cambio zumba vaca nave balsa calma',
    'fghj rtyu vbnm fuego jugo fruto rumbo bruma nube humo muro',
    'qaz wsx edc rfv tgb yhn ujm ik, ol. pñ- cada dedo en su columna',
    'mañana señala caña leña piña uña sueño otoño baño año niño',
  ],
  codigo: [
    'const total = items.filter((x) => x.active).reduce((acc, x) => acc + x.score, 0);',
    'export interface LessonState { id: string; mastery: number; completed: boolean; }',
    'SELECT u.nombre, COUNT(s.id) AS sesiones FROM usuarios u LEFT JOIN sesiones s ON s.uid = u.id GROUP BY u.nombre;',
    'async function loadProfile(id: string): Promise<Profile | null> { return await fetchUser(id); }',
    '<section class="al-panel" aria-label="Resumen diario"><h2>Progreso</h2><p>Listo para estudiar.</p></section>',
    'UPDATE tareas SET estado = \'completado\', updated_at = NOW() WHERE prioridad >= 2 AND activo = TRUE;',
    'const mapById = new Map<string, number>(records.map((r) => [r.id, r.points]));',
    'function clamp(value: number, min = 0, max = 100): number { return Math.max(min, Math.min(max, value)); }',
    '<button type="button" class="al-btn al-btn-primary" data-action="save">Guardar cambios</button>',
    'SELECT fecha, AVG(wpm) AS promedio_ppm FROM typing_log WHERE acc >= 90 GROUP BY fecha ORDER BY fecha DESC;',
    'type Result<T> = { ok: true; data: T } | { ok: false; error: string };',
    'const unique = Array.from(new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)));',
  ],
};

const MOBILE_PHRASES: Record<Exclude<MobileMode, 'sprint30'>, string[]> = {
  agile: [
    'Hoy voy a avanzar con calma y orden',
    'Nos vemos después de clases en la biblioteca',
    'Voy por buen camino paso a paso',
    'Primero respiro luego organizo mi tarde',
    'Ya llegué a casa te escribo en un rato',
    'Mañana repaso los apuntes antes del examen',
    'Gracias por la ayuda de hoy fue muy útil',
    'Salgo en diez minutos espérame en la puerta',
    'Hoy terminé la tarea y me siento tranquilo',
    'Avísame cuando llegues para quedarme en paz',
    'Me tomo un descanso y vuelvo con energía',
    'Podemos hablarlo con calma después de cenar',
    'Te mando el archivo revisado en cinco minutos',
    'Prefiero cerrar este pendiente antes de almorzar',
    'Hoy practiqué canto y lectura durante veinte minutos',
    'Guarda las llaves en la mochila para no olvidarlas',
    'Nos juntamos a las cuatro en la entrada principal',
    'Anoté tus sugerencias y ya las apliqué al diseño',
    'Si necesitas una pausa avisa y seguimos mañana',
    'Voy camino al taller llevo mi cuaderno listo',
    'El café de la mañana ayuda a empezar con enfoque',
    'Revisé las pruebas y ahora todo responde rápido',
    'Te llamo apenas salga de la reunión del equipo',
    'Un bloque corto bien hecho vale más que correr',
  ],
  orthowords: [
    'Quizás haya tiempo para revisar la próxima práctica',
    'Aún no sé por qué cambió la fecha del examen',
    'Tuvo la lucidez y templanza para responder bien',
    'Echo el cuaderno en la mochila antes de salir',
    'Vamos a ver si hay suficiente café para todos',
    'Él sí sabe cuándo conviene callar y escuchar',
    'No es que no quiera sino que hoy no puedo',
    'El porqué de su decisión aún nos sorprende',
    'Tú y yo sabemos que mañana habrá más trabajo',
    'Ojalá que la valla del parque ya esté reparada',
    'Se cayó el vaso pero nadie se hizo daño',
    'Hecho el trabajo nos fuimos a descansar',
    'Ahí sobre la mesa hay una taza de té verde',
    'El informe reveló una vasta lista de mejoras',
    'Cruzamos el arroyo antes de llegar a la cima',
    'Prefiero grabar la exposición para pulir mi voz',
    'No recordó dónde había dejado las llaves ayer',
    'El concejo municipal aprobó renovar la plaza',
    'Aun cansado cumplió la meta con serenidad',
    'Se quedó deshecho tras subir por el sendero',
    'La raíz profunda sostiene al árbol en tormenta',
    'Hubo una excepción muy clara en el reglamento',
    'Ella abría la ventana mientras hacía el desayuno',
    'Estábamos yendo hacia el aula cuando sonó el timbre',
  ],
  precision: [
    'mañana piña caña sueño otoño montaña compañía enseñar',
    'música página rápido círculo brújula océano lápiz árbol',
    'pingüino cigüeña vergüenza antigüedad lingüística desagüe',
    'canción atención razón corazón misión visión acción jardín',
    'análisis síntesis énfasis método cálculo módulo código índice',
    'diálogo técnico práctica hábito propósito sólido crédito útil',
    'también después quizás todavía recién además según común',
    'diseño empeño pequeño cariño señal puño dueño sueño',
    'él tú mí sí té dé sé más aún cuál quién dónde cuándo',
    'exámenes imágenes jóvenes orígenes márgenes resúmenes órdenes',
    'raíz país maíz baúl laúd oído caída fría guía día',
    'café sofá papá mamá menú rubí maní colibrí jabalí',
    'águila ópera época éxito último íntimo único ángulo',
    'niñez añoranza cabaña pestaña araña hazaña entraña mañana',
    'revisión conexión decisión precisión comprensión expresión',
    'fácil difícil frágil ágil hábil táctil móvil útil',
  ],
  frases: [
    'Hoy organicé mis tres prioridades antes de abrir el correo, así evité distraerme con tareas urgentes pero poco importantes.',
    'Cuando escribo mensajes largos desde el celular, prefiero revisar las tildes y los signos de puntuación antes de pulsar enviar.',
    'Después de leer quince minutos en silencio, anoté dos ideas concretas para aplicar en mi siguiente exposición académica.',
    'Si notas tensión en las manos al teclear rápido, haz una pausa breve, respira hondo y retoma con un ritmo más parejo.',
    'La constancia diaria en bloques cortos de diez minutos produce resultados más sólidos que estudiar apurado la noche anterior.',
    'Antes de responder en una conversación difícil, conviene escuchar hasta el final y resumir lo que entendimos con calma.',
    'Revisar las palabras que solemos fallar convierte cada error en una pista práctica para mejorar nuestra precisión mañana.',
    'Un buen plan de estudio combina lectura activa, evocación sin mirar apuntes y descansos breves para fijar la memoria.',
    'Cada vez que terminas una ronda limpia sin corregir tantas letras, tu coordinación entre vista y pulgares se vuelve más fluida.',
    'Aunque hoy el día esté cargado de pendientes, cumplir una sola sesión enfocada mantiene viva la racha y la confianza.',
    'Guardar nuestras notas en un solo cuaderno digital evita perder ideas valiosas entre capturas sueltas y chats dispersos.',
    'Explicar un concepto técnico con palabras sencillas demuestra verdadero dominio y ayuda a detectar cualquier duda pendiente.',
    'Mañana revisaremos el informe final con el equipo, ajustaremos los plazos realistas y dejaremos por escrito los acuerdos.',
    'La claridad al redactar ahorra preguntas innecesarias y transmite seguridad desde la primera línea de cualquier mensaje.',
  ],
};

const SPRINT_WORDS = [
  'calma', 'ritmo', 'claro', 'mente', 'texto', 'libro', 'voz', 'pulso', 'trazo',
  'hábito', 'tiempo', 'camino', 'criterio', 'foco', 'orden', 'frase', 'tarde',
  'meta', 'clase', 'estudio', 'logro', 'fluidez', 'salud', 'simple', 'fuerza',
  'sabio', 'suave', 'firme', 'libre', 'calidad', 'progreso', 'canto', 'nota',
  'año', 'niño', 'sueño', 'mañana', 'pequeño', 'montaña', 'compañía', 'enseñar',
  'lápiz', 'árbol', 'música', 'página', 'rápido', 'círculo', 'brújula', 'océano',
  'canción', 'atención', 'razón', 'corazón', 'misión', 'visión', 'acción', 'jardín',
  'quietud', 'virtud', 'bondad', 'gratitud', 'actitud', 'paz', 'luz', 'nuez',
  'idea', 'lectura', 'escritura', 'memoria', 'paciencia', 'equilibrio', 'cuaderno', 'teclado',
  'agua', 'pingüino', 'cigüeña', 'vergüenza', 'guitarra', 'guiño', 'queso', 'kilo',
  'horizonte', 'brillo', 'calle', 'llave', 'yema', 'zapato', 'exacto', 'xilófono',
  'aprender', 'crecer', 'avanzar', 'respirar', 'pensar', 'crear', 'leer', 'cantar',
  'bosque', 'brisa', 'nube', 'estrella', 'selva', 'río', 'valle', 'cumbre',
  'sendero', 'puente', 'faro', 'puerto', 'barco', 'vela', 'viento', 'lluvia',
  'tinta', 'papel', 'pluma', 'pincel', 'lienzo', 'color', 'sombra', 'perfil',
  'acorde', 'escala', 'compás', 'sonido', 'eco', 'timbre', 'coro', 'piano',
  'código', 'dato', 'nodo', 'red', 'servidor', 'sistema', 'módulo', 'prueba',
  'lógica', 'algoritmo', 'índice', 'clave', 'cifra', 'archivo', 'bloque', 'flujo',
  'diálogo', 'pausa', 'énfasis', 'síntesis', 'método', 'enfoque', 'esmero', 'oficio',
  'templanza', 'lucidez', 'sosiego', 'cautela', 'audacia', 'mesura', 'destreza', 'ingenio',
  'maestría', 'disciplina', 'constancia', 'entereza', 'claridad', 'presencia', 'serenidad', 'respeto',
  'preguntar', 'escuchar', 'observar', 'medir', 'diseñar', 'construir', 'pulir', 'revisar',
  'explicar', 'resumir', 'decidir', 'sostener', 'dibujar', 'afinar', 'practicar', 'lograr',
  'ventana', 'mesa', 'silla', 'lámpara', 'reloj', 'taza', 'café', 'silencio',
];

const FINGER_HINTS: Record<string, string> = {
  a: 'Meñique izq.', q: 'Meñique izq.', z: 'Meñique izq.',
  s: 'Anular izq.', w: 'Anular izq.', x: 'Anular izq.',
  d: 'Medio izq.', e: 'Medio izq.', c: 'Medio izq.',
  f: 'Índice izq.', r: 'Índice izq.', t: 'Índice izq.', g: 'Índice izq.', v: 'Índice izq.', b: 'Índice izq.',
  j: 'Índice der.', y: 'Índice der.', u: 'Índice der.', h: 'Índice der.', n: 'Índice der.', m: 'Índice der.',
  k: 'Medio der.', i: 'Medio der.', ',': 'Medio der.',
  l: 'Anular der.', o: 'Anular der.', '.': 'Anular der.',
  ñ: 'Meñique der.', p: 'Meñique der.', '-': 'Meñique der.',
  ' ': 'Pulgar (Espacio)',
};

const VKBD_ROWS: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-'],
  [' '],
];

function normalizeKey(ch: string): string {
  if (!ch) return '';
  const low = ch.toLowerCase();
  if (low === 'ñ') return 'ñ';
  if (low === ' ') return ' ';
  return low.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function esc(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTimeShort(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function resolveEffectiveDevice(pref: DeviceProfile): 'pc' | 'mobile' {
  if (pref === 'pc' || pref === 'mobile') return pref;
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const narrow = typeof window !== 'undefined' && window.innerWidth < 760;
  return coarse || narrow ? 'mobile' : 'pc';
}

export class TypingView {
  private targetText = '';
  private currentSampleId = '';
  private typedText = '';
  private startedAt = 0;
  private finished = false;
  private totalKeystrokes = 0;
  private mistakeChars: Record<string, number> = {};

  private sprintSeconds = 30;
  private sprintRunning = false;
  private sprintWordsDone = 0;
  private sprintWordsAttempted = 0;
  private sprintTimerId = 0;
  private sprintCurrentWord = SPRINT_WORDS[0];

  private lastWpm = 0;
  private lastAcc = 100;

  constructor() {
    this.resetRound(false);
  }

  private getActivePcMode(): PcMode {
    const prof = lifeStore.get();
    return prof.progress.typing.pcExtraMode ?? prof.modulePrefs.typing.pcDrill ?? 'accents';
  }

  private getActiveMobileMode(): MobileMode {
    const prof = lifeStore.get();
    return prof.progress.typing.mobileExtraMode ?? prof.modulePrefs.typing.mobileDrill ?? 'agile';
  }

  private getTopWeakKeys(limit = 6): [string, number][] {
    const map = lifeStore.get().progress.typing.keyErrors ?? {};
    return Object.entries(map)
      .filter(([k, n]) => Boolean(k) && n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  private buildAdaptiveText(sampleIdx: number): string {
    const weakEntries = this.getTopWeakKeys(5);
    const weakChars = weakEntries.map(([ch]) => ch.toLowerCase()).filter((c) => c !== ' ');
    if (weakChars.length === 0) {
      const defaults = [
        'La práctica diaria con calma, precisión y atención entrena cada dedo del teclado.',
        'Escribe con ritmo constante para descubrir qué teclas necesitan refuerzo adaptativo.',
        'Pingüino, cigüeña, brújula, océano, mañana y código equilibran todas las filas.',
      ];
      return defaults[sampleIdx % defaults.length];
    }

    const scored = SPRINT_WORDS.map((word) => {
      const low = word.toLowerCase();
      const base = normalizeKey(low);
      let score = 0;
      for (let i = 0; i < weakChars.length; i++) {
        const target = weakChars[i];
        const targetBase = normalizeKey(target);
        const weight = weakChars.length - i;
        if (low.includes(target)) score += weight * 3;
        else if (targetBase && base.includes(targetBase)) score += weight;
      }
      return { word, score };
    })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const pool = scored.length >= 10 ? scored.slice(0, 32).map((s) => s.word) : SPRINT_WORDS.slice(0, 32);
    const picked: string[] = [];
    const offset = (sampleIdx * 5) % pool.length;
    for (let i = 0; i < 12; i++) {
      picked.push(pool[(offset + i) % pool.length]);
    }
    return picked.join(' ');
  }

  private resetRound(keepSample = false): void {
    window.clearInterval(this.sprintTimerId);
    this.sprintRunning = false;
    this.sprintSeconds = 30;
    this.sprintWordsDone = 0;
    this.sprintWordsAttempted = 0;
    this.typedText = '';
    this.startedAt = 0;
    this.finished = false;
    this.totalKeystrokes = 0;
    this.mistakeChars = {};

    const prof = lifeStore.get();
    const prefs = prof.modulePrefs.typing;
    const eff = resolveEffectiveDevice(prof.deviceMode);

    if (eff === 'pc') {
      const pcMode = this.getActivePcMode();
      if (pcMode === 'adaptativo') {
        this.targetText = this.buildAdaptiveText(prefs.sampleIdx);
        this.currentSampleId = `pc:adaptativo:${prefs.sampleIdx % 8}`;
      } else {
        const list = PC_TEXTS[pcMode] ?? PC_TEXTS.accents;
        const idx = keepSample ? prefs.sampleIdx % list.length : prefs.sampleIdx % list.length;
        this.targetText = list[idx];
        this.currentSampleId = `pc:${pcMode}:${idx}`;
      }
    } else {
      const mMode = this.getActiveMobileMode();
      if (mMode === 'sprint30') {
        this.sprintCurrentWord = SPRINT_WORDS[Math.floor(Math.random() * SPRINT_WORDS.length)];
        this.targetText = this.sprintCurrentWord;
        this.currentSampleId = `mobile:sprint30:${Date.now() % 1000}`;
      } else {
        const list = MOBILE_PHRASES[mMode] ?? MOBILE_PHRASES.agile;
        const idx = prefs.sampleIdx % list.length;
        this.targetText = list[idx];
        this.currentSampleId = `mobile:${mMode}:${idx}`;
      }
    }
  }

  private renderVirtualKeyboardHtml(): string {
    const nextChar = this.targetText[this.typedText.length] ?? '';
    const targetNorm = normalizeKey(nextChar);
    const weakSet = new Set(
      this.getTopWeakKeys(5)
        .filter(([, count]) => count >= 2)
        .map(([ch]) => normalizeKey(ch))
    );

    return `
      <div class="al-vkbd" id="al-typ-vkbd" aria-label="Teclado visual de guía">
        ${VKBD_ROWS.map(
          (row) => `
          <div class="al-vkbd-row">
            ${row
              .map((key) => {
                const isSpace = key === ' ';
                const isTarget = !this.finished && targetNorm === key;
                const isWeak = !isSpace && weakSet.has(key);
                const cls = [
                  'al-vkbd-key',
                  isSpace ? 'is-space' : '',
                  isTarget ? 'is-target' : '',
                  isWeak ? 'is-weak' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                const label = isSpace ? 'ESPACIO' : key.toUpperCase();
                return `<span class="${cls}" data-vkey="${esc(key)}">${label}</span>`;
              })
              .join('')}
          </div>`
        ).join('')}
      </div>
    `;
  }

  private updateVirtualKeyboard(container: HTMLElement): void {
    const vkbd = container.querySelector<HTMLElement>('#al-typ-vkbd');
    if (!vkbd) return;
    const nextChar = this.targetText[this.typedText.length] ?? '';
    const targetNorm = this.finished ? '' : normalizeKey(nextChar);
    vkbd.querySelectorAll<HTMLElement>('[data-vkey]').forEach((el) => {
      el.classList.toggle('is-target', el.dataset.vkey === targetNorm);
    });
  }

  public render(container: HTMLElement): void {
    const profile = lifeStore.get();
    const prefs = profile.modulePrefs.typing;
    const tProg = profile.progress.typing;
    const diff = lifeStore.getDifficulty('typing');
    const goalWpm = GOAL_WPM_BY_DIFF[diff];
    const pref = profile.deviceMode;
    const eff = resolveEffectiveDevice(pref);
    const pcMode = this.getActivePcMode();
    const mMode = this.getActiveMobileMode();

    if (!this.targetText) this.resetRound(false);

    const masterySummary = lifeStore.getOverallMasterySummary();
    const typingPct = masterySummary.byModule.typing;

    const bestLabel =
      eff === 'pc'
        ? `Récord PC: ${profile.stats.bestWpmPc} PPM`
        : `Récord Celular: ${profile.stats.bestWpmMobile} PPM`;

    const activeTutKey = eff === 'pc' ? `pc:${pcMode}` : `mobile:${mMode}`;
    const activeTut = TYPING_TUTORIALS[activeTutKey] ?? TYPING_TUTORIALS['pc:accents'];

    const weakKeys = this.getTopWeakKeys(6);
    const recentHistory = tProg.history.slice(0, 5);

    const modeTabs =
      eff === 'pc'
        ? `
        <div class="al-seg-tabs" role="tablist" aria-label="Modos de mecanografía PC">
          <button type="button" class="al-seg-btn ${pcMode === 'accents' ? 'is-active' : ''}" data-pcmode="accents">Con tildes (${PC_TEXTS.accents.length})</button>
          <button type="button" class="al-seg-btn ${pcMode === 'speed' ? 'is-active' : ''}" data-pcmode="speed">Velocidad pura (${PC_TEXTS.speed.length})</button>
          <button type="button" class="al-seg-btn ${pcMode === 'classic' ? 'is-active' : ''}" data-pcmode="classic">Párrafo clásico (${PC_TEXTS.classic.length})</button>
          <button type="button" class="al-seg-btn ${pcMode === 'filas' ? 'is-active' : ''}" data-pcmode="filas">Filas guía (${PC_TEXTS.filas.length})</button>
          <button type="button" class="al-seg-btn ${pcMode === 'codigo' ? 'is-active' : ''}" data-pcmode="codigo">Código TS/SQL (${PC_TEXTS.codigo.length})</button>
          <button type="button" class="al-seg-btn ${pcMode === 'adaptativo' ? 'is-active' : ''}" data-pcmode="adaptativo">Adaptativo (${weakKeys.length})</button>
        </div>`
        : `
        <div class="al-seg-tabs" role="tablist" aria-label="Modos de mecanografía celular">
          <button type="button" class="al-seg-btn ${mMode === 'agile' ? 'is-active' : ''}" data-mmode="agile">Frases ágiles (${MOBILE_PHRASES.agile.length})</button>
          <button type="button" class="al-seg-btn ${mMode === 'orthowords' ? 'is-active' : ''}" data-mmode="orthowords">Tildes rápidas (${MOBILE_PHRASES.orthowords.length})</button>
          <button type="button" class="al-seg-btn ${mMode === 'precision' ? 'is-active' : ''}" data-mmode="precision">Precisión ñ/tildes (${MOBILE_PHRASES.precision.length})</button>
          <button type="button" class="al-seg-btn ${mMode === 'frases' ? 'is-active' : ''}" data-mmode="frases">Frases largas (${MOBILE_PHRASES.frases.length})</button>
          <button type="button" class="al-seg-btn ${mMode === 'sprint30' ? 'is-active' : ''}" data-mmode="sprint30">Ráfaga 30s (${SPRINT_WORDS.length})</button>
        </div>`;

    container.innerHTML = `
      <div class="al-page al-typing-page">
        <div class="al-module-hero" style="--mod-c1: #4338CA; --mod-c2: #818CF8;">
          <div class="al-module-hero-id">
            <div class="al-diamond-emblem is-sm" style="--em-c1: #4338CA; --em-c2: #818CF8;">
              <span class="al-diamond-ring"></span>
              <span class="al-diamond-core">${Icons.keyboard(20)}</span>
            </div>
            <div>
              <h1>Mecanografía (${eff === 'pc' ? 'Modo PC · Teclado' : 'Modo Celular · Táctil'})</h1>
              <p>${
                eff === 'pc'
                  ? 'Entrena tildes, filas guía, código técnico y práctica adaptativa sobre tus teclas débiles.'
                  : 'Optimizado para pulgares con tildes rápidas, precisión, frases largas y ráfaga de 30 segundos.'
              }</p>
            </div>
          </div>
          <div class="al-mono-pill" id="al-typing-best">${bestLabel}</div>
        </div>

        ${renderDidacticBar({
          moduleId: 'typing',
          progressLabel: 'Dominio de Mecanografía',
          progressPct: typingPct,
          progressDetail: `Rondas guardadas: ${tProg.history.length} · Textos superados: ${tProg.completedIds.length}`,
          extraMetric: `Meta ${difficultyLabel(diff)}: ${goalWpm} PPM`,
          difficultyHints: DIFFICULTY_HINTS,
        })}

        <div class="al-toolbar">
          <div class="al-seg-tabs" aria-label="Selector de dispositivo">
            <button type="button" class="al-seg-btn ${pref === 'auto' ? 'is-active' : ''}" data-dev="auto">Automático (${eff === 'pc' ? 'PC' : 'Móvil'})</button>
            <button type="button" class="al-seg-btn ${pref === 'pc' ? 'is-active' : ''}" data-dev="pc">${Icons.monitor(14)} <span>Escritorio</span></button>
            <button type="button" class="al-seg-btn ${pref === 'mobile' ? 'is-active' : ''}" data-dev="mobile">${Icons.phone(14)} <span>Celular</span></button>
          </div>
          ${modeTabs}
        </div>

        ${renderTutorialBanner({
          id: `typing:${activeTutKey}`,
          moduleName: 'Mecanografía',
          ...activeTut,
        })}

        <section class="al-panel al-typing-card">
          <div class="al-typing-stats">
            <div><span>Velocidad (meta ${goalWpm})</span><strong id="al-typ-wpm">${this.lastWpm} PPM</strong></div>
            <div><span>Precisión</span><strong id="al-typ-acc">${this.lastAcc}%</strong></div>
            ${
              eff === 'mobile' && mMode === 'sprint30'
                ? `<div><span>Tiempo / Palabras</span><strong id="al-typ-sprint">${this.sprintSeconds}s · ${this.sprintWordsDone}/${this.sprintWordsAttempted} pal.</strong></div>`
                : `<div><span>Progreso</span><strong id="al-typ-prog">${this.typedText.length}/${this.targetText.length}</strong></div>`
            }
          </div>

          ${
            eff === 'pc' && pcMode === 'adaptativo'
              ? `<p class="al-muted">${
                  weakKeys.length > 0
                    ? `Ronda generada con tus teclas con más fallos: ${weakKeys
                        .slice(0, 5)
                        .map(([k]) => `«${k === ' ' ? 'Espacio' : k}»`)
                        .join(', ')}.`
                    : 'Aún no hay teclas débiles registradas: practica cualquier modo para que el generador adaptativo aprenda tus tropiezos.'
                }</p>`
              : ''
          }

          <div class="al-typing-prompt" id="al-typ-prompt">${this.renderTargetCharsHtml()}</div>

          <div class="al-typing-input-wrap">
            <input
              type="text"
              id="al-typ-input"
              class="al-typing-input"
              value="${esc(this.typedText)}"
              placeholder="${eff === 'mobile' && mMode === 'sprint30' ? 'Escribe la palabra y pulsa Espacio...' : 'Empieza a escribir aquí...'}"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              enterkeyhint="${eff === 'mobile' ? 'next' : 'done'}"
            />
            <button type="button" class="al-btn" id="al-typ-restart">${Icons.refresh(15)}<span>Otro texto</span></button>
          </div>

          ${
            eff === 'pc'
              ? `
            <div class="al-finger-bar">
              <label class="al-inline-check">
                <input type="checkbox" id="al-finger-toggle" ${prefs.showFingerGuide ? 'checked' : ''} />
                <span>Guía de dedo y teclado visual</span>
              </label>
              <span class="al-mono-pill" id="al-finger-hint">${this.currentFingerHint()}</span>
            </div>
            ${prefs.showFingerGuide ? this.renderVirtualKeyboardHtml() : ''}`
              : ''
          }

          <div id="al-typ-summary" class="al-rule-box ${this.finished ? '' : 'is-hidden'}"></div>
        </section>

        <div class="al-study-grid">
          <section class="al-panel al-study-card">
            <div class="al-card-head">
              <h3>Historial reciente (últimas 5 rondas)</h3>
              <span class="al-mono-pill">${tProg.history.length} totales</span>
            </div>
            ${
              recentHistory.length === 0
                ? '<p class="al-muted">Completa tu primera ronda para ver tu evolución de PPM y precisión guardada.</p>'
                : `<div class="al-step-bar" style="flex-direction:column; align-items:stretch;">
                    ${recentHistory
                      .map((entry) => {
                        const mLabel =
                          PC_MODE_LABELS[entry.mode as PcMode] ??
                          MOBILE_MODE_LABELS[entry.mode as MobileMode] ??
                          entry.mode;
                        const goal = GOAL_WPM_BY_DIFF[entry.difficulty] ?? 50;
                        const met = entry.wpm >= goal && entry.acc >= 85;
                        return `
                          <div class="al-card-head" style="padding:6px 8px; border-radius:8px; background:var(--bg-surface); border:1px solid var(--border-subtle);">
                            <div>
                              <strong>${esc(mLabel)}</strong>
                              <small class="al-muted"> · ${difficultyLabel(entry.difficulty)} ${formatTimeShort(entry.at) ? `· ${formatTimeShort(entry.at)}` : ''}</small>
                            </div>
                            <div class="al-tool-group">
                              <span class="al-mono-pill">${entry.wpm} PPM · ${entry.acc}%</span>
                              <span class="al-mastery-badge ${met ? '' : 'is-warn'}">${met ? 'Meta lograda' : `Meta ${goal}`}</span>
                            </div>
                          </div>`;
                      })
                      .join('')}
                  </div>`
            }
          </section>

          <section class="al-panel al-study-card">
            <div class="al-card-head">
              <h3>Teclas débiles persistentes</h3>
              <span class="al-mono-pill">${weakKeys.length} registradas</span>
            </div>
            ${
              weakKeys.length === 0
                ? '<p class="al-muted">Sin teclas problemáticas aún. Cada tropiezo en tus rondas se acumula aquí para personalizar tu práctica.</p>'
                : `
                  <div class="al-step-bar">
                    ${weakKeys
                      .map(
                        ([ch, count]) =>
                          `<span class="al-mastery-badge is-warn">«${esc(ch === ' ' ? 'Espacio' : ch)}» · ${count} fallos</span>`
                      )
                      .join('')}
                  </div>
                  <p class="al-muted">Las teclas marcadas en ámbar en el teclado visual coinciden con tus errores acumulados.</p>
                `
            }
            <div class="al-tool-group" style="margin-top:auto;">
              <button type="button" class="al-btn al-btn-primary" id="al-typ-practice-weak">
                ${Icons.keyboard(15)}<span>Practicar mis teclas débiles</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    `;

    this.bindEvents(container, eff);
    bindTutorialBanners(container);
    bindDidacticBar(container, 'typing', (next) => {
      if (next === 'basico') {
        lifeStore.updateModulePrefs('typing', { showFingerGuide: true });
      } else if (next === 'avanzado') {
        lifeStore.updateModulePrefs('typing', { showFingerGuide: false });
      }
      this.resetRound(true);
      this.render(container);
    });
    if (this.finished) {
      this.paintSummary(container, eff);
    }
  }

  private currentFingerHint(): string {
    if (!lifeStore.get().modulePrefs.typing.showFingerGuide) return 'Guía oculta';
    const nextChar = this.targetText[this.typedText.length] ?? '';
    if (!nextChar) return 'Completado';
    const base = normalizeKey(nextChar);
    return `Siguiente «${nextChar === ' ' ? 'ESPACIO' : nextChar}» -> ${FINGER_HINTS[base] ?? 'Mano cercana'}`;
  }

  private renderTargetCharsHtml(): string {
    return Array.from(this.targetText)
      .map((ch, idx) => {
        let cls = 'al-ch';
        if (idx < this.typedText.length) {
          cls += this.typedText[idx] === ch ? ' is-ok' : ' is-err';
        } else if (idx === this.typedText.length) {
          cls += ' is-curr';
        }
        const safe = ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;
        return `<span class="${cls}">${safe}</span>`;
      })
      .join('');
  }

  private computeLiveStats(): { wpm: number; acc: number } {
    const elapsedMin = this.startedAt ? Math.max(0.03, (performance.now() - this.startedAt) / 60000) : 0;
    let correctChars = 0;
    for (let i = 0; i < this.typedText.length; i++) {
      if (this.typedText[i] === this.targetText[i]) correctChars += 1;
    }
    const wpm = elapsedMin > 0 ? Math.round(correctChars / 5 / elapsedMin) : 0;
    const total = Math.max(1, this.totalKeystrokes || this.typedText.length);
    const errors = Object.values(this.mistakeChars).reduce((a, b) => a + b, 0);
    const acc = Math.max(0, Math.min(100, Math.round(((total - errors) / total) * 100)));
    return { wpm, acc };
  }

  private paintSummary(container: HTMLElement, eff: 'pc' | 'mobile'): void {
    const sumEl = container.querySelector<HTMLElement>('#al-typ-summary');
    if (!sumEl) return;
    sumEl.classList.remove('is-hidden');
    const mMode = this.getActiveMobileMode();
    const diff = lifeStore.getDifficulty('typing');
    const goalWpm = GOAL_WPM_BY_DIFF[diff];
    const metGoal = this.lastWpm >= goalWpm && this.lastAcc >= 85;
    sumEl.classList.toggle('is-ok', metGoal);
    sumEl.classList.toggle('is-warn', !metGoal);

    const weakEntries = Object.entries(this.mistakeChars)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => `«${k === ' ' ? 'Espacio' : k}» (${n})`)
      .join(', ');

    const heading =
      eff === 'mobile' && mMode === 'sprint30'
        ? `Ráfaga terminada: ${this.sprintWordsDone}/${this.sprintWordsAttempted} palabras (${this.lastWpm} PPM · ${this.lastAcc}% precisión)`
        : `Texto completado a ${this.lastWpm} PPM (${this.lastAcc}% precisión)`;

    const goalNote = metGoal
      ? `Superaste la meta de nivel ${difficultyLabel(diff)} (${goalWpm} PPM). Sesión guardada.`
      : `Meta de nivel ${difficultyLabel(diff)}: ${goalWpm} PPM con al menos 85% de precisión. Sesión guardada.`;

    sumEl.innerHTML = `
      <strong>${heading}</strong>
      <p>${goalNote}</p>
      <p>${weakEntries ? `Teclas con más tropiezos en esta ronda: ${weakEntries}.` : 'Sin errores en teclas clave en esta ronda.'}</p>
      <div class="al-tool-group">
        <button type="button" class="al-btn al-btn-primary" id="al-typ-next-btn">Siguiente reto</button>
        ${
          eff === 'pc' && weakEntries
            ? `<button type="button" class="al-btn" id="al-typ-go-adaptive">Reforzar en Adaptativo</button>`
            : ''
        }
      </div>
    `;
    sumEl.querySelector('#al-typ-next-btn')?.addEventListener('click', () => {
      lifeStore.updateModulePrefs('typing', { sampleIdx: lifeStore.get().modulePrefs.typing.sampleIdx + 1 });
      this.resetRound(true);
      this.render(container);
      container.querySelector<HTMLInputElement>('#al-typ-input')?.focus();
    });
    sumEl.querySelector('#al-typ-go-adaptive')?.addEventListener('click', () => {
      lifeStore.updateProgress('typing', { pcExtraMode: 'adaptativo' });
      lifeStore.updateModulePrefs('typing', { sampleIdx: 0 });
      this.resetRound(true);
      this.render(container);
      container.querySelector<HTMLInputElement>('#al-typ-input')?.focus();
    });
  }

  private bindEvents(container: HTMLElement, eff: 'pc' | 'mobile'): void {
    container.querySelectorAll<HTMLButtonElement>('[data-dev]').forEach((btn) => {
      btn.addEventListener('click', () => {
        lifeStore.setDeviceMode(btn.dataset.dev as DeviceProfile);
        this.resetRound(false);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-pcmode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.pcmode as PcMode;
        lifeStore.updateProgress('typing', { pcExtraMode: nextMode });
        if (nextMode === 'accents' || nextMode === 'speed' || nextMode === 'classic') {
          lifeStore.updateModulePrefs('typing', { pcDrill: nextMode as PcDrill, sampleIdx: 0 });
        } else {
          lifeStore.updateModulePrefs('typing', { sampleIdx: 0 });
        }
        this.resetRound(true);
        this.render(container);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-mmode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.mmode as MobileMode;
        lifeStore.updateProgress('typing', { mobileExtraMode: nextMode });
        if (nextMode === 'agile' || nextMode === 'orthowords' || nextMode === 'sprint30') {
          lifeStore.updateModulePrefs('typing', { mobileDrill: nextMode as MobileDrill, sampleIdx: 0 });
        } else {
          lifeStore.updateModulePrefs('typing', { sampleIdx: 0 });
        }
        this.resetRound(true);
        this.render(container);
      });
    });

    container.querySelector('#al-typ-restart')?.addEventListener('click', () => {
      lifeStore.updateModulePrefs('typing', { sampleIdx: lifeStore.get().modulePrefs.typing.sampleIdx + 1 });
      this.resetRound(true);
      this.render(container);
      container.querySelector<HTMLInputElement>('#al-typ-input')?.focus();
    });

    container.querySelector('#al-typ-practice-weak')?.addEventListener('click', () => {
      if (eff !== 'pc') {
        lifeStore.setDeviceMode('pc');
      }
      lifeStore.updateProgress('typing', { pcExtraMode: 'adaptativo' });
      lifeStore.updateModulePrefs('typing', { sampleIdx: 0 });
      this.resetRound(true);
      this.render(container);
      container.querySelector<HTMLInputElement>('#al-typ-input')?.focus();
    });

    container.querySelector<HTMLInputElement>('#al-finger-toggle')?.addEventListener('change', (e) => {
      lifeStore.updateModulePrefs('typing', { showFingerGuide: (e.target as HTMLInputElement).checked });
      this.render(container);
    });

    const inputEl = container.querySelector<HTMLInputElement>('#al-typ-input')!;
    const promptEl = container.querySelector<HTMLElement>('#al-typ-prompt')!;
    const wpmEl = container.querySelector<HTMLElement>('#al-typ-wpm')!;
    const accEl = container.querySelector<HTMLElement>('#al-typ-acc')!;
    const progEl = container.querySelector<HTMLElement>('#al-typ-prog');
    const sprintEl = container.querySelector<HTMLElement>('#al-typ-sprint');
    const hintEl = container.querySelector<HTMLElement>('#al-finger-hint');

    inputEl.addEventListener('input', () => {
      if (this.finished) return;
      const val = inputEl.value;
      const mMode = this.getActiveMobileMode();
      const pcMode = this.getActivePcMode();
      const diff = lifeStore.getDifficulty('typing');

      if (!this.startedAt && val.length > 0) {
        this.startedAt = performance.now();
        if (eff === 'mobile' && mMode === 'sprint30' && !this.sprintRunning) {
          this.sprintRunning = true;
          this.sprintTimerId = window.setInterval(() => {
            this.sprintSeconds -= 1;
            if (sprintEl) {
              sprintEl.textContent = `${this.sprintSeconds}s · ${this.sprintWordsDone}/${this.sprintWordsAttempted} pal.`;
            }
            if (this.sprintSeconds <= 0) {
              window.clearInterval(this.sprintTimerId);
              this.sprintRunning = false;
              this.finished = true;
              this.lastWpm = this.sprintWordsDone * 2;
              this.lastAcc =
                this.sprintWordsAttempted > 0
                  ? Math.round((this.sprintWordsDone / this.sprintWordsAttempted) * 100)
                  : 100;
              lifeStore.recordTypingSession(
                'mobile',
                'sprint30',
                lifeStore.getDifficulty('typing'),
                this.lastWpm,
                this.lastAcc,
                this.mistakeChars,
                this.currentSampleId
              );
              this.render(container);
            }
          }, 1000);
        }
      }

      if (eff === 'mobile' && mMode === 'sprint30') {
        if (val.endsWith(' ')) {
          const clean = val.trim().toLowerCase();
          if (clean.length > 0) {
            this.sprintWordsAttempted += 1;
            const expectedWord = this.sprintCurrentWord.toLowerCase();
            if (clean === expectedWord) {
              this.sprintWordsDone += 1;
            } else {
              for (let i = 0; i < expectedWord.length; i++) {
                if (clean[i] !== expectedWord[i]) {
                  const expectedChar = expectedWord[i];
                  this.mistakeChars[expectedChar] = (this.mistakeChars[expectedChar] ?? 0) + 1;
                  break;
                }
              }
            }
            const elapsedSec = Math.max(1, 30 - this.sprintSeconds);
            this.lastWpm = Math.round((this.sprintWordsDone / elapsedSec) * 60);
            this.lastAcc = Math.round((this.sprintWordsDone / this.sprintWordsAttempted) * 100);
          }
          inputEl.value = '';
          this.typedText = '';
          this.sprintCurrentWord = SPRINT_WORDS[Math.floor(Math.random() * SPRINT_WORDS.length)];
          this.targetText = this.sprintCurrentWord;
          promptEl.innerHTML = this.renderTargetCharsHtml();
          wpmEl.textContent = `${this.lastWpm} PPM`;
          accEl.textContent = `${this.lastAcc}%`;
          if (sprintEl) {
            sprintEl.textContent = `${this.sprintSeconds}s · ${this.sprintWordsDone}/${this.sprintWordsAttempted} pal.`;
          }
          return;
        }
        this.typedText = val;
        promptEl.innerHTML = this.renderTargetCharsHtml();
        return;
      }

      if (val.length > this.typedText.length) {
        this.totalKeystrokes += 1;
        const pos = val.length - 1;
        if (pos < this.targetText.length && val[pos] !== this.targetText[pos]) {
          const expected = this.targetText[pos];
          this.mistakeChars[expected] = (this.mistakeChars[expected] ?? 0) + 1;
        }
      }

      this.typedText = val.slice(0, this.targetText.length);
      promptEl.innerHTML = this.renderTargetCharsHtml();
      const { wpm, acc } = this.computeLiveStats();
      this.lastWpm = wpm;
      this.lastAcc = acc;
      wpmEl.textContent = `${wpm} PPM`;
      accEl.textContent = `${acc}%`;
      if (progEl) progEl.textContent = `${this.typedText.length}/${this.targetText.length}`;
      if (hintEl) hintEl.textContent = this.currentFingerHint();
      if (eff === 'pc') this.updateVirtualKeyboard(container);

      if (this.typedText === this.targetText) {
        this.finished = true;
        const activeMode = eff === 'pc' ? pcMode : mMode;
        lifeStore.recordTypingSession(
          eff,
          activeMode,
          diff,
          wpm,
          acc,
          this.mistakeChars,
          this.currentSampleId
        );
        this.render(container);
      }
    });
  }

  public unmount(): void {
    window.clearInterval(this.sprintTimerId);
  }
}
