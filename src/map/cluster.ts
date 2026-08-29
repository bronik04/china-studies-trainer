import { TARGET_DIAMETER_UNITS } from './city-hit-targets';

/**
 * Гроздь: что делать с объектами, стоящими ближе цели нажатия друг к другу.
 *
 * Прежний ответ — развести цели по кольцам вокруг знака (`spreadHitTargets`):
 * знак оставался на месте, а цель уезжала и связывалась поводком. Чем теснее
 * объекты, тем хуже это читается: у трёх пекинских достопримечательностей
 * знаки сливаются в один пиксель, и на карте остаётся клякса с тремя усами.
 *
 * Новый ответ — лупа. Скучившиеся собираются в одну цель с числом, а раскрытая
 * гроздь показывает их в круге, увеличив окрестность ровно во столько раз,
 * чтобы ближайшая пара разошлась на диаметр цели. Взаимное расположение при
 * этом настоящее: лупа увеличивает, а не переставляет, — иначе «найти на
 * карте» внутри неё перестало бы быть вопросом про место.
 */

export type Placeable = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
};

export type LensMember = Placeable & {
  readonly lensX: number;
  readonly lensY: number;
};

export type MapCluster = {
  /** Зовётся первым своим объектом: порядок входа задан каталогом. */
  readonly id: string;
  /** Середина грозди: место свёрнутого знака и якоря раскрытой лупы. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly scale: number;
  readonly members: readonly LensMember[];
};

export type ClusterLayout = {
  readonly singles: readonly Placeable[];
  readonly clusters: readonly MapCluster[];
};

/** Запас между крайней целью и краем лупы. */
export const LENS_MARGIN_UNITS = 2;

/**
 * Предел радиуса лупы. Больше — сборка падает: круг шириной в десятую часть
 * карты означает, что каталог просит другого решения, и принимать его должен
 * человек. Самая крупная в обоих каталогах — пекинская, 55,4 единицы.
 */
export const MAX_LENS_RADIUS_UNITS = 80;

/**
 * Наименьшее расстояние, с которым считается коэффициент. Два объекта в одной
 * точке дали бы бесконечное увеличение; такой каталог не пройдёт
 * `validate:map`, но слой обязан дожить до проверки, а не упасть при
 * отрисовке.
 */
const MIN_PAIR_UNITS = 0.05;

function distance(one: Placeable, other: Placeable): number {
  return Math.hypot(one.x - other.x, one.y - other.y);
}

/**
 * Связные компоненты графа «ближе диаметра». Именно компоненты, а не попарное
 * слипание: три объекта в ряд с шагом в две трети диаметра обязаны попасть в
 * одну гроздь, хотя крайние друг от друга дальше неё.
 */
function groupsOf(
  points: readonly Placeable[],
  diameter: number,
): Placeable[][] {
  const groups: Placeable[][] = [];
  const seen = new Set<number>();

  points.forEach((point, index) => {
    if (seen.has(index)) {
      return;
    }

    const queue = [index];
    const found = [index];
    seen.add(index);

    while (queue.length > 0) {
      const current = queue.shift() as number;

      points.forEach((other, otherIndex) => {
        if (
          !seen.has(otherIndex) &&
          distance(points[current], other) < diameter
        ) {
          seen.add(otherIndex);
          queue.push(otherIndex);
          found.push(otherIndex);
        }
      });
    }

    /* Порядок внутри грозди — порядок каталога, а не обхода. */
    groups.push(
      found.sort((left, right) => left - right).map((at) => points[at]),
    );
  });

  return groups;
}

export function clusterPlaceables(
  points: readonly Placeable[],
  diameter: number = TARGET_DIAMETER_UNITS,
): ClusterLayout {
  const singles: Placeable[] = [];
  const clusters: MapCluster[] = [];

  for (const group of groupsOf(points, diameter)) {
    if (group.length === 1) {
      singles.push(group[0]);
      continue;
    }

    const x = group.reduce((sum, point) => sum + point.x, 0) / group.length;
    const y = group.reduce((sum, point) => sum + point.y, 0) / group.length;

    let nearest = Infinity;

    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        nearest = Math.min(nearest, distance(group[i], group[j]));
      }
    }

    const scale = diameter / Math.max(nearest, MIN_PAIR_UNITS);
    const members = group.map((point) => ({
      ...point,
      lensX: x + (point.x - x) * scale,
      lensY: y + (point.y - y) * scale,
    }));
    const reach = Math.max(
      ...members.map((member) => Math.hypot(member.lensX - x, member.lensY - y)),
    );

    clusters.push({
      id: `cluster:${group[0].id}`,
      x,
      y,
      scale,
      radius: reach + diameter / 2 + LENS_MARGIN_UNITS,
      members,
    });
  }

  return { singles, clusters };
}
