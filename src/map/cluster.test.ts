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

it('разводит ближайшую пару ровно на диаметр цели', () => {
  const [cluster] = clusterPlaceables(
    [
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 102, y: 100 },
      { id: 'c', x: 100, y: 105 },
    ],
    D,
  ).clusters;

  const nearest = Math.min(
    ...cluster.members.flatMap((one, index) =>
      cluster.members
        .slice(index + 1)
        .map((other) =>
          Math.hypot(one.lensX - other.lensX, one.lensY - other.lensY),
        ),
    ),
  );

  expect(nearest).toBeCloseTo(D, 6);
});

/* Лупа увеличивает, а не переставляет: отношения расстояний сохраняются. */
it('сохраняет взаимное расположение', () => {
  const [cluster] = clusterPlaceables(
    [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 2, y: 0 },
      { id: 'c', x: 6, y: 0 },
    ],
    D,
  ).clusters;

  const [a, b, c] = cluster.members;

  expect(b.lensX - a.lensX).toBeCloseTo((c.lensX - a.lensX) / 3, 6);
  expect(a.lensY).toBeCloseTo(b.lensY, 6);
});

it('вмещает крайнюю цель в радиус лупы', () => {
  const [cluster] = clusterPlaceables(
    [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 3, y: 0 },
      { id: 'c', x: 0, y: 4 },
    ],
    D,
  ).clusters;

  for (const member of cluster.members) {
    const reach = Math.hypot(member.lensX - cluster.x, member.lensY - cluster.y);

    expect(reach + D / 2).toBeLessThanOrEqual(cluster.radius);
  }
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
  expect(reversed.clusters[0].radius).toBeCloseTo(straight.clusters[0].radius, 6);
});
