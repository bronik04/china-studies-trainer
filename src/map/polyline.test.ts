import { describe, expect, it } from 'vitest';
import {
  clipToFrame,
  distanceToPolyline,
  simplifyPath,
  simplifyRing,
  toPathData,
  type Frame,
} from './polyline';
import { parseMapPath, type Point } from './svg-path';

const FRAME: Frame = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

describe('distanceToPolyline', () => {
  it('меряет расстояние до отрезка, а не до ближайшей точки', () => {
    const line: Point[] = [
      [0, 0],
      [100, 0],
    ];

    // Точка над серединой отрезка: до обоих концов 50.99, до самой линии 10.
    expect(distanceToPolyline(50, 10, line)).toBeCloseTo(10, 6);
  });

  it('возвращает ноль на самой ломаной', () => {
    expect(
      distanceToPolyline(50, 0, [
        [0, 0],
        [100, 0],
      ]),
    ).toBeCloseTo(0, 6);
  });
});

describe('simplifyPath', () => {
  it('выбрасывает точку, лежащую на прямой', () => {
    const simplified = simplifyPath(
      [
        [0, 0],
        [50, 0],
        [100, 0],
      ],
      1,
    );

    expect(simplified).toEqual([
      [0, 0],
      [100, 0],
    ]);
  });

  it('сохраняет точку, отходящую дальше допуска', () => {
    const simplified = simplifyPath(
      [
        [0, 0],
        [50, 5],
        [100, 0],
      ],
      1,
    );

    expect(simplified).toHaveLength(3);
  });

  it('никогда не теряет концы', () => {
    const points: Point[] = Array.from({ length: 50 }, (_, i) => [i, 0]);
    const simplified = simplifyPath(points, 1);

    expect(simplified[0]).toEqual([0, 0]);
    expect(simplified.at(-1)).toEqual([49, 0]);
  });
});

describe('simplifyRing', () => {
  it('не схлопывает кольцо, у которого концы совпадают', () => {
    const ring: Point[] = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
      [0, 0],
    ];

    // Наивное упрощение вернуло бы [[0,0],[0,0]]: у замкнутого кольца
    // расстояние от любой точки до отрезка «начало — конец» считается от
    // вырожденного отрезка нулевой длины.
    expect(simplifyRing(ring, 1).length).toBeGreaterThanOrEqual(4);
  });
});

describe('clipToFrame', () => {
  it('оставляет линию целиком, когда она внутри рамки', () => {
    const line: Point[] = [
      [10, 10],
      [90, 90],
    ];

    expect(clipToFrame(line, FRAME)).toEqual([line]);
  });

  it('обрезает по краю рамки', () => {
    const parts = clipToFrame(
      [
        [50, 50],
        [150, 50],
      ],
      FRAME,
    );

    expect(parts).toHaveLength(1);
    expect(parts[0][0]).toEqual([50, 50]);
    expect(parts[0][1][0]).toBeCloseTo(100, 6);
  });

  it('разбивает на части линию, которая вышла и вернулась', () => {
    const parts = clipToFrame(
      [
        [50, 50],
        [150, 50],
        [150, 80],
        [50, 80],
      ],
      FRAME,
    );

    expect(parts).toHaveLength(2);
  });

  it('отбрасывает линию целиком снаружи', () => {
    expect(
      clipToFrame(
        [
          [200, 200],
          [300, 300],
        ],
        FRAME,
      ),
    ).toEqual([]);
  });
});

describe('toPathData', () => {
  it('пишет путь, который читается разбором карты обратно', () => {
    const ring: Point[] = [
      [10.25, 20.5],
      [30.75, 20.5],
      [30.75, 40.125],
    ];

    const parsed = parseMapPath(toPathData([ring]));

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toHaveLength(3);
    for (const [i, [x, y]] of parsed[0].entries()) {
      expect(x).toBeCloseTo(ring[i][0], 2);
      expect(y).toBeCloseTo(ring[i][1], 2);
    }
  });

  it('не копит ошибку округления на длинной ломаной', () => {
    // Смещения считаются от округлённой предыдущей точки, а не от исходной:
    // иначе на тысяче точек путь уезжает.
    const line: Point[] = Array.from({ length: 1000 }, (_, i) => [i * 0.333, 0]);
    const parsed = parseMapPath(toPathData([line]));

    expect(parsed[0].at(-1)?.[0]).toBeCloseTo(999 * 0.333, 1);
  });

  it('замыкает кольцо по требованию', () => {
    expect(
      toPathData(
        [
          [
            [0, 0],
            [10, 0],
            [10, 10],
          ],
        ],
        { closed: true },
      ),
    ).toMatch(/z$/);
  });
});
