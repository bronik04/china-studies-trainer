import { expect, it } from 'vitest';
import {
  boundingBox,
  containsPoint,
  distanceToBoundary,
  distanceToSegment,
  largestInscribedCircle,
  parseMapPath,
  polygonArea,
  type Point,
} from './svg-path';

/**
 * Ядро геометрии карты. До сих пор оно было покрыто только косвенно — через
 * тесты попаданий и валидатор, — а на нём стоит и правило «побеждает меньший
 * объект», и мера нажимаемости целей, и точки подписей регионов. Ошибка здесь
 * выглядела бы правдоподобно на любой поверхности сразу.
 */

/** Единичный квадрат: контуры в разметке карты замкнуты, поэтому и здесь. */
const SQUARE: Point[][] = [
  [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ],
];

it('разбирает относительные ходы, накапливая координаты', () => {
  expect(parseMapPath('m 1,2 3,4 -2,1')).toEqual([
    [
      [1, 2],
      [4, 6],
      [2, 7],
    ],
  ]);
});

it('различает заглавные команды как абсолютные', () => {
  expect(parseMapPath('M 1,2 L 5,5 3,1')).toEqual([
    [
      [1, 2],
      [5, 5],
      [3, 1],
    ],
  ]);
});

/*
 * Второй `m` начинает новое кольцо, а не продолжает прежнее: у региона с
 * островами колец несколько, и слитые в одно они дали бы контур, проходящий
 * через море.
 */
it('делит путь на кольца по каждому переходу', () => {
  const rings = parseMapPath('m 0,0 10,0 0,10 z m 20,20 5,0 0,5 z');

  expect(rings).toHaveLength(2);
  expect(rings[0][0]).toEqual([0, 0]);
  expect(rings[1][0]).toEqual([20, 20]);
});

/*
 * `z` возвращает перо в начало кольца, и следующий относительный ход считается
 * оттуда, а не от последней точки. Без этого второе кольцо уезжало бы на
 * длину первого.
 */
it('возвращает перо в начало кольца по z', () => {
  const rings = parseMapPath('m 0,0 10,0 0,10 z m 1,1');

  expect(rings[1][0]).toEqual([1, 1]);
});

it('считает габариты по всем кольцам сразу', () => {
  const rings = parseMapPath('m 0,0 10,0 0,10 z m 20,20 5,0 0,5 z');

  expect(boundingBox(rings)).toEqual({ minX: 0, minY: 0, maxX: 25, maxY: 25 });
});

it('точка внутри контура опознаётся, снаружи — нет', () => {
  expect(containsPoint(SQUARE, 5, 5)).toBe(true);
  expect(containsPoint(SQUARE, 15, 5)).toBe(false);
  expect(containsPoint(SQUARE, 5, 15)).toBe(false);
  expect(containsPoint(SQUARE, -1, 5)).toBe(false);
});

/*
 * Кольца считаются одним правилом чётности, поэтому вложенное кольцо даёт
 * дыру. Так на физической карте котловина внутри нагорья не достаётся
 * нагорью — ни при отрисовке, ни при попадании.
 */
it('вложенное кольцо даёт дыру, а не второй слой', () => {
  const withHole: Point[][] = [
    ...SQUARE,
    [
      [4, 4],
      [6, 4],
      [6, 6],
      [4, 6],
    ],
  ];

  expect(containsPoint(withHole, 5, 5)).toBe(false);
  expect(containsPoint(withHole, 2, 2)).toBe(true);
});

/*
 * Расстояние меряется до звена, а не до вершины: точка напротив середины
 * длинного звена лежит на реке, и по вершинам она оказалась бы далёкой.
 */
it('меряет расстояние до звена, а не до его концов', () => {
  const start: Point = [0, 0];
  const end: Point = [10, 0];

  expect(distanceToSegment(5, 3, start, end)).toBeCloseTo(3, 6);
  expect(distanceToSegment(15, 0, start, end)).toBeCloseTo(5, 6);
  expect(distanceToSegment(0, 0, start, start)).toBe(0);
});

it('расстояние до границы считается от ближайшей стороны', () => {
  expect(distanceToBoundary(SQUARE, 5, 5)).toBeCloseTo(5, 6);
  expect(distanceToBoundary(SQUARE, 1, 5)).toBeCloseTo(1, 6);
});

it('вписанная окружность квадрата стоит в его середине', () => {
  const circle = largestInscribedCircle(SQUARE, 1);

  expect(circle.x).toBeCloseTo(5, 1);
  expect(circle.y).toBeCloseTo(5, 1);
  expect(circle.radius).toBeCloseTo(5, 1);
});

/*
 * Ради этого мера и заведена (решение от 2026-08-03). У коридора габарит
 * огромен, а места под палец нет: габариты назвали бы его большой целью,
 * вписанная окружность — узкой.
 */
it('у коридора окружность мала, хотя габарит велик', () => {
  const corridor: Point[][] = [
    [
      [0, 0],
      [100, 0],
      [100, 4],
      [0, 4],
    ],
  ];

  expect(boundingBox(corridor).maxX).toBe(100);
  expect(largestInscribedCircle(corridor, 1).radius).toBeLessThanOrEqual(2.01);
});

/* Контур без внутренних точек — это ошибка данных, а не окружность нулевого радиуса. */
it('вырожденный контур не притворяется целью', () => {
  expect(() =>
    largestInscribedCircle(
      [
        [
          [0, 0],
          [10, 0],
        ],
      ],
      1,
    ),
  ).toThrow('Контур без внутренних точек');
});

/* Площадь нужна порядку попадания: побеждает форма меньшей площади. */
it('считает площадь квадрата', () => {
  const square: Point[][] = [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ];

  expect(polygonArea(square)).toBeCloseTo(100);
});

/* Кольцо без повтора первой точки — обычное дело в разобранном пути. */
it('замыкает кольцо сам', () => {
  const open: Point[][] = [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
  ];

  expect(polygonArea(open)).toBeCloseTo(100);
});

it('площадь не зависит от направления обхода', () => {
  const clockwise: Point[][] = [
    [
      [0, 0],
      [0, 10],
      [10, 10],
      [10, 0],
    ],
  ];

  expect(polygonArea(clockwise)).toBeCloseTo(100);
});

it('складывает площади колец', () => {
  const two: Point[][] = [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
    [
      [20, 20],
      [24, 20],
      [24, 24],
      [20, 24],
    ],
  ];

  expect(polygonArea(two)).toBeCloseTo(116);
});
