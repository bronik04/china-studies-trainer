# Соседи региона — план реализации

> **Для агентов:** ОБЯЗАТЕЛЬНЫЙ ПОДНАВЫК: `superpowers:subagent-driven-development`
> (рекомендуется) или `superpowers:executing-plans` — выполнять задача за
> задачей. Шаги помечены чекбоксами (`- [ ]`).

**Цель.** Игра «нажмите все регионы, граничащие с Хубэй»: первая в тренажёре
форма вопроса с множественным ответом.

**Устройство.** Соседство считается генератором по геометрии SVG и лежит
сгенерированным файлом с отпечатком входов. Раунд получает свой движок рядом с
`fill-round.ts` — инвариант «один ответ на вопрос» здесь неприменим. Карта
учится показывать отметки и три исхода разбора; прогресс получает новый вид
цели.

**Стек.** TypeScript, React 19, Vite, vitest + @testing-library/react. Проверки:
`npm run lint`, `npm test`, `npm run build`.

Спецификация: `docs/superpowers/specs/2026-08-30-region-neighbours-design.md`.

## Общие ограничения

- Интерфейс, задания и ошибки — по-русски; китайские названия в Unicode.
- Домен не вызывает `Math.random` (генератор передаётся снаружи) и не знает ни
  React, ни DOM.
- Карта не считает правильность ответа, UI не знает ключей SVG.
- Исход не передаётся одним лишь цветом: у каждого состояния свой узор и слово
  в `aria-label` области и в подписи кнопки списка.
- Значения цветов, размеров и длительностей — только токенами
  (`src/design/tokens.css`); `scripts/validate-tokens.test.ts` проверяет пары по
  WCAG 2.2.
- Сгенерированные файлы руками не правятся; у каждого — отпечаток входов,
  сверяемый в `validate:map`.
- Коммиты частые, по одной задаче; сообщение по-русски, как в истории
  репозитория.

---

## Карта файлов

| Файл | Ответственность |
| --- | --- |
| `scripts/generate-region-neighbours.ts` | считает граф соседства по контурам SVG, пишет сгенерированный модуль |
| `src/map/region-neighbours.ts` | сгенерированный граф и отпечаток входов |
| `scripts/validate-map.ts` | сторож отпечатка и плато порога |
| `src/domain/round.ts` | новый `TargetKind: 'neighbours'` и `neighboursTarget()` |
| `src/domain/neighbours-round.ts` | движок раунда: отметки, «Готово», оценивание, итог |
| `src/map/ChinaMap.tsx` | признак `neighbourStates`: отметка и три исхода на карте |
| `src/map/RegionAnswerList.tsx` | те же состояния в равнозначном списке |
| `src/map/outcome-labels.ts` | слова для новых состояний |
| `src/styles.css` | узоры и заливки для `data-map-variant='neighbours'` |
| `src/features/exercise/NeighboursRound.tsx` | экран раунда |
| `src/features/exercise/exercise-modes.ts` | карточка игры в группе «Регионы» |
| `src/App.tsx` | экран, запуск, запись попыток |
| `src/features/results/RoundResultsPage.tsx` | строка итогов для нового вида цели |

---

### Task 1: Граф соседства — генератор и сторож

**Файлы:**
- Создать: `scripts/generate-region-neighbours.ts`
- Создать (генератором): `src/map/region-neighbours.ts`
- Создать: `src/map/region-neighbours.test.ts`
- Изменить: `package.json` (раздел `scripts`)
- Изменить: `scripts/validate-map.ts`

**Интерфейсы:**
- Отдаёт наружу: `REGION_NEIGHBOURS: Readonly<Record<string, readonly string[]>>`
  и `NEIGHBOURS_INPUTS_FINGERPRINT: string`. На них опираются задачи 2, 4 и 5.

- [ ] **Шаг 1: Написать падающий тест**

Создать `src/map/region-neighbours.test.ts`:

```ts
import { REGION_NEIGHBOURS } from './region-neighbours';
import { regions } from '../content/regions';

const ids = regions.map((region) => region.id);

it('знает всех 34 региона и только их', () => {
  expect(Object.keys(REGION_NEIGHBOURS).sort()).toEqual([...ids].sort());
});

it('симметричен: сосед соседа — я сам', () => {
  for (const [id, list] of Object.entries(REGION_NEIGHBOURS)) {
    for (const other of list) {
      expect(REGION_NEIGHBOURS[other]).toContain(id);
    }
  }
});

it('держит 70 рёбер', () => {
  const degrees = Object.values(REGION_NEIGHBOURS).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  expect(degrees / 2).toBe(70);
});

it('у островов соседей нет, у САР — один Гуандун', () => {
  expect(REGION_NEIGHBOURS.hainan).toEqual([]);
  expect(REGION_NEIGHBOURS.taiwan).toEqual([]);
  expect(REGION_NEIGHBOURS['hong-kong']).toEqual(['guangdong']);
  expect(REGION_NEIGHBOURS.macao).toEqual(['guangdong']);
});

it('называет соседей Сычуани и Внутренней Монголии', () => {
  expect([...REGION_NEIGHBOURS.sichuan].sort()).toEqual(
    ['chongqing', 'gansu', 'guizhou', 'qinghai', 'shaanxi', 'tibet', 'yunnan'],
  );
  expect(REGION_NEIGHBOURS['inner-mongolia']).toHaveLength(8);
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/map/region-neighbours.test.ts`
Ожидается: FAIL — модуля `./region-neighbours` нет.

- [ ] **Шаг 3: Написать генератор**

Создать `scripts/generate-region-neighbours.ts`:

```ts
/**
 * Считает граф соседства регионов по контурам карты и пишет
 * `src/map/region-neighbours.ts`. Файл сгенерирован: править руками
 * бессмысленно, следующий прогон перезапишет.
 *
 * Почему по геометрии, а не по справочнику: ученик отвечает нажатием по этой
 * самой карте, и разойдись справочник с рисунком — у вопроса не будет верного
 * ответа вовсе.
 *
 * Запуск: npx tsx scripts/generate-region-neighbours.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseMapPath, type Point } from '../src/map/svg-path';
import { paletteInputsFingerprint, regionContours } from './palette-fingerprint';

const MAP_FILE = 'public/maps/china-provinces.svg';
const OUTPUT_FILE = 'src/map/region-neighbours.ts';

/**
 * Порог соприкосновения в единицах viewBox. Стоит на плато: с 0.5 до 2.0 граф
 * не меняется (70 рёбер), ниже 0.2 разваливается — контуры делят не все
 * вершины. Плато сторожит `validate:map`.
 */
export const TOUCH_EPSILON = 0.5;

export function neighboursOf(
  shapes: readonly { readonly id: string; readonly points: readonly Point[] }[],
  epsilon: number,
): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const shape of shapes) {
    graph[shape.id] = [];
  }

  for (let i = 0; i < shapes.length; i += 1) {
    for (let j = i + 1; j < shapes.length; j += 1) {
      if (touches(shapes[i].points, shapes[j].points, epsilon)) {
        graph[shapes[i].id].push(shapes[j].id);
        graph[shapes[j].id].push(shapes[i].id);
      }
    }
  }

  for (const list of Object.values(graph)) {
    list.sort();
  }

  return graph;
}

function touches(
  a: readonly Point[],
  b: readonly Point[],
  epsilon: number,
): boolean {
  for (const [ax, ay] of a) {
    for (const [bx, by] of b) {
      if (Math.hypot(ax - bx, ay - by) <= epsilon) {
        return true;
      }
    }
  }

  return false;
}

export function shapesFrom(svg: string) {
  return regionContours(svg).map((contour) => ({
    id: contour.id,
    points: parseMapPath(contour.d).flat(),
  }));
}

const svg = readFileSync(MAP_FILE, 'utf8');
const graph = neighboursOf(shapesFrom(svg), TOUCH_EPSILON);

const body = Object.entries(graph)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([id, list]) => `  '${id}': [${list.map((n) => `'${n}'`).join(', ')}],`)
  .join('\n');

writeFileSync(
  OUTPUT_FILE,
  `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: ${MAP_FILE}
 * Генератор: scripts/generate-region-neighbours.ts
 */

/** Отпечаток контуров, из которых граф собран. Сверяется в \`validate:map\`. */
export const NEIGHBOURS_INPUTS_FINGERPRINT = '${paletteInputsFingerprint(svg)}';

/** Порог соприкосновения, при котором граф посчитан (единицы viewBox). */
export const NEIGHBOURS_EPSILON = ${TOUCH_EPSILON};

export const REGION_NEIGHBOURS: Readonly<Record<string, readonly string[]>> = {
${body}
};
`,
  'utf8',
);

console.info(
  `Соседство: регионов ${Object.keys(graph).length}, рёбер ` +
    `${Object.values(graph).reduce((sum, list) => sum + list.length, 0) / 2}`,
);
```

- [ ] **Шаг 4: Завести команду и прогнать генератор**

В `package.json`, рядом с `generate:palette`:

```json
    "generate:neighbours": "tsx scripts/generate-region-neighbours.ts",
```

Запустить: `npm run generate:neighbours`
Ожидается: `Соседство: регионов 34, рёбер 70`.

- [ ] **Шаг 5: Прогнать тест**

Запустить: `npx vitest run src/map/region-neighbours.test.ts`
Ожидается: PASS, все пять проверок.

- [ ] **Шаг 6: Поставить сторожа в валидатор карты**

В `scripts/validate-map.ts` — рядом с проверкой отпечатка палитры (искать
`PALETTE_INPUTS_FINGERPRINT`) — добавить:

```ts
if (NEIGHBOURS_INPUTS_FINGERPRINT !== paletteInputsFingerprint(svg)) {
  fail(
    'Граф соседства собран из других контуров. Запустите npm run generate:neighbours',
  );
}

/*
 * Порог обязан стоять на плато: если граф при 0.5 и при 2.0 разошёлся, ответ
 * стал зависеть от подобранного числа, а не от карты. Лучше уронить сборку,
 * чем спросить у ученика вопрос без верного ответа.
 */
const wide = neighboursOf(shapesFrom(svg), 2);
for (const [id, list] of Object.entries(REGION_NEIGHBOURS)) {
  if ([...list].sort().join(' ') !== [...wide[id]].sort().join(' ')) {
    fail(`Соседство ${id} зависит от порога: при 0.5 и при 2.0 оно разное`);
  }
}
```

Имя функции падения (`fail`) взять то, которым файл уже пользуется.

- [ ] **Шаг 7: Проверить сторожа делом**

Сдвинуть любую вершину контура в `public/maps/china-provinces.svg` на единицу,
запустить `npm run validate:map` — ожидается падение с внятным сообщением.
Вернуть правку (`git checkout public/maps/china-provinces.svg`).

- [ ] **Шаг 8: Коммит**

```bash
git add scripts/generate-region-neighbours.ts src/map/region-neighbours.ts src/map/region-neighbours.test.ts scripts/validate-map.ts package.json
git commit -m "feat: граф соседства регионов считается по геометрии карты"
```

---

### Task 2: Движок раунда

**Файлы:**
- Изменить: `src/domain/round.ts` (`TargetKind`, `neighboursTarget`)
- Создать: `src/domain/neighbours-round.ts`
- Создать: `src/domain/neighbours-round.test.ts`

**Интерфейсы:**
- Берёт из задачи 1: `REGION_NEIGHBOURS`.
- Отдаёт: `createNeighboursRound`, `currentNeighboursQuestion`, `toggleMark`,
  `submitNeighbours`, `isNeighboursRoundFinished`, `summariseNeighboursRound`,
  типы `NeighboursRound`, `NeighboursVerdict`. На них опирается задача 4.

- [ ] **Шаг 1: Написать падающий тест**

Создать `src/domain/neighbours-round.test.ts`:

```ts
import { regions } from '../content/regions';
import { createSeededRandom } from './random';
import {
  createNeighboursRound,
  currentNeighboursQuestion,
  isNeighboursRoundFinished,
  submitNeighbours,
  toggleMark,
} from './neighbours-round';

function round() {
  return createNeighboursRound(regions, {
    roundId: 'r1',
    language: 'ru',
    random: createSeededRandom(1),
  });
}

it('спрашивает тридцать регионов: без островов и без САР', () => {
  const created = round();

  expect(created.order).toHaveLength(30);
  const asked = created.order.map((question) => question.regionId);
  for (const excluded of ['hainan', 'taiwan', 'hong-kong', 'macao']) {
    expect(asked).not.toContain(excluded);
  }
});

it('отмечает и снимает отметку', () => {
  const marked = toggleMark(round(), 'hubei');
  expect(marked.marked).toContain('hubei');
  expect(toggleMark(marked, 'hubei').marked).not.toContain('hubei');
});

it('засчитывает только точное совпадение множества', () => {
  let created = round();
  const question = currentNeighboursQuestion(created);
  const truth = question.neighbourIds;

  for (const id of truth) {
    created = toggleMark(created, id);
  }

  const { verdict } = submitNeighbours(created, {
    durationMs: 1000,
    answeredAt: '2026-08-30T10:00:00.000Z',
  });

  expect(verdict.isCorrect).toBe(true);
  expect(verdict.found).toHaveLength(truth.length);
  expect(verdict.missed).toEqual([]);
  expect(verdict.extra).toEqual([]);
});

it('считает пропущенных и лишних', () => {
  let created = round();
  const question = currentNeighboursQuestion(created);
  const [first] = question.neighbourIds;
  const stranger = regions.find(
    (region) =>
      region.id !== question.regionId && !question.neighbourIds.includes(region.id),
  )!;

  created = toggleMark(created, first);
  created = toggleMark(created, stranger.id);

  const { verdict } = submitNeighbours(created, {
    durationMs: 1000,
    answeredAt: '2026-08-30T10:00:00.000Z',
  });

  expect(verdict.isCorrect).toBe(false);
  expect(verdict.found).toEqual([first]);
  expect(verdict.extra).toEqual([stranger.id]);
  expect(verdict.missed).toHaveLength(question.neighbourIds.length - 1);
});

it('пишет попытку видом цели neighbours и идёт дальше', () => {
  const { round: next } = submitNeighbours(round(), {
    durationMs: 1000,
    answeredAt: '2026-08-30T10:00:00.000Z',
  });

  expect(next.attempts[0].target.kind).toBe('neighbours');
  expect(next.currentIndex).toBe(1);
  expect(isNeighboursRoundFinished(next)).toBe(false);
});

it('воспроизводится по сиду', () => {
  const first = round().order.map((question) => question.regionId);
  const second = round().order.map((question) => question.regionId);

  expect(first).toEqual(second);
});
```

Имя функции сида (`createSeededRandom`) и её путь взять те, что уже
используются в `src/domain/round.test.ts`.

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/domain/neighbours-round.test.ts`
Ожидается: FAIL — модуля нет.

- [ ] **Шаг 3: Завести вид цели**

В `src/domain/round.ts` — в `TargetKind` добавить `'neighbours'`, а рядом с
`regionTarget` дописать:

```ts
/**
 * Цель игры «соседи»: спрошенный регион. Отдельный вид, а не `region`, — «не
 * знает соседей Хубэя» не то же, что «не знает, где Хубэй», и ошибка в одной
 * игре не должна снимать освоенность, заработанную в другой. Тот же довод, по
 * которому город отделён от региона.
 */
export function neighboursTarget(id: string): Target {
  return { kind: 'neighbours', id };
}
```

- [ ] **Шаг 4: Написать движок**

Создать `src/domain/neighbours-round.ts`:

```ts
import type { Region } from '../content/types';
import { REGION_NEIGHBOURS } from '../map/region-neighbours';
import { shuffle } from './random';
import type { QuestionLanguage } from './question-language';
import { neighboursTarget, type Attempt } from './round';

/**
 * Раунд «соседи региона»: вопрос — регион, ответ — множество регионов.
 *
 * Отдельный модуль, а не расширение `round.ts`: там действует инвариант
 * «повторный ответ на вопрос запрещён», а здесь ответов много и каждый
 * приходит отдельным нажатием. Тот же довод, по которому отдельно живёт
 * `fill-round.ts`.
 */

export type NeighboursQuestion = {
  readonly id: string;
  readonly roundId: string;
  readonly regionId: string;
  readonly neighbourIds: readonly string[];
  readonly language: QuestionLanguage;
};

export type NeighboursRound = {
  readonly roundId: string;
  readonly language: QuestionLanguage;
  readonly order: readonly NeighboursQuestion[];
  readonly currentIndex: number;
  readonly marked: readonly string[];
  readonly attempts: readonly Attempt[];
};

export type NeighboursVerdict = {
  readonly found: readonly string[];
  readonly missed: readonly string[];
  readonly extra: readonly string[];
  readonly isCorrect: boolean;
};

export type NeighboursRoundOptions = {
  readonly roundId: string;
  readonly language: QuestionLanguage;
  readonly random: () => number;
};

export type NeighboursAnswerInput = {
  readonly durationMs: number;
  readonly answeredAt: string;
};

/**
 * Спрашиваются только те, у кого сухопутных соседей больше одного: у Хайнаня и
 * Тайваня их нет вовсе, у Гонконга и Макао единственный Гуандун — такой вопрос
 * проверяет не знание, а умение нажать. Ответами все четверо остаются.
 */
export function askedRegions(regions: readonly Region[]): readonly Region[] {
  return regions.filter((region) => (REGION_NEIGHBOURS[region.id] ?? []).length > 1);
}

export function createNeighboursRound(
  regions: readonly Region[],
  options: NeighboursRoundOptions,
): NeighboursRound {
  const asked = askedRegions(regions);
  if (asked.length === 0) {
    throw new Error('Раунд не создан: некого спрашивать');
  }

  const order = shuffle(asked, options.random).map((region, index) => ({
    id: `${index + 1}-${region.id}`,
    roundId: options.roundId,
    regionId: region.id,
    neighbourIds: REGION_NEIGHBOURS[region.id],
    language: options.language,
  }));

  return {
    roundId: options.roundId,
    language: options.language,
    order,
    currentIndex: 0,
    marked: [],
    attempts: [],
  };
}

export function isNeighboursRoundFinished(round: NeighboursRound): boolean {
  return round.currentIndex >= round.order.length;
}

export function currentNeighboursQuestion(
  round: NeighboursRound,
): NeighboursQuestion {
  const question = round.order[round.currentIndex];
  if (!question) {
    throw new Error('Раунд завершён: текущего вопроса нет');
  }

  return question;
}

export function toggleMark(
  round: NeighboursRound,
  regionId: string,
): NeighboursRound {
  const marked = round.marked.includes(regionId)
    ? round.marked.filter((id) => id !== regionId)
    : [...round.marked, regionId];

  return { ...round, marked };
}

export function judge(
  question: NeighboursQuestion,
  marked: readonly string[],
): NeighboursVerdict {
  const truth = new Set(question.neighbourIds);
  const found = marked.filter((id) => truth.has(id));
  const extra = marked.filter((id) => !truth.has(id));
  const missed = question.neighbourIds.filter((id) => !marked.includes(id));

  return {
    found,
    missed,
    extra,
    isCorrect: missed.length === 0 && extra.length === 0,
  };
}

export function submitNeighbours(
  round: NeighboursRound,
  input: NeighboursAnswerInput,
): { readonly round: NeighboursRound; readonly verdict: NeighboursVerdict } {
  if (isNeighboursRoundFinished(round)) {
    throw new Error('Раунд завершён: отвечать не на что');
  }

  const question = currentNeighboursQuestion(round);
  const verdict = judge(question, round.marked);

  const attempt: Attempt = {
    questionId: question.id,
    roundId: question.roundId,
    target: neighboursTarget(question.regionId),
    exerciseType: 'find-on-map',
    language: question.language,
    isCorrect: verdict.isCorrect,
    durationMs: input.durationMs,
    answeredAt: input.answeredAt,
  };

  return {
    round: {
      ...round,
      currentIndex: round.currentIndex + 1,
      marked: [],
      attempts: [...round.attempts, attempt],
    },
    verdict,
  };
}
```

- [ ] **Шаг 5: Прогнать тесты**

Запустить: `npx vitest run src/domain/neighbours-round.test.ts && npx tsc -b`
Ожидается: PASS и компиляция без ошибок. Если `TargetKind` где-то разбирается
по всем значениям (`switch` без `default`), компилятор укажет места — дописать
новый вид там же.

- [ ] **Шаг 6: Коммит**

```bash
git add src/domain/round.ts src/domain/neighbours-round.ts src/domain/neighbours-round.test.ts
git commit -m "feat: движок раунда «соседи региона»"
```

---

### Task 3: Карта и список показывают отметки и три исхода

**Файлы:**
- Изменить: `src/map/ChinaMap.tsx`
- Изменить: `src/map/RegionAnswerList.tsx`
- Изменить: `src/map/outcome-labels.ts`
- Изменить: `src/styles.css`
- Тест: `src/map/ChinaMap.test.tsx`, `src/map/RegionAnswerList.test.tsx`

**Интерфейсы:**
- Отдаёт: признак `neighbourStates?: Readonly<Record<string, NeighbourState>>` у
  `ChinaMap` и `RegionAnswerList`, где
  `type NeighbourState = 'marked' | 'found' | 'missed' | 'extra'`;
  `NEIGHBOUR_LABELS` в `outcome-labels.ts`. На них опирается задача 4.

- [ ] **Шаг 1: Написать падающий тест**

В `src/map/RegionAnswerList.test.tsx` (способ рендера взять из соседних тестов
файла):

```ts
it('называет отметку и исход словом, а не только цветом', () => {
  renderList({
    neighbourStates: { hubei: 'marked' },
  });

  expect(screen.getByRole('button', { name: /Хубэй.*отмечен/ })).toBeTruthy();

  renderList({
    neighbourStates: { hubei: 'found', hunan: 'missed', gansu: 'extra' },
  });

  expect(screen.getByRole('button', { name: /Хубэй.*найден/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Хунань.*пропущен/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Ганьсу.*лишний/ })).toBeTruthy();
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/map/RegionAnswerList.test.tsx`
Ожидается: FAIL — признака нет.

- [ ] **Шаг 3: Завести слова**

В `src/map/outcome-labels.ts`:

```ts
export type NeighbourState = 'marked' | 'found' | 'missed' | 'extra';

/**
 * Состояние обязано быть доступно не только цветом: с программой чтения с
 * экрана ученик иначе не отличит отмеченную область от найденной
 * (AGENTS.md).
 */
export const NEIGHBOUR_LABELS: Readonly<Record<NeighbourState, string>> = {
  marked: 'отмечен',
  found: 'найден',
  missed: 'пропущен',
  extra: 'лишний',
};
```

- [ ] **Шаг 4: Показать состояние в списке**

В `src/map/RegionAnswerList.tsx` добавить признак
`neighbourStates?: Readonly<Record<string, NeighbourState>>` (по умолчанию
пустой объект) и в разметке кнопки:

```tsx
              aria-pressed={
                neighbourStates[region.id] === 'marked' ||
                region.id === selectedRegionId
              }
              data-neighbour-state={neighbourStates[region.id]}
...
              {neighbourStates[region.id]
                ? ` — ${NEIGHBOUR_LABELS[neighbourStates[region.id]!]}`
                : null}
```

- [ ] **Шаг 5: Показать состояние на карте**

В `src/map/ChinaMap.tsx` добавить тот же признак и рядом с установкой
`data-outcome` (искать `area.dataset.outcome`) поставить:

```ts
      const neighbourState = neighbourStates[regionId];
      if (neighbourState) {
        area.dataset.neighbourState = neighbourState;
      } else {
        delete area.dataset.neighbourState;
      }
```

Слово исхода должно попасть в `aria-label` области — там, где собирается
`suffix` (строка со `setAttribute('aria-label', ...)`), добавить
`NEIGHBOUR_LABELS[neighbourState]` тем же способом, каким туда попадает слово
исхода заполнения. Признак `neighbourStates` внести в список зависимостей
эффекта — иначе разбор не перерисуется.

- [ ] **Шаг 6: Нарисовать состояния**

В `src/styles.css` рядом с блоком `.china-map[data-map-variant='fill']
[data-outcome]` (искать строку 924) добавить:

```css
/*
 * Соседи. Четыре состояния и четыре разных канала: отметка — обводка,
 * найденный — сплошная заливка, пропущенный и лишний — разные штриховки.
 * Цвет здесь второй признак, а не единственный: тот же довод, что у исходов
 * заполнения карты.
 */
.china-map[data-map-variant='neighbours'] [data-neighbour-state='marked'] {
  fill: var(--map-selected);
  stroke: var(--map-selected-stroke);
  stroke-width: 2;
}

.china-map[data-map-variant='neighbours'] [data-neighbour-state='found'] {
  fill: var(--map-correct);
}

.china-map[data-map-variant='neighbours'] [data-neighbour-state='missed'] {
  fill: url('#map-hatch-second-try');
}

.china-map[data-map-variant='neighbours'] [data-neighbour-state='extra'] {
  fill: url('#map-hatch-failed');
}
```

Имена токенов взять существующие: подсмотреть в блоке `fill` рядом, какие
переменные там используются, и не заводить новых значений — только токены.
Значение `neighbours` добавить в перечисление `variant` в `ChinaMapProps`.

- [ ] **Шаг 7: Прогнать тесты**

Запустить: `npx vitest run src/map && npx vitest run scripts/validate-tokens.test.ts`
Ожидается: PASS. Проверка токенов обязана остаться зелёной: новые пары цветов
на экране проверяются ею по WCAG.

- [ ] **Шаг 8: Коммит**

```bash
git add src/map src/styles.css
git commit -m "feat: карта и список показывают отметку и три исхода соседей"
```

---

### Task 4: Экран раунда

**Файлы:**
- Создать: `src/features/exercise/NeighboursRound.tsx`
- Создать: `src/features/exercise/NeighboursRound.test.tsx`

**Интерфейсы:**
- Берёт из задач 2 и 3: движок и признаки карты.
- Отдаёт: компонент `NeighboursRound` со свойствами `regions`, `language`,
  `roundId`, `seed`, `onFinish(attempts)`, `onExit()` — те же, что у
  `FillMapRound`. На него опирается задача 5.

- [ ] **Шаг 1: Написать падающий тест**

Создать `src/features/exercise/NeighboursRound.test.tsx` по образцу
`FillMapRound.test.tsx` (оболочка, открытие списка, поиск спрошенного региона):

```ts
it('до «Готово» карта исхода не показывает', () => {
  renderRound();
  openAnswerList();
  fireEvent.click(screen.getByRole('button', { name: /Хубэй/ }));

  expect(screen.getByRole('button', { name: /Хубэй.*отмечен/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /найден|пропущен|лишний/ })).toBeNull();
});

it('после «Готово» называет найденных, пропущенных и лишних', () => {
  renderRound();
  fireEvent.click(screen.getByRole('button', { name: 'Готово' }));

  expect(screen.getAllByRole('button', { name: /пропущен/ }).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Далее' })).toBeTruthy();
});

it('на полностью верном ответе «Далее» не показывается', () => {
  vi.useFakeTimers();
  try {
    renderRound();
    markAllNeighbours();
    fireEvent.click(screen.getByRole('button', { name: 'Готово' }));

    expect(screen.queryByRole('button', { name: 'Далее' })).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});
```

Помощник `markAllNeighbours` отмечает из списка всех соседей спрошенного
региона, беря их из `REGION_NEIGHBOURS`.

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/features/exercise/NeighboursRound.test.tsx`
Ожидается: FAIL — компонента нет.

- [ ] **Шаг 3: Написать экран**

Создать `src/features/exercise/NeighboursRound.tsx` по образцу
`FillMapRound.tsx`: та же оболочка `RoundStage`, та же полоса хода, тот же
`RegionAnswerList` в панели. Отличия:

- заголовок вопроса — `Нажмите все регионы, граничащие с {имя}`, имя через
  `labelOf(region, question.language)` и `langOf`;
- спрошенный регион подсвечен через `highlight` — тем же признаком, которым
  `PhysicalRound` подсвечивает спрошенный объект;
- `neighbourStates` собирается из состояния: до разбора — `marked` у отмеченных;
  после — `found`, `missed`, `extra` из `verdict`;
- кнопка «Готово» — в той же полосе, где у других игр варианты ответа
  (`StageChoices`); при показанном разборе она сменяется на «Далее»;
- при верном ответе «Далее» не показывается: пауза `CORRECT_PAUSE_MS` из
  `round-pace.ts` и следующий вопрос, как в остальных играх;
- под картой строка счёта: `Найдено {found} из {всего}, лишних {extra}`;
- по завершении — `onFinish(round.attempts)`.

Два места, которые в образце подсмотреть не у чего, — вот они целиком.
Состояния карты:

```tsx
  const question = currentNeighboursQuestion(round);

  const neighbourStates: Record<string, NeighbourState> = {};
  if (verdict === null) {
    for (const id of round.marked) {
      neighbourStates[id] = 'marked';
    }
  } else {
    for (const id of verdict.found) {
      neighbourStates[id] = 'found';
    }
    for (const id of verdict.missed) {
      neighbourStates[id] = 'missed';
    }
    for (const id of verdict.extra) {
      neighbourStates[id] = 'extra';
    }
  }
```

Закрытие вопроса — верный ответ идёт дальше сам, ошибка ждёт «Далее»:

```tsx
  function handleDone() {
    const answered = submitNeighbours(round, {
      durationMs: Date.now() - startedAt,
      answeredAt: new Date().toISOString(),
    });

    setVerdict(answered.verdict);

    if (answered.verdict.isCorrect) {
      setTimeout(() => {
        setVerdict(null);
        setRound(answered.round);
      }, CORRECT_PAUSE_MS);
    } else {
      setPending(answered.round);
    }
  }
```

`pending` — раунд, который встанет на место нынешнего по кнопке «Далее»:
показывать разбор на уже сменившемся вопросе нельзя, а держать оба состояния
в одном — значит путать «что спрошено» и «что разобрано».

- [ ] **Шаг 4: Прогнать тесты**

Запустить: `npx vitest run src/features/exercise/NeighboursRound.test.tsx`
Ожидается: PASS.

- [ ] **Шаг 5: Коммит**

```bash
git add src/features/exercise/NeighboursRound.tsx src/features/exercise/NeighboursRound.test.tsx
git commit -m "feat: экран раунда «соседи региона»"
```

---

### Task 5: Карточка на главной и подключение

**Файлы:**
- Изменить: `src/features/exercise/exercise-modes.ts`
- Изменить: `src/features/home/HomePage.tsx`
- Изменить: `src/App.tsx`
- Тест: `src/features/home/HomePage.test.tsx`, `src/App.test.tsx`

- [ ] **Шаг 1: Написать падающий тест**

В `src/features/home/HomePage.test.tsx`:

```ts
it('запускает игру про соседей с главной', () => {
  const { onStartNeighboursRound } = renderHome();
  fireEvent.click(screen.getByRole('button', { name: /Соседи региона/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Начать' }));

  expect(onStartNeighboursRound).toHaveBeenCalledWith('ru');
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/features/home/HomePage.test.tsx`
Ожидается: FAIL — карточки нет.

- [ ] **Шаг 3: Завести карточку**

В `src/features/exercise/exercise-modes.ts` добавить в объединение видов
`| { readonly kind: 'neighbours' }` и карточку в `MODE_CARDS` последней в
группе `regions`:

```ts
  {
    id: 'neighbours',
    kind: 'neighbours',
    mark: '邻',
    title: 'Соседи региона',
    summary:
      'Назван регион — отметить все, что с ним граничат, и нажать «Готово». Верно, только когда множество совпало точно: пропущенный сосед и лишний считаются одинаково.',
    volume: '30 регионов · около 12 минут',
    groupId: 'regions',
  },
```

Хайнань, Тайвань, Гонконг и Макао не спрашиваются — отсюда 30, а не 34.

- [ ] **Шаг 4: Подключить экран**

В `src/features/home/HomePage.tsx` добавить свойство
`onStartNeighboursRound: (language: QuestionLanguage) => void` и ветку в
`start()`:

```ts
    } else if (card.kind === 'neighbours') {
      onStartNeighboursRound(language);
```

В `src/App.tsx` — по образцу `startFillRound`: состояние экрана `'neighbours'`,
функция запуска, отрисовка `NeighboursRound` с записью попыток через
`commitAttempts` и переходом на итоги.

- [ ] **Шаг 5: Прогнать тесты**

Запустить: `npm test`
Ожидается: все зелёные. Тесты главной, где перечисляются карточки, могут
считать их число — обновить ожидание с 15 на 16.

- [ ] **Шаг 6: Коммит**

```bash
git add src/features/exercise/exercise-modes.ts src/features/home src/App.tsx
git commit -m "feat: игра «соседи региона» запускается с главной"
```

---

### Task 6: Итоги и повтор ошибок

**Файлы:**
- Изменить: `src/features/results/RoundResultsPage.tsx`
- Изменить: `src/App.tsx` (повтор ошибок для нового вида)
- Тест: `src/features/results/RoundResultsPage.test.tsx`

- [ ] **Шаг 1: Написать падающий тест**

```ts
it('называет соседей своим словом на итогах', () => {
  renderResults({ targetKind: 'neighbours', wrongCount: 2 });

  expect(screen.getByText(/Соседей стоит повторить/)).toBeTruthy();
});
```

Точный способ рендера и имя свойства взять из соседних тестов файла.

- [ ] **Шаг 2: Убедиться, что тест падает**

Запустить: `npx vitest run src/features/results/RoundResultsPage.test.tsx`
Ожидается: FAIL.

- [ ] **Шаг 3: Дописать строку итогов**

Там, где экран выбирает слово по виду цели (искать `TargetKind` в
`RoundResultsPage.tsx`), добавить ветку `neighbours`: надзаголовок «Соседей
стоит повторить», а в списке — имена спрошенных регионов. Склонение числа взять
тем же помощником, каким склоняются регионы.

- [ ] **Шаг 4: Включить повтор ошибок**

В `src/App.tsx`, где кнопка «Повторить ошибки» собирает цели по виду, добавить
ветку для `neighbours`: раунд создаётся из регионов с ошибкой, той же игрой.

- [ ] **Шаг 5: Прогнать тесты**

Запустить: `npm test`
Ожидается: все зелёные.

- [ ] **Шаг 6: Коммит**

```bash
git add src/features/results src/App.tsx
git commit -m "feat: итоги и повтор ошибок для игры про соседей"
```

---

### Task 7: Документы и ручная проверка

**Файлы:**
- Изменить: `EXERCISES.md`, `DECISIONS.md`, `CHANGELOG.md`, `PLAN.md`

- [ ] **Шаг 1: Описать игру в EXERCISES.md**

Раздел «Соседи региона»: что спрашивают, почему тридцать, как закрывается
вопрос, что показывает разбор, почему соседство считается по карте.

- [ ] **Шаг 2: Записать решения**

В `DECISIONS.md` (сверху, 2026-08-30): множественный ответ закрывается «Готово»
и одной попыткой; спрашиваются тридцать; соседство считается по геометрии, а
не по справочнику, и порог сторожится плато; заведён отдельный вид цели.

- [ ] **Шаг 3: Пополнить CHANGELOG.md**

Раздел `Unreleased` → `Added`: новая игра, число рёбер графа, что острова и САР
остаются ответами.

- [ ] **Шаг 4: Отметить работу в PLAN.md**

Пункт 12 — отметка о сделанной первой трети (соседи), с явной оговоркой, что
районы и зоны остаются и требуют источника. Поправить утверждение «граф
смежности уже строит generate:palette»: его там нет, генератор написан заново.

- [ ] **Шаг 5: Ручная проверка в браузере**

Запустить `npm run dev` и пройти:

1. Главная → «Соседи региона» → раунд; отметить соседей указателем, нажать
   «Готово», прочитать разбор.
2. Вопрос про Гуандун: отметить Гонконг и Макао **из списка** — на карте они
   мельче цели нажатия.
3. Ошибиться намеренно: увидеть пропущенных и лишних разными узорами.
4. Ответить полностью верно: «Далее» не появляется, раунд идёт сам.
5. Дойти до итогов, запустить повтор ошибок.
6. Проверить, что игры по регионам не изменились: «Найти на карте» работает
   как прежде.

- [ ] **Шаг 6: Полная проверка**

Запустить: `npm run lint && npm test && npm run build`
Ожидается: линтер молчит, все тесты зелёные, три валидатора и сборка проходят.

- [ ] **Шаг 7: Коммит**

```bash
git add EXERCISES.md DECISIONS.md CHANGELOG.md PLAN.md
git commit -m "docs: игра «соседи региона» записана в спецификации и журналах"
```

---

## Готово, когда

- граф соседства сгенерирован, отпечаток и плато порога проверяются сборкой;
- игра запускается с главной, спрашивает тридцать регионов и оценивает по
  точному совпадению множества;
- разбор различает найденных, пропущенных и лишних узором и словом;
- ответить можно из списка, без указателя;
- попытки идут в прогресс с видом `neighbours`, повтор ошибок работает;
- `npm run lint`, `npm test`, `npm run build` проходят;
- шесть сценариев ручной проверки пройдены;
- `EXERCISES.md`, `DECISIONS.md`, `CHANGELOG.md`, `PLAN.md` обновлены.
