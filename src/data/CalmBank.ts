import type { CalmPatternId } from '../types.ts';

export interface BreathPhase {
  label: string;
  sec: number;
  /** Escala del circulo al final de la fase (0.48 = pecho vacio, 1 = lleno). */
  scale: number;
}

export interface BreathPattern {
  id: CalmPatternId;
  name: string;
  /** Texto corto con el ritmo, visible en el boton del selector. */
  rhythm: string;
  /** Etiqueta del boton en modo SOS (directa, con verbo). */
  chip: string;
  desc: string;
  phases: BreathPhase[];
}

export const BREATH_PATTERNS: Record<CalmPatternId, BreathPattern> = {
  exhale36: {
    id: 'exhale36',
    name: 'Exhalar largo (3-6)',
    rhythm: 'Inhala 3s / Exhala 6s',
    chip: 'Exhalar largo 3-6',
    desc: 'La exhalación larga frena el pulso y corta la hiperventilación. Es el patrón más directo en un ataque de pánico.',
    phases: [
      { label: 'Inhala suave por la nariz', sec: 3, scale: 1.0 },
      { label: 'Suelta el aire lento, como por una pajita', sec: 6, scale: 0.48 },
    ],
  },
  sigh: {
    id: 'sigh',
    name: 'Suspiro fisiológico',
    rhythm: 'Doble inhalación / Exhala 6s',
    chip: 'Suspiro fisiológico',
    desc: 'Doble inhalación y una exhalación larga: alivio rápido en unos 30 segundos.',
    phases: [
      { label: 'Inhala hondo', sec: 3, scale: 0.85 },
      { label: 'Segundo sorbo de aire', sec: 1, scale: 1.05 },
      { label: 'Suelta todo el aire lento', sec: 6, scale: 0.46 },
    ],
  },
  coherence: {
    id: 'coherence',
    name: 'Coherencia (5.5-5.5)',
    rhythm: 'Inhala 5.5s / Exhala 5.5s',
    chip: 'Coherencia 5.5-5.5',
    desc: 'Unas 5.5 respiraciones por minuto sincronizan corazón y respiración. Ideal cuando ya bajó lo peor.',
    phases: [
      { label: 'Inhala sin prisa', sec: 5.5, scale: 1.0 },
      { label: 'Exhala sin prisa', sec: 5.5, scale: 0.48 },
    ],
  },
  '478': {
    id: '478',
    name: 'Respiración 4-7-8',
    rhythm: 'Inhala 4s / Sostén 7s / Exhala 8s',
    chip: '4-7-8',
    desc: 'Activa el freno natural del sistema nervioso para bajar palpitaciones y ansiedad.',
    phases: [
      { label: 'Inhala suave por la nariz', sec: 4, scale: 1.0 },
      { label: 'Sostén sin tensión', sec: 7, scale: 1.0 },
      { label: 'Exhala lento por la boca', sec: 8, scale: 0.48 },
    ],
  },
  box: {
    id: 'box',
    name: 'Caja 4-4-4-4',
    rhythm: 'Inhala 4s / Sostén 4s / Exhala 4s / Pausa 4s',
    chip: 'Caja 4-4-4-4',
    desc: 'Equilibra la mente cuando tienes muchos pensamientos al mismo tiempo.',
    phases: [
      { label: 'Inhala', sec: 4, scale: 1.0 },
      { label: 'Mantén', sec: 4, scale: 1.0 },
      { label: 'Exhala', sec: 4, scale: 0.48 },
      { label: 'Pausa vacía', sec: 4, scale: 0.48 },
    ],
  },
};

/** Orden en que se muestran los botones del modo SOS. */
export const SOS_PATTERN_ORDER: CalmPatternId[] = ['exhale36', 'sigh', 'coherence', '478', 'box'];

export interface BreathState {
  phaseIdx: number;
  phaseRemainingSec: number;
  cycles: number;
}

/** Estado de la respiracion tras `elapsedSec` segundos desde el inicio (admite fases fraccionarias). */
export function breathStateAt(pattern: BreathPattern, elapsedSec: number): BreathState {
  const total = pattern.phases.reduce((a, p) => a + p.sec, 0);
  const t = Math.max(0, elapsedSec);
  const cycles = Math.floor(t / total);
  let inCycle = t - cycles * total;
  for (let i = 0; i < pattern.phases.length; i++) {
    const sec = pattern.phases[i].sec;
    if (inCycle < sec) return { phaseIdx: i, phaseRemainingSec: sec - inCycle, cycles };
    inCycle -= sec;
  }
  return { phaseIdx: 0, phaseRemainingSec: pattern.phases[0].sec, cycles };
}

export const SOS_REASSURANCE =
  'Estás a salvo. Es una descarga temporal de adrenalina: va a bajar sola en pocos minutos. No tienes que hacer nada rápido.';

export interface GroundingGroup {
  count: number;
  sense: string;
  prompt: string;
}

export const GROUNDING_GROUPS: GroundingGroup[] = [
  { count: 5, sense: 'ves', prompt: '5 cosas que ves' },
  { count: 4, sense: 'tocas', prompt: '4 cosas que tocas' },
  { count: 3, sense: 'oyes', prompt: '3 sonidos que oyes' },
  { count: 2, sense: 'hueles', prompt: '2 olores que notas' },
  { count: 1, sense: 'saboreas', prompt: '1 sabor o un trago de agua' },
];

export interface PmrStep {
  group: string;
  action: string;
  tip: string;
  tenseSec: number;
  releaseSec: number;
}

export const PMR_STEPS: PmrStep[] = [
  { group: 'Manos', action: 'Cierra los puños', tip: 'Aprieta fuerte y luego abre los dedos del todo.', tenseSec: 4, releaseSec: 8 },
  { group: 'Hombros', action: 'Sube los hombros hacia las orejas', tip: 'Déjalos caer de golpe y siente el peso.', tenseSec: 4, releaseSec: 8 },
  { group: 'Mandíbula', action: 'Aprieta los dientes y los labios', tip: 'Suelta con la boca entreabierta y la lengua blanda.', tenseSec: 4, releaseSec: 8 },
  { group: 'Frente', action: 'Arruga la frente y los ojos', tip: 'Alisa la frente y deja los ojos pesados.', tenseSec: 4, releaseSec: 8 },
  { group: 'Abdomen', action: 'Endurece la barriga', tip: 'Suelta y deja que el aire la infle sola.', tenseSec: 4, releaseSec: 8 },
  { group: 'Piernas', action: 'Estira las piernas y aprieta los muslos', tip: 'Afloja todo y siente el apoyo del suelo.', tenseSec: 4, releaseSec: 8 },
];

export const PANIC_TRUTH_CARDS: string[] = [
  'Esto es adrenalina. Sube, llega a su tope y baja sola.',
  'Mi cuerpo se está protegiendo. No hay peligro real aquí.',
  'No tengo que pelear con esta sensación. Solo dejarla pasar.',
  'Los ataques de pánico no dañan el corazón ni vuelven loco a nadie.',
  'Ya pasé por esto antes y siempre terminó.',
  'Solo tengo que hacer el siguiente minuto, nada más.',
  'Puedo sentir miedo y estar a salvo al mismo tiempo.',
  'Exhalar más largo le dice a mi cuerpo que puede bajar la guardia.',
  'No necesito resolver nada ahora. Solo respirar.',
  'Esta ola tiene un pico y después baja. Estoy en el pico.',
  'Mis pies están firmes en el suelo y mi entorno es seguro ahora.',
  'Sentir el corazón rápido es señal de energía, no de peligro.',
  'Puedo soltar los hombros y la mandíbula aunque siga nervioso.',
  'Un pensamiento catastrófico es ruido mental, no una predicción.',
  'No tengo que demostrar calma perfecta; basta con respirar suave.',
  'Cada exhalación lenta apaga poco a poco la alarma interna.',
  'Puedo ir despacio: el mundo no se cae si paro cinco minutos.',
  'Lo incómodo no es necesariamente peligroso. Esto también pasará.',
  'Traer mi atención a cinco objetos reales me devuelve al presente.',
  'Merezco tratarme con paciencia mientras mi cuerpo recupera el equilibrio.',
];

/** BPM del pulso calmante: baja linealmente de `startBpm` a `endBpm` en `durationSec` y se queda ahi. */
export function computeDecayingPulseBpm(
  elapsedSec: number,
  startBpm: number,
  endBpm: number,
  durationSec: number
): number {
  if (!(durationSec > 0)) return endBpm;
  const p = Math.min(1, Math.max(0, elapsedSec / durationSec));
  return startBpm + (endBpm - startBpm) * p;
}
