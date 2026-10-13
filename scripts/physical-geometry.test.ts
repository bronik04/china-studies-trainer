import { expect, it } from 'vitest';
import { cityById } from '../src/content/cities';
import { WATER_LINES } from '../src/map/physical-geometry';
import { distanceToPolylines } from '../src/map/polyline';
import { projectLonLat } from '../src/map/projection';
import { parseMapPath } from '../src/map/svg-path';
import { GORGE_ENDPOINTS } from './data/gorge-endpoints';

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

it('длина отрезка ущелий держится в ожидаемой полосе', () => {
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
   * У «Британники» участок — около 200 км; генерализованная линия короче
   * настоящей реки, потому что теряет извивы, и на этой карте даёт около 23
   * единиц (единица — примерно 7 км). Полоса, а не пол: без потолка опечатка в
   * координате конца — участок вдвое длиннее — проходила бы проверку. Порог
   * снизу тот же, что и был: линию мерят полосой в 24 px вокруг неё.
   */
  expect(length).toBeGreaterThan(18);
  expect(length).toBeLessThan(28);
});

it('концы отрезка стоят там, где названы координаты', () => {
  const gorges = WATER_LINES.find((line) => line.featureId === 'three-gorges')!;
  const points = parseMapPath(gorges.d).flat();
  const ends = [points[0], points[points.length - 1]];

  for (const [lon, lat] of [GORGE_ENDPOINTS['three-gorges'].from, GORGE_ENDPOINTS['three-gorges'].to]) {
    const [x, y] = projectLonLat(lon, lat);
    const nearest = Math.min(...ends.map((end) => Math.hypot(end[0] - x, end[1] - y)));

    /* Полторы единицы — около десяти километров: генерализация линии. */
    expect(nearest).toBeLessThan(1.5);
  }
});

/*
 * Канал рвётся у Хуанхэ: в OpenStreetMap у него нет звеньев через реку, и
 * линия состоит из северной и южной частей. Третья часть значила бы, что
 * выжимка уже другая, — это ловит и генератор, но здесь закреплено, что
 * получилось на карте.
 */
it('канал нарисован двумя частями и доходит от Пекина до Ханчжоу', () => {
  const canal = WATER_LINES.find((line) => line.featureId === 'grand-canal');

  expect(canal).toBeDefined();

  const parts = parseMapPath(canal!.d);
  const ends = parts.flatMap((part) => [part[0], part[part.length - 1]]);
  const nearest = (lon: number, lat: number) => {
    const [x, y] = projectLonLat(lon, lat);

    return Math.min(...ends.map(([ex, ey]) => Math.hypot(ex - x, ey - y)));
  };
  const beijing = cityById('beijing')!;
  const hangzhou = cityById('hangzhou')!;

  expect(parts).toHaveLength(2);
  expect(nearest(beijing.lon, beijing.lat)).toBeLessThan(3);
  expect(nearest(hangzhou.lon, hangzhou.lat)).toBeLessThan(3);
});
