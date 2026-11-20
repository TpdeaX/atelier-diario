import type { FlashcardItem } from '../types.ts';

export interface OratoryPrompt {
  id: string;
  title: string;
  prompt: string;
  framework: string;
  durationSec: number;
}

export interface DictionDrill {
  id: string;
  title: string;
  steps: string[];
  sampleText: string;
}

export const ORATORY_PROMPTS: OratoryPrompt[] = [
  {
    id: 'op-1',
    title: '¿A qué te dedicas? (Posicionamiento en 3 pasos)',
    prompt: 'Explica qué estudias o construyes hoy respondiendo: a quién ayudas, qué problema resuelves y qué resultado entregas.',
    framework: 'Audiencia → Dolor concreto → Solución medible',
    durationSec: 45,
  },
  {
    id: 'op-2',
    title: 'Protocolo ante un error o bloqueo en público',
    prompt: 'Simula que olvidaste un dato técnico en una exposición. Pausa 2 segundos, respira, reformula la idea central y sigue sin disculparte de más.',
    framework: 'Pausa silenciosa (2s) → Reencuadre seguro → Cierre firme',
    durationSec: 45,
  },
  {
    id: 'op-3',
    title: 'Explica Sistemas Distribuidos sin tecnicismos vacíos',
    prompt: 'Explícale a un cliente no técnico por qué un sistema necesita tolerancia a fallos y replicación usando una analogía cotidiana.',
    framework: 'Analogía real → Problema → Beneficio en 1 frase',
    durationSec: 60,
  },
  {
    id: 'op-4',
    title: 'Defiende una decisión técnica bajo presión',
    prompt: 'Justifica por qué elegirías software libre o una arquitectura modular frente a una solución cerrada más cara.',
    framework: 'Postura clara → 2 evidencias → Trade-off honesto',
    durationSec: 60,
  },
  {
    id: 'op-5',
    title: 'Cero muletillas: describe tu mejor hábito o proyecto',
    prompt: 'Habla 30 segundos continuos reemplazando cualquier "eh", "o sea" o "este" por una pausa limpia de medio segundo.',
    framework: 'Pausa consciente en lugar de muletilla',
    durationSec: 30,
  },
  {
    id: 'op-6',
    title: 'Pitch de ascensor de un proyecto personal (45s)',
    prompt: 'Presenta una app o iniciativa tuya como si tuvieras 45 segundos en un ascensor con un mentor ocupado.',
    framework: 'Gancho → Qué resuelve → Prueba real → Invitación',
    durationSec: 45,
  },
  {
    id: 'op-7',
    title: 'Entrevista conductual con método STAR',
    prompt: 'Cuenta un momento difícil en equipo o universidad donde resolviste un bloqueo sin culpar a nadie.',
    framework: 'Situación → Tarea → Acción concreta → Resultado',
    durationSec: 75,
  },
  {
    id: 'op-8',
    title: 'Reporta un incidente técnico con serenidad',
    prompt: 'Comunica a un gerente que un servicio falló 15 minutos, qué impacto tuvo, cómo se mitigó y qué evita que se repita.',
    framework: 'Hecho sin drama → Mitigación → Prevención medible',
    durationSec: 60,
  },
  {
    id: 'op-9',
    title: 'Resume un libro o artículo en 60 segundos',
    prompt: 'Condensa la tesis central de lo último que leíste en tres puntos memorables y una acción práctica.',
    framework: 'Tesis en 1 frase → 3 pilares → Aplicación inmediata',
    durationSec: 60,
  },
  {
    id: 'op-10',
    title: 'Responde una pregunta difícil sin improvisar ruido',
    prompt: 'Alguien cuestiona tu estimado de tiempo en una reunión. Valida la inquietud, presenta tus supuestos y propón dos opciones.',
    framework: 'Validación → Supuestos claros → Dos caminos con costo',
    durationSec: 50,
  },
  {
    id: 'op-11',
    title: 'Di «no» con respeto y criterio profesional',
    prompt: 'Rechaza una tarea fuera de alcance sin sonar brusco ni justificarte en exceso, ofreciendo una alternativa realista.',
    framework: 'Agradecimiento breve → Límite claro → Alternativa viable',
    durationSec: 40,
  },
  {
    id: 'op-12',
    title: 'Apertura con gancho en los primeros 10 segundos',
    prompt: 'Arranca una charla sobre productividad o tecnología sin decir "buenos días, hoy les vengo a hablar de...". Abre con una pregunta o escena.',
    framework: 'Escena o pregunta directa → Promesa → Hoja de ruta',
    durationSec: 45,
  },
  {
    id: 'op-13',
    title: 'Traduce una métrica en decisión de negocio',
    prompt: 'Explica qué significa bajar la latencia de 900 ms a 180 ms para alguien que solo mira satisfacción del usuario y costos.',
    framework: 'Dato antes/después → Impacto humano → Decisión recomendada',
    durationSec: 50,
  },
  {
    id: 'op-14',
    title: 'Cierre de reunión en 30 segundos',
    prompt: 'Cierra una sesión de trabajo resumiendo decisiones tomadas, responsables y fecha exacta del siguiente hito.',
    framework: 'Decisiones → Dueño por acción → Próxima fecha',
    durationSec: 30,
  },
  {
    id: 'op-15',
    title: 'Da retroalimentación constructiva sin herir',
    prompt: 'Comenta a un compañero que sus entregas llegan sin pruebas usando hechos observables y una propuesta colaborativa.',
    framework: 'Situación → Comportamiento observable → Impacto y acuerdo',
    durationSec: 55,
  },
  {
    id: 'op-16',
    title: 'Cierre memorable que deje una sola idea',
    prompt: 'Termina una exposición conectando tu frase final con el problema inicial y dejando un llamado claro a la acción.',
    framework: 'Síntesis en 1 línea → Eco del inicio → Llamado concreto',
    durationSec: 40,
  },
];

export const DICTION_DRILLS: DictionDrill[] = [
  {
    id: 'dd-lapiz',
    title: 'Ejercicio del lápiz (3 velocidades)',
    steps: [
      '1. Lee exagerando cada consonante (lento y articulado, 20s).',
      '2. Repite a velocidad natural bajando ligeramente el tono (20s).',
      '3. Lee más rápido manteniendo todas las sílabas nítidas (15s).',
    ],
    sampleText:
      'La claridad al comunicar multiplica el valor de cualquier idea técnica; articular con calma proyecta seguridad y criterio.',
  },
  {
    id: 'dd-tono',
    title: 'Técnica de 10 segundos: Tono y Presencia',
    steps: [
      '1. Inhala por la nariz 3 segundos relajando los hombros.',
      '2. Baja el timbre hacia tu voz de pecho sin forzar la garganta.',
      '3. Marca pausas breves después de cada idea clave.',
    ],
    sampleText:
      'Primero definimos el problema real, luego medimos las opciones y finalmente ejecutamos la solución más simple que funcione.',
  },
  {
    id: 'dd-muletillas',
    title: 'Destructor de muletillas',
    steps: [
      '1. Activa el micrófono o usa los contadores manuales.',
      '2. Cuando sientas que viene un "eh / este / o sea", cierra los labios 1 segundo.',
      '3. Retoma con un verbo directo.',
    ],
    sampleText:
      'Hoy presento el avance del módulo: redujimos la latencia en treinta por ciento y validamos las pruebas automáticas.',
  },
  {
    id: 'dd-trabalenguas-r',
    title: 'Agilidad de lengua (R y grupos trabados)',
    steps: [
      '1. Haz 5 segundos de vibración de lengua suave antes de leer.',
      '2. Lee separando sílabas con precisión en cada «pr», «tr» y «rr».',
      '3. Repite de corrido sin acelerar ni perder aire.',
    ],
    sampleText:
      'Tres tristes programadores prepararon tres prototipos rápidos para probar redes robustas y reportes precisos.',
  },
  {
    id: 'dd-vocales-abiertas',
    title: 'Apertura vocal y mandíbula suelta',
    steps: [
      '1. Masajea suavemente la mandíbula y bosteza una vez para abrir la garganta.',
      '2. Lee alargando ligeramente cada vocal acentuada sin gritar.',
      '3. Relee en tono conversacional conservando esa resonancia.',
    ],
    sampleText:
      'Hablar con calma y buena apertura vocal permite que cada palabra viaje limpia hasta el fondo de la sala.',
  },
  {
    id: 'dd-pausas-dramaticas',
    title: 'Control de pausas y puntuación viva',
    steps: [
      '1. Marca 1 segundo en cada coma y 2 segundos en cada punto.',
      '2. Mantén la mirada firme al frente durante los silencios.',
      '3. Evita subir el tono al final de frases afirmativas.',
    ],
    sampleText:
      'No necesitamos diez funciones nuevas. Necesitamos una que funcione siempre, responda rápido y sea fácil de entender.',
  },
  {
    id: 'dd-proyeccion-costal',
    title: 'Proyección sin forzar la garganta',
    steps: [
      '1. Apoya una mano en el abdomen y siente la expansión al inhalar.',
      '2. Proyecta la frase hacia la pared opuesta usando el flujo de aire, no tensión en el cuello.',
      '3. Termina la última sílaba con la misma energía que la primera.',
    ],
    sampleText:
      'El equipo acordó publicar la versión estable este viernes tras verificar seguridad, rendimiento y copias de respaldo.',
  },
  {
    id: 'dd-consonantes-finales',
    title: 'Nitidez de consonantes finales (s, d, r, l)',
    steps: [
      '1. Subraya mentalmente la última letra de cada palabra.',
      '2. Lee despacio asegurándote de pronunciar cada «s» y cada «d» final sin sonar artificial.',
      '3. Repite mirando arriba al final de cada frase.',
    ],
    sampleText:
      'La calidad real del software se comprueba en los detalles finales: velocidad, claridad, estabilidad y facilidad de uso.',
  },
  {
    id: 'dd-cambio-ritmo',
    title: 'Contraste de velocidad y énfasis',
    steps: [
      '1. Lee la primera cláusula a ritmo ágil para dar contexto.',
      '2. Reduce el ritmo a la mitad en la idea clave para destacarla.',
      '3. Cierra con tono descendente y seguro.',
    ],
    sampleText:
      'Aunque analizamos cinco herramientas distintas durante dos semanas, la decisión ganadora fue una sola: simplificar el proceso.',
  },
  {
    id: 'dd-lectura-enfatica',
    title: 'Modulación en listas de tres elementos',
    steps: [
      '1. Eleva ligeramente la entonación en el primer y segundo elemento.',
      '2. Baja el tono en el tercer elemento para transmitir cierre.',
      '3. Acompaña cada punto con un gesto sereno de la mano.',
    ],
    sampleText:
      'Un buen diseño tiene tres cualidades: se entiende en segundos, resiste errores comunes y respeta el tiempo de quien lo usa.',
  },
];

export const FLASHCARDS_BANK: FlashcardItem[] = [
  {
    id: 'fc-sd-1',
    deck: 'Sistemas Distribuidos',
    front: '¿Qué establece el Teorema CAP?',
    back: 'En presencia de una partición de red (P), un sistema distribuido debe elegir entre Consistencia (C) o Disponibilidad (A).',
    source: 'VIII Ciclo · Sistemas Distribuidos',
  },
  {
    id: 'fc-sd-2',
    deck: 'Sistemas Distribuidos',
    front: '¿Cuáles son los 3 estados de un nodo en el algoritmo de consenso Raft?',
    back: 'Follower (seguidor), Candidate (candidato durante elección) y Leader (líder que replica entradas de log).',
    source: 'VIII Ciclo · Sistemas Distribuidos',
  },
  {
    id: 'fc-sd-3',
    deck: 'Sistemas Distribuidos',
    front: '¿Qué ventaja clave aporta gRPC frente a REST tradicional con JSON?',
    back: 'Usa HTTP/2 con multiplexación y Protobuf binario tipado, reduciendo tamaño de payload y latencia en microservicios.',
    source: 'VIII Ciclo · Sistemas Distribuidos',
  },
  {
    id: 'fc-sl-1',
    deck: 'Software Libre',
    front: 'Diferencia práctica entre licencia MIT y GPLv3',
    back: 'MIT es permisiva (permite derivados cerrados manteniendo atribución); GPLv3 es copyleft fuerte (exige liberar derivados bajo GPLv3).',
    source: 'VIII Ciclo · Software Libre',
  },
  {
    id: 'fc-sl-2',
    deck: 'Software Libre',
    front: '¿Cuándo preferir `git rebase` frente a `git merge` en una rama local?',
    back: 'Cuando quieres historia lineal limpia antes de abrir un PR sin compartir aún la rama; evita rebasear ramas públicas compartidas.',
    source: 'VIII Ciclo · Software Libre',
  },
  {
    id: 'fc-ms-1',
    deck: 'Modelos y Simulación',
    front: 'Diferencia entre simulación de eventos discretos y simulación continua',
    back: 'En eventos discretos el estado cambia solo en instantes puntuales (ej. colas); en continua varía de forma suave respecto al tiempo (ecuaciones diferenciales).',
    source: 'VIII Ciclo · Modelos y Simulación',
  },
  {
    id: 'fc-ms-2',
    deck: 'Modelos y Simulación',
    front: '¿Para qué sirve el método de Monte Carlo?',
    back: 'Estima resultados numéricos o distribuciones de riesgo mediante muestreo aleatorio repetido cuando el sistema es complejo o estocástico.',
    source: 'VIII Ciclo · Modelos y Simulación',
  },
  {
    id: 'fc-di-1',
    deck: 'Derecho Informático',
    front: '¿Qué principio rige el tratamiento de datos personales (Ley 29733 en Perú)?',
    back: 'Consentimiento previo, informado, expreso e inequívoco del titular, junto con finalidad determinada y proporcionalidad.',
    source: 'VIII Ciclo · Derecho Informático',
  },
  {
    id: 'fc-or-1',
    deck: 'Oratoria y Aprendizaje',
    front: '¿Qué es el Efecto Benjamin Franklin y cómo aplicarlo?',
    back: 'Pedir un favor pequeño y genuino genera afinidad: el cerebro racionaliza que si ayudó a alguien es porque le cae bien.',
    source: 'Baúl IG #1',
  },
  {
    id: 'fc-or-2',
    deck: 'Oratoria y Aprendizaje',
    front: '¿Por qué la relectura pasiva engaña y qué la reemplaza?',
    back: 'Genera ilusión de fluidez por reconocimiento; se reemplaza por Evocación Activa (recuperar sin mirar) y Repetición Espaciada.',
    source: 'Baúl IG · Estudio',
  },
  {
    id: 'fc-or-3',
    deck: 'Oratoria y Aprendizaje',
    front: '¿Cómo romper el ciclo de procrastinación cuando una tarea abruma?',
    back: 'Reduce la fricción inicial a un micro-paso de 2 minutos y tolera los primeros instantes de incomodidad sin abrir distracciones.',
    source: 'Baúl IG · Mentalidad',
  },
  {
    id: 'fc-or-4',
    deck: 'Oratoria y Aprendizaje',
    front: '¿Qué entrena la Tabla de Schulte?',
    back: 'Amplía la visión periférica, acelera el procesamiento visual y entrena la atención sostenida sin saltos erráticos.',
    source: 'Baúl IG · Enfoque',
  },
  {
    id: 'fc-sd-4',
    deck: 'Sistemas Distribuidos',
    front: '¿Qué garantiza la idempotencia en una API distribuida?',
    back: 'Que ejecutar la misma petición una o varias veces (por reintentos de red) produzca exactamente el mismo estado final sin duplicar cobros o registros.',
    source: 'Sistemas Distribuidos',
  },
  {
    id: 'fc-sd-5',
    deck: 'Sistemas Distribuidos',
    front: '¿Cuál es el propósito del patrón Circuit Breaker?',
    back: 'Corta temporalmente llamadas a un servicio degradado para evitar fallos en cascada y dar margen de recuperación antes de reintentar.',
    source: 'Sistemas Distribuidos',
  },
  {
    id: 'fc-sd-6',
    deck: 'Sistemas Distribuidos',
    front: 'Diferencia entre replicación y particionamiento (sharding)',
    back: 'La replicación copia los mismos datos en varios nodos para disponibilidad y lecturas; el sharding divide los datos en fragmentos para escalar escrituras y almacenamiento.',
    source: 'Sistemas Distribuidos',
  },
  {
    id: 'fc-sd-7',
    deck: 'Sistemas Distribuidos',
    front: '¿Qué significa consistencia eventual?',
    back: 'Si cesan las actualizaciones sobre un dato, todas las réplicas convergerán al mismo valor tras un intervalo finito de propagación.',
    source: 'Sistemas Distribuidos',
  },
  {
    id: 'fc-sl-3',
    deck: 'Software Libre',
    front: '¿Qué añade la licencia Apache 2.0 respecto a MIT?',
    back: 'Incluye una concesión explícita de patentes de los colaboradores y exige documentar cambios relevantes en los archivos modificados.',
    source: 'Software Libre',
  },
  {
    id: 'fc-sl-4',
    deck: 'Software Libre',
    front: '¿Qué significan los tres números de Semantic Versioning (MAYOR.MENOR.PARCHE)?',
    back: 'MAYOR indica cambios incompatibles de API, MENOR añade funcionalidad compatible hacia atrás y PARCHE corrige errores compatibles.',
    source: 'Software Libre',
  },
  {
    id: 'fc-sl-5',
    deck: 'Software Libre',
    front: '¿Qué son las 4 libertades esenciales del software libre (FSF)?',
    back: '0: usar para cualquier propósito; 1: estudiar y modificar el código; 2: redistribuir copias; 3: distribuir versiones modificadas.',
    source: 'Software Libre',
  },
  {
    id: 'fc-ms-3',
    deck: 'Modelos y Simulación',
    front: '¿Qué enuncia la Ley de Little en teoría de colas?',
    back: 'L = lambda * W: el número promedio de elementos en el sistema es igual a la tasa media de llegada multiplicada por el tiempo medio de permanencia.',
    source: 'Modelos y Simulación',
  },
  {
    id: 'fc-ms-4',
    deck: 'Modelos y Simulación',
    front: 'Diferencia entre verificación y validación de un modelo de simulación',
    back: 'Verificación comprueba que el código implementa correctamente el modelo conceptual; validación comprueba que el modelo representa fielmente el sistema real.',
    source: 'Modelos y Simulación',
  },
  {
    id: 'fc-ms-5',
    deck: 'Modelos y Simulación',
    front: '¿Qué define a una cadena de Markov de primer orden?',
    back: 'La probabilidad del siguiente estado depende únicamente del estado actual y no de la secuencia histórica previa (propiedad sin memoria).',
    source: 'Modelos y Simulación',
  },
  {
    id: 'fc-di-2',
    deck: 'Derecho Informático',
    front: '¿Qué comprenden los derechos ARCO del titular de datos personales?',
    back: 'Acceso (conocer qué datos se guardan), Rectificación (corregir), Cancelación (suprimir) y Oposición (limitar el uso).',
    source: 'Derecho Informático',
  },
  {
    id: 'fc-di-3',
    deck: 'Derecho Informático',
    front: 'Diferencia entre firma electrónica simple y firma digital con certificado',
    back: 'La firma digital usa criptografía asimétrica y certificado emitido por autoridad acreditada, garantizando autenticidad, integridad y no repudio legal.',
    source: 'Derecho Informático',
  },
  {
    id: 'fc-di-4',
    deck: 'Derecho Informático',
    front: '¿Por qué es crítica la cadena de custodia en informática forense?',
    back: 'Documenta quién recolectó, custodió y analizó la evidencia digital junto con sus hashes, preservando su validez probatoria ante un juez.',
    source: 'Derecho Informático',
  },
  {
    id: 'fc-or-5',
    deck: 'Oratoria y Aprendizaje',
    front: '¿En qué consiste la Técnica Feynman para dominar un tema?',
    back: 'Explícalo con lenguaje sencillo como a un principiante; donde te trabes o recurras a jerga, ahí está el hueco que debes repasar.',
    source: 'Ciencia del Aprendizaje',
  },
  {
    id: 'fc-or-6',
    deck: 'Oratoria y Aprendizaje',
    front: '¿Por qué la práctica intercalada (interleaving) supera al estudio en bloque?',
    back: 'Alternar tipos de problemas obliga al cerebro a identificar qué estrategia elegir cada vez, mejorando la transferencia en exámenes reales.',
    source: 'Ciencia del Aprendizaje',
  },
  {
    id: 'fc-or-7',
    deck: 'Oratoria y Aprendizaje',
    front: '¿Cómo funciona la regla de los tres puntos en una presentación?',
    back: 'Agrupar el mensaje en tres ideas claras facilita la memoria de la audiencia y da ritmo natural de apertura, desarrollo y cierre.',
    source: 'Oratoria Práctica',
  },
  {
    id: 'fc-alg-1',
    deck: 'Algoritmos y Complejidad',
    front: '¿Cuál es el requisito indispensable para aplicar búsqueda binaria y cuál es su costo?',
    back: 'La colección debe estar ordenada y permitir acceso aleatorio; su complejidad temporal es O(log n).',
    source: 'Algoritmos y Estructuras',
  },
  {
    id: 'fc-alg-2',
    deck: 'Algoritmos y Complejidad',
    front: '¿Cuándo conviene una tabla hash frente a un árbol binario balanceado?',
    back: 'La tabla hash ofrece búsqueda promedio O(1) sin orden; el árbol balanceado garantiza O(log n) en el peor caso y soporta consultas por rango ordenadas.',
    source: 'Algoritmos y Estructuras',
  },
  {
    id: 'fc-alg-3',
    deck: 'Algoritmos y Complejidad',
    front: '¿Qué dos propiedades permiten resolver un problema con Programación Dinámica?',
    back: 'Subestructura óptima (la solución global se compone de soluciones óptimas parciales) y subproblemas superpuestos que se reutilizan.',
    source: 'Algoritmos y Estructuras',
  },
  {
    id: 'fc-alg-4',
    deck: 'Algoritmos y Complejidad',
    front: 'Diferencia clave entre BFS (anchura) y DFS (profundidad) en grafos',
    back: 'BFS usa una cola y halla el camino más corto en grafos sin pesos; DFS usa una pila o recursión y destaca en detección de ciclos y orden topológico.',
    source: 'Algoritmos y Estructuras',
  },
  {
    id: 'fc-alg-5',
    deck: 'Algoritmos y Complejidad',
    front: '¿Qué diferencia a un algoritmo voraz (greedy) de la programación dinámica?',
    back: 'El voraz toma la mejor decisión local inmediata sin reconsiderarla; solo es óptimo si el problema cumple la propiedad de elección voraz.',
    source: 'Algoritmos y Estructuras',
  },
  {
    id: 'fc-alg-6',
    deck: 'Algoritmos y Complejidad',
    front: '¿Qué mide la complejidad amortizada O(1) de un arreglo dinámico al hacer push?',
    back: 'Aunque redimensionar cuesta O(n) ocasionalmente, doblar la capacidad reparte ese costo entre las inserciones previas dando un promedio garantizado O(1).',
    source: 'Algoritmos y Estructuras',
  },
  {
    id: 'fc-net-1',
    deck: 'Redes y Seguridad',
    front: 'Diferencia esencial entre TCP y UDP',
    back: 'TCP orienta conexión, ordena paquetes y retransmite pérdidas; UDP envía datagramas sin estado ni reintento, minimizando latencia en audio o juegos.',
    source: 'Redes y Seguridad',
  },
  {
    id: 'fc-net-2',
    deck: 'Redes y Seguridad',
    front: '¿Cómo protege TLS (HTTPS) una comunicación web?',
    back: 'Verifica la identidad del servidor mediante certificados, negocia claves de sesión con criptografía asimétrica y cifra el tráfico con cifrado simétrico autenticado.',
    source: 'Redes y Seguridad',
  },
  {
    id: 'fc-net-3',
    deck: 'Redes y Seguridad',
    front: '¿Cuál es la defensa principal contra inyección SQL (SQLi)?',
    back: 'Usar consultas parametrizadas (prepared statements) para separar estrictamente la estructura SQL de los datos del usuario.',
    source: 'Redes y Seguridad',
  },
  {
    id: 'fc-net-4',
    deck: 'Redes y Seguridad',
    front: '¿Qué controla CORS en un navegador moderno?',
    back: 'Define qué orígenes externos tienen permiso del servidor (mediante cabeceras Access-Control-Allow-*) para leer respuestas desde código JavaScript del navegador.',
    source: 'Redes y Seguridad',
  },
  {
    id: 'fc-net-5',
    deck: 'Redes y Seguridad',
    front: 'Trade-off clave entre tokens JWT sin estado y sesiones en servidor',
    back: 'JWT evita consultar almacenamiento central en cada petición, pero revocar un token antes de su expiración es más difícil que invalidar una sesión en servidor.',
    source: 'Redes y Seguridad',
  },
  {
    id: 'fc-net-6',
    deck: 'Redes y Seguridad',
    front: '¿Qué función cumple el TTL en un registro DNS?',
    back: 'Indica cuántos segundos pueden almacenar en caché la resolución los servidores intermedios antes de volver a consultar al DNS autoritativo.',
    source: 'Redes y Seguridad',
  },
  {
    id: 'fc-ct-1',
    deck: 'Comunicación Técnica',
    front: '¿En qué consiste el principio de la pirámide invertida al escribir reportes?',
    back: 'Entregar primero la conclusión o decisión clave, luego los argumentos de soporte y al final los detalles técnicos o anexos.',
    source: 'Comunicación Técnica',
  },
  {
    id: 'fc-ct-2',
    deck: 'Comunicación Técnica',
    front: '¿Para qué sirve un ADR (Architecture Decision Record)?',
    back: 'Documenta brevemente el contexto, la decisión técnica elegida, las alternativas descartadas y sus consecuencias para el equipo futuro.',
    source: 'Comunicación Técnica',
  },
  {
    id: 'fc-ct-3',
    deck: 'Comunicación Técnica',
    front: '¿Por qué un postmortem de incidentes debe ser sin culpas (blameless)?',
    back: 'Enfocarse en fallas de proceso y barreras técnicas en lugar de señalar personas fomenta transparencia y previene la recurrencia real.',
    source: 'Comunicación Técnica',
  },
  {
    id: 'fc-ct-4',
    deck: 'Comunicación Técnica',
    front: '¿Cómo estructurar un mensaje de solicitud técnica para obtener respuesta rápida?',
    back: 'Indica el objetivo en una línea, el contexto mínimo con datos reproducibles, lo que ya probaste y la pregunta o decisión exacta que necesitas.',
    source: 'Comunicación Técnica',
  },
];
