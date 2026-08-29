import { collections, type Collection } from './collections';

/**
 * Что спрашивать в режиме «узнать по фотографии».
 *
 * Наборы вложены: каждый следующий включает предыдущий — то же устройство, что
 * у городов и физической географии. Ученик выбирает, докуда, а не какой один.
 *
 * Порядок не случаен. Первый набор — то, ради чего режим и заявлен карточкой:
 * памятник, праздник, ремесло. Достопримечательности идут в нём же: это ровно
 * те памятники, о которых говорит карточка. Дальше идёт природа, дальше регионы: снимок
 * провинции узнаётся труднее всего, потому что провинция — не предмет, а
 * место, и на кадре от неё видна одна подробность.
 */
export type CultureSet = 'culture' | 'nature' | 'all';

export const CULTURE_SETS: Readonly<Record<CultureSet, string>> = {
  culture: 'Памятники и явления',
  nature: 'И природа',
  all: 'И регионы',
};

/**
 * Спрашиваются только коллекции со снимком: без него вопроса не существует.
 * Условие — наличие снимка в каталоге, а не список идентификаторов: список
 * разошёлся бы с каталогом при первом же пополнении.
 */
function withPhoto(list: readonly Collection[]): readonly Collection[] {
  return list.filter((collection) => collection.photos.length > 0);
}

/** Памятники и явления: культура плюс написанные вручную объекты на карте. */
const CULTURE = withPhoto(
  collections.filter(
    (collection) =>
      collection.groupId === 'culture' ||
      (collection.groupId === 'geography' &&
        collection.aboutFeatureId === undefined &&
        collection.aboutLandmarkId === undefined),
  ),
);

const NATURE = withPhoto(
  collections.filter((collection) => collection.aboutFeatureId !== undefined),
);

/**
 * Достопримечательности — свой род отвлекающих. Памятник не спутать с рекой по
 * виду кадра, и без отдельного рода вопрос о Потале решался бы тем, что три
 * варианта из четырёх — реки.
 */
const LANDMARKS = withPhoto(
  collections.filter((collection) => collection.aboutLandmarkId !== undefined),
);

const REGIONS = withPhoto(
  collections.filter((collection) => collection.aboutRegionId !== undefined),
);

export function cultureCollectionsUpTo(
  set: CultureSet,
): readonly Collection[] {
  if (set === 'culture') {
    return [...CULTURE, ...LANDMARKS];
  }

  return set === 'nature'
    ? [...CULTURE, ...LANDMARKS, ...NATURE]
    : [...CULTURE, ...LANDMARKS, ...NATURE, ...REGIONS];
}

/**
 * Откуда брать отвлекающие: коллекции того же рода, что и цель.
 *
 * Иначе вопрос решается видом кадра, а не знанием: снимок горы не может
 * оказаться праздником, и три из четырёх вариантов отпадают, не будучи
 * прочитанными. Тот же довод, что у отвлекающих в физической географии.
 */
export function sameKindAs(collection: Collection): readonly Collection[] {
  if (collection.aboutRegionId !== undefined) {
    return REGIONS;
  }

  if (collection.aboutLandmarkId !== undefined) {
    return LANDMARKS;
  }

  return collection.aboutFeatureId !== undefined ? NATURE : CULTURE;
}
