# Обобщение цели раунда — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить `regionId` в вопросе, попытке и прогрессе на цель `Target = { kind, id }`, перевести прогресс на схему 2 и не изменить при этом ни одного наблюдаемого поведения.

**Architecture:** Домен раунда перестаёт знать слово «регион»: `createRound` принимает список целей, `Attempt` несёт цель, правила прогресса группируют по цели и фильтруют по её виду. Карта, атлас, коллекции и списки ответов продолжают говорить `regionId` — перевод между целью и идентификатором региона происходит на границе, в экранах. Прогресс переезжает на `schemaVersion: 2` с явной миграцией, которая переводит и форму цели, и переименованные значения.

**Tech Stack:** TypeScript, React, Vite, Vitest.

**Область.** Это шаг 1 из четырёх в `docs/superpowers/specs/2026-08-05-cities-mode-design.md`. Каталога городов, слоя на карте и игр по городам здесь нет: они начинаются с шага 2, а он ждёт решения владельца продукта по списку городов (открытый вопрос 1 в спеке). После этого плана приложение работает ровно как до него — это и есть его критерий готовности.

## Global Constraints

- Интерфейс, задания и сообщения об ошибках — на русском; китайские названия в Unicode.
- **Наблюдаемое поведение не меняется.** В существующих тестах допустимы правки только формы данных (`regionId: 'sichuan'` → `target: { kind: 'region', id: 'sichuan' }`). Ожидаемые значения — числа, порядок, тексты — не правятся. Если ожидание пришлось изменить, значит сломано поведение: остановиться и разобраться.
- Домен не вызывает `Math.random`: генератор передаётся снаружи.
- Компоненты не обращаются к `localStorage` напрямую — только через `createProgressStore`.
- Испорченные или непонятые данные прогресса не удаляются, а переносятся в `BACKUP_KEY` (`DATA_MODEL.md`).
- Токены в `src/design/tokens.css` не трогаются: визуальных изменений в этом плане нет.
- Полная проверка — `npm run build` (три валидатора, затем `tsc -b`, затем сборка). Тесты — `npm test`. Линтер — `npm run lint`.
- Каждая задача заканчивается коммитом. Ветка — `feat/cities-mode`.

## Карта файлов

| Файл | Ответственность после изменения |
| --- | --- |
| `src/domain/round.ts` | тип `Target` и его помощники; вопрос и попытка несут цель |
| `src/domain/fill-round.ts` | «Заполни карту» производит попытки с целью-регионом |
| `src/domain/progress-rules.ts` | группировка и фильтрация по цели и её виду |
| `src/domain/progress.ts` | `masteredTargets`, версия схемы 2 |
| `src/domain/progress-migration.ts` | **новый**: перевод сохранённого прогресса v1 → v2 |
| `src/domain/progress-storage.ts` | вызывает миграцию при чтении, откладывает непонятое |
| `src/domain/representations.ts` | `labelOf` принимает структуру с именами, а не `Region` |
| `src/features/**`, `src/App.tsx` | переводят цель в `regionId` на границе с картой |

---

### Task 1: Тип `Target` и цель в вопросе, попытке и прогрессе

Задача велика намеренно: `Attempt` — общий тип домена и всех экранов, поэтому смена его формы не компилируется по частям. Разбивать её значило бы оставлять коммиты, которые не проходят `tsc`.

**Files:**
- Modify: `src/domain/round.ts`
- Modify: `src/domain/fill-round.ts`
- Modify: `src/domain/progress-rules.ts`
- Modify: `src/domain/progress.ts`
- Modify: `src/features/home/next-step.ts`
- Modify: `src/features/exercise/ExerciseRound.tsx`
- Modify: `src/features/exercise/FillMapRound.tsx`
- Modify: `src/features/results/RoundResultsPage.tsx`
- Modify: `src/features/results/FillMapResultsPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/domain/round.test.ts`, `src/domain/fill-round.test.ts`, `src/domain/progress-rules.test.ts`, `src/domain/progress.test.ts`, `src/domain/progress-storage.test.ts`, `src/features/home/next-step.test.ts`

**Interfaces:**
- Produces: `Target`, `TargetKind`, `regionTarget(id: string): Target`, `targetKey(target: Target): string`, `sameTarget(a: Target, b: Target): boolean` — все из `src/domain/round.ts`.
- Produces: `createRound(targets: readonly Target[], options: RoundOptions): Round`.
- Produces: `Question.target: Target`, `Attempt.target: Target`, `AnswerInput.answeredId: string`.
- Produces: `targetsToRepeat(attempts, now, kind): readonly Target[]`, `masteredTargets(attempts, now, kind): readonly Target[]`, `RoundSummary.targetsToReview: readonly Target[]` — все из `src/domain/progress-rules.ts`.
- Produces: `Progress.masteredTargets: readonly Target[]`, `PROGRESS_SCHEMA_VERSION = 2`.

- [ ] **Step 1: Написать падающий тест на цель в вопросе**

В конец `src/domain/round.test.ts`:

```ts
it('делает целью вопроса регион с явным видом', () => {
  const round = newRound();

  expect(round.questions[0].target.kind).toBe('region');
  expect(regions.map((region) => region.id)).toContain(round.questions[0].target.id);
});

it('различает цели по виду, а не только по идентификатору', () => {
  expect(sameTarget({ kind: 'region', id: 'beijing' }, { kind: 'city', id: 'beijing' })).toBe(
    false,
  );
  expect(targetKey({ kind: 'city', id: 'beijing' })).toBe('city:beijing');
});
```

Добавить `sameTarget` и `targetKey` в импорт из `./round` в шапке файла.

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/domain/round.test.ts`
Expected: FAIL — `sameTarget` и `targetKey` не экспортируются, `question.target` не существует.

- [ ] **Step 3: Ввести тип цели в `src/domain/round.ts`**

Сразу после `import`-ов:

```ts
/**
 * Вид цели. Регионы и города — разные наборы: «путает Ланьчжоу с Синином» не
 * должно смешиваться с «не знает Ганьсу», поэтому вид входит в саму цель, а не
 * выводится из идентификатора. `beijing` существует и как регион, и как город.
 */
export type TargetKind = 'region' | 'city';

export type Target = {
  readonly kind: TargetKind;
  readonly id: string;
};

export function regionTarget(id: string): Target {
  return { kind: 'region', id };
}

/** Ключ для группировки: `Map` не умеет сравнивать объекты по значению. */
export function targetKey(target: Target): string {
  return `${target.kind}:${target.id}`;
}

export function sameTarget(left: Target, right: Target): boolean {
  return left.kind === right.kind && left.id === right.id;
}
```

- [ ] **Step 4: Заменить `regionId` на цель в вопросе и попытке**

В `src/domain/round.ts` в типе `Question` заменить строку `readonly regionId: string;` на:

```ts
  readonly target: Target;
```

В типе `Attempt` — ту же замену. В типе `AnswerInput` заменить `readonly answeredRegionId: string;` на:

```ts
  /**
   * Что выбрал ученик. Строка, а не цель: в играх по городам ответом бывает
   * регион, а не тот же вид, что у вопроса, и правило сравнения тогда
   * переезжает в саму игру.
   */
  readonly answeredId: string;
```

- [ ] **Step 5: Перевести `createRound` на цели**

Заменить сигнатуру и тело построения вопросов:

```ts
/** Раунд по всем целям темы: каждая ровно один раз, порядок перемешан. */
export function createRound(
  targets: readonly Target[],
  options: RoundOptions,
): Round {
  if (targets.length === 0) {
    throw new Error('Раунд не создан: нет целей');
  }

  if (options.exerciseTypes.length === 0) {
    throw new Error('Раунд не создан: не заданы типы заданий');
  }

  const questions = shuffle(targets, options.random).map((target, index) => {
    const exerciseType = options.exerciseTypes[index % options.exerciseTypes.length];
    const available = representationsFor(options.level, exerciseType);
    const representation = available[Math.floor(options.random() * available.length)];

    return {
      id: `${index + 1}-${target.id}`,
      roundId: options.roundId,
      target,
      exerciseType,
      representation,
      level: options.level,
    };
  });

  return { questions, currentIndex: 0, status: 'ready', attempts: [] };
}
```

Убрать ставший ненужным `import type { Region } from '../content/types';`.

- [ ] **Step 6: Перевести `answerQuestion`**

В теле `answerQuestion` заменить построение попытки:

```ts
  const attempt: Attempt = {
    questionId: question.id,
    roundId: question.roundId,
    target: question.target,
    exerciseType: question.exerciseType,
    level: question.level,
    isCorrect: input.answeredId === question.target.id,
    durationMs: input.durationMs,
    answeredAt: input.answeredAt,
  };
```

- [ ] **Step 7: Починить тесты раунда**

В `src/domain/round.test.ts` заменить в `newRound`:

```ts
function newRound(seed = 1): Round {
  return createRound(
    regions.map((region) => regionTarget(region.id)),
    { ...OPTIONS, random: createSeededRandom(seed) },
  );
}
```

и в `answerCurrent`:

```ts
function answerCurrent(round: Round, correct: boolean): Round {
  const question = currentQuestion(round);
  const wrongId = regions.find((region) => region.id !== question.target.id)!.id;

  return answerQuestion(round, {
    answeredId: correct ? question.target.id : wrongId,
    durationMs: 1200,
    answeredAt: '2026-08-03T10:00:00.000Z',
  });
}
```

Остальные обращения `question.regionId` в файле заменить на `question.target.id`; ожидаемые числа и порядок не трогать. Добавить `regionTarget` в импорт.

- [ ] **Step 8: Запустить тесты раунда**

Run: `npx vitest run src/domain/round.test.ts`
Expected: PASS, включая два новых теста из шага 1.

- [ ] **Step 9: Перевести «Заполни карту»**

В `src/domain/fill-round.ts` в построении попытки (около строки 150) заменить `regionId: question.regionId,` на:

```ts
    target: regionTarget(question.regionId),
```

Добавить `regionTarget` в импорт из `./round`. Собственные типы модуля — `FillQuestion.regionId`, `FillSummary.regionIdsToReview`, `outcomes` — **не трогать**: заполнение карты по решению спека остаётся игрой только по регионам, и говорить в ней «цель» значило бы обещать то, чего нет.

- [ ] **Step 10: Запустить тесты заполнения карты**

Run: `npx vitest run src/domain/fill-round.test.ts`
Expected: PASS. Если тест строит `Attempt` вручную — заменить в нём `regionId: 'x'` на `target: { kind: 'region', id: 'x' }`.

- [ ] **Step 11: Написать падающий тест на раздельность видов в правилах**

В конец `src/domain/progress-rules.test.ts`:

```ts
it('не смешивает регионы и города в списке на повторение', () => {
  const now = new Date('2026-08-05T10:00:00.000Z');
  const attempts: Attempt[] = [
    { ...wrongAttempt, target: { kind: 'region', id: 'gansu' } },
    { ...wrongAttempt, target: { kind: 'city', id: 'lanzhou' } },
  ];

  expect(targetsToRepeat(attempts, now, 'region')).toEqual([
    { kind: 'region', id: 'gansu' },
  ]);
  expect(targetsToRepeat(attempts, now, 'city')).toEqual([
    { kind: 'city', id: 'lanzhou' },
  ]);
});
```

Если в файле нет готовой заготовки неверной попытки, объявить её рядом с остальными:

```ts
const wrongAttempt: Attempt = {
  questionId: '1-gansu',
  roundId: 'round-1',
  target: { kind: 'region', id: 'gansu' },
  exerciseType: 'find-on-map',
  level: 1,
  isCorrect: false,
  durationMs: 1000,
  answeredAt: '2026-08-05T09:00:00.000Z',
};
```

- [ ] **Step 12: Убедиться, что тест падает**

Run: `npx vitest run src/domain/progress-rules.test.ts`
Expected: FAIL — `targetsToRepeat` не экспортируется.

- [ ] **Step 13: Перевести правила прогресса на цели**

В `src/domain/progress-rules.ts` заменить импорт на `import type { Attempt, Level, Target, TargetKind } from './round';` и добавить `targetKey` к значимым импортам. Затем:

```ts
export type RoundSummary = {
  readonly total: number;
  readonly correct: number;
  readonly accuracy: number;
  readonly durationMs: number;
  readonly targetsToReview: readonly Target[];
};
```

В `summariseRound` заменить последнее поле:

```ts
    targetsToReview: attempts
      .filter((attempt) => !attempt.isCorrect)
      .map((attempt) => attempt.target)
      .slice(0, MAX_REVIEW_TOPICS),
```

Заменить `regionIdsToRepeat` целиком:

```ts
/** Цели заданного вида с неверным ответом за последние 14 дней. */
export function targetsToRepeat(
  attempts: readonly Attempt[],
  now: Date,
  kind: TargetKind,
): readonly Target[] {
  const wrong = attempts.filter(
    (attempt) =>
      attempt.target.kind === kind &&
      !attempt.isCorrect &&
      isWithinReviewWindow(attempt, now),
  );

  const seen = new Set<string>();
  const unique: Target[] = [];

  for (const attempt of wrong) {
    const key = targetKey(attempt.target);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(attempt.target);
    }
  }

  return unique;
}
```

Заменить `masteredRegionIds` целиком:

```ts
/**
 * Цель освоена после трёх верных ответов в разных завершённых раундах, из
 * которых хотя бы один — в игре, спрашивающей не русским названием. Одна
 * ошибка за последние 14 дней снимает статус, но историю не стирает
 * (PROGRESS_SYSTEM.md).
 */
export function masteredTargets(
  attempts: readonly Attempt[],
  now: Date,
  kind: TargetKind,
): readonly Target[] {
  const recentlyWrong = new Set(
    targetsToRepeat(attempts, now, kind).map((target) => targetKey(target)),
  );
  const mastered: Target[] = [];

  for (const [key, targetAttempts] of groupBy(
    attempts.filter((attempt) => attempt.target.kind === kind),
    (attempt) => targetKey(attempt.target),
  )) {
    if (recentlyWrong.has(key)) {
      continue;
    }

    const correct = targetAttempts.filter((attempt) => attempt.isCorrect);
    const rounds = new Set(correct.map((attempt) => attempt.roundId));
    const hasHigherLevel = correct.some(
      (attempt) => attempt.level >= MASTERY_MIN_LEVEL,
    );

    if (rounds.size >= MASTERY_CORRECT_ROUNDS && hasHigherLevel) {
      mastered.push(targetAttempts[0].target);
    }
  }

  return mastered;
}
```

- [ ] **Step 14: Починить остальные тесты правил**

В `src/domain/progress-rules.test.ts` заменить построение попыток на форму с `target`, а вызовы `regionIdsToRepeat(a, now)` и `masteredRegionIds(a, now)` — на `targetsToRepeat(a, now, 'region')` и `masteredTargets(a, now, 'region')`. Там, где тест сравнивал со списком строк, сравнивать со списком целей: `['gansu']` → `[{ kind: 'region', id: 'gansu' }]`. Числа, даты и пороги не менять.

- [ ] **Step 15: Запустить тесты правил**

Run: `npx vitest run src/domain/progress-rules.test.ts`
Expected: PASS.

- [ ] **Step 16: Перевести прогресс и поднять версию схемы**

В `src/domain/progress.ts`:

```ts
import type { Attempt, Target } from './round';

export const PROGRESS_SCHEMA_VERSION = 2;
```

```ts
/**
 * `unlockedLevel` здесь нет: открытых и закрытых уровней не существует, все
 * игры доступны сразу. Освоенное хранится целями, а не идентификаторами
 * регионов: `beijing` бывает и регионом, и городом, и по строке их не
 * различить.
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
```

- [ ] **Step 17: Перевести границу с картой в экранах**

Экраны продолжают говорить `regionId`: карта, списки ответов и атлас не меняются. Меняются только места, где приходит цель.

`src/features/home/next-step.ts` — строка 40 и импорт:

```ts
import { targetsToRepeat } from '../../domain/progress-rules';
```

```ts
  const toRepeat = targetsToRepeat(attempts, now, 'region').map((target) => target.id);
```

Тип `NextStep.regionIds` и всё остальное в файле не меняются.

`src/features/exercise/ExerciseRound.tsx`:

```ts
    createRound(
      regions.map((region) => regionTarget(region.id)),
      { /* существующие опции без изменений */ },
    ),
```

Все обращения `question.regionId` в файле заменить на `question.target.id`, а вызов ответа — на `answeredId: regionId`. Локальные имена переменных (`answeredRegionId`, `handleMapSelect`) не переименовывать: они про карту, а карта по-прежнему про регионы.

`src/features/exercise/FillMapRound.tsx` — `currentTarget(round).regionId` и остальное в файле не меняются: `FillQuestion` сохранил `regionId` (шаг 9).

`src/features/results/RoundResultsPage.tsx` — строка 37:

```ts
  const reviewRegions = summary.targetsToReview.flatMap(
    (target) => regions.find((region) => region.id === target.id) ?? [],
  );
```

`src/features/results/FillMapResultsPage.tsx` не меняется: он читает `FillSummary`, а не `RoundSummary`.

`src/App.tsx` — импорты и три места:

```ts
import { masteredTargets, targetsToRepeat, summariseRound } from './domain/progress-rules';
```

```ts
      masteredTargets: masteredTargets(withAttempts.attempts, new Date(), 'region'),
```

```ts
    setRepeatRegionIds(
      targetsToRepeat(updated.attempts, new Date(), 'region').map((target) => target.id),
    );
```

Карта освоенности принимает идентификаторы регионов и не меняется: везде, где `App.tsx` передаёт ей освоенное, добавить `.map((target) => target.id)`. Точные места укажет компилятор на шаге 18 — искать их вручную не нужно.

- [ ] **Step 18: Прогнать типы**

Run: `npx tsc -b`
Expected: без ошибок. Оставшиеся ошибки укажут на пропущенные места — исправлять по одному правилу: домен говорит целями, экраны переводят на границе.

- [ ] **Step 19: Привести тест хранилища в соответствие с поднятой версией**

Версия схемы стала 2, а миграции ещё нет: сохранённый прогресс версии 1 теперь попадает в ветку «непонятая версия» и откладывается в `BACKUP_KEY`. Это безопасно (данные целы), но существующий тест `progress-storage.test.ts`, который читает подставленный прогресс версии 1, начнёт падать.

Заменить в нём `schemaVersion: 1` на `schemaVersion: 2`, а попытки — на форму с `target`. Это правка формы данных, а не ожидания: тест по-прежнему проверяет, что корректный прогресс читается. Настоящий перевод версии 1 появится в задаче 2 и будет проверен отдельным тестом.

- [ ] **Step 20: Запустить весь набор тестов**

Run: `npm test`
Expected: PASS.

- [ ] **Step 21: Линтер и сборка**

Run: `npm run lint`
Expected: без ошибок.

Run: `npm run build`
Expected: три валидатора проходят, сборка успешна.

- [ ] **Step 22: Коммит**

```bash
git add src/domain src/features src/App.tsx
git commit -m "refactor: цель раунда вместо идентификатора региона"
```

---

### Task 2: Миграция прогресса v1 → v2

**Files:**
- Create: `src/domain/progress-migration.ts`
- Create: `src/domain/progress-migration.test.ts`
- Modify: `src/domain/progress-storage.ts`
- Test: `src/domain/progress-storage.test.ts`

**Interfaces:**
- Consumes: `Progress`, `PROGRESS_SCHEMA_VERSION` (задача 1), `Attempt`, `Target` (задача 1).
- Produces: `migrateProgress(parsed: unknown): Progress | null` — `null` означает «не понято», вызывающий откладывает данные в резерв.

- [ ] **Step 1: Написать падающий тест миграции**

Создать `src/domain/progress-migration.test.ts`:

```ts
import { migrateProgress } from './progress-migration';

const v1 = {
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
  unlockedLevel: 2,
};

it('переводит попытки и освоенное на цели-регионы', () => {
  const migrated = migrateProgress(v1);

  expect(migrated).toEqual({
    schemaVersion: 2,
    attempts: [
      {
        questionId: '1-sichuan',
        roundId: 'round-1',
        target: { kind: 'region', id: 'sichuan' },
        exerciseType: 'find-on-map',
        level: 1,
        isCorrect: true,
        durationMs: 1000,
        answeredAt: '2026-08-03T10:00:00.000Z',
      },
    ],
    masteredTargets: [{ kind: 'region', id: 'sichuan' }],
  });
});

it('пропускает прогресс второй версии без изменений', () => {
  const v2 = { schemaVersion: 2, attempts: [], masteredTargets: [] };

  expect(migrateProgress(v2)).toEqual(v2);
});

it('не понимает чужие и будущие данные', () => {
  expect(migrateProgress({ schemaVersion: 99 })).toBeNull();
  expect(migrateProgress('строка')).toBeNull();
  expect(migrateProgress({ schemaVersion: 1, attempts: 'не массив' })).toBeNull();
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/domain/progress-migration.test.ts`
Expected: FAIL — модуля не существует.

- [ ] **Step 3: Написать миграцию**

Создать `src/domain/progress-migration.ts`:

```ts
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

  return { ...rest, target: { kind: 'region', id: regionId } } as Attempt;
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

  if (parsed.schemaVersion === PROGRESS_SCHEMA_VERSION) {
    return parsed as unknown as Progress;
  }

  if (parsed.schemaVersion !== 1) {
    return null;
  }

  if (!Array.isArray(parsed.attempts)) {
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
```

- [ ] **Step 4: Запустить тест миграции**

Run: `npx vitest run src/domain/progress-migration.test.ts`
Expected: PASS.

- [ ] **Step 5: Написать падающий тест хранилища**

В `src/domain/progress-storage.test.ts` добавить:

```ts
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
});
```

- [ ] **Step 6: Убедиться, что тест падает**

Run: `npx vitest run src/domain/progress-storage.test.ts`
Expected: FAIL — прогресс версии 1 сейчас откладывается и заменяется пустым, `target` не появляется.

- [ ] **Step 7: Подключить миграцию к чтению**

В `src/domain/progress-storage.ts` добавить импорт `import { isCurrentVersion, migrateProgress } from './progress-migration';` и заменить тело `read`:

```ts
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
         * ученика восстановить будет неоткуда (DATA_MODEL.md). Прогресс,
         * который уже был текущей версии, ничего не переживает — резервная
         * копия каждого чтения затирала бы единственную полезную.
         */
        if (!isCurrentVersion(parsed)) {
          available.setItem(BACKUP_KEY, raw);
        }

        return { ...EMPTY_PROGRESS, ...migrated };
      } catch {
        return setAside(raw);
      }
    },
```

- [ ] **Step 8: Запустить тесты хранилища**

Run: `npx vitest run src/domain/progress-storage.test.ts`
Expected: PASS. Тест из задачи 1, ожидавший откладывания версии 1, теперь противоречит новому — заменить его на проверку, что откладывается **неизвестная** версия (например `schemaVersion: 99`), а не первая.

- [ ] **Step 9: Полная проверка**

Run: `npm test`
Expected: PASS.

Run: `npm run lint && npm run build`
Expected: без ошибок.

- [ ] **Step 10: Коммит**

```bash
git add src/domain/progress-migration.ts src/domain/progress-migration.test.ts src/domain/progress-storage.ts src/domain/progress-storage.test.ts
git commit -m "feat: миграция прогресса на схему 2"
```

---

### Task 3: Типы упражнений называют форму вопроса

`name-region` и `match-capital` названы по региону и по столице — то есть по цели. Форма вопроса от цели не зависит: «назвать по подсвеченному месту» и «связать с другим каталогом» одинаковы для региона и города.

**Files:**
- Modify: `src/domain/round.ts`
- Modify: `src/domain/representations.ts`
- Modify: `src/domain/progress-migration.ts`
- Modify: `src/features/exercise/exercise-modes.ts`
- Modify: `src/App.tsx`, `src/features/exercise/ExerciseRound.tsx`
- Test: `src/domain/progress-migration.test.ts` и все тесты, где встречаются старые значения

**Interfaces:**
- Produces: `ExerciseType = 'find-on-map' | 'name-target' | 'match-pair'`.
- Consumes: `migrateProgress` (задача 2) — расширяется переводом значений.

- [ ] **Step 1: Написать падающий тест перевода значений**

В `src/domain/progress-migration.test.ts` добавить:

```ts
it('переименовывает типы упражнений первой версии', () => {
  const migrated = migrateProgress({
    schemaVersion: 1,
    attempts: [
      { ...v1.attempts[0], exerciseType: 'name-region' },
      { ...v1.attempts[0], exerciseType: 'match-capital' },
      { ...v1.attempts[0], exerciseType: 'find-on-map' },
    ],
    masteredRegionIds: [],
  });

  expect(migrated?.attempts.map((attempt) => attempt.exerciseType)).toEqual([
    'name-target',
    'match-pair',
    'find-on-map',
  ]);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/domain/progress-migration.test.ts`
Expected: FAIL — старые значения проходят насквозь.

- [ ] **Step 3: Переименовать тип**

В `src/domain/round.ts`:

```ts
/**
 * Форма вопроса, а не его цель: найти по имени, назвать по месту, связать с
 * другим каталогом. Одинакова для регионов и городов.
 */
export type ExerciseType = 'find-on-map' | 'name-target' | 'match-pair';
```

- [ ] **Step 4: Обновить перевод в миграции**

В `src/domain/progress-migration.ts` рядом с `migrateAttempt` добавить:

```ts
/** Значения первой версии называли цель, а не форму вопроса. */
const RENAMED_EXERCISE_TYPES: Readonly<Record<string, string>> = {
  'name-region': 'name-target',
  'match-capital': 'match-pair',
};
```

и в `migrateAttempt` перед `return`:

```ts
  const exerciseType =
    typeof value.exerciseType === 'string'
      ? (RENAMED_EXERCISE_TYPES[value.exerciseType] ?? value.exerciseType)
      : value.exerciseType;

  return {
    ...rest,
    exerciseType,
    target: { kind: 'region', id: regionId },
  } as Attempt;
```

- [ ] **Step 5: Обновить остальные места**

`src/domain/representations.ts` — в `representationsFor` заменить сравнение:

```ts
  return exerciseType === 'match-pair'
```

`src/features/exercise/exercise-modes.ts` — ключи `EXERCISE_MODES`, поля `exerciseType`, элементы `ALL_EXERCISE_TYPES` и `id` карточек в `MODE_CARDS`. **Видимые тексты не меняются**: карточка остаётся «Назвать регион» и «Регион — столица», потому что игра по-прежнему про регионы. Меняется только идентификатор.

Прогнать поиск по остаткам: `grep -rn "name-region\|match-capital" src` — не должно остаться ничего, кроме таблицы переименований в миграции.

- [ ] **Step 6: Прогнать типы и тесты**

Run: `npx tsc -b`
Expected: без ошибок; оставшиеся укажут на пропущенные строковые литералы в тестах — заменить их там же.

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Линтер и сборка**

Run: `npm run lint && npm run build`
Expected: без ошибок.

- [ ] **Step 8: Коммит**

```bash
git add src
git commit -m "refactor: типы упражнений называют форму вопроса"
```

---

### Task 4: `labelOf` перестаёт зависеть от `Region`

`labelOf` берёт из региона четыре строки и больше ничего. Пока он объявлен через `Region`, домен импортирует каталог контента — а городу такой же ярлык понадобится в шаге 4 спека.

**Files:**
- Modify: `src/domain/representations.ts`
- Test: `src/domain/representations.test.ts`

**Interfaces:**
- Produces: `Nameable = { nameRu, nameZh, pinyin, capitalRu? }`; `labelOf(named: Nameable, representation: Representation): string`.

- [ ] **Step 1: Написать падающий тест**

В `src/domain/representations.test.ts` добавить:

```ts
it('делает ярлык из любой структуры с именами, не только из региона', () => {
  const city = { nameRu: 'Ланьчжоу', nameZh: '兰州', pinyin: 'Lánzhōu' };

  expect(labelOf(city, 'name-ru')).toBe('Ланьчжоу');
  expect(labelOf(city, 'name-zh')).toBe('兰州');
  expect(labelOf(city, 'pinyin')).toBe('Lánzhōu');
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/domain/representations.test.ts`
Expected: FAIL — типу `Region` не хватает полей у объекта города.

- [ ] **Step 3: Ослабить требование к аргументу**

В `src/domain/representations.ts` убрать `import type { Region } from '../content/types';` и добавить:

```ts
/**
 * Всё, что нужно ярлыку: три имени и, у региона, столица. Домен не знает
 * каталога контента — иначе город пришлось бы объявлять регионом.
 */
export type Nameable = {
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  readonly capitalRu?: string;
};

export function labelOf(named: Nameable, representation: Representation): string {
  switch (representation) {
    case 'name-ru':
      return named.nameRu;
    case 'name-zh':
      return named.nameZh;
    case 'pinyin':
      return named.pinyin;
    case 'capital':
      /*
       * Столица есть только у региона. Представление `capital` выдаётся лишь
       * играм по регионам, поэтому пустая строка сюда не доходит; она стоит
       * здесь как честное значение, а не как заглушка поведения.
       */
      return named.capitalRu ?? '';
  }
}
```

- [ ] **Step 4: Запустить тесты представлений**

Run: `npx vitest run src/domain/representations.test.ts`
Expected: PASS. Вызовы `labelOf(region, ...)` продолжают работать: `Region` подходит структурно.

- [ ] **Step 5: Полная проверка и коммит**

Run: `npm test && npm run lint && npm run build`
Expected: без ошибок.

```bash
git add src/domain/representations.ts src/domain/representations.test.ts
git commit -m "refactor: ярлык не требует региона"
```

---

### Task 5: Документация

**Files:**
- Modify: `DATA_MODEL.md`
- Modify: `DECISIONS.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Обновить модель данных**

В `DATA_MODEL.md` заменить блок `Attempt` и `Progress`:

```ts
type Target = {
  kind: 'region' | 'city';
  id: string;              // sichuan | chengdu
};

type Attempt = {
  questionId: string;
  roundId: string;
  target: Target;
  exerciseType: 'find-on-map' | 'name-target' | 'match-pair';
  level: 1 | 2 | 3 | 4;
  isCorrect: boolean;
  durationMs: number;
  answeredAt: string;      // ISO 8601
};

type Progress = {
  schemaVersion: 2;
  attempts: Attempt[];     // последние 500
  masteredTargets: Target[];
};
```

Ниже добавить абзац: вид цели входит в саму цель, потому что `beijing` существует и как регион, и как город, и по одной строке их не различить.

- [ ] **Step 2: Записать решение**

В `DECISIONS.md` добавить строку таблицы вверх списка, в формате `| дата | решение | обоснование |`:

```
| 2026-08-05 | Цель раунда обобщена до `Target`, прогресс переехал на схему 2 | Города и физическая география — такие же наборы целей, как регионы; писать под каждый свой движок раунда, свои правила освоенности и своё повторение ошибок значило бы платить трижды. `regionId` заменён на `{ kind, id }` в вопросе, попытке и прогрессе, освоенность и список на повторение фильтруются по виду цели. Вид входит в саму цель, потому что `beijing` существует и как регион, и как город. Заодно переименованы типы упражнений: `name-region` → `name-target`, `match-capital` → `match-pair` — форма вопроса не зависит от того, что спрашивают, и хранимые значения всё равно шли одной миграцией. Карта, атлас, коллекции и списки ответов по-прежнему говорят `regionId`: перевод происходит на границе, в экранах. Наблюдаемое поведение не изменилось. |
```

- [ ] **Step 3: Обновить журнал изменений**

В `CHANGELOG.md` в раздел неизданного добавить под `### Changed`:

> - Цель раунда обобщена: вопрос, попытка и прогресс хранят `{ kind, id }` вместо идентификатора региона. Прогресс переехал на схему 2 с миграцией; сохранённый прогресс первой версии переводится, а его исходник остаётся в резервном ключе.
> - Типы упражнений переименованы в `name-target` и `match-pair`: они называют форму вопроса, а не его цель. Видимые названия игр не изменились.

- [ ] **Step 4: Коммит**

```bash
git add DATA_MODEL.md DECISIONS.md CHANGELOG.md
git commit -m "docs: обобщённая цель в модели данных и решениях"
```

---

## Что этот план сознательно не делает

- **Не переименовывает тип `Level`.** Спек называл это попутной возможностью, но имя ещё не выбрано: `Level` — не ступень лестницы, а набор представлений, которыми спрашивает игра, и «уровень» здесь вводит в заблуждение. Выбор имени — решение владельца продукта, а до него переименование свелось бы к перекладыванию того же слова. Отдельным изменением оно обойдётся без своей миграции, если сделать его до того, как схема 2 попадёт к ученикам.
- **Не добавляет ни одного города.** Каталог, генератор точек, слой на карте и три игры — шаги 2–4 спека.
- **Не трогает `Заполни карту` глубже одной строки.** Игра остаётся по регионам, её собственные типы говорят `regionId` намеренно.

## Готовность

`npm run build` и `npm test` проходят. Приложение ведёт себя ровно как до изменения: те же вопросы, тот же порядок при том же сиде, тот же счёт, та же освоенность. Прогресс, записанный предыдущей версией, читается и не теряется. В домене больше нет слова «регион» там, где речь о цели, и добавление городов не требует ни второй миграции, ни второго свода правил.
