import type { DrawingGridMode, DrawingSymmetry } from '../types.ts';

export type DrawingBlockId = 'trazos' | 'perspectiva' | 'luz' | 'proporcion' | 'composicion';

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
  t?: number;
}

export interface DrawingBlockMeta {
  id: DrawingBlockId;
  label: string;
  short: string;
}

export interface DrawingLesson {
  id: string;
  block: DrawingBlockId;
  title: string;
  tip: string;
  guideSvgPaths: string[];
  recommendedGrid: DrawingGridMode;
  recommendedSymmetry?: DrawingSymmetry;
  targetCheckpoints: [number, number][];
}

export interface DrawingSwatch {
  name: string;
  hex: string;
}

export interface DrawingTopicChip {
  id: string;
  label: string;
  query: string;
}

export const DRAWING_TOPIC_CHIPS: DrawingTopicChip[] = [
  { id: 'hands', label: 'Manos y gestos', query: 'hand anatomy drawing sketch' },
  { id: 'portraits', label: 'Rostros y retratos', query: 'portrait drawing sketch' },
  { id: 'figures', label: 'Cuerpo y poses', query: 'figure drawing anatomy' },
  { id: 'animals', label: 'Animales', query: 'animal study drawing' },
  { id: 'architecture', label: 'Arquitectura', query: 'architectural perspective drawing' },
  { id: 'skull', label: 'Cráneo y luces', query: 'human skull chiaroscuro' },
  { id: 'botanical', label: 'Botánica y flores', query: 'botanical illustration drawing' },
  { id: 'sculpture', label: 'Escultura clásica', query: 'marble bust sculpture' },
  { id: 'insects', label: 'Insectos/mariposas', query: 'insect butterfly entomology illustration' },
  { id: 'vehicles', label: 'Vehículos', query: 'vintage car bicycle sketch drawing' },
  { id: 'drapery', label: 'Ropa y pliegues', query: 'drapery folds clothing study drawing' },
  { id: 'landscapes', label: 'Paisajes naturales', query: 'landscape nature sketch drawing' },
];

export const DRAWING_BLOCKS: DrawingBlockMeta[] = [
  { id: 'trazos', label: '1. Trazos y pulso', short: 'Trazos' },
  { id: 'perspectiva', label: '2. Perspectiva 3D', short: 'Perspectiva' },
  { id: 'luz', label: '3. Luz y achurado', short: 'Luz' },
  { id: 'proporcion', label: '4. Proporción y figura', short: 'Proporción' },
  { id: 'composicion', label: '5. Composición y simetría', short: 'Composición' },
];

export const DRAWING_SWATCHES: DrawingSwatch[] = [
  { name: 'Grafito', hex: '#1E293B' },
  { name: 'Azul boceto', hex: '#2563EB' },
  { name: 'Sepia', hex: '#78350F' },
  { name: 'Tinta', hex: '#0F172A' },
  { name: 'Terracota', hex: '#B45309' },
  { name: 'Verde', hex: '#166534' },
  { name: 'Violeta', hex: '#6D28D9' },
  { name: 'Blanco borrador', hex: '#FFFFFF' },
];

function fmt(n: number): string {
  return Number(n.toFixed(3)).toString();
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number, steps = 28): string {
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    parts.push(`${i === 0 ? 'M' : 'L'} ${fmt(x)} ${fmt(y)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function arcPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startDeg: number,
  endDeg: number,
  steps = 18
): string {
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const deg = startDeg + ((endDeg - startDeg) * i) / steps;
    const rad = (deg * Math.PI) / 180;
    const x = cx + Math.cos(rad) * rx;
    const y = cy + Math.sin(rad) * ry;
    parts.push(`${i === 0 ? 'M' : 'L'} ${fmt(x)} ${fmt(y)}`);
  }
  return parts.join(' ');
}

export const DRAWING_LESSONS: DrawingLesson[] = [
  // =========================================================================
  // BLOQUE 1: TRAZOS Y PULSO
  // =========================================================================
  {
    id: 'stroke-lines',
    block: 'trazos',
    title: 'Líneas rectas entre 2 puntos',
    tip: 'Mira el punto final antes de mover el brazo. Traza de un solo gesto desde el hombro sin frenar a mitad.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.12 0.22 L 0.88 0.22',
      'M 0.12 0.42 L 0.88 0.42',
      'M 0.14 0.78 L 0.48 0.56',
      'M 0.52 0.56 L 0.86 0.82',
      ellipsePath(0.12, 0.22, 0.009, 0.015, 10),
      ellipsePath(0.88, 0.22, 0.009, 0.015, 10),
      ellipsePath(0.12, 0.42, 0.009, 0.015, 10),
      ellipsePath(0.88, 0.42, 0.009, 0.015, 10),
    ],
    targetCheckpoints: [
      [0.12, 0.22],
      [0.5, 0.22],
      [0.88, 0.22],
      [0.12, 0.42],
      [0.5, 0.42],
      [0.88, 0.42],
      [0.31, 0.67],
      [0.69, 0.69],
    ],
  },
  {
    id: 'stroke-parallels',
    block: 'trazos',
    title: 'Paralelas equidistantes',
    tip: 'Mantén la misma separación entre cada línea. Repite velocidad constante y evita corregir a pedazos.',
    recommendedGrid: 'grid',
    guideSvgPaths: [
      'M 0.10 0.22 L 0.44 0.22',
      'M 0.10 0.34 L 0.44 0.34',
      'M 0.10 0.46 L 0.44 0.46',
      'M 0.10 0.58 L 0.44 0.58',
      'M 0.10 0.70 L 0.44 0.70',
      'M 0.56 0.76 L 0.72 0.20',
      'M 0.64 0.76 L 0.80 0.20',
      'M 0.72 0.76 L 0.88 0.20',
    ],
    targetCheckpoints: [
      [0.27, 0.22],
      [0.27, 0.34],
      [0.27, 0.46],
      [0.27, 0.58],
      [0.27, 0.7],
      [0.64, 0.48],
      [0.72, 0.48],
      [0.8, 0.48],
    ],
  },
  {
    id: 'stroke-ellipses',
    block: 'trazos',
    title: 'Círculos y elipses continuas',
    tip: 'Haz 2 vueltas en el aire antes de tocar el lienzo y cierra cada círculo o elipse en un solo trazo fluido.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      ellipsePath(0.24, 0.36, 0.11, 0.18),
      ellipsePath(0.56, 0.36, 0.14, 0.11),
      ellipsePath(0.81, 0.36, 0.08, 0.19),
      ellipsePath(0.5, 0.74, 0.28, 0.12),
    ],
    targetCheckpoints: [
      [0.13, 0.36],
      [0.35, 0.36],
      [0.24, 0.18],
      [0.56, 0.25],
      [0.56, 0.47],
      [0.81, 0.17],
      [0.22, 0.74],
      [0.78, 0.74],
    ],
  },
  {
    id: 'stroke-scurves',
    block: 'trazos',
    title: 'Curvas en S y ondas fluidas',
    tip: 'Las curvas en S dan dinamismo al dibujo orgánico. Gira la muñeca suave y mantén el ritmo continuo.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.12 0.32 C 0.28 0.08 0.42 0.56 0.58 0.32 C 0.70 0.14 0.80 0.46 0.88 0.28',
      'M 0.12 0.68 C 0.28 0.44 0.42 0.92 0.58 0.68 C 0.70 0.50 0.80 0.82 0.88 0.64',
      'M 0.24 0.18 C 0.14 0.38 0.36 0.62 0.24 0.84',
    ],
    targetCheckpoints: [
      [0.12, 0.32],
      [0.35, 0.32],
      [0.58, 0.32],
      [0.88, 0.28],
      [0.12, 0.68],
      [0.58, 0.68],
      [0.88, 0.64],
      [0.24, 0.5],
    ],
  },
  {
    id: 'stroke-ghosting-arcs',
    block: 'trazos',
    title: 'Arcos encadenados y control de muñeca',
    tip: 'Pivota desde el codo para arcos largos y desde la muñeca para arcos cortos; conecta los extremos sin romper la curva.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.10 0.42 Q 0.23 0.16 0.36 0.42 Q 0.49 0.16 0.62 0.42 Q 0.75 0.16 0.88 0.42',
      'M 0.10 0.58 Q 0.29 0.86 0.49 0.58 Q 0.69 0.86 0.88 0.58',
      'M 0.18 0.49 L 0.80 0.49',
    ],
    targetCheckpoints: [
      [0.1, 0.42],
      [0.23, 0.29],
      [0.36, 0.42],
      [0.49, 0.29],
      [0.75, 0.29],
      [0.29, 0.72],
      [0.69, 0.72],
    ],
  },
  {
    id: 'stroke-radial-star',
    block: 'trazos',
    title: 'Trazos radiales desde el centro',
    tip: 'Sal siempre desde el punto central hacia afuera con impulso firme para equilibrar la dirección en 360 grados.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      ellipsePath(0.5, 0.5, 0.22, 0.35),
      'M 0.50 0.15 L 0.50 0.85',
      'M 0.28 0.50 L 0.72 0.50',
      'M 0.34 0.25 L 0.66 0.75',
      'M 0.66 0.25 L 0.34 0.75',
      ellipsePath(0.5, 0.5, 0.05, 0.08),
    ],
    targetCheckpoints: [
      [0.5, 0.5],
      [0.5, 0.15],
      [0.5, 0.85],
      [0.28, 0.5],
      [0.72, 0.5],
      [0.34, 0.25],
      [0.66, 0.75],
    ],
  },
  {
    id: 'stroke-concentric-rings',
    block: 'trazos',
    title: 'Óvalos concéntricos sin desviarse',
    tip: 'Mantén la misma distancia alrededor de todo el anillo; practica primero el óvalo interior y luego envuélvelo sin chocar.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      ellipsePath(0.5, 0.5, 0.09, 0.14),
      ellipsePath(0.5, 0.5, 0.18, 0.27),
      ellipsePath(0.5, 0.5, 0.28, 0.40),
      ellipsePath(0.14, 0.5, 0.05, 0.08),
      ellipsePath(0.86, 0.5, 0.05, 0.08),
    ],
    targetCheckpoints: [
      [0.5, 0.36],
      [0.5, 0.23],
      [0.5, 0.1],
      [0.22, 0.5],
      [0.78, 0.5],
      [0.14, 0.5],
      [0.86, 0.5],
    ],
  },
  {
    id: 'stroke-organic-ribbon',
    block: 'trazos',
    title: 'Cinta orgánica en torsión',
    tip: 'Dibuja primero el borde superior continuo de la cinta, luego copia el ritmo paralelo abajo y une los pliegues verticales.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.12 0.30 C 0.26 0.14 0.42 0.54 0.56 0.30 C 0.68 0.10 0.80 0.46 0.88 0.28',
      'M 0.12 0.48 C 0.26 0.32 0.42 0.72 0.56 0.48 C 0.68 0.28 0.80 0.64 0.88 0.46',
      'M 0.12 0.30 L 0.12 0.48',
      'M 0.34 0.34 L 0.34 0.52',
      'M 0.62 0.24 L 0.62 0.42',
      'M 0.88 0.28 L 0.88 0.46',
    ],
    targetCheckpoints: [
      [0.12, 0.39],
      [0.34, 0.43],
      [0.56, 0.39],
      [0.62, 0.33],
      [0.88, 0.37],
      [0.26, 0.26],
    ],
  },
  {
    id: 'stroke-variable-weight',
    block: 'trazos',
    title: 'Presión variable y trazo expresivo',
    tip: 'Empieza suave rozando el lienzo, aprieta en la zona central de la curva y vuelve a soltar al salir para afinar el extremo.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.14 0.24 Q 0.48 0.14 0.84 0.30',
      'M 0.14 0.30 Q 0.48 0.24 0.84 0.34',
      'M 0.14 0.52 Q 0.50 0.38 0.86 0.56',
      'M 0.14 0.58 Q 0.50 0.48 0.86 0.60',
      'M 0.18 0.78 C 0.36 0.66 0.62 0.88 0.82 0.74',
    ],
    targetCheckpoints: [
      [0.14, 0.27],
      [0.48, 0.2],
      [0.84, 0.32],
      [0.5, 0.47],
      [0.86, 0.58],
      [0.5, 0.78],
    ],
  },
  {
    id: 'stroke-angle-fan',
    block: 'trazos',
    title: 'Abanico de ángulos precisos',
    tip: 'Ancla la vista en el vértice inferior izquierdo y dispara cada rayo recto hacia el arco exterior calculando ángulos iguales.',
    recommendedGrid: 'grid',
    guideSvgPaths: [
      'M 0.18 0.82 L 0.78 0.82',
      'M 0.18 0.82 L 0.76 0.62',
      'M 0.18 0.82 L 0.66 0.36',
      'M 0.18 0.82 L 0.48 0.20',
      'M 0.18 0.82 L 0.18 0.16',
      arcPath(0.18, 0.82, 0.58, 0.66, -90, 0, 22),
    ],
    targetCheckpoints: [
      [0.18, 0.82],
      [0.18, 0.4],
      [0.48, 0.2],
      [0.66, 0.36],
      [0.76, 0.62],
      [0.78, 0.82],
    ],
  },
  {
    id: 'stroke-spiral-coil',
    block: 'trazos',
    title: 'Espiral continua de adentro hacia afuera',
    tip: 'Abre el radio de giro de manera constante sin tocar la vuelta previa; mantén el ritmo respirando de forma pausada.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.50 0.50 Q 0.55 0.42 0.58 0.50 Q 0.58 0.62 0.48 0.64 Q 0.36 0.64 0.36 0.48 Q 0.36 0.28 0.54 0.28 Q 0.72 0.28 0.72 0.52 Q 0.72 0.78 0.48 0.80 Q 0.22 0.80 0.22 0.48 Q 0.22 0.16 0.56 0.14',
    ],
    targetCheckpoints: [
      [0.5, 0.5],
      [0.58, 0.5],
      [0.36, 0.48],
      [0.54, 0.28],
      [0.72, 0.52],
      [0.48, 0.8],
      [0.22, 0.48],
    ],
  },
  {
    id: 'stroke-contour-leaf',
    block: 'trazos',
    title: 'Contorno ciego de hoja botánica',
    tip: 'Traza primero el nervio central curvo de punta a tallo, y envuélvelo con dos contornos en C suaves más nervaduras diagonales.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.22 0.78 Q 0.48 0.52 0.78 0.20',
      'M 0.28 0.70 C 0.24 0.42 0.46 0.22 0.78 0.20',
      'M 0.28 0.70 C 0.52 0.74 0.72 0.50 0.78 0.20',
      'M 0.42 0.56 L 0.36 0.42',
      'M 0.54 0.44 L 0.48 0.30',
      'M 0.48 0.50 L 0.62 0.54',
      'M 0.60 0.38 L 0.70 0.40',
    ],
    targetCheckpoints: [
      [0.22, 0.78],
      [0.36, 0.42],
      [0.54, 0.44],
      [0.62, 0.54],
      [0.78, 0.2],
      [0.48, 0.3],
    ],
  },

  // =========================================================================
  // BLOQUE 2: PERSPECTIVA 3D
  // =========================================================================
  {
    id: 'persp-cube-1pt',
    block: 'perspectiva',
    title: 'Cubo en 1 punto de fuga',
    tip: 'Dibuja primero el cuadrado frontal; luego lleva las esquinas hacia el punto de fuga en el horizonte.',
    recommendedGrid: 'perspective1',
    guideSvgPaths: [
      'M 0.06 0.30 L 0.94 0.30',
      'M 0.20 0.44 L 0.42 0.44 L 0.42 0.78 L 0.20 0.78 Z',
      'M 0.20 0.44 L 0.33 0.38 L 0.50 0.38 L 0.42 0.44',
      'M 0.50 0.38 L 0.50 0.63 L 0.42 0.78',
      'M 0.42 0.44 L 0.50 0.30',
      'M 0.20 0.44 L 0.50 0.30',
      'M 0.42 0.78 L 0.50 0.30',
    ],
    targetCheckpoints: [
      [0.2, 0.44],
      [0.42, 0.44],
      [0.42, 0.78],
      [0.2, 0.78],
      [0.33, 0.38],
      [0.5, 0.38],
      [0.5, 0.63],
    ],
  },
  {
    id: 'persp-building-2pt',
    block: 'perspectiva',
    title: 'Edificio en 2 puntos de fuga',
    tip: 'La arista central es completamente vertical. Sus caras fugan hacia la izquierda y derecha sobre el horizonte.',
    recommendedGrid: 'perspective2',
    guideSvgPaths: [
      'M 0.06 0.48 L 0.94 0.48',
      'M 0.50 0.22 L 0.50 0.80',
      'M 0.50 0.22 L 0.28 0.34 L 0.28 0.68 L 0.50 0.80',
      'M 0.50 0.22 L 0.72 0.34 L 0.72 0.68 L 0.50 0.80',
      'M 0.36 0.39 L 0.36 0.61 L 0.44 0.65 L 0.44 0.41 Z',
      'M 0.56 0.41 L 0.56 0.65 L 0.64 0.61 L 0.64 0.39 Z',
    ],
    targetCheckpoints: [
      [0.5, 0.22],
      [0.5, 0.8],
      [0.28, 0.34],
      [0.28, 0.68],
      [0.72, 0.34],
      [0.72, 0.68],
      [0.4, 0.52],
      [0.6, 0.52],
    ],
  },
  {
    id: 'persp-cylinder',
    block: 'perspectiva',
    title: 'Cilindro y elipses de corte',
    tip: 'La elipse inferior siempre se abre más que la superior al estar más abajo del nivel de tus ojos.',
    recommendedGrid: 'grid',
    guideSvgPaths: [
      'M 0.50 0.14 L 0.50 0.88',
      ellipsePath(0.5, 0.24, 0.16, 0.065),
      'M 0.34 0.24 L 0.34 0.74',
      'M 0.66 0.24 L 0.66 0.74',
      arcPath(0.5, 0.74, 0.16, 0.105, 0, 180),
      arcPath(0.5, 0.74, 0.16, 0.105, 180, 360),
    ],
    targetCheckpoints: [
      [0.5, 0.18],
      [0.34, 0.24],
      [0.66, 0.24],
      [0.34, 0.5],
      [0.66, 0.5],
      [0.34, 0.74],
      [0.66, 0.74],
      [0.5, 0.84],
    ],
  },
  {
    id: 'persp-cone-pyramid',
    block: 'perspectiva',
    title: 'Cono y pirámide centrados',
    tip: 'Traza primero la base y levanta el eje central vertical para colocar el vértice sin inclinar el volumen.',
    recommendedGrid: 'perspective1',
    guideSvgPaths: [
      // Cono izquierda
      'M 0.30 0.18 L 0.16 0.74',
      'M 0.30 0.18 L 0.44 0.74',
      'M 0.30 0.18 L 0.30 0.74',
      ellipsePath(0.3, 0.74, 0.14, 0.075),
      // Piramide derecha
      'M 0.70 0.18 L 0.56 0.70 L 0.72 0.80 L 0.84 0.68 Z',
      'M 0.70 0.18 L 0.72 0.80',
      'M 0.56 0.70 L 0.68 0.62 L 0.84 0.68',
    ],
    targetCheckpoints: [
      [0.3, 0.18],
      [0.16, 0.74],
      [0.44, 0.74],
      [0.3, 0.81],
      [0.7, 0.18],
      [0.56, 0.7],
      [0.72, 0.8],
      [0.84, 0.68],
    ],
  },
  {
    id: 'persp-street-1pt',
    block: 'perspectiva',
    title: 'Avenida con postes en fuga',
    tip: 'Cada poste se vuelve más bajo y más cercano al anterior conforme se acerca al punto de fuga en el horizonte.',
    recommendedGrid: 'perspective1',
    guideSvgPaths: [
      'M 0.06 0.36 L 0.94 0.36',
      'M 0.10 0.88 L 0.50 0.36 L 0.90 0.88',
      'M 0.24 0.88 L 0.50 0.36 L 0.76 0.88',
      'M 0.14 0.20 L 0.50 0.36',
      'M 0.18 0.76 L 0.18 0.22',
      'M 0.30 0.61 L 0.30 0.27',
      'M 0.38 0.51 L 0.38 0.31',
      'M 0.44 0.44 L 0.44 0.33',
    ],
    targetCheckpoints: [
      [0.5, 0.36],
      [0.18, 0.22],
      [0.18, 0.76],
      [0.3, 0.27],
      [0.38, 0.51],
      [0.76, 0.88],
      [0.9, 0.88],
    ],
  },
  {
    id: 'persp-interior-room',
    block: 'perspectiva',
    title: 'Habitación interior en 1 punto',
    tip: 'Empieza por la pared del fondo rectangular; extiende las diagonales desde el punto de fuga por las 4 esquinas para abrir piso y techo.',
    recommendedGrid: 'perspective1',
    guideSvgPaths: [
      'M 0.30 0.24 L 0.70 0.24 L 0.70 0.68 L 0.30 0.68 Z',
      'M 0.10 0.08 L 0.30 0.24',
      'M 0.90 0.08 L 0.70 0.24',
      'M 0.10 0.88 L 0.30 0.68',
      'M 0.90 0.88 L 0.70 0.68',
      // Puerta izquierda y ventana derecha
      'M 0.16 0.82 L 0.16 0.30 L 0.25 0.35 L 0.25 0.73',
      'M 0.76 0.31 L 0.86 0.26 L 0.86 0.58 L 0.76 0.54 Z',
    ],
    targetCheckpoints: [
      [0.3, 0.24],
      [0.7, 0.24],
      [0.7, 0.68],
      [0.3, 0.68],
      [0.16, 0.3],
      [0.86, 0.26],
      [0.9, 0.88],
    ],
  },
  {
    id: 'persp-stacked-boxes',
    block: 'perspectiva',
    title: 'Bloques apilados en 2 puntos',
    tip: 'Comparte la misma línea de horizonte para ambos volúmenes; alinea primero las aristas verticales y fuga cada base por separado.',
    recommendedGrid: 'perspective2',
    guideSvgPaths: [
      'M 0.06 0.48 L 0.94 0.48',
      // Caja inferior
      'M 0.50 0.52 L 0.50 0.84',
      'M 0.50 0.52 L 0.26 0.46 L 0.26 0.72 L 0.50 0.84',
      'M 0.50 0.52 L 0.74 0.46 L 0.74 0.72 L 0.50 0.84',
      'M 0.26 0.46 L 0.50 0.40 L 0.74 0.46',
      // Caja superior mas estrecha
      'M 0.48 0.18 L 0.48 0.44',
      'M 0.48 0.18 L 0.34 0.26 L 0.34 0.43 L 0.48 0.44',
      'M 0.48 0.18 L 0.62 0.26 L 0.62 0.43 L 0.48 0.44',
    ],
    targetCheckpoints: [
      [0.5, 0.52],
      [0.5, 0.84],
      [0.26, 0.72],
      [0.74, 0.72],
      [0.48, 0.18],
      [0.34, 0.26],
      [0.62, 0.26],
    ],
  },
  {
    id: 'persp-arch-tunnel',
    block: 'perspectiva',
    title: 'Arcos seriados en perspectiva',
    tip: 'Enmarca cada arco dentro de un rectángulo en perspectiva antes de curvar la bóveda; así mantienes simétrica la clave superior.',
    recommendedGrid: 'perspective1',
    guideSvgPaths: [
      'M 0.08 0.52 L 0.92 0.52',
      'M 0.20 0.84 L 0.20 0.34 Q 0.50 0.08 0.80 0.34 L 0.80 0.84',
      'M 0.32 0.72 L 0.32 0.42 Q 0.50 0.26 0.68 0.42 L 0.68 0.72',
      'M 0.41 0.62 L 0.41 0.47 Q 0.50 0.39 0.59 0.47 L 0.59 0.62',
      'M 0.20 0.84 L 0.50 0.52 L 0.80 0.84',
    ],
    targetCheckpoints: [
      [0.2, 0.84],
      [0.5, 0.21],
      [0.8, 0.84],
      [0.32, 0.42],
      [0.68, 0.42],
      [0.5, 0.43],
    ],
  },
  {
    id: 'persp-staircase-1pt',
    block: 'perspectiva',
    title: 'Escalera ascendente en fuga',
    tip: 'Las líneas horizontales de los peldaños son paralelas al marco y todos los bordes laterales fugan hacia el mismo punto.',
    recommendedGrid: 'perspective1',
    guideSvgPaths: [
      'M 0.08 0.32 L 0.92 0.32',
      'M 0.22 0.84 L 0.78 0.84 L 0.78 0.74 L 0.22 0.74 Z',
      'M 0.27 0.74 L 0.27 0.65 L 0.73 0.65 L 0.73 0.74',
      'M 0.32 0.65 L 0.32 0.56 L 0.68 0.56 L 0.68 0.65',
      'M 0.37 0.56 L 0.37 0.48 L 0.63 0.48 L 0.63 0.56',
      'M 0.22 0.74 L 0.50 0.32 L 0.78 0.74',
    ],
    targetCheckpoints: [
      [0.22, 0.84],
      [0.78, 0.84],
      [0.27, 0.65],
      [0.73, 0.65],
      [0.37, 0.48],
      [0.63, 0.48],
      [0.5, 0.32],
    ],
  },
  {
    id: 'persp-horizon-cubes',
    block: 'perspectiva',
    title: 'Cubos arriba, en y bajo el horizonte',
    tip: 'Por encima del horizonte ves la base inferior; justo encima del horizonte solo ves caras frontales; debajo ves la tapa superior.',
    recommendedGrid: 'perspective1',
    guideSvgPaths: [
      'M 0.06 0.48 L 0.94 0.48',
      // Cubo superior izquierdo (muestra cara inferior)
      'M 0.14 0.14 L 0.30 0.14 L 0.30 0.32 L 0.14 0.32 Z',
      'M 0.14 0.32 L 0.26 0.38 L 0.38 0.38 L 0.30 0.32',
      'M 0.30 0.14 L 0.38 0.24 L 0.38 0.38',
      // Cubo central sobre el horizonte
      'M 0.43 0.38 L 0.57 0.38 L 0.57 0.58 L 0.43 0.58 Z',
      // Cubo inferior derecho (muestra tapa superior)
      'M 0.70 0.64 L 0.86 0.64 L 0.86 0.84 L 0.70 0.84 Z',
      'M 0.70 0.64 L 0.62 0.58 L 0.78 0.58 L 0.86 0.64',
      'M 0.62 0.58 L 0.62 0.76 L 0.70 0.84',
    ],
    targetCheckpoints: [
      [0.22, 0.23],
      [0.34, 0.35],
      [0.5, 0.48],
      [0.78, 0.74],
      [0.74, 0.61],
      [0.62, 0.68],
    ],
  },
  {
    id: 'persp-foreshortened-cylinder',
    block: 'perspectiva',
    title: 'Cilindro acostado en escorzo',
    tip: 'El eje menor de ambas elipses debe alinearse exactamente con el eje central del cilindro acostado.',
    recommendedGrid: 'perspective1',
    guideSvgPaths: [
      'M 0.18 0.66 L 0.80 0.34',
      ellipsePath(0.28, 0.61, 0.10, 0.22),
      ellipsePath(0.70, 0.39, 0.06, 0.13),
      'M 0.23 0.40 L 0.67 0.26',
      'M 0.33 0.82 L 0.73 0.52',
    ],
    targetCheckpoints: [
      [0.28, 0.61],
      [0.23, 0.4],
      [0.33, 0.82],
      [0.7, 0.39],
      [0.67, 0.26],
      [0.73, 0.52],
    ],
  },

  // =========================================================================
  // BLOQUE 3: LUZ, VOLUMEN Y ACHURADO
  // =========================================================================
  {
    id: 'light-gradient',
    block: 'luz',
    title: 'Degradado tonal en 5 valores',
    tip: 'De izquierda a derecha: aumenta densidad y presión de líneas paralelas para pasar de blanco a sombra profunda.',
    recommendedGrid: 'grid',
    guideSvgPaths: [
      'M 0.10 0.30 L 0.90 0.30 L 0.90 0.70 L 0.10 0.70 Z',
      'M 0.26 0.30 L 0.26 0.70',
      'M 0.42 0.30 L 0.42 0.70',
      'M 0.58 0.30 L 0.58 0.70',
      'M 0.74 0.30 L 0.74 0.70',
      // Indicadores de direccion de achurado
      'M 0.30 0.64 L 0.38 0.36',
      'M 0.46 0.64 L 0.54 0.36',
      'M 0.62 0.64 L 0.70 0.36',
      'M 0.78 0.64 L 0.86 0.36',
    ],
    targetCheckpoints: [
      [0.18, 0.5],
      [0.34, 0.5],
      [0.5, 0.5],
      [0.66, 0.5],
      [0.82, 0.5],
      [0.1, 0.3],
      [0.9, 0.7],
    ],
  },
  {
    id: 'light-crosshatch',
    block: 'luz',
    title: 'Achurado cruzado de sombra',
    tip: 'Cruza una primera trama a 45° con una segunda capa en ángulo contrario. Usa menos opacidad para superponer.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.16 0.22 L 0.46 0.22 L 0.46 0.78 L 0.16 0.78 Z',
      'M 0.20 0.72 L 0.42 0.28',
      'M 0.28 0.72 L 0.44 0.40',
      'M 0.20 0.28 L 0.42 0.72',
      'M 0.54 0.22 L 0.84 0.22 L 0.84 0.78 L 0.54 0.78 Z',
      'M 0.58 0.72 L 0.80 0.28',
      'M 0.58 0.28 L 0.80 0.72',
      'M 0.56 0.50 L 0.82 0.50',
    ],
    targetCheckpoints: [
      [0.24, 0.36],
      [0.38, 0.36],
      [0.31, 0.64],
      [0.62, 0.36],
      [0.76, 0.36],
      [0.69, 0.5],
      [0.69, 0.66],
    ],
  },
  {
    id: 'light-sphere',
    block: 'luz',
    title: 'Esfera iluminada y 5 zonas',
    tip: 'Foco arriba-izquierda: deja brillo limpio, sombrea el terminador curvo, deja luz reflejada en el borde inferior y proyecta la sombra.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      ellipsePath(0.45, 0.47, 0.18, 0.30),
      // Brillo principal
      ellipsePath(0.38, 0.33, 0.04, 0.055),
      // Linea terminadora curva
      arcPath(0.45, 0.47, 0.16, 0.27, -25, 115),
      // Sombra proyectada en el piso
      ellipsePath(0.62, 0.75, 0.21, 0.075),
      // Rayo de luz guia
      'M 0.14 0.16 L 0.26 0.26',
    ],
    targetCheckpoints: [
      [0.38, 0.33],
      [0.27, 0.47],
      [0.63, 0.47],
      [0.45, 0.17],
      [0.45, 0.77],
      [0.54, 0.56],
      [0.66, 0.75],
      [0.78, 0.75],
    ],
  },
  {
    id: 'light-cube-shadow',
    block: 'luz',
    title: 'Cubo con luz lateral y sombra',
    tip: 'Asigna 3 valores distintos: cara superior casi blanca, cara izquierda medio tono, cara derecha sombra propia y sombra en el suelo.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.44 0.20 L 0.60 0.30 L 0.44 0.40 L 0.28 0.30 Z',
      'M 0.28 0.30 L 0.28 0.64 L 0.44 0.74 L 0.44 0.40',
      'M 0.60 0.30 L 0.60 0.64 L 0.44 0.74',
      // Sombra proyectada
      'M 0.60 0.64 L 0.82 0.72 L 0.64 0.82 L 0.44 0.74',
    ],
    targetCheckpoints: [
      [0.44, 0.2],
      [0.28, 0.3],
      [0.6, 0.3],
      [0.44, 0.4],
      [0.36, 0.52],
      [0.52, 0.52],
      [0.66, 0.74],
    ],
  },
  {
    id: 'light-cylinder-wrap',
    block: 'luz',
    title: 'Volumen curvo en cilindro vertical',
    tip: 'Coloca la banda de sombra más oscura cerca del borde derecho sin llegar a la orilla; deja un hilo claro de luz rebotada.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      ellipsePath(0.42, 0.24, 0.13, 0.055),
      'M 0.29 0.24 L 0.29 0.74',
      'M 0.55 0.24 L 0.55 0.74',
      arcPath(0.42, 0.74, 0.13, 0.07, 0, 180),
      // Banda del terminador y trama vertical suave
      'M 0.47 0.29 L 0.47 0.79',
      'M 0.51 0.28 L 0.51 0.78',
      // Sombra proyectada
      'M 0.55 0.74 L 0.82 0.78 L 0.66 0.85 L 0.42 0.81',
    ],
    targetCheckpoints: [
      [0.42, 0.24],
      [0.29, 0.5],
      [0.47, 0.52],
      [0.55, 0.5],
      [0.42, 0.81],
      [0.68, 0.8],
    ],
  },
  {
    id: 'light-cone-terminator',
    block: 'luz',
    title: 'Cono bajo luz rasante',
    tip: 'La sombra propia en un cono converge como un triángulo desde el vértice hasta la base elíptica.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.42 0.16 L 0.24 0.76',
      'M 0.42 0.16 L 0.60 0.76',
      ellipsePath(0.42, 0.76, 0.18, 0.08),
      'M 0.42 0.16 L 0.48 0.84',
      'M 0.42 0.16 L 0.54 0.81',
      'M 0.60 0.76 L 0.84 0.74 L 0.52 0.84',
      'M 0.14 0.22 L 0.24 0.30',
    ],
    targetCheckpoints: [
      [0.42, 0.16],
      [0.24, 0.76],
      [0.6, 0.76],
      [0.48, 0.6],
      [0.54, 0.7],
      [0.72, 0.78],
    ],
  },
  {
    id: 'light-contour-hatching',
    block: 'luz',
    title: 'Trama que envuelve la forma',
    tip: 'En lugar de rayar recto, curva tus líneas de sombra siguiendo el contorno circular de la vasija para dar volumen inmediato.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      ellipsePath(0.5, 0.22, 0.11, 0.045),
      'M 0.39 0.22 C 0.32 0.42 0.30 0.64 0.38 0.82',
      'M 0.61 0.22 C 0.68 0.42 0.70 0.64 0.62 0.82',
      arcPath(0.5, 0.82, 0.12, 0.055, 0, 180),
      arcPath(0.5, 0.38, 0.17, 0.06, 15, 165),
      arcPath(0.5, 0.52, 0.19, 0.07, 15, 165),
      arcPath(0.5, 0.66, 0.18, 0.07, 15, 165),
    ],
    targetCheckpoints: [
      [0.5, 0.22],
      [0.34, 0.52],
      [0.66, 0.52],
      [0.5, 0.44],
      [0.5, 0.59],
      [0.5, 0.73],
    ],
  },
  {
    id: 'light-cast-shadow-geometry',
    block: 'luz',
    title: 'Proyección de sombra por rayo de luz',
    tip: 'Traza rayos desde el foco hasta las esquinas superiores del bloque y únelos con líneas al suelo para hallar la sombra exacta.',
    recommendedGrid: 'perspective1',
    guideSvgPaths: [
      ellipsePath(0.16, 0.18, 0.025, 0.04),
      'M 0.34 0.38 L 0.46 0.38 L 0.46 0.74 L 0.34 0.74 Z',
      'M 0.16 0.18 L 0.34 0.38 L 0.68 0.76',
      'M 0.16 0.18 L 0.46 0.38 L 0.82 0.70',
      'M 0.34 0.74 L 0.68 0.76 L 0.82 0.70 L 0.46 0.74',
    ],
    targetCheckpoints: [
      [0.16, 0.18],
      [0.34, 0.38],
      [0.46, 0.38],
      [0.4, 0.74],
      [0.68, 0.76],
      [0.82, 0.7],
    ],
  },
  {
    id: 'light-planar-egg',
    block: 'luz',
    title: 'Huevo en planos de luz y medio tono',
    tip: 'Divide el ovoide en cuatro islas claras antes de difuminar: brillo alto, medio tono envolvente, sombra núcleo y luz rebotada.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.46 0.18 C 0.34 0.18 0.29 0.42 0.30 0.60 C 0.31 0.76 0.38 0.82 0.46 0.82 C 0.54 0.82 0.61 0.76 0.62 0.60 C 0.63 0.42 0.58 0.18 0.46 0.18 Z',
      ellipsePath(0.4, 0.34, 0.04, 0.07),
      'M 0.44 0.22 C 0.54 0.38 0.56 0.60 0.44 0.79',
      ellipsePath(0.62, 0.81, 0.18, 0.055),
    ],
    targetCheckpoints: [
      [0.46, 0.18],
      [0.4, 0.34],
      [0.3, 0.6],
      [0.52, 0.5],
      [0.46, 0.82],
      [0.68, 0.81],
    ],
  },
  {
    id: 'light-rim-backlight',
    block: 'luz',
    title: 'Contraluz y borde luminoso',
    tip: 'Cuando la luz viene de atrás, el interior queda oscuro y uniforme mientras el contorno brilla como un filete blanco continuo.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      ellipsePath(0.5, 0.32, 0.09, 0.14),
      'M 0.34 0.82 C 0.34 0.58 0.40 0.50 0.50 0.50 C 0.60 0.50 0.66 0.58 0.66 0.82',
      // Halo trasero
      arcPath(0.5, 0.32, 0.12, 0.19, -155, -25),
      'M 0.43 0.24 L 0.41 0.42',
      'M 0.57 0.24 L 0.59 0.42',
      'M 0.38 0.62 L 0.62 0.62',
    ],
    targetCheckpoints: [
      [0.5, 0.18],
      [0.5, 0.13],
      [0.41, 0.32],
      [0.59, 0.32],
      [0.36, 0.72],
      [0.64, 0.72],
    ],
  },
  {
    id: 'light-metallic-gloss',
    block: 'luz',
    title: 'Contraste duro en superficie metálica',
    tip: 'El metal refleja el entorno con cortes abruptos de negro casi puro junto a blancos intactos sin grises suaves.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      ellipsePath(0.5, 0.22, 0.14, 0.05),
      'M 0.36 0.22 C 0.36 0.44 0.44 0.52 0.48 0.56 L 0.48 0.74 L 0.38 0.82 L 0.62 0.82 L 0.52 0.74 L 0.52 0.56 C 0.56 0.52 0.64 0.44 0.64 0.22',
      // Bandas especulares verticales
      'M 0.41 0.26 L 0.44 0.48',
      'M 0.56 0.26 L 0.54 0.48',
      'M 0.59 0.26 L 0.58 0.46',
    ],
    targetCheckpoints: [
      [0.5, 0.22],
      [0.41, 0.36],
      [0.56, 0.36],
      [0.5, 0.56],
      [0.5, 0.74],
      [0.38, 0.82],
      [0.62, 0.82],
    ],
  },

  // =========================================================================
  // BLOQUE 4: PROPORCIONES Y FIGURA
  // =========================================================================
  {
    id: 'prop-head-front',
    block: 'proporcion',
    title: 'Canon de rostro frontal',
    tip: 'Los ojos van exactamente en la mitad vertical del cráneo; nariz y mentón dividen la mitad inferior en tercios.',
    recommendedGrid: 'grid',
    recommendedSymmetry: 'vertical',
    guideSvgPaths: [
      ellipsePath(0.5, 0.42, 0.145, 0.24),
      // Mandibula
      'M 0.36 0.45 L 0.38 0.67 L 0.50 0.80 L 0.62 0.67 L 0.64 0.45',
      // Eje central y tercios
      'M 0.50 0.14 L 0.50 0.84',
      'M 0.34 0.47 L 0.66 0.47', // Linea de ojos
      'M 0.38 0.61 L 0.62 0.61', // Base nariz
      'M 0.42 0.70 L 0.58 0.70', // Boca
      // Ojos guia
      ellipsePath(0.43, 0.47, 0.028, 0.022),
      ellipsePath(0.57, 0.47, 0.028, 0.022),
    ],
    targetCheckpoints: [
      [0.5, 0.18],
      [0.36, 0.45],
      [0.64, 0.45],
      [0.43, 0.47],
      [0.57, 0.47],
      [0.5, 0.61],
      [0.5, 0.7],
      [0.5, 0.8],
    ],
  },
  {
    id: 'prop-head-profile',
    block: 'proporcion',
    title: 'Canon de rostro de perfil',
    tip: 'Empieza con el círculo del cráneo y proyecta el plano frontal de la nariz y mentón. La oreja va detrás del eje medio.',
    recommendedGrid: 'grid',
    guideSvgPaths: [
      ellipsePath(0.52, 0.40, 0.15, 0.23),
      // Perfil izquierdo
      'M 0.38 0.34 L 0.34 0.48 L 0.31 0.56 L 0.36 0.58 L 0.35 0.67 L 0.39 0.77 L 0.53 0.73 L 0.57 0.61',
      // Linea ojos y oreja
      'M 0.32 0.46 L 0.67 0.46',
      ellipsePath(0.54, 0.54, 0.026, 0.07),
      'M 0.52 0.14 L 0.52 0.82',
    ],
    targetCheckpoints: [
      [0.52, 0.18],
      [0.67, 0.4],
      [0.34, 0.48],
      [0.31, 0.56],
      [0.39, 0.77],
      [0.54, 0.54],
      [0.53, 0.73],
    ],
  },
  {
    id: 'prop-mannequin',
    block: 'proporcion',
    title: 'Figura humana en bloques',
    tip: 'Simplifica el cuerpo en 3 masas: cabeza, caja torácica inclinada y pelvis. Conecta articulaciones con líneas de acción.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      ellipsePath(0.5, 0.16, 0.042, 0.072),
      // Torso (caja)
      'M 0.42 0.26 L 0.58 0.26 L 0.55 0.47 L 0.45 0.47 Z',
      // Pelvis
      'M 0.44 0.50 L 0.56 0.50 L 0.58 0.60 L 0.42 0.60 Z',
      // Brazos
      'M 0.42 0.28 L 0.34 0.44 L 0.31 0.58',
      'M 0.58 0.28 L 0.66 0.42 L 0.71 0.34',
      // Piernas
      'M 0.45 0.60 L 0.43 0.76 L 0.41 0.90',
      'M 0.55 0.60 L 0.59 0.75 L 0.63 0.90',
    ],
    targetCheckpoints: [
      [0.5, 0.16],
      [0.5, 0.36],
      [0.5, 0.55],
      [0.34, 0.44],
      [0.66, 0.42],
      [0.43, 0.76],
      [0.59, 0.75],
    ],
  },
  {
    id: 'prop-hand-stilllife',
    block: 'proporcion',
    title: 'Mano en bloques y taza',
    tip: 'Reduce la palma a un pentágono y los dedos a cilindros agrupados; junto a la taza practicas proporción relativa.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      // Mano izquierda en bloques
      'M 0.20 0.56 L 0.34 0.56 L 0.36 0.76 L 0.22 0.76 Z',
      'M 0.20 0.56 L 0.20 0.30 L 0.23 0.30 L 0.23 0.56',
      'M 0.24 0.56 L 0.25 0.24 L 0.28 0.24 L 0.28 0.56',
      'M 0.29 0.56 L 0.30 0.28 L 0.33 0.28 L 0.33 0.56',
      'M 0.34 0.66 L 0.41 0.52 L 0.43 0.55 L 0.36 0.72',
      // Taza derecha
      ellipsePath(0.68, 0.40, 0.11, 0.05),
      'M 0.57 0.40 L 0.59 0.74',
      'M 0.79 0.40 L 0.77 0.74',
      arcPath(0.68, 0.74, 0.09, 0.055, 0, 180),
      arcPath(0.79, 0.56, 0.055, 0.095, -80, 85),
    ],
    targetCheckpoints: [
      [0.27, 0.66],
      [0.26, 0.34],
      [0.39, 0.6],
      [0.68, 0.4],
      [0.58, 0.58],
      [0.78, 0.58],
      [0.68, 0.79],
    ],
  },
  {
    id: 'prop-head-3quarter',
    block: 'proporcion',
    title: 'Cabeza en plano Loomis 3/4',
    tip: 'Corta un óvalo lateral plano para la sien y cruza en T el eje de las cejas con la línea central curva del rostro.',
    recommendedGrid: 'grid',
    guideSvgPaths: [
      ellipsePath(0.48, 0.40, 0.16, 0.25),
      // Corte lateral de sien y eje en cruz
      ellipsePath(0.57, 0.41, 0.06, 0.14),
      'M 0.57 0.27 L 0.57 0.55',
      'M 0.33 0.40 Q 0.44 0.43 0.62 0.39',
      // Linea media frontal girada
      'M 0.42 0.17 Q 0.38 0.48 0.41 0.80',
      // Mandibula
      'M 0.35 0.50 L 0.35 0.68 L 0.41 0.80 L 0.54 0.72 L 0.59 0.54',
    ],
    targetCheckpoints: [
      [0.48, 0.16],
      [0.42, 0.41],
      [0.57, 0.41],
      [0.35, 0.58],
      [0.41, 0.8],
      [0.54, 0.72],
    ],
  },
  {
    id: 'prop-eye-anatomy',
    block: 'proporcion',
    title: 'Construcción del ojo en tres planos',
    tip: 'Envuelve una esfera real con dos párpados curvos en volumen; el párpado superior cubre ligeramente la parte alta del iris.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      ellipsePath(0.5, 0.5, 0.22, 0.26),
      // Pliegue superior y apertura
      'M 0.20 0.42 Q 0.48 0.22 0.78 0.44',
      'M 0.24 0.52 Q 0.48 0.30 0.76 0.50',
      'M 0.24 0.52 Q 0.48 0.68 0.76 0.50',
      // Iris y pupila
      ellipsePath(0.5, 0.49, 0.08, 0.13),
      ellipsePath(0.5, 0.49, 0.03, 0.05),
    ],
    targetCheckpoints: [
      [0.24, 0.52],
      [0.48, 0.31],
      [0.76, 0.5],
      [0.5, 0.49],
      [0.48, 0.64],
      [0.48, 0.24],
    ],
  },
  {
    id: 'prop-nose-planes',
    block: 'proporcion',
    title: 'Nariz en prismas geométricos',
    tip: 'Piensa en la nariz como una cuña tridimensional con puente frontal, paredes laterales inclinadas y plano inferior sombreado.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.45 0.18 L 0.55 0.18 L 0.54 0.56 L 0.46 0.56 Z',
      'M 0.45 0.18 L 0.37 0.62 L 0.46 0.56',
      'M 0.55 0.18 L 0.63 0.62 L 0.54 0.56',
      'M 0.46 0.56 L 0.39 0.68 L 0.50 0.75 L 0.61 0.68 L 0.54 0.56',
      'M 0.37 0.62 Q 0.32 0.72 0.40 0.74',
      'M 0.63 0.62 Q 0.68 0.72 0.60 0.74',
    ],
    targetCheckpoints: [
      [0.5, 0.18],
      [0.5, 0.56],
      [0.37, 0.62],
      [0.63, 0.62],
      [0.5, 0.75],
      [0.39, 0.68],
    ],
  },
  {
    id: 'prop-mouth-lips',
    block: 'proporcion',
    title: 'Labios y volumen cilíndrico',
    tip: 'La línea entre labios nunca es recta: baja al centro como una gaviota suave y apoya el labio inferior sobre dos almohadillas.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.22 0.50 Q 0.36 0.46 0.50 0.52 Q 0.64 0.46 0.78 0.50',
      'M 0.22 0.50 Q 0.36 0.36 0.45 0.40 L 0.50 0.43 L 0.55 0.40 Q 0.64 0.36 0.78 0.50',
      'M 0.22 0.50 Q 0.38 0.72 0.50 0.70 Q 0.62 0.72 0.78 0.50',
      ellipsePath(0.5, 0.48, 0.05, 0.05),
      ellipsePath(0.42, 0.6, 0.07, 0.06),
      ellipsePath(0.58, 0.6, 0.07, 0.06),
    ],
    targetCheckpoints: [
      [0.22, 0.5],
      [0.5, 0.43],
      [0.5, 0.52],
      [0.78, 0.5],
      [0.42, 0.6],
      [0.58, 0.6],
    ],
  },
  {
    id: 'prop-ear-helix',
    block: 'proporcion',
    title: 'Oreja en C e Y internas',
    tip: 'Inclina la oreja ligeramente hacia atrás igual que el puente nasal; simplifica el hélix en C externa y el antihélix en Y interna.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.38 0.26 C 0.42 0.14 0.66 0.14 0.64 0.44 C 0.62 0.70 0.52 0.84 0.42 0.80 C 0.36 0.77 0.37 0.66 0.42 0.64',
      'M 0.44 0.32 C 0.56 0.28 0.58 0.48 0.50 0.68',
      'M 0.42 0.42 L 0.52 0.46',
      'M 0.39 0.52 Q 0.45 0.55 0.42 0.62',
    ],
    targetCheckpoints: [
      [0.54, 0.18],
      [0.64, 0.44],
      [0.44, 0.8],
      [0.5, 0.46],
      [0.42, 0.56],
      [0.38, 0.26],
    ],
  },
  {
    id: 'prop-contrapposto',
    block: 'proporcion',
    title: 'Pose contrapposto e inclinación de ejes',
    tip: 'Cuando el peso cae sobre una pierna, la cadera sube de ese lado y los hombros se inclinan en sentido contrario para equilibrar.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      ellipsePath(0.5, 0.15, 0.042, 0.072),
      // Linea de hombros (cae a la derecha) y cadera (sube a la derecha)
      'M 0.40 0.25 L 0.60 0.31',
      'M 0.43 0.56 L 0.57 0.50',
      // Columna en S y torso
      'M 0.50 0.24 Q 0.46 0.38 0.52 0.52',
      'M 0.40 0.25 L 0.43 0.56',
      'M 0.60 0.31 L 0.57 0.50',
      // Pierna de apoyo (recta bajo cabeza) y pierna libre
      'M 0.52 0.52 L 0.50 0.72 L 0.49 0.90',
      'M 0.44 0.56 L 0.36 0.72 L 0.38 0.88',
    ],
    targetCheckpoints: [
      [0.5, 0.15],
      [0.4, 0.25],
      [0.6, 0.31],
      [0.57, 0.5],
      [0.5, 0.72],
      [0.36, 0.72],
    ],
  },
  {
    id: 'prop-foot-wedge',
    block: 'proporcion',
    title: 'Pie simplificado en cuña y tobillo',
    tip: 'Construye el pie como una rampa triangular desde el cilindro del tobillo hasta la caja plana de los dedos antes de detallar curvas.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.24 0.22 L 0.38 0.22 L 0.38 0.52 L 0.24 0.52 Z',
      'M 0.24 0.52 Q 0.18 0.68 0.24 0.78 L 0.78 0.78 L 0.78 0.66 L 0.38 0.46',
      'M 0.38 0.78 Q 0.46 0.70 0.56 0.78',
      ellipsePath(0.32, 0.58, 0.035, 0.055),
    ],
    targetCheckpoints: [
      [0.31, 0.22],
      [0.24, 0.78],
      [0.52, 0.56],
      [0.78, 0.72],
      [0.5, 0.78],
      [0.32, 0.58],
    ],
  },
  {
    id: 'prop-skull-front',
    block: 'proporcion',
    title: 'Cráneo humano y cavidades oculares',
    tip: 'Las cuencas oculares son trapecios inclinados y los pómulos forman un puente horizontal clave bajo los ojos.',
    recommendedGrid: 'grid',
    recommendedSymmetry: 'vertical',
    guideSvgPaths: [
      ellipsePath(0.5, 0.38, 0.15, 0.23),
      'M 0.35 0.46 L 0.38 0.60 L 0.41 0.80 L 0.59 0.80 L 0.62 0.60 L 0.65 0.46',
      'M 0.38 0.42 L 0.47 0.44 L 0.46 0.52 L 0.38 0.50 Z',
      'M 0.62 0.42 L 0.53 0.44 L 0.54 0.52 L 0.62 0.50 Z',
      'M 0.50 0.51 L 0.47 0.61 L 0.53 0.61 Z',
      'M 0.42 0.70 L 0.58 0.70',
    ],
    targetCheckpoints: [
      [0.5, 0.16],
      [0.42, 0.47],
      [0.58, 0.47],
      [0.5, 0.57],
      [0.5, 0.7],
      [0.41, 0.8],
      [0.59, 0.8],
    ],
  },

  // =========================================================================
  // BLOQUE 5: COMPOSICION Y SIMETRIA
  // =========================================================================
  {
    id: 'comp-thirds',
    block: 'composicion',
    title: 'Regla de tercios y paisaje',
    tip: 'Sitúa el horizonte en el tercio inferior y el punto de interés (árbol o sol) en una intersección de los tercios.',
    recommendedGrid: 'grid',
    guideSvgPaths: [
      // Lineas de tercios
      'M 0.333 0.08 L 0.333 0.92',
      'M 0.667 0.08 L 0.667 0.92',
      'M 0.08 0.333 L 0.92 0.333',
      'M 0.08 0.667 L 0.92 0.667',
      // Montañas y sol en tercios
      'M 0.08 0.667 L 0.28 0.46 L 0.46 0.667 L 0.66 0.42 L 0.92 0.667',
      ellipsePath(0.333, 0.333, 0.055, 0.09),
      // Camino en perspectiva
      'M 0.667 0.667 L 0.48 0.92',
      'M 0.667 0.667 L 0.78 0.92',
    ],
    targetCheckpoints: [
      [0.333, 0.333],
      [0.28, 0.46],
      [0.66, 0.42],
      [0.18, 0.667],
      [0.82, 0.667],
      [0.6, 0.82],
    ],
  },
  {
    id: 'comp-mirror-vase',
    block: 'composicion',
    title: 'Jarrón simétrico en espejo',
    tip: 'Con Simetría Espejo activa, dibuja solo el contorno izquierdo del jarrón y su reflejo cerrará la silueta exacta.',
    recommendedGrid: 'none',
    recommendedSymmetry: 'vertical',
    guideSvgPaths: [
      'M 0.50 0.12 L 0.50 0.88',
      'M 0.42 0.18 C 0.44 0.26 0.44 0.32 0.36 0.44 C 0.29 0.56 0.33 0.74 0.40 0.84 L 0.50 0.84',
      'M 0.58 0.18 C 0.56 0.26 0.56 0.32 0.64 0.44 C 0.71 0.56 0.67 0.74 0.60 0.84 L 0.50 0.84',
      ellipsePath(0.5, 0.18, 0.08, 0.03),
    ],
    targetCheckpoints: [
      [0.42, 0.18],
      [0.58, 0.18],
      [0.36, 0.44],
      [0.64, 0.44],
      [0.34, 0.66],
      [0.66, 0.66],
      [0.5, 0.84],
    ],
  },
  {
    id: 'comp-mandala',
    block: 'composicion',
    title: 'Mandala geométrico radial 4×',
    tip: 'Con Simetría Radial 4×, cada pétalo o arco que traces en un cuadrante se multiplica en los cuatro.',
    recommendedGrid: 'none',
    recommendedSymmetry: 'radial4',
    guideSvgPaths: [
      ellipsePath(0.5, 0.5, 0.08, 0.13),
      ellipsePath(0.5, 0.5, 0.18, 0.29),
      ellipsePath(0.5, 0.5, 0.26, 0.42),
      'M 0.50 0.08 L 0.50 0.92',
      'M 0.24 0.50 L 0.76 0.50',
      'M 0.50 0.21 Q 0.62 0.34 0.68 0.50 Q 0.62 0.66 0.50 0.79 Q 0.38 0.66 0.32 0.50 Q 0.38 0.34 0.50 0.21',
    ],
    targetCheckpoints: [
      [0.5, 0.21],
      [0.5, 0.79],
      [0.32, 0.5],
      [0.68, 0.5],
      [0.39, 0.34],
      [0.61, 0.34],
      [0.39, 0.66],
      [0.61, 0.66],
    ],
  },
  {
    id: 'comp-quick-sketch',
    block: 'composicion',
    title: 'Bodegón triangular completo',
    tip: 'Agrupa botella alta, taza media y fruta delantera dentro de un triángulo invisible para equilibrar pesos visuales.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      // Triangulo compositivo
      'M 0.42 0.14 L 0.22 0.82 L 0.78 0.82 Z',
      // Botella
      'M 0.39 0.18 L 0.45 0.18 L 0.45 0.34 L 0.50 0.44 L 0.50 0.78 L 0.34 0.78 L 0.34 0.44 L 0.39 0.34 Z',
      // Taza
      'M 0.54 0.52 L 0.70 0.52 L 0.68 0.78 L 0.56 0.78 Z',
      arcPath(0.7, 0.64, 0.04, 0.07, -80, 85),
      // Fruta delantera
      ellipsePath(0.49, 0.75, 0.065, 0.095),
      // Linea de mesa
      'M 0.12 0.78 L 0.88 0.78',
    ],
    targetCheckpoints: [
      [0.42, 0.2],
      [0.42, 0.52],
      [0.34, 0.72],
      [0.62, 0.52],
      [0.62, 0.76],
      [0.49, 0.75],
      [0.24, 0.78],
      [0.78, 0.78],
    ],
  },
  {
    id: 'comp-golden-spiral',
    block: 'composicion',
    title: 'Espiral áurea y punto focal',
    tip: 'Divide el rectángulo en cuadrados sucesivos y guía la mirada por el arco continuo hasta el sujeto principal en la zona interna.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.12 0.14 L 0.88 0.14 L 0.88 0.86 L 0.12 0.86 Z',
      'M 0.59 0.14 L 0.59 0.86',
      'M 0.59 0.59 L 0.88 0.59',
      'M 0.70 0.59 L 0.70 0.86',
      'M 0.12 0.86 Q 0.12 0.14 0.59 0.14 Q 0.88 0.14 0.88 0.59 Q 0.88 0.86 0.70 0.86 Q 0.59 0.86 0.59 0.70 Q 0.59 0.59 0.66 0.59',
      ellipsePath(0.65, 0.65, 0.025, 0.04),
    ],
    targetCheckpoints: [
      [0.12, 0.86],
      [0.24, 0.3],
      [0.59, 0.14],
      [0.88, 0.59],
      [0.7, 0.86],
      [0.65, 0.65],
    ],
  },
  {
    id: 'comp-silhouette-foreground',
    block: 'composicion',
    title: 'Profundidad en 3 planos de paisaje',
    tip: 'Separa el primer plano oscuro y nítido del plano medio con detalle moderado y de las montañas lejanas suaves.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      // Plano lejano (montanas)
      'M 0.08 0.46 L 0.28 0.24 L 0.48 0.42 L 0.68 0.20 L 0.92 0.48',
      // Plano medio (colinas y casa)
      'M 0.08 0.62 Q 0.34 0.50 0.58 0.62 T 0.92 0.60',
      'M 0.44 0.56 L 0.44 0.46 L 0.50 0.41 L 0.56 0.46 L 0.56 0.56 Z',
      // Primer plano (rocas y rama)
      'M 0.08 0.88 L 0.16 0.68 L 0.34 0.82 L 0.66 0.86 L 0.84 0.66 L 0.92 0.88',
      'M 0.10 0.18 Q 0.26 0.22 0.36 0.30',
    ],
    targetCheckpoints: [
      [0.28, 0.24],
      [0.68, 0.2],
      [0.5, 0.46],
      [0.16, 0.68],
      [0.84, 0.66],
      [0.24, 0.22],
    ],
  },
  {
    id: 'comp-radial-rose',
    block: 'composicion',
    title: 'Rosetón botánico en simetría radial',
    tip: 'Con Simetría Radial 4× activa, traza una sola hoja o pétalo curvo desde el centro hacia afuera y observa el balance total.',
    recommendedGrid: 'none',
    recommendedSymmetry: 'radial4',
    guideSvgPaths: [
      ellipsePath(0.5, 0.5, 0.06, 0.095),
      ellipsePath(0.5, 0.5, 0.26, 0.41),
      'M 0.50 0.09 C 0.58 0.24 0.58 0.38 0.50 0.41 C 0.42 0.38 0.42 0.24 0.50 0.09',
      'M 0.50 0.91 C 0.58 0.76 0.58 0.62 0.50 0.59 C 0.42 0.62 0.42 0.76 0.50 0.91',
      'M 0.24 0.50 C 0.34 0.40 0.42 0.42 0.44 0.50 C 0.42 0.58 0.34 0.60 0.24 0.50',
      'M 0.76 0.50 C 0.66 0.40 0.58 0.42 0.56 0.50 C 0.58 0.58 0.66 0.60 0.76 0.50',
    ],
    targetCheckpoints: [
      [0.5, 0.09],
      [0.5, 0.91],
      [0.24, 0.5],
      [0.76, 0.5],
      [0.5, 0.5],
      [0.56, 0.28],
    ],
  },
  {
    id: 'comp-diagonal-dynamic',
    block: 'composicion',
    title: 'Composición en diagonal dinámica',
    tip: 'Las diagonales transmiten movimiento inmediato. Equilibra la rampa principal con una línea opuesta corta en la esquina alta.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.12 0.84 L 0.88 0.18',
      'M 0.12 0.84 L 0.54 0.84 L 0.12 0.50 Z',
      'M 0.46 0.54 L 0.46 0.26 L 0.60 0.42 Z',
      'M 0.64 0.22 L 0.82 0.36',
      ellipsePath(0.76, 0.24, 0.045, 0.07),
    ],
    targetCheckpoints: [
      [0.12, 0.84],
      [0.88, 0.18],
      [0.54, 0.84],
      [0.46, 0.26],
      [0.76, 0.24],
      [0.34, 0.66],
    ],
  },
  {
    id: 'comp-negative-space',
    block: 'composicion',
    title: 'Dibujo por espacio negativo (silla)',
    tip: 'En lugar de dibujar la silla directamente, observa y traza primero las formas vacías entre el marco y las patas.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.26 0.12 L 0.74 0.12 L 0.74 0.88 L 0.26 0.88 Z',
      'M 0.40 0.20 L 0.44 0.20 L 0.44 0.54 L 0.62 0.54 L 0.62 0.82 L 0.58 0.82 L 0.58 0.58 L 0.44 0.58 L 0.44 0.82 L 0.40 0.82 Z',
      'M 0.44 0.28 L 0.58 0.28 L 0.58 0.34 L 0.44 0.34',
    ],
    targetCheckpoints: [
      [0.26, 0.12],
      [0.74, 0.88],
      [0.42, 0.24],
      [0.52, 0.56],
      [0.42, 0.8],
      [0.6, 0.8],
    ],
  },
  {
    id: 'comp-framing-arch',
    block: 'composicion',
    title: 'Encuadre natural a través de un arco',
    tip: 'Usa un elemento cercano en el borde del cuadro como ventana natural para dirigir toda la atención hacia el motivo central.',
    recommendedGrid: 'none',
    guideSvgPaths: [
      'M 0.16 0.88 L 0.16 0.38 Q 0.50 0.04 0.84 0.38 L 0.84 0.88',
      'M 0.24 0.88 L 0.24 0.42 Q 0.50 0.14 0.76 0.42 L 0.76 0.88',
      // Motivo central en el fondo
      'M 0.46 0.74 L 0.46 0.46 L 0.50 0.36 L 0.54 0.46 L 0.54 0.74',
      'M 0.32 0.88 L 0.46 0.74',
      'M 0.68 0.88 L 0.54 0.74',
    ],
    targetCheckpoints: [
      [0.16, 0.88],
      [0.5, 0.21],
      [0.84, 0.88],
      [0.24, 0.42],
      [0.76, 0.42],
      [0.5, 0.36],
      [0.5, 0.74],
    ],
  },
];

export interface NormalizedPathCmd {
  op: 'M' | 'L' | 'Q' | 'C' | 'Z';
  nums: number[];
}

const OP_ARITY: Record<NormalizedPathCmd['op'], number> = {
  M: 2,
  L: 2,
  Q: 4,
  C: 6,
  Z: 0,
};

/** Analiza cadenas SVG normalizadas `[0..1]` con comandos M, L, Q, C, Z. */
export function parseNormalizedPathCommands(pathStr: string): NormalizedPathCmd[] {
  const tokens = pathStr.match(/[MLQCZ]|-?\d*\.?\d+/gi) ?? [];
  const out: NormalizedPathCmd[] = [];
  let i = 0;
  while (i < tokens.length) {
    const rawOp = tokens[i].toUpperCase();
    if (!(rawOp in OP_ARITY)) {
      i += 1;
      continue;
    }
    const op = rawOp as NormalizedPathCmd['op'];
    const arity = OP_ARITY[op];
    i += 1;
    if (arity === 0) {
      out.push({ op, nums: [] });
      continue;
    }
    const nums: number[] = [];
    for (let k = 0; k < arity && i < tokens.length; k++, i++) {
      nums.push(Number(tokens[i]));
    }
    if (nums.length === arity && nums.every(Number.isFinite)) {
      out.push({ op, nums });
    }
  }
  return out;
}

/** Replica un trazo según simetría (`none`, `vertical`, `radial4`). */
export function mirrorStrokePoints(
  pts: DrawingPoint[],
  symmetry: DrawingSymmetry,
  canvasW: number,
  canvasH: number
): DrawingPoint[][] {
  if (symmetry === 'none') return [pts];
  const mirrorX = pts.map((p) => ({ ...p, x: canvasW - p.x }));
  if (symmetry === 'vertical') return [pts, mirrorX];
  const mirrorY = pts.map((p) => ({ ...p, y: canvasH - p.y }));
  const mirrorXY = pts.map((p) => ({ ...p, x: canvasW - p.x, y: canvasH - p.y }));
  return [pts, mirrorX, mirrorY, mirrorXY];
}

function distPointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 1e-6) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Evalúa qué porcentaje de los puntos clave de la lámina fueron cubiertos por los trazos. */
export function evaluateDrawingCoverage(
  strokes: DrawingPoint[][],
  targetCheckpoints: [number, number][] | undefined,
  canvasW: number,
  canvasH: number
): { coveragePct: number; strokeCount: number } {
  const strokeCount = strokes.length;
  if (strokeCount === 0) return { coveragePct: 0, strokeCount: 0 };
  if (!targetCheckpoints || targetCheckpoints.length === 0) {
    return { coveragePct: Math.min(100, strokeCount * 20), strokeCount };
  }

  const threshold = Math.max(28, Math.min(canvasW, canvasH) * 0.07);
  let hits = 0;

  for (const [nx, ny] of targetCheckpoints) {
    const tx = nx * canvasW;
    const ty = ny * canvasH;
    let covered = false;

    for (const s of strokes) {
      if (s.length === 0) continue;
      if (s.length === 1) {
        if (Math.hypot(tx - s[0].x, ty - s[0].y) <= threshold) {
          covered = true;
          break;
        }
        continue;
      }
      for (let i = 1; i < s.length; i++) {
        if (distPointToSegment(tx, ty, s[i - 1].x, s[i - 1].y, s[i].x, s[i].y) <= threshold) {
          covered = true;
          break;
        }
      }
      if (covered) break;
    }

    if (covered) hits += 1;
  }

  return {
    coveragePct: Math.round((hits / targetCheckpoints.length) * 100),
    strokeCount,
  };
}
