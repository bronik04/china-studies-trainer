import { EMPTY_PROGRESS, type Progress } from './progress';
import { isCurrentVersion, migrateProgress } from './progress-migration';

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

/**
 * Хранилище браузера или null, если политика запрещает даже обращение к нему.
 *
 * Живёт здесь, а не у приложения: правило «компоненты не трогают localStorage»
 * записано без исключений, а `App` вынужденно держал этот try у себя. Теперь
 * хранилище берут здесь, и правилу больше нечего нарушать.
 */
function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Без довода берётся хранилище браузера. Довод остаётся ради тестов: они
 * подсовывают карту в памяти и явное `null`, чтобы проверить деградацию.
 */
export function createProgressStore(
  storage: Storage | null = browserStorage(),
): ProgressStore {
  if (storage === null || !canWrite(storage)) {
    return {
      isAvailable: false,
      read: () => EMPTY_PROGRESS,
      write: () => {},
      clear: () => {},
    };
  }

  // Параметр не сохраняет сужение типа внутри вложенных функций, поэтому
  // проверенное хранилище закрепляется в константе.
  const available = storage;

  /**
   * Испорченные или чужие данные не удаляются: DATA_MODEL.md требует
   * сохранить их отдельно, чтобы неудачная миграция ничего не уничтожила.
   */
  function setAside(raw: string): Progress {
    available.setItem(BACKUP_KEY, raw);
    available.removeItem(PROGRESS_KEY);

    return EMPTY_PROGRESS;
  }

  return {
    isAvailable: true,

    read() {
      const raw = available.getItem(PROGRESS_KEY);
      if (raw === null) {
        return EMPTY_PROGRESS;
      }

      try {
        const parsed: unknown = JSON.parse(raw);
        const migrated = migrateProgress(parsed);
        if (migrated === null) {
          return setAside(raw);
        }

        /*
         * Исходник переживает миграцию: она может оказаться неверной, а данные
         * ученика восстановить будет неоткуда (DATA_MODEL.md). Прогресс, уже
         * бывший текущей версии, ничего не резервирует — копия каждого чтения
         * затирала бы единственную полезную.
         */
        if (!isCurrentVersion(parsed)) {
          available.setItem(BACKUP_KEY, raw);
        }

        return { ...EMPTY_PROGRESS, ...migrated };
      } catch {
        return setAside(raw);
      }
    },

    write(progress) {
      try {
        available.setItem(PROGRESS_KEY, JSON.stringify(progress));
      } catch {
        // Запись перестала работать во время сеанса: раунд важнее записи.
      }
    },

    clear() {
      available.removeItem(PROGRESS_KEY);
    },
  };
}
