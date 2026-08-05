import {
  clampView,
  keyboardStep,
  panView,
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

it('пересчитывает пиксели в единицы карты по ширине показа', () => {
  expect(unitsPerPixel(WHOLE_MAP, MAP_VIEWBOX_WIDTH)).toBeCloseTo(1);
  expect(unitsPerPixel(zoomView(WHOLE_MAP, 2), MAP_VIEWBOX_WIDTH)).toBeCloseTo(0.5);
});

it('шаг клавиатуры уменьшается вместе с видимой частью', () => {
  expect(keyboardStep(zoomView(WHOLE_MAP, 2))).toBeCloseTo(
    keyboardStep(WHOLE_MAP) / 2,
  );
});

it('не двигает вид, у которого середина уже на месте', () => {
  expect(clampView(WHOLE_MAP)).toEqual(WHOLE_MAP);
});
