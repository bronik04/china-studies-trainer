/**
 * Генератор псевдослучайных чисел mulberry32. Нужен, чтобы порядок вопросов
 * был воспроизводим в тестах: домен никогда не вызывает Math.random сам,
 * а получает функцию снаружи.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Перемешивание Фишера — Йетса. Исходный массив не изменяется. */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
