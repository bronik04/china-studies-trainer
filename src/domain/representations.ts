import type { Region } from '../content/types';
import type { ExerciseType, Level } from './round';

export type Representation = 'name-ru' | 'name-zh' | 'pinyin' | 'capital';

/** SPEC.md: сложность растёт от русского названия к смешанному режиму. */
export const REPRESENTATIONS_BY_LEVEL: Readonly<
  Record<Level, readonly Representation[]>
> = {
  1: ['name-ru'],
  2: ['name-zh'],
  3: ['pinyin', 'capital'],
  4: ['name-ru', 'name-zh', 'pinyin', 'capital'],
};

export function labelOf(region: Region, representation: Representation): string {
  switch (representation) {
    case 'name-ru':
      return region.nameRu;
    case 'name-zh':
      return region.nameZh;
    case 'pinyin':
      return region.pinyin;
    case 'capital':
      return region.capitalRu;
  }
}

/**
 * В задании «регион — столица» ответ и есть столица, поэтому показывать её
 * в вопросе нельзя. Для остальных заданий доступны все представления уровня.
 */
export function representationsFor(
  level: Level,
  exerciseType: ExerciseType,
): readonly Representation[] {
  const available = REPRESENTATIONS_BY_LEVEL[level];

  return exerciseType === 'match-capital'
    ? available.filter((representation) => representation !== 'capital')
    : available;
}
