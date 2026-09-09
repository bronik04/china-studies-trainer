import { describe, expect, it } from 'vitest';
import {
  clipRingToFrame,
  clipToFrame,
  distanceToPolyline,
  distanceToPolylines,
  ringArea,
  simplifyPath,
  simplifyRing,
  sliceLine,
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

describe('distanceToPolylines', () => {
  it('не считает звеном разрыв между кусками', () => {
    // Два куска по краям карты. Точка ровно посередине далека от обоих; если
    // склеить их в один список точек, между ними появится звено через всю
    // карту, и расстояние вышло бы нулевым.
    const parts: Point[][] = [
      [
        [0, 0],
        [10, 0],
      ],
      [
        [90, 0],
        [100, 0],
      ],
    ];

    expect(distanceToPolylines(50, 0, parts)).toBeCloseTo(40, 6);
    expect(distanceToPolyline(50, 0, parts.flat())).toBeCloseTo(0, 6);
  });

  it('на пустом списке кусков даёт бесконечность', () => {
    expect(distanceToPolylines(0, 0, [])).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('ringArea', () => {
  it('меряет площадь независимо от направления обхода', () => {
    const square: Point[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];

    expect(ringArea(square)).toBeCloseTo(100, 6);
    expect(ringArea([...square].reverse())).toBeCloseTo(100, 6);
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

  it('оставляет кольцо замкнутым', () => {
    // Ради этого функция и написана. Разомкнутое кольцо `toPathData` всё равно
    // закроет командой `z`, соединив концы прямой через всю форму, — и молча.
    const ring: Point[] = [
      [0, 0],
      [50, 2],
      [100, 0],
      [100, 100],
      [50, 98],
      [0, 100],
      [0, 0],
    ];

    const simplified = simplifyRing(ring, 1);

    expect(simplified.at(-1)).toEqual(simplified[0]);
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

  it('пишет второе кольцо смещением, а не абсолютной точкой', () => {
    // `m` строчное — «относительно текущего положения». Абсолютные координаты
    // во втором кольце сложились бы с концом первого, и форма уехала бы.
    const rings: Point[][] = [
      [
        [10, 10],
        [20, 10],
        [20, 20],
      ],
      [
        [100, 100],
        [110, 100],
        [110, 110],
      ],
    ];

    const parsed = parseMapPath(toPathData(rings, { closed: true }));

    expect(parsed).toHaveLength(2);
    expect(parsed[1][0][0]).toBeCloseTo(100, 2);
    expect(parsed[1][0][1]).toBeCloseTo(100, 2);
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

describe('clipRingToFrame', () => {
  it('оставляет кольцо целиком, когда оно внутри рамки', () => {
    const ring: Point[] = [
      [10, 10],
      [90, 10],
      [90, 90],
    ];

    expect(clipRingToFrame(ring, FRAME)).toEqual(ring);
  });

  it('обрезает кольцо по краю, оставляя его замкнутым', () => {
    const clipped = clipRingToFrame(
      [
        [50, 50],
        [150, 50],
        [150, 90],
        [50, 90],
      ],
      FRAME,
    );

    expect(clipped.every(([x]) => x <= 100)).toBe(true);
    expect(clipped.length).toBeGreaterThanOrEqual(4);
  });

  it('отбрасывает кольцо целиком снаружи', () => {
    expect(
      clipRingToFrame(
        [
          [200, 200],
          [300, 200],
          [300, 300],
        ],
        FRAME,
      ),
    ).toEqual([]);
  });
});

describe('sliceLine', () => {
  it('вырезает часть ломаной между двумя точками', () => {
    const line: Point[][] = [
      [
        [0, 0],
        [10, 0],
        [20, 0],
        [30, 0],
        [40, 0],
      ],
    ];

    /* Концы — там, где названы, а не там, где ближайшая вершина. */
    expect(sliceLine(line, [9, 1], [31, -1])).toEqual([
      [
        [9, 0],
        [10, 0],
        [20, 0],
        [30, 0],
        [31, 0],
      ],
    ]);
  });

  it('вырезает в том же порядке, в каком концы названы', () => {
    const line: Point[][] = [
      [
        [0, 0],
        [10, 0],
        [20, 0],
      ],
    ];

    /* Конец за краем ломаной прижимается к её концу: дальше линии нет. */
    expect(sliceLine(line, [21, 0], [9, 0])).toEqual([
      [
        [20, 0],
        [10, 0],
        [9, 0],
      ],
    ]);
  });

  it('режет по звену, а не по ближайшей вершине', () => {
    const line: Point[][] = [
      [
        [0, 0],
        [10, 0],
        [20, 0],
      ],
    ];

    /*
     * Концы отрезка попадают в середину звеньев: у реки вершины редкие, и
     * привязка к ближайшей отняла бы у участка до половины звена с каждого
     * конца — двести километров ущелий стали бы сотней.
     */
    expect(sliceLine(line, [5, 2], [15, -2])).toEqual([
      [
        [5, 0],
        [10, 0],
        [15, 0],
      ],
    ]);
  });

  it('не молчит, когда конец далеко от ломаной', () => {
    const line: Point[][] = [
      [
        [0, 0],
        [20, 0],
      ],
    ];

    /* Опечатка в координате: конец в двенадцати единицах от линии. */
    expect(() => sliceLine(line, [5, 0], [15, 12], 2)).toThrow(/12.00 единицах/);
    expect(() => sliceLine(line, [5, 0], [15, 1], 2)).not.toThrow();
  });

  it('не молчит, когда концы лежат в разных кусках', () => {
    const parts: Point[][] = [
      [
        [0, 0],
        [10, 0],
      ],
      [
        [100, 0],
        [110, 0],
      ],
    ];

    expect(() => sliceLine(parts, [1, 0], [101, 0])).toThrow(/разных кусках/);
  });
});
