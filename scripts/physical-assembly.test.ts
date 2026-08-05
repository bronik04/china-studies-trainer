import { describe, expect, it } from 'vitest';
import type { Point } from '../src/map/svg-path';
import { chainPieces } from './physical-assembly';

const TOLERANCE = 0.01;

describe('chainPieces', () => {
  it('соединяет два куска встык', () => {
    const { chain, leftovers } = chainPieces(
      [
        [
          [0, 0],
          [1, 0],
        ],
        [
          [1, 0],
          [2, 0],
        ],
      ],
      TOLERANCE,
    );

    expect(chain).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    expect(leftovers).toHaveLength(0);
  });

  it('разворачивает кусок, записанный против течения', () => {
    // В наборе направление отрезка не всегда совпадает с течением: Аргунь
    // записана от устья к истоку.
    const { chain } = chainPieces(
      [
        [
          [0, 0],
          [1, 0],
        ],
        [
          [2, 0],
          [1, 0],
        ],
      ],
      TOLERANCE,
    );

    expect(chain).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
  });

  it('наращивает цепь и с начала, и с конца', () => {
    const { chain, leftovers } = chainPieces(
      [
        [
          [1, 0],
          [2, 0],
        ],
        [
          [2, 0],
          [3, 0],
        ],
        [
          [0, 0],
          [1, 0],
        ],
      ],
      TOLERANCE,
    );

    expect(chain).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
    expect(leftovers).toHaveLength(0);
  });

  it('возвращает отдельно то, что не пристало', () => {
    const orphan: Point[] = [
      [50, 50],
      [51, 50],
    ];

    const { chain, leftovers } = chainPieces(
      [
        [
          [0, 0],
          [1, 0],
        ],
        orphan,
      ],
      TOLERANCE,
    );

    expect(chain).toHaveLength(2);
    expect(leftovers).toEqual([orphan]);
  });

  it('не склеивает куски, разошедшиеся дальше допуска', () => {
    const { leftovers } = chainPieces(
      [
        [
          [0, 0],
          [1, 0],
        ],
        [
          [1.5, 0],
          [2, 0],
        ],
      ],
      0.1,
    );

    expect(leftovers).toHaveLength(1);
  });

  it('на пустом списке кусков даёт пустую цепь', () => {
    expect(chainPieces([], TOLERANCE)).toEqual({ chain: [], leftovers: [] });
  });
});
