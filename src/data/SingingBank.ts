export interface PianoKeyDef {
  midi: number;
  noteEs: string;
  shortEs: string;
  sharp: boolean;
  keyCode: string;
  keyLabel: string;
  whiteIndex: number; // 0..14 for white keys, or preceding white key index for sharps
}

export interface SingingDrill {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  notes: number[];
  tip: string;
  kind?: 'melody' | 'breath' | 'range' | 'vibrato';
}

export interface SongNote {
  midi: number;
  beats: number;
  lyric: string;
}

export interface GuidedSong {
  id: string;
  title: string;
  bpm: number;
  description: string;
  notes: SongNote[];
}

export interface IntervalDef {
  id: string;
  semitones: number;
  label: string;
  example: string;
  explanation: string;
}

const RAW_PIANO_KEYS: Omit<PianoKeyDef, 'whiteIndex'>[] = [
  { midi: 48, noteEs: 'Do3', shortEs: 'Do', sharp: false, keyCode: 'KeyZ', keyLabel: 'Z' },
  { midi: 49, noteEs: 'Do#3', shortEs: 'Do#', sharp: true, keyCode: 'KeyS', keyLabel: 'S' },
  { midi: 50, noteEs: 'Re3', shortEs: 'Re', sharp: false, keyCode: 'KeyX', keyLabel: 'X' },
  { midi: 51, noteEs: 'Re#3', shortEs: 'Re#', sharp: true, keyCode: 'KeyD', keyLabel: 'D' },
  { midi: 52, noteEs: 'Mi3', shortEs: 'Mi', sharp: false, keyCode: 'KeyC', keyLabel: 'C' },
  { midi: 53, noteEs: 'Fa3', shortEs: 'Fa', sharp: false, keyCode: 'KeyV', keyLabel: 'V' },
  { midi: 54, noteEs: 'Fa#3', shortEs: 'Fa#', sharp: true, keyCode: 'KeyG', keyLabel: 'G' },
  { midi: 55, noteEs: 'Sol3', shortEs: 'Sol', sharp: false, keyCode: 'KeyB', keyLabel: 'B' },
  { midi: 56, noteEs: 'Sol#3', shortEs: 'Sol#', sharp: true, keyCode: 'KeyH', keyLabel: 'H' },
  { midi: 57, noteEs: 'La3', shortEs: 'La', sharp: false, keyCode: 'KeyN', keyLabel: 'N' },
  { midi: 58, noteEs: 'La#3', shortEs: 'La#', sharp: true, keyCode: 'KeyJ', keyLabel: 'J' },
  { midi: 59, noteEs: 'Si3', shortEs: 'Si', sharp: false, keyCode: 'KeyM', keyLabel: 'M' },
  { midi: 60, noteEs: 'Do4', shortEs: 'Do', sharp: false, keyCode: 'KeyQ', keyLabel: 'Q' },
  { midi: 61, noteEs: 'Do#4', shortEs: 'Do#', sharp: true, keyCode: 'Digit2', keyLabel: '2' },
  { midi: 62, noteEs: 'Re4', shortEs: 'Re', sharp: false, keyCode: 'KeyW', keyLabel: 'W' },
  { midi: 63, noteEs: 'Re#4', shortEs: 'Re#', sharp: true, keyCode: 'Digit3', keyLabel: '3' },
  { midi: 64, noteEs: 'Mi4', shortEs: 'Mi', sharp: false, keyCode: 'KeyE', keyLabel: 'E' },
  { midi: 65, noteEs: 'Fa4', shortEs: 'Fa', sharp: false, keyCode: 'KeyR', keyLabel: 'R' },
  { midi: 66, noteEs: 'Fa#4', shortEs: 'Fa#', sharp: true, keyCode: 'Digit5', keyLabel: '5' },
  { midi: 67, noteEs: 'Sol4', shortEs: 'Sol', sharp: false, keyCode: 'KeyT', keyLabel: 'T' },
  { midi: 68, noteEs: 'Sol#4', shortEs: 'Sol#', sharp: true, keyCode: 'Digit6', keyLabel: '6' },
  { midi: 69, noteEs: 'La4', shortEs: 'La', sharp: false, keyCode: 'KeyY', keyLabel: 'Y' },
  { midi: 70, noteEs: 'La#4', shortEs: 'La#', sharp: true, keyCode: 'Digit7', keyLabel: '7' },
  { midi: 71, noteEs: 'Si4', shortEs: 'Si', sharp: false, keyCode: 'KeyU', keyLabel: 'U' },
  { midi: 72, noteEs: 'Do5', shortEs: 'Do', sharp: false, keyCode: 'KeyI', keyLabel: 'I' },
];

let wIdx = -1;
export const PIANO_KEYS_2OCT: PianoKeyDef[] = RAW_PIANO_KEYS.map((k) => {
  if (!k.sharp) wIdx += 1;
  return { ...k, whiteIndex: wIdx };
});

export const PIANO_KEY_BY_CODE: Record<string, PianoKeyDef> = Object.fromEntries(
  PIANO_KEYS_2OCT.map((k) => [k.keyCode, k])
);

const NOTE_NAMES_ES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

export function midiToNoteEs(midi: number): string {
  const m = Math.round(midi);
  const name = NOTE_NAMES_ES[((m % 12) + 12) % 12];
  const oct = Math.floor(m / 12) - 1;
  return `${name}${oct}`;
}

export function suggestTransposeFromRange(
  lowMidi: number | null,
  highMidi: number | null
): -12 | 0 | 12 {
  if (lowMidi === null && highMidi === null) return 0;
  const center =
    lowMidi !== null && highMidi !== null
      ? (lowMidi + highMidi) / 2
      : lowMidi !== null
        ? lowMidi + 7
        : (highMidi as number) - 7;
  // Melodies sit mainly between Do4 (60) and La4 (69), center ~64
  if (center < 57) return -12;
  if (center > 71) return 12;
  return 0;
}

export const SINGING_DRILLS: SingingDrill[] = [
  {
    id: 'breath446',
    level: 1,
    kind: 'breath',
    title: 'Respiración diafragmática 4-4-6',
    notes: [60, 64, 67],
    tip: 'Inhala 4 s expandiendo el abdomen, sostén 4 s sin tensar hombros y exhala suave 6 s con «sss».',
  },
  {
    id: 'rangeFind',
    level: 1,
    kind: 'range',
    title: 'Descubrir tu rango vocal cómodo',
    notes: [55, 60, 67],
    tip: 'Canta tu nota más grave y tu nota más aguda sin forzar para adaptar el transporte de canciones.',
  },
  {
    id: 'holdA4',
    level: 1,
    title: 'Nota sostenida (La4 · 440 Hz)',
    notes: [69, 69, 69],
    tip: 'Sostén «Aaaa» o «Mmmm» manteniendo la aguja en el centro (±15 cents).',
  },
  {
    id: 'humSol',
    level: 1,
    title: 'Zumbido suave en Sol4',
    notes: [67, 67, 67],
    tip: 'Canta «Mmmm» con los labios cerrados y siente la vibración en la máscara facial.',
  },
  {
    id: 'major5',
    level: 1,
    title: 'Escala 5 notas (Do-Re-Mi-Fa-Sol)',
    notes: [60, 62, 64, 65, 67, 65, 64, 62, 60],
    tip: 'Respira desde el abdomen sin subir los hombros y mantén la garganta relajada.',
  },
  {
    id: 'descending',
    level: 1,
    title: 'Escala descendente (Sol-Fa-Mi-Re-Do)',
    notes: [67, 65, 64, 62, 60],
    tip: 'Al bajar, mantén el mismo brillo y apoyo de aire; no dejes caer la energía.',
  },
  {
    id: 'lipTrill',
    level: 2,
    title: 'Vibración de labios (Do-Mi-Sol-Mi-Do)',
    notes: [60, 64, 67, 64, 60],
    tip: 'Haz «brrr» con los labios sueltos; si se corta el aire, apoya suavemente los dedos en las mejillas.',
  },
  {
    id: 'arpeggio',
    level: 2,
    title: 'Arpegio Mayor (Do-Mi-Sol-Do5)',
    notes: [60, 64, 67, 72, 67, 64, 60],
    tip: 'Salta limpio entre notas sin arrastrar la voz como sirena.',
  },
  {
    id: 'thirds',
    level: 2,
    title: 'Terceras (Do-Mi-Re-Fa-Mi-Sol)',
    notes: [60, 64, 62, 65, 64, 67, 65, 62, 60],
    tip: 'Piensa cada salto antes de cantarlo; el oído guía a la voz.',
  },
  {
    id: 'minor5',
    level: 2,
    title: 'Escala menor 5 notas (Do-Re-Re#-Fa-Sol)',
    notes: [60, 62, 63, 65, 67, 65, 63, 62, 60],
    tip: 'Fíjate en el semitono entre Re y Re#: esa nota da el color melancólico de lo menor.',
  },
  {
    id: 'siren',
    level: 2,
    title: 'Quinta ida y vuelta (Do-Sol-Do)',
    notes: [60, 67, 60, 67, 60],
    tip: 'Practica el intervalo de quinta con «u» cerrada para afinar el salto con suavidad.',
  },
  {
    id: 'vibratoHold',
    level: 3,
    kind: 'vibrato',
    title: 'Control de vibrato estable (4.5–7 Hz)',
    notes: [65, 65, 67, 67],
    tip: 'Sostén una nota cómoda relajando mandíbula y flujo de aire hasta ver una oscilación pareja de ±20–60 cents.',
  },
  {
    id: 'staccato',
    level: 3,
    title: 'Picado de arpegio (Do-Mi-Sol)',
    notes: [60, 60, 64, 64, 67, 67, 64, 60],
    tip: 'Notas cortas con «ja-ja-ja»: el impulso viene del abdomen, no de la garganta.',
  },
  {
    id: 'octave',
    level: 3,
    title: 'Salto de octava (Do4-Do5)',
    notes: [60, 72, 60, 72, 60],
    tip: 'Sube sin empujar ni levantar el mentón; imagina que la nota aguda «cae» desde arriba.',
  },
  {
    id: 'fullScale',
    level: 3,
    title: 'Escala mayor completa (Do4-Do5)',
    notes: [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60],
    tip: 'Respira antes de empezar y dosifica el aire para llegar al final sin apretar.',
  },
];

export const SINGING_SONGS: GuidedSong[] = [
  {
    id: 'ode',
    title: 'Himno de la Alegría',
    bpm: 92,
    description: 'Grados conjuntos en Do mayor; ideal para afinar paso a paso.',
    notes: [
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 65, beats: 1, lyric: 'Fa' },
      { midi: 67, beats: 1, lyric: 'Sol' },
      { midi: 67, beats: 1, lyric: 'Sol' },
      { midi: 65, beats: 1, lyric: 'Fa' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 64, beats: 1.5, lyric: 'Mi' },
      { midi: 62, beats: 0.5, lyric: 'Re' },
      { midi: 62, beats: 2, lyric: 'Re' },
    ],
  },
  {
    id: 'twinkle',
    title: 'Estrellita',
    bpm: 84,
    description: 'Salto limpio de quinta (Do→Sol) y descenso gradual.',
    notes: [
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 67, beats: 1, lyric: 'Sol' },
      { midi: 67, beats: 1, lyric: 'Sol' },
      { midi: 69, beats: 1, lyric: 'La' },
      { midi: 69, beats: 1, lyric: 'La' },
      { midi: 67, beats: 2, lyric: 'Sol' },
      { midi: 65, beats: 1, lyric: 'Fa' },
      { midi: 65, beats: 1, lyric: 'Fa' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 60, beats: 2, lyric: 'Do' },
    ],
  },
  {
    id: 'frere',
    title: 'Martinillo',
    bpm: 96,
    description: 'Frases cortas repetidas con salto de tercera y cuarta.',
    notes: [
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 65, beats: 1, lyric: 'Fa' },
      { midi: 67, beats: 2, lyric: 'Sol' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 65, beats: 1, lyric: 'Fa' },
      { midi: 67, beats: 2, lyric: 'Sol' },
    ],
  },
  {
    id: 'birthday',
    title: 'Cumpleaños Feliz',
    bpm: 88,
    description: 'Practica saltos de cuarta y sexta sin tensión en la garganta.',
    notes: [
      { midi: 60, beats: 0.75, lyric: 'Do' },
      { midi: 60, beats: 0.25, lyric: 'Do' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 65, beats: 1, lyric: 'Fa' },
      { midi: 64, beats: 2, lyric: 'Mi' },
      { midi: 60, beats: 0.75, lyric: 'Do' },
      { midi: 60, beats: 0.25, lyric: 'Do' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 67, beats: 1, lyric: 'Sol' },
      { midi: 65, beats: 2, lyric: 'Fa' },
    ],
  },
  {
    id: 'arroz',
    title: 'Arroz con Leche',
    bpm: 94,
    description: 'Melodía tradicional en Fa mayor con arpegio inicial.',
    notes: [
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 65, beats: 1, lyric: 'Fa' },
      { midi: 69, beats: 1, lyric: 'La' },
      { midi: 67, beats: 1, lyric: 'Sol' },
      { midi: 65, beats: 1, lyric: 'Fa' },
      { midi: 65, beats: 1, lyric: 'Fa' },
      { midi: 67, beats: 1, lyric: 'Sol' },
      { midi: 69, beats: 1, lyric: 'La' },
      { midi: 67, beats: 1, lyric: 'Sol' },
      { midi: 65, beats: 1, lyric: 'Fa' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 60, beats: 2, lyric: 'Do' },
    ],
  },
];

export const EAR_INTERVALS: IntervalDef[] = [
  {
    id: 'm3',
    semitones: 4,
    label: '3ª mayor',
    example: 'Do → Mi',
    explanation: 'La 3ª mayor tiene 4 semitonos (como Do→Mi) y suena luminosa y abierta.',
  },
  {
    id: 'p5',
    semitones: 7,
    label: '5ª justa',
    example: 'Do → Sol',
    explanation: 'La 5ª justa tiene 7 semitonos (como Do→Sol); es un salto estable y resonante.',
  },
  {
    id: 'p8',
    semitones: 12,
    label: '8ª justa',
    example: 'Do4 → Do5',
    explanation: 'La 8ª justa tiene 12 semitonos (como Do4→Do5): es la misma nota al doble de frecuencia.',
  },
];
