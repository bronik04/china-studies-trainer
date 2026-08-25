/**
 * Изолинии по сетке высот.
 *
 * Марширующие квадраты дают отрезки, сшивка складывает их в замкнутые кольца.
 * Модуль чистый и лежит в `scripts/`: в браузер он не попадает — приложение
 * получает уже готовые пути в `src/map/relief-bands.ts`.
 */
import type { Point } from '../src/map/svg-path';

export type Grid = {
  readonly values: readonly number[];
  readonly rows: number;
  readonly cols: number;
  readonly lat0: number;
  readonly lon0: number;
  readonly step: number;
};

/**
 * Среднее по 3×3. Без него контур рассыпается на сотни колец в один-два узла:
 * у ETOPO1 соседние узлы в горах отличаются на сотни метров, и порог режет эту
 * рябь.
 */
export function smoothGrid(
  values: readonly number[],
  rows: number,
  cols: number,
  passes: number,
): number[] {
  let source = [...values];

  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Array<number>(rows * cols).fill(0);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        let sum = 0;
        let count = 0;

        for (let dRow = -1; dRow <= 1; dRow += 1) {
          for (let dCol = -1; dCol <= 1; dCol += 1) {
            const nearRow = row + dRow;
            const nearCol = col + dCol;
            if (nearRow < 0 || nearRow >= rows || nearCol < 0 || nearCol >= cols) {
              continue;
            }

            sum += source[nearRow * cols + nearCol];
            count += 1;
          }
        }

        next[row * cols + col] = sum / count;
      }
    }

    source = next;
  }

  return source;
}

/**
 * Рамка сетки опускается ниже любого порога: иначе кольцо, дошедшее до края,
 * не замыкается — Памир и Гималаи продолжаются за областью выжимки. Контур
 * пойдёт по самому краю, а он всё равно за границей Китая и обрежется.
 */
export function sinkBorder(
  values: number[],
  rows: number,
  cols: number,
  floor: number,
): void {
  for (let col = 0; col < cols; col += 1) {
    values[col] = floor;
    values[(rows - 1) * cols + col] = floor;
  }

  for (let row = 0; row < rows; row += 1) {
    values[row * cols] = floor;
    values[row * cols + cols - 1] = floor;
  }
}

const key = (point: Point) => `${point[0].toFixed(6)},${point[1].toFixed(6)}`;

function segmentsFor(grid: Grid, threshold: number): Point[][] {
  const { values, rows, cols, lat0, lon0, step } = grid;
  const segments: Point[][] = [];
  const at = (row: number, col: number) => values[row * cols + col];

  const lerp = (
    fromX: number,
    fromY: number,
    fromValue: number,
    toX: number,
    toY: number,
    toValue: number,
  ): Point => {
    const t = (threshold - fromValue) / (toValue - fromValue);

    return [fromX + (toX - fromX) * t, fromY + (toY - fromY) * t];
  };

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const lowLeft = at(row, col);
      const lowRight = at(row, col + 1);
      const highRight = at(row + 1, col + 1);
      const highLeft = at(row + 1, col);

      const index =
        (lowLeft >= threshold ? 1 : 0) |
        (lowRight >= threshold ? 2 : 0) |
        (highRight >= threshold ? 4 : 0) |
        (highLeft >= threshold ? 8 : 0);

      if (index === 0 || index === 15) continue;

      const x0 = lon0 + col * step;
      const x1 = lon0 + (col + 1) * step;
      const y0 = lat0 + row * step;
      const y1 = lat0 + (row + 1) * step;

      const bottom = () => lerp(x0, y0, lowLeft, x1, y0, lowRight);
      const right = () => lerp(x1, y0, lowRight, x1, y1, highRight);
      const top = () => lerp(x0, y1, highLeft, x1, y1, highRight);
      const left = () => lerp(x0, y0, lowLeft, x0, y1, highLeft);

      switch (index) {
        case 1:
        case 14:
          segments.push([left(), bottom()]);
          break;
        case 2:
        case 13:
          segments.push([bottom(), right()]);
          break;
        case 3:
        case 12:
          segments.push([left(), right()]);
          break;
        case 4:
        case 11:
          segments.push([right(), top()]);
          break;
        case 6:
        case 9:
          segments.push([bottom(), top()]);
          break;
        case 7:
        case 8:
          segments.push([left(), top()]);
          break;
        /*
         * Сёдла: два отрезка в одной ячейке. Какую из двух связок брать, для
         * заливки безразлично, лишь бы одинаково во всех сёдлах.
         */
        case 5:
          segments.push([left(), bottom()], [right(), top()]);
          break;
        case 10:
          segments.push([left(), top()], [bottom(), right()]);
          break;
      }
    }
  }

  return segments;
}

/**
 * Сшивает отрезки в кольца.
 *
 * Стороны отрезка не упорядочены: дополняющие случаи марширующих квадратов
 * выдают его в обратном направлении. Сшивка только по началу оставляет от
 * контура Тибета десятки огрызков, каждый из которых потом отсеется по
 * площади, — а карта останется пустой при зелёном генераторе.
 */
function stitch(segments: readonly Point[][]): Point[][] {
  const ends = new Map<string, number[]>();

  const remember = (point: Point, index: number) => {
    const list = ends.get(key(point));
    if (list) list.push(index);
    else ends.set(key(point), [index]);
  };

  segments.forEach((segment, index) => {
    remember(segment[0], index);
    remember(segment[1], index);
  });

  const used = new Uint8Array(segments.length);
  const rings: Point[][] = [];

  const nextFrom = (point: Point, exclude: number): number => {
    for (const index of ends.get(key(point)) ?? []) {
      if (index !== exclude && used[index] === 0) return index;
    }

    return -1;
  };

  for (let start = 0; start < segments.length; start += 1) {
    if (used[start] === 1) continue;
    used[start] = 1;

    const ring: Point[] = [segments[start][0], segments[start][1]];
    let previous = start;

    for (;;) {
      const tail = ring[ring.length - 1];
      if (ring.length > 2 && key(tail) === key(ring[0])) break;

      const index = nextFrom(tail, previous);
      if (index === -1) break;

      used[index] = 1;
      const [from, to] = segments[index];
      ring.push(key(from) === key(tail) ? to : from);
      previous = index;
    }

    if (ring.length >= 4) rings.push(ring);
  }

  return rings;
}

/** Замкнутые кольца изолинии в градусах: `[lon, lat]`. */
export function contourRings(grid: Grid, threshold: number): Point[][] {
  return stitch(segmentsFor(grid, threshold));
}
