# Difficulty Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Четыре уровня сложности: представление вопроса растёт от русского названия до смешанного режима, а новый уровень открывается по результатам.

**Architecture:** Уровень решает две вещи — каким представлением показан регион и какие типы заданий встречаются в раунде. Обе решаются при создании раунда, поэтому вопрос несёт и своё представление, и свой тип задания. Из этого следует перестройка интерфейса: вместо двух экранов упражнений — один контейнер, который на каждый вопрос показывает нужный вид. Он же убирает дублирование, которое сейчас одинаково в обоих экранах.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Testing Library, ESLint, CSS.

## Global Constraints

- Интерфейс — на русском; китайские названия — в Unicode.
- Уровень 1 — русское название, 2 — китайское, 3 — пиньинь или столица, 4 — смешанный (SPEC.md).
- На уровне 4 типы заданий чередуются внутри раунда (EXERCISES.md).
- Новый уровень открывается после 80% точности за последние два завершённых раунда предыдущего уровня.
- Всё случайное — от переданного генератора: представление, тип задания, порядок.
- Вопрос не может показывать собственный ответ: в режиме «регион — столица» представление «столица» не используется.
- Раунд по-прежнему включает все регионы темы, каждый ровно один раз.
- Работа в ветке `feat/difficulty-levels`.
- Не входит: режим учителя, аудит доступности, экспорт прогресса.

---

## File structure

| Файл | Назначение |
| --- | --- |
| `src/domain/representations.ts` | Представления региона и их набор по уровням |
| `src/domain/representations.test.ts` | Тесты представлений |
| `src/domain/round.ts` | Тип задания и представление на каждый вопрос |
| `src/domain/progress-rules.ts` | Правило разблокировки уровня |
| `src/features/exercise/ExerciseRound.tsx` | Единый контейнер раунда |
| `src/features/exercise/ExerciseRound.test.tsx` | Тесты контейнера |
| `src/features/exercise/FindOnMapExercise.tsx`, `ChoiceExercise.tsx` | Удаляются: их роль берёт контейнер |
| `src/features/topic-selection/TopicSelectionPage.tsx` | Выбор уровня |
| `src/App.tsx` | Связывание |
| `CHANGELOG.md`, `DECISIONS.md` | Документы |

---

### Task 1: Представления региона

**Files:**
- Create: `src/domain/representations.ts`, `src/domain/representations.test.ts`

**Interfaces:**
- Produces:

```ts
export type Representation = 'name-ru' | 'name-zh' | 'pinyin' | 'capital';
export const REPRESENTATIONS_BY_LEVEL: Readonly<Record<Level, readonly Representation[]>>;
export function labelOf(region: Region, representation: Representation): string;
export function representationsFor(level: Level, exerciseType: ExerciseType): readonly Representation[];
```

- [ ] **Step 1: Создать ветку**

```bash
git switch -c feat/difficulty-levels
```

- [ ] **Step 2: Написать падающие тесты**

Создать `src/domain/representations.test.ts`:

```ts
import { regions } from '../content/regions';
import {
  labelOf,
  REPRESENTATIONS_BY_LEVEL,
  representationsFor,
} from './representations';

const sichuan = regions.find((region) => region.id === 'sichuan')!;

it('подписывает регион каждым представлением', () => {
  expect(labelOf(sichuan, 'name-ru')).toBe('Сычуань');
  expect(labelOf(sichuan, 'name-zh')).toBe('四川省');
  expect(labelOf(sichuan, 'pinyin')).toBe(sichuan.pinyin);
  expect(labelOf(sichuan, 'capital')).toBe('Чэнду');
});

it('растит сложность от уровня к уровню', () => {
  expect(REPRESENTATIONS_BY_LEVEL[1]).toEqual(['name-ru']);
  expect(REPRESENTATIONS_BY_LEVEL[2]).toEqual(['name-zh']);
  expect(REPRESENTATIONS_BY_LEVEL[3]).toEqual(['pinyin', 'capital']);
  expect(REPRESENTATIONS_BY_LEVEL[4]).toHaveLength(4);
});

it('не даёт вопросу «регион — столица» показывать собственный ответ', () => {
  expect(representationsFor(3, 'match-capital')).toEqual(['pinyin']);
  expect(representationsFor(4, 'match-capital')).not.toContain('capital');
});

it('оставляет столицу доступной остальным заданиям', () => {
  expect(representationsFor(3, 'find-on-map')).toContain('capital');
  expect(representationsFor(3, 'name-region')).toContain('capital');
});

it('никогда не оставляет задание без представления', () => {
  const levels = [1, 2, 3, 4] as const;
  const types = ['find-on-map', 'name-region', 'match-capital'] as const;

  for (const level of levels) {
    for (const type of types) {
      expect(representationsFor(level, type).length).toBeGreaterThan(0);
    }
  }
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

```bash
npm test -- src/domain/representations.test.ts
```

Ожидается: FAIL — модуля нет.

- [ ] **Step 4: Реализовать**

Создать `src/domain/representations.ts`:

```ts
import type { Region } from '../content/types';
import type { ExerciseType, Level } from './round';

export type Representation = 'name-ru' | 'name-zh' | 'pinyin' | 'capital';

/** SPEC.md: сложность растёт от русского названия к смешанному режиму. */
export const REPRESENTATIONS_BY_LEVEL: Readonly<
  Record<Level, readonly Representation[]>
> = {
  1: ['name-ru'],
  2: ['name-zh'],
  3: ['pinyin', 'capital'],
  4: ['name-ru', 'name-zh', 'pinyin', 'capital'],
};

export function labelOf(region: Region, representation: Representation): string {
  switch (representation) {
    case 'name-ru':
      return region.nameRu;
    case 'name-zh':
      return region.nameZh;
    case 'pinyin':
      return region.pinyin;
    case 'capital':
      return region.capitalRu;
  }
}

/**
 * В задании «регион — столица» ответ и есть столица, поэтому показывать её
 * в вопросе нельзя. Для остальных заданий доступны все представления уровня.
 */
export function representationsFor(
  level: Level,
  exerciseType: ExerciseType,
): readonly Representation[] {
  const available = REPRESENTATIONS_BY_LEVEL[level];

  return exerciseType === 'match-capital'
    ? available.filter((representation) => representation !== 'capital')
    : available;
}
```

- [ ] **Step 5: Проверить и зафиксировать**

```bash
npm test -- src/domain/representations.test.ts && npm run lint
```

```bash
git add src/domain/representations.ts src/domain/representations.test.ts
git commit -m "feat: describe region representations per level"
```

---

### Task 2: Тип задания и представление на каждый вопрос

**Files:**
- Modify: `src/domain/round.ts`, `src/domain/round.test.ts`

**Interfaces:**
- Produces: `RoundOptions.exerciseTypes: readonly ExerciseType[]` вместо `exerciseType`; `Question.representation: Representation`.

- [ ] **Step 1: Написать падающие тесты**

Заменить константу `OPTIONS` в `src/domain/round.test.ts`:

```ts
const OPTIONS = {
  roundId: 'round-1',
  exerciseTypes: ['find-on-map'],
  level: 1,
} as const;
```

Добавить тесты:

```ts
it('чередует типы заданий в смешанном раунде', () => {
  const round = createRound(regions, {
    roundId: 'round-1',
    exerciseTypes: ['find-on-map', 'name-region', 'match-capital'],
    level: 4,
    random: createSeededRandom(1),
  });

  expect(round.questions.slice(0, 4).map((question) => question.exerciseType)).toEqual([
    'find-on-map',
    'name-region',
    'match-capital',
    'find-on-map',
  ]);
});

it('даёт каждому вопросу представление из своего уровня', () => {
  const round = createRound(regions, {
    roundId: 'round-1',
    exerciseTypes: ['find-on-map'],
    level: 2,
    random: createSeededRandom(1),
  });

  expect(
    round.questions.every((question) => question.representation === 'name-zh'),
  ).toBe(true);
});

it('не показывает столицу в вопросе «регион — столица»', () => {
  const round = createRound(regions, {
    roundId: 'round-1',
    exerciseTypes: ['match-capital'],
    level: 4,
    random: createSeededRandom(1),
  });

  expect(
    round.questions.some((question) => question.representation === 'capital'),
  ).toBe(false);
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/domain/round.test.ts
```

- [ ] **Step 3: Реализовать**

В `src/domain/round.ts` добавить импорт и поле:

```ts
import { representationsFor, type Representation } from './representations';
```

```ts
export type Question = {
  readonly id: string;
  readonly roundId: string;
  readonly regionId: string;
  readonly exerciseType: ExerciseType;
  readonly representation: Representation;
  readonly level: Level;
};
```

```ts
export type RoundOptions = {
  readonly roundId: string;
  readonly exerciseTypes: readonly ExerciseType[];
  readonly level: Level;
  readonly random: () => number;
};
```

Заменить построение вопросов:

```ts
  if (options.exerciseTypes.length === 0) {
    throw new Error('Раунд не создан: не заданы типы заданий');
  }

  const questions = shuffle(regions, options.random).map((region, index) => {
    const exerciseType = options.exerciseTypes[index % options.exerciseTypes.length];
    const available = representationsFor(options.level, exerciseType);
    const representation = available[Math.floor(options.random() * available.length)];

    return {
      id: `${index + 1}-${region.id}`,
      roundId: options.roundId,
      regionId: region.id,
      exerciseType,
      representation,
      level: options.level,
    };
  });
```

- [ ] **Step 4: Проверить и зафиксировать**

```bash
npm test -- src/domain/round.test.ts && npm run lint
```

```bash
git add src/domain/round.ts src/domain/round.test.ts
git commit -m "feat: give each question its type and representation"
```

---

### Task 3: Разблокировка уровня

**Files:**
- Modify: `src/domain/progress-rules.ts`, `src/domain/progress-rules.test.ts`

**Interfaces:**
- Produces:

```ts
export const UNLOCK_ACCURACY = 0.8;
export const UNLOCK_ROUNDS = 2;
export function unlockedLevelFrom(attempts: readonly Attempt[]): Level;
```

- [ ] **Step 1: Написать падающие тесты**

Добавить в `src/domain/progress-rules.test.ts`:

```ts
function round(roundId: string, level: Level, correct: number, total: number): Attempt[] {
  return Array.from({ length: total }, (_, index) =>
    attempt({
      roundId,
      level,
      regionId: `region-${index}`,
      isCorrect: index < correct,
    }),
  );
}

it('без истории открыт только первый уровень', () => {
  expect(unlockedLevelFrom([])).toBe(1);
});

it('не открывает уровень после одного удачного раунда', () => {
  expect(unlockedLevelFrom(round('r1', 1, 10, 10))).toBe(1);
});

it('открывает второй уровень после двух раундов с точностью не ниже 80%', () => {
  const attempts = [...round('r1', 1, 9, 10), ...round('r2', 1, 8, 10)];

  expect(unlockedLevelFrom(attempts)).toBe(2);
});

it('не открывает уровень при точности ниже 80%', () => {
  const attempts = [...round('r1', 1, 7, 10), ...round('r2', 1, 8, 10)];

  expect(unlockedLevelFrom(attempts)).toBe(1);
});

it('смотрит только на два последних раунда уровня', () => {
  const attempts = [
    ...round('r1', 1, 0, 10),
    ...round('r2', 1, 9, 10),
    ...round('r3', 1, 9, 10),
  ];

  expect(unlockedLevelFrom(attempts)).toBe(2);
});

it('открывает уровни по цепочке', () => {
  const attempts = [
    ...round('r1', 1, 10, 10),
    ...round('r2', 1, 10, 10),
    ...round('r3', 2, 10, 10),
    ...round('r4', 2, 10, 10),
  ];

  expect(unlockedLevelFrom(attempts)).toBe(3);
});

it('не поднимается выше четвёртого уровня', () => {
  const attempts = [1, 2, 3, 4].flatMap((level) => [
    ...round(`a${level}`, level as Level, 10, 10),
    ...round(`b${level}`, level as Level, 10, 10),
  ]);

  expect(unlockedLevelFrom(attempts)).toBe(4);
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/domain/progress-rules.test.ts
```

- [ ] **Step 3: Реализовать**

Добавить в `src/domain/progress-rules.ts`:

```ts
export const UNLOCK_ACCURACY = 0.8;
export const UNLOCK_ROUNDS = 2;

const MAX_LEVEL: Level = 4;

/**
 * Уровень открывается, когда два последних завершённых раунда предыдущего
 * уровня дали вместе не меньше 80% верных ответов (SPEC.md). Цепочка
 * прерывается на первом уровне, который этого не набрал.
 */
export function unlockedLevelFrom(attempts: readonly Attempt[]): Level {
  let unlocked: Level = 1;

  while (unlocked < MAX_LEVEL) {
    const ofLevel = attempts.filter((attempt) => attempt.level === unlocked);
    const rounds = [...groupBy(ofLevel, (attempt) => attempt.roundId).values()];
    const recent = rounds.slice(-UNLOCK_ROUNDS).flat();

    if (rounds.length < UNLOCK_ROUNDS) {
      return unlocked;
    }

    const correct = recent.filter((attempt) => attempt.isCorrect).length;
    if (correct / recent.length < UNLOCK_ACCURACY) {
      return unlocked;
    }

    unlocked = (unlocked + 1) as Level;
  }

  return unlocked;
}
```

Дописать импорт типа: `import type { Attempt, Level } from './round';`

- [ ] **Step 4: Проверить и зафиксировать**

```bash
npm test -- src/domain/progress-rules.test.ts && npm run lint
```

```bash
git add src/domain/progress-rules.ts src/domain/progress-rules.test.ts
git commit -m "feat: unlock the next level by accuracy"
```

---

### Task 4: Единый контейнер раунда

Два экрана упражнений одинаково ведут раунд и различаются только видом вопроса. На смешанном уровне вид меняется от вопроса к вопросу, поэтому оба сводятся в один контейнер.

**Files:**
- Create: `src/features/exercise/ExerciseRound.tsx`, `src/features/exercise/ExerciseRound.test.tsx`
- Delete: `src/features/exercise/FindOnMapExercise.tsx`, `FindOnMapExercise.test.tsx`, `ChoiceExercise.tsx`, `ChoiceExercise.test.tsx`
- Modify: `src/features/exercise/exercise-modes.ts`

**Interfaces:**
- Produces:

```ts
export type ExerciseRoundProps = {
  readonly regions: readonly Region[];
  readonly exerciseTypes: readonly ExerciseType[];
  readonly level: Level;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};
```

- [ ] **Step 1: Упростить описания режимов**

Заменить `src/features/exercise/exercise-modes.ts`:

```ts
import type { ExerciseType } from '../../domain/round';

export type ExerciseMode = {
  readonly exerciseType: ExerciseType;
  readonly title: string;
  readonly eyebrow: string;
};

export const EXERCISE_MODES: Readonly<Record<ExerciseType, ExerciseMode>> = {
  'find-on-map': {
    exerciseType: 'find-on-map',
    title: 'Найти на карте',
    eyebrow: 'Найдите на карте',
  },
  'name-region': {
    exerciseType: 'name-region',
    title: 'Назвать регион',
    eyebrow: 'Какой регион подсвечен',
  },
  'match-capital': {
    exerciseType: 'match-capital',
    title: 'Регион — столица',
    eyebrow: 'Выберите административный центр',
  },
};

export const ALL_EXERCISE_TYPES: readonly ExerciseType[] = [
  'find-on-map',
  'name-region',
  'match-capital',
];
```

- [ ] **Step 2: Написать падающие тесты**

Создать `src/features/exercise/ExerciseRound.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import type { Region } from '../../content/types';
import type { ExerciseType, Level } from '../../domain/round';
import { ExerciseRound } from './ExerciseRound';

const SHORT_POOL = regions.slice(0, 3);

function renderRound(
  exerciseTypes: readonly ExerciseType[] = ['find-on-map'],
  level: Level = 1,
  onFinish = () => {},
  pool: readonly Region[] = regions,
) {
  render(
    <ExerciseRound
      regions={pool}
      exerciseTypes={exerciseTypes}
      level={level}
      roundId="round-1"
      seed={1}
      onFinish={onFinish}
      onExit={() => {}}
    />,
  );
}

it('на первом уровне спрашивает русским названием', () => {
  renderRound();

  const asked = screen.getByTestId('exercise-target').textContent;

  expect(regions.map((region) => region.nameRu)).toContain(asked);
});

it('на втором уровне спрашивает китайским названием', () => {
  renderRound(['find-on-map'], 2);

  const asked = screen.getByTestId('exercise-target').textContent;

  expect(regions.map((region) => region.nameZh)).toContain(asked);
});

it('в режиме «найти на карте» отвечают выбором области', () => {
  renderRound();
  const asked = screen.getByTestId('exercise-target').textContent;
  const target = regions.find((region) => region.nameRu === asked)!;

  fireEvent.click(
    screen.getByRole('button', { name: `${target.nameRu} (${target.nameZh})` }),
  );

  expect(screen.getByRole('heading', { name: 'Верно' })).toBeInTheDocument();
});

it('в режиме «регион — столица» отвечают выбором варианта', () => {
  renderRound(['match-capital']);
  const asked = screen.getByTestId('exercise-target').textContent;
  const target = regions.find((region) => region.nameRu === asked)!;

  fireEvent.click(
    screen
      .getAllByTestId('choice-option')
      .find((option) => option.textContent === target.capitalRu)!,
  );

  expect(screen.getByRole('heading', { name: 'Верно' })).toBeInTheDocument();
});

it('в смешанном раунде меняет вид задания от вопроса к вопросу', () => {
  renderRound(['find-on-map', 'match-capital'], 4);

  expect(screen.queryAllByTestId('choice-option')).toHaveLength(0);

  const asked = screen.getByTestId('exercise-target').textContent;
  const target = regions.find(
    (region) =>
      [region.nameRu, region.nameZh, region.pinyin, region.capitalRu].includes(
        asked ?? '',
      ),
  )!;
  fireEvent.click(
    screen.getByRole('button', { name: `${target.nameRu} (${target.nameZh})` }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));

  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
});

it('сообщает о завершении раунда', () => {
  const finish = vi.fn();
  renderRound(['match-capital'], 1, finish, SHORT_POOL);

  for (let index = 0; index < SHORT_POOL.length; index += 1) {
    const asked = screen.getByTestId('exercise-target').textContent;
    const target = regions.find((region) => region.nameRu === asked)!;
    fireEvent.click(
      screen
        .getAllByTestId('choice-option')
        .find((option) => option.textContent === target.capitalRu)!,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: index === SHORT_POOL.length - 1 ? 'Завершить раунд' : 'Далее',
      }),
    );
  }

  expect(finish).toHaveBeenCalledOnce();
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

```bash
npm test -- src/features/exercise/ExerciseRound.test.tsx
```

- [ ] **Step 4: Реализовать контейнер**

Создать `src/features/exercise/ExerciseRound.tsx`:

```tsx
import { useMemo, useState, type MouseEvent } from 'react';
import type { Region } from '../../content/types';
import { buildChoices } from '../../domain/choices';
import { createSeededRandom } from '../../domain/random';
import { labelOf } from '../../domain/representations';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  type Attempt,
  type ExerciseType,
  type Level,
  type Round,
} from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { AnswerFeedback } from './AnswerFeedback';
import { answerStatesFor } from './answer-states';
import { EXERCISE_MODES } from './exercise-modes';

export type ExerciseRoundProps = {
  readonly regions: readonly Region[];
  readonly exerciseTypes: readonly ExerciseType[];
  readonly level: Level;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};

function resultOf(
  choiceId: string,
  targetId: string,
  answeredRegionId: string | null,
): 'correct' | 'incorrect' | undefined {
  if (answeredRegionId === null) {
    return undefined;
  }

  if (choiceId === targetId) {
    return 'correct';
  }

  return choiceId === answeredRegionId ? 'incorrect' : undefined;
}

export function ExerciseRound({
  regions,
  exerciseTypes,
  level,
  roundId,
  seed,
  onFinish,
  onExit,
}: ExerciseRoundProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(regions, {
      roundId,
      exerciseTypes,
      level,
      random: createSeededRandom(seed),
    }),
  );
  const [answeredRegionId, setAnsweredRegionId] = useState<string | null>(null);
  const [askedAt, setAskedAt] = useState(() => performance.now());

  // Варианты считаются один раз на раунд: иначе перерисовка тасовала бы их
  // прямо под курсором.
  const choicesByQuestion = useMemo(() => {
    const random = createSeededRandom(seed + 1);

    return round.questions.map((question) =>
      buildChoices(regions, question.regionId, random),
    );
  }, [regions, round.questions, seed]);

  const question = currentQuestion(round);
  const targetRegion = regions.find((region) => region.id === question.regionId)!;
  const mode = EXERCISE_MODES[question.exerciseType];
  const isMapAnswer = question.exerciseType === 'find-on-map';
  const showsMap = isMapAnswer || question.exerciseType === 'name-region';
  const isLastQuestion = round.currentIndex === round.questions.length - 1;

  const answerStates = useMemo(
    () =>
      isMapAnswer ? answerStatesFor(regions, question.regionId, answeredRegionId) : {},
    [isMapAnswer, regions, question.regionId, answeredRegionId],
  );

  function answer(regionId: string) {
    setAnsweredRegionId(regionId);
    setRound(
      answerQuestion(round, {
        answeredRegionId: regionId,
        durationMs: Math.round(performance.now() - askedAt),
        answeredAt: new Date().toISOString(),
      }),
    );
  }

  function handleMapSelect(regionId: string) {
    if (round.status === 'ready') {
      answer(regionId);
    }
  }

  function handleChoice(event: MouseEvent<HTMLButtonElement>) {
    const regionId = event.currentTarget.dataset.choiceId ?? '';
    if (round.status === 'ready' && regionId !== '') {
      answer(regionId);
    }
  }

  function handleNext() {
    const next = goToNextQuestion(round);
    if (isRoundFinished(next)) {
      onFinish(next.attempts);
      return;
    }

    setRound(next);
    setAnsweredRegionId(null);
    setAskedAt(performance.now());
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">{mode.eyebrow}</p>
        <h1 data-testid="exercise-target">
          {question.exerciseType === 'name-region'
            ? 'Регион на карте'
            : labelOf(targetRegion, question.representation)}
        </h1>
        <p className="exercise-progress">
          Вопрос {round.currentIndex + 1} из {round.questions.length} · уровень {level}
        </p>
      </header>
      {showsMap ? (
        <ChinaMap
          regions={regions}
          selectedRegionId={isMapAnswer ? answeredRegionId : question.regionId}
          onSelect={handleMapSelect}
          onClear={() => {}}
          answerStates={answerStates}
          interactive={isMapAnswer}
        />
      ) : null}
      {isMapAnswer ? null : (
        <ul className="choice-list" aria-label="Варианты ответа">
          {choicesByQuestion[round.currentIndex].map((choice) => (
            <li key={choice.id}>
              <button
                type="button"
                data-testid="choice-option"
                data-choice-id={choice.id}
                data-result={resultOf(choice.id, question.regionId, answeredRegionId)}
                disabled={round.status !== 'ready'}
                onClick={handleChoice}
              >
                {question.exerciseType === 'match-capital'
                  ? choice.capitalRu
                  : labelOf(choice, question.representation)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {round.status === 'feedback' ? (
        <AnswerFeedback
          isCorrect={answeredRegionId === question.regionId}
          targetRegion={targetRegion}
          isLastQuestion={isLastQuestion}
          onNext={handleNext}
        />
      ) : null}
      <button type="button" className="secondary" onClick={onExit}>
        Прервать раунд
      </button>
    </main>
  );
}
```

- [ ] **Step 5: Удалить прежние экраны**

```bash
git rm src/features/exercise/FindOnMapExercise.tsx src/features/exercise/FindOnMapExercise.test.tsx src/features/exercise/ChoiceExercise.tsx src/features/exercise/ChoiceExercise.test.tsx
```

- [ ] **Step 6: Проверить и зафиксировать**

```bash
npm test -- src/features/exercise && npm run lint
```

```bash
git add src/features/exercise
git commit -m "refactor: drive every exercise from one round container"
```

---

### Task 5: Выбор уровня и связывание

**Files:**
- Modify: `src/features/topic-selection/TopicSelectionPage.tsx`, `TopicSelectionPage.test.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/styles.css`, `CHANGELOG.md`, `DECISIONS.md`

- [ ] **Step 1: Написать падающие тесты**

Заменить тесты запуска в `src/features/topic-selection/TopicSelectionPage.test.tsx`:

```tsx
it('запускает раунд выбранного режима на первом уровне', () => {
  const start = vi.fn();
  render(<TopicSelectionPage regions={regions} unlockedLevel={1} onStartRound={start} />);

  fireEvent.click(screen.getByRole('button', { name: 'Найти на карте' }));

  expect(start).toHaveBeenCalledWith('find-on-map', 1);
});

it('не предлагает закрытые уровни', () => {
  render(<TopicSelectionPage regions={regions} unlockedLevel={2} onStartRound={() => {}} />);

  expect(screen.getByRole('radio', { name: 'Уровень 2' })).toBeInTheDocument();
  expect(screen.queryByRole('radio', { name: 'Уровень 3' })).toBeNull();
});

it('на четвёртом уровне предлагает один смешанный раунд', () => {
  const start = vi.fn();
  render(<TopicSelectionPage regions={regions} unlockedLevel={4} onStartRound={start} />);

  fireEvent.click(screen.getByRole('radio', { name: 'Уровень 4' }));
  fireEvent.click(screen.getByRole('button', { name: 'Смешанный раунд' }));

  expect(start).toHaveBeenCalledWith('mixed', 4);
});
```

Добавить в `src/App.test.tsx`:

```tsx
it('показывает уровень в ходе раунда', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Найти на карте' }));

  expect(screen.getByText(/уровень 1/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/App.test.tsx src/features/topic-selection/TopicSelectionPage.test.tsx
```

- [ ] **Step 3: Дать выбрать уровень**

Заменить свойства и разметку в `src/features/topic-selection/TopicSelectionPage.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import type { Region } from '../../content/types';
import type { ExerciseType, Level } from '../../domain/round';
import { EXERCISE_MODES } from '../exercise/exercise-modes';

export type RoundRequest = ExerciseType | 'mixed';

type TopicSelectionPageProps = {
  readonly regions: readonly Region[];
  readonly children?: ReactNode;
  readonly unlockedLevel?: Level;
  readonly onStartRound?: (request: RoundRequest, level: Level) => void;
};
```

```tsx
export function TopicSelectionPage({
  regions,
  children,
  unlockedLevel = 1,
  onStartRound,
}: TopicSelectionPageProps) {
  const [level, setLevel] = useState<Level>(1);
  const levels = ([1, 2, 3, 4] as const).filter((value) => value <= unlockedLevel);
```

Внутри заголовка вместо прежнего блока кнопок:

```tsx
        {onStartRound ? (
          <>
            <fieldset className="level-choice">
              <legend>Уровень</legend>
              {levels.map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="level"
                    checked={level === value}
                    onChange={() => setLevel(value)}
                  />
                  Уровень {value}
                </label>
              ))}
            </fieldset>
            <div className="mode-actions">
              {level === 4 ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => onStartRound('mixed', level)}
                >
                  Смешанный раунд
                </button>
              ) : (
                Object.values(EXERCISE_MODES).map((mode) => (
                  <button
                    key={mode.exerciseType}
                    type="button"
                    className="primary"
                    onClick={() => onStartRound(mode.exerciseType, level)}
                  >
                    {mode.title}
                  </button>
                ))
              )}
            </div>
          </>
        ) : null}
```

Добавить в `src/styles.css`:

```css
.level-choice {
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
  padding: 12px 16px;
}

.level-choice legend {
  font-weight: 600;
  padding: 0 4px;
}

.level-choice label {
  align-items: center;
  display: flex;
  gap: 8px;
  min-height: 44px;
}
```

- [ ] **Step 4: Связать в приложении**

В `src/App.tsx` заменить упражнение и запуск раунда:

```tsx
import { ExerciseRound } from './features/exercise/ExerciseRound';
import { ALL_EXERCISE_TYPES } from './features/exercise/exercise-modes';
import type { RoundRequest } from './features/topic-selection/TopicSelectionPage';
import { unlockedLevelFrom } from './domain/progress-rules';
import type { Attempt, ExerciseType, Level } from './domain/round';
```

```tsx
  const [exerciseTypes, setExerciseTypes] = useState<readonly ExerciseType[]>([
    'find-on-map',
  ]);
  const [level, setLevel] = useState<Level>(1);
```

```tsx
  function startRound(pool: readonly Region[], request: RoundRequest, nextLevel: Level) {
    setRoundPool(pool);
    setExerciseTypes(request === 'mixed' ? ALL_EXERCISE_TYPES : [request]);
    setLevel(nextLevel);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('exercise');
  }
```

Прогресс пересчитывает освоенность и уровень при сохранении:

```tsx
  function finishRound(attempts: readonly Attempt[]) {
    const withAttempts = addAttempts(progress, attempts);
    const updated = {
      ...withAttempts,
      masteredRegionIds: masteredRegionIds(withAttempts.attempts, new Date()),
      unlockedLevel: unlockedLevelFrom(withAttempts.attempts),
    };
    setProgress(updated);
    store.write(updated);
    setLastAttempts(attempts);
    setScreen('results');
  }
```

Отрисовка упражнения:

```tsx
  if (screen === 'exercise') {
    return (
      <ExerciseRound
        regions={roundPool}
        exerciseTypes={exerciseTypes}
        level={level}
        roundId={roundId}
        seed={seed}
        onFinish={finishRound}
        onExit={() => setScreen('topic')}
      />
    );
  }
```

Повтор ошибок и новый раунд сохраняют режим и уровень:

```tsx
        onRepeatMistakes={() => {
          const toRepeat = regionIdsToRepeat(progress.attempts, new Date());
          startRound(
            regions.filter((region) => toRepeat.includes(region.id)),
            exerciseTypes.length > 1 ? 'mixed' : exerciseTypes[0],
            level,
          );
        }}
        onNewRound={() =>
          startRound(
            regions,
            exerciseTypes.length > 1 ? 'mixed' : exerciseTypes[0],
            level,
          )
        }
```

Экран темы:

```tsx
    <TopicSelectionPage
      regions={regions}
      unlockedLevel={progress.unlockedLevel}
      onStartRound={(request, nextLevel) => startRound(regions, request, nextLevel)}
    >
```

Дописать импорт `masteredRegionIds` из `./domain/progress-rules`.

- [ ] **Step 5: Записать решение**

В `DECISIONS.md` первой строкой таблицы:

    | 2026-08-03 | Два экрана упражнений сведены в один контейнер раунда | На четвёртом уровне типы заданий чередуются внутри раунда (EXERCISES.md), поэтому вид вопроса должен меняться от вопроса к вопросу. Заодно ушло дублирование логики раунда, одинаковое в обоих прежних экранах. |

- [ ] **Step 6: Проверить и зафиксировать**

```bash
npm test && npm run lint && npm run build
```

Добавить в `CHANGELOG.md` в `### Added`:

    - Добавлены четыре уровня сложности: русское название, китайское, пиньинь или столица и смешанный раунд; уровень открывается после 80% точности за два последних раунда.

```bash
git add -A
git commit -m "feat: add difficulty levels"
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

Пройти несколько вопросов на первом уровне, убедиться, что подпись уровня видна. Проверить, что закрытые уровни не предлагаются. Через хранилище задать историю с двумя удачными раундами и убедиться, что второй уровень открылся, а вопросы задаются китайскими названиями.

- [ ] **Step 3: Проверить объём ветки**

```bash
git status --short
git log --oneline master..HEAD
git diff --name-only master...HEAD
```

## Plan self-review

| Требование | Задача |
| --- | --- |
| Уровни 1–3: представление вопроса | 1, 2 |
| Уровень 4: чередование типов заданий | 2, 4 |
| Вопрос не показывает свой ответ | 1, 2 |
| Разблокировка по 80% за два раунда | 3, 5 |
| Освоенность и уровень пишутся в прогресс | 5 |
| Выбор уровня в интерфейсе | 5 |

Режим учителя и аудит доступности не входят — это следующий инкремент.
