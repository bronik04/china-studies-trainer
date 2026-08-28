/**
 * Знаки крайних точек и их цели нажатия.
 *
 * У точки нет контура вовсе, поэтому целью может быть только знак — тот же
 * приём, что у озера, у которого контур меньше порога: знак стоит на настоящем
 * месте, а цель нажатия может от него отойти, если соседняя ближе диаметра.
 */
import { spreadHitTargets, TARGET_DIAMETER_UNITS } from './city-hit-targets';
import { POINT_MARKS } from './physical-geometry';

export type PointHitMark = {
  readonly featureId: string;
  readonly x: number;
  readonly y: number;
  readonly hitX: number;
  readonly hitY: number;
  readonly radius: number;
};

/**
 * Знаки при заданном увеличении. Порог задан в пикселях экрана, поэтому на
 * увеличении та же цель занимает меньше единиц карты.
 */
export function pointMarks(zoom: number): readonly PointHitMark[] {
  const targets = spreadHitTargets(
    POINT_MARKS.map((mark) => ({ id: mark.featureId, x: mark.x, y: mark.y })),
    TARGET_DIAMETER_UNITS / zoom,
  );

  return targets.map((target) => ({
    featureId: target.id,
    x: target.x,
    y: target.y,
    hitX: target.hitX,
    hitY: target.hitY,
    radius: target.radius,
  }));
}
