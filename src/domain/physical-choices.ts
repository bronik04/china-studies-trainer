import type { PhysicalFeature } from '../content/types';
import { CHOICE_COUNT } from './choices';
import { shuffle } from './random';

/**
 * Четыре имени к подсвеченному объекту: правильное и три отвлекающих.
 *
 * Отвлекающие берутся только того же вида — реку отвлекают реками, форму
 * формами. Иначе вопрос решается не знанием, а формой подсветки: линия не
 * может оказаться пустыней, и три из четырёх вариантов отпадают, не будучи
 * прочитанными.
 *
 * Своих ровно шесть, значит четыре варианта — предел набора, и добирать из
 * чужого вида нельзя: это и есть та самая подсказка. Отсюда и объём режима в
 * спеке: двенадцать целей, по шесть на вид.
 */
export function buildPhysicalChoices(
  features: readonly PhysicalFeature[],
  targetId: string,
  random: () => number,
): readonly PhysicalFeature[] {
  const target = features.find((feature) => feature.id === targetId);
  if (!target) {
    throw new Error(`Неизвестный объект: ${targetId}`);
  }

  const sameKind = shuffle(
    features.filter(
      (feature) => feature.kind === target.kind && feature.id !== target.id,
    ),
    random,
  );

  return shuffle([target, ...sameKind.slice(0, CHOICE_COUNT - 1)], random);
}
