import type { Dynasty } from '../content/types';
import { CHOICE_COUNT } from './choices';
import { shuffle } from './random';

/**
 * Четыре срока к названной династии: верный и три чужих.
 *
 * Отвлекающие — сроки других настоящих династий, а не выдуманные диапазоны.
 * Придуманный «1450–1600» отличался бы от настоящих одним тем, что его нет в
 * ленте, и ученик отсеивал бы его памятью о списке, а не знанием даты.
 *
 * Соседи по времени идут вперёд: спутать Суй с Тан — ошибка по существу,
 * спутать Суй с Ся — промах наугад, и вопрос, где все три отвлекающих далеки,
 * решается без знания. Отсюда сортировка по расстоянию между серединами
 * сроков: ближайшие три и берутся.
 */
export function buildDynastyChoices(
  dynasties: readonly Dynasty[],
  targetId: string,
  random: () => number,
): readonly Dynasty[] {
  const target = dynasties.find((dynasty) => dynasty.id === targetId);
  if (!target) {
    throw new Error(`Неизвестная династия: ${targetId}`);
  }

  const middle = (dynasty: Dynasty) => (dynasty.from + dynasty.to) / 2;
  const targetMiddle = middle(target);

  /*
   * Перемешивание до сортировки, а не после: у нескольких династий расстояние
   * до цели может совпасть, и без него порядок задавал бы справочник — один и
   * тот же набор отвлекающих в каждом раунде.
   */
  const neighbours = shuffle(
    dynasties.filter((dynasty) => dynasty.id !== target.id),
    random,
  ).sort(
    (left, right) =>
      Math.abs(middle(left) - targetMiddle) -
      Math.abs(middle(right) - targetMiddle),
  );

  return shuffle(
    [target, ...neighbours.slice(0, CHOICE_COUNT - 1)],
    random,
  );
}
