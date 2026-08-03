# Find-on-Map Exercise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Первое настоящее упражнение: ученик проходит раунд по всем 34 регионам, находя названный регион на карте и получая обратную связь после каждого ответа.

**Architecture:** Движок раунда и карта уже готовы и не меняются. Добавляется чистая функция, переводящая ответ в состояния областей карты, компонент обратной связи и экран упражнения, который связывает их с движком. Приложение получает переключение между темой и упражнением через состояние — без маршрутизатора.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Testing Library, ESLint, CSS.

## Global Constraints

- Интерфейс и сообщения — на русском; китайские названия — в Unicode.
- Раунд включает все 34 региона, каждый ровно один раз (решение от 2026-08-03).
- Вопрос завершается после первой попытки; второй ответ до перехода невозможен.
- После неверного ответа правильная область не скрывается, а подсвечивается.
- Обратная связь несёт: верно/неверно, правильный ответ, одну связь с материалом и действие «Далее». Смысл не только цветом — есть текст и значок.
- После ответа фокус переходит на заголовок обратной связи (UI_UX.md).
- Уровень только первый — русское название. Уровни 2–4 не входят.
- Никаких сетевых запросов; никакого сохранения прогресса.
- Палитра DESIGN_SYSTEM.md: успех `#087443`, ошибка `#B42318`, фокус `#175CD3`, текст `#1F2937`.
- Работа в ветке `feat/find-on-map-exercise`, слияние — после проверок.
- Не входит: экран итогов с точностью и временем, повтор ошибок, сохранение прогресса, два других упражнения, уровни сложности. Это следующие инкременты.

## Решения по данным

`Region.facts` пуст у всех 34 записей, поэтому «короткая связь с материалом» берётся из административного центра — это проверенные данные с источником в `docs/sources`. Выдуманных справок не добавляется.

`Attempt` не хранит, какую область выбрал ученик: в `DATA_MODEL.md` поле `regionId` — это загаданный регион. Выбранная область нужна только для показа обратной связи, поэтому живёт в состоянии экрана, а не в домене.

---

## File structure

| Файл | Назначение |
| --- | --- |
| `src/features/exercise/answer-states.ts` | Перевод ответа в состояния областей карты |
| `src/features/exercise/answer-states.test.ts` | Тесты чистой функции |
| `src/features/exercise/AnswerFeedback.tsx` | Компонент результата вопроса |
| `src/features/exercise/AnswerFeedback.test.tsx` | Тесты обратной связи |
| `src/features/exercise/FindOnMapExercise.tsx` | Экран упражнения |
| `src/features/exercise/FindOnMapExercise.test.tsx` | Тесты прохождения раунда |
| `src/App.tsx`, `src/App.test.tsx` | Переключение темы и упражнения |
| `src/features/topic-selection/TopicSelectionPage.tsx` | Кнопка запуска раунда |
| `src/styles.css` | Оформление упражнения и обратной связи |
| `CHANGELOG.md` | Запись изменений |

---

### Task 1: Состояния карты по ответу

**Files:**
- Create: `src/features/exercise/answer-states.ts`, `src/features/exercise/answer-states.test.ts`

**Interfaces:**
- Consumes: `AnswerState` из `src/map/ChinaMap.tsx`, `Region` из `src/content/types.ts`
- Produces:

```ts
export function answerStatesFor(
  regions: readonly Region[],
  targetRegionId: string,
  answeredRegionId: string | null,
): Readonly<Record<string, AnswerState>>;
```

- [ ] **Step 1: Создать ветку**

```bash
git switch -c feat/find-on-map-exercise
```

- [ ] **Step 2: Написать падающие тесты**

Создать `src/features/exercise/answer-states.test.ts`:

```ts
import { regions } from '../../content/regions';
import { answerStatesFor } from './answer-states';

it('до ответа не ограничивает выбор', () => {
  expect(answerStatesFor(regions, 'sichuan', null)).toEqual({});
});

it('подсвечивает загаданный регион как верный', () => {
  const states = answerStatesFor(regions, 'sichuan', 'sichuan');

  expect(states.sichuan).toBe('correct');
});

it('отмечает неверный выбор и всё равно показывает правильный', () => {
  const states = answerStatesFor(regions, 'sichuan', 'yunnan');

  expect(states.yunnan).toBe('incorrect');
  expect(states.sichuan).toBe('correct');
});

it('закрывает остальные области после ответа', () => {
  const states = answerStatesFor(regions, 'sichuan', 'yunnan');

  expect(states.hebei).toBe('disabled');
  expect(Object.keys(states)).toHaveLength(34);
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

```bash
npm test -- src/features/exercise/answer-states.test.ts
```

Ожидается: FAIL — модуля не существует.

- [ ] **Step 4: Реализовать**

Создать `src/features/exercise/answer-states.ts`:

```ts
import type { Region } from '../../content/types';
import type { AnswerState } from '../../map/ChinaMap';

/**
 * После ответа остальные области закрываются: второй ответ на вопрос
 * запрещён (SPEC.md), и запрет должен быть виден в интерфейсе, а не только
 * отклоняться движком. Правильная область подсвечивается всегда, в том
 * числе после ошибки.
 */
export function answerStatesFor(
  regions: readonly Region[],
  targetRegionId: string,
  answeredRegionId: string | null,
): Readonly<Record<string, AnswerState>> {
  if (answeredRegionId === null) {
    return {};
  }

  const states: Record<string, AnswerState> = {};
  for (const region of regions) {
    states[region.id] = 'disabled';
  }

  if (answeredRegionId !== targetRegionId) {
    states[answeredRegionId] = 'incorrect';
  }

  states[targetRegionId] = 'correct';

  return states;
}
```

- [ ] **Step 5: Проверить и зафиксировать**

```bash
npm test -- src/features/exercise/answer-states.test.ts && npm run lint
```

Ожидается: PASS.

```bash
git add src/features/exercise/answer-states.ts src/features/exercise/answer-states.test.ts
git commit -m "feat: map an answer to map area states"
```

---

### Task 2: Компонент обратной связи

**Files:**
- Create: `src/features/exercise/AnswerFeedback.tsx`, `src/features/exercise/AnswerFeedback.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces:

```ts
export type AnswerFeedbackProps = {
  readonly isCorrect: boolean;
  readonly targetRegion: Region;
  readonly isLastQuestion: boolean;
  readonly onNext: () => void;
};
```

- [ ] **Step 1: Написать падающие тесты**

Создать `src/features/exercise/AnswerFeedback.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import { AnswerFeedback } from './AnswerFeedback';

const sichuan = regions.find((region) => region.id === 'sichuan')!;

it('сообщает о верном ответе и показывает связь с материалом', () => {
  render(
    <AnswerFeedback
      isCorrect
      targetRegion={sichuan}
      isLastQuestion={false}
      onNext={() => {}}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Верно' })).toBeInTheDocument();
  expect(screen.getByText(/Сычуань/)).toBeInTheDocument();
  expect(screen.getByText(/Чэнду/)).toBeInTheDocument();
});

it('поддерживает при ошибке и называет правильный ответ', () => {
  render(
    <AnswerFeedback
      isCorrect={false}
      targetRegion={sichuan}
      isLastQuestion={false}
      onNext={() => {}}
    />,
  );

  expect(
    screen.getByRole('heading', { name: 'Этот регион стоит повторить' }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Сычуань/)).toBeInTheDocument();
});

it('передаёт результат не только цветом', () => {
  render(
    <AnswerFeedback
      isCorrect
      targetRegion={sichuan}
      isLastQuestion={false}
      onNext={() => {}}
    />,
  );

  expect(screen.getByRole('img', { name: 'Верно' })).toBeInTheDocument();
});

it('называет последнее действие раунда', () => {
  render(
    <AnswerFeedback
      isCorrect
      targetRegion={sichuan}
      isLastQuestion
      onNext={() => {}}
    />,
  );

  expect(screen.getByRole('button', { name: 'Завершить раунд' })).toBeInTheDocument();
});

it('переходит к следующему вопросу', () => {
  const next = vi.fn();
  render(
    <AnswerFeedback
      isCorrect
      targetRegion={sichuan}
      isLastQuestion={false}
      onNext={next}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));

  expect(next).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/features/exercise/AnswerFeedback.test.tsx
```

Ожидается: FAIL — модуля не существует.

- [ ] **Step 3: Реализовать**

Создать `src/features/exercise/AnswerFeedback.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import type { Region } from '../../content/types';

export type AnswerFeedbackProps = {
  readonly isCorrect: boolean;
  readonly targetRegion: Region;
  readonly isLastQuestion: boolean;
  readonly onNext: () => void;
};

/**
 * Результат вопроса: значок, заголовок и пояснение. Тон поддерживающий —
 * вместо «Ты ошибся» говорится, что регион стоит повторить (UI_UX.md).
 * Фокус переводится на заголовок, чтобы результат был объявлен и доступен
 * с клавиатуры.
 */
export function AnswerFeedback({
  isCorrect,
  targetRegion,
  isLastQuestion,
  onNext,
}: AnswerFeedbackProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [targetRegion.id]);

  const title = isCorrect ? 'Верно' : 'Этот регион стоит повторить';

  return (
    <section
      className="answer-feedback"
      data-result={isCorrect ? 'correct' : 'incorrect'}
      aria-labelledby="answer-feedback-heading"
    >
      <p className="answer-feedback-icon" role="img" aria-label={title}>
        {isCorrect ? '✓' : '↻'}
      </p>
      <h3 id="answer-feedback-heading" ref={headingRef} tabIndex={-1}>
        {title}
      </h3>
      <p>
        Правильный ответ: {targetRegion.nameRu}{' '}
        <span lang="zh-Hans">{targetRegion.nameZh}</span>.
      </p>
      <p>
        Административный центр: {targetRegion.capitalRu}{' '}
        <span lang="zh-Hans">({targetRegion.capitalZh})</span>.
      </p>
      <button type="button" className="primary" onClick={onNext}>
        {isLastQuestion ? 'Завершить раунд' : 'Далее'}
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Оформить**

Добавить в конец `src/styles.css`:

```css
.answer-feedback {
  border: 2px solid #d0d5dd;
  border-radius: 8px;
  margin: 16px 0;
  padding: 16px;
}

.answer-feedback[data-result='correct'] {
  border-color: #087443;
}

.answer-feedback[data-result='incorrect'] {
  border-color: #b42318;
  border-style: dashed;
}

.answer-feedback-icon {
  font-size: 24px;
  line-height: 1;
  margin: 0 0 8px;
}

.answer-feedback[data-result='correct'] .answer-feedback-icon {
  color: #087443;
}

.answer-feedback[data-result='incorrect'] .answer-feedback-icon {
  color: #b42318;
}

.answer-feedback h3 {
  margin: 0 0 8px;
}

.answer-feedback h3:focus-visible {
  outline: 3px solid #175cd3;
  outline-offset: 2px;
}
```

- [ ] **Step 5: Проверить и зафиксировать**

```bash
npm test -- src/features/exercise/AnswerFeedback.test.tsx && npm run lint
```

Ожидается: PASS.

```bash
git add src/features/exercise/AnswerFeedback.tsx src/features/exercise/AnswerFeedback.test.tsx src/styles.css
git commit -m "feat: add question feedback"
```

---

### Task 3: Экран упражнения

**Files:**
- Create: `src/features/exercise/FindOnMapExercise.tsx`, `src/features/exercise/FindOnMapExercise.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `createRound`, `currentQuestion`, `answerQuestion`, `goToNextQuestion`, `isRoundFinished` из `src/domain/round.ts`; `answerStatesFor`; `AnswerFeedback`; `ChinaMap`
- Produces:

```ts
export type FindOnMapExerciseProps = {
  readonly regions: readonly Region[];
  readonly seed: number;
  readonly onFinish: () => void;
  readonly onExit: () => void;
};
```

- [ ] **Step 1: Написать падающие тесты**

Создать `src/features/exercise/FindOnMapExercise.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import { FindOnMapExercise } from './FindOnMapExercise';

function renderExercise(onFinish = () => {}) {
  render(
    <FindOnMapExercise
      regions={regions}
      seed={1}
      onFinish={onFinish}
      onExit={() => {}}
    />,
  );
}

function askedRegionName(): string {
  return screen.getByTestId('exercise-target').textContent ?? '';
}

function answer(correct: boolean): void {
  const asked = askedRegionName();
  const target = regions.find((region) => region.nameRu === asked)!;
  const chosen = correct
    ? target
    : regions.find((region) => region.id !== target.id)!;

  fireEvent.click(
    screen.getByRole('button', {
      name: `${chosen.nameRu} (${chosen.nameZh})`,
    }),
  );
}

it('показывает прогресс по всем регионам', () => {
  renderExercise();

  expect(screen.getByText('Вопрос 1 из 34')).toBeInTheDocument();
});

it('называет искомый регион', () => {
  renderExercise();

  expect(regions.map((region) => region.nameRu)).toContain(askedRegionName());
});

it('подтверждает верный ответ', () => {
  renderExercise();

  answer(true);

  expect(screen.getByRole('heading', { name: 'Верно' })).toBeInTheDocument();
});

it('показывает правильный ответ после ошибки', () => {
  renderExercise();
  const asked = askedRegionName();

  answer(false);

  expect(
    screen.getByRole('heading', { name: 'Этот регион стоит повторить' }),
  ).toBeInTheDocument();
  expect(screen.getByText(new RegExp(asked))).toBeInTheDocument();
});

it('не принимает второй ответ на тот же вопрос', () => {
  renderExercise();

  answer(true);

  expect(screen.getByText('Вопрос 1 из 34')).toBeInTheDocument();
});

it('переходит ко второму вопросу', () => {
  renderExercise();

  answer(true);
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));

  expect(screen.getByText('Вопрос 2 из 34')).toBeInTheDocument();
});

it('сообщает о завершении раунда', () => {
  const finish = vi.fn();
  renderExercise(finish);

  for (let i = 0; i < 34; i += 1) {
    answer(true);
    fireEvent.click(
      screen.getByRole('button', { name: i === 33 ? 'Завершить раунд' : 'Далее' }),
    );
  }

  expect(finish).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/features/exercise/FindOnMapExercise.test.tsx
```

Ожидается: FAIL — модуля не существует.

- [ ] **Step 3: Реализовать**

Создать `src/features/exercise/FindOnMapExercise.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { Region } from '../../content/types';
import { createSeededRandom } from '../../domain/random';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  type Round,
} from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import type { MapZoom } from '../../map/MapControls';
import { AnswerFeedback } from './AnswerFeedback';
import { answerStatesFor } from './answer-states';

export type FindOnMapExerciseProps = {
  readonly regions: readonly Region[];
  readonly seed: number;
  readonly onFinish: () => void;
  readonly onExit: () => void;
};

export function FindOnMapExercise({
  regions,
  seed,
  onFinish,
  onExit,
}: FindOnMapExerciseProps) {
  const [round, setRound] = useState<Round>(() =>
    createRound(regions, {
      exerciseType: 'find-on-map',
      level: 1,
      random: createSeededRandom(seed),
    }),
  );
  const [answeredRegionId, setAnsweredRegionId] = useState<string | null>(null);
  const [askedAt, setAskedAt] = useState(() => performance.now());
  const [zoom, setZoom] = useState<MapZoom>(1);

  const question = currentQuestion(round);
  const targetRegion = regions.find((region) => region.id === question.regionId)!;
  const isLastQuestion = round.currentIndex === round.questions.length - 1;

  const answerStates = useMemo(
    () => answerStatesFor(regions, question.regionId, answeredRegionId),
    [regions, question.regionId, answeredRegionId],
  );

  function handleSelect(regionId: string) {
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
      onFinish();
      return;
    }

    setRound(next);
    setAnsweredRegionId(null);
    setAskedAt(performance.now());
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Найдите на карте</p>
        <h1 data-testid="exercise-target">{targetRegion.nameRu}</h1>
        <p className="exercise-progress">
          Вопрос {round.currentIndex + 1} из {round.questions.length}
        </p>
      </header>
      <ChinaMap
        regions={regions}
        selectedRegionId={answeredRegionId}
        onSelect={handleSelect}
        onClear={() => {}}
        zoom={zoom}
        onZoomChange={setZoom}
        answerStates={answerStates}
      />
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

- [ ] **Step 4: Оформить**

Добавить в конец `src/styles.css`:

```css
.exercise-progress {
  color: #475467;
  font-weight: 600;
}

button.primary {
  background: #b42318;
  border: 2px solid #b42318;
  border-radius: 8px;
  color: #fffdf8;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  min-height: 44px;
  padding: 8px 24px;
}

button.secondary {
  background: transparent;
  border: 2px solid #d0d5dd;
  border-radius: 8px;
  color: #1f2937;
  cursor: pointer;
  font: inherit;
  min-height: 44px;
  padding: 8px 24px;
}

button.primary:focus-visible,
button.secondary:focus-visible {
  outline: 3px solid #175cd3;
  outline-offset: 2px;
}
```

- [ ] **Step 5: Проверить и зафиксировать**

```bash
npm test -- src/features/exercise/FindOnMapExercise.test.tsx && npm run lint
```

Ожидается: PASS.

```bash
git add src/features/exercise/FindOnMapExercise.tsx src/features/exercise/FindOnMapExercise.test.tsx src/styles.css
git commit -m "feat: add the find-on-map exercise"
```

---

### Task 4: Подключение к приложению

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/features/topic-selection/TopicSelectionPage.tsx`, `src/features/topic-selection/TopicSelectionPage.test.tsx`, `CHANGELOG.md`

- [ ] **Step 1: Написать падающие тесты**

Добавить в `src/features/topic-selection/TopicSelectionPage.test.tsx`:

```tsx
it('запускает раунд', () => {
  const start = vi.fn();
  render(<TopicSelectionPage regions={regions} onStartRound={start} />);

  fireEvent.click(screen.getByRole('button', { name: 'Начать раунд' }));

  expect(start).toHaveBeenCalledOnce();
});
```

Дописать импорт `fireEvent` в этот файл, если его нет.

Добавить в `src/App.test.tsx`:

```tsx
it('открывает упражнение и возвращается к теме', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: 'Начать раунд' }));
  expect(screen.getByText('Вопрос 1 из 34')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Прервать раунд' }));
  expect(
    screen.getByRole('heading', { name: 'Провинции и столицы Китая' }),
  ).toBeInTheDocument();
});
```

Дописать импорт `fireEvent` в этот файл, если его нет.

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/App.test.tsx src/features/topic-selection/TopicSelectionPage.test.tsx
```

Ожидается: FAIL — кнопки «Начать раунд» нет.

- [ ] **Step 3: Добавить кнопку на экран темы**

В `src/features/topic-selection/TopicSelectionPage.tsx` расширить свойства:

```tsx
type TopicSelectionPageProps = {
  readonly regions: readonly Region[];
  readonly children?: ReactNode;
  readonly onStartRound?: () => void;
};
```

Принять его в параметрах и добавить кнопку сразу после заголовка:

```tsx
export function TopicSelectionPage({
  regions,
  children,
  onStartRound,
}: TopicSelectionPageProps) {
```

```tsx
        <p>Познакомьтесь с регионами до первого тренировочного раунда.</p>
        {onStartRound ? (
          <button type="button" className="primary" onClick={onStartRound}>
            Начать раунд
          </button>
        ) : null}
```

- [ ] **Step 4: Переключить экраны в приложении**

Заменить `src/App.tsx` целиком:

```tsx
import { useState } from 'react';
import { regions } from './content/regions';
import { FindOnMapExercise } from './features/exercise/FindOnMapExercise';
import { TopicSelectionPage } from './features/topic-selection/TopicSelectionPage';
import { ChinaMap } from './map/ChinaMap';
import type { MapZoom } from './map/MapControls';

type Screen = 'topic' | 'exercise';

export default function App() {
  const [screen, setScreen] = useState<Screen>('topic');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<MapZoom>(1);

  function startRound() {
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setScreen('exercise');
  }

  if (screen === 'exercise') {
    return (
      <FindOnMapExercise
        regions={regions}
        seed={seed}
        onFinish={() => setScreen('topic')}
        onExit={() => setScreen('topic')}
      />
    );
  }

  return (
    <TopicSelectionPage regions={regions} onStartRound={startRound}>
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

- [ ] **Step 5: Проверить и зафиксировать**

```bash
npm test && npm run lint && npm run build
```

Ожидается: PASS.

Добавить в `CHANGELOG.md` в `### Added`:

    - Добавлено упражнение «найди на карте»: раунд по всем 34 регионам с обратной связью после каждого ответа.

```bash
git add src/App.tsx src/App.test.tsx src/features/topic-selection CHANGELOG.md
git commit -m "feat: run a find-on-map round from the topic screen"
```

---

### Task 5: Контроль качества и ручная проверка

- [ ] **Step 1: Прогнать все проверки**

```bash
npm run validate:map
npm run validate:content
npm test
npm run lint
npm run build
git diff --check master...HEAD
```

Ожидается: все с кодом 0.

- [ ] **Step 2: Проверить вручную**

Запустить приложение и убедиться: кнопка «Начать раунд» открывает упражнение; названный регион находится на карте; верный ответ даёт зелёную подсветку и «Верно»; неверный — красную у выбранного и зелёную у правильного; после ответа карта не принимает второй выбор; «Далее» показывает второй вопрос; «Прервать раунд» возвращает к теме.

- [ ] **Step 3: Проверить объём ветки**

```bash
git status --short
git log --oneline master..HEAD
git diff --name-only master...HEAD
```

Ожидается: чистое дерево; изменены только файлы из этого плана.

## Plan self-review

| Требование | Задача |
| --- | --- |
| Вопрос называет регион, ученик выбирает область | 3 |
| Правильная область подсвечивается и после ошибки | 1, 3 |
| Второй ответ до перехода невозможен | 1, 3 |
| Обратная связь: результат, ответ, связь с материалом, «Далее» | 2 |
| Смысл не только цветом | 2 |
| Фокус на заголовке обратной связи | 2 |
| Раунд по всем 34 регионам | 3 |
| Запуск и выход из упражнения | 4 |

Экран итогов, повтор ошибок, сохранение прогресса и уровни сложности в объём не входят — это следующие инкременты.
