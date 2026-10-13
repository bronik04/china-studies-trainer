import type { PhysicalFeature } from '../content/types';
import { CHOICE_COUNT } from './choices';
import { shuffle } from './random';

/**
 * Четыре имени к подсвеченному объекту: правильное и три отвлекающих.
 *
 * Отвлекающие берутся только похожих на вид — линию отвлекают линиями, форму
 * формами. Иначе вопрос решается не знанием, а формой подсветки: линия не
 * может оказаться пустыней, и три из четырёх вариантов отпадают, не будучи
 * прочитанными.
 *
 * Похожесть — это семья, а не род. Участок реки нарисован тем же пером, что и
 * река, поэтому они в одной семье; своего рода у участка один-единственный, и
 * по роду вариант остался бы один — он же ответ.
 *
 * Часть и целое в одном вопросе не встречаются: подсвечена вся Янцзы, а среди
 * имён её же участок — это подсказка наоборот, и она вдобавок делает вопрос
 * спорным.
 */
type Family = 'line' | 'landform' | 'lake' | 'point' | 'marine';

function familyOf(feature: PhysicalFeature): Family {
  return feature.kind === 'river' || feature.kind === 'gorge'
    ? 'line'
    : feature.kind;
}

function isPartOfEachOther(left: PhysicalFeature, right: PhysicalFeature): boolean {
  const partOf = (feature: PhysicalFeature): string | undefined =>
    feature.kind === 'gorge' ? feature.partOf : undefined;

  return partOf(left) === right.id || partOf(right) === left.id;
}

export function buildPhysicalChoices(
  features: readonly PhysicalFeature[],
  targetId: string,
  random: () => number,
): readonly PhysicalFeature[] {
  const target = features.find((feature) => feature.id === targetId);
  if (!target) {
    throw new Error(`Неизвестный объект: ${targetId}`);
  }

  const sameFamily = shuffle(
    features.filter(
      (feature) =>
        familyOf(feature) === familyOf(target) &&
        feature.id !== target.id &&
        !isPartOfEachOther(feature, target),
    ),
    random,
  );

  return shuffle([target, ...sameFamily.slice(0, CHOICE_COUNT - 1)], random);
}
