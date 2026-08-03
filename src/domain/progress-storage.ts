import { EMPTY_PROGRESS, PROGRESS_SCHEMA_VERSION, type Progress } from './progress';

export const PROGRESS_KEY = 'china-studies-trainer/progress';
export const BACKUP_KEY = 'china-studies-trainer/progress-backup';

export type ProgressStore = {
  readonly isAvailable: boolean;
  read(): Progress;
  write(progress: Progress): void;
  clear(): void;
};

/**
 * Проверка записи: хранилище может существовать, но отказывать в записи
 * (переполнение, приватный режим). Тогда упражнение работает, а ученик
 * предупреждён, что прогресс не сохранится (SPEC.md).
 */
function canWrite(storage: Storage): boolean {
  const probe = `${PROGRESS_KEY}/probe`;
  try {
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function createProgressStore(storage: Storage | null): ProgressStore {
  if (storage === null || !canWrite(storage)) {
    return {
      isAvailable: false,
      read: () => EMPTY_PROGRESS,
      write: () => {},
      clear: () => {},
    };
  }

  /**
   * Испорченные или чужие данные не удаляются: DATA_MODEL.md требует
   * сохранить их отдельно, чтобы неудачная миграция ничего не уничтожила.
   */
  function setAside(raw: string): Progress {
    storage.setItem(BACKUP_KEY, raw);
    storage.removeItem(PROGRESS_KEY);

    return EMPTY_PROGRESS;
  }

  return {
    isAvailable: true,

    read() {
      const raw = storage.getItem(PROGRESS_KEY);
      if (raw === null) {
        return EMPTY_PROGRESS;
      }

      try {
        const parsed = JSON.parse(raw) as Progress;

        return parsed.schemaVersion === PROGRESS_SCHEMA_VERSION
          ? { ...EMPTY_PROGRESS, ...parsed }
          : setAside(raw);
      } catch {
        return setAside(raw);
      }
    },

    write(progress) {
      try {
        storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
      } catch {
        // Запись перестала работать во время сеанса: раунд важнее записи.
      }
    },

    clear() {
      storage.removeItem(PROGRESS_KEY);
    },
  };
}
