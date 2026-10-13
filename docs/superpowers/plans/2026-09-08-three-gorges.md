# Три ущелья — план реализации

> **Для исполнителя:** этап 1 спецификации
> `docs/superpowers/specs/2026-09-08-three-gorges-and-grand-canal-design.md`.
> Великий канал — этап 2, у него будет свой план: он упирается в сеть и
> лицензию, и задерживать им готовое нельзя.

**Цель:** Три ущелья становятся сорок первой… точнее, сороковой целью
физической карты — отрезком уже нарисованной Янцзы, который спрашивается в
играх «Найти объект» и «Назвать объект».

**Замысел:** геометрия не добывается, а вырезается: генератор берёт линию
Янцзы и оставляет её часть между двумя координатами. Ущелья и река делят один
отрезок карты, поэтому попадание в него достаётся ущельям, а при вопросе о
Янцзы засчитывается ей — это правило живёт в раунде, а не в карте.

**Инструменты:** TypeScript, React 19, Vite, vitest; генераторы на `tsx`.

## Общие ограничения

- Интерфейс, задания и ошибки — по-русски; китайские названия в Unicode.
- У каждого факта — источник из `src/content/sources.ts`; у объекта 2–3 факта.
- `src/map/physical-geometry.ts` — сгенерированный файл: правится только
  генератором, руками — никогда.
- Домен не зовёт `Math.random`; компоненты не трогают `localStorage`; карта не
  считает правильность ответа.
- Новый иероглиф обязан попасть в подмножество шрифта, иначе `validate:fonts`
  роняет сборку.
- Каждая задача заканчивается зелёными `npm run lint`, `npm test`,
  `npm run build` и своим коммитом.

## Состав файлов

| Файл | Ответственность |
| --- | --- |
| `src/map/polyline.ts` | добавляется `sliceLine` — вырезка части ломаной |
| `src/map/polyline.test.ts` | тесты вырезки |
| `src/content/types.ts` | род `gorge` в объединении `PhysicalFeature` |
| `src/content/physical-features.ts` | цель `three-gorges`, факты, подпись рода |
| `scripts/data/gorge-endpoints.ts` | координаты концов отрезка (вход генератора) |
| `scripts/generate-physical-geometry.ts` | режет Янцзы, пишет цель в `WATER_LINES` |
| `scripts/physical-fingerprint.ts` | концы отрезка входят в отпечаток |
| `src/map/physical-geometry.ts` | сгенерированный итог: `WATER_LINES` вместо `RIVER_LINES` |
| `src/map/river-hit.ts` | на общем отрезке побеждает более короткая линия |
| `src/features/exercise/PhysicalRound.tsx` | попадание в часть засчитывается целому |
| `scripts/validate-map.ts` | сторож: отрезок лежит на Янцзы |

---

### Задача 1: `RIVER_LINES` становится `WATER_LINES`

Переименование без поведения. Отдельной задачей, потому что трогает пять файлов
и должно быть отделимо от смысловых правок при чтении истории.

**Файлы:**
- Изменить: `scripts/generate-physical-geometry.ts` (шаблон вывода)
- Изменить: `src/map/physical-geometry.ts` (перегенерировать, не править)
- Изменить: `src/map/river-hit.ts`, `scripts/validate-map.ts`
- Проверить: `src/map/physical-hit.test.ts`, `scripts/physical-geometry.test.ts`

**Отдаёт:** `WATER_LINES: readonly { featureId: string; d: string }[]` — все
линии карты: реки сейчас, ущелья после задачи 4, канал на втором этапе.

- [ ] **Шаг 1: найти все места**

```bash
grep -rn "RIVER_LINES" src scripts
```
Ожидается: объявление в `src/map/physical-geometry.ts`, шаблон в
`scripts/generate-physical-geometry.ts`, чтение в `src/map/river-hit.ts` и в
`scripts/validate-map.ts`.

- [ ] **Шаг 2: переименовать в шаблоне генератора**

В `scripts/generate-physical-geometry.ts` заменить в выводимом тексте
`export const RIVER_LINES: readonly RiverLine[]` на:

```ts
export const WATER_LINES: readonly WaterLine[]
```

и тип `RiverLine` на `WaterLine` — вместе с его объявлением в том же шаблоне:

```ts
export type WaterLine = {
  readonly featureId: string;
  readonly d: string;
};
```

- [ ] **Шаг 3: перегенерировать**

Run: `npm run generate:physical`
Ожидается: `src/map/physical-geometry.ts` переписан, в нём `WATER_LINES`.

- [ ] **Шаг 4: поправить потребителей**

`src/map/river-hit.ts`: `import { WATER_LINES } from './physical-geometry';` и
`RIVER_SHAPES = WATER_LINES.map(...)`. То же в `scripts/validate-map.ts`.

- [ ] **Шаг 5: проверки**

Run: `npm run lint && npm test && npm run build`
Ожидается: линтер чист, все тесты проходят, сборка зелёная.

- [ ] **Шаг 6: коммит**

```bash
git add -A
git commit -m "refactor: RIVER_LINES становится WATER_LINES"
```

---

### Задача 2: вырезка части ломаной

**Файлы:**
- Изменить: `src/map/polyline.ts`
- Изменить: `src/map/polyline.test.ts`

**Берёт:** `Point` из `src/map/svg-path.ts` (`{ x: number; y: number }`).
**Отдаёт:** `sliceLine(parts, from, to): Point[][]` — часть ломаной между двумя
точками. Вершины ищутся по наименьшему расстоянию; если ближайшие вершины
оказались в разных кусках, функция бросает — молчаливый пустой итог дал бы
цель без геометрии при зелёной сборке.

- [ ] **Шаг 1: написать падающий тест**

В `src/map/polyline.test.ts`:

```ts
it('вырезает часть ломаной между двумя точками', () => {
  const line = [
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
      { x: 40, y: 0 },
    ],
  ];

  expect(sliceLine(line, { x: 9, y: 1 }, { x: 31, y: -1 })).toEqual([
    [
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ],
  ]);
});

it('вырезает в том же порядке, в каком концы названы', () => {
  const line = [
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ],
  ];

  expect(sliceLine(line, { x: 21, y: 0 }, { x: 9, y: 0 })).toEqual([
    [
      { x: 20, y: 0 },
      { x: 10, y: 0 },
    ],
  ]);
});

it('не молчит, когда концы лежат в разных кусках', () => {
  const parts = [
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    [
      { x: 100, y: 0 },
      { x: 110, y: 0 },
    ],
  ];

  expect(() => sliceLine(parts, { x: 1, y: 0 }, { x: 101, y: 0 })).toThrow(
    /разных кусках/,
  );
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

Run: `npx vitest run src/map/polyline.test.ts`
Ожидается: FAIL — `sliceLine is not a function` (или ошибка импорта).

- [ ] **Шаг 3: реализовать**

В `src/map/polyline.ts`:

```ts
/**
 * Часть ломаной между двумя точками.
 *
 * Концы задаются координатами, а не номерами вершин: номер зависит от
 * упрощения, а координата — от местности. Берутся ближайшие вершины, и итог
 * идёт в том порядке, в каком концы названы.
 *
 * Куски не склеиваются: обрезка по рамке рвёт линию, и часть, начатая в одном
 * куске и законченная в другом, означала бы звено через пустоту — это ошибка
 * входных данных, и генератор обязан о ней сказать.
 */
export function sliceLine(
  parts: readonly (readonly Point[])[],
  from: Point,
  to: Point,
): Point[][] {
  const nearest = (target: Point): { part: number; index: number } => {
    let best = { part: -1, index: -1 };
    let bestDistance = Number.POSITIVE_INFINITY;

    parts.forEach((part, partIndex) => {
      part.forEach((point, index) => {
        const distance = Math.hypot(point.x - target.x, point.y - target.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { part: partIndex, index };
        }
      });
    });

    return best;
  };

  const start = nearest(from);
  const end = nearest(to);

  if (start.part !== end.part || start.part === -1) {
    throw new Error('Концы отрезка лежат в разных кусках ломаной');
  }

  const part = parts[start.part];
  const slice =
    start.index <= end.index
      ? part.slice(start.index, end.index + 1)
      : part.slice(end.index, start.index + 1).reverse();

  return [slice.map((point) => ({ ...point }))];
}
```

- [ ] **Шаг 4: убедиться, что тесты проходят**

Run: `npx vitest run src/map/polyline.test.ts`
Ожидается: PASS.

- [ ] **Шаг 5: коммит**

```bash
git add src/map/polyline.ts src/map/polyline.test.ts
git commit -m "feat: вырезка части ломаной по двум точкам"
```

---

### Задача 3: род «Ущелье» и запись в справочнике

**Файлы:**
- Изменить: `src/content/types.ts`
- Изменить: `src/content/physical-features.ts`
- Изменить: `src/content/physical-features.test.ts`
- Изменить: `scripts/font-coverage.json`, `src/assets/fonts/*` (генератором)

**Отдаёт:** цель `three-gorges` рода `gorge` с полем `partOf: 'yangtze'`;
подпись рода «Ущелье».

- [ ] **Шаг 1: написать падающий тест**

В `src/content/physical-features.test.ts`:

```ts
it('Три ущелья — часть Янцзы, и это сказано полем', () => {
  const gorges = physicalFeatures.find((one) => one.id === 'three-gorges');

  expect(gorges?.kind).toBe('gorge');
  expect(gorges?.kind === 'gorge' ? gorges.partOf : null).toBe('yangtze');
  expect(gorges?.regionIds).toEqual(['chongqing', 'hubei']);
  expect(gorges?.facts).toHaveLength(3);
});

it('род ущелья назван словом', () => {
  const gorges = physicalFeatures.find((one) => one.id === 'three-gorges')!;

  expect(physicalKindLabel(gorges)).toBe('Ущелье');
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

Run: `npx vitest run src/content/physical-features.test.ts`
Ожидается: FAIL — цель не найдена (`gorges?.kind` равен `undefined`).

- [ ] **Шаг 3: завести род в типах**

В `src/content/types.ts` в объединение `PhysicalFeature` добавить ветку:

```ts
    | {
        readonly kind: 'gorge';
        /**
         * Река, чьим отрезком объект является. Не украшение: попадание в
         * отрезок засчитывается и тогда, когда спрошена сама река, — ущелье
         * и есть она.
         */
        readonly partOf: string;
      }
```

и `'gorge'` в `PhysicalKind`.

- [ ] **Шаг 4: написать запись справочника**

В `src/content/physical-features.ts` рядом с прочими фактами:

```ts
const threeGorgesFacts: readonly Fact[] = [
  {
    title: 'Двести километров теснин',
    body: 'Янцзы идёт через Три ущелья около 200 км — от восточной окраины Чунцина до западного Хубэя, — а потом выходит на равнину.',
    sourceIds: ['britannica-yangtze'],
  },
  {
    title: 'Стены в четыреста метров',
    body: 'Склоны сложены толстым известняком и до постройки плотины в 2006 году поднимались над рекой на 400–600 м; с наполнением водохранилища они стали заметно ниже.',
    sourceIds: ['britannica-yangtze'],
  },
  {
    title: 'Их и правда три',
    body: 'Цюйтан — самое короткое, около 8 км; Уся тянется примерно на 50 км; Силин, последнее, — около 34 км выше Ичана.',
    sourceIds: ['britannica-yangtze'],
  },
];
```

В карту `FACTS` добавить `'three-gorges': threeGorgesFacts`, а в список целей —
запись:

```ts
  {
    id: 'three-gorges',
    kind: 'gorge',
    partOf: 'yangtze',
    nameRu: 'Три ущелья',
    nameZh: '三峡',
    pinyin: 'Sānxiá',
    regionIds: ['chongqing', 'hubei'],
    facts: FACTS['three-gorges'] ?? [],
    sourceIds: RIVERS,
  },
```

- [ ] **Шаг 5: назвать род словом**

В `PHYSICAL_KIND_LABELS` добавить `gorge: 'Ущелье'`.

- [ ] **Шаг 6: пересобрать подмножество шрифта**

Run: `npm run generate:fonts`
Ожидается: в `scripts/font-coverage.json` появляются 三 и 峡; счёт знаков
вырастает. Без этого шага `npm run build` упадёт на `validate:fonts`.

- [ ] **Шаг 7: проверки**

Run: `npx vitest run src/content && npm run validate:content && npm run build`
Ожидается: PASS; сборка зелёная. `validate:map` на этом шаге ещё не знает про
геометрию ущелий — она появится в задаче 4, а проверка её отсутствия
добавляется там же.

- [ ] **Шаг 8: коммит**

```bash
git add -A
git commit -m "feat: Три ущелья в справочнике физической географии"
```

---

### Задача 4: генератор режет отрезок

**Файлы:**
- Создать: `scripts/data/gorge-endpoints.ts`
- Изменить: `scripts/generate-physical-geometry.ts`
- Изменить: `scripts/physical-fingerprint.ts`
- Изменить: `src/map/physical-geometry.ts` (перегенерировать)
- Изменить: `scripts/physical-geometry.test.ts`

**Берёт:** `sliceLine` из задачи 2, `partOf` из задачи 3.
**Отдаёт:** запись `{ featureId: 'three-gorges', d }` в `WATER_LINES`.

- [ ] **Шаг 1: записать концы отрезка**

Создать `scripts/data/gorge-endpoints.ts`:

```ts
/**
 * Концы отрезка Трёх ущелий в градусах.
 *
 * Западный — Байдичэн, у которого начинается Цюйтан (Викиданные Q803709);
 * восточный — Ичан, выше которого кончается Силин (Викиданные Q71266).
 * Источник тот же, что у координат городов: `wikidata-coordinates-2026-08-05`.
 *
 * Здесь, а не в справочнике: справочник от файла карты не зависит, и
 * координат в нём нет ни у одной цели.
 */
export const GORGE_ENDPOINTS = {
  'three-gorges': {
    from: [109.5705, 31.0435] as [number, number],
    to: [111.2803, 30.7083] as [number, number],
  },
} as const;
```

- [ ] **Шаг 2: написать падающий тест**

В `scripts/physical-geometry.test.ts`:

```ts
it('отрезок ущелий лежит на линии Янцзы', () => {
  const gorges = WATER_LINES.find((line) => line.featureId === 'three-gorges');
  const yangtze = WATER_LINES.find((line) => line.featureId === 'yangtze');

  expect(gorges).toBeDefined();
  expect(yangtze).toBeDefined();

  const river = parseMapPath(yangtze!.d);
  const points = parseMapPath(gorges!.d).flat();

  expect(points.length).toBeGreaterThan(2);
  for (const point of points) {
    expect(distanceToPolylines(point.x, point.y, river)).toBeLessThan(0.5);
  }
});

it('отрезок ущелий не короче цели нажатия', () => {
  const gorges = WATER_LINES.find((line) => line.featureId === 'three-gorges')!;
  const points = parseMapPath(gorges.d).flat();
  const length = points.reduce(
    (total, point, index) =>
      index === 0
        ? 0
        : total + Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y),
    0,
  );

  /*
   * Двести километров на этой карте — около 28 единиц. Порог берётся вдвое
   * меньше: линию мерят полосой в 24 px вокруг неё, и отрезок короче этой
   * полосы был бы целью, в которую не прицелиться.
   */
  expect(length).toBeGreaterThan(12);
});
```

- [ ] **Шаг 3: убедиться, что тест падает**

Run: `npx vitest run scripts/physical-geometry.test.ts`
Ожидается: FAIL — `expect(gorges).toBeDefined()` не выполняется.

- [ ] **Шаг 4: научить генератор**

В `scripts/generate-physical-geometry.ts` после сборки `riverLines` добавить:

```ts
/*
 * Ущелья — часть уже посчитанной реки, а не отдельная геометрия: рисовать их
 * второй линией по своим данным значило бы держать два ответа на один вопрос
 * «где проходит Янцзы» и однажды их разойтись.
 */
const gorgeLines = physicalFeatures.flatMap((feature) => {
  if (feature.kind !== 'gorge') {
    return [];
  }

  const parent = riverLines.find((line) => line.featureId === feature.partOf);
  if (parent === undefined) {
    throw new Error(
      `Нет линии реки ${feature.partOf} для ущелья ${feature.id}`,
    );
  }

  const ends = GORGE_ENDPOINTS[feature.id as keyof typeof GORGE_ENDPOINTS];
  if (ends === undefined) {
    throw new Error(`Нет координат концов у ${feature.id}`);
  }

  const [fromX, fromY] = projectLonLat(...ends.from);
  const [toX, toY] = projectLonLat(...ends.to);

  return [
    {
      featureId: feature.id,
      parts: sliceLine(
        parent.parts,
        { x: fromX, y: fromY },
        { x: toX, y: toY },
      ),
    },
  ];
});
```

и включить `gorgeLines` в то, что пишется в `WATER_LINES`, — после рек, тем же
`toPathData`, что и они.

- [ ] **Шаг 5: включить концы в отпечаток**

В `scripts/physical-fingerprint.ts` добавить `GORGE_ENDPOINTS` в состав хеша
рядом с каталогом и ступенями: забытый генератор обязан ронять сборку.

- [ ] **Шаг 6: перегенерировать и прогнать тест**

Run: `npm run generate:physical && npx vitest run scripts/physical-geometry.test.ts`
Ожидается: PASS; в `src/map/physical-geometry.ts` появилась линия
`three-gorges`.

- [ ] **Шаг 7: проверки**

Run: `npm run lint && npm test && npm run build`

- [ ] **Шаг 8: коммит**

```bash
git add -A
git commit -m "feat: генератор режет отрезок Трёх ущелий из линии Янцзы"
```

---

### Задача 5: на общем отрезке побеждает меньший

**Файлы:**
- Изменить: `src/map/river-hit.ts`
- Изменить: `src/map/physical-hit.test.ts`

**Отдаёт:** `riverAt` возвращает `three-gorges` на отрезке ущелий и `yangtze`
на остальной реке.

- [ ] **Шаг 1: написать падающий тест**

В `src/map/physical-hit.test.ts`:

```ts
it('на отрезке ущелий побеждает ущелье, а не река', () => {
  const gorges = WATER_LINES.find((line) => line.featureId === 'three-gorges')!;
  const middle = parseMapPath(gorges.d).flat()[1];

  expect(physicalTargetAt(middle.x, middle.y, 1)).toBe('three-gorges');
});

it('вне отрезка Янцзы остаётся Янцзы', () => {
  const yangtze = WATER_LINES.find((line) => line.featureId === 'yangtze')!;
  const source = parseMapPath(yangtze.d).flat()[0];

  expect(physicalTargetAt(source.x, source.y, 1)).toBe('yangtze');
});
```

- [ ] **Шаг 2: убедиться, что тест падает**

Run: `npx vitest run src/map/physical-hit.test.ts`
Ожидается: FAIL — на отрезке ущелий возвращается `yangtze` (или наоборот,
в зависимости от порядка записей: порядок и есть то, что чинится).

- [ ] **Шаг 3: заменить порядок правилом**

В `src/map/river-hit.ts`:

```ts
export const RIVER_SHAPES: readonly RiverShape[] = WATER_LINES.map((line) => {
  const parts = parseMapPath(line.d);

  return {
    featureId: line.featureId,
    parts,
    length: parts.reduce(
      (total, part) =>
        total +
        part.reduce(
          (sum, point, index) =>
            index === 0
              ? sum
              : sum + Math.hypot(point.x - part[index - 1].x, point.y - part[index - 1].y),
          0,
        ),
      0,
    ),
  };
});

/**
 * Ближайшая линия к точке карты или `null`, если все дальше порога.
 *
 * На равном расстоянии побеждает более короткая: ущелья лежат на самой Янцзы,
 * и оба ответа стоят к точке вплотную. Правило то же, что у форм рельефа, —
 * побеждает меньший объект, — и оно названо, а не выведено из порядка записей
 * в сгенерированном файле.
 */
export function riverAt(x: number, y: number, maxDistance: number): string | null {
  let nearestId: string | null = null;
  let nearest = maxDistance;
  let nearestLength = Number.POSITIVE_INFINITY;

  for (const river of RIVER_SHAPES) {
    const distance = distanceToPolylines(x, y, river.parts);
    const closer = distance < nearest - 1e-6;
    const sameButShorter =
      Math.abs(distance - nearest) <= 1e-6 && river.length < nearestLength;

    if (distance <= maxDistance && (closer || sameButShorter)) {
      nearest = distance;
      nearestLength = river.length;
      nearestId = river.featureId;
    }
  }

  return nearestId;
}
```

Тип `RiverShape` получает поле `readonly length: number`.

- [ ] **Шаг 4: убедиться, что тесты проходят**

Run: `npx vitest run src/map/physical-hit.test.ts src/map/river-hit.test.ts`
Ожидается: PASS, включая прежние тесты о реках.

- [ ] **Шаг 5: коммит**

```bash
git add src/map/river-hit.ts src/map/physical-hit.test.ts
git commit -m "feat: на общем отрезке карты побеждает более короткая линия"
```

---

### Задача 6: попадание в часть засчитывается целому

**Файлы:**
- Изменить: `src/content/physical-features.ts` (чистая справка о части и целом)
- Изменить: `src/features/exercise/PhysicalRound.tsx`
- Изменить: `src/features/exercise/PhysicalRound.test.tsx`

**Отдаёт:** `partOfFeature(featureId): string | undefined` — чьей частью
является цель.

- [ ] **Шаг 1: написать падающий тест**

В `src/features/exercise/PhysicalRound.test.tsx`:

```ts
it('в вопросе о Янцзы попадание в ущелья тоже верно', () => {
  const yangtze = physicalFeatures.find((one) => one.id === 'yangtze')!;
  const { container } = renderRound('find-on-map', [yangtze]);

  /*
   * Нажатие идёт по самому узлу слоя: у каждой линии есть `data-feature-id` и
   * роль кнопки, когда по карте отвечают (`PhysicalLayer`). Так проверяется вся
   * дорога от карты до раунда, а не одна чистая справка.
   */
  fireEvent.click(container.querySelector('[data-feature-id="three-gorges"]')!);

  /* Верный ответ разбора не показывает: он бывает только на ошибке. */
  expect(screen.queryByText('Это стоит повторить')).toBeNull();
});

it('в вопросе об ущельях попадание в другую часть Янцзы — ошибка', () => {
  const gorges = physicalFeatures.find((one) => one.id === 'three-gorges')!;
  const { container } = renderRound('find-on-map', [gorges]);

  fireEvent.click(container.querySelector('[data-feature-id="yangtze"]')!);

  expect(screen.getByText('Это стоит повторить')).toBeInTheDocument();
});
```

`renderRound(exerciseType, features)` — помощник, уже объявленный в начале
этого файла; он возвращает `container` от `render`.

- [ ] **Шаг 2: убедиться, что тест падает**

Run: `npx vitest run src/features/exercise/PhysicalRound.test.tsx`
Ожидается: FAIL — ответ считается ошибочным.

- [ ] **Шаг 3: справка о части и целом**

В `src/content/physical-features.ts`:

```ts
/**
 * Чьей частью является цель. Ущелья — часть Янцзы, и попадание в них верно,
 * когда спрошена сама река: ученик, ткнувший в самое узнаваемое место, не
 * должен получать ошибку.
 */
export function partOfFeature(featureId: string): string | undefined {
  const feature = physicalFeatures.find((one) => one.id === featureId);

  return feature?.kind === 'gorge' ? feature.partOf : undefined;
}
```

- [ ] **Шаг 4: применить в раунде**

В `src/features/exercise/PhysicalRound.tsx`:

```ts
  function handleFeatureSelect(featureId: string) {
    if (showsChoices) {
      return;
    }

    /*
     * Попадание в часть засчитывается целому: ущелья лежат на Янцзы, и при
     * вопросе о реке нажатие по ним — верный ответ. Обратное неверно: когда
     * спрошены ущелья, годится только сам отрезок.
     */
    const whole = partOfFeature(featureId);
    answer(whole === question.target.id ? whole : featureId);
  }
```

- [ ] **Шаг 5: убедиться, что тесты проходят**

Run: `npx vitest run src/features/exercise/PhysicalRound.test.tsx`
Ожидается: PASS.

- [ ] **Шаг 6: коммит**

```bash
git add -A
git commit -m "feat: попадание в ущелья засчитывается вопросу о Янцзы"
```

---

### Задача 7: сборка сторожит отрезок

**Файлы:**
- Изменить: `scripts/validate-map.ts`

- [ ] **Шаг 1: добавить проверку**

```ts
/*
 * Отрезок ущелий обязан лежать на своей реке: он вырезан из неё генератором, и
 * разойтись они могут только при правке руками — а такую правку сборка обязана
 * поймать, а не показать ученику двумя линиями там, где река одна.
 */
for (const feature of physicalFeatures) {
  if (feature.kind !== 'gorge') {
    continue;
  }

  const part = WATER_LINES.find((line) => line.featureId === feature.id);
  const whole = WATER_LINES.find((line) => line.featureId === feature.partOf);
  if (part === undefined || whole === undefined) {
    throw new Error(`Нет линии у ${feature.id} или у ${feature.partOf}`);
  }

  const river = parseMapPath(whole.d);
  const off = parseMapPath(part.d)
    .flat()
    .filter((point) => distanceToPolylines(point.x, point.y, river) >= 0.5);

  if (off.length > 0) {
    throw new Error(
      `Отрезок ${feature.id} сошёл с линии ${feature.partOf} в ${off.length} точках. ` +
        'Запустите npm run generate:physical',
    );
  }
}

console.info(`Проверено участков рек: ${physicalFeatures.filter((one) => one.kind === 'gorge').length}.`);
```

- [ ] **Шаг 2: проверить, что сторож ловит**

Временно сдвинуть одну точку в линии `three-gorges` в
`src/map/physical-geometry.ts`, затем:

Run: `npm run validate:map`
Ожидается: падение с текстом «сошёл с линии yangtze».

Вернуть файл: `git checkout -- src/map/physical-geometry.ts`

- [ ] **Шаг 3: проверки**

Run: `npm run build`
Ожидается: сборка зелёная, в выводе строка о проверенных участках.

- [ ] **Шаг 4: коммит**

```bash
git add scripts/validate-map.ts
git commit -m "feat: validate:map сторожит, что отрезок ущелий лежит на реке"
```

---

### Задача 8: документы и ручной прогон

**Файлы:**
- Изменить: `CHANGELOG.md`, `EXERCISES.md`, `PLAN.md`

- [ ] **Шаг 1: пройти сценарий в браузере**

Run: `npm run dev`

Проверить: в атласе карточка «Три ущелья» с родом «Ущелье» и тремя фактами;
в «Найти объект» вопрос про ущелья отвечается нажатием по отрезку; в вопросе
про Янцзы нажатие по отрезку тоже верно; в «Назвать объект» подсвеченный
отрезок называется из четырёх вариантов.

- [ ] **Шаг 2: записать изменение**

`CHANGELOG.md`, раздел Unreleased → Added: цель, род, правило перекрытия и то,
что счёт целей физической карты стал 40.

`EXERCISES.md`: абзац о том, что ущелья спрашиваются наравне с реками и почему
попадание в них верно при вопросе о Янцзы.

`PLAN.md`, пункт 14: отметить сделанной половину работы; канал остаётся.

- [ ] **Шаг 3: последняя проверка и коммит**

```bash
npm run lint && npm test && npm run build
git add -A
git commit -m "docs: Три ущелья записаны в журналах"
```

---

## После плана

Ветка `feat/three-gorges` идёт на ревью (`/code-review`), и только после него —
в главную. Дальше пишется план второго этапа: Великий канал, извлекатель OSM,
лицензия ODbL и врезка атрибуции.
