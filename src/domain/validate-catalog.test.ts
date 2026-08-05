import { validateCatalog, validateCities } from './validate-catalog';
import { cities } from '../content/cities';
import { regions } from '../content/regions';
import { sources } from '../content/sources';

const source = {
  id: 'example-educational-source',
  title: 'Проверенный учебный источник',
  organization: 'Учебный центр',
  url: 'https://example.edu/source',
  accessedAt: '2026-08-01',
  covers: ['названия регионов'],
};

const region = {
  id: 'sichuan',
  kind: 'province' as const,
  nameRu: 'Сычуань',
  nameZh: '四川省',
  pinyin: 'Sìchuān shěng',
  capitalCityId: 'chengdu',
  mapAreaId: 'sichuan',
  facts: [],
  sourceIds: ['example-educational-source'],
};

it('accepts a complete catalog with a known source', () => {
  expect(() => validateCatalog([region], [source])).not.toThrow();
});

it('reports duplicate region and map area identifiers', () => {
  const validateDuplicates = () =>
    validateCatalog([region, { ...region }], [source]);

  expect(validateDuplicates).toThrow(/Повторяющийся id региона: sichuan/);
  expect(validateDuplicates).toThrow(/Повторяющийся mapAreaId: sichuan/);
});

it.each(['nameRu', 'nameZh', 'pinyin', 'capitalCityId'] as const)(
  'rejects an empty %s',
  (field) => {
    expect(() =>
      validateCatalog([{ ...region, [field]: ' ' }], [source]),
    ).toThrow();
  },
);

it('rejects an empty source list', () => {
  expect(() =>
    validateCatalog([{ ...region, sourceIds: [] }], [source]),
  ).toThrow(/Нет источников у региона: Сычуань/);
});

it('rejects an unknown source reference', () => {
  expect(() =>
    validateCatalog([{ ...region, sourceIds: ['missing'] }], [source]),
  ).toThrow(/Неизвестный источник: missing/);
});

it('rejects an unknown fact source reference', () => {
  expect(() =>
    validateCatalog(
      [
        {
          ...region,
          facts: [
            {
              title: 'Кухня',
              body: 'Сычуань известна кухней.',
              sourceIds: ['missing'],
            },
          ],
        },
      ],
      [source],
    ),
  ).toThrow(/Неизвестный источник: missing/);
});

it('rejects an unexpected number of regions', () => {
  expect(() =>
    validateCatalog([region], [source], { expectedRegionCount: 34 }),
  ).toThrow(/Ожидалось регионов: 34; получено: 1/);
});

it('validates all 34 production regions', () => {
  expect(() =>
    validateCatalog(regions, sources, { expectedRegionCount: 34 }),
  ).not.toThrow();
  expect(regions).toHaveLength(34);
});

const city = {
  id: 'chengdu',
  regionId: 'sichuan',
  set: 'capital' as const,
  nameRu: 'Чэнду',
  nameZh: '成都',
  pinyin: 'Chéngdū',
  lon: 104.068074,
  lat: 30.671946,
  sourceIds: ['example-educational-source'],
};

it('accepts a city with a known region and source', () => {
  expect(() => validateCities([city], [region], [source])).not.toThrow();
});

it('rejects a city pointing at an unknown region', () => {
  expect(() =>
    validateCities([{ ...city, regionId: 'atlantis' }], [region], [source]),
  ).toThrow(/Неизвестный регион/);
});

it('rejects duplicate city identifiers', () => {
  expect(() =>
    validateCities([city, { ...city, regionId: 'sichuan' }], [region], [source]),
  ).toThrow(/Повторяющийся id города/);
});

/*
 * Перепутанные местами долгота и широта дают точку в Индийском океане, а не
 * заметную опечатку в цифре: рамка ловит именно это.
 */
it('rejects coordinates outside China', () => {
  expect(() =>
    validateCities([{ ...city, lon: city.lat, lat: city.lon }], [region], [source]),
  ).toThrow(/Координаты вне Китая/);
});

it('requires exactly one administrative centre per region', () => {
  expect(() => validateCities([], [region], [source])).toThrow(
    /административных центров: 0/,
  );

  expect(() =>
    validateCities([city, { ...city, id: 'leshan' }], [region], [source]),
  ).toThrow(/административных центров: 2/);
});

it('validates the production city catalog', () => {
  expect(() => validateCities(cities, regions, sources)).not.toThrow();
});
