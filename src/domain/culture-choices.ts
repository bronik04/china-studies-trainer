import type { Collection } from '../content/collections';
import { CHOICE_COUNT } from './choices';
import { shuffle } from './random';

/**
 * Четыре названия к показанному снимку: верное и три отвлекающих.
 *
 * Отвлекающие приходят готовым списком «того же рода» (`sameKindAs`): снимок
 * горы не может оказаться праздником, и разнородные варианты отпадали бы, не
 * будучи прочитанными. Тот же довод, что у отвлекающих в физической
 * географии.
 *
 * Если своих не набирается трёх — набор мал, — вопрос всё равно получает
 * четыре варианта, добирая из общего пула: вопрос с двумя вариантами хуже
 * подсказки в виде рода.
 */
export function buildCultureChoices(
  target: Collection,
  sameKind: readonly Collection[],
  pool: readonly Collection[],
  random: () => number,
): readonly Collection[] {
  const others = shuffle(
    sameKind.filter((collection) => collection.id !== target.id),
    random,
  );

  const chosen = others.slice(0, CHOICE_COUNT - 1);

  if (chosen.length < CHOICE_COUNT - 1) {
    const taken = new Set([target.id, ...chosen.map(({ id }) => id)]);
    const rest = shuffle(
      pool.filter((collection) => !taken.has(collection.id)),
      random,
    );
    chosen.push(...rest.slice(0, CHOICE_COUNT - 1 - chosen.length));
  }

  return shuffle([target, ...chosen], random);
}
