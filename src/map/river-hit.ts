/**
 * Какая река под курсором.
 *
 * У рек нет цели нажатия: лента в 24 px вокруг каждой линии невыполнима —
 * Янцзы и Ланьцанцзян сближаются до 4 единиц карты (решение от 2026-08-05).
 * Точка достаётся ближайшей реке, если та ближе порога: цели по построению не
 * спорят, и у каждой точки карты ответ ровно один.
 */
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
 * Насколько два расстояния считаются равными. Участок вырезан из той же линии,
 * что и река, поэтому расстояния совпадают до последнего знака; допуск нужен
 * лишь на случай округления при записи путей.
 */
const TIE_UNITS = 1e-6;

export type RiverShape = {
  readonly featureId: string;
  /**
   * Куски линии. Именно куски, а не общий список точек: обрезка по рамке
   * разрывает реку, и склеенные точки дали бы звено через всю карту.
   */
  readonly parts: Point[][];
  /** Длина линии в единицах карты: ею решается ничья (см. `nearestLine`). */
  readonly length: number;
};

function lengthOf(parts: readonly (readonly Point[])[]): number {
  return parts.reduce(
    (total, part) =>
      total +
      part.reduce(
        (sum, point, index) =>
          index === 0
            ? sum
            : sum +
              Math.hypot(point[0] - part[index - 1][0], point[1] - part[index - 1][1]),
        0,
      ),
    0,
  );
}

export const RIVER_SHAPES: readonly RiverShape[] = WATER_LINES.map((line) => {
  const parts = parseMapPath(line.d);

  return { featureId: line.featureId, parts, length: lengthOf(parts) };
});

/**
 * Ближайшая линия к точке или `null`, если все дальше порога.
 *
 * Список приходит доводом, а не берётся из модуля: правило ничьей нужно
 * проверять на выдуманных линиях, а не на настоящей карте, где порядок записей
 * случаен.
 *
 * На равном расстоянии побеждает более короткая: участок реки лежит на самой
 * реке, и оба ответа стоят к точке вплотную. То же правило, что у вложенных
 * форм рельефа, — побеждает меньший объект, — и здесь оно названо, а не
 * выведено из порядка записей в сгенерированном файле.
 */
export function nearestLine(
  shapes: readonly RiverShape[],
  x: number,
  y: number,
  maxDistance: number,
): string | null {
  let nearestId: string | null = null;
  let nearest = Number.POSITIVE_INFINITY;
  let nearestLength = Number.POSITIVE_INFINITY;

  for (const shape of shapes) {
    const distance = distanceToPolylines(x, y, shape.parts);
    if (distance > maxDistance) {
      continue;
    }

    const closer = distance < nearest - TIE_UNITS;
    const sameButShorter =
      Math.abs(distance - nearest) <= TIE_UNITS && shape.length < nearestLength;

    if (closer || sameButShorter) {
      nearest = distance;
      nearestLength = shape.length;
      nearestId = shape.featureId;
    }
  }

  return nearestId;
}

/** Ближайшая река к точке карты или `null`, если все дальше порога. */
export function riverAt(x: number, y: number, maxDistance: number): string | null {
  return nearestLine(RIVER_SHAPES, x, y, maxDistance);
}
