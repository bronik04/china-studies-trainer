import type { Region, Source } from '../content/types';

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
