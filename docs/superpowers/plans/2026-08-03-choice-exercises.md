# Choice Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить два оставшихся упражнения — «назови регион» и «регион — столица» — и дать выбрать режим на экране темы.

**Architecture:** Оба упражнения устроены одинаково: вопрос и четыре варианта. Поэтому строится одна чистая функция подбора вариантов и один экран, настраиваемый описанием режима. Движок раунда, карта, обратная связь и итоги не меняются, кроме неинтерактивного режима карты для подсветки.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Testing Library, ESLint, CSS.

## Global Constraints

- Интерфейс — на русском; китайские названия — в Unicode.
- Четыре варианта: правильный ровно один раз, три отвлекающих, порядок случайный и воспроизводимый по seed.
- Отвлекающие берутся из того же типа региона, а если их не хватает — из остальных (EXERCISES.md).
- Раунд по-прежнему включает все регионы темы, каждый ровно один раз.
- Уровень только первый; варианты — русские названия и русские названия столиц. Уровни 2–4 не входят.
- Вопрос завершается после первой попытки; второй ответ до перехода невозможен.
- Обратная связь и итоги переиспользуются как есть.
- Работа в ветке `feat/choice-exercises`.
- Не входит: сопоставление пар перетаскиванием, уровни сложности, режим учителя.

## Решение по режиму «регион — столица»

SPEC.md разрешает два исполнения: «подобрать пары **либо** выбрать столицу для региона». Берётся второе. Оно ложится на готовый движок, где вопрос приходится на один регион, и само выполняет требование EXERCISES.md «итог записывается по каждой паре, не только по упражнению целиком». Запрет «пары с самой собой» при таком исполнении невозможен по построению: варианты — только столицы, регион выбрать нельзя. Сопоставление перетаскиванием остаётся возможным дополнением и записывается в ROADMAP.md.

---

## File structure

| Файл | Назначение |
| --- | --- |
| `src/domain/choices.ts` | Подбор четырёх вариантов |
| `src/domain/choices.test.ts` | Тесты подбора |
| `src/map/ChinaMap.tsx` | Неинтерактивный режим карты |
| `src/features/exercise/ChoiceExercise.tsx` | Экран упражнения с вариантами |
| `src/features/exercise/ChoiceExercise.test.tsx` | Тесты экрана |
| `src/features/exercise/exercise-modes.ts` | Описания трёх режимов |
| `src/features/topic-selection/TopicSelectionPage.tsx` | Выбор режима |
| `src/App.tsx` | Связывание |
| `CHANGELOG.md`, `DECISIONS.md`, `ROADMAP.md` | Документы |

---

### Task 1: Подбор вариантов

**Files:**
- Create: `src/domain/choices.ts`, `src/domain/choices.test.ts`

**Interfaces:**
- Produces:

```ts
export const CHOICE_COUNT = 4;
export function buildChoices(
  regions: readonly Region[],
  targetRegionId: string,
  random: () => number,
): readonly Region[];
```

- [ ] **Step 1: Создать ветку**

```bash
git switch -c feat/choice-exercises
```

- [ ] **Step 2: Написать падающие тесты**

Создать `src/domain/choices.test.ts`:

```ts
import { regions } from '../content/regions';
import { buildChoices, CHOICE_COUNT } from './choices';
import { createSeededRandom } from './random';

it('даёт ровно четыре варианта', () => {
  const choices = buildChoices(regions, 'sichuan', createSeededRandom(1));

  expect(choices).toHaveLength(CHOICE_COUNT);
});

it('включает правильный вариант ровно один раз', () => {
  const choices = buildChoices(regions, 'sichuan', createSeededRandom(1));

  expect(choices.filter((region) => region.id === 'sichuan')).toHaveLength(1);
});

it('не повторяет варианты', () => {
  const choices = buildChoices(regions, 'sichuan', createSeededRandom(1));

  expect(new Set(choices.map((region) => region.id)).size).toBe(CHOICE_COUNT);
});

it('предпочитает отвлекающие варианты того же типа региона', () => {
  const choices = buildChoices(regions, 'sichuan', createSeededRandom(1));

  expect(choices.every((region) => region.kind === 'province')).toBe(true);
});

it('добирает варианты из других типов, когда своих не хватает', () => {
  const choices = buildChoices(regions, 'macao', createSeededRandom(1));

  expect(choices).toHaveLength(CHOICE_COUNT);
  expect(choices.map((region) => region.id)).toContain('macao');
});

it('даёт один и тот же набор и порядок при одном seed', () => {
  expect(buildChoices(regions, 'sichuan', createSeededRandom(5))).toEqual(
    buildChoices(regions, 'sichuan', createSeededRandom(5)),
  );
});

it('ставит правильный вариант на разные места при разных seed', () => {
  const positions = new Set(
    [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
      buildChoices(regions, 'sichuan', createSeededRandom(seed)).findIndex(
        (region) => region.id === 'sichuan',
      ),
    ),
  );

  expect(positions.size).toBeGreaterThan(1);
});

it('не строит варианты для неизвестного региона', () => {
  expect(() => buildChoices(regions, 'atlantis', createSeededRandom(1))).toThrow(
    /Неизвестный регион: atlantis/,
  );
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

```bash
npm test -- src/domain/choices.test.ts
```

Ожидается: FAIL — модуля нет.

- [ ] **Step 4: Реализовать**

Создать `src/domain/choices.ts`:

```ts
import type { Region } from '../content/types';
import { shuffle } from './random';

export const CHOICE_COUNT = 4;

/**
 * Четыре варианта: правильный и три отвлекающих. Отвлекающие берутся из
 * того же типа региона — так они правдоподобны (EXERCISES.md); если своих
 * не хватает, набор добирается из остальных. Порядок случаен, поэтому
 * позиция правильного варианта не подсказывает ответ.
 */
export function buildChoices(
  regions: readonly Region[],
  targetRegionId: string,
  random: () => number,
): readonly Region[] {
  const target = regions.find((region) => region.id === targetRegionId);
  if (!target) {
    throw new Error(`Неизвестный регион: ${targetRegionId}`);
  }

  const others = regions.filter((region) => region.id !== target.id);
  const sameKind = shuffle(
    others.filter((region) => region.kind === target.kind),
    random,
  );
  const otherKind = shuffle(
    others.filter((region) => region.kind !== target.kind),
    random,
  );

  const distractors = [...sameKind, ...otherKind].slice(0, CHOICE_COUNT - 1);

  return shuffle([target, ...distractors], random);
}
```

- [ ] **Step 5: Проверить и зафиксировать**

```bash
npm test -- src/domain/choices.test.ts && npm run lint
```

Ожидается: PASS.

```bash
git add src/domain/choices.ts src/domain/choices.test.ts
git commit -m "feat: build plausible answer choices"
```

---

### Task 2: Неинтерактивный режим карты

В «назови регион» карта показывает загаданную область, но выбирать на ней нечего: ответ даётся вариантами. Оставлять 34 области в порядке обхода клавиатурой и кликабельными — ложная цель.

**Files:**
- Modify: `src/map/ChinaMap.tsx`, `src/map/ChinaMap.test.tsx`

**Interfaces:**
- Produces: `ChinaMap` получает `interactive?: boolean` со значением `true`.

- [ ] **Step 1: Написать падающие тесты**

Добавить в `src/map/ChinaMap.test.tsx`:

```tsx
it('в неинтерактивном режиме не выбирает область', () => {
  const select = vi.fn();
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={select}
      onClear={() => {}}
      interactive={false}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Сычуань, 四川省' }));

  expect(select).not.toHaveBeenCalled();
});

it('в неинтерактивном режиме убирает области из обхода клавиатурой', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={() => {}}
      onClear={() => {}}
      interactive={false}
    />,
  );

  expect(document.querySelector('#sichuan')).toHaveAttribute('tabindex', '-1');
  expect(screen.getByRole('button', { name: 'Сычуань (四川省)' })).toBeDisabled();
});

it('в неинтерактивном режиме всё равно подсвечивает выбранное', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={() => {}}
      onClear={() => {}}
      interactive={false}
    />,
  );

  expect(document.querySelector('#sichuan')).toHaveAttribute(
    'data-selected',
    'true',
  );
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/map/ChinaMap.test.tsx
```

Ожидается: FAIL — свойства нет.

- [ ] **Step 3: Реализовать**

В `src/map/ChinaMap.tsx` добавить свойство в тип и параметры:

```tsx
  readonly answerStates?: Readonly<Record<string, AnswerState>>;
  readonly interactive?: boolean;
};
```

```tsx
  answerStates = NO_ANSWER_STATES,
  interactive = true,
}: ChinaMapProps) {
```

В эффекте задать порядок обхода клавиатурой:

```tsx
      area.setAttribute('tabindex', interactive ? '0' : '-1');
```

Дописать `interactive` в зависимости эффекта:

```tsx
  }, [answerStates, interactive, regions, selectedRegionId, zoom]);
```

Учесть режим в правиле выбираемости:

```tsx
  function isSelectable(regionId: string): boolean {
    return interactive && answerStates[regionId] === undefined;
  }
```

- [ ] **Step 4: Проверить и зафиксировать**

```bash
npm test -- src/map/ChinaMap.test.tsx && npm run lint
```

Ожидается: PASS.

```bash
git add src/map/ChinaMap.tsx src/map/ChinaMap.test.tsx
git commit -m "feat: add a highlight-only map mode"
```

---

### Task 3: Экран упражнения с вариантами

**Files:**
- Create: `src/features/exercise/exercise-modes.ts`, `src/features/exercise/ChoiceExercise.tsx`, `src/features/exercise/ChoiceExercise.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces:

```ts
export type ExerciseMode = {
  readonly exerciseType: ExerciseType;
  readonly title: string;
  readonly eyebrow: string;
  readonly showsMap: boolean;
  readonly promptOf: (region: Region) => string;
  readonly optionOf: (region: Region) => string;
};
export const EXERCISE_MODES: Readonly<Record<ExerciseType, ExerciseMode>>;

export type ChoiceExerciseProps = {
  readonly regions: readonly Region[];
  readonly mode: ExerciseMode;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};
```

- [ ] **Step 1: Описать режимы**

Создать `src/features/exercise/exercise-modes.ts`:

```ts
import type { Region } from '../../content/types';
import type { ExerciseType } from '../../domain/round';

export type ExerciseMode = {
  readonly exerciseType: ExerciseType;
  readonly title: string;
  readonly eyebrow: string;
  readonly showsMap: boolean;
  readonly promptOf: (region: Region) => string;
  readonly optionOf: (region: Region) => string;
};

export const EXERCISE_MODES: Readonly<Record<ExerciseType, ExerciseMode>> = {
  'find-on-map': {
    exerciseType: 'find-on-map',
    title: 'Найти на карте',
    eyebrow: 'Найдите на карте',
    showsMap: true,
    promptOf: (region) => region.nameRu,
    optionOf: (region) => region.nameRu,
  },
  'name-region': {
    exerciseType: 'name-region',
    title: 'Назвать регион',
    eyebrow: 'Какой регион подсвечен',
    showsMap: true,
    promptOf: () => 'Регион на карте',
    optionOf: (region) => region.nameRu,
  },
  'match-capital': {
    exerciseType: 'match-capital',
    title: 'Регион — столица',
    eyebrow: 'Выберите административный центр',
    showsMap: false,
    promptOf: (region) => region.nameRu,
    optionOf: (region) => region.capitalRu,
  },
};
```

- [ ] **Step 2: Написать падающие тесты**

Создать `src/features/exercise/ChoiceExercise.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import type { Region } from '../../content/types';
import { ChoiceExercise } from './ChoiceExercise';
import { EXERCISE_MODES } from './exercise-modes';

const SHORT_POOL = regions.slice(0, 3);

function renderExercise(
  mode = EXERCISE_MODES['match-capital'],
  onFinish = () => {},
  pool: readonly Region[] = regions,
) {
  render(
    <ChoiceExercise
      regions={pool}
      mode={mode}
      roundId="round-1"
      seed={1}
      onFinish={onFinish}
      onExit={() => {}}
    />,
  );
}

function options(): HTMLElement[] {
  return screen.getAllByTestId('choice-option');
}

function askedRegion(): Region {
  const asked = screen.getByTestId('exercise-target').textContent;

  return regions.find((region) => region.nameRu === asked)!;
}

it('показывает прогресс и четыре варианта', () => {
  renderExercise();

  expect(screen.getByText('Вопрос 1 из 34')).toBeInTheDocument();
  expect(options()).toHaveLength(4);
});

it('среди вариантов есть правильная столица ровно один раз', () => {
  renderExercise();
  const target = askedRegion();

  const matching = options().filter(
    (option) => option.textContent === target.capitalRu,
  );

  expect(matching).toHaveLength(1);
});

it('подтверждает верный ответ', () => {
  renderExercise();
  const target = askedRegion();

  fireEvent.click(
    options().find((option) => option.textContent === target.capitalRu)!,
  );

  expect(screen.getByRole('heading', { name: 'Верно' })).toBeInTheDocument();
});

it('показывает правильный ответ после ошибки', () => {
  renderExercise();
  const target = askedRegion();

  fireEvent.click(
    options().find((option) => option.textContent !== target.capitalRu)!,
  );

  expect(
    screen.getByRole('heading', { name: 'Этот регион стоит повторить' }),
  ).toBeInTheDocument();
});

it('не принимает второй ответ на тот же вопрос', () => {
  renderExercise();
  const target = askedRegion();

  fireEvent.click(
    options().find((option) => option.textContent === target.capitalRu)!,
  );

  expect(options().every((option) => option.hasAttribute('disabled'))).toBe(true);
});

it('в режиме «назови регион» подсвечивает область на карте', () => {
  renderExercise(EXERCISE_MODES['name-region']);
  const target = askedRegion();

  expect(document.querySelector(`#${target.id}`)).toHaveAttribute(
    'data-selected',
    'true',
  );
});

it('сообщает о завершении раунда', () => {
  const finish = vi.fn();
  renderExercise(EXERCISE_MODES['match-capital'], finish, SHORT_POOL);

  for (let index = 0; index < SHORT_POOL.length; index += 1) {
    const asked = screen.getByTestId('exercise-target').textContent;
    const target = regions.find((region) => region.nameRu === asked)!;
    fireEvent.click(
      options().find((option) => option.textContent === target.capitalRu)!,
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
npm test -- src/features/exercise/ChoiceExercise.test.tsx
```

Ожидается: FAIL — модуля нет.

- [ ] **Step 4: Реализовать**

Создать `src/features/exercise/ChoiceExercise.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { Region } from '../../content/types';
import { buildChoices } from '../../domain/choices';
import { createSeededRandom } from '../../domain/random';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  type Attempt,
  type Round,
} from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { AnswerFeedback } from './AnswerFeedback';
import type { ExerciseMode } from './exercise-modes';

export type ChoiceExerciseProps = {
  readonly regions: readonly Region[];
  readonly mode: ExerciseMode;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};

export function ChoiceExercise({
  regions,
  mode,
  roundId,
  seed,
  onFinish,
  onExit,
}: ChoiceExerciseProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(regions, {
      roundId,
      exerciseType: mode.exerciseType,
      level: 1,
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
  const choices = choicesByQuestion[round.currentIndex];
  const isLastQuestion = round.currentIndex === round.questions.length - 1;

  function handleAnswer(regionId: string) {
    if (round.status !== 'ready') {
      return;
    }

    setAnsweredRegionId(regionId);
    setRound(
      answerQuestion(round, {
        answeredRegionId: regionId,
        durationMs: Math.round(performance.now() - askedAt),
        answeredAt: new Date().toISOString(),
      }),
    );
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
        <h1 data-testid="exercise-target">{mode.promptOf(targetRegion)}</h1>
        <p className="exercise-progress">
          Вопрос {round.currentIndex + 1} из {round.questions.length}
        </p>
      </header>
      {mode.showsMap ? (
        <ChinaMap
          regions={regions}
          selectedRegionId={question.regionId}
          onSelect={() => {}}
          onClear={() => {}}
          interactive={false}
        />
      ) : null}
      <ul className="choice-list" aria-label="Варианты ответа">
        {choices.map((choice) => (
          <li key={choice.id}>
            <button
              type="button"
              data-testid="choice-option"
              data-result={
                answeredRegionId === null
                  ? undefined
                  : choice.id === question.regionId
                    ? 'correct'
                    : choice.id === answeredRegionId
                      ? 'incorrect'
                      : undefined
              }
              disabled={round.status !== 'ready'}
              onClick={() => handleAnswer(choice.id)}
            >
              {mode.optionOf(choice)}
            </button>
          </li>
        ))}
      </ul>
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

- [ ] **Step 5: Оформить**

Добавить в конец `src/styles.css`:

```css
.choice-list {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
  list-style: none;
  margin: 16px 0;
  padding: 0;
}

@media (min-width: 720px) {
  .choice-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

.choice-list button {
  background: #fffdf8;
  border: 2px solid #d0d5dd;
  border-radius: 8px;
  color: #1f2937;
  cursor: pointer;
  font: inherit;
  min-height: 44px;
  padding: 12px 16px;
  text-align: left;
  width: 100%;
}

.choice-list button:hover:enabled {
  border-color: #175cd3;
}

.choice-list button:focus-visible {
  outline: 3px solid #175cd3;
  outline-offset: 2px;
}

.choice-list button[data-result='correct'] {
  border-color: #087443;
  border-width: 3px;
}

.choice-list button[data-result='incorrect'] {
  border-color: #b42318;
  border-style: dashed;
  border-width: 3px;
}
```

- [ ] **Step 6: Проверить и зафиксировать**

```bash
npm test -- src/features/exercise/ChoiceExercise.test.tsx && npm run lint
```

Ожидается: PASS.

```bash
git add src/features/exercise src/styles.css
git commit -m "feat: add the choice exercise screen"
```

---

### Task 4: Выбор режима и связывание

**Files:**
- Modify: `src/features/topic-selection/TopicSelectionPage.tsx`, `src/features/topic-selection/TopicSelectionPage.test.tsx`, `src/App.tsx`, `src/App.test.tsx`, `CHANGELOG.md`, `DECISIONS.md`, `ROADMAP.md`

- [ ] **Step 1: Написать падающие тесты**

Добавить в `src/features/topic-selection/TopicSelectionPage.test.tsx`:

```tsx
it('предлагает три режима', () => {
  const start = vi.fn();
  render(<TopicSelectionPage regions={regions} onStartRound={start} />);

  fireEvent.click(screen.getByRole('button', { name: 'Регион — столица' }));

  expect(start).toHaveBeenCalledWith('match-capital');
});
```

Заменить в этом файле существующий тест «запускает раунд» на проверку первого режима:

```tsx
it('запускает раунд', () => {
  const start = vi.fn();
  render(<TopicSelectionPage regions={regions} onStartRound={start} />);

  fireEvent.click(screen.getByRole('button', { name: 'Найти на карте' }));

  expect(start).toHaveBeenCalledWith('find-on-map');
});
```

Заменить в `src/App.test.tsx` все нажатия `{ name: 'Начать раунд' }` на `{ name: 'Найти на карте' }`.

Добавить в `src/App.test.tsx`:

```tsx
it('проходит раунд «регион — столица»', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Регион — столица' }));

  expect(screen.getByText('Вопрос 1 из 34')).toBeInTheDocument();
  expect(screen.getAllByTestId('choice-option')).toHaveLength(4);
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/App.test.tsx src/features/topic-selection/TopicSelectionPage.test.tsx
```

Ожидается: FAIL — кнопок режимов нет.

- [ ] **Step 3: Дать выбрать режим на экране темы**

В `src/features/topic-selection/TopicSelectionPage.tsx` заменить тип свойства и кнопку:

```tsx
import { EXERCISE_MODES } from '../exercise/exercise-modes';
import type { ExerciseType } from '../../domain/round';
```

```tsx
type TopicSelectionPageProps = {
  readonly regions: readonly Region[];
  readonly children?: ReactNode;
  readonly onStartRound?: (exerciseType: ExerciseType) => void;
};
```

```tsx
        {onStartRound ? (
          <div className="mode-actions">
            {Object.values(EXERCISE_MODES).map((mode) => (
              <button
                key={mode.exerciseType}
                type="button"
                className="primary"
                onClick={() => onStartRound(mode.exerciseType)}
              >
                {mode.title}
              </button>
            ))}
          </div>
        ) : null}
```

Добавить в конец `src/styles.css`:

```css
.mode-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}
```

- [ ] **Step 4: Связать в приложении**

В `src/App.tsx` добавить состояние режима и выбор компонента:

```tsx
import { ChoiceExercise } from './features/exercise/ChoiceExercise';
import { EXERCISE_MODES } from './features/exercise/exercise-modes';
import type { Attempt, ExerciseType } from './domain/round';
```

```tsx
  const [exerciseType, setExerciseType] = useState<ExerciseType>('find-on-map');
```

```tsx
  function startRound(pool: readonly Region[], type: ExerciseType) {
    setRoundPool(pool);
    setExerciseType(type);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('exercise');
  }
```

Отрисовка упражнения — «найти на карте» остаётся отдельным экраном, остальные два идут через общий:

```tsx
  if (screen === 'exercise') {
    return exerciseType === 'find-on-map' ? (
      <FindOnMapExercise
        regions={roundPool}
        roundId={roundId}
        seed={seed}
        onFinish={finishRound}
        onExit={() => setScreen('topic')}
      />
    ) : (
      <ChoiceExercise
        regions={roundPool}
        mode={EXERCISE_MODES[exerciseType]}
        roundId={roundId}
        seed={seed}
        onFinish={finishRound}
        onExit={() => setScreen('topic')}
      />
    );
  }
```

Повтор ошибок и новый раунд сохраняют режим:

```tsx
        onRepeatMistakes={() => {
          const toRepeat = regionIdsToRepeat(progress.attempts, new Date());
          startRound(
            regions.filter((region) => toRepeat.includes(region.id)),
            exerciseType,
          );
        }}
        onNewRound={() => startRound(regions, exerciseType)}
```

```tsx
    <TopicSelectionPage
      regions={regions}
      onStartRound={(type) => startRound(regions, type)}
    >
```

- [ ] **Step 5: Записать решения**

В `DECISIONS.md` первой строкой таблицы:

    | 2026-08-03 | «Регион — столица» реализован как выбор столицы, а не перетаскивание пар | SPEC.md разрешает оба исполнения. Выбор столицы ложится на движок, где вопрос приходится на один регион, и сам выполняет требование записывать итог по каждой паре. Сопоставление перетаскиванием записано в ROADMAP.md. |

В `ROADMAP.md` в «Этап 2 — учебное расширение» дописать:

    Сопоставление пар перетаскиванием как второе исполнение режима «регион — столица»: сейчас он реализован выбором столицы из четырёх вариантов.

- [ ] **Step 6: Проверить и зафиксировать**

```bash
npm test && npm run lint && npm run build
```

Ожидается: PASS.

Добавить в `CHANGELOG.md` в `### Added`:

    - Добавлены упражнения «назвать регион» и «регион — столица»; режим выбирается на экране темы.

```bash
git add src/App.tsx src/App.test.tsx src/features src/styles.css CHANGELOG.md DECISIONS.md ROADMAP.md
git commit -m "feat: add naming and capital exercises"
```

---

### Task 5: Контроль качества

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

Пройти по несколько вопросов в каждом режиме. Убедиться: в «назвать регион» карта подсвечивает загаданную область и не принимает нажатий; варианты правдоподобны и не повторяются; после ответа верный вариант обведён сплошной рамкой, неверный — штриховой; повторный ответ невозможен; «Прервать раунд» возвращает к теме.

- [ ] **Step 3: Проверить объём ветки**

```bash
git status --short
git log --oneline master..HEAD
git diff --name-only master...HEAD
```

## Plan self-review

| Требование | Задача |
| --- | --- |
| Четыре уникальных правдоподобных варианта, случайный порядок | 1 |
| Отвлекающие того же типа региона | 1 |
| Карта подсвечивает область в «назови регион» | 2, 3 |
| Вопрос завершается после первой попытки | 3 |
| Итог по каждой паре «регион — столица» | 3 |
| Выбор режима | 4 |
| Повтор ошибок сохраняет режим | 4 |

Уровни 2–4 не входят, поэтому варианты всегда на русском. Сопоставление перетаскиванием отложено в ROADMAP.md.
