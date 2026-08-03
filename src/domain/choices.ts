import type { Region } from '../content/types';
import { shuffle } from './random';

export const CHOICE_COUNT = 4;

/**
 * Четыре варианта: правильный и три отвлекающих. Отвлекающие берутся из
 * того же типа региона — так они правдоподобны (EXERCISES.md); если своих
 * не хватает, набор добирается из остальных. Порядок случаен, поэтому
 * позиция правильного варианта не подсказывает ответ.
 */
export function buildChoices(
  regions: readonly Region[],
  targetRegionId: string,
  random: () => number,
): readonly Region[] {
  const target = regions.find((region) => region.id === targetRegionId);
  if (!target) {
    throw new Error(`Неизвестный регион: ${targetRegionId}`);
  }

  const others = regions.filter((region) => region.id !== target.id);
  const sameKind = shuffle(
    others.filter((region) => region.kind === target.kind),
    random,
  );
  const otherKind = shuffle(
    others.filter((region) => region.kind !== target.kind),
    random,
  );

  const distractors = [...sameKind, ...otherKind].slice(0, CHOICE_COUNT - 1);

  return shuffle([target, ...distractors], random);
}
