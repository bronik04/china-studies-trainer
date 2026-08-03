import type { ExerciseType } from '../../domain/round';

export type ExerciseMode = {
  readonly exerciseType: ExerciseType;
  readonly title: string;
  readonly eyebrow: string;
};

export const EXERCISE_MODES: Readonly<Record<ExerciseType, ExerciseMode>> = {
  'find-on-map': {
    exerciseType: 'find-on-map',
    title: 'Найти на карте',
    eyebrow: 'Найдите на карте',
  },
  'name-region': {
    exerciseType: 'name-region',
    title: 'Назвать регион',
    eyebrow: 'Какой регион подсвечен',
  },
  'match-capital': {
    exerciseType: 'match-capital',
    title: 'Регион — столица',
    eyebrow: 'Выберите административный центр',
  },
};

export const ALL_EXERCISE_TYPES: readonly ExerciseType[] = [
  'find-on-map',
  'name-region',
  'match-capital',
];
