import type { Collection } from './collections';
import { regionsWord } from './region-count';
import type { Region } from './types';

/**
 * Одной строкой: где эта коллекция на карте.
 *
 * Счёт не пишется в контенте руками. Написанное «шесть регионов» рядом со
 * списком из девяти — обычная судьба такой строки: список правят, подпись
 * забывают. Здесь она выводится из самого списка и разойтись с ним не может.
 */

const NUMERALS: Readonly<Record<number, string>> = {
  2: 'Два',
  3: 'Три',
  4: 'Четыре',
  5: 'Пять',
  6: 'Шесть',
  7: 'Семь',
  8: 'Восемь',
  9: 'Девять',
  10: 'Десять',
};

export function collectionScope(
  collection: Collection,
  regions: readonly Region[],
): string {
  if (collection.scopeLabel !== undefined) {
    return collection.scopeLabel;
  }

  const { regionIds } = collection;
  if (regionIds.length === 0) {
    return 'Регионы не указаны';
  }

  if (regionIds.length === 1) {
    const region = regions.find(({ id }) => id === regionIds[0]);
    return region?.nameRu ?? regionIds[0];
  }

  const count = NUMERALS[regionIds.length] ?? String(regionIds.length);

  return `${count} ${regionsWord(regionIds.length)}`;
}

/**
 * Подпись под названием на карточке: охват плюс то, чего пока нет. Про
 * отсутствие снимков сказано прямо — иначе карточка с одним лишь названием
 * выглядит сломанной, а не незаполненной.
 */
export function collectionCardSubtitle(
  collection: Collection,
  regions: readonly Region[],
): string {
  const scope = collectionScope(collection, regions);

  return collection.photos.length === 0
    ? `${scope} · фотографий пока нет`
    : `${scope} · мест под съёмку: ${collection.photos.length}`;
}
