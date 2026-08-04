# Макет экрана раунда — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Экран раунда перестаёт скроллиться: вопрос, карта и результат видны
одновременно, а карта растёт вместе с экраном.

**Architecture:** Две колонки на широком экране (вопрос слева, карта справа),
одна на узком. Равнозначный список из 34 кнопок уезжает под обе колонки в
раскрывающийся блок, атрибуция и «Прервать раунд» — в подвал. Список и
атрибуция становятся отдельными компонентами, потому что теперь их размещает
страница, а не карта.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4 + Testing Library,
обычный CSS на кастомных свойствах.

Спецификация: `docs/superpowers/specs/2026-08-04-round-screen-layout-design.md`.

## Global Constraints

- Компоненты не записывают цвета, размеры и длительности напрямую — только
  через токены из `src/design/tokens.css`.
- Порог двух колонок — `1024px`. Он же живёт в коде как `TWO_COLUMN_QUERY`.
- Минимальная цель нажатия — `var(--target-min)`, 44 px.
- Интерфейсные строки и комментарии — по-русски, как во всём проекте.
- Ветка `feat/round-screen-layout` уже создана, работа идёт в ней.
- После каждой задачи: `npx vitest run`, `npx eslint .` — обе чистые.

---

## Структура файлов

**Создаются:**

| файл | ответственность |
|---|---|
| `src/map/region-selection.ts` | правила «регион закрыт» и «регион выбираем» — одни на карту и на список |
| `src/map/outcome-labels.ts` | словесные подписи исходов для доступного имени |
| `src/map/RegionAnswerList.tsx` | равнозначный список регионов, обычный или свёрнутый |
| `src/map/MapAttribution.tsx` | строка о происхождении геометрии |
| `src/map/region-selection.test.ts`, `src/map/RegionAnswerList.test.tsx`, `src/map/MapAttribution.test.tsx` | их проверки |

**Меняются:**

| файл | что |
|---|---|
| `src/design/tokens.css` | `--map-aspect`, `--round-map-chrome` |
| `src/map/target-size.ts` | `MAP_VIEWBOX_HEIGHT` |
| `src/map/validate-map.ts` | `validateViewBox` сверяет и высоту |
| `src/map/ChinaMap.tsx` | параметр `usage`, общие правила, список и атрибуция вынесены |
| `src/features/exercise/ExerciseRound.tsx` | сетка, подвал, раскрывающийся список |
| `src/features/exercise/FillMapRound.tsx` | то же |
| `src/features/topic-selection/TopicSelectionPage.tsx` | атрибуция в конец страницы |
| `src/styles.css` | стили экрана раунда |
| `scripts/validate-tokens.test.ts` | `--map-aspect` сверяется с viewBox |

---

### Task 1: Пропорция карты в токенах и проверка viewBox

Коробка карты в CSS задаётся пропорцией `774 / 569`. Если карту заменят на
источник с другими размерами, пропорция разойдётся с содержимым молча.

**Files:**
- Modify: `src/map/target-size.ts`
- Modify: `src/map/validate-map.ts:35-44`
- Modify: `src/design/tokens.css`
- Test: `src/map/validate-map.test.ts`, `scripts/validate-tokens.test.ts`

**Interfaces:**
- Produces: `MAP_VIEWBOX_HEIGHT: number` из `src/map/target-size.ts`;
  токены `--map-aspect` и `--round-map-chrome`.

- [ ] **Step 1: Написать падающие тесты**

В `src/map/validate-map.test.ts` дописать в конец:

```ts
it('сверяет высоту viewBox: от неё зависит пропорция коробки карты в CSS', () => {
  expect(() => validateViewBox('0 0 774 600')).toThrow(
    /Высота viewBox карты 600 не совпадает/,
  );
});
```

В `scripts/validate-tokens.test.ts` дописать импорт и блок:

```ts
import { MAP_VIEWBOX_HEIGHT, MAP_VIEWBOX_WIDTH } from '../src/map/target-size';
```

```ts
describe('макет карты', () => {
  it('пропорция карты в токенах совпадает с viewBox', () => {
    const [width, height] = resolve(tokens, '--map-aspect')
      .split('/')
      .map((part) => Number(part.trim()));

    expect(width).toBe(MAP_VIEWBOX_WIDTH);
    expect(height).toBe(MAP_VIEWBOX_HEIGHT);
  });

  it('высота служебных полос экрана раунда задана токеном', () => {
    expect(tokens.has('--round-map-chrome')).toBe(true);
  });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/map/validate-map.test.ts scripts/validate-tokens.test.ts`
Expected: FAIL — `validateViewBox('0 0 774 600')` не бросает, `resolve` бросает
`Нет токена: --map-aspect`.

- [ ] **Step 3: Добавить константу высоты**

В `src/map/target-size.ts` после `MAP_VIEWBOX_WIDTH`:

```ts
/** Высота viewBox карты. Из пары с шириной берётся пропорция `--map-aspect`. */
export const MAP_VIEWBOX_HEIGHT = 569;
```

- [ ] **Step 4: Проверять высоту в `validateViewBox`**

В `src/map/validate-map.ts` заменить импорт и функцию:

```ts
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_WIDTH,
  MIN_TARGET_PX,
  REFERENCE_MAP_WIDTH,
  undersizedRegions,
} from './target-size';
```

```ts
/**
 * Единицы палитры считаны из конкретного `viewBox`. Если карту заменят на
 * источник с другими размерами, пересчёт в пиксели станет врать, порог
 * нажимаемости — пропускать мелкие области, а пропорция `--map-aspect`
 * в токенах разойдётся с содержимым коробки.
 */
export function validateViewBox(viewBox: string | null): void {
  const parts = viewBox?.trim().split(/\s+/) ?? [];
  const width = Number(parts[2]);
  const height = Number(parts[3]);

  if (width !== MAP_VIEWBOX_WIDTH) {
    throw new Error(
      `Ширина viewBox карты ${width} не совпадает с MAP_VIEWBOX_WIDTH ${MAP_VIEWBOX_WIDTH}. ` +
        'Обновите константу и перегенерируйте палитру и цели нажатия',
    );
  }

  if (height !== MAP_VIEWBOX_HEIGHT) {
    throw new Error(
      `Высота viewBox карты ${height} не совпадает с MAP_VIEWBOX_HEIGHT ${MAP_VIEWBOX_HEIGHT}. ` +
        'Обновите константу и токен --map-aspect в tokens.css',
    );
  }
}
```

- [ ] **Step 5: Добавить токены**

В `src/design/tokens.css`, сразу после строки `--target-min: 44px;`:

```css
  /*
   * Всё, что на экране раунда стоит выше и ниже карты: отступы оболочки (64),
   * отступы блока списка и подвала (48), внутренний отступ подвала (16),
   * заголовок списка и кнопка подвала (88). Карта считает от него свою
   * предельную высоту, поэтому добавленная в подвал строка требует правки
   * здесь же.
   */
  --round-map-chrome: calc(
    2 * var(--s-6) + 2 * var(--s-5) + var(--s-4) + 2 * var(--target-min)
  );
```

В том же файле, в разделе `--- 3. Карта ---`, сразу после `--map-sea`:

```css
  /*
   * Пропорция карты: 774×569 в единицах viewBox. Сверяется с
   * MAP_VIEWBOX_WIDTH и MAP_VIEWBOX_HEIGHT в scripts/validate-tokens.test.ts.
   */
  --map-aspect: 774 / 569;
```

- [ ] **Step 6: Проверить тесты**

Run: `npx vitest run src/map/validate-map.test.ts scripts/validate-tokens.test.ts`
Expected: PASS.

Run: `npm run validate:map`
Expected: `Проверено областей карты: 34. Целей нажатия: 3. Выносок: 2.`

- [ ] **Step 7: Коммит**

```bash
git add src/map/target-size.ts src/map/validate-map.ts src/map/validate-map.test.ts src/design/tokens.css scripts/validate-tokens.test.ts
git commit -m "feat: fix the map aspect ratio in tokens"
```

---

### Task 2: Общие правила выбора региона

Сейчас правила «регион закрыт» и «регион выбираем» записаны внутри `ChinaMap`.
Список регионов из него уезжает, и правила нужны обоим — разойтись им нельзя,
иначе список примет ответ там, где карта уже не принимает.

**Files:**
- Create: `src/map/region-selection.ts`, `src/map/outcome-labels.ts`
- Test: `src/map/region-selection.test.ts`
- Modify: `src/map/ChinaMap.tsx`

**Interfaces:**
- Produces:
  - `type AnswerState = 'correct' | 'incorrect' | 'disabled'`
  - `type RegionSelectionRules = { interactive: boolean; paused: boolean; answerStates: Readonly<Record<string, AnswerState>>; outcomes: Readonly<Record<string, RegionOutcome>> }`
  - `isRegionClosed(rules: RegionSelectionRules, regionId: string): boolean`
  - `isRegionSelectable(rules: RegionSelectionRules, regionId: string): boolean`
  - `OUTCOME_LABELS: Readonly<Record<RegionOutcome, string>>`

- [ ] **Step 1: Написать падающий тест**

Создать `src/map/region-selection.test.ts`:

```ts
import {
  isRegionClosed,
  isRegionSelectable,
  type RegionSelectionRules,
} from './region-selection';

const OPEN: RegionSelectionRules = {
  interactive: true,
  paused: false,
  answerStates: {},
  outcomes: {},
};

it('открытый регион выбираем', () => {
  expect(isRegionClosed(OPEN, 'sichuan')).toBe(false);
  expect(isRegionSelectable(OPEN, 'sichuan')).toBe(true);
});

it('отвеченный регион закрыт', () => {
  const rules = { ...OPEN, answerStates: { sichuan: 'correct' } } as const;

  expect(isRegionClosed(rules, 'sichuan')).toBe(true);
  expect(isRegionSelectable(rules, 'sichuan')).toBe(false);
});

it('закрашенный регион закрыт', () => {
  const rules = { ...OPEN, outcomes: { sichuan: 'first-try' } } as const;

  expect(isRegionClosed(rules, 'sichuan')).toBe(true);
  expect(isRegionSelectable(rules, 'sichuan')).toBe(false);
});

it('пауза снимает выбираемость, но не закрывает регион', () => {
  // Различие важно: `disabled` на кнопке, где стоит фокус, сбрасывает его.
  const rules = { ...OPEN, paused: true };

  expect(isRegionClosed(rules, 'sichuan')).toBe(false);
  expect(isRegionSelectable(rules, 'sichuan')).toBe(false);
});

it('неинтерактивная карта не выбирает ничего', () => {
  expect(isRegionSelectable({ ...OPEN, interactive: false }, 'sichuan')).toBe(
    false,
  );
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/map/region-selection.test.ts`
Expected: FAIL — `Failed to resolve import "./region-selection"`.

- [ ] **Step 3: Написать модуль правил**

Создать `src/map/region-selection.ts`:

```ts
/**
 * Правила выбираемости региона. Одни и те же для области на карте и для
 * кнопки в равнозначном списке: разойтись им нельзя, иначе список примет
 * ответ там, где карта его уже не принимает.
 */
import type { RegionOutcome } from '../domain/fill-round';

export type AnswerState = 'correct' | 'incorrect' | 'disabled';

export type RegionSelectionRules = {
  readonly interactive: boolean;
  readonly paused: boolean;
  readonly answerStates: Readonly<Record<string, AnswerState>>;
  readonly outcomes: Readonly<Record<string, RegionOutcome>>;
};

/**
 * Регион своё отыграл: он либо уже отвечен (второй ответ на вопрос запрещён,
 * SPEC.md), либо закрашен в игровом режиме. Повторное нажатие не должно
 * стоить попытки на текущем вопросе.
 */
export function isRegionClosed(
  rules: RegionSelectionRules,
  regionId: string,
): boolean {
  return (
    rules.answerStates[regionId] !== undefined ||
    rules.outcomes[regionId] !== undefined
  );
}

/**
 * Пауза входит сюда, но не в `isRegionClosed`. Разница нужна кнопкам списка:
 * выключать их на паузе через `disabled` значило бы сбросить фокус
 * клавиатуры, поэтому кнопка остаётся включённой и просто не отвечает.
 */
export function isRegionSelectable(
  rules: RegionSelectionRules,
  regionId: string,
): boolean {
  return rules.interactive && !rules.paused && !isRegionClosed(rules, regionId);
}
```

Создать `src/map/outcome-labels.ts`:

```ts
import type { RegionOutcome } from '../domain/fill-round';

/**
 * Исход обязан быть доступен не только цветом: с программой чтения с экрана
 * ученик иначе не отличит закрашенный регион от ещё не спрошенного
 * (AGENTS.md: карта должна иметь текстовые альтернативы и не полагаться
 * только на цвет).
 */
export const OUTCOME_LABELS: Readonly<Record<RegionOutcome, string>> = {
  'first-try': 'взят с первой попытки',
  'second-try': 'взят со второй попытки',
  failed: 'не угадан',
};
```

- [ ] **Step 4: Перевести `ChinaMap` на общие правила**

В `src/map/ChinaMap.tsx` удалить локальные `OUTCOME_LABELS` (строки 21–25),
локальный `export type AnswerState` (строка 8) и функции `isSelectable`
и `isClosed` (строки 187–204). Вместо них — импорты:

```ts
import { OUTCOME_LABELS } from './outcome-labels';
import {
  isRegionClosed,
  isRegionSelectable,
  type AnswerState,
} from './region-selection';
```

Тип `AnswerState` продолжает быть доступен из `ChinaMap` для тех, кто его уже
импортирует:

```ts
export type { AnswerState } from './region-selection';
```

Заменить `selectTarget`:

```ts
  function selectTarget(target: EventTarget | null) {
    const regionId = getRegionId(target);
    if (
      regionId !== null &&
      isRegionSelectable(
        { interactive, paused, answerStates, outcomes },
        regionId,
      )
    ) {
      onSelect(regionId);
    }
  }
```

В списке регионов внутри `ChinaMap` заменить два вызова:

```ts
                  disabled={isRegionClosed(
                    { interactive, paused, answerStates, outcomes },
                    region.id,
                  )}
                  onClick={() => {
                    if (
                      isRegionSelectable(
                        { interactive, paused, answerStates, outcomes },
                        region.id,
                      )
                    ) {
                      onSelect(region.id);
                    }
                  }}
```

- [ ] **Step 5: Проверить тесты**

Run: `npx vitest run`
Expected: PASS, включая все существующие проверки `ChinaMap`.

Run: `npx eslint .`
Expected: без замечаний.

- [ ] **Step 6: Коммит**

```bash
git add src/map/region-selection.ts src/map/region-selection.test.ts src/map/outcome-labels.ts src/map/ChinaMap.tsx
git commit -m "refactor: share the region selection rules"
```

---

### Task 3: Компонент `RegionAnswerList`

Список из 34 кнопок должен стоять под обеими колонками, а карта — в правой.
Владеть обоими `ChinaMap` больше не может. Разметка списка при этом остаётся
одна: на экране темы он обычный, на экране раунда — свёрнутый.

**Files:**
- Create: `src/map/RegionAnswerList.tsx`
- Test: `src/map/RegionAnswerList.test.tsx`
- Modify: `src/map/ChinaMap.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `isRegionClosed`, `isRegionSelectable`, `AnswerState` из
  `src/map/region-selection.ts`; `OUTCOME_LABELS` из `src/map/outcome-labels.ts`.
- Produces:
  - `TWO_COLUMN_QUERY = '(min-width: 1024px)'`
  - `regionsWord(count: number): string`
  - `RegionAnswerList` с параметрами `regions`, `selectedRegionId`,
    `onSelect`, `answerStates?`, `outcomes?`, `interactive?`, `paused?`,
    `presentation?: 'inline' | 'disclosure'`.

- [ ] **Step 1: Написать падающий тест**

Создать `src/map/RegionAnswerList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { regions } from '../content/regions';
import {
  RegionAnswerList,
  regionsWord,
  TWO_COLUMN_QUERY,
} from './RegionAnswerList';

function renderList(presentation: 'inline' | 'disclosure') {
  return render(
    <RegionAnswerList
      presentation={presentation}
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
    />,
  );
}

it('склоняет слово «регион» по числу', () => {
  expect(regionsWord(1)).toBe('регион');
  expect(regionsWord(34)).toBe('региона');
  expect(regionsWord(11)).toBe('регионов');
  expect(regionsWord(25)).toBe('регионов');
});

it('обычный вид отдаёт список без обёртки', () => {
  const { container } = renderList('inline');

  expect(container.querySelector('details')).toBeNull();
  expect(
    screen.getByRole('list', { name: 'Список регионов карты' }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(34);
});

it('свёрнутый вид называет, что внутри и сколько', () => {
  renderList('disclosure');

  expect(screen.getByText('Ответить из списка (34 региона)')).toBeInTheDocument();
});

it('без matchMedia считает экран узким и раскрывает список', () => {
  // В jsdom `window.matchMedia` нет. Раскрытый по умолчанию список делает
  // остальные проверки независимыми от вёрстки: они отвечают его кнопками.
  const { container } = renderList('disclosure');

  expect(container.querySelector('details')).toHaveAttribute('open');
});

it('на широком экране список свёрнут: 34 кнопки не должны стоять в обходе Tab', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === TWO_COLUMN_QUERY,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

  const { container } = renderList('disclosure');

  expect(container.querySelector('details')).not.toHaveAttribute('open');

  vi.unstubAllGlobals();
});

it('закрытый регион не отвечает и выключен', () => {
  const select = vi.fn();
  render(
    <RegionAnswerList
      regions={regions}
      selectedRegionId={null}
      onSelect={select}
      outcomes={{ sichuan: 'first-try' }}
    />,
  );

  const button = screen.getByRole('button', { name: /^Сычуань \(四川省\)/ });

  expect(button).toBeDisabled();
  expect(button).toHaveAccessibleName(
    'Сычуань (四川省) — взят с первой попытки',
  );
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/map/RegionAnswerList.test.tsx`
Expected: FAIL — `Failed to resolve import "./RegionAnswerList"`.

- [ ] **Step 3: Написать компонент**

Создать `src/map/RegionAnswerList.tsx`:

```tsx
import { useState } from 'react';
import type { Region } from '../content/types';
import type { RegionOutcome } from '../domain/fill-round';
import { OUTCOME_LABELS } from './outcome-labels';
import {
  isRegionClosed,
  isRegionSelectable,
  type AnswerState,
} from './region-selection';

/** Порог двух колонок. Ниже него список — основной способ ответа. */
export const TWO_COLUMN_QUERY = '(min-width: 1024px)';

/** 1 регион, 2–4 региона, 5+ регионов: иначе заголовок блока звучит сломанно. */
export function regionsWord(count: number): string {
  const teens = count % 100;
  const last = count % 10;

  if (teens >= 11 && teens <= 14) {
    return 'регионов';
  }

  if (last === 1) {
    return 'регион';
  }

  return last >= 2 && last <= 4 ? 'региона' : 'регионов';
}

/**
 * Начальное состояние блока. `window.matchMedia` в jsdom нет, и отсутствие
 * читается как «узкий экран»: на проверках список должен быть раскрыт, иначе
 * тесты ответа зависели бы от вёрстки.
 */
function defaultOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return !window.matchMedia(TWO_COLUMN_QUERY).matches;
}

const NO_ANSWER_STATES: Readonly<Record<string, AnswerState>> = {};
const NO_OUTCOMES: Readonly<Record<string, RegionOutcome>> = {};

export type RegionAnswerListProps = {
  readonly regions: readonly Region[];
  readonly selectedRegionId: string | null;
  readonly onSelect: (regionId: string) => void;
  readonly answerStates?: Readonly<Record<string, AnswerState>>;
  readonly outcomes?: Readonly<Record<string, RegionOutcome>>;
  readonly interactive?: boolean;
  readonly paused?: boolean;
  /** `inline` — экран темы, `disclosure` — экран раунда. */
  readonly presentation?: 'inline' | 'disclosure';
};

/**
 * Равнозначный способ ответа. WCAG 2.5.8 разрешает цели меньше 24×24, если то
 * же действие доступно управлением нужного размера на той же странице: при
 * 343 px 28 областей из 34 меньше порога, и список там — единственный рабочий
 * способ ответа.
 *
 * Свёрнут блок или раскрыт, для соответствия значения не имеет — исключение
 * требует, чтобы управление было на странице. Поэтому на широком экране он
 * закрыт (это снимает 34 остановки Tab из 72), а на узком раскрыт.
 */
export function RegionAnswerList({
  regions,
  selectedRegionId,
  onSelect,
  answerStates = NO_ANSWER_STATES,
  outcomes = NO_OUTCOMES,
  interactive = true,
  paused = false,
  presentation = 'inline',
}: RegionAnswerListProps) {
  const [open, setOpen] = useState(defaultOpen);
  const rules = { interactive, paused, answerStates, outcomes };

  const list = (
    <ul className="map-alternative" aria-label="Список регионов карты">
      {regions.map((region) => {
        const outcome = outcomes[region.id];

        return (
          <li key={region.id}>
            <button
              type="button"
              aria-pressed={region.id === selectedRegionId}
              aria-disabled={paused ? true : undefined}
              data-outcome={outcome}
              disabled={isRegionClosed(rules, region.id)}
              onClick={() => {
                if (isRegionSelectable(rules, region.id)) {
                  onSelect(region.id);
                }
              }}
            >
              {region.nameRu} <span lang="zh-Hans">({region.nameZh})</span>
              {outcome ? ` — ${OUTCOME_LABELS[outcome]}` : null}
            </button>
          </li>
        );
      })}
    </ul>
  );

  if (presentation === 'inline') {
    return list;
  }

  return (
    <details
      className="region-answer-list"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        Ответить из списка ({regions.length} {regionsWord(regions.length)})
      </summary>
      {list}
    </details>
  );
}
```

- [ ] **Step 4: Проверить тест**

Run: `npx vitest run src/map/RegionAnswerList.test.tsx`
Expected: PASS.

- [ ] **Step 5: Убрать разметку списка из `ChinaMap`**

В `src/map/ChinaMap.tsx` заменить весь блок `{interactive ? (<ul
className="map-alternative" …>…</ul>) : null}` (строки 267–293) на:

```tsx
      {interactive ? (
        <RegionAnswerList
          regions={regions}
          selectedRegionId={selectedRegionId}
          onSelect={onSelect}
          answerStates={answerStates}
          outcomes={outcomes}
          paused={paused}
        />
      ) : null}
```

и добавить импорт:

```ts
import { RegionAnswerList } from './RegionAnswerList';
```

После этого `isRegionClosed` в `ChinaMap` больше не используется — убрать его
из импорта, оставив `isRegionSelectable` и тип `AnswerState`.

- [ ] **Step 6: Добавить стили блока**

В `src/styles.css`, сразу после правила `.map-alternative
button[aria-disabled='true']`:

```css
/*
 * На экране раунда список уезжает в свёрнутый блок: 34 кнопки — это половина
 * всех остановок Tab на экране, и держать их раскрытыми там, где работает
 * карта, незачем.
 */
.region-answer-list {
  margin-block-start: var(--s-5);
}

.region-answer-list summary {
  align-items: center;
  color: var(--text-on-ground);
  cursor: pointer;
  display: flex;
  min-block-size: var(--target-min);
}

.region-answer-list summary:focus-visible {
  outline: var(--border-focus) solid var(--focus-on-ground);
  outline-offset: var(--s-1);
}

.region-answer-list .map-alternative {
  margin-block-start: var(--s-3);
}
```

- [ ] **Step 7: Проверить тесты**

Run: `npx vitest run`
Expected: PASS — существующие проверки `ChinaMap` и обоих экранов раунда
по-прежнему находят кнопки списка.

Run: `npx eslint .`
Expected: без замечаний.

- [ ] **Step 8: Коммит**

```bash
git add src/map/RegionAnswerList.tsx src/map/RegionAnswerList.test.tsx src/map/ChinaMap.tsx src/styles.css
git commit -m "feat: extract the equivalent region list"
```

---

### Task 4: Атрибуция карты отдельным компонентом

Три ссылки на лицензию стоят между вопросом и картой и занимают первые три
остановки Tab на экране упражнения. Их место — подвал, и решать это должна
страница, а не карта.

**Files:**
- Create: `src/map/MapAttribution.tsx`
- Test: `src/map/MapAttribution.test.tsx`
- Modify: `src/map/ChinaMap.tsx:219-226`
- Modify: `src/features/topic-selection/TopicSelectionPage.tsx`
- Test: `src/features/topic-selection/TopicSelectionPage.test.tsx`

**Interfaces:**
- Produces: компонент `MapAttribution` без параметров.

- [ ] **Step 1: Написать падающие тесты**

Создать `src/map/MapAttribution.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MapAttribution } from './MapAttribution';

it('называет источник геометрии и лицензию', () => {
  render(<MapAttribution />);

  expect(screen.getByRole('link', { name: '@svg-maps/china' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'china-geojson' })).toBeInTheDocument();
});
```

В `src/map/ChinaMap.test.tsx` дописать:

```tsx
it('карта больше не печатает атрибуцию: её ставит страница', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
    />,
  );

  expect(screen.queryByRole('link', { name: 'CC BY 4.0' })).toBeNull();
});
```

В `src/features/topic-selection/TopicSelectionPage.test.tsx` дописать:

```tsx
it('атрибуция карты стоит последней на странице', () => {
  const { container } = render(<TopicSelectionPage regions={regions} />);

  expect(container.querySelector('main')?.lastElementChild).toHaveClass(
    'map-attribution',
  );
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/map/MapAttribution.test.tsx src/map/ChinaMap.test.tsx src/features/topic-selection/TopicSelectionPage.test.tsx`
Expected: FAIL — модуля `./MapAttribution` нет; `ChinaMap` всё ещё печатает
ссылку `CC BY 4.0`; последним ребёнком `main` стоит секция регионов.

- [ ] **Step 3: Написать компонент**

Создать `src/map/MapAttribution.tsx`:

```tsx
/**
 * Сведения о происхождении геометрии. Стоят в подвале, а не над картой: это
 * не шаг обучения, и трём ссылкам незачем быть первыми остановками Tab на
 * экране, где ученик отвечает.
 */
export function MapAttribution() {
  return (
    <p className="map-attribution">
      Геометрия 33 регионов: карта{' '}
      <a href="https://www.npmjs.com/package/@svg-maps/china">@svg-maps/china</a>{' '}
      (Victor Cazanave, на основе MapSVG) по лицензии{' '}
      <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.{' '}
      Контур Тайваня:{' '}
      <a href="https://github.com/antvis/china-geojson">china-geojson</a> (AntV).
    </p>
  );
}
```

- [ ] **Step 4: Убрать атрибуцию из карты**

В `src/map/ChinaMap.tsx` удалить абзац `<p className="map-attribution">…</p>`
целиком (строки 219–226).

- [ ] **Step 5: Поставить атрибуцию в конец экрана темы**

В `src/features/topic-selection/TopicSelectionPage.tsx` добавить импорт:

```ts
import { MapAttribution } from '../../map/MapAttribution';
```

и перед закрывающим `</main>`, после секции регионов:

```tsx
      <MapAttribution />
```

- [ ] **Step 6: Проверить тесты**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Коммит**

```bash
git add src/map/MapAttribution.tsx src/map/MapAttribution.test.tsx src/map/ChinaMap.tsx src/map/ChinaMap.test.tsx src/features/topic-selection/TopicSelectionPage.tsx src/features/topic-selection/TopicSelectionPage.test.tsx
git commit -m "feat: move the map attribution out of the map"
```

---

### Task 5: `ChinaMap` различает разглядывание и ответ

На экране раунда карте не нужны ни заголовок «Интерактивная карта», ни
подсказка, ни строка «Выбрано: …», ни список внутри секции: вопрос уже сказал,
что делать, о результате объявляет карточка ответа, а список ставит страница.
Всё это — одна роль, и выражает её один параметр.

**Files:**
- Modify: `src/map/ChinaMap.tsx`
- Test: `src/map/ChinaMap.test.tsx`

**Interfaces:**
- Produces: параметр `usage?: 'browse' | 'answer'` у `ChinaMap`, по умолчанию
  `'browse'`.

- [ ] **Step 1: Написать падающие тесты**

В `src/map/ChinaMap.test.tsx` дописать:

```tsx
it('на экране ответа карта не печатает заголовок и подсказку', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      usage="answer"
    />,
  );

  expect(screen.queryByRole('heading', { name: 'Интерактивная карта' })).toBeNull();
  expect(screen.queryByText('Выберите регион на схеме или в списке.')).toBeNull();
  expect(screen.getByRole('region', { name: 'Карта регионов' })).toBeInTheDocument();
});

it('на экране ответа карта не объявляет выбор: о нём говорит карточка ответа', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      usage="answer"
    />,
  );

  expect(screen.queryByRole('status')).toBeNull();
});

it('на экране ответа список регионов ставит страница, а не карта', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      usage="answer"
    />,
  );

  expect(screen.queryByRole('list', { name: 'Список регионов карты' })).toBeNull();
});

it('в режиме «назвать регион» карта и на экране ответа объясняет подсветку', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId="sichuan"
      onSelect={() => {}}
      onClear={() => {}}
      usage="answer"
      interactive={false}
    />,
  );

  expect(screen.getByText('На карте подсвечена одна область.')).toBeInTheDocument();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/map/ChinaMap.test.tsx`
Expected: FAIL — параметр `usage` не объявлен, заголовок и список на месте.

- [ ] **Step 3: Добавить параметр**

В `src/map/ChinaMap.tsx` в тип параметров добавить:

```ts
  /**
   * `browse` — карта для разглядывания на экране темы: заголовок, подсказка,
   * строка выбора и список внутри секции. `answer` — карта как поверхность
   * ответа: ничего из этого, только карта.
   *
   * Отдельно от `variant` намеренно: `variant` — про цвет, `usage` — про
   * роль. Один параметр этих двух вопросов не выражает.
   */
  readonly usage?: 'browse' | 'answer';
```

и в разбор параметров — `usage = 'browse',`.

- [ ] **Step 4: Развести оформление по роли**

В `src/map/ChinaMap.tsx` перед `return` добавить:

```ts
  const showsBrowseChrome = usage === 'browse';
  /*
   * Строка выбора нужна там, где выбор ещё не ответ. На экране раунда нажатие
   * и есть ответ, о нём объявляет карточка обратной связи, а второй aria-live
   * заставил бы читать результат дважды. В «назвать регион» карта не
   * интерактивна, и статичное объяснение подсветки остаётся.
   */
  const showsSelectionStatus =
    variant !== 'fill' && (showsBrowseChrome || !interactive);
```

Заменить открывающий тег секции и заголовок:

```tsx
    <section
      className="map-section"
      data-usage={usage}
      aria-labelledby={showsBrowseChrome ? 'map-heading' : undefined}
      aria-label={showsBrowseChrome ? undefined : 'Карта регионов'}
    >
      {showsBrowseChrome ? (
        <div className="section-heading">
          <h2 id="map-heading">
            {interactive ? 'Интерактивная карта' : 'Карта регионов'}
          </h2>
          {interactive ? <p>Выберите регион на схеме или в списке.</p> : null}
        </div>
      ) : null}
```

Заменить условие строки выбора:

```tsx
      {showsSelectionStatus ? (
        interactive ? (
          <p className="map-selection" role="status" aria-live="polite">
            {selectedRegion
              ? `Выбрано: ${selectedRegion.nameRu} (${selectedRegion.nameZh})`
              : 'Регион ещё не выбран.'}
          </p>
        ) : (
          <p className="map-selection">На карте подсвечена одна область.</p>
        )
      ) : null}
```

Заменить условие списка:

```tsx
      {showsBrowseChrome && interactive ? (
        <RegionAnswerList
          regions={regions}
          selectedRegionId={selectedRegionId}
          onSelect={onSelect}
          answerStates={answerStates}
          outcomes={outcomes}
          paused={paused}
        />
      ) : null}
```

- [ ] **Step 5: Проверить тесты**

Run: `npx vitest run`
Expected: PASS. Существующие проверки не передают `usage`, получают `browse` и
видят прежнее оформление.

- [ ] **Step 6: Коммит**

```bash
git add src/map/ChinaMap.tsx src/map/ChinaMap.test.tsx
git commit -m "feat: tell a browsing map from an answering one"
```

---

### Task 6: Макет экрана упражнения

**Files:**
- Modify: `src/features/exercise/ExerciseRound.tsx:131-186`
- Modify: `src/styles.css`
- Test: `src/features/exercise/ExerciseRound.test.tsx`

**Interfaces:**
- Consumes: `RegionAnswerList` (`presentation="disclosure"`), `MapAttribution`,
  `usage="answer"` у `ChinaMap`.

- [ ] **Step 1: Написать падающие тесты**

В `src/features/exercise/ExerciseRound.test.tsx` изменить помощник, чтобы он
возвращал результат `render`:

```tsx
function renderRound(
  exerciseTypes: readonly ExerciseType[] = ['find-on-map'],
  level: Level = 1,
  onFinish = () => {},
  pool: readonly Region[] = regions,
) {
  return render(
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
```

и дописать:

```tsx
it('первый фокусируемый элемент — ответ, а не ссылка на лицензию', () => {
  const { container } = renderRound();

  const first = container.querySelector(
    'a[href], button:not([disabled]), [tabindex="0"]',
  );

  expect(first).toHaveAttribute('data-region-id');
});

it('«Прервать раунд» стоит в разметке после списка ответов', () => {
  renderRound();

  const list = screen.getByRole('list', { name: 'Список регионов карты' });
  const abort = screen.getByRole('button', { name: 'Прервать раунд' });

  expect(
    list.compareDocumentPosition(abort) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

it('карточка ответа стоит в разметке до карты', () => {
  const { container } = renderRound();
  const target = askedRegion();

  fireEvent.click(
    screen.getByRole('button', { name: `${target.nameRu} (${target.nameZh})` }),
  );

  const feedback = container.querySelector('.answer-feedback')!;
  const map = container.querySelector('.china-map')!;

  expect(
    feedback.compareDocumentPosition(map) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

it('без карты макет схлопывается в одну колонку и не печатает атрибуцию', () => {
  const { container } = renderRound(['match-capital']);

  expect(container.querySelector('.china-map')).toBeNull();
  expect(container.querySelector('.round-layout')).toHaveAttribute(
    'data-columns',
    'one',
  );
  expect(screen.queryByRole('link', { name: 'CC BY 4.0' })).toBeNull();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/exercise/ExerciseRound.test.tsx`
Expected: FAIL — первым фокусируемым идёт ссылка атрибуции внутри карты;
`.round-layout` не существует.

- [ ] **Step 3: Переписать разметку экрана**

В `src/features/exercise/ExerciseRound.tsx` добавить импорты:

```ts
import { MapAttribution } from '../../map/MapAttribution';
import { RegionAnswerList } from '../../map/RegionAnswerList';
```

и заменить весь `return` (строки 131–186):

```tsx
  return (
    <main className="round-shell">
      <div className="round-layout" data-columns={showsMap ? 'two' : 'one'}>
        <div className="round-prompt-column">
          <header className="round-prompt">
            <p className="eyebrow">{mode.eyebrow}</p>
            <h1 data-testid="exercise-target">
              {question.exerciseType === 'name-region'
                ? 'Регион на карте'
                : labelOf(targetRegion, question.representation)}
            </h1>
            <p className="exercise-progress">
              Вопрос {round.currentIndex + 1} из {round.questions.length} · уровень{' '}
              {level}
            </p>
          </header>
          {isMapAnswer ? null : (
            <ul className="choice-list" aria-label="Варианты ответа">
              {choicesByQuestion[round.currentIndex].map((choice) => (
                <li key={choice.id}>
                  <button
                    type="button"
                    data-testid="choice-option"
                    data-choice-id={choice.id}
                    data-result={resultOf(
                      choice.id,
                      question.regionId,
                      answeredRegionId,
                    )}
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
        </div>
        {showsMap ? (
          <div className="round-map">
            <ChinaMap
              regions={regions}
              selectedRegionId={isMapAnswer ? answeredRegionId : question.regionId}
              onSelect={handleMapSelect}
              onClear={() => {}}
              answerStates={answerStates}
              interactive={isMapAnswer}
              usage="answer"
            />
          </div>
        ) : null}
      </div>
      {isMapAnswer ? (
        <RegionAnswerList
          presentation="disclosure"
          regions={regions}
          selectedRegionId={answeredRegionId}
          onSelect={handleMapSelect}
          answerStates={answerStates}
        />
      ) : null}
      <footer className="round-footer">
        <button type="button" className="secondary" onClick={onExit}>
          Прервать раунд
        </button>
        {showsMap ? <MapAttribution /> : null}
      </footer>
    </main>
  );
```

- [ ] **Step 4: Добавить стили экрана раунда**

В `src/styles.css`, сразу после блока `.hero` (строки 53–57), добавить:

```css
/* --- Экран раунда ------------------------------------------------------- */

/*
 * Экран раунда выходит из меры 1120 px, которой живёт `.app-shell`: та мера
 * задана для чтения, а здесь главный объект — карта, и ей нужна вся
 * доступная ширина. Верхняя граница 1600 px: дальше карта упирается в высоту
 * кадра и перестаёт расти, а левая колонка уезжает от неё настолько, что
 * взгляд между ними уже не переносится.
 */
.round-shell {
  inline-size: min(100% - 2 * var(--s-4), 1600px);
  margin-inline: auto;
  padding-block: var(--s-6);
}

.round-prompt {
  border-bottom: var(--border-hair) solid var(--line-on-ground);
  margin-bottom: var(--s-4);
  padding-bottom: var(--s-4);
}

/*
 * Узкий экран: блок вопроса липнет к верху, пока ученик прокручивает список
 * из 34 кнопок. Фон обязателен, иначе список просвечивает сквозь него.
 */
@media (max-width: 1023px) {
  .round-prompt {
    background: var(--surface-ground);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  /* Липкий блок вопроса не должен закрывать карточку ответа при переводе фокуса. */
  .answer-feedback {
    scroll-margin-block-start: 9rem;
  }
}

/*
 * Порог 1024, а не обычные для проекта 720: при 720 правая колонка получает
 * меньше 400 px, карта — меньше 300 px высоты, и две колонки перестают быть
 * выигрышем. Порог заодно обслуживает масштабирование текста до 200 % —
 * кадр 1280 px превращается в 640 CSS px, и макет сам становится одной
 * колонкой.
 */
@media (min-width: 1024px) {
  .round-layout[data-columns='two'] {
    align-items: start;
    display: grid;
    gap: var(--s-5);
    grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  }

  .round-layout[data-columns='one'] {
    inline-size: min(100%, 640px);
    margin-inline: auto;
  }

  .round-prompt-column {
    position: sticky;
    top: var(--s-6);
  }
}

.round-map .map-section {
  margin-bottom: 0;
}

/*
 * Карта ограничена и шириной колонки, и высотой кадра: 774×569 в единицах
 * viewBox, поэтому высота всегда 0.735 от ширины, и без второго ограничения
 * на широком экране она уходила бы за сгиб.
 *
 * dvh, а не vh: на мобильных браузерах адресная строка меняет высоту кадра,
 * и vh даёт карту, которая не помещается.
 */
.round-map .china-map {
  aspect-ratio: var(--map-aspect);
  inline-size: 100%;
  margin-inline: auto;
  max-block-size: calc(100dvh - var(--round-map-chrome));
  max-inline-size: calc((100dvh - var(--round-map-chrome)) * var(--map-aspect));
}

.round-map .china-map svg {
  block-size: 100%;
}

/*
 * «Прервать раунд» живёт здесь, а не рядом с ответами. Раньше она стояла под
 * последним вариантом, в той же колонке и той же форме: промах по ответу
 * попадал в разрушающее действие. В подвале она удалена от ответов и по
 * указателю, и по обходу с клавиатуры — то есть не становится второй
 * остановкой Tab вместо последней.
 */
.round-footer {
  align-items: center;
  border-top: var(--border-hair) solid var(--line-on-ground);
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3) var(--s-5);
  justify-content: space-between;
  margin-block-start: var(--s-5);
  padding-block-start: var(--s-4);
}

.round-footer .map-attribution {
  margin: 0;
  max-inline-size: 60ch;
}
```

- [ ] **Step 5: Проверить тесты**

Run: `npx vitest run src/features/exercise/ExerciseRound.test.tsx src/App.test.tsx`
Expected: PASS.

- [ ] **Step 6: Проверить весь набор и разбор**

Run: `npx vitest run`
Expected: PASS.

Run: `npx eslint .`
Expected: без замечаний.

- [ ] **Step 7: Коммит**

```bash
git add src/features/exercise/ExerciseRound.tsx src/features/exercise/ExerciseRound.test.tsx src/styles.css
git commit -m "feat: lay out the exercise screen in two columns"
```

---

### Task 7: Макет экрана «Заполнить карту»

**Files:**
- Modify: `src/features/exercise/FillMapRound.tsx:194-237`
- Test: `src/features/exercise/FillMapRound.test.tsx`

**Interfaces:**
- Consumes: то же, что Task 6, плюс `outcomes` и `interactive` у
  `RegionAnswerList`.

- [ ] **Step 1: Написать падающие тесты**

В `src/features/exercise/FillMapRound.test.tsx` дописать:

```tsx
it('первый фокусируемый элемент — область карты', () => {
  const { container } = renderRound();

  const first = container.querySelector(
    'a[href], button:not([disabled]), [tabindex="0"]',
  );

  expect(first).toHaveAttribute('data-region-id');
});

it('«Прервать раунд» стоит в разметке после списка ответов', () => {
  renderRound();

  const list = screen.getByRole('list', { name: 'Список регионов карты' });
  const abort = screen.getByRole('button', { name: 'Прервать раунд' });

  expect(
    list.compareDocumentPosition(abort) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

it('карта на экране раунда без заголовка «Интерактивная карта»', () => {
  renderRound();

  expect(screen.queryByRole('heading', { name: 'Интерактивная карта' })).toBeNull();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/features/exercise/FillMapRound.test.tsx`
Expected: FAIL — первым фокусируемым идёт ссылка атрибуции, заголовок карты на
месте.

- [ ] **Step 3: Переписать разметку экрана**

В `src/features/exercise/FillMapRound.tsx` добавить импорты:

```ts
import { MapAttribution } from '../../map/MapAttribution';
import { RegionAnswerList } from '../../map/RegionAnswerList';
```

и заменить весь `return` (строки 194–237):

```tsx
  return (
    <main className="round-shell">
      <div className="round-layout" data-columns="two">
        <div className="round-prompt-column">
          <header className="round-prompt">
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
                <span aria-hidden="true">
                  {'●'.repeat(attemptsLeft)}
                  {'○'.repeat(round.usedAttempts)}
                </span>
                <span className="visually-hidden">
                  Попытка {round.usedAttempts + 1} из {MAX_ATTEMPTS_PER_REGION}
                </span>
              </p>
              <RoundStopwatch startedAt={startedAt} />
            </div>
            <p className="fill-status" role="status" aria-live="polite">
              {statusText()}
            </p>
          </header>
        </div>
        <div className="round-map">
          <ChinaMap
            regions={regions}
            selectedRegionId={null}
            onSelect={handleSelect}
            onClear={() => {}}
            variant="fill"
            usage="answer"
            outcomes={round.outcomes}
            highlight={mapHighlight}
            interactive={!finished}
            paused={isRevealing}
          />
        </div>
      </div>
      <RegionAnswerList
        presentation="disclosure"
        regions={regions}
        selectedRegionId={null}
        onSelect={handleSelect}
        outcomes={round.outcomes}
        interactive={!finished}
        paused={isRevealing}
      />
      <footer className="round-footer">
        <button type="button" className="secondary" onClick={onExit}>
          Прервать раунд
        </button>
        <MapAttribution />
      </footer>
    </main>
  );
```

- [ ] **Step 4: Проверить тесты**

Run: `npx vitest run src/features/exercise/FillMapRound.test.tsx`
Expected: PASS.

- [ ] **Step 5: Проверить весь набор и сборку**

Run: `npx vitest run`
Expected: PASS.

Run: `npx eslint .`
Expected: без замечаний.

Run: `npm run build`
Expected: сборка проходит, в логе `Проверено областей карты: 34. Целей
нажатия: 3. Выносок: 2.`

- [ ] **Step 6: Коммит**

```bash
git add src/features/exercise/FillMapRound.tsx src/features/exercise/FillMapRound.test.tsx
git commit -m "feat: lay out the fill-the-map screen in two columns"
```

---

### Task 8: Проверка вживую и документация

Раскладки в jsdom нет: высоты там нулевые, и утверждать «страница не выше
кадра» тестом нельзя. Числа снимаются в браузере.

**Files:**
- Modify: `UI_UX.md`, `DESIGN_SYSTEM.md`, `DECISIONS.md`, `CHANGELOG.md`

- [ ] **Step 1: Запустить приложение**

Запустить сервер разработки через инструмент предпросмотра (не через Bash),
конфигурация `china-studies-trainer` в `.claude/launch.json`, порт 5173.

- [ ] **Step 2: Снять размеры на 1280×900**

Открыть тему, нажать «Найти на карте», выполнить в странице:

```js
({
  viewport: [innerWidth, innerHeight],
  pageHeight: document.documentElement.scrollHeight,
  map: document.querySelector('.china-map').getBoundingClientRect(),
  tabStops: document.querySelectorAll(
    'a[href], button:not([disabled]), [tabindex="0"], summary',
  ).length,
})
```

Expected: `pageHeight` не больше `innerHeight`; нижний край карты внутри
кадра; `tabStops` около 38 (было 72).

- [ ] **Step 3: Снять размеры на 1366×768**

Изменить размер окна на 1366×768, повторить измерение.
Expected: `pageHeight` не больше 768.

- [ ] **Step 4: Проверить узкий экран 375×812**

Изменить размер окна на 375×812, повторить измерение и добавить:

```js
({
  horizontalScroll: document.documentElement.scrollWidth > innerWidth,
  listOpen: document.querySelector('details.region-answer-list')?.open,
})
```

Expected: `horizontalScroll` — `false`, `listOpen` — `true`.

- [ ] **Step 5: Сделать снимок экрана**

Снять экран на 1280×900 для отчёта пользователю.

- [ ] **Step 6: Обновить документацию**

В `UI_UX.md` заменить пункт 3 списка экранов и абзац «Приоритеты интерфейса»:

```markdown
3. Упражнение: слева вопрос, прогресс и обратная связь, справа карта во весь
   доступный кадр; под ними — свёрнутый равнозначный список регионов, в
   подвале — «Прервать раунд» и атрибуция карты.
```

```markdown
На экране всегда очевиден один главный следующий шаг. Экран упражнения не
прокручивается: вопрос, карта и результат видны одновременно. Обратная связь
появляется в той же колонке, где стоит вопрос, — глаз не переезжает после
каждого ответа. Первая остановка Tab — сам ответ. «Прервать раунд» стоит в
подвале, дальше всех от ответов. В мобильной версии блок вопроса липнет к
верху кадра, карта занимает ширину контейнера, а равнозначный список раскрыт:
при 375 px он единственный способ попасть в мелкий регион.
```

В `DESIGN_SYSTEM.md` дописать раздел:

```markdown
## Экран раунда

Экран раунда живёт в `.round-shell` и выходит из меры 1120 px, которой
ограничен `.app-shell`: 1120 — мера для чтения, а здесь главный объект карта.
Верхняя граница 1600 px.

Две колонки от 1024 px: `minmax(300px, 380px)` под вопрос и остаток под карту.
Ниже порога — одна колонка с липким блоком вопроса.

Карта ограничена и шириной колонки, и высотой кадра. Пропорция берётся из
токена `--map-aspect` (774 / 569), запас под служебные полосы — из
`--round-map-chrome` (216 px: отступы оболочки, блок списка, подвал).
`--map-aspect` сверяется с `MAP_VIEWBOX_WIDTH` и `MAP_VIEWBOX_HEIGHT` в
`scripts/validate-tokens.test.ts`, а `validateViewBox` проверяет саму карту на
сборке.
```

В `DECISIONS.md` добавить две строки в начало таблицы:

```markdown
| 2026-08-04 | Экран раунда не ограничен мерой 1120 px | 1120 — мера для чтения, а на экране раунда главный объект карта, и ей нужна вся доступная ширина. Ограничение остаётся на экранах темы и итогов. |
| 2026-08-04 | Равнозначный список на широком экране свёрнут | Исключение «Equivalent» в WCAG 2.5.8 требует, чтобы управление было на странице, а не чтобы оно было раскрыто. 34 кнопки — половина всех остановок Tab на экране. Ниже 1024 px, где список остаётся единственным способом попасть в мелкий регион, он раскрыт. |
```

В `CHANGELOG.md` добавить запись о макете экрана раунда в том же виде, в каком
записаны предыдущие.

- [ ] **Step 7: Коммит**

```bash
git add UI_UX.md DESIGN_SYSTEM.md DECISIONS.md CHANGELOG.md
git commit -m "docs: describe the round screen layout"
```

- [ ] **Step 8: Завершение ветки**

**REQUIRED SUB-SKILL:** Использовать superpowers:finishing-a-development-branch.

---

## Самопроверка плана

**Покрытие спецификации.** Оболочка и сетка — Task 6. Размер карты и токены —
Task 1 и Task 6. Узкий экран — Task 6. Порядок обхода — Task 6 и Task 7.
Переезд атрибуции — Task 4. Переезд «Прервать раунд» — Task 6 и Task 7. Отказ
от заголовка и строки выбора — Task 5. Равнозначный список — Task 3.
Проверки 1–10 из спецификации разложены по задачам 1, 3, 4, 5, 6. Проверка
вживую и документация — Task 8.

**Согласованность имён.** `AnswerState`, `RegionSelectionRules`,
`isRegionClosed`, `isRegionSelectable`, `OUTCOME_LABELS`, `TWO_COLUMN_QUERY`,
`regionsWord`, `RegionAnswerList`, `MapAttribution`, `MAP_VIEWBOX_HEIGHT`,
`--map-aspect`, `--round-map-chrome`, классы `round-shell`, `round-layout`,
`round-prompt-column`, `round-prompt`, `round-map`, `round-footer`,
`region-answer-list` — во всех задачах написаны одинаково.

**Порядок задач.** Каждая задача оставляет набор тестов зелёным: `usage`
появляется в Task 5 со значением по умолчанию `browse`, и экраны переходят на
`answer` только в Task 6 и Task 7.
