# Режим «Заполни карту» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить четвёртый режим упражнения, где раунд — это заполнение всей карты Китая: серый старт, цвет региона показывает, с какой попытки его взяли, без шага «Далее».

**Architecture:** Отдельный доменный модуль `fill-round.ts` рядом с `round.ts` — существующий инвариант «повторный ответ на вопрос запрещён» противоречит трём попыткам, и снимать его ради нового режима значило бы ослабить три работающих. Компонент `ChinaMap` получает необязательный режим отображения: справочный (цвет по типу региона) и игровой (серый плюс исходы). Экран раунда и экран итогов — новые компоненты, три существующих режима не изменяются.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 4 + Testing Library, чистый CSS с токенами.

## Global Constraints

- Спецификация: `docs/superpowers/specs/2026-08-04-fill-the-map-design.md`.
- Комментарии, тексты интерфейса и названия тестов — на русском, как во всём репозитории.
- Цвета, размеры и длительности берутся только из токенов `src/design/tokens.css`. Ни один компонент не пишет hex напрямую.
- Контраст каждой новой пары фиксируется в `src/design/tokens.test.ts`.
- Домен не вызывает `Math.random` и `Date.now` сам: генератор и время приходят снаружи, как в `round.ts`.
- Максимум попыток на регион — 3. Верно с 1-й → `first-try`, со 2-й → `second-try`, с 3-й или не угадал → `failed`.
- Минимальная цель нажатия — токен `--target-min` (44 px).
- После каждой задачи должны проходить: `npx eslint .`, `npx vitest run`, `npm run build`.

---

### Task 1: Токены игровой карты и типов региона

Добавляются только новые токены. Старые `--map-land-*` пока остаются, чтобы существующие стили не сломались — их снимает Task 2.

**Files:**
- Modify: `src/design/tokens.css`
- Modify: `src/design/tokens.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces: CSS-переменные `--map-unplayed`, `--map-first-try`, `--map-second-try`, `--map-failed`, `--map-outcome-ink`, `--map-kind-province`, `--map-kind-autonomous-region`, `--map-kind-municipality`, `--map-kind-sar`.

- [ ] **Step 1: Написать падающий тест**

Добавить в конец `src/design/tokens.test.ts`:

```ts
describe('игровая карта', () => {
  const OUTCOMES = ['--map-first-try', '--map-second-try', '--map-failed'] as const;

  it('граница тушью видна на сером и на каждом исходе', () => {
    expectAtLeast('--map-border', '--map-unplayed', GRAPHIC_CONTRAST);
    for (const outcome of OUTCOMES) {
      expectAtLeast('--map-border', outcome, GRAPHIC_CONTRAST);
    }
  });

  it('граница тушью видна на море: береговую линию держит обводка', () => {
    expectAtLeast('--map-border', '--map-sea', GRAPHIC_CONTRAST);
  });

  it('каждый исход отличим от серого, иначе прогресс не виден', () => {
    for (const outcome of OUTCOMES) {
      expectAtLeast(outcome, '--map-unplayed', GRAPHIC_CONTRAST);
    }
  });

  it('подпись читается поверх любого исхода', () => {
    for (const outcome of OUTCOMES) {
      expectAtLeast('--map-outcome-ink', outcome, TEXT_CONTRAST);
    }
  });

  /*
   * Попарного контраста между тремя исходами здесь нет намеренно: он
   * недостижим. Обводка тушью требует светлоты не ниже 0.118, а серый при
   * 3:1 сверху — не выше 0.153, и все три цвета живут в этой полосе.
   * Различает их узор, см. MapDefs.tsx.
   */
});

describe('справочная карта', () => {
  const KINDS = [
    '--map-kind-province',
    '--map-kind-autonomous-region',
    '--map-kind-municipality',
    '--map-kind-sar',
  ] as const;

  it('граница и подпись тушью видны на каждом типе региона', () => {
    for (const kind of KINDS) {
      expectAtLeast('--map-border', kind, GRAPHIC_CONTRAST);
      expectAtLeast('--map-label', kind, TEXT_CONTRAST);
    }
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/design`
Expected: FAIL, `Error: Нет токена: --map-unplayed`

- [ ] **Step 3: Добавить примитивы**

В `src/design/tokens.css`, в блок примитивов цвета, сразу после группы `--c-land-*`:

```css
  /*
   * Игровая палитра. Окно светлоты узкое и задано двумя требованиями сразу:
   * обводка тушью держит нижнюю границу 0.118, серый при 3:1 сверху — верхнюю
   * 0.153. Все три цвета исхода лежат в этой полосе, поэтому различаются они
   * тоном и узором, а не светлотой.
   */
  --c-grey-unplayed: #c9c5ba;
  --c-jade-500: #356f52;
  --c-amber-700: #8a6212;
  --c-clay-600: #b04036;
```

- [ ] **Step 4: Добавить семантические токены**

В `src/design/tokens.css`, в группу `--- 3. Карта ---`, сразу после `--map-locked`:

```css
  /*
   * Игровая карта: в режиме выбора цвет не должен подсказывать, какой регион
   * перед тобой, поэтому все регионы стартуют одним серым. Цвет появляется
   * только как результат ответа.
   */
  --map-unplayed: var(--c-grey-unplayed);
  --map-first-try: var(--c-jade-500);
  --map-second-try: var(--c-amber-700);
  --map-failed: var(--c-clay-600);
  --map-outcome-ink: var(--c-paper-100);

  /*
   * Справочная карта: цвет означает тип единицы, а не конкретный регион.
   * Поэтому по нему нельзя опознать провинцию и выучить её «по цвету».
   */
  --map-kind-province: var(--c-land-1);
  --map-kind-autonomous-region: var(--c-land-2);
  --map-kind-municipality: var(--c-land-3);
  --map-kind-sar: var(--c-land-4);
```

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/design`
Expected: PASS, все тесты зелёные.

- [ ] **Step 6: Коммит**

```bash
git add src/design/tokens.css src/design/tokens.test.ts
git commit -m "feat(design): токены игровой карты и типов региона"
```

---

### Task 2: Справочная карта по типу региона, удаление раскраски по смежности

После решения красить справочную карту по типу единицы граф смежности не нужен нигде. Мёртвый код удаляется, а не остаётся «на всякий случай».

**Files:**
- Delete: `src/map/region-adjacency.ts`, `src/map/region-adjacency.test.ts`
- Modify: `scripts/generate-region-palette.ts`, `src/map/region-palette.ts` (перегенерируется), `src/map/validate-map.ts`, `src/map/validate-map.test.ts`, `scripts/validate-map.ts`, `src/map/ChinaMap.tsx`, `src/map/ChinaMap.test.tsx`, `src/styles.css`, `src/design/tokens.css`

**Interfaces:**
- Consumes: токены типов из Task 1.
- Produces: `RegionPaletteEntry` без поля `tone`; в разметке карты у каждой области остаётся уже существующий атрибут `data-region-kind`.

- [ ] **Step 1: Написать падающий тест**

В `src/map/ChinaMap.test.tsx` заменить тест `«каждая область карты получает тон заливки»` целиком на:

```tsx
it('справочная карта красит области по типу региона', () => {
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
    />,
  );

  const areas = [...container.querySelectorAll('[data-region-id]')];

  expect(areas).not.toHaveLength(0);
  for (const area of areas) {
    expect(
      area.getAttribute('data-region-kind'),
      area.getAttribute('data-region-id') ?? '',
    ).toMatch(/^(province|autonomous-region|municipality|sar)$/);
  }
  expect(container.querySelector('[data-land-tone]')).toBeNull();
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/map/ChinaMap.test.tsx`
Expected: FAIL на `expect(container.querySelector('[data-land-tone]')).toBeNull()` — атрибут ещё проставляется.

- [ ] **Step 3: Убрать тон из генератора**

В `scripts/generate-region-palette.ts` удалить импорт и вызовы раскраски. Заменить блок от `const adjacency = buildAdjacency(shapes);` до конца файла на:

```ts
const entries = shapes
  .map((shape) => {
    const circle = largestInscribedCircle(shape.rings);

    return {
      id: shape.id,
      x: Number(circle.x.toFixed(1)),
      y: Number(circle.y.toFixed(1)),
      diameter: Number((circle.radius * 2).toFixed(1)),
    };
  })
  .sort((left, right) => left.id.localeCompare(right.id));

const body = entries
  .map(
    (entry) =>
      `  '${entry.id}': { label: [${entry.x}, ${entry.y}], inscribedDiameter: ${entry.diameter} },`,
  )
  .join('\n');

const file = `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: public/maps/china-provinces.svg
 * Генератор: scripts/generate-region-palette.ts
 */

export type RegionPaletteEntry = {
  /** Точка подписи — центр наибольшей вписанной окружности, единицы viewBox. */
  readonly label: readonly [number, number];
  /** Диаметр этой окружности: сколько места реально есть под нажатие. */
  readonly inscribedDiameter: number;
};

export const REGION_PALETTE: Readonly<Record<string, RegionPaletteEntry>> = {
${body}
};
`;

writeFileSync(OUTPUT_FILE, file);
console.info(`Регионов: ${entries.length}.`);
```

Также удалить в начале файла строку импорта:

```ts
import {
  assignLandTones,
  buildAdjacency,
  findToneConflicts,
  type RegionShape,
} from '../src/map/region-adjacency';
```

и заменить тип массива `shapes` на локальный:

```ts
type Shape = {
  readonly id: string;
  readonly rings: ReturnType<typeof parseMapPath>;
};

const shapes: Shape[] = [];
```

Внутри цикла разбора убрать поле `decorative` — оно больше не используется.

- [ ] **Step 4: Перегенерировать палитру и удалить модуль смежности**

```bash
npx tsx scripts/generate-region-palette.ts
rm src/map/region-adjacency.ts src/map/region-adjacency.test.ts
```

Expected: `Регионов: 34.`

- [ ] **Step 5: Убрать проверку тонов**

В `src/map/validate-map.ts` удалить функцию `validateLandTones` целиком и импорт `REGION_PALETTE`, если он больше не используется (импорт `target-size` остаётся).

В `scripts/validate-map.ts` убрать `validateLandTones` из импорта и удалить строку `validateLandTones(regionIds);`.

В `src/map/validate-map.test.ts` удалить тест `«требует тон заливки для каждой области»` и `validateLandTones` из импорта.

- [ ] **Step 6: Убрать проставление тона в компоненте**

В `src/map/ChinaMap.tsx` удалить импорт `REGION_PALETTE` и блок внутри `areas?.forEach`:

```ts
      // Тон заливки считается по геометрии карты: у соседей он не совпадает
      // никогда (см. scripts/generate-region-palette.ts).
      const tone = REGION_PALETTE[area.dataset.regionId ?? '']?.tone;
      if (tone !== undefined) {
        area.dataset.landTone = String(tone);
      }
```

- [ ] **Step 7: Переключить стили на тип региона**

В `src/styles.css` заменить четыре правила `[data-land-tone='N']` и базовую заливку на:

```css
/*
 * Справочная карта красится по типу единицы. Цвет означает тип, а не
 * конкретный регион, поэтому по нему нельзя выучить «Синьцзян охряный» и
 * получить преимущество в игре.
 */
.china-map [data-region-kind='province'] {
  fill: var(--map-kind-province);
}

.china-map [data-region-kind='autonomous-region'] {
  fill: var(--map-kind-autonomous-region);
}

.china-map [data-region-kind='municipality'] {
  fill: var(--map-kind-municipality);
}

.china-map [data-region-kind='sar'] {
  fill: var(--map-kind-sar);
}
```

В правиле `.china-map [data-region-id]` заменить `fill: var(--map-land-1);` на `fill: var(--map-kind-province);`.

В `src/design/tokens.css` удалить четыре строки `--map-land-1` … `--map-land-4`.

В `src/design/tokens.test.ts` заменить содержимое константы `LAND_TONES` на:

```ts
const LAND_TONES = [
  '--map-kind-province',
  '--map-kind-autonomous-region',
  '--map-kind-municipality',
  '--map-kind-sar',
] as const;
```

- [ ] **Step 8: Запустить все проверки**

Run: `npx eslint . && npx vitest run && npm run build`
Expected: lint чисто, все тесты проходят, сборка успешна.

- [ ] **Step 9: Коммит**

```bash
git add -A
git commit -m "feat(map): красить справочную карту по типу региона

Раскраска по графу смежности после этого решения не нужна нигде:
region-adjacency и поле tone удалены, генератор остаётся ради точки
подписи и вписанного диаметра."
```

---

### Task 3: Движок раунда `fill-round.ts`

Чистый домен без React. Пишется полностью по тестам.

**Files:**
- Create: `src/domain/fill-round.ts`, `src/domain/fill-round.test.ts`

**Interfaces:**
- Consumes: `shuffle` из `./random`, `representationsFor` и `Representation` из `./representations`, `Attempt` и `Level` из `./round`, `Region` из `../content/types`.
- Produces:
  - `MAX_ATTEMPTS_PER_REGION = 3`
  - `type RegionOutcome = 'first-try' | 'second-try' | 'failed'`
  - `type FillQuestion = { id, roundId, regionId, representation, level }`
  - `type FillRound = { roundId, level, order, currentIndex, usedAttempts, outcomes, attempts }`
  - `type Move = { kind: 'retry', attemptsLeft: 1 | 2 } | { kind: 'closed', outcome: RegionOutcome, wasFound: boolean }`
  - `createFillRound(regions, { roundId, level, random }): FillRound`
  - `currentTarget(round): FillQuestion`
  - `isFillRoundFinished(round): boolean`
  - `answerFillRound(round, { answeredRegionId, durationMs, answeredAt }): { round: FillRound; move: Move }`
  - `summariseFillRound(round): FillSummary`
  - `type FillSummary = { total, firstTry, secondTry, failed, durationMs, regionIdsToReview }`

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/fill-round.test.ts`:

```ts
import { regions } from '../content/regions';
import { createSeededRandom } from './random';
import {
  answerFillRound,
  createFillRound,
  currentTarget,
  isFillRoundFinished,
  summariseFillRound,
  type FillRound,
} from './fill-round';

function newRound(): FillRound {
  return createFillRound(regions, {
    roundId: 'r1',
    level: 1,
    random: createSeededRandom(1),
  });
}

const INPUT = { durationMs: 1000, answeredAt: '2026-08-04T10:00:00.000Z' };

/** Отвечает верно на текущий регион. */
function answerCorrectly(round: FillRound) {
  return answerFillRound(round, {
    ...INPUT,
    answeredRegionId: currentTarget(round).regionId,
  });
}

/** Отвечает заведомо неверно: берёт любой регион, кроме спрошенного. */
function answerWrongly(round: FillRound) {
  const target = currentTarget(round).regionId;
  const other = regions.find((region) => region.id !== target)!;

  return answerFillRound(round, { ...INPUT, answeredRegionId: other.id });
}

it('спрашивает все 34 региона', () => {
  expect(newRound().order).toHaveLength(34);
});

it('закрашивает зелёным ответ с первой попытки', () => {
  const round = newRound();
  const target = currentTarget(round).regionId;
  const { round: next, move } = answerCorrectly(round);

  expect(move).toEqual({ kind: 'closed', outcome: 'first-try', wasFound: true });
  expect(next.outcomes[target]).toBe('first-try');
});

it('закрашивает жёлтым ответ со второй попытки', () => {
  const round = newRound();
  const target = currentTarget(round).regionId;
  const { round: afterMiss, move: miss } = answerWrongly(round);

  expect(miss).toEqual({ kind: 'retry', attemptsLeft: 2 });

  const { round: next, move } = answerCorrectly(afterMiss);

  expect(move).toEqual({ kind: 'closed', outcome: 'second-try', wasFound: true });
  expect(next.outcomes[target]).toBe('second-try');
});

it('закрашивает красным ответ с третьей попытки', () => {
  let round = newRound();
  const target = currentTarget(round).regionId;
  round = answerWrongly(round).round;
  round = answerWrongly(round).round;
  const { round: next, move } = answerCorrectly(round);

  expect(move).toEqual({ kind: 'closed', outcome: 'failed', wasFound: true });
  expect(next.outcomes[target]).toBe('failed');
});

it('закрашивает красным исчерпанные попытки и помечает, что регион не найден', () => {
  let round = newRound();
  const target = currentTarget(round).regionId;
  round = answerWrongly(round).round;
  round = answerWrongly(round).round;
  const { round: next, move } = answerWrongly(round);

  expect(move).toEqual({ kind: 'closed', outcome: 'failed', wasFound: false });
  expect(next.outcomes[target]).toBe('failed');
});

it('промах по чужому региону не закрывает его', () => {
  const round = newRound();
  const target = currentTarget(round).regionId;
  const other = regions.find((region) => region.id !== target)!;
  const { round: next } = answerFillRound(round, {
    ...INPUT,
    answeredRegionId: other.id,
  });

  expect(next.outcomes[other.id]).toBeUndefined();
});

it('после закрытия региона спрашивает следующий', () => {
  const round = newRound();
  const first = currentTarget(round).regionId;
  const { round: next } = answerCorrectly(round);

  expect(currentTarget(next).regionId).not.toBe(first);
  expect(next.usedAttempts).toBe(0);
});

it('пишет ровно одну попытку на регион', () => {
  let round = newRound();
  round = answerWrongly(round).round;
  round = answerWrongly(round).round;
  round = answerCorrectly(round).round;

  expect(round.attempts).toHaveLength(1);
});

it('считает попытку верной только для ответа с первой', () => {
  const first = answerCorrectly(newRound()).round;

  expect(first.attempts[0].isCorrect).toBe(true);

  let second = newRound();
  second = answerWrongly(second).round;
  second = answerCorrectly(second).round;

  expect(second.attempts[0].isCorrect).toBe(false);
});

it('заканчивается ровно на 34 закрытых регионах', () => {
  let round = newRound();

  expect(isFillRoundFinished(round)).toBe(false);
  for (let i = 0; i < 34; i += 1) {
    round = answerCorrectly(round).round;
  }

  expect(isFillRoundFinished(round)).toBe(true);
  expect(Object.keys(round.outcomes)).toHaveLength(34);
});

it('запрещает отвечать на законченный раунд', () => {
  let round = newRound();
  for (let i = 0; i < 34; i += 1) {
    round = answerCorrectly(round).round;
  }

  expect(() => answerFillRound(round, { ...INPUT, answeredRegionId: 'sichuan' })).toThrow(
    /Раунд завершён/,
  );
});

it('собирает итог по исходам', () => {
  let round = newRound();
  round = answerCorrectly(round).round;
  round = answerWrongly(round).round;
  round = answerCorrectly(round).round;
  for (let i = 0; i < 32; i += 1) {
    round = answerCorrectly(round).round;
  }

  const summary = summariseFillRound(round);

  expect(summary.total).toBe(34);
  expect(summary.firstTry).toBe(33);
  expect(summary.secondTry).toBe(1);
  expect(summary.failed).toBe(0);
  expect(summary.regionIdsToReview).toHaveLength(1);
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/domain/fill-round.test.ts`
Expected: FAIL, `Failed to resolve import "./fill-round"`

- [ ] **Step 3: Написать модуль**

Создать `src/domain/fill-round.ts`:

```ts
import type { Region } from '../content/types';
import { shuffle } from './random';
import { representationsFor, type Representation } from './representations';
import type { Attempt, Level } from './round';

/**
 * Раунд-заполнение карты: каждый регион остаётся в игре, пока не закрыт, и
 * закрашивается тем цветом, который заслужил.
 *
 * Отдельный модуль, а не расширение `round.ts`: там действует инвариант
 * «повторный ответ на вопрос запрещён», и снимать его ради этого режима
 * значило бы ослабить три работающих.
 */

export const MAX_ATTEMPTS_PER_REGION = 3;

export type RegionOutcome = 'first-try' | 'second-try' | 'failed';

export type FillQuestion = {
  readonly id: string;
  readonly roundId: string;
  readonly regionId: string;
  readonly representation: Representation;
  readonly level: Level;
};

export type FillRound = {
  readonly roundId: string;
  readonly level: Level;
  readonly order: readonly FillQuestion[];
  readonly currentIndex: number;
  /** Потрачено попыток на текущий регион: 0, 1 или 2. */
  readonly usedAttempts: number;
  readonly outcomes: Readonly<Record<string, RegionOutcome>>;
  readonly attempts: readonly Attempt[];
};

/**
 * «Угадал» и «каким цветом закрасить» — разные вещи: верный ответ с третьей
 * попытки закрывает регион красным. Поэтому исход хода несёт и то и другое.
 */
export type Move =
  | { readonly kind: 'retry'; readonly attemptsLeft: 1 | 2 }
  | {
      readonly kind: 'closed';
      readonly outcome: RegionOutcome;
      /** Ложь — попытки кончились, регион так и не нашли. */
      readonly wasFound: boolean;
    };

export type FillAnswerInput = {
  readonly answeredRegionId: string;
  /** Время на регион целиком, со всеми попытками. */
  readonly durationMs: number;
  readonly answeredAt: string;
};

export type FillRoundOptions = {
  readonly roundId: string;
  readonly level: Level;
  readonly random: () => number;
};

export type FillSummary = {
  readonly total: number;
  readonly firstTry: number;
  readonly secondTry: number;
  readonly failed: number;
  readonly durationMs: number;
  readonly regionIdsToReview: readonly string[];
};

export function createFillRound(
  regions: readonly Region[],
  options: FillRoundOptions,
): FillRound {
  if (regions.length === 0) {
    throw new Error('Раунд не создан: нет регионов');
  }

  const available = representationsFor(options.level, 'find-on-map');
  const order = shuffle(regions, options.random).map((region, index) => ({
    id: `${index + 1}-${region.id}`,
    roundId: options.roundId,
    regionId: region.id,
    representation:
      available[Math.floor(options.random() * available.length)] ??
      available[0],
    level: options.level,
  }));

  return {
    roundId: options.roundId,
    level: options.level,
    order,
    currentIndex: 0,
    usedAttempts: 0,
    outcomes: {},
    attempts: [],
  };
}

export function isFillRoundFinished(round: FillRound): boolean {
  return round.currentIndex >= round.order.length;
}

export function currentTarget(round: FillRound): FillQuestion {
  const question = round.order[round.currentIndex];
  if (!question) {
    throw new Error('Раунд завершён: текущего вопроса нет');
  }

  return question;
}

function outcomeFor(usedAttempts: number): RegionOutcome {
  if (usedAttempts === 0) {
    return 'first-try';
  }

  return usedAttempts === 1 ? 'second-try' : 'failed';
}

export function answerFillRound(
  round: FillRound,
  input: FillAnswerInput,
): { readonly round: FillRound; readonly move: Move } {
  if (isFillRoundFinished(round)) {
    throw new Error('Раунд завершён: отвечать не на что');
  }

  const question = currentTarget(round);
  const isCorrect = input.answeredRegionId === question.regionId;
  const isLastAttempt = round.usedAttempts >= MAX_ATTEMPTS_PER_REGION - 1;

  // Промах, пока попытки есть: регион остаётся открытым, попытка списывается
  // со спрошенного региона, а нажатый не трогается — его ещё спросят.
  if (!isCorrect && !isLastAttempt) {
    const attemptsLeft = (MAX_ATTEMPTS_PER_REGION - round.usedAttempts - 1) as 1 | 2;

    return {
      round: { ...round, usedAttempts: round.usedAttempts + 1 },
      move: { kind: 'retry', attemptsLeft },
    };
  }

  const outcome = isCorrect ? outcomeFor(round.usedAttempts) : 'failed';
  const attempt: Attempt = {
    questionId: question.id,
    roundId: question.roundId,
    regionId: question.regionId,
    exerciseType: 'find-on-map',
    level: question.level,
    // «Освоил» значит «берёт с первой». Ответ со второй попадает в повтор.
    isCorrect: outcome === 'first-try',
    durationMs: input.durationMs,
    answeredAt: input.answeredAt,
  };

  return {
    round: {
      ...round,
      currentIndex: round.currentIndex + 1,
      usedAttempts: 0,
      outcomes: { ...round.outcomes, [question.regionId]: outcome },
      attempts: [...round.attempts, attempt],
    },
    move: { kind: 'closed', outcome, wasFound: isCorrect },
  };
}

export function summariseFillRound(round: FillRound): FillSummary {
  const values = Object.values(round.outcomes);

  return {
    total: values.length,
    firstTry: values.filter((outcome) => outcome === 'first-try').length,
    secondTry: values.filter((outcome) => outcome === 'second-try').length,
    failed: values.filter((outcome) => outcome === 'failed').length,
    durationMs: round.attempts.reduce(
      (sum, attempt) => sum + attempt.durationMs,
      0,
    ),
    regionIdsToReview: round.order
      .map((question) => question.regionId)
      .filter((regionId) => round.outcomes[regionId] !== 'first-try'),
  };
}
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/domain/fill-round.test.ts`
Expected: PASS, 13 тестов.

- [ ] **Step 5: Коммит**

```bash
git add src/domain/fill-round.ts src/domain/fill-round.test.ts
git commit -m "feat(domain): движок раунда «Заполни карту»"
```

---

### Task 4: Игровой режим отображения карты

`ChinaMap` получает необязательный режим. Три существующих режима продолжают работать через `answerStates` и ничего не замечают.

**Files:**
- Modify: `src/map/ChinaMap.tsx`, `src/map/ChinaMap.test.tsx`, `src/map/MapDefs.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `RegionOutcome` из `../domain/fill-round`; токены из Task 1.
- Produces: новые необязательные пропсы `ChinaMap`: `variant?: 'reference' | 'fill'`, `outcomes?: Readonly<Record<string, RegionOutcome>>`, `highlightedRegionIds?: readonly string[]`. Идентификаторы образцов: `SECOND_TRY_PATTERN_ID = 'map-hatch-second-try'`, `FAILED_PATTERN_ID = 'map-hatch-failed'`.

- [ ] **Step 1: Написать падающий тест**

Добавить в конец `src/map/ChinaMap.test.tsx`:

```tsx
it('в игровом режиме отмечает только закрытые регионы', () => {
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      variant="fill"
      outcomes={{ sichuan: 'first-try', hunan: 'failed' }}
    />,
  );

  expect(
    container.querySelector('[data-region-id="sichuan"]')?.getAttribute('data-outcome'),
  ).toBe('first-try');
  expect(
    container.querySelector('[data-region-id="hunan"]')?.getAttribute('data-outcome'),
  ).toBe('failed');
  expect(
    container.querySelector('[data-region-id="yunnan"]')?.getAttribute('data-outcome'),
  ).toBeNull();
  expect(container.querySelector('.china-map')?.getAttribute('data-map-variant')).toBe(
    'fill',
  );
});

it('подсвечивает указанные регионы', () => {
  const { container } = render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      variant="fill"
      highlightedRegionIds={['gansu', 'hunan']}
    />,
  );

  expect(
    container.querySelector('[data-region-id="gansu"]')?.getAttribute('data-highlight'),
  ).toBe('true');
  expect(
    container.querySelector('[data-region-id="hunan"]')?.getAttribute('data-highlight'),
  ).toBe('true');
  expect(
    container.querySelector('[data-region-id="yunnan"]')?.getAttribute('data-highlight'),
  ).toBeNull();
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/map/ChinaMap.test.tsx`
Expected: FAIL — `data-outcome` равен `null`, `data-map-variant` равен `null`.

- [ ] **Step 3: Расширить компонент**

В `src/map/ChinaMap.tsx` добавить импорт:

```ts
import type { RegionOutcome } from '../domain/fill-round';
```

Добавить в `ChinaMapProps` после `interactive`:

```ts
  /**
   * `reference` — справочная карта: цвет означает тип региона.
   * `fill` — игровая: все регионы серые, цвет появляется только как исход.
   */
  readonly variant?: 'reference' | 'fill';
  readonly outcomes?: Readonly<Record<string, RegionOutcome>>;
  /** Регионы, которые надо показать: промахи и подсказка после исчерпания попыток. */
  readonly highlightedRegionIds?: readonly string[];
```

Рядом с `NO_ANSWER_STATES` добавить — по той же причине, что описана там же:
литерал в параметрах создавал бы новый объект на каждый рендер и вхолостую
перезапускал эффект.

```ts
const NO_OUTCOMES: Readonly<Record<string, RegionOutcome>> = {};
const NO_HIGHLIGHTS: readonly string[] = [];
```

В сигнатуру функции добавить параметры:

```ts
  variant = 'reference',
  outcomes = NO_OUTCOMES,
  highlightedRegionIds = NO_HIGHLIGHTS,
```

Внутри `areas?.forEach` после блока `answerState` добавить:

```ts
      const outcome = outcomes[area.dataset.regionId ?? ''];
      if (outcome) {
        area.dataset.outcome = outcome;
      } else {
        delete area.dataset.outcome;
      }

      if (highlightedRegionIds.includes(area.dataset.regionId ?? '')) {
        area.dataset.highlight = 'true';
      } else {
        delete area.dataset.highlight;
      }
```

Добавить `highlightedRegionIds` и `outcomes` в массив зависимостей `useEffect`.

На `div.china-map` добавить атрибут:

```tsx
        data-map-variant={variant}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `npx vitest run src/map/ChinaMap.test.tsx`
Expected: PASS.

- [ ] **Step 5: Добавить образцы штриховки**

В `src/map/MapDefs.tsx` добавить экспорты и два образца внутрь `<defs>`, после существующего:

```tsx
export const SECOND_TRY_PATTERN_ID = 'map-hatch-second-try';
export const FAILED_PATTERN_ID = 'map-hatch-failed';
```

```tsx
        {/*
          Три исхода не могут попарно давать 3:1 — окно светлоты слишком узкое
          (см. tokens.css). Поэтому исход несёт второй канал: сплошная заливка,
          редкая штриховка, частая штриховка. Различие читается в оттенках
          серого, при дальтонизме и на печати.
        */}
        <pattern
          id={SECOND_TRY_PATTERN_ID}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" fill="var(--map-second-try)" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="var(--map-outcome-ink)"
            strokeWidth="1.5"
          />
        </pattern>
        <pattern
          id={FAILED_PATTERN_ID}
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="4" height="4" fill="var(--map-failed)" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="4"
            stroke="var(--map-outcome-ink)"
            strokeWidth="1.5"
          />
        </pattern>
```

- [ ] **Step 6: Добавить стили игрового режима**

В `src/styles.css`, сразу после блока правил `[data-region-kind]`:

```css
/*
 * Игровой режим: цвет не должен подсказывать, какой регион перед тобой,
 * поэтому вся карта стартует одним серым. Селектор с двумя атрибутами
 * намеренно специфичнее правил типа региона выше.
 */
.china-map[data-map-variant='fill'] [data-region-id] {
  fill: var(--map-unplayed);
}

.china-map[data-map-variant='fill'] [data-outcome='first-try'] {
  fill: var(--map-first-try);
}

.china-map[data-map-variant='fill'] [data-outcome='second-try'] {
  fill: url('#map-hatch-second-try');
}

.china-map[data-map-variant='fill'] [data-outcome='failed'] {
  fill: url('#map-hatch-failed');
}

.china-map [data-highlight='true'] {
  stroke: var(--map-border);
  stroke-width: var(--map-border-width-strong);
}
```

- [ ] **Step 7: Запустить все проверки**

Run: `npx eslint . && npx vitest run && npm run build`
Expected: всё зелёное.

- [ ] **Step 8: Коммит**

```bash
git add -A
git commit -m "feat(map): игровой режим отображения карты"
```

---

### Task 5: Экран раунда

**Files:**
- Create: `src/features/exercise/FillMapRound.tsx`, `src/features/exercise/FillMapRound.test.tsx`, `src/features/exercise/RoundStopwatch.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: движок из Task 3, `ChinaMap` с `variant`/`outcomes`/`highlightedRegionIds` из Task 4, `labelOf` из `../../domain/representations`.
- Produces: `FillMapRound` с пропсами `{ regions, level, roundId, seed, onFinish: (round: FillRound) => void, onExit: () => void }`; константа `REVEAL_MS = 1500`.

- [ ] **Step 1: Написать падающие тесты**

Создать `src/features/exercise/FillMapRound.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import type { Region } from '../../content/types';
import { FillMapRound } from './FillMapRound';

function renderRound() {
  return render(
    <FillMapRound
      regions={regions}
      level={1}
      roundId="r1"
      seed={1}
      onFinish={() => {}}
      onExit={() => {}}
    />,
  );
}

/** На первом уровне в заголовке стоит русское название спрошенного региона. */
function askedRegion(): Region {
  const name = screen.getByTestId('fill-target').textContent;

  return regions.find((region) => region.nameRu === name)!;
}

/**
 * Ответ даётся кнопкой из равнозначного списка под картой: он не зависит от
 * геометрии SVG. Доступное имя собрано в ChinaMap.tsx как
 * `{nameRu} <span lang="zh-Hans">({nameZh})</span>`.
 */
function answerWith(region: Region) {
  fireEvent.click(
    screen.getByRole('button', { name: `${region.nameRu} (${region.nameZh})` }),
  );
}

function anyOtherRegion(region: Region): Region {
  return regions.find((candidate) => candidate.id !== region.id)!;
}

it('после верного ответа сразу спрашивает следующий регион без кнопки «Далее»', () => {
  renderRound();
  const first = askedRegion();

  answerWith(first);

  expect(askedRegion().id).not.toBe(first.id);
  expect(screen.queryByRole('button', { name: 'Далее' })).toBeNull();
});

it('промах уменьшает счётчик попыток и не меняет вопрос', () => {
  renderRound();
  const asked = askedRegion();

  answerWith(anyOtherRegion(asked));

  expect(screen.getByRole('status')).toHaveTextContent('Осталось попыток: 2');
  expect(askedRegion().id).toBe(asked.id);
});

it('промах не закрашивает нажатый регион', () => {
  const { container } = renderRound();
  const asked = askedRegion();
  const other = anyOtherRegion(asked);

  answerWith(other);

  expect(
    container
      .querySelector(`[data-region-id="${other.id}"]`)
      ?.getAttribute('data-outcome'),
  ).toBeNull();
});

it('на экране нет панели обратной связи', () => {
  const { container } = renderRound();

  expect(container.querySelector('.answer-feedback')).toBeNull();
});

it('показывает счётчик закрашенных регионов', () => {
  renderRound();

  expect(screen.getByTestId('fill-progress')).toHaveTextContent('0 из 34');
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/features/exercise/FillMapRound.test.tsx`
Expected: FAIL, `Failed to resolve import "./FillMapRound"`

- [ ] **Step 3: Написать секундомер**

Создать `src/features/exercise/RoundStopwatch.tsx`:

```tsx
import { useEffect, useState } from 'react';

export type RoundStopwatchProps = {
  /** Отметка `performance.now()` в момент старта раунда. */
  readonly startedAt: number;
};

export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Секундомер идёт вверх и ничего не ограничивает: медленный ответ не
 * наказывается (UI_UX.md). Значение обновляется раз в секунду и помечено
 * `aria-hidden` — программе чтения с экрана незачем объявлять каждую секунду,
 * итоговое время называется на экране результатов.
 */
export function RoundStopwatch({ startedAt }: RoundStopwatchProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMs(performance.now() - startedAt);
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <span className="round-stopwatch" aria-hidden="true">
      {formatElapsed(elapsedMs)}
    </span>
  );
}
```

- [ ] **Step 4: Написать экран раунда**

Создать `src/features/exercise/FillMapRound.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { Region } from '../../content/types';
import {
  answerFillRound,
  createFillRound,
  currentTarget,
  isFillRoundFinished,
  MAX_ATTEMPTS_PER_REGION,
  type FillRound,
  type Move,
} from '../../domain/fill-round';
import { createSeededRandom } from '../../domain/random';
import { labelOf } from '../../domain/representations';
import type { Level } from '../../domain/round';
import { ChinaMap } from '../../map/ChinaMap';
import { RoundStopwatch } from './RoundStopwatch';

/**
 * Пауза, на которой карта показывает регион, который так и не нашли.
 * Значение выбрано по умолчанию, не измерено: если на проверке с учениками
 * окажется мало, менять здесь.
 */
export const REVEAL_MS = 1500;

export type FillMapRoundProps = {
  readonly regions: readonly Region[];
  readonly level: Level;
  readonly roundId: string;
  readonly seed: number;
  readonly onFinish: (round: FillRound) => void;
  readonly onExit: () => void;
};

export function FillMapRound({
  regions,
  level,
  roundId,
  seed,
  onFinish,
  onExit,
}: FillMapRoundProps) {
  const [round, setRound] = useState<FillRound>(() =>
    createFillRound(regions, {
      roundId,
      level,
      random: createSeededRandom(seed),
    }),
  );
  const [move, setMove] = useState<Move | null>(null);
  const [revealedRegionId, setRevealedRegionId] = useState<string | null>(null);
  /*
   * Промахи по текущему региону остаются помеченными до его закрытия: ученик
   * видит, что уже пробовал, и не тратит попытку на то же место. Отметка
   * держится, а не мигает, поэтому анимации здесь нет вовсе и отдельная ветка
   * для prefers-reduced-motion не нужна.
   */
  const [missedRegionIds, setMissedRegionIds] = useState<readonly string[]>([]);
  const startedAt = useRef(performance.now());
  const regionStartedAt = useRef(performance.now());

  // Пауза показа: пока она идёт, карта не принимает нажатия.
  useEffect(() => {
    if (revealedRegionId === null) {
      return;
    }

    const timer = setTimeout(() => setRevealedRegionId(null), REVEAL_MS);

    return () => clearTimeout(timer);
  }, [revealedRegionId]);

  const isRevealing = revealedRegionId !== null;
  const finished = isFillRoundFinished(round);
  const question = finished ? null : currentTarget(round);
  const targetRegion =
    question === null
      ? null
      : regions.find((region) => region.id === question.regionId)!;
  const attemptsLeft = MAX_ATTEMPTS_PER_REGION - round.usedAttempts;
  const closed = Object.keys(round.outcomes).length;

  function handleSelect(regionId: string) {
    if (isRevealing || finished) {
      return;
    }

    const target = currentTarget(round).regionId;
    const result = answerFillRound(round, {
      answeredRegionId: regionId,
      durationMs: Math.round(performance.now() - regionStartedAt.current),
      answeredAt: new Date().toISOString(),
    });

    setRound(result.round);
    setMove(result.move);

    if (result.move.kind === 'retry') {
      setMissedRegionIds([...missedRegionIds, regionId]);
      return;
    }

    setMissedRegionIds([]);
    regionStartedAt.current = performance.now();

    // Регион так и не нашли: сначала показать где он, потом идти дальше.
    if (!result.move.wasFound) {
      setRevealedRegionId(target);
    }

    if (isFillRoundFinished(result.round)) {
      onFinish(result.round);
    }
  }

  function statusText(): string {
    if (move === null) {
      return 'Найдите регион на карте.';
    }

    if (move.kind === 'retry') {
      return `Не этот регион. Осталось попыток: ${move.attemptsLeft}.`;
    }

    if (!move.wasFound) {
      return 'Попытки кончились. Регион показан на карте.';
    }

    return move.outcome === 'first-try' ? 'Верно.' : 'Верно, но не с первой попытки.';
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Найдите на карте</p>
        <h1 data-testid="fill-target">
          {targetRegion === null
            ? 'Карта заполнена'
            : labelOf(targetRegion, question!.representation)}
        </h1>
        <div className="fill-meta">
          <p className="exercise-progress" data-testid="fill-progress">
            Закрашено {closed} из {round.order.length}
          </p>
          <p className="attempt-dots">
            <span aria-hidden="true">{'●'.repeat(attemptsLeft)}{'○'.repeat(round.usedAttempts)}</span>
            <span className="visually-hidden">
              Попытка {round.usedAttempts + 1} из {MAX_ATTEMPTS_PER_REGION}
            </span>
          </p>
          <RoundStopwatch startedAt={startedAt.current} />
        </div>
        <p className="fill-status" role="status" aria-live="polite">
          {statusText()}
        </p>
      </header>
      <ChinaMap
        regions={regions}
        selectedRegionId={null}
        onSelect={handleSelect}
        onClear={() => {}}
        variant="fill"
        outcomes={round.outcomes}
        highlightedRegionIds={
          revealedRegionId === null ? missedRegionIds : [revealedRegionId]
        }
        interactive={!isRevealing && !finished}
      />
      <button type="button" className="secondary" onClick={onExit}>
        Прервать раунд
      </button>
    </main>
  );
}
```

- [ ] **Step 5: Добавить стили**

В `src/styles.css`, после блока `.exercise-progress`:

```css
.fill-meta {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2) var(--s-5);
  margin-bottom: var(--s-2);
}

.attempt-dots {
  color: var(--text-on-ground);
  letter-spacing: 0.15em;
  margin: 0;
}

.round-stopwatch {
  color: var(--text-on-ground-muted);
  font-variant-numeric: tabular-nums;
}

.fill-status {
  color: var(--text-on-ground);
  margin: 0;
  min-height: var(--t-leading-body);
}

/* Текст только для программ чтения с экрана: значок попыток дублируется словами. */
.visually-hidden {
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
```

- [ ] **Step 6: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/features/exercise/FillMapRound.test.tsx`
Expected: PASS. Если первый тест окажется хрупким из-за подбора имени кнопки, замените его на выбор через равнозначный список: найдите кнопку по `${region.nameRu} (${region.nameZh})` спрошенного региона и убедитесь, что заголовок сменился.

- [ ] **Step 7: Коммит**

```bash
git add -A
git commit -m "feat(exercise): экран раунда «Заполни карту»"
```

---

### Task 6: Экран итогов режима

**Files:**
- Create: `src/features/results/FillMapResultsPage.tsx`, `src/features/results/FillMapResultsPage.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `summariseFillRound`, `FillRound` из Task 3; `ChinaMap` с `variant="fill"` из Task 4.
- Produces: `FillMapResultsPage` с пропсами `{ round, regions, isProgressSaved, onNewRound, onExit }`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/features/results/FillMapResultsPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { regions } from '../../content/regions';
import { createFillRound, answerFillRound, currentTarget, type FillRound } from '../../domain/fill-round';
import { createSeededRandom } from '../../domain/random';
import { FillMapResultsPage } from './FillMapResultsPage';

function finishedRound(): FillRound {
  let round = createFillRound(regions, {
    roundId: 'r1',
    level: 1,
    random: createSeededRandom(1),
  });

  for (let i = 0; i < regions.length; i += 1) {
    round = answerFillRound(round, {
      answeredRegionId: currentTarget(round).regionId,
      durationMs: 1000,
      answeredAt: '2026-08-04T10:00:00.000Z',
    }).round;
  }

  return round;
}

it('показывает разбивку по исходам', () => {
  render(
    <FillMapResultsPage
      round={finishedRound()}
      regions={regions}
      isProgressSaved
      onNewRound={() => {}}
      onExit={() => {}}
    />,
  );

  expect(screen.getByTestId('fill-breakdown')).toHaveTextContent('С первого раза: 34');
  expect(screen.getByTestId('fill-breakdown')).toHaveTextContent('Со второго: 0');
  expect(screen.getByTestId('fill-breakdown')).toHaveTextContent('Не угадано: 0');
});

it('показывает заполненную карту', () => {
  const { container } = render(
    <FillMapResultsPage
      round={finishedRound()}
      regions={regions}
      isProgressSaved
      onNewRound={() => {}}
      onExit={() => {}}
    />,
  );

  expect(container.querySelector('[data-map-variant="fill"]')).not.toBeNull();
  expect(
    container.querySelector('[data-region-id="sichuan"]')?.getAttribute('data-outcome'),
  ).toBe('first-try');
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/features/results/FillMapResultsPage.test.tsx`
Expected: FAIL, `Failed to resolve import "./FillMapResultsPage"`

- [ ] **Step 3: Написать компонент**

Создать `src/features/results/FillMapResultsPage.tsx`:

```tsx
import type { Region } from '../../content/types';
import { summariseFillRound, type FillRound } from '../../domain/fill-round';
import { ChinaMap } from '../../map/ChinaMap';

export type FillMapResultsPageProps = {
  readonly round: FillRound;
  readonly regions: readonly Region[];
  readonly isProgressSaved: boolean;
  readonly onNewRound: () => void;
  readonly onExit: () => void;
};

/** Время подаётся как факт, без оценки скорости (UI_UX.md). */
function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes === 0 ? `${seconds} с` : `${minutes} мин ${seconds} с`;
}

/**
 * Итог — сама заполненная карта. Числовая разбивка рядом не украшает: три
 * цвета исхода не могут попарно давать 3:1 (см. tokens.css), и текст —
 * равнозначная подача того же результата без цвета.
 */
export function FillMapResultsPage({
  round,
  regions,
  isProgressSaved,
  onNewRound,
  onExit,
}: FillMapResultsPageProps) {
  const summary = summariseFillRound(round);
  const reviewRegions = summary.regionIdsToReview.flatMap(
    (regionId) => regions.find((region) => region.id === regionId) ?? [],
  );

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Карта заполнена</p>
        <h1>{formatDuration(summary.durationMs)}</h1>
        <ul className="fill-breakdown" data-testid="fill-breakdown">
          <li>С первого раза: {summary.firstTry}</li>
          <li>Со второго: {summary.secondTry}</li>
          <li>Не угадано: {summary.failed}</li>
        </ul>
      </header>
      <ChinaMap
        regions={regions}
        selectedRegionId={null}
        onSelect={() => {}}
        onClear={() => {}}
        variant="fill"
        outcomes={round.outcomes}
        interactive={false}
      />
      <section aria-labelledby="fill-results-heading">
        <h2 id="fill-results-heading">Что получилось</h2>
        {isProgressSaved ? null : (
          <p className="status-note" role="status">
            Прогресс не сохранится: хранилище недоступно.
          </p>
        )}
        {reviewRegions.length === 0 ? (
          <p>Вся карта взята с первой попытки.</p>
        ) : (
          <>
            <h3>Стоит повторить</h3>
            <ul className="review-list">
              {reviewRegions.map((region) => (
                <li key={region.id}>
                  {region.nameRu} <span lang="zh-Hans">{region.nameZh}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="results-actions">
          <button type="button" className="primary" onClick={onNewRound}>
            Заполнить заново
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

- [ ] **Step 4: Добавить стиль разбивки**

В `src/styles.css`, после `.fill-status`:

```css
.fill-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2) var(--s-5);
  list-style: none;
  margin: 0;
  padding: 0;
}
```

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/features/results/FillMapResultsPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "feat(results): экран итогов режима «Заполни карту»"
```

---

### Task 7: Подключение режима в приложение

**Files:**
- Modify: `src/App.tsx`, `src/features/topic-selection/TopicSelectionPage.tsx`, `src/features/topic-selection/TopicSelectionPage.test.tsx`

**Interfaces:**
- Consumes: всё из задач 3, 5, 6.
- Produces: у `TopicSelectionPage` новый необязательный проп `onStartFillRound?: (level: Level) => void`.

- [ ] **Step 1: Написать падающий тест**

Добавить в конец `src/features/topic-selection/TopicSelectionPage.test.tsx`:

```tsx
it('запускает раунд заполнения карты на выбранном уровне', () => {
  const start = vi.fn();
  render(
    <TopicSelectionPage
      regions={regions}
      unlockedLevel={1}
      onStartRound={() => {}}
      onStartFillRound={start}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Заполнить карту' }));

  expect(start).toHaveBeenCalledWith(1);
});
```

Если в файле ещё нет импортов `fireEvent`, `screen`, `regions`, добавьте их так же, как в соседних тестах этого файла.

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/features/topic-selection/TopicSelectionPage.test.tsx`
Expected: FAIL, кнопка «Заполнить карту» не найдена.

- [ ] **Step 3: Добавить кнопку**

В `src/features/topic-selection/TopicSelectionPage.tsx` добавить в `TopicSelectionPageProps`:

```ts
  readonly onStartFillRound?: (level: Level) => void;
```

Добавить параметр `onStartFillRound` в деструктуризацию и вставить кнопку в `div.mode-actions` последней, после существующих:

```tsx
              {onStartFillRound ? (
                <button
                  type="button"
                  className="primary"
                  onClick={() => onStartFillRound(level)}
                >
                  Заполнить карту
                </button>
              ) : null}
```

Кнопка доступна на всех уровнях, поэтому её нужно вынести из тернарника `level === 4 ? … : …` — она рендерится рядом с ним внутри того же `div.mode-actions`.

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `npx vitest run src/features/topic-selection/TopicSelectionPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Подключить экраны в App**

В `src/App.tsx`:

добавить импорты:

```ts
import { FillMapRound } from './features/exercise/FillMapRound';
import { FillMapResultsPage } from './features/results/FillMapResultsPage';
import type { FillRound } from './domain/fill-round';
```

расширить тип экрана:

```ts
type Screen = 'topic' | 'exercise' | 'results' | 'fill' | 'fill-results';
```

добавить состояние рядом с `lastAttempts`:

```ts
  const [fillRound, setFillRound] = useState<FillRound | null>(null);
```

добавить запуск рядом с `startRound`:

```ts
  function startFillRound(nextLevel: Level) {
    setLevel(nextLevel);
    setRoundId(newRoundId());
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setFillRound(null);
    setScreen('fill');
  }

  /**
   * Раунд-заполнение пишет по одной попытке на регион, поэтому существующие
   * правила освоенности и открытия уровней применяются без изменений.
   */
  function finishFillRound(round: FillRound) {
    const withAttempts = addAttempts(progress, round.attempts);
    const updated = {
      ...withAttempts,
      masteredRegionIds: masteredRegionIds(withAttempts.attempts, new Date()),
      unlockedLevel: unlockedLevelFrom(withAttempts.attempts),
    };
    setProgress(updated);
    store.write(updated);
    setFillRound(round);
    setScreen('fill-results');
  }
```

добавить ветки перед веткой `screen === 'exercise'`:

```tsx
  if (screen === 'fill') {
    return (
      <FillMapRound
        regions={regions}
        level={level}
        roundId={roundId}
        seed={seed}
        onFinish={finishFillRound}
        onExit={() => setScreen('topic')}
      />
    );
  }

  if (screen === 'fill-results' && fillRound !== null) {
    return (
      <FillMapResultsPage
        round={fillRound}
        regions={regions}
        isProgressSaved={store.isAvailable}
        onNewRound={() => startFillRound(level)}
        onExit={() => setScreen('topic')}
      />
    );
  }
```

передать обработчик в `TopicSelectionPage`:

```tsx
      onStartFillRound={startFillRound}
```

- [ ] **Step 6: Запустить все проверки**

Run: `npx eslint . && npx vitest run && npm run build`
Expected: всё зелёное.

- [ ] **Step 7: Проверить вживую**

```bash
npx vite --port 5199 --strictPort
```

Открыть `http://localhost:5199`, нажать «Заполнить карту». Проверить руками:
карта серая; верный ответ красит зелёным и сразу спрашивает следующий регион;
промах не красит нажатый регион и уменьшает счётчик попыток; после трёх
промахов регион подсвечивается и краснеет; кнопки «Далее» нет; секундомер идёт;
на экране итогов видна заполненная карта и разбивка.

- [ ] **Step 8: Коммит**

```bash
git add -A
git commit -m "feat: подключить режим «Заполни карту»"
```

---

### Task 8: Документация

**Files:**
- Modify: `DECISIONS.md`, `EXERCISES.md`, `DESIGN_SYSTEM.md`, `CHANGELOG.md`

- [ ] **Step 1: Записать решения**

Вставить в `DECISIONS.md` сразу после строки `| --- | --- | --- |`:

```markdown
| 2026-08-04 | Режим «Заполни карту» получает отдельный движок `fill-round.ts` | В `round.ts` действует инвариант «повторный ответ на вопрос запрещён», а новый режим даёт три попытки на регион. Снимать инвариант ради одного режима значило бы ослабить три работающих. Перемешивание и выбор представления переиспользуются, дублирования нет. |
| 2026-08-04 | В игровом режиме карта стартует серой | Цвет заливки в режиме выбора подсказывал бы, какой регион перед тобой, и делал бы задание легче незаслуженно. Цвет появляется только как результат ответа. |
| 2026-08-04 | Справочная карта красится по типу единицы, раскраска по смежности удалена | Цвет перестаёт опознавать конкретный регион, поэтому выучить его «по цвету» и вернуть себе преимущество нельзя. Запрет на подсказку становится свойством системы, а не правилом, которое надо помнить. Граф смежности после этого не нужен нигде. |
| 2026-08-04 | Исход ответа различается узором, а не только цветом | Три цвета исхода не могут попарно давать 3:1: обводка тушью требует светлоты не ниже 0.118, серый при 3:1 сверху — не выше 0.153. Это противоречие, а не подбор оттенка. Сплошная заливка, редкая и частая штриховка читаются в оттенках серого, при дальтонизме и на печати. |
```

- [ ] **Step 2: Описать режим в EXERCISES.md**

Добавить в конец `EXERCISES.md`:

```markdown
## Заполни карту

Раунд — все 34 региона в перемешанном порядке. Карта начинается серой.
Спрашивается один регион; что показано в вопросе, задаёт уровень, как и в
остальных режимах.

На регион даётся три попытки. Верно с первой — зелёный, со второй — жёлтый,
с третьей или не угадал вовсе — красный. Промах по чужому региону его не
закрашивает: он ещё не спрошен. Когда попытки кончились, регион показывается
на карте на полторы секунды и только потом краснеет.

Шага «Далее» нет: закрашенный регион сразу сменяется следующим вопросом.
Секундомер идёт вверх без лимита, раунд по времени не обрывается.

В прогресс пишется одна попытка на регион, `isCorrect` истинно только для
ответа с первой попытки. Поэтому «освоил» значит «берёт с первой», а ответ со
второй попадает в список на повторение.
```

- [ ] **Step 3: Обновить DESIGN_SYSTEM.md**

В разделе «Карта» заменить абзац про четыре краски и таблицу состояний на:

```markdown
У карты два режима. Справочный: цвет означает тип единицы — провинция,
автономный район, город центрального подчинения, специальный административный
район. Игровой: все регионы серые, цвет появляется только как результат ответа.

| Исход | Как выглядит |
| --- | --- |
| Верно с первой попытки | сплошная зелёная заливка |
| Верно со второй | жёлтая заливка с редкой штриховкой |
| С третьей или не угадан | красная заливка с частой штриховкой |
| Ещё не спрошен | серый |

Попарный контраст 3:1 между тремя цветами исхода недостижим: обводка тушью
требует светлоты заливки не ниже 0.118, а серый при 3:1 сверху — не выше
0.153, и все три живут в этой полосе. Поэтому исход несёт второй канал —
узор. Числовая разбивка на экране итогов подаёт тот же результат без цвета.
```

- [ ] **Step 4: Обновить CHANGELOG.md**

Добавить в раздел `## [Unreleased]` подраздел:

```markdown
### Added

- Режим «Заполни карту»: раунд закрашивает всю карту, три попытки на регион,
  без шага «Далее», секундомер без лимита.

### Changed

- Справочная карта красится по типу единицы, а не по графу смежности.

### Removed

- Раскраска по смежности (`region-adjacency`) и поле `tone` в палитре регионов.
```

- [ ] **Step 5: Коммит**

```bash
git add -A
git commit -m "docs: описать режим «Заполни карту»"
```
