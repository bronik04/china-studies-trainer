import type { City, PhysicalFeature, Region, Source } from '../content/types';
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

    for (const fact of region.facts) {
      if (fact.title.trim().length === 0 || fact.body.trim().length === 0) {
        errors.push(`Регион ${region.id}: пустые title или body у факта`);
      }
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

  for (const collection of collections) {
    if (collection.lead.trim().length === 0) {
      errors.push(`Коллекция ${collection.id}: пустая вводка`);
    }
    if (collection.notes.length < 3 || collection.notes.length > 4) {
      errors.push(
        `Коллекция ${collection.id}: заметок должно быть 3–4, сейчас ${collection.notes.length}`,
      );
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
