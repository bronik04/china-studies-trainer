import { expect, it } from 'vitest';
import { clusterPlaceables } from './cluster';

const D = 17.28;

it('оставляет одиночкой того, у кого нет соседа ближе диаметра', () => {
  const layout = clusterPlaceables(
    [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 40, y: 0 },
    ],
    D,
  );

  expect(layout.clusters).toHaveLength(0);
  expect(layout.singles.map((point) => point.id)).toEqual(['a', 'b']);
});

/*
 * Крайние в цепочке дальше диаметра друг от друга, но гроздь обязана быть
 * одна: иначе средний объект попал бы в две грозди сразу.
 */
it('собирает цепочку в одну гроздь', () => {
  const layout = clusterPlaceables(
    [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 12, y: 0 },
      { id: 'c', x: 24, y: 0 },
    ],
    D,
  );

  expect(layout.clusters).toHaveLength(1);
  expect(layout.clusters[0].members.map((member) => member.id)).toEqual([
    'a',
    'b',
    'c',
  ]);
});

/*
 * `scale` — сколько увеличения нужно, чтобы ближайшая пара разошлась на
 * диаметр: по нему нажатие на гроздь городов выбирает ступень приближения.
 */
it('считает кратность увеличения по ближайшей паре', () => {
  const [cluster] = clusterPlaceables(
    [
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 102, y: 100 },
      { id: 'c', x: 100, y: 105 },
    ],
    D,
  ).clusters;

  expect(cluster.scale).toBeCloseTo(D / 2, 6);
});

/* Знаки грозди остаются на настоящих местах: гроздь ничего не переставляет. */
it('сохраняет настоящие координаты членов', () => {
  const [cluster] = clusterPlaceables(
    [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 2, y: 0 },
      { id: 'c', x: 6, y: 0 },
    ],
    D,
  ).clusters;

  expect(cluster.members.map((member) => [member.x, member.y])).toEqual([
    [0, 0],
    [2, 0],
    [6, 0],
  ]);
  expect(cluster.x).toBeCloseTo((0 + 2 + 6) / 3, 6);
});

/*
 * Два объекта в одной точке требовали бы бесконечного увеличения; слой обязан
 * дожить до `validate:map`, а не упасть при отрисовке.
 */
it('не даёт бесконечной кратности на совпадающих точках', () => {
  const [cluster] = clusterPlaceables(
    [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 0, y: 0 },
    ],
    D,
  ).clusters;

  expect(Number.isFinite(cluster.scale)).toBe(true);
});

/* Карта не должна переставлять грозди между перерисовками. */
it('не зависит от порядка входа', () => {
  const points = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 3, y: 0 },
    { id: 'c', x: 60, y: 0 },
  ];

  const straight = clusterPlaceables(points, D);
  const reversed = clusterPlaceables([...points].reverse(), D);

  expect(reversed.clusters[0].members.map((member) => member.id).sort()).toEqual(
    straight.clusters[0].members.map((member) => member.id).sort(),
  );
  expect(reversed.clusters[0].scale).toBeCloseTo(straight.clusters[0].scale, 6);
});
