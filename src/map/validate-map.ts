import { REGION_PALETTE } from './region-palette';
import {
  MIN_TARGET_PX,
  REFERENCE_MAP_WIDTH,
  undersizedRegions,
} from './target-size';

/**
 * Каждый регион, который меньше порога нажатия, обязан иметь либо отдельную
 * цель `data-hit-region-id`, либо вынесенный маркер. Без этой проверки правка
 * геометрии молча вернула бы Шанхай к цели в 12 px.
 */
export function validateTargetSizes(
  regionIds: readonly string[],
  hitTargetIds: readonly string[],
  calloutIds: readonly string[],
): void {
  const covered = new Set([...hitTargetIds, ...calloutIds]);
  const missing = undersizedRegions(
    regionIds,
    REFERENCE_MAP_WIDTH,
    MIN_TARGET_PX,
  ).filter(({ regionId }) => !covered.has(regionId));

  if (missing.length > 0) {
    throw new Error(
      missing
        .map(
          ({ regionId, availablePx }) =>
            `Область меньше ${MIN_TARGET_PX} px и не имеет цели нажатия: ${regionId} (${availablePx.toFixed(
              1,
            )} px при ширине карты ${REFERENCE_MAP_WIDTH} px)`,
        )
        .join('\n'),
    );
  }
}

/** Каждой области нужен тон заливки: без него регион сольётся с соседом. */
export function validateLandTones(regionIds: readonly string[]): void {
  const missing = regionIds.filter(
    (regionId) => REGION_PALETTE[regionId] === undefined,
  );

  if (missing.length > 0) {
    throw new Error(
      `Нет тона заливки: ${missing.join(', ')}. Запустите npx tsx scripts/generate-region-palette.ts`,
    );
  }
}

export function validateMapAreaIds(
  regionIds: readonly string[],
  mapAreaIds: readonly string[],
): void {
  const errors: string[] = [];
  const regionIdSet = new Set(regionIds);
  const mapAreaIdSet = new Set(mapAreaIds);

  for (const regionId of regionIds) {
    if (!mapAreaIdSet.has(regionId)) {
      errors.push(`Нет области карты: ${regionId}`);
    }
  }

  for (const mapAreaId of mapAreaIds) {
    if (!regionIdSet.has(mapAreaId)) {
      errors.push(`Неизвестная область карты: ${mapAreaId}`);
    }
  }

  for (const mapAreaId of mapAreaIdSet) {
    if (mapAreaIds.filter((id) => id === mapAreaId).length > 1) {
      errors.push(`Повторяющаяся область карты: ${mapAreaId}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}
