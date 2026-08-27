import {
  collectionById,
  collections,
  collectionsInGroup,
  collectionsOfRegion,
  isDraft,
  otherCollectionsOfRegion,
} from './collections';
import { PHOTO_CREDITS } from './photo-credits';
import { physicalFeatures } from './physical-features';
import { regions } from './regions';

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

/*
 * Коллекция «по регионам» — сам регион, прочитанный как коллекция, и потому
 * их ровно столько же. Прежде их было четыре из тридцати четырёх: тридцать
 * регионов со справкой, источниками и городами оставались без страницы.
 */
it('даёт коллекцию каждому региону справочника', () => {
  const byRegion = collectionsInGroup('by-region');

  expect(byRegion).toHaveLength(regions.length);
  expect(byRegion.map((collection) => collection.id)).toEqual(
    regions.map((region) => `region-${region.id}`),
  );
});

it('не пишет имя региона второй раз, а берёт из справочника', () => {
  for (const region of regions) {
    const collection = collectionById(`region-${region.id}`);

    expect(collection?.nameRu).toBe(region.nameRu);
    expect(collection?.nameZh).toBe(region.nameZh);
    expect(collection?.pinyin).toBe(region.pinyin);
    expect(collection?.aboutRegionId).toBe(region.id);
  }
});

/*
 * Черновик — тот, у кого нет источника. У коллекции региона он есть всегда:
 * источники её справки и самого справочника. Иначе тридцать четыре страницы
 * назвались бы непроверенными, хотя стоят на том же, что и атлас.
 */
it('коллекция региона не черновик: у неё источники её же справки', () => {
  for (const region of regions) {
    const collection = collectionById(`region-${region.id}`);
    const factSourceIds = region.facts.flatMap((fact) => fact.sourceIds);

    expect(collection === undefined ? true : isDraft(collection)).toBe(false);
    for (const sourceId of factSourceIds) {
      expect(collection?.sourceIds).toContain(sourceId);
    }
  }
});

/* Дописанное руками не теряется при выводе коллекции из региона. */
it('сохраняет вводку и заметки там, где их написали', () => {
  const yunnan = collectionById('region-yunnan');

  expect(yunnan?.lead).toContain('Юньнань — горная');
  expect(yunnan?.notes).toHaveLength(4);
  expect(yunnan?.relatedIds).toContain('yuanyang-terraces');
});

/*
 * Инвариант каталога держит `collectionsOfRegion`, а не эта функция: «что ещё
 * почитать про Юньнань» — вопрос о других страницах, и «Юньнань» в ответе на
 * него ученик прочтёт как ошибку, а не как ссылку.
 */
it('«что ещё» не предлагает коллекцию о самом регионе', () => {
  const ids = otherCollectionsOfRegion('yunnan').map(({ id }) => id);

  expect(ids).not.toContain('region-yunnan');
  expect(ids).toContain('yuanyang-terraces');
  expect(collectionsOfRegion('yunnan').map(({ id }) => id)).toContain(
    'region-yunnan',
  );
});

/*
 * Ради этого всё и сделано: факты об объекте пишутся один раз в справочнике и
 * попадают сразу на обе поверхности — в карточку атласа и на страницу
 * коллекции. Второго списка объектов не заводится.
 */
it('даёт коллекцию каждому объекту физической географии', () => {
  const geography = collectionsInGroup('geography');
  const derived = geography.filter(
    (collection) => collection.aboutFeatureId !== undefined,
  );

  expect(derived).toHaveLength(physicalFeatures.length);
  expect(derived.map((collection) => collection.aboutFeatureId)).toEqual(
    physicalFeatures.map((feature) => feature.id),
  );
  for (const feature of physicalFeatures) {
    const collection = collectionById(`feature-${feature.id}`);

    expect(collection?.nameRu).toBe(feature.nameRu);
    expect(collection?.nameZh).toBe(feature.nameZh);
    expect(collection?.pinyin).toBe(feature.pinyin);
  }
});

/*
 * `heilongjiang` есть и у провинции, и у реки Амур. Приставка справочника —
 * не украшение: без неё одна страница молча закрыла бы другую, потому что
 * `collectionById` вернёт первую попавшуюся.
 */
it('разводит одноимённые объект и регион по разным страницам', () => {
  const river = collectionById('feature-heilongjiang');
  const province = collectionById('region-heilongjiang');

  expect(river?.nameRu).toBe('Хэйлунцзян');
  expect(river?.kind).toBe('река');
  expect(province?.kind).toBe('провинция');
  expect(new Set(collections.map(({ id }) => id)).size).toBe(collections.length);
});

/*
 * У Хуанхэ два списка регионов, и они не равны: география говорит девять,
 * а `validate:map` требует перечислять только те, которых линия действительно
 * касается, — Сычуань она обходит. Дописка позволяет странице говорить о
 * географии, не переписывая проверяемый список.
 */
it('позволяет странице объекта назвать свой охват точнее карты', () => {
  const collection = collectionById('feature-yellow-river');
  const feature = physicalFeatures.find(({ id }) => id === 'yellow-river');

  expect(collection?.regionIds).toContain('sichuan');
  expect(feature?.regionIds).not.toContain('sichuan');
});

/*
 * Снимок есть ровно тогда, когда он лежит в `PHOTO_CREDITS`, а тот файл пишет
 * генератор по тому, что действительно скачал. Проверяется обратное
 * направление: запись об авторе без снимка в каталоге — мёртвый вес, и её
 * забыли бы убрать вместе со слотом.
 */
it('у каждой записи об авторе есть снимок в каталоге', () => {
  const used = new Set(
    collections.flatMap((collection) => collection.photos.map(({ id }) => id)),
  );

  for (const id of Object.keys(PHOTO_CREDITS)) {
    expect(used, `запись ${id} ни к чему не привязана`).toContain(id);
  }
});

/* Показ по CC BY и CC BY-SA разрешён при условии, что автор назван. */
it('у каждого снимка есть автор и лицензия', () => {
  for (const [id, credit] of Object.entries(PHOTO_CREDITS)) {
    expect(credit.author.trim().length, id).toBeGreaterThan(0);
    expect(credit.license, id).toMatch(/^(CC0|CC BY|Public domain)/i);
    expect(credit.widths.length, id).toBeGreaterThan(0);
  }
});
