import type { Region } from '../../content/types';
import type { ExerciseType } from '../../domain/round';

export type ExerciseMode = {
  readonly exerciseType: ExerciseType;
  readonly title: string;
  readonly eyebrow: string;
  readonly showsMap: boolean;
  readonly promptOf: (region: Region) => string;
  readonly optionOf: (region: Region) => string;
};

export const EXERCISE_MODES: Readonly<Record<ExerciseType, ExerciseMode>> = {
  'find-on-map': {
    exerciseType: 'find-on-map',
    title: 'Найти на карте',
    eyebrow: 'Найдите на карте',
    showsMap: true,
    promptOf: (region) => region.nameRu,
    optionOf: (region) => region.nameRu,
  },
  'name-region': {
    exerciseType: 'name-region',
    title: 'Назвать регион',
    eyebrow: 'Какой регион подсвечен',
    showsMap: true,
    promptOf: () => 'Регион на карте',
    optionOf: (region) => region.nameRu,
  },
  'match-capital': {
    exerciseType: 'match-capital',
    title: 'Регион — столица',
    eyebrow: 'Выберите административный центр',
    showsMap: false,
    promptOf: (region) => region.nameRu,
    optionOf: (region) => region.capitalRu,
  },
};
