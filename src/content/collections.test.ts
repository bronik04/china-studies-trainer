import { collections, collectionsOfRegion } from './collections';

it('находит коллекции региона', () => {
  const ids = collectionsOfRegion('shaanxi').map((collection) => collection.id);

  expect(ids).toContain('silk-road');
});

it('даёт пустой список региону без коллекций', () => {
  expect(collectionsOfRegion('такого-региона-нет')).toEqual([]);
});

/*
 * Порядок каталога, а не порядок находки: тот же порядок ученик видит на
 * странице коллекций, и два разных порядка у одного набора он бы заметил.
 */
it('держит порядок каталога', () => {
  const regionId = collections.flatMap((collection) => collection.regionIds)[0];
  const positions = collectionsOfRegion(regionId).map((collection) =>
    collections.findIndex((item) => item.id === collection.id),
  );

  expect(positions.length).toBeGreaterThan(0);
  expect(positions).toEqual([...positions].sort((left, right) => left - right));
});

/* Привязка уже есть у коллекций — второго списка заводить не нужно. */
it('согласован с regionIds коллекции', () => {
  for (const collection of collections) {
    for (const regionId of collection.regionIds) {
      expect(collectionsOfRegion(regionId)).toContain(collection);
    }
  }
});
