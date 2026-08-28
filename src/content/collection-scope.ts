import { cityById } from './cities';
import type { Collection } from './collections';
import {
  physicalFeatureById,
  physicalKindLabel,
} from './physical-features';
import { regionsWord } from './region-count';
import { REGION_KIND_LABELS } from './regions';
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
 * Подпись под названием на карточке: охват плюс то, что там есть. Про
 * отсутствие снимков сказано прямо — иначе карточка с одним лишь названием
 * выглядит сломанной, а не незаполненной.
 */
export function collectionCardSubtitle(
  collection: Collection,
  regions: readonly Region[],
): string {
  /*
   * У коллекции о регионе охват — сам регион, и подпись повторила бы
   * заголовок карточки слово в слово: «Юньнань» под «Юньнань». Род и
   * административный центр говорят то, чего в заголовке нет, а обещание
   * фотографий здесь лишнее: такая коллекция держится справкой, а не съёмкой.
   */
  const about =
    collection.aboutRegionId === undefined
      ? undefined
      : regions.find(({ id }) => id === collection.aboutRegionId);
  if (about !== undefined) {
    const capital = cityById(about.capitalCityId);
    const kind = REGION_KIND_LABELS[about.kind];

    return capital === undefined ? kind : `${kind} · центр ${capital.nameRu}`;
  }

  /*
   * У коллекции об объекте — род и охват. Прежняя подпись обещала здесь
   * фотографии («Семь регионов · фотографий пока нет»), которых никто не
   * задумывал: снимков у объектов нет и в планах, а страница держится
   * справкой.
   */
  const feature =
    collection.aboutFeatureId === undefined
      ? undefined
      : physicalFeatureById(collection.aboutFeatureId);
  if (feature !== undefined) {
    return `${physicalKindLabel(feature)} · ${collectionScope(collection, regions).toLowerCase()}`;
  }

  const scope = collectionScope(collection, regions);

  return collection.photos.length === 0
    ? `${scope} · фотографий пока нет`
    : `${scope} · снимков: ${collection.photos.length}`;
}
