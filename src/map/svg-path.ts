/**
 * Разбор контуров карты. Пути в `china-provinces.svg` записаны в относительных
 * координатах: `m x,y dx,dy dx,dy ... z`, где после `m` идут только смещения.
 */
export type Point = readonly [number, number];

export type BoundingBox = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/** Возвращает контуры пути в абсолютных координатах карты. */
export function parseMapPath(d: string): Point[][] {
  const tokens = d.match(/[a-zA-Z]|-?[\d.]+/g) ?? [];
  const rings: Point[][] = [];
  let current: Point[] = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let relative = true;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (/[a-zA-Z]/.test(token)) {
      if (token === 'm' || token === 'M') {
        if (current.length > 0) {
          rings.push(current);
        }
        current = [];
        relative = token === 'm';
        const dx = Number(tokens[(i += 1)]);
        const dy = Number(tokens[(i += 1)]);
        x = relative ? x + dx : dx;
        y = relative ? y + dy : dy;
        startX = x;
        startY = y;
        current.push([x, y]);
      } else if (token === 'z' || token === 'Z') {
        x = startX;
        y = startY;
      } else {
        relative = token === token.toLowerCase();
      }
      continue;
    }

    const dx = Number(token);
    const dy = Number(tokens[(i += 1)]);
    x = relative ? x + dx : dx;
    y = relative ? y + dy : dy;
    current.push([x, y]);
  }

  if (current.length > 0) {
    rings.push(current);
  }

  return rings;
}

/** Габариты набора контуров. */
export function boundingBox(rings: readonly Point[][]): BoundingBox {
  const points = rings.flat();
  if (points.length === 0) {
    throw new Error('Пустой контур: габариты не определены');
  }

  return {
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
}

export function containsPoint(
  rings: readonly Point[][],
  x: number,
  y: number,
): boolean {
  let inside = false;

  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];

      if (
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
  }

  return inside;
}

/**
 * Расстояние от точки до отрезка. Открыта наружу ради ломаных: реку меряют по
 * её звеньям, а не по вершинам — иначе точка напротив середины длинного звена
 * считалась бы далёкой от реки, на которой она лежит.
 */
export function distanceToSegment(
  x: number,
  y: number,
  [x1, y1]: Point,
  [x2, y2]: Point,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const position =
    lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(0, ((x - x1) * dx + (y - y1) * dy) / lengthSquared),
        );

  return Math.hypot(x - (x1 + position * dx), y - (y1 + position * dy));
}

export function distanceToBoundary(
  rings: readonly Point[][],
  x: number,
  y: number,
): number {
  let nearest = Number.POSITIVE_INFINITY;

  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const distance = distanceToSegment(x, y, ring[i], ring[j]);
      if (distance < nearest) {
        nearest = distance;
      }
    }
  }

  return nearest;
}

export type InscribedCircle = {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
};

/**
 * Наибольшая вписанная окружность — «полюс недоступности» контура.
 *
 * Габариты для оценки нажимаемости не годятся: у Ганьсу габарит 162 единицы,
 * а сама область — узкий коридор. Вписанная окружность отвечает на вопрос, на
 * который габариты не отвечают: поместится ли сюда палец. Она же даёт лучшую
 * точку для подписи региона.
 *
 * Поиск по сетке с тремя уточняющими проходами: точное решение здесь не нужно,
 * а погрешность в сотые доли единицы viewBox не влияет ни на порог, ни на
 * положение подписи.
 */
export function largestInscribedCircle(
  rings: readonly Point[][],
  step = 1,
): InscribedCircle {
  const box = boundingBox(rings);
  let best: InscribedCircle = {
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
    radius: -1,
  };

  for (let pass = 0; pass < 3; pass += 1) {
    const cellSize = step / 4 ** pass;
    const span = pass === 0 ? Number.POSITIVE_INFINITY : (step / 4 ** (pass - 1)) * 2;
    const fromX = pass === 0 ? box.minX : best.x - span;
    const toX = pass === 0 ? box.maxX : best.x + span;
    const fromY = pass === 0 ? box.minY : best.y - span;
    const toY = pass === 0 ? box.maxY : best.y + span;

    for (let x = fromX; x <= toX; x += cellSize) {
      for (let y = fromY; y <= toY; y += cellSize) {
        if (!containsPoint(rings, x, y)) {
          continue;
        }

        const radius = distanceToBoundary(rings, x, y);
        if (radius > best.radius) {
          best = { x, y, radius };
        }
      }
    }
  }

  if (best.radius < 0) {
    throw new Error('Контур без внутренних точек');
  }

  return best;
}
