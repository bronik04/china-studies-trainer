/**
 * Какая река под курсором.
 *
 * У рек нет цели нажатия: лента в 24 px вокруг каждой линии невыполнима —
 * Янцзы и Ланьцанцзян сближаются до 4 единиц карты (решение от 2026-08-05).
 * Точка достаётся ближайшей реке, если та ближе порога: цели по построению не
 * спорят, и у каждой точки карты ответ ровно один.
 */
import { partOfFeature } from '../content/physical-features';
import { WATER_LINES } from './physical-geometry';
import { distanceToPolylines } from './polyline';
import { parseMapPath, type Point } from './svg-path';
import { TARGET_DIAMETER_UNITS } from './city-hit-targets';

/**
 * Насколько далеко от линии точка ещё принадлежит реке — в единицах карты при
 * опорной ширине. Половина той же ленты в 24 px, которой мерят цель города:
 * порог задаёт ширину полосы вокруг линии, а не её радиус.
 */
export const RIVER_HIT_RADIUS_UNITS = TARGET_DIAMETER_UNITS / 2;

/**
 * Точность записи путей: координаты пишутся с двумя знаками после запятой, и
 * вырезанный участок отстоит от своей реки на эти самые сотые.
 */
const PATH_PRECISION_UNITS = 0.05;

export type RiverShape = {
  readonly featureId: string;
  /**
   * Куски линии. Именно куски, а не общий список точек: обрезка по рамке
   * разрывает реку, и склеенные точки дали бы звено через всю карту.
   */
  readonly parts: Point[][];
};

export const RIVER_SHAPES: readonly RiverShape[] = WATER_LINES.map((line) => ({
  featureId: line.featureId,
  parts: parseMapPath(line.d),
}));

/**
 * Ближайшая линия к точке или `null`, если все дальше порога.
 *
 * Список и связь «часть — целое» приходят доводами, а не берутся из модулей:
 * правило проверяется на выдуманных линиях, а не на настоящей карте, где
 * порядок записей случаен.
 *
 * Правило: **часть побеждает целое**. Участок реки вырезан из самой реки, и
 * расстояние до реки никогда не больше расстояния до участка — равенство
 * бывает лишь в общих вершинах, а концы участка вдобавок округлены при записи
 * пути. Сравнением расстояний часть не выигрывает никогда, поэтому она
 * выигрывает по существу: попал в ленту участка — ответ участок. То же
 * правило, что у вложенных форм рельефа, — побеждает меньший объект.
 */
export function nearestLine(
  shapes: readonly RiverShape[],
  x: number,
  y: number,
  maxDistance: number,
  wholeOf: (featureId: string) => string | undefined = partOfFeature,
): string | null {
  const within = shapes
    .map((shape) => ({
      featureId: shape.featureId,
      distance: distanceToPolylines(x, y, shape.parts),
    }))
    .filter((shape) => shape.distance <= maxDistance);

  if (within.length === 0) {
    return null;
  }

  const nearest = within.reduce((best, shape) =>
    shape.distance < best.distance ? shape : best,
  );

  /*
   * Часть выигрывает там, где она не дальше своего целого: на общем отрезке
   * расстояния совпадают до сотых — ровно до той точности, с какой записан
   * путь, — и сравнение расстояний часть проигрывала бы всегда. За концом
   * участка река ближе уже на единицы, и тогда отвечает река: лента цели
   * шириной в двенадцать единиц иначе отдала бы участку ещё столько же реки
   * за его концом.
   */
  const part = within.find(
    (shape) =>
      wholeOf(shape.featureId) === nearest.featureId &&
      shape.distance <= nearest.distance + PATH_PRECISION_UNITS,
  );

  return (part ?? nearest).featureId;
}

/** Ближайшая река к точке карты или `null`, если все дальше порога. */
export function riverAt(x: number, y: number, maxDistance: number): string | null {
  return nearestLine(RIVER_SHAPES, x, y, maxDistance);
}
