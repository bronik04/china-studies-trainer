import type { City } from '../content/types';
import { CHOICE_COUNT } from './choices';
import { shuffle } from './random';

/**
 * Четыре имени к подсвеченной точке: правильное и три отвлекающих.
 *
 * У регионов отвлекающие берутся по типу единицы, здесь так нельзя: если к
 * точке в дельте Янцзы предложить Урумчи, Куньмин и Харбин, вопрос решается
 * по грубому положению и не проверяет ничего. Отвлекающие берутся из того же
 * набора и из ближайших по расстоянию — тогда отвечать приходится по знанию
 * города, а не по стороне света.
 *
 * Расстояние считается по градусам напрямую, без поправки на сходимость
 * меридианов: на широтах Китая она меняет только порядок соседей в пределах
 * той же округи, а выбирать среди своих же соседей — ровно то, что нужно.
 */
export function buildCityChoices(
  cities: readonly City[],
  targetCityId: string,
  random: () => number,
): readonly City[] {
  const target = cities.find((city) => city.id === targetCityId);
  if (!target) {
    throw new Error(`Неизвестный город: ${targetCityId}`);
  }

  const others = cities.filter((city) => city.id !== target.id);
  const byDistance = [...others].sort(
    (left, right) => distance(target, left) - distance(target, right),
  );

  const sameSet = byDistance.filter((city) => city.set === target.set);
  const otherSet = byDistance.filter((city) => city.set !== target.set);

  const distractors = [...sameSet, ...otherSet].slice(0, CHOICE_COUNT - 1);

  return shuffle([target, ...distractors], random);
}

function distance(left: City, right: City): number {
  return Math.hypot(left.lon - right.lon, left.lat - right.lat);
}
