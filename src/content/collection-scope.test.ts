import { expect, it } from 'vitest';
import { collectionCardSubtitle, collectionScope } from './collection-scope';
import { collectionById, collections, type Collection } from './collections';
import { regions } from './regions';

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

/*
 * Прежде подпись повторяла заголовок карточки слово в слово: «Юньнань» под
 * «Юньнань». На четырёх коллекциях это была мелочь, на тридцати четырёх —
 * колонка одинаковых строк.
 */
it('подпись карточки региона не повторяет её заголовок', () => {
  expect(collectionCardSubtitle(byId('yunnan'), regions)).toBe(
    'Провинция · центр Куньмин',
  );
});

it('подпись карточки прямо говорит, что фотографий нет', () => {
  expect(collectionCardSubtitle(byId('taklamakan'), regions)).toBe(
    'Синьцзян-Уйгурский автономный район · фотографий пока нет',
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
