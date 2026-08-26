# Поверхность рельефа, кнопки масштаба и итоги раунда — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Физическая карта показывает настоящую поверхность высот вместо пятен из именованных форм; кнопки масштаба уходят с карты знаками в пустой угол; итог раунда показывается картой, а список повтора совпадает с кнопкой.

**Architecture:** Высоты берутся из ETOPO1 офлайн-скриптом и превращаются в замкнутые контуры «выше порога» вторым скриптом — по образцу уже существующей пары `extract:physical` / `generate:physical`. Приложение получает готовые пути в сгенерированном модуле и рисует их слоем под реками. Кнопки и экран итогов — правки существующих компонентов; новых сущностей не заводится, кроме одного чистого модуля изолиний и одной функции домена.

**Tech Stack:** TypeScript, React 19, Vite 8, Vitest 4, tsx для скриптов. Без новых зависимостей.

## Global Constraints

Скопировано из спецификации `docs/superpowers/specs/2026-08-25-relief-controls-results-design.md` и `AGENTS.md`. Требования каждой задачи включают этот раздел неявно.

- Интерфейс, задания и сообщения об ошибках — по-русски; китайские названия в Unicode, не только пиньинем.
- Во время раунда сетевых запросов нет. Сеть допустима только в скрипте `extract:*`, который в сборку не входит.
- Домен не вызывает `Math.random`; компоненты не трогают `localStorage`; UI не знает ключей SVG, карта не считает правильность ответа.
- Значения цветов, размеров и длительностей пишутся только в `src/design/tokens.css`; компоненты берут их токенами.
- Смысл не передаётся одним цветом: у исхода и ступени всегда есть второй канал — слово, число или узор.
- Цель нажатия — не меньше 24×24 CSS px (WCAG 2.2, 2.5.8).
- Сгенерированные файлы правит только генератор: `src/map/relief-bands.ts`, `src/map/physical-geometry.ts`, `src/map/region-palette.ts`, `public/maps/china-provinces.svg` в размеченных блоках.
- Каждая задача заканчивается зелёными `npm test` и `npm run lint`; задачи, меняющие контент или геометрию, — ещё и `npm run build`.
- `CHANGELOG.md` обновляется в том же коммите, что и изменение.
- Ветка работы: `feature/relief-controls-results` (уже создана от `master`, HEAD — `711ef88`).

## Порядок и структура файлов

| Файл | Что отвечает | Задача |
| --- | --- | --- |
| `scripts/extract-relief-source.ts` | тянет сетку высот ETOPO1 по сети, пишет выжимку | 1 |
| `scripts/data/relief-source.json` | выжимка, коммитится, руками не правится | 1 |
| `docs/sources/relief.md` | запись об источнике высот | 1 |
| `scripts/relief-contours.ts` | чистая арифметика: сглаживание, марширующие квадраты, сшивка колец | 2 |
| `scripts/relief-contours.test.ts` | тесты этой арифметики | 2 |
| `scripts/relief-fingerprint.ts` | отпечаток входов генератора полос | 3 |
| `scripts/generate-relief-bands.ts` | сборка `src/map/relief-bands.ts` | 3 |
| `src/map/relief-bands.ts` | СГЕНЕРИРОВАННЫЙ: пути семи полос и отпечаток | 3 |
| `scripts/validate-map.ts` | сверка отпечатка полос | 3 |
| `src/design/tokens.css` | семь тонов полос, приглушённая граница на рельефе | 4 |
| `scripts/validate-tokens.test.ts` | проверки контраста новых пар | 4 |
| `src/map/PhysicalLayer.tsx` | слой полос; формы теряют заливку | 5 |
| `src/styles.css` | заливка полос, приглушённые границы, шкала, кнопки | 4–7 |
| `src/features/atlas/AtlasPage.tsx` | шкала высот вместо списка плашек | 6 |
| `src/map/MapControls.tsx` | знаки вместо слов, угол вместо угла | 7 |
| `src/domain/progress-rules.ts` | полный список повтора | 8 |
| `src/domain/fill-round.ts` | то же для «Заполнить карту» | 8 |
| `src/domain/round-outcomes.ts` | исходы раунда по целям | 8 |
| `src/features/results/RoundResultsPage.tsx` | компоновка Б, карта, согласованный список | 9 |
| `src/App.tsx` | какую карту отдать экрану итогов | 9 |
| `src/features/results/FillMapResultsPage.tsx` | та же компоновка | 10 |
| `EXERCISES.md`, `UI_UX.md`, `DESIGN_SYSTEM.md` | правила и описания вслед за кодом | 8, 9, 5–7 |

Задачи 1–3 идут строго по порядку: каждая следующая читает то, что записала предыдущая. Задачи 4–7 зависят от 3, между собой независимы. Задачи 8–10 не зависят от карты вовсе и могут идти параллельно с 4–7.

## Что известно про существующий код

Читать эти файлы перед началом — в них уже лежит половина нужного:

- `src/map/polyline.ts` — `simplifyRing(ring, tolerance)`, `ringArea(ring)`, `clipRingToFrame(ring, frame)`, `toPathData(rings, {closed})`, тип `Frame`. Ничего из этого писать заново не нужно.
- `src/map/projection.ts` — `projectLonLat(lon, lat): readonly [number, number]`, Меркатор, те же коэффициенты, что у всей карты.
- `src/map/target-size.ts` — `MAP_VIEWBOX_MIN_X = -16`, `MAP_VIEWBOX_MIN_Y = -16`, `MAP_VIEWBOX_WIDTH = 806`, `MAP_VIEWBOX_HEIGHT = 601`.
- `scripts/generate-physical-geometry.ts` — образец генератора: чтение выжимки файлом, проекция, упрощение, обрезка по рамке, запись модуля с шапкой «СГЕНЕРИРОВАННЫЙ ФАЙЛ», отпечаток последней строкой.
- `scripts/physical-fingerprint.ts` — образец отпечатка: sha256 от отсортированных входов, первые 16 знаков.
- `scripts/validate-map.ts:127-137` — образец сверки отпечатка со сгенерированным файлом.

---

### Task 1: Выжимка высот ETOPO1

**Files:**
- Create: `scripts/extract-relief-source.ts`
- Create: `docs/sources/relief.md`
- Modify: `package.json` (раздел `scripts`)
- Modify: `docs/sources/README.md`
- Modify: `CHANGELOG.md`
- Generated (коммитится): `scripts/data/relief-source.json`

**Interfaces:**
- Consumes: ничего.
- Produces: файл `scripts/data/relief-source.json` вида
  ```json
  { "generatedBy": "…", "lat0": 15, "lon0": 72, "step": 0.1, "rows": 401, "cols": 651, "altitude": [-2051, -2048, …] }
  ```
  `altitude` — плоский массив целых метров длиной `rows * cols`, порядок строк — с юга на север, внутри строки — с запада на восток. Задача 3 читает именно эти ключи.

- [ ] **Step 1: Написать скрипт извлечения**

Создать `scripts/extract-relief-source.ts`:

```ts
/**
 * Выжимка высот для физической карты.
 *
 * Источник — ETOPO1 Global Relief Model (NOAA NCEI, public domain), отдаётся
 * сервером ERDDAP в CSV по прямоугольнику координат. Полная модель весит
 * гигабайты и в репозиторий не кладётся; берётся сетка 0.1° по области, в
 * которую Китай входит с запасом.
 *
 * Нужна сеть. В сборку не входит: во время сборки и во время раунда проект
 * сетевых запросов не делает.
 *
 * Запуск: npm run extract:relief
 */
import { writeFileSync } from 'node:fs';

const OUT = new URL('data/relief-source.json', import.meta.url);

/** Область с запасом вокруг Китая: 73.5–135° в. д., 18–53.6° с. ш. */
const LAT0 = 15;
const LAT1 = 55;
const LON0 = 72;
const LON1 = 137;
const STEP = 0.1;

/** Шаг сетки ETOPO1 — одна угловая минута; 0.1° это каждая шестая точка. */
const STRIDE = 6;

const ROWS = Math.round((LAT1 - LAT0) / STEP) + 1;
const COLS = Math.round((LON1 - LON0) / STEP) + 1;

const URL_TEXT =
  'https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.csv' +
  `?altitude%5B(${LAT0}):${STRIDE}:(${LAT1})%5D%5B(${LON0}):${STRIDE}:(${LON1})%5D`;

const response = await fetch(URL_TEXT);
if (!response.ok) {
  throw new Error(`ETOPO1: ${response.status} ${response.statusText}`);
}

const text = await response.text();

/*
 * Сетка заполняется по координатам из самого ответа, а не по порядку строк:
 * порядок сервер не обещает, а промах на одну строку сдвинул бы весь рельеф
 * на десять километров — и выглядело бы это правдоподобно.
 */
const altitude = new Array<number | null>(ROWS * COLS).fill(null);
const lines = text.split('\n');

for (let i = 2; i < lines.length; i += 1) {
  const line = lines[i];
  if (line.length === 0) continue;

  const [latText, lonText, altText] = line.split(',');
  const row = Math.round((Number(latText) - LAT0) / STEP);
  const col = Math.round((Number(lonText) - LON0) / STEP);
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) continue;

  altitude[row * COLS + col] = Math.round(Number(altText));
}

const holes = altitude.filter((value) => value === null).length;
if (holes > 0) {
  throw new Error(
    `В сетке ${holes} пустых узлов из ${ROWS * COLS}. Ответ ERDDAP неполон, ` +
      'повторите запуск',
  );
}

writeFileSync(
  OUT,
  `${JSON.stringify({
    generatedBy:
      'scripts/extract-relief-source.ts (npm run extract:relief) — не править руками',
    source: 'ETOPO1 Global Relief Model, NOAA NCEI, public domain',
    lat0: LAT0,
    lon0: LON0,
    step: STEP,
    rows: ROWS,
    cols: COLS,
    altitude,
  })}\n`,
);

console.info(`Выжимка высот записана: узлов ${ROWS * COLS} (${ROWS}×${COLS})`);
```

- [ ] **Step 2: Добавить команду в package.json**

В `package.json`, в разделе `scripts`, сразу после строки `"extract:physical"`:

```json
"extract:relief": "tsx scripts/extract-relief-source.ts",
```

- [ ] **Step 3: Запустить извлечение**

Run: `npm run extract:relief`
Expected: `Выжимка высот записана: узлов 261051 (401×651)` и файл `scripts/data/relief-source.json` размером около 1.5 МБ. Занимает около полуминуты.

- [ ] **Step 4: Записать источник**

Создать `docs/sources/relief.md`:

```markdown
# Высоты для физической карты

| Поле | Значение |
| --- | --- |
| Название | ETOPO1 Global Relief Model |
| Организация | NOAA National Centers for Environmental Information |
| Адрес | https://www.ncei.noaa.gov/products/etopo-global-relief-model |
| Доступ | ERDDAP, набор `etopo180`, https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.html |
| Лицензия | Public domain (работа правительства США) |
| Дата получения | 2026-08-25 |
| Что берётся | высота в метрах, сетка 0.1° по области 72–137° в. д., 15–55° с. ш. |

Полная модель в репозиторий не кладётся: выжимка снимается
`npm run extract:relief` и коммитится в `scripts/data/relief-source.json`.
Полосы высот собирает из неё `npm run generate:relief`.

Шаг сетки 0.1° — примерно 11 км по широте. Карта рисуется около 835 CSS px в
ширину, то есть один пиксель — примерно 9 км: сетка мельче того, что видно на
экране, и запас точности в ней есть.
```

В `docs/sources/README.md` добавить строку со ссылкой на новый файл рядом с существующей строкой про `physical.md` — тем же видом, что у соседей.

- [ ] **Step 5: Записать изменение**

В `CHANGELOG.md`, в раздел `### Added` текущей неразмеченной версии:

```markdown
- Выжимка высот ETOPO1 (NOAA, public domain) и команда `npm run extract:relief`:
  сетка 0.1° по области 72–137° в. д., 15–55° с. ш. Источник — в
  `docs/sources/relief.md`. В сборку команда не входит: сеть нужна только ей.
```

- [ ] **Step 6: Проверить и зафиксировать**

Run: `npm run lint`
Expected: без ошибок.

```bash
git add scripts/extract-relief-source.ts scripts/data/relief-source.json docs/sources/relief.md docs/sources/README.md package.json CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat: выжимка высот ETOPO1 и команда extract:relief

Сетка 0.1° по области 72–137° в. д., 15–55° с. ш., 261 051 узел.
Источник public domain, запись — в docs/sources/relief.md. Сеть нужна
только этой команде, в сборку она не входит.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Изолинии — чистый модуль

**Files:**
- Create: `scripts/relief-contours.ts`
- Test: `scripts/relief-contours.test.ts`

**Interfaces:**
- Consumes: тип `Point` из `src/map/svg-path.ts` (`readonly [number, number]`).
- Produces:
  - `smoothGrid(values: readonly number[], rows: number, cols: number, passes: number): number[]`
  - `sinkBorder(values: number[], rows: number, cols: number, floor: number): void` — рамка сетки принудительно ниже любого порога, на месте.
  - `contourRings(grid: Grid, threshold: number): Point[][]`, где
    `type Grid = { values: readonly number[]; rows: number; cols: number; lat0: number; lon0: number; step: number }`.
    Возвращает замкнутые кольца в градусах: `[lon, lat]`.

Задача 3 вызывает ровно эти три функции.

- [ ] **Step 1: Написать падающие тесты**

Создать `scripts/relief-contours.test.ts`:

```ts
import { contourRings, sinkBorder, smoothGrid, type Grid } from './relief-contours';

/** Сетка 5×5 с квадратным «холмом» 3×3 в середине. */
function hillGrid(): Grid {
  const values = [
    0, 0, 0, 0, 0,
    0, 100, 100, 100, 0,
    0, 100, 100, 100, 0,
    0, 100, 100, 100, 0,
    0, 0, 0, 0, 0,
  ];

  return { values, rows: 5, cols: 5, lat0: 0, lon0: 0, step: 1 };
}

it('обводит холм одним замкнутым кольцом', () => {
  const rings = contourRings(hillGrid(), 50);

  expect(rings).toHaveLength(1);
  expect(rings[0][0]).toEqual(rings[0][rings[0].length - 1]);
});

it('кольцо лежит между узлами холма и нулями вокруг', () => {
  const [ring] = contourRings(hillGrid(), 50);
  const xs = ring.map(([lon]) => lon);
  const ys = ring.map(([, lat]) => lat);

  expect(Math.min(...xs)).toBeCloseTo(0.5, 5);
  expect(Math.max(...xs)).toBeCloseTo(3.5, 5);
  expect(Math.min(...ys)).toBeCloseTo(0.5, 5);
  expect(Math.max(...ys)).toBeCloseTo(3.5, 5);
});

it('возвращает пусто, когда порог выше всей сетки', () => {
  expect(contourRings(hillGrid(), 500)).toEqual([]);
});

/*
 * Два холма — два кольца. Проверка не про число: сшивка, склеивающая концы
 * только по началу отрезка, соединяла их в одно кольцо через всю сетку.
 */
it('разделяет два холма на два кольца', () => {
  const values = [
    0, 0, 0, 0, 0, 0, 0,
    0, 100, 0, 0, 0, 100, 0,
    0, 0, 0, 0, 0, 0, 0,
  ];
  const rings = contourRings(
    { values, rows: 3, cols: 7, lat0: 0, lon0: 0, step: 1 },
    50,
  );

  expect(rings).toHaveLength(2);
});

it('сглаживание тянет узел к соседям, а размер сетки не меняет', () => {
  const values = [0, 0, 0, 0, 90, 0, 0, 0, 0];
  const smoothed = smoothGrid(values, 3, 3, 1);

  expect(smoothed).toHaveLength(9);
  expect(smoothed[4]).toBeCloseTo(10, 5);
});

it('рамка опускается ниже порога', () => {
  const values = [100, 100, 100, 100, 100, 100, 100, 100, 100];
  sinkBorder(values, 3, 3, -9999);

  expect(values[0]).toBe(-9999);
  expect(values[4]).toBe(100);
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run scripts/relief-contours.test.ts`
Expected: FAIL — `Failed to resolve import "./relief-contours"`.

- [ ] **Step 3: Написать модуль**

Создать `scripts/relief-contours.ts`:

```ts
/**
 * Изолинии по сетке высот.
 *
 * Марширующие квадраты дают отрезки, сшивка складывает их в замкнутые кольца.
 * Модуль чистый и лежит в `scripts/`: в браузер он не попадает — приложение
 * получает уже готовые пути.
 */
import type { Point } from '../src/map/svg-path';

export type Grid = {
  readonly values: readonly number[];
  readonly rows: number;
  readonly cols: number;
  readonly lat0: number;
  readonly lon0: number;
  readonly step: number;
};

/**
 * Среднее по 3×3. Без него контур рассыпается на сотни колец в один-два узла:
 * у ETOPO1 соседние узлы в горах отличаются на сотни метров, и порог режет
 * эту рябь.
 */
export function smoothGrid(
  values: readonly number[],
  rows: number,
  cols: number,
  passes: number,
): number[] {
  let source = [...values];

  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Array<number>(rows * cols).fill(0);

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        let sum = 0;
        let count = 0;

        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
            sum += source[rr * cols + cc];
            count += 1;
          }
        }

        next[r * cols + c] = sum / count;
      }
    }

    source = next;
  }

  return source;
}

/**
 * Рамка сетки опускается ниже любого порога: иначе кольцо, дошедшее до края,
 * не замыкается — Памир и Гималаи продолжаются за областью выжимки. Контур
 * пойдёт по самому краю, а он всё равно за границей Китая и обрежется.
 */
export function sinkBorder(
  values: number[],
  rows: number,
  cols: number,
  floor: number,
): void {
  for (let c = 0; c < cols; c += 1) {
    values[c] = floor;
    values[(rows - 1) * cols + c] = floor;
  }

  for (let r = 0; r < rows; r += 1) {
    values[r * cols] = floor;
    values[r * cols + cols - 1] = floor;
  }
}

const key = (point: Point) => `${point[0].toFixed(6)},${point[1].toFixed(6)}`;

function segmentsFor(grid: Grid, threshold: number): Point[][] {
  const { values, rows, cols, lat0, lon0, step } = grid;
  const segments: Point[][] = [];
  const at = (r: number, c: number) => values[r * cols + c];

  const lerp = (
    x1: number,
    y1: number,
    v1: number,
    x2: number,
    y2: number,
    v2: number,
  ): Point => {
    const t = (threshold - v1) / (v2 - v1);

    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
  };

  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      const v00 = at(r, c);
      const v01 = at(r, c + 1);
      const v11 = at(r + 1, c + 1);
      const v10 = at(r + 1, c);

      const index =
        (v00 >= threshold ? 1 : 0) |
        (v01 >= threshold ? 2 : 0) |
        (v11 >= threshold ? 4 : 0) |
        (v10 >= threshold ? 8 : 0);

      if (index === 0 || index === 15) continue;

      const x0 = lon0 + c * step;
      const x1 = lon0 + (c + 1) * step;
      const y0 = lat0 + r * step;
      const y1 = lat0 + (r + 1) * step;

      const bottom = () => lerp(x0, y0, v00, x1, y0, v01);
      const right = () => lerp(x1, y0, v01, x1, y1, v11);
      const top = () => lerp(x0, y1, v10, x1, y1, v11);
      const left = () => lerp(x0, y0, v00, x0, y1, v10);

      switch (index) {
        case 1:
        case 14:
          segments.push([left(), bottom()]);
          break;
        case 2:
        case 13:
          segments.push([bottom(), right()]);
          break;
        case 3:
        case 12:
          segments.push([left(), right()]);
          break;
        case 4:
        case 11:
          segments.push([right(), top()]);
          break;
        case 6:
        case 9:
          segments.push([bottom(), top()]);
          break;
        case 7:
        case 8:
          segments.push([left(), top()]);
          break;
        /*
         * Сёдла: два отрезка в одной ячейке. Пара выбрана так же, как в
         * соседних случаях, — какую именно из двух связок брать, для заливки
         * безразлично, лишь бы одинаково.
         */
        case 5:
          segments.push([left(), bottom()], [right(), top()]);
          break;
        case 10:
          segments.push([left(), top()], [bottom(), right()]);
          break;
      }
    }
  }

  return segments;
}

/**
 * Сшивает отрезки в кольца.
 *
 * Стороны отрезка не упорядочены: дополняющие случаи марширующих квадратов
 * выдают его в обратном направлении. Сшивка только по началу оставляет от
 * контура Тибета десятки огрызков, каждый из которых потом отсеется по
 * площади, — а карта останется пустой при зелёном генераторе.
 */
function stitch(segments: readonly Point[][]): Point[][] {
  const ends = new Map<string, number[]>();

  const remember = (point: Point, index: number) => {
    const list = ends.get(key(point));
    if (list) list.push(index);
    else ends.set(key(point), [index]);
  };

  segments.forEach((segment, index) => {
    remember(segment[0], index);
    remember(segment[1], index);
  });

  const used = new Uint8Array(segments.length);
  const rings: Point[][] = [];

  const nextFrom = (point: Point, exclude: number): number => {
    for (const index of ends.get(key(point)) ?? []) {
      if (index !== exclude && used[index] === 0) return index;
    }

    return -1;
  };

  for (let start = 0; start < segments.length; start += 1) {
    if (used[start] === 1) continue;
    used[start] = 1;

    const ring: Point[] = [segments[start][0], segments[start][1]];
    let previous = start;

    for (;;) {
      const tail = ring[ring.length - 1];
      if (ring.length > 2 && key(tail) === key(ring[0])) break;

      const index = nextFrom(tail, previous);
      if (index === -1) break;

      used[index] = 1;
      const [a, b] = segments[index];
      ring.push(key(a) === key(tail) ? b : a);
      previous = index;
    }

    if (ring.length >= 4) rings.push(ring);
  }

  return rings;
}

/** Замкнутые кольца изолинии в градусах: `[lon, lat]`. */
export function contourRings(grid: Grid, threshold: number): Point[][] {
  return stitch(segmentsFor(grid, threshold));
}
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run scripts/relief-contours.test.ts`
Expected: PASS, 6 тестов.

- [ ] **Step 5: Зафиксировать**

```bash
git add scripts/relief-contours.ts scripts/relief-contours.test.ts
git commit -m "$(cat <<'EOF'
feat: изолинии по сетке высот — марширующие квадраты и сшивка колец

Сшивка идёт по обоим концам отрезка: дополняющие случаи марширующих
квадратов выдают отрезок в обратном направлении, и сшивка по началу
оставляла от контура Тибета огрызки, которые потом отсеивались по
площади — карта пустела при зелёном генераторе.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Генератор полос и сверка отпечатка

**Files:**
- Create: `scripts/relief-fingerprint.ts`
- Create: `scripts/generate-relief-bands.ts`
- Generated: `src/map/relief-bands.ts`
- Modify: `scripts/validate-map.ts` (рядом со сверкой отпечатка физической геометрии, строки 127–137)
- Modify: `package.json`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `scripts/data/relief-source.json` (задача 1), `contourRings`, `smoothGrid`, `sinkBorder` (задача 2), `simplifyRing`, `ringArea`, `clipRingToFrame`, `toPathData`, `Frame` из `src/map/polyline.ts`, `projectLonLat` из `src/map/projection.ts`, константы рамки из `src/map/target-size.ts`.
- Produces: `src/map/relief-bands.ts` с экспортами
  - `export type ReliefBand = { readonly threshold: number; readonly d: string }`
  - `export const RELIEF_BANDS: readonly ReliefBand[]` — от низкого порога к высокому,
  - `export const RELIEF_INPUTS_FINGERPRINT: string`.
  Задачи 4–6 опираются на `RELIEF_BANDS` и на порядок «снизу вверх».

- [ ] **Step 1: Написать отпечаток**

Создать `scripts/relief-fingerprint.ts`:

```ts
import { createHash } from 'node:crypto';

/**
 * Отпечаток входов генератора полос — затем же, зачем `physicalInputsFingerprint`:
 * забытый генератор не должен проходить сборку. Наличие путей в
 * `relief-bands.ts` ничего не значит; отпечаток отвечает на другой вопрос —
 * получены ли эти полосы из той выжимки и тех порогов, что лежат в
 * репозитории сейчас.
 */
export function reliefInputsFingerprint(
  thresholds: readonly number[],
  sourceJson: string,
): string {
  return createHash('sha256')
    .update([[...thresholds].sort((a, b) => a - b).join(','), sourceJson].join('\n'))
    .digest('hex')
    .slice(0, 16);
}
```

- [ ] **Step 2: Написать генератор**

Создать `scripts/generate-relief-bands.ts`:

```ts
/**
 * Строит `src/map/relief-bands.ts` из выжимки высот.
 *
 * Полоса — это область «выше порога» целиком, а не кольцо между двумя
 * порогами: слои рисуются друг поверх друга снизу вверх, и вложенные кольца
 * при правиле заполнения `evenodd` дают дырки сами. Таримская котловина
 * внутри контура 1000 м получается без отдельной геометрии.
 *
 * Запуск: npm run generate:relief
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  clipRingToFrame,
  ringArea,
  simplifyRing,
  toPathData,
  type Frame,
} from '../src/map/polyline';
import { projectLonLat } from '../src/map/projection';
import type { Point } from '../src/map/svg-path';
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
  MAP_VIEWBOX_WIDTH,
} from '../src/map/target-size';
import { contourRings, sinkBorder, smoothGrid } from './relief-contours';
import { reliefInputsFingerprint } from './relief-fingerprint';

/** Границы полос гипсометрической шкалы (DECISIONS.md, 2026-08-25). */
const THRESHOLDS = [200, 500, 1000, 2000, 3000, 4000] as const;

/** Проходов сглаживания: два убирают рябь и не съедают форму долин. */
const SMOOTH_PASSES = 2;

/** Ниже любого порога: рамка сетки, чтобы кольца замыкались внутри неё. */
const FLOOR = -9999;

/** Наименьшая площадь кольца в квадратных градусах: мельче — рябь, а не форма. */
const MIN_RING_AREA_DEG2 = 0.25;

/** Допуск упрощения: доля единицы viewBox, то есть доля пикселя на карте. */
const SIMPLIFY_TOLERANCE_UNITS = 0.35;

const FRAME: Frame = {
  minX: MAP_VIEWBOX_MIN_X,
  minY: MAP_VIEWBOX_MIN_Y,
  maxX: MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH,
  maxY: MAP_VIEWBOX_MIN_Y + MAP_VIEWBOX_HEIGHT,
};

const sourceJson = readFileSync(
  new URL('data/relief-source.json', import.meta.url),
  'utf8',
);
const source = JSON.parse(sourceJson) as {
  lat0: number;
  lon0: number;
  step: number;
  rows: number;
  cols: number;
  altitude: number[];
};

const OUT = new URL('../src/map/relief-bands.ts', import.meta.url);

const values = smoothGrid(source.altitude, source.rows, source.cols, SMOOTH_PASSES);
sinkBorder(values, source.rows, source.cols, FLOOR);

const grid = {
  values,
  rows: source.rows,
  cols: source.cols,
  lat0: source.lat0,
  lon0: source.lon0,
  step: source.step,
};

const project = (ring: readonly Point[]): Point[] =>
  ring.map(([lon, lat]) => projectLonLat(lon, lat) as Point);

const bands = THRESHOLDS.map((threshold) => {
  const rings = contourRings(grid, threshold)
    .filter((ring) => ringArea(ring) >= MIN_RING_AREA_DEG2)
    /*
     * Сначала упрощение, потом обрезка — тот же довод, что у рек в
     * `generate-physical-geometry.ts`: упрощённое кольцо отходит от исходного
     * до допуска и, обрежь мы раньше, вышло бы за рамку на эту единицу.
     */
    .map((ring) =>
      clipRingToFrame(simplifyRing(project(ring), SIMPLIFY_TOLERANCE_UNITS), FRAME),
    )
    .filter((ring) => ring.length > 3);

  if (rings.length === 0) {
    throw new Error(
      `Полоса ${threshold} м пуста. Проверьте выжимку: npm run extract:relief`,
    );
  }

  console.info(
    `${threshold} м: колец ${rings.length}, точек ` +
      `${rings.reduce((n, ring) => n + ring.length, 0)}`,
  );

  return { threshold, d: toPathData(rings, { closed: true }) };
});

const fingerprint = reliefInputsFingerprint([...THRESHOLDS], sourceJson);

const module = `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: scripts/data/relief-source.json (ETOPO1, NOAA, public domain)
 * Генератор: scripts/generate-relief-bands.ts
 */

export type ReliefBand = {
  /** Нижняя граница полосы в метрах: путь очерчивает всё, что выше неё. */
  readonly threshold: number;
  /**
   * Путь области «выше порога» со всеми кольцами. Рисовать его надо с
   * правилом заполнения \\\`evenodd\\\`: вложенное кольцо — это котловина внутри
   * нагорья, и дырку она должна давать сама.
   */
  readonly d: string;
};

/** Полосы снизу вверх: порядок и есть порядок отрисовки. */
export const RELIEF_BANDS: readonly ReliefBand[] = [
${bands
  .map((band) => `  { threshold: ${band.threshold}, d: '${band.d}' },`)
  .join('\n')}
];

/**
 * Отпечаток входов, из которых собраны эти полосы: пороги и выжимка.
 * \\\`validate:map\\\` сверяет его заново и роняет сборку, если входы поменялись,
 * а генератор не запускали.
 */
export const RELIEF_INPUTS_FINGERPRINT = '${fingerprint}';
`;

writeFileSync(OUT, module);
console.info(`Записано: ${(module.length / 1024).toFixed(0)} КБ, полос ${bands.length}`);
```

- [ ] **Step 3: Добавить команду и запустить генератор**

В `package.json`, сразу после `"generate:physical"`:

```json
"generate:relief": "tsx scripts/generate-relief-bands.ts",
```

Run: `npm run generate:relief`
Expected: шесть строк вида `4000 м: колец 3, точек 472` и итог `Записано: … КБ, полос 6`. Общий размер файла — около 90–110 КБ.

- [ ] **Step 4: Написать падающую сверку отпечатка**

В `scripts/validate-map.ts` дописать импорт рядом с существующим импортом `INPUTS_FINGERPRINT`:

```ts
import { RELIEF_BANDS, RELIEF_INPUTS_FINGERPRINT } from '../src/map/relief-bands';
import { reliefInputsFingerprint } from './relief-fingerprint';
```

И блок сверки сразу после существующего блока про физическую геометрию (после строки 137):

```ts
const expectedReliefFingerprint = reliefInputsFingerprint(
  RELIEF_BANDS.map((band) => band.threshold),
  readFileSync(new URL('data/relief-source.json', import.meta.url), 'utf8'),
);
if (expectedReliefFingerprint !== RELIEF_INPUTS_FINGERPRINT) {
  throw new Error(
    `Полосы рельефа собраны из других входов: в файле ${RELIEF_INPUTS_FINGERPRINT}, ` +
      `у нынешних входов ${expectedReliefFingerprint}. Запустите npm run generate:relief`,
  );
}
```

- [ ] **Step 5: Проверить, что сверка ловит расхождение**

Временно изменить в `src/map/relief-bands.ts` последнюю строку на
`export const RELIEF_INPUTS_FINGERPRINT = 'deadbeefdeadbeef';`

Run: `npm run validate:map`
Expected: падение с текстом `Полосы рельефа собраны из других входов: в файле deadbeefdeadbeef, у нынешних входов …`

Вернуть строку: `npm run generate:relief`

Run: `npm run validate:map`
Expected: без ошибок.

- [ ] **Step 6: Записать изменение и зафиксировать**

В `CHANGELOG.md`, раздел `### Added`:

```markdown
- Полосы высот физической карты: `npm run generate:relief` собирает
  `src/map/relief-bands.ts` из выжимки ETOPO1 — шесть порогов (200, 500, 1000,
  2000, 3000, 4000 м) в проекции карты. Отпечаток входов сверяет
  `validate:map`: забытый генератор роняет сборку.
```

Run: `npm run build`
Expected: три валидатора, `tsc -b` и сборка проходят. В строке размера бандла (`dist/assets/index-*.js`) прибавка — около 90–110 КБ до сжатия; сейчас там 571 КБ. Если прибавка вышла заметно больше, поднять `SIMPLIFY_TOLERANCE_UNITS` в генераторе до 0.5 и перегенерировать: карта рисуется около 835 CSS px, и запас точности есть.

```bash
git add scripts/relief-fingerprint.ts scripts/generate-relief-bands.ts src/map/relief-bands.ts scripts/validate-map.ts package.json CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat: генератор полос высот и сверка отпечатка в validate:map

Полоса — область «выше порога» целиком: слои рисуются снизу вверх, и
вложенные кольца при evenodd дают котловины дырками сами.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Семь тонов шкалы и проверки контраста

**Files:**
- Modify: `src/design/tokens.css`
- Modify: `scripts/validate-tokens.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: ничего из предыдущих задач.
- Produces: токены `--map-relief-band-0`, `--map-relief-band-200`, `--map-relief-band-500`, `--map-relief-band-1000`, `--map-relief-band-2000`, `--map-relief-band-3000`, `--map-relief-band-4000` и `--map-border-on-relief`. Задачи 5 и 6 берут их по этим именам.

- [ ] **Step 1: Написать падающие проверки контраста**

В `scripts/validate-tokens.test.ts` добавить рядом с существующим блоком `describe('карта', …)`:

```ts
const RELIEF_BANDS_TOKENS = [
  '--map-relief-band-0',
  '--map-relief-band-200',
  '--map-relief-band-500',
  '--map-relief-band-1000',
  '--map-relief-band-2000',
  '--map-relief-band-3000',
  '--map-relief-band-4000',
] as const;

describe('шкала высот', () => {
  /*
   * Река — главная линия физической карты, и она обязана читаться на самой
   * тёмной полосе. Ниже 3:1 линия сливается с нагорьем, по которому и течёт.
   */
  it.each(RELIEF_BANDS_TOKENS)('река различима на полосе %s', (band) => {
    const ratio = contrastRatioRounded(color('--map-river'), color(band));

    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  /*
   * Граница региона на физическом виде приглушена намеренно, но границей быть
   * не перестаёт: MAP_SPEC.md требует 3:1 для обводки области.
   */
  it.each(RELIEF_BANDS_TOKENS)('граница различима на полосе %s', (band) => {
    const ratio = contrastRatioRounded(color('--map-border-on-relief'), color(band));

    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  /* Метки исхода ложатся поверх любой полосы: игра идёт на той же карте. */
  it.each(RELIEF_BANDS_TOKENS)('метка верного ответа различима на %s', (band) => {
    const ratio = contrastRatioRounded(color('--map-correct-mark'), color(band));

    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it.each(RELIEF_BANDS_TOKENS)('метка ошибки различима на %s', (band) => {
    const ratio = contrastRatioRounded(
      color('--map-incorrect-mark-relief'),
      color(band),
    );

    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  /*
   * Шкала обязана идти в одну сторону: светлота падает с ростом высоты. Без
   * этого «темнее — выше» перестаёт быть правилом, и легенда врёт.
   */
  it('светлота падает от равнин к нагорью', () => {
    const luminances = RELIEF_BANDS_TOKENS.map((band) => relativeLuminance(color(band)));

    for (let i = 1; i < luminances.length; i += 1) {
      expect(luminances[i]).toBeLessThan(luminances[i - 1]);
    }
  });
});
```

Если `relativeLuminance` в `src/design/contrast.ts` не экспортируется — экспортировать его там же, рядом с `contrastRatioRounded`; отдельной реализации не заводить.

- [ ] **Step 2: Запустить и убедиться, что тесты падают**

Run: `npx vitest run scripts/validate-tokens.test.ts -t 'шкала высот'`
Expected: FAIL — токенов `--map-relief-band-*` в `tokens.css` нет, `resolve` возвращает пусто.

- [ ] **Step 3: Добавить токены**

В `src/design/tokens.css`, в блоке примитивов, заменить группу `--c-relief-*` на семь ступеней шкалы (комментарий сохранить и дополнить):

```css
  /*
   * Гипсометрическая шкала. Светлота падает с востока на запад так же, как
   * растёт высота: нижняя полоса — светлая зелень равнин, верхняя — тёмная
   * охра нагорья. Отрезок светлоты держат снизу линия реки и приглушённая
   * граница, которым нужно 3:1 к самой тёмной полосе, сверху — нейтральный
   * тон бумаги. Монотонность шкалы проверяется тестом: «темнее — выше»
   * должно быть правилом, иначе легенда врёт.
   */
  --c-relief-0: #cfdcaa;
  --c-relief-200: #dde0a9;
  --c-relief-500: #ece0a8;
  --c-relief-1000: #dcc794;
  --c-relief-2000: #c9ac78;
  --c-relief-3000: #b6955e;
  --c-relief-4000: #a8874e;
```

В группе карты заменить `--map-relief-step-*` и `--map-relief-rest` на:

```css
  --map-relief-band-0: var(--c-relief-0);
  --map-relief-band-200: var(--c-relief-200);
  --map-relief-band-500: var(--c-relief-500);
  --map-relief-band-1000: var(--c-relief-1000);
  --map-relief-band-2000: var(--c-relief-2000);
  --map-relief-band-3000: var(--c-relief-3000);
  --map-relief-band-4000: var(--c-relief-4000);

  /*
   * Граница региона на физическом виде. На политической карте граница —
   * главная информация; на физической главное — поверхность, и полная тушь
   * спорит с ней. Приглушённая, но не ниже 3:1 к каждой полосе.
   */
  --map-border-on-relief: var(--c-ink-500);
```

- [ ] **Step 4: Запустить проверки и добиться зелёного**

Run: `npx vitest run scripts/validate-tokens.test.ts`
Expected: PASS.

Если какая-то полоса не проходит — применить откат, назначенный спецификацией: оставить четыре порога (200, 1000, 2000, 4000) и пять полос, убрав `--map-relief-band-500` и `--map-relief-band-3000` из токенов, из `THRESHOLDS` в `scripts/generate-relief-bands.ts` и из списка в тесте, затем перегенерировать `npm run generate:relief`. Это решение уже принято, обсуждать его заново не нужно.

- [ ] **Step 5: Зафиксировать**

В `CHANGELOG.md`, раздел `### Changed`:

```markdown
- Палитра рельефа: три ступени заменены гипсометрической шкалой из семи полос
  (`--map-relief-band-*`). Тон «остального» убран: заливать им больше нечего.
  Граница региона на физическом виде получила приглушённый тон
  `--map-border-on-relief` — на физической карте главное поверхность, и полная
  тушь с ней спорила. Контраст всех новых пар проверяется тестом.
```

```bash
git add src/design/tokens.css src/design/contrast.ts scripts/validate-tokens.test.ts CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat: гипсометрическая шкала в токенах вместо трёх ступеней

Семь полос, монотонность шкалы и контраст к реке, границе и меткам
исхода закреплены тестами.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Полосы в слое карты, формы теряют заливку

**Files:**
- Modify: `src/map/PhysicalLayer.tsx`
- Modify: `src/map/PhysicalLayer.test.tsx`
- Modify: `src/styles.css` (блок `.china-map .physical-layer`, строки около 933–1090; и `.china-map[data-map-variant='physical'] [data-region-id]`, строка около 710)
- Modify: `DESIGN_SYSTEM.md` (раздел «Карта»)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `RELIEF_BANDS` из `src/map/relief-bands.ts` (задача 3), токены `--map-relief-band-*` и `--map-border-on-relief` (задача 4).
- Produces: разметка `<g class="relief-bands">` внутри слоя; узлы полос помечены `data-band="{threshold}"`, базовая заливка — `data-band="0"`.

- [ ] **Step 1: Написать падающие тесты**

В `src/map/PhysicalLayer.test.tsx` добавить:

```ts
it('рисует полосы высот снизу вверх', () => {
  const { container } = render(
    <svg>
      <PhysicalLayer />
    </svg>,
  );

  const bands = [...container.querySelectorAll('[data-band]')];

  expect(bands.map((band) => band.getAttribute('data-band'))).toEqual([
    '0',
    '200',
    '500',
    '1000',
    '2000',
    '3000',
    '4000',
  ]);
});

/*
 * Полосы декоративны: шкалу называет легенда словами, а семь узлов в обходе
 * по Tab не дали бы ученику ничего.
 */
it('не даёт полосам имени и фокуса', () => {
  const { container } = render(
    <svg>
      <PhysicalLayer />
    </svg>,
  );

  for (const band of container.querySelectorAll('[data-band]')) {
    expect(band.getAttribute('aria-hidden')).toBe('true');
    expect(band.getAttribute('tabindex')).toBeNull();
  }
});

/*
 * Форма перестала заливать фон: заливка занята шкалой. Цель у неё остаётся —
 * имя, роль и фокус нужны игре «Найти на физической карте».
 */
it('оставляет спрашиваемой форме имя и роль без заливки по ступени', () => {
  const { container } = render(
    <svg>
      <PhysicalLayer onSelect={() => {}} />
    </svg>,
  );

  const shape = container.querySelector('.relief-shape[data-feature-id]');

  expect(shape).not.toBeNull();
  expect(shape?.getAttribute('role')).toBe('button');
  expect(shape?.getAttribute('data-step')).toBeNull();
  expect(shape?.getAttribute('aria-label')).toMatch(/,/);
});
```

- [ ] **Step 2: Запустить и убедиться, что тесты падают**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx`
Expected: FAIL — узлов `[data-band]` нет, у формы всё ещё есть `data-step`.

- [ ] **Step 3: Нарисовать полосы и снять заливку форм**

В `src/map/PhysicalLayer.tsx`:

добавить импорт

```ts
import { RELIEF_BANDS } from './relief-bands';
```

сразу за открывающим `<g className="relief" clipPath={…}>` вставить полосы перед списком форм:

```tsx
      {/*
        Полосы высот. Базовая заливка прямоугольником — нижняя полоса, поверх
        неё области «выше порога» снизу вверх. Правило заполнения `evenodd`
        задано стилями: вложенное кольцо — котловина внутри нагорья, и дырку
        она даёт сама.
      */}
      <rect
        className="relief-band"
        data-band="0"
        aria-hidden="true"
        x={MAP_VIEWBOX_MIN_X}
        y={MAP_VIEWBOX_MIN_Y}
        width={MAP_VIEWBOX_WIDTH}
        height={MAP_VIEWBOX_HEIGHT}
      />
      {RELIEF_BANDS.map((band) => (
        <path
          key={band.threshold}
          className="relief-band"
          data-band={band.threshold}
          aria-hidden="true"
          d={band.d}
        />
      ))}
```

Импортировать константы рамки:

```ts
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
  MAP_VIEWBOX_WIDTH,
} from './target-size';
```

У узла формы убрать атрибут `data-step={shape.step}` — строка с ним удаляется целиком. Остальные атрибуты формы (`data-feature-id`, `data-selected`, `data-outcome`, `role`, `aria-label`, `tabIndex`, обработчики) не трогать.

- [ ] **Step 4: Переписать стили слоя**

В `src/styles.css`:

заменить блок заливки формы по ступени (строки около 971–981) на стили полос:

```css
/*
 * Полосы высот. Правило заполнения `evenodd` обязательно: путь полосы несёт
 * все её кольца сразу, и вложенное кольцо — это котловина внутри нагорья.
 * При `nonzero` Таримская котловина залилась бы наравне с хребтами вокруг.
 */
.china-map .physical-layer .relief-band {
  fill-rule: evenodd;
}

.china-map .physical-layer .relief-band[data-band='0'] {
  fill: var(--map-relief-band-0);
}

.china-map .physical-layer .relief-band[data-band='200'] {
  fill: var(--map-relief-band-200);
}

.china-map .physical-layer .relief-band[data-band='500'] {
  fill: var(--map-relief-band-500);
}

.china-map .physical-layer .relief-band[data-band='1000'] {
  fill: var(--map-relief-band-1000);
}

.china-map .physical-layer .relief-band[data-band='2000'] {
  fill: var(--map-relief-band-2000);
}

.china-map .physical-layer .relief-band[data-band='3000'] {
  fill: var(--map-relief-band-3000);
}

.china-map .physical-layer .relief-band[data-band='4000'] {
  fill: var(--map-relief-band-4000);
}

/*
 * Форма рельефа больше не заливается: заливка занята шкалой. Спрашиваемая
 * форма отвечает на наведение и фокус обводкой — она читается поверх любой
 * полосы, а заливка спорила бы со шкалой и врала бы о высоте.
 */
.china-map .physical-layer .relief-shape {
  fill: transparent;
}
```

Заменить правило `.china-map[data-map-variant='physical'] [data-region-id]` (строка около 710): вместо `fill: var(--map-relief-rest);` поставить

```css
  fill: none;
  stroke: var(--map-border-on-relief);
```

Существующие правила `.relief-shape[data-selected='true']` и `:focus-visible` оставить, но убедиться, что они задают обводку, а не заливку; если задают заливку — заменить на `stroke` тем же токеном.

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx`
Expected: PASS.

Run: `npm test`
Expected: весь набор зелёный. Тесты, ожидавшие `data-step` у формы или тон `--map-relief-rest`, поправить по существу: они проверяли снятое поведение.

- [ ] **Step 6: Проверить глазами**

Run: `npm run dev`, открыть атлас, переключить на «Физическую».
Expected: суша залита целиком, белых провалов между формами нет, Таримская и Сычуаньская котловины светлее хребтов вокруг, реки читаются на всех полосах, границы регионов видны, но не спорят с рельефом.

- [ ] **Step 7: Записать в документы и зафиксировать**

В `DESIGN_SYSTEM.md`, в разделе «Карта», заменить описание физического режима: поверхность — гипсометрическая шкала из семи полос по высоте, именованные формы Natural Earth больше не заливают фон и остаются целями вопроса; границы регионов на физическом виде приглушены.

В `CHANGELOG.md`, раздел `### Changed`:

```markdown
- Физическая карта показывает поверхность, а не пятна. Прежде рельеф собирался
  из 38 именованных форм Natural Earth, а всё, что в них не попало, заливалось
  тоном «остального» — он и занимал на карте больше всего площади, то есть
  самый заметный цвет означал «данных нет». Теперь заливка идёт по высоте из
  ETOPO1 и покрывает сушу целиком; именованные формы остались тем, чем были по
  смыслу, — целями вопроса.
```

```bash
git add src/map/PhysicalLayer.tsx src/map/PhysicalLayer.test.tsx src/styles.css DESIGN_SYSTEM.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat: физическая карта заливается по высоте, а не именованными формами

Тон «остального» убран: он занимал больше всего площади и означал
«данных нет». Формы Natural Earth теряют заливку и остаются целями.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Шкала высот вместо списка плашек

**Files:**
- Modify: `src/features/atlas/AtlasPage.tsx` (константа `RELIEF_LEGEND`, строки 34–43; разметка легенды, строки около 318–332)
- Modify: `src/features/atlas/AtlasPage.test.tsx`
- Modify: `src/styles.css` (блок `.relief-legend`, строки 2231–2265)
- Modify: `UI_UX.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: токены `--map-relief-band-*` (задача 4).
- Produces: разметка `<figure class="relief-scale">` под картой физического вида.

- [ ] **Step 1: Написать падающие тесты**

В `src/features/atlas/AtlasPage.test.tsx` добавить:

```ts
it('показывает шкалу высот под физической картой', async () => {
  renderAtlas();

  await userEvent.click(screen.getByRole('radio', { name: 'Физическая' }));

  const scale = screen.getByRole('figure', { name: 'Высота, м над уровнем моря' });

  expect(scale).toBeInTheDocument();
  for (const tick of ['200', '500', '1000', '2000', '3000', '4000']) {
    expect(within(scale).getByText(tick)).toBeInTheDocument();
  }
  expect(within(scale).getByText('равнины')).toBeInTheDocument();
  expect(within(scale).getByText('нагорье')).toBeInTheDocument();
});

it('не показывает шкалу на политической карте', () => {
  renderAtlas();

  expect(
    screen.queryByRole('figure', { name: 'Высота, м над уровнем моря' }),
  ).toBeNull();
});
```

Если в файле нет помощника `renderAtlas` — использовать тот способ отрисовки страницы, которым пользуются соседние тесты в этом же файле, и импортировать `within` из `@testing-library/react`.

- [ ] **Step 2: Запустить и убедиться, что тесты падают**

Run: `npx vitest run src/features/atlas/AtlasPage.test.tsx -t 'шкалу высот'`
Expected: FAIL — роли `figure` с таким именем нет.

- [ ] **Step 3: Заменить легенду шкалой**

В `src/features/atlas/AtlasPage.tsx` удалить константу `RELIEF_LEGEND` вместе с её комментарием и импорт типа `ReliefStep`, если он больше нигде в файле не нужен. Вместо них:

```tsx
/**
 * Шкала высот. Полоса, а не список плашек: шкала непрерывна, и разрывы между
 * подписями («выше 4000», «1000–2000», «ниже 500») означали бы, что полос
 * между ними нет. Смысл не в одном цвете: границы названы числами.
 */
const RELIEF_TICKS = [200, 500, 1000, 2000, 3000, 4000] as const;
const RELIEF_BAND_TOKENS = [0, ...RELIEF_TICKS] as const;
```

Разметку легенды (блок `mapKind === 'physical' ? (<ul className="relief-legend">…)` ) заменить на:

```tsx
          {mapKind === 'physical' ? (
            <figure className="relief-scale" aria-label="Высота, м над уровнем моря">
              <figcaption>Высота, м над уровнем моря</figcaption>
              <div className="relief-scale-bar" aria-hidden="true">
                {RELIEF_BAND_TOKENS.map((band) => (
                  <span key={band} data-band={band} />
                ))}
              </div>
              <div className="relief-scale-ticks">
                {RELIEF_TICKS.map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
              <div className="relief-scale-ends">
                <span>равнины</span>
                <span>нагорье</span>
              </div>
            </figure>
          ) : null}
```

- [ ] **Step 4: Переписать стили**

В `src/styles.css` заменить блок `.relief-legend` (строки 2231–2265) на:

```css
.relief-scale {
  color: var(--text-on-ground);
  font-size: var(--t-size-caption);
  margin: var(--s-3) 0 0;
}

.relief-scale figcaption {
  margin-block-end: var(--s-1);
}

/*
 * Семь равных долей: полоса показывает порядок ступеней, а не их ширину в
 * метрах. Ширина в метрах у полос разная — от двухсот до бесконечности, — и
 * пропорциональная шкала отдала бы шесть седьмых длины одной верхней полосе.
 */
.relief-scale-bar {
  block-size: 12px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.relief-scale-bar span {
  display: block;
  block-size: 100%;
}

.relief-scale-bar span[data-band='0'] {
  background: var(--map-relief-band-0);
}

.relief-scale-bar span[data-band='200'] {
  background: var(--map-relief-band-200);
}

.relief-scale-bar span[data-band='500'] {
  background: var(--map-relief-band-500);
}

.relief-scale-bar span[data-band='1000'] {
  background: var(--map-relief-band-1000);
}

.relief-scale-bar span[data-band='2000'] {
  background: var(--map-relief-band-2000);
}

.relief-scale-bar span[data-band='3000'] {
  background: var(--map-relief-band-3000);
}

.relief-scale-bar span[data-band='4000'] {
  background: var(--map-relief-band-4000);
}

/*
 * Подпись стоит на границе между полосами, а не в середине своей: число —
 * это порог, а не название ступени.
 */
.relief-scale-ticks {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
}

.relief-scale-ticks span {
  justify-self: end;
  transform: translateX(50%);
}

.relief-scale-ends {
  color: var(--text-on-ground-muted);
  display: flex;
  justify-content: space-between;
}
```

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run src/features/atlas/AtlasPage.test.tsx`
Expected: PASS. Тесты, искавшие тексты «Нагорье», «Плато и котловины», «Равнины», поправить: этих строк больше нет.

- [ ] **Step 6: Проверить глазами и зафиксировать**

Run: `npm run dev`, атлас → «Физическая», ширина окна 1440 и 375.
Expected: шкала полосой под картой, шесть чисел на границах, «равнины» и «нагорье» по краям; на узком экране полоса во всю ширину карты, ничего не наезжает.

В `UI_UX.md`, в описании атласа, заменить упоминание легенды ступеней на шкалу высот. Заодно поправить два уже разошедшихся с продуктом места: в атласе больше нет «списка с поиском», а на мобильном нет «раскрытого равнозначного списка» — оба ушли решением от 2026-08-20.

В `CHANGELOG.md`, раздел `### Changed`:

```markdown
- Легенда физической карты — непрерывная шкала высот вместо трёх плашек.
  Прежние подписи («выше 4000», «1000–2000», «ниже 500») оставляли шкалу
  дырявой: полосы 500–1000 и 2000–4000 не были названы вообще.
- `UI_UX.md` приведён в соответствие с продуктом: списка с поиском в атласе и
  раскрытого равнозначного списка на телефоне там больше нет.
```

```bash
git add src/features/atlas/AtlasPage.tsx src/features/atlas/AtlasPage.test.tsx src/styles.css UI_UX.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat: шкала высот под физической картой вместо трёх плашек

Прежняя легенда оставляла в шкале дыры: полосы 500–1000 и 2000–4000 не
назывались. Заодно UI_UX.md приведён в соответствие с продуктом.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Кнопки масштаба — знаки в верхнем левом углу

**Files:**
- Modify: `src/map/MapControls.tsx`
- Modify: `src/map/MapControls.test.tsx`
- Modify: `src/styles.css` (блок `.map-controls`, строки 529–566)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: ничего.
- Produces: та же разметка `<div class="map-controls" aria-label="Масштаб карты">` с тремя кнопками; доступные имена кнопок не меняются — `Увеличить`, `Уменьшить`, `Сбросить вид`.

- [ ] **Step 1: Написать падающие тесты**

В `src/map/MapControls.test.tsx` добавить:

```ts
/*
 * Слово ушло в имя, знак остался на экране. Проверка держит и то, и другое:
 * без имени кнопка немая для читалки, без знака — пустая на экране.
 */
it('называет действие словом, а показывает знак', () => {
  render(<MapControls zoom={1.5} onZoomChange={() => {}} />);

  const zoomIn = screen.getByRole('button', { name: 'Увеличить' });

  expect(zoomIn).toHaveTextContent('+');
  expect(zoomIn).not.toHaveTextContent('Увеличить');
});

it('прячет знак от читалки: имя уже сказано', () => {
  render(<MapControls zoom={1.5} onZoomChange={() => {}} />);

  const glyph = screen
    .getByRole('button', { name: 'Уменьшить' })
    .querySelector('[aria-hidden="true"]');

  expect(glyph).not.toBeNull();
});
```

- [ ] **Step 2: Запустить и убедиться, что тесты падают**

Run: `npx vitest run src/map/MapControls.test.tsx -t 'знак'`
Expected: FAIL — кнопка содержит слово, а не знак.

- [ ] **Step 3: Переписать компонент**

В `src/map/MapControls.tsx` заменить тело `return` на:

```tsx
  return (
    <div className="map-controls" aria-label="Масштаб карты">
      <button
        type="button"
        aria-label="Увеличить"
        disabled={!canZoomIn}
        onClick={() => onZoomChange(zoomLevels[zoomIndex + 1])}
      >
        <span aria-hidden="true">+</span>
      </button>
      <button
        type="button"
        aria-label="Уменьшить"
        disabled={!canZoomOut}
        onClick={() => onZoomChange(zoomLevels[zoomIndex - 1])}
      >
        <span aria-hidden="true">−</span>
      </button>
      <button
        type="button"
        aria-label="Сбросить вид"
        disabled={zoom === 1}
        onClick={() => onZoomChange(1)}
      >
        <span aria-hidden="true">↺</span>
      </button>
    </div>
  );
```

Над компонентом дописать к существующему комментарию:

```
 * Слова ушли в `aria-label`: три подписи в полный рост стояли на карте и
 * весили больше неё. Знаки скрыты от читалки — имя кнопки уже сказано
 * словом, и «плюс Увеличить» было бы прочитано дважды.
```

- [ ] **Step 4: Проверить, что знаки есть в подмножестве шрифта**

Run: `npm run validate:fonts`
Expected: без ошибок. Если `−` (U+2212) или `↺` (U+21BA) не покрыты — запустить `npm run generate:fonts` и добавить пересобранные подмножества в коммит.

- [ ] **Step 5: Переставить и облегчить стили**

В `src/styles.css` заменить блок `.map-controls` (строки 529–536) на:

```css
/*
 * Верхний левый угол: на обоих видах карты там пусто. Прежнее место — левый
 * нижний — приходилось на Тибет, Сычуань и Юньнань, а на 375 px три кнопки
 * складывались в два ряда и закрывали около четверти страны.
 */
.map-controls {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  inset-block-start: var(--s-3);
  inset-inline-start: var(--s-3);
  position: absolute;
}
```

В `.map-controls button` (строки 542–552) заменить `padding: var(--s-2) var(--s-3);` на `padding: 0;` и добавить

```css
  align-items: center;
  display: flex;
  justify-content: center;
  line-height: 1;
```

`min-height` и `min-width` со значением `var(--target-min)` оставить: они и держат цель нажатия.

- [ ] **Step 6: Запустить тесты и проверить глазами**

Run: `npx vitest run src/map/MapControls.test.tsx`
Expected: PASS, включая четыре прежних теста.

Run: `npm test`
Expected: зелёно.

Run: `npm run dev`, атлас на 1440 и на 375, оба вида карты.
Expected: стопка из трёх знаков в верхнем левом углу, карта под ними свободна, на 375 px юго-запад не закрыт.

- [ ] **Step 7: Зафиксировать**

В `CHANGELOG.md`, раздел `### Changed`:

```markdown
- Кнопки масштаба — знаки `+`, `−`, `↺` стопкой в верхнем левом углу карты
  вместо трёх слов в левом нижнем. Слова остались доступными именами кнопок.
  Прежнее место приходилось на Тибет, Сычуань и Юньнань, а на 375 px кнопки
  закрывали около четверти страны.
```

```bash
git add src/map/MapControls.tsx src/map/MapControls.test.tsx src/styles.css CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat: кнопки масштаба знаками в верхнем левом углу карты

Слова ушли в aria-label. Прежнее место закрывало Тибет, Сычуань и
Юньнань, на 375 px — около четверти страны.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Домен — полный список повтора и исходы раунда

**Files:**
- Modify: `src/domain/progress-rules.ts` (строки 5, 44–47)
- Modify: `src/domain/progress-rules.test.ts` (строки 5, 56)
- Modify: `src/domain/fill-round.ts` (строка 2 и строка около 197)
- Create: `src/domain/round-outcomes.ts`
- Test: `src/domain/round-outcomes.test.ts`
- Modify: `EXERCISES.md` (строка 23)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `Attempt`, `Target` из `src/domain/round.ts`; `RegionOutcome` из `src/domain/fill-round.ts` (значения `'first-try' | 'second-try' | 'failed'`).
- Produces: `outcomesByTarget(attempts: readonly Attempt[]): Readonly<Record<string, RegionOutcome>>` — ключ `target.id`, значение `'first-try'` у верного ответа и `'failed'` у неверного. Задача 9 передаёт результат в `ChinaMap` как `outcomes`.

**Важно про число исходов.** В обычном раунде попытка одна: `ExerciseRound` вызывает `answerQuestion` и сразу переходит дальше. Значит исходов у него два, а не три. Три (`first-try` / `second-try` / `failed`) есть только у игры «Заполнить карту» — там `MAX_ATTEMPTS_PER_REGION` больше единицы. Легенда на экране итогов обычного раунда — из двух ключей; трёхключевая легенда из макета относится к задаче 10.

- [ ] **Step 1: Написать падающие тесты исходов**

Создать `src/domain/round-outcomes.test.ts`:

```ts
import { outcomesByTarget } from './round-outcomes';
import type { Attempt } from './round';

function attempt(id: string, isCorrect: boolean): Attempt {
  return {
    questionId: `q-${id}`,
    roundId: 'r1',
    target: { id, kind: 'region' },
    exerciseType: 'find-on-map',
    language: 'ru',
    isCorrect,
    durationMs: 1000,
    answeredAt: '2026-08-25T10:00:00.000Z',
  };
}

it('верный ответ — взят, неверный — не угадан', () => {
  const outcomes = outcomesByTarget([attempt('sichuan', true), attempt('anhui', false)]);

  expect(outcomes).toEqual({ sichuan: 'first-try', anhui: 'failed' });
});

/*
 * Повтор ошибок спрашивает регион второй раз в том же раунде. Побеждает
 * последний ответ: карта итога показывает, чем раунд кончился, а не с чего
 * начался.
 */
it('берёт последний ответ по цели', () => {
  const outcomes = outcomesByTarget([attempt('anhui', false), attempt('anhui', true)]);

  expect(outcomes).toEqual({ anhui: 'first-try' });
});

it('на пустом раунде даёт пустой набор', () => {
  expect(outcomesByTarget([])).toEqual({});
});
```

Если поля `Target` в этом проекте называются иначе — открыть `src/domain/round.ts` и собрать `attempt` по настоящему типу; выдумывать поля нельзя, тест должен компилироваться.

- [ ] **Step 2: Запустить и убедиться, что тест падает**

Run: `npx vitest run src/domain/round-outcomes.test.ts`
Expected: FAIL — `Failed to resolve import "./round-outcomes"`.

- [ ] **Step 3: Написать модуль**

Создать `src/domain/round-outcomes.ts`:

```ts
import type { RegionOutcome } from './fill-round';
import type { Attempt } from './round';

/**
 * Исход раунда по каждой цели — тем же словарём, каким карта красит области.
 *
 * Исходов здесь два, а не три: в обычном раунде попытка одна, и «со второй»
 * взяться неоткуда. Третий исход есть у игры «Заполнить карту», и считает его
 * `buildFillSummary` — там попыток три.
 */
export function outcomesByTarget(
  attempts: readonly Attempt[],
): Readonly<Record<string, RegionOutcome>> {
  const outcomes: Record<string, RegionOutcome> = {};

  for (const attempt of attempts) {
    outcomes[attempt.target.id] = attempt.isCorrect ? 'first-try' : 'failed';
  }

  return outcomes;
}
```

- [ ] **Step 4: Запустить тест**

Run: `npx vitest run src/domain/round-outcomes.test.ts`
Expected: PASS.

- [ ] **Step 5: Написать падающий тест на полный список повтора**

В `src/domain/progress-rules.test.ts` заменить тест, требующий ровно `MAX_REVIEW_TOPICS` тем (строка 56), на:

```ts
it('в повтор идут все цели с ошибкой, а не первые пять', () => {
  const wrong = Array.from({ length: 8 }, (_, index) =>
    attemptFor(`region-${index}`, false),
  );

  expect(summariseRound(wrong).targetsToReview).toHaveLength(8);
});

/*
 * Повтор ошибок спрашивает регион дважды в одном раунде: без слияния он попал
 * бы в список и в подпись кнопки два раза.
 */
it('не повторяет цель дважды', () => {
  const attempts = [attemptFor('anhui', false), attemptFor('anhui', false)];

  expect(summariseRound(attempts).targetsToReview).toHaveLength(1);
});
```

Помощник `attemptFor` взять тот, что уже используется в этом файле; если его нет — собрать по образцу существующих тестов файла. Импорт `MAX_REVIEW_TOPICS` (строка 5) удалить.

- [ ] **Step 6: Запустить и убедиться, что тест падает**

Run: `npx vitest run src/domain/progress-rules.test.ts`
Expected: FAIL — `expected length 5 to be 8`.

- [ ] **Step 7: Снять обрезку**

В `src/domain/progress-rules.ts` удалить строку `export const MAX_REVIEW_TOPICS = 5;` и заменить сборку `targetsToReview` на:

```ts
    /*
     * Все цели с ошибкой, без обрезки и без повторов. Обрезка до пяти делала
     * экран итогов лживым: список говорил «пять», а кнопка запускала все
     * ошибки. Слияние по ключу нужно повтору ошибок — там цель спрашивается
     * второй раз в том же раунде.
     */
    targetsToReview: [
      ...new Map(
        attempts
          .filter((attempt) => !attempt.isCorrect)
          .map((attempt) => [targetKey(attempt.target), attempt.target]),
      ).values(),
    ],
```

В `src/domain/fill-round.ts` убрать импорт `MAX_REVIEW_TOPICS` (строка 2) и снять `.slice(0, MAX_REVIEW_TOPICS)` (строка около 197).

- [ ] **Step 8: Запустить тесты**

Run: `npm test`
Expected: зелёно. Тесты `fill-round.test.ts`, ожидавшие пять тем, поправить по существу — они проверяли снятое поведение.

- [ ] **Step 9: Записать правило и зафиксировать**

В `EXERCISES.md` заменить первое предложение строки 23 на:

```markdown
Кнопка «Повторить ошибки» создаёт раунд из целей, на которых ученик ошибся в этом раунде; его длина равна числу таких целей.
```

Оставшуюся часть строки — про три верных ответа и освоенность — не трогать.

В `CHANGELOG.md`, раздел `### Changed`:

```markdown
- «Повторить ошибки» повторяет ошибки этого раунда, а не все за 14 дней.
  Список на экране итогов и набор кнопки теперь один и тот же: прежде список
  показывал пять тем, кнопка запускала все ошибки за две недели, и расхождение
  приходилось объяснять отдельным предложением. Обрезка списка до пяти снята в
  домене (`summariseRound`, `buildFillSummary`). Последствие принято
  сознательно: ошибки старше текущего раунда сами больше не всплывают.
```

```bash
git add src/domain/progress-rules.ts src/domain/progress-rules.test.ts src/domain/fill-round.ts src/domain/round-outcomes.ts src/domain/round-outcomes.test.ts EXERCISES.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat: повтор берёт ошибки этого раунда; исходы раунда по целям

Обрезка списка до пяти тем снята: она делала экран итогов лживым —
список говорил «пять», кнопка запускала все ошибки за две недели.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Экран итогов раунда — компоновка Б с картой

**Files:**
- Modify: `src/features/results/RoundResultsPage.tsx`
- Modify: `src/features/results/RoundResultsPage.test.tsx`
- Modify: `src/App.tsx` (блок `if (screen === 'results')`, строки 446–476)
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`
- Modify: `UI_UX.md` (пункт 6 «Итог»)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `outcomesByTarget` (задача 8), `RoundSummary.targetsToReview` без обрезки (задача 8), `ChinaMap` с `variant="fill"`, `interactive={false}`, `usage="answer"`, `outcomes`.
- Produces: `RoundResultsPageProps` теряет `idsToRepeat` и `isRepeatWider`, получает
  `readonly roundMap?: ReactNode` — готовую карту раунда или `undefined`.

- [ ] **Step 1: Написать падающие тесты**

В `src/features/results/RoundResultsPage.test.tsx` добавить:

```ts
it('подпись кнопки повтора совпадает со списком', () => {
  render(
    <RoundResultsPage
      summary={summaryWithMistakes(['anhui', 'hebei', 'qinghai'])}
      targets={regions}
      bestAccuracy={0.82}
      isProgressSaved
      onRepeatMistakes={() => {}}
      onNewRound={() => {}}
      onExit={() => {}}
    />,
  );

  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(
    screen.getByRole('button', { name: 'Повторить ошибки: 3 региона' }),
  ).toBeInTheDocument();
});

/*
 * Предложение про «все ошибки за 14 дней» объясняло расхождение, которого
 * больше нет. Если оно вернётся — вернётся и расхождение.
 */
it('не объясняет расхождение, которого нет', () => {
  render(
    <RoundResultsPage
      summary={summaryWithMistakes(['anhui'])}
      targets={regions}
      bestAccuracy={0.82}
      isProgressSaved
      onRepeatMistakes={() => {}}
      onNewRound={() => {}}
      onExit={() => {}}
    />,
  );

  expect(screen.queryByText(/за последние 14 дней/)).toBeNull();
});

it('показывает карту раунда, когда её дали', () => {
  render(
    <RoundResultsPage
      summary={summaryWithMistakes(['anhui'])}
      targets={regions}
      bestAccuracy={0.82}
      isProgressSaved
      roundMap={<div data-testid="round-map" />}
      onRepeatMistakes={() => {}}
      onNewRound={() => {}}
      onExit={() => {}}
    />,
  );

  expect(screen.getByTestId('round-map')).toBeInTheDocument();
});
```

Помощник `summaryWithMistakes(ids)` собрать в этом же файле: он возвращает `RoundSummary` с `total: 34`, `correct: 34 - ids.length`, `accuracy`, `durationMs: 222_000` и `targetsToReview` из целей с этими id.

- [ ] **Step 2: Запустить и убедиться, что тесты падают**

Run: `npx vitest run src/features/results/RoundResultsPage.test.tsx`
Expected: FAIL — обязательный проп `idsToRepeat` отсутствует, `roundMap` не знаком типу.

- [ ] **Step 3: Переписать компонент**

В `src/features/results/RoundResultsPage.tsx`:

- из `RoundResultsPageProps` убрать `idsToRepeat` вместе с его комментарием; добавить

```ts
  /**
   * Карта раунда. Приходит готовой, а не собирается здесь: какая карта
   * подходит раунду — по регионам, по городам или по физическим объектам, —
   * знает `App`, единственное место навигации. Не задана — итог показывается
   * одной колонкой.
   */
  readonly roundMap?: ReactNode;
```

- убрать `const repeatCount = idsToRepeat.length;` и `const isRepeatWider = …`; вместо них

```ts
  const repeatCount = reviewTargets.length;
```

- убрать блок `{isRepeatWider ? (<p>…</p>) : null}` целиком;
- добавить `import type { ReactNode } from 'react';` первой строкой файла;
- обернуть карту и разбор в две колонки. Шапка итога, строка времени и
  предупреждение о хранилище остаются над этим блоком, внутри `<section>`:

```tsx
        <div className="results-split">
          {roundMap === undefined ? null : (
            <div className="results-map">{roundMap}</div>
          )}
          <div className="results-review">
            {reviewTargets.length === 0 ? (
              <p>Ошибок нет.</p>
            ) : (
              <>
                <h3>Стоит повторить</h3>
                <ul className="review-list">
                  {reviewTargets.map((target) => (
                    <li key={target.id}>
                      {target.nameRu} <span lang="zh-Hans">{target.nameZh}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="results-actions">
              {reviewTargets.length === 0 ? null : (
                <button type="button" className="primary" onClick={onRepeatMistakes}>
                  Повторить ошибки: {repeatCount} {countWord(repeatCount)}
                </button>
              )}
              <button type="button" className="secondary" onClick={onNewRound}>
                Новый раунд
              </button>
              <button type="button" className="secondary" onClick={onExit}>
                На главную
              </button>
            </div>
          </div>
        </div>
```

- [ ] **Step 4: Стили двух колонок**

В `src/styles.css` добавить рядом с `.results-actions`:

```css
/*
 * Карта и разбор рядом: кнопка повтора стоит у списка, который она повторит.
 * Одна колонка до 1024 px — на телефоне карта и список друг под другом, и
 * порядок тот же, что и в разметке.
 */
.results-split {
  display: grid;
  gap: var(--s-6);
}

@media (min-width: 1024px) {
  .results-split {
    grid-template-columns: 1.15fr 1fr;
  }

  .results-map {
    align-self: start;
  }
}
```

- [ ] **Step 5: Отдать карту из App**

В `src/App.tsx`, в блоке `if (screen === 'results')`, добавить перед `return`:

```tsx
    /*
     * Карта итога есть у раундов по регионам: у городов исход по точке карта
     * пока не показывает, у физических целей это отдельная работа. Раунд без
     * карты показывает итог одной колонкой — пустая рамка была бы хуже.
     */
    const roundMap =
      isCityRound || isPhysicalRound ? undefined : (
        <ChinaMap
          regions={regions}
          selectedRegionId={null}
          onSelect={() => {}}
          onClear={() => {}}
          interactive={false}
          usage="answer"
          variant="fill"
          outcomes={outcomesByTarget(lastAttempts)}
        />
      );
```

Передать `roundMap={roundMap}` в `RoundResultsPage` и убрать оттуда `idsToRepeat={repeatRegionIds}`.

В обработчике `onRepeatMistakes` заменить источник набора: вместо `repeatRegionIds` использовать цели раунда —

```tsx
    const repeatIds = summary.targetsToReview.map((target) => target.id);
```

и подставить `repeatIds` во все три ветки (`repeatCities`, `repeatFeatures`, `startRound`). Переменные `repeatCities` и `repeatFeatures` пересчитать по `repeatIds`.

Добавить импорты `outcomesByTarget` из `./domain/round-outcomes` и `ChinaMap` из `./map/ChinaMap`, если его там ещё нет.

Состояние `repeatRegionIds` пока не трогать: до задачи 10 его ещё читает экран итогов «Заполнить карту» (строка 387). Его снимает задача 10.

- [ ] **Step 6: Запустить тесты**

Run: `npx vitest run src/features/results/RoundResultsPage.test.tsx src/App.test.tsx`
Expected: PASS. Тесты `App.test.tsx`, опиравшиеся на `idsToRepeat` или на прежнюю подпись кнопки, поправить по существу.

Run: `npm test`
Expected: зелёно.

- [ ] **Step 7: Проверить глазами**

Run: `npm run dev`. Пройти раунд «Найти на карте» до конца, отвечая и верно, и неверно.
Expected: на итогах карта слева с зелёными и штрихованными областями, справа список ошибок и три действия; подпись кнопки повтора равна длине списка; на ширине 375 px карта и список идут друг под другом.

- [ ] **Step 8: Записать и зафиксировать**

В `UI_UX.md`, пункт 6 «Итог», заменить на описание компоновки: точность крупным числом, карта раунда с исходами, список ошибок рядом с действиями «Повторить ошибки», «Новый раунд», «На главную».

В `CHANGELOG.md`, раздел `### Changed`:

```markdown
- Итог раунда показывается картой. Прежде экран тренажёра по карте показывал
  мелкое число в углу и текстовый список, а две трети экрана пустовали. Теперь
  под крупным числом идут две колонки: слева карта раунда с исходами, справа
  список ошибок и действия. Легенда называет исход словом и числом.
```

```bash
git add src/features/results/RoundResultsPage.tsx src/features/results/RoundResultsPage.test.tsx src/App.tsx src/App.test.tsx src/styles.css UI_UX.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat: итог раунда картой, разбор рядом с действиями

Кнопка повтора запускает ровно то, что показано в списке: обрезка
списка снята задачей о домене, объясняющее предложение убрано.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Итоги «Заполнить карту» — та же компоновка

**Files:**
- Modify: `src/features/results/FillMapResultsPage.tsx` (props, строки 7–20; разметка, строки 45–110)
- Modify: `src/features/results/FillMapResultsPage.test.tsx`
- Modify: `src/App.tsx` (блок `if (screen === 'fill-results' …)`, строки 380–396)
- Modify: `CHANGELOG.md`

**Что здесь уже есть.** Этот экран, в отличие от `RoundResultsPage`, карту уже показывает: `ChinaMap` с `variant="fill"` и `outcomes={round.outcomes}`, а числовая разбивка `fill-breakdown` уже называет три исхода словом и числом. Легенду заводить не нужно. Меняется компоновка и уходит расхождение между списком и кнопкой.

**Interfaces:**
- Consumes: `summariseFillRound(round): FillSummary` с полями `firstTry`, `secondTry`, `failed`, `durationMs`, `regionIdsToReview` (без обрезки после задачи 8); классы `.results-split`, `.results-map`, `.results-review` из задачи 9.
- Produces: `FillMapResultsPageProps` теряет `idsToRepeat`; остальные пропсы не меняются.

- [ ] **Step 1: Написать падающие тесты**

В `src/features/results/FillMapResultsPage.test.tsx` добавить:

```ts
it('подпись кнопки повтора совпадает со списком', () => {
  render(
    <FillMapResultsPage
      round={roundWithOutcomes({ anhui: 'failed', hebei: 'second-try' })}
      regions={regions}
      isProgressSaved
      onRepeatMistakes={() => {}}
      onNewRound={() => {}}
      onExit={() => {}}
    />,
  );

  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(
    screen.getByRole('button', { name: 'Повторить ошибки: 2 региона' }),
  ).toBeInTheDocument();
});

/*
 * Предложение про «все ошибки за 14 дней» объясняло расхождение, которого
 * больше нет. Если оно вернётся — вернётся и расхождение.
 */
it('не объясняет расхождение, которого нет', () => {
  render(
    <FillMapResultsPage
      round={roundWithOutcomes({ anhui: 'failed' })}
      regions={regions}
      isProgressSaved
      onRepeatMistakes={() => {}}
      onNewRound={() => {}}
      onExit={() => {}}
    />,
  );

  expect(screen.queryByText(/за последние 14 дней/)).toBeNull();
});
```

Помощник `roundWithOutcomes` взять тот, что уже используется в этом файле для сборки `FillRound`; если его нет — собрать по настоящему типу из `src/domain/fill-round.ts`, заполнив `order`, `outcomes` и `durationMs`. Выдумывать поля нельзя, тест должен компилироваться. В списке `getAllByRole('listitem')` учесть, что `fill-breakdown` — тоже список: если его пункты попадают в выборку, брать список повтора через `within(screen.getByRole('list', { name: … }))` или по классу `review-list`.

- [ ] **Step 2: Запустить и убедиться, что тесты падают**

Run: `npx vitest run src/features/results/FillMapResultsPage.test.tsx`
Expected: FAIL — обязательный проп `idsToRepeat` отсутствует.

- [ ] **Step 3: Перестроить экран**

В `src/features/results/FillMapResultsPage.tsx`:

- из `FillMapResultsPageProps` убрать `idsToRepeat` вместе с комментарием, из деструктуризации — тоже;
- заменить

```ts
  const repeatCount = idsToRepeat.length;
  const isRepeatWider = repeatCount > reviewRegions.length;
```

на

```ts
  const repeatCount = reviewRegions.length;
```

- убрать блок `{isRepeatWider ? (<p>…</p>) : null}` вместе с комментарием над ним;
- перенести `<ChinaMap …/>` из-под шапки внутрь двух колонок:

```tsx
      <div className="results-split">
        <div className="results-map">
          <ChinaMap
            regions={regions}
            selectedRegionId={null}
            onSelect={() => {}}
            onClear={() => {}}
            variant="fill"
            outcomes={round.outcomes}
            interactive={false}
          />
        </div>
        <div className="results-review">
          {/* сюда переезжает содержимое section: заголовок, предупреждение
              о хранилище, «Стоит повторить», список и results-actions */}
        </div>
      </div>
```

Содержимое `<section aria-labelledby="fill-results-heading">` при этом не переписывается — оно целиком переезжает в `.results-review` как есть, вместе с заголовком, предупреждением и действиями.

- [ ] **Step 4: Убрать проп из App**

В `src/App.tsx`, в блоке `if (screen === 'fill-results' && fillRound !== null)`, убрать `idsToRepeat={repeatRegionIds}` и заменить обработчик повтора на цели этого раунда:

```tsx
          onRepeatMistakes={() =>
            startRound(
              'find-on-map',
              language,
              summariseFillRound(fillRound).regionIdsToReview,
            )
          }
```

Импортировать `summariseFillRound` из `./domain/fill-round`, если его там ещё нет.

- [ ] **Step 4a: Убрать состояние повтора за две недели**

Теперь у состояния `repeatRegionIds` не осталось ни одного читателя: задача 9 сняла его с итогов раунда, шаг 4 — с итогов заполнения. Убрать в `src/App.tsx`:

- объявление `const [repeatRegionIds, setRepeatRegionIds] = useState<readonly string[]>([]);` (строка 129);
- три вызова `setRepeatRegionIds(…)` в `finishFillRound` (строка 327), `finishTargetRound` (строка 345) и `finishRound` (строка 359) — вместе с комментарием у последнего: он описывает снятое правило;
- ставший ненужным импорт `targetsToRepeat`.

Затем проверить, остались ли у самой функции другие вызовы:

Run: `grep -rn "targetsToRepeat" src/`
Expected: только объявление в `src/domain/progress-rules.ts` и её собственные тесты. Если так — удалить функцию и её тесты: мёртвый экспорт с тестами хуже удалённого, а вернуть его при надобности даст история. Константу `REVIEW_WINDOW_DAYS` проверить отдельно тем же способом: она может быть нужна правилам освоенности, и тогда остаётся.

- [ ] **Step 5: Запустить тесты и проверить глазами**

Run: `npm test`
Expected: зелёно.

Run: `npm run dev`, пройти «Заполнить карту».
Expected: карта заполнения слева, разбивка по трём исходам и список ошибок справа; подпись кнопки повтора равна длине списка.

- [ ] **Step 6: Зафиксировать**

В `CHANGELOG.md`, раздел `### Changed`:

```markdown
- Итог «Заполнить карту» перестроен той же компоновкой: карта заполнения
  слева, разбор и действия справа. Подпись кнопки повтора равна списку —
  прежде она называла все ошибки за две недели.
```

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: итог «Заполнить карту» той же компоновкой; повтор — по этому раунду

Состояние повтора за две недели снято вместе с последним читателем.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Полная проверка и готовность изменения

**Files:**
- Modify: `CHANGELOG.md` (при необходимости — свод)
- Modify: `DECISIONS.md` (только если по ходу работы что-то решалось иначе, чем записано 2026-08-25)

- [ ] **Step 1: Прогнать всё**

Run: `npm run lint`
Expected: без ошибок.

Run: `npm test`
Expected: все файлы зелёные.

Run: `npm run build`
Expected: `validate:map`, `validate:content`, `validate:fonts`, `tsc -b` и сборка проходят.

- [ ] **Step 2: Проверить основной сценарий вручную**

Run: `npm run dev`. На ширине 1440×900 и 375×812 пройти:

1. Главная → «Начать: найти на карте» → ответить верно и неверно → дойти до итогов.
2. Итоги: карта с исходами, список ошибок равен подписи кнопки, «Повторить ошибки» запускает ровно эти цели.
3. Атлас → «Физическая»: суша залита целиком, шкала под картой, кнопки масштаба в верхнем левом углу не закрывают сушу.
4. Атлас → «Политическая»: заливка по типу региона на месте, кнопки там же.

- [ ] **Step 3: Свериться с критериями приёмки**

Прочитать `ACCEPTANCE_CRITERIA.md` и убедиться, что ни один пункт не сломан: карта доступна с клавиатуры, у неё есть текстовые альтернативы, смысл не держится на одном цвете, сетевых запросов во время раунда нет.

- [ ] **Step 4: Зафиксировать, если остались правки**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: свод изменений свипа и проверка готовности

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Известные ограничения

- Карта итога есть у раундов по регионам. У раундов по городам исход по точке карта пока не показывает, у физических целей — отдельная работа; такие итоги показываются одной колонкой без карты.
- Отказ от повтора за 14 дней означает, что забытые ошибки сами больше не всплывают. Решение владельца от 2026-08-25; если понадобится вернуть — отдельным входом, а не расхождением между списком и кнопкой.
- `extract:relief` требует сети и в сборку не входит. Выжимка коммитится, поэтому генератор воспроизводим без сети.
- Обрезка полос по суше держится на `clipPath` с 34 `<use>` внутри одного `svg`. Внутри слоя это работает; вне слоя (например, если полосы понадобятся на другой поверхности) брать надо `mask` — Chrome не объединяет столько узлов в `clipPath` при ссылке из соседнего инлайнового `svg`.
