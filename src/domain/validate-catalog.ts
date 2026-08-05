import type { City, Region, Source } from '../content/types';

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
      ['capitalRu', region.capitalRu],
      ['capitalZh', region.capitalZh],
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

    for (const fact of region.facts) {
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
    const capitals = capitalsByRegion.get(region.id) ?? [];
    if (capitals.length !== 1) {
      errors.push(
        `У региона ${region.id} административных центров: ${capitals.length} (${
          capitals.join(', ') || 'ни одного'
        }); нужен ровно один`,
      );
    }
  }

  if (errors.length > 0) {
    throw new ContentValidationError(errors);
  }
}
