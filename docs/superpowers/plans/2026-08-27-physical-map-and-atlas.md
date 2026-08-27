# Физическая карта и атлас: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать шестисекундный лаг физической карты, сделать реки и озёра
попадаемыми, показать Амур, поставить шкалу высот на лист карты, связать атлас
с коллекциями и починить четыре мелких дефекта разметки.

**Architecture:** Обрезка `clipPath` заменяется маской — тот же контур, другой
способ отрисовки. Цель нажатия на физической карте перестаёт зависеть от того,
какой узел перехватил событие: её считает одна чистая функция по правилу
«побеждает меньший объект». Шкала высот переезжает на лист через новый слот
`mapInset` у `ChinaMap`.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4, SVG. Роутера нет —
`src/App.tsx` — конечный автомат экранов.

## Global Constraints

- Интерфейс, задания и сообщения об ошибках — по-русски; китайские названия в
  Unicode, а не только пиньинем.
- Домен не вызывает `Math.random`; компоненты не трогают `localStorage`.
- `src/design/tokens.css` — единственный источник цветов, размеров и
  длительностей. Компоненты не пишут значения напрямую.
- Сгенерированные файлы (`src/map/relief-bands.ts`, `physical-geometry.ts`,
  `region-palette.ts`) руками не правятся.
- Ветка работы — `fix/physical-map-and-atlas`, заведена от `master`.
- Каждая задача заканчивается зелёными `npm test` и `npm run lint`.
- Сообщения коммитов по-русски, с завершающей строкой
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Спецификация:
  `docs/superpowers/specs/2026-08-27-physical-map-and-atlas-design.md`.

---

## Файлы

| Файл | Ответственность | Задачи |
| --- | --- | --- |
| `src/map/PhysicalLayer.tsx` | отрисовка физического слоя: маска, полосы, формы, реки, озёра, подписи | 1, 2, 3 |
| `src/map/land.ts` (создать) | контуры суши из разметки карты и вопрос «точка на суше?» | 3 |
| `src/map/physical-hit.ts` (создать) | одно правило цели на физической карте | 3 |
| `src/map/ChinaMap.tsx` | разрешение цели по указателю, слот `mapInset` | 3, 4 |
| `src/map/CityLayer.tsx` | размер знака города | 8 |
| `src/features/atlas/AtlasPage.tsx` | шкала как врезка, ссылки на коллекции | 4, 5 |
| `src/content/collections.ts` | `collectionsOfRegion` | 5 |
| `src/App.tsx` | выход из режима на секцию «Режимы» | 5, 6 |
| `src/features/results/RoundResultsPage.tsx` | подпись кнопки выхода | 6 |
| `src/features/results/FillMapResultsPage.tsx` | подпись кнопки выхода | 6 |
| `src/styles.css` | стили маски, врезки, выравнивания, городов | 1, 3, 4, 5, 7, 8 |
| `src/test/setup.ts` | заглушка `scrollIntoView` для jsdom | 6 |

---

## Task 1: Маска вместо обрезки

**Files:**
- Modify: `src/map/PhysicalLayer.tsx`
- Test: `src/map/PhysicalLayer.test.tsx`

**Interfaces:**
- Consumes: `MAP_VIEWBOX_MIN_X`, `MAP_VIEWBOX_MIN_Y`, `MAP_VIEWBOX_WIDTH`,
  `MAP_VIEWBOX_HEIGHT` из `./target-size` — они уже импортированы в файле.
- Produces: в разметке слоя появляется `<mask id="china-land-mask">`;
  константа `CLIP_ID` заменяется на `MASK_ID = 'china-land-mask'`.

- [ ] **Step 1: Написать падающий тест**

Добавить в `src/map/PhysicalLayer.test.tsx` внутрь `describe('PhysicalLayer', …)`:

```tsx
  /*
   * Обрезка `clipPath` строит область по каждой вершине и на 148 КБ контуров
   * стоит 6 секунд блокировки при первом показе слоя; маска растрирует те же
   * контуры один раз и стоит миллисекунду. Геометрия та же — те же `<use>` на
   * те же 34 области.
   */
  it('прячет сушу маской, а не обрезкой', () => {
    const { container } = renderLayer();

    expect(container.querySelector('#china-land-mask')).not.toBeNull();
    expect(container.querySelector('clipPath')).toBeNull();
    expect(container.querySelectorAll('[clip-path]')).toHaveLength(0);
  });

  /*
   * Рамка маски задаётся явно: по умолчанию она считается от габарита
   * закрашиваемой группы, и группа, чей габарит виден целиком, обрезалась бы
   * собственной маской.
   */
  it('задаёт маске рамку в единицах карты', () => {
    const { container } = renderLayer();
    const mask = container.querySelector('#china-land-mask');

    expect(mask?.getAttribute('maskUnits')).toBe('userSpaceOnUse');
    expect(mask?.getAttribute('x')).toBe('-16');
    expect(mask?.getAttribute('y')).toBe('-16');
    expect(mask?.getAttribute('width')).toBe('806');
    expect(mask?.getAttribute('height')).toBe('601');
  });

  it('закрывает маской ступени, границы, исходы и озёра', () => {
    const { container } = renderLayer();

    for (const selector of ['.relief', '.region-outlines', '.relief-outcomes', '.lakes']) {
      expect(container.querySelector(selector)?.getAttribute('mask')).toBe(
        'url(#china-land-mask)',
      );
    }
  });
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx -t 'прячет сушу маской'`
Expected: FAIL — `expected null not to be null` (маски в разметке ещё нет).

- [ ] **Step 3: Заменить обрезку маской**

В `src/map/PhysicalLayer.tsx` заменить строку

```tsx
const CLIP_ID = 'china-land-clip';
```

на

```tsx
/*
 * Суша прячется маской, а не обрезкой. `clipPath` строит область обрезки
 * геометрией и платит за каждую вершину: на 148 КБ контуров регионов первый
 * показ слоя стоил 6 130 мс блокировки, и переключение вкладки атласа
 * выглядело поломкой. Маска растрирует те же контуры один раз, как обычную
 * заливку, — 1 мс, и ступень увеличения ей тоже ничего не стоит.
 *
 * Геометрия при этом не упрощается и не копируется: те же `<use>` на те же 34
 * области, SVG остаётся единственным источником.
 */
const MASK_ID = 'china-land-mask';
```

Заменить блок `<defs>`:

```tsx
      <defs>
        <clipPath id={CLIP_ID}>
          {regions.map((region) => (
            <use key={region.mapAreaId} href={`#${region.mapAreaId}`} />
          ))}
        </clipPath>
      </defs>
```

на

```tsx
      <defs>
        {/*
          Рамка маски задана явно и в единицах карты. По умолчанию она
          считается от габарита закрашиваемой группы с запасом в 10 %, а
          габарит полос высот — вся рамка карты: группа обрезала бы сама себя.

          Белым — то, что видно: маска светимости показывает там, где ярко.
        */}
        <mask
          id={MASK_ID}
          maskUnits="userSpaceOnUse"
          x={MAP_VIEWBOX_MIN_X}
          y={MAP_VIEWBOX_MIN_Y}
          width={MAP_VIEWBOX_WIDTH}
          height={MAP_VIEWBOX_HEIGHT}
        >
          {regions.map((region) => (
            <use key={region.mapAreaId} href={`#${region.mapAreaId}`} fill="#fff" />
          ))}
        </mask>
      </defs>
```

Заменить все четыре вхождения `clipPath={`url(#${CLIP_ID})`}` на
`mask={`url(#${MASK_ID})`}` — в группах `relief`, `region-outlines`,
`relief-outcomes` и `lakes`. Пятое вхождение, у группы `rivers`, тоже
заменить на маску: рек касается задача 2, и смешивать её сюда не нужно.

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx`
Expected: PASS, все тесты файла.

- [ ] **Step 5: Проверить в браузере**

Открыть превью (`preview_start` с конфигурацией `dev`), перейти в Атлас →
Физическая и замерить в консоли страницы:

```js
(() => {
  const pick = (n) => [...document.querySelectorAll('.atlas-map-kind label')]
    .find((l) => l.textContent.trim() === n).querySelector('input');
  pick('Политическая').click();
  pick('Физическая').click();
  const f = document.querySelector('.china-map svg').getBoundingClientRect();
  const t = performance.now();
  document.elementFromPoint(f.left + f.width * 0.4, f.top + f.height * 0.5);
  return Math.round(performance.now() - t) + ' мс';
})()
```

Expected: единицы миллисекунд вместо ~6000. Снимком экрана убедиться, что
рельеф по-прежнему обрывается на границе страны и не заливает море.

- [ ] **Step 6: Закоммитить**

```bash
git add src/map/PhysicalLayer.tsx src/map/PhysicalLayer.test.tsx
git commit -m "$(printf 'perf: маска вместо обрезки на физической карте\n\nclipPath строил область обрезки по каждой вершине: первый показ слоя\nстоил 6130 мс блокировки, и переключение вкладки атласа выглядело\nполомкой. Маска растрирует те же 34 контура один раз — 1 мс. Геометрия\nта же, упрощения нет.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Task 2: Реки без маски — Амур

**Files:**
- Modify: `src/map/PhysicalLayer.tsx`
- Test: `src/map/PhysicalLayer.test.tsx`

**Interfaces:**
- Consumes: `MASK_ID` из задачи 1.
- Produces: группа `.rivers` без атрибутов `mask` и `clip-path`.

- [ ] **Step 1: Написать падающий тест**

Добавить в `src/map/PhysicalLayer.test.tsx`:

```tsx
  /*
   * Амур идёт ровно по государственной границе. Под маской от линии
   * оставалась половина толщины, и та под штрихом границы, — река пропадала
   * с карты вовсе. Реки уже обрезаны по рамке карты генератором
   * `generate:physical`; за границу страны они выходят намеренно, как на
   * любой физической карте: река не кончается на границе.
   */
  it('не прячет реки маской', () => {
    const { container } = renderLayer();
    const rivers = container.querySelector('.rivers');

    expect(rivers).not.toBeNull();
    expect(rivers?.getAttribute('mask')).toBeNull();
    expect(rivers?.getAttribute('clip-path')).toBeNull();
  });
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx -t 'не прячет реки маской'`
Expected: FAIL — `expected 'url(#china-land-mask)' to be null`.

- [ ] **Step 3: Снять маску с группы рек**

В `src/map/PhysicalLayer.tsx` заменить

```tsx
      <g className="rivers" mask={`url(#${MASK_ID})`}>
```

на

```tsx
      {/*
        Реки не прячутся маской. Амур идёт ровно по границе, и под маской от
        линии оставалась половина толщины под штрихом границы — реки на карте
        не было. По рамке карты реки уже обрезаны генератором
        `generate:physical`; за границу страны они выходят намеренно — река не
        кончается на государственной границе, и так физические карты и рисуют.
      */}
      <g className="rivers">
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Проверить в браузере**

Открыть Атлас → Физическая, снять снимок экрана и убедиться, что Амур виден
линией цвета рек вдоль северо-восточной границы, а не сливается со штрихом
границы.

- [ ] **Step 6: Закоммитить**

```bash
git add src/map/PhysicalLayer.tsx src/map/PhysicalLayer.test.tsx
git commit -m "$(printf 'fix: Амур виден — реки не прячутся маской суши\n\nАмур идёт ровно по границе, и от линии оставалась половина толщины под\nштрихом границы. По рамке карты реки уже обрезаны генератором; за\nграницу страны они выходят намеренно.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Task 3: Одно правило цели на физической карте

**Files:**
- Create: `src/map/land.ts`
- Create: `src/map/land.test.ts`
- Create: `src/map/physical-hit.ts`
- Create: `src/map/physical-hit.test.ts`
- Modify: `src/map/ChinaMap.tsx`
- Modify: `src/map/PhysicalLayer.tsx`
- Modify: `src/styles.css`
- Test: `src/map/PhysicalLayer.test.tsx`

**Interfaces:**
- Consumes: `riverAt`, `RIVER_HIT_RADIUS_UNITS` из `./river-hit`;
  `lakeMarks` из `./lake-marks`; `RELIEF_SHAPES` из `./physical-geometry`;
  `parseMapPath`, `boundingBox`, `containsPoint` из `./svg-path`.
- Produces:
  - `land.ts` → `export const LAND_RINGS: readonly Point[][]`,
    `export function isOnLand(x: number, y: number): boolean`
  - `physical-hit.ts` → `export function physicalTargetAt(x: number, y: number, zoom: number): string | null`

- [ ] **Step 1: Написать падающий тест для суши**

Создать `src/map/land.test.ts`:

```ts
import { isOnLand, LAND_RINGS } from './land';

it('разбирает все области карты', () => {
  expect(LAND_RINGS.length).toBeGreaterThanOrEqual(34);
});

/* Точка внутри Шэньси: заведомо суша и заведомо не у границы. */
it('считает сушей точку в середине страны', () => {
  expect(isOnLand(455, 320)).toBe(true);
});

/* Жёлтое море восточнее Шаньдуна. */
it('не считает сушей море', () => {
  expect(isOnLand(650, 320)).toBe(false);
});

/*
 * Индия южнее Гималаев. Маска прячет там ступени, но нажатия не отсекает:
 * без этой проверки Гималаи выбирались бы за границей страны.
 */
it('не считает сушей землю за границей', () => {
  expect(isOnLand(120, 430)).toBe(false);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/map/land.test.ts`
Expected: FAIL — `Failed to resolve import "./land"`.

- [ ] **Step 3: Написать модуль суши**

Создать `src/map/land.ts`:

```ts
/**
 * Контуры суши — те же, что рисует карта.
 *
 * Разметка читается той же строкой, что и в `ChinaMap`: `?raw` подставляет её
 * на сборке, второго запроса и второй копии геометрии не появляется.
 *
 * Нужны они одному вопросу: на суше ли точка. Маска прячет то, что за
 * границей, но нажатия не отсекает — этим она и отличается от прежней
 * обрезки, — и без проверки Гималаи выбирались бы в Непале.
 */
import mapMarkup from '../../public/maps/china-provinces.svg?raw';
import { containsPoint, parseMapPath, type Point } from './svg-path';

/**
 * Кольца всех областей одним списком. Правило чётности здесь то же, что у
 * `containsPoint`: области не накладываются друг на друга, а острова лежат
 * рядом с материком, а не внутри него, — взаимного погашения не возникает.
 */
export const LAND_RINGS: readonly Point[][] = [
  ...mapMarkup.matchAll(/<path\b[^>]*?\sd="([\s\S]*?)"/g),
].flatMap((match) => parseMapPath(match[1]));

/** На суше ли точка карты. */
export function isOnLand(x: number, y: number): boolean {
  return containsPoint(LAND_RINGS as Point[][], x, y);
}
```

- [ ] **Step 4: Убедиться, что тесты суши проходят**

Run: `npx vitest run src/map/land.test.ts`
Expected: PASS, четыре теста.

Если точки из теста дадут не тот ответ — не подгонять модуль, а проверить
координаты: узнать настоящие можно в браузере, наведя указатель на карту и
переведя клиентские координаты в единицы `viewBox` тем же приёмом, что
`pointAtClient` в `map-view.ts`.

- [ ] **Step 5: Написать падающий тест правила цели**

Создать `src/map/physical-hit.test.ts`:

```ts
import { lakeMarks } from './lake-marks';
import { physicalTargetAt } from './physical-hit';
import { RIVER_SHAPES } from './river-hit';

/** Первая точка верховьев Янцзы — она же лежит на Тибетском нагорье. */
const yangtze = RIVER_SHAPES.find((river) => river.featureId === 'yangtze')!;
const [yangtzeX, yangtzeY] = yangtze.parts[0][0];

/*
 * Прежде побеждала форма: узел нагорья перехватывал нажатие, и правило
 * расстояния до реки до дела не доходило. Полоса реки — 8.6 единицы карты,
 * полторы единицы от линии в неё попадают.
 */
it('река побеждает форму, на которой лежит', () => {
  expect(physicalTargetAt(yangtzeX + 1.5, yangtzeY + 1.5, 1)).toBe('yangtze');
});

it('форма достаётся точке вдали от рек и озёр', () => {
  expect(physicalTargetAt(219, 360, 1)).toBe('tibetan-plateau');
});

/* Цинхай стоит на нагорье и в полосе не лежит ни одной реки. */
it('озеро побеждает форму', () => {
  const qinghai = lakeMarks(1).find((mark) => mark.featureId === 'qinghai-lake')!;

  expect(physicalTargetAt(qinghai.hitX, qinghai.hitY, 1)).toBe('qinghai-lake');
});

/*
 * Маска прячет ступени за границей, но нажатия не отсекает. Без проверки
 * суши Гималаи выбирались бы в Непале.
 */
it('не отдаёт форму за границей страны', () => {
  expect(physicalTargetAt(120, 430, 1)).toBeNull();
});

it('молчит там, где нет ни реки, ни озера, ни спрашиваемой формы', () => {
  expect(physicalTargetAt(650, 320, 1)).toBeNull();
});
```

- [ ] **Step 6: Убедиться, что тест падает**

Run: `npx vitest run src/map/physical-hit.test.ts`
Expected: FAIL — `Failed to resolve import "./physical-hit"`.

- [ ] **Step 7: Написать модуль правила цели**

Создать `src/map/physical-hit.ts`:

```ts
/**
 * Что на физической карте под точкой.
 *
 * Правило одно и называется словами: **побеждает меньший объект** — озеро,
 * потом река, потом форма рельефа, потом регион. Оно выводится из размера:
 * знак озера и линия реки меньше формы, на которой лежат, и рука, целившая в
 * них, метила не в подложку.
 *
 * Прежде источников было два, и они не спорили, а не видели друг друга: реку
 * карта считала расстоянием, а форма и озеро отвечали на нажатие своими
 * узлами. Узел всегда быстрее расчёта — он просто перехватывает событие, — и
 * до правила расстояния дело не доходило: точка в полутора единицах от Янцзы
 * в верховьях доставалась Тибетскому нагорью.
 */
import { isOnLand } from './land';
import { lakeMarks } from './lake-marks';
import { RELIEF_SHAPES } from './physical-geometry';
import { boundingBox, containsPoint, parseMapPath, type BoundingBox, type Point } from './svg-path';
import { riverAt, RIVER_HIT_RADIUS_UNITS } from './river-hit';

type ShapeHit = {
  readonly featureId: string;
  readonly rings: Point[][];
  readonly box: BoundingBox;
};

/**
 * Только спрашиваемые формы: остальные заливают фон, имени на экране не имеют
 * и целью быть не могут. Габарит считается один раз — внутри рамки точки
 * оказывается одна-две формы, и вхождение считается только для них.
 */
const SHAPE_HITS: readonly ShapeHit[] = RELIEF_SHAPES.filter(
  (shape) => shape.featureId !== undefined,
).map((shape) => {
  const rings = parseMapPath(shape.d);

  return { featureId: shape.featureId!, rings, box: boundingBox(rings) };
});

/**
 * Цель под точкой карты или `null`, если её там нет: тогда точка достаётся
 * региону, как на любом другом виде.
 *
 * `zoom` нужен порогам: они заданы в пикселях экрана, и на увеличении те же
 * 24 px занимают меньше единиц карты.
 */
export function physicalTargetAt(x: number, y: number, zoom: number): string | null {
  for (const mark of lakeMarks(zoom)) {
    if (Math.hypot(x - mark.hitX, y - mark.hitY) <= mark.radius) {
      return mark.featureId;
    }
  }

  const river = riverAt(x, y, RIVER_HIT_RADIUS_UNITS / zoom);
  if (river !== null) {
    return river;
  }

  for (const shape of SHAPE_HITS) {
    if (
      x < shape.box.minX ||
      x > shape.box.maxX ||
      y < shape.box.minY ||
      y > shape.box.maxY
    ) {
      continue;
    }

    if (containsPoint(shape.rings, x, y)) {
      /*
       * Проверка суши стоит последней и только здесь: маска прячет ступени за
       * границей, но нажатия не отсекает, а формы за границу выходят —
       * Гималаи в Непал, Гоби в Монголию.
       */
      return isOnLand(x, y) ? shape.featureId : null;
    }
  }

  return null;
}
```

- [ ] **Step 8: Убедиться, что тесты правила проходят**

Run: `npx vitest run src/map/physical-hit.test.ts`
Expected: PASS, пять тестов.

- [ ] **Step 9: Закоммитить чистые модули**

```bash
git add src/map/land.ts src/map/land.test.ts src/map/physical-hit.ts src/map/physical-hit.test.ts
git commit -m "$(printf 'feat: одно правило цели на физической карте\n\nПобеждает меньший объект: озеро, река, форма, регион. Прежде реку\nсчитала карта расстоянием, а форма и озеро перехватывали нажатие своими\nузлами, и до правила дело не доходило. Форма засчитывается только на\nсуше: маска прячет ступени за границей, но нажатия не отсекает.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

- [ ] **Step 10: Написать падающий тест на узлы слоя**

Добавить в `src/map/PhysicalLayer.test.tsx`:

```tsx
  /*
   * Указатель слою больше не нужен: цель по нему считает карта одной
   * функцией. Узлы остаются ради клавиатуры — по ним ходит Tab, и Enter на
   * них выбирает объект.
   */
  it('оставляет узлы клавиатуре, но не указателю', () => {
    const onSelect = vi.fn();
    const { container } = renderLayer({ onSelect });
    const river = container.querySelector<SVGPathElement>('.river-line[data-feature-id="yangtze"]')!;

    expect(river.getAttribute('tabindex')).toBe('0');
    expect(river.onclick).toBeNull();

    fireEvent.keyDown(river, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('yangtze');
  });
```

- [ ] **Step 11: Убедиться, что тест падает**

Run: `npx vitest run src/map/PhysicalLayer.test.tsx -t 'оставляет узлы клавиатуре'`
Expected: FAIL — у линии реки есть обработчик нажатия.

- [ ] **Step 12: Снять с узлов слоя разрешение цели**

В `src/map/PhysicalLayer.tsx`:

1. У формы рельефа (`className="relief-shape"`) убрать `onClick`,
   `onPointerEnter` и `onPointerLeave`. Оставить `role`, `aria-label`,
   `aria-hidden`, `tabIndex`, `onFocus`, `onBlur`, `onKeyDown`.
2. У линии реки (`className="river-line"`) убрать `onClick`.
3. У цели озера (`className="lake-hit"`) убрать `onClick`, `onPointerEnter`
   и `onPointerLeave`.
4. Заменить комментарий у `hoveredNodeId` на:

```tsx
  /*
   * Узел в фокусе — по его собственным событиям. Указатель сюда не приходит
   * вовсе: узлы слоя его не принимают, и какой объект под курсором, решает
   * карта одним правилом (`physicalTargetAt`). Фокус остаётся за узлом:
   * клавиатура ходит по узлам, а не по координатам.
   */
```

5. Заменить пояснение у `hoveredFeatureId` в `PhysicalLayerProps` на:

```tsx
  /**
   * Объект под указателем. Приходит снаружи, и это единственный источник для
   * указателя: узлы слоя его не принимают, а цель считает карта по правилу
   * «побеждает меньший» (`physicalTargetAt`). Свой источник у слоя остался
   * один — фокус клавиатуры.
   */
```

6. Заменить пояснение у `onSelect`:

```tsx
  /**
   * Задан — объекты получают фокус и отвечают на клавиатуру. Не задан — слой
   * только показывает: в атласе шесть новых остановок `Tab` оправданы, а на
   * чужой поверхности — нет. Имя объекта при этом остаётся: реки — то
   * главное, что говорит эта карта, и читалке экрана они названы в обоих
   * случаях.
   *
   * Указатель сюда не приходит: узлы слоя его не принимают, и нажатие
   * разрешает карта.
   */
```

- [ ] **Step 13: Снять указатель с узлов слоя в стилях**

В `src/styles.css` заменить

```css
/* Шесть спрашиваемых форм — цели, и нажатие им нужно. */
.china-map .physical-layer[data-interactive='true'] .relief-shape[data-feature-id] {
  cursor: pointer;
  pointer-events: auto;
}
```

на

```css
/*
 * Указателя у узлов слоя нет вовсе: цель под ним считает карта одним
 * правилом (`physical-hit.ts`), и узел, перехвативший событие, это правило
 * обходил — точка в полутора единицах от Янцзы доставалась нагорью под ней.
 * Курсор при этом на месте: его ставит `.china-map[data-feature-hover]`.
 */
```

Добавить `pointer-events: none;` в правило

```css
.china-map .physical-layer .river-line {
  fill: none;
```

и заменить

```css
.china-map .physical-layer .lake-hit {
  fill: transparent;
}

.china-map .physical-layer[data-interactive='true'] .lake-hit {
  cursor: pointer;
}
```

на

```css
/*
 * Круг цели остаётся: он задаёт размер, по которому карта считает попадание,
 * и остановку Tab. Указателя у него нет по той же причине, что у формы.
 */
.china-map .physical-layer .lake-hit {
  fill: transparent;
  pointer-events: none;
}
```

- [ ] **Step 14: Перевести карту на новое правило**

В `src/map/ChinaMap.tsx` заменить импорт

```tsx
import { RIVER_HIT_RADIUS_UNITS, riverAt } from './river-hit';
```

на

```tsx
import { physicalTargetAt } from './physical-hit';
```

Заменить `featureAtClient` целиком:

```tsx
  /**
   * Какой объект физической географии под точкой экрана.
   *
   * Считает одно правило — `physicalTargetAt`, «побеждает меньший объект».
   * Узлы слоя указателя не принимают, поэтому другого источника нет и
   * разойтись с этим ответом нечему.
   */
  function featureAtClient(clientX: number, clientY: number): string | null {
    const svg = mapRef.current?.querySelector<SVGSVGElement>('svg');
    if (svg === null || svg === undefined) {
      return null;
    }

    const [x, y] = pointAtClient(view, svg.getBoundingClientRect(), clientX, clientY);

    return physicalTargetAt(x, y, view.zoom);
  }
```

Заменить комментарий над `selectTarget`, где сказано про реку:

```tsx
    /*
     * Объект физической географии идёт перед областью: он нарисован поверх и
     * меньше её, и рука, целившая в него, метила не в подложку. Точки без
     * объекта поблизости достаются области, как и на любом другом виде.
     *
     * Разрешает всё это карта, а не узлы слоя: узлы указателя не принимают
     * (`physical-hit.ts`).
     */
```

- [ ] **Step 15: Убедиться, что все тесты проходят**

Run: `npm test`
Expected: PASS. Если упадут тесты `PhysicalLayer.test.tsx`, проверявшие
нажатие по узлу мышью, — переписать их на клавиатуру: нажатие мышью теперь
разрешает карта, и его место в `ChinaMap.test.tsx`.

- [ ] **Step 16: Проверить в браузере**

Открыть Атлас → Физическая. Убедиться:
- нажатие в полутора-двух единицах от Янцзы в верховьях выбирает реку, а не
  Тибетское нагорье;
- нажатие по знаку Цинхая выбирает озеро;
- нажатие в середине нагорья вдали от рек выбирает нагорье;
- нажатие за южной границей, ниже Гималаев, не выбирает ничего;
- имя под курсором совпадает с тем, что выберется нажатием.

- [ ] **Step 17: Закоммитить**

```bash
git add src/map/ChinaMap.tsx src/map/PhysicalLayer.tsx src/map/PhysicalLayer.test.tsx src/styles.css
git commit -m "$(printf 'fix: по реке и озеру на нагорье снова можно попасть\n\nУзлы слоя перестают принимать указатель: цель считает карта правилом\n«побеждает меньший объект». Прежде узел формы перехватывал нажатие\nраньше, чем считалось расстояние до реки, и точка в полутора единицах от\nЯнцзы доставалась Тибетскому нагорью.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Task 4: Шкала высот врезкой на лист карты

**Files:**
- Modify: `src/map/ChinaMap.tsx`
- Modify: `src/features/atlas/AtlasPage.tsx`
- Modify: `src/styles.css`
- Test: `src/features/atlas/AtlasPage.test.tsx`

**Interfaces:**
- Consumes: ничего от предыдущих задач.
- Produces: у `ChinaMap` появляется необязательный
  `readonly mapInset?: ReactNode` — узел внутри `.china-map-frame`.

- [ ] **Step 1: Написать падающий тест**

Добавить в `src/features/atlas/AtlasPage.test.tsx`:

```tsx
/*
 * Шкала стояла в колонке, а карта внутри колонки центрирована по пропорции:
 * при карте в 426 px шкала занимала 844 px. На листе вопроса ширины не
 * возникает вовсе, и карта забирает обратно высоту, которую занимала шкала.
 */
it('ставит шкалу высот на лист карты, а не в колонку', () => {
  const { container } = renderAtlas();

  fireEvent.click(screen.getByLabelText('Физическая'));

  const scale = container.querySelector('.relief-scale');
  expect(scale).not.toBeNull();
  expect(scale?.closest('.china-map-frame')).not.toBeNull();
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/atlas/AtlasPage.test.tsx -t 'ставит шкалу высот на лист'`
Expected: FAIL — `expected null not to be null` (шкала не внутри рамки).

- [ ] **Step 3: Завести слот у карты**

В `src/map/ChinaMap.tsx` добавить в `ChinaMapProps` после `featureOutcomes`:

```tsx
  /**
   * Врезка на листе карты: легенда, шкала — то, что объясняет саму карту.
   * Приходит готовой, а не собирается здесь: что означает заливка, знает
   * поверхность, карта только даёт место. Рядом с ней в углу листа стоит
   * управление масштабом — по той же причине, по которой легенда стоит на
   * карте, а не рядом с ней.
   */
  readonly mapInset?: ReactNode;
```

Добавить `ReactNode` в импорт типов из `react`:

```tsx
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
```

Добавить `mapInset` в разбор параметров функции `ChinaMap` рядом с
`featureOutcomes`. Внутри `.china-map-frame`, сразу после блока `MapControls`,
добавить:

```tsx
        {mapInset}
```

- [ ] **Step 4: Передать шкалу врезкой**

В `src/features/atlas/AtlasPage.tsx` вынести легенду в переменную перед
`return`:

```tsx
  /*
   * Легенда стоит на листе карты и только у физического вида: на политической
   * тип региона назван словом в карточке слева, а ступень рельефа назвать
   * негде — форма не выбирается и карточки у неё нет.
   *
   * На листе, а не под картой: карта внутри своей колонки центрирована по
   * пропорции, и шкала под ней получалась вдвое шире самой карты.
   */
  const reliefScale =
    mapKind === 'physical' ? (
      <figure className="relief-scale" aria-label="Высота, м над уровнем моря">
        <figcaption>Высота, м над уровнем моря</figcaption>
        <div className="relief-scale-bar" aria-hidden="true">
          {RELIEF_BAND_TONES.map((band) => (
            <span key={band} data-band={band} />
          ))}
        </div>
        {/*
          Долей столько же, сколько полос: подпись стоит на правом краю своей
          доли и сдвинута на половину — то есть ровно на границе между
          полосами. Последняя доля пуста: у верхней полосы верхней границы нет.
        */}
        <div className="relief-scale-ticks">
          {RELIEF_TICKS.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
          <span aria-hidden="true" />
        </div>
        <div className="relief-scale-ends">
          <span>равнины</span>
          <span>нагорье</span>
        </div>
      </figure>
    ) : undefined;
```

Передать её карте, добавив к `<ChinaMap …>` строку `mapInset={reliefScale}`,
и удалить прежний блок легенды под картой целиком — от комментария
«Легенда стоит под картой…» до закрывающего `) : null}`.

- [ ] **Step 5: Одеть врезку**

В `src/styles.css` заменить блок `.relief-scale`:

```css
/*
 * Легенда ступеней. Образец заливки идёт рядом со словом, а не вместо него:
 * ступень названа словом, и цвет здесь — второй канал, а не единственный.
 */
.relief-scale {
  color: var(--text-on-ground);
  font-size: var(--t-size-caption);
  margin: var(--s-3) 0 0;
}
```

на

```css
/*
 * Шкала ступеней — врезка на листе карты, в нижнем левом углу: управление
 * масштабом стоит в верхнем, а нижний левый угол рамки приходится на Мьянму
 * и Индию, то есть на пустое поле.
 *
 * На листе, а не под картой: карта внутри колонки центрирована по пропорции,
 * и шкала под ней получалась вдвое шире самой карты — 844 px против 426 px.
 *
 * Плашка бумажного тона с волосяной рамкой — та же, что у кнопок масштаба:
 * пара «тушь на бумаге» уже проверена тестом контраста.
 */
.relief-scale {
  background: var(--surface-paper-bright);
  border: var(--border-hair) solid var(--line-on-paper);
  border-radius: var(--radius-sm);
  bottom: var(--s-3);
  color: var(--text-on-paper);
  font-size: var(--t-size-caption);
  inline-size: 15rem;
  left: var(--s-3);
  margin: 0;
  max-inline-size: calc(100% - var(--s-3) * 2);
  padding: var(--s-2) var(--s-3) var(--s-3);
  position: absolute;
}
```

Заменить `.relief-scale-ends`:

```css
.relief-scale-ends {
  color: var(--text-on-ground-muted);
  display: flex;
  justify-content: space-between;
}
```

на

```css
.relief-scale-ends {
  color: var(--text-on-paper-muted);
  display: flex;
  justify-content: space-between;
}
```

Заменить сетку колонки карты в правиле `@media (min-width: 1024px)`:

```css
  .atlas-map {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    margin-block-start: 0;
    min-block-size: 0;
  }
```

на

```css
  /*
   * Две строки: переключатель вида и карта. Третьей, под легенду, больше нет
   * — шкала переехала на лист, и карта забрала себе её высоту.
   */
  .atlas-map {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    margin-block-start: 0;
    min-block-size: 0;
  }
```

- [ ] **Step 6: Убедиться, что тесты проходят**

Run: `npx vitest run src/features/atlas/AtlasPage.test.tsx src/map/ChinaMap.test.tsx`
Expected: PASS.

- [ ] **Step 7: Проверить в браузере**

Открыть Атлас → Физическая, снять снимок экрана. Убедиться, что шкала стоит
плашкой в нижнем левом углу листа, не перекрывает сушу Китая и не шире карты.
Замерить ширину карты в консоли:

```js
Math.round(document.querySelector('.atlas-map .china-map-frame').getBoundingClientRect().width)
```

Expected: больше прежних 426 px.

- [ ] **Step 8: Проверить контраст**

Run: `npx vitest run scripts/validate-tokens.test.ts`
Expected: PASS. Если тест шкалы проверял пары «на доске», поправить его на
пары «на бумаге»: шкала переехала с доски на лист.

- [ ] **Step 9: Закоммитить**

```bash
git add src/map/ChinaMap.tsx src/features/atlas/AtlasPage.tsx src/features/atlas/AtlasPage.test.tsx src/styles.css scripts/validate-tokens.test.ts
git commit -m "$(printf 'fix: шкала высот врезкой на лист карты\n\nШкала стояла в колонке, а карта внутри колонки центрирована по\nпропорции: 844 px против 426 px. На листе вопроса ширины не возникает, и\nкарта забирает обратно высоту, которую занимала шкала.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Task 5: Ссылки на коллекции региона в атласе

**Files:**
- Modify: `src/content/collections.ts`
- Create: `src/content/collections.test.ts`
- Modify: `src/features/atlas/AtlasPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/features/atlas/AtlasPage.test.tsx`

**Interfaces:**
- Consumes: `collectionById`, `collections` из `src/content/collections.ts`;
  `openCollection(id: string)` из `App.tsx`.
- Produces:
  - `collections.ts` → `export function collectionsOfRegion(regionId: string): readonly Collection[]`
  - `AtlasPageProps` → `readonly onOpenCollection: (collectionId: string) => void`

- [ ] **Step 1: Написать падающий тест справочника**

Создать `src/content/collections.test.ts`:

```ts
import { collectionsOfRegion } from './collections';

it('находит коллекции региона', () => {
  const ids = collectionsOfRegion('shaanxi').map((collection) => collection.id);

  expect(ids).toContain('silk-road');
});

it('даёт пустой список региону без коллекций', () => {
  expect(collectionsOfRegion('такого-региона-нет')).toEqual([]);
});

/* Порядок каталога, а не порядок находки: он же виден на странице коллекций. */
it('держит порядок каталога', () => {
  const ids = collectionsOfRegion('xinjiang').map((collection) => collection.id);

  expect([...ids].sort()).not.toBe(ids);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/content/collections.test.ts`
Expected: FAIL — `collectionsOfRegion is not a function`.

- [ ] **Step 3: Написать функцию**

Добавить в конец `src/content/collections.ts`:

```ts
/**
 * Коллекции, в которые входит регион, в порядке каталога.
 *
 * Привязка уже есть — `regionIds` у каждой коллекции, — и второго списка
 * заводить не нужно: он разошёлся бы с первым при первом же пополнении.
 */
export function collectionsOfRegion(regionId: string): readonly Collection[] {
  return collections.filter((collection) =>
    collection.regionIds.includes(regionId),
  );
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npx vitest run src/content/collections.test.ts`
Expected: PASS, три теста. Если `shaanxi` не входит в `silk-road` — взять из
каталога любой регион, у которого коллекция есть, и поправить тест.

- [ ] **Step 5: Написать падающий тест атласа**

Добавить в `src/features/atlas/AtlasPage.test.tsx` — и заодно передать новый
обработчик в `renderAtlas`:

```tsx
it('ведёт из карточки региона в его коллекции', () => {
  const onOpenCollection = vi.fn();

  render(
    <AtlasPage
      regions={regions}
      selectedRegionId="shaanxi"
      onSelect={() => {}}
      onClear={() => {}}
      zoom={1}
      onZoomChange={() => {}}
      onTrain={() => {}}
      onOpenCollection={onOpenCollection}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: /Шёлковый путь/ }));

  expect(onOpenCollection).toHaveBeenCalledWith('silk-road');
});
```

В `renderAtlas` добавить недостающий параметр:

```tsx
      onOpenCollection={() => {}}
```

- [ ] **Step 6: Убедиться, что тест падает**

Run: `npx vitest run src/features/atlas/AtlasPage.test.tsx -t 'ведёт из карточки региона'`
Expected: FAIL — кнопки с таким именем нет.

- [ ] **Step 7: Показать коллекции в карточке**

В `src/features/atlas/AtlasPage.tsx` добавить импорт:

```tsx
import { collectionsOfRegion } from '../../content/collections';
```

Добавить в `AtlasPageProps`:

```tsx
  readonly onOpenCollection: (collectionId: string) => void;
```

Добавить `onOpenCollection` в разбор параметров функции `AtlasPage`.

В ветке выбранного региона, сразу после `<CardFacts facts={selected.facts} />`,
вставить:

```tsx
                {/*
                  Коллекции региона — не новая сущность, а та же привязка
                  `regionIds`, прочитанная с другой стороны: со страницы
                  коллекции виден её регион, а из атласа — коллекции региона.
                  Пустой список — законное состояние, блок тогда не рисуется.
                */}
                {collectionsOfRegion(selected.id).length === 0 ? null : (
                  <nav className="atlas-collections" aria-label="Коллекции региона">
                    <p className="eyebrow">Коллекции</p>
                    <ul>
                      {collectionsOfRegion(selected.id).map((collection) => (
                        <li key={collection.id}>
                          <button
                            type="button"
                            className="text"
                            onClick={() => onOpenCollection(collection.id)}
                          >
                            {collection.nameRu}{' '}
                            <span lang="zh-Hans">{collection.nameZh}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
```

- [ ] **Step 8: Передать обработчик из App**

В `src/App.tsx` добавить к `<AtlasPage …>` строку:

```tsx
          onOpenCollection={openCollection}
```

- [ ] **Step 9: Одеть блок**

Добавить в `src/styles.css` после блока `.atlas-contents dd`:

```css
/*
 * Коллекции региона — список ссылок, а не сетка карточек: карточки уже есть
 * на своей странице, а здесь нужен переход, и он не должен весить больше
 * справки, рядом с которой стоит.
 */
.atlas-collections {
  border-block-start: var(--border-hair) solid var(--line-on-ground);
  margin-block-start: var(--s-4);
  padding-block-start: var(--s-3);
}

.atlas-collections ul {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  list-style: none;
  margin: 0;
  padding: 0;
}

.atlas-collections button {
  text-align: start;
}
```

- [ ] **Step 10: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS.

- [ ] **Step 11: Проверить в браузере**

Открыть Атлас, выбрать Шэньси, нажать «Шёлковый путь» — должна открыться
страница коллекции.

- [ ] **Step 12: Закоммитить**

```bash
git add src/content/collections.ts src/content/collections.test.ts src/features/atlas/AtlasPage.tsx src/features/atlas/AtlasPage.test.tsx src/App.tsx src/styles.css
git commit -m "$(printf 'feat: из карточки атласа в коллекции региона\n\nПривязка regionIds уже есть у коллекций — она читается с другой\nстороны: со страницы коллекции виден её регион, из атласа — коллекции\nрегиона. Новой сущности не появляется.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Task 6: Выход из режима — на секцию «Режимы»

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/features/results/RoundResultsPage.tsx`
- Modify: `src/features/results/FillMapResultsPage.tsx`
- Modify: `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `pendingAnchor`, `setAnchorRequests`, `setScreen` — уже есть в
  `App.tsx`, ими пользуется `navigate`.
- Produces: `function exitToModes(): void` в `App.tsx`.

- [ ] **Step 1: Добавить заглушку прокрутки для jsdom**

В `src/test/setup.ts` дописать:

```ts
/*
 * jsdom не реализует `scrollIntoView`, а переход на раздел главной подтягивает
 * его в кадр. Заглушка ничего не делает: раскладки в jsdom нет, прокручивать
 * нечего, а падать переходу незачем.
 */
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
```

- [ ] **Step 2: Написать падающий тест**

Заменить в `src/App.test.tsx` тест «главная кнопка запускает раунд и
возвращает обратно» на:

```tsx
/*
 * Выход из режима ведёт туда, откуда режим начинался, — на секцию «Режимы», а
 * не на верх главной: иначе после каждого раунда приходится прокручивать
 * страницу заново.
 */
it('главная кнопка запускает раунд и возвращает на секцию «Режимы»', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /^Начать/ }));
  expect(screen.getByText(/Вопрос 1 из 34/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Прервать раунд' }));

  expect(screen.getByRole('heading', { name: 'Режимы' })).toBeInTheDocument();
  expect(document.activeElement).toHaveAttribute('id', 'modes');
});
```

И тест «показывает итог после раунда и возвращает на главную» на:

```tsx
it('показывает итог после раунда и возвращает на секцию «Режимы»', () => {
  startCapitalRound();
  finishRound(true);

  expect(screen.getByText('100%')).toBeInTheDocument();
  expect(screen.getByText('34 из 34')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'К режимам' }));

  expect(document.activeElement).toHaveAttribute('id', 'modes');
});
```

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npx vitest run src/App.test.tsx -t 'на секцию'`
Expected: FAIL — кнопки «К режимам» нет, а после «Прервать раунд» фокус не
на `#modes`.

- [ ] **Step 4: Завести выход в App**

В `src/App.tsx` сразу после функции `navigate` добавить:

```tsx
  /**
   * Выход из режима. Ведёт на секцию «Режимы», а не на верх главной: оттуда
   * режим и запускали, и возвращать оттуда — значит не заставлять
   * прокручивать страницу заново после каждого раунда.
   *
   * Приём тот же, что у перехода из шапки: якорь в `pendingAnchor`, счётчик
   * будит эффект. Своей копии эффекта здесь нет и быть не должно —
   * навигация в приложении одна.
   */
  function exitToModes() {
    setScreen('home');
    pendingAnchor.current = 'modes';
    setAnchorRequests((count) => count + 1);
  }
```

Заменить все шесть вхождений `onExit={() => setScreen('home')}` на
`onExit={exitToModes}` — у `FillMapRound`, `FillMapResultsPage`,
`ExerciseRound`, `CityRound`, `PhysicalRound` и `RoundResultsPage`.

- [ ] **Step 5: Переименовать кнопку выхода**

В `src/features/results/RoundResultsPage.tsx` заменить

```tsx
              <button type="button" className="secondary" onClick={onExit}>
                На главную
              </button>
```

на

```tsx
              {/*
                «К режимам», а не «На главную»: кнопка ведёт на секцию, из
                которой раунд и запускали, и подпись обязана называть то
                место, куда ведёт.
              */}
              <button type="button" className="secondary" onClick={onExit}>
                К режимам
              </button>
```

То же — в `src/features/results/FillMapResultsPage.tsx`:

```tsx
          {/*
            «К режимам», а не «На главную»: кнопка ведёт на секцию, из которой
            раунд и запускали.
          */}
          <button type="button" className="secondary" onClick={onExit}>
            К режимам
          </button>
```

- [ ] **Step 6: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS. Тесты, искавшие кнопку «На главную», поправить на «К режимам».

- [ ] **Step 7: Проверить в браузере**

Запустить раунд с главной, прервать его — страница должна оказаться на секции
«Режимы», а не наверху. Пройти раунд до конца и нажать «К режимам» — то же
самое.

- [ ] **Step 8: Закоммитить**

```bash
git add src/App.tsx src/App.test.tsx src/features/results/RoundResultsPage.tsx src/features/results/FillMapResultsPage.tsx src/test/setup.ts
git commit -m "$(printf 'fix: выход из режима ведёт на секцию «Режимы»\n\nВыход возвращал на верх главной, и после каждого раунда приходилось\nпрокручивать страницу заново. Кнопка итогов переименована «На главную» →\n«К режимам»: подпись обязана называть то место, куда ведёт.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Task 7: Выравнивание вводки «Режимы»

**Files:**
- Modify: `src/styles.css`
- Test: `src/features/home/HomePage.test.tsx`

**Interfaces:** ничего не потребляет и не производит.

- [ ] **Step 1: Написать падающий тест**

jsdom раскладки не считает, поэтому проверяется само правило, а не результат.
Добавить в `src/features/home/HomePage.test.tsx`:

```tsx
/*
 * Секция лендинга — гибкий контейнер-колонка, а `margin-inline: auto` у
 * гибкого элемента отменяет растяжение и центрирует его по содержимому. У
 * сетки карточек содержимое шире колонки, и она этого не замечает; у вводки —
 * 60ch, и она уезжала к середине: 342 px против 48 px у всего вокруг.
 */
it('держит вводку поднятой секции во всю ширину колонки', async () => {
  const styles = await readFile(
    new URL('../../styles.css', import.meta.url),
    'utf8',
  );
  const rule = /\.landing-section\.raised > \* \{([^}]*)\}/.exec(styles)?.[1];

  expect(rule).toBeDefined();
  expect(rule).toContain('inline-size: 100%');
});
```

Добавить в начало файла импорт:

```tsx
import { readFile } from 'node:fs/promises';
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/features/home/HomePage.test.tsx -t 'во всю ширину колонки'`
Expected: FAIL — правило не содержит `inline-size: 100%`.

- [ ] **Step 3: Поправить правило**

В `src/styles.css` заменить

```css
.landing-section.raised > * {
  margin-inline: auto;
  max-inline-size: var(--page-column);
}
```

на

```css
/*
 * `inline-size: 100%` обязателен. Секция — гибкий контейнер-колонка, а
 * `margin-inline: auto` у гибкого элемента отменяет растяжение и центрирует
 * его по содержимому: вводка шириной 60ch уезжала к середине полосы — 342 px
 * против 48 px у заголовка героя и сетки карточек рядом.
 */
.landing-section.raised > * {
  inline-size: 100%;
  margin-inline: auto;
  max-inline-size: var(--page-column);
}
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npx vitest run src/features/home/HomePage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Проверить в браузере**

На главной сравнить левый край вводки «Карта — только начало…» с левым краем
заголовка «Режимы» и сетки карточек:

```js
['.landing-hero-text h1', '#modes .landing-section-head p', '#modes .mode-card-grid']
  .map((s) => Math.round(document.querySelector(s).getBoundingClientRect().left))
```

Expected: три одинаковых числа.

- [ ] **Step 6: Закоммитить**

```bash
git add src/styles.css src/features/home/HomePage.test.tsx
git commit -m "$(printf 'fix: вводка «Режимы» выровнена по левому краю\n\nmargin-inline: auto у гибкого элемента отменяет растяжение и центрирует\nего по содержимому: вводка шириной 60ch стояла на 342 px против 48 px у\nвсего вокруг.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Task 8: Города крупнее

**Files:**
- Modify: `src/map/CityLayer.tsx`
- Modify: `src/styles.css`
- Test: `src/map/CityLayer.test.tsx`

**Interfaces:** ничего не потребляет и не производит.

- [ ] **Step 1: Написать падающий тест**

Добавить в `src/map/CityLayer.test.tsx`:

```tsx
/*
 * Знак виден на той карте, где его разглядывают. В атласе карта шириной
 * 426 px при 806 единицах viewBox — 0.53 px на единицу, и знак радиусом 2.5
 * давал точку в 2.6 px.
 *
 * Цель нажатия от этого не меняется: она считается от `TARGET_DIAMETER_UNITS`
 * и к размеру знака не привязана.
 */
it('рисует знак города заметным на уменьшенной карте', () => {
  const { container } = render(
    <svg viewBox="-16 -16 806 601">
      <CityLayer />
    </svg>,
  );

  const mark = container.querySelector('.city-mark');

  expect(Number(mark?.getAttribute('r'))).toBeGreaterThanOrEqual(3.2);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/map/CityLayer.test.tsx -t 'заметным на уменьшенной карте'`
Expected: FAIL — `expected 2.5 to be greater than or equal to 3.2`.

- [ ] **Step 3: Увеличить знак**

В `src/map/CityLayer.tsx` заменить

```tsx
/** Радиус знака: город виден, но не спорит с границей региона. */
const MARK_RADIUS = 2.5;
```

на

```tsx
/**
 * Радиус знака: город виден, но не спорит с границей региона.
 *
 * Мера берётся от той карты, где город разглядывают, а не от опорной ширины:
 * в атласе карта шириной 426 px при 806 единицах viewBox даёт 0.53 px на
 * единицу, и прежние 2.5 превращались в точку 2.6 px.
 */
const MARK_RADIUS = 3.2;
```

- [ ] **Step 4: Увеличить остальные знаки в стилях**

В `src/styles.css` заменить

```css
/* Столица крупнее прочих городов: это разный вес, а не разный цвет. */
.china-map .city[data-city-set='capital'] .city-mark {
  r: 3.4;
  stroke-width: 1.4;
}
```

на

```css
/* Столица крупнее прочих городов: это разный вес, а не разный цвет. */
.china-map .city[data-city-set='capital'] .city-mark {
  r: 4.4;
  stroke-width: 1.4;
}
```

Заменить размер подписи

```css
  font-size: 10px;
```

в правиле `.china-map .city-label` на

```css
  font-size: 12px;
```

Заменить

```css
.china-map .city:focus-within .city-mark,
.china-map .city[data-selected='true'] .city-mark {
  fill: var(--accent);
  r: 5;
  stroke: var(--surface-paper-bright);
  stroke-width: 2.5;
}
```

на

```css
.china-map .city:focus-within .city-mark,
.china-map .city[data-selected='true'] .city-mark {
  fill: var(--accent);
  r: 6;
  stroke: var(--surface-paper-bright);
  stroke-width: 2.5;
}
```

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS. Если упадёт тест, проверявший расположение подписи по
`MARK_RADIUS`, — поправить в нём ожидаемое смещение: `LABEL_OFFSET` считается
от радиуса и вырос вместе с ним.

- [ ] **Step 6: Проверить в браузере**

Открыть Атлас → Политическая, снять снимок экрана. Точки городов должны
читаться, а центры регионов — отличаться от прочих городов размером.
Убедиться, что знаки не сливаются в скоплении у нижней Янцзы.

- [ ] **Step 7: Закоммитить**

```bash
git add src/map/CityLayer.tsx src/map/CityLayer.test.tsx src/styles.css
git commit -m "$(printf 'fix: города на карте крупнее\n\nВ атласе карта шириной 426 px при 806 единицах viewBox даёт 0.53 px на\nединицу, и знак радиусом 2.5 превращался в точку 2.6 px. Цель нажатия не\nменяется: она считается от TARGET_DIAMETER_UNITS.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Task 9: Документы и полная проверка

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `DECISIONS.md`
- Modify: `MAP_SPEC.md`
- Modify: `UI_UX.md`

**Interfaces:** ничего не потребляет и не производит.

- [ ] **Step 1: Записать решения**

Дописать в `DECISIONS.md` новым разделом с датой 2026-08-27:

- **Маска вместо обрезки на физической карте.** Контекст: первый показ слоя
  стоил 6 130 мс блокировки, переключение вкладки атласа выглядело поломкой;
  замер показал, что `clipPath` строит область обрезки по каждой вершине.
  Решение: те же 34 контура через `<mask>`. Последствия: 1 мс вместо 6 130;
  маска не отсекает нажатия, поэтому цель формы проверяется на суше в
  `physical-hit.ts`.
- **Одно правило цели на физической карте** — «побеждает меньший объект»:
  озеро, река, форма, регион. Контекст: узлы слоя перехватывали нажатие
  раньше, чем считалось расстояние до реки. Последствия: узлы слоя не
  принимают указатель; клавиатура ходит по ним по-прежнему.
- **Реки не обрезаются по границе страны** (решение владельца от 2026-08-27).
  Последствия: Амур виден целиком; реки выходят за границу и в море на
  пару единиц.
- **Шкала высот — врезка на листе карты** (решение владельца от 2026-08-27).
- **Выход из режима ведёт на секцию «Режимы»**; кнопка итогов называется
  «К режимам».
- **Повтор ошибок оставлен как есть** (решение владельца от 2026-08-27:
  «пока оставим»).

- [ ] **Step 2: Записать изменения**

Дописать в `CHANGELOG.md` те же восемь пунктов языком изменений, а не
решений.

- [ ] **Step 3: Поправить спеки**

В `MAP_SPEC.md` заменить упоминания обрезки физического слоя по `clipPath` на
маску и записать правило цели «побеждает меньший объект» с порядком: озеро,
река, форма, регион. Записать, что реки по границе страны не обрезаются.

В `UI_UX.md` записать, что шкала высот стоит врезкой на листе карты, и что
выход из режима ведёт на секцию «Режимы».

Найти места правки:

```bash
grep -n "clipPath\|обрезк\|Легенда ступеней\|шкала высот\|На главную" MAP_SPEC.md UI_UX.md
```

- [ ] **Step 4: Полная проверка**

```bash
npm run lint && npm test && npm run build
```

Expected: линтер без замечаний; `Test Files … passed`, `Tests … passed`;
`✓ built in …`.

- [ ] **Step 5: Ручная проверка основного сценария**

Открыть превью и пройти: главная → «Режимы» → раунд «найти на карте» →
прервать (должна открыться секция «Режимы») → Атлас → Физическая (без лага) →
нажать по реке на нагорье → по озеру → по форме → Политическая → выбрать
регион → перейти в его коллекцию.

- [ ] **Step 6: Закоммитить**

```bash
git add CHANGELOG.md DECISIONS.md MAP_SPEC.md UI_UX.md
git commit -m "$(printf 'docs: маска, правило цели, врезка шкалы и выход на «Режимы»\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>')"
```

---

## Самопроверка плана

**Покрытие спецификации.** Восемь дефектов из спецификации закрыты задачами:
лаг — 1, шкала — 4, попадание — 3, выход — 6, выравнивание — 7, размер
городов — 8, Амур — 2, коллекции — 5. Девятый пункт списка владельца (повтор)
оставлен намеренно: «пока оставим».

**Заглушек нет.** Каждый шаг, меняющий код, показывает код целиком.

**Согласованность имён.** `MASK_ID` заводится в задаче 1 и используется в
задаче 2. `physicalTargetAt(x, y, zoom)` заводится в задаче 3 и там же
подставляется в `featureAtClient`. `isOnLand(x, y)` заводится в задаче 3 и
вызывается только из `physical-hit.ts`. `mapInset` заводится в задаче 4 и
используется только атласом. `collectionsOfRegion(regionId)` заводится в
задаче 5 и вызывается только атласом. `exitToModes()` заводится в задаче 6 и
подставляется всем шести `onExit`.

**Известный риск.** Координаты в тестах задач 3 и 5 (`isOnLand(455, 320)`,
`physicalTargetAt(219, 360, 1)`, принадлежность Шэньси коллекции «Шёлковый
путь») взяты из геометрии и каталога, но не проверены прогоном. Если тест
даст не тот ответ — поправить координату или регион в тесте, а не логику в
модуле; шаги 4 и 8 задачи 3 и шаг 4 задачи 5 это оговаривают.
