import type { Attempt, Target } from './round';

export const PROGRESS_SCHEMA_VERSION = 3;

/** Ограничение из DATA_MODEL.md: история не растёт бесконечно. */
export const MAX_ATTEMPTS = 500;

/**
 * `unlockedLevel` здесь больше нет: открытых и закрытых уровней не существует,
 * все игры доступны сразу. Поле оставалось бы числом, которое никто не читает.
 *
 * Освоенное хранится целями, а не идентификаторами регионов: `beijing` бывает
 * и регионом, и городом, и по одной строке их не различить.
 */
export type Progress = {
  readonly schemaVersion: number;
  readonly attempts: readonly Attempt[];
  readonly masteredTargets: readonly Target[];
};

export const EMPTY_PROGRESS: Progress = {
  schemaVersion: PROGRESS_SCHEMA_VERSION,
  attempts: [],
  masteredTargets: [],
};

/** Добавляет попытки, оставляя только последние `MAX_ATTEMPTS`. */
export function addAttempts(
  progress: Progress,
  attempts: readonly Attempt[],
): Progress {
  const combined = [...progress.attempts, ...attempts];

  return {
    ...progress,
    attempts: combined.slice(Math.max(0, combined.length - MAX_ATTEMPTS)),
  };
}
