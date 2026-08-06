/**
 * Какая река под курсором.
 *
 * У рек нет цели нажатия: лента в 24 px вокруг каждой линии невыполнима —
 * Янцзы и Ланьцанцзян сближаются до 4 единиц карты (решение от 2026-08-05).
 * Точка достаётся ближайшей реке, если та ближе порога: цели по построению не
 * спорят, и у каждой точки карты ответ ровно один.
 */
import { RIVER_LINES } from './physical-geometry';
import { distanceToPolylines } from './polyline';
import { parseMapPath, type Point } from './svg-path';
import { TARGET_DIAMETER_UNITS } from './city-hit-targets';

/**
 * Насколько далеко от линии точка ещё принадлежит реке — в единицах карты при
 * опорной ширине. Половина той же ленты в 24 px, которой мерят цель города:
 * порог задаёт ширину полосы вокруг линии, а не её радиус.
 */
export const RIVER_HIT_RADIUS_UNITS = TARGET_DIAMETER_UNITS / 2;

export type RiverShape = {
  readonly featureId: string;
  /**
   * Куски линии. Именно куски, а не общий список точек: обрезка по рамке
   * разрывает реку, и склеенные точки дали бы звено через всю карту.
   */
  readonly parts: Point[][];
};

export const RIVER_SHAPES: readonly RiverShape[] = RIVER_LINES.map((line) => ({
  featureId: line.featureId,
  parts: parseMapPath(line.d),
}));

/** Ближайшая река к точке карты или `null`, если все дальше порога. */
export function riverAt(x: number, y: number, maxDistance: number): string | null {
  let nearestId: string | null = null;
  let nearest = maxDistance;

  for (const river of RIVER_SHAPES) {
    const distance = distanceToPolylines(x, y, river.parts);
    if (distance <= nearest) {
      nearest = distance;
      nearestId = river.featureId;
    }
  }

  return nearestId;
}
