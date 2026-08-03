# Progress and Round Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Раунд заканчивается понятным итогом, прогресс переживает перезагрузку, а ошибки можно повторить.

**Architecture:** Три слоя, каждый тестируется отдельно. Чистые правила прогресса не знают ни о хранилище, ни о React. Хранилище — тонкая обёртка над `Storage` с версией схемы и деградацией. Экран итогов получает готовую сводку и ничего не вычисляет.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Testing Library, ESLint, CSS.

## Global Constraints

- Интерфейс и сообщения — на русском.
- Тон без давления: никаких «провалов», сравнения с другими и наказания за медленный ответ (PROGRESS_SYSTEM.md, UI_UX.md).
- Домен не читает часы и не трогает `localStorage`: время и хранилище передаются снаружи.
- Прогресс хранится с номером схемы; при чужой версии исходные данные не уничтожаются, а откладываются в резервную копию.
- Недоступное хранилище не ломает упражнение: раунд идёт, ученик предупреждён, что прогресс не сохранится (SPEC.md).
- В прогрессе не больше 500 попыток (DATA_MODEL.md).
- Попытки сохраняются только по завершении раунда: правила освоения говорят о «завершённых раундах».
- Палитра DESIGN_SYSTEM.md: успех `#087443`, ошибка `#B42318`, фокус `#175CD3`, текст `#1F2937`, граница `#D0D5DD`.
- Работа в ветке `feat/progress-and-results`.
- Не входит: экспорт и импорт прогресса (уйдут в режим учителя, где импорт и нужен), уровни сложности, два других упражнения.

## Решения, которые надо зафиксировать

**`Attempt` получает `roundId`.** «Персональный рекорд точности» и «три верных ответа в разных завершённых раундах» невозможно вычислить по плоскому списку попыток: в `DATA_MODEL.md` нет признака раунда. Поле добавляется в тип, в модель данных и в журнал решений. Идентификатор раунда создаёт приложение и передаёт в `createRound`, чтобы домен не читал часы.

**Освоенность пока недостижима.** PROGRESS_SYSTEM.md требует, чтобы хотя бы один верный ответ был на уровне не ниже 2, а уровни 2–4 появятся только в следующем инкременте. Правило реализуется как написано: до появления уровней `masteredRegionIds` остаётся пустым. Это не мешает ни итогам, ни повторению ошибок.

---

## File structure

| Файл | Назначение |
| --- | --- |
| `src/domain/round.ts` | `roundId` в вопросе и попытке |
| `src/domain/progress.ts` | Тип прогресса, версия схемы, добавление попыток |
| `src/domain/progress.test.ts` | Тесты хранения и обрезки истории |
| `src/domain/progress-rules.ts` | Сводка раунда, рекорд, освоенность, очередь повторения |
| `src/domain/progress-rules.test.ts` | Тесты правил |
| `src/domain/progress-storage.ts` | Чтение и запись через `Storage`, миграция, деградация |
| `src/domain/progress-storage.test.ts` | Тесты хранилища |
| `src/features/results/RoundResultsPage.tsx` | Экран итогов |
| `src/features/results/RoundResultsPage.test.tsx` | Тесты экрана |
| `src/features/exercise/FindOnMapExercise.tsx` | Передача попыток наружу |
| `src/App.tsx` | Связывание экранов и хранилища |
| `DATA_MODEL.md`, `DECISIONS.md`, `CHANGELOG.md` | Документы |

---

### Task 1: Признак раунда в попытке

**Files:**
- Modify: `src/domain/round.ts`, `src/domain/round.test.ts`, `src/features/exercise/FindOnMapExercise.tsx`, `DATA_MODEL.md`, `DECISIONS.md`

**Interfaces:**
- Produces: `RoundOptions` получает `roundId: string`; `Question` и `Attempt` получают `roundId: string`.

- [ ] **Step 1: Создать ветку**

```bash
git switch -c feat/progress-and-results
```

- [ ] **Step 2: Написать падающий тест**

Добавить в `src/domain/round.test.ts`:

```ts
it('помечает вопросы и попытки признаком раунда', () => {
  const round = createRound(regions, {
    ...OPTIONS,
    roundId: 'round-7',
    random: createSeededRandom(1),
  });

  expect(round.questions[0].roundId).toBe('round-7');
  expect(answerCurrent(round, true).attempts[0].roundId).toBe('round-7');
});
```

Дописать `roundId: 'round-1'` в константу `OPTIONS` этого файла и в ожидаемую попытку теста «записывает верный ответ».

- [ ] **Step 3: Убедиться, что тест падает**

```bash
npm test -- src/domain/round.test.ts
```

Ожидается: FAIL — `roundId` нет в типах.

- [ ] **Step 4: Реализовать**

В `src/domain/round.ts` добавить поле в три типа:

```ts
export type Question = {
  readonly id: string;
  readonly roundId: string;
  readonly regionId: string;
  readonly exerciseType: ExerciseType;
  readonly level: Level;
};
```

```ts
export type Attempt = {
  readonly questionId: string;
  readonly roundId: string;
  readonly regionId: string;
  readonly exerciseType: ExerciseType;
  readonly level: Level;
  readonly isCorrect: boolean;
  readonly durationMs: number;
  readonly answeredAt: string;
};
```

```ts
export type RoundOptions = {
  readonly roundId: string;
  readonly exerciseType: ExerciseType;
  readonly level: Level;
  readonly random: () => number;
};
```

В `createRound` записать признак в вопрос:

```ts
  const questions = shuffle(regions, options.random).map((region, index) => ({
    id: `${index + 1}-${region.id}`,
    roundId: options.roundId,
    regionId: region.id,
    exerciseType: options.exerciseType,
    level: options.level,
  }));
```

В `answerQuestion` перенести его в попытку:

```ts
  const attempt: Attempt = {
    questionId: question.id,
    roundId: question.roundId,
    regionId: question.regionId,
```

В `src/features/exercise/FindOnMapExercise.tsx` добавить свойство `roundId` и передать его в `createRound`:

```tsx
export type FindOnMapExerciseProps = {
  readonly regions: readonly Region[];
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};
```

```tsx
    createRound(regions, {
      roundId,
      exerciseType: 'find-on-map',
      level: 1,
      random: createSeededRandom(seed),
    }),
```

Заменить вызов завершения, чтобы попытки уходили наружу:

```tsx
  function handleNext() {
    const next = goToNextQuestion(round);
    if (isRoundFinished(next)) {
      onFinish(next.attempts);
      return;
    }
```

Дописать импорт типа: `import { ..., type Attempt, type Round } from '../../domain/round';`

В тестах `FindOnMapExercise.test.tsx` добавить `roundId="round-1"` в отрисовку.

- [ ] **Step 5: Обновить документы**

В `DATA_MODEL.md` в тип `Attempt` добавить строкой после `questionId`:

    roundId: string;         // к какому раунду относится попытка

В `DECISIONS.md` первой строкой таблицы:

    | 2026-08-03 | `Attempt` хранит `roundId` | Персональный рекорд точности и правило «три верных ответа в разных завершённых раундах» невозможно вычислить по плоскому списку попыток. Идентификатор создаёт приложение и передаёт в `createRound`, чтобы домен не читал часы. |
    | 2026-08-03 | Попытки сохраняются только по завершении раунда | PROGRESS_SYSTEM.md говорит о «завершённых раундах»; прерванный раунд не должен влиять на освоенность и рекорд. |

- [ ] **Step 6: Проверить и зафиксировать**

```bash
npm test && npm run lint
```

Ожидается: PASS.

```bash
git add src/domain/round.ts src/domain/round.test.ts src/features/exercise DATA_MODEL.md DECISIONS.md
git commit -m "feat: tag attempts with their round"
```

---

### Task 2: Хранение прогресса

**Files:**
- Create: `src/domain/progress.ts`, `src/domain/progress.test.ts`, `src/domain/progress-storage.ts`, `src/domain/progress-storage.test.ts`

**Interfaces:**
- Produces:

```ts
export const PROGRESS_SCHEMA_VERSION = 1;
export const MAX_ATTEMPTS = 500;
export type Progress = {
  readonly schemaVersion: number;
  readonly attempts: readonly Attempt[];
  readonly masteredRegionIds: readonly string[];
  readonly unlockedLevel: Level;
};
export const EMPTY_PROGRESS: Progress;
export function addAttempts(progress: Progress, attempts: readonly Attempt[]): Progress;

export type ProgressStore = {
  readonly isAvailable: boolean;
  read(): Progress;
  write(progress: Progress): void;
  clear(): void;
};
export function createProgressStore(storage: Storage | null): ProgressStore;
```

- [ ] **Step 1: Написать падающие тесты для прогресса**

Создать `src/domain/progress.test.ts`:

```ts
import type { Attempt } from './round';
import { addAttempts, EMPTY_PROGRESS, MAX_ATTEMPTS } from './progress';

function attempt(index: number): Attempt {
  return {
    questionId: `${index}-sichuan`,
    roundId: `round-${index}`,
    regionId: 'sichuan',
    exerciseType: 'find-on-map',
    level: 1,
    isCorrect: true,
    durationMs: 1000,
    answeredAt: '2026-08-03T10:00:00.000Z',
  };
}

it('начинается с пустой истории', () => {
  expect(EMPTY_PROGRESS.attempts).toEqual([]);
  expect(EMPTY_PROGRESS.masteredRegionIds).toEqual([]);
  expect(EMPTY_PROGRESS.unlockedLevel).toBe(1);
});

it('добавляет попытки в конец', () => {
  const progress = addAttempts(EMPTY_PROGRESS, [attempt(1), attempt(2)]);

  expect(progress.attempts).toHaveLength(2);
  expect(progress.attempts[1].roundId).toBe('round-2');
});

it('хранит не больше пятисот попыток, отбрасывая самые старые', () => {
  const many = Array.from({ length: MAX_ATTEMPTS + 10 }, (_, index) => attempt(index));

  const progress = addAttempts(EMPTY_PROGRESS, many);

  expect(progress.attempts).toHaveLength(MAX_ATTEMPTS);
  expect(progress.attempts[0].roundId).toBe('round-10');
});

it('не изменяет исходный прогресс', () => {
  addAttempts(EMPTY_PROGRESS, [attempt(1)]);

  expect(EMPTY_PROGRESS.attempts).toEqual([]);
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/domain/progress.test.ts
```

Ожидается: FAIL — модуля нет.

- [ ] **Step 3: Реализовать прогресс**

Создать `src/domain/progress.ts`:

```ts
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
```

- [ ] **Step 4: Написать падающие тесты для хранилища**

Создать `src/domain/progress-storage.test.ts`:

```ts
import { addAttempts, EMPTY_PROGRESS, type Progress } from './progress';
import { createProgressStore, PROGRESS_KEY, BACKUP_KEY } from './progress-storage';
import type { Attempt } from './round';

const attempt: Attempt = {
  questionId: '1-sichuan',
  roundId: 'round-1',
  regionId: 'sichuan',
  exerciseType: 'find-on-map',
  level: 1,
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
```

- [ ] **Step 5: Убедиться, что тесты падают**

```bash
npm test -- src/domain/progress-storage.test.ts
```

Ожидается: FAIL — модуля нет.

- [ ] **Step 6: Реализовать хранилище**

Создать `src/domain/progress-storage.ts`:

```ts
import {
  EMPTY_PROGRESS,
  PROGRESS_SCHEMA_VERSION,
  type Progress,
} from './progress';

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

  return {
    isAvailable: true,

    read() {
      const raw = storage.getItem(PROGRESS_KEY);
      if (raw === null) {
        return EMPTY_PROGRESS;
      }

      // Испорченные или чужие данные не удаляются: DATA_MODEL.md требует
      // сохранить их отдельно, чтобы неудачная миграция ничего не уничтожила.
      try {
        const parsed = JSON.parse(raw) as Progress;
        if (parsed.schemaVersion !== PROGRESS_SCHEMA_VERSION) {
          storage.setItem(BACKUP_KEY, raw);
          storage.removeItem(PROGRESS_KEY);
          return EMPTY_PROGRESS;
        }

        return { ...EMPTY_PROGRESS, ...parsed };
      } catch {
        storage.setItem(BACKUP_KEY, raw);
        storage.removeItem(PROGRESS_KEY);
        return EMPTY_PROGRESS;
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
```

- [ ] **Step 7: Проверить и зафиксировать**

```bash
npm test -- src/domain/progress.test.ts src/domain/progress-storage.test.ts && npm run lint
```

Ожидается: PASS.

```bash
git add src/domain/progress.ts src/domain/progress.test.ts src/domain/progress-storage.ts src/domain/progress-storage.test.ts
git commit -m "feat: store learner progress on the device"
```

---

### Task 3: Правила прогресса

**Files:**
- Create: `src/domain/progress-rules.ts`, `src/domain/progress-rules.test.ts`

**Interfaces:**
- Produces:

```ts
export const REVIEW_WINDOW_DAYS = 14;
export const MASTERY_CORRECT_ROUNDS = 3;
export const MAX_REVIEW_TOPICS = 5;
export type RoundSummary = {
  readonly total: number;
  readonly correct: number;
  readonly accuracy: number;
  readonly durationMs: number;
  readonly regionIdsToReview: readonly string[];
};
export function summariseRound(attempts: readonly Attempt[]): RoundSummary;
export function bestAccuracy(attempts: readonly Attempt[]): number;
export function masteredRegionIds(attempts: readonly Attempt[], now: Date): readonly string[];
export function regionIdsToRepeat(attempts: readonly Attempt[], now: Date): readonly string[];
```

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/progress-rules.test.ts`:

```ts
import type { Attempt, Level } from './round';
import {
  bestAccuracy,
  masteredRegionIds,
  MAX_REVIEW_TOPICS,
  regionIdsToRepeat,
  summariseRound,
} from './progress-rules';

const NOW = new Date('2026-08-03T12:00:00.000Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    questionId: '1-sichuan',
    roundId: 'round-1',
    regionId: 'sichuan',
    exerciseType: 'find-on-map',
    level: 1 as Level,
    isCorrect: true,
    durationMs: 1000,
    answeredAt: daysAgo(0),
    ...overrides,
  };
}

it('считает точность раунда', () => {
  const summary = summariseRound([
    attempt({ regionId: 'sichuan', isCorrect: true, durationMs: 1000 }),
    attempt({ regionId: 'yunnan', isCorrect: false, durationMs: 3000 }),
  ]);

  expect(summary.total).toBe(2);
  expect(summary.correct).toBe(1);
  expect(summary.accuracy).toBe(0.5);
  expect(summary.durationMs).toBe(4000);
});

it('собирает темы для повторения из ошибок раунда', () => {
  const summary = summariseRound([
    attempt({ regionId: 'sichuan', isCorrect: false }),
    attempt({ regionId: 'yunnan', isCorrect: true }),
  ]);

  expect(summary.regionIdsToReview).toEqual(['sichuan']);
});

it('показывает не больше пяти тем для повторения', () => {
  const wrong = Array.from({ length: 8 }, (_, index) =>
    attempt({ regionId: `region-${index}`, isCorrect: false }),
  );

  expect(summariseRound(wrong).regionIdsToReview).toHaveLength(MAX_REVIEW_TOPICS);
});

it('без ответов даёт нулевую точность, а не деление на ноль', () => {
  expect(summariseRound([]).accuracy).toBe(0);
});

it('берёт лучшую точность среди прошлых раундов', () => {
  const attempts = [
    attempt({ roundId: 'round-1', isCorrect: true }),
    attempt({ roundId: 'round-1', isCorrect: false }),
    attempt({ roundId: 'round-2', isCorrect: true }),
    attempt({ roundId: 'round-2', isCorrect: true }),
  ];

  expect(bestAccuracy(attempts)).toBe(1);
});

it('без истории рекорд равен нулю', () => {
  expect(bestAccuracy([])).toBe(0);
});

it('возвращает в повторение регионы с ошибкой за последние 14 дней', () => {
  const attempts = [
    attempt({ regionId: 'sichuan', isCorrect: false, answeredAt: daysAgo(3) }),
    attempt({ regionId: 'yunnan', isCorrect: false, answeredAt: daysAgo(20) }),
    attempt({ regionId: 'hebei', isCorrect: true, answeredAt: daysAgo(1) }),
  ];

  expect(regionIdsToRepeat(attempts, NOW)).toEqual(['sichuan']);
});

it('не осваивает регион без ответа на уровне не ниже второго', () => {
  const attempts = [1, 2, 3].map((index) =>
    attempt({ roundId: `round-${index}`, isCorrect: true }),
  );

  expect(masteredRegionIds(attempts, NOW)).toEqual([]);
});

it('осваивает регион после трёх верных ответов в разных раундах', () => {
  const attempts = [
    attempt({ roundId: 'round-1', isCorrect: true }),
    attempt({ roundId: 'round-2', isCorrect: true, level: 2 as Level }),
    attempt({ roundId: 'round-3', isCorrect: true }),
  ];

  expect(masteredRegionIds(attempts, NOW)).toEqual(['sichuan']);
});

it('снимает освоенность после ошибки за последние 14 дней', () => {
  const attempts = [
    attempt({ roundId: 'round-1', isCorrect: true }),
    attempt({ roundId: 'round-2', isCorrect: true, level: 2 as Level }),
    attempt({ roundId: 'round-3', isCorrect: true }),
    attempt({ roundId: 'round-4', isCorrect: false, answeredAt: daysAgo(2) }),
  ];

  expect(masteredRegionIds(attempts, NOW)).toEqual([]);
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/domain/progress-rules.test.ts
```

Ожидается: FAIL — модуля нет.

- [ ] **Step 3: Реализовать**

Создать `src/domain/progress-rules.ts`:

```ts
import type { Attempt } from './round';

export const REVIEW_WINDOW_DAYS = 14;
export const MASTERY_CORRECT_ROUNDS = 3;
export const MASTERY_MIN_LEVEL = 2;
export const MAX_REVIEW_TOPICS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RoundSummary = {
  readonly total: number;
  readonly correct: number;
  readonly accuracy: number;
  readonly durationMs: number;
  readonly regionIdsToReview: readonly string[];
};

function isWithinReviewWindow(attempt: Attempt, now: Date): boolean {
  return now.getTime() - Date.parse(attempt.answeredAt) <= REVIEW_WINDOW_DAYS * DAY_MS;
}

function groupByRound(attempts: readonly Attempt[]): Map<string, Attempt[]> {
  const rounds = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const group = rounds.get(attempt.roundId) ?? [];
    group.push(attempt);
    rounds.set(attempt.roundId, group);
  }

  return rounds;
}

/** Итог одного раунда. Показывается ученику без оценочного давления. */
export function summariseRound(attempts: readonly Attempt[]): RoundSummary {
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;

  return {
    total: attempts.length,
    correct,
    accuracy: attempts.length === 0 ? 0 : correct / attempts.length,
    durationMs: attempts.reduce((sum, attempt) => sum + attempt.durationMs, 0),
    regionIdsToReview: attempts
      .filter((attempt) => !attempt.isCorrect)
      .map((attempt) => attempt.regionId)
      .slice(0, MAX_REVIEW_TOPICS),
  };
}

/** Персональный рекорд точности среди прошлых раундов. */
export function bestAccuracy(attempts: readonly Attempt[]): number {
  const accuracies = [...groupByRound(attempts).values()].map(
    (round) => round.filter((attempt) => attempt.isCorrect).length / round.length,
  );

  return accuracies.length === 0 ? 0 : Math.max(...accuracies);
}

/** Регионы с неверным ответом за последние 14 дней. */
export function regionIdsToRepeat(
  attempts: readonly Attempt[],
  now: Date,
): readonly string[] {
  const wrong = attempts.filter(
    (attempt) => !attempt.isCorrect && isWithinReviewWindow(attempt, now),
  );

  return [...new Set(wrong.map((attempt) => attempt.regionId))];
}

/**
 * Регион освоен после трёх верных ответов в разных завершённых раундах, из
 * которых хотя бы один — на уровне не ниже второго. Одна ошибка за последние
 * 14 дней снимает статус, но историю не стирает (PROGRESS_SYSTEM.md).
 *
 * Уровни 2–4 ещё не открыты, поэтому пока список остаётся пустым.
 */
export function masteredRegionIds(
  attempts: readonly Attempt[],
  now: Date,
): readonly string[] {
  const recentlyWrong = new Set(regionIdsToRepeat(attempts, now));
  const byRegion = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const group = byRegion.get(attempt.regionId) ?? [];
    group.push(attempt);
    byRegion.set(attempt.regionId, group);
  }

  const mastered: string[] = [];
  for (const [regionId, regionAttempts] of byRegion) {
    if (recentlyWrong.has(regionId)) {
      continue;
    }

    const correct = regionAttempts.filter((attempt) => attempt.isCorrect);
    const rounds = new Set(correct.map((attempt) => attempt.roundId));
    const hasHigherLevel = correct.some(
      (attempt) => attempt.level >= MASTERY_MIN_LEVEL,
    );

    if (rounds.size >= MASTERY_CORRECT_ROUNDS && hasHigherLevel) {
      mastered.push(regionId);
    }
  }

  return mastered;
}
```

- [ ] **Step 4: Проверить и зафиксировать**

```bash
npm test -- src/domain/progress-rules.test.ts && npm run lint
```

Ожидается: PASS.

```bash
git add src/domain/progress-rules.ts src/domain/progress-rules.test.ts
git commit -m "feat: add progress rules"
```

---

### Task 4: Экран итогов раунда

**Files:**
- Create: `src/features/results/RoundResultsPage.tsx`, `src/features/results/RoundResultsPage.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces:

```ts
export type RoundResultsPageProps = {
  readonly summary: RoundSummary;
  readonly regions: readonly Region[];
  readonly bestAccuracy: number;
  readonly isProgressSaved: boolean;
  readonly onRepeatMistakes: () => void;
  readonly onNewRound: () => void;
  readonly onExit: () => void;
};
```

- [ ] **Step 1: Написать падающие тесты**

Создать `src/features/results/RoundResultsPage.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import type { RoundSummary } from '../../domain/progress-rules';
import { RoundResultsPage } from './RoundResultsPage';

const SUMMARY: RoundSummary = {
  total: 34,
  correct: 30,
  accuracy: 30 / 34,
  durationMs: 245_000,
  regionIdsToReview: ['sichuan', 'yunnan'],
};

function renderResults(overrides: Partial<React.ComponentProps<typeof RoundResultsPage>> = {}) {
  render(
    <RoundResultsPage
      summary={SUMMARY}
      regions={regions}
      bestAccuracy={0.9}
      isProgressSaved
      onRepeatMistakes={() => {}}
      onNewRound={() => {}}
      onExit={() => {}}
      {...overrides}
    />,
  );
}

it('показывает точность и число верных ответов', () => {
  renderResults();

  expect(screen.getByText('88%')).toBeInTheDocument();
  expect(screen.getByText('30 из 34')).toBeInTheDocument();
});

it('показывает время без оценки', () => {
  renderResults();

  expect(screen.getByText('4 мин 5 с')).toBeInTheDocument();
});

it('называет темы для повторения', () => {
  renderResults();

  expect(screen.getByText('Сычуань')).toBeInTheDocument();
  expect(screen.getByText('Юньнань')).toBeInTheDocument();
});

it('показывает личный рекорд', () => {
  renderResults();

  expect(screen.getByText(/Личный рекорд: 90%/)).toBeInTheDocument();
});

it('предлагает повторить ошибки', () => {
  const repeat = vi.fn();
  renderResults({ onRepeatMistakes: repeat });

  fireEvent.click(screen.getByRole('button', { name: 'Повторить ошибки' }));

  expect(repeat).toHaveBeenCalledOnce();
});

it('не предлагает повторить ошибки, когда их нет', () => {
  renderResults({
    summary: { ...SUMMARY, correct: 34, accuracy: 1, regionIdsToReview: [] },
  });

  expect(screen.queryByRole('button', { name: 'Повторить ошибки' })).toBeNull();
  expect(screen.getByText('Ошибок нет.')).toBeInTheDocument();
});

it('предупреждает, когда прогресс не сохраняется', () => {
  renderResults({ isProgressSaved: false });

  expect(screen.getByRole('status')).toHaveTextContent(
    'Прогресс не сохранится: хранилище недоступно.',
  );
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/features/results/RoundResultsPage.test.tsx
```

Ожидается: FAIL — модуля нет.

- [ ] **Step 3: Реализовать**

Создать `src/features/results/RoundResultsPage.tsx`:

```tsx
import type { Region } from '../../content/types';
import type { RoundSummary } from '../../domain/progress-rules';

export type RoundResultsPageProps = {
  readonly summary: RoundSummary;
  readonly regions: readonly Region[];
  readonly bestAccuracy: number;
  readonly isProgressSaved: boolean;
  readonly onRepeatMistakes: () => void;
  readonly onNewRound: () => void;
  readonly onExit: () => void;
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Время подаётся как факт, без оценки скорости (UI_UX.md). */
function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes === 0 ? `${seconds} с` : `${minutes} мин ${seconds} с`;
}

export function RoundResultsPage({
  summary,
  regions,
  bestAccuracy,
  isProgressSaved,
  onRepeatMistakes,
  onNewRound,
  onExit,
}: RoundResultsPageProps) {
  const reviewRegions = summary.regionIdsToReview.flatMap(
    (regionId) => regions.find((region) => region.id === regionId) ?? [],
  );

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Итог раунда</p>
        <h1>{formatPercent(summary.accuracy)}</h1>
        <p>
          {summary.correct} из {summary.total}
        </p>
      </header>
      <section aria-labelledby="results-heading">
        <div className="section-heading">
          <h2 id="results-heading">Что получилось</h2>
          <p>Личный рекорд: {formatPercent(bestAccuracy)}</p>
        </div>
        <p>Время: {formatDuration(summary.durationMs)}</p>
        {isProgressSaved ? null : (
          <p className="status-note" role="status">
            Прогресс не сохранится: хранилище недоступно.
          </p>
        )}
        {reviewRegions.length === 0 ? (
          <p>Ошибок нет.</p>
        ) : (
          <>
            <h3>Стоит повторить</h3>
            <ul className="review-list">
              {reviewRegions.map((region) => (
                <li key={region.id}>
                  {region.nameRu}{' '}
                  <span lang="zh-Hans">{region.nameZh}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="results-actions">
          {reviewRegions.length === 0 ? null : (
            <button type="button" className="primary" onClick={onRepeatMistakes}>
              Повторить ошибки
            </button>
          )}
          <button type="button" className="secondary" onClick={onNewRound}>
            Новый раунд
          </button>
          <button type="button" className="secondary" onClick={onExit}>
            К теме
          </button>
        </div>
      </section>
    </main>
  );
}
```

Заметка: в тесте «называет темы для повторения» название региона ищется целиком, поэтому в разметке русское название и китайское разделены пробелом внутри `li`, но `getByText('Сычуань')` найдёт текстовый узел.

- [ ] **Step 4: Оформить**

Добавить в конец `src/styles.css`:

```css
.review-list {
  list-style: none;
  margin: 8px 0 16px;
  padding: 0;
}

.review-list li {
  border-bottom: 1px solid #d0d5dd;
  padding: 8px 0;
}

.results-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}
```

- [ ] **Step 5: Проверить и зафиксировать**

```bash
npm test -- src/features/results/RoundResultsPage.test.tsx && npm run lint
```

Ожидается: PASS.

```bash
git add src/features/results src/styles.css
git commit -m "feat: add the round results screen"
```

---

### Task 5: Связывание

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`, `CHANGELOG.md`

- [ ] **Step 1: Написать падающий тест**

Добавить в `src/App.test.tsx`:

```tsx
it('показывает итог после короткого раунда и возвращает к теме', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Начать раунд' }));

  for (let index = 0; index < 34; index += 1) {
    const asked = screen.getByTestId('exercise-target').textContent;
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(`^${asked} \\(`) }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: index === 33 ? 'Завершить раунд' : 'Далее',
      }),
    );
  }

  expect(screen.getByText('100%')).toBeInTheDocument();
  expect(screen.getByText('34 из 34')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'К теме' }));

  expect(
    screen.getByRole('heading', { name: 'Провинции и столицы Китая' }),
  ).toBeInTheDocument();
}, 30_000);
```

- [ ] **Step 2: Убедиться, что тест падает**

```bash
npm test -- src/App.test.tsx
```

Ожидается: FAIL — экрана итогов нет.

- [ ] **Step 3: Реализовать**

Заменить `src/App.tsx` целиком:

```tsx
import { useMemo, useState } from 'react';
import { regions } from './content/regions';
import { addAttempts } from './domain/progress';
import { bestAccuracy, summariseRound } from './domain/progress-rules';
import { createProgressStore } from './domain/progress-storage';
import type { Attempt } from './domain/round';
import { FindOnMapExercise } from './features/exercise/FindOnMapExercise';
import { RoundResultsPage } from './features/results/RoundResultsPage';
import { TopicSelectionPage } from './features/topic-selection/TopicSelectionPage';
import { ChinaMap } from './map/ChinaMap';
import type { MapZoom } from './map/MapControls';

type Screen = 'topic' | 'exercise' | 'results';

function readStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function newRoundId(): string {
  return `round-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export default function App() {
  const store = useMemo(() => createProgressStore(readStorage()), []);
  const [progress, setProgress] = useState(() => store.read());
  const [screen, setScreen] = useState<Screen>('topic');
  const [roundPool, setRoundPool] = useState(regions);
  const [roundId, setRoundId] = useState(newRoundId);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [lastAttempts, setLastAttempts] = useState<readonly Attempt[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<MapZoom>(1);

  function startRound(pool: readonly typeof regions[number][]) {
    setRoundPool(pool);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('exercise');
  }

  function finishRound(attempts: readonly Attempt[]) {
    const updated = addAttempts(progress, attempts);
    setProgress(updated);
    store.write(updated);
    setLastAttempts(attempts);
    setScreen('results');
  }

  if (screen === 'exercise') {
    return (
      <FindOnMapExercise
        regions={roundPool}
        roundId={roundId}
        seed={seed}
        onFinish={finishRound}
        onExit={() => setScreen('topic')}
      />
    );
  }

  if (screen === 'results') {
    const summary = summariseRound(lastAttempts);

    return (
      <RoundResultsPage
        summary={summary}
        regions={regions}
        bestAccuracy={bestAccuracy(progress.attempts)}
        isProgressSaved={store.isAvailable}
        onRepeatMistakes={() =>
          startRound(
            regions.filter((region) =>
              summary.regionIdsToReview.includes(region.id),
            ),
          )
        }
        onNewRound={() => startRound(regions)}
        onExit={() => setScreen('topic')}
      />
    );
  }

  return (
    <TopicSelectionPage regions={regions} onStartRound={() => startRound(regions)}>
      <ChinaMap
        regions={regions}
        selectedRegionId={selectedRegionId}
        onSelect={setSelectedRegionId}
        onClear={() => setSelectedRegionId(null)}
        zoom={zoom}
        onZoomChange={setZoom}
      />
    </TopicSelectionPage>
  );
}
```

- [ ] **Step 4: Проверить и зафиксировать**

```bash
npm test && npm run lint && npm run build
```

Ожидается: PASS.

Добавить в `CHANGELOG.md` в `### Added`:

    - Добавлены итоги раунда: точность, число верных, время, темы для повторения и личный рекорд.
    - Прогресс сохраняется на устройстве и переживает перезагрузку; при недоступном хранилище раунд работает с предупреждением.
    - Добавлено повторение ошибок раундом только из регионов с неверным ответом.

```bash
git add src/App.tsx src/App.test.tsx CHANGELOG.md
git commit -m "feat: show round results and repeat mistakes"
```

---

### Task 6: Контроль качества

- [ ] **Step 1: Прогнать проверки**

```bash
npm run validate:map
npm run validate:content
npm test
npm run lint
npm run build
git diff --check master...HEAD
```

- [ ] **Step 2: Проверить вручную**

Пройти раунд, ответив на часть вопросов неверно. Убедиться: итог показывает точность, «X из 34», время, до пяти тем и личный рекорд; «Повторить ошибки» запускает короткий раунд только из ошибочных регионов; «Новый раунд» начинает полный; после перезагрузки страницы личный рекорд сохраняется.

- [ ] **Step 3: Проверить объём ветки**

```bash
git status --short
git log --oneline master..HEAD
git diff --name-only master...HEAD
```

## Plan self-review

| Требование | Задача |
| --- | --- |
| Точность, верные из общего, время, до пяти тем, рекорд | 3, 4 |
| Без оценочного давления | 4 |
| Прогресс переживает перезагрузку | 2, 5 |
| Номер схемы и резервная копия при чужой версии | 2 |
| Недоступное хранилище не ломает упражнение | 2, 4, 5 |
| Не больше 500 попыток | 2 |
| Освоенность: три раунда, уровень ≥2, снятие после ошибки | 3 |
| Повторение ошибок за 14 дней | 3, 5 |

Экспорт и импорт прогресса не входят: они нужны режиму учителя и уйдут вместе с ним. Уровни 2–4 не входят, поэтому список освоенных регионов пока остаётся пустым — правило реализовано, но недостижимо до следующего инкремента.
