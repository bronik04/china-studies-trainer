/*
 * Vitest импортируется явно: `tsconfig.node.json` не подключает его глобали —
 * скрипты сборки живут с типами Node, а не браузера.
 */
import { expect, it } from 'vitest';
import { contourRings, sinkBorder, smoothGrid, type Grid } from './relief-contours';

/** Сетка 5×5 с квадратным «холмом» 3×3 в середине. */
function hillGrid(): Grid {
  const values = [
    0, 0, 0, 0, 0, 0, 100, 100, 100, 0, 0, 100, 100, 100, 0, 0, 100, 100, 100, 0, 0, 0,
    0, 0, 0,
  ];

  return { values, rows: 5, cols: 5, lat0: 0, lon0: 0, step: 1 };
}

it('обводит холм одним замкнутым кольцом', () => {
  const rings = contourRings(hillGrid(), 50);

  expect(rings).toHaveLength(1);
  expect(rings[0][0]).toEqual(rings[0][rings[0].length - 1]);
});

it('кольцо лежит между узлами холма и нулями вокруг', () => {
  const [ring] = contourRings(hillGrid(), 50);
  const xs = ring.map(([lon]) => lon);
  const ys = ring.map(([, lat]) => lat);

  expect(Math.min(...xs)).toBeCloseTo(0.5, 5);
  expect(Math.max(...xs)).toBeCloseTo(3.5, 5);
  expect(Math.min(...ys)).toBeCloseTo(0.5, 5);
  expect(Math.max(...ys)).toBeCloseTo(3.5, 5);
});

it('возвращает пусто, когда порог выше всей сетки', () => {
  expect(contourRings(hillGrid(), 500)).toEqual([]);
});

/*
 * Два холма — два кольца. Проверка не про число: сшивка, склеивающая концы
 * только по началу отрезка, соединяла их в одно кольцо через всю сетку.
 */
it('разделяет два холма на два кольца', () => {
  const values = [0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0];
  const rings = contourRings(
    { values, rows: 3, cols: 7, lat0: 0, lon0: 0, step: 1 },
    50,
  );

  expect(rings).toHaveLength(2);
});

it('сглаживание тянет узел к соседям, а размер сетки не меняет', () => {
  const values = [0, 0, 0, 0, 90, 0, 0, 0, 0];
  const smoothed = smoothGrid(values, 3, 3, 1);

  expect(smoothed).toHaveLength(9);
  expect(smoothed[4]).toBeCloseTo(10, 5);
});

it('рамка опускается ниже порога', () => {
  const values = [100, 100, 100, 100, 100, 100, 100, 100, 100];
  sinkBorder(values, 3, 3, -9999);

  expect(values[0]).toBe(-9999);
  expect(values[4]).toBe(100);
});
