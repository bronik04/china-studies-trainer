/**
 * Ломаные в системе координат карты: реки — открытые линии, формы рельефа —
 * замкнутые кольца.
 *
 * Модуль общий для генератора и приложения. Упрощение и обрезка нужны на
 * сборке, расстояние до ломаной — во время работы: им находят реку, ближайшую
 * к курсору. Разные копии этой арифметики разошлись бы, и цель нажатия
 * перестала бы совпадать с рисунком.
 */
import { distanceToSegment, type Point } from './svg-path';

export type Frame = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/** Расстояние от точки до ломаной — по звеньям, а не по вершинам. */
export function distanceToPolyline(
  x: number,
  y: number,
  line: readonly Point[],
): number {
  if (line.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (line.length === 1) {
    return Math.hypot(x - line[0][0], y - line[0][1]);
  }

  let nearest = Number.POSITIVE_INFINITY;
  for (let i = 1; i < line.length; i += 1) {
    const distance = distanceToSegment(x, y, line[i - 1], line[i]);
    if (distance < nearest) {
      nearest = distance;
    }
  }

  return nearest;
}

/**
 * Упрощение по Дугласу–Пекеру: точка остаётся, если без неё линия сместилась
 * бы дальше допуска. Цикл, а не рекурсия: у реки до двух тысяч точек, и
 * глубина рекурсии на почти прямом участке дошла бы до их числа.
 */
export function simplifyPath(
  points: readonly Point[],
  tolerance: number,
): Point[] {
  if (points.length <= 2) {
    return [...points];
  }

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [from, to] = stack.pop() as [number, number];
    let farthest = -1;
    let best = tolerance;

    for (let i = from + 1; i < to; i += 1) {
      const distance = distanceToSegment(
        points[i][0],
        points[i][1],
        points[from],
        points[to],
      );

      if (distance > best) {
        best = distance;
        farthest = i;
      }
    }

    if (farthest !== -1) {
      keep[farthest] = true;
      stack.push([from, farthest], [farthest, to]);
    }
  }

  return points.filter((_, index) => keep[index]);
}

/**
 * Упрощение замкнутого кольца.
 *
 * Прямо применить `simplifyPath` нельзя: у кольца начало совпадает с концом,
 * отрезок между ними вырожден, расстояние до него считается от точки, и всё
 * кольцо схлопывается в две точки. Кольцо разрезается в самой удалённой от
 * начала вершине и упрощается двумя половинами.
 */
export function simplifyRing(ring: readonly Point[], tolerance: number): Point[] {
  if (ring.length <= 4) {
    return [...ring];
  }

  const [start] = ring;
  let opposite = 0;
  let best = -1;
  for (let i = 1; i < ring.length; i += 1) {
    const distance = Math.hypot(ring[i][0] - start[0], ring[i][1] - start[1]);
    if (distance > best) {
      best = distance;
      opposite = i;
    }
  }

  const head = simplifyPath(ring.slice(0, opposite + 1), tolerance);
  const tail = simplifyPath(ring.slice(opposite), tolerance);

  return [...head, ...tail.slice(1)];
}

/** Часть отрезка внутри рамки по Лянгу–Барски; `null` — отрезок весь снаружи. */
function clipSegment(a: Point, b: Point, frame: Frame): [Point, Point] | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let enter = 0;
  let leave = 1;

  const limits: [number, number][] = [
    [-dx, a[0] - frame.minX],
    [dx, frame.maxX - a[0]],
    [-dy, a[1] - frame.minY],
    [dy, frame.maxY - a[1]],
  ];

  for (const [p, q] of limits) {
    if (p === 0) {
      if (q < 0) {
        return null;
      }
      continue;
    }

    const r = q / p;
    if (p < 0) {
      if (r > leave) {
        return null;
      }
      if (r > enter) {
        enter = r;
      }
    } else {
      if (r < enter) {
        return null;
      }
      if (r < leave) {
        leave = r;
      }
    }
  }

  return [
    [a[0] + enter * dx, a[1] + enter * dy],
    [a[0] + leave * dx, a[1] + leave * dy],
  ];
}

const EPSILON = 1e-9;

/**
 * Часть ломаной внутри рамки карты. Возвращает несколько кусков, если линия
 * вышла за край и вернулась: Амур уходит к Охотскому морю, Меконг — в Лаос, и
 * координаты за рамкой карте не принадлежат.
 */
export function clipToFrame(points: readonly Point[], frame: Frame): Point[][] {
  const parts: Point[][] = [];
  let current: Point[] = [];

  const flush = () => {
    if (current.length > 1) {
      parts.push(current);
    }
    current = [];
  };

  for (let i = 1; i < points.length; i += 1) {
    const piece = clipSegment(points[i - 1], points[i], frame);
    if (piece === null) {
      flush();
      continue;
    }

    const [from, to] = piece;
    const last = current.at(-1);
    if (last === undefined) {
      current.push(from);
    } else if (
      Math.abs(last[0] - from[0]) > EPSILON ||
      Math.abs(last[1] - from[1]) > EPSILON
    ) {
      flush();
      current.push(from);
    }

    current.push(to);
  }

  flush();

  return parts;
}

/**
 * Запись контуров в тот же вид пути, в котором записана карта:
 * `m x,y dx,dy ... z`. Обратно их читает `parseMapPath`.
 *
 * Смещение считается от округлённой предыдущей точки, а не от исходной: иначе
 * ошибка округления копится и на тысяче точек уводит хвост линии.
 */
export function toPathData(
  rings: readonly (readonly Point[])[],
  options: { readonly closed?: boolean; readonly precision?: number } = {},
): string {
  const { closed = false, precision = 2 } = options;
  const round = (value: number) => Number(value.toFixed(precision));

  return rings
    .filter((ring) => ring.length > 1)
    .map((ring) => {
      let [previousX, previousY] = [round(ring[0][0]), round(ring[0][1])];
      const parts = [`m ${previousX},${previousY}`];

      for (const [x, y] of ring.slice(1)) {
        const nextX = round(x);
        const nextY = round(y);
        parts.push(`${round(nextX - previousX)},${round(nextY - previousY)}`);
        previousX = nextX;
        previousY = nextY;
      }

      if (closed) {
        parts.push('z');
      }

      return parts.join(' ');
    })
    .join(' ');
}
