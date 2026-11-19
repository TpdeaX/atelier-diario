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

export interface SongChord {
  startBeat: number;
  midis: number[];
  label?: string;
}

export interface GuidedSong {
  id: string;
  title: string;
  bpm: number;
  description: string;
  notes: SongNote[];
  chords?: SongChord[];
}

export interface WarmupStep {
  id: string;
  title: string;
  durationSec: number;
  instruction: string;
  guideNotes: number[];
  cue: string;
}

export interface VowelDrill {
  vowel: 'A' | 'E' | 'I' | 'O' | 'U';
  title: string;
  targetMidi: number;
  cue: string;
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

export const WARMUP_CHAIN_STEPS: WarmupStep[] = [
  {
    id: 'wu-breath',
    title: '1. Respiración diafragmática 4-4-6',
    durationSec: 60,
    instruction:
      'Inhala 4 s expandiendo costillas y abdomen, sostén 4 s sin subir hombros y exhala parejo 6 s con «sss».',
    guideNotes: [48, 55, 60],
    cue: 'Afloja cuello y mandíbula; el aire sale constante.',
  },
  {
    id: 'wu-hum',
    title: '2. Zumbido suave «Mmmm»',
    durationSec: 60,
    instruction:
      'Labios cerrados sin apretar muelas. Canta «Mmmm» sobre las notas guía sintiendo cosquilleo en nariz y pómulos.',
    guideNotes: [60, 62, 64, 62, 60],
    cue: 'Volumen bajo y parejo: despierta la resonancia frontal.',
  },
  {
    id: 'wu-liptrill',
    title: '3. Trino de labios «Brrr»',
    durationSec: 60,
    instruction:
      'Deja los labios vibrar con «Brrr» en arpegio suave. Si se traba, apoya dos dedos en las mejillas.',
    guideNotes: [60, 64, 67, 64, 60],
    cue: 'Conecta el apoyo del aire sin empujar la garganta.',
  },
  {
    id: 'wu-siren',
    title: '4. Sirena suave de registro',
    durationSec: 60,
    instruction:
      'Desliza con «Uuuu» desde grave hacia agudo y regresa sin cortes bruscos, aligerando el peso al subir.',
    guideNotes: [60, 65, 69, 72, 67, 60],
    cue: 'Piensa en un arco liviano, nunca en gritar el agudo.',
  },
  {
    id: 'wu-scale5',
    title: '5. Escala de 5 notas (Do-Re-Mi-Fa-Sol)',
    durationSec: 60,
    instruction:
      'Canta «Ma-Me-Mi-Mo-Mu» subiendo y bajando por las 5 notas. Mantén la aguja estable en cada grado.',
    guideNotes: [60, 62, 64, 65, 67, 65, 64, 62, 60],
    cue: 'Voz lista para pasar al Karaoke o repertorio.',
  },
];

export const VOWEL_DRILLS: VowelDrill[] = [
  {
    vowel: 'A',
    title: 'Vocal A (apertura vertical)',
    targetMidi: 64,
    cue: 'Deja caer la mandíbula relajada; sostén «Aaaa» redonda y sin aplanar el sonido.',
  },
  {
    vowel: 'E',
    title: 'Vocal E (claridad frontal)',
    targetMidi: 65,
    cue: 'Lengua suave tocando dientes inferiores; evita tensar comisuras hacia atrás.',
  },
  {
    vowel: 'I',
    title: 'Vocal I (enfoque brillante)',
    targetMidi: 67,
    cue: 'Mantén espacio interno en el paladar para que «Iiii» resuene sin sonar nasal.',
  },
  {
    vowel: 'O',
    title: 'Vocal O (redondez cálida)',
    targetMidi: 62,
    cue: 'Labios ligeramente redondeados y garganta abierta como en un bostezo suave.',
  },
  {
    vowel: 'U',
    title: 'Vocal U (apoyo y cobertura)',
    targetMidi: 60,
    cue: 'Ideal para estabilizar el flujo de aire; mantén «Uuuu» liviana hacia adelante.',
  },
];

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

// Acordes de acompañamiento habituales en registro grave/medio (Do3..Sol3)
const C_MAJ = [48, 52, 55];
const D_MIN = [50, 53, 57];
const D_MAJ = [50, 54, 57];
const E_MIN = [52, 55, 59];
const E_MAJ = [52, 56, 59];
const F_MAJ = [53, 57, 60];
const G_MAJ = [55, 59, 62];
const A_MIN = [57, 60, 64];

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
    chords: [
      { startBeat: 0, midis: C_MAJ, label: 'Do' },
      { startBeat: 4, midis: G_MAJ, label: 'Sol' },
      { startBeat: 8, midis: C_MAJ, label: 'Do' },
      { startBeat: 12, midis: G_MAJ, label: 'Sol' },
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
    chords: [
      { startBeat: 0, midis: C_MAJ, label: 'Do' },
      { startBeat: 4, midis: F_MAJ, label: 'Fa' },
      { startBeat: 6, midis: C_MAJ, label: 'Do' },
      { startBeat: 8, midis: F_MAJ, label: 'Fa' },
      { startBeat: 10, midis: C_MAJ, label: 'Do' },
      { startBeat: 12, midis: G_MAJ, label: 'Sol' },
      { startBeat: 14, midis: C_MAJ, label: 'Do' },
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
    chords: [
      { startBeat: 0, midis: C_MAJ, label: 'Do' },
      { startBeat: 4, midis: C_MAJ, label: 'Do' },
      { startBeat: 8, midis: F_MAJ, label: 'Fa' },
      { startBeat: 10, midis: C_MAJ, label: 'Do' },
      { startBeat: 12, midis: G_MAJ, label: 'Sol' },
      { startBeat: 14, midis: C_MAJ, label: 'Do' },
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
    chords: [
      { startBeat: 0, midis: F_MAJ, label: 'Fa' },
      { startBeat: 4, midis: C_MAJ, label: 'Do' },
      { startBeat: 8, midis: C_MAJ, label: 'Do' },
      { startBeat: 10, midis: F_MAJ, label: 'Fa' },
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
    chords: [
      { startBeat: 0, midis: F_MAJ, label: 'Fa' },
      { startBeat: 4, midis: F_MAJ, label: 'Fa' },
      { startBeat: 8, midis: C_MAJ, label: 'Do' },
      { startBeat: 12, midis: F_MAJ, label: 'Fa' },
    ],
  },
  {
    id: 'cielito',
    title: 'Cielito Lindo',
    bpm: 106,
    description: 'Vals mexicano tradicional en 3/4 con fraseo cálido y legato.',
    notes: [
      { midi: 69, beats: 2, lyric: 'Ay' },
      { midi: 69, beats: 1, lyric: 'ay' },
      { midi: 65, beats: 1, lyric: 'ay' },
      { midi: 67, beats: 2, lyric: 'ay' },
      { midi: 64, beats: 2, lyric: 'Can-' },
      { midi: 62, beats: 1, lyric: 'ta' },
      { midi: 60, beats: 2, lyric: 'y no' },
      { midi: 62, beats: 1, lyric: 'llo-' },
      { midi: 64, beats: 3, lyric: 'res' },
      { midi: 67, beats: 2, lyric: 'por-' },
      { midi: 65, beats: 1, lyric: 'que' },
      { midi: 64, beats: 1, lyric: 'can-' },
      { midi: 62, beats: 2, lyric: 'tan-' },
      { midi: 60, beats: 3, lyric: 'do' },
    ],
    chords: [
      { startBeat: 0, midis: C_MAJ, label: 'Do' },
      { startBeat: 6, midis: G_MAJ, label: 'Sol' },
      { startBeat: 12, midis: C_MAJ, label: 'Do' },
      { startBeat: 18, midis: G_MAJ, label: 'Sol' },
      { startBeat: 21, midis: C_MAJ, label: 'Do' },
    ],
  },
  {
    id: 'bamba',
    title: 'La Bamba (melodía)',
    bpm: 112,
    description: 'Son jarocho tradicional sobre progresión I-IV-V con articulación ágil.',
    notes: [
      { midi: 60, beats: 0.75, lyric: 'Pa-' },
      { midi: 62, beats: 0.75, lyric: 'ra' },
      { midi: 64, beats: 1, lyric: 'bai-' },
      { midi: 65, beats: 1, lyric: 'lar' },
      { midi: 67, beats: 1, lyric: 'la' },
      { midi: 67, beats: 1, lyric: 'Bam-' },
      { midi: 65, beats: 1.5, lyric: 'ba' },
      { midi: 64, beats: 1, lyric: 'se' },
      { midi: 62, beats: 1, lyric: 'ne-' },
      { midi: 64, beats: 1, lyric: 'ce-' },
      { midi: 65, beats: 1, lyric: 'si-' },
      { midi: 67, beats: 1, lyric: 'ta' },
      { midi: 64, beats: 1, lyric: 'gra-' },
      { midi: 60, beats: 2, lyric: 'cia' },
    ],
    chords: [
      { startBeat: 0, midis: C_MAJ, label: 'Do' },
      { startBeat: 3, midis: F_MAJ, label: 'Fa' },
      { startBeat: 5, midis: G_MAJ, label: 'Sol' },
      { startBeat: 8, midis: C_MAJ, label: 'Do' },
      { startBeat: 10, midis: F_MAJ, label: 'Fa' },
      { startBeat: 12, midis: G_MAJ, label: 'Sol' },
      { startBeat: 13.5, midis: C_MAJ, label: 'Do' },
    ],
  },
  {
    id: 'nochepaz',
    title: 'Noche de Paz',
    bpm: 74,
    description: 'Tempo lento en 6/8; excelente para sostener vocales y vibrato controlado.',
    notes: [
      { midi: 67, beats: 1.5, lyric: 'No-' },
      { midi: 69, beats: 0.5, lyric: 'che' },
      { midi: 67, beats: 1, lyric: 'de' },
      { midi: 64, beats: 3, lyric: 'paz' },
      { midi: 67, beats: 1.5, lyric: 'No-' },
      { midi: 69, beats: 0.5, lyric: 'che' },
      { midi: 67, beats: 1, lyric: 'de' },
      { midi: 64, beats: 3, lyric: 'a-mor' },
      { midi: 74, beats: 2, lyric: 'To-' },
      { midi: 74, beats: 1, lyric: 'do' },
      { midi: 71, beats: 3, lyric: 'duer-me' },
      { midi: 72, beats: 2, lyric: 'en' },
      { midi: 72, beats: 1, lyric: 'de-' },
      { midi: 67, beats: 3, lyric: 'rre-dor' },
    ],
    chords: [
      { startBeat: 0, midis: C_MAJ, label: 'Do' },
      { startBeat: 6, midis: C_MAJ, label: 'Do' },
      { startBeat: 12, midis: G_MAJ, label: 'Sol' },
      { startBeat: 18, midis: C_MAJ, label: 'Do' },
    ],
  },
  {
    id: 'scarborough',
    title: 'Scarborough Fair',
    bpm: 88,
    description: 'Balada inglesa en modo dórico (La menor); entrena color modal y fraseo.',
    notes: [
      { midi: 57, beats: 2, lyric: 'La' },
      { midi: 57, beats: 1, lyric: 'la' },
      { midi: 64, beats: 2, lyric: 'mi' },
      { midi: 64, beats: 1, lyric: 'mi' },
      { midi: 59, beats: 1.5, lyric: 'si' },
      { midi: 60, beats: 0.5, lyric: 'do' },
      { midi: 59, beats: 1, lyric: 'si' },
      { midi: 57, beats: 3, lyric: 'la' },
      { midi: 64, beats: 1, lyric: 'mi' },
      { midi: 67, beats: 2, lyric: 'sol' },
      { midi: 69, beats: 2, lyric: 'la' },
      { midi: 67, beats: 1, lyric: 'sol' },
      { midi: 66, beats: 1, lyric: 'fa#' },
      { midi: 64, beats: 3, lyric: 'mi' },
    ],
    chords: [
      { startBeat: 0, midis: A_MIN, label: 'Lam' },
      { startBeat: 6, midis: G_MAJ, label: 'Sol' },
      { startBeat: 9, midis: A_MIN, label: 'Lam' },
      { startBeat: 13, midis: C_MAJ, label: 'Do' },
      { startBeat: 18, midis: D_MAJ, label: 'Re' },
      { startBeat: 19, midis: A_MIN, label: 'Lam' },
    ],
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    bpm: 86,
    description: 'Melodía renacentista en menor; trabaja saltos expresivos y apoyo en agudos.',
    notes: [
      { midi: 57, beats: 1, lyric: 'La' },
      { midi: 60, beats: 2, lyric: 'Do' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 64, beats: 1.5, lyric: 'Mi' },
      { midi: 65, beats: 0.5, lyric: 'Fa' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 62, beats: 2, lyric: 'Re' },
      { midi: 59, beats: 1, lyric: 'Si' },
      { midi: 55, beats: 1.5, lyric: 'Sol' },
      { midi: 57, beats: 0.5, lyric: 'La' },
      { midi: 59, beats: 1, lyric: 'Si' },
      { midi: 60, beats: 2, lyric: 'Do' },
      { midi: 57, beats: 1, lyric: 'La' },
      { midi: 57, beats: 2, lyric: 'La' },
    ],
    chords: [
      { startBeat: 0, midis: A_MIN, label: 'Lam' },
      { startBeat: 4, midis: C_MAJ, label: 'Do' },
      { startBeat: 7, midis: G_MAJ, label: 'Sol' },
      { startBeat: 13, midis: A_MIN, label: 'Lam' },
    ],
  },
  {
    id: 'elisa',
    title: 'Para Elisa (adaptación vocal)',
    bpm: 96,
    description: 'Motivo clásico de Beethoven con alternancia cromática precisa (Mi-Re#).',
    notes: [
      { midi: 64, beats: 0.5, lyric: 'Mi' },
      { midi: 63, beats: 0.5, lyric: 'Re#' },
      { midi: 64, beats: 0.5, lyric: 'Mi' },
      { midi: 63, beats: 0.5, lyric: 'Re#' },
      { midi: 64, beats: 0.5, lyric: 'Mi' },
      { midi: 59, beats: 0.5, lyric: 'Si' },
      { midi: 62, beats: 0.5, lyric: 'Re' },
      { midi: 60, beats: 0.5, lyric: 'Do' },
      { midi: 57, beats: 1.5, lyric: 'La' },
      { midi: 60, beats: 0.5, lyric: 'Do' },
      { midi: 64, beats: 0.5, lyric: 'Mi' },
      { midi: 69, beats: 0.5, lyric: 'La' },
      { midi: 71, beats: 1.5, lyric: 'Si' },
      { midi: 64, beats: 0.5, lyric: 'Mi' },
      { midi: 68, beats: 0.5, lyric: 'Sol#' },
      { midi: 71, beats: 0.5, lyric: 'Si' },
      { midi: 72, beats: 2, lyric: 'Do' },
    ],
    chords: [
      { startBeat: 0, midis: A_MIN, label: 'Lam' },
      { startBeat: 4, midis: A_MIN, label: 'Lam' },
      { startBeat: 6, midis: E_MAJ, label: 'Mi' },
      { startBeat: 10, midis: A_MIN, label: 'Lam' },
    ],
  },
  {
    id: 'minueto',
    title: 'Minueto en Sol (Bach)',
    bpm: 102,
    description: 'Danza barroca en 3/4 ideal para limpieza de escalas y afinación clara.',
    notes: [
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 55, beats: 0.5, lyric: 'Sol' },
      { midi: 57, beats: 0.5, lyric: 'La' },
      { midi: 59, beats: 0.5, lyric: 'Si' },
      { midi: 60, beats: 0.5, lyric: 'Do' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 55, beats: 1, lyric: 'Sol' },
      { midi: 55, beats: 1, lyric: 'Sol' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 60, beats: 0.5, lyric: 'Do' },
      { midi: 62, beats: 0.5, lyric: 'Re' },
      { midi: 64, beats: 0.5, lyric: 'Mi' },
      { midi: 66, beats: 0.5, lyric: 'Fa#' },
      { midi: 67, beats: 1, lyric: 'Sol' },
      { midi: 55, beats: 2, lyric: 'Sol' },
    ],
    chords: [
      { startBeat: 0, midis: G_MAJ, label: 'Sol' },
      { startBeat: 3, midis: G_MAJ, label: 'Sol' },
      { startBeat: 6, midis: C_MAJ, label: 'Do' },
      { startBeat: 9, midis: D_MAJ, label: 'Re' },
      { startBeat: 10, midis: G_MAJ, label: 'Sol' },
    ],
  },
  {
    id: 'ojosazules',
    title: 'Ojos Azules (folk andino)',
    bpm: 104,
    description: 'Huayno tradicional en pentatónica menor; ritmo marcado y fraseo claro.',
    notes: [
      { midi: 64, beats: 1, lyric: 'O-' },
      { midi: 64, beats: 1, lyric: 'jos' },
      { midi: 67, beats: 1, lyric: 'a-' },
      { midi: 64, beats: 1, lyric: 'zu-' },
      { midi: 62, beats: 1, lyric: 'les' },
      { midi: 60, beats: 1, lyric: 'no' },
      { midi: 57, beats: 2, lyric: 'llo-res' },
      { midi: 60, beats: 1, lyric: 'no' },
      { midi: 62, beats: 1, lyric: 'llo-' },
      { midi: 64, beats: 1, lyric: 'res' },
      { midi: 62, beats: 1, lyric: 'ni' },
      { midi: 60, beats: 1, lyric: 'te' },
      { midi: 57, beats: 1, lyric: 'e-na-' },
      { midi: 57, beats: 2, lyric: 'mo-res' },
    ],
    chords: [
      { startBeat: 0, midis: A_MIN, label: 'Lam' },
      { startBeat: 2, midis: C_MAJ, label: 'Do' },
      { startBeat: 6, midis: A_MIN, label: 'Lam' },
      { startBeat: 8, midis: C_MAJ, label: 'Do' },
      { startBeat: 10, midis: G_MAJ, label: 'Sol' },
      { startBeat: 13, midis: A_MIN, label: 'Lam' },
    ],
  },
  {
    id: 'bellaciao',
    title: 'Bella Ciao (tradicional)',
    bpm: 110,
    description: 'Canto popular italiano en La menor con impulso rítmico y saltos definidos.',
    notes: [
      { midi: 57, beats: 0.5, lyric: 'U-' },
      { midi: 60, beats: 0.5, lyric: 'na' },
      { midi: 62, beats: 0.5, lyric: 'mat-' },
      { midi: 64, beats: 1, lyric: 'ti-' },
      { midi: 60, beats: 1.5, lyric: 'na' },
      { midi: 57, beats: 0.5, lyric: 'mi' },
      { midi: 60, beats: 0.5, lyric: 'son' },
      { midi: 62, beats: 0.5, lyric: 'sve-' },
      { midi: 64, beats: 1, lyric: 'glia-' },
      { midi: 60, beats: 1.5, lyric: 'to' },
      { midi: 64, beats: 0.5, lyric: 'o' },
      { midi: 62, beats: 0.5, lyric: 'bel-' },
      { midi: 60, beats: 0.5, lyric: 'la' },
      { midi: 64, beats: 1, lyric: 'ciao' },
      { midi: 62, beats: 1, lyric: 'ciao' },
      { midi: 60, beats: 2, lyric: 'ciao' },
    ],
    chords: [
      { startBeat: 0, midis: A_MIN, label: 'Lam' },
      { startBeat: 4, midis: A_MIN, label: 'Lam' },
      { startBeat: 8, midis: D_MIN, label: 'Rem' },
      { startBeat: 10.5, midis: E_MAJ, label: 'Mi' },
      { startBeat: 12, midis: A_MIN, label: 'Lam' },
    ],
  },
  {
    id: 'auldlangsyne',
    title: 'Auld Lang Syne',
    bpm: 84,
    description: 'Himno tradicional escocés pentatónico; entrena respiración larga y salto de sexta.',
    notes: [
      { midi: 55, beats: 1, lyric: 'Sol' },
      { midi: 60, beats: 1.5, lyric: 'Do' },
      { midi: 60, beats: 0.5, lyric: 'Do' },
      { midi: 60, beats: 1, lyric: 'Do' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 62, beats: 1.5, lyric: 'Re' },
      { midi: 60, beats: 0.5, lyric: 'Do' },
      { midi: 62, beats: 1, lyric: 'Re' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 60, beats: 1.5, lyric: 'Do' },
      { midi: 60, beats: 0.5, lyric: 'Do' },
      { midi: 64, beats: 1, lyric: 'Mi' },
      { midi: 67, beats: 1, lyric: 'Sol' },
      { midi: 69, beats: 3, lyric: 'La' },
    ],
    chords: [
      { startBeat: 0, midis: C_MAJ, label: 'Do' },
      { startBeat: 5, midis: G_MAJ, label: 'Sol' },
      { startBeat: 9, midis: C_MAJ, label: 'Do' },
      { startBeat: 12, midis: F_MAJ, label: 'Fa' },
    ],
  },
];

export const EAR_INTERVALS: IntervalDef[] = [
  {
    id: 'M3',
    semitones: 4,
    label: '3ª mayor',
    example: 'Do → Mi',
    explanation: 'La 3ª mayor tiene 4 semitonos (como Do→Mi) y suena luminosa y abierta.',
  },
  {
    id: 'P5',
    semitones: 7,
    label: '5ª justa',
    example: 'Do → Sol',
    explanation: 'La 5ª justa tiene 7 semitonos (como Do→Sol); es un salto estable y resonante.',
  },
  {
    id: 'P8',
    semitones: 12,
    label: '8ª justa',
    example: 'Do4 → Do5',
    explanation: 'La 8ª justa tiene 12 semitonos (como Do4→Do5): es la misma nota al doble de frecuencia.',
  },
];

export const EAR_INTERVALS_FULL: IntervalDef[] = [
  {
    id: 'm2',
    semitones: 1,
    label: '2ª menor',
    example: 'Do → Do#',
    explanation: '1 semitono: la distancia mínima, tensa y cercana (como el motivo de Tiburón).',
  },
  {
    id: 'M2',
    semitones: 2,
    label: '2ª mayor',
    example: 'Do → Re',
    explanation: '2 semitonos (un tono entero): el primer paso natural de una escala mayor.',
  },
  {
    id: 'm3',
    semitones: 3,
    label: '3ª menor',
    example: 'Do → Re#',
    explanation: '3 semitonos: aporta color melancólico e íntimo (inicio de Greensleeves).',
  },
  {
    id: 'M3',
    semitones: 4,
    label: '3ª mayor',
    example: 'Do → Mi',
    explanation: '4 semitonos: intervalo luminoso y abierto que define los acordes mayores.',
  },
  {
    id: 'P4',
    semitones: 5,
    label: '4ª justa',
    example: 'Do → Fa',
    explanation: '5 semitonos: salto firme y decidido (como el inicio de Auld Lang Syne).',
  },
  {
    id: 'TT',
    semitones: 6,
    label: 'Tritono (4ª aum.)',
    example: 'Do → Fa#',
    explanation: '6 semitonos: divide la octava en dos mitades exactas y genera tensión.',
  },
  {
    id: 'P5',
    semitones: 7,
    label: '5ª justa',
    example: 'Do → Sol',
    explanation: '7 semitonos: salto muy estable y resonante (como Estrellita).',
  },
  {
    id: 'm6',
    semitones: 8,
    label: '6ª menor',
    example: 'Do → Sol#',
    explanation: '8 semitonos: intervalo amplio de carácter expresivo y nostálgico.',
  },
  {
    id: 'M6',
    semitones: 9,
    label: '6ª mayor',
    example: 'Do → La',
    explanation: '9 semitonos: salto cálido y cantable, habitual en melodías clásicas.',
  },
  {
    id: 'm7',
    semitones: 10,
    label: '7ª menor',
    example: 'Do → La#',
    explanation: '10 semitonos: color azulado y ligeramente abierto, típico de acordes de 7ª.',
  },
  {
    id: 'M7',
    semitones: 11,
    label: '7ª mayor',
    example: 'Do → Si',
    explanation: '11 semitonos: roza la octava y pide resolver un semitono hacia arriba.',
  },
  {
    id: 'P8',
    semitones: 12,
    label: '8ª justa',
    example: 'Do4 → Do5',
    explanation: '12 semitonos: la misma nota al doble de frecuencia, fusión casi perfecta.',
  },
];

export const JUMP_VERIFIER_INTERVALS: IntervalDef[] = EAR_INTERVALS_FULL.filter((i) =>
  ['M3', 'P4', 'P5', 'M6', 'P8'].includes(i.id)
);

export const CHORD_PRESETS = {
  E_MIN,
};
