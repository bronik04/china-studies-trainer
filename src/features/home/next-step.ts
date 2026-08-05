import { regionsWord } from '../../content/region-count';
import { targetsToRepeat } from '../../domain/progress-rules';
import type { QuestionLanguage } from '../../domain/question-language';
import type { Attempt, ExerciseType } from '../../domain/round';
import { EXERCISE_MODES } from '../exercise/exercise-modes';

/**
 * Единственный главный шаг кабинета: подпись и параметры раунда считаются
 * вместе. Разъехавшись, они дали бы кнопку, которая обещает «повторить 6
 * регионов», а запускает раунд по всем 34.
 */
export type NextStep = {
  readonly label: string;
  readonly exerciseType: ExerciseType;
  readonly language: QuestionLanguage;
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

/**
 * Язык берётся из истории по тому же правилу, что и последняя игра: ученик,
 * перешедший на иероглифы, не должен возвращать их вручную каждый раз.
 */
function lastLanguage(attempts: readonly Attempt[]): QuestionLanguage {
  return attempts.at(-1)?.language ?? 'ru';
}

export function nextStep(attempts: readonly Attempt[], now: Date): NextStep {
  const exerciseType = lastExerciseType(attempts);
  const mode = EXERCISE_MODES[exerciseType];

  const toRepeat = targetsToRepeat(attempts, now, 'region').map((target) => target.id);
  if (toRepeat.length > 0) {
    return {
      label: `Повторить ${toRepeat.length} ${regionsWord(toRepeat.length)}`,
      exerciseType,
      language: lastLanguage(attempts),
      regionIds: toRepeat,
    };
  }

  if (attempts.length === 0) {
    return {
      label: `Начать: ${lowerFirst(EXERCISE_MODES['find-on-map'].title)}`,
      exerciseType: 'find-on-map',
      language: lastLanguage(attempts),
      regionIds: null,
    };
  }

  return {
    label: `Продолжить: ${lowerFirst(mode.title)}`,
    exerciseType,
    language: lastLanguage(attempts),
    regionIds: null,
  };
}
