import type { Landmark } from '../content/landmarks';
import { CHOICE_COUNT } from './choices';
import { shuffle } from './random';

/**
 * Четыре имени к подсвеченной звезде: правильное и три отвлекающих.
 *
 * Отвлекающие берутся того же рода — памятник памятниками, гора горами. Довод
 * тот же, что в физической географии и культуре: иначе вопрос решается видом
 * кадра или знака, а не знанием.
 *
 * Но, в отличие от физической географии, добор из чужого рода здесь разрешён и
 * необходим: современных сооружений в каталоге всего четыре, и на вопросе о
 * плотине «Три ущелья» своих отвлекающих остаётся ровно три — а стоит ученику
 * выбрать набор «Памятники», как их не остаётся вовсе. Добор идёт из соседних
 * родов и только после того, как свои кончились.
 */
export function buildLandmarkChoices(
  pool: readonly Landmark[],
  targetId: string,
  random: () => number,
): readonly Landmark[] {
  const target = pool.find((one) => one.id === targetId);
  if (!target) {
    throw new Error(`Неизвестная достопримечательность: ${targetId}`);
  }

  const rest = pool.filter((one) => one.id !== target.id);
  const sameKind = shuffle(
    rest.filter((one) => one.kind === target.kind),
    random,
  );
  const otherKind = shuffle(
    rest.filter((one) => one.kind !== target.kind),
    random,
  );

  return shuffle(
    [target, ...[...sameKind, ...otherKind].slice(0, CHOICE_COUNT - 1)],
    random,
  );
}
