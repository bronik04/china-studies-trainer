import { expect, it } from 'vitest';
import { WATER_LINES } from '../src/map/physical-geometry';
import { distanceToPolylines } from '../src/map/polyline';
import { parseMapPath } from '../src/map/svg-path';

/*
 * Отрезок ущелий не добывается, а вырезается из линии Янцзы: двух источников
 * геометрии для одного места на карте быть не должно, иначе они однажды
 * разойдутся, и река с собственным ущельем нарисуются двумя разными линиями.
 */
it('отрезок ущелий лежит на линии Янцзы', () => {
  const gorges = WATER_LINES.find((line) => line.featureId === 'three-gorges');
  const yangtze = WATER_LINES.find((line) => line.featureId === 'yangtze');

  expect(gorges).toBeDefined();
  expect(yangtze).toBeDefined();

  const river = parseMapPath(yangtze!.d);
  const points = parseMapPath(gorges!.d).flat();

  expect(points.length).toBeGreaterThan(2);
  for (const point of points) {
    expect(distanceToPolylines(point[0], point[1], river)).toBeLessThan(0.5);
  }
});

it('отрезок ущелий не короче цели нажатия', () => {
  const gorges = WATER_LINES.find((line) => line.featureId === 'three-gorges')!;
  const points = parseMapPath(gorges.d).flat();
  const length = points.reduce(
    (total, point, index) =>
      index === 0
        ? 0
        : total +
          Math.hypot(point[0] - points[index - 1][0], point[1] - points[index - 1][1]),
    0,
  );

  /*
   * Двести километров на этой карте — около 28 единиц. Порог взят вдвое
   * меньше: линию мерят полосой в 24 px вокруг неё, и отрезок короче этой
   * полосы был бы целью, в которую не прицелиться.
   */
  expect(length).toBeGreaterThan(12);
});
