import { TARGET_DIAMETER_UNITS } from './city-hit-targets';

/**
 * Гроздь: что делать с объектами, стоящими ближе цели нажатия друг к другу.
 *
 * Скучившиеся объекты собираются в одну цель с числом. Что происходит при
 * нажатии — решает слой, и решения два (решение владельца от 2026-08-30):
 *
 * - города: карта по-настоящему приближается, и точки расходятся сами — цель
 *   нажатия задана в пикселях экрана и на увеличении занимает меньше единиц.
 *   Прежняя лупа-врезка увеличивала окрестность поверх карты; владелец ожидал
 *   настоящего масштаба, а не врезки.
 * - достопримечательности: гроздь и есть цель. Три пекинских объекта стоят в
 *   полутора единицах друг от друга — их не разведёт никакое разумное
 *   увеличение, да и не нужно: тренажёр спрашивает «где это», а не «в какой
 *   части Пекина», и попадание в общую точку — верный ответ.
 *
 * `scale` — во сколько раз нужно увеличить карту, чтобы ближайшая пара грозди
 * разошлась на диаметр цели. Городам он даёт величину приближения; у
 * достопримечательностей не используется.
 */

export type Placeable = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
};

export type MapCluster = {
  /** Зовётся первым своим объектом: порядок входа задан каталогом. */
  readonly id: string;
  /** Середина грозди: место свёрнутого знака. */
  readonly x: number;
  readonly y: number;
  /** Кратность увеличения, разводящая ближайшую пару на диаметр цели. */
  readonly scale: number;
  readonly members: readonly Placeable[];
};

export type ClusterLayout = {
  readonly singles: readonly Placeable[];
  readonly clusters: readonly MapCluster[];
};

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

    clusters.push({
      id: `cluster:${group[0].id}`,
      x,
      y,
      scale: diameter / Math.max(nearest, MIN_PAIR_UNITS),
      members: group,
    });
  }

  return { singles, clusters };
}
