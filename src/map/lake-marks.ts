/**
 * Знаки озёр и их цели нажатия.
 *
 * У озера, в отличие от формы, целью не может быть контур: 24 px на опорной
 * ширине — это около 120 км на местности, а Цинхай, самое большое озеро
 * страны, даёт вписанную окружность около 13 px. Поэтому применяется приём
 * городов: знак стоит на настоящем месте, а цель нажатия может от него отойти,
 * если соседняя ближе диаметра цели.
 */
import { spreadHitTargets, TARGET_DIAMETER_UNITS } from './city-hit-targets';
import { LAKE_SHAPES } from './physical-geometry';

export type LakeMark = {
  readonly featureId: string;
  readonly x: number;
  readonly y: number;
  readonly hitX: number;
  readonly hitY: number;
  readonly radius: number;
};

/**
 * Знаки при заданном увеличении. Порог задан в пикселях экрана, поэтому на
 * увеличении та же цель занимает меньше единиц карты — и озёра нижней Янцзы,
 * которые на целом виде пришлось бы разводить, встают на свои места.
 */
export function lakeMarks(zoom: number): readonly LakeMark[] {
  const targets = spreadHitTargets(
    LAKE_SHAPES.map((shape) => ({
      id: shape.featureId,
      x: shape.markX,
      y: shape.markY,
    })),
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
