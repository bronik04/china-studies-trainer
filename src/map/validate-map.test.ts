import mapMarkup from '../../public/maps/china-provinces.svg?raw';
import { physicalFeatures } from '../content/physical-features';
import { regions } from '../content/regions';
import type { PhysicalFeature } from '../content/types';
import { parseLandRings } from './land-rings';
import { LAKE_SHAPES, RELIEF_SHAPES, RIVER_LINES } from './physical-geometry';
import {
  containsPoint,
  distanceToBoundary,
  largestInscribedCircle,
  parseMapPath,
  type Point,
} from './svg-path';
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
  MAP_VIEWBOX_WIDTH,
  MIN_TARGET_PX,
  REFERENCE_MAP_WIDTH,
  unitsToPixels,
} from './target-size';
import {
  validateCityPlacement,
  validateMapAreaIds,
  validatePhysicalGeometry,
  validateRegionPalette,
  validateTargetSizes,
  validateViewBox,
  type PhysicalGeometry,
  type PlacementShapes,
} from './validate-map';

it('accepts one map area for each catalog region', () => {
  expect(() => validateMapAreaIds(['sichuan'], ['sichuan'])).not.toThrow();
});

it('reports every missing and duplicate map area', () => {
  expect(() =>
    validateMapAreaIds(['sichuan', 'yunnan'], ['sichuan', 'sichuan']),
  ).toThrow(
    /Нет области карты: yunnan[\s\S]*Повторяющаяся область карты: sichuan/,
  );
});

it('reports an area that is not in the catalog', () => {
  expect(() => validateMapAreaIds(['sichuan'], ['sichuan', 'unknown'])).toThrow(
    /Неизвестная область карты: unknown/,
  );
});

it('пропускает мелкую область, у которой есть цель нажатия', () => {
  expect(() =>
    validateTargetSizes(['shanghai'], ['shanghai'], []),
  ).not.toThrow();
});

it('пропускает мелкую область, вынесенную маркером', () => {
  expect(() => validateTargetSizes(['macao'], [], ['macao'])).not.toThrow();
});

it('сообщает о мелкой области без цели нажатия', () => {
  expect(() => validateTargetSizes(['shanghai'], [], [])).toThrow(
    /Область меньше 24 px и не имеет цели нажатия: shanghai/,
  );
});

it('пропускает область, которой хватает собственной геометрии', () => {
  expect(() => validateTargetSizes(['xinjiang'], [], [])).not.toThrow();
});


it('требует запись в палитре для каждой области', () => {
  expect(() => validateRegionPalette(['sichuan'])).not.toThrow();
  expect(() => validateRegionPalette(['atlantis'])).toThrow(
    /Нет записи в палитре регионов: atlantis/,
  );
});

it('сверяет ширину viewBox карты с константой пересчёта', () => {
  expect(() => validateViewBox('-16 -16 806 601')).not.toThrow();
  expect(() => validateViewBox('-16 -16 1000 601')).toThrow(
    /Ширина viewBox карты 1000 не совпадает/,
  );
  expect(() => validateViewBox(null)).toThrow(/не совпадает/);
});

it('сверяет высоту viewBox: от неё зависит пропорция коробки карты в CSS', () => {
  expect(() => validateViewBox('-16 -16 806 600')).toThrow(
    /Высота viewBox карты 600 не совпадает/,
  );
});

it('сверяет начало координат viewBox: в нём живёт поле вокруг рисунка', () => {
  expect(() => validateViewBox('0 0 806 601')).toThrow(/Начало координат viewBox/);
});

/*
 * Квадрат 100×100 в начале координат: проверять размещение на настоящей карте
 * значило бы проверять заодно её геометрию и проекцию — три разные причины
 * падения в одном тесте.
 */
const square: PlacementShapes = {
  contains: (mapAreaId, x, y) =>
    mapAreaId === 'square' && x >= 0 && x <= 100 && y >= 0 && y <= 100,
  distanceToBoundary: (_mapAreaId, x, y) =>
    Math.min(Math.abs(x), Math.abs(x - 100), Math.abs(y), Math.abs(y - 100)),
  mapAreaOf: (regionId) => (regionId === 'square' ? 'square' : undefined),
  mapAreaIds: ['square'],
};

it('принимает город внутри своего региона', () => {
  expect(
    validateCityPlacement(
      [{ cityId: 'centre', regionId: 'square', x: 50, y: 50 }],
      square,
    ).onBoundary,
  ).toEqual([]);
});

it('прощает кромку и называет города, оказавшиеся на ней', () => {
  const report = validateCityPlacement(
    [{ cityId: 'coast', regionId: 'square', x: 101, y: 50 }],
    square,
  );

  expect(report.onBoundary).toEqual(['coast']);
});

it('не прощает город, уехавший от своего региона дальше допуска', () => {
  expect(() =>
    validateCityPlacement(
      [{ cityId: 'lost', regionId: 'square', x: 400, y: 50 }],
      square,
    ),
  ).toThrow(/Город lost вне региона square/);
});

it('называет регион, в который город попал на самом деле', () => {
  /** Второй квадрат, 200..300: город приписан ему, а стоит в первом. */
  const two: PlacementShapes = {
    contains: (mapAreaId, x, y) =>
      mapAreaId === 'square'
        ? x >= 0 && x <= 100 && y >= 0 && y <= 100
        : x >= 200 && x <= 300 && y >= 200 && y <= 300,
    distanceToBoundary: () => 150,
    mapAreaOf: (regionId) => regionId,
    mapAreaIds: ['square', 'far'],
  };

  expect(() =>
    validateCityPlacement([{ cityId: 'lost', regionId: 'far', x: 50, y: 50 }], two),
  ).toThrow(/точка лежит в square/);
});

/**
 * Проверка настоящей геометрии настоящими контурами карты. Разбор SVG повторяет
 * `scripts/validate-map.ts`: в тесте он нужен, чтобы падение поймал `npm test`,
 * а не только сборка.
 */
function validateRealPhysicalGeometry(): void {
  /*
   * Карта берётся тем же вайтовским `?raw`, каким её берёт `ChinaMap`: чтение
   * файла из `src` потребовало бы типов Node, которых у приложения нет, — и
   * правильно, приложение файлов не читает.
   */
  const rings = new Map<string, Point[][]>();
  for (const [, attributes] of mapMarkup.matchAll(/<path\b([\s\S]*?)\/>/g)) {
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
      lakes: new Map(
        LAKE_SHAPES.map((shape) => [shape.featureId, parseMapPath(shape.d)]),
      ),
      lakeMarks: new Map(
        LAKE_SHAPES.map((shape) => [
          shape.featureId,
          [shape.markX, shape.markY] as Point,
        ]),
      ),
      shapeLabels: new Map(
        RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined).map(
          (shape) => [
            shape.featureId as string,
            [shape.labelX as number, shape.labelY as number] as Point,
          ],
        ),
      ),
      landRings: parseLandRings(mapMarkup),
    },
    {
      contains: (mapAreaId, x, y) => containsPoint(ringsOf(mapAreaId), x, y),
      distanceToBoundary: (mapAreaId, x, y) =>
        distanceToBoundary(ringsOf(mapAreaId), x, y),
      mapAreaOf: (regionId) => mapAreaOf.get(regionId),
    },
  );
}

/** Пустая геометрия: тест задаёт только то, что испытывает. */
function physicalGeometry(
  overrides: Partial<PhysicalGeometry> = {},
): PhysicalGeometry {
  return {
    rivers: new Map(),
    landforms: new Map(),
    lakes: new Map(),
    lakeMarks: new Map(),
    shapeLabels: new Map(),
    landRings: [],
    ...overrides,
  };
}

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

  /**
   * Регион-квадрат: всё, что внутри 0..100, считается Цинхаем. Расстояние до
   * края — заведомо больше допуска на генерализацию: иначе допуск в 3 единицы
   * признал бы задетым любой регион, и проверка молчала бы всегда.
   */
  const shapes = {
    contains: (mapAreaId: string, x: number, y: number) =>
      mapAreaId === 'qinghai' && x >= 0 && x <= 100 && y >= 0 && y <= 100,
    distanceToBoundary: () => 500,
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
        physicalGeometry({ rivers: new Map([['straight-river', [line]]]) }),
        shapes,
      ),
    ).not.toThrow();
  });

  it('ловит цель без геометрии', () => {
    expect(() =>
      validatePhysicalGeometry(
        [river],
        physicalGeometry(),
        shapes,
      ),
    ).toThrow(/straight-river/);
  });

  it('ловит заявленный регион, которого объект не касается', () => {
    expect(() =>
      validatePhysicalGeometry(
        [{ ...river, regionIds: ['tibet'] }],
        physicalGeometry({ rivers: new Map([['straight-river', [line]]]) }),
        shapes,
      ),
    ).toThrow(/tibet/);
  });

  it('ловит точку за рамкой карты', () => {
    expect(() =>
      validatePhysicalGeometry(
        [river],
        physicalGeometry({
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
        }),
        shapes,
      ),
    ).toThrow(/рамк/i);
  });

  it('ловит две реки, идущие рядом всей длиной', () => {
    const twin: PhysicalFeature = { ...river, id: 'twin-river', riverNums: [2] };

    expect(() =>
      validatePhysicalGeometry(
        [river, twin],
        physicalGeometry({
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
        }),
        shapes,
      ),
    ).toThrow(/показать однозначно|свободн/i);
  });

  /* Форма-квадрат: подпись у неё проверяется тем же правилом, что у настоящей. */
  const plateau: PhysicalFeature = {
    id: 'square-plateau',
    kind: 'landform',
    nameRu: 'Квадратное',
    nameZh: '方',
    pinyin: 'Fāng',
    step: 1,
    landform: 'plateau',
    regionIds: ['qinghai'],
    facts: [],
    sourceIds: ['natural-earth-geography-regions-5.1.2'],
  };

  const square: Point[][] = [
    [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ],
  ];

  it('ловит подпись формы вне суши', () => {
    expect(() =>
      validatePhysicalGeometry(
        [plateau],
        physicalGeometry({
          landforms: new Map([['square-plateau', square]]),
          shapeLabels: new Map([['square-plateau', [50, 50] as Point]]),
          landRings: [],
        }),
        shapes,
      ),
    ).toThrow(/вне суши/);
  });

  it('ловит форму без подписи', () => {
    expect(() =>
      validatePhysicalGeometry(
        [plateau],
        physicalGeometry({
          landforms: new Map([['square-plateau', square]]),
          landRings: [square[0]],
        }),
        shapes,
      ),
    ).toThrow(/Нет подписи/);
  });

  /*
   * Вложенная цель забирает место у подписи: это случай Таримской впадины и
   * Такла-Макана. Мерить одну лишь внешнюю форму значило бы засчитать место,
   * куда нажать нельзя.
   */
  it('ловит подпись, у которой вложенная цель отняла место', () => {
    const inner: PhysicalFeature = { ...plateau, id: 'inner', regionIds: ['qinghai'] };
    const innerRings: Point[][] = [
      [
        [45, 5],
        [95, 5],
        [95, 95],
        [45, 95],
      ],
    ];

    expect(() =>
      validatePhysicalGeometry(
        [plateau, inner],
        physicalGeometry({
          landforms: new Map([
            ['square-plateau', square],
            ['inner', innerRings],
          ]),
          shapeLabels: new Map([
            ['square-plateau', [43, 50] as Point],
            ['inner', [70, 50] as Point],
          ]),
          landRings: [square[0]],
        }),
        shapes,
      ),
    ).toThrow(/свободно/);
  });

  it('принимает настоящую геометрию', () => {
    // Тот же вызов, что делает сборка: он и есть настоящая проверка.
    expect(() => validateRealPhysicalGeometry()).not.toThrow();
  });
});

it('у каждой формы-цели есть точка подписи, и она лежит внутри контура', () => {
  const targets = RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined);

  expect(targets).toHaveLength(16);

  for (const shape of targets) {
    expect(shape.labelX, `${shape.key}: нет labelX`).toBeTypeOf('number');
    expect(shape.labelY, `${shape.key}: нет labelY`).toBeTypeOf('number');
    expect(
      containsPoint(parseMapPath(shape.d), shape.labelX!, shape.labelY!),
      `${shape.key}: точка подписи вне контура`,
    ).toBe(true);
  }
});

it('декоративная форма точки подписи не несёт: её никто не подписывает', () => {
  for (const shape of RELIEF_SHAPES.filter((s) => s.featureId === undefined)) {
    expect(shape.labelX, `${shape.key}`).toBeUndefined();
  }
});

it('шесть хребтов — цели, и каждый крупнее порога нажатия', () => {
  const ranges = physicalFeatures.filter(
    (feature) => feature.kind === 'landform' && feature.landform === 'range',
  );

  expect(ranges).toHaveLength(6);

  for (const range of ranges) {
    const shape = RELIEF_SHAPES.find((item) => item.featureId === range.id);
    expect(shape, `${range.id}: нет формы с таким featureId`).toBeDefined();

    const circle = largestInscribedCircle(parseMapPath(shape!.d));
    const px = unitsToPixels(circle.radius * 2, REFERENCE_MAP_WIDTH);
    expect(px, `${range.id}: цель ${px.toFixed(1)} px`).toBeGreaterThanOrEqual(
      MIN_TARGET_PX,
    );
  }
});

it('у каждого озера есть контур, и он лежит в рамке карты', () => {
  const lakes = physicalFeatures.filter((feature) => feature.kind === 'lake');

  expect(lakes).toHaveLength(6);

  for (const lake of lakes) {
    const shape = LAKE_SHAPES.find((item) => item.featureId === lake.id);
    expect(shape, `${lake.id}: нет контура`).toBeDefined();

    for (const [x, y] of parseMapPath(shape!.d).flat()) {
      expect(x, `${lake.id}: точка вне рамки`).toBeGreaterThanOrEqual(
        MAP_VIEWBOX_MIN_X,
      );
      expect(x).toBeLessThanOrEqual(MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH);
      expect(y).toBeGreaterThanOrEqual(MAP_VIEWBOX_MIN_Y);
      expect(y).toBeLessThanOrEqual(MAP_VIEWBOX_MIN_Y + MAP_VIEWBOX_HEIGHT);
    }
  }
});

it('знак озера стоит внутри своего контура, а не рядом с ним', () => {
  // Знак — то, во что целятся: контур озера меньше порога нажатия, и цель
  // строится вокруг знака. Знак вне воды означал бы, что нажимают по суше.
  for (const shape of LAKE_SHAPES) {
    expect(
      containsPoint(parseMapPath(shape.d), shape.markX, shape.markY),
      `${shape.featureId}: знак вне контура`,
    ).toBe(true);
  }
});
