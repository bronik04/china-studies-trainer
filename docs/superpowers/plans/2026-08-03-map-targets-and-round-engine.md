# Map Targets and Round Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать выбираемыми все 34 области карты, добавить состояния верного и неверного ответа, и построить чистый движок раунда, который проходит по всем регионам без повторов.

**Architecture:** Два независимых слоя. Карта: скрипт сборки добавляет в SVG выноски для регионов, которые физически невозможно нажать, а `ChinaMap` получает необязательный словарь состояний ответа. Домен: генератор случайности с seed и неизменяемый раунд с явным автоматом состояний — ни то, ни другое не импортирует React и не знает про карту.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Testing Library, ESLint, CSS.

## Global Constraints

- Интерфейс, задания и сообщения об ошибках — на русском; китайские названия — в Unicode.
- Раунд включает **все** регионы темы, каждый ровно один раз. Это решение владельца продукта от 2026-08-03, оно отменяет «раунд содержит 10 вопросов» в SPEC.md, EXERCISES.md, MVP.md, UI_UX.md и ACCEPTANCE_CRITERIA.md.
- Случайность передаётся снаружи как `() => number`; домен не вызывает `Math.random` и не читает часы.
- Домен не импортирует React, DOM и содержимое карты.
- Никаких сетевых запросов; карта и раунд работают после первоначальной загрузки.
- Смысл не передаётся одним только цветом: у состояний ответа на карте есть различие по обводке.
- Палитра из DESIGN_SYSTEM.md: успех `#087443`, ошибка `#B42318`, фокус `#175CD3`, граница `#D0D5DD`, текст `#1F2937`.
- В SVG не появляется скриптов, внешних шрифтов и сетевых ссылок.
- Работа идёт в ветке `feat/map-targets-and-round-engine`, слияние в `master` — после ревью и всех проверок.
- Не входит в объём: сами упражнения, экран итогов, сохранение прогресса, уровни сложности, панорамирование карты.

## Исходные измерения

Габариты областей в единицах `viewBox` (карта `0 0 774 569`, эталонная ширина отрисовки 835 px, то есть 1 единица ≈ 1.08 CSS px). Меньшая сторона:

| Регион | Ширина | Высота | Меньшая сторона |
| --- | --- | --- | --- |
| macao | 0.7 | 1.4 | **0.7** |
| hong-kong | 7.1 | 5.0 | **5.0** |
| tianjin | 17.2 | 27.3 | 17.2 |
| shanghai | 21.1 | 17.4 | 17.4 |
| taiwan | 24.8 | 46.7 | 24.8 |
| beijing | 26.3 | 26.7 | 26.3 |

Выноски получают только `macao` и `hong-kong`: их невозможно нажать указателем. `tianjin` и `shanghai` мельче 24 CSS px, но выбираются; для них засчитывается исключение «Equivalent» из WCAG 2.5.8 — равнозначный список регионов под картой уже реализован.

---

## File structure

| Файл | Назначение |
| --- | --- |
| `scripts/generate-callouts.ts` | Внедряет выноски в SVG и делает крошечные контуры декоративными |
| `src/map/callout-targets.ts` | Описание выносок и порог выбираемости, общие для скрипта и теста |
| `src/map/callouts.test.ts` | Проверка, что каждая интерактивная область достаточно велика |
| `src/map/ChinaMap.tsx` | Приём состояний ответа |
| `src/map/ChinaMap.test.tsx` | Тесты состояний ответа |
| `src/styles.css` | Оформление выносок и состояний ответа |
| `src/domain/random.ts` | Генератор случайности с seed и перемешивание |
| `src/domain/random.test.ts` | Тесты воспроизводимости |
| `src/domain/round.ts` | Создание раунда и автомат состояний вопроса |
| `src/domain/round.test.ts` | Тесты движка раунда |
| `SPEC.md`, `EXERCISES.md`, `MVP.md`, `UI_UX.md`, `ACCEPTANCE_CRITERIA.md`, `DECISIONS.md`, `CHANGELOG.md` | Снятие расхождения про длину раунда |

---

### Task 1: Ветка и решение о полном раунде

Документы сейчас утверждают, что раунд состоит из 10 вопросов. Пока это не снято, любой тест движка будет противоречить источнику истины.

**Files:**
- Modify: `SPEC.md:5`, `EXERCISES.md:5`, `EXERCISES.md:21`, `MVP.md:20`, `UI_UX.md:7`, `ACCEPTANCE_CRITERIA.md:11`, `DECISIONS.md`, `CHANGELOG.md`

- [ ] **Step 1: Создать ветку**

```bash
git switch -c feat/map-targets-and-round-engine
```

Ожидается: `Переключились на новую ветку «feat/map-targets-and-round-engine»`.

- [ ] **Step 2: Заменить утверждения о длине раунда**

`SPEC.md`, строка 5 — заменить «проходит раунд из 10 вопросов» на:

    проходит раунд по всем регионам темы

`EXERCISES.md`, строка 5 — заменить «Раунд содержит 10 вопросов, без повторения целевого региона.» на:

    Раунд содержит по одному вопросу на каждый регион темы: все регионы, каждый ровно один раз, порядок перемешан.

`EXERCISES.md`, строка 21 — заменить «создаёт раунд до 10 элементов» и «Если их меньше 10» на:

    Кнопка «Повторить ошибки» создаёт раунд только из регионов с неверным ответом за последние 14 дней; его длина равна числу таких регионов.

`MVP.md`, строка 20 — заменить «Упражнение из 10 вопросов работает без интернета после загрузки.» на:

    Раунд по всем 34 регионам работает без интернета после загрузки.

`UI_UX.md`, строка 7 — заменить «прогресс `3 из 10`» на:

    прогресс `3 из 34`

`ACCEPTANCE_CRITERIA.md`, строка 11 — заменить «раунд из 10 уникальных вопросов» на:

    раунд из 34 уникальных вопросов

- [ ] **Step 3: Записать решение**

Добавить в `DECISIONS.md` первой строкой таблицы:

    | 2026-08-03 | Раунд включает все регионы темы, каждый ровно один раз | Решение владельца продукта; отменяет «10 вопросов» в SPEC.md, EXERCISES.md, MVP.md, UI_UX.md и ACCEPTANCE_CRITERIA.md. Длина раунда — свойство темы, а не константа; «Повторить ошибки» остаётся раундом переменной длины. |
    | 2026-08-03 | Состояния вопроса `answered` и `feedback` объединены в одно наблюдаемое состояние `feedback` | В MVP между регистрацией ответа и показом обратной связи нет ни асинхронности, ни отдельного экрана, поэтому различать их нечем. SPEC.md перечисляет четыре состояния как последовательность, а не как обязательные значения. |

- [ ] **Step 4: Проверить, что расхождений не осталось**

```bash
grep -rn '10 вопрос\|из 10\|10 элемент' *.md docs/
```

Ожидается: пустой вывод.

- [ ] **Step 5: Зафиксировать**

Добавить в `CHANGELOG.md` в раздел `### Changed`:

    - Раунд включает все регионы темы, каждый ровно один раз, вместо фиксированных 10 вопросов.

```bash
git add SPEC.md EXERCISES.md MVP.md UI_UX.md ACCEPTANCE_CRITERIA.md DECISIONS.md CHANGELOG.md
git commit -m "docs: make a round cover every region"
```

---

### Task 2: Выноски для Макао и Гонконга

**Files:**
- Create: `src/map/callout-targets.ts`, `src/map/callouts.test.ts`, `scripts/generate-callouts.ts`
- Modify: `public/maps/china-provinces.svg`, `src/styles.css`, `package.json`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `parseMapPath`, `boundingBox` из `src/map/svg-path.ts`
- Produces:

```ts
export type CalloutTarget = {
  readonly regionId: string;
  readonly regionKind: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly anchor: readonly [number, number];
  readonly marker: readonly [number, number];
};
export const CALLOUT_TARGETS: readonly CalloutTarget[];
export const MARKER_RADIUS: number;
export const MIN_TARGET_UNITS: number;
```

- [ ] **Step 1: Описать выноски**

Создать `src/map/callout-targets.ts`:

```ts
/**
 * Регионы, которые невозможно выбрать указателем: Макао занимает 0.7×1.4
 * единицы viewBox, Гонконг — 7.1×5.0. Они выносятся маркерами в свободное
 * море юго-восточнее Гуандуна, а их собственные контуры становятся
 * декоративными.
 *
 * Координаты якорей — центры габаритов контуров в единицах viewBox,
 * измеренные по самой карте. Координаты маркеров выбраны вручную в пустой
 * акватории; выносные линии не пересекаются.
 */
export type CalloutTarget = {
  readonly regionId: string;
  readonly regionKind: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly anchor: readonly [number, number];
  readonly marker: readonly [number, number];
};

export const CALLOUT_TARGETS: readonly CalloutTarget[] = [
  {
    regionId: 'macao',
    regionKind: 'sar',
    label: 'Макао, 澳门特别行政区',
    shortLabel: 'Макао',
    anchor: [505.8, 515.4],
    marker: [528, 552],
  },
  {
    regionId: 'hong-kong',
    regionKind: 'sar',
    label: 'Гонконг, 香港特别行政区',
    shortLabel: 'Гонконг',
    anchor: [512.9, 512.5],
    marker: [566, 545],
  },
];

/** Радиус маркера: 22 единицы в поперечнике ≈ 24 CSS px при ширине карты 835 px. */
export const MARKER_RADIUS = 11;

/**
 * Порог выбираемости в единицах viewBox (≈13 CSS px). Ниже него область
 * невозможно нажать указателем. Полные 24×24 CSS px обеспечивает
 * равнозначный список регионов под картой — исключение «Equivalent»
 * в WCAG 2.5.8.
 */
export const MIN_TARGET_UNITS = 12;
```

- [ ] **Step 2: Написать падающий тест**

Создать `src/map/callouts.test.ts`:

```ts
import mapMarkup from '../../public/maps/china-provinces.svg?raw';
import { boundingBox, parseMapPath } from './svg-path';
import { CALLOUT_TARGETS, MARKER_RADIUS, MIN_TARGET_UNITS } from './callout-targets';

type Target = { readonly regionId: string; readonly minSide: number };

function interactiveTargets(): Target[] {
  const targets: Target[] = [];

  for (const element of mapMarkup.match(/<(path|circle)\s[^>]*>/gs) ?? []) {
    const regionId = /data-region-id="([^"]+)"/.exec(element)?.[1];
    if (!regionId) {
      continue;
    }

    const pathData = /\sd="([^"]+)"/.exec(element)?.[1];
    if (pathData) {
      const box = boundingBox(parseMapPath(pathData));
      targets.push({
        regionId,
        minSide: Math.min(box.maxX - box.minX, box.maxY - box.minY),
      });
      continue;
    }

    const radius = Number(/\sr="([\d.]+)"/.exec(element)?.[1]);
    targets.push({ regionId, minSide: radius * 2 });
  }

  return targets;
}

it('оставляет ровно 34 выбираемых области', () => {
  const ids = interactiveTargets().map((target) => target.regionId);

  expect(new Set(ids).size).toBe(34);
  expect(ids).toHaveLength(34);
});

it('делает каждую область достаточно крупной для выбора указателем', () => {
  const tooSmall = interactiveTargets().filter(
    (target) => target.minSide < MIN_TARGET_UNITS,
  );

  expect(tooSmall).toEqual([]);
});

it('выносит Макао и Гонконг маркерами нужного размера', () => {
  for (const target of CALLOUT_TARGETS) {
    const marker = new RegExp(
      `<circle[^>]*data-region-id="${target.regionId}"[^>]*>`,
      's',
    ).exec(mapMarkup);

    expect(marker, `нет маркера для ${target.regionId}`).not.toBeNull();
    expect(marker?.[0]).toContain(`r="${MARKER_RADIUS}"`);
    expect(marker?.[0]).toContain('role="button"');
    expect(marker?.[0]).toContain(`aria-label="${target.label}"`);
  }
});

it('делает вынесенные контуры декоративными', () => {
  for (const target of CALLOUT_TARGETS) {
    const path = new RegExp(`<path[^>]*\\bid="${target.regionId}"[^>]*>`, 's').exec(
      mapMarkup,
    );

    expect(path?.[0]).toContain('aria-hidden="true"');
    expect(path?.[0]).not.toContain('tabindex');
    expect(path?.[0]).not.toContain('data-region-id');
  }
});
```

- [ ] **Step 3: Убедиться, что тест падает**

```bash
npm test -- src/map/callouts.test.ts
```

Ожидается: FAIL. Область `macao` имеет меньшую сторону 0.7 при пороге 12, маркеров в карте нет.

- [ ] **Step 4: Написать генератор выносок**

Создать `scripts/generate-callouts.ts`:

```ts
/**
 * Добавляет в карту выноски для регионов, которые невозможно нажать, и
 * снимает интерактивность с их исходных контуров.
 *
 * Скрипт идемпотентен: блок выносок ограничен комментариями-метками и при
 * повторном запуске заменяется целиком.
 *
 * Запуск: npx tsx scripts/generate-callouts.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  CALLOUT_TARGETS,
  MARKER_RADIUS,
  type CalloutTarget,
} from '../src/map/callout-targets';

const MAP_FILE = 'public/maps/china-provinces.svg';
const BLOCK_START = '<!-- callouts:start -->';
const BLOCK_END = '<!-- callouts:end -->';

function makeDecorative(svg: string, regionId: string): string {
  const pattern = new RegExp(`<path\\s[^>]*\\bid="${regionId}"[^>]*>`, 's');
  const match = pattern.exec(svg);
  if (!match) {
    throw new Error(`В карте нет области: ${regionId}`);
  }

  const cleaned = match[0]
    .replace(/\s(data-region-id|data-region-kind|tabindex|role|aria-label)="[^"]*"/g, '')
    .replace('<path', '<path aria-hidden="true" pointer-events="none"');

  return svg.replace(match[0], () => cleaned);
}

function renderCallout(target: CalloutTarget): string {
  const [anchorX, anchorY] = target.anchor;
  const [markerX, markerY] = target.marker;

  return [
    '\t<g class="map-callout">',
    `\t\t<line x1="${anchorX}" y1="${anchorY}" x2="${markerX}" y2="${markerY}" aria-hidden="true" pointer-events="none" />`,
    `\t\t<circle id="callout-${target.regionId}" data-region-id="${target.regionId}" data-region-kind="${target.regionKind}" cx="${markerX}" cy="${markerY}" r="${MARKER_RADIUS}" tabindex="0" role="button" aria-label="${target.label}" />`,
    `\t\t<text x="${markerX}" y="${markerY + MARKER_RADIUS + 10}" text-anchor="middle" aria-hidden="true" pointer-events="none">${target.shortLabel}</text>`,
    '\t</g>',
  ].join('\n');
}

let svg = readFileSync(MAP_FILE, 'utf8');

for (const target of CALLOUT_TARGETS) {
  svg = makeDecorative(svg, target.regionId);
}

const block = [
  `\t${BLOCK_START}`,
  ...CALLOUT_TARGETS.map(renderCallout),
  `\t${BLOCK_END}`,
  '',
].join('\n');

const existing = new RegExp(`\\t?${BLOCK_START}.*?${BLOCK_END}\\n`, 's');
svg = existing.test(svg) ? svg.replace(existing, () => block) : svg.replace('</svg>', `${block}</svg>`);

writeFileSync(MAP_FILE, svg);
console.info(`Добавлено выносок: ${CALLOUT_TARGETS.length}`);
```

- [ ] **Step 5: Оформить выноски**

Добавить в `src/styles.css` после блока `.china-map [data-region-id]:focus-visible`:

```css
.china-map .map-callout line {
  stroke: #667085;
  stroke-width: 1;
}

.china-map .map-callout text {
  fill: #1f2937;
  font-family: inherit;
  font-size: 9px;
  font-weight: 600;
}
```

- [ ] **Step 6: Запустить генератор и проверить**

Добавить в `package.json` в `scripts`:

```json
"generate:callouts": "tsx scripts/generate-callouts.ts"
```

```bash
npm run generate:callouts && npm test -- src/map/callouts.test.ts && npm run validate:map
```

Ожидается: `Добавлено выносок: 2`, PASS, `Проверено областей карты: 34`.

- [ ] **Step 7: Проверить вручную и зафиксировать**

```bash
npm run dev -- --host 127.0.0.1
```

Убедиться: у побережья Гуандуна два подписанных маркера, выносные линии идут к настоящим местам и не пересекаются, оба выбираются мышью и с клавиатуры, объявление «Выбрано: Макао (澳门特别行政区)» появляется.

Добавить в `CHANGELOG.md` в `### Fixed`:

    - Макао и Гонконг вынесены на карте отдельными маркерами: их собственные контуры (0.7 и 5.0 единиц) нельзя было нажать.

```bash
git add src/map/callout-targets.ts src/map/callouts.test.ts scripts/generate-callouts.ts public/maps/china-provinces.svg src/styles.css package.json CHANGELOG.md
git commit -m "feat: make every map region selectable"
```

---

### Task 3: Состояния верного и неверного ответа

**Files:**
- Modify: `src/map/ChinaMap.tsx`, `src/map/ChinaMap.test.tsx`, `src/styles.css`, `CHANGELOG.md`

**Interfaces:**
- Consumes: существующий `ChinaMapProps`
- Produces:

```ts
export type AnswerState = 'correct' | 'incorrect' | 'disabled';
// новое необязательное свойство ChinaMap:
readonly answerStates?: Readonly<Record<string, AnswerState>>;
```

- [ ] **Step 1: Написать падающие тесты**

Добавить в конец `src/map/ChinaMap.test.tsx`:

```ts
it('отмечает область состоянием ответа', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      answerStates={{ sichuan: 'correct', yunnan: 'incorrect' }}
    />,
  );

  expect(document.querySelector('#sichuan')).toHaveAttribute(
    'data-answer-state',
    'correct',
  );
  expect(document.querySelector('#yunnan')).toHaveAttribute(
    'data-answer-state',
    'incorrect',
  );
  expect(document.querySelector('#hebei')).not.toHaveAttribute('data-answer-state');
});

it('помечает недоступную область для вспомогательных технологий', () => {
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={() => {}}
      onClear={() => {}}
      answerStates={{ tibet: 'disabled' }}
    />,
  );

  expect(document.querySelector('#tibet')).toHaveAttribute('aria-disabled', 'true');
});

it('не выбирает недоступную область', () => {
  const select = vi.fn();
  render(
    <ChinaMap
      regions={regions}
      selectedRegionId={null}
      onSelect={select}
      onClear={() => {}}
      answerStates={{ sichuan: 'disabled' }}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Сычуань, 四川省' }));

  expect(select).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/map/ChinaMap.test.tsx
```

Ожидается: FAIL — `answerStates` не существует в типе свойств, атрибуты не проставляются.

- [ ] **Step 3: Принять состояния в компоненте**

В `src/map/ChinaMap.tsx` добавить тип и свойство:

```tsx
export type AnswerState = 'correct' | 'incorrect' | 'disabled';

type ChinaMapProps = {
  readonly regions: readonly Region[];
  readonly selectedRegionId: string | null;
  readonly onSelect: (regionId: string) => void;
  readonly onClear: () => void;
  readonly zoom?: MapZoom;
  readonly onZoomChange?: (zoom: MapZoom) => void;
  readonly answerStates?: Readonly<Record<string, AnswerState>>;
};
```

Объявить пустое значение по умолчанию на уровне модуля, рядом с типом. Литерал `{}` прямо в параметрах создавал бы новый объект на каждый рендер, и эффект перезапускался бы вхолостую, потому что `answerStates` входит в его зависимости:

```tsx
const NO_ANSWER_STATES: Readonly<Record<string, AnswerState>> = {};
```

Принять свойство в параметрах:

```tsx
export function ChinaMap({
  regions,
  selectedRegionId,
  onSelect,
  onClear,
  zoom = 1,
  onZoomChange,
  answerStates = NO_ANSWER_STATES,
}: ChinaMapProps) {
```

В теле эффекта, внутри `areas?.forEach`, после установки `aria-label` добавить:

```tsx
const answerState = answerStates[area.dataset.regionId ?? ''];
if (answerState) {
  area.dataset.answerState = answerState;
} else {
  delete area.dataset.answerState;
}

if (answerState === 'disabled') {
  area.setAttribute('aria-disabled', 'true');
} else {
  area.removeAttribute('aria-disabled');
}
```

Добавить `answerStates` в массив зависимостей эффекта:

```tsx
}, [answerStates, regions, selectedRegionId, zoom]);
```

Запретить выбор недоступной области — заменить тело `selectTarget`:

```tsx
function selectTarget(target: EventTarget | null) {
  const regionId = getRegionId(target);
  if (regionId && answerStates[regionId] !== 'disabled') {
    onSelect(regionId);
  }
}
```

В списке-дублёре тоже учесть недоступность — заменить кнопку:

```tsx
<button
  type="button"
  aria-pressed={region.id === selectedRegionId}
  disabled={answerStates[region.id] === 'disabled'}
  onClick={() => onSelect(region.id)}
>
```

- [ ] **Step 4: Оформить состояния**

Добавить в `src/styles.css` после блока `.china-map [data-region-id]:focus-visible`:

```css
.china-map [data-region-id][data-answer-state='correct'] {
  fill: #087443;
  stroke: #ffffff;
  stroke-width: 2;
}

.china-map [data-region-id][data-answer-state='incorrect'] {
  fill: #b42318;
  stroke: #ffffff;
  stroke-dasharray: 3 2;
  stroke-width: 2;
}

.china-map [data-region-id][data-answer-state='disabled'] {
  cursor: not-allowed;
  fill: #eaecf0;
}
```

Сплошная обводка у верного и штриховая у неверного — различие помимо цвета. Иконка и текст обратной связи добавляются вместе с самим упражнением.

- [ ] **Step 5: Проверить и зафиксировать**

```bash
npm test -- src/map/ChinaMap.test.tsx && npm run lint
```

Ожидается: PASS.

Добавить в `CHANGELOG.md` в `### Added`:

    - Карта принимает состояния ответа: верно, неверно и недоступно, с различием не только по цвету.

```bash
git add src/map/ChinaMap.tsx src/map/ChinaMap.test.tsx src/styles.css CHANGELOG.md
git commit -m "feat: show answer states on the map"
```

---

### Task 4: Воспроизводимая случайность

**Files:**
- Create: `src/domain/random.ts`, `src/domain/random.test.ts`

**Interfaces:**
- Produces:

```ts
export function createSeededRandom(seed: number): () => number;
export function shuffle<T>(items: readonly T[], random: () => number): T[];
```

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/random.test.ts`:

```ts
import { createSeededRandom, shuffle } from './random';

it('выдаёт одну и ту же последовательность для одного seed', () => {
  const first = createSeededRandom(42);
  const second = createSeededRandom(42);

  const left = [first(), first(), first()];
  const right = [second(), second(), second()];

  expect(left).toEqual(right);
});

it('выдаёт разные последовательности для разных seed', () => {
  const first = createSeededRandom(1);
  const second = createSeededRandom(2);

  expect(first()).not.toBe(second());
});

it('держит значения в промежутке от нуля включительно до единицы', () => {
  const random = createSeededRandom(7);

  for (let i = 0; i < 500; i += 1) {
    const value = random();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  }
});

it('перемешивает, сохраняя состав', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  const shuffled = shuffle(items, createSeededRandom(3));

  expect([...shuffled].sort()).toEqual([...items].sort());
  expect(shuffled).toHaveLength(items.length);
});

it('не изменяет исходный массив', () => {
  const items = ['a', 'b', 'c'];

  shuffle(items, createSeededRandom(3));

  expect(items).toEqual(['a', 'b', 'c']);
});

it('перемешивает одинаково при одном seed', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f'];

  expect(shuffle(items, createSeededRandom(9))).toEqual(
    shuffle(items, createSeededRandom(9)),
  );
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/domain/random.test.ts
```

Ожидается: FAIL — модуля `./random` не существует.

- [ ] **Step 3: Реализовать**

Создать `src/domain/random.ts`:

```ts
/**
 * Генератор псевдослучайных чисел mulberry32. Нужен, чтобы порядок вопросов
 * был воспроизводим в тестах: домен никогда не вызывает Math.random сам,
 * а получает функцию снаружи.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Перемешивание Фишера — Йетса. Исходный массив не изменяется. */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
```

- [ ] **Step 4: Проверить и зафиксировать**

```bash
npm test -- src/domain/random.test.ts && npm run lint
```

Ожидается: PASS.

```bash
git add src/domain/random.ts src/domain/random.test.ts
git commit -m "feat: add reproducible randomness"
```

---

### Task 5: Движок раунда

**Files:**
- Create: `src/domain/round.ts`, `src/domain/round.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `Region` из `src/content/types.ts`, `shuffle` из `src/domain/random.ts`
- Produces:

```ts
export type ExerciseType = 'find-on-map' | 'name-region' | 'match-capital';
export type Level = 1 | 2 | 3 | 4;
export type QuestionStatus = 'ready' | 'feedback';
export type Question = { id; regionId; exerciseType; level };
export type Attempt = { questionId; regionId; exerciseType; level; isCorrect; durationMs; answeredAt };
export type Round = { questions; currentIndex; status; attempts };
export function createRound(regions: readonly Region[], options: RoundOptions): Round;
export function currentQuestion(round: Round): Question;
export function answerQuestion(round: Round, input: AnswerInput): Round;
export function goToNextQuestion(round: Round): Round;
export function isRoundFinished(round: Round): boolean;
```

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/round.test.ts`:

```ts
import { regions } from '../content/regions';
import { createSeededRandom } from './random';
import {
  answerQuestion,
  createRound,
  currentQuestion,
  goToNextQuestion,
  isRoundFinished,
  type Round,
} from './round';

const OPTIONS = {
  exerciseType: 'find-on-map',
  level: 1,
} as const;

function newRound(seed = 1): Round {
  return createRound(regions, { ...OPTIONS, random: createSeededRandom(seed) });
}

function answerCurrent(round: Round, correct: boolean): Round {
  const question = currentQuestion(round);
  const wrongId = regions.find((region) => region.id !== question.regionId)!.id;

  return answerQuestion(round, {
    answeredRegionId: correct ? question.regionId : wrongId,
    durationMs: 1200,
    answeredAt: '2026-08-03T10:00:00.000Z',
  });
}

it('включает каждый регион ровно один раз', () => {
  const round = newRound();
  const regionIds = round.questions.map((question) => question.regionId);

  expect(regionIds).toHaveLength(34);
  expect(new Set(regionIds).size).toBe(34);
  expect([...regionIds].sort()).toEqual(regions.map((region) => region.id).sort());
});

it('даёт один и тот же порядок при одном seed', () => {
  expect(newRound(5).questions).toEqual(newRound(5).questions);
});

it('даёт разный порядок при разных seed', () => {
  expect(newRound(5).questions).not.toEqual(newRound(6).questions);
});

it('начинается с первого вопроса в состоянии готовности', () => {
  const round = newRound();

  expect(round.currentIndex).toBe(0);
  expect(round.status).toBe('ready');
  expect(round.attempts).toEqual([]);
  expect(isRoundFinished(round)).toBe(false);
});

it('записывает верный ответ', () => {
  const round = newRound();
  const question = currentQuestion(round);

  const answered = answerCurrent(round, true);

  expect(answered.status).toBe('feedback');
  expect(answered.attempts).toEqual([
    {
      questionId: question.id,
      regionId: question.regionId,
      exerciseType: 'find-on-map',
      level: 1,
      isCorrect: true,
      durationMs: 1200,
      answeredAt: '2026-08-03T10:00:00.000Z',
    },
  ]);
});

it('записывает неверный ответ', () => {
  const answered = answerCurrent(newRound(), false);

  expect(answered.attempts[0].isCorrect).toBe(false);
});

it('не принимает второй ответ на тот же вопрос', () => {
  const answered = answerCurrent(newRound(), true);

  expect(() => answerCurrent(answered, true)).toThrow(
    /Повторный ответ на вопрос запрещён/,
  );
});

it('не пускает к следующему вопросу без ответа', () => {
  expect(() => goToNextQuestion(newRound())).toThrow(
    /Переход к следующему вопросу возможен только после ответа/,
  );
});

it('переходит к следующему вопросу после ответа', () => {
  const next = goToNextQuestion(answerCurrent(newRound(), true));

  expect(next.currentIndex).toBe(1);
  expect(next.status).toBe('ready');
  expect(next.attempts).toHaveLength(1);
});

it('не изменяет исходный раунд', () => {
  const round = newRound();

  answerCurrent(round, true);

  expect(round.status).toBe('ready');
  expect(round.attempts).toEqual([]);
});

it('завершается после ответа на все регионы', () => {
  let round = newRound();

  for (let i = 0; i < 34; i += 1) {
    round = goToNextQuestion(answerCurrent(round, true));
  }

  expect(isRoundFinished(round)).toBe(true);
  expect(round.attempts).toHaveLength(34);
  expect(() => currentQuestion(round)).toThrow(/Раунд завершён/);
});

it('не создаёт раунд без регионов', () => {
  expect(() =>
    createRound([], { ...OPTIONS, random: createSeededRandom(1) }),
  ).toThrow(/Раунд не создан: нет регионов/);
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

```bash
npm test -- src/domain/round.test.ts
```

Ожидается: FAIL — модуля `./round` не существует.

- [ ] **Step 3: Реализовать**

Создать `src/domain/round.ts`:

```ts
import type { Region } from '../content/types';
import { shuffle } from './random';

export type ExerciseType = 'find-on-map' | 'name-region' | 'match-capital';
export type Level = 1 | 2 | 3 | 4;

/**
 * SPEC.md описывает последовательность ready → answered → feedback → next.
 * Наблюдаемых состояний два: между регистрацией ответа и показом обратной
 * связи в MVP ничего не происходит (решение от 2026-08-03).
 */
export type QuestionStatus = 'ready' | 'feedback';

export type Question = {
  readonly id: string;
  readonly regionId: string;
  readonly exerciseType: ExerciseType;
  readonly level: Level;
};

export type Attempt = {
  readonly questionId: string;
  readonly regionId: string;
  readonly exerciseType: ExerciseType;
  readonly level: Level;
  readonly isCorrect: boolean;
  readonly durationMs: number;
  readonly answeredAt: string;
};

export type Round = {
  readonly questions: readonly Question[];
  readonly currentIndex: number;
  readonly status: QuestionStatus;
  readonly attempts: readonly Attempt[];
};

export type RoundOptions = {
  readonly exerciseType: ExerciseType;
  readonly level: Level;
  readonly random: () => number;
};

export type AnswerInput = {
  readonly answeredRegionId: string;
  readonly durationMs: number;
  readonly answeredAt: string;
};

/** Раунд по всем регионам темы: каждый ровно один раз, порядок перемешан. */
export function createRound(
  regions: readonly Region[],
  options: RoundOptions,
): Round {
  if (regions.length === 0) {
    throw new Error('Раунд не создан: нет регионов');
  }

  const questions = shuffle(regions, options.random).map((region, index) => ({
    id: `${index + 1}-${region.id}`,
    regionId: region.id,
    exerciseType: options.exerciseType,
    level: options.level,
  }));

  return { questions, currentIndex: 0, status: 'ready', attempts: [] };
}

export function isRoundFinished(round: Round): boolean {
  return round.currentIndex >= round.questions.length;
}

export function currentQuestion(round: Round): Question {
  const question = round.questions[round.currentIndex];
  if (!question) {
    throw new Error('Раунд завершён: текущего вопроса нет');
  }

  return question;
}

export function answerQuestion(round: Round, input: AnswerInput): Round {
  if (round.status !== 'ready') {
    throw new Error('Повторный ответ на вопрос запрещён');
  }

  const question = currentQuestion(round);
  const attempt: Attempt = {
    questionId: question.id,
    regionId: question.regionId,
    exerciseType: question.exerciseType,
    level: question.level,
    isCorrect: input.answeredRegionId === question.regionId,
    durationMs: input.durationMs,
    answeredAt: input.answeredAt,
  };

  return { ...round, status: 'feedback', attempts: [...round.attempts, attempt] };
}

export function goToNextQuestion(round: Round): Round {
  if (round.status !== 'feedback') {
    throw new Error('Переход к следующему вопросу возможен только после ответа');
  }

  return { ...round, currentIndex: round.currentIndex + 1, status: 'ready' };
}
```

- [ ] **Step 4: Проверить и зафиксировать**

```bash
npm test -- src/domain/round.test.ts && npm run lint
```

Ожидается: PASS, 13 тестов.

Добавить в `CHANGELOG.md` в `### Added`:

    - Добавлен движок раунда: раунд по всем регионам, воспроизводимый порядок и запрет второго ответа на вопрос.

```bash
git add src/domain/round.ts src/domain/round.test.ts CHANGELOG.md
git commit -m "feat: add round engine over every region"
```

---

### Task 6: Контроль качества и ревью

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Записать отложенное**

Добавить в `ROADMAP.md` в раздел «Этап 2 — учебное расширение»:

    Панорамирование карты при увеличении: сейчас зум — это масштабирование внутри контейнера с обрезкой, поэтому на большом увеличении краевые регионы уходят за край и становятся недоступны для выбора. Мобильный режим карты: при ширине 320 px области мельче Пекина слишком малы для точного попадания, и работает только равнозначный список.

- [ ] **Step 2: Прогнать все проверки**

```bash
npm run validate:map
npm run validate:content
npm test
npm run lint
npm run build
git diff --check master...HEAD
```

Ожидается: все завершаются с кодом 0; 34 области, 34 региона, ошибок пробелов нет.

- [ ] **Step 3: Проверить объём ветки**

```bash
git status --short
git log --oneline master..HEAD
git diff --name-only master...HEAD
```

Ожидается: чистое дерево; пять коммитов; изменены только файлы из этого плана.

- [ ] **Step 4: Отдать на ревью**

Сообщить: ветка `feat/map-targets-and-round-engine`, результаты команд, результат ручной проверки выносок. Отметить: «Упражнений пока нет — движок раунда и состояния карты добавлены как основа для задания „найди на карте“». Запросить разрешение на слияние.

---

## Plan self-review

| Требование | Задача |
| --- | --- |
| Раунд включает все регионы | 1, 5 |
| Расхождение в документах снято | 1 |
| Все 34 области выбираемы | 2 |
| Состояния верно / неверно / недоступно | 3 |
| Смысл не только цветом | 3 |
| Воспроизводимая случайность | 4 |
| Автомат состояний вопроса и запрет второго ответа | 5 |
| Запись попытки по DATA_MODEL.md | 5 |
| Отложенное записано, а не забыто | 6 |

Задачи 2–3 и 4–5 независимы: первые две трогают карту и стили, вторые две — чистый домен. Порядок в плане удобен для одного исполнителя; при параллельной работе конфликтует только `CHANGELOG.md`.

Интерфейсы объявлены до потребителей: `callout-targets.ts` до скрипта и теста, `random.ts` до `round.ts`. Упражнения, прогресс и уровни в объём не входят.
