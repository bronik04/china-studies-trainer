import { addAttempts, EMPTY_PROGRESS } from './progress';
import { BACKUP_KEY, createProgressStore, PROGRESS_KEY } from './progress-storage';
import type { Attempt } from './round';

const attempt: Attempt = {
  questionId: '1-sichuan',
  roundId: 'round-1',
  target: { kind: 'region', id: 'sichuan' },
  exerciseType: 'find-on-map',
  language: 'ru',
  isCorrect: true,
  durationMs: 1000,
  answeredAt: '2026-08-03T10:00:00.000Z',
};

function memoryStorage(seed: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(seed));

  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

it('без хранилища сообщает о недоступности и не падает', () => {
  const store = createProgressStore(null);

  expect(store.isAvailable).toBe(false);
  expect(store.read()).toEqual(EMPTY_PROGRESS);
  expect(() => store.write(EMPTY_PROGRESS)).not.toThrow();
});

it('переживает перезагрузку', () => {
  const storage = memoryStorage();
  const saved = addAttempts(EMPTY_PROGRESS, [attempt]);

  createProgressStore(storage).write(saved);

  expect(createProgressStore(storage).read()).toEqual(saved);
});

it('возвращает пустой прогресс, когда сохранённого нет', () => {
  expect(createProgressStore(memoryStorage()).read()).toEqual(EMPTY_PROGRESS);
});

it('откладывает чужую версию схемы в резервную копию', () => {
  const foreign = JSON.stringify({ schemaVersion: 99, attempts: [attempt] });
  const storage = memoryStorage({ [PROGRESS_KEY]: foreign });

  const progress = createProgressStore(storage).read();

  expect(progress).toEqual(EMPTY_PROGRESS);
  expect(storage.getItem(BACKUP_KEY)).toBe(foreign);
});

it('откладывает испорченные данные в резервную копию', () => {
  const storage = memoryStorage({ [PROGRESS_KEY]: 'не json' });

  expect(createProgressStore(storage).read()).toEqual(EMPTY_PROGRESS);
  expect(storage.getItem(BACKUP_KEY)).toBe('не json');
});

it('считает хранилище недоступным, если запись запрещена', () => {
  const storage = memoryStorage();
  storage.setItem = () => {
    throw new Error('quota');
  };

  expect(createProgressStore(storage).isAvailable).toBe(false);
});

it('стирает только свой ключ', () => {
  const storage = memoryStorage({ 'чужой-ключ': 'останется' });
  const store = createProgressStore(storage);
  store.write(addAttempts(EMPTY_PROGRESS, [attempt]));

  store.clear();

  expect(store.read()).toEqual(EMPTY_PROGRESS);
  expect(storage.getItem('чужой-ключ')).toBe('останется');
});

it('переводит сохранённый прогресс первой версии и сохраняет исходник', () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    attempts: [
      {
        questionId: '1-sichuan',
        roundId: 'round-1',
        regionId: 'sichuan',
        exerciseType: 'find-on-map',
        level: 1,
        isCorrect: true,
        durationMs: 1000,
        answeredAt: '2026-08-03T10:00:00.000Z',
      },
    ],
    masteredRegionIds: ['sichuan'],
  });
  const storage = memoryStorage({ [PROGRESS_KEY]: raw });
  const store = createProgressStore(storage);

  const progress = store.read();

  expect(progress.attempts[0].target).toEqual({ kind: 'region', id: 'sichuan' });
  expect(progress.masteredTargets).toEqual([{ kind: 'region', id: 'sichuan' }]);
  expect(storage.getItem(BACKUP_KEY)).toBe(raw);
  expect(storage.getItem(PROGRESS_KEY)).toBe(raw);
});

it('не резервирует прогресс текущей версии при каждом чтении', () => {
  const raw = JSON.stringify({ ...EMPTY_PROGRESS, masteredTargets: [] });
  const storage = memoryStorage({ [PROGRESS_KEY]: raw });

  createProgressStore(storage).read();

  expect(storage.getItem(BACKUP_KEY)).toBeNull();
});
