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

/** Значения первой версии называли цель, а не форму вопроса. */
const RENAMED_EXERCISE_TYPES: Readonly<Record<string, string>> = {
  'name-region': 'name-target',
  'match-capital': 'match-pair',
};

/** Попытка версии 1: цель хранилась голым идентификатором региона. */
function migrateAttemptToV2(value: unknown): Attempt | null {
  if (!isRecord(value) || typeof value.regionId !== 'string') {
    return null;
  }

  const { regionId, ...rest } = value;
  const exerciseType =
    typeof value.exerciseType === 'string'
      ? (RENAMED_EXERCISE_TYPES[value.exerciseType] ?? value.exerciseType)
      : value.exerciseType;

  return {
    ...rest,
    exerciseType,
    target: { kind: 'region', id: regionId },
  } as unknown as Attempt;
}

/** Первая версия: цель хранилась голым идентификатором региона. */
function toV2(progress: UnknownRecord): UnknownRecord | null {
  if (!Array.isArray(progress.attempts)) {
    return null;
  }

  const attempts = progress.attempts.map(migrateAttemptToV2);
  if (attempts.some((attempt) => attempt === null)) {
    return null;
  }

  const mastered = Array.isArray(progress.masteredRegionIds)
    ? progress.masteredRegionIds.filter((id): id is string => typeof id === 'string')
    : [];

  return {
    schemaVersion: 2,
    attempts,
    // `unlockedLevel` из первой версии не переносится: уровней больше нет.
    masteredTargets: mastered.map((id) => ({ kind: 'region', id })),
  };
}

/**
 * Вторая версия: попытка хранила уровень. Перевода «второй уровень — это
 * иероглифы» нет намеренно: чтобы его сделать, миграция обязана знать, что
 * такое уровень, а от уровней продукт отказался. Поле отбрасывается, попытке
 * проставляется русский.
 *
 * Цена: цель, освоенная прежде через иероглифы, потребует одного верного
 * ответа на 中文 заново. Это честнее, чем выдать признак за вопрос, которого
 * больше не существует.
 */
function toV3(progress: UnknownRecord): UnknownRecord | null {
  if (!Array.isArray(progress.attempts)) {
    return null;
  }

  return {
    ...progress,
    schemaVersion: 3,
    attempts: progress.attempts.map((attempt: unknown) => {
      if (!isRecord(attempt)) {
        return attempt;
      }

      const rest = Object.fromEntries(
        Object.entries(attempt).filter(([key]) => key !== 'level'),
      );

      return { ...rest, language: 'ru' };
    }),
  };
}

/** Данные уже текущей версии: переводить нечего, резервировать нечего. */
export function isCurrentVersion(parsed: unknown): boolean {
  return isRecord(parsed) && parsed.schemaVersion === PROGRESS_SCHEMA_VERSION;
}

/** Цель попытки: без неё запись не о чем, и разбор итогов по ней перебирает. */
function isTarget(value: unknown): boolean {
  return isRecord(value) && typeof value.kind === 'string' && typeof value.id === 'string';
}

/**
 * Годна ли запись к чтению приложением.
 *
 * Номер схемы говорит только о том, что перевод не нужен, — но не о том, что
 * запись цела: в хранилище браузера кто угодно правит что угодно, а прежняя
 * версия приложения могла записать её недописанной. Приложение читает
 * `attempts` перебором, и `null` в этом поле роняет тренажёр при каждом
 * запуске, пока ученик сам не очистит хранилище.
 *
 * Проверяется форма, а не каждое поле попытки: недостающая длительность даёт
 * пустое время в итогах, а не падение, тогда как отсутствие цели ломает и
 * повтор ошибок, и подсчёт освоенного.
 */
function isReadable(record: UnknownRecord): boolean {
  return (
    Array.isArray(record.attempts) &&
    record.attempts.every((attempt) => isRecord(attempt) && isTarget(attempt.target)) &&
    Array.isArray(record.masteredTargets) &&
    record.masteredTargets.every(isTarget)
  );
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
    return isReadable(parsed) ? (parsed as unknown as Progress) : null;
  }

  /*
   * Цепочка, а не набор отдельных переводов: прогресс первой версии может
   * лежать в браузере с прошлой недели, и обрывать путь до текущей схемы
   * нельзя.
   */
  let current: UnknownRecord | null = parsed;
  if (current !== null && current.schemaVersion === 1) {
    current = toV2(current);
  }

  if (current !== null && current.schemaVersion === 2) {
    current = toV3(current);
  }

  if (current === null || current.schemaVersion !== PROGRESS_SCHEMA_VERSION) {
    return null;
  }

  /*
   * Переведённая запись проверяется тем же мерилом, что и своя: перевод
   * отвечает за форму версии, а поля, которых он не трогает, копируются как
   * есть — вместе с тем, что в них лежало.
   */
  return isReadable(current) ? (current as unknown as Progress) : null;
}
