import { regionsWord } from '../../content/region-count';
import { targetsToRepeat } from '../../domain/progress-rules';
import type { Attempt, ExerciseType, Level } from '../../domain/round';
import { EXERCISE_MODES } from '../exercise/exercise-modes';

/**
 * Единственный главный шаг кабинета: подпись и параметры раунда считаются
 * вместе. Разъехавшись, они дали бы кнопку, которая обещает «повторить 6
 * регионов», а запускает раунд по всем 34.
 */
export type NextStep = {
  readonly label: string;
  readonly exerciseType: ExerciseType;
  readonly level: Level;
  /** `null` — раунд по всем регионам темы. */
  readonly regionIds: readonly string[] | null;
};

/** «Назвать регион» посреди предложения пишется со строчной. */
function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase('ru') + text.slice(1);
}

/**
 * Режим берётся из истории, а не из отдельного поля: у `Attempt` есть
 * `exerciseType`, поэтому запоминать «последний режим» в хранилище незачем.
 */
function lastExerciseType(attempts: readonly Attempt[]): ExerciseType {
  return attempts.at(-1)?.exerciseType ?? 'find-on-map';
}

/*
 * Уровень берётся у самой игры, а не из истории: он означает, какими
 * представлениями она спрашивает, и меняться от прогресса ученика не может.
 */
export function nextStep(attempts: readonly Attempt[], now: Date): NextStep {
  const exerciseType = lastExerciseType(attempts);
  const mode = EXERCISE_MODES[exerciseType];

  const toRepeat = targetsToRepeat(attempts, now, 'region').map((target) => target.id);
  if (toRepeat.length > 0) {
    return {
      label: `Повторить ${toRepeat.length} ${regionsWord(toRepeat.length)}`,
      exerciseType,
      level: mode.level,
      regionIds: toRepeat,
    };
  }

  if (attempts.length === 0) {
    return {
      label: `Начать: ${lowerFirst(EXERCISE_MODES['find-on-map'].title)}`,
      exerciseType: 'find-on-map',
      level: EXERCISE_MODES['find-on-map'].level,
      regionIds: null,
    };
  }

  return {
    label: `Продолжить: ${lowerFirst(mode.title)}`,
    exerciseType,
    level: mode.level,
    regionIds: null,
  };
}
