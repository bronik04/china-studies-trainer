import { expect, it } from 'vitest';
import { collectionCardSubtitle, collectionScope } from './collection-scope';
import { collectionById, collections, type Collection } from './collections';
import { regions } from './regions';

/*
 * `collections` объявлен через `as const`, поэтому его тип — union из двенадцати
 * литералов, и необязательные поля видны только у тех, у кого они есть.
 * Обходу по списку нужен общий тип: он проверяет как раз тех, у кого поля нет.
 */
const all: readonly Collection[] = collections;

function byId(id: string) {
  const collection = collectionById(id);
  if (collection === undefined) {
    throw new Error(`Нет коллекции ${id}`);
  }

  return collection;
}

it('один регион называется по имени, а не числом', () => {
  expect(collectionScope(byId('taklamakan'), regions)).toBe(
    'Синьцзян-Уйгурский автономный район',
  );
});

it('несколько регионов считаются по списку, а не по подписи в контенте', () => {
  expect(collectionScope(byId('great-wall'), regions)).toBe('Девять регионов');
  expect(collectionScope(byId('silk-road'), regions)).toBe('Пять регионов');
});

it('охват без привязки к регионам берётся из подписи', () => {
  expect(collectionScope(byId('spring-festival'), regions)).toBe('Вся страна');
});

it('подпись карточки прямо говорит, что фотографий нет', () => {
  expect(collectionCardSubtitle(byId('yunnan'), regions)).toBe(
    'Юньнань · фотографий пока нет',
  );
});

it('подпись карточки не обещает снимков больше, чем описано мест', () => {
  const wall = byId('great-wall');

  expect(collectionCardSubtitle(wall, regions)).toBe(
    `Девять регионов · мест под съёмку: ${wall.photos.length}`,
  );
});

it('каждый регион коллекции есть в справочнике регионов', () => {
  const known = new Set(regions.map((region) => region.id));

  for (const collection of all) {
    for (const regionId of collection.regionIds) {
      expect(known, `${collection.id}: неизвестный регион ${regionId}`).toContain(
        regionId,
      );
    }
  }
});

it('каждая связанная коллекция существует', () => {
  for (const collection of all) {
    for (const relatedId of collection.relatedIds) {
      expect(
        collectionById(relatedId),
        `${collection.id}: нет коллекции ${relatedId}`,
      ).toBeDefined();
    }
  }
});

it('коллекция без регионов обязана объяснить свой охват словом', () => {
  for (const collection of all) {
    if (collection.regionIds.length === 0) {
      expect(
        collection.scopeLabel,
        `${collection.id}: ни регионов, ни подписи охвата`,
      ).toBeDefined();
    }
  }
});
