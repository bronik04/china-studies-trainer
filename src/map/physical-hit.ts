/**
 * Что на физической карте под точкой.
 *
 * Правило одно и называется словами: **побеждает меньший объект** — озеро,
 * потом река, потом форма рельефа, потом регион. Оно выводится из размера:
 * знак озера и линия реки меньше формы, на которой лежат, и рука, целившая в
 * них, метила не в подложку.
 *
 * Прежде источников было два, и они не спорили, а не видели друг друга: реку
 * карта считала расстоянием, а форма и озеро отвечали на нажатие своими
 * узлами. Узел всегда быстрее расчёта — он просто перехватывает событие, — и
 * до правила расстояния дело не доходило: точка в полутора единицах от Янцзы
 * в верховьях доставалась Тибетскому нагорью.
 */
import { isOnLand } from './land';
import { lakeMarks } from './lake-marks';
import { RELIEF_SHAPES } from './physical-geometry';
import { RIVER_HIT_RADIUS_UNITS, riverAt } from './river-hit';
import {
  boundingBox,
  containsPoint,
  parseMapPath,
  polygonArea,
  type BoundingBox,
  type Point,
} from './svg-path';

type ShapeHit = {
  readonly featureId: string;
  readonly rings: Point[][];
  readonly box: BoundingBox;
  readonly area: number;
};

/**
 * Только спрашиваемые формы: остальные заливают фон, имени на экране не имеют
 * и целью быть не могут. Габарит считается один раз — внутри рамки точки
 * оказывается одна-две формы, и вхождение считается только для них.
 *
 * Порядок — по площади вверх, и это не тот порядок, в котором формы рисуются.
 * Рисуются крупные первыми, иначе Тибетское нагорье закрасило бы вложенную
 * Цайдамскую котловину; проверяются мелкие первыми, иначе нагорье забирает
 * нажатие по Куньлуню. Правило одно и то же, названное словами: побеждает
 * меньший.
 */
const SHAPE_HITS: readonly ShapeHit[] = RELIEF_SHAPES.filter(
  (shape) => shape.featureId !== undefined,
)
  .map((shape) => {
    const rings = parseMapPath(shape.d);

    return {
      featureId: shape.featureId!,
      rings,
      box: boundingBox(rings),
      area: polygonArea(rings),
    };
  })
  .sort((left, right) => left.area - right.area);

/**
 * Цель под точкой карты или `null`, если её там нет: тогда точка достаётся
 * региону, как на любом другом виде.
 *
 * `zoom` нужен порогам: они заданы в пикселях экрана, и на увеличении те же
 * 24 px занимают меньше единиц карты.
 */
export function physicalTargetAt(
  x: number,
  y: number,
  zoom: number,
): string | null {
  for (const mark of lakeMarks(zoom)) {
    if (Math.hypot(x - mark.hitX, y - mark.hitY) <= mark.radius) {
      return mark.featureId;
    }
  }

  const river = riverAt(x, y, RIVER_HIT_RADIUS_UNITS / zoom);
  if (river !== null) {
    return river;
  }

  for (const shape of SHAPE_HITS) {
    if (
      x < shape.box.minX ||
      x > shape.box.maxX ||
      y < shape.box.minY ||
      y > shape.box.maxY
    ) {
      continue;
    }

    if (containsPoint(shape.rings, x, y)) {
      /*
       * Проверка суши стоит последней и только здесь: маска прячет ступени за
       * границей, но нажатия не отсекает, а формы за границу выходят —
       * Гималаи в Непал, Гоби в Монголию.
       */
      return isOnLand(x, y) ? shape.featureId : null;
    }
  }

  return null;
}
