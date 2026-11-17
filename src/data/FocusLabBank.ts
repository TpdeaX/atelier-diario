import { FlashcardItem } from '../types';

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
];
