/**
 * Раскладка ленты династий «змейкой» (решение владельца, DECISIONS.md,
 * 2026-10-14, по образцу ruchina.org): строка на тысячу лет, туда и обратно.
 *
 * Масштаб в строке настоящий: тысяча лет — вся ширина, Чжоу втрое длиннее
 * Цинь в любой строке. Строки начинаются с 2100 года до н. э., чтобы рубежи
 * пришлись внутрь Шан, Хань и Тан: эти династии идут через поворот, и глаз
 * видит, что время не прерывается. Последняя строка длиннее остальных на
 * двенадцать лет — Цин кончается в 1912-м, — и ради неё одной сдвигать
 * рубежи не стоит: разница в масштабе 1,2 % на глаз не видна.
 *
 * Чистые функции: ни React, ни DOM. Доли — от 0 до 1 по видимой ширине строки,
 * уже с учётом направления: в обратной строке поздний год левее раннего.
 */
export const SNAKE_START = -2100;
export const SNAKE_ROW_YEARS = 1000;

export type SnakeRow = {
  readonly index: number;
  readonly from: number;
  readonly to: number;
  /** Строка идёт справа налево. */
  readonly reversed: boolean;
};

type Spanned = { readonly id: string; readonly from: number; readonly to: number };

export type SnakeSegment = {
  readonly dynastyId: string;
  readonly row: number;
  /** Видимая доля строки от левого края. */
  readonly left: number;
  readonly width: number;
  /**
   * Главный отрезок династии — самый длинный. Только он несёт кнопку, имя
   * читалке экрана и подпись: династия, разрезанная поворотом, остаётся
   * одной целью, а не двумя с одинаковым именем.
   */
  readonly primary: boolean;
};

export type SnakeTurn = {
  /** Поворот после этой строки. */
  readonly afterRow: number;
  /** С какой стороны: строка вперёд кончается справа, обратная — слева. */
  readonly side: 'start' | 'end';
  /** Династия, которая идёт через поворот, или `null`, если рубеж пуст. */
  readonly dynastyId: string | null;
};

export function snakeRows(timelineTo: number): readonly SnakeRow[] {
  const rows: SnakeRow[] = [];

  for (let from = SNAKE_START; from < timelineTo; from += SNAKE_ROW_YEARS) {
    /*
     * Хвост короче половины строки отдельной строкой не ставится, а
     * дописывается к последней: строка на двенадцать лет была бы обрывком.
     */
    const isLast = timelineTo - (from + SNAKE_ROW_YEARS) < SNAKE_ROW_YEARS / 2;
    rows.push({
      index: rows.length,
      from,
      to: isLast ? timelineTo : from + SNAKE_ROW_YEARS,
      reversed: rows.length % 2 === 1,
    });

    if (isLast) {
      break;
    }
  }

  return rows;
}

/** Доля строки для года — видимая, с учётом направления. */
export function rowShare(row: SnakeRow, year: number): number {
  const forward = (year - row.from) / (row.to - row.from);

  return row.reversed ? 1 - forward : forward;
}

export function snakeSegments(
  spans: readonly Spanned[],
  rows: readonly SnakeRow[],
): readonly SnakeSegment[] {
  return spans.flatMap((span) => {
    const pieces = rows
      .filter((row) => span.from < row.to && span.to > row.from)
      .map((row) => {
        const from = Math.max(span.from, row.from);
        const to = Math.min(span.to, row.to);
        const a = rowShare(row, from);
        const b = rowShare(row, to);

        return { row: row.index, left: Math.min(a, b), width: Math.abs(b - a) };
      });
    const longest = pieces.reduce(
      (best, piece, index) => (piece.width > pieces[best].width ? index : best),
      0,
    );

    return pieces.map((piece, index) => ({
      dynastyId: span.id,
      ...piece,
      primary: index === longest,
    }));
  });
}

export function snakeTurns(
  spans: readonly Spanned[],
  rows: readonly SnakeRow[],
): readonly SnakeTurn[] {
  return rows.slice(0, -1).map((row) => ({
    afterRow: row.index,
    side: row.reversed ? 'start' : 'end',
    dynastyId:
      spans.find((span) => span.from < row.to && span.to > row.to)?.id ?? null,
  }));
}
