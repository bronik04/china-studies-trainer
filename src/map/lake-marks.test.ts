import { describe, expect, it } from 'vitest';
import { lakeMarks } from './lake-marks';
import { LAKE_SHAPES } from './physical-geometry';
import { MIN_TARGET_PX, REFERENCE_MAP_WIDTH, unitsToPixels } from './target-size';

describe('lakeMarks', () => {
  it('даёт знак каждому озеру', () => {
    expect(lakeMarks(1)).toHaveLength(LAKE_SHAPES.length);
  });

  it('цель нажатия не меньше порога', () => {
    for (const mark of lakeMarks(1)) {
      const px = unitsToPixels(mark.radius * 2, REFERENCE_MAP_WIDTH);
      expect(px, `${mark.featureId}: ${px.toFixed(1)} px`).toBeGreaterThanOrEqual(
        MIN_TARGET_PX,
      );
    }
  });

  it('цели не накрывают друг друга', () => {
    const marks = lakeMarks(1);

    for (const left of marks) {
      for (const right of marks) {
        if (left.featureId >= right.featureId) {
          continue;
        }

        const distance = Math.hypot(left.hitX - right.hitX, left.hitY - right.hitY);
        expect(
          distance,
          `${left.featureId} и ${right.featureId} в ${distance.toFixed(1)}`,
        ).toBeGreaterThanOrEqual(left.radius + right.radius);
      }
    }
  });

  it('на увеличении цель занимает меньше единиц карты', () => {
    // Порог задан в пикселях экрана: чем сильнее увеличено, тем меньше единиц
    // карты нужно, чтобы их набрать. Правило то же, что у городов.
    expect(lakeMarks(2)[0].radius).toBeLessThan(lakeMarks(1)[0].radius);
  });
});
