import type { Attempt, Level } from './round';

export const PROGRESS_SCHEMA_VERSION = 1;

/** Ограничение из DATA_MODEL.md: история не растёт бесконечно. */
export const MAX_ATTEMPTS = 500;

export type Progress = {
  readonly schemaVersion: number;
  readonly attempts: readonly Attempt[];
  readonly masteredRegionIds: readonly string[];
  readonly unlockedLevel: Level;
};

export const EMPTY_PROGRESS: Progress = {
  schemaVersion: PROGRESS_SCHEMA_VERSION,
  attempts: [],
  masteredRegionIds: [],
  unlockedLevel: 1,
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
