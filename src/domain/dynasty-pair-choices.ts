import type { Dynasty, DynastyCapital, Ruler } from '../content/types';
import { CHOICE_COUNT } from './choices';
import { shuffle } from './random';

/**
 * Варианты для игр «династия — столица» и «династия — правитель».
 *
 * Отвлекающие берутся у соседей по времени: спутать Сун с Тан — ошибка по
 * существу, спутать Сун с Цинь — промах наугад, и вопрос, где все три
 * отвлекающих далеки, решается без знания. Тот же довод, что в
 * `buildDynastyChoices`.
 *
 * Соседство считается по династиям, а не по самим ответам: у столицы времени
 * нет вовсе, у правителя оно своё, и мерить надо тем, о чём спрашивают.
 */

/** Середина срока: по расстоянию между серединами меряется соседство. */
function middle(dynasty: Dynasty): number {
  return (dynasty.from + dynasty.to) / 2;
}

function dynastyOf(dynasties: readonly Dynasty[], dynastyId: string): Dynasty {
  const dynasty = dynasties.find((item) => item.id === dynastyId);
  if (dynasty === undefined) {
    throw new Error(`Неизвестная династия: ${dynastyId}`);
  }

  return dynasty;
}

/**
 * Ближайшие по времени, но каждый ответ — свой. Отсев одинаковых обязателен:
 * Юань, Мин и Цин правили из Пекина, и без него вопрос предложил бы «Пекин»
 * трижды.
 */
function nearest<T extends { readonly dynastyId: string }>(
  items: readonly T[],
  dynasties: readonly Dynasty[],
  target: Dynasty,
  keyOf: (item: T) => string,
  random: () => number,
): readonly T[] {
  const targetMiddle = middle(target);
  const seen = new Set<string>();

  /*
   * Перемешивание до сортировки: у нескольких записей расстояние совпадает, и
   * без него порядок задавал бы справочник — одни и те же отвлекающие в каждом
   * раунде.
   */
  return shuffle([...items], random)
    .sort(
      (left, right) =>
        Math.abs(middle(dynastyOf(dynasties, left.dynastyId)) - targetMiddle) -
        Math.abs(middle(dynastyOf(dynasties, right.dynastyId)) - targetMiddle),
    )
    .filter((item) => {
      const key = keyOf(item);
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    });
}

export function buildCapitalChoices(
  capitals: readonly DynastyCapital[],
  dynasties: readonly Dynasty[],
  targetDynastyId: string,
  random: () => number,
): readonly DynastyCapital[] {
  const target = dynastyOf(dynasties, targetDynastyId);
  const correct = capitals.find(
    (capital) => capital.asked && capital.dynastyId === targetDynastyId,
  );

  if (correct === undefined) {
    throw new Error(`У династии ${targetDynastyId} нет спрашиваемой столицы`);
  }

  const others = nearest(
    capitals.filter((capital) => capital.cityId !== correct.cityId),
    dynasties,
    target,
    (capital) => capital.cityId,
    random,
  ).slice(0, CHOICE_COUNT - 1);

  return shuffle([correct, ...others], random);
}

export function buildRulerChoices(
  rulers: readonly Ruler[],
  dynasties: readonly Dynasty[],
  targetDynastyId: string,
  random: () => number,
): readonly Ruler[] {
  const target = dynastyOf(dynasties, targetDynastyId);
  const correct = rulers.find((ruler) => ruler.dynastyId === targetDynastyId);

  if (correct === undefined) {
    throw new Error(`У династии ${targetDynastyId} нет правителя`);
  }

  const others = nearest(
    rulers.filter((ruler) => ruler.id !== correct.id),
    dynasties,
    target,
    (ruler) => ruler.id,
    random,
  ).slice(0, CHOICE_COUNT - 1);

  return shuffle([correct, ...others], random);
}
