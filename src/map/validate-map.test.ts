import {
  validateCityPlacement,
  validateMapAreaIds,
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
