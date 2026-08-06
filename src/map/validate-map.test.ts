import mapMarkup from '../../public/maps/china-provinces.svg?raw';
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
import {
  validateCityPlacement,
  validateMapAreaIds,
  validatePhysicalGeometry,
  validateRegionPalette,
  validateTargetSizes,
  validateViewBox,
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
    },
    {
      contains: (mapAreaId, x, y) => containsPoint(ringsOf(mapAreaId), x, y),
      distanceToBoundary: (mapAreaId, x, y) =>
        distanceToBoundary(ringsOf(mapAreaId), x, y),
      mapAreaOf: (regionId) => mapAreaOf.get(regionId),
    },
  );
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

it('у каждой формы-цели есть точка подписи, и она лежит внутри контура', () => {
  const targets = RELIEF_SHAPES.filter((shape) => shape.featureId !== undefined);

  expect(targets).toHaveLength(6);

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
