/**
 * Сборка реки из отрезков Natural Earth.
 *
 * Набор режет реку на именованные куски, а `MultiLineString` даёт ещё и
 * несколько кусков внутри одного отрезка. Порядок в файле не значит ничего, и
 * направление куска не всегда совпадает с течением: Аргунь записана от устья к
 * истоку. Поэтому цепь наращивается жадно с обоих концов, а кусок при нужде
 * разворачивается.
 */
import type { Point } from '../src/map/svg-path';

export type Piece = readonly Point[];

export type Chained = {
  readonly chain: Point[];
  /** Куски, не приставшие ни одним концом: их видно в логе генератора. */
  readonly leftovers: Piece[];
};

function apart(left: Point, right: Point): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1]);
}

export function chainPieces(pieces: readonly Piece[], tolerance: number): Chained {
  const pool = pieces.filter((piece) => piece.length > 1).map((piece) => [...piece]);
  if (pool.length === 0) {
    return { chain: [], leftovers: [] };
  }

  let chain = pool.shift() as Point[];
  let joined = true;

  while (joined && pool.length > 0) {
    joined = false;

    for (let i = 0; i < pool.length; i += 1) {
      const piece = pool[i];
      const head = chain[0];
      const tail = chain[chain.length - 1];

      if (apart(tail, piece[0]) <= tolerance) {
        chain = chain.concat(piece.slice(1));
      } else if (apart(tail, piece[piece.length - 1]) <= tolerance) {
        chain = chain.concat([...piece].reverse().slice(1));
      } else if (apart(head, piece[piece.length - 1]) <= tolerance) {
        chain = piece.slice(0, -1).concat(chain);
      } else if (apart(head, piece[0]) <= tolerance) {
        chain = [...piece].reverse().slice(0, -1).concat(chain);
      } else {
        continue;
      }

      pool.splice(i, 1);
      joined = true;
      break;
    }
  }

  return { chain, leftovers: pool };
}
