// Orden barajado estable: misma semilla = mismo orden; otra semilla = otro orden.
// Se ordena por hash de (semilla + clave), así agregar o filtrar elementos no revuelve el resto.
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffleBySeed<T>(list: readonly T[], seed: number, key: (item: T) => string): T[] {
  return list
    .map((item) => ({ item, score: hashSeed(`${seed}:${key(item)}`) }))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.item);
}
