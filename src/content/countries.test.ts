import { countries } from './countries';
import { sources } from './sources';

it('знает четырнадцать сухопутных соседей', () => {
  expect(countries).toHaveLength(14);
  expect(countries.map((country) => country.id).sort()).toEqual([
    'afghanistan',
    'bhutan',
    'india',
    'kazakhstan',
    'kyrgyzstan',
    'laos',
    'mongolia',
    'myanmar',
    'nepal',
    'north-korea',
    'pakistan',
    'russia',
    'tajikistan',
    'vietnam',
  ]);
});

it('не содержит Тайвань, Гонконг и Макао: на нашей карте это регионы Китая', () => {
  const ids = countries.map((country) => country.id);

  for (const own of ['taiwan', 'hong-kong', 'macao']) {
    expect(ids).not.toContain(own);
  }
});

it('у каждой страны есть имя на двух языках и известный источник', () => {
  const known = new Set<string>(sources.map((source) => source.id));

  for (const country of countries) {
    expect(country.nameRu.trim().length).toBeGreaterThan(0);
    expect(country.nameZh.trim().length).toBeGreaterThan(0);
    expect(country.sourceIds.length).toBeGreaterThan(0);
    for (const sourceId of country.sourceIds) {
      expect(known.has(sourceId)).toBe(true);
    }
  }
});
