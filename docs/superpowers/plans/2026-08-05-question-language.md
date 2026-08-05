# Язык вопроса и ритм раунда — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать уровни из приложения полностью и дать ученику выбирать, каким названием его спрашивают — русским или иероглифами; верный ответ перестаёт требовать нажатия «Далее».

**Architecture:** Понятие «уровень» и понятие «представление» сливаются в одно — `QuestionLanguage = 'ru' | 'zh'`, которое выбирает ученик и которое записывается в попытку. Экран раунда получает таймер вместо кнопки на верном ответе. Прогресс переезжает на схему 3 цепочкой миграций, где старые попытки получают `ru` без попытки угадать прежний уровень.

**Tech Stack:** TypeScript, React, Vite, Vitest, Testing Library.

**Основание:** `docs/superpowers/specs/2026-08-05-question-language-design.md`.

## Global Constraints

- Интерфейс, задания и сообщения об ошибках — на русском; китайские названия в Unicode.
- **В приложении не остаётся уровней.** После работы слово `level` встречается в `src` ровно один раз — `zoomLevels` в `src/map/MapControls.tsx`, и это про увеличение карты. Любое другое вхождение — незакрытая задача.
- Домен не вызывает `Math.random`: генератор передаётся снаружи.
- Компоненты не обращаются к `localStorage` напрямую — только через `createProgressStore`.
- Испорченные и непонятые данные прогресса не удаляются, а переносятся в `BACKUP_KEY` (`DATA_MODEL.md`).
- Значения времени и цвета не пишутся числами посреди обработчиков: длительность паузы — именованная константа рядом с экраном раунда, цвета — только токены `src/design/tokens.css`.
- Полная проверка — `npm run build` (три валидатора, затем `tsc -b`, затем сборка). Тесты — `npm test`. Линтер — `npm run lint`.
- Каждая задача заканчивается коммитом. Ветка — `feat/cities-mode` (продолжение вчерашней работы, ещё не слитой).

## Карта файлов

| Файл | Ответственность после изменения |
| --- | --- |
| `src/domain/question-language.ts` | **новый, вместо `representations.ts`**: тип языка вопроса, `labelOf`, `langOf` |
| `src/domain/round.ts` | вопрос и попытка несут `language`; `Level` удалён |
| `src/domain/fill-round.ts` | «Заполни карту» тоже спрашивает на выбранном языке |
| `src/domain/progress-rules.ts` | освоенность требует верного ответа на иероглифах |
| `src/domain/progress-migration.ts` | цепочка v1 → v2 → v3 |
| `src/features/exercise/ExerciseRound.tsx` | верный ответ переводит вопрос сам, разбор только на ошибке |
| `src/features/exercise/AnswerFeedback.tsx` | только разбор ошибки; ветки «Верно» больше нет |
| `src/features/home/HomePage.tsx` | переключатель языка на карточке игры |
| `src/features/home/next-step.ts` | умолчание языка выводится из истории |

---

### Task 1: Язык вопроса вместо уровня и представления

Задача велика вынужденно: `Attempt` и `Question` — общие типы домена и всех экранов, их форма не компилируется по частям.

**Files:**
- Create: `src/domain/question-language.ts`
- Create: `src/domain/question-language.test.ts`
- Delete: `src/domain/representations.ts`, `src/domain/representations.test.ts`
- Modify: `src/domain/round.ts`, `src/domain/fill-round.ts`, `src/domain/progress-rules.ts`, `src/domain/progress.ts`
- Modify: `src/features/exercise/exercise-modes.ts`, `src/features/exercise/ExerciseRound.tsx`, `src/features/exercise/FillMapRound.tsx`
- Modify: `src/features/home/HomePage.tsx`, `src/features/home/next-step.ts`, `src/App.tsx`
- Test: `src/domain/round.test.ts`, `src/domain/fill-round.test.ts`, `src/domain/progress-rules.test.ts`, `src/features/home/next-step.test.ts`, `src/features/exercise/ExerciseRound.test.tsx`, `src/features/exercise/RoundProgressTrail.test.tsx`, `src/domain/progress-storage.test.ts`, `src/domain/progress.test.ts`

**Interfaces:**
- Produces: `QuestionLanguage = 'ru' | 'zh'`, `Nameable`, `labelOf(named: Nameable, language: QuestionLanguage): string`, `langOf(language: QuestionLanguage): string | undefined` — все из `src/domain/question-language.ts`.
- Produces: `Question.language: QuestionLanguage`, `Attempt.language: QuestionLanguage`, `RoundOptions.language: QuestionLanguage`.
- Produces: `PROGRESS_SCHEMA_VERSION = 3`.
- Удаляет: `Level`, `Representation`, `REPRESENTATIONS_BY_LEVEL`, `representationsFor`, `MASTERY_MIN_LEVEL`, `ModeCard.level`, `EXERCISE_MODES.level`, `NextStep.level`, тип раунда `mixed`.

**Промежуточное состояние.** В этой задаче все игры спрашивают по-русски: переключателя ещё нет, `App` держит одно значение `'ru'`. Выбор возвращается в задаче 4. Это единственный шаг плана, который меняет наблюдаемое поведение до того, как заменит его новым, — и меняет в понятную сторону, а не в случайную.

- [ ] **Step 1: Написать тест нового модуля**

Создать `src/domain/question-language.test.ts`:

```ts
import { labelOf, langOf } from './question-language';

const gansu = { nameRu: 'Ганьсу', nameZh: '甘肃省' };

it('берёт русское название или иероглифы по языку вопроса', () => {
  expect(labelOf(gansu, 'ru')).toBe('Ганьсу');
  expect(labelOf(gansu, 'zh')).toBe('甘肃省');
});

it('помечает языком только иероглифы', () => {
  expect(langOf('zh')).toBe('zh-Hans');
  expect(langOf('ru')).toBeUndefined();
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/domain/question-language.test.ts`
Expected: FAIL — модуля не существует.

- [ ] **Step 3: Написать модуль языка вопроса**

Создать `src/domain/question-language.ts`:

```ts
/**
 * Каким названием игра спрашивает. Выбирает ученик перед стартом.
 *
 * Раньше это решало число `level`, и ученик не мог ни увидеть его, ни
 * изменить. Уровней в продукте нет; пиньинь и столица перестали быть тем,
 * чем спрашивают, — пиньинь остался в разборе и атласе, а столица это
 * отдельная игра, а не язык.
 */
export type QuestionLanguage = 'ru' | 'zh';

/** Всё, что нужно ярлыку. Домен не знает каталога контента. */
export type Nameable = {
  readonly nameRu: string;
  readonly nameZh: string;
};

export function labelOf(named: Nameable, language: QuestionLanguage): string {
  return language === 'zh' ? named.nameZh : named.nameRu;
}

/**
 * Язык разметки. Без него `<h1>` с иероглифами не получает китайский шрифт:
 * правило в `styles.css` цепляется за `lang`, а `labelOf` отдаёт голую строку.
 */
export function langOf(language: QuestionLanguage): string | undefined {
  return language === 'zh' ? 'zh-Hans' : undefined;
}
```

- [ ] **Step 4: Запустить тест модуля**

Run: `npx vitest run src/domain/question-language.test.ts`
Expected: PASS.

- [ ] **Step 5: Удалить старый модуль представлений**

```bash
git rm src/domain/representations.ts src/domain/representations.test.ts
```

- [ ] **Step 6: Перевести `round.ts`**

В `src/domain/round.ts` заменить импорт представлений:

```ts
import { shuffle } from './random';
import type { QuestionLanguage } from './question-language';
```

Удалить строку `export type Level = 1 | 2 | 3 | 4;` целиком.

В `Question` заменить `readonly representation: Representation;` и `readonly level: Level;` на одно поле:

```ts
  readonly language: QuestionLanguage;
```

В `Attempt` заменить `readonly level: Level;` на:

```ts
  readonly language: QuestionLanguage;
```

В `RoundOptions` заменить `readonly level: Level;` на:

```ts
  readonly language: QuestionLanguage;
```

- [ ] **Step 7: Упростить `createRound`**

Выбор представления исчезает — язык один на весь раунд:

```ts
  const questions = shuffle(targets, options.random).map((target, index) => ({
    id: `${index + 1}-${target.id}`,
    roundId: options.roundId,
    target,
    exerciseType: options.exerciseTypes[index % options.exerciseTypes.length],
    language: options.language,
  }));
```

В `answerQuestion` заменить `level: question.level,` на:

```ts
    language: question.language,
```

- [ ] **Step 8: Перевести «Заполни карту»**

В `src/domain/fill-round.ts` убрать импорт представлений и заменить его на язык:

```ts
import type { QuestionLanguage } from './question-language';
import { regionTarget, type Attempt } from './round';
```

В `FillQuestion` заменить поля `representation` и `level` на:

```ts
  readonly language: QuestionLanguage;
```

В `FillRoundOptions` заменить `readonly level: Level;` на `readonly language: QuestionLanguage;`.

В `createFillRound` убрать строку с `representationsFor` и вычисление представления; в построении вопроса вместо `representation` и `level` поставить:

```ts
      language: options.language,
```

В построении попытки в `answerFillRound` заменить `level: question.level,` на:

```ts
    language: question.language,
```

- [ ] **Step 9: Переформулировать освоенность**

В `src/domain/progress-rules.ts` удалить строку `export const MASTERY_MIN_LEVEL = 2;`.

Заменить комментарий и условие в `masteredTargets`:

```ts
/**
 * Цель освоена после трёх верных ответов в разных завершённых раундах, из
 * которых хотя бы один — на вопрос иероглифами: узнать регион по русской
 * подписи и назвать его по иероглифам разное знание (PROGRESS_SYSTEM.md).
 * Одна ошибка за последние 14 дней снимает статус, но историю не стирает.
 */
```

```ts
    const correct = targetAttempts.filter((attempt) => attempt.isCorrect);
    const rounds = new Set(correct.map((attempt) => attempt.roundId));
    const answeredInChinese = correct.some((attempt) => attempt.language === 'zh');

    if (rounds.size >= MASTERY_CORRECT_ROUNDS && answeredInChinese) {
```

- [ ] **Step 10: Поднять версию схемы**

В `src/domain/progress.ts`:

```ts
export const PROGRESS_SCHEMA_VERSION = 3;
```

- [ ] **Step 11: Убрать уровень из карточек игр**

В `src/features/exercise/exercise-modes.ts` заменить импорт на `import type { ExerciseType } from '../../domain/round';`.

Заменить шапку `ExerciseMode` и убрать поле `level` из всех трёх записей `EXERCISE_MODES`:

```ts
/**
 * Описание игры для экрана раунда. Числа сложности здесь нет: чем спрашивать,
 * выбирает ученик, а не игра.
 */
export type ExerciseMode = {
  readonly exerciseType: ExerciseType;
  readonly title: string;
  readonly eyebrow: string;
};
```

В `ModeCard` заменить объединение на вариант без уровня:

```ts
} & (
  | { readonly kind: 'exercise'; readonly exerciseType: ExerciseType }
  | { readonly kind: 'fill' }
  /** Режим объявлен, но ещё не написан: карточка не запускается. */
  | { readonly kind: 'planned' }
);
```

Из четырёх рабочих записей `MODE_CARDS` удалить строки `level: 1,`, `level: 2,`, `level: 3,`.

- [ ] **Step 12: Перевести экран раунда**

В `src/features/exercise/ExerciseRound.tsx`:

```ts
import { labelOf, langOf, type QuestionLanguage } from '../../domain/question-language';
```

В `ExerciseRoundProps` заменить `readonly level: Level;` на `readonly language: QuestionLanguage;` и убрать `Level` из импорта `round`.

В `createRound` передать язык вместо уровня:

```ts
        exerciseTypes,
        language,
        random: createSeededRandom(seed),
```

Заменить три обращения к представлению: `langOf(question.representation)` → `langOf(question.language)`, оба `labelOf(..., question.representation)` → `labelOf(..., question.language)`.

- [ ] **Step 13: Перевести остальные экраны**

`src/features/exercise/FillMapRound.tsx` — заменить проп `level` на `language` и передать его в `createFillRound`; обращения к `question.representation` заменить на `question.language`.

`src/features/home/next-step.ts` — в `NextStep` заменить `readonly level: Level;` на `readonly language: QuestionLanguage;`, а три возврата — на `language: 'ru',`. Умолчание из истории появится в задаче 4.

`src/features/home/HomePage.tsx` — в типе `onStartRound` заменить второй параметр на `language: QuestionLanguage`, у `onStartFillRound` — тоже; в обработчиках карточек передавать `'ru'` вместо `card.level`; в главном шаге передавать `step.language`.

`src/App.tsx` — заменить состояние:

```ts
  const [language, setLanguage] = useState<QuestionLanguage>('ru');
```

Заменить параметры `startRound(request, nextLanguage: QuestionLanguage, regionIds)` и `startFillRound(nextLanguage: QuestionLanguage)`, а `setLevel(nextLevel)` — на `setLanguage(nextLanguage)`. Передать `language={language}` в оба экрана раунда. Удалить строку `const findOnMapLevel = EXERCISE_MODES['find-on-map'].level;` и подставить `'ru'` в оба вызова `startRound('find-on-map', ...)`.

Тип `RoundRequest = ExerciseType | 'mixed'` заменить на `type RoundRequest = ExerciseType;` и убрать ветку `request === 'mixed' ? ALL_EXERCISE_TYPES : [request]` — остаётся `[request]`. Оба места, где итоги вычисляют `exerciseTypes.length > 1 ? 'mixed' : exerciseTypes[0]`, заменить на `exerciseTypes[0]`.

- [ ] **Step 14: Прогнать типы**

Run: `npx tsc -b`
Expected: без ошибок в `src`, кроме тестов. Оставшиеся ошибки в исходниках означают пропущенное место — исправить по правилу: `level` и `representation` становятся `language`.

- [ ] **Step 15: Починить тесты**

Во всех тестах, где строится `Attempt` или `Question`, заменить `level: 1` (и любое другое число) на `language: 'ru'`, а `level: 2` там, где тест проверяет освоенность, — на `language: 'zh'`. В `createRound`/`createFillRound` заменить опцию `level: N` на `language: 'ru'`.

Тесты, которые проверяли выбор представления по уровню, удалить целиком — проверяемого правила больше нет: в `src/domain/round.test.ts` это «даёт каждому вопросу представление из своего уровня» и «не показывает столицу в вопросе „регион — столица“». Тест «чередует типы заданий в смешанном раунде» остаётся: чередование типов от уровня не зависело.

Два теста в `src/features/exercise/ExerciseRound.test.tsx` названы по уровням и проверяют ровно то, что теперь называется языком. Их не удалять, а переименовать и перевести:

```ts
it('на русском спрашивает русским названием', () => {
  renderRound(['find-on-map'], 'ru');

  expect(regions.map((region) => region.nameRu)).toContain(asked());
});

it('на китайском спрашивает иероглифами', () => {
  renderRound(['find-on-map'], 'zh');

  expect(regions.map((region) => region.nameZh)).toContain(asked());
});
```

Второй параметр помощника `renderRound` при этом меняет тип: `level: Level = 1` становится `language: QuestionLanguage = 'ru'`. Помощник `askedRegion()` ищет регион по четырём полям — оставить в списке только `nameRu` и `nameZh`: пиньинем и столицей вопрос больше не задаётся.

Добавить в `src/domain/round.test.ts` тест, что язык един на весь раунд:

```ts
it('задаёт весь раунд на одном языке', () => {
  const round = createRound(targets, {
    ...OPTIONS,
    language: 'zh',
    random: createSeededRandom(1),
  });

  expect(round.questions.every((question) => question.language === 'zh')).toBe(true);
});
```

Добавить в `src/domain/progress-rules.test.ts` тест правила освоенности:

```ts
it('не считает цель освоенной без верного ответа на иероглифах', () => {
  const attempts = [1, 2, 3].map((round) =>
    attempt({ roundId: `r${round}`, isCorrect: true, language: 'ru' }),
  );

  expect(masteredTargets(attempts, NOW, 'region')).toEqual([]);

  const withChinese = [...attempts, attempt({ roundId: 'r4', isCorrect: true, language: 'zh' })];

  expect(masteredTargets(withChinese, NOW, 'region')).toEqual([regionTarget('sichuan')]);
});
```

- [ ] **Step 16: Прогнать весь набор**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 17: Проверить, что уровней не осталось**

Run: `grep -rn "Level\|level" src --include="*.ts" --include="*.tsx" | grep -v zoomLevels`
Expected: пусто. Любая строка в выводе — незакрытое место.

- [ ] **Step 18: Линтер и сборка**

Run: `npm run lint && npm run build`
Expected: без ошибок.

- [ ] **Step 19: Коммит**

```bash
git add src
git commit -m "refactor: язык вопроса вместо уровня и представления"
```

---

### Task 2: Миграция прогресса на схему 3

**Files:**
- Modify: `src/domain/progress-migration.ts`
- Test: `src/domain/progress-migration.test.ts`, `src/domain/progress-storage.test.ts`

**Interfaces:**
- Consumes: `PROGRESS_SCHEMA_VERSION = 3` (задача 1), `migrateProgress(parsed: unknown): Progress | null`, `isCurrentVersion(parsed: unknown): boolean`.
- Produces: та же пара функций, но перевод идёт цепочкой v1 → v2 → v3.

- [ ] **Step 1: Написать падающие тесты**

В `src/domain/progress-migration.test.ts` заменить ожидания существующих тестов на третью версию (в первом тесте `schemaVersion: 2` → `3`, в каждой попытке `level: 1` → `language: 'ru'`; во втором тесте объект `v2` заменить на `{ schemaVersion: 3, attempts: [], masteredTargets: [] }`) и добавить:

```ts
it('переводит попытки второй версии на язык вопроса', () => {
  const migrated = migrateProgress({
    schemaVersion: 2,
    attempts: [
      {
        questionId: '1-sichuan',
        roundId: 'round-1',
        target: { kind: 'region', id: 'sichuan' },
        exerciseType: 'name-target',
        level: 3,
        isCorrect: true,
        durationMs: 1000,
        answeredAt: '2026-08-03T10:00:00.000Z',
      },
    ],
    masteredTargets: [{ kind: 'region', id: 'sichuan' }],
  });

  expect(migrated).toEqual({
    schemaVersion: 3,
    attempts: [
      {
        questionId: '1-sichuan',
        roundId: 'round-1',
        target: { kind: 'region', id: 'sichuan' },
        exerciseType: 'name-target',
        language: 'ru',
        isCorrect: true,
        durationMs: 1000,
        answeredAt: '2026-08-03T10:00:00.000Z',
      },
    ],
    masteredTargets: [{ kind: 'region', id: 'sichuan' }],
  });
});

it('проводит прогресс первой версии через всю цепочку', () => {
  const migrated = migrateProgress(v1);

  expect(migrated?.schemaVersion).toBe(3);
  expect(migrated?.attempts[0].target).toEqual({ kind: 'region', id: 'sichuan' });
  expect(migrated?.attempts[0].language).toBe('ru');
  expect(migrated?.attempts[0]).not.toHaveProperty('level');
  expect(migrated?.attempts[0]).not.toHaveProperty('regionId');
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/domain/progress-migration.test.ts`
Expected: FAIL — перевода на третью версию нет.

- [ ] **Step 3: Разбить миграцию на шаги цепочки**

В `src/domain/progress-migration.ts` заменить тело `migrateProgress` и вынести переводы по версиям:

```ts
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

      const { level: _level, ...rest } = attempt;

      return { ...rest, language: 'ru' };
    }),
  };
}
```

Переименовать существующую `migrateAttempt` в `migrateAttemptToV2` (тело не меняется) и заменить `migrateProgress`:

```ts
export function migrateProgress(parsed: unknown): Progress | null {
  if (!isRecord(parsed)) {
    return null;
  }

  if (isCurrentVersion(parsed)) {
    return parsed as unknown as Progress;
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

  return current as unknown as Progress;
}
```

- [ ] **Step 4: Запустить тесты миграции**

Run: `npx vitest run src/domain/progress-migration.test.ts`
Expected: PASS.

- [ ] **Step 5: Починить тест хранилища**

В `src/domain/progress-storage.test.ts` тест «переводит сохранённый прогресс первой версии и сохраняет исходник» дополнить проверкой языка:

```ts
  expect(progress.attempts[0].language).toBe('ru');
```

Тест «не резервирует прогресс текущей версии при каждом чтении» менять не нужно: он строится от `EMPTY_PROGRESS`, а тот уже третьей версии.

- [ ] **Step 6: Полная проверка**

Run: `npm test && npm run lint && npm run build`
Expected: без ошибок.

- [ ] **Step 7: Коммит**

```bash
git add src/domain/progress-migration.ts src/domain/progress-migration.test.ts src/domain/progress-storage.test.ts
git commit -m "feat: миграция прогресса на схему 3"
```

---

### Task 3: Верный ответ не останавливает раунд

**Files:**
- Modify: `src/features/exercise/ExerciseRound.tsx`
- Modify: `src/features/exercise/AnswerFeedback.tsx`
- Test: `src/features/exercise/ExerciseRound.test.tsx`, `src/features/exercise/AnswerFeedback.test.tsx`

**Interfaces:**
- Consumes: `Round`, `answerQuestion`, `goToNextQuestion`, `isRoundFinished` (существующие).
- Produces: `AnswerFeedbackProps` без поля `isCorrect` — компонент показывает только разбор ошибки.

- [ ] **Step 1: Написать падающий тест ритма**

В `src/features/exercise/ExerciseRound.test.tsx` рядом с существующими помощниками `asked()` и `askedRegion()` добавить два своих:

```ts
function answerCorrectly() {
  const target = askedRegion();

  fireEvent.click(
    screen.getByRole('button', { name: `${target.nameRu} (${target.nameZh})` }),
  );
}

function answerWrongly() {
  const target = askedRegion();
  const other = regions.find((region) => region.id !== target.id)!;

  fireEvent.click(
    screen.getByRole('button', { name: `${other.nameRu} (${other.nameZh})` }),
  );
}
```

Затем сами тесты — импортировав `act` из `@testing-library/react` и `vi` из `vitest`:

```ts
it('переводит к следующему вопросу сам, без кнопки, после верного ответа', () => {
  vi.useFakeTimers();
  try {
    renderRound();
    const before = asked();

    answerCorrectly();

    expect(screen.queryByRole('button', { name: 'Далее' })).toBeNull();
    expect(screen.queryByText('Верно')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(asked()).not.toBe(before);
  } finally {
    vi.useRealTimers();
  }
});

it('останавливается на ошибке и ждёт «Далее»', () => {
  renderRound();

  answerWrongly();

  expect(screen.getByText('Этот регион стоит повторить')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Далее' })).toBeTruthy();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/exercise/ExerciseRound.test.tsx`
Expected: FAIL — после верного ответа показывается «Верно» и кнопка «Далее».

- [ ] **Step 3: Ввести паузу и автоматический переход**

В `src/features/exercise/ExerciseRound.tsx` добавить в импорт React `useEffect` и `useRef`, а рядом с `resultOf` — константу:

```ts
/**
 * Сколько верный ответ виден до следующего вопроса. Без паузы регион
 * закрашивается и исчезает раньше, чем глаз это заметит; с кнопкой «Далее»
 * ученик подтверждал то, что и так знает. В «Заполни карту» той же цели
 * служат полторы секунды показа неугаданного региона — здесь хватает
 * меньшего, потому что подтверждается успех, а не сообщается новое.
 */
const CORRECT_PAUSE_MS = 500;
```

Внутри компонента заменить `answer`, `handleNext` и добавить хранение таймера:

```ts
  /*
   * Таймер живёт в ссылке: уход с экрана посреди паузы не должен переводить
   * раунд, которого уже нет.
   */
  const advanceTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
      }
    },
    [],
  );

  function goNext(from: Round) {
    const next = goToNextQuestion(from);
    if (isRoundFinished(next)) {
      onFinish(next.attempts);
      return;
    }

    setRound(next);
    setAnsweredRegionId(null);
    setAskedAt(performance.now());
  }

  function answer(regionId: string) {
    setAnsweredRegionId(regionId);
    const answered = answerQuestion(round, {
      answeredId: regionId,
      durationMs: Math.round(performance.now() - askedAt),
      answeredAt: new Date().toISOString(),
    });
    setRound(answered);

    if (answered.attempts[answered.attempts.length - 1].isCorrect) {
      advanceTimer.current = window.setTimeout(() => {
        advanceTimer.current = null;
        goNext(answered);
      }, CORRECT_PAUSE_MS);
    }
  }

  function handleNext() {
    goNext(round);
  }
```

- [ ] **Step 4: Показывать разбор только на ошибке**

В том же файле рядом с `question` добавить:

```ts
  const lastAttempt = round.attempts[round.attempts.length - 1];
  const showsFeedback = round.status === 'feedback' && lastAttempt?.isCorrect === false;
```

и заменить условие отрисовки разбора:

```tsx
          {showsFeedback ? (
            <AnswerFeedback
              targetRegion={targetRegion}
              isLastQuestion={isLastQuestion}
              onNext={handleNext}
            />
          ) : null}
```

- [ ] **Step 5: Убрать ветку «Верно» из разбора**

В `src/features/exercise/AnswerFeedback.tsx` удалить поле `isCorrect` из `AnswerFeedbackProps` и из параметров, заменить шапку компонента и разметку:

```tsx
/**
 * Разбор ошибки: значок, заголовок и правильный ответ. Тон поддерживающий —
 * вместо «Ты ошибся» говорится, что регион стоит повторить (UI_UX.md).
 * Фокус переводится на заголовок, чтобы результат был объявлен и доступен
 * с клавиатуры.
 *
 * Ветки «Верно» здесь нет: верный ответ не останавливает раунд и ничего не
 * объясняет — ученик только что показал это сам.
 */
```

```tsx
  const title = 'Этот регион стоит повторить';

  return (
    <section
      className="answer-feedback"
      data-result="incorrect"
      aria-labelledby="answer-feedback-heading"
    >
      <p className="answer-feedback-icon" role="img" aria-label={title}>
        ↻
      </p>
```

- [ ] **Step 6: Починить тесты разбора и раунда**

В `src/features/exercise/AnswerFeedback.test.tsx` удалить проп `isCorrect` из всех отрисовок и удалить тесты, проверявшие вид «Верно», — этого состояния больше нет.

В `src/features/exercise/ExerciseRound.test.tsx` в существующих сценариях, которые отвечали верно и нажимали «Далее», убрать нажатие и добавить `vi.advanceTimersByTime(500)` под `vi.useFakeTimers()`.

- [ ] **Step 7: Запустить тесты упражнения**

Run: `npx vitest run src/features/exercise`
Expected: PASS.

- [ ] **Step 8: Полная проверка**

Run: `npm test && npm run lint && npm run build`
Expected: без ошибок.

- [ ] **Step 9: Коммит**

```bash
git add src/features/exercise
git commit -m "feat: верный ответ не останавливает раунд"
```

---

### Task 4: Переключатель языка на карточке игры

**Files:**
- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/features/home/next-step.ts`
- Modify: `src/styles.css`
- Test: `src/features/home/HomePage.test.tsx`, `src/features/home/next-step.test.ts`

**Interfaces:**
- Consumes: `QuestionLanguage` (задача 1), `onStartRound(exerciseType, language, regionIds)`, `onStartFillRound(language)`.
- Produces: `NextStep.language` выводится из истории; на каждой рабочей карточке — группа переключателей с именем `mode-language-<id>`.

**Разметка меняется по необходимости.** Сейчас карточка целиком — один `<button>`. Радиогруппу нельзя вложить в кнопку: интерактивный элемент внутри кнопки недопустим и недостижим с клавиатуры. Поэтому переключатель становится соседом кнопки внутри того же `<li>`, а не её содержимым.

- [ ] **Step 1: Написать падающий тест умолчания**

В `src/features/home/next-step.test.ts` добавить:

```ts
it('берёт язык последней попытки', () => {
  const attempts = [
    attempt('sichuan', 'r1', true, 'find-on-map'),
    attempt('gansu', 'r1', true, 'find-on-map', 'zh'),
  ];

  expect(nextStep(attempts, NOW).language).toBe('zh');
});

it('при пустой истории спрашивает по-русски', () => {
  expect(nextStep([], NOW).language).toBe('ru');
});
```

Помощник `attempt` в этом файле дополнить пятым параметром `language: QuestionLanguage = 'ru'` и подставить его в возвращаемый объект.

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/home/next-step.test.ts`
Expected: FAIL — `language` всегда `'ru'`.

- [ ] **Step 3: Выводить язык из истории**

В `src/features/home/next-step.ts` рядом с `lastExerciseType` добавить:

```ts
/**
 * Язык берётся из истории по тому же правилу, что и последняя игра: ученик,
 * перешедший на иероглифы, не должен возвращать их вручную каждый раз.
 */
function lastLanguage(attempts: readonly Attempt[]): QuestionLanguage {
  return attempts.at(-1)?.language ?? 'ru';
}
```

и заменить во всех трёх возвратах `language: 'ru',` на `language: lastLanguage(attempts),`.

- [ ] **Step 4: Запустить тест умолчания**

Run: `npx vitest run src/features/home/next-step.test.ts`
Expected: PASS.

- [ ] **Step 5: Написать падающий тест переключателя**

В `src/features/home/HomePage.test.tsx` добавить. Помощник `renderHome` в этом файле принимает историю и возвращает набор `vi.fn()`, а нажатия делаются через `fireEvent` — `within` уже импортирован:

```ts
/** Карточка целиком — `<li>`; внутри и кнопка запуска, и своя радиогруппа. */
function cardOf(title: string): HTMLElement {
  return screen
    .getAllByRole('listitem')
    .find((item) => item.textContent?.includes(title))!;
}

it('запускает игру на выбранном языке', () => {
  const { onStartRound } = renderHome();
  const card = cardOf('Найти на карте');

  fireEvent.click(within(card).getByRole('radio', { name: '中文' }));
  fireEvent.click(within(card).getByRole('button', { name: /Найти на карте/ }));

  expect(onStartRound).toHaveBeenCalledWith('find-on-map', 'zh', null);
});

it('переключение языка само не запускает раунд', () => {
  const { onStartRound } = renderHome();

  fireEvent.click(within(cardOf('Найти на карте')).getByRole('radio', { name: '中文' }));

  expect(onStartRound).not.toHaveBeenCalled();
});

it('умолчание карточки берётся из языка последней попытки', () => {
  renderHome([
    {
      questionId: '1-gansu',
      roundId: 'r1',
      target: { kind: 'region', id: 'gansu' },
      exerciseType: 'find-on-map',
      language: 'zh',
      isCorrect: true,
      durationMs: 1000,
      answeredAt: new Date().toISOString(),
    },
  ]);

  expect(
    within(cardOf('Найти на карте')).getByRole<HTMLInputElement>('radio', { name: '中文' })
      .checked,
  ).toBe(true);
});
```

- [ ] **Step 6: Убедиться, что тест падает**

Run: `npx vitest run src/features/home/HomePage.test.tsx`
Expected: FAIL — переключателя нет.

- [ ] **Step 7: Добавить состояние языка по карточкам**

В `src/features/home/HomePage.tsx` внутри компонента, до `return`:

```tsx
  /*
   * Язык у каждой карточки свой: «Найти на карте» можно держать на русском,
   * пока «Регион — столица» уже идёт иероглифами. Умолчание общее — язык
   * последней попытки, он же в главном шаге.
   */
  const [languageByCard, setLanguageByCard] = useState<Record<string, QuestionLanguage>>({});

  function languageOf(cardId: string): QuestionLanguage {
    return languageByCard[cardId] ?? step.language;
  }
```

Импортировать `useState` из React и `QuestionLanguage` из `../../domain/question-language`.

- [ ] **Step 8: Вынести переключатель из кнопки**

В `src/features/home/HomePage.tsx` заменить тело `<li>` карточки:

```tsx
              <li key={card.id} className="mode-card" data-planned={isPlanned}>
                <button
                  type="button"
                  disabled={isPlanned}
                  onClick={() => {
                    if (card.kind === 'exercise') {
                      onStartRound(card.exerciseType, languageOf(card.id), null);
                    } else if (card.kind === 'fill') {
                      onStartFillRound(languageOf(card.id));
                    }
                  }}
                >
                  <span className="mode-card-head">
                    <span lang="zh-Hans" className="mode-card-mark">
                      {card.mark}
                    </span>
                    {isPlanned ? (
                      <span className="mode-card-status">Готовится</span>
                    ) : null}
                  </span>
                  <span className="mode-card-title">{card.title}</span>
                  <span className="mode-card-summary">{card.summary}</span>
                  <span className="mode-card-volume">{card.volume}</span>
                </button>
                {isPlanned ? null : (
                  <fieldset className="mode-card-language">
                    <legend>Чем спрашивать</legend>
                    {(
                      [
                        ['ru', 'Русское'],
                        ['zh', '中文'],
                      ] as const
                    ).map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name={`mode-language-${card.id}`}
                          value={value}
                          checked={languageOf(card.id) === value}
                          onChange={() =>
                            setLanguageByCard((current) => ({ ...current, [card.id]: value }))
                          }
                        />
                        <span lang={value === 'zh' ? 'zh-Hans' : undefined}>{label}</span>
                      </label>
                    ))}
                  </fieldset>
                )}
              </li>
```

Класс `mode-card-level` переименован в `mode-card-status`: он показывает «Готовится», а к уровням не имеет отношения.

- [ ] **Step 9: Поправить строку про разбор**

В том же файле в описании секции «Режимы» заменить текст:

```tsx
            Карта — только начало. География, история и культура спрашиваются по
            одним правилам: три попытки, разбор после ошибки, повтор ошибок
            через день.
```

- [ ] **Step 10: Стили переключателя**

В `src/styles.css` переименовать правило `.mode-card-level` в `.mode-card-status` (свойства не менять) и добавить рядом:

```css
/*
 * Переключатель языка стоит под кнопкой карточки, а не внутри неё:
 * интерактивный элемент внутри кнопки недостижим с клавиатуры.
 */
.mode-card-language {
  display: flex;
  gap: var(--s-3);
  align-items: baseline;
  margin: 0;
  padding: 0 var(--s-4) var(--s-4);
  border: 0;
}

.mode-card-language legend {
  padding: 0;
  color: var(--text-on-paper-muted);
  font-size: var(--t-size-caption);
}

.mode-card-language label {
  display: inline-flex;
  gap: var(--s-2);
  align-items: baseline;
  color: var(--c-ink-700);
  font-size: var(--t-size-caption);
  cursor: pointer;
}
```

Имена токенов взяты из соседнего правила `.mode-card-volume` (`--text-on-paper-muted`, `--t-size-caption`, `--s-2`); если `--s-3` или `--s-4` в `tokens.css` нет, взять ближайшие существующие из той же шкалы, а не вписывать пиксели.

- [ ] **Step 11: Запустить тесты главной**

Run: `npx vitest run src/features/home`
Expected: PASS. Существующие тесты, ожидавшие `onStartRound('name-target', 1, null)`, поправить на `('name-target', 'ru', null)`.

- [ ] **Step 12: Полная проверка**

Run: `npm test && npm run lint && npm run build`
Expected: без ошибок.

- [ ] **Step 13: Коммит**

```bash
git add src
git commit -m "feat: выбор языка вопроса на карточке игры"
```

---

### Task 5: Документы и правка спека городов

**Files:**
- Modify: `PROGRESS_SYSTEM.md`, `EXERCISES.md`, `DATA_MODEL.md`, `DECISIONS.md`, `CHANGELOG.md`
- Modify: `docs/superpowers/specs/2026-08-05-cities-mode-design.md`

- [ ] **Step 1: Правило освоения**

В `PROGRESS_SYSTEM.md` заменить предложение про «не русским названием» на:

> Регион считается освоенным, если ученик ответил верно три раза в разных завершённых раундах; хотя бы один ответ должен быть на вопрос иероглифами: узнать регион по русской подписи и назвать его по иероглифам — разное знание. Одна ошибка за последние 14 дней снимает статус «устойчиво освоено» и возвращает регион в план повторения, но не стирает историю.

- [ ] **Step 2: Правила генерации**

В `EXERCISES.md` заменить предложение про «собственные правила игры» на:

> Чем спрашивает игра — русским названием или иероглифами, — выбирает ученик на карточке перед стартом. Уровней нет, все игры открыты сразу, и внутри раунда язык не меняется.

В разделе «Найди на карте» дописать:

> Верный ответ не останавливает раунд: регион подсвечивается верным цветом на полсекунды, и приходит следующий вопрос. Разбор с кнопкой «Далее» показывается только на ошибке.

- [ ] **Step 3: Модель данных**

В `DATA_MODEL.md` в блоке `Attempt` заменить `level: 1 | 2 | 3 | 4;` на `language: 'ru' | 'zh';`, в `Progress` заменить `schemaVersion: 2;` на `schemaVersion: 3;` и дописать после абзаца про вид цели:

> Попытка хранит язык вопроса, а не уровень: уровней в продукте нет. Переход со второй версии на третью отбрасывает сохранённое поле уровня и проставляет русский — восстановить по нему язык нельзя, не вернув понятие, от которого отказались.

- [ ] **Step 4: Журнал решений**

В `DECISIONS.md` добавить строку вверх таблицы:

```
| 2026-08-05 | Язык вопроса выбирает ученик; уровней не осталось нигде | Решение владельца продукта: «в приложении больше не должно быть уровней». Число `level` пережило снятие лестницы и втайне решало, чем спрашивает игра: «Регион — столица» иероглифами, «Заполнить карту» — пиньинем или столицей вперемешку внутри партии. Со стороны это выглядело как случайная смена языка. Теперь язык — `QuestionLanguage = 'ru' | 'zh'` — стоит переключателем на карточке и записывается в попытку; пиньинь и столица перестали быть тем, чем спрашивают (пиньинь остался в разборе и атласе, столица — это отдельная игра). Освоенность формулируется словами: три верных ответа в разных раундах, хотя бы один на вопрос иероглифами. Удалены `Level`, `Representation`, `REPRESENTATIONS_BY_LEVEL`, `representationsFor`, `MASTERY_MIN_LEVEL` и недостижимый тип раунда `mixed`. Прогресс переехал на схему 3: сохранённый уровень отбрасывается, попытке проставляется русский — цена в том, что освоенное через иероглифы придётся подтвердить заново. |
| 2026-08-05 | Верный ответ не останавливает раунд | Кнопка «Далее» на верном ответе требовала подтверждать то, что ученик только что показал сам, и на 34 вопросах превращалась в 34 лишних нажатия. Регион подсвечивается верным цветом на 500 мс, и приходит следующий вопрос; на последнем вопросе так же открываются итоги. Разбор остаётся на ошибке — там он и нужен. Прецедент: в «Заполни карту» шага «Далее» нет с самого начала. Строка на главной «разбор после каждого ответа» исправлена на «разбор после ошибки». |
```

- [ ] **Step 5: Журнал изменений**

В `CHANGELOG.md` в раздел `### Changed` неизданного добавить сверху:

> - Ученик выбирает, каким названием его спрашивают: переключатель «Русское / 中文» стоит на карточке игры, умолчание берётся из языка последней попытки. Пиньинь и столица больше не задают вопрос — пиньинь остался в разборе и атласе, столица это отдельная игра.
> - Уровней не осталось нигде: удалены тип `Level`, таблица представлений по уровням, порог освоенности по уровню и недостижимый смешанный раунд. Освоенность требует трёх верных ответов в разных раундах, из которых хотя бы один — на вопрос иероглифами.
> - Верный ответ не останавливает раунд: регион подсвечивается на полсекунды, и приходит следующий вопрос. Разбор с «Далее» остаётся на ошибке.
> - Прогресс переехал на схему 3. Сохранённый уровень отбрасывается, попытке проставляется русский; освоенное через иероглифы придётся подтвердить заново.

- [ ] **Step 6: Правка спека городов**

В `docs/superpowers/specs/2026-08-05-cities-mode-design.md` заменить абзац про `level` каждой карточки на:

> **Язык вопроса выбирается так же, как у регионов.** Каждая городская карточка получает переключатель «Русское / 中文»; пиньинь у города остаётся в каталоге для показа, но вопрос его не задаёт. Освоенность города подчиняется общему правилу: три верных ответа в разных раундах, хотя бы один — на вопрос иероглифами.

Остальное в том файле правки не требует: пиньинь у города остаётся полем каталога и по-прежнему показывается на карточке, поэтому строка «У 31 столицы… не хватает пиньиня столицы и координат» верна как есть.

- [ ] **Step 7: Коммит**

```bash
git add PROGRESS_SYSTEM.md EXERCISES.md DATA_MODEL.md DECISIONS.md CHANGELOG.md docs/superpowers/specs/2026-08-05-cities-mode-design.md
git commit -m "docs: язык вопроса вместо уровней"
```

---

## Готовность

`npm run build` и `npm test` проходят. `grep -rn "Level\|level" src` даёт только `zoomLevels`.

Основной сценарий проверен вручную в браузере (`AGENTS.md`): раунд «Найти на карте» на русском и на 中文 — верные ответы идут подряд без нажатий, ошибка показывает разбор; «Заполнить карту» запускается на выбранном языке; переключатель достижим `Tab` и переключается стрелками; на 320 px карточка с переключателем не ломает вёрстку. Отдельно проверено, что подложенный прогресс второй версии читается и попытки получают `ru`. На карточке игры видно и меняется, каким названием спросят; выбранный язык держится весь раунд и записывается в попытку. Верный ответ не требует нажатия, ошибка показывает разбор. Прогресс любой прежней версии читается, а его исходник остаётся в резервном ключе.

## Что этот план не делает

- **Не добавляет городов.** Каталог, точки на карте и городские игры — отдельная работа по `2026-08-05-cities-mode-design.md`, и она ждёт списка ~20 значимых городов помимо 31 столицы.
- **Не трогает пиньинь вне вопроса.** Атлас, карточки регионов и разбор показывают его как раньше; подмножества шрифтов не меняются.
