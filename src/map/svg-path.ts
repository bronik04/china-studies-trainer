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
