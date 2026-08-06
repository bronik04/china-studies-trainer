import { describe, expect, it } from 'vitest';
import { physicalFeatures } from '../content/physical-features';
import { RIVER_SHAPES, riverAt } from './river-hit';

/** Точка на самой линии реки: берём её из настоящей геометрии. */
function pointOn(featureId: string) {
  const shape = RIVER_SHAPES.find((river) => river.featureId === featureId);
  const points = shape?.parts.flat() ?? [];

  return points[Math.floor(points.length / 2)];
}

describe('riverAt', () => {
  it('разбирает все шесть рек', () => {
    expect(RIVER_SHAPES).toHaveLength(
      physicalFeatures.filter((feature) => feature.kind === 'river').length,
    );
  });

  it('находит реку в точке на её линии', () => {
    for (const river of RIVER_SHAPES) {
      const [x, y] = pointOn(river.featureId);
      expect(riverAt(x, y, 8)).toBe(river.featureId);
    }
  });

  it('молчит там, где рек нет', () => {
    // Северо-западный угол рамки: суши там нет вовсе.
    expect(riverAt(-10, -10, 8)).toBeNull();
  });

  it('не отвечает рекой, до которой дальше порога', () => {
    const [x, y] = pointOn('tarim');
    expect(riverAt(x + 100, y, 8)).toBeNull();
  });

  it('на участке параллельных рек отдаёт точку ближайшей', () => {
    // Янцзы и Ланьцанцзян сходятся до 4 единиц: у точки на самой Янцзы
    // ответ обязан быть «Янцзы», а не «та, что нашлась первой».
    const [x, y] = pointOn('yangtze');
    expect(riverAt(x, y, 8)).toBe('yangtze');
  });
});
