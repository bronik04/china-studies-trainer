# «Расставить по порядку» и пять групп режимов — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Пятая игра по истории — имена династий кладутся на ленту времени — и раздел режимов, разложенный на пять групп вместо четырёх.

**Architecture:** Раунд-расстановка — отдельный вид раунда со своим доменом `order-round.ts` и своим экраном `OrderRound.tsx`, по образцу «Заполнить карту»: расширять `round.ts` нельзя, там действует инвариант «на вопрос отвечают один раз», а здесь на одно имя приходится до трёх попыток. Наружу раунд отдаёт обычные `Attempt` с целью `history:<id>`, поэтому итоги, освоенность и повтор ошибок работают тем же путём, что у остальных игр по династиям, — экран итогов не трогаем вовсе. Лента здесь — поле для ответа: полосы безымянны и нажимаются, имена лежат карточками под ней.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Testing Library. Новых зависимостей нет.

**Область.** Это **шаг 3 из трёх** в `docs/superpowers/specs/2026-08-28-dynasty-modes-design.md` — разделы 7 и 8 спека, последний. Шаги 1 и 2 слиты (`efcc941`, `e479221`): исход на ленте, ответ нажатием, игра по годам, справочники столиц и правителей и две игры на них. После этого плана спек закрыт целиком.

**Решения владельца продукта (2026-08-28).**

- Игра «Расставить по порядку» входит в набор.
- Имена кладутся **на ленту**, а не выстраиваются в строку.
- Уточнение исполнителя, принятое при исполнении шага 2: кладём на **целую** ленту, а не в вырезанные проёмы. Проём выдавал бы длину династии, то есть половину ответа; на целой ленте выбор идёт из двенадцати мест, и пропорция остаётся честной.

## Global Constraints

- Интерфейс, задания, подписи и ошибки — на русском; китайские названия в Unicode, не только пиньинем.
- Смысл не несёт один только цвет: исход постановки виден заливкой, обводкой и подписью.
- Цвета, размеры и длительности — только из `src/design/tokens.css`.
- Цель нажатия — 44 px (`--target-min`); у полос ленты она уже считается `hitAreas`.
- Имя полосы для клавиатуры и читалки — **срок**, никогда не имя династии: имя и есть ответ.
- Перетаскивания нет: оно недоступно с клавиатуры и плохо живёт на касании. Выбор-и-постановка работает одинаково мышью, пальцем и с клавиатуры.
- Домен не вызывает `Math.random`: генератор передаётся снаружи.
- Во время раунда сетевых запросов нет.
- Новые иероглифы в `src` требуют `npm run generate:fonts`.
- Полная проверка — `npm run build`, `npm test`, `npm run lint`. Каждая задача заканчивается коммитом. Ветка — `feat/dynasty-order`, создаётся от `master`.

## Карта файлов

| Файл | Ответственность |
| --- | --- |
| `src/domain/order-round.ts` | **новый**: круги, попытки, исходы, `Attempt` наружу |
| `src/domain/order-round.test.ts` | **новый** |
| `src/features/exercise/OrderRound.tsx` | **новый**: экран расстановки |
| `src/features/exercise/OrderRound.test.tsx` | **новый** |
| `src/features/exercise/DynastyTimeline.tsx` | метка `taken` — полоса занята чужим именем |
| `src/screens.ts` | ленивая загрузка нового экрана |
| `src/features/exercise/exercise-modes.ts` | карточка 序, группы `history` и `culture` |
| `src/features/home/HomePage.tsx` | пять групп вместо четырёх |
| `src/App.tsx` | запуск раунда-расстановки и его итоги |
| `src/styles.css` | карточки имён, выбранное имя, занятая полоса |
| `DECISIONS.md`, `CHANGELOG.md`, `EXERCISES.md` | запись решения и изменения |

---

### Task 1: Домен раунда-расстановки

**Files:**
- Create: `src/domain/order-round.ts`
- Test: `src/domain/order-round.test.ts`

**Interfaces:**
- Consumes: `Dynasty` из `../content/types`, `shuffle` из `./random`, `historyTarget` и `Attempt` из `./round`.
- Produces:
  ```ts
  export const MAX_ATTEMPTS_PER_NAME = 3;
  export const CIRCLE_SIZE = 4;

  export type PlacementOutcome = 'first-try' | 'second-try' | 'failed';

  export type OrderRound = {
    readonly roundId: string;
    readonly language: QuestionLanguage;
    /** Круги по четыре имени: порядок имён внутри круга перемешан. */
    readonly circles: readonly (readonly string[])[];
    readonly currentCircle: number;
    /** Имена круга, которые ещё не поставлены. */
    readonly pending: readonly string[];
    readonly usedAttempts: number;
    readonly outcomes: Readonly<Record<string, PlacementOutcome>>;
    readonly attempts: readonly Attempt[];
  };

  export type OrderMove =
    | { readonly kind: 'retry'; readonly attemptsLeft: 1 | 2 }
    | {
        readonly kind: 'placed';
        readonly dynastyId: string;
        readonly outcome: PlacementOutcome;
        readonly wasFound: boolean;
      };

  export function createOrderRound(
    dynasties: readonly Dynasty[],
    options: { roundId: string; language: QuestionLanguage; random: () => number },
  ): OrderRound;

  export function placeName(
    round: OrderRound,
    input: {
      readonly nameId: string;
      readonly bandId: string;
      readonly durationMs: number;
      readonly answeredAt: string;
    },
  ): { readonly round: OrderRound; readonly move: OrderMove };

  export function isOrderRoundFinished(round: OrderRound): boolean;
  ```

- [ ] **Step 1: Написать падающий тест**

Создать `src/domain/order-round.test.ts`:

```ts
import { expect, it } from 'vitest';
import { dynasties } from '../content/dynasties';
import { createSeededRandom } from './random';
import {
  createOrderRound,
  isOrderRoundFinished,
  MAX_ATTEMPTS_PER_NAME,
  placeName,
  type OrderRound,
} from './order-round';

function newRound(seed = 1): OrderRound {
  return createOrderRound(dynasties, {
    roundId: 'round-1',
    language: 'ru',
    random: createSeededRandom(seed),
  });
}

const AT = '2026-08-28T10:00:00.000Z';

it('делит ленту на круги по четыре имени', () => {
  const round = newRound();

  expect(round.circles.flat()).toHaveLength(dynasties.length);
  expect(round.circles[0]).toHaveLength(4);
  expect(new Set(round.circles.flat()).size).toBe(dynasties.length);
});

it('верная постановка закрывает имя и пишет попытку', () => {
  const round = newRound();
  const nameId = round.pending[0];

  const { round: next, move } = placeName(round, {
    nameId,
    bandId: nameId,
    durationMs: 1000,
    answeredAt: AT,
  });

  expect(move).toEqual({
    kind: 'placed',
    dynastyId: nameId,
    outcome: 'first-try',
    wasFound: true,
  });
  expect(next.pending).not.toContain(nameId);
  expect(next.attempts).toHaveLength(1);
  expect(next.attempts[0].target).toEqual({ kind: 'history', id: nameId });
  expect(next.attempts[0].isCorrect).toBe(true);
});

/* Промах, пока попытки есть: имя возвращается в набор, попытка списывается. */
it('ошибка возвращает имя в набор', () => {
  const round = newRound();
  const nameId = round.pending[0];
  const wrongBand = dynasties.find((dynasty) => dynasty.id !== nameId)!.id;

  const { round: next, move } = placeName(round, {
    nameId,
    bandId: wrongBand,
    durationMs: 1000,
    answeredAt: AT,
  });

  expect(move).toEqual({ kind: 'retry', attemptsLeft: 2 });
  expect(next.pending).toContain(nameId);
  expect(next.usedAttempts).toBe(1);
  expect(next.attempts).toHaveLength(0);
});

/* На третьей ошибке имя ставится само и помечается несданным. */
it('после трёх ошибок имя ставится само', () => {
  let round = newRound();
  const nameId = round.pending[0];
  const wrongBand = dynasties.find((dynasty) => dynasty.id !== nameId)!.id;

  let move;
  for (let index = 0; index < MAX_ATTEMPTS_PER_NAME; index += 1) {
    ({ round, move } = placeName(round, {
      nameId,
      bandId: wrongBand,
      durationMs: 500,
      answeredAt: AT,
    }));
  }

  expect(move).toEqual({
    kind: 'placed',
    dynastyId: nameId,
    outcome: 'failed',
    wasFound: false,
  });
  expect(round.outcomes[nameId]).toBe('failed');
  expect(round.attempts[0].isCorrect).toBe(false);
});

/* «Освоил» значит «взял с первой»: вторая попытка попадает в повтор. */
it('верный ответ со второй попытки не считается освоенным', () => {
  let round = newRound();
  const nameId = round.pending[0];
  const wrongBand = dynasties.find((dynasty) => dynasty.id !== nameId)!.id;

  ({ round } = placeName(round, {
    nameId,
    bandId: wrongBand,
    durationMs: 500,
    answeredAt: AT,
  }));
  const { round: next } = placeName(round, {
    nameId,
    bandId: nameId,
    durationMs: 500,
    answeredAt: AT,
  });

  expect(next.outcomes[nameId]).toBe('second-try');
  expect(next.attempts[0].isCorrect).toBe(false);
});

it('пустой круг открывает следующий, а последний заканчивает раунд', () => {
  let round = newRound();

  while (!isOrderRoundFinished(round)) {
    const nameId = round.pending[0];
    ({ round } = placeName(round, {
      nameId,
      bandId: nameId,
      durationMs: 100,
      answeredAt: AT,
    }));
  }

  expect(round.attempts).toHaveLength(dynasties.length);
  expect(round.currentCircle).toBe(round.circles.length);
});

it('раунд повторяется по сиду', () => {
  expect(newRound(7).circles).toEqual(newRound(7).circles);
});

it('постановка имени не из набора — ошибка', () => {
  const round = newRound();
  const outsider = round.circles[1][0];

  expect(() =>
    placeName(round, {
      nameId: outsider,
      bandId: outsider,
      durationMs: 100,
      answeredAt: AT,
    }),
  ).toThrow(/не в этом круге/);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/domain/order-round.test.ts`
Expected: FAIL — модуля `order-round` нет.

- [ ] **Step 3: Написать домен**

Создать `src/domain/order-round.ts`:

```ts
import type { Dynasty } from '../content/types';
import type { QuestionLanguage } from './question-language';
import { shuffle } from './random';
import { historyTarget, type Attempt } from './round';

/**
 * Раунд-расстановка: имена династий кладутся на ленту времени.
 *
 * Отдельный модуль, а не расширение `round.ts`: там действует инвариант
 * «повторный ответ на вопрос запрещён», а здесь на одно имя приходится до трёх
 * попыток. Тот же довод, по которому отдельно живёт `fill-round.ts`, и то же
 * устройство: попытки, исход на имя, обычные `Attempt` наружу.
 *
 * Наружу раунд отдаёт цели `history:<id>` — те же, что у остальных игр по
 * династиям. Поэтому освоенность, экран итогов и повтор ошибок работают без
 * единой правки.
 */

export const MAX_ATTEMPTS_PER_NAME = 3;

/**
 * Четыре имени в круге, а не шесть и не двенадцать: карточки должны помещаться
 * в строку на узком экране, а двенадцать имён разом превратили бы игру в
 * перебор.
 */
export const CIRCLE_SIZE = 4;

export type PlacementOutcome = 'first-try' | 'second-try' | 'failed';

export type OrderRound = {
  readonly roundId: string;
  readonly language: QuestionLanguage;
  readonly circles: readonly (readonly string[])[];
  readonly currentCircle: number;
  readonly pending: readonly string[];
  readonly usedAttempts: number;
  readonly outcomes: Readonly<Record<string, PlacementOutcome>>;
  readonly attempts: readonly Attempt[];
};

export type OrderMove =
  | { readonly kind: 'retry'; readonly attemptsLeft: 1 | 2 }
  | {
      readonly kind: 'placed';
      readonly dynastyId: string;
      readonly outcome: PlacementOutcome;
      /** Ложь — попытки кончились, имя поставили за ученика. */
      readonly wasFound: boolean;
    };

export type OrderRoundOptions = {
  readonly roundId: string;
  readonly language: QuestionLanguage;
  readonly random: () => number;
};

export function createOrderRound(
  dynasties: readonly Dynasty[],
  options: OrderRoundOptions,
): OrderRound {
  if (dynasties.length === 0) {
    throw new Error('Раунд не создан: нет династий');
  }

  const order = shuffle([...dynasties], options.random).map(
    (dynasty) => dynasty.id,
  );
  const circles: string[][] = [];
  for (let index = 0; index < order.length; index += CIRCLE_SIZE) {
    circles.push(order.slice(index, index + CIRCLE_SIZE));
  }

  return {
    roundId: options.roundId,
    language: options.language,
    circles,
    currentCircle: 0,
    pending: circles[0],
    usedAttempts: 0,
    outcomes: {},
    attempts: [],
  };
}

export function isOrderRoundFinished(round: OrderRound): boolean {
  return round.currentCircle >= round.circles.length;
}

function outcomeFor(usedAttempts: number): PlacementOutcome {
  if (usedAttempts === 0) {
    return 'first-try';
  }

  return usedAttempts === 1 ? 'second-try' : 'failed';
}

export type OrderPlacement = {
  readonly nameId: string;
  readonly bandId: string;
  readonly durationMs: number;
  readonly answeredAt: string;
};

export function placeName(
  round: OrderRound,
  input: OrderPlacement,
): { readonly round: OrderRound; readonly move: OrderMove } {
  if (isOrderRoundFinished(round)) {
    throw new Error('Раунд завершён: ставить некуда');
  }

  if (!round.pending.includes(input.nameId)) {
    throw new Error(`Имя ${input.nameId} не в этом круге`);
  }

  const isCorrect = input.nameId === input.bandId;
  const isLastAttempt = round.usedAttempts >= MAX_ATTEMPTS_PER_NAME - 1;

  if (!isCorrect && !isLastAttempt) {
    const attemptsLeft = (MAX_ATTEMPTS_PER_NAME -
      round.usedAttempts -
      1) as 1 | 2;

    return {
      round: { ...round, usedAttempts: round.usedAttempts + 1 },
      move: { kind: 'retry', attemptsLeft },
    };
  }

  const outcome = isCorrect ? outcomeFor(round.usedAttempts) : 'failed';
  const attempt: Attempt = {
    questionId: `${round.roundId}-${input.nameId}`,
    roundId: round.roundId,
    target: historyTarget(input.nameId),
    exerciseType: 'match-pair',
    language: round.language,
    /* «Освоил» значит «берёт с первой». Ответ со второй попадает в повтор. */
    isCorrect: outcome === 'first-try',
    durationMs: input.durationMs,
    answeredAt: input.answeredAt,
  };

  const pending = round.pending.filter((id) => id !== input.nameId);
  const circleDone = pending.length === 0;

  return {
    round: {
      ...round,
      currentCircle: circleDone ? round.currentCircle + 1 : round.currentCircle,
      pending: circleDone
        ? (round.circles[round.currentCircle + 1] ?? [])
        : pending,
      usedAttempts: 0,
      outcomes: { ...round.outcomes, [input.nameId]: outcome },
      attempts: [...round.attempts, attempt],
    },
    move: { kind: 'placed', dynastyId: input.nameId, outcome, wasFound: isCorrect },
  };
}
```

- [ ] **Step 4: Прогнать тесты**

Run: `npx vitest run src/domain/order-round.test.ts`
Expected: PASS (8 тестов).

- [ ] **Step 5: Коммит**

```bash
git add src/domain/order-round.ts src/domain/order-round.test.ts
git commit -m "feat: домен раунда-расстановки династий"
```

---

### Task 2: Полоса, занятая чужим именем

Пока имя не поставлено, полоса свободна; поставленное имя занимает свою полосу и больше не участвует. Это надо показать, иначе ученик будет целиться в уже закрытое место.

**Files:**
- Modify: `src/features/exercise/DynastyTimeline.tsx`
- Modify: `src/styles.css`
- Test: `src/features/exercise/DynastyTimeline.test.tsx`

**Interfaces:**
- Consumes: `TimelineMark` из шага 1.
- Produces: `TimelineMark.kind` получает четвёртое значение `'taken'`; занятая полоса не принимает нажатия.

- [ ] **Step 1: Написать падающий тест**

В `src/features/exercise/DynastyTimeline.test.tsx` добавить:

```tsx
/*
 * В расстановке поставленное имя занимает свою полосу: она подписана и больше
 * не принимает нажатия — целиться в закрытое место незачем.
 */
it('занятая полоса подписана и не нажимается', () => {
  const onAnswer = vi.fn();
  render(
    <DynastyTimeline
      dynasties={dynasties}
      marks={[{ dynastyId: 'tang', kind: 'taken' }]}
      showsNames={false}
      onAnswer={onAnswer}
    />,
  );

  expect(spanOf('tang').dataset.mark).toBe('taken');
  expect(screen.getByText('Тан')).toBeInTheDocument();

  const tang = dynasties.find((dynasty) => dynasty.id === 'tang')!;
  fireEvent.click(screen.getByRole('button', { name: spanLabel(tang) }));

  expect(onAnswer).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/DynastyTimeline.test.tsx -t 'занятая'`
Expected: FAIL — `'taken'` не входит в тип метки.

- [ ] **Step 3: Четвёртое значение метки**

В `src/features/exercise/DynastyTimeline.tsx`:

```tsx
export type TimelineMark = {
  readonly dynastyId: string;
  /**
   * `correct` и `wrong` — исход ответа. `asked` — «вот эта династия», её
   * показывают в играх, где спрашивают не о времени. `taken` — полоса занята
   * уже поставленным именем: она подписана и нажатий не принимает.
   */
  readonly kind: 'correct' | 'wrong' | 'asked' | 'taken';
};
```

Подпись показывается и у занятой полосы:

```tsx
          const isAsked = mark === 'asked' || mark === 'taken';
```

Кнопка занятой полосы выключается:

```tsx
              <button
                key={hit.id}
                type="button"
                className="timeline-hit"
                data-hit-dynasty-id={hit.id}
                disabled={markOf(hit.id) === 'taken'}
```

`disabled`, а не «молча не отвечает»: выключенная кнопка выпадает из обхода
клавиатурой сама, и читалка экрана называет её недоступной.

- [ ] **Step 4: Стиль**

В `src/styles.css` рядом с прочими метками:

```css
/*
 * Занятая полоса: заливка нефритом, как у верного ответа, но приглушённая
 * обводка — исход уже показан, и повторять его в полную силу незачем.
 */
.timeline-span[data-mark='taken'] {
  background: var(--timeline-span-correct);
  box-shadow: 0 0 0 1px var(--timeline-span-outline);
}

.timeline-hit:disabled {
  cursor: default;
}
```

Подпись занятой полосы набирается тем же правилом, что и спрошенной:

```css
.timeline-name[data-mark='correct'],
.timeline-name[data-mark='asked'],
.timeline-name[data-mark='taken'] {
```

- [ ] **Step 5: Прогнать тесты**

Run: `npx vitest run src/features/exercise/DynastyTimeline.test.tsx`
Expected: PASS.

- [ ] **Step 6: Коммит**

```bash
git add src/features/exercise/DynastyTimeline.tsx src/features/exercise/DynastyTimeline.test.tsx src/styles.css
git commit -m "feat: занятая полоса ленты подписана и не нажимается"
```

---

### Task 3: Экран расстановки

**Files:**
- Create: `src/features/exercise/OrderRound.tsx`
- Test: `src/features/exercise/OrderRound.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `createOrderRound`, `placeName`, `isOrderRoundFinished`, `MAX_ATTEMPTS_PER_NAME` из задачи 1; лента с `onAnswer` и метками из задачи 2; `RoundStage`.
- Produces:
  ```ts
  export type OrderRoundProps = {
    readonly dynasties?: readonly Dynasty[];
    readonly language: QuestionLanguage;
    readonly roundId: string;
    readonly seed: number;
    readonly onFinish: (attempts: readonly Attempt[]) => void;
    readonly onExit: () => void;
  };
  ```
  `onFinish` отдаёт обычные попытки — тот же признак, что у `HistoryRound`, поэтому `App` ведёт итоги старым путём.

- [ ] **Step 1: Написать падающий тест**

Создать `src/features/exercise/OrderRound.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { dynasties, spanLabel } from '../../content/dynasties';
import { OrderRound } from './OrderRound';

function renderRound(seed = 1) {
  const onFinish = vi.fn();
  const onExit = vi.fn();

  render(
    <OrderRound
      language="ru"
      roundId="round-1"
      seed={seed}
      onFinish={onFinish}
      onExit={onExit}
    />,
  );

  return { onFinish, onExit };
}

/** Карточка имени под лентой. */
function tile(name: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) });
}

/** Полоса-цель на ленте: она названа сроком, а не именем. */
function band(dynastyId: string): HTMLElement {
  const dynasty = dynasties.find((item) => item.id === dynastyId)!;
  const timeline = document.querySelector('.dynasty-timeline') as HTMLElement;

  return within(timeline).getByRole('button', { name: spanLabel(dynasty) });
}

/** Имена первого круга: их четыре, и порядок задаёт сид. */
function pendingNames(): string[] {
  return [...document.querySelectorAll('.order-tile')].map(
    (node) => node.textContent?.split(/\\s/)[0] ?? '',
  );
}

it('под лентой лежат четыре имени, а лента безымянна', () => {
  renderRound();

  expect(document.querySelectorAll('.order-tile')).toHaveLength(4);
  expect(document.querySelectorAll('.timeline-name')).toHaveLength(0);
});

it('имя ставится выбором карточки и нажатием по полосе', () => {
  renderRound();

  const name = pendingNames()[0];
  const dynasty = dynasties.find((item) => item.nameRu === name)!;

  fireEvent.click(tile(name));
  fireEvent.click(band(dynasty.id));

  expect(document.querySelectorAll('.order-tile')).toHaveLength(3);
  expect(
    document.querySelector(`[data-dynasty-id='${dynasty.id}']`),
  ).toHaveAttribute('data-mark', 'taken');
});

/* Пока имя не выбрано, лента ничего не делает: класть нечего. */
it('нажатие по ленте без выбранного имени ничего не ставит', () => {
  renderRound();

  const dynasty = dynasties.find(
    (item) => item.nameRu === pendingNames()[0],
  )!;
  fireEvent.click(band(dynasty.id));

  expect(document.querySelectorAll('.order-tile')).toHaveLength(4);
});

it('ошибка возвращает имя в набор и говорит, сколько попыток осталось', () => {
  renderRound();

  const name = pendingNames()[0];
  const dynasty = dynasties.find((item) => item.nameRu === name)!;
  const wrong = dynasties.find((item) => item.id !== dynasty.id)!;

  fireEvent.click(tile(name));
  fireEvent.click(band(wrong.id));

  expect(document.querySelectorAll('.order-tile')).toHaveLength(4);
  expect(screen.getByText(/Осталось попыток: 2/)).toBeInTheDocument();
});

it('выбранная карточка помечена для читалки экрана', () => {
  renderRound();

  const name = pendingNames()[0];
  fireEvent.click(tile(name));

  expect(tile(name)).toHaveAttribute('aria-pressed', 'true');
});

it('раунд заканчивается попытками по всем династиям', () => {
  const { onFinish } = renderRound();

  for (let index = 0; index < dynasties.length; index += 1) {
    const name = pendingNames()[0];
    const dynasty = dynasties.find((item) => item.nameRu === name)!;
    fireEvent.click(tile(name));
    fireEvent.click(band(dynasty.id));
  }

  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(onFinish.mock.calls[0][0]).toHaveLength(dynasties.length);
  expect(onFinish.mock.calls[0][0][0].target.kind).toBe('history');
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/OrderRound.test.tsx`
Expected: FAIL — экрана нет.

- [ ] **Step 3: Написать экран**

Создать `src/features/exercise/OrderRound.tsx`:

```tsx
import { useState } from 'react';
import { dynasties as allDynasties } from '../../content/dynasties';
import type { Dynasty } from '../../content/types';
import {
  createOrderRound,
  isOrderRoundFinished,
  MAX_ATTEMPTS_PER_NAME,
  placeName,
  type OrderMove,
  type OrderRound as OrderRoundState,
} from '../../domain/order-round';
import type { QuestionLanguage } from '../../domain/question-language';
import { createSeededRandom } from '../../domain/random';
import type { Attempt } from '../../domain/round';
import { DynastyTimeline, type TimelineMark } from './DynastyTimeline';
import { RoundStage } from './RoundStage';

/*
 * Часы раунда живут в модуле, а не в теле компонента: `performance.now`
 * нечист, и проверка чистоты React считает его вызов внутри компонента вызовом
 * во время отрисовки. Тот же приём в остальных играх.
 */
function startClock(): number {
  return performance.now();
}

export type OrderRoundProps = {
  readonly dynasties?: readonly Dynasty[];
  readonly language: QuestionLanguage;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (attempts: readonly Attempt[]) => void;
  readonly onExit: () => void;
};

/**
 * «Расставить по порядку»: имена династий кладутся на ленту времени.
 *
 * Кладут на целую ленту, а не в вырезанные проёмы: проём выдавал бы длину
 * династии, то есть половину ответа, а на целой ленте выбор идёт из двенадцати
 * мест и пропорция остаётся честной (уточнение к решению владельца продукта,
 * DECISIONS.md, 2026-08-28).
 *
 * Ход в два нажатия: выбрать имя, нажать полосу. Перетаскивания нет — оно
 * недоступно с клавиатуры и плохо живёт на касании, а два нажатия работают
 * одинаково мышью, пальцем и с клавиатуры.
 */
export function OrderRound({
  dynasties = allDynasties,
  language,
  roundId,
  seed,
  onFinish,
  onExit,
}: OrderRoundProps) {
  const [round, setRound] = useState<OrderRoundState>(() =>
    createOrderRound(dynasties, {
      roundId,
      language,
      random: createSeededRandom(seed),
    }),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [move, setMove] = useState<OrderMove | null>(null);
  const [startedAt] = useState(startClock);
  const [askedAt, setAskedAt] = useState(startClock);

  const nameOf = (dynastyId: string) =>
    allDynasties.find((dynasty) => dynasty.id === dynastyId)?.nameRu ?? '';

  /* Поставленные имена занимают свои полосы: их видно и нажимать нельзя. */
  const marks: readonly TimelineMark[] = Object.keys(round.outcomes).map(
    (dynastyId) => ({ dynastyId, kind: 'taken' }),
  );

  function place(bandId: string) {
    if (selectedId === null) {
      return;
    }

    const result = placeName(round, {
      nameId: selectedId,
      bandId,
      durationMs: Math.round(startClock() - askedAt),
      answeredAt: new Date().toISOString(),
    });

    setRound(result.round);
    setMove(result.move);

    if (result.move.kind === 'placed') {
      setSelectedId(null);
      setAskedAt(startClock());
    }

    if (isOrderRoundFinished(result.round)) {
      onFinish(result.round.attempts);
    }
  }

  const attemptsLeft = MAX_ATTEMPTS_PER_NAME - round.usedAttempts;

  const hint =
    move?.kind === 'retry' ? (
      <p className="history-hint">
        Не это место. Осталось попыток: {move.attemptsLeft}.
      </p>
    ) : move?.kind === 'placed' && !move.wasFound ? (
      <p className="history-note">
        {nameOf(move.dynastyId)} стоит здесь — попытки кончились.
      </p>
    ) : (
      <p className="history-hint">
        {selectedId === null
          ? 'Выберите династию, потом нажмите её место на ленте.'
          : `Где на ленте ${nameOf(selectedId)}?`}
      </p>
    );

  return (
    <RoundStage
      prompt={
        <>
          <p className="eyebrow">Расставьте по порядку</p>
          <h1 className="stage-target" data-testid="exercise-target">
            Круг {round.currentCircle + 1} из {round.circles.length}
          </h1>
        </>
      }
      promptState="question"
      startedAt={startedAt}
      progress={
        <p className="exercise-progress">
          Поставлено {Object.keys(round.outcomes).length} из{' '}
          {round.circles.flat().length}
        </p>
      }
      choices={
        <ul className="order-tiles" aria-label="Династии круга">
          {round.pending.map((dynastyId) => (
            <li key={dynastyId}>
              <button
                type="button"
                className="order-tile"
                aria-pressed={selectedId === dynastyId}
                onClick={() =>
                  setSelectedId(selectedId === dynastyId ? null : dynastyId)
                }
              >
                {nameOf(dynastyId)}
              </button>
            </li>
          ))}
        </ul>
      }
      onExit={onExit}
    >
      <div className="history-stage">
        <DynastyTimeline
          dynasties={allDynasties}
          marks={marks}
          showsNames={false}
          onAnswer={place}
          hint={hint}
        />
        <p className="visually-hidden" aria-live="polite">
          {move?.kind === 'placed'
            ? `${nameOf(move.dynastyId)} поставлена`
            : move?.kind === 'retry'
              ? `Не это место, осталось попыток: ${attemptsLeft}`
              : ''}
        </p>
      </div>
    </RoundStage>
  );
}
```

- [ ] **Step 4: Стили карточек**

В `src/styles.css`, рядом с `.stage-choices`:

```css
/*
 * Карточки имён под лентой. Полоса вариантов у этой игры своя: имена не
 * отвечают на вопрос, а ждут, когда их поставят, — поэтому у выбранного имени
 * есть состояние, которого у кнопки варианта не бывает.
 */
.order-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  justify-content: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.order-tile {
  background: var(--surface-raised);
  border: var(--border-hair) solid var(--line-on-ground-strong);
  border-radius: var(--radius-sm);
  color: var(--text-on-ground-strong);
  cursor: pointer;
  font: inherit;
  min-height: var(--target-min);
  padding: var(--s-2) var(--s-4);
}

/* Выбранное имя: не только цвет — рамка становится сплошной и толще. */
.order-tile[aria-pressed='true'] {
  border-color: var(--accent-on-ground);
  border-width: 2px;
  color: var(--accent-on-ground);
  font-weight: var(--t-weight-bold);
}
```

- [ ] **Step 5: Прогнать тесты**

Run: `npx vitest run src/features/exercise/OrderRound.test.tsx`
Expected: PASS (6 тестов).

- [ ] **Step 6: Коммит**

```bash
git add src/features/exercise/OrderRound.tsx src/features/exercise/OrderRound.test.tsx src/styles.css
git commit -m "feat: экран расстановки династий на ленте"
```

---

### Task 4: Запуск игры из главной

**Files:**
- Modify: `src/features/exercise/exercise-modes.ts`
- Modify: `src/screens.ts`
- Modify: `src/App.tsx`
- Modify: `src/features/home/HomePage.tsx`
- Test: `src/features/home/HomePage.test.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `OrderRound` из задачи 3.
- Produces: карточка `history-order` с меткой 序 и `historyKind: 'order'`; экран `order-exercise` в `App`.

- [ ] **Step 1: Написать падающий тест**

В `src/features/home/HomePage.test.tsx`:

```tsx
it('карточка порядка запускает расстановку', () => {
  const { onStartHistoryRound } = renderHome();

  openCard(/Расставить по порядку/);
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));

  expect(onStartHistoryRound).toHaveBeenCalledWith('ru', undefined, 'order');
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/home/HomePage.test.tsx -t 'порядка'`
Expected: FAIL — карточки нет.

- [ ] **Step 3: Карточка режима**

В `src/features/exercise/exercise-modes.ts` расширить признак и добавить карточку:

```ts
      readonly historyKind: 'when' | 'who' | 'capital' | 'ruler' | 'order';
```

```ts
  {
    id: 'history-order',
    kind: 'history',
    historyKind: 'order',
    mark: '序',
    title: 'Расставить по порядку',
    summary:
      'Четыре имени за круг: выбрать династию и нажать её место на ленте времени. Три круга закрывают все двенадцать. На имя три попытки; после третьей оно встанет само.',
    volume: '12 династий · около 6 минут',
    groupId: 'humanities',
  },
```

Группа пока прежняя: разделение на «Историю» и «Культуру» — следующая задача,
и смешивать два изменения в одном коммите незачем.

- [ ] **Step 4: Ленивая загрузка**

В `src/screens.ts` добавить загрузчик в объект `loaders` рядом с прочими
раундами и экспорт следом за `HistoryRound`:

```ts
  order: () => import('./features/exercise/OrderRound'),
```

```ts
export const OrderRound = lazy(() =>
  loaders.order().then((module) => ({ default: module.OrderRound })),
);
```

Список загрузчиков один на оба дела — на `lazy` и на дотягивание в простое:
забытый в нём экран продолжал бы работать, теряя только обещание работать без
сети. Поэтому строка добавляется именно в `loaders`, а не отдельным импортом.

- [ ] **Step 5: Экран в `App`**

В `src/App.tsx`:

- расширить признак: `'when' | 'who' | 'capital' | 'ruler' | 'order'`;
- добавить экран в тип `Screen`: `| 'order-exercise'`;
- в `startHistoryRound` при `kind === 'order'` ставить `setScreen('order-exercise')` вместо `'history-exercise'`;
- отрисовать экран:

```tsx
  if (screen === 'order-exercise') {
    return (
      <AppFrame fillsFrame current={null} onNavigate={navigate}>
        <OrderRound
          dynasties={historyPool}
          language={language}
          roundId={roundId}
          seed={seed}
          onFinish={finishTargetRound}
          onExit={goToModes}
        />
      </AppFrame>
    );
  }
```

`onFinish={finishTargetRound}` — тот же путь, что у прочих игр по династиям:
раунд отдаёт обычные попытки, и экран итогов ведёт себя как всегда.

- [ ] **Step 6: Проверить повтор ошибок**

Повтор запускается `startHistoryRound(language, repeatDynasties)` и берёт вид
из состояния — значит, после расстановки повтор снова будет расстановкой, уже
из ошибочных династий. Убедиться, что круг из одного-двух имён собирается:
`createOrderRound` режет по четыре и на коротком пуле даёт один неполный круг.

Добавить тест в `src/features/exercise/OrderRound.test.tsx`:

```tsx
/* Повтор ошибок даёт пул из двух династий: круг должен собраться неполным. */
it('короткий пул укладывается в один неполный круг', () => {
  const onFinish = vi.fn();
  render(
    <OrderRound
      dynasties={dynasties.slice(0, 2)}
      language="ru"
      roundId="round-2"
      seed={1}
      onFinish={onFinish}
      onExit={vi.fn()}
    />,
  );

  expect(document.querySelectorAll('.order-tile')).toHaveLength(2);
  expect(screen.getByText(/Круг 1 из 1/)).toBeInTheDocument();
});
```

- [ ] **Step 7: Шрифты и полная проверка**

Знак 序 в `src` новый.

Run: `npm run generate:fonts && npm run lint && npm test && npm run build`
Expected: всё зелёное.

- [ ] **Step 8: Проверить в браузере**

Открыть предпросмотр, запустить «Расставить по порядку». Убедиться: под лентой
четыре имени; выбранное имя выделено рамкой; верная постановка закрывает
полосу и подписывает её; ошибка возвращает имя и называет остаток попыток;
с клавиатуры доходят и карточки, и полосы; после третьего круга открывается
экран итогов.

- [ ] **Step 9: Коммит**

```bash
git add src/features/exercise/exercise-modes.ts src/screens.ts src/App.tsx src/features/home/HomePage.tsx src/features/home/HomePage.test.tsx src/features/exercise/OrderRound.test.tsx src/assets/fonts scripts/font-coverage.json
git commit -m "feat: игра «Расставить по порядку»"
```

---

### Task 5: Пять групп режимов

Игр стало пятнадцать. Группа «История и культура» была общей потому, что у
каждой стороны было по одной игре; теперь у истории их пять, и общая полка
перестаёт что-либо объяснять.

**Files:**
- Modify: `src/features/exercise/exercise-modes.ts`
- Test: `src/features/home/HomePage.test.tsx`

**Interfaces:**
- Consumes: ничего.
- Produces: `ModeGroupId` теряет `humanities` и получает `history` и `culture`.

- [ ] **Step 1: Написать падающий тест**

В `src/features/home/HomePage.test.tsx` заменить проверку групп на:

```tsx
it('игры разложены по пяти предметам, и каждая попала ровно в одну группу', () => {
  renderHome();

  const grids = document.querySelectorAll('.mode-card-grid');
  const cards = document.querySelectorAll('.mode-card');

  expect(MODE_GROUPS).toHaveLength(5);
  expect(grids).toHaveLength(MODE_GROUPS.length);
  expect(cards).toHaveLength(MODE_CARDS.length);
  expect(screen.getByRole('heading', { name: 'История' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Культура' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/home/HomePage.test.tsx -t 'пяти предметам'`
Expected: FAIL — групп четыре.

- [ ] **Step 3: Разделить группу**

В `src/features/exercise/exercise-modes.ts`:

```ts
export type ModeGroupId =
  | 'regions'
  | 'cities'
  | 'physical'
  | 'history'
  | 'culture';
```

```ts
  {
    id: 'history',
    title: 'История',
    note: 'двенадцать династий на ленте времени',
  },
  { id: 'culture', title: 'Культура', note: 'снимки коллекций' },
```

и заменить `groupId: 'humanities'` на `'history'` у пяти карточек истории и на
`'culture'` — у карточки «Узнать по фотографии».

Комментарий над `MODE_GROUPS` переписать: он до сих пор объясняет, почему
история и культура стоят вместе, — этого больше нет.

- [ ] **Step 4: Прогнать тесты**

Run: `npm test`
Expected: PASS. Если тест «карточек столько же, сколько в каталоге» считал
группы числом — поправить на `MODE_GROUPS.length`.

- [ ] **Step 5: Проверить в браузере**

Раздел режимов: пять полок, «История» с пятью карточками, «Культура» с одной.
Убедиться, что сетка не рассыпалась на узком экране.

- [ ] **Step 6: Коммит**

```bash
git add src/features/exercise/exercise-modes.ts src/features/home/HomePage.test.tsx
git commit -m "feat: раздел режимов на пять групп — история отдельно от культуры"
```

---

### Task 6: Записать решение и изменение

**Files:**
- Modify: `DECISIONS.md`, `CHANGELOG.md`, `EXERCISES.md`

- [ ] **Step 1: Решение**

Строкой сверху таблицы `DECISIONS.md`:

```
| 2026-08-28 | «Расставить по порядку» — отдельный раунд, имена кладутся на целую ленту | Решение владельца продукта: игра входит в набор, имена кладутся на ленту. Уточнение исполнителя: на целую ленту, а не в вырезанные проёмы — проём выдавал бы длину династии, то есть половину ответа, а на целой выбор идёт из двенадцати мест. Отдельный домен, а не расширение `round.ts`: там действует инвариант «на вопрос отвечают один раз», а здесь на имя приходится до трёх попыток — тот же довод, по которому отдельно живёт заполнение карты. Наружу раунд отдаёт обычные попытки с целью `history:<id>`, поэтому освоенность, итоги и повтор ошибок работают без правок. Ход в два нажатия, а не перетаскиванием: перетаскивание недоступно с клавиатуры и плохо живёт на касании. Круг — четыре имени: карточки должны помещаться в строку на узком экране, а двенадцать разом превратили бы игру в перебор. Заодно раздел режимов разделён на пять групп: пятнадцать игр, и общая полка «История и культура» перестала что-либо объяснять. |
```

- [ ] **Step 2: Изменение**

В `CHANGELOG.md`, в `## [Unreleased]`, раздел `### Added`:

```markdown
- Игра «Расставить по порядку»: четыре имени за круг, три круга на всю ленту.
  Выбрать династию, нажать её место — перетаскивания нет, ход работает
  одинаково мышью, пальцем и с клавиатуры. На имя три попытки; после третьей
  оно встаёт само и помечается несданным.
```

И в `### Changed`:

```markdown
- Раздел режимов разложен на пять групп: «История» отделена от «Культуры».
  Общей полкой они стояли, пока у каждой было по одной игре; теперь у истории
  их пять.
```

- [ ] **Step 3: Описание игры**

В `EXERCISES.md`, в раздел «Игры по династиям», дописать:

```markdown
«Расставить по порядку» — отдельный вид раунда: один экран, несколько решений.
Под лентой лежат четыре имени, лента безымянна; выбираете династию и нажимаете
её место. Кладут на целую ленту, а не в вырезанные проёмы: проём выдавал бы
длину династии, то есть половину ответа. На имя три попытки, после третьей оно
встаёт само и попадает в повтор. Три круга закрывают все двенадцать династий.
```

- [ ] **Step 4: Полная проверка и коммит**

Run: `npm run lint && npm test && npm run build`

```bash
git add DECISIONS.md CHANGELOG.md EXERCISES.md
git commit -m "docs: расстановка династий и пять групп режимов"
```

---

## Проверка плана на спек

| Раздел спека | Задача |
| --- | --- |
| §7 Расставить по порядку (домен) | 1 |
| §7 Расставить по порядку (лента) | 2 |
| §7 Расставить по порядку (экран) | 3, 4 |
| §8 Раздел режимов на пять групп | 5 |
| §9 Проверки | тесты в задачах 1–5 |
| §1–§6 | шаги 1 и 2, слиты |

После этого плана спек `2026-08-28-dynasty-modes-design.md` закрыт целиком.
