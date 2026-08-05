# Физическая карта: справочник и геометрия — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Завести справочник из шести рек и шести форм рельефа, получить их геометрию в системе координат карты и закрыть её проверками на сборке — до того, как появится хоть один экран.

**Architecture:** Три слоя, разделённые намеренно. `src/content/physical-features.ts` знает имена, регионы и номера отрезков в Natural Earth, но не знает координат. `scripts/` добывает геометрию: выжимка из чужого набора коммитится, генератор склеивает отрезки, упрощает, проецирует и пишет `src/map/physical-geometry.ts`. `src/map/polyline.ts` — чистая геометрия ломаных, общая для генератора и будущего слоя карты. Проверки живут там же, где уже проверяются города: `validate:content` для справочника, `validate:map` для геометрии.

**Tech Stack:** TypeScript, Vite, Vitest, tsx. Никаких новых зависимостей.

**Область.** Это **шаг 1 из трёх** в `docs/superpowers/specs/2026-08-05-physical-map-design.md`. Здесь нет ни вида карты `physical`, ни игр, ни карточек на главной: приложение после этого плана выглядит ровно как до него. Шаги 2 и 3 получат свой план — и получат его после, а не сейчас, потому что два их главных решения зависят от чисел, которых до запуска генератора не существует: сколько точек останется в линиях после упрощения (от этого зависит, считать ли ближайшую реку на каждое движение мыши) и поместится ли четвёртая пара красок в окно светлоты `tokens.css`.

**Критерий готовности плана:** `npm run build` и `npm test` проходят, двенадцать объектов подтверждены геометрией карты, ни одного нового пикселя на экране.

## Global Constraints

- Интерфейс, задания и сообщения об ошибках — на русском; китайские названия в Unicode, не только пиньинем.
- Геоданные и тексты имеют источник в `docs/sources` (`AGENTS.md`). Числа без источника в справочник не пишутся.
- Домен не вызывает `Math.random`; компоненты не обращаются к `localStorage` напрямую.
- `src/content` не зависит от файла карты: там имена и факты, координаты — в `src/map`.
- Сгенерированные файлы правятся только генератором и несут шапку «СГЕНЕРИРОВАННЫЙ ФАЙЛ».
- Полная проверка — `npm run build` (`validate:map`, `validate:content`, `validate:fonts`, затем `tsc -b`, затем сборка). Тесты — `npm test`. Линтер — `npm run lint`.
- Новый иероглиф в контенте ломает сборку: после правки справочника обязателен `npm run generate:fonts`.
- Каждая задача заканчивается коммитом. Ветка — `feat/physical-map-rivers` (уже создана).

## Карта файлов

| Файл | Ответственность |
| --- | --- |
| `src/content/types.ts` | типы `ReliefStep`, `PhysicalFeature` рядом с `City` и `Region` |
| `src/content/physical-features.ts` | **новый**: двенадцать целей — имена, регионы, номера отрезков |
| `src/content/sources.ts` | два новых источника Natural Earth |
| `src/domain/validate-catalog.ts` | `validatePhysicalFeatures` рядом с `validateCities` |
| `src/map/svg-path.ts` | `distanceToSegment` перестаёт быть внутренней |
| `src/map/polyline.ts` | **новый**: расстояние до ломаной, упрощение, обрезка по рамке, запись пути |
| `src/map/physical-geometry.ts` | **новый, сгенерированный**: пути форм и рек в единицах viewBox |
| `src/map/validate-map.ts` | `validatePhysicalGeometry` рядом с `validateCityPlacement` |
| `scripts/data/relief-steps.ts` | **новый**: разметка 38 форм по ступеням |
| `scripts/data/physical-source.json` | **новый, коммитится**: выжимка из Natural Earth |
| `scripts/extract-physical-source.ts` | **новый**: скачивает наборы и пишет выжимку (в сборку не входит) |
| `scripts/physical-assembly.ts` | **новый**: склейка отрезков в цепь |
| `scripts/generate-physical-geometry.ts` | **новый**: выжимка → `src/map/physical-geometry.ts` |
| `docs/sources/physical.md` | **новый**: источники, лицензии, что сделано с данными |

---

### Task 1: Справочник из двенадцати целей

**Files:**
- Modify: `src/content/types.ts`
- Create: `src/content/physical-features.ts`
- Modify: `src/content/sources.ts`
- Modify: `src/domain/validate-catalog.ts`
- Modify: `scripts/validate-content.ts`
- Test: `src/domain/validate-physical.test.ts`
- Regenerate: `src/assets/fonts/*.woff2`, `scripts/font-coverage.json`

**Interfaces:**
- Produces: `ReliefStep = 1 | 2 | 3`, `PhysicalKind = 'river' | 'landform'`, `PhysicalFeature` — из `src/content/types.ts`.
- Produces: `physicalFeatures: readonly PhysicalFeature[]` — из `src/content/physical-features.ts`.
- Produces: `validatePhysicalFeatures(features, regions, sources, options?): void` — из `src/domain/validate-catalog.ts`; бросает `ContentValidationError`.

- [ ] **Step 1: Написать падающий тест справочника**

Создать `src/domain/validate-physical.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { physicalFeatures } from '../content/physical-features';
import { regions } from '../content/regions';
import { sources } from '../content/sources';
import type { PhysicalFeature } from '../content/types';
import { ContentValidationError, validatePhysicalFeatures } from './validate-catalog';

const river: PhysicalFeature = {
  id: 'test-river',
  kind: 'river',
  nameRu: 'Тестовая',
  nameZh: '测试河',
  pinyin: 'Cèshì Hé',
  riverNums: [11],
  regionIds: ['qinghai'],
  facts: [],
  sourceIds: ['natural-earth-rivers-5.1.2'],
};

describe('validatePhysicalFeatures', () => {
  it('принимает настоящий справочник', () => {
    expect(() =>
      validatePhysicalFeatures(physicalFeatures, regions, sources, { expectedCount: 12 }),
    ).not.toThrow();
  });

  it('в справочнике шесть рек и шесть форм рельефа', () => {
    const rivers = physicalFeatures.filter((feature) => feature.kind === 'river');
    const landforms = physicalFeatures.filter((feature) => feature.kind === 'landform');

    expect(rivers).toHaveLength(6);
    expect(landforms).toHaveLength(6);
  });

  it('ловит повторяющийся id', () => {
    expect(() =>
      validatePhysicalFeatures([river, river], regions, sources),
    ).toThrow(ContentValidationError);
  });

  it('ловит неизвестный регион', () => {
    expect(() =>
      validatePhysicalFeatures(
        [{ ...river, regionIds: ['atlantis'] }],
        regions,
        sources,
      ),
    ).toThrow(/atlantis/);
  });

  it('ловит отрезок, отданный двум рекам сразу', () => {
    expect(() =>
      validatePhysicalFeatures(
        [river, { ...river, id: 'other-river' }],
        regions,
        sources,
      ),
    ).toThrow(/11/);
  });

  it('ловит реку без единого отрезка', () => {
    expect(() =>
      validatePhysicalFeatures([{ ...river, riverNums: [] }], regions, sources),
    ).toThrow(/отрезк/i);
  });

  it('ловит пустое китайское имя', () => {
    expect(() =>
      validatePhysicalFeatures([{ ...river, nameZh: '  ' }], regions, sources),
    ).toThrow(/nameZh/);
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run src/domain/validate-physical.test.ts`
Expected: FAIL — «Failed to resolve import "../content/physical-features"».

- [ ] **Step 3: Добавить типы**

В конец `src/content/types.ts`:

```ts
/**
 * Ступень рельефа Китая (三级阶梯). Первая — Тибетское нагорье, вторая —
 * плато и котловины, третья — восточные равнины. Понятие школьной географии:
 * в Natural Earth такого поля нет, разметка живёт входом генератора.
 */
export type ReliefStep = 1 | 2 | 3;

export type PhysicalKind = 'river' | 'landform';

type PhysicalCommon = {
  readonly id: string;
  readonly nameRu: string;
  readonly nameZh: string;
  readonly pinyin: string;
  /**
   * Регионы, которых объект касается. Не украшение: `validate:map` проверяет
   * каждый заявленный регион геометрией и ловит этим и опечатку в номере
   * отрезка, и неверную привязку, и расхождение проекции.
   */
  readonly regionIds: readonly string[];
  /**
   * Длина реки и куда она впадает — факты со своими источниками, а не поля.
   * `lengthKm: number` пришлось бы заполнить числом без источника: у Амура
   * «длина» означает то 2824 км, то 4444 — смотря считать ли Аргунь.
   */
  readonly facts: readonly Fact[];
  readonly sourceIds: readonly string[];
};

export type PhysicalFeature = PhysicalCommon &
  (
    | {
        readonly kind: 'river';
        /**
         * Номера отрезков в Natural Earth. Именно номера: имена там не
         * уникальны — `Quan` есть и в Гуанси, и в Хэнани.
         */
        readonly riverNums: readonly number[];
      }
    | {
        readonly kind: 'landform';
        readonly step: ReliefStep;
        readonly landform: 'plateau' | 'plain' | 'basin' | 'desert';
      }
  );
```

- [ ] **Step 4: Добавить источники**

В `src/content/sources.ts`, перед закрывающей скобкой массива:

```ts
  {
    id: 'natural-earth-rivers-5.1.2',
    title: 'Natural Earth 10m Rivers and Lake Centerlines, версия 5.1.2',
    organization: 'Natural Earth',
    url: 'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/',
    accessedAt: '2026-08-05',
    covers: ['линии шести крупнейших рек Китая'],
  },
  {
    id: 'natural-earth-geography-regions-5.1.2',
    title: 'Natural Earth 10m Physical Labels: Geographic Regions, версия 5.1.2',
    organization: 'Natural Earth',
    url: 'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/',
    accessedAt: '2026-08-05',
    covers: ['контуры форм рельефа Китая', 'русские и китайские названия форм для сверки'],
  },
```

- [ ] **Step 5: Написать справочник**

Создать `src/content/physical-features.ts`:

```ts
import type { PhysicalFeature, ReliefStep } from './types';

/**
 * Двенадцать целей физической географии: шесть рек и шесть форм рельефа.
 * Состав утверждён владельцем продукта 2026-08-05.
 *
 * Реки взяты не по одной длине, а по типам бассейнов: тихоокеанский сток,
 * северная граница с Россией, трансграничная река и бессточный запад. Формы —
 * по одной-две на каждую ступень рельефа.
 *
 * Координат здесь нет и не будет: справочник не зависит от файла карты.
 * Геометрия живёт в `src/map/physical-geometry.ts`, её пишет генератор.
 *
 * `regionIds` перечисляет только те регионы, по которым объект проходит явно.
 * Пограничные случаи — Янцзы вдоль межи Хубэя и Хунани, Наньпаньцзян по меже
 * Юньнани и Гуйчжоу — не заявляются: `validate:map` требует, чтобы каждый
 * заявленный регион был действительно задет, а генерализованная линия у самой
 * межи может лечь по любую её сторону.
 */

const RIVERS = ['natural-earth-rivers-5.1.2'] as const;
const LANDFORMS = ['natural-earth-geography-regions-5.1.2'] as const;

function river(
  id: string,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  riverNums: readonly number[],
  regionIds: readonly string[],
): PhysicalFeature {
  return {
    id,
    kind: 'river',
    nameRu,
    nameZh,
    pinyin,
    riverNums,
    regionIds,
    facts: [],
    sourceIds: RIVERS,
  };
}

function landform(
  id: string,
  nameRu: string,
  nameZh: string,
  pinyin: string,
  step: ReliefStep,
  shape: 'plateau' | 'plain' | 'basin' | 'desert',
  regionIds: readonly string[],
): PhysicalFeature {
  return {
    id,
    kind: 'landform',
    nameRu,
    nameZh,
    pinyin,
    step,
    landform: shape,
    regionIds,
    facts: [],
    sourceIds: LANDFORMS,
  };
}

export const physicalFeatures: readonly PhysicalFeature[] = [
  river('yangtze', 'Янцзы', '长江', 'Cháng Jiāng', [11, 13, 15, 18, 1], [
    'qinghai',
    'sichuan',
    'yunnan',
    'chongqing',
    'hubei',
    'anhui',
    'jiangsu',
  ]),
  river('yellow-river', 'Хуанхэ', '黄河', 'Huáng Hé', [66, 95], [
    'qinghai',
    'gansu',
    'ningxia',
    'inner-mongolia',
    'shaanxi',
    'shanxi',
    'henan',
    'shandong',
  ]),
  river('heilongjiang', 'Хэйлунцзян', '黑龙江', 'Hēilóng Jiāng', [74, 84, 93, 72], [
    'inner-mongolia',
    'heilongjiang',
  ]),
  river('pearl-river', 'Чжуцзян', '珠江', 'Zhū Jiāng', [128, 147, 148, 149, 96], [
    'yunnan',
    'guangxi',
    'guangdong',
  ]),
  river('lancang', 'Ланьцанцзян', '澜沧江', 'Láncāng Jiāng', [35, 40], [
    'qinghai',
    'tibet',
    'yunnan',
  ]),
  river('tarim', 'Тарим', '塔里木河', 'Tǎlǐmù Hé', [242, 349], ['xinjiang']),

  landform('tibetan-plateau', 'Тибетское нагорье', '青藏高原', 'Qīngzàng Gāoyuán', 1, 'plateau', [
    'tibet',
    'qinghai',
  ]),
  landform('tarim-basin', 'Таримская впадина', '塔里木盆地', 'Tǎlǐmù Péndì', 2, 'basin', [
    'xinjiang',
  ]),
  landform('loess-plateau', 'Лёссовое плато', '黄土高原', 'Huángtǔ Gāoyuán', 2, 'plateau', [
    'shanxi',
    'shaanxi',
    'gansu',
  ]),
  landform('sichuan-basin', 'Сычуаньская котловина', '四川盆地', 'Sìchuān Péndì', 2, 'basin', [
    'sichuan',
    'chongqing',
  ]),
  landform('gobi', 'Гоби', '戈壁', 'Gēbì', 2, 'desert', ['inner-mongolia']),
  landform('north-china-plain', 'Великая Китайская равнина', '华北平原', 'Huáběi Píngyuán', 3, 'plain', [
    'hebei',
    'henan',
    'shandong',
  ]),
];
```

- [ ] **Step 6: Написать валидатор**

В конец `src/domain/validate-catalog.ts`:

```ts
/**
 * Проверка справочника физической географии. Отдельной функцией, как и у
 * городов: объекты ссылаются на регионы, но не наоборот.
 *
 * Геометрию здесь не проверить — для неё нужна сама карта, и живёт та
 * проверка в `validate:map`. Здесь — то, что видно по одному справочнику.
 */
export function validatePhysicalFeatures(
  features: readonly PhysicalFeature[],
  regions: readonly Region[],
  sources: readonly Source[],
  options: { readonly expectedCount?: number } = {},
): void {
  const errors: string[] = [];
  const featureIds = new Set<string>();
  const regionIds = new Set(regions.map((region) => region.id));
  const sourceIds = new Set(sources.map((source) => source.id));
  const ownerOfSegment = new Map<number, string>();

  if (features.length === 0) {
    errors.push('Справочник физической географии пуст.');
  }

  if (
    options.expectedCount !== undefined &&
    features.length !== options.expectedCount
  ) {
    errors.push(
      `Ожидалось физических целей: ${options.expectedCount}; получено: ${features.length}`,
    );
  }

  for (const feature of features) {
    if (featureIds.has(feature.id)) {
      errors.push(`Повторяющийся id физической цели: ${feature.id}`);
    }
    featureIds.add(feature.id);

    for (const field of [
      ['id', feature.id],
      ['nameRu', feature.nameRu],
      ['nameZh', feature.nameZh],
      ['pinyin', feature.pinyin],
    ] as const) {
      if (field[1].trim().length === 0) {
        errors.push(
          `Пустое поле ${field[0]} у физической цели: ${feature.id || 'без id'}`,
        );
      }
    }

    if (feature.regionIds.length === 0) {
      errors.push(`Не заявлено ни одного региона у цели: ${feature.id}`);
    }

    for (const regionId of feature.regionIds) {
      if (!regionIds.has(regionId)) {
        errors.push(`Неизвестный регион у цели ${feature.id}: ${regionId}`);
      }
    }

    if (feature.sourceIds.length === 0) {
      errors.push(`Нет источников у физической цели: ${feature.nameRu}`);
    }

    for (const sourceId of [
      ...feature.sourceIds,
      ...feature.facts.flatMap((fact) => fact.sourceIds),
    ]) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Неизвестный источник: ${sourceId}`);
      }
    }

    if (feature.kind === 'river') {
      if (feature.riverNums.length === 0) {
        errors.push(`У реки ${feature.id} не указано ни одного отрезка`);
      }

      for (const num of feature.riverNums) {
        if (!Number.isInteger(num)) {
          errors.push(`Номер отрезка не целое число у реки ${feature.id}: ${num}`);
        }

        /*
         * Отрезок принадлежит ровно одной реке. Отданный двум, он вошёл бы в
         * обе линии, и обе стали бы неверны — а на карте это выглядело бы
         * правдоподобно.
         */
        const owner = ownerOfSegment.get(num);
        if (owner !== undefined) {
          errors.push(
            `Отрезок ${num} отдан и реке ${owner}, и реке ${feature.id}`,
          );
        }
        ownerOfSegment.set(num, feature.id);
      }
    } else if (![1, 2, 3].includes(feature.step)) {
      errors.push(`Ступень рельефа у ${feature.id} вне 1..3: ${feature.step}`);
    }
  }

  if (errors.length > 0) {
    throw new ContentValidationError(errors);
  }
}
```

В начало файла добавить `PhysicalFeature` к импорту типов:

```ts
import type { City, PhysicalFeature, Region, Source } from '../content/types';
```

- [ ] **Step 7: Запустить тест и убедиться, что он проходит**

Run: `npx vitest run src/domain/validate-physical.test.ts`
Expected: PASS, 7 тестов.

- [ ] **Step 8: Подключить валидатор к сборке**

Заменить содержимое `scripts/validate-content.ts`:

```ts
import { cities } from '../src/content/cities';
import { physicalFeatures } from '../src/content/physical-features';
import { regions } from '../src/content/regions';
import { sources } from '../src/content/sources';
import {
  validateCatalog,
  validateCities,
  validatePhysicalFeatures,
} from '../src/domain/validate-catalog';

validateCatalog(regions, sources, { expectedRegionCount: 34 });
validateCities(cities, regions, sources);
validatePhysicalFeatures(physicalFeatures, regions, sources, { expectedCount: 12 });
console.info(
  `Проверено регионов: ${regions.length}; городов: ${cities.length}; ` +
    `физических целей: ${physicalFeatures.length}`,
);
```

- [ ] **Step 9: Пересобрать подмножества шрифтов**

Справочник принёс незнакомые иероглифы (长江, 黄河, 澜沧江, 塔里木河, 青藏高原, 盆地, 黄土, 华北, 平原, 戈壁), и без пересборки `validate:fonts` уронит сборку — так и задумано.

Run: `npm run generate:fonts`
Expected: сообщение о пересобранных подмножествах; изменились `src/assets/fonts/*.woff2` и `scripts/font-coverage.json`.

- [ ] **Step 10: Полная проверка**

Run: `npm run validate:content && npm run validate:fonts`
Expected: «Проверено регионов: 34; городов: 57; физических целей: 12» и отчёт шрифтов без ошибок.

- [ ] **Step 11: Коммит**

```bash
git add src/content/types.ts src/content/physical-features.ts src/content/sources.ts src/domain/validate-catalog.ts src/domain/validate-physical.test.ts scripts/validate-content.ts src/assets/fonts scripts/font-coverage.json
git commit -m "feat: справочник физической географии на двенадцать целей"
```

---

### Task 2: Геометрия ломаных

**Files:**
- Modify: `src/map/svg-path.ts`
- Create: `src/map/polyline.ts`
- Test: `src/map/polyline.test.ts`

**Interfaces:**
- Consumes: `Point`, `parseMapPath` — из `src/map/svg-path.ts`.
- Produces: `distanceToSegment(x: number, y: number, a: Point, b: Point): number` — становится экспортом `src/map/svg-path.ts`.
- Produces из `src/map/polyline.ts`: `Frame = { minX, minY, maxX, maxY }`, `distanceToPolyline(x, y, line: readonly Point[]): number`, `simplifyPath(points, tolerance): Point[]`, `simplifyRing(ring, tolerance): Point[]`, `clipToFrame(points, frame): Point[][]`, `toPathData(rings, options?): string`.

Модуль лежит в `src/map`, а не в `scripts`, намеренно: `distanceToPolyline` понадобится во время работы приложения — им шаг 2 находит ближайшую реку под курсором. Один и тот же код меряет расстояние на сборке и в браузере.

- [ ] **Step 1: Написать падающие тесты**

Создать `src/map/polyline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  clipToFrame,
  distanceToPolyline,
  simplifyPath,
  simplifyRing,
  toPathData,
  type Frame,
} from './polyline';
import { parseMapPath, type Point } from './svg-path';

const FRAME: Frame = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

describe('distanceToPolyline', () => {
  it('меряет расстояние до отрезка, а не до ближайшей точки', () => {
    const line: Point[] = [
      [0, 0],
      [100, 0],
    ];

    // Точка над серединой отрезка: до обоих концов 50.99, до самой линии 10.
    expect(distanceToPolyline(50, 10, line)).toBeCloseTo(10, 6);
  });

  it('возвращает ноль на самой ломаной', () => {
    expect(
      distanceToPolyline(50, 0, [
        [0, 0],
        [100, 0],
      ]),
    ).toBeCloseTo(0, 6);
  });
});

describe('simplifyPath', () => {
  it('выбрасывает точку, лежащую на прямой', () => {
    const simplified = simplifyPath(
      [
        [0, 0],
        [50, 0],
        [100, 0],
      ],
      1,
    );

    expect(simplified).toEqual([
      [0, 0],
      [100, 0],
    ]);
  });

  it('сохраняет точку, отходящую дальше допуска', () => {
    const simplified = simplifyPath(
      [
        [0, 0],
        [50, 5],
        [100, 0],
      ],
      1,
    );

    expect(simplified).toHaveLength(3);
  });

  it('никогда не теряет концы', () => {
    const points: Point[] = Array.from({ length: 50 }, (_, i) => [i, 0]);
    const simplified = simplifyPath(points, 1);

    expect(simplified[0]).toEqual([0, 0]);
    expect(simplified.at(-1)).toEqual([49, 0]);
  });
});

describe('simplifyRing', () => {
  it('не схлопывает кольцо, у которого концы совпадают', () => {
    const ring: Point[] = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
      [0, 0],
    ];

    // Наивное упрощение вернуло бы [[0,0],[0,0]]: у замкнутого кольца
    // расстояние от любой точки до отрезка «начало — конец» считается от
    // вырожденного отрезка нулевой длины.
    expect(simplifyRing(ring, 1).length).toBeGreaterThanOrEqual(4);
  });
});

describe('clipToFrame', () => {
  it('оставляет линию целиком, когда она внутри рамки', () => {
    const line: Point[] = [
      [10, 10],
      [90, 90],
    ];

    expect(clipToFrame(line, FRAME)).toEqual([line]);
  });

  it('обрезает по краю рамки', () => {
    const parts = clipToFrame(
      [
        [50, 50],
        [150, 50],
      ],
      FRAME,
    );

    expect(parts).toHaveLength(1);
    expect(parts[0][0]).toEqual([50, 50]);
    expect(parts[0][1][0]).toBeCloseTo(100, 6);
  });

  it('разбивает на части линию, которая вышла и вернулась', () => {
    const parts = clipToFrame(
      [
        [50, 50],
        [150, 50],
        [150, 80],
        [50, 80],
      ],
      FRAME,
    );

    expect(parts).toHaveLength(2);
  });

  it('отбрасывает линию целиком снаружи', () => {
    expect(
      clipToFrame(
        [
          [200, 200],
          [300, 300],
        ],
        FRAME,
      ),
    ).toEqual([]);
  });
});

describe('toPathData', () => {
  it('пишет путь, который читается разбором карты обратно', () => {
    const ring: Point[] = [
      [10.25, 20.5],
      [30.75, 20.5],
      [30.75, 40.125],
    ];

    const parsed = parseMapPath(toPathData([ring]));

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toHaveLength(3);
    for (const [i, [x, y]] of parsed[0].entries()) {
      expect(x).toBeCloseTo(ring[i][0], 2);
      expect(y).toBeCloseTo(ring[i][1], 2);
    }
  });

  it('не копит ошибку округления на длинной ломаной', () => {
    // Смещения считаются от округлённой предыдущей точки, а не от исходной:
    // иначе на тысяче точек путь уезжает.
    const line: Point[] = Array.from({ length: 1000 }, (_, i) => [i * 0.333, 0]);
    const parsed = parseMapPath(toPathData([line]));

    expect(parsed[0].at(-1)?.[0]).toBeCloseTo(999 * 0.333, 1);
  });

  it('замыкает кольцо по требованию', () => {
    expect(
      toPathData(
        [
          [
            [0, 0],
            [10, 0],
            [10, 10],
          ],
        ],
        { closed: true },
      ),
    ).toMatch(/z$/);
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/map/polyline.test.ts`
Expected: FAIL — «Failed to resolve import "./polyline"».

- [ ] **Step 3: Открыть `distanceToSegment`**

В `src/map/svg-path.ts` заменить строку объявления:

```ts
function distanceToSegment(
```

на:

```ts
/**
 * Расстояние от точки до отрезка. Открыта наружу ради ломаных: реку меряют по
 * её звеньям, а не по вершинам — иначе точка напротив середины длинного
 * звена считалась бы далёкой от реки, на которой она лежит.
 */
export function distanceToSegment(
```

- [ ] **Step 4: Написать модуль ломаных**

Создать `src/map/polyline.ts`:

```ts
/**
 * Ломаные в системе координат карты: реки — открытые линии, формы рельефа —
 * замкнутые кольца.
 *
 * Модуль общий для генератора и приложения. Упрощение и обрезка нужны на
 * сборке, расстояние до ломаной — во время работы: им находят реку, ближайшую
 * к курсору. Разные копии этой арифметики разошлись бы, и цель нажатия
 * перестала бы совпадать с рисунком.
 */
import { distanceToSegment, type Point } from './svg-path';

export type Frame = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/** Расстояние от точки до ломаной — по звеньям, а не по вершинам. */
export function distanceToPolyline(
  x: number,
  y: number,
  line: readonly Point[],
): number {
  if (line.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (line.length === 1) {
    return Math.hypot(x - line[0][0], y - line[0][1]);
  }

  let nearest = Number.POSITIVE_INFINITY;
  for (let i = 1; i < line.length; i += 1) {
    const distance = distanceToSegment(x, y, line[i - 1], line[i]);
    if (distance < nearest) {
      nearest = distance;
    }
  }

  return nearest;
}

/**
 * Упрощение по Дугласу–Пекеру: точка остаётся, если без неё линия сместилась
 * бы дальше допуска. Цикл, а не рекурсия: у реки до двух тысяч точек, и
 * глубина рекурсии на почти прямом участке дошла бы до их числа.
 */
export function simplifyPath(
  points: readonly Point[],
  tolerance: number,
): Point[] {
  if (points.length <= 2) {
    return [...points];
  }

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [from, to] = stack.pop() as [number, number];
    let farthest = -1;
    let best = tolerance;

    for (let i = from + 1; i < to; i += 1) {
      const distance = distanceToSegment(
        points[i][0],
        points[i][1],
        points[from],
        points[to],
      );

      if (distance > best) {
        best = distance;
        farthest = i;
      }
    }

    if (farthest !== -1) {
      keep[farthest] = true;
      stack.push([from, farthest], [farthest, to]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

/**
 * Упрощение замкнутого кольца.
 *
 * Прямо применить `simplifyPath` нельзя: у кольца начало совпадает с концом,
 * отрезок между ними вырожден, расстояние до него считается от точки, и всё
 * кольцо схлопывается в две точки. Кольцо разрезается в самой удалённой от
 * начала вершине и упрощается двумя половинами.
 */
export function simplifyRing(
  ring: readonly Point[],
  tolerance: number,
): Point[] {
  if (ring.length <= 4) {
    return [...ring];
  }

  const [start] = ring;
  let opposite = 0;
  let best = -1;
  for (let i = 1; i < ring.length; i += 1) {
    const distance = Math.hypot(ring[i][0] - start[0], ring[i][1] - start[1]);
    if (distance > best) {
      best = distance;
      opposite = i;
    }
  }

  const head = simplifyPath(ring.slice(0, opposite + 1), tolerance);
  const tail = simplifyPath(ring.slice(opposite), tolerance);

  return [...head, ...tail.slice(1)];
}

/** Часть отрезка внутри рамки по Лянгу–Барски; `null` — отрезок весь снаружи. */
function clipSegment(a: Point, b: Point, frame: Frame): [Point, Point] | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let enter = 0;
  let leave = 1;

  const limits: [number, number][] = [
    [-dx, a[0] - frame.minX],
    [dx, frame.maxX - a[0]],
    [-dy, a[1] - frame.minY],
    [dy, frame.maxY - a[1]],
  ];

  for (const [p, q] of limits) {
    if (p === 0) {
      if (q < 0) {
        return null;
      }
      continue;
    }

    const r = q / p;
    if (p < 0) {
      if (r > leave) {
        return null;
      }
      if (r > enter) {
        enter = r;
      }
    } else {
      if (r < enter) {
        return null;
      }
      if (r < leave) {
        leave = r;
      }
    }
  }

  return [
    [a[0] + enter * dx, a[1] + enter * dy],
    [a[0] + leave * dx, a[1] + leave * dy],
  ];
}

const EPSILON = 1e-9;

/**
 * Часть ломаной внутри рамки карты. Возвращает несколько кусков, если линия
 * вышла за край и вернулась: Амур уходит к Охотскому морю, Меконг — в Лаос, и
 * координаты за рамкой карте не принадлежат.
 */
export function clipToFrame(
  points: readonly Point[],
  frame: Frame,
): Point[][] {
  const parts: Point[][] = [];
  let current: Point[] = [];

  const flush = () => {
    if (current.length > 1) {
      parts.push(current);
    }
    current = [];
  };

  for (let i = 1; i < points.length; i += 1) {
    const piece = clipSegment(points[i - 1], points[i], frame);
    if (piece === null) {
      flush();
      continue;
    }

    const [from, to] = piece;
    const last = current.at(-1);
    if (last === undefined) {
      current.push(from);
    } else if (
      Math.abs(last[0] - from[0]) > EPSILON ||
      Math.abs(last[1] - from[1]) > EPSILON
    ) {
      flush();
      current.push(from);
    }

    current.push(to);
  }

  flush();

  return parts;
}

/**
 * Запись контуров в тот же вид пути, в котором записана карта:
 * `m x,y dx,dy ... z`. Обратно их читает `parseMapPath`.
 *
 * Смещение считается от округлённой предыдущей точки, а не от исходной: иначе
 * ошибка округления копится и на тысяче точек уводит хвост линии.
 */
export function toPathData(
  rings: readonly (readonly Point[])[],
  options: { readonly closed?: boolean; readonly precision?: number } = {},
): string {
  const { closed = false, precision = 2 } = options;
  const round = (value: number) => Number(value.toFixed(precision));

  return rings
    .filter((ring) => ring.length > 1)
    .map((ring) => {
      let [previousX, previousY] = [round(ring[0][0]), round(ring[0][1])];
      const parts = [`m ${previousX},${previousY}`];

      for (const [x, y] of ring.slice(1)) {
        const nextX = round(x);
        const nextY = round(y);
        parts.push(`${round(nextX - previousX)},${round(nextY - previousY)}`);
        previousX = nextX;
        previousY = nextY;
      }

      if (closed) {
        parts.push('z');
      }

      return parts.join(' ');
    })
    .join(' ');
}
```

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/map/polyline.test.ts`
Expected: PASS, 13 тестов.

- [ ] **Step 6: Коммит**

```bash
git add src/map/polyline.ts src/map/polyline.test.ts src/map/svg-path.ts
git commit -m "feat: геометрия ломаных — упрощение, обрезка по рамке, расстояние"
```

---

### Task 3: Выжимка из Natural Earth и разметка ступеней

**Files:**
- Create: `scripts/data/relief-steps.ts`
- Create: `scripts/extract-physical-source.ts`
- Create: `scripts/data/physical-source.json` (пишется запуском, коммитится)
- Create: `docs/sources/physical.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: `physicalFeatures` — из `src/content/physical-features.ts`.
- Produces: `RELIEF_STEPS: Readonly<Record<string, ReliefStep>>` и `SHAPE_FEATURE_IDS: Readonly<Record<string, string>>` — из `scripts/data/relief-steps.ts`.
- Produces: `scripts/data/physical-source.json` формы
  `{ rivers: { rivernum: number; parts: [number, number][][] }[], landforms: { key: string; nameRu: string; nameZh: string; rings: [number, number][][] }[] }`.

Скачивание в сборку не входит и запускается руками: сеть во время сборки — то, чего проект избегает, а выжимка меняется только вместе с составом целей.

- [ ] **Step 1: Написать разметку ступеней**

Создать `scripts/data/relief-steps.ts`:

```ts
import type { ReliefStep } from '../../src/content/types';

/**
 * Ступень рельефа для каждой формы, которую Natural Earth называет на
 * территории Китая. Это разметка чужого набора, а не учебный справочник,
 * поэтому она лежит входом генератора, а не в `src/content`.
 *
 * Границы ступеней — школьные: первая отделяется от второй линией
 * Куньлунь — Циляньшань — Хэндуаньшань, вторая от третьей — линией
 * Большой Хинган — Тайханшань — Ушань — Сюэфэншань. Разметка сверяется
 * преподавателем (открытый вопрос спека), координат не задаёт и на
 * правильность ответа не влияет: ею выбирается только цвет заливки.
 *
 * Ключ — поле `NAME` набора, как оно записано там: заглавными у крупных
 * форм, вперемешку у мелких. Приводить его к одному виду нельзя — по нему
 * идёт сопоставление.
 */
export const RELIEF_STEPS: Readonly<Record<string, ReliefStep>> = {
  // Первая ступень: Тибетское нагорье и обрамляющие его хребты.
  'PLATEAU OF TIBET': 1,
  'HIMALAYAS': 1,
  'KARAKORAM RA.': 1,
  'KUNLUN MOUNTAINS': 1,
  'ALTUN MTS.': 1,
  'QUILIAN MOUNTAINS': 1,
  'Qaidam Basin': 1,

  // Вторая ступень: плато, котловины и пустыни.
  'TARIM BASIN': 2,
  'TAKLIMAKAN DESERT': 2,
  'Junggar Basin': 2,
  'TIAN SHAN': 2,
  'ALTAY MOUNTAINS': 2,
  'Borohoro Mts.': 2,
  'Alataw Mts.': 2,
  'Hexi Corridor': 2,
  'MONGOLIAN PLATEAU': 2,
  'GOBI DESERT': 2,
  'Mu Us Desert': 2,
  'Loess Plateau': 2,
  'Lüliang Mts.': 2,
  'Taihang Mts.': 2,
  'Yin Mts.': 2,
  'Qinling Mountains': 2,
  'SICHUAN BASIN': 2,
  'YUNGUI PLATEAU': 2,
  'Dalou Mts.': 2,
  'GREATER KHINGAN RANGE': 2,

  // Третья ступень: равнины, холмы востока и острова.
  'NORTH CHINA PLAIN': 3,
  'MANCHURIAN PLAIN': 3,
  'Lesser Khingan Range': 3,
  'Dabie Mts.': 3,
  'Nan Ling Mts.': 3,
  'Wuyi Mts.': 3,
  'Shandong Pen.': 3,
  'Liaodong Pen.': 3,
  'Leizhou Pen.': 3,
  'HAINAN': 3,
  'TAIWAN': 3,
};

/**
 * Формы, которые не только заливают фон, но и спрашиваются. Ключ — имя в
 * наборе, значение — `id` в справочнике. Остальные тридцать две формы
 * декоративны: у них на экране нет имени, и сверять их незачем.
 */
export const SHAPE_FEATURE_IDS: Readonly<Record<string, string>> = {
  'PLATEAU OF TIBET': 'tibetan-plateau',
  'TARIM BASIN': 'tarim-basin',
  'Loess Plateau': 'loess-plateau',
  'SICHUAN BASIN': 'sichuan-basin',
  'GOBI DESERT': 'gobi',
  'NORTH CHINA PLAIN': 'north-china-plain',
};
```

- [ ] **Step 2: Написать скрипт выжимки**

Создать `scripts/extract-physical-source.ts`:

```ts
/**
 * Выжимка из Natural Earth для физической карты.
 *
 * Полные наборы весят около 12 МБ и в репозиторий не кладутся, а без них
 * генератор геометрии невоспроизводим — ровно та ошибка, из-за которой прежний
 * контур Тайваня годами считался производным не от того файла. Скрипт берёт
 * только нужные объекты, обрезает координаты до пяти знаков и пишет выжимку,
 * которую и коммитят.
 *
 * Нужна сеть. В сборку не входит: во время сборки и во время раунда проект
 * сетевых запросов не делает.
 *
 * Запуск: npx tsx scripts/extract-physical-source.ts
 */
import { writeFileSync } from 'node:fs';
import { physicalFeatures } from '../src/content/physical-features';
import { RELIEF_STEPS } from './data/relief-steps';

const BASE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const OUT = new URL('data/physical-source.json', import.meta.url);
const PRECISION = 5;

type Position = readonly number[];
type Geometry = { readonly type: string; readonly coordinates: unknown };
type Feature = {
  readonly properties: Record<string, unknown>;
  readonly geometry: Geometry | null;
};

async function load(name: string): Promise<readonly Feature[]> {
  const response = await fetch(`${BASE}/${name}.geojson`);
  if (!response.ok) {
    throw new Error(`${name}: ${response.status} ${response.statusText}`);
  }

  const collection = (await response.json()) as { features: readonly Feature[] };
  console.info(`${name}: объектов ${collection.features.length}`);

  return collection.features;
}

/** Части линии: `MultiLineString` — это несколько самостоятельных кусков. */
function lineParts(geometry: Geometry): Position[][] {
  const coordinates = geometry.coordinates as Position[] | Position[][];

  return typeof (coordinates as Position[])[0][0] === 'number'
    ? [coordinates as Position[]]
    : (coordinates as Position[][]);
}

function polygonRings(geometry: Geometry): Position[][] {
  const coordinates = geometry.coordinates as Position[][] | Position[][][];

  return geometry.type === 'Polygon'
    ? (coordinates as Position[][])
    : (coordinates as Position[][][]).flat();
}

const round = (position: Position): [number, number] => [
  Number(position[0].toFixed(PRECISION)),
  Number(position[1].toFixed(PRECISION)),
];

const riverNums = new Set(
  physicalFeatures.flatMap((feature) =>
    feature.kind === 'river' ? feature.riverNums : [],
  ),
);

const riverFeatures = await load('ne_10m_rivers_lake_centerlines');
const rivers = riverFeatures
  .filter((feature) => {
    /*
     * Класс `Lake Centerline` отбрасывать нельзя: перемычки через
     * водохранилища записаны им, и без них Хуанхэ распадается на четыре
     * обрывка.
     */
    const featurecla = feature.properties.featurecla;
    return (
      feature.geometry !== null &&
      riverNums.has(feature.properties.rivernum as number) &&
      (featurecla === 'River' || featurecla === 'Lake Centerline')
    );
  })
  .map((feature) => ({
    rivernum: feature.properties.rivernum as number,
    parts: lineParts(feature.geometry as Geometry).map((part) => part.map(round)),
  }));

const shapeFeatures = await load('ne_10m_geography_regions_polys');
/*
 * Имена полей в этом наборе — заглавными, в наборе рек — строчными. Разница не
 * логическая, а историческая, и молча ловится только опытом: `properties.name`
 * здесь всегда `undefined`.
 */
const landforms = shapeFeatures
  .filter(
    (feature) =>
      feature.geometry !== null &&
      RELIEF_STEPS[feature.properties.NAME as string] !== undefined,
  )
  .map((feature) => ({
    key: feature.properties.NAME as string,
    nameRu: (feature.properties.NAME_RU as string) ?? '',
    nameZh: (feature.properties.NAME_ZH as string) ?? '',
    rings: polygonRings(feature.geometry as Geometry).map((ring) => ring.map(round)),
  }));

const missing = Object.keys(RELIEF_STEPS).filter(
  (key) => !landforms.some((landform) => landform.key === key),
);
if (missing.length > 0) {
  throw new Error(`Не найдены формы рельефа: ${missing.join(', ')}`);
}

const foundNums = new Set(rivers.map((river) => river.rivernum));
const missingNums = [...riverNums].filter((num) => !foundNums.has(num));
if (missingNums.length > 0) {
  throw new Error(`Не найдены отрезки рек: ${missingNums.join(', ')}`);
}

writeFileSync(OUT, `${JSON.stringify({ rivers, landforms }, null, 1)}\n`);

const points =
  rivers.reduce((n, river) => n + river.parts.flat().length, 0) +
  landforms.reduce((n, landform) => n + landform.rings.flat().length, 0);
console.info(
  `Выжимка записана: отрезков рек ${rivers.length}, форм ${landforms.length}, точек ${points}`,
);
```

- [ ] **Step 3: Добавить команду в package.json**

В `"scripts"` рядом с остальными генераторами:

```json
    "extract:physical": "tsx scripts/extract-physical-source.ts",
```

- [ ] **Step 4: Запустить выжимку**

Run: `npm run extract:physical`
Expected: две строки «объектов …», затем «Выжимка записана: отрезков рек 20, форм 38, точек ≈11000». Число отрезков может отличаться: у одного `rivernum` в наборе бывает и линия, и осевая линия озера. Что обязано совпасть — формы (38) и отсутствие ошибок про ненайденное.

- [ ] **Step 5: Проверить размер выжимки**

Run: `ls -lh scripts/data/physical-source.json`
Expected: файл порядка 200–400 КБ. Если он вышел за мегабайт — значит фильтр не сработал и в выжимку попал весь набор; разбираться, а не коммитить.

- [ ] **Step 6: Записать источники**

Создать `docs/sources/physical.md`:

```markdown
# Источники физической карты

Справочник: `src/content/physical-features.ts` — шесть рек и шесть форм
рельефа. Состав утверждён владельцем продукта 2026-08-05.

| Поле | Линии рек |
| --- | --- |
| Идентификатор | `natural-earth-rivers-5.1.2` |
| Исходный URL | https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/ |
| Автор | Natural Earth (Nathaniel Vaughn Kelso и участники) |
| Лицензия | Public domain ([условия](https://www.naturalearthdata.com/about/terms-of-use/)) |
| Дата получения | 2026-08-05 |
| Изменения | Взяты отрезки шести рек по номерам `rivernum`, склеены в непрерывную линию, упрощены и переведены в систему координат карты. Полный набор в репозиторий не включён: в `scripts/data/physical-source.json` лежит выжимка только нужных объектов. |
| Покрытие | Янцзы, Хуанхэ, Хэйлунцзян, Чжуцзян, Ланьцанцзян, Тарим. |

| Поле | Контуры форм рельефа |
| --- | --- |
| Идентификатор | `natural-earth-geography-regions-5.1.2` |
| Исходный URL | https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/ |
| Автор | Natural Earth |
| Лицензия | Public domain |
| Дата получения | 2026-08-05 |
| Изменения | Взяты 38 форм на территории Китая, упрощены и переведены в координаты карты. Русские и китайские имена набора взяты только для сверки и в справочник не переписаны. |
| Покрытие | 72,2 % суши Китая (измерено сеткой 0,25° по контуру `china-geojson`, 15 435 точек суши). |

## Отрезок задаётся номером, а не именем

Natural Earth режет реку на именованные отрезки, и имена там не уникальны:
`Quan` — это и приток Чжуцзяна в Гуанси, и река в Хэнани, за тысячу
километров. Каталог хранит `rivernum`.

Отрезки класса `Lake Centerline` входят в сборку наравне с `River`: перемычки
через водохранилища записаны именно так, и без них Хуанхэ распадается на
четыре обрывка вместо непрерывной цепи из 1934 точек.

## Что не досталось от набора

- **Русских и китайских имён рек в наборе нет вовсе** — слой хранит только
  `name`, `name_alt` и `name_en`. Все имена рек набраны вручную и сверяются
  преподавателем.
- **Имена форм в наборе есть, но как черновик.** Гоби там 大漠 — литературное
  «великая пустыня» вместо 戈壁; в русских именах попадаются знаки ударения.
  В справочник перенесены выверенные имена, а не поля набора.
- **Дельта Чжуцзяна ветвится**: пять рукавов не пристают к главному руслу.
  Берётся главное русло, ветви отброшены.
- **Ступени рельефа набор не знает.** 三级阶梯 — понятие школьной географии;
  разметка 38 форм по ступеням сделана редакторски и лежит в
  `scripts/data/relief-steps.ts`. Границы: первая ступень отделяется от второй
  линией Куньлунь — Циляньшань — Хэндуаньшань, вторая от третьей — линией
  Большой Хинган — Тайханшань — Ушань — Сюэфэншань. Разметка выбирает цвет
  заливки и не участвует в проверке ответа; сверяется преподавателем.

## Проверки

- `validate:content` — уникальность `id`, три непустых имени, существующие
  регионы и источники, ступень 1–3, отрезок не отдан двум рекам сразу.
- `validate:map` — геометрия: линия внутри рамки карты, каждый заявленный
  регион действительно задет, форма не мельче порога нажатия, у каждой реки
  есть участок, на котором её можно показать однозначно.
```

- [ ] **Step 7: Коммит**

```bash
git add scripts/data/relief-steps.ts scripts/extract-physical-source.ts scripts/data/physical-source.json docs/sources/physical.md package.json
git commit -m "feat: выжимка Natural Earth и разметка ступеней рельефа"
```

---

### Task 4: Склейка отрезков в цепь

**Files:**
- Create: `scripts/physical-assembly.ts`
- Test: `scripts/physical-assembly.test.ts`

**Interfaces:**
- Produces: `chainPieces(pieces: readonly Piece[], tolerance: number): { chain: Point[]; leftovers: Piece[] }` — из `scripts/physical-assembly.ts`, где `Piece = readonly Point[]`.

Функция живёт в `scripts`, а не в `src/map`: она разбирает форму чужого набора, и приложению не нужна.

- [ ] **Step 1: Написать падающие тесты**

Создать `scripts/physical-assembly.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Point } from '../src/map/svg-path';
import { chainPieces } from './physical-assembly';

const TOLERANCE = 0.01;

describe('chainPieces', () => {
  it('соединяет два куска встык', () => {
    const { chain, leftovers } = chainPieces(
      [
        [
          [0, 0],
          [1, 0],
        ],
        [
          [1, 0],
          [2, 0],
        ],
      ],
      TOLERANCE,
    );

    expect(chain).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    expect(leftovers).toHaveLength(0);
  });

  it('разворачивает кусок, записанный против течения', () => {
    // В наборе направление отрезка не всегда совпадает с течением: Аргунь
    // записана от устья к истоку.
    const { chain } = chainPieces(
      [
        [
          [0, 0],
          [1, 0],
        ],
        [
          [2, 0],
          [1, 0],
        ],
      ],
      TOLERANCE,
    );

    expect(chain).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
  });

  it('наращивает цепь и с начала, и с конца', () => {
    const { chain, leftovers } = chainPieces(
      [
        [
          [1, 0],
          [2, 0],
        ],
        [
          [2, 0],
          [3, 0],
        ],
        [
          [0, 0],
          [1, 0],
        ],
      ],
      TOLERANCE,
    );

    expect(chain).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
    expect(leftovers).toHaveLength(0);
  });

  it('возвращает отдельно то, что не пристало', () => {
    const orphan: Point[] = [
      [50, 50],
      [51, 50],
    ];

    const { chain, leftovers } = chainPieces(
      [
        [
          [0, 0],
          [1, 0],
        ],
        orphan,
      ],
      TOLERANCE,
    );

    expect(chain).toHaveLength(2);
    expect(leftovers).toEqual([orphan]);
  });

  it('не склеивает куски, разошедшиеся дальше допуска', () => {
    const { leftovers } = chainPieces(
      [
        [
          [0, 0],
          [1, 0],
        ],
        [
          [1.5, 0],
          [2, 0],
        ],
      ],
      0.1,
    );

    expect(leftovers).toHaveLength(1);
  });

  it('на пустом списке кусков даёт пустую цепь', () => {
    expect(chainPieces([], TOLERANCE)).toEqual({ chain: [], leftovers: [] });
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run scripts/physical-assembly.test.ts`
Expected: FAIL — «Failed to resolve import "./physical-assembly"».

- [ ] **Step 3: Написать склейку**

Создать `scripts/physical-assembly.ts`:

```ts
/**
 * Сборка реки из отрезков Natural Earth.
 *
 * Набор режет реку на именованные куски, а `MultiLineString` даёт ещё и
 * несколько кусков внутри одного отрезка. Порядок в файле не значит ничего, и
 * направление куска не всегда совпадает с течением: Аргунь записана от устья к
 * истоку. Поэтому цепь наращивается жадно с обоих концов, а кусок при нужде
 * разворачивается.
 */
import type { Point } from '../src/map/svg-path';

export type Piece = readonly Point[];

export type Chained = {
  readonly chain: Point[];
  /** Куски, не приставшие ни одним концом: их видно в логе генератора. */
  readonly leftovers: Piece[];
};

function apart(left: Point, right: Point): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1]);
}

export function chainPieces(pieces: readonly Piece[], tolerance: number): Chained {
  const pool = pieces.filter((piece) => piece.length > 1).map((piece) => [...piece]);
  if (pool.length === 0) {
    return { chain: [], leftovers: [] };
  }

  let chain = pool.shift() as Point[];
  let joined = true;

  while (joined && pool.length > 0) {
    joined = false;

    for (let i = 0; i < pool.length; i += 1) {
      const piece = pool[i];
      const head = chain[0];
      const tail = chain[chain.length - 1];

      if (apart(tail, piece[0]) <= tolerance) {
        chain = chain.concat(piece.slice(1));
      } else if (apart(tail, piece[piece.length - 1]) <= tolerance) {
        chain = chain.concat([...piece].reverse().slice(1));
      } else if (apart(head, piece[piece.length - 1]) <= tolerance) {
        chain = piece.slice(0, -1).concat(chain);
      } else if (apart(head, piece[0]) <= tolerance) {
        chain = [...piece].reverse().slice(0, -1).concat(chain);
      } else {
        continue;
      }

      pool.splice(i, 1);
      joined = true;
      break;
    }
  }

  return { chain, leftovers: pool };
}
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run scripts/physical-assembly.test.ts`
Expected: PASS, 6 тестов.

- [ ] **Step 5: Коммит**

```bash
git add scripts/physical-assembly.ts scripts/physical-assembly.test.ts
git commit -m "feat: склейка отрезков реки в непрерывную цепь"
```

---

### Task 5: Генератор геометрии

**Files:**
- Create: `scripts/generate-physical-geometry.ts`
- Create: `src/map/physical-geometry.ts` (пишется запуском, коммитится)
- Modify: `package.json`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `chainPieces`, `clipToFrame`, `simplifyPath`, `simplifyRing`, `toPathData`, `projectLonLat`, `RELIEF_STEPS`, `SHAPE_FEATURE_IDS`, `physicalFeatures`.
- Produces из `src/map/physical-geometry.ts`: `ReliefShape = { key: string; step: ReliefStep; d: string; featureId?: string }`, `RiverLine = { featureId: string; d: string }`, `RELIEF_SHAPES: readonly ReliefShape[]`, `RIVER_LINES: readonly RiverLine[]`.

- [ ] **Step 1: Написать генератор**

Создать `scripts/generate-physical-geometry.ts`:

```ts
/**
 * Строит `src/map/physical-geometry.ts` из выжимки Natural Earth.
 *
 * Что делает по порядку: собирает реку из отрезков по номерам, переводит
 * градусы в координаты карты той же проекцией, что и города, обрезает по рамке
 * карты, упрощает и записывает путями в том же виде, в каком записана сама
 * карта.
 *
 * Обрезка по рамке — не то же, что обрезка по границе Китая: за границу
 * рисунок не выпускает `clipPath` при отрисовке. Здесь отсекается только то,
 * чего на этой карте нет вовсе, — Амур за 135° восточной долготы, Меконг южнее
 * Юньнани: их координаты карте не принадлежат и в файле были бы мусором.
 *
 * Запуск: npm run generate:physical
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { physicalFeatures } from '../src/content/physical-features';
import type { ReliefStep } from '../src/content/types';
import {
  clipToFrame,
  simplifyPath,
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
import { chainPieces } from './physical-assembly';
import { RELIEF_STEPS, SHAPE_FEATURE_IDS } from './data/relief-steps';

/*
 * Выжимка читается файлом, а не импортом JSON: импорт модулей JSON требует
 * согласия сборщика, загрузчика и линтера, и все три пришлось бы уговаривать
 * ради одного места.
 */
const source = JSON.parse(
  readFileSync(new URL('data/physical-source.json', import.meta.url), 'utf8'),
) as {
  rivers: { rivernum: number; parts: [number, number][][] }[];
  landforms: { key: string; nameRu: string; nameZh: string; rings: [number, number][][] }[];
};

const OUT = new URL('../src/map/physical-geometry.ts', import.meta.url);

/** Допуск склейки в градусах: примерно километр, вдесятеро меньше звена. */
const JOIN_TOLERANCE_DEG = 0.01;

/** Допуск упрощения: одна единица viewBox — примерно один пиксель на опорной ширине. */
const SIMPLIFY_TOLERANCE_UNITS = 1;

/**
 * Сколько точек позволено не пристать к цепи. У Янцзы это две точки у Поянху,
 * у Чжуцзяна — рукава дельты, которая действительно ветвится. Всё, что больше,
 * значит ошибку в списке номеров, и генератор обязан остановиться.
 */
const MAX_LEFTOVER_SHARE = 0.15;

const FRAME: Frame = {
  minX: MAP_VIEWBOX_MIN_X,
  minY: MAP_VIEWBOX_MIN_Y,
  maxX: MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH,
  maxY: MAP_VIEWBOX_MIN_Y + MAP_VIEWBOX_HEIGHT,
};

const project = (ring: readonly [number, number][]): Point[] =>
  ring.map(([lon, lat]) => projectLonLat(lon, lat) as Point);

function ringArea(ring: readonly Point[]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area / 2);
}

// --- Реки -------------------------------------------------------------------

const partsByNum = new Map<number, [number, number][][]>();
for (const river of source.rivers) {
  partsByNum.set(river.rivernum, [
    ...(partsByNum.get(river.rivernum) ?? []),
    ...river.parts,
  ]);
}

const riverLines = physicalFeatures
  .filter((feature) => feature.kind === 'river')
  .map((feature) => {
    const pieces = feature.riverNums.flatMap((num) => partsByNum.get(num) ?? []);
    const { chain, leftovers } = chainPieces(pieces, JOIN_TOLERANCE_DEG);

    const total = pieces.reduce((n, piece) => n + piece.length, 0);
    const lost = leftovers.reduce((n, piece) => n + piece.length, 0);
    if (lost > total * MAX_LEFTOVER_SHARE) {
      throw new Error(
        `Река ${feature.id} не собирается: не пристало ${lost} точек из ${total}. ` +
          'Проверьте список riverNums в справочнике',
      );
    }

    const parts = clipToFrame(project(chain), FRAME).map((part) =>
      simplifyPath(part, SIMPLIFY_TOLERANCE_UNITS),
    );

    if (parts.length === 0) {
      throw new Error(`Река ${feature.id} целиком за рамкой карты`);
    }

    console.info(
      `${feature.nameRu}: точек ${total} → цепь ${chain.length} → в рамке ` +
        `${parts.reduce((n, part) => n + part.length, 0)} (кусков ${parts.length})` +
        (lost > 0 ? `, отброшено ${lost}` : ''),
    );

    return { featureId: feature.id, d: toPathData(parts) };
  });

// --- Формы рельефа ----------------------------------------------------------

const withoutStep = source.landforms.filter(
  (landform) => (RELIEF_STEPS[landform.key] as ReliefStep | undefined) === undefined,
);
if (withoutStep.length > 0) {
  throw new Error(
    `Нет ступени у форм: ${withoutStep.map((landform) => landform.key).join(', ')}. ` +
      'Разметка живёт в scripts/data/relief-steps.ts',
  );
}

const shapes = source.landforms
  .map((landform) => {
    const rings = landform.rings
      .map((ring) => simplifyRing(project(ring), SIMPLIFY_TOLERANCE_UNITS))
      .filter((ring) => ring.length > 3);

    return {
      key: landform.key,
      step: RELIEF_STEPS[landform.key],
      featureId: SHAPE_FEATURE_IDS[landform.key],
      rings,
      area: rings.reduce((sum, ring) => sum + ringArea(ring), 0),
    };
  })
  .filter((shape) => shape.rings.length > 0)
  /*
   * Крупные формы рисуются первыми: иначе Тибетское нагорье накрыло бы
   * Цайдамскую котловину, которая лежит внутри него.
   */
  .sort((left, right) => right.area - left.area);

// --- Запись -----------------------------------------------------------------

const quote = (value: string) => `'${value.replace(/'/g, "\\'")}'`;

const module = `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ. Не править руками.
 * Источник: scripts/data/physical-source.json (Natural Earth, public domain)
 * Генератор: scripts/generate-physical-geometry.ts
 */
import type { ReliefStep } from '../content/types';

export type ReliefShape = {
  /** Имя формы в наборе Natural Earth: по нему идёт сверка с разметкой. */
  readonly key: string;
  readonly step: ReliefStep;
  readonly d: string;
  /** Задан — форма не только заливает фон, но и спрашивается. */
  readonly featureId?: string;
};

export type RiverLine = {
  readonly featureId: string;
  readonly d: string;
};

/** Формы рельефа от крупных к мелким: порядок и есть порядок отрисовки. */
export const RELIEF_SHAPES: readonly ReliefShape[] = [
${shapes
  .map(
    (shape) =>
      `  { key: ${quote(shape.key)}, step: ${shape.step}, ${
        shape.featureId ? `featureId: ${quote(shape.featureId)}, ` : ''
      }d: ${quote(toPathData(shape.rings, { closed: true }))} },`,
  )
  .join('\n')}
];

export const RIVER_LINES: readonly RiverLine[] = [
${riverLines
  .map((line) => `  { featureId: ${quote(line.featureId)}, d: ${quote(line.d)} },`)
  .join('\n')}
];
`;

writeFileSync(OUT, module);
console.info(
  `Записано: форм ${shapes.length}, рек ${riverLines.length}, ` +
    `размер ${(module.length / 1024).toFixed(0)} КБ`,
);
```

- [ ] **Step 2: Добавить команду в package.json**

В `"scripts"`:

```json
    "generate:physical": "tsx scripts/generate-physical-geometry.ts",
```

- [ ] **Step 3: Запустить генератор**

Run: `npm run generate:physical`
Expected: шесть строк по рекам вида «Янцзы: точек 1944 → цепь 1942 → в рамке … (кусков 1), отброшено 2», затем «Записано: форм 38, рек 6, размер … КБ». Точные числа зависят от версии набора; порядок величины — тысячи точек до упрощения.

Что проверить глазами в выводе:
- у каждой реки цепь составляет не меньше 85 % от исходных точек (иначе номера отрезков неверны);
- у Хэйлунцзяна число точек в рамке заметно меньше цепи — Амур уходит за 135° восточной долготы, и это правильно;
- ни одной ошибки «не собирается» и «нет ступени».

- [ ] **Step 4: Проверить, что сгенерированный модуль компилируется и читается**

Run: `npx tsc -b`
Expected: без ошибок.

Run: `npx tsx -e "import { RELIEF_SHAPES, RIVER_LINES } from './src/map/physical-geometry'; import { parseMapPath } from './src/map/svg-path'; console.log('форм', RELIEF_SHAPES.length, 'рек', RIVER_LINES.length); console.log('точек в Янцзы', parseMapPath(RIVER_LINES.find((l) => l.featureId === 'yangtze')!.d).flat().length);"`
Expected: «форм 38 рек 6» и число точек в Янцзы порядка двухсот-трёхсот.

- [ ] **Step 5: Записать генератор в список неправимых файлов**

В `CLAUDE.md`, в таблицу генераторов, строкой после `generate:fonts`:

```markdown
| `npm run generate:physical` | перезаписывает `src/map/physical-geometry.ts` целиком по выжимке Natural Earth |
```

- [ ] **Step 6: Коммит**

```bash
git add scripts/generate-physical-geometry.ts src/map/physical-geometry.ts package.json CLAUDE.md
git commit -m "feat: генератор геометрии физической карты"
```

---

### Task 6: Проверка геометрии на сборке

**Files:**
- Modify: `src/map/validate-map.ts`
- Modify: `scripts/validate-map.ts`
- Test: `src/map/validate-map.test.ts`

**Interfaces:**
- Consumes: `RELIEF_SHAPES`, `RIVER_LINES`, `physicalFeatures`, `parseMapPath`, `largestInscribedCircle`, `distanceToPolyline`, `containsPoint`, `distanceToBoundary`.
- Produces: `RIVER_RIBBON_UNITS: number`, `MIN_FREE_SHARE: number`, `validatePhysicalGeometry(features, geometry, shapes): PhysicalReport` — из `src/map/validate-map.ts`, где
  `geometry = { rivers: ReadonlyMap<string, Point[][]>; landforms: ReadonlyMap<string, Point[][]> }`,
  `shapes = { contains, distanceToBoundary, mapAreaOf }` (те же три функции, что уже принимает `validateCityPlacement`),
  `PhysicalReport = { readonly freeShare: ReadonlyMap<string, number> }`.

- [ ] **Step 1: Написать падающие тесты**

В конец `src/map/validate-map.test.ts`:

```ts
describe('validatePhysicalGeometry', () => {
  const river: PhysicalFeature = {
    id: 'straight-river',
    kind: 'river',
    nameRu: 'Прямая',
    nameZh: '直河',
    pinyin: 'Zhí Hé',
    riverNums: [1],
    regionIds: ['qinghai'],
    facts: [],
    sourceIds: ['natural-earth-rivers-5.1.2'],
  };

  /** Регион-квадрат: всё, что внутри 0..100, считается Цинхаем. */
  const shapes = {
    contains: (mapAreaId: string, x: number, y: number) =>
      mapAreaId === 'qinghai' && x >= 0 && x <= 100 && y >= 0 && y <= 100,
    distanceToBoundary: () => 0,
    mapAreaOf: (regionId: string) => regionId,
  };

  const line: Point[] = [
    [10, 10],
    [90, 10],
  ];

  it('принимает реку, лежащую в заявленном регионе', () => {
    expect(() =>
      validatePhysicalGeometry(
        [river],
        { rivers: new Map([['straight-river', [line]]]), landforms: new Map() },
        shapes,
      ),
    ).not.toThrow();
  });

  it('ловит цель без геометрии', () => {
    expect(() =>
      validatePhysicalGeometry(
        [river],
        { rivers: new Map(), landforms: new Map() },
        shapes,
      ),
    ).toThrow(/straight-river/);
  });

  it('ловит заявленный регион, которого объект не касается', () => {
    expect(() =>
      validatePhysicalGeometry(
        [{ ...river, regionIds: ['tibet'] }],
        { rivers: new Map([['straight-river', [line]]]), landforms: new Map() },
        shapes,
      ),
    ).toThrow(/tibet/);
  });

  it('ловит точку за рамкой карты', () => {
    expect(() =>
      validatePhysicalGeometry(
        [river],
        {
          rivers: new Map([
            [
              'straight-river',
              [
                [
                  [10, 10],
                  [10_000, 10],
                ] as Point[],
              ],
            ],
          ]),
          landforms: new Map(),
        },
        shapes,
      ),
    ).toThrow(/рамк/i);
  });

  it('ловит две реки, идущие рядом всей длиной', () => {
    const twin: PhysicalFeature = { ...river, id: 'twin-river', riverNums: [2] };

    expect(() =>
      validatePhysicalGeometry(
        [river, twin],
        {
          rivers: new Map([
            ['straight-river', [line]],
            [
              'twin-river',
              [
                [
                  [10, 12],
                  [90, 12],
                ] as Point[],
              ],
            ],
          ]),
          landforms: new Map(),
        },
        shapes,
      ),
    ).toThrow(/показать однозначно|свободн/i);
  });

  it('принимает настоящую геометрию', () => {
    // Тот же вызов, что делает сборка: он и есть настоящая проверка.
    expect(() => validateRealPhysicalGeometry()).not.toThrow();
  });
});
```

Вверху файла дописать импорты — `validatePhysicalGeometry` добавляется в уже
стоящий там импорт из `./validate-map`, остальные блоки новые:

```ts
import { readFileSync } from 'node:fs';
import { physicalFeatures } from '../content/physical-features';
import { regions } from '../content/regions';
import type { PhysicalFeature } from '../content/types';
import { RELIEF_SHAPES, RIVER_LINES } from './physical-geometry';
import {
  containsPoint,
  distanceToBoundary,
  parseMapPath,
  type Point,
} from './svg-path';
```

и вспомогательную функцию перед `describe`:

```ts
/**
 * Проверка настоящей геометрии настоящими контурами карты. Разбор SVG повторяет
 * `scripts/validate-map.ts`: в тесте он нужен, чтобы падение поймал `npm test`,
 * а не только сборка.
 */
function validateRealPhysicalGeometry(): void {
  const svg = readFileSync(
    new URL('../../public/maps/china-provinces.svg', import.meta.url),
    'utf8',
  );
  const rings = new Map<string, Point[][]>();
  for (const [, attributes] of svg.matchAll(/<path\b([\s\S]*?)\/>/g)) {
    const id = /\bid="([^"]+)"/.exec(attributes)?.[1];
    const d = /\sd="([\s\S]*?)"/.exec(attributes)?.[1];
    if (id !== undefined && d !== undefined) {
      rings.set(id, parseMapPath(d));
    }
  }

  const mapAreaOf = new Map(regions.map((region) => [region.id, region.mapAreaId]));
  const ringsOf = (mapAreaId: string) => rings.get(mapAreaId) ?? [];

  validatePhysicalGeometry(
    physicalFeatures,
    {
      rivers: new Map(RIVER_LINES.map((line) => [line.featureId, parseMapPath(line.d)])),
      landforms: new Map(
        RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined).map((shape) => [
          shape.featureId as string,
          parseMapPath(shape.d),
        ]),
      ),
    },
    {
      contains: (mapAreaId, x, y) => containsPoint(ringsOf(mapAreaId), x, y),
      distanceToBoundary: (mapAreaId, x, y) =>
        distanceToBoundary(ringsOf(mapAreaId), x, y),
      mapAreaOf: (regionId) => mapAreaOf.get(regionId),
    },
  );
}
```


- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run src/map/validate-map.test.ts`
Expected: FAIL — «validatePhysicalGeometry is not exported».

- [ ] **Step 3: Написать проверку**

В конец `src/map/validate-map.ts`:

```ts
/**
 * Ширина ленты нажатия по реке в единицах карты: те же 24 px, что и у всех
 * целей, на опорной ширине.
 */
export const RIVER_RIBBON_UNITS = pixelsToUnits(MIN_TARGET_PX, REFERENCE_MAP_WIDTH);

/**
 * Какая доля точек реки обязана быть свободна — то есть иметь ближайшую чужую
 * реку дальше половины ленты.
 *
 * Требовать непересечения лент нельзя: Янцзы и Ланьцанцзян сближаются до 4,0
 * единицы карты, и это не дефект данных, а 三江并流 — параллельные реки
 * Юньнани. Измеренные доли: 94,6 % у Янцзы, 85,5 % у Ланьцанцзяна, 100 % у
 * остальных четырёх. Порог 80 % оставляет запас настоящей географии и всё
 * равно ловит ошибку, ради которой он стоит: отрезок, отданный не той реке,
 * кладёт две линии друг на друга целиком.
 */
export const MIN_FREE_SHARE = 0.8;

export type PhysicalGeometry = {
  readonly rivers: ReadonlyMap<string, Point[][]>;
  readonly landforms: ReadonlyMap<string, Point[][]>;
};

export type PhysicalShapes = {
  readonly contains: (mapAreaId: string, x: number, y: number) => boolean;
  readonly distanceToBoundary: (mapAreaId: string, x: number, y: number) => number;
  readonly mapAreaOf: (regionId: string) => string | undefined;
};

export type PhysicalReport = {
  /** Доля свободных точек по каждой реке: её видно в логе сборки. */
  readonly freeShare: ReadonlyMap<string, number>;
};

/**
 * Геометрия физических целей: она есть, лежит на карте, задевает заявленные
 * регионы и годится под нажатие.
 *
 * Проверка «заявленный регион задет» ловит три ошибки сразу — опечатку в
 * номере отрезка, неверную привязку и расхождение проекции, — тем же приёмом,
 * которым уже проверяются города.
 */
export function validatePhysicalGeometry(
  features: readonly PhysicalFeature[],
  geometry: PhysicalGeometry,
  shapes: PhysicalShapes,
): PhysicalReport {
  const errors: string[] = [];
  const freeShare = new Map<string, number>();
  const frame = {
    minX: MAP_VIEWBOX_MIN_X,
    minY: MAP_VIEWBOX_MIN_Y,
    maxX: MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH,
    maxY: MAP_VIEWBOX_MIN_Y + MAP_VIEWBOX_HEIGHT,
  };

  const pointsOf = (feature: PhysicalFeature): Point[][] | undefined =>
    feature.kind === 'river'
      ? geometry.rivers.get(feature.id)
      : geometry.landforms.get(feature.id);

  for (const feature of features) {
    const rings = pointsOf(feature);
    if (rings === undefined || rings.length === 0) {
      errors.push(
        `Нет геометрии у цели ${feature.id}. Запустите npm run generate:physical`,
      );
      continue;
    }

    const points = rings.flat();

    for (const [x, y] of points) {
      if (x < frame.minX || x > frame.maxX || y < frame.minY || y > frame.maxY) {
        errors.push(
          `Точка за рамкой карты у цели ${feature.id}: ${x.toFixed(1)}, ${y.toFixed(1)}`,
        );
        break;
      }
    }

    for (const regionId of feature.regionIds) {
      const mapAreaId = shapes.mapAreaOf(regionId);
      if (mapAreaId === undefined) {
        errors.push(`Нет области карты у региона ${regionId}`);
        continue;
      }

      const touches = points.some(
        ([x, y]) =>
          shapes.contains(mapAreaId, x, y) ||
          shapes.distanceToBoundary(mapAreaId, x, y) <= CITY_BOUNDARY_TOLERANCE,
      );

      if (!touches) {
        errors.push(
          `Цель ${feature.id} заявляет регион ${regionId}, но не касается его`,
        );
      }
    }

    if (feature.kind === 'landform') {
      const circle = largestInscribedCircle(rings);
      const availablePx = unitsToPixels(circle.radius * 2, REFERENCE_MAP_WIDTH);
      if (availablePx < MIN_TARGET_PX) {
        errors.push(
          `Форма ${feature.id} меньше ${MIN_TARGET_PX} px: ${availablePx.toFixed(1)} px ` +
            `при ширине карты ${REFERENCE_MAP_WIDTH} px`,
        );
      }
    }
  }

  /*
   * Свободная доля считается по всем рекам сразу: «свободна» — значит, что
   * ближайшая точка любой другой реки дальше половины ленты.
   */
  const riverPoints = new Map(
    features
      .filter((feature) => feature.kind === 'river')
      .map((feature) => [feature.id, (geometry.rivers.get(feature.id) ?? []).flat()]),
  );

  for (const [featureId, points] of riverPoints) {
    if (points.length === 0) {
      continue;
    }

    const others = [...riverPoints]
      .filter(([otherId]) => otherId !== featureId)
      .flatMap(([, otherPoints]) => otherPoints);

    /*
     * Расстояние до ближайшей вершины чужой реки, а не до её звена: звенья
     * разных рек соединять нельзя, а склеить их в одну ломаную значило бы
     * получить ложные звенья через всю страну. При звене реки в доли единицы и
     * пороге в 8,6 разница между вершиной и звеном ничтожна.
     */
    const nearestOtherPoint = (x: number, y: number): number => {
      let nearest = Number.POSITIVE_INFINITY;
      for (const [otherX, otherY] of others) {
        const distance = Math.hypot(x - otherX, y - otherY);
        if (distance < nearest) {
          nearest = distance;
        }
      }

      return nearest;
    };

    const free = points.filter(
      ([x, y]) => nearestOtherPoint(x, y) > RIVER_RIBBON_UNITS / 2,
    ).length;
    const share = free / points.length;
    freeShare.set(featureId, share);

    if (share < MIN_FREE_SHARE) {
      errors.push(
        `У реки ${featureId} свободно ${(100 * share).toFixed(1)} % длины при ` +
          `пороге ${(100 * MIN_FREE_SHARE).toFixed(0)} %: её негде показать однозначно`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return { freeShare };
}
```

Импорты вверху `src/map/validate-map.ts`. Два новых блока добавляются, а
существующий блок из `./target-size` **дополняется**, а не дублируется — второй
импорт из того же модуля линтер не пропустит:

```ts
import type { PhysicalFeature } from '../content/types';
import { largestInscribedCircle, type Point } from './svg-path';
```

и в уже стоящий там импорт из `./target-size` дописать `pixelsToUnits` и
`unitsToPixels`:

```ts
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
  MAP_VIEWBOX_WIDTH,
  MIN_TARGET_PX,
  pixelsToUnits,
  REFERENCE_MAP_WIDTH,
  undersizedRegions,
  unitsToPixels,
} from './target-size';
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

Run: `npx vitest run src/map/validate-map.test.ts`
Expected: PASS. Если падает последний тест — «принимает настоящую геометрию», — читайте сообщение: оно называет цель и регион. Скорее всего, заявленный регион у самой межи; уберите его из `regionIds` в справочнике, а не ослабляйте допуск.

- [ ] **Step 5: Подключить проверку к сборке**

В конец `scripts/validate-map.ts`:

```ts
/*
 * Физические цели проверяются теми же контурами, что и города: `rings` и
 * `mapAreaOf` уже разобраны выше и переиспользуются.
 */
const physical = validatePhysicalGeometry(
  physicalFeatures,
  {
    rivers: new Map(RIVER_LINES.map((line) => [line.featureId, parseMapPath(line.d)])),
    landforms: new Map(
      RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined).map((shape) => [
        shape.featureId as string,
        parseMapPath(shape.d),
      ]),
    ),
  },
  {
    contains: (mapAreaId, x, y) => containsPoint(ringsOf(mapAreaId), x, y),
    distanceToBoundary: (mapAreaId, x, y) => distanceToBoundary(ringsOf(mapAreaId), x, y),
    mapAreaOf: (regionId) => mapAreaOf.get(regionId),
  },
);

console.info(
  `Проверено физических целей: ${physicalFeatures.length}. ` +
    `Форм на подложке: ${RELIEF_SHAPES.length}. Свободная длина рек: ` +
    [...physical.freeShare]
      .map(([id, share]) => `${id} ${(100 * share).toFixed(0)} %`)
      .join(', '),
);
```

и импорты вверху:

```ts
import { physicalFeatures } from '../src/content/physical-features';
import { RELIEF_SHAPES, RIVER_LINES } from '../src/map/physical-geometry';
import { validatePhysicalGeometry } from '../src/map/validate-map';
```

- [ ] **Step 6: Запустить валидатор карты**

Run: `npm run validate:map`
Expected: прежние три строки, затем «Проверено физических целей: 12. Форм на подложке: 38. Свободная длина рек: yangtze 95 %, yellow-river 100 %, …».

- [ ] **Step 7: Коммит**

```bash
git add src/map/validate-map.ts src/map/validate-map.test.ts scripts/validate-map.ts
git commit -m "feat: проверка геометрии физических целей на сборке"
```

---

### Task 7: Журнал и полная проверка

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Полная проверка**

Run: `npm run build && npm test && npm run lint`
Expected: три валидатора проходят и печатают числа, `tsc -b` молчит, сборка проходит, все тесты зелёные, линтер молчит.

- [ ] **Step 2: Убедиться, что на экране ничего не изменилось**

Run: `npm run dev`

Открыть приложение, пройти по главной, атласу и одной игре. Ожидается: ни одного видимого отличия — геометрия есть в бандле, но её пока никто не рисует. Если что-то изменилось, значит задет чужой код.

- [ ] **Step 3: Записать в журнал изменений**

В `CHANGELOG.md`, в раздел `## [Unreleased] → ### Added`, первым пунктом:

```markdown
- Справочник физической географии: шесть крупнейших рек (Янцзы, Хуанхэ,
  Хэйлунцзян, Чжуцзян, Ланьцанцзян, Тарим) и шесть форм рельефа (Тибетское
  нагорье, Таримская впадина, Лёссовое плато, Сычуаньская котловина, Гоби,
  Великая Китайская равнина). Геометрия — из Natural Earth (public domain):
  реки собираются из отрезков по номерам вместе с классом `Lake Centerline`,
  без которого Хуанхэ распадается на четыре обрывка; 38 форм рельефа размечены
  по трём ступеням и закрывают 72,2 % суши. На экране пока ничего не
  показывается: это основание для вида карты и игр.
- Проверки физической географии на сборке: справочник (уникальность `id`, три
  имени, регионы, источники, отрезок не отдан двум рекам сразу) и геометрия
  (линия в рамке карты, каждый заявленный регион действительно задет, форма не
  мельче порога нажатия, у каждой реки не меньше 80 % длины, где её можно
  показать однозначно).
```

- [ ] **Step 4: Коммит**

```bash
git add CHANGELOG.md
git commit -m "docs: справочник и геометрия физической карты в журнале"
```

---

## Что остаётся шагам 2 и 3

Не входит в этот план и получит свой:

- третье значение `'physical'` у `TargetKind` — оно нужно раунду, а раунда
  здесь ещё нет, и добавлять его сейчас значило бы коммитить мёртвый код.
  Миграции прогресса оно не потребует ни тогда, ни сейчас: `Target` уже носит
  вид в себе;
- вид карты `variant='physical'`, заливка по ступеням, линии рек, подписи;
- поиск ближайшей реки под курсором (`riverAt`) и ответ с клавиатуры самой линией;
- обрезка рисунка по границе Китая через `clipPath` из 34 контуров;
- переключатель «Политическая / Физическая» в атласе;
- две карточки на главной и два раунда;
- новые токены цвета и проверка контраста линии реки к трём заливкам ступеней.
