/**
 * Перевод сохранённого прогресса между версиями схемы.
 *
 * Отдельно от хранилища намеренно: хранилище отвечает за доступность и
 * сохранность, миграция — за форму. Смешавшись, они дали бы модуль, который
 * невозможно проверить без подставного `Storage`.
 */
import { PROGRESS_SCHEMA_VERSION, type Progress } from './progress';
import type { Attempt } from './round';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Попытка версии 1: цель хранилась голым идентификатором региона. */
function migrateAttempt(value: unknown): Attempt | null {
  if (!isRecord(value) || typeof value.regionId !== 'string') {
    return null;
  }

  const { regionId, ...rest } = value;

  return { ...rest, target: { kind: 'region', id: regionId } } as unknown as Attempt;
}

/** Данные уже текущей версии: переводить нечего, резервировать нечего. */
export function isCurrentVersion(parsed: unknown): boolean {
  return isRecord(parsed) && parsed.schemaVersion === PROGRESS_SCHEMA_VERSION;
}

/**
 * `null` — данные не понятны. Вызывающий обязан отложить их в резерв, а не
 * удалить: DATA_MODEL.md требует, чтобы неудачная миграция ничего не
 * уничтожала.
 */
export function migrateProgress(parsed: unknown): Progress | null {
  if (!isRecord(parsed)) {
    return null;
  }

  if (isCurrentVersion(parsed)) {
    return parsed as unknown as Progress;
  }

  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.attempts)) {
    return null;
  }

  const attempts = parsed.attempts.map(migrateAttempt);
  if (attempts.some((attempt) => attempt === null)) {
    return null;
  }

  const mastered = Array.isArray(parsed.masteredRegionIds)
    ? parsed.masteredRegionIds.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    attempts: attempts as Attempt[],
    // `unlockedLevel` из первой версии не переносится: уровней больше нет.
    masteredTargets: mastered.map((id) => ({ kind: 'region', id }) as const),
  };
}
