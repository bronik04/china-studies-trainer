import type {
  City,
  Dynasty,
  DynastyCapital,
  PhysicalFeature,
  Region,
  Ruler,
  Source,
} from '../content/types';
import { CHOICE_COUNT } from './choices';
import type { Collection } from '../content/collections';

type ValidationOptions = {
  expectedRegionCount?: number;
};

export class ContentValidationError extends Error {
  constructor(errors: readonly string[]) {
    super(errors.join('\n'));
    this.name = 'ContentValidationError';
  }
}

export function validateCatalog(
  regions: readonly Region[],
  sources: readonly Source[],
  options: ValidationOptions = {},
): void {
  const errors: string[] = [];
  const regionIds = new Set<string>();
  const mapAreaIds = new Set<string>();
  const sourceIds = new Set(sources.map((source) => source.id));

  if (regions.length === 0) {
    errors.push('Справочник регионов пуст.');
  }

  if (
    options.expectedRegionCount !== undefined &&
    regions.length !== options.expectedRegionCount
  ) {
    errors.push(
      `Ожидалось регионов: ${options.expectedRegionCount}; получено: ${regions.length}`,
    );
  }

  for (const region of regions) {
    if (regionIds.has(region.id)) {
      errors.push(`Повторяющийся id региона: ${region.id}`);
    }
    regionIds.add(region.id);

    if (mapAreaIds.has(region.mapAreaId)) {
      errors.push(`Повторяющийся mapAreaId: ${region.mapAreaId}`);
    }
    mapAreaIds.add(region.mapAreaId);

    for (const field of [
      ['id', region.id],
      ['nameRu', region.nameRu],
      ['nameZh', region.nameZh],
      ['pinyin', region.pinyin],
      ['capitalCityId', region.capitalCityId],
      ['mapAreaId', region.mapAreaId],
    ] as const) {
      if (field[1].trim().length === 0) {
        errors.push(`Пустое поле ${field[0]} у региона: ${region.id || 'без id'}`);
      }
    }

    if (region.sourceIds.length === 0) {
      errors.push(`Нет источников у региона: ${region.nameRu}`);
    }

    for (const sourceId of region.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Неизвестный источник: ${sourceId}`);
      }
    }

    if (region.facts.length < 2 || region.facts.length > 3) {
      errors.push(
        `Регион ${region.id}: фактов должно быть 2–3, сейчас ${region.facts.length}`,
      );
    }

    /*
     * Тема факта служит React-ключом в справке карточки атласа, поэтому
     * внутри одного носителя темы обязаны быть уникальны.
     */
    const factTitles = new Set<string>();

    for (const fact of region.facts) {
      if (fact.title.trim().length === 0 || fact.body.trim().length === 0) {
        errors.push(`Регион ${region.id}: пустые title или body у факта`);
      }
      if (factTitles.has(fact.title)) {
        errors.push(`Регион ${region.id}: повторяющаяся тема факта «${fact.title}»`);
      }
      factTitles.add(fact.title);
      if (/<[a-z/]/i.test(fact.body)) {
        errors.push(`Регион ${region.id}: HTML в тексте факта «${fact.title}»`);
      }
      if (fact.sourceIds.length === 0) {
        errors.push(`Регион ${region.id}: факт «${fact.title}» без источника`);
      }
      for (const sourceId of fact.sourceIds) {
        if (!sourceIds.has(sourceId)) {
          errors.push(`Неизвестный источник: ${sourceId}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new ContentValidationError(errors);
  }
}

/**
 * Проверка справочника городов. Отдельной функцией, а не внутри
 * `validateCatalog`: города ссылаются на регионы, но не наоборот, и порядок
 * проверок должен это повторять — сначала регионы сами по себе.
 *
 * Границы Китая здесь заданы с запасом: рамка ловит перепутанные местами
 * долготу и широту и потерянный знак, а не подменяет геометрическую проверку
 * «точка внутри своего региона» — та живёт в `validate:map`, потому что
 * требует самой карты.
 */
const CHINA_BOUNDS = { minLon: 73, maxLon: 135, minLat: 17, maxLat: 54 } as const;

export function validateCities(
  cities: readonly City[],
  regions: readonly Region[],
  sources: readonly Source[],
): void {
  const errors: string[] = [];
  const cityIds = new Set<string>();
  const regionIds = new Set(regions.map((region) => region.id));
  const sourceIds = new Set(sources.map((source) => source.id));
  const capitalsByRegion = new Map<string, string[]>();

  if (cities.length === 0) {
    errors.push('Справочник городов пуст.');
  }

  for (const city of cities) {
    if (cityIds.has(city.id)) {
      errors.push(`Повторяющийся id города: ${city.id}`);
    }
    cityIds.add(city.id);

    if (!regionIds.has(city.regionId)) {
      errors.push(`Неизвестный регион у города ${city.id}: ${city.regionId}`);
    }

    for (const field of [
      ['id', city.id],
      ['nameRu', city.nameRu],
      ['nameZh', city.nameZh],
      ['pinyin', city.pinyin],
    ] as const) {
      if (field[1].trim().length === 0) {
        errors.push(`Пустое поле ${field[0]} у города: ${city.id || 'без id'}`);
      }
    }

    if (
      city.lon < CHINA_BOUNDS.minLon ||
      city.lon > CHINA_BOUNDS.maxLon ||
      city.lat < CHINA_BOUNDS.minLat ||
      city.lat > CHINA_BOUNDS.maxLat
    ) {
      errors.push(`Координаты вне Китая у города ${city.id}: ${city.lon}, ${city.lat}`);
    }

    if (city.sourceIds.length === 0) {
      errors.push(`Нет источников у города: ${city.nameRu}`);
    }

    for (const sourceId of city.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Неизвестный источник: ${sourceId}`);
      }
    }

    if (city.set === 'capital') {
      const known = capitalsByRegion.get(city.regionId) ?? [];
      known.push(city.id);
      capitalsByRegion.set(city.regionId, known);
    }
  }

  for (const region of regions) {
    if (!cityIds.has(region.capitalCityId)) {
      errors.push(
        `Неизвестный административный центр у региона ${region.id}: ${region.capitalCityId}`,
      );
    }

    const capitals = capitalsByRegion.get(region.id) ?? [];
    if (capitals.length !== 1) {
      errors.push(
        `У региона ${region.id} административных центров: ${capitals.length} (${
          capitals.join(', ') || 'ни одного'
        }); нужен ровно один`,
      );
    } else if (capitals[0] !== region.capitalCityId) {
      errors.push(
        `Регион ${region.id} называет центром ${region.capitalCityId}, ` +
          `а в справочнике городов центр — ${capitals[0]}`,
      );
    }
  }

  if (errors.length > 0) {
    throw new ContentValidationError(errors);
  }
}

/**
 * Проверка справочника физической географии. Отдельной функцией, как и у
 * городов: объекты ссылаются на регионы, но не наоборот.
 *
 * Геометрию здесь не проверить — для неё нужна сама карта, и живёт та
 * проверка в `validate:map`. Здесь — то, что видно по одному справочнику.
 */
export function validatePhysicalFeatures(
  features: readonly PhysicalFeature[],
  regions: readonly Region[],
  sources: readonly Source[],
  options: { readonly expectedCount?: number } = {},
): void {
  const errors: string[] = [];
  const featureIds = new Set<string>();
  const regionIds = new Set(regions.map((region) => region.id));
  const sourceIds = new Set(sources.map((source) => source.id));
  const ownerOfSegment = new Map<number, string>();

  if (features.length === 0) {
    errors.push('Справочник физической географии пуст.');
  }

  if (
    options.expectedCount !== undefined &&
    features.length !== options.expectedCount
  ) {
    errors.push(
      `Ожидалось физических целей: ${options.expectedCount}; получено: ${features.length}`,
    );
  }

  for (const feature of features) {
    if (featureIds.has(feature.id)) {
      errors.push(`Повторяющийся id физической цели: ${feature.id}`);
    }
    featureIds.add(feature.id);

    for (const field of [
      ['id', feature.id],
      ['nameRu', feature.nameRu],
      ['nameZh', feature.nameZh],
      ['pinyin', feature.pinyin],
    ] as const) {
      if (field[1].trim().length === 0) {
        errors.push(
          `Пустое поле ${field[0]} у физической цели: ${feature.id || 'без id'}`,
        );
      }
    }

    if (feature.regionIds.length === 0) {
      errors.push(`Не заявлено ни одного региона у цели: ${feature.id}`);
    }

    for (const regionId of feature.regionIds) {
      if (!regionIds.has(regionId)) {
        errors.push(`Неизвестный регион у цели ${feature.id}: ${regionId}`);
      }
    }

    if (feature.sourceIds.length === 0) {
      errors.push(`Нет источников у физической цели: ${feature.nameRu}`);
    }

    for (const sourceId of [
      ...feature.sourceIds,
      ...feature.facts.flatMap((fact) => fact.sourceIds),
    ]) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Неизвестный источник: ${sourceId}`);
      }
    }

    /*
     * Столько же, сколько у региона: меньше двух — карточка снова молчит,
     * больше трёх — справка перестаёт помещаться рядом с картой.
     */
    if (feature.facts.length < 2 || feature.facts.length > 3) {
      errors.push(
        `У цели ${feature.id} фактов должно быть 2–3, сейчас ${feature.facts.length}`,
      );
    }

    /*
     * Тема факта служит React-ключом в справке карточки атласа, поэтому
     * внутри одного носителя темы обязаны быть уникальны.
     */
    const factTitles = new Set<string>();
    for (const fact of feature.facts) {
      if (fact.title.trim().length === 0 || fact.body.trim().length === 0) {
        errors.push(`У цели ${feature.id}: пустые title или body у факта`);
      }
      if (factTitles.has(fact.title)) {
        errors.push(
          `У цели ${feature.id} повторяющаяся тема факта «${fact.title}»`,
        );
      }
      factTitles.add(fact.title);
      if (/<[a-z/]/i.test(fact.body)) {
        errors.push(`У цели ${feature.id}: HTML в тексте факта «${fact.title}»`);
      }
      if (fact.sourceIds.length === 0) {
        errors.push(`У цели ${feature.id}: факт «${fact.title}» без источника`);
      }
    }

    if (feature.kind === 'river') {
      if (feature.riverNums.length === 0) {
        errors.push(`У реки ${feature.id} не указано ни одного отрезка`);
      }

      for (const num of feature.riverNums) {
        if (!Number.isInteger(num)) {
          errors.push(`Номер отрезка не целое число у реки ${feature.id}: ${num}`);
        }

        /*
         * Отрезок принадлежит ровно одной реке. Отданный двум, он вошёл бы в
         * обе линии, и обе стали бы неверны — а на карте это выглядело бы
         * правдоподобно.
         */
        const owner = ownerOfSegment.get(num);
        if (owner !== undefined) {
          errors.push(`Отрезок ${num} отдан и реке ${owner}, и реке ${feature.id}`);
        }
        ownerOfSegment.set(num, feature.id);
      }
    } else if (feature.kind === 'lake') {
      /*
       * У озера номер играет ту же роль, что у реки: имена в наборе не
       * уникальны, и озеро без номера означало бы цель без геометрии.
       */
      if (feature.lakeIds.length === 0) {
        errors.push(`У озера ${feature.id} не указано ни одного номера`);
      }

      for (const id of feature.lakeIds) {
        if (!Number.isInteger(id)) {
          errors.push(`Номер объекта не целое число у озера ${feature.id}: ${id}`);
        }
      }
    } else if (feature.kind === 'marine') {
      /* Морская цель связана с набором тем же одним номером, что озеро. */
      if (!Number.isInteger(feature.neId)) {
        errors.push(
          `Номер объекта не целое число у морской цели ${feature.id}: ${feature.neId}`,
        );
      }
    } else if (feature.kind === 'point') {
      /*
       * У точки нет контура вовсе: на карте она живёт знаком, и связывает её с
       * набором один номер. Номер не целый означал бы цель без места.
       */
      if (!Number.isInteger(feature.neId)) {
        errors.push(
          `Номер объекта не целое число у точки ${feature.id}: ${feature.neId}`,
        );
      }
    } else if (feature.kind === 'gorge') {
      /*
       * У участка реки нет ни номеров отрезков, ни ступени: его геометрия
       * вырезается из линии той реки, которую он называет. Значит, река должна
       * существовать и быть рекой — иначе резать будет нечего.
       */
      const parent = features.find((one) => one.id === feature.partOf);
      if (parent === undefined || parent.kind !== 'river') {
        errors.push(
          `Участок ${feature.id} назвал рекой ${feature.partOf}, а такой реки в справочнике нет`,
        );
      }
    } else if (feature.kind === 'canal') {
      /*
       * Своих полей у канала нет: геометрия приходит по номеру отношения OSM
       * из входов генератора, и проверяет её `validate:map`. Ветка нужна,
       * чтобы канал не дошёл до проверки ступени, которой у него нет.
       */
    } else if (![1, 2, 3].includes(feature.step)) {
      errors.push(`Ступень рельефа у ${feature.id} вне 1..3: ${feature.step}`);
    }
  }

  if (errors.length > 0) {
    throw new ContentValidationError(errors);
  }
}

/**
 * Проверка справочника коллекций. Отдельной функцией, как города и
 * физическая география: коллекции ссылаются на источники, но не наоборот.
 */
export function validateCollections(
  collections: readonly Collection[],
  sources: readonly Source[],
): void {
  const errors: string[] = [];
  const sourceIds = new Set(sources.map((source) => source.id));
  const seenIds = new Set<string>();

  for (const collection of collections) {
    /*
     * Идентификаторы коллекций теперь из двух источников: написанные руками и
     * взятые у регионов. Совпадение молча спрятало бы одну страницу за
     * другой — `collectionById` вернёт первую.
     */
    if (seenIds.has(collection.id)) {
      errors.push(`Коллекция ${collection.id}: повторный идентификатор`);
    }
    seenIds.add(collection.id);

    if (
      collection.aboutRegionId !== undefined &&
      !collection.regionIds.includes(collection.aboutRegionId)
    ) {
      errors.push(
        `Коллекция ${collection.id}: регион ${collection.aboutRegionId} не в её списке`,
      );
    }
    /*
     * У страницы один предмет: регион, объект физической карты,
     * достопримечательность — или ни один из трёх, и тогда страница написана
     * руками. Двух предметов сразу не бывает: из-за двух страниц об одной
     * пустыне ученик мог получить два вопроса об одном предмете за раунд
     * (дефект 2026-08-28).
     */
    const subjects = [
      collection.aboutRegionId,
      collection.aboutFeatureId,
      collection.aboutLandmarkId,
    ].filter((one) => one !== undefined);

    if (subjects.length > 1) {
      errors.push(
        `Коллекция ${collection.id}: у страницы больше одного предмета`,
      );
    }

    /*
     * Коллекция о регионе или об объекте не пишет вводку и заметки: её тело —
     * справка из справочника, и та проверена своим правилом. Требовать здесь
     * ещё три заметки значило бы требовать написать то же самое дважды.
     * Дописанные сверх справки — по общему правилу: три-четыре или ни одной.
     */
    const written = subjects.length === 0;
    if (written && collection.lead.trim().length === 0) {
      errors.push(`Коллекция ${collection.id}: пустая вводка`);
    }
    if (
      (written || collection.notes.length > 0) &&
      (collection.notes.length < 3 || collection.notes.length > 4)
    ) {
      errors.push(
        `Коллекция ${collection.id}: заметок должно быть 3–4, сейчас ${collection.notes.length}`,
      );
    }
    /*
     * Идентификатор снимка — это и имя файла в `public/photos`, и ключ записи
     * об авторе. Повтор внутри коллекции значил бы, что один снимок показан
     * дважды, а `id` служит ключом React в сетке.
     */
    const photoIds = new Set<string>();
    for (const photo of collection.photos) {
      if (photoIds.has(photo.id)) {
        errors.push(`Коллекция ${collection.id}: повторный снимок ${photo.id}`);
      }
      photoIds.add(photo.id);
      if (
        photo.subject.trim().length === 0 ||
        photo.captionRu.trim().length === 0 ||
        photo.place.trim().length === 0
      ) {
        errors.push(
          `Коллекция ${collection.id}: у снимка ${photo.id} пустое описание`,
        );
      }
    }

    if (collection.sourceIds.length === 0) {
      errors.push(`Коллекция ${collection.id}: без источников`);
    }
    for (const sourceId of collection.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        errors.push(
          `Коллекция ${collection.id}: неизвестный источник — ${sourceId}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new ContentValidationError(errors);
  }
}

/**
 * Династии, их столицы и правители.
 *
 * Прежде лента не проверялась вовсе: её `sourceIds` никто не сверял с
 * каталогом источников, и опечатка в идентификаторе дожила бы до экрана.
 */
export function validateDynasties(
  dynasties: readonly Dynasty[],
  capitals: readonly DynastyCapital[],
  rulers: readonly Ruler[],
  cities: readonly City[],
  sources: readonly Source[],
): void {
  const errors: string[] = [];
  const sourceIds = new Set(sources.map((source) => source.id));
  const dynastyIds = new Set(dynasties.map((dynasty) => dynasty.id));
  const cityIds = new Set(cities.map((city) => city.id));

  const checkSources = (
    what: string,
    ids: readonly string[],
  ): void => {
    if (ids.length === 0) {
      errors.push(`У ${what} нет источника`);
    }

    for (const sourceId of ids) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`Неизвестный источник: ${sourceId}`);
      }
    }
  };

  for (const dynasty of dynasties) {
    if (dynasty.from >= dynasty.to) {
      errors.push(`Срок династии ${dynasty.id} идёт вспять`);
    }

    checkSources(`династии ${dynasty.id}`, dynasty.sourceIds);
  }

  /* Спрашиваемых столиц на династию — не больше одной: цель спрашивается раз. */
  const askedByDynasty = new Map<string, number>();

  for (const capital of capitals) {
    if (!dynastyIds.has(capital.dynastyId)) {
      errors.push(`Столица ${capital.id} ссылается на чужую династию`);
    }

    if (!cityIds.has(capital.cityId)) {
      errors.push(`Столица ${capital.id} ссылается на город вне каталога`);
    }

    checkSources(`столицы ${capital.id}`, capital.sourceIds);

    if (capital.asked) {
      askedByDynasty.set(
        capital.dynastyId,
        (askedByDynasty.get(capital.dynastyId) ?? 0) + 1,
      );
    }
  }

  for (const [dynastyId, count] of askedByDynasty) {
    if (count > 1) {
      errors.push(
        `У династии ${dynastyId} ${count} спрашиваемых столиц: цель раунда ` +
          'спрашивается ровно один раз',
      );
    }
  }

  const rulerDynasties = new Set<string>();

  for (const ruler of rulers) {
    const dynasty = dynasties.find((item) => item.id === ruler.dynastyId);
    if (dynasty === undefined) {
      errors.push(`Правитель ${ruler.id} ссылается на чужую династию`);
    }

    if (rulerDynasties.has(ruler.dynastyId)) {
      errors.push(`У династии ${ruler.dynastyId} больше одного правителя`);
    }

    rulerDynasties.add(ruler.dynastyId);

    checkSources(`правителя ${ruler.id}`, ruler.sourceIds);

    /*
     * Годы известны не у всех: у легендарного правителя их нет, и это
     * записано пометкой. Год без пометки — пропуск, а не решение.
     */
    const hasYears = ruler.from !== undefined && ruler.to !== undefined;
    if (!hasYears && ruler.legendary !== true) {
      errors.push(
        `У правителя ${ruler.id} нет годов правления и нет пометки о предании`,
      );
    }

    /*
     * Пересечение, а не вложенность: Хубилай стал ханом в 1260 году, а
     * державу переименовали в Юань только в 1271-м.
     */
    if (
      hasYears &&
      dynasty !== undefined &&
      (ruler.from! > dynasty.to || ruler.to! < dynasty.from)
    ) {
      errors.push(
        `Правление ${ruler.id} не пересекается со сроком династии ${dynasty.id}`,
      );
    }
  }

  /*
   * Отвлекающие берутся из городов этого же справочника: меньше четырёх
   * разных — и вопрос собрать не из чего.
   */
  const distinctCities = new Set(capitals.map((capital) => capital.cityId));
  if (capitals.length > 0 && distinctCities.size < CHOICE_COUNT) {
    errors.push(
      `Разных городов среди столиц ${distinctCities.size}, а вариантов в ` +
        `вопросе ${CHOICE_COUNT}`,
    );
  }

  if (errors.length > 0) {
    throw new ContentValidationError(errors);
  }
}
