import { REGION_PALETTE } from './region-palette';
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
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
  const minX = Number(parts[0]);
  const minY = Number(parts[1]);
  const width = Number(parts[2]);
  const height = Number(parts[3]);

  if (minX !== MAP_VIEWBOX_MIN_X || minY !== MAP_VIEWBOX_MIN_Y) {
    throw new Error(
      `Начало координат viewBox ${minX} ${minY} не совпадает с ` +
        `${MAP_VIEWBOX_MIN_X} ${MAP_VIEWBOX_MIN_Y}. В нём живёт поле вокруг ` +
        'рисунка: без него обводка крайних регионов обрезается',
    );
  }

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

/**
 * Допуск на точку у самого края региона.
 *
 * Строгого попадания в контур требовать нельзя: проекция карты восстановлена
 * с невязкой 1.8 px (`projection.ts`), а береговая линия и границы в исходной
 * карте генерализованы. Приморские и приграничные города — Гонконг, Циндао,
 * Хэйхэ, Маньчжурия — оказываются снаружи на доли единицы, оставаясь на своём
 * месте.
 *
 * Три единицы — вдвое больше наблюдаемого максимума (2.0 у Маньчжурии) и на
 * порядок меньше расстояния до соседнего региона, поэтому неверная привязка
 * города к региону всё равно не пройдёт.
 */
export const CITY_BOUNDARY_TOLERANCE = 3;

export type CityPlacement = {
  readonly cityId: string;
  readonly regionId: string;
  readonly x: number;
  readonly y: number;
};

export type PlacementShapes = {
  /** Контур региона по его `mapAreaId`. */
  readonly contains: (mapAreaId: string, x: number, y: number) => boolean;
  readonly distanceToBoundary: (mapAreaId: string, x: number, y: number) => number;
  readonly mapAreaOf: (regionId: string) => string | undefined;
  readonly mapAreaIds: readonly string[];
};

export type PlacementReport = {
  /** Города вне контура, но в пределах допуска: их видно в логе сборки. */
  readonly onBoundary: readonly string[];
};

/**
 * Точка города должна лежать в контуре своего региона. Проверка ловит три
 * разные ошибки сразу: опечатку в координатах, неверную привязку к региону и
 * расхождение проекции.
 */
export function validateCityPlacement(
  placements: readonly CityPlacement[],
  shapes: PlacementShapes,
): PlacementReport {
  const errors: string[] = [];
  const onBoundary: string[] = [];

  for (const placement of placements) {
    const mapAreaId = shapes.mapAreaOf(placement.regionId);
    if (mapAreaId === undefined) {
      errors.push(`Нет области карты у региона ${placement.regionId}`);
      continue;
    }

    if (shapes.contains(mapAreaId, placement.x, placement.y)) {
      continue;
    }

    const distance = shapes.distanceToBoundary(mapAreaId, placement.x, placement.y);
    if (distance <= CITY_BOUNDARY_TOLERANCE) {
      onBoundary.push(placement.cityId);
      continue;
    }

    const inside = shapes.mapAreaIds.filter((id) =>
      shapes.contains(id, placement.x, placement.y),
    );

    errors.push(
      `Город ${placement.cityId} вне региона ${placement.regionId}: ` +
        `до края ${distance.toFixed(1)} единиц при допуске ${CITY_BOUNDARY_TOLERANCE}` +
        (inside.length > 0 ? `; точка лежит в ${inside.join(', ')}` : ''),
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return { onBoundary };
}
