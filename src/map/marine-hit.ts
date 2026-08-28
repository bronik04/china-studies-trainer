/**
 * Какое море под точкой.
 *
 * Порядок — по площади вверх, как у форм рельефа: у Тайваньского пролива и
 * Бохайского залива с соседями общие кромки, и на них должен побеждать
 * меньший. Правило то же, названное словами в `physical-hit.ts`.
 */
import { MARINE_SHAPES } from './physical-geometry';
import {
  boundingBox,
  containsPoint,
  parseMapPath,
  polygonArea,
  type BoundingBox,
  type Point,
} from './svg-path';

type MarineHit = {
  readonly featureId: string;
  readonly rings: Point[][];
  readonly box: BoundingBox;
  readonly area: number;
};

const MARINE_HITS: readonly MarineHit[] = MARINE_SHAPES.map((shape) => {
  const rings = parseMapPath(shape.d);

  return {
    featureId: shape.featureId,
    rings,
    box: boundingBox(rings),
    area: polygonArea(rings),
  };
}).sort((left, right) => left.area - right.area);

/** Море под точкой карты или `null`, если её там нет. */
export function marineAt(x: number, y: number): string | null {
  for (const sea of MARINE_HITS) {
    if (x < sea.box.minX || x > sea.box.maxX || y < sea.box.minY || y > sea.box.maxY) {
      continue;
    }

    if (containsPoint(sea.rings, x, y)) {
      return sea.featureId;
    }
  }

  return null;
}
