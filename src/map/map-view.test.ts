import {
  clampView,
  keyboardStep,
  panView,
  pointAtClient,
  unitsPerPixel,
  viewBoxOf,
  WHOLE_MAP,
  zoomView,
} from './map-view';
import {
  MAP_VIEWBOX_HEIGHT,
  MAP_VIEWBOX_MIN_X,
  MAP_VIEWBOX_MIN_Y,
  MAP_VIEWBOX_WIDTH,
} from './target-size';

function parse(viewBox: string): readonly number[] {
  return viewBox.split(' ').map(Number);
}

it('на единичном увеличении показывает карту целиком', () => {
  expect(parse(viewBoxOf(WHOLE_MAP))).toEqual([
    MAP_VIEWBOX_MIN_X,
    MAP_VIEWBOX_MIN_Y,
    MAP_VIEWBOX_WIDTH,
    MAP_VIEWBOX_HEIGHT,
  ]);
});

it('увеличение сужает вид, сохраняя пропорцию', () => {
  const [, , width, height] = parse(viewBoxOf(zoomView(WHOLE_MAP, 2)));

  expect(width).toBeCloseTo(MAP_VIEWBOX_WIDTH / 2);
  expect(height).toBeCloseTo(MAP_VIEWBOX_HEIGHT / 2);
});

it('на единичном увеличении сдвигать некуда', () => {
  expect(viewBoxOf(panView(WHOLE_MAP, 200, 200))).toBe(viewBoxOf(WHOLE_MAP));
});

it('сдвигает вид на увеличении', () => {
  const zoomed = zoomView(WHOLE_MAP, 2);
  const moved = panView(zoomed, 50, -30);

  expect(moved.centerX).toBe(zoomed.centerX + 50);
  expect(moved.centerY).toBe(zoomed.centerY - 30);
});

/*
 * За краем карты нет ничего: показать там пустоту значит сказать, что карта
 * кончилась не там, где кончилась.
 */
it('не пускает вид за край карты', () => {
  const [x, y, width, height] = parse(viewBoxOf(panView(zoomView(WHOLE_MAP, 3), 9999, 9999)));

  expect(x + width).toBeCloseTo(MAP_VIEWBOX_MIN_X + MAP_VIEWBOX_WIDTH);
  expect(y + height).toBeCloseTo(MAP_VIEWBOX_MIN_Y + MAP_VIEWBOX_HEIGHT);

  const [left, top] = parse(viewBoxOf(panView(zoomView(WHOLE_MAP, 3), -9999, -9999)));

  expect(left).toBeCloseTo(MAP_VIEWBOX_MIN_X);
  expect(top).toBeCloseTo(MAP_VIEWBOX_MIN_Y);
});

it('уменьшение возвращает вид в границы карты', () => {
  const corner = panView(zoomView(WHOLE_MAP, 3), 9999, 9999);

  expect(viewBoxOf(zoomView(corner, 1))).toBe(viewBoxOf(WHOLE_MAP));
});

const WHOLE_RECT = { width: MAP_VIEWBOX_WIDTH, height: MAP_VIEWBOX_HEIGHT };

it('пересчитывает пиксели в единицы карты по размеру показа', () => {
  expect(unitsPerPixel(WHOLE_MAP, WHOLE_RECT)).toBeCloseTo(1);
  expect(unitsPerPixel(zoomView(WHOLE_MAP, 2), WHOLE_RECT)).toBeCloseTo(0.5);
});

/*
 * Рамка атласа больше не держит пропорцию карты: карта вписана в колонку с
 * полями по бокам. Счёт по одной ширине рамки давал бы ход руки, не
 * совпадающий с ходом карты, — вдвое медленнее при вдвое более широкой рамке.
 */
it('поля рамки не ускоряют карту под рукой', () => {
  const wide = { width: MAP_VIEWBOX_WIDTH * 2, height: MAP_VIEWBOX_HEIGHT };

  expect(unitsPerPixel(WHOLE_MAP, wide)).toBeCloseTo(1);
});

it('шаг клавиатуры уменьшается вместе с видимой частью', () => {
  expect(keyboardStep(zoomView(WHOLE_MAP, 2))).toBeCloseTo(
    keyboardStep(WHOLE_MAP) / 2,
  );
});

it('не двигает вид, у которого середина уже на месте', () => {
  expect(clampView(WHOLE_MAP)).toEqual(WHOLE_MAP);
});

describe('pointAtClient', () => {
  /** Рамка ровно по пропорции карты: полей нет, масштаб единый. */
  const EXACT = { left: 100, top: 50, width: 806, height: 601 } as const;

  it('середина рамки — середина вида', () => {
    const [x, y] = pointAtClient(
      WHOLE_MAP,
      EXACT,
      EXACT.left + EXACT.width / 2,
      EXACT.top + EXACT.height / 2,
    );

    expect(x).toBeCloseTo(WHOLE_MAP.centerX, 6);
    expect(y).toBeCloseTo(WHOLE_MAP.centerY, 6);
  });

  it('левый верхний угол рамки — начало viewBox', () => {
    const [x, y] = pointAtClient(WHOLE_MAP, EXACT, EXACT.left, EXACT.top);

    expect(x).toBeCloseTo(MAP_VIEWBOX_MIN_X, 6);
    expect(y).toBeCloseTo(MAP_VIEWBOX_MIN_Y, 6);
  });

  it('на увеличении единиц в пикселе меньше', () => {
    const zoomed = zoomView(WHOLE_MAP, 2);
    const [x] = pointAtClient(zoomed, EXACT, EXACT.left + 100, EXACT.top);
    const [whole] = pointAtClient(WHOLE_MAP, EXACT, EXACT.left + 100, EXACT.top);

    expect(x - MAP_VIEWBOX_MIN_X - MAP_VIEWBOX_WIDTH / 4).toBeCloseTo(
      (whole - MAP_VIEWBOX_MIN_X) / 2,
      6,
    );
  });

  /**
   * Рамка шире пропорции: `preserveAspectRatio` по умолчанию вписывает карту
   * целиком и оставляет поля по бокам. Без учёта полей нажатие уезжало бы тем
   * сильнее, чем шире окно.
   */
  it('поле от вписывания не сдвигает ответ', () => {
    const wide = { left: 0, top: 0, width: 1612, height: 601 } as const;
    const [x, y] = pointAtClient(WHOLE_MAP, wide, wide.width / 2, wide.height / 2);

    expect(x).toBeCloseTo(WHOLE_MAP.centerX, 6);
    expect(y).toBeCloseTo(WHOLE_MAP.centerY, 6);
  });

  it('и по высоте тоже', () => {
    const tall = { left: 0, top: 0, width: 806, height: 1202 } as const;
    const [x, y] = pointAtClient(WHOLE_MAP, tall, tall.width / 2, tall.height / 2);

    expect(x).toBeCloseTo(WHOLE_MAP.centerX, 6);
    expect(y).toBeCloseTo(WHOLE_MAP.centerY, 6);
  });
});
