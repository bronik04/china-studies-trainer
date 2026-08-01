import { validateCatalog } from './validate-catalog';

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
  capitalRu: 'Чэнду',
  capitalZh: '成都',
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

it.each(['nameRu', 'nameZh', 'pinyin', 'capitalRu', 'capitalZh'] as const)(
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
