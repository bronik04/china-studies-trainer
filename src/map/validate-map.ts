import { REGION_PALETTE } from './region-palette';
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_WIDTH,
  MIN_TARGET_PX,
  REFERENCE_MAP_WIDTH,
  undersizedRegions,
} from './target-size';

/**
 * У каждого региона должна быть запись в палитре: из неё берутся точка
 * подписи и диаметр вписанной окружности.
 *
 * Без этой проверки `undersizedRegions` молча пропускает неизвестный
 * идентификатор, и забытый `npm run generate:palette` проходит сборку, а
 * область остаётся без цели нажатия.
 */
export function validateRegionPalette(regionIds: readonly string[]): void {
  const missing = regionIds.filter(
    (regionId) => REGION_PALETTE[regionId] === undefined,
  );

  if (missing.length > 0) {
    throw new Error(
      `Нет записи в палитре регионов: ${missing.join(', ')}. ` +
        'Запустите npm run generate:palette',
    );
  }
}

/**
 * Единицы палитры считаны из конкретного `viewBox`. Если карту заменят на
 * источник с другими размерами, пересчёт в пиксели станет врать, порог
 * нажимаемости — пропускать мелкие области, а пропорция `--map-aspect`
 * в токенах разойдётся с содержимым коробки карты.
 */
export function validateViewBox(viewBox: string | null): void {
  const parts = viewBox?.trim().split(/\s+/) ?? [];
  const width = Number(parts[2]);
  const height = Number(parts[3]);

  if (width !== MAP_VIEWBOX_WIDTH) {
    throw new Error(
      `Ширина viewBox карты ${width} не совпадает с MAP_VIEWBOX_WIDTH ${MAP_VIEWBOX_WIDTH}. ` +
        'Обновите константу и перегенерируйте палитру и цели нажатия',
    );
  }

  if (height !== MAP_VIEWBOX_HEIGHT) {
    throw new Error(
      `Высота viewBox карты ${height} не совпадает с MAP_VIEWBOX_HEIGHT ${MAP_VIEWBOX_HEIGHT}. ` +
        'Обновите константу и токен --map-aspect в tokens.css',
    );
  }
}

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
