# Восемь форм рельефа и правило попадания — план шага 1

> **Для исполнителя:** ОБЯЗАТЕЛЬНЫЙ ПОДНАВЫК: `superpowers:executing-plans`. Шаги
> помечены `- [ ]` — отмечайте по ходу.

**Цель:** починить правило «побеждает меньший объект» на физической карте и
довести её с 24 целей до 32, назвав восемь форм рельефа, которые уже лежат в
бандле безымянными.

**Устройство:** порядок проверки целей отделяется от порядка рисования —
рисуются крупные первыми, проверяются мелкие. Подпись формы перестаёт быть
серединой её вписанной окружности и становится серединой наибольшего круга,
который лежит внутри формы, на суше Китая и вне вложенных спрашиваемых целей.
Восемь форм получают имя строкой в `SHAPE_FEATURE_IDS`, запись в справочнике и
2–3 факта с источником.

**Инструменты:** TypeScript, React 19, Vite (rolldown), Vitest 4, Testing
Library. Геометрия — Natural Earth через выжимку `scripts/data/physical-source.json`
(сеть в этом шаге не нужна: выжимка уже в репозитории).

## Общие ограничения

- Интерфейс, задания и сообщения об ошибках — по-русски; китайские названия в
  Unicode, не только пиньинем.
- Каждый факт имеет источник в реестре `src/content/sources.ts` и запись в
  `docs/sources/sources.md`. Факт без источника не пишется.
- Домен не вызывает `Math.random`; компоненты не трогают `localStorage`; UI не
  знает ключей SVG; карта не считает правильность ответа.
- Сгенерированные файлы (`src/map/physical-geometry.ts`,
  `src/map/relief-bands.ts`, `src/map/region-palette.ts`) руками не правятся —
  только через генератор.
- Новый иероглиф в контенте ломает сборку: после правки контента —
  `npm run generate:fonts`.
- Работа идёт в ветке `feat/physical-objects` (уже создана, в ней лежит спек).
- Проверки перед слиянием: `npm run lint`, `npm test`, `npm run build`.
- Спек: `docs/superpowers/specs/2026-08-28-physical-objects-design.md`.

## Файлы

| Файл | Ответственность |
| --- | --- |
| `src/map/svg-path.ts` | площадь многоугольника и наибольший свободный круг |
| `src/map/land-rings.ts` | разбор колец суши из разметки — новый, чтобы им пользовались и скрипты |
| `src/map/land.ts` | те же кольца для приложения: `?raw`-импорт плюс разбор |
| `src/map/physical-hit.ts` | порядок проверки целей |
| `scripts/generate-physical-geometry.ts` | подпись формы по свободному кругу |
| `scripts/data/relief-steps.ts` | какие формы спрашиваются |
| `src/content/physical-features.ts` | восемь записей и их факты |
| `src/content/sources.ts`, `docs/sources/sources.md` | новые источники |
| `src/map/validate-map.ts`, `scripts/validate-map.ts` | проверка подписи и свободного круга |
| `scripts/data/collection-photos.json` | восемь новых снимков |

---

### Задача 1: Площадь многоугольника

**Файлы:**
- Изменить: `src/map/svg-path.ts`
- Тест: `src/map/svg-path.test.ts`

**Интерфейсы:**
- Отдаёт: `polygonArea(rings: readonly Point[][]): number` — площадь всех колец
  в единицах карты, знак обхода не важен.

- [ ] **Шаг 1: Написать падающий тест**

В конец `src/map/svg-path.test.ts`:

```ts
describe('polygonArea', () => {
  it('считает площадь квадрата', () => {
    const square: Point[][] = [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ];

    expect(polygonArea(square)).toBeCloseTo(100);
  });

  /* Кольцо без повтора первой точки — обычное дело в разобранном пути. */
  it('замыкает кольцо сам', () => {
    const open: Point[][] = [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
    ];

    expect(polygonArea(open)).toBeCloseTo(100);
  });

  it('не зависит от направления обхода', () => {
    const clockwise: Point[][] = [
      [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
      ],
    ];

    expect(polygonArea(clockwise)).toBeCloseTo(100);
  });

  it('складывает кольца', () => {
    const two: Point[][] = [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
      [
        [20, 20],
        [24, 20],
        [24, 24],
        [20, 24],
      ],
    ];

    expect(polygonArea(two)).toBeCloseTo(116);
  });
});
```

Импорт `polygonArea` добавьте к уже существующему импорту из `./svg-path`.

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
npx vitest run src/map/svg-path.test.ts
```

Ожидается: `polygonArea is not a function` — экспорта ещё нет.

- [ ] **Шаг 3: Написать реализацию**

В `src/map/svg-path.ts`, рядом с `boundingBox`:

```ts
/**
 * Площадь всех колец контура в единицах карты.
 *
 * Нужна порядку попадания: из двух форм, накрывших точку, побеждает меньшая
 * (`physical-hit.ts`). Вписанная окружность для этого не годится — у
 * Хэсийского коридора она мала, а накрывает он полосу в полстраны.
 *
 * Знак обхода не важен: у каждого кольца берётся модуль. Вложенных колец
 * («дырок») у форм рельефа нет — они пришли из Natural Earth отдельными
 * контурами.
 */
export function polygonArea(rings: readonly Point[][]): number {
  return rings.reduce((total, ring) => {
    let sum = 0;

    for (let index = 0; index < ring.length; index += 1) {
      const [x1, y1] = ring[index];
      const [x2, y2] = ring[(index + 1) % ring.length];
      sum += x1 * y2 - x2 * y1;
    }

    return total + Math.abs(sum) / 2;
  }, 0);
}
```

- [ ] **Шаг 4: Убедиться, что тест проходит**

```bash
npx vitest run src/map/svg-path.test.ts
```

Ожидается: все тесты файла зелёные.

- [ ] **Шаг 5: Коммит**

```bash
git add src/map/svg-path.ts src/map/svg-path.test.ts
git commit -m "feat: площадь многоугольника для правила «побеждает меньший»"
```

---

### Задача 2: Порядок попадания — побеждает меньший по площади

**Файлы:**
- Изменить: `src/map/physical-hit.ts`
- Тест: `src/map/physical-hit.test.ts`

**Интерфейсы:**
- Берёт: `polygonArea` из задачи 1.
- Отдаёт: прежний `physicalTargetAt(x, y, zoom): string | null`, но из
  накрывших точку форм возвращает наименьшую по площади.

- [ ] **Шаг 1: Написать падающий тест**

В `src/map/physical-hit.test.ts`:

```ts
/*
 * Ревью 2026-08-28: правило «побеждает меньший» между формами не выполнялось.
 * Порядок проверки совпадал с порядком рисования, а рисуются крупные первыми,
 * чтобы нагорье не закрасило вложенное, — и нажатие по Куньлуню доставалось
 * Тибетскому нагорью. С клавиатуры оба отвечали верно, поэтому дефект дожил до
 * браузера.
 */
it('вложенная форма побеждает накрывающую', () => {
  const kunlun = RELIEF_SHAPES.find((shape) => shape.featureId === 'kunlun')!;

  expect(physicalTargetAt(kunlun.labelX!, kunlun.labelY!, 1)).toBe('kunlun');
});
```

Если в файле ещё нет импорта `RELIEF_SHAPES`, добавьте
`import { RELIEF_SHAPES } from './physical-geometry';`.

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
npx vitest run src/map/physical-hit.test.ts
```

Ожидается: `expected 'tibetan-plateau' to be 'kunlun'`.

- [ ] **Шаг 3: Написать реализацию**

В `src/map/physical-hit.ts` заменить построение `SHAPE_HITS` и его тип:

```ts
type ShapeHit = {
  readonly featureId: string;
  readonly rings: Point[][];
  readonly box: BoundingBox;
  readonly area: number;
};

/**
 * Только спрашиваемые формы: остальные заливают фон, имени на экране не имеют
 * и целью быть не могут. Габарит считается один раз — внутри рамки точки
 * оказывается одна-две формы, и вхождение считается только для них.
 *
 * Порядок — по площади вверх, и это не то же, что порядок рисования.
 * Рисуются крупные первыми, иначе Тибетское нагорье закрасило бы вложенную
 * Цайдамскую котловину; проверяются мелкие первыми, иначе нагорье забирает
 * нажатие по Куньлуню. Одно правило, названное словами: побеждает меньший.
 */
const SHAPE_HITS: readonly ShapeHit[] = RELIEF_SHAPES.filter(
  (shape) => shape.featureId !== undefined,
)
  .map((shape) => {
    const rings = parseMapPath(shape.d);

    return {
      featureId: shape.featureId!,
      rings,
      box: boundingBox(rings),
      area: polygonArea(rings),
    };
  })
  .sort((left, right) => left.area - right.area);
```

Добавьте `polygonArea` к импорту из `./svg-path`.

- [ ] **Шаг 4: Убедиться, что тест проходит**

```bash
npx vitest run src/map/physical-hit.test.ts
```

Ожидается: все тесты файла зелёные.

- [ ] **Шаг 5: Прогнать весь набор**

```bash
npm test
```

Ожидается: 775 тестов и новые из задач 1–2 зелёные.

- [ ] **Шаг 6: Коммит**

```bash
git add src/map/physical-hit.ts src/map/physical-hit.test.ts
git commit -m "fix: на физической карте побеждает меньшая форма, а не первая нарисованная"
```

---

### Задача 3: Подпись формы — свободный круг внутри Китая

**Файлы:**
- Создать: `src/map/land-rings.ts`, `src/map/land-rings.test.ts`
- Изменить: `src/map/land.ts`, `src/map/svg-path.ts`, `src/map/svg-path.test.ts`,
  `scripts/generate-physical-geometry.ts`, `src/map/validate-map.ts`,
  `src/map/validate-map.test.ts`, `scripts/validate-map.ts`,
  `src/map/physical-hit.test.ts`, `src/map/physical-geometry.ts` (генератором)

**Зачем.** Подпись сейчас — середина вписанной окружности всей формы. У
Тянь-Шаня она стоит на 44, 222, у Гималаев — на 58, 375: обе вне суши Китая,
над Киргизией и Непалом. Нажатие там не даёт ничего (`isOnLand` отсекает), и
имя показывается над чужой территорией. Вторая причина — вложенность: когда в
задаче 5 Такла-Макан станет целью, середина Таримской впадины окажется внутри
него, и подпись впадины встала бы над чужой целью.

**Интерфейсы:**
- Отдаёт: `parseLandRings(markup: string): Point[][]`;
  `largestFreeCircle(rings, options): InscribedCircle`, где
  `options = { nested?: readonly (readonly Point[][])[]; isAllowed?: (x: number, y: number) => boolean; step?: number }`.
- Берёт: `polygonArea` из задачи 1.

- [ ] **Шаг 1: Написать падающий тест разбора колец**

Создать `src/map/land-rings.test.ts`:

```ts
import { expect, it } from 'vitest';
import { parseLandRings } from './land-rings';

it('берёт кольца из всех контуров разметки', () => {
  const markup = `
    <svg>
      <path id="a" d="M 0 0 L 10 0 L 10 10 Z" />
      <path id="b" d="M 20 20 L 30 20 L 30 30 Z" />
      <circle cx="5" cy="5" r="2" />
    </svg>
  `;

  expect(parseLandRings(markup)).toHaveLength(2);
});

/* Выноски Макао и Гонконга — кружки и линии, сушей они не являются. */
it('не берёт ничего, кроме контуров', () => {
  const markup = '<svg><circle cx="5" cy="5" r="2" /></svg>';

  expect(parseLandRings(markup)).toEqual([]);
});
```

- [ ] **Шаг 2: Убедиться, что тест падает**

```bash
npx vitest run src/map/land-rings.test.ts
```

Ожидается: `Failed to resolve import "./land-rings"`.

- [ ] **Шаг 3: Написать модуль и переключить на него `land.ts`**

Создать `src/map/land-rings.ts`:

```ts
/**
 * Разбор колец суши из разметки карты.
 *
 * Отдельно от `land.ts` по одной причине: тот подставляет саму разметку
 * `?raw`-импортом, а это умеет только сборка. Генератору и проверкам разметка
 * приходит чтением файла, а разбор нужен тот же самый — иначе у приложения и
 * у генератора разойдётся понятие суши.
 *
 * Контуром в разметке записана только область: выноски Макао и Гонконга и
 * цели нажатия мелких областей — круги, линии и подписи. Поэтому отбор идёт по
 * тегу, а не по признаку.
 */
import { parseMapPath, type Point } from './svg-path';

export function parseLandRings(markup: string): Point[][] {
  return [...markup.matchAll(/<path\b([\s\S]*?)\/>/g)].flatMap((match) => {
    const d = /\sd="([\s\S]*?)"/.exec(match[1])?.[1];

    return d === undefined ? [] : parseMapPath(d);
  });
}
```

В `src/map/land.ts` заменить тело `LAND_RINGS` на вызов:

```ts
import mapMarkup from '../../public/maps/china-provinces.svg?raw';
import { parseLandRings } from './land-rings';
import { containsPoint, type Point } from './svg-path';

/**
 * Кольца всех областей одним списком. Разбор живёт в `land-rings.ts`: тем же
 * разбором пользуются генератор и проверки, у которых `?raw`-импорта нет.
 *
 * Правило чётности здесь то же, что у `containsPoint`: области не
 * накладываются друг на друга, а острова лежат рядом с материком, а не внутри
 * него, — взаимного погашения не возникает.
 */
export const LAND_RINGS: readonly Point[][] = parseLandRings(mapMarkup);
```

Шапку файла (комментарий о том, зачем нужны кольца) оставьте на месте.

- [ ] **Шаг 4: Убедиться, что тесты проходят**

```bash
npx vitest run src/map/land-rings.test.ts src/map/physical-hit.test.ts
```

Ожидается: зелено в обоих файлах.

- [ ] **Шаг 5: Написать падающий тест свободного круга**

В `src/map/svg-path.test.ts`:

```ts
describe('largestFreeCircle', () => {
  const square: Point[][] = [
    [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
  ];

  it('без ограничений совпадает с вписанной окружностью', () => {
    const circle = largestFreeCircle(square, {});

    expect(circle.radius).toBeCloseTo(50, 0);
    expect(circle.x).toBeCloseTo(50, 0);
  });

  /* Вложенная цель забирает середину: круг уходит от неё в сторону. */
  it('обходит вложенный контур', () => {
    const middle: Point[][] = [
      [
        [30, 30],
        [70, 30],
        [70, 70],
        [30, 70],
      ],
    ];

    const circle = largestFreeCircle(square, { nested: [middle] });

    expect(circle.radius).toBeLessThan(30);
    expect(
      circle.x < 30 || circle.x > 70 || circle.y < 30 || circle.y > 70,
    ).toBe(true);
  });

  /* Середина может оказаться вне суши: тогда круг ищется там, где суша есть. */
  it('ставит середину только в разрешённой точке', () => {
    const circle = largestFreeCircle(square, {
      isAllowed: (x) => x > 60,
    });

    expect(circle.x).toBeGreaterThan(60);
  });
});
```

- [ ] **Шаг 6: Убедиться, что тест падает**

```bash
npx vitest run src/map/svg-path.test.ts
```

Ожидается: `largestFreeCircle is not a function`.

- [ ] **Шаг 7: Написать реализацию**

В `src/map/svg-path.ts` заменить `largestInscribedCircle` на пару: общий поиск
и прежнее имя поверх него.

```ts
export type FreeCircleOptions = {
  /** Вложенные цели: их середина занята, и круг обязан их обойти. */
  readonly nested?: readonly (readonly Point[][])[];
  /** Где середине стоять можно. По умолчанию — где угодно внутри контура. */
  readonly isAllowed?: (x: number, y: number) => boolean;
  readonly step?: number;
};

/**
 * Наибольший круг, который лежит внутри контура, не задевает вложенные цели и
 * стоит серединой там, где разрешено.
 *
 * Поиск по сетке с двумя уточняющими проходами: точное решение здесь не нужно,
 * а погрешность в сотые доли единицы viewBox не влияет ни на порог, ни на
 * положение подписи. Порядок проверок в теле — от дешёвых к дорогим: `isAllowed`
 * зовётся последним, потому что за ним стоит обход всех колец суши.
 */
export function largestFreeCircle(
  rings: readonly Point[][],
  options: FreeCircleOptions,
): InscribedCircle {
  const { nested = [], isAllowed = () => true, step = 1 } = options;
  const box = boundingBox(rings);
  let best: InscribedCircle = {
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
    radius: -1,
  };

  for (let pass = 0; pass < 3; pass += 1) {
    const cellSize = step / 4 ** pass;
    const span = pass === 0 ? Number.POSITIVE_INFINITY : (step / 4 ** (pass - 1)) * 2;
    const fromX = pass === 0 ? box.minX : best.x - span;
    const toX = pass === 0 ? box.maxX : best.x + span;
    const fromY = pass === 0 ? box.minY : best.y - span;
    const toY = pass === 0 ? box.maxY : best.y + span;

    for (let x = fromX; x <= toX; x += cellSize) {
      for (let y = fromY; y <= toY; y += cellSize) {
        if (!containsPoint(rings, x, y)) {
          continue;
        }

        let radius = distanceToBoundary(rings, x, y);
        if (radius <= best.radius) {
          continue;
        }

        let insideNested = false;
        for (const hole of nested) {
          if (containsPoint(hole, x, y)) {
            insideNested = true;
            break;
          }

          radius = Math.min(radius, distanceToBoundary(hole, x, y));
        }

        if (insideNested || radius <= best.radius || !isAllowed(x, y)) {
          continue;
        }

        best = { x, y, radius };
      }
    }
  }

  if (best.radius < 0) {
    throw new Error('Контур без внутренних точек');
  }

  return best;
}

/**
 * Наибольшая вписанная окружность — «полюс недоступности» контура.
 *
 * Габариты для оценки нажимаемости не годятся: у Ганьсу габарит 162 единицы,
 * а сама область — узкий коридор. Вписанная окружность отвечает на вопрос, на
 * который габариты не отвечают: поместится ли сюда палец. Она же даёт лучшую
 * точку для подписи региона.
 */
export function largestInscribedCircle(
  rings: readonly Point[][],
  step = 1,
): InscribedCircle {
  return largestFreeCircle(rings, { step });
}
```

- [ ] **Шаг 8: Убедиться, что тесты проходят**

```bash
npx vitest run src/map/svg-path.test.ts
```

Ожидается: и новые тесты, и прежние тесты `largestInscribedCircle` зелёные.

- [ ] **Шаг 9: Научить генератор ставить подпись по свободному кругу**

В `scripts/generate-physical-geometry.ts` найти место, где считается подпись
формы (вызов `largestInscribedCircle` для форм с `featureId`), и заменить его
на свободный круг. Сушу генератор читает тем же файлом, что и `validate:map`:

```ts
import { readFileSync } from 'node:fs';
import { parseLandRings } from '../src/map/land-rings';
import {
  containsPoint,
  largestFreeCircle,
  polygonArea,
  type Point,
} from '../src/map/svg-path';

const landRings = parseLandRings(
  readFileSync(new URL('../public/maps/china-provinces.svg', import.meta.url), 'utf8'),
);

/**
 * Вложенные цели формы: спрашиваемые формы меньшей площади, целиком лежащие
 * внутри неё. Такла-Макан лежит в Таримской впадине, и середина впадины
 * принадлежит ему — по правилу «побеждает меньший» (`physical-hit.ts`).
 * Подпись впадины обязана уйти оттуда, иначе имя стоит над чужой целью.
 */
function nestedOf(
  shape: { readonly rings: Point[][]; readonly area: number },
  asked: readonly { readonly rings: Point[][]; readonly area: number }[],
): Point[][][] {
  return asked
    .filter(
      (other) =>
        other !== shape &&
        other.area < shape.area &&
        other.rings.flat().every(([x, y]) => containsPoint(shape.rings, x, y)),
    )
    .map((other) => other.rings);
}
```

Подпись каждой спрашиваемой формы:

```ts
const circle = largestFreeCircle(shape.rings, {
  nested: nestedOf(shape, askedShapes),
  isAllowed: (x, y) => containsPoint(landRings, x, y),
});
```

`askedShapes` — список спрашиваемых форм с посчитанными `rings` и
`area: polygonArea(rings)`; он строится один раз перед циклом записи.

- [ ] **Шаг 10: Перегенерировать геометрию**

```bash
npm run generate:physical
```

Ожидается: файл `src/map/physical-geometry.ts` перезаписан. Проверьте
`git diff --stat src/map/physical-geometry.ts`: меняются только `labelX`/`labelY`,
и заметно — у Тянь-Шаня (было 44, 222) и Гималаев (было 58, 375): обе подписи
переезжают внутрь Китая, примерно на 164, 200 и 68, 383.

- [ ] **Шаг 11: Написать проверку подписи**

В `src/map/validate-map.ts`, в `validatePhysicalGeometry`, в ветку
`feature.kind === 'landform'` добавить проверку подписи. Сигнатура
`PhysicalGeometry` получает поля подписи и кольца суши:

```ts
export type PhysicalGeometry = {
  readonly rivers: ReadonlyMap<string, Point[][]>;
  readonly landforms: ReadonlyMap<string, Point[][]>;
  readonly lakes: ReadonlyMap<string, Point[][]>;
  readonly lakeMarks: ReadonlyMap<string, Point>;
  /** Точка подписи формы: её ставит генератор, проверка её испытывает. */
  readonly shapeLabels: ReadonlyMap<string, Point>;
  readonly landRings: readonly Point[][];
};
```

Проверка:

```ts
    if (feature.kind === 'landform') {
      const circle = largestInscribedCircle(rings);
      const availablePx = unitsToPixels(circle.radius * 2, REFERENCE_MAP_WIDTH);
      if (availablePx < MIN_TARGET_PX) {
        errors.push(
          `Форма ${feature.id} меньше ${MIN_TARGET_PX} px: ${availablePx.toFixed(1)} px ` +
            `при ширине карты ${REFERENCE_MAP_WIDTH} px`,
        );
      }

      /*
       * Подпись формы обязана стоять там, куда можно нажать: внутри формы, на
       * суше Китая и не внутри вложенной цели. Прежде подпись Тянь-Шаня стояла
       * в Киргизии, а Гималаев — в Непале, и нажатие по ним не давало ничего.
       * Порог тот же, что у самой цели: подпись — это и есть место, куда
       * целятся.
       */
      const label = geometry.shapeLabels.get(feature.id);
      if (label === undefined) {
        errors.push(`Нет подписи у формы ${feature.id}`);
      } else if (!containsPoint(rings, label[0], label[1])) {
        errors.push(`Подпись формы ${feature.id} вне её контура`);
      } else if (!containsPoint(geometry.landRings as Point[][], label[0], label[1])) {
        errors.push(`Подпись формы ${feature.id} вне суши Китая`);
      } else {
        const free = unitsToPixels(
          distanceToBoundary(rings, label[0], label[1]) * 2,
          REFERENCE_MAP_WIDTH,
        );
        if (free < MIN_TARGET_PX) {
          errors.push(
            `У подписи формы ${feature.id} свободно ${free.toFixed(1)} px, нужно ${MIN_TARGET_PX}`,
          );
        }
      }
    }
```

Добавьте `distanceToBoundary` к импорту из `./svg-path`.

- [ ] **Шаг 12: Написать тест проверки**

В `src/map/validate-map.test.ts` — рядом с прочими тестами
`validatePhysicalGeometry`:

```ts
it('ловит подпись формы вне суши', () => {
  const geometry = physicalGeometryFixture();
  const broken = {
    ...geometry,
    shapeLabels: new Map([['tibetan-plateau', [-10, -10] as Point]]),
  };

  expect(() =>
    validatePhysicalGeometry([tibetanPlateauFixture], broken, shapesFixture),
  ).toThrow(/вне суши/);
});
```

Названия помощников (`physicalGeometryFixture`, `shapesFixture`,
`tibetanPlateauFixture`) возьмите те, что уже используются в этом файле, —
он построен на своих заготовках, новых заводить не нужно.

- [ ] **Шаг 13: Передать подписи и сушу из скрипта проверки**

В `scripts/validate-map.ts` при сборке объекта геометрии добавить два поля:

```ts
  shapeLabels: new Map(
    RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined).map((shape) => [
      shape.featureId!,
      [shape.labelX!, shape.labelY!] as Point,
    ]),
  ),
  landRings: parseLandRings(svg),
```

`svg` в этом файле уже прочитан (`readFileSync` в начале).

- [ ] **Шаг 14: Написать регрессионный тест «цель достаётся себе»**

В `src/map/physical-hit.test.ts`:

```ts
/*
 * Страховка от дефекта Гималаев: подпись стоит там, куда целятся, и нажатие в
 * неё обязано достаться той самой цели. Проверяются все спрашиваемые формы
 * разом — новая форма попадает под проверку сама, без правки теста.
 */
it('каждая форма достаётся себе в точке своей подписи', () => {
  const asked = RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined);

  expect(asked.length).toBeGreaterThan(0);

  for (const shape of asked) {
    expect(physicalTargetAt(shape.labelX!, shape.labelY!, 1)).toBe(
      shape.featureId,
    );
  }
});
```

- [ ] **Шаг 15: Прогнать проверки**

```bash
npm test && npm run build
```

Ожидается: тесты зелёные, сборка проходит (валидаторы карты и контента — до
компиляции).

- [ ] **Шаг 16: Коммит**

```bash
git add src/map scripts/generate-physical-geometry.ts scripts/validate-map.ts
git commit -m "fix: подпись формы — свободный круг внутри Китая, а не середина контура"
```

---

### Задача 4: Четыре формы канона

Монгольское плато, Юньнань-Гуйчжоуское плато, Джунгарская и Цайдамская
котловины. Ими закрываются 四大高原 и 四大盆地 — списки, которые в китайской
школе учат целиком.

**Файлы:**
- Изменить: `scripts/data/relief-steps.ts`, `src/content/physical-features.ts`,
  `src/content/sources.ts`, `docs/sources/sources.md`,
  `src/map/physical-geometry.ts` (генератором), `src/assets/fonts` (генератором)

**Интерфейсы:**
- Берёт: конструктор `landform(id, nameRu, nameZh, pinyin, step, shape, regionIds)`
  из `src/content/physical-features.ts` — он уже есть и не меняется.
- Отдаёт: цели `mongolian-plateau`, `yungui-plateau`, `junggar-basin`,
  `qaidam-basin`.

- [ ] **Шаг 1: Собрать факты по источникам**

Факты не выдумываются и не пишутся по памяти: каждый пересказывает прочитанную
статью, и у каждого свой `sourceIds`. «Британника» и БРЭ открываются только
браузером (`mcp__claude-in-chrome__navigate` + `get_page_text`), `WebFetch`
получает от них 403.

| Цель | Первый адрес | Если статьи нет |
| --- | --- | --- |
| `mongolian-plateau` | `https://www.britannica.com/place/Mongolian-Plateau` | `https://www.britannica.com/place/China/Relief` и `https://www.britannica.com/place/Inner-Mongolia` |
| `yungui-plateau` | `https://www.britannica.com/place/Yunnan-Guizhou-Plateau` | — статья есть, проверено 2026-08-28 |
| `junggar-basin` | `https://www.britannica.com/place/China/The-Junggar-Basin` | `https://www.britannica.com/place/Xinjiang` |
| `qaidam-basin` | `https://www.britannica.com/place/Qaidam-Basin` | — статья есть, проверено 2026-08-28 |

Правило отбора то же, что у прочих целей: 2–3 факта, каждый — о том, что видно
на карте или объясняет её (положение, размер, чем ограничен, чем known в
хозяйстве или истории). Заголовок факта — короткая тема, не пересказ.

Прецедент на случай, когда статьи нет: у Чаоху взяты статьи о Хэфэе и Аньхое,
и в `docs/sources/physical.md` записано, почему фактов два, а не три.

- [ ] **Шаг 2: Записать источники**

В `src/content/sources.ts` — по записи на каждую использованную статью:

```ts
  {
    id: 'britannica-qaidam-basin',
    title: 'Qaidam Basin',
    organization: 'Encyclopaedia Britannica',
    shortLabel: 'Britannica',
    url: 'https://www.britannica.com/place/Qaidam-Basin',
    accessedAt: '2026-08-28',
    covers: ['положение Цайдамской котловины', 'солёные озёра и полезные ископаемые'],
  },
```

И тем же порядком в `docs/sources/sources.md`:

```markdown
## britannica-qaidam-basin

- Название: Qaidam Basin
- Организация: Encyclopaedia Britannica
- URL: https://www.britannica.com/place/Qaidam-Basin
- Дата обращения: 2026-08-28
- Лицензия: ссылка используется как источник данных; текст не копируется, факты пересказаны своими словами.
- Подтверждает: положение Цайдамской котловины, её солёные озёра и полезные ископаемые.
```

`covers` и «Подтверждает» пишутся по тем фактам, которые вы действительно взяли.

- [ ] **Шаг 3: Написать факты и записи справочника**

В `src/content/physical-features.ts` — блоки фактов рядом с прочими:

```ts
const mongolianPlateauFacts: readonly Fact[] = [
  {
    title: '<короткая тема>',
    body: '<пересказ прочитанного, 1–3 предложения>',
    sourceIds: ['<id источника>'],
  },
  /* ещё один-два факта */
];
```

Те же блоки для `yunguiPlateauFacts`, `junggarBasinFacts`, `qaidamBasinFacts`,
и записи в `FACTS`:

```ts
  'mongolian-plateau': mongolianPlateauFacts,
  'yungui-plateau': yunguiPlateauFacts,
  'junggar-basin': junggarBasinFacts,
  'qaidam-basin': qaidamBasinFacts,
```

В массив `physicalFeatures` — четыре записи (регионы посчитаны по геометрии
2026-08-28 тем же правилом, которым их проверяет `validate:map`):

```ts
  landform(
    'mongolian-plateau',
    'Монгольское плато',
    '蒙古高原',
    'Ménggǔ Gāoyuán',
    2,
    'plateau',
    ['inner-mongolia'],
  ),
  landform(
    'yungui-plateau',
    'Юньнань-Гуйчжоуское плато',
    '云贵高原',
    'Yúnguì Gāoyuán',
    2,
    'plateau',
    ['yunnan', 'guizhou'],
  ),
  landform(
    'junggar-basin',
    'Джунгарская котловина',
    '准噶尔盆地',
    "Zhǔngá'ěr Péndì",
    2,
    'basin',
    ['xinjiang'],
  ),
  landform(
    'qaidam-basin',
    'Цайдамская котловина',
    '柴达木盆地',
    'Cháidámù Péndì',
    1,
    'basin',
    ['qinghai'],
  ),
```

- [ ] **Шаг 4: Разрешить формы к вопросу**

В `scripts/data/relief-steps.ts`, в `SHAPE_FEATURE_IDS`:

```ts
  'MONGOLIAN PLATEAU': 'mongolian-plateau',
  'YUNGUI PLATEAU': 'yungui-plateau',
  'Junggar Basin': 'junggar-basin',
  'Qaidam Basin': 'qaidam-basin',
```

- [ ] **Шаг 5: Перегенерировать геометрию и шрифты**

```bash
npm run generate:physical
npm run generate:fonts
```

Ожидается: в `physical-geometry.ts` у четырёх форм появились `featureId`,
`labelX`, `labelY`; в `scripts/font-coverage.json` — знаки 准, 噶, 柴 (остальные
знаки новых имён в подмножестве уже есть).

- [ ] **Шаг 6: Прогнать проверки**

```bash
npm test && npm run build
```

Ожидается: `validate:content` печатает «физических целей: 28»; тест «каждая
форма достаётся себе» зелёный; `validate:fonts` не жалуется.

- [ ] **Шаг 7: Коммит**

```bash
git add src scripts docs/sources/sources.md
git commit -m "content: четыре формы канона — плато и котловины"
```

---

### Задача 5: Равнина, пустыня и два рубежа

Северо-Восточная равнина (закрывает 三大平原), Такла-Макан, Тайханшань и
Хэсийский коридор.

**Файлы:** те же, что в задаче 4.

**Интерфейсы:**
- Отдаёт: цели `northeast-plain`, `taklamakan`, `taihang`, `hexi-corridor`.

- [ ] **Шаг 1: Собрать факты по источникам**

| Цель | Первый адрес | Если статьи нет |
| --- | --- | --- |
| `northeast-plain` | `https://www.britannica.com/place/Northeast-Plain` | `https://www.britannica.com/place/Manchuria` и `https://www.britannica.com/place/China/Relief` |
| `taklamakan` | `https://www.britannica.com/place/Takla-Makan-Desert` | — статья есть, проверено 2026-08-28 |
| `taihang` | `https://www.britannica.com/place/Taihang-Mountains` | — статья есть, проверено 2026-08-28 |
| `hexi-corridor` | `https://www.britannica.com/place/Hexi-Corridor` | — статья есть, проверено 2026-08-28 |

У Такла-Макана часть сведений уже подтверждена записью `britannica-tarim-basin`
(«Такла-Макан и Лобнор внутри неё») — если факт опирается на неё, новый
источник заводить не нужно.

- [ ] **Шаг 2: Записать источники**

Тем же порядком, что в задаче 4: запись в `src/content/sources.ts` и такой же
блок в `docs/sources/sources.md`. Пример для хребта:

```ts
  {
    id: 'britannica-taihang-mountains',
    title: 'Taihang Mountains',
    organization: 'Encyclopaedia Britannica',
    shortLabel: 'Britannica',
    url: 'https://www.britannica.com/place/Taihang-Mountains',
    accessedAt: '2026-08-28',
    covers: ['протяжённость Тайханшаня', 'рубеж между Шаньси и Хэбэем'],
  },
```

- [ ] **Шаг 3: Написать факты и записи справочника**

Блоки `northeastPlainFacts`, `taklamakanFacts`, `taihangFacts`,
`hexiCorridorFacts` по той же форме, что в задаче 4, записи в `FACTS` и четыре
записи в `physicalFeatures`:

```ts
  landform(
    'northeast-plain',
    'Северо-Восточная равнина',
    '东北平原',
    'Dōngběi Píngyuán',
    3,
    'plain',
    ['heilongjiang', 'jilin', 'liaoning'],
  ),
  landform(
    'taklamakan',
    'Такла-Макан',
    '塔克拉玛干沙漠',
    'Tǎkèlāmǎgān Shāmò',
    2,
    'desert',
    ['xinjiang'],
  ),
  landform(
    'taihang',
    'Тайханшань',
    '太行山',
    'Tàiháng Shān',
    2,
    'range',
    ['hebei', 'shanxi', 'henan'],
  ),
  landform(
    'hexi-corridor',
    'Хэсийский коридор',
    '河西走廊',
    'Héxī Zǒuláng',
    2,
    'plain',
    ['gansu'],
  ),
```

Род коридора — `plain`: это полоса равнины между Циляньшанем и Гоби, а не
хребет и не котловина.

- [ ] **Шаг 4: Разрешить формы к вопросу**

В `SHAPE_FEATURE_IDS`:

```ts
  'MANCHURIAN PLAIN': 'northeast-plain',
  'TAKLIMAKAN DESERT': 'taklamakan',
  'Taihang Mts.': 'taihang',
  'Hexi Corridor': 'hexi-corridor',
```

- [ ] **Шаг 5: Перегенерировать геометрию и шрифты**

```bash
npm run generate:physical
npm run generate:fonts
```

Ожидается: подпись Таримской впадины переехала — Такла-Макан стал целью и
забрал середину; впадина получила подпись в свободной части, около 190, 249.
Это и есть работа свободного круга из задачи 3.

- [ ] **Шаг 6: Прогнать проверки**

```bash
npm test && npm run build
```

Ожидается: «физических целей: 32», все тесты зелёные.

- [ ] **Шаг 7: Коммит**

```bash
git add src scripts docs/sources/sources.md
git commit -m "content: равнина, пустыня и два рубежа на физической карте"
```

---

### Задача 6: Снимки восьми новых коллекций

Каждая физическая цель заводит страницу коллекции сама (`featureCollection` в
`src/content/collections.ts`), значит появилось восемь страниц без снимка.

**Файлы:**
- Изменить: `scripts/data/collection-photos.json`, `src/content/collections.ts`
- Перезаписываются генератором: `public/photos`, `src/content/photo-credits.ts`,
  `docs/sources/photos.md`

- [ ] **Шаг 1: Выбрать по кадру на цель**

Для каждой из восьми целей открыть статью русской Википедии об объекте и взять
имя файла заглавного снимка (`File:...`). Так выбраны все прежние 24 (решение
2026-08-27): заглавный кадр выбирают редакторы статьи, а не совпадение слов в
поиске. Кадр посмотреть глазами: у Чаоху заглавным приезжала гостиница на улице
Чаоху, а не озеро.

- [ ] **Шаг 2: Дописать манифест**

В `scripts/data/collection-photos.json`, в объект `photos`:

```json
  "feature-mongolian-plateau": "File:<имя файла с Викисклада>",
  "feature-yungui-plateau": "File:<имя файла>",
  "feature-junggar-basin": "File:<имя файла>",
  "feature-qaidam-basin": "File:<имя файла>",
  "feature-northeast-plain": "File:<имя файла>",
  "feature-taklamakan": "File:<имя файла>",
  "feature-taihang": "File:<имя файла>",
  "feature-hexi-corridor": "File:<имя файла>"
```

- [ ] **Шаг 3: Скачать снимки**

```bash
npm run fetch:photos
```

Ожидается: в `public/photos` появились файлы по 1200 и 640 px,
`src/content/photo-credits.ts` и `docs/sources/photos.md` перезаписаны с
автором и лицензией каждого кадра.

- [ ] **Шаг 4: Подписать кадры**

В `src/content/collections.ts`, в `FEATURE_PHOTOS`, добавить по записи:

```ts
  'mongolian-plateau': {
    id: 'feature-mongolian-plateau',
    subject: '<что на кадре>',
    captionRu: '<подпись по описанию файла на Викискладе>',
    captionZh: '<иероглифами, если название на кадре есть>',
    place: '<где снято>',
  },
```

Подписи пишутся по описанию файла, а не по догадке: подпись к снимку, которого
не видел, учит вернее всего неверному.

- [ ] **Шаг 5: Прогнать проверки**

```bash
npm test && npm run build
```

Ожидается: зелено; `validate:content` не жалуется на коллекции.

- [ ] **Шаг 6: Коммит**

```bash
git add scripts/data/collection-photos.json src/content public/photos docs/sources/photos.md
git commit -m "content: снимки восьми новых объектов физической географии"
```

---

### Задача 7: Проверка глазами и документы

**Файлы:**
- Изменить: `CHANGELOG.md`, `DECISIONS.md`, `docs/sources/physical.md`

- [ ] **Шаг 1: Посмотреть карту в браузере**

Запустить предпросмотр и открыть атлас → «Физическая».

```bash
npm run dev
```

Проверить руками:

1. Нажатие по Гималаям открывает карточку Гималаев, а не Тибетского нагорья.
2. Нажатие по Куньлуню открывает Куньлунь.
3. Подписи Тянь-Шаня и Гималаев стоят внутри Китая.
4. Все восемь новых форм открываются нажатием и называются по-русски и
   иероглифами.
5. Нажатие в середину Таримской впадины открывает Такла-Макан, а по краю
   впадины — саму впадину.
6. Обход с клавиатуры доходит до каждой новой цели.

- [ ] **Шаг 2: Записать изменение в CHANGELOG**

В `CHANGELOG.md`, в `[Unreleased]`, в `### Added` — о восьми целях; в
`### Fixed` — о правиле попадания и подписях. Формулировки — по существу, а не
по названиям файлов.

- [ ] **Шаг 3: Записать решения**

В `DECISIONS.md` — запись о том, что порядок проверки целей отделён от порядка
рисования, и о правиле подписи (свободный круг внутри Китая). В
`docs/sources/physical.md` — о новых целях и о том, откуда взяты их факты.

- [ ] **Шаг 4: Полная проверка**

```bash
npm run lint && npm test && npm run build
```

Ожидается: линтер молчит, все тесты зелёные, сборка проходит.

- [ ] **Шаг 5: Коммит**

```bash
git add CHANGELOG.md DECISIONS.md docs/sources/physical.md
git commit -m "docs: восемь форм рельефа и правило попадания"
```

---

## После плана

Шаг 1 закончен: 32 цели, правило попадания названо словами и выполняется.
Дальше по спеку — шаг 2 (крайние точки) и шаг 3 (моря), каждый своим планом.
