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
 * Расстояние до ломаной, разрезанной на несколько кусков.
 *
 * Отдельная функция, потому что склеить куски в один список точек нельзя:
 * между концом одного и началом другого появилось бы звено через всю карту, и
 * нажатие в пустом месте засчиталось бы этой линии. Река после обрезки по
 * рамке может оказаться именно такой — `clipToFrame` возвращает список кусков,
 * а `parseMapPath` читает их обратно кольцами.
 */
export function distanceToPolylines(
  x: number,
  y: number,
  lines: readonly (readonly Point[])[],
): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    const distance = distanceToPolyline(x, y, line);
    if (distance < nearest) {
      nearest = distance;
    }
  }

  return nearest;
}

/**
 * Площадь кольца по формуле шнуровки, без знака. Ею выбирают, какой контур
 * считать главным: у Тайваня — главный остров среди осколков, у формы
 * рельефа — порядок отрисовки от крупных к мелким.
 */
export function ringArea(ring: readonly Point[]): number {
  let area = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area / 2);
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
 * Часть кольца внутри рамки — по Сазерленду–Ходжмену: многоугольник по очереди
 * отсекается четырьмя полуплоскостями рамки.
 *
 * Линии хватало разрезания на куски, кольцу — нет: у него нет концов, и
 * выброшенная часть должна замениться отрезком по краю рамки, иначе форма
 * перестанет быть замкнутой. Гоби уходит в Монголию, Гималаи — в Непал, и без
 * обрезки их координаты остались бы в файле числами, которым на этой карте
 * нет места.
 */
export function clipRingToFrame(ring: readonly Point[], frame: Frame): Point[] {
  const crossX = (a: Point, b: Point, x: number): Point => [
    x,
    a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]),
  ];
  const crossY = (a: Point, b: Point, y: number): Point => [
    a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]),
    y,
  ];

  const sides: {
    inside: (point: Point) => boolean;
    cross: (a: Point, b: Point) => Point;
  }[] = [
    { inside: (p) => p[0] >= frame.minX, cross: (a, b) => crossX(a, b, frame.minX) },
    { inside: (p) => p[0] <= frame.maxX, cross: (a, b) => crossX(a, b, frame.maxX) },
    { inside: (p) => p[1] >= frame.minY, cross: (a, b) => crossY(a, b, frame.minY) },
    { inside: (p) => p[1] <= frame.maxY, cross: (a, b) => crossY(a, b, frame.maxY) },
  ];

  /* Замыкающая точка совпадает с первой: обход и так цикличен, дубль лишний. */
  const first = ring[0];
  const last = ring[ring.length - 1];
  let output: Point[] =
    ring.length > 1 && first[0] === last[0] && first[1] === last[1]
      ? ring.slice(0, -1)
      : [...ring];

  for (const side of sides) {
    const input = output;
    output = [];

    for (let i = 0; i < input.length; i += 1) {
      const current = input[i];
      const previous = input[(i + input.length - 1) % input.length];
      const currentInside = side.inside(current);
      const previousInside = side.inside(previous);

      if (currentInside) {
        if (!previousInside) {
          output.push(side.cross(previous, current));
        }
        output.push(current);
      } else if (previousInside) {
        output.push(side.cross(previous, current));
      }
    }

    if (output.length === 0) {
      return [];
    }
  }

  return output;
}

/**
 * Запись контуров в тот же вид пути, в котором записана карта:
 * `m x,y dx,dy ... z`. Обратно их читает `parseMapPath`.
 *
 * Смещение считается от округлённой предыдущей точки, а не от исходной: иначе
 * ошибка округления копится и на тысяче точек уводит хвост линии.
 *
 * Начало **каждого** кольца тоже смещение, а не абсолютная точка. У первого
 * кольца разницы нет — отсчёт идёт от нуля, — а у второго есть: `m` строчное
 * означает «относительно текущего положения», и абсолютные координаты в нём
 * сложились бы с концом предыдущего кольца. Многокольцевая форма уезжала бы
 * тем дальше, чем больше в ней колец, и выглядела бы при этом правдоподобно.
 *
 * Где кончает разбор предыдущее кольцо, зависит от `z`: замкнутое возвращает
 * положение в свою же начальную точку, незамкнутое оставляет его в последней.
 */
export function toPathData(
  rings: readonly (readonly Point[])[],
  options: { readonly closed?: boolean; readonly precision?: number } = {},
): string {
  const { closed = false, precision = 2 } = options;
  const round = (value: number) => Number(value.toFixed(precision));

  let cursorX = 0;
  let cursorY = 0;

  return rings
    .filter((ring) => ring.length > 1)
    .map((ring) => {
      const startX = round(ring[0][0]);
      const startY = round(ring[0][1]);
      const parts = [`m ${round(startX - cursorX)},${round(startY - cursorY)}`];

      let previousX = startX;
      let previousY = startY;
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

      cursorX = closed ? startX : previousX;
      cursorY = closed ? startY : previousY;

      return parts.join(' ');
    })
    .join(' ');
}

/**
 * Часть ломаной между двумя точками.
 *
 * Концы задаются координатами, а не номерами вершин: номер зависит от
 * упрощения, а координата — от местности. Режется по звену, а не по ближайшей
 * вершине: у упрощённой реки вершины редкие, и привязка к вершине отняла бы у
 * участка до половины звена с каждого конца — двести километров Трёх ущелий
 * превращались в сотню.
 *
 * Куски не склеиваются: обрезка по рамке рвёт линию, и часть, начатая в одном
 * куске и законченная в другом, означала бы звено через пустоту — это ошибка
 * входных данных, и генератор обязан о ней сказать.
 */
export function sliceLine(
  parts: readonly (readonly Point[])[],
  from: Point,
  to: Point,
  maxSnapUnits = Number.POSITIVE_INFINITY,
): Point[][] {
  const nearest = (
    target: Point,
  ): { part: number; segment: number; at: Point; distance: number } => {
    let best = {
      part: -1,
      segment: -1,
      at: [0, 0] as Point,
      distance: Number.POSITIVE_INFINITY,
    };

    parts.forEach((part, partIndex) => {
      for (let index = 0; index + 1 < part.length; index += 1) {
        const [ax, ay] = part[index];
        const [bx, by] = part[index + 1];
        const dx = bx - ax;
        const dy = by - ay;
        const square = dx * dx + dy * dy;
        const t =
          square === 0
            ? 0
            : Math.min(
                1,
                Math.max(0, ((target[0] - ax) * dx + (target[1] - ay) * dy) / square),
              );
        const at: Point = [ax + t * dx, ay + t * dy];
        const distance = Math.hypot(at[0] - target[0], at[1] - target[1]);

        if (distance < best.distance) {
          best = { part: partIndex, segment: index, at, distance };
        }
      }
    });

    return best;
  };

  const start = nearest(from);
  const end = nearest(to);

  if (start.part === -1 || start.part !== end.part) {
    throw new Error('Концы отрезка лежат в разных кусках ломаной');
  }

  /*
   * Насколько конец «прилип» к линии. Без этой меры опечатка в одной цифре
   * координаты даёт другой участок при зелёной сборке: ближайшая точка на
   * ломаной найдётся всегда, какой бы далёкой ни была заявленная.
   */
  const snap = Math.max(start.distance, end.distance);
  if (snap > maxSnapUnits) {
    throw new Error(
      `Конец отрезка лежит в ${snap.toFixed(2)} единицах от ломаной ` +
        `при пределе ${maxSnapUnits}: проверьте координаты`,
    );
  }

  const part = parts[start.part];
  const forward =
    start.segment < end.segment ||
    (start.segment === end.segment &&
      Math.hypot(start.at[0] - part[start.segment][0], start.at[1] - part[start.segment][1]) <=
        Math.hypot(end.at[0] - part[start.segment][0], end.at[1] - part[start.segment][1]));

  const [head, tail] = forward ? [start, end] : [end, start];
  const middle = part.slice(head.segment + 1, tail.segment + 1);
  const slice: Point[] = [head.at, ...middle.map((point) => [point[0], point[1]] as Point), tail.at];

  /* Совпавшие концы звена не удваиваются: две одинаковые точки — не линия. */
  const cleaned = slice.filter(
    (point, index) =>
      index === 0 ||
      Math.hypot(point[0] - slice[index - 1][0], point[1] - slice[index - 1][1]) > 1e-9,
  );

  return [forward ? cleaned : [...cleaned].reverse()];
}
