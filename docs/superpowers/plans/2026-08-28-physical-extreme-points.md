# Крайние точки страны — план шага 2

> **Для исполнителя:** ОБЯЗАТЕЛЬНЫЙ ПОДНАВЫК: `superpowers:executing-plans`.

**Цель:** завести на физической карте род «точка» и две цели — Джомолунгму
(8848 м) и Турфанскую впадину (−154 м), высшую и низшую точки Китая. Целей
станет 34.

**Устройство:** у точки нет контура, поэтому цель строится вокруг знака — тем
же приёмом, что у озера (`spreadHitTargets`). Род читается формой знака:
треугольник вверх у вершины, перевёрнутый и залитый — у впадины; цвет на этой
карте занят ступенью рельефа. Высота идёт фактом с источником, а не полем — по
тому же правилу, по которому у реки не хранится длина.

**Инструменты:** TypeScript, React 19, Vite, Vitest 4. Геометрия — Natural Earth,
набор `ne_10m_geography_regions_elevation_points`; выжимка обновляется
`npm run extract:physical` (нужна сеть).

## Общие ограничения

- Интерфейс и задания по-русски, китайские названия в Unicode.
- Каждый факт — с источником в `src/content/sources.ts` и записью в
  `docs/sources/sources.md`.
- Сгенерированные файлы правятся только генератором.
- После правки контента — `npm run generate:fonts`.
- Ветка `feat/physical-points`; перед слиянием `npm run lint`, `npm test`,
  `npm run build`.
- Спек: `docs/superpowers/specs/2026-08-28-physical-objects-design.md`, раздел
  «2. Две крайние точки».

## Файлы

| Файл | Ответственность |
| --- | --- |
| `src/content/types.ts` | род `point` и его ветвь `PhysicalFeature` |
| `src/content/physical-features.ts` | две записи, факты, слова рода, наборы |
| `scripts/extract-physical-source.ts` | точки высот в выжимке |
| `scripts/generate-physical-geometry.ts` | `POINT_MARKS` |
| `src/map/point-marks.ts` | знаки и цели нажатия — как `lake-marks.ts` |
| `src/map/physical-hit.ts` | точка проверяется первой |
| `src/map/PhysicalLayer.tsx` | треугольники, подписи, клавиатура |
| `src/map/validate-map.ts` | знак на суше и внутри заявленного региона |
| `src/features/home/HomePage.tsx`, `src/features/atlas/AtlasPage.tsx` | набор и перечисление родов |

---

### Задача 1: Род точки в справочнике

**Файлы:** `src/content/types.ts`, `src/content/physical-features.ts`,
`src/content/physical-features.test.ts` (если есть) или
`src/domain/validate-physical.test.ts`

- [ ] **Шаг 1: Расширить тип**

В `src/content/types.ts`:

```ts
export type PhysicalKind = 'river' | 'landform' | 'lake' | 'point';
```

и новая ветвь в `PhysicalFeature`:

```ts
    | {
        readonly kind: 'point';
        /**
         * Вершина или впадина. Род читается формой знака, а не цветом: цвет на
         * этой карте занят ступенью рельефа.
         */
        readonly point: 'peak' | 'depression';
        /**
         * Номер объекта в Natural Earth — то же правило, что у озера: имена
         * там не уникальны, номера уникальны.
         */
        readonly neId: number;
      }
```

- [ ] **Шаг 2: Написать падающий тест на слова рода**

В `src/content/physical-features.test.ts` (если файла нет — завести):

```ts
import { expect, it } from 'vitest';
import { physicalFeatureById, physicalKindLabel } from './physical-features';

it('вершина и впадина называются по-своему', () => {
  expect(physicalKindLabel(physicalFeatureById('everest')!)).toBe('Вершина');
  expect(physicalKindLabel(physicalFeatureById('turpan-depression')!)).toBe(
    'Впадина',
  );
});
```

- [ ] **Шаг 3: Слова рода и конструктор**

В `src/content/physical-features.ts`:

```ts
export const PHYSICAL_KIND_LABELS: Readonly<Record<PhysicalKind, string>> = {
  river: 'Река',
  landform: 'Форма рельефа',
  lake: 'Озеро',
  point: 'Крайняя точка',
};

/**
 * Слово рода в карточке. Одного `kind` мало: хребет — тоже `landform`, а
 * вершина и впадина — обе `point`, но ученик ищет глазами именно вершину.
 */
export function physicalKindLabel(feature: PhysicalFeature): string {
  if (feature.kind === 'landform' && feature.landform === 'range') {
    return 'Горный хребет';
  }

  if (feature.kind === 'point') {
    return feature.point === 'peak' ? 'Вершина' : 'Впадина';
  }

  return PHYSICAL_KIND_LABELS[feature.kind];
}
```

и конструктор рядом с `lake`:

```ts
const POINTS = ['natural-earth-elevation-points-5.1.2'] as const;

function point(
  id: string,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  kindOfPoint: 'peak' | 'depression',
  neId: number,
  regionIds: readonly string[],
): PhysicalFeature {
  return {
    id,
    kind: 'point',
    nameRu,
    nameZh,
    pinyin,
    point: kindOfPoint,
    neId,
    regionIds,
    facts: FACTS[id] ?? [],
    sourceIds: POINTS,
  };
}
```

- [ ] **Шаг 4: Записать источник набора**

В `src/content/sources.ts` — рядом с прочими записями Natural Earth:

```ts
  {
    id: 'natural-earth-elevation-points-5.1.2',
    title: 'Natural Earth — ne_10m_geography_regions_elevation_points 5.1.2',
    organization: 'Natural Earth',
    url: 'https://www.naturalearthdata.com/downloads/10m-physical-vectors/',
    accessedAt: '2026-08-28',
    covers: ['координаты и высоты крайних точек'],
  },
```

Точный вид записи возьмите у соседних наборов Natural Earth в этом же файле —
у них те же поля. И такой же блок в `docs/sources/sources.md`.

- [ ] **Шаг 5: Две записи и факты**

Факты пишутся по прочитанным статьям, а не по памяти. Адреса:
`https://www.britannica.com/place/Mount-Everest` (высота 8848 м и обмер 2020
года — 8848,86 м) и `https://www.britannica.com/place/China/Relief` (озеро
Айдинг в Турфанской впадине, −155 м) плюс существующая запись
`britannica-xinjiang`, которая уже подтверждает Турфанскую впадину. «Британника»
открывается только браузером.

```ts
  point(
    'everest',
    'Джомолунгма',
    '珠穆朗玛峰',
    'Zhūmùlǎngmǎ Fēng',
    'peak',
    1159105715,
    ['tibet'],
  ),
  point(
    'turpan-depression',
    'Турфанская впадина',
    '吐鲁番盆地',
    'Tǔlǔfān Péndì',
    'depression',
    1159105721,
    ['xinjiang'],
  ),
```

- [ ] **Шаг 6: Набор «И озёра с крайними точками»**

Точки — такие же знаки, как озёра, и идут в тот же, последний набор. В
`src/content/physical-features.ts`:

```ts
export function physicalFeaturesUpTo(
  set: PhysicalSet,
): readonly PhysicalFeature[] {
  if (set === 'all') {
    return physicalFeatures;
  }

  /* Знаки — озёра и крайние точки — идут последним набором: у них нет контура,
     и целятся в них иначе, чем в реку или форму. */
  const withoutMarks = physicalFeatures.filter(
    (feature) => feature.kind !== 'lake' && feature.kind !== 'point',
  );
  if (set === 'ranges') {
    return withoutMarks;
  }

  return withoutMarks.filter(
    (feature) => feature.kind !== 'landform' || feature.landform !== 'range',
  );
}
```

и подпись набора в `src/features/home/HomePage.tsx`:

```ts
  ['all', 'И озёра с крайними точками'],
```

- [ ] **Шаг 7: Проверки**

```bash
npx vitest run src/content src/domain/validate-physical.test.ts
```

Ожидается: тест слов рода зелёный; счёт целей в `validate-physical.test.ts`
поднимите до 34, число форм не меняется, добавьте ожидание двух точек.

- [ ] **Шаг 8: Коммит**

```bash
git add src/content src/features/home/HomePage.tsx docs/sources/sources.md
git commit -m "content: род крайних точек и две записи"
```

---

### Задача 2: Геометрия точек

**Файлы:** `scripts/extract-physical-source.ts`,
`scripts/data/physical-source.json` (генератором),
`scripts/generate-physical-geometry.ts`, `src/map/physical-geometry.ts`
(генератором)

- [ ] **Шаг 1: Добавить набор в выжимку**

В `scripts/extract-physical-source.ts` — рядом с озёрами:

```ts
const pointIds = new Set(
  physicalFeatures.flatMap((feature) =>
    feature.kind === 'point' ? [feature.neId] : [],
  ),
);

const pointFeatures = await load('ne_10m_geography_regions_elevation_points');
const points = pointFeatures
  .filter(
    (feature) =>
      feature.geometry !== null && pointIds.has(feature.properties.ne_id as number),
  )
  .map((feature) => ({
    neId: feature.properties.ne_id as number,
    at: round((feature.geometry as Geometry).coordinates as Position),
  }));

const missingPoints = [...pointIds].filter(
  (id) => !points.some((item) => item.neId === id),
);
if (missingPoints.length > 0) {
  throw new Error(`Не найдены точки высот: ${missingPoints.join(', ')}`);
}
```

и `points` в объект записи рядом с `rivers`, `landforms`, `lakes`; счёт точек —
в итоговую строку `console.info`.

- [ ] **Шаг 2: Обновить выжимку**

```bash
npm run extract:physical
```

Ожидается: в конце строка с числом точек 2. Нужна сеть.

- [ ] **Шаг 3: Научить генератор**

В `scripts/generate-physical-geometry.ts` — тип разбора выжимки получает
`points: { neId: number; at: [number, number] }[]`, и рядом с озёрами:

```ts
const pointsById = new Map<number, [number, number]>(
  source.points.map((item) => [item.neId, item.at]),
);

const points = physicalFeatures.flatMap((feature) => {
  if (feature.kind !== 'point') {
    return [];
  }

  const at = pointsById.get(feature.neId);
  if (at === undefined) {
    throw new Error(
      `Нет координат у точки ${feature.id}. Запустите npm run extract:physical`,
    );
  }

  const [x, y] = project(at);

  return [{ featureId: feature.id, x, y }];
});
```

Запись в файл — рядом с `LAKE_SHAPES`:

```ts
export type PointMark = {
  readonly featureId: string;
  readonly x: number;
  readonly y: number;
};

export const POINT_MARKS: readonly PointMark[] = [
  ...
];
```

строкой вида `  { featureId: 'everest', x: 168.05, y: 433.91 },`. Тип и
константу печатает та же часть генератора, что печатает озёра, — повторите её
устройство.

- [ ] **Шаг 4: Перегенерировать**

```bash
npm run generate:physical
```

Ожидается: в `src/map/physical-geometry.ts` появился `POINT_MARKS` с двумя
записями; координаты Джомолунгмы около 168, 434, Турфанской впадины — около
198, 203.

- [ ] **Шаг 5: Коммит**

```bash
git add scripts src/map/physical-geometry.ts
git commit -m "feat: координаты крайних точек в геометрии карты"
```

---

### Задача 3: Знак, цель нажатия и порядок попадания

**Файлы:** создать `src/map/point-marks.ts`, `src/map/point-marks.test.ts`;
изменить `src/map/physical-hit.ts`, `src/map/physical-hit.test.ts`

- [ ] **Шаг 1: Написать падающий тест целей**

`src/map/point-marks.test.ts`:

```ts
import { expect, it } from 'vitest';
import { pointMarks } from './point-marks';

it('у каждой крайней точки есть цель нажатия', () => {
  const marks = pointMarks(1);

  expect(marks.map((mark) => mark.featureId)).toEqual([
    'everest',
    'turpan-depression',
  ]);

  for (const mark of marks) {
    expect(mark.radius).toBeGreaterThan(0);
  }
});

/* На увеличении та же цель занимает меньше единиц карты. */
it('цель сжимается вместе с увеличением', () => {
  expect(pointMarks(2)[0].radius).toBeLessThan(pointMarks(1)[0].radius);
});
```

- [ ] **Шаг 2: Запустить и убедиться, что падает**

```bash
npx vitest run src/map/point-marks.test.ts
```

Ожидается: `Failed to resolve import "./point-marks"`.

- [ ] **Шаг 3: Написать модуль**

`src/map/point-marks.ts`:

```ts
/**
 * Знаки крайних точек и их цели нажатия.
 *
 * У точки нет контура вовсе, поэтому целью может быть только знак — тот же
 * приём, что у озера: знак стоит на настоящем месте, а цель нажатия может от
 * него отойти, если соседняя ближе диаметра цели.
 */
import { spreadHitTargets, TARGET_DIAMETER_UNITS } from './city-hit-targets';
import { POINT_MARKS } from './physical-geometry';

export type PointMark = {
  readonly featureId: string;
  readonly x: number;
  readonly y: number;
  readonly hitX: number;
  readonly hitY: number;
  readonly radius: number;
};

export function pointMarks(zoom: number): readonly PointMark[] {
  const targets = spreadHitTargets(
    POINT_MARKS.map((mark) => ({ id: mark.featureId, x: mark.x, y: mark.y })),
    TARGET_DIAMETER_UNITS / zoom,
  );

  return targets.map((target) => ({
    featureId: target.id,
    x: target.x,
    y: target.y,
    hitX: target.hitX,
    hitY: target.hitY,
    radius: target.radius,
  }));
}
```

- [ ] **Шаг 4: Тест на порядок попадания**

В `src/map/physical-hit.test.ts`:

```ts
/*
 * Джомолунгма лежит внутри Гималаев, а те — внутри нагорья. По правилу
 * «побеждает меньший» знак обязан опередить обе формы.
 */
it('крайняя точка побеждает форму, на которой стоит', () => {
  const everest = POINT_MARKS.find((mark) => mark.featureId === 'everest')!;

  expect(physicalTargetAt(everest.x, everest.y, 1)).toBe('everest');
});
```

Импорт `POINT_MARKS` — из `./physical-geometry`.

- [ ] **Шаг 5: Поставить точку первой в правиле**

В `src/map/physical-hit.ts`, в начало `physicalTargetAt`, до озёр:

```ts
  for (const mark of pointMarks(zoom)) {
    if (Math.hypot(x - mark.hitX, y - mark.hitY) <= mark.radius) {
      return mark.featureId;
    }
  }
```

и правило в шапке модуля дописать: «знак крайней точки, потом знак озера, потом
река, потом форма (меньшая по площади), потом регион».

- [ ] **Шаг 6: Проверить**

```bash
npx vitest run src/map/point-marks.test.ts src/map/physical-hit.test.ts
```

Ожидается: зелено, включая прежний тест «каждая форма достаётся себе».

- [ ] **Шаг 7: Коммит**

```bash
git add src/map
git commit -m "feat: крайняя точка побеждает форму, на которой стоит"
```

---

### Задача 4: Знаки на карте

**Файлы:** `src/map/PhysicalLayer.tsx`, `src/map/PhysicalLayer.test.tsx`,
`src/styles.css`, `src/design/tokens.css`

- [ ] **Шаг 1: Написать падающий тест**

В `src/map/PhysicalLayer.test.tsx`:

```ts
it('крайние точки нарисованы знаками и названы читалке экрана', () => {
  const { container } = renderLayer();

  const marks = container.querySelectorAll('.point-mark');

  expect(marks).toHaveLength(2);
  expect(
    container.querySelector('[data-feature-id="everest"] .point-mark-shape'),
  ).not.toBeNull();
});
```

Точные имена узлов и способ отрисовки возьмите у озёр в этом же файле: у них
знак, невидимая цель и подпись устроены так же.

- [ ] **Шаг 2: Нарисовать знаки**

В `src/map/PhysicalLayer.tsx`, рядом с озёрами: группа `.point-mark` на каждую
точку, внутри — треугольник, цель нажатия и подпись.

```tsx
const POINT_MARK_RADIUS = 3;

/** Треугольник вершины: вверх. Впадина — тот же знак, перевёрнутый. */
function trianglePath(x: number, y: number, up: boolean): string {
  const r = POINT_MARK_RADIUS;
  const dy = up ? -r : r;

  return `M ${x} ${y + dy} L ${x + r * 0.92} ${y - dy * 0.7} L ${x - r * 0.92} ${y - dy * 0.7} Z`;
}
```

Заливка: у вершины — тон бумаги с обводкой тушью, у впадины — тушь. Оба тона
уже есть токенами (`--surface-paper-bright`, `--map-label`); новых заводить не
нужно. Клавиатура, `aria-label` вида `«Джомолунгма, 珠穆朗玛峰»`, `tabIndex` и
`onKeyDown` — как у озера.

- [ ] **Шаг 3: Проверить**

```bash
npx vitest run src/map/PhysicalLayer.test.tsx
```

Ожидается: новый тест зелёный; прежние счётчики подписей поднимите на два.

- [ ] **Шаг 4: Коммит**

```bash
git add src/map src/styles.css
git commit -m "feat: знаки вершины и впадины на физической карте"
```

---

### Задача 5: Проверки карты

**Файлы:** `src/map/validate-map.ts`, `src/map/validate-map.test.ts`,
`scripts/validate-map.ts`

- [ ] **Шаг 1: Написать падающий тест**

В `src/map/validate-map.test.ts`, рядом с проверками озёр:

```ts
it('ловит знак крайней точки вне заявленного региона', () => {
  const peak: PhysicalFeature = {
    id: 'lonely-peak',
    kind: 'point',
    nameRu: 'Одинокая',
    nameZh: '孤峰',
    pinyin: 'Gū Fēng',
    point: 'peak',
    neId: 1,
    regionIds: ['qinghai'],
    facts: [],
    sourceIds: ['natural-earth-elevation-points-5.1.2'],
  };

  expect(() =>
    validatePhysicalGeometry(
      [peak],
      physicalGeometry({ pointMarks: new Map([['lonely-peak', [500, 500] as Point]]) }),
      shapes,
    ),
  ).toThrow(/lonely-peak/);
});
```

- [ ] **Шаг 2: Расширить геометрию и проверку**

`PhysicalGeometry` получает `pointMarks: ReadonlyMap<string, Point>`; помощник
`physicalGeometry` в тесте — пустую карту по умолчанию. В
`validatePhysicalGeometry` для `feature.kind === 'point'`:

- знак есть, иначе «Нет знака у точки …»;
- знак внутри рамки карты (общая проверка уже есть, ей нужна геометрия точки —
  верните из `pointsOf` кольцо из одной точки);
- знак на суше — тем же `geometry.landRings`;
- заявленный регион задет — общей проверкой касания, которая уже работает по
  вершинам геометрии.

- [ ] **Шаг 3: Передать знаки из скрипта**

В `scripts/validate-map.ts`:

```ts
    pointMarks: new Map(
      POINT_MARKS.map((mark) => [mark.featureId, [mark.x, mark.y] as Point]),
    ),
```

- [ ] **Шаг 4: Проверить**

```bash
npm test && npm run build
```

Ожидается: `validate:content` печатает «физических целей: 34».

- [ ] **Шаг 5: Коммит**

```bash
git add src/map scripts/validate-map.ts
git commit -m "feat: проверка знаков крайних точек"
```

---

### Задача 6: Атлас, снимки и документы

**Файлы:** `src/features/atlas/AtlasPage.tsx`,
`scripts/data/collection-photos.json`, `src/content/collections.ts`,
`CHANGELOG.md`, `DECISIONS.md`, `docs/sources/physical.md`

- [ ] **Шаг 1: Перечисление родов в атласе**

В `src/features/atlas/AtlasPage.tsx` строка вида «реки, формы рельефа и озёра»
становится «реки, формы рельефа, озёра и крайние точки»; счёт в ней уже
считается сам. Поправьте и ожидание в `src/features/atlas/AtlasPage.test.tsx`.

- [ ] **Шаг 2: Снимки двух коллекций**

Выберите по кадру на Викискладе (заглавный снимок статьи Википедии, если он о
самом предмете), допишите в `scripts/data/collection-photos.json` ключи
`feature-everest` и `feature-turpan-depression`, запустите:

```bash
npm run fetch:photos
```

и добавьте подписи в `FEATURE_PHOTOS` (`src/content/collections.ts`) по
описаниям файлов.

- [ ] **Шаг 3: Проверка глазами**

```bash
npm run dev
```

Атлас → «Физическая»: знаки видно, наведение называет точку, нажатие открывает
карточку с высотой; обход с клавиатуры доходит до обеих. Раунд «Найти объект» с
набором «И озёра с крайними точками» спрашивает 34 объекта.

- [ ] **Шаг 4: Документы**

`CHANGELOG.md` — о двух целях и новом роде; `DECISIONS.md` — о том, что высота
идёт фактом, а род читается формой знака; `docs/sources/physical.md` — о наборе
точек высот.

- [ ] **Шаг 5: Полная проверка и коммит**

```bash
npm run lint && npm test && npm run build
```

```bash
git add -A
git commit -m "docs: крайние точки страны"
```
