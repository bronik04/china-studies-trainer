/**
 * Сборка канала из участков OpenStreetMap.
 *
 * Река Natural Earth собирается в одну цепь, и всё не приставшее — ошибка в
 * списке номеров. С каналом иначе: у Великого канала в OSM нет звеньев через
 * Хуанхэ — канал там идёт рекой и озером, — и основное русло распадается на
 * северную и южную цепи с разрывом около 11,5 км. Рисовать мост, которого
 * нет в данных, карта не будет. Поэтому цепей наращивается столько, сколько
 * получится, а потом проверяется, что их немного, что стоят они рядом и что
 * в обрывки ушла малая доля точек: всё остальное значит, что выжимка уже не
 * та, по которой этот код писался.
 */
import type { Point } from '../src/map/svg-path';
import { chainPieces, type Piece } from './physical-assembly';

export type CanalLimits = {
  /** Допуск склейки концов, в градусах. */
  readonly joinTolerance: number;
  /** Цепь короче этой доли всех точек — обрывок, а не часть канала. */
  readonly minPartShare: number;
  /** Сколько цепей позволено оставить. */
  readonly maxParts: number;
  /** Наибольший разрыв между цепями, в градусах. */
  readonly maxGap: number;
  /** Какая доля точек вправе уйти в обрывки. */
  readonly maxDroppedShare: number;
};

export type CanalAssembly = {
  /** Цепи от длинной к короткой. */
  readonly parts: Point[][];
  /** Сколько точек было во всех участках. */
  readonly total: number;
  /** Сколько точек ушло в обрывки и вырожденные куски. */
  readonly dropped: number;
};

function apart(left: Point, right: Point): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1]);
}

/** Наименьшее расстояние между концами двух цепей. */
function endGap(left: readonly Point[], right: readonly Point[]): number {
  const ends = (chain: readonly Point[]) => [chain[0], chain[chain.length - 1]];

  return Math.min(
    ...ends(left).flatMap((a) => ends(right).map((b) => apart(a, b))),
  );
}

export function assembleCanal(
  pieces: readonly Piece[],
  limits: CanalLimits,
): CanalAssembly {
  const total = pieces.reduce((n, piece) => n + piece.length, 0);
  const chains: { chain: Point[]; points: number }[] = [];
  let rest: readonly Piece[] = pieces;
  let dropped = 0;

  while (rest.length > 0) {
    const { chain, leftovers } = chainPieces(rest, limits.joinTolerance);

    /*
     * Пустая цепь значит, что остались одни вырожденные куски: склеивать
     * нечего, и без выхода здесь цикл крутился бы вечно.
     */
    if (chain.length === 0) {
      dropped += leftovers.reduce((n, piece) => n + piece.length, 0);
      break;
    }

    /*
     * Точки считаются по кускам, а не по цепи: склейка выбрасывает общий
     * конец, и по цепи доля потерь выходила бы завышенной. Разностью, а не
     * сверкой кусков: `chainPieces` возвращает копии, и тождество не
     * сохраняется.
     */
    const count = (list: readonly Piece[]) =>
      list.reduce((n, piece) => n + piece.length, 0);
    const points = count(rest) - count(leftovers);
    chains.push({ chain, points });
    rest = leftovers;
  }

  const kept = chains.filter(({ points }) => points >= total * limits.minPartShare);
  dropped += chains
    .filter((item) => !kept.includes(item))
    .reduce((n, { points }) => n + points, 0);
  const parts = kept
    .sort((left, right) => right.points - left.points)
    .map(({ chain }) => chain);

  if (parts.length === 0) {
    throw new Error('Канал не собрался: ни одной цепи из участков');
  }

  if (dropped > total * limits.maxDroppedShare) {
    throw new Error(
      `Канал не собирается: в обрывки ушло ${dropped} точек из ${total}`,
    );
  }

  if (parts.length > limits.maxParts) {
    throw new Error(
      `Канал распался на ${parts.length} цепей при пределе ${limits.maxParts}`,
    );
  }

  for (let i = 1; i < parts.length; i += 1) {
    const gap = Math.min(...parts.slice(0, i).map((other) => endGap(other, parts[i])));
    if (gap > limits.maxGap) {
      throw new Error(
        `Между цепями канала разрыв ${gap.toFixed(3)}° при пределе ${limits.maxGap}°`,
      );
    }
  }

  return { parts, total, dropped };
}
